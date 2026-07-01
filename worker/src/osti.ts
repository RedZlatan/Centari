// Sprint R8D — DOE OSTI research records ingestion worker
// Run: npx tsx worker/src/osti.ts [--dry-run] [--max=N] [--days=N]
//
// Source: US Department of Energy Office of Scientific & Technical Information
// No API key required. Covers energy, materials, quantum, AI, robotics, space.
// Signal type: lab_publication | Confidence: verified (official US government)

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs   from 'fs';
import * as path from 'path';

// ── CLI flags ─────────────────────────────────────────────────────────────────

const argv      = process.argv.slice(2);
const DRY_RUN   = argv.includes('--dry-run');
const MAX_TOTAL = parseInt(argv.find(a => a.startsWith('--max='))?.split('=')[1]  ?? '100', 10);
const DAYS      = parseInt(argv.find(a => a.startsWith('--days='))?.split('=')[1] ?? '30',  10);

// ── Env / logging ─────────────────────────────────────────────────────────────

function loadEnv(): void {
  const candidates = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '..', '.env.local'),
  ];
  const envPath = candidates.find(p => fs.existsSync(p));
  if (!envPath) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}

function log(level: 'info' | 'warn' | 'error', msg: string, data?: Record<string, unknown>): void {
  const line = [`[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`, data ? JSON.stringify(data) : ''].join(' ').trimEnd();
  (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
}

// ── Domain queries ────────────────────────────────────────────────────────────
//
// Each entry drives a separate OSTI keyword search. Seen osti_ids deduplicate
// across queries so the same paper can't count twice.

type CentariDomain = 'ai' | 'xr' | 'robotics' | 'quantum' | 'space' | 'energy' | 'materials';

interface DomainQuery {
  domain: CentariDomain;
  keyword: string;
  strategicBase: number; // DOE-calibrated domain strength (0-25)
}

const DOMAIN_QUERIES: DomainQuery[] = [
  // DOE's core strengths — higher strategic base
  { domain: 'energy',    keyword: 'renewable energy',             strategicBase: 19 },
  { domain: 'energy',    keyword: 'energy storage battery',       strategicBase: 18 },
  { domain: 'materials', keyword: 'advanced materials',           strategicBase: 17 },
  { domain: 'materials', keyword: 'nanomaterials',                strategicBase: 17 },
  { domain: 'quantum',   keyword: 'quantum computing',            strategicBase: 20 },
  { domain: 'quantum',   keyword: 'quantum information science',  strategicBase: 19 },
  // Supporting domains
  { domain: 'ai',        keyword: 'machine learning scientific',  strategicBase: 15 },
  { domain: 'ai',        keyword: 'artificial intelligence',      strategicBase: 14 },
  { domain: 'robotics',  keyword: 'autonomous systems robotics',  strategicBase: 13 },
  { domain: 'space',     keyword: 'astrophysics cosmology',       strategicBase: 14 },
];

// Budget per keyword group so no single domain monopolises the quota
const PER_KEYWORD_CAP = Math.max(5, Math.ceil(MAX_TOTAL / DOMAIN_QUERIES.length));

// ── OSTI API types ────────────────────────────────────────────────────────────

interface OstiRecord {
  osti_id:          number;
  title?:           string;
  description?:     string;   // abstract
  publication_date?: string;  // ISO 8601
  product_type?:    string;   // 'Journal Article' | 'Technical Report' | 'Conference' | ...
  doi?:             string;
  subjects?:        string[]; // DOE subject codes e.g. "97 MATHEMATICS AND COMPUTING"
  research_orgs?:   Array<{ name?: string }>;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

interface EditorialScore {
  novelty:        number; // 0-25
  strategic:      number; // 0-25 (domain base from query config)
  relevance:      number; // 0-25
  publicInterest: number; // 0-25
  total:          number; // 0-100
}

const NOVELTY_KEYWORDS: Record<string, number> = {
  'breakthrough':  5, 'first':       4, 'novel':       4, 'unprecedented': 5,
  'discovery':     4, 'new record':  5, 'record-high': 4, 'efficiency':    2,
  'surpasses':     3, 'exceeds':     3, 'advance':     2, 'demonstrate':   2,
  'synthesis':     2, 'fabrication': 1, 'scalable':    2, 'prototype':     2,
};

const INTEREST_KEYWORDS: Record<string, number> = {
  'climate':     4, 'clean energy': 4, 'grid':        3, 'fusion':        5,
  'solar':       3, 'wind':         2, 'hydrogen':    4, 'carbon':        3,
  'qubit':       4, 'entanglement': 3, 'algorithm':   2, 'neural':        2,
  'autonomous':  3, 'robot':        2, 'telescope':   3, 'dark matter':   4,
};

function scoreFromText(text: string, keywordMap: Record<string, number>, base: number): number {
  const lower = text.toLowerCase();
  let score = base;
  for (const [kw, pts] of Object.entries(keywordMap)) {
    if (lower.includes(kw)) score = Math.min(25, score + pts);
  }
  return score;
}

function computeScore(rec: OstiRecord, dq: DomainQuery): EditorialScore {
  const text     = `${rec.title ?? ''} ${rec.description ?? ''}`;
  const novelty  = scoreFromText(text, NOVELTY_KEYWORDS, 6);
  const strategic = dq.strategicBase;
  // DOE publications are always relevant to their declared domain
  const relevance = 22;
  const publicInterest = scoreFromText(text, INTEREST_KEYWORDS, 10);

  const total = novelty + strategic + relevance + publicInterest;
  return { novelty, strategic, relevance, publicInterest, total };
}

// ── Slug ──────────────────────────────────────────────────────────────────────

function makeSlug(domain: string, title: string, date: Date): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join('-');
  const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `osti-${domain}-${words}-${ym}`;
}

// ── OSTI API fetch ────────────────────────────────────────────────────────────

const OSTI_BASE = 'https://www.osti.gov/api/v1/records';
const PAGE_SIZE = 25;

// Product types to skip — too broad or not signal-relevant
const SKIP_TYPES = new Set(['Dataset', 'Book', 'Patent', 'Software']);

async function fetchOstiPage(keyword: string, page: number, fromDate: string): Promise<OstiRecord[]> {
  const params = new URLSearchParams({
    q:                  keyword,
    rows:               String(PAGE_SIZE),
    page:               String(page),
    sort:               'publication_date desc',
    datePublishedStart: fromDate,
  });

  const resp = await fetch(`${OSTI_BASE}?${params}`, {
    headers: { Accept: 'application/json' },
  });

  if (!resp.ok) throw new Error(`OSTI HTTP ${resp.status}`);

  const json = await resp.json() as unknown;
  if (!Array.isArray(json)) return [];
  return json as OstiRecord[];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadEnv();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!DRY_RUN && (!supabaseUrl || !serviceKey)) {
    log('error', 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  const supabase: SupabaseClient = DRY_RUN
    ? (null as unknown as SupabaseClient)
    : createClient(supabaseUrl!, serviceKey!);

  // ── Worker run record ──────────────────────────────────────────────────────

  let runId: number | null = null;
  if (!DRY_RUN) {
    const { data } = await supabase
      .from('worker_runs')
      .insert({ worker: 'osti', status: 'running', started_at: new Date().toISOString() })
      .select('id')
      .single();
    runId = data?.id ?? null;
  }

  const result = {
    signals_written: 0,
    signals_skipped: 0,
    signals_error:   0,
    errors:          [] as string[],
  };

  const seenIds = new Set<string>();
  const fromDate = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  log('info', 'OSTI worker started', { dry: DRY_RUN, max: MAX_TOTAL, fromDate });

  // ── Ingest per domain query ────────────────────────────────────────────────

  for (const dq of DOMAIN_QUERIES) {
    if (result.signals_written >= MAX_TOTAL) break;

    log('info', `Fetching: ${dq.keyword}`, { domain: dq.domain, cap: PER_KEYWORD_CAP });

    let writtenThisKeyword = 0;
    let page = 0;
    let exhausted = false;

    while (
      writtenThisKeyword < PER_KEYWORD_CAP &&
      result.signals_written < MAX_TOTAL &&
      !exhausted
    ) {
      let records: OstiRecord[];
      try {
        records = await fetchOstiPage(dq.keyword, page, fromDate);
      } catch (err) {
        log('error', 'OSTI fetch failed', { keyword: dq.keyword, page, err: String(err) });
        break;
      }

      if (records.length === 0) {
        exhausted = true;
        break;
      }

      for (const rec of records) {
        if (writtenThisKeyword >= PER_KEYWORD_CAP || result.signals_written >= MAX_TOTAL) break;

        const id = String(rec.osti_id ?? '');
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);

        // Skip non-signal product types
        const pType = rec.product_type ?? '';
        if (SKIP_TYPES.has(pType)) { result.signals_skipped++; continue; }

        const title    = (rec.title ?? '').trim();
        const abstract = (rec.description ?? '').trim();
        if (title.length < 5 || !abstract) { result.signals_skipped++; continue; }

        const pubDate = rec.publication_date ? new Date(rec.publication_date) : new Date();
        if (isNaN(pubDate.getTime())) { result.signals_skipped++; continue; }

        const score      = computeScore(rec, dq);
        const slug       = makeSlug(dq.domain, title, pubDate);
        const sourceUrl  = rec.doi
          ? `https://doi.org/${rec.doi}`
          : `https://www.osti.gov/biblio/${id}`;
        const signalType = pType === 'Conference' ? 'paper' : 'lab_publication';

        const payload = {
          slug,
          title,
          summary:         abstract.slice(0, 800),
          source_name:     'DOE OSTI',
          source_url:      sourceUrl,
          category:        dq.domain,
          signal_type:     signalType,
          confidence:      'verified',
          status:          'pending',
          reviewed_by:     'worker-osti',
          tags:            ['doe', 'osti', dq.domain],
          curator_score:   Math.round(score.total / 10),
          signal_strength: +(score.total / 100).toFixed(4),
          novelty_score:   +(score.novelty / 25).toFixed(4),
          published_at:    pubDate.toISOString(),
        };

        if (DRY_RUN) {
          log('info', '[DRY] would insert', {
            slug, domain: dq.domain, product: pType, score: score.total,
          });
          result.signals_written++;
          writtenThisKeyword++;
          continue;
        }

        const { error: insErr } = await supabase.from('signals').insert(payload);
        if (insErr) {
          if (insErr.code === '23505') {
            result.signals_skipped++;
          } else {
            log('warn', `Insert failed: ${slug}`, { error: insErr.message });
            result.errors.push(`${slug}: ${insErr.message}`);
            result.signals_error++;
          }
          continue;
        }

        log('info', 'Inserted', { slug, domain: dq.domain, score: score.total });
        result.signals_written++;
        writtenThisKeyword++;
      }

      page++;
    }

    log('info', `Done: ${dq.keyword}`, { written: writtenThisKeyword });
  }

  // ── Finalize run record ────────────────────────────────────────────────────

  if (!DRY_RUN && runId !== null) {
    await supabase
      .from('worker_runs')
      .update({
        status:      'completed',
        finished_at: new Date().toISOString(),
        meta:        result,
      })
      .eq('id', runId);
  }

  log('info', 'OSTI worker finished', {
    signals_written: result.signals_written,
    signals_skipped: result.signals_skipped,
    signals_error:   result.signals_error,
  });
}

main().catch((err) => {
  log('error', 'Unhandled error', { err: String(err) });
  process.exit(1);
});

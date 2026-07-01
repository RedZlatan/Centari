// Sprint R8G — UKRI (UK Research and Innovation) ingestion worker
// Run: npx tsx worker/src/ukri.ts [--dry-run] [--max=N]
//
// Source: UKRI Gateway to Research API (gtr.ukri.org/gtr/api)
// Covers EPSRC, BBSRC, AHRC, ESRC, MRC, NERC, Innovate UK, STFC, ISPF.
// UK post-Brexit counterpart to EU Cordis — major AI, quantum, robotics hub.
// No API key required. Min page size = 10.
// Signal type: funding | Confidence: verified

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs   from 'fs';
import * as path from 'path';

// ── CLI flags ─────────────────────────────────────────────────────────────────

const argv      = process.argv.slice(2);
const DRY_RUN   = argv.includes('--dry-run');
const MAX_TOTAL = parseInt(argv.find(a => a.startsWith('--max='))?.split('=')[1] ?? '80', 10);

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

type CentariDomain = 'ai' | 'xr' | 'robotics' | 'quantum' | 'space' | 'energy' | 'materials';

interface DomainQuery {
  domain:       CentariDomain;
  keyword:      string;
  strategicBase: number;
}

// UK strategic priorities: AI + quantum (National Quantum Strategy, AI Safety Institute),
// materials (Henry Royce Institute), energy (UKRI clean energy programme)
const DOMAIN_QUERIES: DomainQuery[] = [
  { domain: 'ai',        keyword: 'artificial intelligence',  strategicBase: 17 },
  { domain: 'ai',        keyword: 'machine learning',         strategicBase: 16 },
  { domain: 'quantum',   keyword: 'quantum computing',        strategicBase: 20 },
  { domain: 'quantum',   keyword: 'quantum sensing',          strategicBase: 17 },
  { domain: 'robotics',  keyword: 'robotics autonomous',      strategicBase: 15 },
  { domain: 'energy',    keyword: 'renewable energy',         strategicBase: 16 },
  { domain: 'energy',    keyword: 'fusion energy',            strategicBase: 18 },
  { domain: 'materials', keyword: 'advanced materials',       strategicBase: 15 },
  { domain: 'space',     keyword: 'space technology',         strategicBase: 14 },
  { domain: 'xr',        keyword: 'extended reality immersive', strategicBase: 13 },
];

// Grant categories worth ingesting (skip PhD studentships)
const SKIP_GRANT_CATEGORIES = new Set([
  'Studentship',
  'Training Grant',
]);

const PAGE_SIZE     = 25;
const PER_KW_CAP    = Math.max(5, Math.ceil(MAX_TOTAL / DOMAIN_QUERIES.length));
// UKRI GTR has no published rate-limit docs; be polite with 500 ms between pages
const INTER_PAGE_MS = 500;

// ── UKRI API types ────────────────────────────────────────────────────────────

interface UKRILink {
  rel:   string;
  href?: string;
  start?: number | null;
  end?:   number | null;
}

interface UKRIProject {
  id?:                        string;
  href?:                      string;
  title?:                     string;
  abstractText?:              string;
  techAbstractText?:          string;
  grantCategory?:             string;
  leadFunder?:                string;
  created?:                   number;  // epoch ms
  links?: { link?: UKRILink[] };
}

interface UKRIResponse {
  totalSize?:  number;
  totalPages?: number;
  page?:       number;
  project?:    UKRIProject[];
}

// ── Scoring (same 4-dimension framework as OSTI / Cordis) ─────────────────────

const NOVELTY_KEYWORDS: Record<string, number> = {
  'breakthrough': 4, 'novel':      3, 'first':         4, 'pioneering': 4,
  'new approach': 3, 'beyond':     2, 'next-generation':3, 'advanced':   1,
  'scalable':     2, 'quantum':    2, 'neuromorphic':   4, 'fusion':     4,
  'zero-shot':    3, 'emergent':   3, 'fault-tolerant': 4, 'end-to-end': 2,
};

const INTEREST_KEYWORDS: Record<string, number> = {
  'climate':       4, 'net zero':   4, 'health':    3, 'cancer':     4,
  'autonomous':    3, 'robot':      2, 'qubit':     4, 'photonic':   3,
  'carbon':        3, 'hydrogen':   3, 'battery':   3, 'fusion':     4,
  'exoplanet':     3, 'black hole': 4, 'pandemic':  3, 'safety':     2,
};

function scoreText(text: string, map: Record<string, number>, base: number): number {
  const lower = text.toLowerCase();
  let s = base;
  for (const [kw, pts] of Object.entries(map)) {
    if (lower.includes(kw)) s = Math.min(25, s + pts);
  }
  return s;
}

function computeScore(project: UKRIProject, dq: DomainQuery) {
  const text          = `${project.title ?? ''} ${project.abstractText ?? ''}`;
  const novelty       = scoreText(text, NOVELTY_KEYWORDS, 6);
  const relevance     = 21;  // UKRI grants are always on-domain; slightly below Cordis (22)
  const publicInterest = scoreText(text, INTEREST_KEYWORDS, 11);
  const total         = novelty + dq.strategicBase + relevance + publicInterest;
  return { novelty, strategic: dq.strategicBase, relevance, publicInterest, total };
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
  return `ukri-${domain}-${words}-${ym}`;
}

// ── UKRI fetch ────────────────────────────────────────────────────────────────

const UKRI_BASE = 'https://gtr.ukri.org/gtr/api/projects';

async function fetchPage(keyword: string, page: number): Promise<UKRIProject[]> {
  const params = new URLSearchParams({
    q:    keyword,
    s:    String(PAGE_SIZE),
    p:    String(page),
  });

  const resp = await fetch(`${UKRI_BASE}?${params}`, {
    headers: {
      Accept:       'application/json',
      'User-Agent': 'CentariResearch/1.0 (research signal ingestion)',
    },
  });
  if (!resp.ok) throw new Error(`UKRI HTTP ${resp.status}`);

  const json = await resp.json() as UKRIResponse;
  return json.project ?? [];
}

// ── Main ──────────────────────────────────────────────────────────────────────

// UK lat/lng — single country-level point for all UKRI signals.
// Finer city/region resolution possible via org lookup but adds per-project HTTP round-trips.
const UK_LAT = 51.5;
const UK_LNG = -0.1;

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

  let runId: string | null = null;
  if (!DRY_RUN) {
    const { data } = await supabase
      .from('worker_runs')
      .insert({ status: 'running', started_at: new Date().toISOString() })
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

  log('info', 'UKRI worker started', { dry: DRY_RUN, max: MAX_TOTAL });

  for (const dq of DOMAIN_QUERIES) {
    if (result.signals_written >= MAX_TOTAL) break;

    log('info', `Fetching: ${dq.keyword}`, { domain: dq.domain, cap: PER_KW_CAP });

    let writtenThisKw = 0;
    let page          = 1;
    let exhausted     = false;

    while (writtenThisKw < PER_KW_CAP && result.signals_written < MAX_TOTAL && !exhausted) {
      if (page > 1) await new Promise<void>(r => setTimeout(r, INTER_PAGE_MS));

      let projects: UKRIProject[];
      try {
        projects = await fetchPage(dq.keyword, page);
      } catch (err) {
        log('error', 'UKRI fetch failed', { keyword: dq.keyword, page, err: String(err) });
        break;
      }

      if (projects.length === 0) { exhausted = true; break; }

      for (const project of projects) {
        if (writtenThisKw >= PER_KW_CAP || result.signals_written >= MAX_TOTAL) break;

        const id = project.id ?? '';
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);

        // Skip low-value grant types
        if (SKIP_GRANT_CATEGORIES.has(project.grantCategory ?? '')) {
          result.signals_skipped++;
          continue;
        }

        const title    = (project.title ?? '').trim();
        const abstract = (project.abstractText ?? project.techAbstractText ?? '').trim();

        if (title.length < 5 || abstract.length < 20) {
          result.signals_skipped++;
          continue;
        }

        // created is epoch ms; fall back to now if missing
        const pubDate = project.created
          ? new Date(project.created)
          : new Date();

        const score = computeScore(project, dq);
        const slug  = makeSlug(dq.domain, title, pubDate);

        const grantCat = project.grantCategory ?? '';
        const funder   = project.leadFunder    ?? 'UKRI';

        const payload = {
          slug,
          title,
          summary:         abstract.slice(0, 490),
          source_name:     `UKRI — ${funder}`,
          source_url:      project.href
                             ? project.href.replace('http://', 'https://')
                             : `https://gtr.ukri.org/projects?ref=${encodeURIComponent(id)}`,
          category:        dq.domain,
          signal_type:     'funding',
          confidence:      'verified',
          status:          'pending',
          reviewed_by:     'worker-ukri',
          tags:            ['ukri', funder.toLowerCase(), dq.domain, grantCat.toLowerCase().replace(/\s+/g, '-')],
          curator_score:   Math.round(score.total / 10),
          signal_strength: +(score.total / 100).toFixed(4),
          novelty_score:   +(score.novelty / 25).toFixed(4),
          published_at:    pubDate.toISOString(),
        };

        if (DRY_RUN) {
          log('info', '[DRY] would insert', {
            slug, domain: dq.domain, funder, grantCat, score: score.total,
          });
          result.signals_written++;
          writtenThisKw++;
          continue;
        }

        const { data: sigData, error: insErr } = await supabase
          .from('signals')
          .insert(payload)
          .select('id')
          .single();

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

        // Insert UK location row
        if (sigData?.id) {
          await supabase.from('signal_locations').insert({
            signal_id:           sigData.id,
            country_code:        'GB',
            country_name:        'United Kingdom',
            region:              'Europe',
            lat:                 UK_LAT,
            lng:                 UK_LNG,
            location_confidence: 'low',
            place_type:          'country',
          });
        }

        log('info', 'Inserted', { slug, domain: dq.domain, funder, score: score.total });
        result.signals_written++;
        writtenThisKw++;
      }

      page++;
    }

    log('info', `Done: ${dq.keyword}`, { written: writtenThisKw });
  }

  if (!DRY_RUN && runId !== null) {
    await supabase
      .from('worker_runs')
      .update({ status: 'completed', finished_at: new Date().toISOString(), meta: result })
      .eq('id', runId);
  }

  log('info', 'UKRI worker finished', {
    signals_written: result.signals_written,
    signals_skipped: result.signals_skipped,
    signals_error:   result.signals_error,
  });
}

main().catch((err) => {
  log('error', 'Unhandled error', { err: String(err) });
  process.exit(1);
});

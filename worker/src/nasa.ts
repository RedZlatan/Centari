// Sprint R8C — NASA NTRS technical reports ingestion worker
// Run: npx tsx worker/src/nasa.ts [--dry-run] [--max=N] [--days=N]
//
// Signals are tagged with mission id (['iss'], ['hubble'], ['jwst']) so the
// globe's satellite click handler can filter them by mission.
// Signal type: lab_publication | Confidence: verified (official NASA source)

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs   from 'fs';
import * as path from 'path';

// ── CLI flags ─────────────────────────────────────────────────────────────────

const argv      = process.argv.slice(2);
const DRY_RUN   = argv.includes('--dry-run');
const MAX_TOTAL = parseInt(argv.find(a => a.startsWith('--max='))?.split('=')[1]   ?? '60',   10);
// NTRS is an archive with records spanning decades — use 2 years as default window
const DAYS      = parseInt(argv.find(a => a.startsWith('--days='))?.split('=')[1]  ?? '730',  10);

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

// ── Mission definitions ───────────────────────────────────────────────────────

interface Mission {
  id: 'iss' | 'hubble' | 'jwst';
  name: string;
  keyword: string;
  strategicBonus: number; // added to the 14-point space base
  interestBonus: number;  // added to public-interest dimension
}

const MISSIONS: Mission[] = [
  {
    id: 'iss',
    name: 'International Space Station',
    keyword: 'international space station',
    strategicBonus: 3,
    interestBonus: 4,
  },
  {
    id: 'hubble',
    name: 'Hubble Space Telescope',
    keyword: 'hubble space telescope',
    strategicBonus: 4,
    interestBonus: 6,
  },
  {
    id: 'jwst',
    name: 'James Webb Space Telescope',
    keyword: 'james webb space telescope',
    strategicBonus: 5,
    interestBonus: 8,
  },
];

// Budget per mission so no single mission eats the whole quota
const PER_MISSION_CAP = Math.max(5, Math.ceil(MAX_TOTAL / MISSIONS.length));

// ── NTRS API types ────────────────────────────────────────────────────────────

// Fields returned directly on each result object (not nested in _source)
interface NtrsResult {
  id?: number;
  title?: string;
  abstract?: string;
  stiType?: string;          // 'JOURNAL_ARTICLE' | 'CONFERENCE_PAPER' | 'TECHNICAL_REPORT' | ...
  distributionDate?: string; // ISO 8601 e.g. "2024-07-24T00:00:00.0000000+00:00"
  disseminated?: string;     // 'DOCUMENT_AND_METADATA' = publicly available
}

interface NtrsResponse {
  stats: {
    total: number;
  };
  results: NtrsResult[];
}

// ── Scoring ───────────────────────────────────────────────────────────────────

interface EditorialScore {
  novelty:        number; // 0-25
  strategic:      number; // 0-25
  relevance:      number; // 0-25
  publicInterest: number; // 0-25
  total:          number; // 0-100
}

const NOVELTY_KEYWORDS: Record<string, number> = {
  'first':        5, 'unprecedented': 5, 'discovery':  4, 'breakthrough': 4,
  'novel':        4, 'new':           2, 'imaging':    3, 'spectrum':     2,
  'exoplanet':    4, 'atmosphere':    3, 'galaxy':     3, 'dark matter':  4,
  'black hole':   4, 'gravitational': 3, 'microgravity': 3, 'experiment': 2,
};

function noveltyFromText(text: string): number {
  const lower = text.toLowerCase();
  let score = 8; // baseline for a NASA mission paper
  for (const [kw, pts] of Object.entries(NOVELTY_KEYWORDS)) {
    if (lower.includes(kw)) score = Math.min(25, score + pts);
  }
  return score;
}

function computeScore(source: NtrsResult, mission: Mission): EditorialScore {
  const titleAbstract = `${source.title ?? ''} ${source.abstract ?? ''}`;

  const novelty        = noveltyFromText(titleAbstract);
  // Space domain base: 14. Each mission adds a bonus for specificity.
  const strategic      = Math.min(25, 14 + mission.strategicBonus);
  // Mission-targeted papers are always highly relevant to the space domain feed.
  const relevance      = 23;
  const publicInterest = Math.min(25, 14 + mission.interestBonus);

  const total = novelty + strategic + relevance + publicInterest;
  return { novelty, strategic, relevance, publicInterest, total };
}

// ── Slug ──────────────────────────────────────────────────────────────────────

function makeSlug(missionId: string, title: string, date: Date): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join('-');
  const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `nasa-${missionId}-${words}-${ym}`;
}

// ── NTRS API fetch ────────────────────────────────────────────────────────────

const NTRS_BASE       = 'https://ntrs.nasa.gov/api/citations/search';
const PAGE_TIMEOUT_MS = 20_000;

// NTRS uses `q` for full-text query and `from` for offset (returns 10 per page)
async function fetchNtrsPage(query: string, from: number): Promise<NtrsResult[]> {
  const params = new URLSearchParams({ q: query, from: String(from) });
  const url    = `${NTRS_BASE}?${params}`;

  const ctrl   = new AbortController();
  const timer  = setTimeout(() => ctrl.abort('timeout'), PAGE_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      signal:  ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'CentariResearch/1.0' },
    });
    clearTimeout(timer);

    if (!resp.ok) throw new Error(`NTRS HTTP ${resp.status}`);

    const json = await resp.json() as NtrsResponse;
    return json.results ?? [];
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  loadEnv();

  const supabaseUrl  = process.env.SUPABASE_URL;
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
      .insert({ worker: 'nasa', status: 'running', started_at: new Date().toISOString() })
      .select('id')
      .single();
    runId = data?.id ?? null;
  }

  const result = {
    signals_written: 0,
    signals_skipped: 0,
    signals_error:   0,
  };

  const seenIds = new Set<string>();
  const fromDate = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);

  // ── Ingest per mission ─────────────────────────────────────────────────────
  // NTRS throttles rapid sequential requests. We fetch only one page per mission
  // with a polite 2-second delay between missions.

  for (let mIdx = 0; mIdx < MISSIONS.length; mIdx++) {
    const mission = MISSIONS[mIdx];
    if (mIdx > 0) await new Promise<void>(resolve => setTimeout(resolve, 2000));

    log('info', `Fetching mission: ${mission.name}`, { query: mission.keyword, cap: PER_MISSION_CAP });

    let written   = 0;
    // Single-page fetch per mission — NTRS throttles pagination requests
    const from = 0;
    const exhausted = false;
    void exhausted; // suppress unused-var warning

    {
      let results: NtrsResult[];
      try {
        results = await fetchNtrsPage(mission.keyword, from);
      } catch (err) {
        log('error', 'NTRS fetch failed', { mission: mission.id, err: String(err) });
        results = [];
      }

      if (results.length === 0) {
        log('warn', 'No results from NTRS', { mission: mission.id });
      }

      for (const rec of results) {
        if (written >= PER_MISSION_CAP || result.signals_written >= MAX_TOTAL) break;

        const ntrsId = String(rec.id ?? '');
        if (!ntrsId || seenIds.has(ntrsId)) continue;
        seenIds.add(ntrsId);

        // Only publicly disseminated records
        if (rec.disseminated && rec.disseminated !== 'DOCUMENT_AND_METADATA') {
          result.signals_skipped++;
          continue;
        }

        const title    = (rec.title ?? '').trim();
        const abstract = (rec.abstract ?? '').trim();
        if (title.length < 5 || !abstract) {
          result.signals_skipped++;
          continue;
        }

        // Parse distribution/publication date; client-side recency filter
        const pubDate = rec.distributionDate ? new Date(rec.distributionDate) : new Date();
        if (isNaN(pubDate.getTime())) {
          result.signals_skipped++;
          continue;
        }
        if (pubDate < fromDate) {
          result.signals_skipped++;
          continue;
        }

        const score   = computeScore(rec, mission);
        const slug    = makeSlug(mission.id, title, pubDate);

        // Map stiType → signal_type
        const stiType    = (rec.stiType ?? '').toUpperCase();
        const signalType = stiType === 'CONFERENCE_PAPER' ? 'paper' : 'lab_publication';

        const payload = {
          slug,
          title,
          summary: abstract.slice(0, 800),
          source_name: `NASA NTRS — ${mission.name}`,
          source_url: `https://ntrs.nasa.gov/citations/${ntrsId}`,
          category: 'space',
          signal_type: signalType,
          confidence: 'verified',
          status: 'pending',
          reviewed_by: 'worker-nasa',
          tags: [mission.id, 'nasa'],
          curator_score:   Math.round(score.total / 10),
          signal_strength: +(score.total / 100).toFixed(4),
          novelty_score:   +(score.novelty / 25).toFixed(4),
          published_at: pubDate.toISOString(),
        };

        if (DRY_RUN) {
          log('info', '[DRY] would insert', { slug, domain: 'space', mission: mission.id, score: score.total });
          result.signals_written++;
          written++;
          continue;
        }

        const { error: insErr } = await supabase.from('signals').insert(payload);
        if (insErr) {
          if (insErr.code === '23505') {
            // Duplicate slug — already ingested
            result.signals_skipped++;
          } else {
            log('warn', `Insert failed for ${slug}`, { error: insErr.message });
            result.signals_error++;
          }
          continue;
        }

        log('info', 'Inserted', { slug, mission: mission.id, score: score.total });
        result.signals_written++;
        written++;
      }
    }

    log('info', `Mission ${mission.id} done`, { written });
  }

  // ── Finalize run record ────────────────────────────────────────────────────

  if (!DRY_RUN && runId !== null) {
    await supabase
      .from('worker_runs')
      .update({
        status: 'completed',
        finished_at: new Date().toISOString(),
        meta: result,
      })
      .eq('id', runId);
  }

  log('info', 'NASA worker finished', result);
}

main().catch((err) => {
  log('error', 'Unhandled error', { err: String(err) });
  process.exit(1);
});

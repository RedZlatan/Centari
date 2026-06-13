// Sprint R8A — arXiv ingestion worker
// Run: npx tsx worker/src/arxiv.ts [--dry-run] [--max=N] [--days=N]
// Fetches recent papers from arXiv, normalises to Research Map signal shape,
// inserts as status='pending' via the Supabase service role key.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ── CLI flags ─────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const DRY_RUN   = argv.includes('--dry-run');
const MAX_TOTAL = parseInt(argv.find(a => a.startsWith('--max='))?.split('=')[1] ?? '50', 10);
const DAYS      = parseInt(argv.find(a => a.startsWith('--days='))?.split('=')[1] ?? '7',  10);

// ── Env loading ───────────────────────────────────────────────────────────────
// Reads .env.local from the repo root (process.cwd() when run from root).

function loadEnv(): void {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
}

// ── Logging ───────────────────────────────────────────────────────────────────

function log(level: 'info' | 'warn' | 'error', msg: string, data?: Record<string, unknown>): void {
  const parts: string[] = [`[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`];
  if (data) parts.push(JSON.stringify(data));
  const line = parts.join(' ');
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

// ── Category map ──────────────────────────────────────────────────────────────
// Maps Centari domain → arXiv category identifiers.

const CATEGORY_MAP: Array<{ arxivCat: string; domain: CentariDomain }> = [
  { arxivCat: 'cs.AI',              domain: 'ai'        },
  { arxivCat: 'cs.LG',              domain: 'ai'        },
  { arxivCat: 'cs.CL',              domain: 'ai'        },
  { arxivCat: 'cs.CV',              domain: 'ai'        },
  { arxivCat: 'cs.NE',              domain: 'ai'        },
  { arxivCat: 'cs.RO',              domain: 'robotics'  },
  { arxivCat: 'quant-ph',           domain: 'quantum'   },
  { arxivCat: 'cond-mat.supr-con',  domain: 'quantum'   },
  { arxivCat: 'cs.HC',              domain: 'xr'        },
  { arxivCat: 'cs.GR',              domain: 'xr'        },
  { arxivCat: 'astro-ph.IM',        domain: 'space'     },
  { arxivCat: 'astro-ph.EP',        domain: 'space'     },
  { arxivCat: 'physics.app-ph',     domain: 'energy'    },
  { arxivCat: 'cond-mat.mtrl-sci',  domain: 'materials' },
];

type CentariDomain = 'ai' | 'xr' | 'robotics' | 'quantum' | 'space' | 'energy' | 'materials';

// ── Slug generation ───────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','into','via','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','not','no','nor','as','if','its','it','this','that',
  'these','those','our','new','using','based','towards','toward',
]);

function makeSlug(arxivId: string, title: string, publishedAt: Date): string {
  const month = `${publishedAt.getFullYear()}-${String(publishedAt.getMonth() + 1).padStart(2, '0')}`;
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 5)
    .join('-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
  return `arxiv-${words}-${month}`;
}

// ── Atom XML parsing ──────────────────────────────────────────────────────────

interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  published: string;
  link: string;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function extractText(block: string, tag: string): string {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(block);
  if (!m) return '';
  return decodeXmlEntities(m[1].replace(/\s+/g, ' ').trim());
}

function parseAtom(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;

  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];

    const rawId    = extractText(block, 'id');
    const title    = extractText(block, 'title');
    const summary  = extractText(block, 'summary');
    const published = extractText(block, 'published');

    // Extract the canonical HTML link (rel="alternate")
    const linkM = /href="([^"]+)"\s+rel="alternate"/.exec(block)
               ?? /href="([^"]+)"/.exec(block);
    const link = linkM ? linkM[1] : rawId;

    // Normalise arXiv ID: strip version suffix
    const idM = /abs\/(\d{4}\.\d{4,5})(v\d+)?$/.exec(rawId);
    const id = idM ? idM[1] : rawId;

    if (!id || !title || !summary || !published) continue;
    entries.push({ id, title, summary, published, link });
  }
  return entries;
}

// ── arXiv fetch ───────────────────────────────────────────────────────────────

async function fetchArxiv(category: string, maxResults: number): Promise<ArxivEntry[]> {
  const url = `https://export.arxiv.org/api/query?search_query=cat:${category}&sortBy=submittedDate&sortOrder=descending&start=0&max_results=${maxResults}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Centari-Worker/1.0 (research signal ingestion; robin89.olsson@gmail.com)' },
  });
  if (!res.ok) throw new Error(`arXiv HTTP ${res.status} for ${category}`);
  const xml = await res.text();
  return parseAtom(xml);
}

// ── Sleep ─────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Truncate for schema constraints ──────────────────────────────────────────

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

// ── Main worker ───────────────────────────────────────────────────────────────

interface WorkerResult {
  signals_found: number;
  signals_written: number;
  signals_skipped: number;
  errors: string[];
}

async function run(): Promise<void> {
  loadEnv();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    log('error', 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  log('info', 'arXiv worker starting', {
    dry_run: DRY_RUN,
    max_total: MAX_TOTAL,
    lookback_days: DAYS,
    categories: CATEGORY_MAP.length,
  });

  const supabase: SupabaseClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const startedAt = new Date().toISOString();
  const result: WorkerResult = { signals_found: 0, signals_written: 0, signals_skipped: 0, errors: [] };

  // ── 1. Ensure arXiv source row exists ─────────────────────────────────────
  let sourceId: string | null = null;

  if (!DRY_RUN) {
    const { data: upserted, error: srcErr } = await supabase
      .from('sources')
      .upsert(
        {
          slug:         'arxiv',
          name:         'arXiv',
          homepage_url: 'https://arxiv.org',
          tier:         1,
          description:  'Open-access preprint repository for physics, mathematics, CS, and quantitative biology. Operated by Cornell University.',
        },
        { onConflict: 'slug', ignoreDuplicates: false }
      )
      .select('id')
      .single();

    if (srcErr || !upserted) {
      log('error', 'Could not upsert arXiv source', { error: srcErr?.message });
      process.exit(1);
    }
    sourceId = upserted.id as string;
    log('info', 'arXiv source ready', { source_id: sourceId });
  } else {
    log('info', '[dry-run] Skipping source upsert');
  }

  // ── 2. Log worker run start ────────────────────────────────────────────────
  let workerRunId: string | null = null;

  if (!DRY_RUN) {
    const { data: runRow, error: runErr } = await supabase
      .from('worker_runs')
      .insert({ status: 'running', runner_version: 'arxiv-worker-1.0' })
      .select('id')
      .single();

    if (runErr || !runRow) {
      log('warn', 'Could not create worker_runs row — continuing without run tracking', { error: runErr?.message });
    } else {
      workerRunId = runRow.id as string;
      log('info', 'Worker run created', { run_id: workerRunId });
    }
  }

  // ── 3. Fetch and ingest per category ──────────────────────────────────────
  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  // Track already-seen arXiv IDs within this run to avoid cross-category dupes
  const seenIds = new Set<string>();

  for (let i = 0; i < CATEGORY_MAP.length; i++) {
    if (result.signals_written >= MAX_TOTAL) {
      log('info', `Reached max_total=${MAX_TOTAL}, stopping early`);
      break;
    }

    const { arxivCat, domain } = CATEGORY_MAP[i];
    const remaining = MAX_TOTAL - result.signals_written;
    const fetchN = Math.min(25, remaining + 5); // fetch a few extra to allow for cutoff filtering

    if (i > 0) await sleep(1100); // arXiv rate limit: 1 req/s

    log('info', `Fetching ${arxivCat} (domain=${domain})`, { max: fetchN });

    let entries: ArxivEntry[];
    try {
      entries = await fetchArxiv(arxivCat, fetchN);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log('error', `Failed to fetch ${arxivCat}`, { error: msg });
      result.errors.push(`${arxivCat}: ${msg}`);
      continue;
    }

    log('info', `Fetched ${entries.length} entries from ${arxivCat}`);

    for (const entry of entries) {
      if (result.signals_written >= MAX_TOTAL) break;

      // Skip cross-category duplicates within this run
      if (seenIds.has(entry.id)) {
        result.signals_skipped++;
        continue;
      }
      seenIds.add(entry.id);

      // Apply lookback window filter
      const publishedAt = new Date(entry.published);
      if (isNaN(publishedAt.getTime()) || publishedAt < cutoff) {
        log('info', `Skipping ${entry.id} — outside lookback window`, { published: entry.published });
        result.signals_skipped++;
        continue;
      }

      result.signals_found++;

      const title   = truncate(entry.title, 200);
      const rawSummary = entry.summary.replace(/\s+/g, ' ').trim();
      const summary = truncate(rawSummary, 497);

      if (summary.length < 20) {
        log('warn', `Skipping ${entry.id} — summary too short`);
        result.signals_skipped++;
        continue;
      }

      const slug = makeSlug(entry.id, entry.title, publishedAt);

      const signal = {
        slug,
        source_id:    sourceId,
        source_url:   entry.link,
        source_name:  'arXiv',
        published_at: publishedAt.toISOString(),
        title,
        summary,
        category:     domain as string,
        signal_type:  'paper',
        confidence:   'probable',
        curator_score: 5,
        signal_strength: 0.500,
        novelty_score:   0.600,
        momentum_score:  0.500,
        status:       'pending',
        reviewed_by:  'worker-arxiv',
        tags:         [arxivCat],
      };

      if (DRY_RUN) {
        log('info', '[dry-run] Would insert signal', {
          slug,
          title: title.slice(0, 80),
          category: domain,
          published: entry.published,
        });
        result.signals_written++;
        continue;
      }

      const { error: insErr } = await supabase
        .from('signals')
        .insert(signal);

      if (insErr) {
        // Code 23505 = unique_violation → slug already exists, expected dedup
        if (insErr.code === '23505') {
          log('info', `Skipped duplicate slug: ${slug}`);
          result.signals_skipped++;
        } else {
          log('warn', `Insert failed for ${slug}`, { error: insErr.message, code: insErr.code });
          result.errors.push(`${slug}: ${insErr.message}`);
        }
      } else {
        log('info', `Inserted signal`, { slug, title: title.slice(0, 60), domain });
        result.signals_written++;
      }
    }
  }

  // ── 4. Update worker_run row ───────────────────────────────────────────────
  if (!DRY_RUN && workerRunId) {
    const finalStatus = result.errors.length > 0 && result.signals_written === 0
      ? 'failed'
      : result.errors.length > 0
        ? 'completed'
        : 'completed';

    const { error: updateErr } = await supabase
      .from('worker_runs')
      .update({
        status:            finalStatus,
        finished_at:       new Date().toISOString(),
        signals_fetched:   result.signals_found,
        signals_inserted:  result.signals_written,
        signals_rejected:  result.signals_skipped,
        error_message:     result.errors.length > 0 ? result.errors.join('; ') : null,
      })
      .eq('id', workerRunId);

    if (updateErr) {
      log('warn', 'Could not update worker_runs row', { error: updateErr.message });
    }
  }

  // ── 5. Summary ────────────────────────────────────────────────────────────
  log('info', DRY_RUN ? '[dry-run] Run complete' : 'Run complete', {
    signals_found:   result.signals_found,
    signals_written: result.signals_written,
    signals_skipped: result.signals_skipped,
    errors:          result.errors.length,
    duration_s:      ((Date.now() - new Date(startedAt).getTime()) / 1000).toFixed(1),
  });

  if (result.errors.length > 0) {
    log('warn', 'Non-fatal errors during run', { errors: result.errors });
    process.exit(0); // partial success, not a hard failure
  }
}

run().catch(err => {
  log('error', 'Fatal error', { error: String(err) });
  process.exit(1);
});

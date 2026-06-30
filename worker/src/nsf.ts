// Sprint R8B — NSF Award Search ingestion worker
// Run: npx tsx worker/src/nsf.ts [--dry-run] [--max=N] [--days=N]
//
// Signal type: funding | Confidence: verified (official US government source, no API key required)

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ── CLI flags ─────────────────────────────────────────────────────────────────

const argv      = process.argv.slice(2);
const DRY_RUN   = argv.includes('--dry-run');
const MAX_TOTAL = parseInt(argv.find(a => a.startsWith('--max='))?.split('=')[1]  ?? '50', 10);
const DAYS      = parseInt(argv.find(a => a.startsWith('--days='))?.split('=')[1] ?? '14', 10);

// ── Env / logging ─────────────────────────────────────────────────────────────

function loadEnv(): void {
  // Look in cwd first, then one level up (worker/ subdirectory pattern)
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

// ── Domain types ──────────────────────────────────────────────────────────────

type CentariDomain = 'ai' | 'xr' | 'robotics' | 'quantum' | 'space' | 'energy' | 'materials';
type StoredDomain  = CentariDomain | 'other';

// ── Domain query groups ───────────────────────────────────────────────────────
//
// Each entry drives a separate NSF keyword search. Multiple keywords per domain
// keep recall high while avoiding NSF's single-keyword limitation.
// Seen award IDs deduplicate across queries; first-matching domain wins.

interface DomainQuery {
  domain: CentariDomain;
  keyword: string;
}

const DOMAIN_QUERIES: DomainQuery[] = [
  { domain: 'ai',        keyword: 'artificial intelligence' },
  { domain: 'ai',        keyword: 'machine learning' },
  { domain: 'robotics',  keyword: 'robotics' },
  { domain: 'quantum',   keyword: 'quantum computing' },
  { domain: 'quantum',   keyword: 'quantum information' },
  { domain: 'space',     keyword: 'astrophysics' },
  { domain: 'space',     keyword: 'space science' },
  { domain: 'energy',    keyword: 'renewable energy' },
  { domain: 'energy',    keyword: 'energy storage' },
  { domain: 'materials', keyword: 'materials science' },
  { domain: 'materials', keyword: 'nanotechnology' },
];

// ── Slug / text helpers ───────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','into','via','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','not','no','nor','as','if','its','it','this','that',
  'these','those','our','new','using','based','towards','toward',
]);

function makeSlug(title: string, grantedAt: Date): string {
  const month = `${grantedAt.getFullYear()}-${String(grantedAt.getMonth() + 1).padStart(2, '0')}`;
  const words = title
    .toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w)).slice(0, 5)
    .join('-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
  return `nsf-${words}-${month}`;
}

function truncateSentence(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  return lastEnd > max * 0.6 ? s.slice(0, lastEnd + 1) : cut.slice(0, max - 1) + '…';
}

// Parse NSF date "MM/DD/YYYY" → Date (returns Invalid Date on failure)
function parseNsfDate(s: string | undefined | null): Date {
  if (!s) return new Date(NaN);
  const [m, d, y] = s.split('/').map(Number);
  if (!m || !d || !y) return new Date(NaN);
  return new Date(Date.UTC(y, m - 1, d));
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Editorial scoring ─────────────────────────────────────────────────────────
//
// 4 dimensions × 25 = 100 total — adapted for funding signals:
//   scope        (replaces novelty)  — award size signals research scale
//   strategic    — domain base + program-type indicators
//   relevance    — keyword match quality in title + abstract
//   publicInterest — same signal as arXiv/OpenAlex workers

const DOMAIN_STRATEGIC_BASE: Record<StoredDomain, number> = {
  robotics: 22, xr: 20, ai: 18, quantum: 16,
  space: 14, energy: 14, materials: 14, other: 3,
};

// Center / institute awards signal larger programmatic commitment
const STRATEGIC_PROGRAM_RE = /\bcenter\b|\binstitute\b|\bhub\b|\bconsortium\b|\bprogram\b/i;

const RELEVANCE_EXACT_RE: Record<CentariDomain, RegExp> = {
  ai:        /artificial\s+intelligence|machine\s+learning|deep\s+learning|neural\s+network|large\s+language/i,
  robotics:  /\brobotic|autonomous\s+(system|vehicle|agent)|manipulation\b/i,
  quantum:   /quantum\s+(computing|information|hardware|network|error|gate)|qubit/i,
  space:     /astrophysic|space\s+(science|exploration|mission)|cosmol|exoplanet|telescope/i,
  energy:    /renewable\s+energy|solar\s+cell|photovoltaic|fuel\s+cell|energy\s+storage|supercapacitor/i,
  materials: /materials\s+science|nanotechnolog|nanomaterial|semiconductor|graphene|perovskite/i,
  xr:        /augmented\s+reality|virtual\s+reality|mixed\s+reality|computer\s+graphics|human.computer/i,
};

const INTEREST_HUMANOID_RE = /\bhumanoid\b|\bprosthetic\b|\bexoskeleton\b|robot\s+arm/i;
const INTEREST_AI_RE       = /\bllm\b|large\s+language\s+model|foundation\s+model|autonomous\s+agent/i;
const INTEREST_SPACE_RE    = /\bnasa\b|\bspacex\b|\bmars\b|lunar|james\s+webb|\bartemis\b/i;
const INTEREST_CLIMATE_RE  = /climate|carbon\s+capture|clean\s+energy|net.?zero|decarboniz/i;

function scopeFromAmount(amount: number): number {
  if (amount >= 10_000_000) return 23;
  if (amount >= 5_000_000)  return 20;
  if (amount >= 1_000_000)  return 17;
  if (amount >= 500_000)    return 14;
  if (amount >= 100_000)    return 10;
  return 6;
}

function computeNsfScore(
  title: string, summary: string,
  domain: StoredDomain, amount: number,
): { total: number; scope: number } {
  const text = (title + ' ' + summary).toLowerCase();

  // Scope (0–25) — award scale
  const scope = scopeFromAmount(amount);

  // Strategic (0–25)
  let strategic = DOMAIN_STRATEGIC_BASE[domain];
  if (STRATEGIC_PROGRAM_RE.test(text)) strategic += 4;
  strategic = Math.max(0, Math.min(25, strategic));

  // Relevance (0–25) — how precisely the award matches the domain
  let relevance = 12;
  if (domain !== 'other') {
    const exact = RELEVANCE_EXACT_RE[domain as CentariDomain];
    if (exact.test(title))             relevance = 22;
    else if (exact.test(summary))      relevance = 17;
  } else {
    relevance = 5;
  }
  relevance = Math.max(0, Math.min(25, relevance));

  // Public interest (0–25)
  let publicInterest = 10;
  if (INTEREST_SPACE_RE.test(text))        publicInterest += 8;
  else if (INTEREST_HUMANOID_RE.test(text)) publicInterest += 6;
  else if (INTEREST_AI_RE.test(text))       publicInterest += 4;
  else if (INTEREST_CLIMATE_RE.test(text))  publicInterest += 4;
  publicInterest = Math.max(0, Math.min(25, publicInterest));

  return { total: scope + strategic + relevance + publicInterest, scope };
}

// ── NSF API ───────────────────────────────────────────────────────────────────

interface NsfAward {
  id:               string;
  title:            string;
  abstractText:     string;
  awardeeName:      string;
  awardeeCity:      string;
  awardeeStateCode: string;
  fundsObligatedAmt:string;
  startDate:        string;
  expDate:          string;
  pdPIName:         string;
  primaryProgram:   string;
}

interface NsfResponse {
  response: { award?: NsfAward[] };
}

const NSF_FIELDS = [
  'id','title','abstractText','awardeeName','awardeeCity','awardeeStateCode',
  'fundsObligatedAmt','startDate','expDate','pdPIName','primaryProgram',
].join(',');

function fmtNsfDate(d: Date): string {
  // MM/DD/YYYY
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

async function fetchNsfPage(keyword: string, dateStart: string, dateEnd: string, offset: number): Promise<NsfAward[]> {
  const url = new URL('https://api.nsf.gov/services/v1/awards.json');
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('dateStart', dateStart);
  url.searchParams.set('dateEnd', dateEnd);
  url.searchParams.set('printFields', NSF_FIELDS);
  url.searchParams.set('offset', String(offset));

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Centari-Worker/1.0 (research signal ingestion; robin89.olsson@gmail.com)' },
  });
  if (!res.ok) throw new Error(`NSF HTTP ${res.status} for keyword "${keyword}"`);
  const json = await res.json() as NsfResponse;
  return json.response.award ?? [];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  loadEnv();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!DRY_RUN && (!supabaseUrl || !serviceKey)) {
    log('error', 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  log('info', 'NSF Awards worker starting', { dry_run: DRY_RUN, max_total: MAX_TOTAL, lookback_days: DAYS });

  const supabase: SupabaseClient = DRY_RUN
    ? (null as unknown as SupabaseClient)
    : createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });
  const startedAt = new Date().toISOString();
  const result = { signals_found: 0, signals_written: 0, signals_skipped: 0, errors: [] as string[] };

  // 1. Source row
  let sourceId: string | null = null;
  if (!DRY_RUN) {
    const { data, error } = await supabase.from('sources')
      .upsert({
        slug: 'nsf-awards', name: 'NSF Award Search',
        homepage_url: 'https://www.nsf.gov/awardsearch/', tier: 1,
        description: 'US National Science Foundation awards database. Official government funding records across all scientific disciplines.',
      }, { onConflict: 'slug', ignoreDuplicates: false })
      .select('id').single();
    if (error || !data) { log('error', 'Could not upsert source', { error: error?.message }); process.exit(1); }
    sourceId = data.id as string;
    log('info', 'Source ready', { source_id: sourceId });
  }

  // 2. Worker run row
  let workerRunId: string | null = null;
  if (!DRY_RUN) {
    const { data } = await supabase.from('worker_runs')
      .insert({ status: 'running', runner_version: 'nsf-worker-1.0' })
      .select('id').single();
    if (data) workerRunId = data.id as string;
  }

  // 3. Date range
  const now      = new Date();
  const past     = new Date(Date.now() - DAYS * 86_400_000);
  const dateEnd  = fmtNsfDate(now);
  const dateStart = fmtNsfDate(past);
  log('info', 'Date range', { dateStart, dateEnd });

  const seenIds = new Set<string>();

  // 4. Iterate domain query groups
  for (const { domain, keyword } of DOMAIN_QUERIES) {
    if (result.signals_written >= MAX_TOTAL) break;

    log('info', `Querying NSF`, { keyword, domain });
    let offset = 1;

    while (result.signals_written < MAX_TOTAL) {
      let awards: NsfAward[];
      try {
        awards = await fetchNsfPage(keyword, dateStart, dateEnd, offset);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log('warn', 'NSF fetch error — skipping keyword', { keyword, error: msg });
        result.errors.push(msg);
        break;
      }

      if (!awards.length) break;
      log('info', `Fetched ${awards.length} awards`, { keyword, offset });

      for (const award of awards) {
        if (result.signals_written >= MAX_TOTAL) break;

        if (seenIds.has(award.id)) { result.signals_skipped++; continue; }
        seenIds.add(award.id);

        if (!award.title || !award.startDate) { result.signals_skipped++; continue; }

        result.signals_found++;

        const title      = truncateSentence(award.title.replace(/\s+/g, ' ').trim(), 200);
        const rawAbstract = (award.abstractText ?? '').replace(/\s+/g, ' ').trim();
        const summary    = truncateSentence(rawAbstract, 497);

        if (title.length < 5 || !rawAbstract) { result.signals_skipped++; continue; }

        const grantedAt = parseNsfDate(award.startDate);
        if (isNaN(grantedAt.getTime())) { result.signals_skipped++; continue; }

        const amount = parseInt(award.fundsObligatedAmt ?? '0', 10) || 0;
        const editorial = computeNsfScore(title, summary, domain, amount);
        const curatorScore   = Math.max(1, Math.min(10, Math.round(editorial.total / 10)));
        const signalStrength = editorial.total / 100;
        const noveltyScore   = editorial.scope / 25; // scope maps to novelty slot in schema

        const slug = makeSlug(title, grantedAt);

        const tags: string[] = [];
        if (award.awardeeName) tags.push(award.awardeeName);
        if (award.primaryProgram) tags.push(award.primaryProgram);

        const signal = {
          slug,
          source_id:            sourceId,
          source_url:           `https://www.nsf.gov/awardsearch/showAward?AWD_ID=${award.id}`,
          source_name:          'NSF Award Search',
          published_at:         grantedAt.toISOString(),
          title,
          summary,
          category:             domain,
          secondary_categories: [],
          signal_type:          'funding',
          confidence:           'verified',
          curator_score:        curatorScore,
          signal_strength:      signalStrength,
          novelty_score:        noveltyScore,
          momentum_score:       0.500,
          status:               'pending',
          reviewed_by:          'worker-nsf',
          tags,
        };

        if (DRY_RUN) {
          log('info', '[dry-run]', {
            slug, domain, curator_score: curatorScore,
            amount_usd: amount, keyword,
          });
          result.signals_written++;
          continue;
        }

        const { error: insErr } = await supabase.from('signals').insert(signal);
        if (insErr) {
          if (insErr.code === '23505') {
            result.signals_skipped++;
          } else {
            log('warn', `Insert failed for ${slug}`, { error: insErr.message });
            result.errors.push(`${slug}: ${insErr.message}`);
          }
        } else {
          log('info', 'Inserted', { slug, domain, curator_score: curatorScore, amount_usd: amount });
          result.signals_written++;
        }
      }

      offset += awards.length;
      if (awards.length < 25) break; // last page
      await sleep(1_100); // NSF rate limit headroom
    }

    await sleep(1_100);
  }

  // 5. Update run row
  if (!DRY_RUN && workerRunId) {
    await supabase.from('worker_runs').update({
      status:           result.errors.length > 0 && result.signals_written === 0 ? 'failed' : 'completed',
      finished_at:      new Date().toISOString(),
      signals_fetched:  result.signals_found,
      signals_inserted: result.signals_written,
      signals_rejected: result.signals_skipped,
      error_message:    result.errors.length > 0 ? result.errors.join('; ') : null,
    }).eq('id', workerRunId);
  }

  log('info', DRY_RUN ? '[dry-run] Done' : 'Done', {
    ...result, duration_s: ((Date.now() - new Date(startedAt).getTime()) / 1000).toFixed(1),
  });
  if (result.errors.length > 0) log('warn', 'Non-fatal errors', { errors: result.errors });
}

run().catch(err => { log('error', 'Fatal error', { error: String(err) }); process.exit(1); });

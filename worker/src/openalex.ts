// Sprint R8B — OpenAlex academic works ingestion worker
// Run: npx tsx worker/src/openalex.ts [--dry-run] [--max=N] [--days=N]

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ── CLI flags ─────────────────────────────────────────────────────────────────

const argv     = process.argv.slice(2);
const DRY_RUN  = argv.includes('--dry-run');
const MAX_TOTAL = parseInt(argv.find(a => a.startsWith('--max='))?.split('=')[1]  ?? '50', 10);
const DAYS      = parseInt(argv.find(a => a.startsWith('--days='))?.split('=')[1] ?? '7',  10);

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

// ── Concept → domain inference ────────────────────────────────────────────────

interface OpenAlexConcept {
  id: string;
  display_name: string;
  score: number;
  level: number;
}

// Patterns matched against concept display_name (lowercase).
// Multiple patterns accumulate score for a domain; highest total wins.
const CONCEPT_DOMAIN_RULES: Array<{ patterns: string[]; domain: CentariDomain }> = [
  {
    domain: 'ai',
    patterns: [
      'artificial intelligence', 'machine learning', 'deep learning',
      'neural network', 'natural language processing', 'computer vision',
      'reinforcement learning', 'transformer', 'generative model',
      'large language', 'foundation model', 'language model',
    ],
  },
  {
    domain: 'robotics',
    patterns: ['robotics', 'autonomous robot', 'robot manipulation', 'legged robot'],
  },
  {
    domain: 'quantum',
    patterns: [
      'quantum computing', 'quantum information', 'quantum entanglement',
      'qubit', 'quantum error', 'topological qubit', 'quantum optics',
      'superconducting qubit', 'quantum mechanics', 'quantum hardware',
    ],
  },
  {
    domain: 'space',
    patterns: [
      'astronomy', 'astrophysics', 'space exploration', 'cosmology',
      'exoplanet', 'space telescope', 'spacecraft', 'satellite imagery', 'planetary science',
    ],
  },
  {
    domain: 'energy',
    patterns: [
      'renewable energy', 'solar cell', 'photovoltaic', 'fuel cell',
      'energy storage', 'wind power', 'supercapacitor', 'electrolysis',
      'battery', 'power grid', 'thermoelectric',
    ],
  },
  {
    domain: 'materials',
    patterns: [
      'materials science', 'nanotechnology', 'nanomaterial', 'semiconductor',
      'graphene', 'polymer', 'thin film', 'metamaterial', 'crystallography', 'perovskite',
    ],
  },
  {
    domain: 'xr',
    patterns: [
      'augmented reality', 'virtual reality', 'mixed reality', 'extended reality',
      'computer graphics', 'human–computer interaction', 'human-computer interaction',
      '3d reconstruction', 'gaussian splatting', 'neural radiance', 'depth estimation',
    ],
  },
];

function inferDomainFromConcepts(
  concepts: OpenAlexConcept[],
): { domain: StoredDomain; topScore: number; reason: string } {
  const accum: Partial<Record<CentariDomain, number>> = {};
  const firstReason: Partial<Record<CentariDomain, string>> = {};

  for (const concept of concepts) {
    if (concept.score < 0.25) continue;
    const name = concept.display_name.toLowerCase();
    for (const { patterns, domain } of CONCEPT_DOMAIN_RULES) {
      if (patterns.some(p => name.includes(p))) {
        accum[domain] = (accum[domain] ?? 0) + concept.score;
        firstReason[domain] ??= concept.display_name;
      }
    }
  }

  const entries = (Object.entries(accum) as [CentariDomain, number][]).sort(([, a], [, b]) => b - a);
  if (!entries.length) return { domain: 'other', topScore: 0, reason: 'no matching concepts' };

  const [domain, topScore] = entries[0];
  return { domain, topScore, reason: firstReason[domain] ?? domain };
}

// ── Abstract reconstruction from inverted index ───────────────────────────────

function reconstructAbstract(aii: Record<string, number[]> | null | undefined): string {
  if (!aii) return '';
  const pos: [number, string][] = [];
  for (const [word, positions] of Object.entries(aii)) {
    for (const p of positions) pos.push([p, word]);
  }
  pos.sort((a, b) => a[0] - b[0]);
  return pos.map(p => p[1]).join(' ');
}

// ── Slug / text helpers ───────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','into','via','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','not','no','nor','as','if','its','it','this','that',
  'these','those','our','new','using','based','towards','toward',
]);

function makeSlug(title: string, publishedAt: Date): string {
  const month = `${publishedAt.getFullYear()}-${String(publishedAt.getMonth() + 1).padStart(2, '0')}`;
  const words = title
    .toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w)).slice(0, 5)
    .join('-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
  return `openalex-${words}-${month}`;
}

function truncateSentence(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  return lastEnd > max * 0.6 ? s.slice(0, lastEnd + 1) : cut.slice(0, max - 1) + '…';
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Editorial scoring ─────────────────────────────────────────────────────────
//
// Same 4-dimension framework as worker-arxiv.
// Relevance dimension uses concept accumulation score instead of category specificity.

const NOVELTY_STRONG_RE  = /state.of.the.art|surpass|breakthrough|outperform.*by|beat.*baseline|new\s+record|first\s+to\s+achieve/i;
const NOVELTY_GENERAL_RE = /\bnovel\b|new\s+method|new\s+approach|new\s+framework|first\s+time|first\s+work|we\s+propose|we\s+introduce|we\s+present/i;
const NOVELTY_REVIEW_RE  = /\bsurvey\b|\breview\b|\bbenchmark\b|comprehensive\s+(study|analysis)|literature\s+review/i;

const STRATEGIC_HW_RE   = /\baccelerator\b|\bneuromorphic\b|\bfpga\b|\basic\b|\bchip\b|hardware.accelerat|inference\s+engine|edge\s+deploy/i;
const STRATEGIC_REAL_RE = /\bdeployed\b|real.world\s+(test|application|trial|demo)|in\s+production|on.device|field\s+(test|trial)/i;

const INTEREST_MISSION_RE  = /\bjwst\b|\bnasa\b|\besa\b|\bspacex\b|\bmars\b|james\s+webb|lunar|hubble|\bartemis\b/i;
const INTEREST_CONSUMER_RE = /\bhumanoid\b|\bavatar\b|facial\s+(animation|expression|reconstruction)|robot\s+arm|prostheti|\bexoskeleton\b/i;
const INTEREST_AI_RE       = /\bllm\b|large\s+language\s+model|foundation\s+model|autonomous\s+agent|\bgpt\b|\bgemini\b|multimodal\s+model/i;
const INTEREST_THEORY_RE   = /\btheorem\b|\blemma\b|\bproof\b|stochastic\s+process|markov\s+chain|convergence\s+analysis/i;

const DOMAIN_STRATEGIC_BASE: Record<StoredDomain, number> = {
  robotics: 22, xr: 20, ai: 18, quantum: 16,
  space: 14, energy: 14, materials: 14, other: 3,
};

function computeEditorialScore(
  title: string, summary: string,
  domain: StoredDomain, conceptTopScore: number, isVerified: boolean,
): { total: number; novelty: number } {
  const text = (title + ' ' + summary).toLowerCase();

  let novelty = 12;
  if (NOVELTY_STRONG_RE.test(text))       novelty += 8;
  else if (NOVELTY_GENERAL_RE.test(text)) novelty += 5;
  if (NOVELTY_REVIEW_RE.test(text))       novelty -= 8;
  novelty = Math.max(0, Math.min(25, novelty));

  let strategic = DOMAIN_STRATEGIC_BASE[domain];
  if (STRATEGIC_HW_RE.test(text))   strategic += 4;
  if (STRATEGIC_REAL_RE.test(text)) strategic += 3;
  strategic = Math.max(0, Math.min(25, strategic));

  // Relevance from concept score quality + journal bonus
  let relevance = domain === 'other' ? 5
    : conceptTopScore >= 0.8 ? 22
    : conceptTopScore >= 0.6 ? 18
    : conceptTopScore >= 0.4 ? 14
    : 10;
  if (isVerified) relevance = Math.min(25, relevance + 2);
  relevance = Math.max(0, Math.min(25, relevance));

  let publicInterest = 10;
  if (INTEREST_MISSION_RE.test(text))       publicInterest += 8;
  else if (INTEREST_CONSUMER_RE.test(text)) publicInterest += 6;
  else if (INTEREST_AI_RE.test(text))       publicInterest += 4;
  if (INTEREST_THEORY_RE.test(text))        publicInterest -= 3;
  publicInterest = Math.max(0, Math.min(25, publicInterest));

  return { total: novelty + strategic + relevance + publicInterest, novelty };
}

// ── OpenAlex API ──────────────────────────────────────────────────────────────

// Concept IDs covering all Centari domains (OR-filtered in one query)
const CONCEPT_FILTER = [
  'C154945302',  // Artificial intelligence
  'C119857082',  // Machine learning
  'C2522767166', // Natural language processing
  'C31972630',   // Computer vision
  'C136764020',  // Deep learning
  'C59488890',   // Robotics
  'C62520636',   // Quantum mechanics
  'C12025516',   // Quantum computing
  'C127313418',  // Astronomy
  'C185592680',  // Astrophysics
  'C81014973',   // Renewable energy
  'C192562407',  // Materials science
  'C26873012',   // Nanotechnology
  'C41008148',   // Computer graphics
  'C124101348',  // Human–computer interaction
].join('|');

interface OpenAlexWork {
  id: string;
  title: string | null;
  abstract_inverted_index: Record<string, number[]> | null;
  publication_date: string | null;
  doi: string | null;
  type: string | null;
  primary_location: { source?: { type?: string; display_name?: string } | null } | null;
  concepts: OpenAlexConcept[];
  cited_by_count: number;
}

interface OpenAlexResponse {
  meta: { count: number; next_cursor?: string | null };
  results: OpenAlexWork[];
}

async function fetchPage(fromDate: string, toDate: string, cursor: string): Promise<OpenAlexResponse> {
  const url = new URL('https://api.openalex.org/works');
  // to_publication_date prevents forthcoming papers (OpenAlex uses 2050-01-01 as placeholder)
  url.searchParams.set('filter', `from_publication_date:${fromDate},to_publication_date:${toDate},concepts.id:${CONCEPT_FILTER}`);
  url.searchParams.set('sort', 'publication_date:desc');
  url.searchParams.set('per-page', '25');
  url.searchParams.set('cursor', cursor);
  url.searchParams.set('mailto', 'robin89.olsson@gmail.com');
  url.searchParams.set('select', 'id,title,abstract_inverted_index,publication_date,doi,type,primary_location,concepts,cited_by_count');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Centari-Worker/1.0 (research signal ingestion; robin89.olsson@gmail.com)' },
  });
  if (!res.ok) throw new Error(`OpenAlex HTTP ${res.status}`);
  return res.json() as Promise<OpenAlexResponse>;
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

  log('info', 'OpenAlex worker starting', { dry_run: DRY_RUN, max_total: MAX_TOTAL, lookback_days: DAYS });

  const supabase: SupabaseClient = DRY_RUN
    ? (null as unknown as SupabaseClient)
    : createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });
  const startedAt = new Date().toISOString();
  const result = { signals_found: 0, signals_written: 0, signals_skipped: 0, signals_other: 0, errors: [] as string[] };

  // 1. Source row
  let sourceId: string | null = null;
  if (!DRY_RUN) {
    const { data, error } = await supabase.from('sources')
      .upsert({
        slug: 'openalex', name: 'OpenAlex',
        homepage_url: 'https://openalex.org', tier: 1,
        description: 'Comprehensive open scholarly graph covering 250M+ research works. Operated by OurResearch.',
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
      .insert({ status: 'running', runner_version: 'openalex-worker-1.0' })
      .select('id').single();
    if (data) workerRunId = data.id as string;
  }

  // 3. Fetch and ingest (cursor pagination)
  const fromDate  = new Date(Date.now() - DAYS * 86_400_000).toISOString().slice(0, 10);
  const toDate    = new Date().toISOString().slice(0, 10);
  let cursor       = '*';
  const seenIds    = new Set<string>();

  outer: while (result.signals_written < MAX_TOTAL) {
    let page: OpenAlexResponse;
    try {
      page = await fetchPage(fromDate, toDate, cursor);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log('error', 'Fetch failed', { error: msg });
      result.errors.push(msg);
      break;
    }

    if (!page.results.length) break;
    log('info', `Fetched page`, { count: page.results.length, total_available: page.meta.count, cursor });

    for (const work of page.results) {
      if (result.signals_written >= MAX_TOTAL) break outer;

      const workId = work.id.replace('https://openalex.org/', '');
      if (seenIds.has(workId)) { result.signals_skipped++; continue; }
      seenIds.add(workId);

      if (!work.title || !work.publication_date) { result.signals_skipped++; continue; }

      result.signals_found++;

      const title   = truncateSentence(work.title.replace(/\s+/g, ' ').trim(), 200);
      const rawAbstract = reconstructAbstract(work.abstract_inverted_index).replace(/\s+/g, ' ').trim();
      const summary = truncateSentence(rawAbstract, 497);

      // Skip papers with no abstract — summary is NOT NULL in schema and scoring quality is poor
      if (title.length < 5 || !rawAbstract) { result.signals_skipped++; continue; }

      const inferred     = inferDomainFromConcepts(work.concepts ?? []);
      const storedDomain: StoredDomain = inferred.domain;
      if (storedDomain === 'other') { result.signals_other++; result.signals_skipped++; continue; }

      const isJournal  = work.primary_location?.source?.type === 'journal';
      const isVerified = isJournal && work.type === 'article';
      const confidence = isVerified ? 'verified' : 'probable';
      const signalType = work.type === 'article' ? 'lab_publication' : 'paper';

      const editorial      = computeEditorialScore(title, summary, storedDomain, inferred.topScore, isVerified);
      const curatorScore   = Math.max(1, Math.min(10, Math.round(editorial.total / 10)));
      const signalStrength = editorial.total / 100;
      const noveltyScore   = editorial.novelty / 25;

      const publishedAt = new Date(work.publication_date);
      if (isNaN(publishedAt.getTime())) { result.signals_skipped++; continue; }

      const slug = makeSlug(title, publishedAt);

      const signal = {
        slug,
        source_id:            sourceId,
        source_url:           work.doi ?? work.id,
        source_name:          'OpenAlex',
        published_at:         publishedAt.toISOString(),
        title,
        summary,
        category:             storedDomain,
        secondary_categories: [],
        signal_type:          signalType,
        confidence,
        curator_score:        curatorScore,
        signal_strength:      signalStrength,
        novelty_score:        noveltyScore,
        momentum_score:       0.500,
        status:               'pending',
        reviewed_by:          'worker-openalex',
        tags:                 (work.concepts ?? []).slice(0, 5).map(c => c.display_name),
      };

      if (DRY_RUN) {
        log('info', '[dry-run]', {
          slug, domain: storedDomain, curator_score: curatorScore,
          concept: inferred.reason, verified: isVerified,
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
        log('info', 'Inserted', { slug, domain: storedDomain, curator_score: curatorScore, concept: inferred.reason });
        result.signals_written++;
      }
    }

    cursor = page.meta.next_cursor ?? '';
    if (!cursor) break;
    await sleep(300);
  }

  // 4. Update run row
  if (!DRY_RUN && workerRunId) {
    await supabase.from('worker_runs').update({
      status:           result.errors.length > 0 && result.signals_written === 0 ? 'failed' : 'completed',
      finished_at:      new Date().toISOString(),
      signals_fetched:  result.signals_found,
      signals_inserted: result.signals_written,
      signals_rejected: result.signals_other + result.signals_skipped,
      error_message:    result.errors.length > 0 ? result.errors.join('; ') : null,
    }).eq('id', workerRunId);
  }

  log('info', DRY_RUN ? '[dry-run] Done' : 'Done', {
    ...result, duration_s: ((Date.now() - new Date(startedAt).getTime()) / 1000).toFixed(1),
  });
  if (result.errors.length > 0) log('warn', 'Non-fatal errors', { errors: result.errors });
}

run().catch(err => { log('error', 'Fatal error', { error: String(err) }); process.exit(1); });

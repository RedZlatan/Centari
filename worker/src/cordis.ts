// Sprint R8E — EU Cordis / OpenAIRE research projects ingestion worker
// Run: npx tsx worker/src/cordis.ts [--dry-run] [--max=N] [--start-year=YYYY]
//
// Source: OpenAIRE API (openaire.eu) — indexes all EC/Horizon-funded projects
// with country-of-coordinator metadata. No API key required.
// Signal type: funding | Confidence: verified (official EU-funded projects)

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs   from 'fs';
import * as path from 'path';

// ── CLI flags ─────────────────────────────────────────────────────────────────

const argv       = process.argv.slice(2);
const DRY_RUN    = argv.includes('--dry-run');
const MAX_TOTAL  = parseInt(argv.find(a => a.startsWith('--max='))?.split('=')[1]       ?? '80',   10);
// EU projects run 3-5 years; default window captures all active Horizon Europe grants
const START_YEAR = parseInt(argv.find(a => a.startsWith('--start-year='))?.split('=')[1] ?? '2022', 10);

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

// ── Country → lat/lng lookup (coordinator capital city) ───────────────────────

const COUNTRY_COORDS: Record<string, [number, number]> = {
  AT: [48.2, 16.4], BE: [50.9, 4.3],  BG: [42.7, 23.3], CH: [46.9, 7.5],
  CY: [35.2, 33.4], CZ: [50.1, 14.4], DE: [52.5, 13.4], DK: [55.7, 12.6],
  EE: [59.4, 24.7], ES: [40.4, -3.7], FI: [60.2, 24.9], FR: [48.9, 2.3],
  GB: [51.5, -0.1], GR: [37.9, 23.7], HR: [45.8, 16.0], HU: [47.5, 19.0],
  IE: [53.3, -6.3], IL: [31.8, 35.2], IS: [64.1, -21.9], IT: [41.9, 12.5],
  LT: [54.7, 25.3], LU: [49.6, 6.1],  LV: [56.9, 24.1], MT: [35.9, 14.5],
  NL: [52.4, 4.9],  NO: [59.9, 10.7], PL: [52.2, 21.0], PT: [38.7, -9.1],
  RO: [44.4, 26.1], SE: [59.3, 18.1], SI: [46.1, 14.5], SK: [48.1, 17.1],
  TR: [39.9, 32.9], UK: [51.5, -0.1],
};

// ── Domain queries ────────────────────────────────────────────────────────────

type CentariDomain = 'ai' | 'xr' | 'robotics' | 'quantum' | 'space' | 'energy' | 'materials';

interface DomainQuery {
  domain: CentariDomain;
  keywords: string;   // passed to OpenAIRE keywords= param (space = AND)
  strategicBase: number;
}

const DOMAIN_QUERIES: DomainQuery[] = [
  { domain: 'ai',        keywords: 'artificial intelligence',      strategicBase: 16 },
  { domain: 'ai',        keywords: 'machine learning',             strategicBase: 15 },
  { domain: 'quantum',   keywords: 'quantum computing',            strategicBase: 19 },
  { domain: 'quantum',   keywords: 'quantum communication',        strategicBase: 17 },
  { domain: 'energy',    keywords: 'renewable energy',             strategicBase: 17 },
  { domain: 'energy',    keywords: 'energy storage',               strategicBase: 16 },
  { domain: 'materials', keywords: 'advanced materials',           strategicBase: 15 },
  { domain: 'robotics',  keywords: 'robotics',                     strategicBase: 14 },
  { domain: 'xr',        keywords: 'virtual reality augmented',    strategicBase: 15 },
  { domain: 'space',     keywords: 'space science',                strategicBase: 13 },
];

const PER_KEYWORD_CAP = Math.max(5, Math.ceil(MAX_TOTAL / DOMAIN_QUERIES.length));

// ── OpenAIRE API types ────────────────────────────────────────────────────────

interface OAProject {
  code?:      { $: string };
  title?:     { $: string };
  summary?:   { $: string } | null;
  startdate?: { $: string };
  enddate?:   { $: string };
  totalcost?: { $: string };
  currency?:  { $: string };
  rels?: {
    rel?: RelEntry | RelEntry[];
  };
}

interface RelEntry {
  country?: { '@classid': string; '@classname': string };
  legalname?: { $: string };
}

interface OAResponse {
  response: {
    header: {
      total: { $: string };
    };
    results: {
      result: Array<{
        metadata: {
          'oaf:entity': {
            'oaf:project': OAProject;
          };
        };
      }>;
    } | null;
  };
}

// ── Scoring ───────────────────────────────────────────────────────────────────

const NOVELTY_KEYWORDS: Record<string, number> = {
  'breakthrough': 4, 'novel':   3, 'first':        4, 'pioneering': 4,
  'new approach': 3, 'beyond':  2, 'next-generation': 3, 'advanced': 1,
  'scalable':     2, 'quantum': 2, 'neuromorphic':  4, 'fusion':    4,
};

const INTEREST_KEYWORDS: Record<string, number> = {
  'climate':       4, 'green':    3, 'health':       3, 'cancer':     4,
  'drug':          3, 'pandemic': 4, 'autonomous':   3, 'robot':      2,
  'qubit':         4, 'photonic': 3, 'carbon':       3, 'hydrogen':   3,
  'semiconductor': 2, 'battery':  3, 'fusion':       4, 'exoplanet':  3,
};

function scoreText(text: string, map: Record<string, number>, base: number): number {
  const lower = text.toLowerCase();
  let s = base;
  for (const [kw, pts] of Object.entries(map)) {
    if (lower.includes(kw)) s = Math.min(25, s + pts);
  }
  return s;
}

function computeScore(project: OAProject, dq: DomainQuery) {
  const text    = `${project.title?.$ ?? ''} ${project.summary?.$ ?? ''}`;
  const novelty = scoreText(text, NOVELTY_KEYWORDS, 6);
  // EU projects always highly relevant to their domain
  const relevance      = 22;
  const publicInterest = scoreText(text, INTEREST_KEYWORDS, 11);
  const total          = novelty + dq.strategicBase + relevance + publicInterest;
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
  return `cordis-${domain}-${words}-${ym}`;
}

// ── OpenAIRE API fetch ────────────────────────────────────────────────────────

const OA_BASE = 'https://api.openaire.eu/search/projects';
const PAGE_SIZE = 25;

function extractCountry(project: OAProject): string {
  const rel = project.rels?.rel;
  const first: RelEntry | undefined = Array.isArray(rel) ? rel[0] : rel;
  return first?.country?.['@classid'] ?? '';
}

async function fetchPage(keywords: string, page: number): Promise<OAProject[]> {
  const params = new URLSearchParams({
    keywords,
    format:    'json',
    size:      String(PAGE_SIZE),
    page:      String(page),
    funder:    'EC',
    startYear: String(START_YEAR),
  });

  const resp = await fetch(`${OA_BASE}?${params}`, {
    headers: { Accept: 'application/json' },
  });
  if (!resp.ok) throw new Error(`OpenAIRE HTTP ${resp.status}`);

  const json = await resp.json() as OAResponse;
  const results = json.response?.results?.result ?? [];
  return results.map(r => r.metadata['oaf:entity']['oaf:project']);
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

  let runId: number | null = null;
  if (!DRY_RUN) {
    const { data } = await supabase
      .from('worker_runs')
      .insert({ worker: 'cordis', status: 'running', started_at: new Date().toISOString() })
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

  const seenCodes = new Set<string>();

  log('info', 'Cordis worker started', { dry: DRY_RUN, max: MAX_TOTAL, startYear: START_YEAR });

  for (const dq of DOMAIN_QUERIES) {
    if (result.signals_written >= MAX_TOTAL) break;

    log('info', `Fetching: ${dq.keywords}`, { domain: dq.domain, cap: PER_KEYWORD_CAP });

    let writtenThisKeyword = 0;
    let page = 1;
    let exhausted = false;

    while (writtenThisKeyword < PER_KEYWORD_CAP && result.signals_written < MAX_TOTAL && !exhausted) {
      if (page > 1) await new Promise<void>(r => setTimeout(r, 300));

      let projects: OAProject[];
      try {
        projects = await fetchPage(dq.keywords, page);
      } catch (err) {
        log('error', 'OpenAIRE fetch failed', { keywords: dq.keywords, page, err: String(err) });
        break;
      }

      if (projects.length === 0) { exhausted = true; break; }

      for (const project of projects) {
        if (writtenThisKeyword >= PER_KEYWORD_CAP || result.signals_written >= MAX_TOTAL) break;

        const code = project.code?.$ ?? '';
        if (!code || seenCodes.has(code)) continue;
        seenCodes.add(code);

        const title   = (project.title?.$ ?? '').trim();
        const summary = (project.summary?.$ ?? '').trim().replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');

        if (title.length < 5 || !summary) { result.signals_skipped++; continue; }

        const startYear = project.startdate?.$ ? new Date(project.startdate.$).getFullYear() : START_YEAR;
        const pubDate   = project.startdate?.$ ? new Date(project.startdate.$) : new Date(`${START_YEAR}-01-01`);

        const country  = extractCountry(project);
        const coords   = COUNTRY_COORDS[country] ?? null;

        const score = computeScore(project, dq);
        const slug  = makeSlug(dq.domain, title, pubDate);

        const countryName = (() => {
          const rel = project.rels?.rel;
          const first: RelEntry | undefined = Array.isArray(rel) ? rel[0] : rel;
          return first?.country?.['@classname'] ?? '';
        })();

        // Region lookup for signal_locations
        const REGION_MAP: Record<string, string> = {
          AT:'Europe',BE:'Europe',BG:'Europe',CH:'Europe',CY:'Europe',CZ:'Europe',
          DE:'Europe',DK:'Europe',EE:'Europe',ES:'Europe',FI:'Europe',FR:'Europe',
          GB:'Europe',GR:'Europe',HR:'Europe',HU:'Europe',IE:'Europe',IL:'Middle East',
          IS:'Europe',IT:'Europe',LT:'Europe',LU:'Europe',LV:'Europe',MT:'Europe',
          NL:'Europe',NO:'Europe',PL:'Europe',PT:'Europe',RO:'Europe',SE:'Europe',
          SI:'Europe',SK:'Europe',TR:'Europe',UK:'Europe',
        };

        const payload = {
          slug,
          title,
          summary:         summary.slice(0, 490),
          source_name:     'EU Cordis / Horizon Europe',
          source_url:      `https://cordis.europa.eu/project/id/${encodeURIComponent(code)}`,
          category:        dq.domain,
          signal_type:     'funding',
          confidence:      'verified',
          status:          'pending',
          reviewed_by:     'worker-cordis',
          tags:            ['eu', 'horizon', dq.domain, ...(country ? [country.toLowerCase()] : [])],
          curator_score:   Math.round(score.total / 10),
          signal_strength: +(score.total / 100).toFixed(4),
          novelty_score:   +(score.novelty / 25).toFixed(4),
          published_at:    pubDate.toISOString(),
        };

        if (DRY_RUN) {
          log('info', '[DRY] would insert', {
            slug, domain: dq.domain, country, score: score.total,
            coords: coords ?? 'unknown',
          });
          result.signals_written++;
          writtenThisKeyword++;
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

        // Insert location row if we have coordinates
        if (sigData?.id && coords) {
          const region = REGION_MAP[country] ?? 'Europe';
          await supabase.from('signal_locations').insert({
            signal_id:           sigData.id,
            country_code:        country,
            country_name:        countryName,
            region,
            lat:                 coords[0],
            lng:                 coords[1],
            location_confidence: 'low',   // capital-city centroid
            place_type:          'country',
          });
        }

        log('info', 'Inserted', { slug, domain: dq.domain, country, score: score.total });
        result.signals_written++;
        writtenThisKeyword++;
      }

      page++;
    }

    log('info', `Done: ${dq.keywords}`, { written: writtenThisKeyword });
  }

  if (!DRY_RUN && runId !== null) {
    await supabase
      .from('worker_runs')
      .update({ status: 'completed', finished_at: new Date().toISOString(), meta: result })
      .eq('id', runId);
  }

  log('info', 'Cordis worker finished', {
    signals_written: result.signals_written,
    signals_skipped: result.signals_skipped,
    signals_error:   result.signals_error,
  });
}

main().catch((err) => {
  log('error', 'Unhandled error', { err: String(err) });
  process.exit(1);
});

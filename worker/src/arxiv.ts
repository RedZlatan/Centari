// Sprint R8B — arXiv ingestion worker (quality improvements)
// Run: npx tsx worker/src/arxiv.ts [--dry-run] [--max=N] [--days=N] [--per-category=N]

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ── CLI flags ─────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const DRY_RUN      = argv.includes('--dry-run');
const MAX_TOTAL    = parseInt(argv.find(a => a.startsWith('--max='))?.split('=')[1]           ?? '50', 10);
const DAYS         = parseInt(argv.find(a => a.startsWith('--days='))?.split('=')[1]          ?? '7',  10);
const PER_CATEGORY = parseInt(argv.find(a => a.startsWith('--per-category='))?.split('=')[1] ?? '0',  10);

// ── Env loading ───────────────────────────────────────────────────────────────

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

// ── LaTeX cleaning ────────────────────────────────────────────────────────────
// arXiv Atom abstracts contain raw LaTeX from author submissions.
// These map the most common patterns to readable Unicode or strip them.

const LATEX_SYMBOLS: Record<string, string> = {
  // Greek lowercase
  alpha:'α', beta:'β', gamma:'γ', delta:'δ', epsilon:'ε', varepsilon:'ε',
  zeta:'ζ', eta:'η', theta:'θ', vartheta:'θ', iota:'ι', kappa:'κ',
  lambda:'λ', mu:'μ', nu:'ν', xi:'ξ', pi:'π', varpi:'π', rho:'ρ',
  sigma:'σ', varsigma:'ς', tau:'τ', upsilon:'υ', phi:'φ', varphi:'φ',
  chi:'χ', psi:'ψ', omega:'ω',
  // Greek uppercase
  Gamma:'Γ', Delta:'Δ', Theta:'Θ', Lambda:'Λ', Xi:'Ξ', Pi:'Π',
  Sigma:'Σ', Upsilon:'Υ', Phi:'Φ', Psi:'Ψ', Omega:'Ω',
  // Relations
  leq:'≤', geq:'≥', neq:'≠', approx:'≈', sim:'∼', equiv:'≡',
  ll:'≪', gg:'≫', propto:'∝', subset:'⊂', subseteq:'⊆',
  supset:'⊃', supseteq:'⊇',
  // Operators
  times:'×', cdot:'·', div:'÷', pm:'±', mp:'∓', circ:'∘',
  // Arrows
  rightarrow:'→', leftarrow:'←', Rightarrow:'⇒', Leftarrow:'⇐',
  leftrightarrow:'↔', Leftrightarrow:'⇔', to:'→', mapsto:'↦',
  uparrow:'↑', downarrow:'↓', Uparrow:'⇑', Downarrow:'⇓',
  // Sets and logic
  in:'∈', notin:'∉', cup:'∪', cap:'∩', emptyset:'∅',
  forall:'∀', exists:'∃', neg:'¬', land:'∧', lor:'∨',
  // Misc
  infty:'∞', nabla:'∇', partial:'∂', sum:'Σ', prod:'Π', int:'∫',
  sqrt:'√', ldots:'…', cdots:'⋯', ell:'ℓ', hbar:'ℏ',
};

const WRAP_CMDS = [
  'textsc','texttt','textbf','textit','textrm','textsf','textmd','textup','textsl','text',
  'mathbf','mathcal','mathbb','mathrm','mathit','mathsf','mathfrak','mathop',
  'operatorname','widehat','widetilde','overline','underline','overbrace','underbrace',
  'vec','hat','tilde','bar','dot','ddot','acute','grave','breve','check',
].sort((a, b) => b.length - a.length); // longest first to prevent prefix shadowing

const WRAP_RE = new RegExp(`\\\\(?:${WRAP_CMDS.join('|')})\\{([^{}]*)\\}`, 'g');

function cleanLatex(s: string): string {
  let t = s;

  // 1. Strip display math $$...$$
  t = t.replace(/\$\$[\s\S]*?\$\$/g, '');

  // 2. Strip block environments \begin{...}...\end{...}
  t = t.replace(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g, '');

  // 3. Unwrap formatting commands iteratively (handles nesting)
  let prev = '';
  while (t !== prev) { prev = t; t = t.replace(WRAP_RE, '$1'); }

  // 4. Inline math $...$: resolve known symbols, drop complex expressions
  t = t.replace(/\$([^$]{1,80})\$/g, (_match, inner) => {
    const m = inner.trim();
    // Single named command: $\alpha$ → α
    const single = /^\\([a-zA-Z]+)$/.exec(m);
    if (single) return LATEX_SYMBOLS[single[1]] ?? single[1];
    // Resolve all symbols, strip remaining commands and syntax chars
    let r = m.replace(/\\([a-zA-Z]+)/g, (_: string, cmd: string) => LATEX_SYMBOLS[cmd] ?? cmd);
    r = r.replace(/[{}_^\\]/g, '').replace(/\s+/g, ' ').trim();
    // Keep if short and readable; drop if it looks like formula noise
    return r.length <= 15 && /^[\w\s+\-=×÷≤≥≠≈→←αβγδεζηθλμνξπρστφχψω∞∂∇Σ]+$/.test(r) ? r : '';
  });

  // 5. Strip remaining LaTeX commands and lone braces
  t = t.replace(/\\[a-zA-Z]+\*?\s*/g, '');
  t = t.replace(/[{}]/g, '');

  // 6. Normalise whitespace
  t = t.replace(/\s{2,}/g, ' ').trim();

  return t;
}

// ── Domain inference ──────────────────────────────────────────────────────────
// For broad AI-tagged categories (cs.AI, cs.LG, cs.CL, cs.CV, cs.NE), scan the
// title for domain-specific markers and override the default 'ai' assignment.
// Specific-category tags (cs.RO, quant-ph, cs.HC etc.) are trusted directly.

type CentariDomain = 'ai' | 'xr' | 'robotics' | 'quantum' | 'space' | 'energy' | 'materials';

interface DomainInference {
  domain: CentariDomain;
  source: 'tag' | 'title';
  reason: string;
}

const BROAD_AI_TAGS = new Set(['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV', 'cs.NE', 'cs.IR', 'cs.CR']);

const DOMAIN_TITLE_RULES: Array<{ domain: CentariDomain; keywords: string[] }> = [
  {
    domain: 'robotics',
    keywords: [
      'robot', 'robotic', 'dexterous', 'manipulat', 'locomotion',
      'gripper', 'actuator', 'sim-to-real', 'quadruped', 'teleoperat',
      'haptic feedback', 'prosthetic', 'humanoid', 'legged', 'grasping',
      'vision-language-action', 'vla model',
    ],
  },
  {
    domain: 'quantum',
    keywords: [
      'quantum', 'qubit', 'entanglement', 'superposition', 'decoherence',
      'quantum circuit', 'quantum gate', 'quantum error', 'quantum noise',
      'topological qubit', 'superconducting qubit', 'quantum annealing',
    ],
  },
  {
    domain: 'xr',
    keywords: [
      'neural radiance', 'nerf', 'point cloud', '3d reconstruction',
      '4d human', 'image-to-3d', '3d generation', '3d scene',
      '3d facial', 'augmented reality', 'virtual reality', 'mixed reality',
      'holographic', 'monocular depth', 'scene reconstruction',
      'world tracing', 'generative geometry', 'spatial generation',
      'depth estimation', 'stereo reconstruction', 'gaussian splatting',
    ],
  },
  {
    domain: 'space',
    keywords: [
      'satellite', 'spacecraft', 'orbital', 'astrophysic',
      'exoplanet', 'space mission', 'launch vehicle', 'lunar surface',
      'mars surface', 'asteroid', 'deep space', 'space telescope',
    ],
  },
  {
    domain: 'energy',
    keywords: [
      'solar cell', 'photovoltaic', 'battery', 'power grid',
      'electrolysis', 'fuel cell', 'energy storage', 'wind turbine',
      'supercapacitor', 'thermoelectric',
    ],
  },
  {
    domain: 'materials',
    keywords: [
      'crystal structure', 'semiconductor', 'nanoparticle', 'perovskite',
      'graphene', 'metamaterial', 'nanomaterial', 'thin film', 'alloy',
      'polymer synthesis', 'topological material',
    ],
  },
];

function inferDomain(
  arxivCat: string,
  tagDomain: CentariDomain,
  title: string,
): DomainInference {
  // Specific tags are already reliable — trust them directly
  if (!BROAD_AI_TAGS.has(arxivCat)) {
    return { domain: tagDomain, source: 'tag', reason: arxivCat };
  }

  const titleLower = title.toLowerCase();

  for (const { domain, keywords } of DOMAIN_TITLE_RULES) {
    const hit = keywords.find(kw => titleLower.includes(kw));
    if (hit) {
      return { domain, source: 'title', reason: `"${hit}"` };
    }
  }

  return { domain: tagDomain, source: 'tag', reason: `${arxivCat} → ${tagDomain}` };
}

// ── Category map ──────────────────────────────────────────────────────────────

const CATEGORY_MAP: Array<{ arxivCat: string; domain: CentariDomain }> = [
  { arxivCat: 'cs.AI',             domain: 'ai'        },
  { arxivCat: 'cs.LG',             domain: 'ai'        },
  { arxivCat: 'cs.CL',             domain: 'ai'        },
  { arxivCat: 'cs.CV',             domain: 'ai'        },
  { arxivCat: 'cs.NE',             domain: 'ai'        },
  { arxivCat: 'cs.RO',             domain: 'robotics'  },
  { arxivCat: 'quant-ph',          domain: 'quantum'   },
  { arxivCat: 'cond-mat.supr-con', domain: 'quantum'   },
  { arxivCat: 'cs.HC',             domain: 'xr'        },
  { arxivCat: 'cs.GR',             domain: 'xr'        },
  { arxivCat: 'astro-ph.IM',       domain: 'space'     },
  { arxivCat: 'astro-ph.EP',       domain: 'space'     },
  { arxivCat: 'physics.app-ph',    domain: 'energy'    },
  { arxivCat: 'cond-mat.mtrl-sci', domain: 'materials' },
];

// ── Slug generation ───────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','into','via','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','not','no','nor','as','if','its','it','this','that',
  'these','those','our','new','using','based','towards','toward',
]);

function makeSlug(title: string, publishedAt: Date): string {
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
  title: string;       // raw from feed
  summary: string;     // raw from feed
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
    const rawId     = extractText(block, 'id');
    const title     = extractText(block, 'title');
    const summary   = extractText(block, 'summary');
    const published = extractText(block, 'published');
    const linkM = /href="([^"]+)"\s+rel="alternate"/.exec(block) ?? /href="([^"]+)"/.exec(block);
    const link  = linkM ? linkM[1] : rawId;
    const idM   = /abs\/(\d{4}\.\d{4,5})(v\d+)?$/.exec(rawId);
    const id    = idM ? idM[1] : rawId;
    if (!id || !title || !summary || !published) continue;
    entries.push({ id, title, summary, published, link });
  }
  return entries;
}

// ── arXiv fetch ───────────────────────────────────────────────────────────────

async function fetchArxiv(category: string, maxResults: number): Promise<ArxivEntry[]> {
  const url = `https://export.arxiv.org/api/query?search_query=cat:${category}&sortBy=submittedDate&sortOrder=descending&start=0&max_results=${maxResults}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Centari-Worker/1.1 (research signal ingestion; robin89.olsson@gmail.com)' },
  });
  if (!res.ok) throw new Error(`arXiv HTTP ${res.status} for ${category}`);
  return parseAtom(await res.text());
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function truncateSentence(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  // Find the last sentence-ending punctuation followed by a space or end-of-cut
  const lastEnd = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('? '),
    cut.lastIndexOf('! '),
  );
  // Only use the sentence boundary if it preserves at least 60% of the allowed length
  if (lastEnd > max * 0.6) return s.slice(0, lastEnd + 1);
  return cut.slice(0, max - 1) + '…';
}

// ── Comparison record (dry-run) ───────────────────────────────────────────────

interface Comparison {
  n: number;
  arxivId: string;
  rawTitle: string;
  cleanTitle: string;
  rawSummarySnip: string;
  cleanSummarySnip: string;
  tagDomain: CentariDomain;
  inferred: DomainInference;
  latexChanged: boolean;
  domainChanged: boolean;
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
    dry_run:      DRY_RUN,
    max_total:    MAX_TOTAL,
    per_category: PER_CATEGORY || 'none (global max)',
    lookback_days: DAYS,
    categories:   CATEGORY_MAP.length,
    version:      '1.1',
  });

  const supabase: SupabaseClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const startedAt = new Date().toISOString();
  const result: WorkerResult = { signals_found: 0, signals_written: 0, signals_skipped: 0, errors: [] };
  const comparisons: Comparison[] = [];

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
      .insert({ status: 'running', runner_version: 'arxiv-worker-1.1' })
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
  const cutoff   = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const seenIds  = new Set<string>();
  const domainCount: Partial<Record<CentariDomain, number>> = {};

  for (let i = 0; i < CATEGORY_MAP.length; i++) {
    if (!PER_CATEGORY && result.signals_written >= MAX_TOTAL) {
      log('info', `Reached max_total=${MAX_TOTAL}, stopping early`);
      break;
    }

    const { arxivCat, domain: tagDomain } = CATEGORY_MAP[i];

    // Per-category cap: each category contributes at most PER_CATEGORY signals
    let categoryWritten = 0;
    const categoryMax = PER_CATEGORY > 0 ? PER_CATEGORY : MAX_TOTAL;

    const fetchN = Math.min(30, categoryMax + 8);

    if (i > 0) await sleep(1100);

    log('info', `Fetching ${arxivCat}`, { tag_domain: tagDomain, max_fetch: fetchN });

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
      if (PER_CATEGORY > 0 && categoryWritten >= PER_CATEGORY) break;
      if (!PER_CATEGORY && result.signals_written >= MAX_TOTAL) break;

      if (seenIds.has(entry.id)) { result.signals_skipped++; continue; }
      seenIds.add(entry.id);

      const publishedAt = new Date(entry.published);
      if (isNaN(publishedAt.getTime()) || publishedAt < cutoff) {
        result.signals_skipped++;
        continue;
      }

      result.signals_found++;

      // ── Clean both fields ──────────────────────────────────────────────────
      const rawTitle   = entry.title;
      const rawSummary = entry.summary.replace(/\s+/g, ' ').trim();

      const cleanTitle   = truncateSentence(cleanLatex(rawTitle), 200);
      const cleanSummary = truncateSentence(cleanLatex(rawSummary), 497);

      if (cleanSummary.length < 20) { result.signals_skipped++; continue; }
      if (cleanTitle.length < 5)    { result.signals_skipped++; continue; }

      // ── Infer domain ───────────────────────────────────────────────────────
      const inferred = inferDomain(arxivCat, tagDomain, cleanTitle);

      // ── Track comparison (dry-run: first 10 per full run) ─────────────────
      if (DRY_RUN && comparisons.length < 10) {
        const latexChanged  = cleanTitle !== rawTitle || cleanSummary !== rawSummary.slice(0, cleanSummary.length);
        const domainChanged = inferred.domain !== tagDomain;
        comparisons.push({
          n: comparisons.length + 1,
          arxivId:         entry.id,
          rawTitle,
          cleanTitle,
          rawSummarySnip:   rawSummary.slice(0, 110),
          cleanSummarySnip: cleanSummary.slice(0, 110),
          tagDomain,
          inferred,
          latexChanged,
          domainChanged,
        });
      }

      // ── Count predicted domains ────────────────────────────────────────────
      domainCount[inferred.domain] = (domainCount[inferred.domain] ?? 0) + 1;

      const slug = makeSlug(cleanTitle, publishedAt);

      const signal = {
        slug,
        source_id:       sourceId,
        source_url:      entry.link,
        source_name:     'arXiv',
        published_at:    publishedAt.toISOString(),
        title:           cleanTitle,
        summary:         cleanSummary,
        category:        inferred.domain as string,
        secondary_categories: inferred.source === 'title' ? [tagDomain as string] : [],
        signal_type:     'paper',
        confidence:      'probable',
        curator_score:   5,
        signal_strength: 0.500,
        novelty_score:   0.600,
        momentum_score:  0.500,
        status:          'pending',
        reviewed_by:     'worker-arxiv',
        tags:            [arxivCat],
      };

      if (DRY_RUN) {
        categoryWritten++;
        result.signals_written++;
        continue;
      }

      const { error: insErr } = await supabase.from('signals').insert(signal);

      if (insErr) {
        if (insErr.code === '23505') {
          log('info', `Skipped duplicate slug: ${slug}`);
          result.signals_skipped++;
        } else {
          log('warn', `Insert failed for ${slug}`, { error: insErr.message, code: insErr.code });
          result.errors.push(`${slug}: ${insErr.message}`);
        }
      } else {
        log('info', `Inserted signal`, {
          slug,
          title: cleanTitle.slice(0, 60),
          domain: inferred.domain,
          domain_source: inferred.source,
        });
        categoryWritten++;
        result.signals_written++;
      }
    }
  }

  // ── 4. Update worker_run row ───────────────────────────────────────────────
  if (!DRY_RUN && workerRunId) {
    const { error: updateErr } = await supabase
      .from('worker_runs')
      .update({
        status:           result.errors.length > 0 && result.signals_written === 0 ? 'failed' : 'completed',
        finished_at:      new Date().toISOString(),
        signals_fetched:  result.signals_found,
        signals_inserted: result.signals_written,
        signals_rejected: result.signals_skipped,
        error_message:    result.errors.length > 0 ? result.errors.join('; ') : null,
      })
      .eq('id', workerRunId);

    if (updateErr) log('warn', 'Could not update worker_runs row', { error: updateErr.message });
  }

  // ── 5. Dry-run comparison report ──────────────────────────────────────────
  if (DRY_RUN && comparisons.length > 0) {
    process.stdout.write('\n' + '═'.repeat(72) + '\n');
    process.stdout.write('DRY-RUN COMPARISON REPORT\n');
    process.stdout.write('═'.repeat(72) + '\n\n');

    for (const c of comparisons) {
      const domainLabel = c.domainChanged
        ? `${c.tagDomain} → ${c.inferred.domain} [title: ${c.inferred.reason}]`
        : `${c.inferred.domain} (tag: ${c.inferred.reason})`;

      process.stdout.write(`[${String(c.n).padStart(2, '0')}] arXiv: ${c.arxivId}\n`);
      process.stdout.write(`  DOMAIN   : ${domainLabel}\n`);

      if (c.cleanTitle !== c.rawTitle) {
        process.stdout.write(`  RAW TITLE: ${c.rawTitle.slice(0, 100)}\n`);
        process.stdout.write(`  CLN TITLE: ${c.cleanTitle.slice(0, 100)}\n`);
      } else {
        process.stdout.write(`  TITLE    : ${c.cleanTitle.slice(0, 100)} [no change]\n`);
      }

      if (c.cleanSummarySnip !== c.rawSummarySnip) {
        process.stdout.write(`  RAW SUMM : ${c.rawSummarySnip}\n`);
        process.stdout.write(`  CLN SUMM : ${c.cleanSummarySnip}\n`);
      } else {
        process.stdout.write(`  SUMMARY  : [no change in first 110 chars]\n`);
      }

      process.stdout.write('\n');
    }

    process.stdout.write('── Predicted domain distribution ──\n');
    const total = Object.values(domainCount).reduce((a, b) => a + b, 0);
    for (const [domain, count] of Object.entries(domainCount).sort((a, b) => b[1] - a[1])) {
      const bar = '█'.repeat(Math.round((count / total) * 30));
      process.stdout.write(`  ${domain.padEnd(10)} ${String(count).padStart(3)}  ${bar}\n`);
    }
    process.stdout.write(`  ${'TOTAL'.padEnd(10)} ${String(total).padStart(3)}\n\n`);

    const latexFixed  = comparisons.filter(c => c.latexChanged).length;
    const domainFixed = comparisons.filter(c => c.domainChanged).length;
    process.stdout.write(`── Quality summary (sample of ${comparisons.length}) ──\n`);
    process.stdout.write(`  LaTeX artifacts cleaned : ${latexFixed}/${comparisons.length}\n`);
    process.stdout.write(`  Domain overrides applied: ${domainFixed}/${comparisons.length}\n`);
    process.stdout.write('═'.repeat(72) + '\n\n');
  }

  // ── 6. Run summary ────────────────────────────────────────────────────────
  log('info', DRY_RUN ? '[dry-run] Run complete' : 'Run complete', {
    signals_found:    result.signals_found,
    signals_written:  result.signals_written,
    signals_skipped:  result.signals_skipped,
    errors:           result.errors.length,
    duration_s:       ((Date.now() - new Date(startedAt).getTime()) / 1000).toFixed(1),
  });

  if (result.errors.length > 0) {
    log('warn', 'Non-fatal errors during run', { errors: result.errors });
  }
}

run().catch(err => {
  log('error', 'Fatal error', { error: String(err) });
  process.exit(1);
});

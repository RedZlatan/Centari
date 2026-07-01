// Sprint R8E-B — other domain + editorial scoring
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
  const candidates = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '..', '.env.local'),
  ];
  const envPath = candidates.find(p => fs.existsSync(p));
  if (!envPath) return;
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
].sort((a, b) => b.length - a.length);

const WRAP_RE = new RegExp(`\\\\(?:${WRAP_CMDS.join('|')})\\{([^{}]*)\\}`, 'g');

function cleanLatex(s: string): string {
  let t = s;
  t = t.replace(/\$\$[\s\S]*?\$\$/g, '');
  t = t.replace(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g, '');
  let prev = '';
  while (t !== prev) { prev = t; t = t.replace(WRAP_RE, '$1'); }
  t = t.replace(/\$([^$]{1,80})\$/g, (_match, inner) => {
    const m = inner.trim();
    const single = /^\\([a-zA-Z]+)$/.exec(m);
    if (single) return LATEX_SYMBOLS[single[1]] ?? single[1];
    let r = m.replace(/\\([a-zA-Z]+)/g, (_: string, cmd: string) => LATEX_SYMBOLS[cmd] ?? cmd);
    r = r.replace(/[{}_^\\]/g, '').replace(/\s+/g, ' ').trim();
    return r.length <= 15 && /^[\w\s+\-=×÷≤≥≠≈→←αβγδεζηθλμνξπρστφχψω∞∂∇Σ]+$/.test(r) ? r : '';
  });
  t = t.replace(/\\[a-zA-Z]+\*?\s*/g, '');
  t = t.replace(/[{}]/g, '');
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t;
}

// ── Domain inference ──────────────────────────────────────────────────────────
//
// R8E-A routing changes:
//   1. cs.HC gated: requires XR keyword; clinical/social keywords veto.
//   2. Robotics keyword list expanded (WAM/VLA/bionic vocab).
//   3. cond-mat.supr-con keyword-split: quantum / materials / energy / other.
//   4. physics.app-ph keyword-split: energy / quantum / materials / other.
//   5. Broad-AI off-domain veto for music/clinical/social-media titles.
//
// R8E-B change: rejected signals route to category='other' instead of being dropped.
// 'other' is never approved and invisible to public API (RLS filters status=approved).

type CentariDomain = 'ai' | 'xr' | 'robotics' | 'quantum' | 'space' | 'energy' | 'materials';
type StoredDomain  = CentariDomain | 'other';

interface DomainInference {
  domain: CentariDomain;
  source: 'tag' | 'title' | 'veto';
  reason: string;
  rejected?: boolean;
}

// Tags that are trusted to map directly to their CATEGORY_MAP domain.
const BROAD_AI_TAGS = new Set(['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV', 'cs.NE', 'cs.IR', 'cs.CR']);

// ── Gate 1: cs.HC → xr (requires XR keyword; vetoed by clinical/social terms) ─

const XR_CONFIRM_RE = /virtual\s+reality|augmented\s+reality|mixed\s+reality|\bxr\b|\bvr\b|\bar\b|extended\s+reality|spatial\s+computing|head.?mounted|\bnerf\b|neural\s+radiance|gaussian\s+splatting|novel\s+view\s+synthesis|volumetric|3d\s+reconstruction|4d\s+(reconstruction|human)|3d\s+scene|scene\s+reconstruction|depth\s+estimation|point\s+cloud|\bavatar\b|digital\s+human|holograph|immersive|\bhaptic\b|hand\s+tracking|eye\s+tracking|cybersickness|motion\s+capture|facial\s+(animation|reconstruction|expression)|surface\s+reconstruction/i;

const XR_VETO_RE = /clinical\s+trial|randomized\s+(controlled|trial)|\bptsd\b|health\s+intervention|mental\s+health.{0,40}(study|survey|month|tiktok)|content\s+moderation|hate\s+speech|peer\s+review|academic\s+paper|bibliometric/i;

// ── Gate 2: cond-mat.supr-con → quantum / materials / energy (else other) ─────

const SUPR_QUANTUM_RE   = /\bqubit\b|josephson|\bsquid\b|majorana|decoherence|quantum\s+(circuit|error|information|computing|phase|geometry|criticality)|topological\s+(qubit|superconductor)|anomalous\s+hall|berry\s+phase|\bchern\b/i;
const SUPR_MATERIALS_RE = /thin\s+film|epitaxial|crystal\s+structure|multiband|spin.orbit|doping|band\s+structure|magnetic\s+anisotropy|structural\s+anisotropy|\balloy\b/i;
const SUPR_ENERGY_RE    = /\bcable\b|\bwire\b|ac\s+loss|power\s+transmission|\btransformer\b|fault\s+current|magnet\s+coil/i;

// ── Gate 3: physics.app-ph → energy / quantum / materials (else other) ────────

const APPPH_ENERGY_RE    = /solar\s+cell|photovoltaic|\bbattery\b|fuel\s+cell|energy\s+storage|wind\s+turbine|supercapacitor|thermoelectric|power\s+grid|electrolysis|thermal\s+harvesting/i;
const APPPH_QUANTUM_RE   = /\bqubit\b|quantum\s+(circuit|computing|information)|\bjosephson\b/i;
const APPPH_MATERIALS_RE = /\bcrystal\b|thin\s+film|perovskite|\balloy\b|semiconductor|nanoparticle|metamaterial|graphene/i;

// ── Gate 4: AI off-domain veto ────────────────────────────────────────────────

const AI_OFFDOM_RE = /symbolic\s+music|music\s+generation|\btiktok\b|\bneonatal\b|\bgenomicall?y\b|social\s+and\s+behavioral|vehicle\s+color.{0,20}(recogni|classif|detect)|waste\s+recycling|waste\s+segmentation|supramolecular\s+chemistry|indic\s+language/i;

// ── Title-keyword rules (used for BROAD_AI_TAGS) ─────────────────────────────

const DOMAIN_TITLE_RULES: Array<{ domain: CentariDomain; keywords: string[] }> = [
  {
    domain: 'robotics',
    keywords: [
      'robot', 'robotic', 'dexterous', 'manipulat', 'locomotion',
      'gripper', 'actuator', 'sim-to-real', 'quadruped', 'teleoperat',
      'haptic feedback', 'prosthetic', 'humanoid', 'legged', 'grasping',
      'vision-language-action', 'vla model',
      'world action model', 'bionic hand', 'end-effector', 'articulated tool',
      'lab automation', 'manipulation policy', 'pick-and-place', 'tactile sensing',
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
      'avatar', 'digital human', 'surface reconstruction', 'volumetric video',
      'novel view synthesis', 'cybersickness', 'facial animation', '4d reconstruction',
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
  const t = title.toLowerCase();

  if (arxivCat === 'cs.HC') {
    if (XR_VETO_RE.test(t))    return { domain: tagDomain, source: 'veto', reason: 'cs.HC veto keyword',    rejected: true };
    if (XR_CONFIRM_RE.test(t)) return { domain: 'xr',       source: 'tag',  reason: 'cs.HC + XR keyword' };
    return { domain: tagDomain, source: 'veto', reason: 'cs.HC no XR keyword', rejected: true };
  }

  if (arxivCat === 'cond-mat.supr-con') {
    if (SUPR_QUANTUM_RE.test(t))   return { domain: 'quantum',   source: 'tag', reason: 'cond-mat.supr-con quantum'   };
    if (SUPR_MATERIALS_RE.test(t)) return { domain: 'materials', source: 'tag', reason: 'cond-mat.supr-con materials' };
    if (SUPR_ENERGY_RE.test(t))    return { domain: 'energy',    source: 'tag', reason: 'cond-mat.supr-con energy'    };
    return { domain: tagDomain, source: 'veto', reason: 'cond-mat.supr-con no keyword', rejected: true };
  }

  if (arxivCat === 'physics.app-ph') {
    if (APPPH_ENERGY_RE.test(t))    return { domain: 'energy',    source: 'tag', reason: 'physics.app-ph energy'    };
    if (APPPH_QUANTUM_RE.test(t))   return { domain: 'quantum',   source: 'tag', reason: 'physics.app-ph quantum'   };
    if (APPPH_MATERIALS_RE.test(t)) return { domain: 'materials', source: 'tag', reason: 'physics.app-ph materials' };
    return { domain: tagDomain, source: 'veto', reason: 'physics.app-ph no keyword', rejected: true };
  }

  if (BROAD_AI_TAGS.has(arxivCat)) {
    for (const { domain, keywords } of DOMAIN_TITLE_RULES) {
      const hit = keywords.find(kw => t.includes(kw));
      if (hit) return { domain, source: 'title', reason: `"${hit}"` };
    }
    if (AI_OFFDOM_RE.test(t)) {
      return { domain: tagDomain, source: 'veto', reason: 'AI off-domain veto', rejected: true };
    }
    return { domain: tagDomain, source: 'tag', reason: `${arxivCat} → ${tagDomain}` };
  }

  return { domain: tagDomain, source: 'tag', reason: arxivCat };
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
    headers: { 'User-Agent': 'Centari-Worker/1.3 (research signal ingestion; robin89.olsson@gmail.com)' },
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
  const lastEnd = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('? '),
    cut.lastIndexOf('! '),
  );
  if (lastEnd > max * 0.6) return s.slice(0, lastEnd + 1);
  return cut.slice(0, max - 1) + '…';
}

// ── Editorial scoring ─────────────────────────────────────────────────────────
//
// Four dimensions × 25 points = 100 total.
// Maps to: curator_score (1-10), signal_strength (0-1), novelty_score (0-1).

interface EditorialScore {
  total:          number;   // 0-100
  novelty:        number;   // 0-25
  strategic:      number;   // 0-25
  relevance:      number;   // 0-25
  publicInterest: number;   // 0-25
}

const NOVELTY_STRONG_RE  = /state.of.the.art|surpass|breakthrough|outperform.*by|beat.*baseline|new\s+record|first\s+to\s+achieve/i;
const NOVELTY_GENERAL_RE = /\bnovel\b|new\s+method|new\s+approach|new\s+framework|first\s+time|first\s+work|we\s+propose|we\s+introduce|we\s+present/i;
const NOVELTY_REVIEW_RE  = /\bsurvey\b|\breview\b|\bbenchmark\b|comprehensive\s+(study|analysis)|literature\s+review/i;

const STRATEGIC_HW_RE   = /\baccelerator\b|\bneuromorphic\b|\bfpga\b|\basic\b|\bchip\b|hardware.accelerat|inference\s+engine|edge\s+deploy/i;
const STRATEGIC_REAL_RE = /\bdeployed\b|real.world\s+(test|application|trial|demo)|in\s+production|on.device|field\s+(test|trial)|system\s+integration/i;

const INTEREST_MISSION_RE  = /\bjwst\b|\bnasa\b|\besa\b|\bspacex\b|\bmars\b|james\s+webb|lunar\s+gateway|hubble|\bartemis\b/i;
const INTEREST_CONSUMER_RE = /\bhumanoid\b|\bavatar\b|facial\s+(animation|expression|reconstruction)|robot\s+arm|prostheti|\bexoskeleton\b/i;
const INTEREST_AI_RE       = /\bllm\b|large\s+language\s+model|foundation\s+model|autonomous\s+agent|\bgpt\b|\bgemini\b|multimodal\s+model/i;
const INTEREST_THEORY_RE   = /\btheorem\b|\blemma\b|\bproof\b|monte\s+carlo\s+method|stochastic\s+process|markov\s+chain|convergence\s+analysis/i;

const DOMAIN_STRATEGIC_BASE: Record<StoredDomain, number> = {
  robotics:  22,
  xr:        20,
  ai:        18,
  quantum:   16,
  space:     14,
  energy:    14,
  materials: 14,
  other:      3,
};

function computeEditorialScore(
  title: string,
  summary: string,
  domain: StoredDomain,
  inferSource: 'tag' | 'title' | 'veto',
  arxivCat: string,
): EditorialScore {
  const text = (title + ' ' + summary).toLowerCase();

  // Novelty (0-25)
  let novelty = 12;
  if (NOVELTY_STRONG_RE.test(text))        novelty += 8;
  else if (NOVELTY_GENERAL_RE.test(text))  novelty += 5;
  if (NOVELTY_REVIEW_RE.test(text))        novelty -= 8;
  novelty = Math.max(0, Math.min(25, novelty));

  // Strategic importance (0-25) — domain base + hardware/real-world bonuses
  let strategic = DOMAIN_STRATEGIC_BASE[domain];
  if (STRATEGIC_HW_RE.test(text))   strategic += 4;
  if (STRATEGIC_REAL_RE.test(text)) strategic += 3;
  strategic = Math.max(0, Math.min(25, strategic));

  // Centari relevance (0-25) — based on how the domain assignment was made
  let relevance: number;
  if (domain === 'other') {
    relevance = 5;
  } else if (
    arxivCat === 'cs.RO' || arxivCat === 'quant-ph' || arxivCat === 'cs.GR' ||
    arxivCat === 'astro-ph.IM' || arxivCat === 'astro-ph.EP' || arxivCat === 'cond-mat.mtrl-sci'
  ) {
    relevance = 22;   // specific trusted tag
  } else if (inferSource === 'title') {
    relevance = 18;   // broad AI redirected via title keyword scan
  } else if (arxivCat === 'cs.HC' || arxivCat === 'cond-mat.supr-con' || arxivCat === 'physics.app-ph') {
    relevance = 18;   // gated tag that passed keyword confirmation
  } else {
    relevance = 14;   // broad AI default (no title redirect)
  }
  relevance = Math.max(0, Math.min(25, relevance));

  // Public interest (0-25)
  let publicInterest = 10;
  if (INTEREST_MISSION_RE.test(text))       publicInterest += 8;
  else if (INTEREST_CONSUMER_RE.test(text)) publicInterest += 6;
  else if (INTEREST_AI_RE.test(text))       publicInterest += 4;
  if (INTEREST_THEORY_RE.test(text))        publicInterest -= 3;
  publicInterest = Math.max(0, Math.min(25, publicInterest));

  return {
    total: novelty + strategic + relevance + publicInterest,
    novelty,
    strategic,
    relevance,
    publicInterest,
  };
}

// ── Dry-run record ────────────────────────────────────────────────────────────

interface DryRunRecord {
  title:          string;
  domain:         StoredDomain;
  arxivCat:       string;
  inferSource:    'tag' | 'title' | 'veto';
  inferReason:    string;
  curatorScore:   number;
  signalStrength: number;
  noveltyScore:   number;
  isOther:        boolean;
}

// ── Main worker ───────────────────────────────────────────────────────────────

interface WorkerResult {
  signals_found:   number;
  signals_written: number;
  signals_skipped: number;
  signals_other:   number;   // routed to 'other' (routing gate rejections)
  errors:          string[];
}

async function run(): Promise<void> {
  loadEnv();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!DRY_RUN && (!supabaseUrl || !serviceKey)) {
    log('error', 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  log('info', 'arXiv worker starting', {
    dry_run:       DRY_RUN,
    max_total:     MAX_TOTAL,
    per_category:  PER_CATEGORY || 'none (global max)',
    lookback_days: DAYS,
    categories:    CATEGORY_MAP.length,
    version:       '1.3',
  });

  const supabase: SupabaseClient = DRY_RUN
    ? (null as unknown as SupabaseClient)
    : createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });

  const startedAt = new Date().toISOString();
  const result: WorkerResult = {
    signals_found: 0, signals_written: 0,
    signals_skipped: 0, signals_other: 0,
    errors: [],
  };

  const beforeCount: Partial<Record<CentariDomain, number>> = {};
  const afterCount:  Partial<Record<StoredDomain, number>>  = {};
  const dryRunRecords: DryRunRecord[] = [];

  // ── 1. Ensure arXiv source row exists ────────────────────────────────────
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

  // ── 2. Log worker run start ───────────────────────────────────────────────
  let workerRunId: string | null = null;

  if (!DRY_RUN) {
    const { data: runRow, error: runErr } = await supabase
      .from('worker_runs')
      .insert({ status: 'running', runner_version: 'arxiv-worker-1.3' })
      .select('id')
      .single();

    if (runErr || !runRow) {
      log('warn', 'Could not create worker_runs row — continuing without run tracking', { error: runErr?.message });
    } else {
      workerRunId = runRow.id as string;
      log('info', 'Worker run created', { run_id: workerRunId });
    }
  }

  // ── 3. Fetch and ingest per category ─────────────────────────────────────
  const cutoff  = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const seenIds = new Set<string>();

  for (let i = 0; i < CATEGORY_MAP.length; i++) {
    if (!PER_CATEGORY && result.signals_written >= MAX_TOTAL) {
      log('info', `Reached max_total=${MAX_TOTAL}, stopping early`);
      break;
    }

    const { arxivCat, domain: tagDomain } = CATEGORY_MAP[i];

    let categoryWritten = 0;
    const categoryMax   = PER_CATEGORY > 0 ? PER_CATEGORY : MAX_TOTAL;
    const fetchN        = Math.min(30, categoryMax + 8);

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

      // ── Clean fields ───────────────────────────────────────────────────────
      const rawTitle   = entry.title;
      const rawSummary = entry.summary.replace(/\s+/g, ' ').trim();

      const cleanTitle   = truncateSentence(cleanLatex(rawTitle), 200);
      const cleanSummary = truncateSentence(cleanLatex(rawSummary), 497);

      if (cleanSummary.length < 20) { result.signals_skipped++; continue; }
      if (cleanTitle.length < 5)    { result.signals_skipped++; continue; }

      // ── Infer domain ───────────────────────────────────────────────────────
      const inferred = inferDomain(arxivCat, tagDomain, cleanTitle);

      beforeCount[tagDomain] = (beforeCount[tagDomain] ?? 0) + 1;

      // R8E-B: rejected signals route to 'other' — not dropped
      const storedDomain: StoredDomain = inferred.rejected ? 'other' : inferred.domain;

      if (inferred.rejected) {
        result.signals_other++;
        log('info', `Routed to other (${inferred.reason})`, {
          title:     cleanTitle.slice(0, 60),
          arxiv_cat: arxivCat,
        });
      }

      afterCount[storedDomain] = (afterCount[storedDomain] ?? 0) + 1;

      // ── Editorial scoring ──────────────────────────────────────────────────
      const editorial      = computeEditorialScore(cleanTitle, cleanSummary, storedDomain, inferred.source, arxivCat);
      const curatorScore   = Math.max(1, Math.min(10, Math.round(editorial.total / 10)));
      const signalStrength = editorial.total / 100;
      const noveltyScore   = editorial.novelty / 25;

      if (DRY_RUN) {
        dryRunRecords.push({
          title:          cleanTitle,
          domain:         storedDomain,
          arxivCat,
          inferSource:    inferred.source,
          inferReason:    inferred.reason,
          curatorScore,
          signalStrength,
          noveltyScore,
          isOther:        storedDomain === 'other',
        });
      }

      const slug = makeSlug(cleanTitle, publishedAt);

      const signal = {
        slug,
        source_id:            sourceId,
        source_url:           entry.link,
        source_name:          'arXiv',
        published_at:         publishedAt.toISOString(),
        title:                cleanTitle,
        summary:              cleanSummary,
        category:             storedDomain,
        secondary_categories: inferred.source === 'title' ? [tagDomain as string] : [],
        signal_type:          'paper',
        confidence:           'probable',
        curator_score:        curatorScore,
        signal_strength:      signalStrength,
        novelty_score:        noveltyScore,
        momentum_score:       0.500,
        status:               'pending',
        reviewed_by:          'worker-arxiv',
        tags:                 [arxivCat],
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
        log('info', 'Inserted signal', {
          slug,
          title:         cleanTitle.slice(0, 60),
          domain:        storedDomain,
          domain_source: inferred.source,
          curator_score: curatorScore,
        });
        categoryWritten++;
        result.signals_written++;
      }
    }
  }

  // ── 4. Update worker_run row ──────────────────────────────────────────────
  if (!DRY_RUN && workerRunId) {
    const { error: updateErr } = await supabase
      .from('worker_runs')
      .update({
        status:           result.errors.length > 0 && result.signals_written === 0 ? 'failed' : 'completed',
        finished_at:      new Date().toISOString(),
        signals_fetched:  result.signals_found,
        signals_inserted: result.signals_written,
        signals_rejected: result.signals_other + result.signals_skipped,
        error_message:    result.errors.length > 0 ? result.errors.join('; ') : null,
      })
      .eq('id', workerRunId);

    if (updateErr) log('warn', 'Could not update worker_runs row', { error: updateErr.message });
  }

  // ── 5. Dry-run report ─────────────────────────────────────────────────────
  if (DRY_RUN) {
    const allDomains: CentariDomain[] = ['ai', 'robotics', 'xr', 'quantum', 'space', 'energy', 'materials'];
    const beforeTotal = Object.values(beforeCount).reduce((a, b) => a + b, 0);
    const afterTotal  = Object.values(afterCount).reduce((a, b) => a + b, 0);

    const bar = (n: number, total: number) =>
      total > 0 ? '█'.repeat(Math.round((n / total) * 28)) : '';

    process.stdout.write('\n' + '═'.repeat(72) + '\n');
    process.stdout.write('DRY-RUN R8E-B REPORT — OTHER DOMAIN + EDITORIAL SCORING\n');
    process.stdout.write('═'.repeat(72) + '\n\n');

    process.stdout.write('── BEFORE (tag-only, R8B rules) ──────────────────────────────────────\n');
    for (const d of allDomains) {
      const n = beforeCount[d] ?? 0;
      if (n) process.stdout.write(`  ${d.padEnd(10)} ${String(n).padStart(3)}  ${bar(n, beforeTotal)}\n`);
    }
    process.stdout.write(`  ${'TOTAL'.padEnd(10)} ${String(beforeTotal).padStart(3)}\n\n`);

    process.stdout.write('── AFTER  (R8E-B routing — \'other\' instead of drop) ──────────────────\n');
    for (const d of [...allDomains, 'other' as StoredDomain]) {
      const n = afterCount[d] ?? 0;
      if (n) process.stdout.write(`  ${d.padEnd(10)} ${String(n).padStart(3)}  ${bar(n, afterTotal)}\n`);
    }
    process.stdout.write(`  ${'TOTAL'.padEnd(10)} ${String(afterTotal).padStart(3)}\n\n`);

    // Top 20 by curator_score
    const sorted = [...dryRunRecords].sort((a, b) => b.curatorScore - a.curatorScore);
    const top20  = sorted.slice(0, 20);
    const bot20  = sorted.slice(-20).reverse();

    process.stdout.write('── TOP 20 BY CURATOR SCORE ───────────────────────────────────────────\n\n');
    for (let i = 0; i < top20.length; i++) {
      const r = top20[i];
      process.stdout.write(`[${String(i + 1).padStart(2, '0')}] score=${r.curatorScore}  domain=${r.domain.padEnd(10)} cat=${r.arxivCat}\n`);
      process.stdout.write(`     ${r.title.slice(0, 80)}\n`);
      if (r.isOther) process.stdout.write(`     [other: ${r.inferReason}]\n`);
      process.stdout.write('\n');
    }

    process.stdout.write('── BOTTOM 20 BY CURATOR SCORE ────────────────────────────────────────\n\n');
    for (let i = 0; i < bot20.length; i++) {
      const r = bot20[i];
      process.stdout.write(`[${String(i + 1).padStart(2, '0')}] score=${r.curatorScore}  domain=${r.domain.padEnd(10)} cat=${r.arxivCat}\n`);
      process.stdout.write(`     ${r.title.slice(0, 80)}\n`);
      if (r.isOther) process.stdout.write(`     [other: ${r.inferReason}]\n`);
      process.stdout.write('\n');
    }

    process.stdout.write('═'.repeat(72) + '\n\n');
  }

  // ── 6. Run summary ────────────────────────────────────────────────────────
  log('info', DRY_RUN ? '[dry-run] Run complete' : 'Run complete', {
    signals_found:   result.signals_found,
    signals_written: result.signals_written,
    signals_skipped: result.signals_skipped,
    signals_other:   result.signals_other,
    errors:          result.errors.length,
    duration_s:      ((Date.now() - new Date(startedAt).getTime()) / 1000).toFixed(1),
  });

  if (result.errors.length > 0) {
    log('warn', 'Non-fatal errors during run', { errors: result.errors });
  }
}

run().catch(err => {
  log('error', 'Fatal error', { error: String(err) });
  process.exit(1);
});

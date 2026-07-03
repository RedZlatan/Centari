// Journal curator
// Run: npx tsx worker/src/journal-curator.ts --period=daily --dry-run
//
// Purpose:
// - Keep the Research Map live and temporary.
// - Save only the strongest signals into the Journal layer.
// - Map saved signals to concrete brain regions for the Journal brain atlas.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

type Period = 'daily' | 'weekly' | 'monthly';
type Domain = 'ai' | 'xr' | 'robotics' | 'quantum' | 'space' | 'energy' | 'materials' | 'nano' | 'other';
type BrainRegionSlug =
  | 'prefrontal'
  | 'premotor'
  | 'somatosensory'
  | 'visual'
  | 'temporal'
  | 'hippocampus'
  | 'amygdala';

type SignalRow = {
  id: string;
  title: string;
  summary: string;
  category: Domain;
  secondary_categories: Domain[] | null;
  signal_type: string;
  tags: string[] | null;
  confidence: string | null;
  curator_score: number | null;
  signal_strength: number | null;
  novelty_score: number | null;
  momentum_score: number | null;
  source_name: string | null;
  source_url: string | null;
  published_at: string;
  ingested_at: string;
};

type BrainRule = {
  slug: BrainRegionSlug;
  title: string;
  keywords: string[];
  domainBoosts?: Partial<Record<Domain, number>>;
  typeBoosts?: Record<string, number>;
};

type CuratorOptions = {
  period: Period;
  dryRun: boolean;
  date: Date;
  days: number;
  limit: number;
  maxPerDomain: number;
  maxPerRegion: number;
  minScore: number;
};

const domains: Domain[] = ['ai', 'xr', 'robotics', 'quantum', 'space', 'energy', 'materials', 'nano', 'other'];

const brainRules: BrainRule[] = [
  {
    slug: 'prefrontal',
    title: 'Prefrontal cortex',
    keywords: [
      'decision', 'planning', 'forecast', 'prediction', 'optimization', 'optimisation',
      'uncertainty', 'command', 'control', 'policy', 'governance', 'strategy',
      'risk model', 'prioritization', 'prioritisation',
    ],
    domainBoosts: { ai: 0.06, energy: 0.03, space: 0.03 },
  },
  {
    slug: 'premotor',
    title: 'Premotor cortex',
    keywords: [
      'training', 'rehearsal', 'simulation', 'simulator', 'procedural', 'workflow',
      'task', 'teleoperation', 'operator', 'tool use', 'human-robot', 'robot control',
      'mission rehearsal',
    ],
    domainBoosts: { xr: 0.08, robotics: 0.07, ai: 0.03 },
  },
  {
    slug: 'somatosensory',
    title: 'Somatosensory cortex',
    keywords: [
      'haptic', 'touch', 'tactile', 'wearable', 'glove', 'fatigue', 'ergonomic',
      'physical', 'field', 'mobility', 'prosthetic', 'exoskeleton', 'body',
      'force feedback', 'sensorimotor',
    ],
    domainBoosts: { robotics: 0.08, xr: 0.05, materials: 0.03 },
  },
  {
    slug: 'visual',
    title: 'Visual cortex',
    keywords: [
      'vision', 'visual', 'camera', 'display', 'dashboard', 'map', 'geospatial',
      'satellite imagery', 'computer vision', '3d reconstruction', 'rendering',
      'interface', 'pattern', 'detection', 'monitoring',
    ],
    domainBoosts: { xr: 0.08, ai: 0.05, space: 0.05 },
  },
  {
    slug: 'temporal',
    title: 'Temporal cortex',
    keywords: [
      'audio', 'sound', 'speech', 'voice', 'language', 'radio', 'signal',
      'acoustic', 'sonar', 'alert', 'rhythm', 'translation', 'communication',
      'natural language',
    ],
    domainBoosts: { ai: 0.06, space: 0.03 },
  },
  {
    slug: 'hippocampus',
    title: 'Hippocampus',
    keywords: [
      'memory', 'learning', 'education', 'knowledge', 'archive', 'retrieval',
      'navigation', 'spatial memory', 'context', 'sequence', 'history', 'long-term',
      'reference', 'lesson',
    ],
    domainBoosts: { xr: 0.05, ai: 0.04 },
  },
  {
    slug: 'amygdala',
    title: 'Amygdala',
    keywords: [
      'stress', 'fear', 'threat', 'crisis', 'disaster', 'emergency', 'safety',
      'attack', 'conflict', 'wildfire', 'earthquake', 'outbreak', 'radiation',
      'cyberattack', 'risk', 'trauma', 'alarm', 'warning',
    ],
    domainBoosts: { energy: 0.04, space: 0.03, ai: 0.02 },
  },
];

function loadEnv(): void {
  const candidates = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '..', '.env.local'),
  ];
  const envPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!envPath) return;

  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseArgs(): CuratorOptions {
  const args = process.argv.slice(2);
  const periodArg = args.find((arg) => arg.startsWith('--period='))?.split('=')[1] as Period | undefined;
  const dateArg = args.find((arg) => arg.startsWith('--date='))?.split('=')[1];
  const daysArg = args.find((arg) => arg.startsWith('--days='))?.split('=')[1];
  const limitArg = args.find((arg) => arg.startsWith('--limit='))?.split('=')[1];
  const maxPerDomainArg = args.find((arg) => arg.startsWith('--max-per-domain='))?.split('=')[1];
  const maxPerRegionArg = args.find((arg) => arg.startsWith('--max-per-region='))?.split('=')[1];
  const minScoreArg = args.find((arg) => arg.startsWith('--min-score='))?.split('=')[1];

  return {
    period: periodArg && ['daily', 'weekly', 'monthly'].includes(periodArg) ? periodArg : 'daily',
    dryRun: args.includes('--dry-run'),
    date: dateArg ? new Date(`${dateArg}T12:00:00Z`) : new Date(),
    days: Math.max(1, Math.min(Number.parseInt(daysArg ?? '1', 10) || 1, 45)),
    limit: Math.max(20, Math.min(Number.parseInt(limitArg ?? '500', 10) || 500, 2000)),
    maxPerDomain: Math.max(1, Math.min(Number.parseInt(maxPerDomainArg ?? '8', 10) || 8, 30)),
    maxPerRegion: Math.max(1, Math.min(Number.parseInt(maxPerRegionArg ?? '8', 10) || 8, 30)),
    minScore: Math.max(0, Math.min(Number.parseFloat(minScoreArg ?? '55') || 55, 100)),
  };
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getWindow(options: CuratorOptions) {
  const day = startOfUtcDay(options.date);

  if (options.period === 'daily') {
    const start = addDays(day, 1 - options.days);
    return { start, end: day };
  }

  if (options.period === 'weekly') {
    const weekday = day.getUTCDay() || 7;
    const start = addDays(day, 1 - weekday);
    return { start, end: addDays(start, 6) };
  }

  const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
  const end = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0));
  return { start, end };
}

function buildSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

function textFor(signal: SignalRow) {
  return `${signal.title} ${signal.summary} ${(signal.tags ?? []).join(' ')}`.toLowerCase();
}

function countMatches(text: string, keywords: string[]) {
  return keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
}

function recencyScore(signal: SignalRow, now: Date) {
  const published = new Date(signal.published_at).getTime();
  const ageHours = Math.max(0, (now.getTime() - published) / 36e5);
  return Math.max(0, Math.min(1, 1 - ageHours / (24 * 14)));
}

function editorialScore(signal: SignalRow, now: Date) {
  const strength = (signal.signal_strength ?? 0) / 10;
  const curator = signal.curator_score ? signal.curator_score / 10 : 0;
  const novelty = signal.novelty_score ?? 0;
  const momentum = signal.momentum_score ?? 0;
  const confidence = signal.confidence === 'verified' ? 1 : signal.confidence === 'probable' ? 0.78 : 0.55;
  const recency = recencyScore(signal, now);

  return Math.round(
    (strength * 0.42 + curator * 0.18 + novelty * 0.16 + momentum * 0.12 + confidence * 0.06 + recency * 0.06) * 1000,
  ) / 10;
}

function classifyBrainRegions(signal: SignalRow) {
  const text = textFor(signal);
  const matches = brainRules
    .map((rule) => {
      const hits = countMatches(text, rule.keywords);
      const domainBoost = rule.domainBoosts?.[signal.category] ?? 0;
      const typeBoost = rule.typeBoosts?.[signal.signal_type] ?? 0;
      const relevance = Math.min(0.98, hits.length > 0 ? 0.52 + hits.length * 0.095 + domainBoost + typeBoost : domainBoost);

      return {
        slug: rule.slug,
        title: rule.title,
        hits,
        relevance,
        reason: hits.length > 0 ? `Matched: ${hits.slice(0, 5).join(', ')}` : `Domain affinity: ${signal.category}`,
      };
    })
    .filter((match) => match.relevance >= 0.28)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 3);

  return matches;
}

function saveReason(signal: SignalRow, score: number, brainMatches: ReturnType<typeof classifyBrainRegions>) {
  const topRegion = brainMatches[0]?.title ?? 'trend archive';
  const source = signal.source_name ?? 'unknown source';
  return `Score ${score.toFixed(1)} from ${source}; strongest journal fit: ${topRegion}.`;
}

function countDomainMix(signals: SignalRow[]) {
  const counts = new Map<string, number>();
  for (const signal of signals) {
    counts.set(signal.category, (counts.get(signal.category) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

function topByDomain(candidates: Array<{ signal: SignalRow; score: number }>, maxPerDomain: number) {
  const selected = new Map<string, { signal: SignalRow; score: number }>();

  for (const domain of domains) {
    candidates
      .filter((candidate) => candidate.signal.category === domain)
      .slice(0, maxPerDomain)
      .forEach((candidate) => selected.set(candidate.signal.id, candidate));
  }

  return [...selected.values()];
}

function topByBrainRegion(
  candidates: Array<{ signal: SignalRow; score: number; brainMatches: ReturnType<typeof classifyBrainRegions> }>,
  maxPerRegion: number,
) {
  const selected = new Map<string, { signal: SignalRow; score: number; brainMatches: ReturnType<typeof classifyBrainRegions> }>();

  for (const rule of brainRules) {
    candidates
      .filter((candidate) => candidate.brainMatches.some((match) => match.slug === rule.slug))
      .sort((a, b) => {
        const ar = a.brainMatches.find((match) => match.slug === rule.slug)?.relevance ?? 0;
        const br = b.brainMatches.find((match) => match.slug === rule.slug)?.relevance ?? 0;
        return b.score * br - a.score * ar;
      })
      .slice(0, maxPerRegion)
      .forEach((candidate) => selected.set(candidate.signal.id, candidate));
  }

  return [...selected.values()];
}

async function fetchSignals(supabase: SupabaseClient, start: Date, end: Date, limit: number) {
  const endExclusive = addDays(end, 1);
  const { data, error } = await supabase
    .from('signals')
    .select('id,title,summary,category,secondary_categories,signal_type,tags,confidence,curator_score,signal_strength,novelty_score,momentum_score,source_name,source_url,published_at,ingested_at')
    .eq('status', 'approved')
    .gte('published_at', start.toISOString())
    .lt('published_at', endExclusive.toISOString())
    .order('signal_strength', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch signals: ${error.message}`);
  }

  return (data ?? []) as SignalRow[];
}

async function upsertJournalSelection(
  supabase: SupabaseClient,
  selected: Array<{ signal: SignalRow; score: number; brainMatches: ReturnType<typeof classifyBrainRegions> }>,
  options: CuratorOptions,
  windowStart: string,
  windowEnd: string,
) {
  const brainRows = selected.flatMap((candidate) =>
    candidate.brainMatches.map((match) => ({
      signal_id: candidate.signal.id,
      brain_region_slug: match.slug,
      relevance: match.relevance,
      reason: match.reason,
      assigned_by: 'rules',
    })),
  );

  const savedRows = selected.map((candidate) => ({
    signal_id: candidate.signal.id,
    saved_for: candidate.brainMatches.length > 0 ? 'both' : 'trend',
    save_score: candidate.score,
    save_reason: saveReason(candidate.signal, candidate.score, candidate.brainMatches),
    selected_by: 'rules',
    window_start: windowStart,
    window_end: windowEnd,
    metadata: {
      category: candidate.signal.category,
      source_name: candidate.signal.source_name,
      brain_regions: candidate.brainMatches.map((match) => match.slug),
    },
  }));

  if (options.dryRun) {
    return { brainRows: brainRows.length, savedRows: savedRows.length };
  }

  if (brainRows.length > 0) {
    const { error } = await supabase
      .from('signal_brain_regions')
      .upsert(brainRows, { onConflict: 'signal_id,brain_region_slug' });
    if (error) throw new Error(`Failed to upsert signal brain regions: ${error.message}`);
  }

  if (savedRows.length > 0) {
    const { error } = await supabase
      .from('journal_saved_signals')
      .upsert(savedRows, { onConflict: 'signal_id' });
    if (error) throw new Error(`Failed to upsert journal saved signals: ${error.message}`);
  }

  return { brainRows: brainRows.length, savedRows: savedRows.length };
}

async function upsertBrainSnapshots(
  supabase: SupabaseClient,
  selected: Array<{ signal: SignalRow; score: number; brainMatches: ReturnType<typeof classifyBrainRegions> }>,
  options: CuratorOptions,
  windowStart: string,
  windowEnd: string,
) {
  const snapshotRows = brainRules.map((rule) => {
    const regionCandidates = selected
      .filter((candidate) => candidate.brainMatches.some((match) => match.slug === rule.slug))
      .sort((a, b) => b.score - a.score);
    const signals = regionCandidates.map((candidate) => candidate.signal);
    const topTitles = signals.slice(0, 8).map((signal) => signal.title);

    return {
      period: options.period,
      brain_region_slug: rule.slug,
      window_start: windowStart,
      window_end: windowEnd,
      signal_count: signals.length,
      top_signal_ids: signals.slice(0, 10).map((signal) => signal.id),
      top_titles: topTitles,
      domain_mix: countDomainMix(signals),
      rule_summary: signals.length
        ? `${signals.length} saved signals mapped to ${rule.title}. Highest scored: ${topTitles[0]}.`
        : `No saved signals mapped to ${rule.title} in this window.`,
    };
  }).filter((row) => row.signal_count > 0);

  if (options.dryRun || snapshotRows.length === 0) {
    return snapshotRows.length;
  }

  const { error } = await supabase
    .from('brain_region_snapshots')
    .upsert(snapshotRows, { onConflict: 'period,brain_region_slug,window_start,window_end' });

  if (error) {
    throw new Error(`Failed to upsert brain region snapshots: ${error.message}`);
  }

  return snapshotRows.length;
}

async function runJournalCurator(options: CuratorOptions) {
  loadEnv();
  const supabase = buildSupabase();
  const { start, end } = getWindow(options);
  const windowStart = isoDate(start);
  const windowEnd = isoDate(end);
  const signals = await fetchSignals(supabase, start, end, options.limit);

  const scored = signals
    .map((signal) => ({
      signal,
      score: editorialScore(signal, options.date),
      brainMatches: classifyBrainRegions(signal),
    }))
    .filter((candidate) => candidate.score >= options.minScore)
    .sort((a, b) => b.score - a.score);

  const domainSelected = topByDomain(scored, options.maxPerDomain);
  const brainSelected = topByBrainRegion(scored, options.maxPerRegion);
  const selectedMap = new Map<string, { signal: SignalRow; score: number; brainMatches: ReturnType<typeof classifyBrainRegions> }>();

  for (const candidate of scored.slice(0, Math.max(options.maxPerDomain, options.maxPerRegion))) {
    selectedMap.set(candidate.signal.id, candidate);
  }
  for (const candidate of domainSelected) {
    selectedMap.set(candidate.signal.id, candidate);
  }
  for (const candidate of brainSelected) {
    selectedMap.set(candidate.signal.id, candidate);
  }

  const selected = [...selectedMap.values()].sort((a, b) => b.score - a.score);
  const writeCounts = await upsertJournalSelection(supabase, selected, options, windowStart, windowEnd);
  const brainSnapshotCount = await upsertBrainSnapshots(supabase, selected, options, windowStart, windowEnd);

  console.log(JSON.stringify({
    period: options.period,
    window_start: windowStart,
    window_end: windowEnd,
    dry_run: options.dryRun,
    source_signal_count: signals.length,
    scored_signal_count: scored.length,
    saved_signal_count: selected.length,
    brain_region_assignments: writeCounts.brainRows,
    brain_region_snapshots: brainSnapshotCount,
    top_saved: selected.slice(0, 12).map((candidate) => ({
      score: candidate.score,
      category: candidate.signal.category,
      title: candidate.signal.title,
      brain_regions: candidate.brainMatches.map((match) => match.slug),
    })),
  }, null, 2));
}

runJournalCurator(parseArgs()).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  if (message.includes('SUPABASE_URL')) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running journal curator jobs.');
  }
  process.exit(1);
});

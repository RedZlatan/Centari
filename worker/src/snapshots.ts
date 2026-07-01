import { createClient, SupabaseClient } from '@supabase/supabase-js';

type Period = 'daily' | 'weekly' | 'monthly';
type Domain = 'ai' | 'xr' | 'robotics' | 'quantum' | 'space' | 'energy' | 'materials' | 'nano' | 'other';

type SignalRow = {
  id: string;
  title: string;
  summary: string;
  category: Domain;
  secondary_categories: Domain[] | null;
  signal_type: string;
  tags: string[] | null;
  curator_score: number | null;
  signal_strength: number | null;
  novelty_score: number | null;
  momentum_score: number | null;
  source_name: string | null;
  published_at: string;
};

type HumanLayerRule = {
  slug: string;
  title: string;
  keywords: string[];
};

type SnapshotOptions = {
  period: Period;
  dryRun: boolean;
  date: Date;
  limitPerDomain: number;
};

const domains: Domain[] = ['ai', 'xr', 'robotics', 'quantum', 'space', 'energy', 'materials', 'nano', 'other'];

const humanLayerRules: HumanLayerRule[] = [
  {
    slug: 'perception',
    title: 'Perception',
    keywords: ['vision', 'visual', 'audio', 'sound', 'sensor', 'sensing', 'camera', 'display', 'haptic', 'interface'],
  },
  {
    slug: 'spatial-cognition',
    title: 'Spatial cognition',
    keywords: ['spatial', '3d', 'xr', 'vr', 'ar', 'digital twin', 'simulation', 'navigation', 'geospatial', 'environment'],
  },
  {
    slug: 'attention-load',
    title: 'Attention load',
    keywords: ['attention', 'cognitive load', 'workload', 'operator', 'dashboard', 'alert', 'monitoring', 'fatigue'],
  },
  {
    slug: 'memory-learning',
    title: 'Memory and learning',
    keywords: ['training', 'learning', 'education', 'rehearsal', 'memory', 'skill', 'feedback', 'practice'],
  },
  {
    slug: 'stress-risk',
    title: 'Stress and risk',
    keywords: ['stress', 'fear', 'risk', 'threat', 'crisis', 'disaster', 'emergency', 'safety', 'resilience', 'trauma'],
  },
  {
    slug: 'decision-making',
    title: 'Decision-making',
    keywords: ['decision', 'planning', 'forecast', 'prediction', 'risk', 'uncertainty', 'optimization', 'command', 'control'],
  },
  {
    slug: 'body-environment',
    title: 'Body and environment',
    keywords: ['robot', 'humanoid', 'physical', 'factory', 'warehouse', 'construction', 'field', 'mobility', 'wearable'],
  },
  {
    slug: 'team-coordination',
    title: 'Team coordination',
    keywords: ['collaboration', 'team', 'coordination', 'communication', 'multi-agent', 'workflow', 'shared', 'operations'],
  },
];

function parseArgs(): SnapshotOptions {
  const args = process.argv.slice(2);
  const periodArg = args.find((arg) => arg.startsWith('--period='))?.split('=')[1] as Period | undefined;
  const dateArg = args.find((arg) => arg.startsWith('--date='))?.split('=')[1];
  const limitArg = args.find((arg) => arg.startsWith('--limit-per-domain='))?.split('=')[1];

  return {
    period: periodArg && ['daily', 'weekly', 'monthly'].includes(periodArg) ? periodArg : 'daily',
    dryRun: args.includes('--dry-run'),
    date: dateArg ? new Date(`${dateArg}T12:00:00Z`) : new Date(),
    limitPerDomain: Math.max(3, Math.min(Number.parseInt(limitArg ?? '10', 10) || 10, 25)),
  };
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getWindow(period: Period, date: Date) {
  const day = startOfUtcDay(date);

  if (period === 'daily') {
    return { start: day, end: day };
  }

  if (period === 'weekly') {
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

function scoreSignal(signal: SignalRow) {
  const strength = signal.signal_strength ?? 0;
  const curator = signal.curator_score ? signal.curator_score / 10 : 0;
  const novelty = signal.novelty_score ?? 0;
  const momentum = signal.momentum_score ?? 0;
  return strength * 0.55 + curator * 0.2 + novelty * 0.12 + momentum * 0.13;
}

function textFor(signal: SignalRow) {
  return `${signal.title} ${signal.summary} ${(signal.tags ?? []).join(' ')}`.toLowerCase();
}

function classifyHumanLayers(signal: SignalRow) {
  const text = textFor(signal);
  const matches: Array<{ slug: string; reason: string; relevance: number }> = [];

  for (const rule of humanLayerRules) {
    const hits = rule.keywords.filter((keyword) => text.includes(keyword));
    if (hits.length > 0) {
      matches.push({
        slug: rule.slug,
        reason: `Matched: ${hits.slice(0, 4).join(', ')}`,
        relevance: Math.min(0.95, 0.55 + hits.length * 0.1),
      });
    }
  }

  return matches;
}

function countKeywords(signals: SignalRow[]) {
  const counts = new Map<string, number>();

  for (const signal of signals) {
    for (const tag of signal.tags ?? []) {
      const key = tag.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Object.fromEntries(
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12),
  );
}

function countDomainMix(signals: SignalRow[]) {
  const counts = new Map<string, number>();
  for (const signal of signals) {
    counts.set(signal.category, (counts.get(signal.category) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

function buildRuleSummary(domainOrLayer: string, signals: SignalRow[], period: Period) {
  if (signals.length === 0) {
    return `No qualifying ${domainOrLayer} signals in this ${period} window.`;
  }

  const top = signals[0];
  const sources = [...new Set(signals.map((signal) => signal.source_name).filter(Boolean))].slice(0, 3);
  return `${signals.length} ${domainOrLayer} signals in this ${period} window. Highest scored: ${top.title}. Sources: ${sources.join(', ') || 'mixed sources'}.`;
}

async function fetchSignals(supabase: SupabaseClient, start: Date, end: Date) {
  const endExclusive = addDays(end, 1);
  const { data, error } = await supabase
    .from('signals')
    .select('id,title,summary,category,secondary_categories,signal_type,tags,curator_score,signal_strength,novelty_score,momentum_score,source_name,published_at')
    .eq('status', 'approved')
    .gte('published_at', start.toISOString())
    .lt('published_at', endExclusive.toISOString())
    .order('signal_strength', { ascending: false, nullsFirst: false })
    .limit(1000);

  if (error) {
    throw new Error(`Failed to fetch signals: ${error.message}`);
  }

  return (data ?? []) as SignalRow[];
}

async function upsertHumanLayerAssignments(supabase: SupabaseClient, signals: SignalRow[], dryRun: boolean) {
  const rows = signals.flatMap((signal) =>
    classifyHumanLayers(signal).map((match) => ({
      signal_id: signal.id,
      layer_slug: match.slug,
      relevance: match.relevance,
      reason: match.reason,
      assigned_by: 'rules',
    })),
  );

  if (dryRun || rows.length === 0) {
    return rows.length;
  }

  const { error } = await supabase
    .from('signal_human_layers')
    .upsert(rows, { onConflict: 'signal_id,layer_slug' });

  if (error) {
    throw new Error(`Failed to upsert human layer assignments: ${error.message}`);
  }

  return rows.length;
}

async function runSnapshots(options: SnapshotOptions) {
  const supabase = buildSupabase();
  const { start, end } = getWindow(options.period, options.date);
  const windowStart = isoDate(start);
  const windowEnd = isoDate(end);
  const signals = await fetchSignals(supabase, start, end);
  const assignedCount = await upsertHumanLayerAssignments(supabase, signals, options.dryRun);

  const runPayload = {
    period: options.period,
    window_start: windowStart,
    window_end: windowEnd,
    status: 'completed',
    source_signal_count: signals.length,
    metadata: {
      generated_by: 'worker/src/snapshots.ts',
      assigned_human_layers: assignedCount,
      dry_run: options.dryRun,
    },
  };

  let runId = 'dry-run';
  if (!options.dryRun) {
    const { data, error } = await supabase
      .from('trend_snapshot_runs')
      .upsert(runPayload, { onConflict: 'period,window_start,window_end' })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to upsert snapshot run: ${error.message}`);
    }

    runId = data.id as string;
  }

  const trendRows = domains.map((domain) => {
    const domainSignals = signals
      .filter((signal) => signal.category === domain)
      .sort((a, b) => scoreSignal(b) - scoreSignal(a))
      .slice(0, options.limitPerDomain);
    const scores = domainSignals.map(scoreSignal);

    return {
      run_id: runId,
      period: options.period,
      domain,
      window_start: windowStart,
      window_end: windowEnd,
      signal_count: domainSignals.length,
      average_strength: scores.length ? +(scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(3) : null,
      top_score: scores.length ? +Math.max(...scores).toFixed(3) : null,
      top_signal_ids: domainSignals.map((signal) => signal.id),
      top_titles: domainSignals.map((signal) => signal.title),
      source_names: [...new Set(domainSignals.map((signal) => signal.source_name).filter(Boolean))],
      keyword_hits: countKeywords(domainSignals),
      rule_summary: buildRuleSummary(domain, domainSignals, options.period),
    };
  }).filter((row) => row.signal_count > 0);

  const humanRows = humanLayerRules.map((layer) => {
    const layerSignals = signals
      .filter((signal) => classifyHumanLayers(signal).some((match) => match.slug === layer.slug))
      .sort((a, b) => scoreSignal(b) - scoreSignal(a))
      .slice(0, options.limitPerDomain);

    return {
      run_id: runId,
      period: options.period,
      layer_slug: layer.slug,
      window_start: windowStart,
      window_end: windowEnd,
      signal_count: layerSignals.length,
      top_signal_ids: layerSignals.map((signal) => signal.id),
      top_titles: layerSignals.map((signal) => signal.title),
      domain_mix: countDomainMix(layerSignals),
      rule_summary: buildRuleSummary(layer.title, layerSignals, options.period),
    };
  }).filter((row) => row.signal_count > 0);

  if (!options.dryRun) {
    if (trendRows.length > 0) {
      const { error } = await supabase
        .from('trend_snapshots')
        .upsert(trendRows, { onConflict: 'period,domain,window_start,window_end' });
      if (error) throw new Error(`Failed to upsert trend snapshots: ${error.message}`);
    }

    if (humanRows.length > 0) {
      const { error } = await supabase
        .from('human_layer_snapshots')
        .upsert(humanRows, { onConflict: 'period,layer_slug,window_start,window_end' });
      if (error) throw new Error(`Failed to upsert human layer snapshots: ${error.message}`);
    }
  }

  console.log(JSON.stringify({
    period: options.period,
    window_start: windowStart,
    window_end: windowEnd,
    dry_run: options.dryRun,
    source_signal_count: signals.length,
    human_layer_assignments: assignedCount,
    trend_snapshots: trendRows.length,
    human_layer_snapshots: humanRows.length,
    top_domains: trendRows.slice(0, 5).map((row) => ({
      domain: row.domain,
      signal_count: row.signal_count,
      top_title: row.top_titles[0],
    })),
  }, null, 2));
}

runSnapshots(parseArgs()).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  if (message.includes('SUPABASE_URL')) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running snapshot jobs.');
  }
  process.exit(1);
});

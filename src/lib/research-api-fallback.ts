// JSON fallback for the research API routes.
// Used when SUPABASE_URL / SUPABASE_ANON_KEY are not configured (local dev, CI).
// Returns the same shape as the live Supabase queries so callers are unaffected.

import topTrendsRaw from "@/data/top-trends.json";
import {
  getAllResearchSignals,
  type ResearchSignal,
  type Domain,
  type SignalType,
} from "@/lib/research-signals";

// Mirror the seed defaults from 003_research_seed.sql so scores are consistent
// between fallback mode and live mode on freshly-seeded data.
const NOVELTY_BY_TYPE: Record<SignalType, number> = {
  paper:           0.90,
  patent:          0.85,
  launch:          0.80,
  funding:         0.75,
  release:         0.70,
  lab_publication: 0.65,
  news:            0.50,
};

const MOMENTUM_BY_DOMAIN: Record<Domain, number> = {
  ai:        0.92,
  robotics:  0.85,
  quantum:   0.82,
  energy:    0.78,
  space:     0.75,
  materials: 0.72,
  xr:        0.68,
};

function signalToApiShape(s: ResearchSignal) {
  return {
    id:                   s.id,
    slug:                 s.id,
    title:                s.title,
    summary:              s.summary,
    category:             s.primary_domain,
    secondary_categories: s.secondary_domains,
    signal_type:          s.signal_type,
    tags:                 s.tags,
    confidence:           s.confidence,
    curator_score:        s.curator_score,
    signal_strength:      parseFloat((s.curator_score / 10).toFixed(3)),
    novelty_score:        NOVELTY_BY_TYPE[s.signal_type],
    momentum_score:       MOMENTUM_BY_DOMAIN[s.primary_domain],
    published_at:         s.published_at,
    source_url:           s.source_url,
    source_name:          s.source_name,
    location: {
      city:                s.city,
      country_code:        s.country_code,
      country_name:        s.country_name,
      region:              s.region,
      lat:                 s.lat,
      lng:                 s.lng,
      location_confidence: s.location_confidence,
      place_type:          "hq" as const,
    },
  };
}

export interface FallbackSignalsOptions {
  domain?: string | null;
  region?: string | null;
  type?:   string | null;
  limit:   number;
  offset:  number;
}

export function getFallbackSignals(opts: FallbackSignalsOptions) {
  let pool = getAllResearchSignals().filter((s) => s.curator_score >= 4);

  if (opts.domain) pool = pool.filter((s) => s.primary_domain === opts.domain);
  if (opts.region) pool = pool.filter((s) => s.region         === opts.region);
  if (opts.type)   pool = pool.filter((s) => s.signal_type    === opts.type);

  pool = [...pool].sort((a, b) => b.curator_score - a.curator_score);

  const total = pool.length;
  const page  = pool.slice(opts.offset, opts.offset + opts.limit);

  return {
    data:   page.map(signalToApiShape),
    total,
    limit:  opts.limit,
    offset: opts.offset,
    source: "json" as const,
  };
}

// ── Trends ─────────────────────────────────────────────────────────────────────

interface JsonTrend {
  rank:           number;
  headline:       string;
  explanation:    string;
  primary_domain: Domain;
  signal_ids:     string[];
}

interface JsonTrendsDataset {
  updated_at: string;
  trends:     JsonTrend[];
}

function headlineToSlug(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface FallbackTrendsOptions {
  domain?: string | null;
  limit:   number;
  offset:  number;
}

export function getFallbackTrends(opts: FallbackTrendsOptions) {
  const dataset    = topTrendsRaw as JsonTrendsDataset;
  const signalMap  = new Map(getAllResearchSignals().map((s) => [s.id, s]));

  let pool = dataset.trends;
  if (opts.domain) pool = pool.filter((t) => t.primary_domain === opts.domain);

  const total = pool.length;
  const page  = pool.slice(opts.offset, opts.offset + opts.limit);

  const data = page.map((t) => {
    const constituents = t.signal_ids
      .map((id) => signalMap.get(id))
      .filter((s): s is ResearchSignal => s != null);

    const trendScore = constituents.length > 0
      ? constituents.reduce((sum, s) => sum + s.curator_score / 10, 0) / constituents.length
      : 0;

    const dates = constituents.map((s) => s.published_at).sort();

    const signals = constituents.map((s) => ({
      id:              s.id,
      slug:            s.id,
      title:           s.title,
      category:        s.primary_domain,
      signal_type:     s.signal_type,
      tags:            s.tags,
      confidence:      s.confidence,
      signal_strength: parseFloat((s.curator_score / 10).toFixed(3)),
      published_at:    s.published_at,
      source_name:     s.source_name,
      source_url:      s.source_url,
      location: {
        city:                s.city,
        country_code:        s.country_code,
        country_name:        s.country_name,
        region:              s.region,
        lat:                 s.lat,
        lng:                 s.lng,
        location_confidence: s.location_confidence,
        place_type:          "hq" as const,
      },
      region:          s.region,
      relevance_score: 1.0,
    }));

    return {
      id:               `fallback-trend-${t.rank}`,
      slug:             headlineToSlug(t.headline),
      title:            t.headline,
      summary:          t.explanation,
      primary_category: t.primary_domain,
      status:           "active" as const,
      trend_score:      parseFloat(trendScore.toFixed(3)),
      momentum_score:   MOMENTUM_BY_DOMAIN[t.primary_domain],
      signal_count:     constituents.length,
      first_signal_at:  dates[0]                   ?? null,
      last_signal_at:   dates[dates.length - 1]    ?? null,
      signals,
    };
  });

  return {
    data,
    total,
    limit:  opts.limit,
    offset: opts.offset,
    source: "json" as const,
  };
}

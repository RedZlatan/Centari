import rawDataset from "@/data/research-signals.json";

// ─── Schema version ───────────────────────────────────────────────────────────
//
// This file defines the V2 data schema for the Research Signal Map.
// The V1 schema lives in src/lib/signals.ts and is used by the current UI.
// V2 is the target schema for public beta. Migration happens in a future sprint.

export const SCHEMA_VERSION = "2.0" as const;

// ─── Enumerations ─────────────────────────────────────────────────────────────

export type Domain =
  | "ai"
  | "xr"
  | "robotics"
  | "quantum"
  | "space"
  | "energy"
  | "materials";

export type SignalType =
  | "paper"
  | "news"
  | "funding"
  | "patent"
  | "launch"
  | "release"
  | "lab_publication";

/** Overall data quality for this signal record. */
export type SignalConfidence =
  | "verified"     // curator personally checked source, geolocation, and claims
  | "probable"     // source is plausible, claims consistent, not independently verified
  | "preliminary"; // breaking news or preprint; claims not yet confirmed

/** Geographic accuracy of lat/lng coordinates. */
export type LocationConfidence = "high" | "medium" | "low";

/** Authority tier of the source publication or organisation. */
export type SourceTier = 1 | 2 | 3;

/**
 * Continent-scale region. Used for geographic filtering and display.
 * Definitions follow standard geopolitical groupings, not geographic centroids.
 */
export type Region =
  | "North America"
  | "Europe"
  | "Asia-Pacific"
  | "Middle East"
  | "Africa"
  | "Latin America"
  | "Oceania";

// ─── Core interfaces ──────────────────────────────────────────────────────────

export interface ResearchSignal {
  // ── Identity ──────────────────────────────────────────────────────────────
  /** Globally unique, kebab-case. Format: {descriptive-slug}-{YYYY-MM}. */
  id: string;

  // ── Timestamps ────────────────────────────────────────────────────────────
  /** ISO 8601 date (YYYY-MM-DD): when the underlying event was published/occurred. */
  published_at: string;
  /** ISO 8601 date: when this record was added to the dataset. */
  ingested_at: string;

  // ── Content ───────────────────────────────────────────────────────────────
  /**
   * Title. For papers: verbatim title. For news/launches: verbatim or
   * close paraphrase of the primary headline. Max 200 characters.
   */
  title: string;
  /**
   * 2–4 sentences. Plain language. No claims absent from the source.
   * No jargon inflation. Max 500 characters.
   */
  summary: string;
  /**
   * REQUIRED. Direct URL to the specific document, paper, press release,
   * or primary announcement. Must NOT be a homepage, category page,
   * or news aggregator link. Must return HTTP 200 at time of curation.
   */
  source_url: string;

  // ── Classification ────────────────────────────────────────────────────────
  primary_domain: Domain;
  /** 0–2 additional domains. Must not duplicate primary_domain. */
  secondary_domains: Domain[];
  signal_type: SignalType;
  /** Kebab-case factual tags. 0–5. No promotional language. */
  tags: string[];

  // ── Source quality ────────────────────────────────────────────────────────
  /** Display name of the publishing organisation. E.g. "Nature", "arXiv / CMU". */
  source_name: string;
  /** Authority tier. 1 = top-tier primary source. 2 = reputable trade/specialist. 3 = general press. */
  source_tier: SourceTier;

  // ── Geography ─────────────────────────────────────────────────────────────
  /** City name at the point of the event (HQ, lab, launch site, etc.). */
  city: string;
  /** ISO 3166-1 alpha-2 code. E.g. "US", "GB", "JP". */
  country_code: string;
  /** Full English country name. E.g. "United States", "United Kingdom". */
  country_name: string;
  /** Continent-scale region for geographic filtering. */
  region: Region;
  /** WGS84 latitude. Verified against maps or official institution registry. */
  lat: number;
  /** WGS84 longitude. */
  lng: number;
  /**
   * Accuracy of the lat/lng.
   * high   = city-level precision from an authoritative source (ROR, Crunchbase HQ, launch record)
   * medium = city-level from article text or affiliation string, ±50 km
   * low    = country-level only; lat/lng is the capital city centroid
   */
  location_confidence: LocationConfidence;

  // ── Scoring ───────────────────────────────────────────────────────────────
  /**
   * Editorial importance score. Integer 1–10. See scoring rubric in
   * docs/research/research-map-data-layer.md.
   * 9–10: landmark event
   * 7–8:  significant development
   * 5–6:  solid signal
   * 3–4:  background signal
   * 1–2:  weak signal (stored, not displayed by default)
   */
  curator_score: number;
  /**
   * Overall confidence in the accuracy of this record.
   * verified:    curator confirmed source URL live, claims accurate, geolocation verified
   * probable:    plausible source, internally consistent, not independently verified
   * preliminary: breaking news or preprint; claims may be revised
   */
  confidence: SignalConfidence;
}

export interface ResearchSignalDataset {
  schema_version: string;
  updated_at: string;
  signals: ResearchSignal[];
}

export interface ResearchTrend {
  rank: number;
  headline: string;   // ≤ 60 characters
  explanation: string; // 2–4 sentences
  primary_domain: Domain;
  signal_ids: string[];
  trend_score?: number; // computed, not stored
}

export interface ResearchTrendsDataset {
  schema_version: string;
  updated_at: string;
  trends: ResearchTrend[];
}

// ─── Domain constants ─────────────────────────────────────────────────────────

export const DOMAIN_COLORS: Record<Domain, string> = {
  ai:        "#4A90D9",
  xr:        "#9B5DE5",
  robotics:  "#00C86E",
  quantum:   "#E056A0",
  space:     "#00D4FF",
  energy:    "#FFB347",
  materials: "#FF6B6B",
};

export const DOMAIN_LABELS: Record<Domain, string> = {
  ai:        "AI",
  xr:        "XR",
  robotics:  "Robotics",
  quantum:   "Quantum",
  space:     "Space",
  energy:    "Energy",
  materials: "Materials",
};

export const DOMAIN_DESCRIPTIONS: Record<Domain, string> = {
  ai:        "Artificial intelligence, machine learning, foundation models, autonomous agents",
  xr:        "Augmented, virtual, and mixed reality hardware, platforms, and research",
  robotics:  "Autonomous robots, humanoids, manipulation, locomotion, swarms",
  quantum:   "Quantum computing hardware, algorithms, sensing, and communication",
  space:     "Launch vehicles, satellites, deep space, planetary science, infrastructure",
  energy:    "Fusion, fission, renewables, storage, grid technology, carbon capture",
  materials: "Advanced materials, semiconductors, metamaterials, nano, photonics",
};

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  paper:           "Paper",
  news:            "News",
  funding:         "Funding",
  patent:          "Patent",
  launch:          "Launch",
  release:         "Release",
  lab_publication: "Lab publication",
};

export const ALL_DOMAINS: Domain[] = [
  "ai", "xr", "robotics", "quantum", "space", "energy", "materials",
];

export const ALL_REGIONS: Region[] = [
  "North America",
  "Europe",
  "Asia-Pacific",
  "Middle East",
  "Africa",
  "Latin America",
  "Oceania",
];

export const SOURCE_TIER_LABELS: Record<SourceTier, string> = {
  1: "Primary source",
  2: "Specialist press",
  3: "General press",
};

export const SOURCE_TIER_DESCRIPTIONS: Record<SourceTier, string> = {
  1: "The originating institution, lab, or publication (arXiv, Nature, IEEE, official company blog, official mission site)",
  2: "Reputable specialist or trade publication with editorial standards (MIT Technology Review, IEEE Spectrum, TechCrunch for funding rounds with verified data)",
  3: "General press with acceptable accuracy but lower editorial rigour; used only when no tier-1/2 source covers the signal",
};

// ─── Trend scoring ────────────────────────────────────────────────────────────

const RECENCY_HALF_LIFE_DAYS = 30;
const RECENCY_LAMBDA = Math.LN2 / RECENCY_HALF_LIFE_DAYS;

const SOURCE_MULTIPLIER: Record<SourceTier, number> = {
  1: 1.00,
  2: 0.85,
  3: 0.70,
};

/**
 * Type bonus is additive after the base × source × recency product.
 * Reflects that high-impact signal types (funding, launches) carry more
 * trend signal weight than informational types (news, patents).
 */
const TYPE_BONUS: Record<SignalType, number> = {
  funding:         0.50,
  launch:          0.30,
  release:         0.20,
  lab_publication: 0.20,
  paper:           0.10,
  patent:          0.10,
  news:            0.00,
};

/**
 * Computes a real-valued trend score for a single signal.
 *
 * Formula:
 *   trend_score = (curator_score × source_multiplier × recency_factor) + type_bonus
 *
 * Recency factor:
 *   recency_factor = exp(-λ × days_since_published)
 *   where λ = ln(2) / 30  (30-day half-life)
 *
 * Score properties:
 *   - Range: approximately 0.1 (very old, low-quality) to ~10.5 (brand-new, landmark funding)
 *   - A signal published today with curator_score=10, tier 1, funding type scores ~10.5
 *   - At 30 days, the same signal scores ~5.5 (recency_factor = 0.5)
 *   - At 90 days, it scores ~1.4
 *
 * @param signal    The signal to score.
 * @param now       Reference date for recency calculation. Defaults to current time.
 */
export function computeTrendScore(
  signal: ResearchSignal,
  now: Date = new Date()
): number {
  const published = new Date(signal.published_at);
  const daysSince = Math.max(
    (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24),
    0
  );
  const recencyFactor = Math.exp(-RECENCY_LAMBDA * daysSince);
  const base = signal.curator_score * SOURCE_MULTIPLIER[signal.source_tier] * recencyFactor;
  const bonus = TYPE_BONUS[signal.signal_type];
  return parseFloat((base + bonus).toFixed(3));
}

/**
 * Returns the top-N trending signals with domain diversity enforcement.
 *
 * Algorithm:
 *   1. Filter to signals with curator_score >= minCuratorScore
 *   2. Compute trend_score for each
 *   3. Sort by trend_score descending
 *   4. Walk ranked list; skip a signal if its primary_domain already has
 *      maxPerDomain selected entries
 *   5. Stop when count signals have been selected
 *
 * This prevents a single domain from dominating the top 10 even when it
 * generates higher-volume signals (e.g. AI in a busy quarter).
 */
export function selectTopTrends(
  signals: ResearchSignal[],
  options: {
    minCuratorScore?: number;
    maxPerDomain?: number;
    count?: number;
    now?: Date;
  } = {}
): Array<ResearchSignal & { trend_score: number }> {
  const {
    minCuratorScore = 6,
    maxPerDomain = 3,
    count = 10,
    now = new Date(),
  } = options;

  const ranked = signals
    .filter((s) => s.curator_score >= minCuratorScore)
    .map((s) => ({ ...s, trend_score: computeTrendScore(s, now) }))
    .sort((a, b) => b.trend_score - a.trend_score);

  const selected: Array<ResearchSignal & { trend_score: number }> = [];
  const domainCounts = new Map<Domain, number>();

  for (const signal of ranked) {
    const n = domainCounts.get(signal.primary_domain) ?? 0;
    if (n < maxPerDomain) {
      selected.push(signal);
      domainCounts.set(signal.primary_domain, n + 1);
    }
    if (selected.length >= count) break;
  }

  return selected;
}

// ─── Data access ──────────────────────────────────────────────────────────────

export function getAllResearchSignals(): ResearchSignal[] {
  return (rawDataset as ResearchSignalDataset).signals;
}

/** Returns signals with curator_score >= 4 (map display threshold). */
export function getDisplaySignals(): ResearchSignal[] {
  return getAllResearchSignals().filter((s) => s.curator_score >= 4);
}

export function getResearchSignalById(id: string): ResearchSignal | undefined {
  return getAllResearchSignals().find((s) => s.id === id);
}

export function getSignalsByDomain(domain: Domain): ResearchSignal[] {
  return getDisplaySignals().filter((s) => s.primary_domain === domain);
}

export function getSignalsByRegion(region: Region): ResearchSignal[] {
  return getDisplaySignals().filter((s) => s.region === region);
}

export function getSignalsByCountry(countryCode: string): ResearchSignal[] {
  return getDisplaySignals().filter(
    (s) => s.country_code.toUpperCase() === countryCode.toUpperCase()
  );
}

export function getDatasetUpdatedAt(): string {
  return (rawDataset as ResearchSignalDataset).updated_at;
}

export function getDatasetSchemaVersion(): string {
  return (rawDataset as ResearchSignalDataset).schema_version;
}

/** Returns a display string derived from city and country_name. */
export function formatLocation(signal: ResearchSignal): string {
  return `${signal.city}, ${signal.country_name}`;
}

/**
 * Groups display signals by region, sorted by region name.
 * Result map keys are all 7 regions; values may be empty arrays.
 */
export function groupByRegion(
  signals: ResearchSignal[] = getDisplaySignals()
): Map<Region, ResearchSignal[]> {
  const map = new Map<Region, ResearchSignal[]>(
    ALL_REGIONS.map((r) => [r, []])
  );
  for (const signal of signals) {
    map.get(signal.region)?.push(signal);
  }
  return map;
}

/** Groups display signals by primary domain. */
export function groupByDomain(
  signals: ResearchSignal[] = getDisplaySignals()
): Map<Domain, ResearchSignal[]> {
  const map = new Map<Domain, ResearchSignal[]>(
    ALL_DOMAINS.map((d) => [d, []])
  );
  for (const signal of signals) {
    map.get(signal.primary_domain)?.push(signal);
  }
  return map;
}

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isValidDomain(value: unknown): value is Domain {
  return (ALL_DOMAINS as string[]).includes(value as string);
}

export function isValidSignalType(value: unknown): value is SignalType {
  const types: SignalType[] = [
    "paper", "news", "funding", "patent", "launch", "release", "lab_publication",
  ];
  return types.includes(value as SignalType);
}

export function isValidRegion(value: unknown): value is Region {
  return (ALL_REGIONS as string[]).includes(value as string);
}

export function isValidConfidence(value: unknown): value is SignalConfidence {
  return ["verified", "probable", "preliminary"].includes(value as string);
}

/**
 * Validates a ResearchSignal object against the schema.
 * Returns an array of error strings. Empty array = valid.
 */
export function validateSignal(signal: Partial<ResearchSignal>): string[] {
  const errors: string[] = [];

  if (!signal.id || !/^[a-z0-9-]+-\d{4}-\d{2}$/.test(signal.id)) {
    errors.push(`id: must be kebab-case ending in -YYYY-MM (got "${signal.id}")`);
  }
  if (!signal.title || signal.title.length < 5 || signal.title.length > 200) {
    errors.push("title: required, 5–200 characters");
  }
  if (!signal.summary || signal.summary.length < 20 || signal.summary.length > 500) {
    errors.push("summary: required, 20–500 characters");
  }
  if (!signal.source_url || !/^https?:\/\//.test(signal.source_url)) {
    errors.push("source_url: required, must be a full https:// URL");
  }
  if (!signal.primary_domain || !isValidDomain(signal.primary_domain)) {
    errors.push(`primary_domain: must be one of ${ALL_DOMAINS.join(", ")}`);
  }
  if (!signal.signal_type || !isValidSignalType(signal.signal_type)) {
    errors.push("signal_type: invalid value");
  }
  if (!signal.region || !isValidRegion(signal.region)) {
    errors.push(`region: must be one of ${ALL_REGIONS.join(", ")}`);
  }
  if (!signal.confidence || !isValidConfidence(signal.confidence)) {
    errors.push("confidence: must be verified | probable | preliminary");
  }
  if (typeof signal.curator_score !== "number" || signal.curator_score < 1 || signal.curator_score > 10) {
    errors.push("curator_score: must be integer 1–10");
  }
  if (!signal.country_code || signal.country_code.length !== 2) {
    errors.push("country_code: must be 2-character ISO 3166-1 alpha-2");
  }
  if (!signal.city) {
    errors.push("city: required");
  }
  if (!signal.country_name) {
    errors.push("country_name: required");
  }
  if (typeof signal.lat !== "number" || signal.lat < -90 || signal.lat > 90) {
    errors.push("lat: must be number -90 to 90");
  }
  if (typeof signal.lng !== "number" || signal.lng < -180 || signal.lng > 180) {
    errors.push("lng: must be number -180 to 180");
  }
  if (!signal.source_name) {
    errors.push("source_name: required");
  }
  if (![1, 2, 3].includes(signal.source_tier as number)) {
    errors.push("source_tier: must be 1, 2, or 3");
  }

  return errors;
}

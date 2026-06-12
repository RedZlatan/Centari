import rawSignalData from "@/data/signals.json";
import rawTrendsData from "@/data/top-trends.json";

// ─── Types ────────────────────────────────────────────────────────────────────

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

export type LocationConfidence = "high" | "medium" | "low";
export type SourceTier = 1 | 2 | 3;

export interface Signal {
  id: string;
  published_at: string;
  ingested_at: string;
  title: string;
  summary: string;
  url: string;
  primary_domain: Domain;
  secondary_domains: Domain[];
  signal_type: SignalType;
  tags: string[];
  location_label: string;
  lat: number;
  lng: number;
  location_confidence: LocationConfidence;
  curator_score: number;
  source_name: string;
  source_tier: SourceTier;
}

export interface TrendItem {
  rank: number;
  headline: string;
  explanation: string;
  primary_domain: Domain;
  signal_ids: string[];
}

export interface TopTrendsData {
  updated_at: string;
  trends: TrendItem[];
}

export interface SignalDataset {
  updated_at: string;
  signals: Signal[];
}

// ─── Domain config ────────────────────────────────────────────────────────────

export const DOMAIN_COLORS: Record<Domain, string> = {
  ai:        "#4A90D9", // electric blue
  xr:        "#9B5DE5", // purple
  robotics:  "#00C86E", // emerald green
  quantum:   "#E056A0", // magenta
  space:     "#00D4FF", // cyan
  energy:    "#FFB347", // amber
  materials: "#FF6B6B", // coral
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
  "ai",
  "xr",
  "robotics",
  "quantum",
  "space",
  "energy",
  "materials",
];

// ─── Data access ──────────────────────────────────────────────────────────────

export function getAllSignals(): Signal[] {
  return (rawSignalData as SignalDataset).signals;
}

export function getDisplaySignals(): Signal[] {
  return getAllSignals().filter((s) => s.curator_score >= 4);
}

export function getSignalById(id: string): Signal | undefined {
  return getAllSignals().find((s) => s.id === id);
}

export function getTopTrends(): TopTrendsData {
  return rawTrendsData as TopTrendsData;
}

export function getDatasetUpdatedAt(): string {
  return (rawSignalData as SignalDataset).updated_at;
}

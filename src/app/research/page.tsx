"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { geoEqualEarth, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldAtlas from "world-atlas/countries-110m.json";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import styles from "./research.module.css";
import dynamic from "next/dynamic";
import type { Mission, GlobeSignal, GlobeMapProps } from "@/components/research/GlobeMap";

const GlobeMapDynamic = dynamic<GlobeMapProps>(
  () => import("@/components/research/GlobeMap"),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "#3d5c45", fontSize: "11px", letterSpacing: "0.06em" }}>
        Initialising globe…
      </div>
    ),
  },
);

const SATELLITE_INFO: Record<Mission, { name: string; fullName: string; color: string }> = {
  iss:    { name: "ISS",    fullName: "International Space Station", color: "#60a5fa" },
  hubble: { name: "Hubble", fullName: "Hubble Space Telescope",      color: "#fbbf24" },
  jwst:   { name: "JWST",   fullName: "James Webb Space Telescope",  color: "#a78bfa" },
};

// Natural Earth via world-atlas keeps the map geodata-based without a heavy map runtime.
type SignalCategory =
  | "AI"
  | "Spatial / XR"
  | "Robotics"
  | "Quantum"
  | "Space"
  | "Energy"
  | "Materials"
  | "Nano"
  | "All";

type ResearchCategory = Exclude<SignalCategory, "All">;

// Fields present on static geographic signals; API signals extend with optional live fields.
type Signal = {
  id: string;
  title: string;
  location: string;
  region: string;
  category: ResearchCategory;
  x: number;
  y: number;
  intensity: number;
  signal_strength?: number;
  trend_score?: number;
  momentum: string;
  summary: string;
  // Live API fields (absent on static signals)
  source_name?: string;
  source_url?: string;
  published_at?: string;
  curator_score?: number;
  tags?: string[];
};

type SignalCluster = {
  id: string;
  label: string;
  x: number;
  y: number;
  signalIds: string[];
};

type ResearchMapPayload = {
  categories: SignalCategory[];
  signals: Signal[];
  clusters: SignalCluster[];
};

type ApiLoadStatus = "loading" | "ready" | "fallback";

type ApiRecord = Record<string, unknown>;

type WorldAtlasObjects = {
  countries: GeometryCollection;
};

const worldTopology = worldAtlas as unknown as Topology<WorldAtlasObjects>;
const worldFeature = feature(worldTopology, worldTopology.objects.countries) as unknown as FeatureCollection;
const worldBorders = mesh(
  worldTopology,
  worldTopology.objects.countries,
  (a, b) => a !== b,
) as unknown as Geometry;

const mapProjection = geoEqualEarth().fitSize([1000, 520], { type: "Sphere" });
const mapPath = geoPath(mapProjection);
const countryPaths = worldFeature.features
  .map((country) => mapPath(country))
  .filter((path): path is string => Boolean(path));
const borderPath = mapPath(worldBorders);
const graticuleLines = [
  "M80 95H920",
  "M80 175H920",
  "M80 255H920",
  "M80 335H920",
  "M80 415H920",
  "M170 54V468",
  "M330 54V468",
  "M500 54V468",
  "M670 54V468",
  "M830 54V468",
];

const researchMapData: ResearchMapPayload = {
  categories: [
    "All",
    "AI",
    "Spatial / XR",
    "Robotics",
    "Quantum",
    "Space",
    "Energy",
    "Materials",
    "Nano",
  ],
  signals: [
  {
    id: "SIG-001",
    title: "Arctic logistics corridors",
    location: "Tromso / Kiruna",
    region: "Nordics",
    category: "Energy",
    x: 51,
    y: 20,
    intensity: 94,
    momentum: "+18%",
    summary: "Dual-use routing, winterised depots, and resilient northern mobility planning are converging.",
  },
  {
    id: "SIG-002",
    title: "Synthetic readiness campuses",
    location: "London / Bristol",
    region: "UK",
    category: "AI",
    x: 46,
    y: 35,
    intensity: 88,
    momentum: "+12%",
    summary: "Training buyers are moving from simulator procurement toward always-on scenario campuses.",
  },
  {
    id: "SIG-003",
    title: "Baltic sensor fusion",
    location: "Tallinn / Riga",
    region: "Baltics",
    category: "AI",
    x: 54,
    y: 32,
    intensity: 91,
    momentum: "+22%",
    summary: "Maritime, air, and border data pipelines are becoming shared operational infrastructure.",
  },
  {
    id: "SIG-004",
    title: "Port automation doctrine",
    location: "Rotterdam",
    region: "Western Europe",
    category: "Robotics",
    x: 48,
    y: 39,
    intensity: 76,
    momentum: "+7%",
    summary: "Commercial autonomy programs are setting expectations for military logistics observability.",
  },
  {
    id: "SIG-005",
    title: "Alpine disaster rehearsal",
    location: "Zurich / Innsbruck",
    region: "Central Europe",
    category: "Energy",
    x: 50,
    y: 43,
    intensity: 72,
    momentum: "+9%",
    summary: "Flood, fire, and landslide planning is pulling simulation tooling into civil protection budgets.",
  },
  {
    id: "SIG-006",
    title: "Mediterranean maritime pressure",
    location: "Athens / Malta",
    region: "Mediterranean",
    category: "AI",
    x: 53,
    y: 51,
    intensity: 84,
    momentum: "+14%",
    summary: "Maritime domain awareness requirements are expanding across migration, energy, and grey-zone risk.",
  },
  {
    id: "SIG-007",
    title: "Sahara edge energy bases",
    location: "Morocco / Algeria",
    region: "North Africa",
    category: "Energy",
    x: 47,
    y: 57,
    intensity: 69,
    momentum: "+8%",
    summary: "Remote energy and logistics hubs are becoming testbeds for hardened field operations.",
  },
  {
    id: "SIG-008",
    title: "Sahel coordination cells",
    location: "Niamey / Bamako",
    region: "West Africa",
    category: "AI",
    x: 47,
    y: 64,
    intensity: 81,
    momentum: "+16%",
    summary: "Coalition planning needs common operating pictures that can survive intermittent connectivity.",
  },
  {
    id: "SIG-009",
    title: "Gulf autonomous inspection",
    location: "Doha / Abu Dhabi",
    region: "Gulf",
    category: "Robotics",
    x: 61,
    y: 57,
    intensity: 73,
    momentum: "+10%",
    summary: "Critical infrastructure operators are adopting robotic inspection as a resilience layer.",
  },
  {
    id: "SIG-010",
    title: "Levant urban response models",
    location: "Amman / Beirut",
    region: "Levant",
    category: "Spatial / XR",
    x: 57,
    y: 53,
    intensity: 67,
    momentum: "+6%",
    summary: "Urban crisis rehearsal is shifting from static tabletop exercises into spatial mission environments.",
  },
  {
    id: "SIG-011",
    title: "Black Sea logistics stress",
    location: "Constanta / Odesa",
    region: "Black Sea",
    category: "Energy",
    x: 56,
    y: 44,
    intensity: 89,
    momentum: "+20%",
    summary: "Port disruption and inland freight constraints are driving demand for adaptive logistics planning.",
  },
  {
    id: "SIG-012",
    title: "Caucasus corridor monitoring",
    location: "Tbilisi / Baku",
    region: "Caucasus",
    category: "AI",
    x: 60,
    y: 47,
    intensity: 78,
    momentum: "+11%",
    summary: "Energy corridors and border risk are increasing appetite for persistent geospatial monitoring.",
  },
  {
    id: "SIG-013",
    title: "Indian Ocean basing",
    location: "Mumbai / Colombo",
    region: "Indian Ocean",
    category: "Energy",
    x: 69,
    y: 62,
    intensity: 74,
    momentum: "+8%",
    summary: "Naval logistics and humanitarian response planning are converging around flexible basing networks.",
  },
  {
    id: "SIG-014",
    title: "Himalayan climate security",
    location: "Kathmandu / Delhi",
    region: "South Asia",
    category: "Energy",
    x: 70,
    y: 54,
    intensity: 83,
    momentum: "+17%",
    summary: "Water, altitude, and border conditions are creating new requirements for terrain-aware planning.",
  },
  {
    id: "SIG-015",
    title: "Southeast Asia maritime autonomy",
    location: "Singapore / Jakarta",
    region: "Southeast Asia",
    category: "Robotics",
    x: 77,
    y: 68,
    intensity: 87,
    momentum: "+19%",
    summary: "Autonomous surface and inspection systems are moving from trials toward operational doctrine.",
  },
  {
    id: "SIG-016",
    title: "Taiwan resilience rehearsal",
    location: "Taipei",
    region: "East Asia",
    category: "AI",
    x: 82,
    y: 53,
    intensity: 96,
    momentum: "+24%",
    summary: "Civil, industrial, and defence readiness exercises are becoming integrated simulation programs.",
  },
  {
    id: "SIG-017",
    title: "Korean peninsula C2 upgrades",
    location: "Seoul",
    region: "East Asia",
    category: "AI",
    x: 82,
    y: 45,
    intensity: 86,
    momentum: "+13%",
    summary: "Command systems are being modernised around faster sensor-to-decision workflows.",
  },
  {
    id: "SIG-018",
    title: "Japan disaster robotics",
    location: "Tokyo / Sendai",
    region: "Japan",
    category: "Robotics",
    x: 86,
    y: 47,
    intensity: 71,
    momentum: "+7%",
    summary: "Disaster robotics and miniaturised sensors are creating operational lessons for hazardous-site autonomy.",
  },
  {
    id: "SIG-019",
    title: "Northern Australia range expansion",
    location: "Darwin",
    region: "Australia",
    category: "Spatial / XR",
    x: 80,
    y: 78,
    intensity: 79,
    momentum: "+10%",
    summary: "Large-scale ranges are becoming coalition test environments for distributed operations.",
  },
  {
    id: "SIG-020",
    title: "Pacific island climate logistics",
    location: "Suva / Guam",
    region: "Pacific",
    category: "Space",
    x: 90,
    y: 70,
    intensity: 75,
    momentum: "+15%",
    summary: "Satellite visibility, climate response, and strategic access needs are reshaping island logistics planning.",
  },
  {
    id: "SIG-021",
    title: "West Coast wildfire command",
    location: "California",
    region: "North America",
    category: "Energy",
    x: 16,
    y: 48,
    intensity: 82,
    momentum: "+12%",
    summary: "Wildfire operations are pushing integrated aerial, ground, and infrastructure decision support.",
  },
  {
    id: "SIG-022",
    title: "Arctic Alaska infrastructure",
    location: "Anchorage / North Slope",
    region: "Arctic",
    category: "Space",
    x: 12,
    y: 24,
    intensity: 77,
    momentum: "+9%",
    summary: "Cold-region logistics, sensing coverage, and polar communications are returning as strategic planning priorities.",
  },
  {
    id: "SIG-023",
    title: "Great Lakes industrial resilience",
    location: "Detroit / Toronto",
    region: "Great Lakes",
    category: "Materials",
    x: 26,
    y: 42,
    intensity: 70,
    momentum: "+6%",
    summary: "Advanced materials and manufacturing resilience programs need simulations tied to physical capacity.",
  },
  {
    id: "SIG-024",
    title: "East Coast cyber-physical exercises",
    location: "Washington / Boston",
    region: "North America",
    category: "Quantum",
    x: 31,
    y: 45,
    intensity: 80,
    momentum: "+11%",
    summary: "Cyber-physical exercises are beginning to model quantum-resistant networks and infrastructure risk.",
  },
  {
    id: "SIG-025",
    title: "Amazon basin sensor gaps",
    location: "Manaus",
    region: "South America",
    category: "Energy",
    x: 34,
    y: 68,
    intensity: 66,
    momentum: "+5%",
    summary: "Environmental monitoring gaps are limiting response planning across remote terrain.",
  },
  {
    id: "SIG-026",
    title: "Andes high-altitude logistics",
    location: "Lima / La Paz",
    region: "Andes",
    category: "Energy",
    x: 30,
    y: 75,
    intensity: 68,
    momentum: "+6%",
    summary: "Altitude, roads, and climate risk are creating specialised requirements for logistics modelling.",
  },
  {
    id: "SIG-027",
    title: "South Atlantic maritime watch",
    location: "Cape Town / Buenos Aires",
    region: "South Atlantic",
    category: "Spatial / XR",
    x: 47,
    y: 82,
    intensity: 64,
    momentum: "+4%",
    summary: "Maritime awareness programs are expanding into spatial operating pictures for shipping and infrastructure.",
  },
  {
    id: "SIG-028",
    title: "Horn of Africa corridor risk",
    location: "Djibouti / Addis Ababa",
    region: "East Africa",
    category: "AI",
    x: 58,
    y: 65,
    intensity: 85,
    momentum: "+18%",
    summary: "Port, rail, and regional security dynamics are increasing demand for shared risk models.",
  },
  {
    id: "SIG-029",
    title: "Quantum-resistant networks",
    location: "Global / Allied networks",
    region: "Global",
    category: "Quantum",
    x: 64,
    y: 42,
    intensity: 85,
    momentum: "+21%",
    summary: "Mission networks are beginning to price post-quantum migration into resilience planning.",
  },
  {
    id: "SIG-030",
    title: "XR mission rehearsal platforms",
    location: "Global / Training commands",
    region: "Global",
    category: "Spatial / XR",
    x: 58,
    y: 36,
    intensity: 84,
    momentum: "+18%",
    summary: "Spatial rehearsal platforms are moving from demonstration environments into readiness workflows.",
  },
  {
    id: "SIG-031",
    title: "Nanomaterial defence applications",
    location: "Global / Materials labs",
    region: "Global",
    category: "Nano",
    x: 73,
    y: 46,
    intensity: 83,
    momentum: "+14%",
    summary: "Materials research is entering operational planning through sensors, coatings, and lightweight protection.",
  },
  ],
  clusters: [
    { id: "north-america", label: "North America", x: 18, y: 38, signalIds: ["SIG-021", "SIG-022", "SIG-023", "SIG-024"] },
    { id: "south-america", label: "South America", x: 32, y: 70, signalIds: ["SIG-025", "SIG-026"] },
    { id: "europe", label: "Europe", x: 51, y: 34, signalIds: ["SIG-001", "SIG-002", "SIG-003", "SIG-004", "SIG-005", "SIG-011"] },
    { id: "africa", label: "Africa", x: 51, y: 62, signalIds: ["SIG-007", "SIG-008", "SIG-027", "SIG-028"] },
    { id: "middle-east", label: "Middle East", x: 60, y: 54, signalIds: ["SIG-006", "SIG-009", "SIG-010", "SIG-012"] },
    { id: "south-asia", label: "South Asia", x: 70, y: 58, signalIds: ["SIG-013", "SIG-014"] },
    { id: "east-asia", label: "East Asia", x: 82, y: 47, signalIds: ["SIG-016", "SIG-017", "SIG-018", "SIG-029", "SIG-031"] },
    { id: "pacific", label: "Pacific", x: 84, y: 72, signalIds: ["SIG-015", "SIG-019", "SIG-020"] },
    { id: "global-emerging", label: "Global emerging", x: 62, y: 38, signalIds: ["SIG-030"] },
  ],
};

const categoryAccent: Record<ResearchCategory, string> = {
  AI: "#c4a36f",
  "Spatial / XR": "#b79be0",
  Robotics: "#8fb6a2",
  Quantum: "#88bfe0",
  Space: "#9aa8c8",
  Energy: "#d0ad70",
  Materials: "#c7bca7",
  Nano: "#78c4a0",
};

const priorityTrendIds = [
  "SIG-016",
  "SIG-001",
  "SIG-003",
  "SIG-011",
  "SIG-015",
  "SIG-029",
  "SIG-030",
  "SIG-031",
  "SIG-020",
  "SIG-023",
];

// Maps public filter label → API domain key
const CATEGORY_TO_DOMAIN: Partial<Record<SignalCategory, string>> = {
  "AI": "ai",
  "Spatial / XR": "xr",
  "Robotics": "robotics",
  "Quantum": "quantum",
  "Space": "space",
  "Energy": "energy",
  "Materials": "materials",
};

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPayloadArray(payload: unknown, keys: string[]) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function getStringArray(record: ApiRecord, keys: string[]): string[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  }
  return [];
}

function getString(record: ApiRecord, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return fallback;
}

function getNumber(record: ApiRecord, keys: string[], fallback: number) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
}

function normalizeCategory(value: string, fallback: ResearchCategory): ResearchCategory {
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, ResearchCategory> = {
    ai: "AI",
    autonomy: "Robotics",
    climate: "Energy",
    energy: "Energy",
    infrastructure: "Energy",
    materials: "Materials",
    nano: "Nano",
    quantum: "Quantum",
    robotics: "Robotics",
    security: "AI",
    space: "Space",
    spatial: "Spatial / XR",
    "spatial / xr": "Spatial / XR",
    "spatial (xr)": "Spatial / XR",
    training: "AI",
    xr: "Spatial / XR",
  };

  return aliases[normalized] ?? fallback;
}

function normalizeSignals(payload: unknown, keys: string[], fallbackSignals: Signal[]): Signal[] {
  return getPayloadArray(payload, keys)
    .map((item, index) => {
      if (!isRecord(item)) {
        return null;
      }

      const fallback = fallbackSignals[index % fallbackSignals.length] ?? researchMapData.signals[0];
      const category = normalizeCategory(
        getString(item, ["category", "research_lane", "lane", "topic"], fallback.category),
        fallback.category,
      );

      const signal: Signal = {
        id:             getString(item, ["id", "signal_id", "slug"], fallback.id),
        title:          getString(item, ["title", "name", "signal_title"], fallback.title),
        location:       getString(item, ["location", "place", "market"], fallback.location),
        region:         getString(item, ["region", "geography", "area"], fallback.region),
        category,
        x:              getNumber(item, ["x", "map_x", "longitude_x"], fallback.x),
        y:              getNumber(item, ["y", "map_y", "latitude_y"], fallback.y),
        intensity:      getNumber(item, ["intensity", "signal_strength", "strength"], fallback.intensity),
        signal_strength: getNumber(item, ["signal_strength", "strength", "intensity"], fallback.intensity),
        trend_score:    getNumber(item, ["trend_score", "score", "priority"], getTrendScore(fallback)),
        momentum:       getString(item, ["momentum", "change", "delta"], fallback.momentum),
        summary:        getString(item, ["summary", "description", "body"], fallback.summary),
        // Live API fields — only present on Supabase-sourced signals
        source_name:    getString(item, ["source_name"], ""),
        source_url:     getString(item, ["source_url"], ""),
        published_at:   getString(item, ["published_at"], ""),
        curator_score:  getNumber(item, ["curator_score"], 0),
        tags:           getStringArray(item, ["tags"]),
      };

      return signal;
    })
    .filter((signal): signal is Signal => Boolean(signal));
}

function getSignalSize(intensity: number) {
  return 9 + Math.round((intensity - 60) / 6);
}

function getSignalStrength(signal: Signal) {
  return signal.signal_strength ?? signal.intensity;
}

// trend_score = editorial_score + recency_weight
// editorial_score: curator_score × 10  (0-100)
// recency_weight:  up to 20 pts for signals published today, 0 at 7+ days old
function getTrendScore(signal: Signal): number {
  if (signal.curator_score && signal.curator_score > 0) {
    const editorial = signal.curator_score * 10;
    const recency = signal.published_at
      ? Math.max(
          0,
          Math.round(
            ((7 - Math.min((Date.now() - new Date(signal.published_at).getTime()) / 86_400_000, 7)) / 7) * 20,
          ),
        )
      : 0;
    return Math.min(100, editorial + recency);
  }
  const momentum = Number.parseInt(signal.momentum.replace("+", "").replace("%", ""), 10);
  return signal.trend_score ?? Math.min(100, Math.round(signal.intensity * 0.82 + (Number.isNaN(momentum) ? 0 : momentum)));
}

function getSignalTier(signal: Signal, count = 1) {
  const score = getTrendScore(signal);
  if (count >= 4 || score >= 92) {
    return "trendCluster";
  }

  if (getSignalStrength(signal) >= 82 || score >= 86) {
    return "strongSignal";
  }

  return "normalSignal";
}

export default function ResearchPage() {
  // mapData always holds the static geographic signals — the map hotspots never disappear.
  // API signals live in apiSignals, separate from the map geometry.
  const [mapData, setMapData] = useState<ResearchMapPayload>(researchMapData);
  const [apiSignals, setApiSignals] = useState<Signal[] | null>(null);
  const [apiTrends, setApiTrends] = useState<Signal[] | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiLoadStatus>("loading");
  const [apiError, setApiError] = useState<string | null>(null);
  const { categories, signals, clusters } = mapData;
  const [activeCategory, setActiveCategory] = useState<SignalCategory>("All");
  const [selectedId, setSelectedId] = useState(signals[0].id);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadResearchMapData() {
      setApiStatus("loading");
      setApiError(null);

      try {
        const [signalsResponse, trendsResponse] = await Promise.all([
          fetch("/api/research/signals", { cache: "no-store" }),
          fetch("/api/research/trends", { cache: "no-store" }),
        ]);

        if (!signalsResponse.ok || !trendsResponse.ok) {
          throw new Error(`Research API returned ${signalsResponse.status}/${trendsResponse.status}`);
        }

        const [signalsPayload, trendsPayload] = await Promise.all([
          signalsResponse.json() as Promise<unknown>,
          trendsResponse.json() as Promise<unknown>,
        ]);

        const liveSignals = normalizeSignals(signalsPayload, ["signals", "data", "items"], researchMapData.signals);
        const liveTrends  = normalizeSignals(trendsPayload,  ["trends",  "signals", "data", "items"], liveSignals);

        if (liveSignals.length === 0) {
          throw new Error("Research API returned no signals");
        }

        if (cancelled) return;

        // Keep static signals on the map — do NOT replace mapData.signals.
        // Static signals are geographically placed; API signals are arXiv papers with no location.
        setMapData(researchMapData);
        setApiSignals(liveSignals);
        setApiTrends(liveTrends.length > 0 ? liveTrends : null);
        setActiveCategory("All");
        // Pre-select the highest-scoring live signal so the panel opens on something meaningful.
        const bestSignal = [...liveSignals].sort((a, b) => getTrendScore(b) - getTrendScore(a))[0];
        setSelectedId(bestSignal?.id ?? researchMapData.signals[0].id);
        setApiStatus("ready");
      } catch (error) {
        if (cancelled) return;

        setMapData(researchMapData);
        setApiSignals(null);
        setApiTrends(null);
        setActiveCategory("All");
        setSelectedId(researchMapData.signals[0].id);
        setApiStatus("fallback");
        setApiError(error instanceof Error ? error.message : "Research API unavailable");
      }
    }

    void loadResearchMapData();

    return () => {
      cancelled = true;
    };
  }, []);

  // filteredSignals drives the map hotspots — always uses static geographic signals.
  // Dep array includes `signals` so category changes after API load re-filter correctly.
  const filteredSignals = useMemo(
    () =>
      activeCategory === "All"
        ? signals
        : signals.filter((signal) => signal.category === activeCategory),
    [activeCategory, signals],
  );

  // Convert static map signals' SVG %-coordinates to lat/lng for the globe.
  // mapProjection.invert([x_px, y_px]) → [longitude, latitude]
  const globeSignals = useMemo<GlobeSignal[]>(
    () =>
      filteredSignals.flatMap((sig): GlobeSignal[] => {
        const coords = mapProjection.invert?.([sig.x * 10, sig.y * 5.2]) ?? null;
        if (!coords || !isFinite(coords[0]) || !isFinite(coords[1])) return [];
        return [{ id: sig.id, lat: coords[1], lng: coords[0], category: sig.category, title: sig.title, intensity: sig.intensity }];
      }),
    [filteredSignals],
  );

  // NASA signals for the active satellite mission panel
  const missionSignals = useMemo(
    () =>
      activeMission
        ? (apiSignals ?? [])
            .filter((s) => s.tags?.includes(activeMission))
            .sort((a, b) => (b.curator_score ?? 0) - (a.curator_score ?? 0))
            .slice(0, 5)
        : [],
    [activeMission, apiSignals],
  );

  // selectedSignal: prefer live API signals (have editorial scores/sources), fall back to static.
  const selectedSignal =
    apiSignals?.find((s) => s.id === selectedId) ??
    apiTrends?.find((s) => s.id === selectedId) ??
    filteredSignals.find((s) => s.id === selectedId) ??
    apiTrends?.[0] ??
    filteredSignals[0] ??
    signals[0];

  // Top trends: sort live signals by trend_score (editorial + recency) when API is ready.
  const topTrends = useMemo(() => {
    if (apiSignals && apiSignals.length > 0) {
      return [...apiSignals].sort((a, b) => getTrendScore(b) - getTrendScore(a)).slice(0, 10);
    }
    if (apiTrends && apiTrends.length > 0) {
      return apiTrends.slice(0, 10);
    }
    return priorityTrendIds
      .map((id) => signals.find((signal) => signal.id === id))
      .filter((signal): signal is Signal => Boolean(signal));
  }, [apiSignals, apiTrends, signals]);

  const filteredSignalIds = useMemo(
    () => new Set(filteredSignals.map((signal) => signal.id)),
    [filteredSignals],
  );

  const visibleClusters = useMemo(
    () =>
      clusters
        .map((cluster) => ({
          ...cluster,
          signals: cluster.signalIds
            .map((id) => signals.find((signal) => signal.id === id))
            .filter((signal): signal is Signal => Boolean(signal))
            .filter((signal) => filteredSignalIds.has(signal.id)),
        }))
        .filter((cluster) => cluster.signals.length > 0),
    [clusters, filteredSignalIds, signals],
  );

  function selectCategory(category: SignalCategory) {
    setActiveCategory(category);
    // When live signals exist, switch the panel to the best-scoring signal for this domain.
    if (apiSignals && apiSignals.length > 0) {
      const domain = CATEGORY_TO_DOMAIN[category];
      const match = domain
        ? [...apiSignals]
            .filter((s) => s.category === category)
            .sort((a, b) => getTrendScore(b) - getTrendScore(a))[0]
        : [...apiSignals].sort((a, b) => getTrendScore(b) - getTrendScore(a))[0];
      if (match) { setSelectedId(match.id); return; }
    }
    const nextSignal = category === "All" ? signals[0] : signals.find((signal) => signal.category === category);
    if (nextSignal) setSelectedId(nextSignal.id);
  }

  // Per-category counts shown on filter chips — uses static signals for map consistency.
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<SignalCategory, number>> = { All: signals.length };
    for (const s of signals) counts[s.category] = (counts[s.category] ?? 0) + 1;
    return counts;
  }, [signals]);

  const isApiSignal = (selectedSignal?.curator_score ?? 0) > 0;

  return (
    <>
      <Header />
      <main className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>Centari Research Observatory</p>
            <h1>Research Map</h1>
            <p>
              A live working surface for public research signals across AI, spatial systems,
              robotics, quantum, space, energy, materials, and nano.
            </p>
          </div>
          <div className={styles.heroMetrics} aria-label="Research map metrics">
            <div>
              <span>{apiSignals?.length ?? signals.length}</span>
              <p>Signals indexed</p>
            </div>
            <div>
              <span>{categories.length - 1}</span>
              <p>Research lanes</p>
            </div>
            <div>
              <span>{topTrends.length}</span>
              <p>Priority trends</p>
            </div>
          </div>
        </section>

        <section className={styles.workspace} aria-label="Research map workspace">
          <div className={styles.mapColumn}>
            <div className={styles.toolbar}>
              <div>
                <p className={styles.kicker}>Signal calibration</p>
                <h2>Global operating picture</h2>
              </div>
              <div className={styles.filters} aria-label="Category filters">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={category === activeCategory ? styles.filterActive : ""}
                    onClick={() => selectCategory(category)}
                  >
                    <span />
                    <b>{category}</b>
                    {categoryCounts[category] !== undefined && (
                      <em className={styles.filterCount}>{categoryCounts[category]}</em>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.mapSurface}>
              <div className={styles.mapStatus} aria-hidden="true">
                <span>Interactive 3D Globe · drag to rotate · scroll to zoom · click satellites for NASA feed</span>
                <span>{globeSignals.length} signals · 3 satellites</span>
              </div>
              <div className={styles.dataStatus} data-status={apiStatus} title={apiError ?? undefined}>
                {apiStatus === "loading" ? "Loading research feed" : null}
                {apiStatus === "fallback" ? "JSON fallback active" : null}
                {apiStatus === "ready" ? `API-backed · ${apiSignals?.length ?? 0} approved signals` : null}
              </div>
              <div style={{ position: "absolute", inset: 0, top: "2.5rem" }}>
                <GlobeMapDynamic
                  signals={globeSignals}
                  selectedId={selectedId}
                  onSignalClick={(id) => { setActiveMission(null); setSelectedId(id); }}
                  activeMission={activeMission}
                  onSatelliteClick={(mission) => setActiveMission((prev) => prev === mission ? null : mission)}
                />
              </div>
            </div>
          </div>

          <aside className={styles.sidePanel} aria-label="Research signal detail">
            {activeMission ? (
              <article className={styles.signalCard} aria-live="polite">
                <div className={styles.cardMeta}>
                  <span style={{ color: SATELLITE_INFO[activeMission].color }}>NASA</span>
                  <span>Space</span>
                  <span>{SATELLITE_INFO[activeMission].name}</span>
                </div>
                <h2>{SATELLITE_INFO[activeMission].fullName}</h2>
                <p style={{ marginBottom: "1rem", opacity: 0.7, fontSize: "0.8rem" }}>
                  Mission-specific research signals from NASA NTRS.
                  {missionSignals.length === 0 && " Run the NASA worker to populate this feed."}
                </p>
                {missionSignals.length > 0 ? (
                  <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {missionSignals.map((sig) => (
                      <li key={sig.id}>
                        <button
                          type="button"
                          style={{ background: "transparent", border: "none", textAlign: "left", cursor: "pointer", padding: 0, width: "100%" }}
                          onClick={() => { setSelectedId(sig.id); setActiveMission(null); }}
                        >
                          <strong style={{ display: "block", fontSize: "0.78rem", color: "#c8c8c0", lineHeight: 1.3 }}>{sig.title}</strong>
                          <em style={{ display: "block", fontSize: "0.7rem", opacity: 0.55, marginTop: "0.2rem" }}>
                            {sig.published_at ? new Date(sig.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                            {" · "}Score {sig.curator_score}/10
                          </em>
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : null}
                <button
                  type="button"
                  onClick={() => setActiveMission(null)}
                  style={{ marginTop: "1.25rem", fontSize: "0.72rem", opacity: 0.5, background: "transparent", border: "1px solid currentColor", padding: "0.3rem 0.75rem", cursor: "pointer", color: "inherit", letterSpacing: "0.04em" }}
                >
                  Close satellite panel
                </button>
              </article>
            ) : (
            <article className={styles.signalCard} aria-live="polite">
              <div className={styles.cardMeta}>
                <span>{selectedSignal.category}</span>
                {isApiSignal && selectedSignal.published_at ? (
                  <span>
                    {new Date(selectedSignal.published_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                ) : (
                  <span>{selectedSignal.momentum}</span>
                )}
                <span>{selectedSignal.id.slice(0, 14)}</span>
              </div>
              <h2>{selectedSignal.title}</h2>
              {isApiSignal && selectedSignal.source_name ? (
                <p className={styles.location}>
                  {selectedSignal.source_url ? (
                    <a
                      className={styles.sourceLink}
                      href={selectedSignal.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {selectedSignal.source_name} ↗
                    </a>
                  ) : (
                    selectedSignal.source_name
                  )}
                </p>
              ) : (
                <p className={styles.location}>
                  {selectedSignal.location} / {selectedSignal.region}
                </p>
              )}
              <p>{selectedSignal.summary}</p>
              <div className={styles.signalScores}>
                {isApiSignal && selectedSignal.curator_score ? (
                  <div className={styles.intensity}>
                    <span>Editorial score</span>
                    <strong>{selectedSignal.curator_score}/10</strong>
                    <i style={{ transform: `scaleX(${selectedSignal.curator_score / 10})` }} />
                  </div>
                ) : (
                  <div className={styles.intensity}>
                    <span>Signal strength</span>
                    <strong>{getSignalStrength(selectedSignal)}</strong>
                    <i style={{ transform: `scaleX(${getSignalStrength(selectedSignal) / 100})` }} />
                  </div>
                )}
                <div className={styles.intensity}>
                  <span>Trend score</span>
                  <strong>{getTrendScore(selectedSignal)}</strong>
                  <i style={{ transform: `scaleX(${getTrendScore(selectedSignal) / 100})` }} />
                </div>
              </div>
            </article>
            )}

            <div className={styles.trendsPanel}>
              <div className={styles.panelHeader}>
                <p className={styles.kicker}>
                  {apiSignals ? "Top signals · this week" : "Top 10 trends"}
                </p>
                <h2>{apiSignals ? "Top Signals This Week" : "Priority watchlist"}</h2>
              </div>
              <ol className={styles.trendList}>
                {topTrends.map((trend, index) => (
                  <li key={trend.id}>
                    <button
                      type="button"
                      className={trend.id === selectedSignal.id ? styles.trendActive : ""}
                      onClick={() => setSelectedId(trend.id)}
                      style={{ "--signal-color": categoryAccent[trend.category] } as CSSProperties}
                    >
                      <span className={styles.rank}>{String(index + 1).padStart(2, "0")}</span>
                      <span>
                        <strong>{trend.title}</strong>
                        <em>
                          {trend.published_at && (trend.curator_score ?? 0) > 0
                            ? `${new Date(trend.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · ${trend.category}`
                            : `${trend.region} / ${trend.category}`}
                        </em>
                      </span>
                      <b>{getTrendScore(trend)}</b>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </section>
      </main>
      <Footer />
    </>
  );
}

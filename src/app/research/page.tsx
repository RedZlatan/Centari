"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Billboard, Line, OrbitControls, Text } from "@react-three/drei";
import { geoEqualEarth } from "d3-geo";
import type { FeatureCollection, Position } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { BackSide, DoubleSide, MathUtils, Vector3 } from "three";
import type { Mesh } from "three";
import worldAtlas from "world-atlas/countries-110m.json";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import styles from "./research.module.css";

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

type Signal = {
  id: string;
  title: string;
  location: string;
  region: string;
  category: ResearchCategory;
  x: number;
  y: number;
  lon?: number;
  lat?: number;
  intensity: number;
  signal_strength?: number;
  trend_score?: number;
  momentum: string;
  summary: string;
  sourceName?: string;
  sourceUrl?: string;
  publishedAt?: string;
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

type Mission = "iss" | "hubble" | "jwst";

type SatelliteDefinition = {
  id: Mission;
  name: string;
  fullName: string;
  radius: number;
  inclination: number;
  ascendingNode: number;
  speed: number;
  color: string;
};

type SpaceTelemetry = {
  id: string;
  name: string;
  type: "deep-space" | "zombie";
  distance: string;
  status: string;
  dataRate: string;
  band: string;
  description?: string;
  rtlt?: string;
};

type WorldAtlasObjects = {
  countries: GeometryCollection;
};

const worldTopology = worldAtlas as unknown as Topology<WorldAtlasObjects>;
const worldFeature = feature(worldTopology, worldTopology.objects.countries) as unknown as FeatureCollection;

const mapProjection = geoEqualEarth().fitSize([1000, 520], { type: "Sphere" });
const globeRadius = 2.42;
const globeOutlineRadius = globeRadius + 0.014;
const markerRadius = globeRadius + 0.08;

const satellites: SatelliteDefinition[] = [
  {
    id: "iss",
    name: "ISS",
    fullName: "International Space Station",
    radius: globeRadius + 0.42,
    inclination: 51.6,
    ascendingNode: 0,
    speed: 0.45,
    color: "#60a5fa",
  },
  {
    id: "hubble",
    name: "Hubble",
    fullName: "Hubble Space Telescope",
    radius: globeRadius + 0.64,
    inclination: 28.5,
    ascendingNode: Math.PI * 0.75,
    speed: 0.3,
    color: "#fbbf24",
  },
  {
    id: "jwst",
    name: "JWST",
    fullName: "James Webb Space Telescope",
    radius: globeRadius + 1.08,
    inclination: 5,
    ascendingNode: Math.PI * 1.4,
    speed: 0.13,
    color: "#a78bfa",
  },
];

const missionKeywords: Record<Mission, string[]> = {
  iss: ["iss", "international space station"],
  hubble: ["hubble", "hubble space telescope"],
  jwst: ["jwst", "james webb", "james webb space telescope"],
};

type GlobeCluster = SignalCluster & {
  signals: Signal[];
};

type GlobePoint = {
  lat: number;
  lon: number;
};

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

const signalGlobePoints: Record<string, GlobePoint> = {
  "SIG-001": { lon: 20.4, lat: 68.4 },
  "SIG-002": { lon: -2.2, lat: 51.8 },
  "SIG-003": { lon: 24.6, lat: 57.8 },
  "SIG-004": { lon: 4.5, lat: 51.9 },
  "SIG-005": { lon: 10.2, lat: 47.0 },
  "SIG-006": { lon: 19.4, lat: 37.0 },
  "SIG-007": { lon: -3.4, lat: 31.0 },
  "SIG-008": { lon: -1.6, lat: 15.0 },
  "SIG-009": { lon: 53.5, lat: 25.0 },
  "SIG-010": { lon: 36.0, lat: 33.3 },
  "SIG-011": { lon: 30.9, lat: 45.2 },
  "SIG-012": { lon: 47.2, lat: 41.1 },
  "SIG-013": { lon: 76.0, lat: 13.0 },
  "SIG-014": { lon: 81.0, lat: 28.2 },
  "SIG-015": { lon: 106.0, lat: 0.2 },
  "SIG-016": { lon: 121.5, lat: 25.0 },
  "SIG-017": { lon: 127.0, lat: 37.5 },
  "SIG-018": { lon: 140.0, lat: 37.0 },
  "SIG-019": { lon: 131.0, lat: -12.4 },
  "SIG-020": { lon: 158.0, lat: 3.0 },
  "SIG-021": { lon: -120.2, lat: 37.2 },
  "SIG-022": { lon: -150.0, lat: 66.0 },
  "SIG-023": { lon: -81.0, lat: 43.0 },
  "SIG-024": { lon: -74.2, lat: 40.6 },
  "SIG-025": { lon: -60.0, lat: -3.1 },
  "SIG-026": { lon: -72.0, lat: -15.0 },
  "SIG-027": { lon: -28.0, lat: -42.0 },
  "SIG-028": { lon: 42.0, lat: 10.0 },
  "SIG-029": { lon: 17.0, lat: 48.0 },
  "SIG-030": { lon: 8.0, lat: 48.0 },
  "SIG-031": { lon: 121.0, lat: 31.0 },
};

const clusterGlobePoints: Record<string, GlobePoint> = {
  "north-america": { lon: -101.0, lat: 38.5 },
  "south-america": { lon: -60.0, lat: -18.0 },
  europe: { lon: 14.0, lat: 53.0 },
  africa: { lon: 20.0, lat: 3.0 },
  "middle-east": { lon: 44.0, lat: 30.0 },
  "south-asia": { lon: 77.0, lat: 21.0 },
  "east-asia": { lon: 124.0, lat: 34.0 },
  pacific: { lon: 145.0, lat: -10.0 },
  "global-emerging": { lon: 8.0, lat: 48.0 },
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

function getString(record: ApiRecord, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return fallback;
}

function getStringArray(record: ApiRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
        .map((item) => item.trim());
    }

    if (typeof value === "string" && value.trim()) {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
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

function getOptionalNumber(record: ApiRecord | null, keys: string[]) {
  if (!record) {
    return null;
  }

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

  return null;
}

function getNestedRecord(record: ApiRecord, key: string) {
  const value = record[key];
  return isRecord(value) ? value : null;
}

function normalizeScore(value: number, fallback: number) {
  const score = Number.isFinite(value) ? value : fallback;
  return score <= 1.5 ? Math.round(score * 100) : Math.round(score);
}

function getMomentumLabel(record: ApiRecord, fallback: string) {
  const textValue = getString(record, ["momentum", "change", "delta"], "");
  if (textValue) {
    return textValue;
  }

  const momentumScore = getOptionalNumber(record, ["momentum_score"]);
  if (momentumScore == null) {
    return fallback;
  }

  return `+${normalizeScore(momentumScore, 0)}%`;
}

function getLocationLabel(record: ApiRecord, locationRecord: ApiRecord | null, fallback: string) {
  const directLabel = getString(record, ["location", "place", "market", "location_label"], "");
  if (directLabel) {
    return directLabel;
  }

  if (!locationRecord) {
    return fallback;
  }

  const city = getString(locationRecord, ["city"], "");
  const country = getString(locationRecord, ["country_name", "country_code"], "");

  if (city && country) {
    return `${city} / ${country}`;
  }

  return city || country || fallback;
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
      const locationRecord = getNestedRecord(item, "location");
      const lon =
        getOptionalNumber(locationRecord, ["lng", "lon", "longitude"]) ??
        getOptionalNumber(item, ["lng", "lon", "longitude"]);
      const lat =
        getOptionalNumber(locationRecord, ["lat", "latitude"]) ??
        getOptionalNumber(item, ["lat", "latitude"]);
      const category = normalizeCategory(
        getString(item, ["category", "primary_category", "research_lane", "lane", "topic"], fallback.category),
        fallback.category,
      );
      const strength = normalizeScore(
        getNumber(item, ["signal_strength", "strength", "intensity"], fallback.intensity),
        fallback.intensity,
      );

      const signal: Signal = {
        id: getString(item, ["id", "signal_id", "slug"], fallback.id),
        title: getString(item, ["title", "name", "signal_title"], fallback.title),
        location: getLocationLabel(item, locationRecord, fallback.location),
        region: getString(item, ["region", "geography", "area"], getString(locationRecord ?? {}, ["region"], fallback.region)),
        category,
        x: getNumber(item, ["x", "map_x", "longitude_x"], fallback.x),
        y: getNumber(item, ["y", "map_y", "latitude_y"], fallback.y),
        lon: lon ?? undefined,
        lat: lat ?? undefined,
        intensity: strength,
        signal_strength: strength,
        trend_score: normalizeScore(getNumber(item, ["trend_score", "score", "priority"], getTrendScore(fallback)), getTrendScore(fallback)),
        momentum: getMomentumLabel(item, fallback.momentum),
        summary: getString(item, ["summary", "description", "body"], fallback.summary),
        sourceName: getString(item, ["source_name", "source"], ""),
        sourceUrl: getString(item, ["source_url", "url", "href"], ""),
        publishedAt: getString(item, ["published_at", "date"], ""),
        tags: getStringArray(item, ["tags", "missions", "mission"]),
      };

      return signal;
    })
    .filter((signal): signal is Signal => Boolean(signal));
}

function getSignalStrength(signal: Signal) {
  return signal.signal_strength ?? signal.intensity;
}

function getTrendScore(signal: Signal) {
  const momentum = Number.parseInt(signal.momentum.replace("+", "").replace("%", ""), 10);
  return signal.trend_score ?? Math.min(100, Math.round(signal.intensity * 0.82 + (Number.isNaN(momentum) ? 0 : momentum)));
}

function getSignalMissions(signal: Signal) {
  const text = `${signal.title} ${signal.summary} ${signal.sourceName ?? ""} ${(signal.tags ?? []).join(" ")}`.toLowerCase();

  return satellites
    .filter((satellite) => missionKeywords[satellite.id].some((keyword) => text.includes(keyword)))
    .map((satellite) => satellite.id);
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

function projectedPointToLonLat(x: number, y: number): GlobePoint {
  const inverted = mapProjection.invert?.([x * 10, y * 5.2]);

  if (inverted) {
    return {
      lon: inverted[0],
      lat: inverted[1],
    };
  }

  return {
    lon: x * 3.6 - 180,
    lat: 90 - y * 1.8,
  };
}

function getSignalGlobePoint(signal: Signal): GlobePoint {
  if (typeof signal.lon === "number" && typeof signal.lat === "number") {
    return { lon: signal.lon, lat: signal.lat };
  }

  return signalGlobePoints[signal.id] ?? projectedPointToLonLat(signal.x, signal.y);
}

function buildApiClusters(signals: Signal[]): SignalCluster[] {
  return signals.map((signal) => ({
    id: `cluster-${signal.id}`,
    label: signal.region || signal.location,
    x: signal.x,
    y: signal.y,
    signalIds: [signal.id],
  }));
}

function getClusterGlobePoint(cluster: GlobeCluster): GlobePoint {
  if (cluster.signals.length === 1) {
    return getSignalGlobePoint(cluster.signals[0]);
  }

  return clusterGlobePoints[cluster.id] ?? projectedPointToLonLat(cluster.x, cluster.y);
}

function lonLatToVector3(lon: number, lat: number, radius = globeRadius) {
  const phi = MathUtils.degToRad(90 - lat);
  const theta = MathUtils.degToRad(lon + 180);

  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function ringToPoints(ring: Position[], radius = globeOutlineRadius) {
  return ring
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat))
    .map(([lon, lat]) => lonLatToVector3(lon, lat, radius));
}

function getWorldRings() {
  return worldFeature.features.flatMap((country) => {
    const { geometry } = country;

    if (!geometry) {
      return [];
    }

    if (geometry.type === "Polygon") {
      return geometry.coordinates.map((ring) => ringToPoints(ring)).filter((ring) => ring.length > 2);
    }

    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates
        .flatMap((polygon) => polygon.map((ring) => ringToPoints(ring)))
        .filter((ring) => ring.length > 2);
    }

    return [];
  });
}

function getGraticuleRings() {
  const latitudeRings = [-60, -30, 0, 30, 60].map((lat) =>
    Array.from({ length: 73 }, (_, index) => lonLatToVector3(index * 5 - 180, lat, globeRadius + 0.006)),
  );

  const longitudeRings = Array.from({ length: 12 }, (_, index) => {
    const lon = index * 30 - 180;
    return Array.from({ length: 49 }, (__, pointIndex) =>
      lonLatToVector3(lon, pointIndex * 3.75 - 90, globeRadius + 0.006),
    );
  });

  return [...latitudeRings, ...longitudeRings];
}

function getOrbitPoints(radius: number, inclination: number) {
  const inc = MathUtils.degToRad(inclination);

  return Array.from({ length: 161 }, (_, index) => {
    const angle = (index / 160) * Math.PI * 2;

    return new Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * Math.sin(inc) * radius,
      Math.sin(angle) * Math.cos(inc) * radius,
    );
  });
}

function SatelliteOrbit({
  satellite,
  active,
  onSelect,
}: {
  satellite: SatelliteDefinition;
  active: boolean;
  onSelect: (mission: Mission) => void;
}) {
  const satelliteRef = useRef<Mesh>(null);
  const angleRef = useRef(satellite.ascendingNode * 0.6);
  const orbitPoints = useMemo(() => getOrbitPoints(satellite.radius, satellite.inclination), [satellite]);
  const inc = MathUtils.degToRad(satellite.inclination);

  useFrame((_, delta) => {
    angleRef.current += delta * satellite.speed;
    const angle = angleRef.current;

    if (satelliteRef.current) {
      satelliteRef.current.position.set(
        Math.cos(angle) * satellite.radius,
        Math.sin(angle) * Math.sin(inc) * satellite.radius,
        Math.sin(angle) * Math.cos(inc) * satellite.radius,
      );
    }
  });

  return (
    <group rotation={[0, satellite.ascendingNode, 0]}>
      <Line
        points={orbitPoints}
        color={satellite.color}
        lineWidth={active ? 1.2 : 0.72}
        transparent
        opacity={active ? 0.44 : 0.18}
      />
      <mesh
        ref={satelliteRef}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          onSelect(satellite.id);
        }}
      >
        <octahedronGeometry args={[active ? 0.105 : 0.078, 0]} />
        <meshBasicMaterial color={satellite.color} transparent opacity={active ? 0.98 : 0.82} />
      </mesh>
    </group>
  );
}

function ResearchGlobe({
  clusters,
  selectedSignal,
  onSelectSignal,
  activeMission,
  onSelectMission,
}: {
  clusters: GlobeCluster[];
  selectedSignal: Signal;
  onSelectSignal: (id: string) => void;
  activeMission: Mission | null;
  onSelectMission: (mission: Mission) => void;
}) {
  const worldRings = useMemo(() => getWorldRings(), []);
  const graticuleRings = useMemo(() => getGraticuleRings(), []);

  return (
    <div className={styles.globeStage}>
      <Canvas
        camera={{ position: [0, 0.25, 7.1], fov: 38 }}
        dpr={[1, 1.75]}
        gl={{ alpha: false, antialias: true, preserveDrawingBuffer: true }}
      >
        <color attach="background" args={["#080a09"]} />
        <ambientLight intensity={0.58} />
        <directionalLight position={[-3.2, 2.8, 4.4]} intensity={2.1} color="#f1e1c5" />
        <directionalLight position={[3.6, -1.6, -3.2]} intensity={0.62} color="#8fa3b8" />

        <group rotation={[0.08, -0.42, 0]}>
          <mesh>
            <sphereGeometry args={[globeRadius, 96, 64]} />
            <meshStandardMaterial color="#1d2a24" roughness={0.78} metalness={0.08} />
          </mesh>
          <mesh scale={1.035}>
            <sphereGeometry args={[globeRadius, 96, 64]} />
            <meshBasicMaterial color="#c6a46d" transparent opacity={0.038} side={BackSide} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[globeRadius + 0.04, 0.0025, 8, 180]} />
            <meshBasicMaterial color="#a88a5a" transparent opacity={0.24} />
          </mesh>

          {graticuleRings.map((points, index) => (
            <Line
              key={`graticule-${index}`}
              points={points}
              color="#e9e5df"
              lineWidth={0.38}
              transparent
              opacity={0.1}
            />
          ))}

          {worldRings.map((points, index) => (
            <Line
              key={`coast-${index}`}
              points={points}
              color="#d8d0c3"
              lineWidth={0.82}
              transparent
              opacity={0.28}
            />
          ))}

          {satellites.map((satellite) => (
            <SatelliteOrbit
              key={satellite.id}
              satellite={satellite}
              active={activeMission === satellite.id}
              onSelect={onSelectMission}
            />
          ))}

          {clusters.map((cluster) => {
            const primarySignal = cluster.signals.reduce((strongest, signal) =>
              getTrendScore(signal) > getTrendScore(strongest) ? signal : strongest,
            );
            const selected = cluster.signals.some((signal) => signal.id === selectedSignal.id);
            const point = selected ? getSignalGlobePoint(selectedSignal) : getClusterGlobePoint(cluster);
            const position = lonLatToVector3(point.lon, point.lat, markerRadius);

            return (
              <GlobeMarker
                key={cluster.id}
                cluster={cluster}
                primarySignal={primarySignal}
                position={position}
                selected={selected}
                onSelectSignal={onSelectSignal}
              />
            );
          })}
        </group>

        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.22}
          rotateSpeed={0.62}
          minPolarAngle={0.18}
          maxPolarAngle={Math.PI - 0.18}
        />
      </Canvas>
      <div className={styles.globeHint} aria-hidden="true">
        Drag to rotate / click signals
      </div>
    </div>
  );
}

function GlobeMarker({
  cluster,
  primarySignal,
  position,
  selected,
  onSelectSignal,
}: {
  cluster: GlobeCluster;
  primarySignal: Signal;
  position: Vector3;
  selected: boolean;
  onSelectSignal: (id: string) => void;
}) {
  const tier = getSignalTier(primarySignal, cluster.signals.length);
  const strength = getSignalStrength(primarySignal);
  const markerScale = (0.17 + cluster.signals.length * 0.018 + strength / 820) * (selected ? 1.18 : 1);
  const accent = categoryAccent[primarySignal.category];

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onSelectSignal(primarySignal.id);
  }

  return (
    <Billboard position={position}>
      <mesh scale={[markerScale * 2.5, markerScale * 2.5, 1]} onClick={handleClick}>
        <circleGeometry args={[0.16, 4]} />
        <meshBasicMaterial color={accent} transparent opacity={selected ? 0.24 : 0.12} side={DoubleSide} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]} scale={[markerScale, markerScale, 1]} onClick={handleClick}>
        <planeGeometry args={[0.34, 0.34]} />
        <meshBasicMaterial color={selected ? "#f5ecdc" : accent} transparent opacity={selected ? 0.94 : 0.72} side={DoubleSide} />
      </mesh>
      <mesh scale={[markerScale * 0.42, markerScale * 0.42, 1]} onClick={handleClick}>
        <planeGeometry args={[0.22, 0.22]} />
        <meshBasicMaterial color="#080a09" transparent opacity={tier === "normalSignal" ? 0.82 : 0.58} side={DoubleSide} />
      </mesh>
      <Text
        color={selected ? "#111312" : "#f4ead8"}
        fontSize={markerScale * 0.24}
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0.012]}
        onClick={handleClick}
      >
        {cluster.signals.length}
      </Text>
    </Billboard>
  );
}

export default function ResearchPage() {
  const [mapData, setMapData] = useState<ResearchMapPayload>(researchMapData);
  const [apiTrends, setApiTrends] = useState<Signal[] | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiLoadStatus>("loading");
  const [apiError, setApiError] = useState<string | null>(null);
  const [spaceTelemetry, setSpaceTelemetry] = useState<SpaceTelemetry[]>([]);
  const [spaceTimestamp, setSpaceTimestamp] = useState<string | null>(null);
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
        const apiSignals = normalizeSignals(signalsPayload, ["signals", "data", "items"], researchMapData.signals);
        const nextTrends = normalizeSignals(trendsPayload, ["trends", "signals", "data", "items"], apiSignals);

        if (apiSignals.length === 0) {
          throw new Error("Research API returned no signals");
        }

        if (cancelled) {
          return;
        }

        setMapData({
          categories: researchMapData.categories,
          signals: apiSignals,
          clusters: buildApiClusters(apiSignals),
        });
        setApiTrends(nextTrends.length > 0 ? nextTrends : null);
        setActiveCategory("All");
        setSelectedId(apiSignals[0].id);
        setActiveMission(null);
        setApiStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setMapData(researchMapData);
        setApiTrends(null);
        setActiveCategory("All");
        setSelectedId(researchMapData.signals[0].id);
        setActiveMission(null);
        setApiStatus("fallback");
        setApiError(error instanceof Error ? error.message : "Research API unavailable");
      }
    }

    void loadResearchMapData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSpaceTelemetry() {
      try {
        const response = await fetch("/api/space", { cache: "no-store" });
        const payload = await response.json() as {
          satellites?: SpaceTelemetry[];
          timestamp?: string;
        };

        if (!cancelled) {
          setSpaceTelemetry(Array.isArray(payload.satellites) ? payload.satellites : []);
          setSpaceTimestamp(payload.timestamp ?? null);
        }
      } catch {
        if (!cancelled) {
          setSpaceTelemetry([]);
          setSpaceTimestamp(null);
        }
      }
    }

    void loadSpaceTelemetry();
    const interval = window.setInterval(loadSpaceTelemetry, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const filteredSignals = useMemo(
    () =>
      activeCategory === "All"
        ? signals
        : signals.filter((signal) => signal.category === activeCategory),
    [activeCategory, signals],
  );

  const selectedSignal =
    filteredSignals.find((signal) => signal.id === selectedId) ??
    apiTrends?.find((signal) => signal.id === selectedId) ??
    filteredSignals[0] ??
    signals[0];

  const topTrends = useMemo(
    () => {
      if (apiTrends) {
        return apiTrends.slice(0, 10);
      }

      return priorityTrendIds
        .map((id) => signals.find((signal) => signal.id === id))
        .filter((signal): signal is Signal => Boolean(signal));
    },
    [apiTrends, signals],
  );

  const activeSatellite = activeMission ? satellites.find((satellite) => satellite.id === activeMission) ?? null : null;
  const missionSignals = useMemo(
    () => (activeMission ? signals.filter((signal) => getSignalMissions(signal).includes(activeMission)) : []),
    [activeMission, signals],
  );
  const activeTelemetry = useMemo(() => {
    if (!activeSatellite) {
      return [];
    }

    const missionTerms = missionKeywords[activeSatellite.id];
    const exactMatches = spaceTelemetry.filter((item) => {
      const text = `${item.id} ${item.name}`.toLowerCase();
      return missionTerms.some((term) => text.includes(term));
    });

    return exactMatches.length > 0 ? exactMatches : spaceTelemetry.slice(0, 4);
  }, [activeSatellite, spaceTelemetry]);

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
    setActiveMission(null);
    const nextSignal = category === "All" ? signals[0] : signals.find((signal) => signal.category === category);
    if (nextSignal) {
      setSelectedId(nextSignal.id);
    }
  }

  function selectSignal(id: string) {
    setActiveMission(null);
    setSelectedId(id);
  }

  return (
    <>
      <Header />
      <main className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>Centari Research Map</p>
            <h1>Research Map</h1>
            <p>
              A public signal layer for tracking where technology, operations and
              physical constraints are changing how work should be planned.
            </p>
          </div>
          <div className={styles.heroMetrics} aria-label="Research map metrics">
            <div>
              <span>{signals.length}</span>
              <p>Signals indexed</p>
            </div>
            <div>
              <span>{categories.length - 1}</span>
              <p>Research lanes</p>
            </div>
            <div>
              <span>10</span>
              <p>Priority trends</p>
            </div>
          </div>
        </section>

        <section className={styles.workspace} aria-label="Research map workspace">
          <div className={styles.mapColumn}>
            <div className={styles.toolbar}>
              <div>
                <p className={styles.kicker}>Signal layer</p>
                <h2>Where the task is changing</h2>
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
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.mapSurface}>
              <div className={styles.mapStatus} aria-hidden="true">
                <span>Rotating globe / strategic signal layer</span>
                <span>{filteredSignals.length} visible signals</span>
              </div>
              <div className={styles.dataStatus} data-status={apiStatus} title={apiError ?? undefined}>
                {apiStatus === "loading" ? "Loading research feed" : null}
                {apiStatus === "fallback" ? "JSON fallback active" : null}
                {apiStatus === "ready" ? "API-backed research feed" : null}
              </div>

              <div className={styles.gridOverlay} aria-hidden="true" />
              <ResearchGlobe
                clusters={visibleClusters}
                selectedSignal={selectedSignal}
                onSelectSignal={selectSignal}
                activeMission={activeMission}
                onSelectMission={setActiveMission}
              />
            </div>
          </div>

          <aside className={styles.sidePanel} aria-label="Research signal detail">
            {activeSatellite ? (
              <article className={styles.signalCard} aria-live="polite">
                <div className={styles.cardMeta}>
                  <span>Satellite channel</span>
                  <span>{activeSatellite.name}</span>
                  <span>{activeSatellite.inclination.toFixed(1)} deg orbit</span>
                </div>
                <h2>{activeSatellite.fullName}</h2>
                <p className={styles.location}>NASA mission layer / Space research feed</p>
                <p>
                  Signals in this view are tagged to the selected mission. Use it as a quick way to
                  separate space infrastructure from the broader research map.
                </p>
                <div className={styles.telemetryPanel}>
                  <div className={styles.telemetryHeader}>
                    <span>JPL DSN live feed</span>
                    <em>{spaceTimestamp ? new Date(spaceTimestamp).toLocaleTimeString("en-GB") : "standby"}</em>
                  </div>
                  {activeTelemetry.length > 0 ? (
                    <div className={styles.telemetryGrid}>
                      {activeTelemetry.map((item) => (
                        <div key={item.id} className={styles.telemetryCard}>
                          <span>{item.type.replace("-", " ")}</span>
                          <strong>{item.name}</strong>
                          <dl>
                            <div>
                              <dt>Status</dt>
                              <dd>{item.status}</dd>
                            </div>
                            <div>
                              <dt>Distance</dt>
                              <dd>{item.distance === "unknown" ? "unknown" : `${item.distance} km`}</dd>
                            </div>
                            <div>
                              <dt>Band</dt>
                              <dd>{item.band}</dd>
                            </div>
                            {item.rtlt && item.rtlt !== "unknown" && item.rtlt !== "-1" ? (
                              <div>
                                <dt>Light time</dt>
                                <dd>{item.rtlt} s</dd>
                              </div>
                            ) : null}
                          </dl>
                          {item.description ? <p>{item.description}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.telemetryEmpty}>Live space telemetry is loading.</p>
                  )}
                </div>
                <button type="button" className={styles.panelAction} onClick={() => setActiveMission(null)}>
                  Return to signal detail
                </button>
                <div className={styles.missionSignalList}>
                  {missionSignals.length > 0 ? (
                    missionSignals.slice(0, 6).map((signal) => (
                      <button key={signal.id} type="button" onClick={() => selectSignal(signal.id)}>
                        <span>{signal.category}</span>
                        <strong>{signal.title}</strong>
                        <em>{signal.sourceName || signal.location}</em>
                      </button>
                    ))
                  ) : (
                    <p>No mission-specific signals are loaded in the current feed yet.</p>
                  )}
                </div>
              </article>
            ) : (
              <article className={styles.signalCard} aria-live="polite">
                <div className={styles.cardMeta}>
                  <span>{selectedSignal.id}</span>
                  <span>{selectedSignal.category}</span>
                  <span>{selectedSignal.momentum}</span>
                </div>
                <h2>{selectedSignal.title}</h2>
                <p className={styles.location}>{selectedSignal.location} / {selectedSignal.region}</p>
                <p>{selectedSignal.summary}</p>
                {(selectedSignal.sourceUrl || selectedSignal.sourceName || selectedSignal.publishedAt) ? (
                  <div className={styles.sourceRow}>
                    {selectedSignal.sourceName ? <span>{selectedSignal.sourceName}</span> : null}
                    {selectedSignal.publishedAt ? (
                      <span>{new Date(selectedSignal.publishedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}</span>
                    ) : null}
                    {selectedSignal.sourceUrl ? (
                      <a href={selectedSignal.sourceUrl} target="_blank" rel="noreferrer">
                        Read original source
                      </a>
                    ) : null}
                  </div>
                ) : null}
                <div className={styles.signalScores}>
                  <div className={styles.intensity}>
                    <span>Signal strength</span>
                    <strong>{getSignalStrength(selectedSignal)}</strong>
                    <i style={{ transform: `scaleX(${getSignalStrength(selectedSignal) / 100})` }} />
                  </div>
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
                <p className={styles.kicker}>Top 10 trends</p>
                <h2>Priority watchlist</h2>
              </div>
              <ol className={styles.trendList}>
                {topTrends.map((trend, index) => (
                  <li key={trend.id}>
                    <button
                      type="button"
                      className={trend.id === selectedSignal.id ? styles.trendActive : ""}
                      onClick={() => selectSignal(trend.id)}
                      style={{ "--signal-color": categoryAccent[trend.category] } as CSSProperties}
                    >
                      <span className={styles.rank}>{String(index + 1).padStart(2, "0")}</span>
                      <span>
                        <strong>{trend.title}</strong>
                        <em>{trend.region} / {trend.category}</em>
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

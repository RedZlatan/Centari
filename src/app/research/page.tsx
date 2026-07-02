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
import { AdditiveBlending, BackSide, DoubleSide, MathUtils, Vector3 } from "three";
import type { Group } from "three";
import worldAtlas from "world-atlas/countries-110m.json";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SpyRadio } from "@/components/research/SpyRadio";
import type { SpyRadioStation } from "@/components/research/SpyRadio";
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
  confidence?: "verified" | "probable" | "preliminary" | string;
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

type EarthquakeEvent = {
  id: string;
  title: string;
  magnitude: number;
  place: string;
  time: number;
  url?: string | null;
  alert?: string | null;
  tsunami: boolean;
  coordinates: {
    longitude: number;
    latitude: number;
    depth_km: number;
  };
};

type BuoyObservation = {
  id: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  windSpeed_ms: number | null;
  waveHeight_m: number | null;
  airTemp_c: number | null;
  waterTemp_c: number | null;
};

type AsteroidEvent = {
  id: string;
  name: string;
  close_approach_date: string;
  distance_au: number | null;
  distance_lunar: number | null;
  velocity_kms: number | null;
  estimated_size_meters: number | null;
  is_hazard: boolean;
};

type SpaceWeather = {
  current_kp: number;
  condition: string;
  is_storm: boolean;
  station_count?: number | null;
  timestamp: string;
};

type LaunchEvent = {
  id: string;
  name: string;
  provider: string;
  status: string;
  net: string | null;
  mission_description: string | null;
  pad: {
    name: string;
    location: string;
    latitude: number;
    longitude: number;
  };
};

type FireballEvent = {
  id: string;
  timestamp: string;
  energy_joules: number | null;
  impact_energy_kt: number | null;
  radiated_energy_kt: number | null;
  altitude_km: number | null;
  velocity_kms: number | null;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  description: string;
};

type UapEvent = {
  id: string;
  title: string;
  classification: string;
  shape: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  altitude_ft: number | null;
  speed_mach: string;
  timestamp: string;
  location: string;
  description: string;
  sourceName: string;
  sourceUrl: string;
};

type ResilienceLayer = "airquality" | "wildfires" | "disasters" | "outbreaks" | "waterstress" | "conflicts";

type ResilienceEvent = {
  id: string;
  layer: ResilienceLayer;
  title: string;
  subtitle: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  severity: string;
  valueLabel: string;
  value?: number | null;
  description: string;
  sourceName: string;
  sourceMode: "live" | "curated_reference" | "requires_licensed_source";
  sourceUrl?: string | null;
  observedAt?: string | null;
};

type EarthLayerSelection =
  | { type: "earthquake"; item: EarthquakeEvent }
  | { type: "buoy"; item: BuoyObservation }
  | { type: "asteroid"; item: AsteroidEvent }
  | { type: "launch"; item: LaunchEvent }
  | { type: "fireball"; item: FireballEvent }
  | { type: "uap"; item: UapEvent }
  | { type: "spaceweather"; item: SpaceWeather }
  | { type: "resilience"; item: ResilienceEvent };

type LiveLayer =
  | "satellites"
  | "earthquakes"
  | "buoys"
  | "asteroids"
  | "spaceweather"
  | "launches"
  | "fireballs"
  | "uaps"
  | "radio"
  | ResilienceLayer;

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
    speed: 0.16,
    color: "#60a5fa",
  },
  {
    id: "hubble",
    name: "Hubble",
    fullName: "Hubble Space Telescope",
    radius: globeRadius + 0.64,
    inclination: 28.5,
    ascendingNode: Math.PI * 0.75,
    speed: 0.105,
    color: "#fbbf24",
  },
  {
    id: "jwst",
    name: "JWST",
    fullName: "James Webb Space Telescope",
    radius: globeRadius + 1.08,
    inclination: 5,
    ascendingNode: Math.PI * 1.4,
    speed: 0.045,
    color: "#a78bfa",
  },
];

const spyRadioStations: SpyRadioStation[] = [
  {
    id: "uvb-76",
    stationName: "UVB-76 / THE BUZZER",
    codename: "Buzzer",
    frequency: "4625.00 kHz",
    location: "Western Russia",
    status: "live",
    streamUrl: "http://stream.uvb-76.net:8000/uvb76.mp3",
    notes: "Open live shortwave stream for the long-running Russian military radio marker known as UVB-76.",
  },
];

const resilienceLayerLabels: Record<ResilienceLayer, string> = {
  airquality: "Air",
  wildfires: "Fire",
  disasters: "GDACS",
  outbreaks: "Disease",
  waterstress: "Water",
  conflicts: "Conflict",
};

const resilienceLayerMeta: Record<ResilienceLayer, { label: string; sourceLabel: string; color: string }> = {
  airquality: { label: "Air quality", sourceLabel: "Open-Meteo", color: "#c7b36d" },
  wildfires: { label: "Wildfire", sourceLabel: "NASA EONET", color: "#ff7043" },
  disasters: { label: "Disaster alert", sourceLabel: "GDACS", color: "#ff3f35" },
  outbreaks: { label: "Outbreak watch", sourceLabel: "Curated reference", color: "#9ddb64" },
  waterstress: { label: "Water stress", sourceLabel: "Curated reference", color: "#d99352" },
  conflicts: { label: "Conflict report", sourceLabel: "GDELT Project 2.0", color: "#e55454" },
};

const resilienceLayerMaxVisible: Record<ResilienceLayer, number> = {
  airquality: 10,
  wildfires: 32,
  disasters: 12,
  outbreaks: 3,
  waterstress: 5,
  conflicts: 8,
};

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
        confidence: getString(item, ["confidence", "source_confidence"], ""),
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
  const tags = signal.tags ?? [];
  const exactMissionTags = satellites
    .filter((satellite) => tags.includes(satellite.id))
    .map((satellite) => satellite.id);

  if (exactMissionTags.length > 0) {
    return exactMissionTags;
  }

  const text = `${signal.title} ${signal.summary} ${signal.sourceName ?? ""} ${(signal.tags ?? []).join(" ")}`.toLowerCase();

  return satellites
    .filter((satellite) => missionKeywords[satellite.id].some((keyword) => text.includes(keyword)))
    .map((satellite) => satellite.id);
}

function getConfidenceLabel(confidence?: Signal["confidence"]) {
  if (confidence === "verified") {
    return "Verified";
  }

  if (confidence === "probable") {
    return "Probable";
  }

  if (confidence === "preliminary") {
    return "Preliminary";
  }

  return confidence ? confidence : null;
}

function formatNullableMetric(value: number | null | undefined, suffix: string, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "unknown";
  }

  return `${value.toFixed(digits)} ${suffix}`;
}

function formatEnergyJoules(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "unknown";
  }

  if (value >= 1e15) {
    return `${(value / 1e15).toFixed(2)} PJ`;
  }

  if (value >= 1e12) {
    return `${(value / 1e12).toFixed(2)} TJ`;
  }

  return `${(value / 1e9).toFixed(2)} GJ`;
}

function formatLaunchCountdown(net: string | null) {
  if (!net) {
    return "time unknown";
  }

  const diffMs = new Date(net).getTime() - Date.now();
  const absMinutes = Math.abs(Math.round(diffMs / 60000));
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return diffMs >= 0 ? `T-${label}` : `T+${label}`;
}

function getDistributedBuoys(buoys: BuoyObservation[], maxCount = 36) {
  const cells = new Set<string>();
  const scoredBuoys = [...buoys].sort((a, b) => (b.waveHeight_m ?? 0) - (a.waveHeight_m ?? 0));
  const selected: BuoyObservation[] = [];

  for (const buoy of scoredBuoys) {
    const latCell = Math.floor((buoy.coordinates.latitude + 90) / 14);
    const lonCell = Math.floor((buoy.coordinates.longitude + 180) / 18);
    const cellKey = `${latCell}:${lonCell}`;

    if (cells.has(cellKey)) {
      continue;
    }

    cells.add(cellKey);
    selected.push(buoy);

    if (selected.length >= maxCount) {
      return selected;
    }
  }

  for (const buoy of scoredBuoys) {
    if (!selected.some((selectedBuoy) => selectedBuoy.id === buoy.id)) {
      selected.push(buoy);
    }

    if (selected.length >= maxCount) {
      break;
    }
  }

  return selected;
}

function isValidCoordinates(value: unknown): value is { latitude: number; longitude: number } {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.latitude === "number" &&
    typeof value.longitude === "number" &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude)
  );
}

function getSourceMode(record: ApiRecord): ResilienceEvent["sourceMode"] {
  const mode = getString(record, ["source_mode", "sourceMode"], "live");

  if (mode === "curated_reference" || mode === "requires_licensed_source") {
    return mode;
  }

  return "live";
}

function getResilienceValueLabel(layer: ResilienceLayer, record: ApiRecord) {
  if (layer === "airquality") {
    const aqi = getOptionalNumber(record, ["us_aqi"]);
    return aqi === null ? "AQI unknown" : `AQI ${Math.round(aqi)}`;
  }

  if (layer === "wildfires") {
    const acres = getOptionalNumber(record, ["magnitude_acres"]);
    return acres === null ? "Thermal anomaly" : `${Math.round(acres).toLocaleString("en-GB")} acres`;
  }

  if (layer === "disasters") {
    return getString(record, ["severity"], "Alert");
  }

  if (layer === "outbreaks") {
    const cases = getOptionalNumber(record, ["cases_reported"]);
    return cases === null ? getString(record, ["status"], "Watch") : `${Math.round(cases).toLocaleString("en-GB")} cases`;
  }

  if (layer === "waterstress") {
    const population = getOptionalNumber(record, ["affected_population_millions"]);
    return population === null ? getString(record, ["severity"], "Stress") : `${population.toFixed(1)}M exposed`;
  }

  const mentions = getOptionalNumber(record, ["num_mentions", "mentions"]);
  return mentions === null ? "Mentions unknown" : `${Math.round(mentions)} mentions`;
}

function getResilienceValue(layer: ResilienceLayer, record: ApiRecord) {
  if (layer === "airquality") {
    return getOptionalNumber(record, ["us_aqi"]);
  }

  if (layer === "wildfires") {
    return getOptionalNumber(record, ["magnitude_acres"]);
  }

  if (layer === "outbreaks") {
    return getOptionalNumber(record, ["cases_reported"]);
  }

  if (layer === "waterstress") {
    return getOptionalNumber(record, ["affected_population_millions"]);
  }

  if (layer === "conflicts") {
    return getOptionalNumber(record, ["num_mentions", "mentions"]);
  }

  return null;
}

function normalizeResilienceEvents(payload: unknown, layer: ResilienceLayer, keys: string[]): ResilienceEvent[] {
  return getPayloadArray(payload, keys)
    .map((item): ResilienceEvent | null => {
      if (!isRecord(item) || !isValidCoordinates(item.coordinates)) {
        return null;
      }

      const fallbackMeta = resilienceLayerMeta[layer];
      const title =
        layer === "airquality"
          ? getString(item, ["city"], fallbackMeta.label)
          : layer === "outbreaks"
            ? getString(item, ["disease"], fallbackMeta.label)
            : layer === "waterstress"
              ? getString(item, ["region"], fallbackMeta.label)
              : layer === "conflicts"
                ? getString(item, ["location"], fallbackMeta.label)
                : getString(item, ["title", "name"], fallbackMeta.label);
      const subtitle =
        layer === "airquality"
          ? getString(item, ["country"], "Air quality station")
          : layer === "conflicts"
            ? `${getString(item, ["actor1"], "Unknown actor")} / ${getString(item, ["actor2"], "Unknown actor")}`
            : getString(item, ["country", "subtitle", "location"], fallbackMeta.sourceLabel);

      return {
        id: `${layer}-${getString(item, ["id"], title)}`,
        layer,
        title,
        subtitle,
        coordinates: item.coordinates,
        severity: getString(item, ["risk_level", "severity", "status", "event_type", "event_code"], fallbackMeta.label),
        valueLabel: getResilienceValueLabel(layer, item),
        value: getResilienceValue(layer, item) ?? null,
        description: getString(item, ["description", "summary"], `${fallbackMeta.label} marker.`),
        sourceName: getString(item, ["source_name", "sourceName"], fallbackMeta.sourceLabel),
        sourceMode: getSourceMode(item),
        sourceUrl: getString(item, ["source", "source_url", "url"], "") || null,
        observedAt: getString(item, ["observed_at", "date", "timestamp"], "") || null,
      };
    })
    .filter((event): event is ResilienceEvent => Boolean(event));
}

function getLayerStatusLabel(mode: ResilienceEvent["sourceMode"]) {
  if (mode === "live") {
    return "Live";
  }

  if (mode === "requires_licensed_source") {
    return "Source required";
  }

  return "Reference";
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
  const satelliteRef = useRef<Group>(null);
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
      <group
        ref={satelliteRef}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          onSelect(satellite.id);
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <mesh>
          <octahedronGeometry args={[active ? 0.105 : 0.078, 0]} />
          <meshBasicMaterial color={satellite.color} transparent opacity={active ? 0.98 : 0.82} />
        </mesh>
        <mesh>
          <sphereGeometry args={[active ? 0.3 : 0.24, 16, 16]} />
          <meshBasicMaterial color={satellite.color} transparent opacity={0.002} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function EarthquakeMarker({
  earthquake,
  selected,
  onSelect,
}: {
  earthquake: EarthquakeEvent;
  selected: boolean;
  onSelect: (earthquake: EarthquakeEvent) => void;
}) {
  const markerRef = useRef<Group>(null);
  const position = useMemo(
    () => lonLatToVector3(earthquake.coordinates.longitude, earthquake.coordinates.latitude, markerRadius + 0.045),
    [earthquake],
  );
  const markerScale = MathUtils.clamp((earthquake.magnitude - 3.6) * 0.07, 0.08, 0.22);

  useFrame(({ clock }) => {
    if (!markerRef.current) {
      return;
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * 3.2 + earthquake.magnitude) * 0.18;
    markerRef.current.scale.setScalar(selected ? pulse * 1.24 : pulse);
  });

  return (
    <group
      ref={markerRef}
      position={position}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onSelect(earthquake);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <Billboard>
        <mesh>
          <ringGeometry args={[markerScale * 0.9, markerScale * 1.38, 28]} />
          <meshBasicMaterial color={earthquake.tsunami ? "#ff5148" : "#d9854e"} transparent opacity={selected ? 0.82 : 0.46} side={DoubleSide} />
        </mesh>
        <mesh>
          <circleGeometry args={[markerScale * 0.62, 24]} />
          <meshBasicMaterial color={earthquake.tsunami ? "#ff3328" : "#d46b38"} transparent opacity={0.86} side={DoubleSide} />
        </mesh>
        <mesh>
          <sphereGeometry args={[markerScale * 1.8, 16, 16]} />
          <meshBasicMaterial color="#ff5b4a" transparent opacity={0.002} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

function BuoyMarker({
  buoy,
  selected,
  onSelect,
}: {
  buoy: BuoyObservation;
  selected: boolean;
  onSelect: (buoy: BuoyObservation) => void;
}) {
  const markerRef = useRef<Group>(null);
  const basePosition = useMemo(
    () => lonLatToVector3(buoy.coordinates.longitude, buoy.coordinates.latitude, markerRadius + 0.02),
    [buoy],
  );
  const waveHeight = buoy.waveHeight_m ?? 0.4;
  const markerScale = MathUtils.clamp(0.065 + waveHeight * 0.018, 0.07, 0.18);

  useFrame(({ clock }) => {
    if (!markerRef.current) {
      return;
    }

    const bob = Math.sin(clock.elapsedTime * 2.4 + Number.parseInt(buoy.id, 10) * 0.03) * Math.min(waveHeight * 0.012, 0.065);
    markerRef.current.position.copy(basePosition.clone().setLength(basePosition.length() + bob));
  });

  return (
    <group
      ref={markerRef}
      position={basePosition}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onSelect(buoy);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <Billboard>
        <mesh>
          <circleGeometry args={[markerScale, 18]} />
          <meshBasicMaterial color={waveHeight > 5 ? "#d8f2ff" : "#77d7e8"} transparent opacity={selected ? 0.9 : 0.62} side={DoubleSide} />
        </mesh>
        <mesh>
          <ringGeometry args={[markerScale * 1.45, markerScale * 1.9, 24]} />
          <meshBasicMaterial color={waveHeight > 5 ? "#f0c36d" : "#77d7e8"} transparent opacity={selected ? 0.66 : 0.24} side={DoubleSide} />
        </mesh>
        <mesh>
          <sphereGeometry args={[markerScale * 2.4, 16, 16]} />
          <meshBasicMaterial color="#77d7e8" transparent opacity={0.002} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

function AsteroidMarker({
  asteroid,
  index,
  selected,
  onSelect,
}: {
  asteroid: AsteroidEvent;
  index: number;
  selected: boolean;
  onSelect: (asteroid: AsteroidEvent) => void;
}) {
  const groupRef = useRef<Group>(null);
  const distance = MathUtils.clamp((asteroid.distance_lunar ?? 8) / 10, 0.18, 1);
  const orbitRadius = globeRadius + 0.72 + distance * 0.82;
  const tilt = MathUtils.degToRad(18 + (index % 5) * 13);
  const angleOffset = index * 1.21;
  const orbitPoints = useMemo(() => getOrbitPoints(orbitRadius, 18 + (index % 5) * 13), [orbitRadius, index]);
  const markerScale = MathUtils.clamp(0.052 + (asteroid.estimated_size_meters ?? 40) / 1800, 0.055, 0.16);
  const color = asteroid.is_hazard ? "#ff5b4a" : "#d99a52";

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const angle = clock.elapsedTime * 0.035 + angleOffset;
    groupRef.current.position.set(
      Math.cos(angle) * orbitRadius,
      Math.sin(angle) * Math.sin(tilt) * orbitRadius,
      Math.sin(angle) * Math.cos(tilt) * orbitRadius,
    );
  });

  return (
    <group rotation={[0, angleOffset * 0.42, 0]}>
      <Line
        points={orbitPoints}
        color={color}
        lineWidth={asteroid.is_hazard ? 1.15 : 0.72}
        transparent
        opacity={selected ? 0.48 : asteroid.is_hazard ? 0.28 : 0.16}
      />
      <group
        ref={groupRef}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          onSelect(asteroid);
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <Billboard>
          <mesh>
            <icosahedronGeometry args={[markerScale, 0]} />
            <meshBasicMaterial color={color} transparent opacity={selected ? 0.95 : 0.76} />
          </mesh>
          <mesh>
            <ringGeometry args={[markerScale * 1.6, markerScale * 2.4, 24]} />
            <meshBasicMaterial color={color} transparent opacity={selected ? 0.42 : 0.18} side={DoubleSide} />
          </mesh>
          <mesh>
            <sphereGeometry args={[markerScale * 3.2, 16, 16]} />
            <meshBasicMaterial color={color} transparent opacity={0.002} depthWrite={false} />
          </mesh>
        </Billboard>
      </group>
    </group>
  );
}

function FireballMarker({
  fireball,
  selected,
  onSelect,
}: {
  fireball: FireballEvent;
  selected: boolean;
  onSelect: (fireball: FireballEvent) => void;
}) {
  const markerRef = useRef<Group>(null);
  const altitudeLift = MathUtils.clamp((fireball.altitude_km ?? 30) / 400, 0.05, 0.22);
  const position = useMemo(
    () => lonLatToVector3(fireball.coordinates.longitude, fireball.coordinates.latitude, markerRadius + 0.08 + altitudeLift),
    [altitudeLift, fireball],
  );
  const energyKt = fireball.impact_energy_kt ?? fireball.radiated_energy_kt ?? 0.25;
  const markerScale = MathUtils.clamp(0.08 + Math.sqrt(energyKt) * 0.05, 0.1, 0.34);
  const surfacePosition = useMemo(
    () => lonLatToVector3(fireball.coordinates.longitude, fireball.coordinates.latitude, markerRadius - 0.02),
    [fireball],
  );

  useFrame(({ clock }) => {
    if (!markerRef.current) {
      return;
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * 6 + energyKt) * 0.18;
    markerRef.current.scale.setScalar(selected ? pulse * 1.28 : pulse);
  });

  return (
    <group
      ref={markerRef}
      position={position}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onSelect(fireball);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <pointLight color="#ffb65c" intensity={selected ? 1.8 : 0.9} distance={1.8} />
      <Line
        points={[new Vector3(0, 0, 0), surfacePosition.clone().sub(position).multiplyScalar(0.72)]}
        color="#ffb65c"
        lineWidth={selected ? 2 : 1.2}
        transparent
        opacity={selected ? 0.84 : 0.46}
      />
      <Billboard>
        <mesh>
          <circleGeometry args={[markerScale, 32]} />
          <meshBasicMaterial color="#ff8a32" transparent opacity={selected ? 0.96 : 0.68} side={DoubleSide} blending={AdditiveBlending} />
        </mesh>
        <mesh>
          <ringGeometry args={[markerScale * 1.35, markerScale * 2.1, 36]} />
          <meshBasicMaterial color="#ffd08a" transparent opacity={selected ? 0.62 : 0.28} side={DoubleSide} blending={AdditiveBlending} />
        </mesh>
        <mesh>
          <sphereGeometry args={[markerScale * 2.6, 16, 16]} />
          <meshBasicMaterial color="#ffb65c" transparent opacity={0.002} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

function UapMarker({
  uap,
  selected,
  onSelect,
}: {
  uap: UapEvent;
  selected: boolean;
  onSelect: (uap: UapEvent) => void;
}) {
  const markerRef = useRef<Group>(null);
  const position = useMemo(
    () => lonLatToVector3(uap.coordinates.longitude, uap.coordinates.latitude, markerRadius + 0.18),
    [uap],
  );
  const phase = uap.id.length * 0.41;

  useFrame(({ clock }) => {
    if (!markerRef.current) {
      return;
    }

    const jitter = selected ? 0.045 : 0.026;
    markerRef.current.position.copy(
      position.clone().add(new Vector3(
        Math.sin(clock.elapsedTime * 7.3 + phase) * jitter,
        Math.cos(clock.elapsedTime * 5.1 + phase) * jitter,
        Math.sin(clock.elapsedTime * 6.2 + phase) * jitter,
      )),
    );
    markerRef.current.rotation.z = clock.elapsedTime * 1.7 + phase;
  });

  return (
    <group
      ref={markerRef}
      position={position}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onSelect(uap);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <Billboard>
        <mesh>
          <ringGeometry args={[0.12, selected ? 0.24 : 0.2, 4]} />
          <meshBasicMaterial color="#7df7a3" transparent opacity={selected ? 0.86 : 0.48} side={DoubleSide} />
        </mesh>
        <Line
          points={[new Vector3(-0.18, 0, 0), new Vector3(0.18, 0, 0)]}
          color="#7df7a3"
          lineWidth={selected ? 1.8 : 1.1}
          transparent
          opacity={selected ? 0.9 : 0.52}
        />
        <Line
          points={[new Vector3(0, -0.18, 0), new Vector3(0, 0.18, 0)]}
          color="#7df7a3"
          lineWidth={selected ? 1.8 : 1.1}
          transparent
          opacity={selected ? 0.9 : 0.52}
        />
        <mesh>
          <sphereGeometry args={[0.34, 16, 16]} />
          <meshBasicMaterial color="#7df7a3" transparent opacity={0.002} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

function LaunchMarker({
  launch,
  selected,
  onSelect,
}: {
  launch: LaunchEvent;
  selected: boolean;
  onSelect: (launch: LaunchEvent) => void;
}) {
  const markerRef = useRef<Group>(null);
  const position = useMemo(
    () => lonLatToVector3(launch.pad.longitude, launch.pad.latitude, markerRadius + 0.07),
    [launch],
  );
  const launchTime = launch.net ? new Date(launch.net).getTime() : null;
  const minutesToLaunch = launchTime === null ? null : (launchTime - Date.now()) / 60000;
  const isSoon = minutesToLaunch !== null && minutesToLaunch > -30 && minutesToLaunch <= 60;

  useFrame(({ clock }) => {
    if (!markerRef.current) {
      return;
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * (isSoon ? 5.5 : 2.4)) * (isSoon ? 0.2 : 0.08);
    markerRef.current.scale.setScalar(selected ? pulse * 1.18 : pulse);
  });

  return (
    <group
      ref={markerRef}
      position={position}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onSelect(launch);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <Billboard>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.16, 0.16]} />
          <meshBasicMaterial color={isSoon ? "#fff3c4" : "#d0ad70"} transparent opacity={selected ? 0.96 : 0.76} side={DoubleSide} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.12, 0.18, 24]} />
          <meshBasicMaterial color={isSoon ? "#fff3c4" : "#d0ad70"} transparent opacity={selected ? 0.55 : 0.22} side={DoubleSide} />
        </mesh>
        {isSoon ? (
          <Line
            points={[new Vector3(0, 0.08, 0), new Vector3(0, 0.56, 0)]}
            color="#fff3c4"
            lineWidth={1.4}
            transparent
            opacity={0.7}
          />
        ) : null}
        <mesh>
          <sphereGeometry args={[0.34, 16, 16]} />
          <meshBasicMaterial color="#d0ad70" transparent opacity={0.002} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

function ResilienceMarker({
  event,
  selected,
  onSelect,
}: {
  event: ResilienceEvent;
  selected: boolean;
  onSelect: (event: ResilienceEvent) => void;
}) {
  const markerRef = useRef<Group>(null);
  const position = useMemo(
    () => lonLatToVector3(event.coordinates.longitude, event.coordinates.latitude, markerRadius + 0.06),
    [event],
  );
  const meta = resilienceLayerMeta[event.layer];
  const numericValue = typeof event.value === "number" && Number.isFinite(event.value) ? event.value : 0;
  const baseScale =
    event.layer === "airquality"
      ? MathUtils.clamp(0.08 + numericValue / 1200, 0.085, 0.23)
      : event.layer === "wildfires"
        ? MathUtils.clamp(0.08 + Math.sqrt(numericValue || 500) / 900, 0.09, 0.24)
        : event.layer === "waterstress"
          ? MathUtils.clamp(0.11 + numericValue / 600, 0.12, 0.28)
          : 0.12;
  const isFastAlert = event.layer === "wildfires" || event.layer === "disasters";

  useFrame(({ clock }) => {
    if (!markerRef.current) {
      return;
    }

    const pulseSpeed = isFastAlert ? 4.4 : event.layer === "waterstress" ? 1.1 : 2.4;
    const pulseAmount = isFastAlert ? 0.2 : 0.1;
    const pulse = 1 + Math.sin(clock.elapsedTime * pulseSpeed + event.id.length) * pulseAmount;
    markerRef.current.scale.setScalar(selected ? pulse * 1.22 : pulse);
  });

  return (
    <group
      ref={markerRef}
      position={position}
      onClick={(clickEvent: ThreeEvent<MouseEvent>) => {
        clickEvent.stopPropagation();
        onSelect(event);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <Billboard>
        {event.layer === "airquality" ? (
          <mesh>
            <circleGeometry args={[baseScale * 2.4, 32]} />
            <meshBasicMaterial color={meta.color} transparent opacity={selected ? 0.34 : 0.18} side={DoubleSide} />
          </mesh>
        ) : null}
        {event.layer === "waterstress" ? (
          <mesh>
            <ringGeometry args={[baseScale * 1.7, baseScale * 2.55, 36]} />
            <meshBasicMaterial color={meta.color} transparent opacity={selected ? 0.42 : 0.18} side={DoubleSide} />
          </mesh>
        ) : (
          <mesh>
            <ringGeometry args={[baseScale * 1.15, baseScale * 1.85, 28]} />
            <meshBasicMaterial color={meta.color} transparent opacity={selected ? 0.7 : 0.28} side={DoubleSide} />
          </mesh>
        )}
        <mesh rotation={[0, 0, event.layer === "disasters" || event.layer === "conflicts" ? Math.PI / 4 : 0]}>
          <planeGeometry args={[baseScale * 1.25, baseScale * 1.25]} />
          <meshBasicMaterial color={meta.color} transparent opacity={selected ? 0.94 : 0.68} side={DoubleSide} />
        </mesh>
        {event.layer === "wildfires" || event.layer === "disasters" ? (
          <Line
            points={[new Vector3(0, -baseScale * 1.4, 0), new Vector3(0, baseScale * 1.8, 0)]}
            color={meta.color}
            lineWidth={1.1}
            transparent
            opacity={selected ? 0.82 : 0.46}
          />
        ) : null}
        <mesh>
          <sphereGeometry args={[baseScale * 3.2, 16, 16]} />
          <meshBasicMaterial color={meta.color} transparent opacity={0.002} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

function SpaceWeatherShield({
  spaceWeather,
  selected,
  onSelect,
}: {
  spaceWeather: SpaceWeather;
  selected: boolean;
  onSelect: (spaceWeather: SpaceWeather) => void;
}) {
  const shieldRef = useRef<Group>(null);
  const kp = spaceWeather.current_kp ?? 0;
  const opacity = spaceWeather.is_storm ? MathUtils.clamp(kp / 34, 0.16, 0.34) : MathUtils.clamp(kp / 90, 0.025, 0.08);
  const color = kp >= 6 ? "#b17cff" : "#6df0b2";

  useFrame(({ clock }) => {
    if (!shieldRef.current) {
      return;
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * 1.4) * (spaceWeather.is_storm ? 0.014 : 0.006);
    shieldRef.current.scale.setScalar(selected ? pulse * 1.012 : pulse);
  });

  return (
    <group
      ref={shieldRef}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onSelect(spaceWeather);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <mesh scale={1.1}>
        <sphereGeometry args={[globeRadius, 96, 64]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? opacity * 1.35 : opacity} side={BackSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[globeRadius + 0.35, 0.006, 8, 180]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.45 : 0.2} />
      </mesh>
    </group>
  );
}

function SpyRadioMarker({
  active,
  onOpen,
}: {
  active: boolean;
  onOpen: () => void;
}) {
  const markerRef = useRef<Group>(null);
  const position = useMemo(() => lonLatToVector3(37.1, 56.1, markerRadius + 0.09), []);

  useFrame(({ clock }) => {
    if (!markerRef.current) {
      return;
    }

    const pulse = 1 + Math.sin(clock.elapsedTime * 3.8) * 0.14;
    markerRef.current.scale.setScalar(active ? pulse * 1.18 : pulse);
  });

  return (
    <group
      ref={markerRef}
      position={position}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onOpen();
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <Billboard>
        <mesh>
          <ringGeometry args={[0.11, 0.2, 32]} />
          <meshBasicMaterial color="#77d7e8" transparent opacity={active ? 0.72 : 0.32} side={DoubleSide} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.058, 20]} />
          <meshBasicMaterial color="#77d7e8" transparent opacity={0.74} side={DoubleSide} />
        </mesh>
        <Line
          points={[new Vector3(-0.1, 0.12, 0), new Vector3(0, 0.24, 0), new Vector3(0.1, 0.12, 0)]}
          color="#77d7e8"
          lineWidth={1.1}
          transparent
          opacity={0.48}
        />
        <mesh>
          <sphereGeometry args={[0.36, 16, 16]} />
          <meshBasicMaterial color="#77d7e8" transparent opacity={0.002} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

function ResearchGlobe({
  clusters,
  selectedSignal,
  onSelectSignal,
  activeMission,
  onSelectMission,
  showSatellites,
  earthquakes,
  buoys,
  asteroids,
  spaceWeather,
  launches,
  fireballs,
  uaps,
  resilienceEvents,
  showRadio,
  radioActive,
  onOpenRadio,
  selectedEarthLayer,
  onSelectEarthLayer,
}: {
  clusters: GlobeCluster[];
  selectedSignal: Signal;
  onSelectSignal: (id: string) => void;
  activeMission: Mission | null;
  onSelectMission: (mission: Mission) => void;
  showSatellites: boolean;
  earthquakes: EarthquakeEvent[];
  buoys: BuoyObservation[];
  asteroids: AsteroidEvent[];
  spaceWeather: SpaceWeather | null;
  launches: LaunchEvent[];
  fireballs: FireballEvent[];
  uaps: UapEvent[];
  resilienceEvents: ResilienceEvent[];
  showRadio: boolean;
  radioActive: boolean;
  onOpenRadio: () => void;
  selectedEarthLayer: EarthLayerSelection | null;
  onSelectEarthLayer: (selection: EarthLayerSelection) => void;
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

          {showSatellites
            ? satellites.map((satellite) => (
                <SatelliteOrbit
                  key={satellite.id}
                  satellite={satellite}
                  active={activeMission === satellite.id}
                  onSelect={onSelectMission}
                />
              ))
            : null}

          {earthquakes.map((earthquake) => (
            <EarthquakeMarker
              key={earthquake.id}
              earthquake={earthquake}
              selected={selectedEarthLayer?.type === "earthquake" && selectedEarthLayer.item.id === earthquake.id}
              onSelect={(item) => onSelectEarthLayer({ type: "earthquake", item })}
            />
          ))}

          {buoys.map((buoy) => (
            <BuoyMarker
              key={buoy.id}
              buoy={buoy}
              selected={selectedEarthLayer?.type === "buoy" && selectedEarthLayer.item.id === buoy.id}
              onSelect={(item) => onSelectEarthLayer({ type: "buoy", item })}
            />
          ))}

          {asteroids.map((asteroid, index) => (
            <AsteroidMarker
              key={asteroid.id}
              asteroid={asteroid}
              index={index}
              selected={selectedEarthLayer?.type === "asteroid" && selectedEarthLayer.item.id === asteroid.id}
              onSelect={(item) => onSelectEarthLayer({ type: "asteroid", item })}
            />
          ))}

          {spaceWeather ? (
            <SpaceWeatherShield
              spaceWeather={spaceWeather}
              selected={selectedEarthLayer?.type === "spaceweather"}
              onSelect={(item) => onSelectEarthLayer({ type: "spaceweather", item })}
            />
          ) : null}

          {launches.map((launch) => (
            <LaunchMarker
              key={launch.id}
              launch={launch}
              selected={selectedEarthLayer?.type === "launch" && selectedEarthLayer.item.id === launch.id}
              onSelect={(item) => onSelectEarthLayer({ type: "launch", item })}
            />
          ))}

          {fireballs.map((fireball) => (
            <FireballMarker
              key={fireball.id}
              fireball={fireball}
              selected={selectedEarthLayer?.type === "fireball" && selectedEarthLayer.item.id === fireball.id}
              onSelect={(item) => onSelectEarthLayer({ type: "fireball", item })}
            />
          ))}

          {uaps.map((uap) => (
            <UapMarker
              key={uap.id}
              uap={uap}
              selected={selectedEarthLayer?.type === "uap" && selectedEarthLayer.item.id === uap.id}
              onSelect={(item) => onSelectEarthLayer({ type: "uap", item })}
            />
          ))}

          {resilienceEvents.map((event) => (
            <ResilienceMarker
              key={event.id}
              event={event}
              selected={selectedEarthLayer?.type === "resilience" && selectedEarthLayer.item.id === event.id}
              onSelect={(item) => onSelectEarthLayer({ type: "resilience", item })}
            />
          ))}

          {showRadio ? <SpyRadioMarker active={radioActive} onOpen={onOpenRadio} /> : null}

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
  const [earthquakes, setEarthquakes] = useState<EarthquakeEvent[]>([]);
  const [buoys, setBuoys] = useState<BuoyObservation[]>([]);
  const [asteroids, setAsteroids] = useState<AsteroidEvent[]>([]);
  const [spaceWeather, setSpaceWeather] = useState<SpaceWeather | null>(null);
  const [launches, setLaunches] = useState<LaunchEvent[]>([]);
  const [fireballs, setFireballs] = useState<FireballEvent[]>([]);
  const [uaps, setUaps] = useState<UapEvent[]>([]);
  const [resilienceEvents, setResilienceEvents] = useState<ResilienceEvent[]>([]);
  const [earthLayerTimestamp, setEarthLayerTimestamp] = useState<string | null>(null);
  const { categories, signals, clusters } = mapData;
  const [activeCategory, setActiveCategory] = useState<SignalCategory>("All");
  const [selectedId, setSelectedId] = useState(signals[0].id);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [selectedEarthLayer, setSelectedEarthLayer] = useState<EarthLayerSelection | null>(null);
  const [activeSpyRadioId, setActiveSpyRadioId] = useState<string | null>(null);
  const [liveLayers, setLiveLayers] = useState<Record<LiveLayer, boolean>>({
    satellites: true,
    earthquakes: true,
    buoys: false,
    asteroids: false,
    spaceweather: false,
    launches: false,
    fireballs: false,
    uaps: false,
    radio: false,
    airquality: false,
    wildfires: false,
    disasters: false,
    outbreaks: false,
    waterstress: false,
    conflicts: false,
  });

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

    async function loadEarthLayers() {
      try {
        const [
          earthquakeResponse,
          buoyResponse,
          asteroidResponse,
          spaceWeatherResponse,
          launchResponse,
          fireballResponse,
          uapResponse,
          airQualityResponse,
          wildfireResponse,
          disasterResponse,
          outbreakResponse,
          waterStressResponse,
          conflictResponse,
        ] = await Promise.all([
          fetch("/api/earthquakes", { cache: "no-store" }),
          fetch("/api/buoys", { cache: "no-store" }),
          fetch("/api/asteroids", { cache: "no-store" }),
          fetch("/api/spaceweather", { cache: "no-store" }),
          fetch("/api/launches", { cache: "no-store" }),
          fetch("/api/fireballs", { cache: "no-store" }),
          fetch("/api/uaps", { cache: "no-store" }),
          fetch("/api/airquality", { cache: "no-store" }),
          fetch("/api/wildfires", { cache: "no-store" }),
          fetch("/api/disasters", { cache: "no-store" }),
          fetch("/api/outbreaks", { cache: "no-store" }),
          fetch("/api/waterstress", { cache: "no-store" }),
          fetch("/api/conflicts", { cache: "no-store" }),
        ]);
        const [
          earthquakePayload,
          buoyPayload,
          asteroidPayload,
          spaceWeatherPayload,
          launchPayload,
          fireballPayload,
          uapPayload,
          airQualityPayload,
          wildfirePayload,
          disasterPayload,
          outbreakPayload,
          waterStressPayload,
          conflictPayload,
        ] = await Promise.all([
          earthquakeResponse.json() as Promise<{ earthquakes?: EarthquakeEvent[]; timestamp?: string }>,
          buoyResponse.json() as Promise<{ buoys?: BuoyObservation[]; timestamp?: string }>,
          asteroidResponse.json() as Promise<{ asteroids?: AsteroidEvent[]; timestamp?: string }>,
          spaceWeatherResponse.json() as Promise<SpaceWeather & { success?: boolean }>,
          launchResponse.json() as Promise<{ launches?: LaunchEvent[]; timestamp?: string }>,
          fireballResponse.json() as Promise<{ fireballs?: FireballEvent[]; data?: FireballEvent[]; timestamp?: string }>,
          uapResponse.json() as Promise<{ uaps?: UapEvent[]; data?: UapEvent[]; timestamp?: string }>,
          airQualityResponse.json() as Promise<unknown>,
          wildfireResponse.json() as Promise<unknown>,
          disasterResponse.json() as Promise<unknown>,
          outbreakResponse.json() as Promise<unknown>,
          waterStressResponse.json() as Promise<unknown>,
          conflictResponse.json() as Promise<unknown>,
        ]);

        if (!cancelled) {
          const nextResilienceEvents = [
            ...normalizeResilienceEvents(airQualityPayload, "airquality", ["air_quality", "data", "items"]),
            ...normalizeResilienceEvents(wildfirePayload, "wildfires", ["wildfires", "data", "items"]),
            ...normalizeResilienceEvents(disasterPayload, "disasters", ["data", "disasters", "items"]),
            ...normalizeResilienceEvents(outbreakPayload, "outbreaks", ["data", "outbreaks", "items"]),
            ...normalizeResilienceEvents(waterStressPayload, "waterstress", ["data", "waterstress", "items"]),
            ...normalizeResilienceEvents(conflictPayload, "conflicts", ["data", "conflicts", "items"]),
          ];

          setEarthquakes(Array.isArray(earthquakePayload.earthquakes) ? earthquakePayload.earthquakes : []);
          setBuoys(Array.isArray(buoyPayload.buoys) ? buoyPayload.buoys : []);
          setAsteroids(Array.isArray(asteroidPayload.asteroids) ? asteroidPayload.asteroids : []);
          setSpaceWeather(typeof spaceWeatherPayload.current_kp === "number" ? spaceWeatherPayload : null);
          setLaunches(Array.isArray(launchPayload.launches) ? launchPayload.launches : []);
          setFireballs(Array.isArray(fireballPayload.fireballs) ? fireballPayload.fireballs : Array.isArray(fireballPayload.data) ? fireballPayload.data : []);
          setUaps(Array.isArray(uapPayload.uaps) ? uapPayload.uaps : Array.isArray(uapPayload.data) ? uapPayload.data : []);
          setResilienceEvents(nextResilienceEvents);
          setEarthLayerTimestamp(
            earthquakePayload.timestamp ??
            buoyPayload.timestamp ??
            asteroidPayload.timestamp ??
            launchPayload.timestamp ??
            fireballPayload.timestamp ??
            uapPayload.timestamp ??
            spaceWeatherPayload.timestamp ??
            null,
          );
        }
      } catch {
        if (!cancelled) {
          setEarthquakes([]);
          setBuoys([]);
          setAsteroids([]);
          setSpaceWeather(null);
          setLaunches([]);
          setFireballs([]);
          setUaps([]);
          setResilienceEvents([]);
          setEarthLayerTimestamp(null);
        }
      }
    }

    void loadEarthLayers();
    const interval = window.setInterval(loadEarthLayers, 300000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
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
  const visibleEarthquakes = liveLayers.earthquakes ? earthquakes.slice(0, 32) : [];
  const visibleBuoys = useMemo(
    () => (liveLayers.buoys ? getDistributedBuoys(buoys, 36) : []),
    [buoys, liveLayers.buoys],
  );
  const visibleAsteroids = liveLayers.asteroids ? asteroids.slice(0, 12) : [];
  const visibleSpaceWeather = liveLayers.spaceweather ? spaceWeather : null;
  const visibleLaunches = liveLayers.launches ? launches.slice(0, 5) : [];
  const visibleFireballs = liveLayers.fireballs ? fireballs.slice(0, 18) : [];
  const visibleUaps = liveLayers.uaps ? uaps : [];
  const visibleResilienceEvents = useMemo(
    () => {
      const visibleByLayer: Partial<Record<ResilienceLayer, number>> = {};

      return resilienceEvents.filter((event) => {
        if (!liveLayers[event.layer]) {
          return false;
        }

        const currentCount = visibleByLayer[event.layer] ?? 0;
        if (currentCount >= resilienceLayerMaxVisible[event.layer]) {
          return false;
        }

        visibleByLayer[event.layer] = currentCount + 1;
        return true;
      });
    },
    [liveLayers, resilienceEvents],
  );

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
    setSelectedEarthLayer(null);
    setActiveSpyRadioId(null);
    const nextSignal = category === "All" ? signals[0] : signals.find((signal) => signal.category === category);
    if (nextSignal) {
      setSelectedId(nextSignal.id);
    }
  }

  function selectSignal(id: string) {
    setActiveMission(null);
    setSelectedEarthLayer(null);
    setActiveSpyRadioId(null);
    setSelectedId(id);
  }

  function selectMission(mission: Mission) {
    setSelectedEarthLayer(null);
    setActiveSpyRadioId(null);
    setActiveMission(mission);
  }

  function selectEarthLayer(selection: EarthLayerSelection) {
    setActiveMission(null);
    setActiveSpyRadioId(null);
    setSelectedEarthLayer(selection);
  }

  function openSpyRadio() {
    setActiveMission(null);
    setSelectedEarthLayer(null);
    setActiveSpyRadioId(spyRadioStations[0].id);
  }

  function toggleLiveLayer(layer: LiveLayer) {
    setLiveLayers((current) => {
      const next = {
        ...current,
        [layer]: !current[layer],
      };

      if (layer === "satellites" && !next.satellites) {
        setActiveMission(null);
      }

      if (selectedEarthLayer?.type === "earthquake" && layer === "earthquakes" && !next.earthquakes) {
        setSelectedEarthLayer(null);
      }

      if (selectedEarthLayer?.type === "buoy" && layer === "buoys" && !next.buoys) {
        setSelectedEarthLayer(null);
      }

      if (selectedEarthLayer?.type === "asteroid" && layer === "asteroids" && !next.asteroids) {
        setSelectedEarthLayer(null);
      }

      if (selectedEarthLayer?.type === "spaceweather" && layer === "spaceweather" && !next.spaceweather) {
        setSelectedEarthLayer(null);
      }

      if (selectedEarthLayer?.type === "launch" && layer === "launches" && !next.launches) {
        setSelectedEarthLayer(null);
      }

      if (selectedEarthLayer?.type === "fireball" && layer === "fireballs" && !next.fireballs) {
        setSelectedEarthLayer(null);
      }

      if (selectedEarthLayer?.type === "uap" && layer === "uaps" && !next.uaps) {
        setSelectedEarthLayer(null);
      }

      if (selectedEarthLayer?.type === "resilience" && selectedEarthLayer.item.layer === layer && !next[layer]) {
        setSelectedEarthLayer(null);
      }

      if (layer === "radio" && !next.radio) {
        setActiveSpyRadioId(null);
      }

      return next;
    });
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
              <div className={styles.layerFilters} aria-label="Live layer filters">
                {([
                  ["earthquakes", `Quakes ${earthquakes.length}`],
                  ["buoys", `Buoys ${visibleBuoys.length}`],
                  ["asteroids", `NEO ${visibleAsteroids.length}`],
                  ["spaceweather", `Kp ${spaceWeather ? spaceWeather.current_kp.toFixed(1) : "-"}`],
                  ["launches", `Launches ${visibleLaunches.length}`],
                  ["fireballs", `Bolides ${fireballs.length}`],
                  ["uaps", `UAP ${uaps.length}`],
                  ["wildfires", `Fire ${resilienceEvents.filter((event) => event.layer === "wildfires").length}`],
                  ["airquality", `Air ${resilienceEvents.filter((event) => event.layer === "airquality").length}`],
                  ["disasters", `GDACS ${resilienceEvents.filter((event) => event.layer === "disasters").length}`],
                  ["waterstress", "Water"],
                  ["outbreaks", "Disease"],
                  ["conflicts", "Conflict"],
                  ["radio", "Radio"],
                  ["satellites", "Satellites"],
                ] as const).map(([layer, label]) => (
                  <button
                    key={layer}
                    type="button"
                    className={liveLayers[layer] ? styles.layerActive : ""}
                    onClick={() => toggleLiveLayer(layer)}
                  >
                    <span />
                    <b>{label}</b>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.mapSurface}>
              <div className={styles.mapStatus} aria-hidden="true">
                <span>Rotating globe / strategic signal layer</span>
                <span>
                  {filteredSignals.length} signals / {visibleEarthquakes.length} quakes / {visibleFireballs.length} bolides / {visibleResilienceEvents.length} earth layers
                </span>
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
                onSelectMission={selectMission}
                showSatellites={liveLayers.satellites}
                earthquakes={visibleEarthquakes}
                buoys={visibleBuoys}
                asteroids={visibleAsteroids}
                spaceWeather={visibleSpaceWeather}
                launches={visibleLaunches}
                fireballs={visibleFireballs}
                uaps={visibleUaps}
                resilienceEvents={visibleResilienceEvents}
                showRadio={liveLayers.radio}
                radioActive={activeSpyRadioId !== null}
                onOpenRadio={openSpyRadio}
                selectedEarthLayer={selectedEarthLayer}
                onSelectEarthLayer={selectEarthLayer}
              />
              {activeSpyRadioId ? (
                <SpyRadio
                  station={spyRadioStations.find((station) => station.id === activeSpyRadioId) ?? spyRadioStations[0]}
                  onClose={() => setActiveSpyRadioId(null)}
                />
              ) : null}
            </div>
          </div>

          <aside className={styles.sidePanel} aria-label="Research signal detail">
            {selectedEarthLayer ? (
              <article className={styles.signalCard} aria-live="polite">
                <div className={styles.cardMeta}>
                  <span>
                    {selectedEarthLayer.type === "earthquake" ? "Seismic anomaly" : null}
                    {selectedEarthLayer.type === "buoy" ? "Ocean buoy" : null}
                    {selectedEarthLayer.type === "asteroid" ? "Near-Earth object" : null}
                    {selectedEarthLayer.type === "spaceweather" ? "Magnetic field" : null}
                    {selectedEarthLayer.type === "launch" ? "Launch window" : null}
                    {selectedEarthLayer.type === "fireball" ? "Atmospheric bolide" : null}
                    {selectedEarthLayer.type === "uap" ? "Declassified anomaly" : null}
                    {selectedEarthLayer.type === "resilience" ? resilienceLayerMeta[selectedEarthLayer.item.layer].label : null}
                  </span>
                  <span>
                    {selectedEarthLayer.type === "earthquake" ? "USGS live" : null}
                    {selectedEarthLayer.type === "buoy" ? "NOAA NDBC" : null}
                    {selectedEarthLayer.type === "asteroid" ? "NASA/JPL CAD" : null}
                    {selectedEarthLayer.type === "spaceweather" ? "NOAA SWPC" : null}
                    {selectedEarthLayer.type === "launch" ? "Launch Library" : null}
                    {selectedEarthLayer.type === "fireball" ? "NASA CNEOS" : null}
                    {selectedEarthLayer.type === "uap" ? selectedEarthLayer.item.sourceName : null}
                    {selectedEarthLayer.type === "resilience" ? selectedEarthLayer.item.sourceName : null}
                  </span>
                  <span>
                    {selectedEarthLayer.type === "resilience"
                      ? getLayerStatusLabel(selectedEarthLayer.item.sourceMode)
                      : earthLayerTimestamp
                        ? new Date(earthLayerTimestamp).toLocaleTimeString("en-GB")
                        : "live"}
                  </span>
                </div>
                {selectedEarthLayer.type === "earthquake" ? (
                  <>
                    <h2>{selectedEarthLayer.item.title}</h2>
                    <p className={styles.location}>{selectedEarthLayer.item.place}</p>
                    <p>
                      Magnitude {selectedEarthLayer.item.magnitude.toFixed(1)} at {selectedEarthLayer.item.coordinates.depth_km.toFixed(1)} km depth.
                      {selectedEarthLayer.item.tsunami ? " Tsunami flag active." : ""}
                    </p>
                    <div className={styles.liveMetrics}>
                      <div>
                        <span>Magnitude</span>
                        <strong>{selectedEarthLayer.item.magnitude.toFixed(1)}</strong>
                      </div>
                      <div>
                        <span>Depth</span>
                        <strong>{selectedEarthLayer.item.coordinates.depth_km.toFixed(0)} km</strong>
                      </div>
                      <div>
                        <span>Alert</span>
                        <strong>{selectedEarthLayer.item.tsunami ? "Tsunami" : selectedEarthLayer.item.alert ?? "Monitor"}</strong>
                      </div>
                    </div>
                    {selectedEarthLayer.item.url ? (
                      <div className={styles.sourceRow}>
                        <a href={selectedEarthLayer.item.url} target="_blank" rel="noreferrer">
                      Open USGS event
                        </a>
                      </div>
                    ) : null}
                  </>
                ) : null}
                {selectedEarthLayer.type === "buoy" ? (
                  <>
                    <h2>Buoy {selectedEarthLayer.item.id}</h2>
                    <p className={styles.location}>Open ocean observation / NOAA NDBC</p>
                    <p>
                      Live marine conditions from an offshore station. Markers bob against the globe using reported wave height.
                    </p>
                    <div className={styles.liveMetrics}>
                      <div>
                        <span>Wave</span>
                        <strong>{selectedEarthLayer.item.waveHeight_m === null ? "MM" : `${selectedEarthLayer.item.waveHeight_m.toFixed(1)} m`}</strong>
                      </div>
                      <div>
                        <span>Wind</span>
                        <strong>{selectedEarthLayer.item.windSpeed_ms === null ? "MM" : `${selectedEarthLayer.item.windSpeed_ms.toFixed(1)} m/s`}</strong>
                      </div>
                      <div>
                        <span>Water</span>
                        <strong>{selectedEarthLayer.item.waterTemp_c === null ? "MM" : `${selectedEarthLayer.item.waterTemp_c.toFixed(1)} C`}</strong>
                      </div>
                    </div>
                    {(selectedEarthLayer.item.waveHeight_m ?? 0) > 5 ? (
                      <p className={styles.warningNote}>Gale / high surf warning threshold crossed.</p>
                    ) : null}
                  </>
                ) : null}
                {selectedEarthLayer.type === "asteroid" ? (
                  <>
                    <h2>{selectedEarthLayer.item.name}</h2>
                    <p className={styles.location}>Close approach / {selectedEarthLayer.item.close_approach_date}</p>
                    <p>
                      A near-Earth object passing within the active JPL monitor window. The orange orbit is spatialised around the globe to show proximity, not exact trajectory.
                    </p>
                    <div className={styles.liveMetrics}>
                      <div>
                        <span>Distance</span>
                        <strong>{formatNullableMetric(selectedEarthLayer.item.distance_lunar, "LD", 2)}</strong>
                      </div>
                      <div>
                        <span>Velocity</span>
                        <strong>{formatNullableMetric(selectedEarthLayer.item.velocity_kms, "km/s", 2)}</strong>
                      </div>
                      <div>
                        <span>Size</span>
                        <strong>{formatNullableMetric(selectedEarthLayer.item.estimated_size_meters, "m", 0)}</strong>
                      </div>
                    </div>
                    {selectedEarthLayer.item.is_hazard ? (
                      <p className={styles.warningNote}>Visual risk threshold active. Monitor close approach window.</p>
                    ) : null}
                  </>
                ) : null}
                {selectedEarthLayer.type === "spaceweather" ? (
                  <>
                    <h2>{selectedEarthLayer.item.condition}</h2>
                    <p className={styles.location}>Planetary K-index / magnetic field state</p>
                    <p>
                      The shield around the globe reflects current NOAA space-weather intensity. Higher Kp values mean stronger geomagnetic disturbance and higher satellite communication risk.
                    </p>
                    <div className={styles.liveMetrics}>
                      <div>
                        <span>Kp index</span>
                        <strong>{selectedEarthLayer.item.current_kp.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span>Status</span>
                        <strong>{selectedEarthLayer.item.is_storm ? "Storm" : "Quiet"}</strong>
                      </div>
                      <div>
                        <span>Stations</span>
                        <strong>{selectedEarthLayer.item.station_count ?? "unknown"}</strong>
                      </div>
                    </div>
                    {selectedEarthLayer.item.is_storm ? (
                      <p className={styles.warningNote}>Geomagnetic storm threshold crossed. Satellite channels may degrade.</p>
                    ) : null}
                  </>
                ) : null}
                {selectedEarthLayer.type === "launch" ? (
                  <>
                    <h2>{selectedEarthLayer.item.name}</h2>
                    <p className={styles.location}>{selectedEarthLayer.item.pad.name} / {selectedEarthLayer.item.pad.location}</p>
                    <p>
                      {selectedEarthLayer.item.mission_description ??
                        "Upcoming launch window from the public Launch Library feed."}
                    </p>
                    <div className={styles.liveMetrics}>
                      <div>
                        <span>Countdown</span>
                        <strong>{formatLaunchCountdown(selectedEarthLayer.item.net)}</strong>
                      </div>
                      <div>
                        <span>Provider</span>
                        <strong>{selectedEarthLayer.item.provider}</strong>
                      </div>
                      <div>
                        <span>Status</span>
                        <strong>{selectedEarthLayer.item.status}</strong>
                      </div>
                    </div>
                    {selectedEarthLayer.item.net ? (
                      <div className={styles.sourceRow}>
                        <span>{new Date(selectedEarthLayer.item.net).toLocaleString("en-GB")}</span>
                      </div>
                    ) : null}
                  </>
                ) : null}
                {selectedEarthLayer.type === "fireball" ? (
                  <>
                    <h2>Atmospheric fireball</h2>
                    <p className={styles.location}>NASA CNEOS / {selectedEarthLayer.item.timestamp}</p>
                    <p>{selectedEarthLayer.item.description}</p>
                    <div className={styles.liveMetrics}>
                      <div>
                        <span>Energy</span>
                        <strong>{formatEnergyJoules(selectedEarthLayer.item.energy_joules)}</strong>
                      </div>
                      <div>
                        <span>Altitude</span>
                        <strong>{formatNullableMetric(selectedEarthLayer.item.altitude_km, "km", 1)}</strong>
                      </div>
                      <div>
                        <span>Velocity</span>
                        <strong>{formatNullableMetric(selectedEarthLayer.item.velocity_kms, "km/s", 1)}</strong>
                      </div>
                    </div>
                    <p className={styles.warningNote}>Bolide burst detected by government sensor network. Position marks atmospheric explosion, not surface impact.</p>
                    <div className={styles.sourceRow}>
                      <a href="https://cneos.jpl.nasa.gov/fireballs/" target="_blank" rel="noreferrer">
                        Open NASA CNEOS fireball feed
                      </a>
                    </div>
                  </>
                ) : null}
                {selectedEarthLayer.type === "uap" ? (
                  <>
                    <h2>{selectedEarthLayer.item.title}</h2>
                    <p className={styles.location}>{selectedEarthLayer.item.location} / {selectedEarthLayer.item.classification}</p>
                    <p>{selectedEarthLayer.item.description}</p>
                    <div className={styles.liveMetrics}>
                      <div>
                        <span>Shape</span>
                        <strong>{selectedEarthLayer.item.shape}</strong>
                      </div>
                      <div>
                        <span>Altitude</span>
                        <strong>{selectedEarthLayer.item.altitude_ft === null ? "Unknown" : `${selectedEarthLayer.item.altitude_ft.toLocaleString("en-GB")} ft`}</strong>
                      </div>
                      <div>
                        <span>Speed</span>
                        <strong>{selectedEarthLayer.item.speed_mach}</strong>
                      </div>
                    </div>
                    <p className={styles.warningNote}>Static reference layer. These are known declassified cases, not live radar contacts.</p>
                    <div className={styles.sourceRow}>
                      <span>{new Date(selectedEarthLayer.item.timestamp).toLocaleDateString("en-GB")}</span>
                      <a href={selectedEarthLayer.item.sourceUrl} target="_blank" rel="noreferrer">
                        Open declassified source
                      </a>
                    </div>
                  </>
                ) : null}
                {selectedEarthLayer.type === "resilience" ? (
                  <>
                    <h2>{selectedEarthLayer.item.title}</h2>
                    <p className={styles.location}>{selectedEarthLayer.item.subtitle} / {resilienceLayerLabels[selectedEarthLayer.item.layer]}</p>
                    <p>{selectedEarthLayer.item.description}</p>
                    <div className={styles.liveMetrics}>
                      <div>
                        <span>Layer</span>
                        <strong>{resilienceLayerMeta[selectedEarthLayer.item.layer].label}</strong>
                      </div>
                      <div>
                        <span>Status</span>
                        <strong>{selectedEarthLayer.item.severity}</strong>
                      </div>
                      <div>
                        <span>Reading</span>
                        <strong>{selectedEarthLayer.item.valueLabel}</strong>
                      </div>
                    </div>
                    {selectedEarthLayer.item.sourceMode !== "live" ? (
                      <p className={styles.warningNote}>
                        {selectedEarthLayer.item.sourceMode === "requires_licensed_source"
                          ? "Scaffold only. A licensed real data source is required before this layer can show live events."
                          : "Reference layer. Useful for context, but not a real-time event feed."}
                      </p>
                    ) : null}
                    <div className={styles.sourceRow}>
                      <span>{selectedEarthLayer.item.sourceName}</span>
                      {selectedEarthLayer.item.observedAt ? <span>{selectedEarthLayer.item.observedAt}</span> : null}
                      {selectedEarthLayer.item.sourceUrl ? (
                        <a href={selectedEarthLayer.item.sourceUrl} target="_blank" rel="noreferrer">
                          Open source
                        </a>
                      ) : null}
                    </div>
                  </>
                ) : null}
                <button type="button" className={styles.panelAction} onClick={() => setSelectedEarthLayer(null)}>
                  Return to signal detail
                </button>
              </article>
            ) : activeSatellite ? (
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
                        <span className={styles.missionMetaRow}>
                          <span>{signal.category}</span>
                          {getConfidenceLabel(signal.confidence) ? (
                            <span className={styles.confidenceBadge} data-confidence={signal.confidence}>
                              {getConfidenceLabel(signal.confidence)}
                            </span>
                          ) : null}
                        </span>
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
                {(selectedSignal.sourceUrl || selectedSignal.sourceName || selectedSignal.publishedAt || selectedSignal.confidence) ? (
                  <div className={styles.sourceRow}>
                    {selectedSignal.sourceName ? <span>{selectedSignal.sourceName}</span> : null}
                    {getConfidenceLabel(selectedSignal.confidence) ? (
                      <span className={styles.confidenceBadge} data-confidence={selectedSignal.confidence}>
                        {getConfidenceLabel(selectedSignal.confidence)}
                      </span>
                    ) : null}
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

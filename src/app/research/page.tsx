"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { geoEqualEarth, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldAtlas from "world-atlas/countries-110m.json";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import styles from "./research.module.css";

// Natural Earth via world-atlas keeps the map geodata-based without a heavy map runtime.
type SignalCategory =
  | "Infrastructure"
  | "Training"
  | "Autonomy"
  | "Climate"
  | "Security"
  | "Spatial (XR)"
  | "Nano"
  | "Quantum";

type Signal = {
  id: string;
  title: string;
  location: string;
  region: string;
  category: SignalCategory;
  x: number;
  y: number;
  intensity: number;
  momentum: string;
  summary: string;
};

type SignalCluster = {
  id: string;
  label: string;
  x: number;
  y: number;
  signalIds: string[];
};

type ResearchMapPayload = {
  categories: Array<SignalCategory | "All">;
  signals: Signal[];
  clusters: SignalCluster[];
};

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
    "Infrastructure",
    "Training",
    "Autonomy",
    "Climate",
    "Security",
    "Spatial (XR)",
    "Nano",
    "Quantum",
  ],
  signals: [
  {
    id: "SIG-001",
    title: "Arctic logistics corridors",
    location: "Tromso / Kiruna",
    region: "Nordics",
    category: "Infrastructure",
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
    category: "Training",
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
    category: "Security",
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
    category: "Autonomy",
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
    category: "Climate",
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
    category: "Security",
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
    category: "Infrastructure",
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
    category: "Security",
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
    category: "Autonomy",
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
    category: "Spatial (XR)",
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
    category: "Infrastructure",
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
    category: "Security",
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
    category: "Infrastructure",
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
    category: "Climate",
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
    category: "Autonomy",
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
    category: "Training",
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
    category: "Security",
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
    category: "Nano",
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
    category: "Training",
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
    category: "Climate",
    x: 90,
    y: 70,
    intensity: 75,
    momentum: "+15%",
    summary: "Climate response and strategic access needs are reshaping small-island logistics planning.",
  },
  {
    id: "SIG-021",
    title: "West Coast wildfire command",
    location: "California",
    region: "North America",
    category: "Climate",
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
    category: "Infrastructure",
    x: 12,
    y: 24,
    intensity: 77,
    momentum: "+9%",
    summary: "Cold-region logistics and energy resilience are returning as strategic planning priorities.",
  },
  {
    id: "SIG-023",
    title: "Great Lakes industrial resilience",
    location: "Detroit / Toronto",
    region: "Great Lakes",
    category: "Nano",
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
    category: "Climate",
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
    category: "Infrastructure",
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
    category: "Spatial (XR)",
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
    category: "Security",
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
    category: "Spatial (XR)",
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

const categoryAccent: Record<SignalCategory, string> = {
  Infrastructure: "#c4a36f",
  Training: "#d7d0c3",
  Autonomy: "#9eb2a5",
  Climate: "#8fa3b8",
  Security: "#b78d72",
  "Spatial (XR)": "#b79be0",
  Nano: "#78c4a0",
  Quantum: "#88bfe0",
};

const priorityTrendIds = [
  "SIG-016",
  "SIG-001",
  "SIG-003",
  "SIG-011",
  "SIG-002",
  "SIG-015",
  "SIG-029",
  "SIG-030",
  "SIG-031",
  "SIG-014",
];

function getSignalSize(intensity: number) {
  return 9 + Math.round((intensity - 60) / 6);
}

export default function ResearchPage() {
  const { categories, signals, clusters } = researchMapData;
  const [activeCategory, setActiveCategory] = useState<SignalCategory | "All">("All");
  const [selectedId, setSelectedId] = useState(signals[0].id);

  const filteredSignals = useMemo(
    () =>
      activeCategory === "All"
        ? signals
        : signals.filter((signal) => signal.category === activeCategory),
    [activeCategory],
  );

  const selectedSignal =
    filteredSignals.find((signal) => signal.id === selectedId) ?? filteredSignals[0] ?? signals[0];

  const topTrends = useMemo(
    () =>
      priorityTrendIds
        .map((id) => signals.find((signal) => signal.id === id))
        .filter((signal): signal is Signal => Boolean(signal)),
    [signals],
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

  function selectCategory(category: SignalCategory | "All") {
    setActiveCategory(category);
    const nextSignal = category === "All" ? signals[0] : signals.find((signal) => signal.category === category);
    if (nextSignal) {
      setSelectedId(nextSignal.id);
    }
  }

  return (
    <>
      <Header />
      <main className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>Centari Research Observatory</p>
            <h1>Research Map</h1>
            <p>
              A live working surface for strategic signals across infrastructure, readiness,
              autonomy, climate pressure, and security posture.
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
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.mapSurface}>
              <div className={styles.mapStatus} aria-hidden="true">
                <span>Equal Earth / strategic signal layer</span>
                <span>{filteredSignals.length} visible signals</span>
              </div>
              <svg className={styles.worldMap} viewBox="0 0 1000 520" role="img" aria-label="World map signal surface">
                <defs>
                  <linearGradient id="landGradient" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#334039" />
                    <stop offset="100%" stopColor="#18201d" />
                  </linearGradient>
                </defs>
                <g className={styles.mapGraticule} aria-hidden="true">
                  {graticuleLines.map((line) => (
                    <path key={line} d={line} />
                  ))}
                </g>
                <g className={styles.landMasses}>
                  {countryPaths.map((path, index) => (
                    <path key={index} d={path} />
                  ))}
                </g>
                {borderPath ? <path className={styles.countryBorders} d={borderPath} /> : null}
                <g className={styles.mapLabels} aria-hidden="true">
                  <text x="125" y="121">NORTH AMERICA</text>
                  <text x="244" y="342">SOUTH AMERICA</text>
                  <text x="482" y="140">EUROPE</text>
                  <text x="514" y="318">AFRICA</text>
                  <text x="744" y="171">ASIA</text>
                  <text x="780" y="420">AUSTRALIA</text>
                </g>
              </svg>

              <div className={styles.gridOverlay} aria-hidden="true" />
              <div className={styles.coordinateFrame} aria-hidden="true">
                <span>72N</span>
                <span>0</span>
                <span>72S</span>
              </div>

              {visibleClusters.map((cluster) => {
                const primarySignal = cluster.signals.reduce((strongest, signal) =>
                  signal.intensity > strongest.intensity ? signal : strongest,
                );
                const size = getSignalSize(primarySignal.intensity) + cluster.signals.length * 3;
                const selected = cluster.signals.some((signal) => signal.id === selectedSignal.id);

                return (
                  <button
                    key={cluster.id}
                    type="button"
                    className={`${styles.hotspot} ${selected ? styles.hotspotSelected : ""}`}
                    style={
                      {
                        left: `${cluster.x}%`,
                        top: `${cluster.y}%`,
                        width: `${size}px`,
                        height: `${size}px`,
                        "--signal-color": categoryAccent[primarySignal.category],
                    } as CSSProperties
                    }
                    onClick={() => setSelectedId(primarySignal.id)}
                    aria-label={`${cluster.label}, ${cluster.signals.length} signals`}
                  >
                    <span>{cluster.signals.length}</span>
                  </button>
                );
              })}

              <article className={styles.signalCard} aria-live="polite">
                <div className={styles.cardMeta}>
                  <span>{selectedSignal.id}</span>
                  <span>{selectedSignal.category}</span>
                  <span>{selectedSignal.momentum}</span>
                </div>
                <h3>{selectedSignal.title}</h3>
                <p className={styles.location}>{selectedSignal.location} / {selectedSignal.region}</p>
                <p>{selectedSignal.summary}</p>
                <div className={styles.intensity}>
                  <span>Signal intensity</span>
                  <strong>{selectedSignal.intensity}</strong>
                  <i style={{ transform: `scaleX(${selectedSignal.intensity / 100})` }} />
                </div>
              </article>
            </div>
          </div>

          <aside className={styles.trendsPanel} aria-label="Top 10 trends">
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
                    onClick={() => setSelectedId(trend.id)}
                    style={{ "--signal-color": categoryAccent[trend.category] } as CSSProperties}
                  >
                    <span className={styles.rank}>{String(index + 1).padStart(2, "0")}</span>
                    <span>
                      <strong>{trend.title}</strong>
                      <em>{trend.region} / {trend.category}</em>
                    </span>
                    <b>{trend.intensity}</b>
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        </section>
      </main>
      <Footer />
    </>
  );
}

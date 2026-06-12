"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import styles from "./research.module.css";

type SignalCategory = "Infrastructure" | "Training" | "Autonomy" | "Climate" | "Security";

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

const categories: Array<SignalCategory | "All"> = [
  "All",
  "Infrastructure",
  "Training",
  "Autonomy",
  "Climate",
  "Security",
];

const signals: Signal[] = [
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
    category: "Training",
    x: 57,
    y: 53,
    intensity: 67,
    momentum: "+6%",
    summary: "Urban crisis rehearsal is shifting from static tabletop exercises into live model environments.",
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
    category: "Autonomy",
    x: 86,
    y: 47,
    intensity: 71,
    momentum: "+7%",
    summary: "Disaster response robotics are creating operational lessons for hazardous-site autonomy.",
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
    category: "Infrastructure",
    x: 26,
    y: 42,
    intensity: 70,
    momentum: "+6%",
    summary: "Manufacturing resilience programs need supply-chain simulations tied to physical capacity.",
  },
  {
    id: "SIG-024",
    title: "East Coast cyber-physical exercises",
    location: "Washington / Boston",
    region: "North America",
    category: "Training",
    x: 31,
    y: 45,
    intensity: 80,
    momentum: "+11%",
    summary: "Infrastructure security exercises are merging cyber incidents with physical operations.",
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
    category: "Security",
    x: 47,
    y: 82,
    intensity: 64,
    momentum: "+4%",
    summary: "Maritime awareness programs are expanding into fisheries, shipping, and infrastructure protection.",
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
];

const categoryAccent: Record<SignalCategory, string> = {
  Infrastructure: "#c4a36f",
  Training: "#d7d0c3",
  Autonomy: "#9eb2a5",
  Climate: "#8fa3b8",
  Security: "#b78d72",
};

function getSignalSize(intensity: number) {
  return 9 + Math.round((intensity - 60) / 6);
}

export default function ResearchPage() {
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
    () => [...signals].sort((a, b) => b.intensity - a.intensity).slice(0, 10),
    [],
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
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.mapSurface}>
              <div className={styles.mapStatus} aria-hidden="true">
                <span>Mercator / strategic signal layer</span>
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
                  <path d="M80 95H920" />
                  <path d="M80 175H920" />
                  <path d="M80 255H920" />
                  <path d="M80 335H920" />
                  <path d="M80 415H920" />
                  <path d="M170 54V468" />
                  <path d="M330 54V468" />
                  <path d="M500 54V468" />
                  <path d="M670 54V468" />
                  <path d="M830 54V468" />
                </g>
                <g className={styles.landMasses}>
                  <path d="M98 132 132 93 192 72 254 86 304 124 337 180 314 222 261 229 221 211 179 229 133 207 92 170Z" />
                  <path d="M252 228 294 249 330 296 338 358 311 424 268 475 232 438 208 377 184 327 202 273Z" />
                  <path d="M397 123 458 82 540 73 628 92 675 130 660 168 598 178 556 160 497 185 434 168Z" />
                  <path d="M476 188 538 191 586 225 632 286 618 355 573 431 518 454 477 397 454 323 428 269Z" />
                  <path d="M640 126 716 88 813 86 900 123 944 174 925 234 858 257 786 246 725 218 664 197Z" />
                  <path d="M711 255 777 275 839 321 861 384 833 442 767 454 720 408 696 339Z" />
                  <path d="M810 406 877 412 928 448 909 487 845 492 799 461Z" />
                  <path d="M72 80 145 49 243 55 322 93 296 122 197 102 118 106Z" />
                  <path d="M488 63 590 42 704 57 756 93 709 116 617 103 527 89Z" />
                  <path d="M351 448 421 431 505 456 536 486 459 505 378 488Z" />
                </g>
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

              {filteredSignals.map((signal) => {
                const size = getSignalSize(signal.intensity);
                const selected = signal.id === selectedSignal.id;

                return (
                  <button
                    key={signal.id}
                    type="button"
                    className={`${styles.hotspot} ${selected ? styles.hotspotSelected : ""}`}
                    style={
                      {
                        left: `${signal.x}%`,
                        top: `${signal.y}%`,
                        width: `${size}px`,
                        height: `${size}px`,
                        "--signal-color": categoryAccent[signal.category],
                    } as CSSProperties
                    }
                    onClick={() => setSelectedId(signal.id)}
                    aria-label={`${signal.title}, ${signal.location}`}
                  >
                    <span />
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

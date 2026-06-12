export type JournalEntryType =
  | "Research Notes"
  | "Field Notes"
  | "Product Logs"
  | "Signal Briefs"
  | "Essays";

export interface JournalEntry {
  id: string;
  slug: string;
  title: string;
  type: JournalEntryType;
  date: string;
  location: string;
  deck: string;
  summary: string;
  calibration: string;
  readTime: string;
}

export const journalEntries: JournalEntry[] = [
  {
    id: "JNL-001",
    slug: "before-reality-research-surface",
    title: "Before Reality as a Research Surface",
    type: "Essays",
    date: "2026-06-12",
    location: "Centari Studio",
    deck: "Editorial baseline for the work before it becomes product.",
    summary:
      "A note on why Centari treats research, simulation, and product development as one calibrated operating surface.",
    calibration: "Editorial baseline",
    readTime: "5 min",
  },
  {
    id: "JNL-002",
    slug: "research-map-public-signal-layer",
    title: "Research Map: Public Signal Layer",
    type: "Product Logs",
    date: "2026-06-11",
    location: "Product log",
    deck: "A public map for signals, not the core machine.",
    summary:
      "How the Research Map is being shaped as a fast public intelligence surface without exposing the core Centari system.",
    calibration: "Launch readiness",
    readTime: "4 min",
  },
  {
    id: "JNL-003",
    slug: "spatial-systems-and-operational-judgment",
    title: "Spatial Systems and Operational Judgment",
    type: "Research Notes",
    date: "2026-06-09",
    location: "Research desk",
    deck: "When spatial interfaces stop being demos and start becoming infrastructure.",
    summary:
      "A compact brief on spatial interfaces, mission rehearsal, and where XR becomes useful infrastructure instead of theatre.",
    calibration: "Spatial / XR",
    readTime: "6 min",
  },
  {
    id: "JNL-004",
    slug: "nordic-field-resilience",
    title: "Nordic Field Resilience",
    type: "Field Notes",
    date: "2026-06-06",
    location: "Nordics",
    deck: "Notes from environments where abstraction has to answer to weather.",
    summary:
      "Observations on cold-region logistics, low-visibility operations, and why harsh environments punish generic software.",
    calibration: "Field condition",
    readTime: "3 min",
  },
  {
    id: "JNL-005",
    slug: "quantum-resistant-network-signals",
    title: "Quantum-Resistant Network Signals",
    type: "Signal Briefs",
    date: "2026-06-03",
    location: "Signal watch",
    deck: "Post-quantum planning is becoming operational, not theoretical.",
    summary:
      "Early indicators that post-quantum migration is moving from technical planning into operational risk models.",
    calibration: "Signal brief",
    readTime: "4 min",
  },
];

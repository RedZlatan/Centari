export type JournalEntryType =
  | "Brain Map"
  | "Memory Bank"
  | "Field Notes"
  | "Product Logs"
  | "Signal Briefs";

export type JournalSense = "Sight" | "Sound" | "Touch" | "Space" | "Memory" | "Decision";

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
  senses: JournalSense[];
  body: string[];
  references: string[];
}

export const journalEntries: JournalEntry[] = [
  {
    id: "JNL-001",
    slug: "before-reality-research-surface",
    title: "Why We Keep a Memory Bank",
    type: "Brain Map",
    date: "2026-06-12",
    location: "Centari Studio",
    deck: "A note on keeping lessons before they become product claims.",
    summary:
      "The journal starts as a place to save useful lessons, references, and stories we want to return to.",
    calibration: "Editorial baseline",
    readTime: "5 min",
    senses: ["Sight", "Space", "Decision"],
    body: [
      "Most systems become fixed too early. A sketch becomes a roadmap, a roadmap becomes a budget, and soon nobody remembers which parts were proven and which parts were still intuition.",
      "Centari needs a place before the finished product where useful ideas can stay open. The journal is that place: a calm record of references, field notes, product lessons, and things worth returning to.",
      "Over time this should become less like a blog and more like a mapped memory.",
    ],
    references: ["Research map", "Vision room", "Control room"],
  },
  {
    id: "JNL-002",
    slug: "research-map-public-signal-layer",
    title: "The Research Map",
    type: "Product Logs",
    date: "2026-06-11",
    location: "Product log",
    deck: "What the public map should show first.",
    summary:
      "The Research Map should help people see useful signals without pretending to be the full Centari system.",
    calibration: "Launch readiness",
    readTime: "4 min",
    senses: ["Sight", "Space", "Decision"],
    body: [
      "The public Research Map should feel alive without pretending to be the whole intelligence engine. It is there for orientation: what signals are emerging, where they cluster, and why they might matter.",
      "More APIs can come later. For launch, the priority is clarity, speed, and a visual language that can absorb more sources without turning into a messy dashboard.",
      "A good map invites inspection, then gets out of the way.",
    ],
    references: ["Signal layer", "API roadmap", "Trend watchlist"],
  },
  {
    id: "JNL-003",
    slug: "spatial-systems-and-operational-judgment",
    title: "Spatial Learning",
    type: "Brain Map",
    date: "2026-06-09",
    location: "Research desk",
    deck: "Why space can make learning easier to remember.",
    summary:
      "A short note on spatial interfaces, memory, and when 3D becomes useful instead of decorative.",
    calibration: "Spatial learning",
    readTime: "6 min",
    senses: ["Sight", "Touch", "Space", "Memory"],
    body: [
      "Spatial interfaces become useful when they make a system easier to understand, remember, and return to.",
      "That means less floating UI for its own sake and more attention to memory: where something was, what changed, and what the body learns by coming back to the same structure.",
      "The best spatial systems are not escapes from reality. They are rehearsal rooms for it.",
    ],
    references: ["XR interfaces", "Digital twins", "Training environments"],
  },
  {
    id: "JNL-004",
    slug: "nordic-field-resilience",
    title: "Field Notes: Nordic Conditions",
    type: "Field Notes",
    date: "2026-06-06",
    location: "Nordics",
    deck: "Notes from places where software has to answer to weather.",
    summary:
      "Observations on cold-region logistics, low-visibility operations, and why harsh environments punish generic software.",
    calibration: "Field condition",
    readTime: "3 min",
    senses: ["Touch", "Space", "Decision"],
    body: [
      "Harsh environments are useful critics. They show which assumptions were designed indoors.",
      "Interfaces that work in ideal conditions often fail when gloves, glare, fatigue, and low bandwidth enter the room. This is not only a hardware problem. It is a product philosophy problem.",
      "Centari's field notes track the places where reality pushes back.",
    ],
    references: ["Cold-region logistics", "Field interface constraints", "Resilience planning"],
  },
  {
    id: "JNL-005",
    slug: "quantum-resistant-network-signals",
    title: "Signals to Return To",
    type: "Signal Briefs",
    date: "2026-06-03",
    location: "Signal watch",
    deck: "A lane for outside signals we should not lose.",
    summary:
      "Short notes for subjects that are not urgent today, but may matter later.",
    calibration: "Signal brief",
    readTime: "4 min",
    senses: ["Memory", "Decision"],
    body: [
      "Some signals matter before they are urgent. They need a place to live while they are still forming.",
      "This lane is for short outside notes: papers, tools, shifts, and questions that may become important later.",
      "The point is not to close the topic. It is to mark it for return.",
    ],
    references: ["Cryptographic transition", "Network resilience", "Long-horizon risk"],
  },
  {
    id: "JNL-006",
    slug: "memory-bank-notes-on-learning",
    title: "Stories We Keep",
    type: "Memory Bank",
    date: "2026-06-01",
    location: "Memory bank",
    deck: "A place for stories, references, and repeated lessons.",
    summary:
      "Why Centari's journal keeps a separate lane for stories that should be returned to, not merely consumed once.",
    calibration: "Learning archive",
    readTime: "5 min",
    senses: ["Memory", "Sound", "Space"],
    body: [
      "A memory bank is different from a blog archive. It is not ordered only by date. It is ordered by return: what we need to find again when a similar problem appears.",
      "Some entries will be our own lessons. Others will point outward to books, projects, papers, and field stories that shaped the work.",
      "Over time this becomes a map of how Centari learned.",
    ],
    references: ["Learning loops", "Reference library", "Operational memory"],
  },
];

export const journalEntryTypes: JournalEntryType[] = [
  "Brain Map",
  "Memory Bank",
  "Field Notes",
  "Product Logs",
  "Signal Briefs",
];

export function getJournalEntry(slug: string) {
  return journalEntries.find((entry) => entry.slug === slug);
}

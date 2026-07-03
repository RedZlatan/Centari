import type { JournalSense } from "./journal-data";

export type BrainRegionId =
  | "prefrontal"
  | "premotor"
  | "somatosensory"
  | "visual"
  | "temporal"
  | "hippocampus"
  | "amygdala";

export type BrainRegion = {
  id: BrainRegionId;
  label: string;
  area: string;
  role: string;
  centariUse: string;
  evidence: string[];
  journalSenses: JournalSense[];
  archiveRole: string;
  position: [number, number, number];
  scale: [number, number, number];
};

export const brainRegions: BrainRegion[] = [
  {
    id: "prefrontal",
    label: "Prefrontal cortex",
    area: "Planning / judgement",
    role: "Supports planning, inhibition, working memory, and deliberate decision making.",
    centariUse:
      "Useful when we study command interfaces, prioritisation, and how teams choose the next action under uncertainty.",
    evidence: ["decision stress", "task switching", "confidence"],
    journalSenses: ["Decision"],
    archiveRole: "Decision notes, prioritisation, cognitive load, planning methods, and judgement under uncertainty.",
    position: [-0.82, 0.26, 0.78],
    scale: [0.28, 0.32, 0.22],
  },
  {
    id: "premotor",
    label: "Premotor cortex",
    area: "Action preparation",
    role: "Helps prepare movements and connect visual cues to planned action.",
    centariUse:
      "Important for spatial training, rehearsal, and interfaces where seeing something should make the right action easier.",
    evidence: ["rehearsal", "tool use", "procedural learning"],
    journalSenses: ["Space", "Decision"],
    archiveRole: "Training loops, action rehearsal, procedural learning, and transitions from seeing to doing.",
    position: [-0.32, 0.62, 0.78],
    scale: [0.24, 0.3, 0.2],
  },
  {
    id: "somatosensory",
    label: "Somatosensory cortex",
    area: "Touch / body state",
    role: "Processes touch, pressure, body position, and physical feedback from the environment.",
    centariUse:
      "Guides notes on haptics, gloves, fatigue, field conditions, and when physical reality beats simulation.",
    evidence: ["haptics", "field friction", "physical feedback"],
    journalSenses: ["Touch"],
    archiveRole: "Haptics, fatigue, gloves, weather, hardware limits, and lessons from physical work.",
    position: [0.08, 0.6, 0.78],
    scale: [0.24, 0.3, 0.2],
  },
  {
    id: "visual",
    label: "Visual cortex",
    area: "Sight / pattern",
    role: "Processes visual information and helps detect shape, motion, contrast, and spatial pattern.",
    centariUse:
      "Connects to dashboards, maps, 3D views, and the question of when information becomes easier to understand by seeing it.",
    evidence: ["maps", "pattern detection", "visual load"],
    journalSenses: ["Sight", "Space"],
    archiveRole: "Maps, visual hierarchy, dashboards, 3D comprehension, pattern recognition, and visual overload.",
    position: [0.86, 0.18, 0.74],
    scale: [0.3, 0.32, 0.22],
  },
  {
    id: "temporal",
    label: "Temporal cortex",
    area: "Sound / meaning",
    role: "Supports auditory processing, language, and recognition of meaningful signals over time.",
    centariUse:
      "A home for notes on alerts, radio, speech, rhythm, signal recognition, and sonic interfaces.",
    evidence: ["audio cues", "language", "signal timing"],
    journalSenses: ["Sound"],
    archiveRole: "Voice, radio, alerts, rhythm, interface sound, language, and signals that unfold over time.",
    position: [0.42, -0.38, 0.8],
    scale: [0.28, 0.22, 0.2],
  },
  {
    id: "hippocampus",
    label: "Hippocampus",
    area: "Memory / place",
    role: "Central for forming memories and linking experience to place, context, and sequence.",
    centariUse:
      "This is the core of the Memory Bank: what we keep, where it belongs, and why people can find it again.",
    evidence: ["spatial memory", "story recall", "return paths"],
    journalSenses: ["Memory", "Space"],
    archiveRole: "Memory bank, spatial stories, reference paths, lessons worth returning to, and long-horizon signals.",
    position: [0.04, -0.12, 0.96],
    scale: [0.22, 0.16, 0.16],
  },
  {
    id: "amygdala",
    label: "Amygdala",
    area: "Threat / salience",
    role: "Helps assign emotional salience, especially around threat, fear, and urgent attention.",
    centariUse:
      "Useful for research on stress, fear, alarms, risk perception, and why people behave differently under pressure.",
    evidence: ["stress", "fear response", "attention capture"],
    journalSenses: ["Decision", "Memory"],
    archiveRole: "Stress, fear, threat perception, alarm design, risk salience, and behaviour under pressure.",
    position: [-0.18, -0.22, 0.98],
    scale: [0.18, 0.15, 0.14],
  },
];

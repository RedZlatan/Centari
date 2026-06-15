export interface Principle {
  id: string;
  label: string;
  body: string;
}

export const principles: Principle[] = [
  {
    id: "physical",
    label: "Physical-first",
    body: "Software that serves the constraints of the physical world, not the other way around.",
  },
  {
    id: "edge",
    label: "Edge-native",
    body: "Processing, intelligence and control at the point of operation — not routed through distant infrastructure.",
  },
  {
    id: "surface",
    label: "Surface-aware",
    body: "Interfaces designed for the context they appear in: spatial, mobile, industrial or ambient.",
  },
  {
    id: "process",
    label: "Process-integrated",
    body: "Systems built around the actual operational workflow, not a simplified model of it.",
  },
];

export interface Product {
  id: string;
  name: string;
  description: string;
  status: "prototype" | "early access" | "coming soon";
  cta: string;
  visualLabel: string;
  stage: "understand" | "build" | "learn" | "operate";
}

export interface Solution {
  id: string;
  name: string;
  body: string;
  signal: string;
}

export interface FrameworkStage {
  id: "understand" | "build" | "learn" | "operate";
  label: string;
  question: string;
  body: string;
  capabilities: string[];
  emerging?: boolean;
}

export const framework: FrameworkStage[] = [
  {
    id: "understand",
    label: "Understand",
    question: "What is changing?",
    body: "Research surfaces, signal maps and knowledge graphs that help organizations track emerging technology, risk and strategic movement before it reaches the mainstream.",
    capabilities: ["Research Map", "Research Signals", "Future Atlas", "Journal"],
  },
  {
    id: "build",
    label: "Build",
    question: "What should we create?",
    body: "Prototyping tools, XR development environments and simulation systems for creating things before they become expensive to build incorrectly.",
    capabilities: ["Prototyping Workstation", "XR Development", "Digital Twins", "Simulation"],
  },
  {
    id: "learn",
    label: "Learn",
    question: "How do people understand it?",
    body: "Spatial learning systems and training environments for translating complex operations into embodied understanding. An emerging capability, not a finished product.",
    capabilities: ["Learning Platform", "Spatial Learning", "Training Systems"],
    emerging: true,
  },
  {
    id: "operate",
    label: "Operate",
    question: "How do we run it over time?",
    body: "Operational software for managing systems, fleets, agents and spatial environments in continuous use. Control Room is the operational centre of the ecosystem.",
    capabilities: ["Control Room", "Fleet Management", "Centari Agent", "Centari OS"],
  },
];

export const products: Product[] = [
  {
    id: "prototyping-workstation",
    name: "Prototyping Workstation",
    description:
      "The primary environment for building spatial prototypes, simulation scenarios and XR experiences. Designed for teams that need to create before they commit.",
    status: "prototype",
    cta: "Learn more",
    visualLabel: "PW",
    stage: "build",
  },
  {
    id: "control-room",
    name: "Control Room",
    description:
      "The operational centre of the Centari ecosystem. A unified surface for monitoring systems, managing agents and maintaining situational awareness across active environments.",
    status: "early access",
    cta: "Request access",
    visualLabel: "CR",
    stage: "operate",
  },
  {
    id: "centari-os",
    name: "Centari OS",
    description:
      "An operating layer for spatial work, signal awareness and AI-assisted operational systems. Connects fleet, agent and control surfaces into a single operational environment.",
    status: "early access",
    cta: "Request access",
    visualLabel: "OS",
    stage: "operate",
  },
  {
    id: "fleet-management",
    name: "Fleet Management",
    description:
      "Operational management for physical and spatial assets across distributed environments. Designed to support Control Room with persistent asset awareness.",
    status: "coming soon",
    cta: "Request access",
    visualLabel: "FM",
    stage: "operate",
  },
  {
    id: "headsets",
    name: "Headsets",
    description:
      "Spatial computing hardware curated for enterprise deployment. Built for teams working in training, simulation, inspection and field operations.",
    status: "coming soon",
    cta: "Request access",
    visualLabel: "HW",
    stage: "build",
  },
];

export const solutions: Solution[] = [
  {
    id: "spatial-learning",
    name: "Spatial Learning",
    body: "Teams that need to learn through doing, not watching. Training systems that move beyond flat screens into rooms, objects and embodied understanding.",
    signal: "Training / XR",
  },
  {
    id: "industrial-training",
    name: "Industrial Training",
    body: "High-stakes skill transfer for operational environments where mistakes are expensive. Rehearsal systems built for the conditions of actual work.",
    signal: "Simulation / Training",
  },
  {
    id: "xr-sales",
    name: "XR Sales Experiences",
    body: "Complex products that need to be experienced before they are bought. High-trust environments for enterprise sales, configured around the buyer's actual context.",
    signal: "Commercial / Spatial",
  },
  {
    id: "digital-twins",
    name: "Digital Twins",
    body: "Physical assets and processes made navigable, observable and shareable. Spatial representations for planning, monitoring and distributed operational understanding.",
    signal: "Twins / Infrastructure",
  },
  {
    id: "operational-intelligence",
    name: "Operational Intelligence",
    body: "Organizations that need to understand their environment before decisions become expensive. Signal surfaces, dashboards and awareness systems for operational teams.",
    signal: "Intelligence / Operations",
  },
  {
    id: "research-signal-monitoring",
    name: "Research & Signal Monitoring",
    body: "Teams tracking technology, risk and strategic movement across domains. Research maps and signal feeds built for organizations that compete on awareness.",
    signal: "Research / Intelligence",
  },
];

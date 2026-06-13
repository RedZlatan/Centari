export interface Product {
  id: string;
  name: string;
  description: string;
  status: "prototype" | "early access" | "coming soon";
  cta: string;
  visualLabel: string;
}

export interface Solution {
  id: string;
  name: string;
  body: string;
  signal: string;
}

export interface Principle {
  id: string;
  label: string;
  body: string;
}

export const products: Product[] = [
  {
    id: "centari-os",
    name: "Centari OS",
    description:
      "A prototype operating layer for spatial work, signal awareness and AI-assisted operational systems.",
    status: "early access",
    cta: "Request access",
    visualLabel: "OS",
  },
  {
    id: "workstation-alpha",
    name: "Workstation Model 1",
    description:
      "A physical workstation concept for focused research, simulation review and spatial planning.",
    status: "prototype",
    cta: "Learn more",
    visualLabel: "W1",
  },
  {
    id: "workstation-field",
    name: "Workstation Model 2",
    description:
      "A field-oriented workstation placeholder for training rooms, sales environments and operational teams.",
    status: "coming soon",
    cta: "Request access",
    visualLabel: "W2",
  },
  {
    id: "workstation-studio",
    name: "Workstation Model 3",
    description:
      "A studio-grade concept for immersive customer demos, executive simulations and future workspace design.",
    status: "coming soon",
    cta: "Buy placeholder",
    visualLabel: "W3",
  },
];

export const solutions: Solution[] = [
  {
    id: "spatial-learning",
    name: "Spatial learning",
    body: "Learning systems that move beyond flat screens into rooms, objects and embodied understanding.",
    signal: "Training / XR",
  },
  {
    id: "xr-sales",
    name: "Custom XR sales experiences",
    body: "High-trust sales environments for complex products, built around presence, context and decision support.",
    signal: "Commercial / Spatial",
  },
  {
    id: "telepresence",
    name: "Telepresence / teleportation concepts",
    body: "Concept prototypes for remote presence, shared rooms and the feeling of being meaningfully elsewhere.",
    signal: "Presence / Operations",
  },
  {
    id: "simulation-training",
    name: "Simulation and training environments",
    body: "Operational rehearsal spaces for teams that need to practice decisions before reality makes them expensive.",
    signal: "Simulation / Training",
  },
  {
    id: "research-intelligence",
    name: "Research intelligence / signal mapping",
    body: "Signal surfaces that help organizations understand emerging technology, risk and strategic movement.",
    signal: "Research / Intelligence",
  },
  {
    id: "digital-twins",
    name: "Operational digital twins",
    body: "Spatial representations of assets, facilities and processes for planning, monitoring and shared understanding.",
    signal: "Twins / Infrastructure",
  },
];

export const principles: Principle[] = [
  {
    id: "physical",
    label: "Grounded in the physical",
    body: "Our products interact with the real world through sensors, actuators, and spatial context. Software abstractions serve physical outcomes.",
  },
  {
    id: "edge",
    label: "Intelligence at the edge",
    body: "AI capabilities belong close to where decisions are made — in the device, in the space, not only in the cloud.",
  },
  {
    id: "surface",
    label: "Small surface, deep value",
    body: "We build fewer things, built well. A product that solves one hard problem precisely beats a platform that solves many problems poorly.",
  },
  {
    id: "process",
    label: "Open process",
    body: "We document decisions, sprint goals, and architectural tradeoffs. The process is part of the product.",
  },
];

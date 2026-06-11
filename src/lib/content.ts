export interface Product {
  id: string;
  name: string;
  description: string;
}

export interface Principle {
  id: string;
  label: string;
  body: string;
}

export const products: Product[] = [
  {
    id: "forge",
    name: "Forge",
    description:
      "Configure and deploy complex operational systems with structured precision tooling.",
  },
  {
    id: "mission",
    name: "Mission",
    description:
      "Plan, simulate and execute multi-phase operational scenarios in a shared environment.",
  },
  {
    id: "twin",
    name: "Twin",
    description:
      "Build and interact with high-fidelity digital representations of physical systems.",
  },
  {
    id: "insight",
    name: "Insight",
    description:
      "Surface patterns and anomalies in sensor and operational data as they emerge.",
  },
  {
    id: "workstation",
    name: "Workstation",
    description:
      "A unified workspace for teams doing technical, time-critical collaborative work.",
  },
  {
    id: "lab",
    name: "Lab",
    description:
      "Prototype, test and validate system behaviours before committing to production.",
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

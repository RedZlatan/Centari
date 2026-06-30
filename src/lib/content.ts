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

export interface FrameworkStage {
  id: string;
  label: string;
  question: string;
  body: string;
  capabilities: string[];
  emerging?: boolean;
}

export interface Solution {
  id: string;
  name: string;
  signal: string;
  body: string;
}

export const products: Product[] = [
  {
    id: "knowledge",
    name: "Knowledge",
    description:
      "Turn documents, manuals, drawings and field knowledge into material the system can use.",
  },
  {
    id: "interfaces",
    name: "2D Interfaces",
    description:
      "Use dashboards, forms and decision surfaces when a screen is the clearest answer.",
  },
  {
    id: "models",
    name: "3D Models",
    description:
      "Inspect products, places and systems in three dimensions before they are built or changed.",
  },
  {
    id: "spatial",
    name: "Spatial Rooms",
    description:
      "Use XR only when presence, scale or shared spatial understanding creates real value.",
  },
  {
    id: "physical",
    name: "Physical Workflows",
    description:
      "Connect digital planning to real environments, equipment, people and constraints.",
  },
  {
    id: "ai",
    name: "AI Support",
    description:
      "Use AI to search, compare, explain and assist decisions without hiding the workflow.",
  },
];

export const principles: Principle[] = [
  {
    id: "understand",
    label: "Understand",
    body: "Map the people, systems, objectives and constraints before choosing a medium.",
  },
  {
    id: "design",
    label: "Design",
    body: "Choose the right combination of AI, 2D, 3D, XR and physical process for the task.",
  },
  {
    id: "build",
    label: "Build",
    body: "Move quickly using existing material whenever possible: documents, data, models and field knowledge.",
  },
  {
    id: "validate",
    label: "Validate",
    body: "Test with real users and operational scenarios before the solution becomes everyday work.",
  },
  {
    id: "deploy",
    label: "Deploy",
    body: "Move what works into daily use and keep improving it as conditions change.",
  },
];

export const framework: FrameworkStage[] = [
  {
    id: "understand",
    label: "Understand",
    question: "What needs to be understood?",
    body: "Map the task, environment, users and constraints before choosing the medium.",
    capabilities: ["Research intake", "System mapping", "Constraint review"],
  },
  {
    id: "choose",
    label: "Choose",
    question: "Which level of reality is enough?",
    body: "Decide whether the work belongs in text, 2D, 3D, XR or the physical environment.",
    capabilities: ["Medium selection", "Workflow design", "Prototype scope"],
  },
  {
    id: "validate",
    label: "Validate",
    question: "Does it work before reality?",
    body: "Test the workflow with real users and operational scenarios before committing at scale.",
    capabilities: ["Scenario testing", "User review", "Readiness checks"],
  },
  {
    id: "operate",
    label: "Operate",
    question: "How does it improve daily work?",
    body: "Move useful tools into everyday operations and improve them as conditions change.",
    capabilities: ["Deployment support", "Signal review", "Continuous improvement"],
    emerging: true,
  },
];

export const solutions: Solution[] = [
  {
    id: "planning",
    name: "Planning before commitment",
    signal: "Plan",
    body: "Test options before people, money or hardware are committed to the physical world.",
  },
  {
    id: "simulation",
    name: "Simulation at the right fidelity",
    signal: "Simulate",
    body: "Use 3D or XR when it improves understanding, not because it is the most advanced medium.",
  },
  {
    id: "operations",
    name: "Operational decision support",
    signal: "Operate",
    body: "Bring data, AI and spatial context into workflows where teams need clearer decisions.",
  },
];

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

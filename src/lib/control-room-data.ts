export type ControlRoomPage =
  | "Dashboard"
  | "Products"
  | "Downloads"
  | "Assets"
  | "Tickets"
  | "Organization";

export interface ControlRoomModule {
  label: string;
  value: string;
  meta: string;
}

export interface ControlRoomRow {
  id: string;
  title: string;
  status: string;
  owner: string;
  updated: string;
}

export interface ControlRoomPageContent {
  page: ControlRoomPage;
  eyebrow: string;
  title: string;
  summary: string;
  signal: string;
  modules: ControlRoomModule[];
  rows: ControlRoomRow[];
}

export const controlRoomNav: { label: ControlRoomPage; href: string }[] = [
  { label: "Dashboard", href: "/control-room" },
  { label: "Products", href: "/control-room/products" },
  { label: "Downloads", href: "/control-room/downloads" },
  { label: "Assets", href: "/control-room/assets" },
  { label: "Tickets", href: "/control-room/tickets" },
  { label: "Organization", href: "/control-room/organization" },
];

export const controlRoomContent: Record<ControlRoomPage, ControlRoomPageContent> = {
  Dashboard: {
    page: "Dashboard",
    eyebrow: "Control Room / Overview",
    title: "Operational picture",
    summary:
      "A static command surface for validating Centari OS structure, product readiness, and active workstreams.",
    signal: "Reference point stable",
    modules: [
      { label: "Products online", value: "07", meta: "Centari OS + modules" },
      { label: "Open tickets", value: "18", meta: "4 require review" },
      { label: "Asset packages", value: "42", meta: "12 updated this week" },
      { label: "Release channel", value: "1.5", meta: "Identity candidate" },
    ],
    rows: [
      { id: "CR-104", title: "Identity candidate review", status: "In review", owner: "Design", updated: "Today" },
      { id: "CR-097", title: "Control Room shell validation", status: "Active", owner: "Product", updated: "Today" },
      { id: "CR-091", title: "Workstation badge tests", status: "Ready", owner: "Industrial", updated: "Yesterday" },
      { id: "CR-086", title: "Monolith mark vector pass", status: "Queued", owner: "Brand", updated: "Jun 10" },
    ],
  },
  Products: {
    page: "Products",
    eyebrow: "Control Room / Products",
    title: "System catalogue",
    summary:
      "Product modules are presented as a structured operating ecosystem for review, planning, and future release surfaces.",
    signal: "Centari OS anchors the system",
    modules: [
      { label: "Platform", value: "OS", meta: "Parent layer" },
      { label: "Modules", value: "06", meta: "Forge through Lab" },
      { label: "Readiness", value: "72%", meta: "Mock aggregate" },
      { label: "Visual spec", value: "1.5", meta: "Candidate direction" },
    ],
    rows: [
      { id: "CT.OS", title: "Centari OS", status: "Platform", owner: "Core", updated: "Stable" },
      { id: "CT.FG", title: "Forge", status: "Module", owner: "Systems", updated: "Draft" },
      { id: "CT.MS", title: "Mission", status: "Module", owner: "Operations", updated: "Draft" },
      { id: "CT.TW", title: "Twin", status: "Module", owner: "Simulation", updated: "Draft" },
    ],
  },
  Downloads: {
    page: "Downloads",
    eyebrow: "Control Room / Downloads",
    title: "Release packages",
    summary:
      "A visual placeholder for future installers, documents, and field packages. All entries are static mock data.",
    signal: "Distribution surface only",
    modules: [
      { label: "Packages", value: "12", meta: "Mock releases" },
      { label: "Documents", value: "09", meta: "Reference PDFs" },
      { label: "Installers", value: "03", meta: "Desktop targets" },
      { label: "Checksums", value: "100%", meta: "Displayed only" },
    ],
    rows: [
      { id: "DL-210", title: "Centari Workstation visual kit", status: "Ready", owner: "Design", updated: "82 MB" },
      { id: "DL-188", title: "Control Room shell spec", status: "Draft", owner: "Product", updated: "12 MB" },
      { id: "DL-171", title: "Identity candidate packet", status: "Ready", owner: "Brand", updated: "148 MB" },
      { id: "DL-140", title: "Monolith mark source review", status: "Queued", owner: "Brand", updated: "24 MB" },
    ],
  },
  Assets: {
    page: "Assets",
    eyebrow: "Control Room / Assets",
    title: "Reference assets",
    summary:
      "Static inventory view for visual systems, marks, product images, material studies, and review-ready boards.",
    signal: "Materials under review",
    modules: [
      { label: "Images", value: "28", meta: "Exploration boards" },
      { label: "Marks", value: "06", meta: "Candidate set" },
      { label: "Materials", value: "04", meta: "Approved palette" },
      { label: "Lockups", value: "06", meta: "Review variants" },
    ],
    rows: [
      { id: "AS-041", title: "Final wordmark candidates", status: "Approved ref", owner: "Brand", updated: "PNG" },
      { id: "AS-039", title: "Monolith mark candidates", status: "Approved ref", owner: "Brand", updated: "PNG" },
      { id: "AS-032", title: "Engraving tests", status: "Review", owner: "Industrial", updated: "PNG" },
      { id: "AS-028", title: "App icon tests", status: "Review", owner: "Product", updated: "PNG" },
    ],
  },
  Tickets: {
    page: "Tickets",
    eyebrow: "Control Room / Tickets",
    title: "Decision queue",
    summary:
      "A mock ticket surface for identity, product, and interface decisions. No workflow or backend is connected.",
    signal: "4 decisions pending",
    modules: [
      { label: "Open", value: "18", meta: "Mock tickets" },
      { label: "Blocked", value: "02", meta: "Needs AD input" },
      { label: "Review", value: "07", meta: "Design queue" },
      { label: "Closed", value: "31", meta: "Sprint history" },
    ],
    rows: [
      { id: "TK-118", title: "Choose primary wordmark candidate", status: "AD review", owner: "Brand", updated: "High" },
      { id: "TK-117", title: "Approve monolith mark axis treatment", status: "AD review", owner: "Brand", updated: "High" },
      { id: "TK-111", title: "Define Control Room dashboard density", status: "Open", owner: "Product", updated: "Medium" },
      { id: "TK-103", title: "Mobile navigation strategy", status: "Later", owner: "Web", updated: "Low" },
    ],
  },
  Organization: {
    page: "Organization",
    eyebrow: "Control Room / Organization",
    title: "Operating structure",
    summary:
      "Static organizational view for product ownership, review responsibilities, and system roles.",
    signal: "Review ownership visible",
    modules: [
      { label: "Teams", value: "05", meta: "Mock groups" },
      { label: "Reviewers", value: "08", meta: "Named later" },
      { label: "Vendors", value: "03", meta: "Future field" },
      { label: "Facilities", value: "02", meta: "Research + field" },
    ],
    rows: [
      { id: "ORG-01", title: "Brand direction", status: "AD owner", owner: "Design", updated: "Active" },
      { id: "ORG-02", title: "Control Room product", status: "Product owner", owner: "Product", updated: "Active" },
      { id: "ORG-03", title: "Workstation hardware", status: "Industrial owner", owner: "Hardware", updated: "Planned" },
      { id: "ORG-04", title: "Research publication", status: "Editorial owner", owner: "Research", updated: "Planned" },
    ],
  },
};

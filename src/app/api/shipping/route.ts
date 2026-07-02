import { NextResponse } from "next/server";

const chokepoints = [
  {
    id: "choke_suez",
    name: "Suez Canal",
    region: "Egypt / Red Sea-Mediterranean corridor",
    coordinates: { latitude: 29.92, longitude: 32.55 },
    status: "High traffic",
    severity: "warning",
    description: "Critical canal linking Europe and Asia. Disruption reroutes container traffic around the Cape of Good Hope.",
  },
  {
    id: "choke_hormuz",
    name: "Strait of Hormuz",
    region: "Persian Gulf / Gulf of Oman",
    coordinates: { latitude: 26.56, longitude: 56.25 },
    status: "Strategic risk corridor",
    severity: "warning",
    description: "Primary oil and LNG transit chokepoint. Regional escalation can affect global energy flow.",
  },
  {
    id: "choke_bab_el_mandeb",
    name: "Bab el-Mandeb",
    region: "Red Sea / Gulf of Aden",
    coordinates: { latitude: 12.61, longitude: 43.33 },
    status: "Security watch",
    severity: "critical",
    description: "Narrow maritime corridor connecting the Red Sea to the Gulf of Aden. Vessel risk affects Suez traffic.",
  },
  {
    id: "choke_panama",
    name: "Panama Canal",
    region: "Panama / Atlantic-Pacific corridor",
    coordinates: { latitude: 9.08, longitude: -79.68 },
    status: "Capacity watch",
    severity: "watch",
    description: "Key canal for inter-ocean shipping. Drought and queue constraints can delay global supply chains.",
  },
  {
    id: "choke_malacca",
    name: "Strait of Malacca",
    region: "Malaysia / Singapore / Indonesia",
    coordinates: { latitude: 2.8, longitude: 101.0 },
    status: "High density",
    severity: "watch",
    description: "One of the world's busiest maritime lanes, connecting the Indian Ocean to the South China Sea.",
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    source: "Global maritime chokepoints",
    source_mode: "curated_reference",
    count: chokepoints.length,
    shipping: chokepoints.map((item) => ({
      ...item,
      source_name: "Curated maritime chokepoint monitor",
      source_mode: "curated_reference",
      source: "https://unctad.org/publication/review-maritime-transport-2023",
    })),
    data: chokepoints,
    timestamp: new Date().toISOString(),
  });
}

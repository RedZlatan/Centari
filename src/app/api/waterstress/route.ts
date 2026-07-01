import { NextResponse } from "next/server";

const waterStressZones = [
  {
    id: "ws-horn-of-africa",
    region: "Horn of Africa",
    country: "Somalia / Ethiopia / Kenya",
    coordinates: { latitude: 5.15, longitude: 46.19 },
    severity: "Extreme",
    affected_population_millions: 36.4,
    description: "Long-running drought and food-water insecurity pressure across the Horn of Africa.",
  },
  {
    id: "ws-colorado-river",
    region: "Colorado River Basin",
    country: "United States / Mexico",
    coordinates: { latitude: 36.1, longitude: -112.1 },
    severity: "High",
    affected_population_millions: 40,
    description: "Structural water stress across a basin serving agriculture, power generation and major cities.",
  },
  {
    id: "ws-northern-india",
    region: "Northern India groundwater belt",
    country: "India",
    coordinates: { latitude: 28.61, longitude: 77.21 },
    severity: "Extreme",
    affected_population_millions: 220,
    description: "Groundwater depletion and urban demand pressure in one of the world's most stressed water regions.",
  },
  {
    id: "ws-central-chile",
    region: "Central Chile",
    country: "Chile",
    coordinates: { latitude: -33.45, longitude: -70.66 },
    severity: "High",
    affected_population_millions: 8,
    description: "Persistent drought pressure affecting agriculture, reservoirs and urban supply.",
  },
  {
    id: "ws-western-cape",
    region: "Western Cape",
    country: "South Africa",
    coordinates: { latitude: -33.92, longitude: 18.42 },
    severity: "Elevated",
    affected_population_millions: 7,
    description: "Reference marker for urban water resilience and drought preparedness planning.",
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    count: waterStressZones.length,
    data: waterStressZones.map((zone) => ({
      ...zone,
      source_mode: "curated_reference",
      source_name: "WRI Aqueduct / drought risk reference",
    })),
    timestamp: new Date().toISOString(),
    source_mode: "curated_reference",
  });
}

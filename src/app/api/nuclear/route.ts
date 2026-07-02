import { NextResponse } from "next/server";

const nuclearSites = [
  {
    id: "nuc_zaporizhzhia",
    name: "Zaporizhzhia Nuclear Power Plant",
    country: "Ukraine",
    coordinates: { latitude: 47.5, longitude: 34.58 },
    status: "Cold shutdown / conflict zone",
    severity: "critical",
    radiation_alert: false,
    description: "Large nuclear facility in an active conflict context. Operational state and grid connection remain strategic risk signals.",
  },
  {
    id: "nuc_gravelines",
    name: "Gravelines Nuclear Power Plant",
    country: "France",
    coordinates: { latitude: 51.01, longitude: 2.14 },
    status: "Operating",
    severity: "nominal",
    radiation_alert: false,
    description: "Major European nuclear generation site and grid-stability node.",
  },
  {
    id: "nuc_palo_verde",
    name: "Palo Verde Generating Station",
    country: "United States",
    coordinates: { latitude: 33.39, longitude: -112.86 },
    status: "Operating",
    severity: "nominal",
    radiation_alert: false,
    description: "Large inland nuclear generation site serving the western United States grid.",
  },
  {
    id: "nuc_kashiwazaki_kariwa",
    name: "Kashiwazaki-Kariwa Nuclear Power Plant",
    country: "Japan",
    coordinates: { latitude: 37.43, longitude: 138.6 },
    status: "Restart / seismic governance watch",
    severity: "watch",
    radiation_alert: false,
    description: "Major Japanese nuclear site in a seismically active region. Governance and restart signals affect energy strategy.",
  },
  {
    id: "nuc_taishan",
    name: "Taishan Nuclear Power Plant",
    country: "China",
    coordinates: { latitude: 21.92, longitude: 112.98 },
    status: "Operating",
    severity: "nominal",
    radiation_alert: false,
    description: "Large coastal nuclear generation site in the Pearl River Delta energy system.",
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    source: "IAEA PRIS / Global Nuclear Infrastructure",
    source_mode: "curated_reference",
    count: nuclearSites.length,
    nuclear: nuclearSites.map((item) => ({
      ...item,
      source_name: "IAEA PRIS / curated infrastructure watch",
      source_mode: "curated_reference",
      source: "https://pris.iaea.org/PRIS/home.aspx",
    })),
    data: nuclearSites,
    timestamp: new Date().toISOString(),
  });
}

import { NextResponse } from "next/server";

const outbreakWatchlist = [
  {
    id: "outbreak-mpox-central-africa",
    disease: "Mpox",
    status: "Monitored outbreak",
    country: "Central Africa",
    coordinates: { latitude: -4.32, longitude: 15.31 },
    cases_reported: null,
    description: "Curated watch marker for regions frequently appearing in WHO disease outbreak reporting.",
  },
  {
    id: "outbreak-h5n1-global",
    disease: "Avian influenza A(H5N1)",
    status: "Cross-species monitoring",
    country: "Global hotspots",
    coordinates: { latitude: 14.6, longitude: 101 },
    cases_reported: null,
    description: "Reference layer for zoonotic-risk monitoring. Replace with a licensed health feed when available.",
  },
  {
    id: "outbreak-cholera-africa",
    disease: "Cholera",
    status: "Recurring regional risk",
    country: "Eastern / Southern Africa",
    coordinates: { latitude: -13.25, longitude: 34.3 },
    cases_reported: null,
    description: "Curated resilience marker for waterborne disease risk tied to water access and displacement.",
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    count: outbreakWatchlist.length,
    data: outbreakWatchlist.map((item) => ({
      ...item,
      source_mode: "curated_reference",
      source_name: "WHO Disease Outbreak News watchlist scaffold",
    })),
    timestamp: new Date().toISOString(),
    source_mode: "curated_reference",
  });
}

import { NextResponse } from "next/server";

type KpRecord = {
  time_tag?: string;
  Kp?: number;
  station_count?: number;
};

function getCondition(kp: number) {
  if (kp >= 9) return "G5 Extreme Storm";
  if (kp >= 8) return "G4 Severe Storm";
  if (kp >= 7) return "G3 Strong Storm";
  if (kp >= 6) return "G2 Moderate Storm";
  if (kp >= 5) return "G1 Minor Storm";
  return "Quiet magnetic field";
}

export async function GET() {
  try {
    const response = await fetch(
      "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
      { next: { revalidate: 300 } },
    );

    if (!response.ok) {
      throw new Error(`NOAA SWPC responded with status: ${response.status}`);
    }

    const payload = await response.json() as KpRecord[];
    const records = Array.isArray(payload) ? payload.filter((item) => typeof item.Kp === "number") : [];
    const current = records.at(-1);
    const currentKp = current?.Kp ?? 0;

    return NextResponse.json({
      success: true,
      current_kp: currentKp,
      condition: getCondition(currentKp),
      is_storm: currentKp >= 5,
      station_count: current?.station_count ?? null,
      timestamp: current?.time_tag ?? new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch space weather",
      current_kp: 0,
      condition: "Space weather unavailable",
      is_storm: false,
      timestamp: new Date().toISOString(),
    });
  }
}

import { NextResponse } from "next/server";

type CadPayload = {
  fields?: string[];
  data?: string[][];
};

const lunarDistancesPerAu = 389.172;

function toNumber(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function estimateDiameterMeters(absoluteMagnitude: number | null) {
  if (absoluteMagnitude === null) {
    return null;
  }

  // Standard H-to-diameter estimate with an assumed asteroid albedo of 0.14.
  const diameterKm = (1329 / Math.sqrt(0.14)) * Math.pow(10, -absoluteMagnitude / 5);
  return Math.round(diameterKm * 1000);
}

export async function GET() {
  try {
    const response = await fetch(
      "https://ssd-api.jpl.nasa.gov/cad.api?dist-max=10LD&date-min=now&sort=date&limit=12",
      { next: { revalidate: 900 } },
    );

    if (!response.ok) {
      throw new Error(`NASA/JPL CAD API responded with status: ${response.status}`);
    }

    const payload = await response.json() as CadPayload;
    const fields = payload.fields ?? [];
    const fieldIndex = new Map(fields.map((field, index) => [field, index]));
    const get = (row: string[], field: string) => row[fieldIndex.get(field) ?? -1];

    const asteroids = (payload.data ?? []).map((row) => {
      const distanceAu = toNumber(get(row, "dist"));
      const velocityKms = toNumber(get(row, "v_rel"));
      const absoluteMagnitude = toNumber(get(row, "h"));
      const estimatedSizeMeters = estimateDiameterMeters(absoluteMagnitude);
      const distanceLunar = distanceAu === null ? null : distanceAu * lunarDistancesPerAu;

      return {
        id: get(row, "des") ?? "unknown-object",
        name: get(row, "des") ?? "Unknown object",
        close_approach_date: get(row, "cd") ?? "Unknown approach",
        distance_au: distanceAu,
        distance_lunar: distanceLunar === null ? null : Number(distanceLunar.toFixed(2)),
        velocity_kms: velocityKms === null ? null : Number(velocityKms.toFixed(2)),
        estimated_size_meters: estimatedSizeMeters,
        is_hazard: Boolean(
          (distanceLunar !== null && distanceLunar < 1) ||
          (estimatedSizeMeters !== null && estimatedSizeMeters >= 140 && distanceLunar !== null && distanceLunar <= 10),
        ),
      };
    });

    return NextResponse.json({
      success: true,
      count: asteroids.length,
      asteroids,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch asteroid data",
      count: 0,
      asteroids: [],
      timestamp: new Date().toISOString(),
    });
  }
}

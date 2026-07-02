import { NextResponse } from "next/server";

type FireballPayload = {
  fields?: string[];
  data?: string[][];
};

function toNumber(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function coordinate(value: unknown, direction: unknown) {
  const parsed = toNumber(value);
  if (parsed === null) {
    return null;
  }

  const dir = String(direction ?? "").trim().toUpperCase();
  return dir === "S" || dir === "W" ? -parsed : parsed;
}

function toJoules(kilotonsTnt: number | null) {
  if (kilotonsTnt === null) {
    return null;
  }

  return Math.round(kilotonsTnt * 4.184e12);
}

export async function GET() {
  try {
    const response = await fetch(
      "https://ssd-api.jpl.nasa.gov/fireball.api?date-min=2023-01-01&req-loc=true&sort=-date&limit=30",
      { next: { revalidate: 3600 } },
    );

    if (!response.ok) {
      throw new Error(`NASA CNEOS Fireball API responded with status: ${response.status}`);
    }

    const payload = await response.json() as FireballPayload;
    const fields = payload.fields ?? [];
    const fieldIndex = new Map(fields.map((field, index) => [field, index]));
    const get = (row: string[], field: string) => row[fieldIndex.get(field) ?? -1];

    const fireballs = (payload.data ?? [])
      .map((row, index) => {
        const latitude = coordinate(get(row, "lat"), get(row, "lat-dir"));
        const longitude = coordinate(get(row, "lon"), get(row, "lon-dir"));

        if (latitude === null || longitude === null) {
          return null;
        }

        const timestamp = get(row, "date") ?? "Unknown timestamp";
        const impactEnergyKt = toNumber(get(row, "impact-e"));
        const totalRadiatedEnergyKt = toNumber(get(row, "energy"));
        const altitudeKm = toNumber(get(row, "alt"));
        const velocityKms = toNumber(get(row, "vel"));

        return {
          id: `fireball_${index}_${timestamp.replace(/[^0-9]/g, "").slice(0, 12)}`,
          timestamp,
          energy_joules: toJoules(impactEnergyKt),
          impact_energy_kt: impactEnergyKt,
          radiated_energy_kt: totalRadiatedEnergyKt,
          altitude_km: altitudeKm,
          velocity_kms: velocityKms,
          coordinates: { latitude, longitude },
          description: "Atmospheric fireball / bolide detected by NASA CNEOS sensor network.",
        };
      })
      .filter((fireball): fireball is NonNullable<typeof fireball> => Boolean(fireball));

    return NextResponse.json({
      success: true,
      source: "NASA CNEOS Fireball API",
      count: fireballs.length,
      fireballs,
      data: fireballs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      source: "NASA CNEOS Fireball API",
      error: error instanceof Error ? error.message : "Failed to fetch fireball data",
      count: 0,
      fireballs: [],
      data: [],
      timestamp: new Date().toISOString(),
    });
  }
}

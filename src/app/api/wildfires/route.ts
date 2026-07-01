import { NextResponse } from "next/server";

type EonetGeometry = {
  date?: string;
  type?: string;
  coordinates?: unknown;
  magnitudeValue?: number;
  magnitudeUnit?: string;
};

type EonetEvent = {
  id?: string;
  title?: string;
  link?: string;
  sources?: Array<{ id?: string; url?: string }>;
  geometry?: EonetGeometry[];
};

type EonetPayload = {
  events?: EonetEvent[];
};

function findLonLat(value: unknown): [number, number] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  ) {
    return [value[0], value[1]];
  }

  for (const item of value) {
    const match = findLonLat(item);
    if (match) {
      return match;
    }
  }

  return null;
}

export async function GET() {
  try {
    const response = await fetch(
      "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=wildfires&limit=60",
      { next: { revalidate: 900 } },
    );

    if (!response.ok) {
      throw new Error(`NASA EONET responded with status: ${response.status}`);
    }

    const payload = await response.json() as EonetPayload;
    const wildfires = (payload.events ?? [])
      .map((event) => {
        const geometry = event.geometry?.[event.geometry.length - 1] ?? event.geometry?.[0];
        const lonLat = findLonLat(geometry?.coordinates);

        if (!event.id || !event.title || !geometry || !lonLat) {
          return null;
        }

        return {
          id: event.id,
          title: event.title,
          date: geometry.date ?? null,
          magnitude_acres: geometry.magnitudeUnit === "acres" && typeof geometry.magnitudeValue === "number"
            ? geometry.magnitudeValue
            : null,
          coordinates: {
            longitude: lonLat[0],
            latitude: lonLat[1],
          },
          source: event.sources?.[0]?.url ?? event.link ?? null,
          source_mode: "live" as const,
          source_name: "NASA EONET",
        };
      })
      .filter((wildfire): wildfire is NonNullable<typeof wildfire> => Boolean(wildfire));

    return NextResponse.json({
      success: true,
      count: wildfires.length,
      wildfires,
      timestamp: new Date().toISOString(),
      source_mode: "live",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch wildfire data",
      count: 0,
      wildfires: [],
      timestamp: new Date().toISOString(),
      source_mode: "live",
    });
  }
}

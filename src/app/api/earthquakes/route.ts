import { NextResponse } from "next/server";

type UsgsFeature = {
  id?: string;
  properties?: {
    title?: string;
    mag?: number;
    place?: string;
    time?: number;
    updated?: number;
    url?: string;
    alert?: string | null;
    tsunami?: number;
  };
  geometry?: {
    coordinates?: [number, number, number];
  };
};

type UsgsPayload = {
  features?: UsgsFeature[];
};

export async function GET() {
  try {
    const response = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson",
      { next: { revalidate: 60 } },
    );

    if (!response.ok) {
      throw new Error(`USGS API responded with status: ${response.status}`);
    }

    const data = await response.json() as UsgsPayload;
    const earthquakes = (data.features ?? [])
      .map((feature) => {
        const coordinates = feature.geometry?.coordinates;

        if (!feature.id || !feature.properties || !coordinates) {
          return null;
        }

        return {
          id: feature.id,
          title: feature.properties.title ?? `M ${feature.properties.mag ?? "?"} seismic anomaly`,
          magnitude: feature.properties.mag ?? 0,
          place: feature.properties.place ?? "Unknown location",
          time: feature.properties.time ?? 0,
          updated: feature.properties.updated ?? null,
          url: feature.properties.url ?? null,
          alert: feature.properties.alert ?? null,
          tsunami: feature.properties.tsunami === 1,
          coordinates: {
            longitude: coordinates[0],
            latitude: coordinates[1],
            depth_km: coordinates[2],
          },
        };
      })
      .filter((earthquake): earthquake is NonNullable<typeof earthquake> => Boolean(earthquake));

    return NextResponse.json({
      success: true,
      count: earthquakes.length,
      earthquakes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch earthquake data",
      count: 0,
      earthquakes: [],
      timestamp: new Date().toISOString(),
    });
  }
}

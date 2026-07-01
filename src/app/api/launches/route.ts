import { NextResponse } from "next/server";

type LaunchLibraryPayload = {
  results?: LaunchLibraryLaunch[];
};

type LaunchLibraryLaunch = {
  id?: string;
  name?: string;
  status?: {
    name?: string;
  };
  net?: string;
  mission?: {
    description?: string | null;
  } | null;
  launch_service_provider?: {
    name?: string;
  };
  pad?: {
    name?: string;
    latitude?: string | number | null;
    longitude?: string | number | null;
    location?: {
      name?: string;
    };
  };
};

function toNumber(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET() {
  try {
    const response = await fetch(
      "https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=8&mode=detailed",
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Centari research map",
        },
        next: { revalidate: 600 },
      },
    );

    if (!response.ok) {
      throw new Error(`Launch Library responded with status: ${response.status}`);
    }

    const payload = await response.json() as LaunchLibraryPayload;
    const launches = (payload.results ?? [])
      .map((launch) => {
        const latitude = toNumber(launch.pad?.latitude);
        const longitude = toNumber(launch.pad?.longitude);

        if (!launch.id || latitude === null || longitude === null) {
          return null;
        }

        return {
          id: launch.id,
          name: launch.name ?? "Unnamed launch",
          provider: launch.launch_service_provider?.name ?? "Unknown provider",
          status: launch.status?.name ?? "Unknown status",
          net: launch.net ?? null,
          mission_description: launch.mission?.description ?? null,
          pad: {
            name: launch.pad?.name ?? "Unknown pad",
            location: launch.pad?.location?.name ?? "Unknown launch site",
            latitude,
            longitude,
          },
        };
      })
      .filter((launch): launch is NonNullable<typeof launch> => Boolean(launch))
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      count: launches.length,
      launches,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch launches",
      count: 0,
      launches: [],
      timestamp: new Date().toISOString(),
    });
  }
}

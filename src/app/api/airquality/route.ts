import { NextResponse } from "next/server";

type OpenMeteoAirQuality = {
  current?: {
    time?: string;
    pm2_5?: number;
    us_aqi?: number;
  };
};

const monitoredCities = [
  { id: "delhi", city: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209 },
  { id: "beijing", city: "Beijing", country: "China", latitude: 39.9042, longitude: 116.4074 },
  { id: "lagos", city: "Lagos", country: "Nigeria", latitude: 6.5244, longitude: 3.3792 },
  { id: "mexico-city", city: "Mexico City", country: "Mexico", latitude: 19.4326, longitude: -99.1332 },
  { id: "los-angeles", city: "Los Angeles", country: "United States", latitude: 34.0522, longitude: -118.2437 },
  { id: "sao-paulo", city: "Sao Paulo", country: "Brazil", latitude: -23.5558, longitude: -46.6396 },
  { id: "cairo", city: "Cairo", country: "Egypt", latitude: 30.0444, longitude: 31.2357 },
  { id: "jakarta", city: "Jakarta", country: "Indonesia", latitude: -6.2088, longitude: 106.8456 },
  { id: "stockholm", city: "Stockholm", country: "Sweden", latitude: 59.3293, longitude: 18.0686 },
  { id: "sydney", city: "Sydney", country: "Australia", latitude: -33.8688, longitude: 151.2093 },
];

function getRiskLevel(aqi: number | null) {
  if (aqi === null) {
    return "Unknown";
  }

  if (aqi <= 50) {
    return "Good";
  }

  if (aqi <= 100) {
    return "Moderate";
  }

  if (aqi <= 150) {
    return "Unhealthy for sensitive groups";
  }

  if (aqi <= 200) {
    return "Unhealthy";
  }

  if (aqi <= 300) {
    return "Very unhealthy";
  }

  return "Hazardous";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function GET() {
  try {
    const readings = await Promise.all(
      monitoredCities.map(async (city) => {
        const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
        url.searchParams.set("latitude", String(city.latitude));
        url.searchParams.set("longitude", String(city.longitude));
        url.searchParams.set("current", "pm2_5,us_aqi");

        const response = await fetch(url, { next: { revalidate: 900 } });
        if (!response.ok) {
          throw new Error(`Open-Meteo air quality responded with status: ${response.status}`);
        }

        const payload = await response.json() as OpenMeteoAirQuality;
        const usAqi = asNumber(payload.current?.us_aqi);
        const pm25 = asNumber(payload.current?.pm2_5);

        return {
          id: city.id,
          city: city.city,
          country: city.country,
          coordinates: {
            latitude: city.latitude,
            longitude: city.longitude,
          },
          us_aqi: usAqi,
          pm2_5: pm25,
          risk_level: getRiskLevel(usAqi),
          is_hazardous: usAqi !== null && usAqi > 150,
          observed_at: payload.current?.time ?? null,
          source_mode: "live" as const,
          source_name: "Open-Meteo Air Quality",
        };
      }),
    );

    return NextResponse.json({
      success: true,
      count: readings.length,
      air_quality: readings,
      timestamp: new Date().toISOString(),
      source_mode: "live",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch air quality data",
      count: 0,
      air_quality: [],
      timestamp: new Date().toISOString(),
      source_mode: "live",
    });
  }
}

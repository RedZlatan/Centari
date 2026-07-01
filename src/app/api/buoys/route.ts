import { NextResponse } from "next/server";

function toNumber(value: string) {
  if (value === "MM") {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET() {
  try {
    const response = await fetch(
      "https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt",
      { next: { revalidate: 300 } },
    );

    if (!response.ok) {
      throw new Error(`NOAA NDBC responded with status: ${response.status}`);
    }

    const text = await response.text();
    const buoys = [];

    for (const line of text.split("\n").slice(2)) {
      const parts = line.trim().split(/\s+/);

      if (parts.length < 19) {
        continue;
      }

      const [
        stationId,
        lat,
        lon,
        year,
        month,
        day,
        hour,
        minute,
        ,
        windSpeed,
        ,
        waveHeight,
        ,
        ,
        ,
        ,
        ,
        airTemp,
        waterTemp,
      ] = parts;
      const latitude = toNumber(lat);
      const longitude = toNumber(lon);
      const windSpeedMs = toNumber(windSpeed);
      const waveHeightM = toNumber(waveHeight);
      const airTempC = toNumber(airTemp);
      const waterTempC = toNumber(waterTemp);

      if (latitude === null || longitude === null) {
        continue;
      }

      if (waveHeightM === null && waterTempC === null && windSpeedMs === null) {
        continue;
      }

      buoys.push({
        id: stationId,
        coordinates: {
          latitude,
          longitude,
        },
        timestamp: `${year}-${month}-${day}T${hour}:${minute}:00Z`,
        windSpeed_ms: windSpeedMs,
        waveHeight_m: waveHeightM,
        airTemp_c: airTempC,
        waterTemp_c: waterTempC,
      });

      if (buoys.length >= 200) {
        break;
      }
    }

    return NextResponse.json({
      success: true,
      count: buoys.length,
      buoys,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch buoy data",
      count: 0,
      buoys: [],
      timestamp: new Date().toISOString(),
    });
  }
}

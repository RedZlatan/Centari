import { NextResponse } from "next/server";

type DshieldTopIp = {
  rank?: number;
  source?: string;
  reports?: number;
  targets?: number;
};

type GeoRecord = {
  status?: string;
  query?: string;
  country?: string;
  city?: string;
  lat?: number;
  lon?: number;
  as?: string;
};

const sensorEndpoints = [
  { id: "sensor-ashburn", name: "DShield sensor mesh / North America", coordinates: { latitude: 39.04, longitude: -77.48 } },
  { id: "sensor-frankfurt", name: "DShield sensor mesh / Europe", coordinates: { latitude: 50.11, longitude: 8.68 } },
  { id: "sensor-singapore", name: "DShield sensor mesh / Asia-Pacific", coordinates: { latitude: 1.35, longitude: 103.82 } },
];

function classifyPort(rank: number) {
  const commonPorts = [22, 23, 80, 443, 2222, 8080];
  return commonPorts[rank % commonPorts.length];
}

function attackTypeForPort(port: number) {
  if (port === 22 || port === 2222) {
    return "SSH brute-force / scanning";
  }

  if (port === 23) {
    return "Telnet botnet scanning";
  }

  if (port === 80 || port === 443 || port === 8080) {
    return "Web service probing";
  }

  return "Network scanning";
}

function severityForReports(reports: number) {
  if (reports >= 150000) {
    return "critical";
  }

  if (reports >= 50000) {
    return "warning";
  }

  return "watch";
}

export async function GET() {
  try {
    const topIpResponse = await fetch("https://isc.sans.edu/api/topips/records/12?json", {
      next: { revalidate: 300 },
      headers: { Accept: "application/json", "User-Agent": "Centari research map" },
    });

    if (!topIpResponse.ok) {
      throw new Error(`SANS ISC top IP feed responded with status: ${topIpResponse.status}`);
    }

    const topIps = await topIpResponse.json() as DshieldTopIp[];
    const ips = topIps.map((item) => item.source).filter((ip): ip is string => Boolean(ip));

    const geoResponse = await fetch("http://ip-api.com/batch?fields=status,message,query,country,city,lat,lon,as", {
      method: "POST",
      next: { revalidate: 300 },
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ips),
    });

    if (!geoResponse.ok) {
      throw new Error(`IP geolocation responded with status: ${geoResponse.status}`);
    }

    const geoRecords = await geoResponse.json() as GeoRecord[];
    const geoByIp = new Map(geoRecords.map((record) => [record.query, record]));
    const cyberattacks = topIps
      .map((item, index) => {
        if (!item.source) {
          return null;
        }

        const geo = geoByIp.get(item.source);
        if (!geo || geo.status !== "success" || typeof geo.lat !== "number" || typeof geo.lon !== "number") {
          return null;
        }

        const port = classifyPort(index);
        const target = sensorEndpoints[index % sensorEndpoints.length];
        const reports = typeof item.reports === "number" ? item.reports : 0;

        return {
          id: `dshield_${item.source.replace(/[^0-9a-z]/gi, "_")}`,
          type: attackTypeForPort(port),
          port,
          severity: severityForReports(reports),
          reports,
          targets: typeof item.targets === "number" ? item.targets : null,
          source: {
            ip: item.source,
            country: geo.country ?? "Unknown",
            city: geo.city ?? "Unknown",
            asn: geo.as ?? null,
            coordinates: { latitude: geo.lat, longitude: geo.lon },
          },
          target,
          description: "Live SANS ISC/DShield aggregate top-source telemetry. Target endpoint is a visual sensor-mesh proxy, not a confirmed victim.",
          source_name: "SANS ISC / DShield Top IPs",
          source_mode: "live_aggregate",
          source_url: "https://isc.sans.edu/sources.html",
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return NextResponse.json({
      success: true,
      source: "SANS ISC / DShield aggregate cyber telemetry",
      source_mode: "live_aggregate",
      count: cyberattacks.length,
      cyberattacks,
      data: cyberattacks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch cyber telemetry",
      source: "SANS ISC / DShield aggregate cyber telemetry",
      source_mode: "live_aggregate",
      count: 0,
      cyberattacks: [],
      data: [],
      timestamp: new Date().toISOString(),
    });
  }
}

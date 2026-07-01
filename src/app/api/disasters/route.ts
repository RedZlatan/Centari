import { XMLParser } from "fast-xml-parser";
import { NextResponse } from "next/server";

type GdacsItem = {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  "gdacs:eventid"?: string | number;
  "gdacs:eventtype"?: string;
  "gdacs:alertlevel"?: string;
  "gdacs:country"?: string;
  "gdacs:fromdate"?: string;
  "geo:lat"?: string | number;
  "geo:long"?: string | number;
  "georss:point"?: string;
};

type GdacsPayload = {
  rss?: {
    channel?: {
      item?: GdacsItem[] | GdacsItem;
    };
  };
};

function toArray<T>(value: T[] | T | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function parseCoordinate(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseGeoPoint(point: string | undefined) {
  if (!point) {
    return null;
  }

  const [lat, lon] = point.split(/\s+/).map((part) => Number.parseFloat(part));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return { latitude: lat, longitude: lon };
}

function getDisasterType(eventType: string) {
  const aliases: Record<string, string> = {
    TC: "Tropical cyclone",
    FL: "Flood",
    VO: "Volcano",
    EQ: "Earthquake",
    DR: "Drought",
    WF: "Wildfire",
  };

  return aliases[eventType] ?? (eventType || "Disaster");
}

export async function GET() {
  try {
    const response = await fetch("https://www.gdacs.org/xml/rss.xml", { next: { revalidate: 600 } });

    if (!response.ok) {
      throw new Error(`GDACS RSS responded with status: ${response.status}`);
    }

    const xml = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: false,
      parseTagValue: false,
      trimValues: true,
    });
    const payload = parser.parse(xml) as GdacsPayload;
    const items = toArray(payload.rss?.channel?.item);
    const disasters = items
      .map((item, index) => {
        const alert = String(item["gdacs:alertlevel"] ?? "").toLowerCase();
        if (alert !== "orange" && alert !== "red") {
          return null;
        }

        const geoPoint = parseGeoPoint(item["georss:point"]);
        const latitude = geoPoint?.latitude ?? parseCoordinate(item["geo:lat"]);
        const longitude = geoPoint?.longitude ?? parseCoordinate(item["geo:long"]);

        if (latitude === null || longitude === null) {
          return null;
        }

        const eventType = String(item["gdacs:eventtype"] ?? "");

        return {
          id: String(item["gdacs:eventid"] ?? `gdacs-${index}`),
          type: getDisasterType(eventType),
          name: item.title ?? "GDACS alert",
          country: item["gdacs:country"] ?? "Unknown region",
          severity: alert === "red" ? "Red" : "Orange",
          coordinates: {
            latitude,
            longitude,
          },
          description: item.description ?? item.title ?? "Near real-time GDACS disaster alert.",
          date: item.pubDate ?? item["gdacs:fromdate"] ?? null,
          source: item.link ?? "https://www.gdacs.org/",
          source_mode: "live" as const,
          source_name: "GDACS",
        };
      })
      .filter((disaster): disaster is NonNullable<typeof disaster> => Boolean(disaster))
      .slice(0, 24);

    return NextResponse.json({
      success: true,
      count: disasters.length,
      data: disasters,
      timestamp: new Date().toISOString(),
      source_mode: "live",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch disaster data",
      count: 0,
      data: [],
      timestamp: new Date().toISOString(),
      source_mode: "live",
    });
  }
}

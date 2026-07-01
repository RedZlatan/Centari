import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

type DsnTarget = {
  name?: string;
  uplegRange?: string | number;
  downlegRange?: string | number;
  rtlt?: string | number;
};

type DsnSignal = {
  dataRate?: string | number;
  band?: string | number;
};

type DsnDish = {
  target?: DsnTarget;
  downSignal?: DsnSignal;
  upSignal?: DsnSignal;
};

type SpaceObject = {
  id: string;
  name: string;
  type: "deep-space" | "zombie";
  distance: string;
  status: string;
  dataRate: string;
  band: string;
  description?: string;
  rtlt?: string;
};

const zombieSatellites: SpaceObject[] = [
  {
    id: "zombie-ao7",
    name: "AO-7 (OSCAR 7)",
    type: "zombie",
    distance: "1450",
    status: "active-sunlight",
    dataRate: "beacon-only",
    band: "VHF/UHF",
    description: "Oldest active amateur radio satellite, revived after 21 years of silence.",
  },
  {
    id: "zombie-transit5b5",
    name: "Transit 5B-5",
    type: "zombie",
    distance: "1050",
    status: "transmitting",
    dataRate: "telemetry",
    band: "VHF",
    description: "Launched in 1964, continues to transmit telemetry data continuously.",
  },
];

function toText(value: unknown, fallback = "unknown") {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function toArray<T>(value: T | T[] | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function safeId(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET() {
  try {
    const response = await fetch("https://eyes.jpl.nasa.gov/dsn/data/dsn.xml", {
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      throw new Error(`NASA DSN returned ${response.status}`);
    }

    const xmlData = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
    const parsed = parser.parse(xmlData) as { dsn?: { dish?: DsnDish | DsnDish[] } };
    const activeTargets = new Map<string, SpaceObject>();

    for (const dish of toArray(parsed.dsn?.dish)) {
      const targetName = toText(dish.target?.name, "");

      if (!targetName || targetName.toUpperCase() === "DSN") {
        continue;
      }

      if (!activeTargets.has(targetName)) {
        const distance = toText(
          dish.target?.uplegRange !== "-1" ? dish.target?.uplegRange : dish.target?.downlegRange,
        );

        activeTargets.set(targetName, {
          id: `dsn-${safeId(targetName)}`,
          name: targetName,
          type: "deep-space",
          distance,
          rtlt: toText(dish.target?.rtlt),
          status: "active",
          dataRate: toText(dish.downSignal?.dataRate ?? dish.upSignal?.dataRate),
          band: toText(dish.downSignal?.band ?? dish.upSignal?.band),
        });
      }
    }

    return NextResponse.json({
      success: true,
      satellites: [...Array.from(activeTargets.values()).slice(0, 4), ...zombieSatellites],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch space data",
        satellites: zombieSatellites,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  }
}

import AdmZip from "adm-zip";
import { NextResponse } from "next/server";

type GdeltConflictEvent = {
  id: string;
  actor1: string;
  actor2: string;
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  event_code: string;
  event_root_code: string;
  num_mentions: number;
  num_sources: number;
  source_url: string | null;
  timestamp: string;
  description: string;
  source_mode: "live";
  source_name: string;
};

const gdeltLastUpdateUrl = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";
const materialConflictRootCodes = new Set(["18", "19", "20"]);
const eventDescriptions: Record<string, string> = {
  "18": "Material conflict reported.",
  "19": "Fight, assault or armed clash reported.",
  "20": "Mass violence event reported.",
};
const conflictSignalTerms = [
  "airstrike",
  "armed",
  "army",
  "assault",
  "attack",
  "bomb",
  "clash",
  "drone",
  "explosion",
  "fighter",
  "forces",
  "gaza",
  "hamas",
  "hostage",
  "iran",
  "israel",
  "killed",
  "kyiv",
  "mercenaries",
  "militant",
  "military",
  "missile",
  "niger",
  "police",
  "protest",
  "russia",
  "russian",
  "security",
  "terror",
  "ukraine",
  "ukrainian",
  "violence",
  "war",
];
const conflictNoiseTerms = [
  "antitrust",
  "battle-against",
  "bus-crash",
  "court-bill",
  "election",
  "entertainment",
  "inheritance",
  "senate-race",
  "state-funeral",
  "structure-fire",
  "trademark",
  "wildfire",
];

function parseNumber(value: string | undefined) {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseGdeltTimestamp(value: string | undefined) {
  if (!value || !/^\d{14}$/.test(value)) {
    return new Date().toISOString();
  }

  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  const hour = value.slice(8, 10);
  const minute = value.slice(10, 12);
  const second = value.slice(12, 14);

  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
}

function normalizeForSearch(value: string) {
  return value.toLowerCase().replace(/[_+%]/g, " ");
}

function isRelevantConflictEvent(event: {
  actor1: string;
  actor2: string;
  location: string;
  sourceUrl: string;
}) {
  const haystack = normalizeForSearch(
    `${event.actor1} ${event.actor2} ${event.location} ${event.sourceUrl}`,
  );

  if (conflictNoiseTerms.some((term) => haystack.includes(term))) {
    return false;
  }

  return conflictSignalTerms.some((term) => haystack.includes(term));
}

async function getLatestExportUrl() {
  const response = await fetch(gdeltLastUpdateUrl, { next: { revalidate: 300 } });

  if (!response.ok) {
    throw new Error(`GDELT lastupdate responded with status: ${response.status}`);
  }

  const text = await response.text();
  const exportLine = text
    .split(/\r?\n/)
    .find((line) => line.includes(".export.CSV.zip"));
  const url = exportLine?.trim().split(/\s+/).find((part) => part.startsWith("http"));

  if (!url) {
    throw new Error("GDELT lastupdate did not include an export CSV URL");
  }

  return url;
}

function parseExportCsv(csv: string) {
  const events: GdeltConflictEvent[] = [];

  for (const line of csv.split(/\r?\n/)) {
    if (!line) {
      continue;
    }

    const columns = line.split("\t");
    const eventRootCode = columns[28];

    if (!materialConflictRootCodes.has(eventRootCode)) {
      continue;
    }

    const latitude = parseNumber(columns[56]);
    const longitude = parseNumber(columns[57]);

    if (latitude === null || longitude === null) {
      continue;
    }

    const numMentions = parseInteger(columns[31]) ?? 0;
    const numSources = parseInteger(columns[32]) ?? 0;
    const actor1 = columns[6] || "Unknown actor";
    const actor2 = columns[16] || "Unknown actor";
    const location = columns[52] || columns[36] || columns[43] || "Unknown location";
    const eventCode = columns[26] || eventRootCode;

    const sourceUrl = columns[60] || "";

    if (
      !isRelevantConflictEvent({
        actor1,
        actor2,
        location,
        sourceUrl,
      })
    ) {
      continue;
    }

    events.push({
      id: columns[0] || `${eventCode}-${latitude}-${longitude}-${events.length}`,
      actor1,
      actor2,
      location,
      coordinates: {
        latitude,
        longitude,
      },
      event_code: eventCode,
      event_root_code: eventRootCode,
      num_mentions: numMentions,
      num_sources: numSources,
      source_url: sourceUrl || null,
      timestamp: parseGdeltTimestamp(columns[59]),
      description: eventDescriptions[eventRootCode] ?? "Conflict event reported by GDELT.",
      source_mode: "live",
      source_name: "GDELT Project 2.0",
    });
  }

  const deduped = new Map<string, GdeltConflictEvent>();

  for (const event of events) {
    const dedupeKey = `${event.source_url ?? event.id}:${event.location}:${event.event_code}`;
    const existing = deduped.get(dedupeKey);

    if (!existing || event.num_mentions > existing.num_mentions) {
      deduped.set(dedupeKey, event);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => b.num_mentions - a.num_mentions)
    .slice(0, 60);
}

export async function GET() {
  try {
    const exportUrl = await getLatestExportUrl();
    const response = await fetch(exportUrl, { next: { revalidate: 300 } });

    if (!response.ok) {
      throw new Error(`GDELT export responded with status: ${response.status}`);
    }

    const zipBuffer = Buffer.from(await response.arrayBuffer());
    const zip = new AdmZip(zipBuffer);
    const csvEntry = zip.getEntries().find((entry) => entry.entryName.endsWith(".CSV"));

    if (!csvEntry) {
      throw new Error("GDELT ZIP did not include a CSV export");
    }

    const conflicts = parseExportCsv(csvEntry.getData().toString("utf8"));

    return NextResponse.json({
      success: true,
      source: "GDELT Project 2.0 (Live News/Events Stream)",
      source_mode: "live",
      source_name: "GDELT Project 2.0",
      count: conflicts.length,
      data: conflicts,
      timestamp: new Date().toISOString(),
      export_url: exportUrl,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch GDELT conflict data",
      count: 0,
      data: [],
      timestamp: new Date().toISOString(),
      source_mode: "live",
      source_name: "GDELT Project 2.0",
    });
  }
}

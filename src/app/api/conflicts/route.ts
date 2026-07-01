import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    count: 0,
    data: [],
    timestamp: new Date().toISOString(),
    source_mode: "requires_licensed_source",
    source_name: "ACLED-style conflict scaffold",
    message: "Conflict visualisation is scaffolded, but no events are exposed until a licensed real data source is connected.",
  });
}

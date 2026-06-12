import { NextResponse } from "next/server";

// Used by docker-compose healthcheck: GET /api/health
export function GET() {
  return NextResponse.json({ status: "ok" });
}

import { NextResponse } from "next/server";
import { getSupabaseAnon, isSupabaseConfigured } from "@/lib/supabase";
import { getFallbackSignals } from "@/lib/research-api-fallback";

const VALID_CATEGORIES = [
  "ai", "xr", "robotics", "quantum", "space", "energy", "materials",
] as const;

const VALID_REGIONS = [
  "North America", "Europe", "Asia-Pacific",
  "Middle East", "Africa", "Latin America", "Oceania",
] as const;

const VALID_SIGNAL_TYPES = [
  "paper", "news", "funding", "patent", "launch", "release", "lab_publication",
] as const;

type Category   = typeof VALID_CATEGORIES[number];
type Region     = typeof VALID_REGIONS[number];
type SignalType = typeof VALID_SIGNAL_TYPES[number];

const DEFAULT_LIMIT = 50;
const MAX_LIMIT     = 100;

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const domainParam = searchParams.get("domain");
  const regionParam = searchParams.get("region");
  const typeParam   = searchParams.get("type");
  const limitParam  = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  if (domainParam && !VALID_CATEGORIES.includes(domainParam as Category)) {
    return NextResponse.json(
      { error: `Invalid domain. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
      { status: 400 },
    );
  }

  if (regionParam && !VALID_REGIONS.includes(regionParam as Region)) {
    return NextResponse.json(
      { error: `Invalid region. Must be one of: ${VALID_REGIONS.join(", ")}` },
      { status: 400 },
    );
  }

  if (typeParam && !VALID_SIGNAL_TYPES.includes(typeParam as SignalType)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${VALID_SIGNAL_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const limit  = Math.min(parseInt(limitParam  ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(parseInt(offsetParam ?? "0", 10) || 0, 0);

  // ── JSON fallback (no Supabase configured) ───────────────────────────────────
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      getFallbackSignals({ domain: domainParam, region: regionParam, type: typeParam, limit, offset }),
    );
  }

  // ── Live Supabase query ──────────────────────────────────────────────────────
  try {
    const supabase = getSupabaseAnon();

    // !inner join when filtering by region: only return signals that have a
    // matching location row. Regular join otherwise so signals without a
    // location row are still included.
    const locationJoin = regionParam
      ? "signal_locations!inner(city,country_code,country_name,region,lat,lng,location_confidence,place_type)"
      : "signal_locations(city,country_code,country_name,region,lat,lng,location_confidence,place_type)";

    let query = supabase
      .from("signals")
      .select(
        `id,slug,title,summary,category,secondary_categories,
         signal_type,tags,confidence,curator_score,signal_strength,
         novelty_score,momentum_score,published_at,source_url,source_name,
         ${locationJoin}`,
        { count: "exact" },
      )
      .eq("status", "approved")
      .order("signal_strength", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (domainParam) query = query.eq("category",              domainParam);
    if (typeParam)   query = query.eq("signal_type",           typeParam);
    if (regionParam) query = query.eq("signal_locations.region", regionParam);

    const { data, count, error } = await query;

    if (error) {
      console.error("[/api/research/signals] supabase error:", error);
      return NextResponse.json({ error: "Database error." }, { status: 500 });
    }

    const signals = (data ?? []).map((row) => {
      const locations = Array.isArray(row.signal_locations)
        ? row.signal_locations
        : row.signal_locations
        ? [row.signal_locations]
        : [];
      const { signal_locations: _sl, ...signal } = row as typeof row & { signal_locations: unknown };
      return { ...signal, location: locations[0] ?? null };
    });

    return NextResponse.json({ data: signals, total: count ?? 0, limit, offset });
  } catch (err) {
    console.error("[/api/research/signals] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

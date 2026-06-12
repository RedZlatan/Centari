import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const VALID_CATEGORIES = [
  "ai", "xr", "robotics", "quantum", "space", "energy", "materials",
] as const;

type Category = typeof VALID_CATEGORIES[number];

const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 50;

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const domainParam = searchParams.get("domain");
  const limitParam  = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  if (domainParam && !VALID_CATEGORIES.includes(domainParam as Category)) {
    return NextResponse.json(
      { error: `Invalid domain. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
      { status: 400 },
    );
  }

  const limit  = Math.min(parseInt(limitParam  ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(parseInt(offsetParam ?? "0", 10) || 0, 0);

  try {
    const supabase = getSupabase();

    let query = supabase
      .from("trends")
      .select(
        `id,slug,title,summary,primary_category,status,
         trend_score,momentum_score,signal_count,
         first_signal_at,last_signal_at,
         trend_signals(
           relevance_score,
           signals(
             id,slug,title,category,signal_strength,
             signal_type,published_at,source_name,source_url,
             signal_locations(region,country_code,country_name)
           )
         )`,
        { count: "exact" },
      )
      .eq("status", "active")
      .order("trend_score", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (domainParam) query = query.eq("primary_category", domainParam);

    const { data, count, error } = await query;

    if (error) {
      console.error("[/api/research/trends] supabase error:", error);
      return NextResponse.json({ error: "Database error." }, { status: 500 });
    }

    // Reshape trend_signals into a flat signals array with relevance_score
    const trends = (data ?? []).map((trend) => {
      const rawLinks = Array.isArray(trend.trend_signals) ? trend.trend_signals : [];

      const signals = rawLinks
        .map((link: { relevance_score: number; signals: unknown }) => {
          if (!link.signals || typeof link.signals !== "object") return null;
          const sig = link.signals as Record<string, unknown>;
          const locations = Array.isArray(sig.signal_locations)
            ? sig.signal_locations
            : sig.signal_locations
            ? [sig.signal_locations]
            : [];
          return {
            id:              sig.id,
            slug:            sig.slug,
            title:           sig.title,
            category:        sig.category,
            signal_type:     sig.signal_type,
            signal_strength: sig.signal_strength,
            published_at:    sig.published_at,
            source_name:     sig.source_name,
            source_url:      sig.source_url,
            region:          (locations[0] as Record<string, unknown> | undefined)?.region ?? null,
            relevance_score: link.relevance_score,
          };
        })
        .filter(Boolean)
        .sort((a, b) =>
          ((b as { relevance_score: number }).relevance_score ?? 0) -
          ((a as { relevance_score: number }).relevance_score ?? 0),
        );

      const { trend_signals: _ts, ...rest } = trend as typeof trend & { trend_signals: unknown };
      return { ...rest, signals };
    });

    return NextResponse.json({
      data:   trends,
      total:  count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error("[/api/research/trends] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { brainRegions, type BrainRegionId } from "@/lib/brain-regions";
import { journalEntries } from "@/lib/journal-data";
import { getSupabaseAnon, isSupabaseConfigured } from "@/lib/supabase";

const VALID_PERIODS = ["daily", "weekly", "monthly"] as const;
const VALID_REGIONS = brainRegions.map((region) => region.id);

type Period = typeof VALID_PERIODS[number];

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const regionParam = searchParams.get("region") as BrainRegionId | null;
  const periodParam = searchParams.get("period") as Period | null;

  if (regionParam && !VALID_REGIONS.includes(regionParam)) {
    return NextResponse.json(
      { error: `Invalid region. Must be one of: ${VALID_REGIONS.join(", ")}` },
      { status: 400 },
    );
  }

  if (periodParam && !VALID_PERIODS.includes(periodParam)) {
    return NextResponse.json(
      { error: `Invalid period. Must be one of: ${VALID_PERIODS.join(", ")}` },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    const regions = regionParam
      ? brainRegions.filter((region) => region.id === regionParam)
      : brainRegions;
    return NextResponse.json({
      data: {
        regions,
        snapshots: [],
        saved_signals: [],
        fallback_entries: journalEntries,
      },
      source: "fallback",
    });
  }

  try {
    const supabase = getSupabaseAnon();
    const period = periodParam ?? "daily";

    let regionsQuery = supabase
      .from("journal_brain_regions")
      .select("slug,title,area,summary,archive_role,sort_order")
      .order("sort_order", { ascending: true });

    if (regionParam) {
      regionsQuery = regionsQuery.eq("slug", regionParam);
    }

    let snapshotsQuery = supabase
      .from("brain_region_snapshots")
      .select("period,brain_region_slug,window_start,window_end,signal_count,top_signal_ids,top_titles,domain_mix,rule_summary,ai_summary,created_at")
      .eq("period", period)
      .order("window_start", { ascending: false })
      .limit(regionParam ? 12 : 40);

    if (regionParam) {
      snapshotsQuery = snapshotsQuery.eq("brain_region_slug", regionParam);
    }

    let mappingsQuery = supabase
      .from("signal_brain_regions")
      .select(`
        brain_region_slug,
        relevance,
        reason,
        signals(
          id,slug,title,summary,category,secondary_categories,signal_type,tags,
          confidence,curator_score,signal_strength,novelty_score,momentum_score,
          published_at,source_url,source_name
        )
      `)
      .order("relevance", { ascending: false })
      .limit(regionParam ? 30 : 120);

    if (regionParam) {
      mappingsQuery = mappingsQuery.eq("brain_region_slug", regionParam);
    }

    const [regionsResult, snapshotsResult, mappingsResult] = await Promise.all([
      regionsQuery,
      snapshotsQuery,
      mappingsQuery,
    ]);

    if (regionsResult.error) {
      throw new Error(regionsResult.error.message);
    }
    if (snapshotsResult.error) {
      throw new Error(snapshotsResult.error.message);
    }
    if (mappingsResult.error) {
      throw new Error(mappingsResult.error.message);
    }

    return NextResponse.json({
      data: {
        regions: regionsResult.data ?? [],
        snapshots: snapshotsResult.data ?? [],
        saved_signals: mappingsResult.data ?? [],
      },
      source: "supabase",
    });
  } catch (err) {
    console.error("[/api/journal/brain] unexpected error:", err);
    return NextResponse.json({ error: "Database error." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

const VALID_STATUSES = ["pending", "approved", "rejected"] as const;
type Status = (typeof VALID_STATUSES)[number];

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const statusParam = (searchParams.get("status") ?? "pending") as Status;
  const categoryParam = searchParams.get("category");
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  if (!VALID_STATUSES.includes(statusParam)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const limit  = Math.min(parseInt(limitParam  ?? "200", 10) || 200, 500);
  const offset = Math.max(parseInt(offsetParam ?? "0",   10) || 0, 0);

  try {
    const supabase = getSupabase();

    let query = supabase
      .from("signals")
      .select(
        "id,title,summary,category,curator_score,signal_strength,novelty_score,published_at,source_url,source_name,status,ingested_at",
        { count: "exact" },
      )
      .eq("status", statusParam)
      .order("curator_score", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (categoryParam) {
      query = query.eq("category", categoryParam);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("[/api/admin/signals] supabase error:", error);
      return NextResponse.json({ error: "Database error." }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], total: count ?? 0, limit, offset });
  } catch (err) {
    console.error("[/api/admin/signals] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

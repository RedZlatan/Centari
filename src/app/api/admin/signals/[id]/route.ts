import { NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

const VALID_STATUSES = ["approved", "rejected"] as const;
type Status = (typeof VALID_STATUSES)[number];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing signal id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("status" in body) ||
    !VALID_STATUSES.includes((body as { status: unknown }).status as Status)
  ) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const status = (body as { status: Status }).status;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("signals")
      .update({ status })
      .eq("id", id)
      .select("id,status")
      .single();

    if (error) {
      console.error("[/api/admin/signals/[id]] supabase error:", error);
      return NextResponse.json({ error: "Database error." }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Signal not found." }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/admin/signals/[id]] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

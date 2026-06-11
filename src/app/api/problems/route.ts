import { NextResponse } from "next/server";
import {
  createProblem,
  CATEGORIES,
  ESTIMATED_VALUES,
  VISIBILITY_OPTIONS,
  type Category,
  type EstimatedValue,
  type Visibility,
} from "@/lib/problems";

// ─── Rate limiter ────────────────────────────────────────────────────────────
// In-memory. Resets on server restart. Upgrade to Redis/DB-backed if needed.

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 3;
const rateLimitStore = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const history = (rateLimitStore.get(ip) ?? []).filter(
    (t) => now - t < WINDOW_MS
  );
  if (history.length >= MAX_PER_WINDOW) return false;
  history.push(now);
  rateLimitStore.set(ip, history);
  return true;
}

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  );
}

// ─── Validation ──────────────────────────────────────────────────────────────

type FieldErrors = Record<string, string>;

function validate(body: Record<string, unknown>): FieldErrors {
  const errors: FieldErrors = {};

  const title = body.title;
  if (!title || typeof title !== "string" || title.trim().length < 5) {
    errors.title = "Title must be at least 5 characters.";
  } else if (title.trim().length > 200) {
    errors.title = "Title must be under 200 characters.";
  }

  const description = body.description;
  if (
    !description ||
    typeof description !== "string" ||
    description.trim().length < 20
  ) {
    errors.description = "Description must be at least 20 characters.";
  } else if (description.trim().length > 5000) {
    errors.description = "Description must be under 5,000 characters.";
  }

  const category = body.category;
  if (
    !category ||
    typeof category !== "string" ||
    !CATEGORIES.includes(category as Category)
  ) {
    errors.category = "Please select a valid category.";
  }

  const ev = body.estimated_value;
  if (ev !== undefined && ev !== null && ev !== "") {
    if (
      typeof ev !== "string" ||
      !ESTIMATED_VALUES.includes(ev as EstimatedValue)
    ) {
      errors.estimated_value = "Invalid value range.";
    }
  }

  const visibility = body.visibility;
  if (
    visibility !== undefined &&
    visibility !== null &&
    visibility !== "" &&
    !VISIBILITY_OPTIONS.includes(visibility as Visibility)
  ) {
    errors.visibility = "Visibility must be 'private' or 'public'.";
  }

  const email = body.email_optional;
  if (email && typeof email === "string" && email.trim().length > 0) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email_optional = "Please enter a valid email address.";
    } else if (email.trim().length > 254) {
      errors.email_optional = "Email address is too long.";
    }
  }

  const name = body.name_optional;
  if (name && typeof name === "string" && name.trim().length > 100) {
    errors.name_optional = "Name must be under 100 characters.";
  }

  return errors;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON." },
      { status: 400 }
    );
  }

  // Honeypot — return fake success so the bot learns nothing
  if (body._honey && String(body._honey).trim().length > 0) {
    return NextResponse.json({ success: true });
  }

  const ip = clientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, message: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  const errors = validate(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 400 });
  }

  try {
    const problem = createProblem({
      title: (body.title as string).trim(),
      description: (body.description as string).trim(),
      category: (body.category as string).trim() as Category,
      estimated_value: body.estimated_value
        ? ((body.estimated_value as string).trim() as EstimatedValue)
        : undefined,
      visibility: body.visibility
        ? ((body.visibility as string).trim() as Visibility)
        : "private",
      name_optional: body.name_optional
        ? (body.name_optional as string).trim()
        : undefined,
      email_optional: body.email_optional
        ? (body.email_optional as string).trim()
        : undefined,
      ip_address: ip,
      user_agent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ success: true, id: problem.id }, { status: 201 });
  } catch (err) {
    console.error("[/api/problems] storage error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to save. Please try again." },
      { status: 500 }
    );
  }
}

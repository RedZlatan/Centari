import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type VisionNote = {
  id: string;
  text: string;
  position: [number, number, number];
  createdAt: string;
};

const storePath = path.join(process.cwd(), "data", "vision-notes.json");

async function readNotes(): Promise<VisionNote[]> {
  try {
    const data = await readFile(storePath, "utf8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeNotes(notes: VisionNote[]) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(notes, null, 2)}\n`, "utf8");
}

function isPosition(value: unknown): value is [number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

export async function GET() {
  const notes = await readNotes();
  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 420) : "";
  const position = isPosition(body?.position) ? body.position : null;

  if (!text || !position) {
    return NextResponse.json({ error: "Invalid vision note" }, { status: 400 });
  }

  const note: VisionNote = {
    id: typeof body?.id === "string" && body.id.length < 80 ? body.id : crypto.randomUUID(),
    text,
    position,
    createdAt: new Date().toISOString(),
  };
  const notes = await readNotes();
  const nextNotes = [...notes.filter((item) => item.id !== note.id), note].slice(-180);

  await writeNotes(nextNotes);

  return NextResponse.json({ note }, { status: 201 });
}

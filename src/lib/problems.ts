import { randomUUID } from "crypto";
import { getDb } from "./db";

export const CATEGORIES = [
  "xr-simulation",
  "ai-automation",
  "hardware-sensors",
  "data-intelligence",
  "training-operations",
  "infrastructure",
  "research-development",
  "other",
] as const;

export const ESTIMATED_VALUES = [
  "under-50k",
  "50k-250k",
  "250k-1m",
  "over-1m",
  "unknown",
] as const;

export const VISIBILITY_OPTIONS = ["private", "public"] as const;
export const STATUS_OPTIONS = ["new", "reviewed", "contacted", "archived"] as const;

export type Category = (typeof CATEGORIES)[number];
export type EstimatedValue = (typeof ESTIMATED_VALUES)[number];
export type Visibility = (typeof VISIBILITY_OPTIONS)[number];
export type Status = (typeof STATUS_OPTIONS)[number];

export interface Problem {
  id: string;
  title: string;
  description: string;
  category: Category;
  estimated_value: EstimatedValue | null;
  visibility: Visibility;
  name_optional: string | null;
  email_optional: string | null;
  status: Status;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface CreateProblemInput {
  title: string;
  description: string;
  category: Category;
  estimated_value?: EstimatedValue;
  visibility?: Visibility;
  name_optional?: string;
  email_optional?: string;
  ip_address?: string;
  user_agent?: string;
}

export function createProblem(input: CreateProblemInput): Problem {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO problems (
      id, title, description, category, estimated_value,
      visibility, name_optional, email_optional, status,
      created_at, ip_address, user_agent
    ) VALUES (
      @id, @title, @description, @category, @estimated_value,
      @visibility, @name_optional, @email_optional, @status,
      @created_at, @ip_address, @user_agent
    )
  `).run({
    id,
    title: input.title,
    description: input.description,
    category: input.category,
    estimated_value: input.estimated_value ?? null,
    visibility: input.visibility ?? "private",
    name_optional: input.name_optional ?? null,
    email_optional: input.email_optional ?? null,
    status: "new",
    created_at: now,
    ip_address: input.ip_address ?? null,
    user_agent: input.user_agent ?? null,
  });

  return db.prepare("SELECT * FROM problems WHERE id = ?").get(id) as Problem;
}

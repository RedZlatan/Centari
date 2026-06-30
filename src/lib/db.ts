import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH =
  process.env.DATABASE_PATH ??
  path.join(process.cwd(), "data", "problems.db");

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS problems (
      id              TEXT PRIMARY KEY,
      title           TEXT NOT NULL,
      description     TEXT NOT NULL,
      category        TEXT NOT NULL,
      estimated_value TEXT,
      visibility      TEXT NOT NULL DEFAULT 'private',
      name_optional   TEXT,
      email_optional  TEXT,
      status          TEXT NOT NULL DEFAULT 'new',
      created_at      TEXT NOT NULL,
      ip_address      TEXT,
      user_agent      TEXT
    );
  `);
}

// Persist across hot-reloads in development
const g = global as typeof globalThis & { _problemsDb?: Database.Database };

export function getDb(): Database.Database {
  if (!g._problemsDb) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
    g._problemsDb = db;
  }
  return g._problemsDb;
}

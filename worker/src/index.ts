import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";

// ── Configuration ─────────────────────────────────────────────────────────────

const CONFIG = {
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://ollama:11434",
  ollamaModel:   process.env.OLLAMA_MODEL   ?? "qwen3:4b",
  workerCron:    process.env.WORKER_CRON    ?? "0 */6 * * *",
  logLevel:      process.env.LOG_LEVEL      ?? "info",
  supabaseUrl:   process.env.SUPABASE_URL,
  supabaseKey:   process.env.SUPABASE_SERVICE_ROLE_KEY,
  databaseUrl:   process.env.DATABASE_URL,
};

const RUN_ONCE = process.argv.includes("--once");

// ── Logging ───────────────────────────────────────────────────────────────────

function log(level: "info" | "warn" | "error", msg: string, data?: unknown) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...(data !== undefined ? { data } : {}),
  });
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

// ── Ollama client ─────────────────────────────────────────────────────────────

async function ollamaGenerate(prompt: string): Promise<string> {
  const res = await fetch(`${CONFIG.ollamaBaseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CONFIG.ollamaModel,
      prompt,
      stream: false,
      options: { temperature: 0.2, num_predict: 256 },
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as { response: string };
  return body.response.trim();
}

async function checkOllama(): Promise<boolean> {
  try {
    const res = await fetch(`${CONFIG.ollamaBaseUrl}/api/tags`);
    if (!res.ok) return false;
    const body = (await res.json()) as { models: Array<{ name: string }> };
    const loaded = body.models.some((m) =>
      m.name.startsWith(CONFIG.ollamaModel.split(":")[0])
    );
    if (!loaded) {
      log("warn", `Ollama is up but model ${CONFIG.ollamaModel} is not pulled yet`);
      log("warn", `Run: docker compose exec ollama ollama pull ${CONFIG.ollamaModel}`);
    }
    return loaded;
  } catch {
    return false;
  }
}

// ── Supabase client ───────────────────────────────────────────────────────────

function buildSupabaseClient() {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) return null;
  return createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
    auth: { persistSession: false },
  });
}

// ── Postgres client ───────────────────────────────────────────────────────────

function buildPgPool(): Pool | null {
  if (!CONFIG.databaseUrl) return null;
  return new Pool({ connectionString: CONFIG.databaseUrl, max: 5 });
}

async function checkPostgres(pool: Pool): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

async function ensureSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS worker_runs (
      id          SERIAL PRIMARY KEY,
      started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      status      TEXT NOT NULL DEFAULT 'running',
      signals_processed INTEGER DEFAULT 0,
      error_message TEXT
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS worker_signals (
      id            TEXT PRIMARY KEY,
      raw_title     TEXT NOT NULL,
      raw_url       TEXT NOT NULL,
      domain        TEXT,
      summary       TEXT,
      curator_score INTEGER,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      run_id        INTEGER REFERENCES worker_runs(id)
    );
  `);
}

// ── Core worker logic ─────────────────────────────────────────────────────────

async function runWorker(pool: Pool | null): Promise<void> {
  log("info", "Worker run started", {
    model: CONFIG.ollamaModel,
    hasDatabase: pool !== null,
  });

  // Record this run start
  let runId: number | null = null;
  if (pool) {
    const result = await pool.query<{ id: number }>(
      "INSERT INTO worker_runs (status) VALUES ('running') RETURNING id"
    );
    runId = result.rows[0].id;
  }

  let processed = 0;
  let error: string | null = null;

  try {
    // ── Health checks ────────────────────────────────────────────────────
    const ollamaReady = await checkOllama();
    if (!ollamaReady) {
      log("warn", "Ollama not ready — skipping inference step");
    }

    if (pool) {
      const pgReady = await checkPostgres(pool);
      if (!pgReady) throw new Error("Postgres connection lost");
      await ensureSchema(pool);
    }

    // ── Placeholder: signal enrichment logic goes here ───────────────────
    // Sprint R3B will replace this with real ingestion and enrichment.
    // Current stub demonstrates the Ollama → Postgres pipeline.
    if (ollamaReady) {
      const testPrompt =
        "In one sentence, describe the significance of quantum error correction for practical quantum computing.";
      const response = await ollamaGenerate(testPrompt);
      log("info", "Ollama inference OK", { response: response.slice(0, 120) });
      processed = 1;
    }

    // ── Mark run complete ────────────────────────────────────────────────
    if (pool && runId) {
      await pool.query(
        "UPDATE worker_runs SET status='completed', finished_at=NOW(), signals_processed=$1 WHERE id=$2",
        [processed, runId]
      );
    }
    log("info", "Worker run complete", { processed });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    log("error", "Worker run failed", { error });
    if (pool && runId) {
      await pool.query(
        "UPDATE worker_runs SET status='failed', finished_at=NOW(), error_message=$1 WHERE id=$2",
        [error, runId]
      );
    }
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  log("info", "Centari Research Worker starting", {
    mode: RUN_ONCE ? "once" : "scheduled",
    cron: RUN_ONCE ? null : CONFIG.workerCron,
    ollamaBaseUrl: CONFIG.ollamaBaseUrl,
    ollamaModel: CONFIG.ollamaModel,
  });

  const pool = buildPgPool();
  const supabase = buildSupabaseClient();

  if (!supabase) {
    log("warn", "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — Supabase writes disabled");
  }
  if (!pool) {
    log("warn", "DATABASE_URL not set — local Postgres writes disabled");
  }

  if (RUN_ONCE) {
    await runWorker(pool);
    if (pool) await pool.end();
    process.exit(0);
  }

  // Scheduled mode — run immediately on start, then on cron
  await runWorker(pool);

  if (!cron.validate(CONFIG.workerCron)) {
    log("error", `Invalid cron expression: ${CONFIG.workerCron}`);
    process.exit(1);
  }

  cron.schedule(CONFIG.workerCron, async () => {
    await runWorker(pool);
  });

  log("info", `Next run scheduled: ${CONFIG.workerCron}`);

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    log("info", "SIGTERM received — shutting down");
    if (pool) await pool.end();
    process.exit(0);
  });
  process.on("SIGINT", async () => {
    log("info", "SIGINT received — shutting down");
    if (pool) await pool.end();
    process.exit(0);
  });
}

main().catch((err) => {
  log("error", "Fatal error", { error: String(err) });
  process.exit(1);
});

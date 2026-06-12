-- Worker schema — runs once on first postgres container start
-- Subsequent migrations must be added as 002_*.sql, 003_*.sql etc.

CREATE TABLE IF NOT EXISTS worker_runs (
    id                  SERIAL PRIMARY KEY,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at         TIMESTAMPTZ,
    status              TEXT NOT NULL DEFAULT 'running'
                            CHECK (status IN ('running', 'completed', 'failed')),
    signals_processed   INTEGER DEFAULT 0,
    error_message       TEXT
);

CREATE TABLE IF NOT EXISTS worker_signals (
    id              TEXT PRIMARY KEY,
    raw_title       TEXT NOT NULL,
    raw_url         TEXT NOT NULL,
    domain          TEXT,
    summary         TEXT,
    curator_score   INTEGER CHECK (curator_score BETWEEN 1 AND 10),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    run_id          INTEGER REFERENCES worker_runs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_worker_signals_domain     ON worker_signals(domain);
CREATE INDEX IF NOT EXISTS idx_worker_signals_created_at ON worker_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_runs_started_at    ON worker_runs(started_at DESC);

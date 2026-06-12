-- Migration: 002_research_schema
-- Research Signal Map — full relational schema
-- Supersedes the flat JSON data layer (src/data/research-signals.json).
-- The existing V1 tables (problem_submissions) are not touched.

-- ── Types / domains ──────────────────────────────────────────────────────────
-- Using text + CHECK rather than ENUM so values are alterable without
-- a full table rewrite, which matters for a schema that is still evolving.

-- ── 1. sources ───────────────────────────────────────────────────────────────
-- One row per publication or organisation that originates signals.
-- A single source can publish many signals.

CREATE TABLE IF NOT EXISTS sources (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         text        NOT NULL UNIQUE,
    name         text        NOT NULL,
    homepage_url text,
    tier         integer     NOT NULL DEFAULT 2
                             CHECK (tier IN (1, 2, 3)),
    description  text,
    created_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT sources_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

COMMENT ON TABLE  sources         IS 'Publications and organisations that originate research signals.';
COMMENT ON COLUMN sources.tier    IS '1 = primary source (lab/publisher). 2 = specialist press. 3 = general press.';

-- ── 2. signals ───────────────────────────────────────────────────────────────
-- Core signal record. One row per discrete technology event.

CREATE TABLE IF NOT EXISTS signals (
    id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                 text        NOT NULL UNIQUE,

    -- Provenance
    source_id            uuid        REFERENCES sources(id) ON DELETE SET NULL,
    source_url           text        NOT NULL,
    source_name          text        NOT NULL,  -- denormalised for query convenience

    -- Dates
    published_at         timestamptz NOT NULL,
    ingested_at          timestamptz NOT NULL DEFAULT now(),

    -- Content
    title                text        NOT NULL CHECK (length(title)   BETWEEN 5 AND 200),
    summary              text        NOT NULL CHECK (length(summary) BETWEEN 20 AND 500),

    -- Classification
    category             text        NOT NULL CHECK (category IN (
                                       'ai','xr','robotics','quantum','space','energy','materials'
                                     )),
    secondary_categories text[]      NOT NULL DEFAULT '{}',
    signal_type          text        NOT NULL CHECK (signal_type IN (
                                       'paper','news','funding','patent',
                                       'launch','release','lab_publication'
                                     )),
    tags                 text[]      NOT NULL DEFAULT '{}',
    confidence           text        NOT NULL DEFAULT 'probable' CHECK (confidence IN (
                                       'verified','probable','preliminary'
                                     )),

    -- Scoring  (0.000–10.000; NULL = not yet scored)
    curator_score        integer     CHECK (curator_score BETWEEN 1 AND 10),
    signal_strength      numeric(5,3) CHECK (signal_strength  BETWEEN 0 AND 10),
    novelty_score        numeric(4,3) CHECK (novelty_score    BETWEEN 0 AND 1),
    momentum_score       numeric(4,3) CHECK (momentum_score   BETWEEN 0 AND 1),

    -- Review / moderation
    status               text        NOT NULL DEFAULT 'pending' CHECK (status IN (
                                       'pending','approved','rejected','archived'
                                     )),
    reviewed_by          text,
    reviewed_at          timestamptz,
    review_note          text,

    -- Worker tracking (references local worker_runs.id — no FK across DBs)
    worker_run_id        integer,

    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT signals_slug_format CHECK (slug ~ '^[a-z0-9-]+-\d{4}-\d{2}$')
);

COMMENT ON TABLE  signals                IS 'Discrete technology events: papers, launches, funding rounds, etc.';
COMMENT ON COLUMN signals.slug           IS 'Stable kebab-case id ending in -YYYY-MM. Never rename after first insert.';
COMMENT ON COLUMN signals.signal_strength IS 'Composite editorial importance (0-10). Computed from curator_score, source_tier, recency.';
COMMENT ON COLUMN signals.novelty_score   IS 'How different from recent signals in same category (0-1).';
COMMENT ON COLUMN signals.momentum_score  IS 'Domain activity velocity at time of ingestion (0-1).';
COMMENT ON COLUMN signals.status          IS 'Only approved signals are shown on the public Research Map.';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER signals_updated_at
    BEFORE UPDATE ON signals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 3. signal_locations ───────────────────────────────────────────────────────
-- Geographic metadata separated from the signal record.
-- One signal typically has one location, but allows multiple
-- (e.g. a paper from two institutions in different cities).

CREATE TABLE IF NOT EXISTS signal_locations (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id           uuid        NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
    city                text,
    country_code        char(2),
    country_name        text,
    region              text        NOT NULL CHECK (region IN (
                                      'North America','Europe','Asia-Pacific',
                                      'Middle East','Africa','Latin America','Oceania'
                                    )),
    lat                 numeric(9,6),
    lng                 numeric(9,6),
    location_confidence text        NOT NULL DEFAULT 'medium' CHECK (location_confidence IN (
                                      'high','medium','low'
                                    )),
    place_type          text        NOT NULL DEFAULT 'hq' CHECK (place_type IN (
                                      'hq','lab','launch_site','institution','country'
                                    )),
    created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  signal_locations                    IS 'Geographic metadata for signals. Separated to allow multi-location signals.';
COMMENT ON COLUMN signal_locations.location_confidence IS 'high = city-level verified. medium = city-level from text. low = country centroid only.';

-- ── 4. signal_entities ────────────────────────────────────────────────────────
-- Named entities extracted or curated from a signal.
-- Future: populated by worker LLM extraction (Sprint R3B+).
-- Present: populated by curators in seed data.

CREATE TABLE IF NOT EXISTS signal_entities (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id       uuid        NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
    entity_type     text        NOT NULL CHECK (entity_type IN (
                                  'organization','person','technology','product','institution'
                                )),
    name            text        NOT NULL,
    canonical_name  text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  signal_entities              IS 'Named entities associated with a signal. Curated or worker-extracted.';
COMMENT ON COLUMN signal_entities.canonical_name IS 'Normalised name used for deduplication across signals.';

-- ── 5. trends ─────────────────────────────────────────────────────────────────
-- A trend is a curated cluster of related signals representing a
-- technology movement over a time window.

CREATE TABLE IF NOT EXISTS trends (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             text        NOT NULL UNIQUE,
    title            text        NOT NULL CHECK (length(title) BETWEEN 5 AND 80),
    summary          text        NOT NULL CHECK (length(summary) BETWEEN 20 AND 600),
    primary_category text        NOT NULL CHECK (primary_category IN (
                                   'ai','xr','robotics','quantum','space','energy','materials'
                                 )),
    status           text        NOT NULL DEFAULT 'active' CHECK (status IN (
                                   'active','archived'
                                 )),
    trend_score      numeric(6,3),
    momentum_score   numeric(4,3) CHECK (momentum_score BETWEEN 0 AND 1),
    signal_count     integer     NOT NULL DEFAULT 0,
    first_signal_at  timestamptz,
    last_signal_at   timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  trends             IS 'Curated clusters of related signals representing technology movements.';
COMMENT ON COLUMN trends.trend_score IS 'Composite score: weighted mean of constituent signal_strength values.';

CREATE TRIGGER trends_updated_at
    BEFORE UPDATE ON trends
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 6. trend_signals ─────────────────────────────────────────────────────────
-- Junction table linking trends to their constituent signals.

CREATE TABLE IF NOT EXISTS trend_signals (
    trend_id        uuid        NOT NULL REFERENCES trends(id)  ON DELETE CASCADE,
    signal_id       uuid        NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
    relevance_score numeric(4,3) NOT NULL DEFAULT 1.000
                                 CHECK (relevance_score BETWEEN 0 AND 1),
    added_at        timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (trend_id, signal_id)
);

COMMENT ON TABLE  trend_signals                IS 'Which signals support which trends, with per-signal relevance weight.';
COMMENT ON COLUMN trend_signals.relevance_score IS '1.0 = directly defines trend. 0.5 = supporting evidence. 0.1 = tangential.';

-- ── 7. worker_runs ────────────────────────────────────────────────────────────
-- Production-side record of every worker execution.
-- The local Postgres (postgres/init/001_worker_schema.sql) has a parallel
-- integer-PK version for local dev. This is the canonical production table.

CREATE TABLE IF NOT EXISTS worker_runs (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at          timestamptz NOT NULL DEFAULT now(),
    finished_at         timestamptz,
    status              text        NOT NULL DEFAULT 'running' CHECK (status IN (
                                      'running','completed','failed','cancelled'
                                    )),
    signals_fetched     integer     NOT NULL DEFAULT 0,
    signals_inserted    integer     NOT NULL DEFAULT 0,
    signals_updated     integer     NOT NULL DEFAULT 0,
    signals_rejected    integer     NOT NULL DEFAULT 0,
    runner_version      text,
    error_message       text,
    metadata            jsonb
);

COMMENT ON TABLE worker_runs IS 'Production record of research worker executions. Mirrors local worker_runs in structure.';

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- signals — primary access patterns
CREATE INDEX IF NOT EXISTS idx_signals_category
    ON signals (category);

CREATE INDEX IF NOT EXISTS idx_signals_status_category
    ON signals (status, category)
    WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_signals_published_at
    ON signals (published_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_signal_strength
    ON signals (signal_strength DESC NULLS LAST)
    WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_signals_source_id
    ON signals (source_id);

CREATE INDEX IF NOT EXISTS idx_signals_signal_type
    ON signals (signal_type);

-- signal_locations — map queries filter by region
CREATE INDEX IF NOT EXISTS idx_signal_locations_signal_id
    ON signal_locations (signal_id);

CREATE INDEX IF NOT EXISTS idx_signal_locations_region
    ON signal_locations (region);

CREATE INDEX IF NOT EXISTS idx_signal_locations_country_code
    ON signal_locations (country_code);

-- signal_entities — entity lookup
CREATE INDEX IF NOT EXISTS idx_signal_entities_signal_id
    ON signal_entities (signal_id);

CREATE INDEX IF NOT EXISTS idx_signal_entities_canonical_name
    ON signal_entities (canonical_name)
    WHERE canonical_name IS NOT NULL;

-- trends — active trends by score
CREATE INDEX IF NOT EXISTS idx_trends_status_score
    ON trends (status, trend_score DESC NULLS LAST)
    WHERE status = 'active';

-- trend_signals — resolve both directions
CREATE INDEX IF NOT EXISTS idx_trend_signals_signal_id
    ON trend_signals (signal_id);

-- worker_runs — recent runs first
CREATE INDEX IF NOT EXISTS idx_worker_runs_started_at
    ON worker_runs (started_at DESC);

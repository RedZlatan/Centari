-- Migration: 006_signal_snapshots_and_human_layers
-- Turns the Research Map feed into a durable intelligence layer:
-- daily/weekly/monthly trend snapshots plus human-understanding tags.

-- ── 1. Human understanding taxonomy ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS human_layers (
    slug        text PRIMARY KEY CHECK (slug ~ '^[a-z0-9-]+$'),
    title       text NOT NULL,
    summary     text NOT NULL,
    sort_order  integer NOT NULL DEFAULT 100,
    created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE human_layers IS 'How signals relate to human perception, cognition, learning, emotion, bodies, teams and decisions.';

INSERT INTO human_layers (slug, title, summary, sort_order) VALUES
    ('perception',       'Perception',       'How people see, hear and detect what matters in an environment.', 10),
    ('spatial-cognition','Spatial cognition','How people understand position, distance, movement and 3D relationships.', 20),
    ('attention-load',   'Attention load',   'How systems affect focus, distraction and cognitive load.', 30),
    ('memory-learning',  'Memory and learning','How people retain knowledge, rehearse tasks and improve over time.', 40),
    ('stress-risk',      'Stress and risk',  'How fear, stress, uncertainty and threat affect behaviour.', 50),
    ('decision-making',  'Decision-making',  'How people choose under constraints, ambiguity and time pressure.', 60),
    ('body-environment', 'Body and environment','How physical movement, tools and real-world constraints shape work.', 70),
    ('team-coordination','Team coordination','How groups communicate, align and act together.', 80)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS signal_human_layers (
    signal_id    uuid NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
    layer_slug   text NOT NULL REFERENCES human_layers(slug) ON DELETE CASCADE,
    relevance    numeric(4,3) NOT NULL DEFAULT 0.700 CHECK (relevance BETWEEN 0 AND 1),
    reason       text,
    assigned_by  text NOT NULL DEFAULT 'rules',
    assigned_at  timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (signal_id, layer_slug)
);

COMMENT ON TABLE signal_human_layers IS 'Rule- or curator-assigned mapping from research signals to human-understanding layers.';

CREATE INDEX IF NOT EXISTS idx_signal_human_layers_layer
    ON signal_human_layers (layer_slug);

-- ── 2. Snapshot runs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trend_snapshot_runs (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    period             text NOT NULL CHECK (period IN ('daily','weekly','monthly')),
    window_start       date NOT NULL,
    window_end         date NOT NULL,
    status             text NOT NULL DEFAULT 'completed' CHECK (status IN ('running','completed','failed')),
    source_signal_count integer NOT NULL DEFAULT 0,
    metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
    error_message      text,
    created_at         timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT trend_snapshot_runs_window CHECK (window_end >= window_start),
    CONSTRAINT trend_snapshot_runs_unique UNIQUE (period, window_start, window_end)
);

COMMENT ON TABLE trend_snapshot_runs IS 'One daily/weekly/monthly aggregation pass over approved signals.';

CREATE TABLE IF NOT EXISTS trend_snapshots (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id            uuid NOT NULL REFERENCES trend_snapshot_runs(id) ON DELETE CASCADE,
    period            text NOT NULL CHECK (period IN ('daily','weekly','monthly')),
    domain            text NOT NULL CHECK (domain IN (
                         'ai','xr','robotics','quantum','space','energy','materials','nano','other'
                       )),
    window_start      date NOT NULL,
    window_end        date NOT NULL,
    signal_count      integer NOT NULL DEFAULT 0,
    average_strength  numeric(6,3),
    top_score         numeric(6,3),
    top_signal_ids    uuid[] NOT NULL DEFAULT '{}',
    top_titles        text[] NOT NULL DEFAULT '{}',
    source_names      text[] NOT NULL DEFAULT '{}',
    keyword_hits      jsonb NOT NULL DEFAULT '{}'::jsonb,
    rule_summary      text NOT NULL,
    ai_summary        text,
    created_at        timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT trend_snapshots_unique UNIQUE (period, domain, window_start, window_end)
);

COMMENT ON TABLE trend_snapshots IS 'Rule-generated trend summaries per domain and period. AI summary can be added later.';

CREATE INDEX IF NOT EXISTS idx_trend_snapshots_period_domain
    ON trend_snapshots (period, domain, window_start DESC);

CREATE TABLE IF NOT EXISTS human_layer_snapshots (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id            uuid NOT NULL REFERENCES trend_snapshot_runs(id) ON DELETE CASCADE,
    period            text NOT NULL CHECK (period IN ('daily','weekly','monthly')),
    layer_slug        text NOT NULL REFERENCES human_layers(slug) ON DELETE CASCADE,
    window_start      date NOT NULL,
    window_end        date NOT NULL,
    signal_count      integer NOT NULL DEFAULT 0,
    top_signal_ids    uuid[] NOT NULL DEFAULT '{}',
    top_titles        text[] NOT NULL DEFAULT '{}',
    domain_mix        jsonb NOT NULL DEFAULT '{}'::jsonb,
    rule_summary      text NOT NULL,
    ai_summary        text,
    created_at        timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT human_layer_snapshots_unique UNIQUE (period, layer_slug, window_start, window_end)
);

COMMENT ON TABLE human_layer_snapshots IS 'Rule-generated summaries for cognition/perception/stress/learning layers.';

CREATE INDEX IF NOT EXISTS idx_human_layer_snapshots_period_layer
    ON human_layer_snapshots (period, layer_slug, window_start DESC);

-- ── 3. Public read policies ──────────────────────────────────────────────────

ALTER TABLE human_layers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_human_layers" ON human_layers;
CREATE POLICY "anon_read_human_layers" ON human_layers
    FOR SELECT
    TO anon, authenticated
    USING (true);

ALTER TABLE signal_human_layers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_signal_human_layers" ON signal_human_layers;
CREATE POLICY "anon_read_signal_human_layers" ON signal_human_layers
    FOR SELECT
    TO anon, authenticated
    USING (true);

ALTER TABLE trend_snapshot_runs ENABLE ROW LEVEL SECURITY;
-- No public read policy for run metadata.

ALTER TABLE trend_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_trend_snapshots" ON trend_snapshots;
CREATE POLICY "anon_read_trend_snapshots" ON trend_snapshots
    FOR SELECT
    TO anon, authenticated
    USING (true);

ALTER TABLE human_layer_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_human_layer_snapshots" ON human_layer_snapshots;
CREATE POLICY "anon_read_human_layer_snapshots" ON human_layer_snapshots
    FOR SELECT
    TO anon, authenticated
    USING (true);

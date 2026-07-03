-- Migration: 007_journal_brain_curation
-- Durable journal layer for saving only the strongest research signals and
-- mapping them to concrete brain regions.

CREATE TABLE IF NOT EXISTS journal_brain_regions (
    slug         text PRIMARY KEY CHECK (slug ~ '^[a-z0-9-]+$'),
    title        text NOT NULL,
    area         text NOT NULL,
    summary      text NOT NULL,
    archive_role text NOT NULL,
    sort_order   integer NOT NULL DEFAULT 100,
    created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE journal_brain_regions IS 'Brain-region index used by the Journal to organise saved signals and summaries.';

INSERT INTO journal_brain_regions (slug, title, area, summary, archive_role, sort_order) VALUES
    ('prefrontal',    'Prefrontal cortex',    'Planning / judgement', 'Planning, inhibition, working memory and deliberate decision making.', 'Decision notes, prioritisation, cognitive load, planning methods and judgement under uncertainty.', 10),
    ('premotor',      'Premotor cortex',       'Action preparation',   'Movement preparation and turning visual cues into planned action.', 'Training loops, action rehearsal, procedural learning and transitions from seeing to doing.', 20),
    ('somatosensory', 'Somatosensory cortex',  'Touch / body state',   'Touch, pressure, body position and physical feedback from the environment.', 'Haptics, fatigue, gloves, weather, hardware limits and lessons from physical work.', 30),
    ('visual',        'Visual cortex',         'Sight / pattern',      'Shape, motion, contrast, spatial pattern and visual recognition.', 'Maps, visual hierarchy, dashboards, 3D comprehension, pattern recognition and visual overload.', 40),
    ('temporal',      'Temporal cortex',       'Sound / meaning',      'Auditory processing, language and recognition of meaningful signals over time.', 'Voice, radio, alerts, rhythm, interface sound, language and time-based signals.', 50),
    ('hippocampus',   'Hippocampus',           'Memory / place',       'Memory formation and linking experience to place, context and sequence.', 'Memory bank, spatial stories, reference paths, lessons worth returning to and long-horizon signals.', 60),
    ('amygdala',      'Amygdala',              'Threat / salience',    'Emotional salience, threat detection, fear and urgent attention.', 'Stress, fear, threat perception, alarm design, risk salience and behaviour under pressure.', 70)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    area = EXCLUDED.area,
    summary = EXCLUDED.summary,
    archive_role = EXCLUDED.archive_role,
    sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS signal_brain_regions (
    signal_id          uuid NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
    brain_region_slug  text NOT NULL REFERENCES journal_brain_regions(slug) ON DELETE CASCADE,
    relevance          numeric(4,3) NOT NULL DEFAULT 0.700 CHECK (relevance BETWEEN 0 AND 1),
    reason             text,
    assigned_by        text NOT NULL DEFAULT 'rules',
    assigned_at        timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (signal_id, brain_region_slug)
);

COMMENT ON TABLE signal_brain_regions IS 'Rule-, AI- or curator-assigned mapping from approved signals to Journal brain regions.';

CREATE INDEX IF NOT EXISTS idx_signal_brain_regions_region
    ON signal_brain_regions (brain_region_slug, relevance DESC);

CREATE TABLE IF NOT EXISTS journal_saved_signals (
    signal_id       uuid PRIMARY KEY REFERENCES signals(id) ON DELETE CASCADE,
    saved_for       text NOT NULL CHECK (saved_for IN ('brain','trend','both')),
    save_score      numeric(6,3) NOT NULL CHECK (save_score BETWEEN 0 AND 100),
    save_reason     text NOT NULL,
    selected_by     text NOT NULL DEFAULT 'rules',
    selected_at     timestamptz NOT NULL DEFAULT now(),
    window_start    date NOT NULL,
    window_end      date NOT NULL,
    metadata        jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE journal_saved_signals IS 'Signals worth keeping after they stop being live news.';

CREATE INDEX IF NOT EXISTS idx_journal_saved_signals_selected
    ON journal_saved_signals (selected_at DESC, save_score DESC);

CREATE INDEX IF NOT EXISTS idx_journal_saved_signals_window
    ON journal_saved_signals (window_start DESC, window_end DESC);

CREATE TABLE IF NOT EXISTS brain_region_snapshots (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id             uuid REFERENCES trend_snapshot_runs(id) ON DELETE SET NULL,
    period             text NOT NULL CHECK (period IN ('daily','weekly','monthly')),
    brain_region_slug  text NOT NULL REFERENCES journal_brain_regions(slug) ON DELETE CASCADE,
    window_start       date NOT NULL,
    window_end         date NOT NULL,
    signal_count       integer NOT NULL DEFAULT 0,
    top_signal_ids     uuid[] NOT NULL DEFAULT '{}',
    top_titles         text[] NOT NULL DEFAULT '{}',
    domain_mix         jsonb NOT NULL DEFAULT '{}'::jsonb,
    rule_summary       text NOT NULL,
    ai_summary         text,
    created_at         timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT brain_region_snapshots_unique UNIQUE (period, brain_region_slug, window_start, window_end)
);

COMMENT ON TABLE brain_region_snapshots IS 'Rule-generated and future AI summaries for Journal brain regions.';

CREATE INDEX IF NOT EXISTS idx_brain_region_snapshots_region
    ON brain_region_snapshots (period, brain_region_slug, window_start DESC);

ALTER TABLE journal_brain_regions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_journal_brain_regions" ON journal_brain_regions;
CREATE POLICY "anon_read_journal_brain_regions" ON journal_brain_regions
    FOR SELECT
    TO anon, authenticated
    USING (true);

ALTER TABLE signal_brain_regions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_signal_brain_regions" ON signal_brain_regions;
CREATE POLICY "anon_read_signal_brain_regions" ON signal_brain_regions
    FOR SELECT
    TO anon, authenticated
    USING (true);
DROP POLICY IF EXISTS "service_write_signal_brain_regions" ON signal_brain_regions;
CREATE POLICY "service_write_signal_brain_regions" ON signal_brain_regions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

ALTER TABLE journal_saved_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_journal_saved_signals" ON journal_saved_signals;
CREATE POLICY "anon_read_journal_saved_signals" ON journal_saved_signals
    FOR SELECT
    TO anon, authenticated
    USING (true);
DROP POLICY IF EXISTS "service_write_journal_saved_signals" ON journal_saved_signals;
CREATE POLICY "service_write_journal_saved_signals" ON journal_saved_signals
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

ALTER TABLE brain_region_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_brain_region_snapshots" ON brain_region_snapshots;
CREATE POLICY "anon_read_brain_region_snapshots" ON brain_region_snapshots
    FOR SELECT
    TO anon, authenticated
    USING (true);
DROP POLICY IF EXISTS "service_write_brain_region_snapshots" ON brain_region_snapshots;
CREATE POLICY "service_write_brain_region_snapshots" ON brain_region_snapshots
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

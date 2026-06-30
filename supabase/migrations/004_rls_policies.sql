-- Migration: 004_rls_policies
-- Grant public read access to the anon role for approved/active Research Map data.
-- worker_runs is intentionally excluded — no public access.
-- Write access is unchanged — no INSERT/UPDATE/DELETE policies added here.
-- Safe to re-run: ENABLE ROW LEVEL SECURITY is idempotent;
-- DROP POLICY IF EXISTS + CREATE POLICY replaces any prior version of each policy.

-- ── 1. sources ────────────────────────────────────────────────────────────────

ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_sources" ON sources;
CREATE POLICY "anon_read_sources" ON sources
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- ── 2. signals ────────────────────────────────────────────────────────────────

ALTER TABLE signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_signals" ON signals;
CREATE POLICY "anon_read_signals" ON signals
    FOR SELECT
    TO anon, authenticated
    USING (status = 'approved');

-- ── 3. signal_locations ───────────────────────────────────────────────────────

ALTER TABLE signal_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_signal_locations" ON signal_locations;
CREATE POLICY "anon_read_signal_locations" ON signal_locations
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- ── 4. signal_entities ────────────────────────────────────────────────────────

ALTER TABLE signal_entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_signal_entities" ON signal_entities;
CREATE POLICY "anon_read_signal_entities" ON signal_entities
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- ── 5. trends ─────────────────────────────────────────────────────────────────

ALTER TABLE trends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_trends" ON trends;
CREATE POLICY "anon_read_trends" ON trends
    FOR SELECT
    TO anon, authenticated
    USING (status = 'active');

-- ── 6. trend_signals ──────────────────────────────────────────────────────────

ALTER TABLE trend_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_trend_signals" ON trend_signals;
CREATE POLICY "anon_read_trend_signals" ON trend_signals
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- ── worker_runs: no policy added — anon role has no access ───────────────────

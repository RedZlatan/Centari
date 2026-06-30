-- Migration 005: add 'other' as a valid internal category for signals.
--
-- Purpose: route off-domain signals to category='other' rather than dropping
-- them at ingestion time. Provides an audit trail for signals that pass
-- source-quality checks but don't belong in any current Centari domain.
--
-- Rules enforced at application layer (not DB):
--   - 'other' signals must never be promoted to status='approved'.
--   - 'other' signals are invisible to the public API (RLS already filters on
--     status='approved', so no RLS change is needed).
--   - 'other' is not exposed as a public Research Map filter (UI unchanged).
--
-- Apply in Supabase SQL editor or via `supabase db push` before running
-- worker v1.3 with live ingest.

ALTER TABLE signals
  DROP CONSTRAINT IF EXISTS signals_category_check;

ALTER TABLE signals
  ADD CONSTRAINT signals_category_check
    CHECK (category IN (
      'ai', 'xr', 'robotics', 'quantum', 'space', 'energy', 'materials', 'other'
    ));

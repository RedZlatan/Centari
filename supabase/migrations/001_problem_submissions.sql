-- Migration: 001_problem_submissions
-- Creates the intake table for "Bring Your Problem" submissions.

CREATE TABLE IF NOT EXISTS problem_submissions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  description     text        NOT NULL,
  category        text        NOT NULL,
  estimated_value text,
  visibility      text        NOT NULL DEFAULT 'private',
  name            text,
  email           text,
  status          text        NOT NULL DEFAULT 'new',
  source          text        NOT NULL DEFAULT 'monolith',
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT category_valid CHECK (
    category IN (
      'xr-simulation',
      'ai-automation',
      'hardware-sensors',
      'data-intelligence',
      'training-operations',
      'infrastructure',
      'research-development',
      'other'
    )
  ),
  CONSTRAINT estimated_value_valid CHECK (
    estimated_value IS NULL OR estimated_value IN (
      'under-50k', '50k-250k', '250k-1m', 'over-1m', 'unknown'
    )
  ),
  CONSTRAINT visibility_valid CHECK (
    visibility IN ('private', 'public')
  ),
  CONSTRAINT status_valid CHECK (
    status IN ('new', 'reviewed', 'contacted', 'archived')
  )
);

-- Efficient queries for the review workflow
CREATE INDEX IF NOT EXISTS problem_submissions_created_at
  ON problem_submissions (created_at DESC);

CREATE INDEX IF NOT EXISTS problem_submissions_status
  ON problem_submissions (status);

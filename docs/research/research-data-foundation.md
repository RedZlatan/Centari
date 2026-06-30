# Research Data Foundation

**Sprint:** R5  
**Status:** Complete — migrations and seed applied, API routes live  
**Migration files:** `supabase/migrations/002_research_schema.sql`, `supabase/migrations/003_research_seed.sql`

---

## Overview

The Research Map is backed by a relational Postgres schema (hosted on Supabase). This document is the canonical reference for the schema, scoring model, API contract, and worker integration guide.

The flat JSON data layer (`src/data/research-signals.json`, `src/lib/research-signals.ts`) built in Sprint R2A remains in place. The SQL schema is the forward-looking foundation; the JSON layer serves the map until the API routes are wired into the frontend.

---

## Schema

Seven tables. All UUIDs use `gen_random_uuid()`. All timestamps are `timestamptz`.

### sources

One row per publication or organisation that produces research signals.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `slug` | text UNIQUE | Kebab-case. Format: `[a-z0-9-]+` |
| `name` | text | Display name |
| `homepage_url` | text | Root URL of the publication |
| `tier` | integer (1/2/3) | See tier definitions below |
| `description` | text | Optional short description |
| `created_at` | timestamptz | |

**Tier definitions:**

| Tier | Definition | Examples |
|------|-----------|---------|
| 1 | Primary source — lab, publisher, or official announcement | arxiv.org, nature.com, nasa.gov |
| 2 | Specialist press — covers the domain as primary beat | spectrum.ieee.org, techcrunch.com |
| 3 | General press — incidental technology coverage | reuters.com, bbc.com |

---

### signals

Core table. One row per discrete technology event.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `slug` | text UNIQUE | Format: `[a-z0-9-]+-YYYY-MM`. Never rename after first insert. |
| `source_id` | uuid FK→sources | SET NULL on source delete |
| `source_url` | text NOT NULL | Specific document URL, never a homepage |
| `source_name` | text NOT NULL | Denormalised for query convenience |
| `published_at` | timestamptz | Date of original publication |
| `ingested_at` | timestamptz | When the worker or curator added the row |
| `title` | text (5–200 chars) | |
| `summary` | text (20–500 chars) | |
| `category` | text CHECK | One of the 7 domains |
| `secondary_categories` | text[] | May reference any other domain |
| `signal_type` | text CHECK | See signal type definitions below |
| `tags` | text[] | Free-form keywords |
| `confidence` | text CHECK | verified / probable / preliminary |
| `curator_score` | integer (1–10) | See curator score rubric |
| `signal_strength` | numeric(5,3) (0–10) | Composite score; see scoring model |
| `novelty_score` | numeric(4,3) (0–1) | Differentiation from recent signals |
| `momentum_score` | numeric(4,3) (0–1) | Domain activity velocity |
| `status` | text CHECK | pending / approved / rejected / archived |
| `reviewed_by` | text | Username or "seed" |
| `reviewed_at` | timestamptz | |
| `review_note` | text | |
| `worker_run_id` | integer | References local worker_runs.id (no FK) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated by trigger |

**Domains (category):**

`ai` · `xr` · `robotics` · `quantum` · `space` · `energy` · `materials`

**Signal types:**

| Type | Description | Trend weight |
|------|-------------|-------------|
| `paper` | Peer-reviewed or preprint research | High |
| `funding` | Investment round or grant | High |
| `launch` | Product or company launch | High |
| `patent` | Filed or granted patent | Medium |
| `release` | Software or hardware release | Medium |
| `lab_publication` | Non-peer-reviewed lab update | Medium |
| `news` | Press report or analysis | Low |

**Confidence values:**

| Value | Meaning |
|-------|---------|
| `verified` | Primary source confirmed, no ambiguity |
| `probable` | Secondary source, consistent with other evidence |
| `preliminary` | Rumour, unconfirmed, or model-generated |

**Curator score rubric:**

| Score | Level | Description |
|-------|-------|-------------|
| 9–10 | Landmark | Defines or significantly redirects the field |
| 7–8 | Significant | Material advance; will be cited for years |
| 5–6 | Solid | Credible progress; worth tracking |
| 3–4 | Background | Context, incremental; supports trends |
| 1–2 | Weak | Noise, hype, or low-quality source |

---

### signal_locations

Geographic metadata, separated from signals to allow multi-location events (e.g. a paper with authors at two institutions in different countries).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `signal_id` | uuid FK→signals CASCADE | |
| `city` | text | Optional |
| `country_code` | char(2) | ISO 3166-1 alpha-2 |
| `country_name` | text | Full English name |
| `region` | text CHECK | One of the 7 regions |
| `lat` | numeric(9,6) | WGS84 |
| `lng` | numeric(9,6) | WGS84 |
| `location_confidence` | text CHECK | high / medium / low |
| `place_type` | text CHECK | hq / lab / launch_site / institution / country |
| `created_at` | timestamptz | |

**Regions:** North America · Europe · Asia-Pacific · Middle East · Africa · Latin America · Oceania

**Location confidence:**

| Value | Meaning |
|-------|---------|
| `high` | City-level, verified against official address or satellite imagery |
| `medium` | City-level, inferred from text (HQ city, institution city) |
| `low` | Country centroid only — city unknown |

**Place type:** Use `country` only when a specific city cannot be determined. Prefer the more specific type when both are valid.

**Geocoding rules:**

- Coordinates are WGS84 decimal degrees.
- For `hq` type: use the company's primary headquarters city at the time of the signal.
- For `institution`: use the institution's main campus.
- For `launch_site`: use the actual launch or demonstration location.
- Country centroid coordinates: obtained from `restcountries.com` or equivalent authoritative source.

---

### signal_entities

Named entities associated with a signal. Populated by curators in seed data; future sprint populates via worker LLM extraction.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `signal_id` | uuid FK→signals CASCADE | |
| `entity_type` | text CHECK | organization / person / technology / product / institution |
| `name` | text | As it appears in the source |
| `canonical_name` | text | Normalised name for deduplication |
| `created_at` | timestamptz | |

---

### trends

A trend is a curated cluster of related signals representing a technology movement over a time window.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `slug` | text UNIQUE | Kebab-case |
| `title` | text (5–80 chars) | Short human-readable name |
| `summary` | text (20–600 chars) | Why this trend matters |
| `primary_category` | text CHECK | One domain |
| `status` | text CHECK | active / archived |
| `trend_score` | numeric(6,3) | Weighted mean of constituent signal_strength |
| `momentum_score` | numeric(4,3) | 0–1 |
| `signal_count` | integer | Denormalised count of associated signals |
| `first_signal_at` | timestamptz | Earliest associated signal published_at |
| `last_signal_at` | timestamptz | Most recent associated signal published_at |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated by trigger |

---

### trend_signals

Junction table linking trends to constituent signals.

| Column | Type | Notes |
|--------|------|-------|
| `trend_id` | uuid FK→trends CASCADE | |
| `signal_id` | uuid FK→signals CASCADE | |
| `relevance_score` | numeric(4,3) (0–1) | 1.0 = directly defines trend; 0.1 = tangential |
| `added_at` | timestamptz | |

Primary key: `(trend_id, signal_id)`.

---

### worker_runs

Production record of every research worker execution.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `started_at` | timestamptz | |
| `finished_at` | timestamptz | |
| `status` | text CHECK | running / completed / failed / cancelled |
| `signals_fetched` | integer | Attempted by this run |
| `signals_inserted` | integer | New rows written |
| `signals_updated` | integer | Existing rows updated |
| `signals_rejected` | integer | Failed validation or scoring threshold |
| `runner_version` | text | Worker semver or git SHA |
| `error_message` | text | First fatal error if status = failed |
| `metadata` | jsonb | Run-specific debug data |

The local Docker Postgres (for worker dev) has a parallel integer-PK `worker_runs` table in `postgres/init/001_worker_schema.sql`. The Supabase table is the canonical production record.

---

## Scoring Model

### signal_strength (0–10)

The primary editorial importance score. Computed during ingestion or manual curation.

```
signal_strength = curator_score / 10
```

This is the seed value. Once the worker applies source tier and recency weighting, the formula becomes:

```
signal_strength = (curator_score × source_multiplier × recency_factor) + type_bonus
```

Where:
- `source_multiplier`: tier 1 = 1.0, tier 2 = 0.85, tier 3 = 0.70
- `recency_factor`: `exp(-ln(2) / 30 × daysSince)` — 30-day half-life
- `type_bonus`: paper/funding/launch = +0.5, patent/release/lab = +0.25, news = 0

See `src/lib/research-signals.ts:computeTrendScore()` for the V2 JSON layer implementation.

### novelty_score (0–1)

How different this signal is from recent signals in the same category. Seed values assigned by signal type:

| Signal type | Seed novelty_score |
|------------|-------------------|
| paper | 0.90 |
| patent | 0.85 |
| launch | 0.80 |
| funding | 0.75 |
| release | 0.70 |
| lab_publication | 0.65 |
| news | 0.50 |

Future: computed by worker via embedding similarity against recent signals in the same category.

### momentum_score (0–1)

Domain activity velocity at time of ingestion. Seed values assigned by category:

| Category | Seed momentum_score |
|---------|-------------------|
| ai | 0.92 |
| robotics | 0.85 |
| quantum | 0.82 |
| energy | 0.78 |
| space | 0.75 |
| materials | 0.72 |
| xr | 0.68 |

Future: computed by worker as a rolling signal count over the last 30 days in the category, normalised to 0–1.

### trend_score

Weighted mean of the `signal_strength` values of all constituent signals, weighted by their `relevance_score` in `trend_signals`.

```
trend_score = Σ(signal_strength × relevance_score) / Σ(relevance_score)
```

Seed values computed manually and stored directly in the `trends` table.

---

## Seed Data

**File:** `supabase/migrations/003_research_seed.sql`

| Table | Rows |
|-------|------|
| sources | 32 |
| signals | 32 |
| signal_locations | 32 |
| signal_entities | 26 |
| trends | 5 |
| trend_signals | 20 |

All 7 domains and all 7 regions are represented in the seed signals. All signals have `status = 'approved'` and `reviewed_by = 'seed'`.

All inserts use `ON CONFLICT (slug) DO NOTHING` so the migration is safe to re-run.

Foreign key lookups in the seed use the slug pattern:
```sql
(SELECT id FROM sources WHERE slug = 'nature-portfolio')
```
This avoids hard-coding UUIDs and allows the file to be read and verified independently.

---

## API Contract

### `GET /api/research/signals`

Returns approved signals, ordered by `signal_strength DESC`.

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `domain` | string | — | Filter by category. One of: `ai xr robotics quantum space energy materials` |
| `region` | string | — | Filter by signal_locations.region. One of the 7 region values. |
| `type` | string | — | Filter by signal_type. One of: `paper news funding patent launch release lab_publication` |
| `limit` | integer | 50 | Max rows. Capped at 100. |
| `offset` | integer | 0 | Pagination offset. |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "gpt-4o-openai-launch-2024-05",
      "title": "OpenAI launches GPT-4o with voice and vision",
      "summary": "...",
      "category": "ai",
      "secondary_categories": ["xr"],
      "signal_type": "launch",
      "tags": ["multimodal", "gpt-4"],
      "confidence": "verified",
      "curator_score": 9,
      "signal_strength": 9.0,
      "novelty_score": 0.8,
      "momentum_score": 0.92,
      "published_at": "2024-05-13T00:00:00Z",
      "source_url": "https://openai.com/blog/hello-gpt-4o",
      "source_name": "OpenAI Blog",
      "location": {
        "city": "San Francisco",
        "country_code": "US",
        "country_name": "United States",
        "region": "North America",
        "lat": 37.7749,
        "lng": -122.4194,
        "location_confidence": "high",
        "place_type": "hq"
      }
    }
  ],
  "total": 32,
  "limit": 50,
  "offset": 0
}
```

Notes:
- `location` is the first `signal_locations` row for the signal. Signals with no location row return `location: null`.
- When filtering by `region`, only signals with a matching location row are returned (inner join).
- `total` reflects the count of all matching rows before `limit`/`offset` are applied.

**Error responses:**

| Status | Body | When |
|--------|------|------|
| 400 | `{"error": "Invalid domain..."}` | Unknown filter value |
| 500 | `{"error": "Database error."}` | Supabase query failed |

---

### `GET /api/research/trends`

Returns active trends ordered by `trend_score DESC`, with their constituent signals.

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `domain` | string | — | Filter by primary_category |
| `limit` | integer | 20 | Max rows. Capped at 50. |
| `offset` | integer | 0 | Pagination offset. |

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "foundation-model-arms-race",
      "title": "Foundation Model Arms Race",
      "summary": "...",
      "primary_category": "ai",
      "status": "active",
      "trend_score": 8.8,
      "momentum_score": 0.90,
      "signal_count": 6,
      "first_signal_at": "2023-03-14T00:00:00Z",
      "last_signal_at": "2024-05-13T00:00:00Z",
      "signals": [
        {
          "id": "uuid",
          "slug": "gpt-4o-openai-launch-2024-05",
          "title": "OpenAI launches GPT-4o with voice and vision",
          "category": "ai",
          "signal_type": "launch",
          "signal_strength": 9.0,
          "published_at": "2024-05-13T00:00:00Z",
          "source_name": "OpenAI Blog",
          "source_url": "https://openai.com/blog/hello-gpt-4o",
          "region": "North America",
          "relevance_score": 1.0
        }
      ]
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

Notes:
- `signals` within each trend are sorted by `relevance_score DESC`.
- `region` in a trend signal is the first location's region, or `null`.

---

## Indexes

| Index | Table | Columns | Filter |
|-------|-------|---------|--------|
| `idx_signals_status_category` | signals | status, category | WHERE status='approved' |
| `idx_signals_signal_strength` | signals | signal_strength DESC | WHERE status='approved' |
| `idx_signals_category` | signals | category | |
| `idx_signals_published_at` | signals | published_at DESC | |
| `idx_signals_signal_type` | signals | signal_type | |
| `idx_signal_locations_region` | signal_locations | region | |
| `idx_signal_locations_country_code` | signal_locations | country_code | |
| `idx_trends_status_score` | trends | status, trend_score DESC | WHERE status='active' |
| `idx_trend_signals_signal_id` | trend_signals | signal_id | |

The partial indexes on `status='approved'` and `status='active'` keep the public-facing query paths lean — Postgres skips rejected and pending rows entirely.

---

## Worker Integration

### What the worker writes

Each research worker run should:

1. Insert a `worker_runs` row with `status = 'running'` at start.
2. For each ingested signal:
   - Insert into `signals` with `status = 'pending'`.
   - Insert into `signal_locations` (one or more rows).
   - Insert into `signal_entities` (LLM-extracted; can be empty initially).
3. Update `worker_runs` with `finished_at`, final `status`, and counts.

Signals inserted by the worker enter the moderation queue as `pending`. They do not appear on the public map until a curator changes `status` to `approved`.

### Connecting to Supabase from the worker

The worker uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from environment. The service role key bypasses row-level security — necessary for writes from the worker process.

```typescript
// worker/src/index.ts — Supabase writes
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
```

### Signal validation before insert

A signal must pass these gates before being written:

- `source_url` is a specific document URL, not a homepage or path `/`
- `published_at` is a valid ISO 8601 date
- `title` is between 5 and 200 characters
- `summary` is between 20 and 500 characters
- `category` is one of the 7 domains
- `signal_type` is one of the 7 types
- At least one `signal_locations` row with a valid `region`

Failures increment `signals_rejected` in `worker_runs`. Do not throw — log and continue.

### Idempotency

Use `ON CONFLICT (slug) DO NOTHING` (or `DO UPDATE` for score refresh) on signal inserts. Slug format: `{kebab-title}-{YYYY-MM}`. If a slug collision occurs in the same month, append `-2`, `-3`, etc.

---

## Running Migrations

Migrations run against Supabase via the Supabase CLI or the SQL editor in the Supabase dashboard.

```bash
# Using Supabase CLI (from repo root)
supabase db push

# Or apply manually via psql
psql "$DATABASE_URL" -f supabase/migrations/002_research_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/003_research_seed.sql
```

Migrations are numbered and must be applied in order. `002_research_schema.sql` must be applied before `003_research_seed.sql`.

Both migrations are idempotent:
- `CREATE TABLE IF NOT EXISTS` in the schema file.
- `ON CONFLICT ... DO NOTHING` on all inserts in the seed file.
- `CREATE INDEX IF NOT EXISTS` for all indexes.
- `CREATE OR REPLACE FUNCTION` for the trigger function.

---

## Environment Variables

| Variable | Used by | Required | Notes |
|----------|---------|----------|-------|
| `SUPABASE_URL` | app, worker | For live DB | Supabase project URL |
| `SUPABASE_ANON_KEY` | app API routes | For live DB | Read-only. Safe to deploy. Never prefix `NEXT_PUBLIC_`. |
| `SUPABASE_SERVICE_ROLE_KEY` | worker | For live DB | Privileged write access. **Worker only. Never expose to browser or prefix `NEXT_PUBLIC_`.** |

When `SUPABASE_URL` or `SUPABASE_ANON_KEY` is absent, all `/api/research/*` routes fall back to the JSON data layer automatically. Local development works without any Supabase project.

---

## Connecting to Supabase (when ready)

The API routes detect whether Supabase is configured via `isSupabaseConfigured()` in `src/lib/supabase.ts`. To switch from JSON fallback to live data:

1. Create a Supabase project (free tier is sufficient for alpha).
2. Run the migrations (see section above).
3. Add to `.env.local`:
   ```
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   ```
4. Restart the dev server — the routes will query Supabase from that point on.

The JSON data layer does **not** need to be removed for this to work. It continues to serve as the fallback if the env vars are ever unset.

---

## Migration from V2 JSON Layer

The JSON data layer (`src/data/research-signals.json`) and its TypeScript module (`src/lib/research-signals.ts`) remain in place.

- The API routes use the JSON layer as fallback when Supabase is not configured.
- The Research Map frontend currently reads `research-signals.ts` directly (Sprint R6C will migrate it to the API).

When the frontend migration (Sprint R6C) is complete:

1. Remove the `import` of `research-signals.json` from map components.
2. Replace `getDisplaySignals()` calls with `fetch('/api/research/signals')`.
3. Replace `selectTopTrends()` calls with `fetch('/api/research/trends')`.
4. Delete `src/data/research-signals.json` and `src/lib/research-signals.ts` once all callers are migrated.

Do not delete the JSON layer until the frontend migration is complete and verified. The fallback in `src/lib/research-api-fallback.ts` imports from it.

# arXiv Ingestion Worker

Sprint R8A. First production ingestion worker for the Research Map pipeline.

**File:** `worker/src/arxiv.ts`  
**Source registry entry:** `docs/research/source-registry.md` → arXiv  
**Worker roadmap:** `docs/research/worker-roadmap.md` → Phase 1 → `worker-arxiv`

---

## What it does

Fetches recent papers from 14 arXiv categories spanning all 7 Centari domains (AI, XR, Robotics, Quantum, Space, Energy, Materials). Each paper is normalised to a `signals` row with `status = 'pending'`. Approved signals appear on the public Research Map once a curator promotes them.

Rate: 1.1 s delay between category fetches (arXiv fair-use policy).

---

## Prerequisites

1. A `.env.local` at the repo root with:
   ```bash
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ```
   The anon key is not used by workers. Never expose the service role key to the frontend.

2. Migrations `002_research_schema.sql` and `004_rls_policies.sql` applied in Supabase.

3. Root `node_modules` present (`npm install` in the repo root).

---

## Running locally

### Dry run (no writes, max 5 signals)

```bash
npm run worker:arxiv:dry
```

Fetches real data, logs what it would insert, and exits. Nothing is written to Supabase. Use this to validate connectivity and slug generation before writing.

### Single run (writes to Supabase, 7-day lookback, max 50 signals)

```bash
npm run worker:arxiv:once
```

Or with custom flags:

```bash
npx tsx worker/src/arxiv.ts --max=20 --days=14
```

### Flags

| Flag | Default | Description |
|---|---|---|
| `--dry-run` | off | Log signals without writing to DB |
| `--max=N` | 50 | Stop after N signals written/logged |
| `--days=N` | 7 | Discard papers older than N days |

---

## What gets written

### `sources` (upserted on every run)

```
slug:         arxiv
name:         arXiv
homepage_url: https://arxiv.org
tier:         1
```

### `signals` (one row per new paper)

| Field | Value |
|---|---|
| `status` | `pending` |
| `confidence` | `probable` |
| `signal_type` | `paper` |
| `curator_score` | 5 |
| `signal_strength` | 0.500 |
| `reviewed_by` | `worker-arxiv` |
| `tags` | `[arxivCategory]` |
| `source_name` | `arXiv` |
| `source_url` | direct link to `arxiv.org/abs/{id}` |

### `worker_runs` (one row per execution)

Tracks `status`, `signals_fetched`, `signals_inserted`, `signals_rejected`, `error_message`.

---

## Slug format

```
arxiv-{4-5 words from title}-{YYYY-MM}
```

Stop words and short words are excluded. Example:

```
arxiv-learning-reason-analogy-retrieval-augmented-reinforcement-2026-06
```

Collisions across categories (same paper, multiple categories) are handled by `ON CONFLICT (slug) DO NOTHING` — duplicates are silently skipped.

---

## Approving pending signals

Pending signals are not visible on the public Research Map. To promote them:

1. Open Supabase dashboard → Table Editor → `signals`
2. Filter by `status = pending`
3. Set `status = approved` on signals that pass editorial review

A moderation UI is planned for Sprint R8D.

---

## Category map

| arXiv category | Centari domain |
|---|---|
| `cs.AI`, `cs.LG`, `cs.CL`, `cs.CV`, `cs.NE` | ai |
| `cs.RO` | robotics |
| `quant-ph`, `cond-mat.supr-con` | quantum |
| `cs.HC`, `cs.GR` | xr |
| `astro-ph.IM`, `astro-ph.EP` | space |
| `physics.app-ph` | energy |
| `cond-mat.mtrl-sci` | materials |

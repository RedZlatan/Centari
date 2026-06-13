# Research Worker Roadmap

Build plan for the automated signal ingestion pipeline.  
Workers run on a cron schedule, fetch signals from approved sources, normalise them to the Research Map schema, and write to Supabase via the service role key.

**Version:** 1  
**Last updated:** 2026-06-13  
**Source registry:** `docs/research/source-registry.md`  
**Attribution standard:** `docs/research/source-attribution.md`  
**Schema:** `supabase/migrations/002_research_schema.sql`

---

## Design principles

- **No scraping in Phase 1.** Only structured APIs and RSS feeds. Scraping is fragile, expensive to maintain, and ethically ambiguous. If a source doesn't offer an API or RSS, it goes to Phase 3 or is excluded.
- **No AI enrichment in Phase 1.** Workers fetch and normalise. AI-assisted summarisation and entity extraction are Phase 3 enrichment steps.
- **Idempotent writes.** Every INSERT uses `ON CONFLICT (slug) DO NOTHING`. Running a worker twice for the same date window produces no duplicates.
- **Service role key only.** Workers never use the anon key. `SUPABASE_SERVICE_ROLE_KEY` is injected via environment and never committed.
- **Status = `pending` on ingest.** All worker-written signals start with `status = 'pending'`. A curator review step promotes to `approved` or rejects. The Research Map only surfaces `approved` signals.
- **Worker runs logged.** Each execution writes a row to `worker_runs` with status, signal count, and duration. This enables monitoring without external observability tooling.

---

## Architecture overview

```
Source (API/RSS)
       │
       ▼
  Fetch worker (Node.js / cron)
       │ normalise → Signal schema
       ▼
  Dedup check (slug lookup against Supabase)
       │ new only
       ▼
  INSERT INTO signals (status = 'pending')
       │
       ▼
  INSERT INTO worker_runs (result)
       │
       ▼
  Curator review (manual, future moderation UI)
       │ approve / reject
       ▼
  Research Map (reads status = 'approved' only)
```

Workers are stateless. State lives entirely in Supabase.

---

## Slug generation

Slugs uniquely identify signals and must be stable across re-runs. Format:

```
{source-slug}-{kebab-title-fragment}-{YYYY-MM}
```

Example: `deepmind-veo3-native-audio-2026-05`

Rules:
- Derived deterministically from `source_slug + title + published_month`
- Lowercase, hyphens only, no special characters
- Title fragment: first 4–6 meaningful words, stop words removed
- Published month: year + zero-padded month of `published_at`
- Must match the DB constraint: `^[a-z0-9-]+-\d{4}-\d{2}$`

A slug collision means the signal already exists. `ON CONFLICT (slug) DO NOTHING` silently skips it.

---

## Phase 1 — Structured APIs and RSS

**Goal:** highest signal quality, lowest maintenance. API-first. No scraping.  
**Target:** 8–12 workers covering all 7 primary domains.  
**Cron:** every 6 hours (`0 */6 * * *`, configurable via `WORKER_CRON`)

### Phase 1 source list

| Worker | Source | Type | Domains | Priority |
|---|---|---|---|---|
| `worker-arxiv` | arXiv | API | AI, Quantum, Space, Materials, Energy, Robotics | P1 |
| `worker-openalex` | OpenAlex | API | All domains | P1 |
| `worker-nasa-ntrs` | NASA NTRS | API | Space, Energy, Materials | P1 |
| `worker-nsf-awards` | NSF Award Search | API | AI, Quantum, Energy, Robotics | P1 |
| `worker-nrel` | NREL | RSS + API | Energy | P1 |
| `worker-esa` | ESA | RSS | Space | P1 |
| `worker-darpa` | DARPA | RSS | AI, Robotics, Quantum, Security | P1 |
| `worker-deepmind` | DeepMind Blog | RSS | AI | P1 |
| `worker-microsoft-research` | Microsoft Research | RSS | AI, Quantum | P1 |
| `worker-mit-csail` | MIT CSAIL | RSS | AI, Robotics | P1 |
| `worker-stanford-hai` | Stanford HAI | RSS | AI | P1 |

### Phase 1 implementation order

Build in this order to deliver domain coverage quickly and validate the pipeline end-to-end before expanding.

1. **`worker-arxiv`** — highest volume, broadest domain coverage, well-documented API. Use as the integration test for the full pipeline (fetch → normalise → write → deduplicate).
2. **`worker-openalex`** — second source to validate the multi-source dedup logic. Cross-domain.
3. **`worker-nsf-awards`** — funding signals for all domains. Simple REST/JSON API.
4. **`worker-nasa-ntrs` + `worker-esa`** — validates the Space domain end-to-end.
5. **`worker-nrel`** — validates Energy domain.
6. **`worker-darpa`** — RSS parser, validates the RSS fetch path.
7. **Institutional blogs** (`deepmind`, `microsoft-research`, `mit-csail`, `stanford-hai`) — after RSS path is proven by DARPA worker.

### arXiv category map

| Centari domain | arXiv categories |
|---|---|
| AI | `cs.AI`, `cs.LG`, `cs.CL`, `cs.CV`, `cs.NE` |
| Robotics | `cs.RO` |
| Quantum | `quant-ph`, `cond-mat.supr-con` |
| Space | `astro-ph.IM`, `astro-ph.EP` |
| Energy | `physics.app-ph`, `cond-mat.mtrl-sci` |
| Materials | `cond-mat.mtrl-sci`, `cond-mat.mes-hall` |
| Spatial/XR | `cs.HC`, `cs.GR` |

### RSS worker specification

Every RSS worker implements this interface:

```typescript
interface WorkerResult {
  source_slug: string;
  fetched_at: string;         // ISO timestamp
  signals_found: number;      // total items in feed window
  signals_new: number;        // signals written to DB (after dedup)
  signals_skipped: number;    // duplicate slugs skipped
  errors: string[];           // non-fatal per-item errors
}
```

Each item in the RSS feed produces at most one signal. Items outside the lookback window (default: 7 days) are skipped. Items with no `published` date are skipped.

### API worker specification

API workers additionally receive:

```typescript
interface ApiWorkerConfig {
  lookback_days: number;      // default 7
  categories: string[];       // source-specific category list
  max_results_per_run: number; // default 50
  page_size: number;          // default 25
}
```

Pagination continues until either the date window is exhausted or `max_results_per_run` is reached.

---

## Phase 2 — University and lab feeds

**Goal:** geographic and institutional diversity. European and Asian labs. Lower volume, higher editorial quality per item.  
**Target:** 8–10 additional workers.  
**Prerequisite:** Phase 1 pipeline stable, curation workflow defined.

### Phase 2 source list

| Worker | Source | Type | Domains |
|---|---|---|---|
| `worker-cmu-robotics` | Carnegie Mellon Robotics | RSS | Robotics |
| `worker-eth-ai` | ETH Zürich AI Center | RSS | AI, Robotics |
| `worker-mit-media` | MIT Media Lab | RSS | AI, Spatial/XR |
| `worker-meta-ai` | Meta AI / Reality Labs | RSS | AI, Spatial/XR |
| `worker-nvidia-research` | NVIDIA Research | RSS | AI, Robotics, Spatial/XR |
| `worker-ibm-quantum` | IBM Quantum | RSS | Quantum |
| `worker-ionq` | IonQ | RSS | Quantum |
| `worker-lbnl` | Lawrence Berkeley Lab | RSS | Energy, Materials |
| `worker-ornl` | Oak Ridge National Lab | RSS | Energy, AI |
| `worker-argonne` | Argonne National Lab | RSS | Energy, Quantum, Materials |
| `worker-max-planck` | Max Planck Society | RSS | AI, Materials, Quantum |
| `worker-fraunhofer` | Fraunhofer Society | RSS | AI, Energy, Robotics |

### Phase 2 additions to slug strategy

Phase 2 institutional sources often publish in German, French, or other languages. Slug generation must normalise non-ASCII characters:

- `ü` → `u`, `ö` → `o`, `ä` → `a`, `ß` → `ss`
- `é` → `e`, `ê` → `e`, `à` → `a`
- Other non-ASCII: remove

The `summary` field in the DB stores content as retrieved. Do not translate in Phase 2 — translation is a Phase 3 enrichment step.

---

## Phase 3 — Patents, funding, company launches, enrichment

**Goal:** full coverage of the innovation signal spectrum. Company-level signals, patent intelligence, and AI-assisted quality improvement.  
**Prerequisite:** Phase 2 complete, moderation UI built (Sprint R8D or later).

### Phase 3 source additions

| Worker | Source | Type | Domains | Notes |
|---|---|---|---|---|
| `worker-crossref` | Crossref | API | All | DOI resolution and citation metadata enrichment |
| `worker-semantic-scholar` | Semantic Scholar | API | AI, Quantum, Robotics | Citation influence score signals |
| `worker-qutech` | QuTech | RSS | Quantum | Low volume, high quality |
| `worker-rigetti` | Rigetti | RSS | Quantum | Validate claims against arXiv |
| `worker-perimeter` | Perimeter Institute | RSS | Quantum | Foundational theory signals |
| `worker-cern` | CERN | RSS | Materials, Quantum | Selective; magnet tech focus |
| `worker-nasa-open` | NASA Open APIs | API | Space | Mission events, earth observation |
| `worker-osti` | OSTI.gov (DOE) | API | Energy, Materials | Supplements LBNL/ORNL/Argonne |

### Phase 3 enrichment steps

These run as post-processing passes on existing `pending` signals, not as separate ingest workers:

**E1 — AI summarisation**  
If `summary` is empty or longer than 400 characters, generate a concise 2–3 sentence summary using the configured Ollama model (`qwen3:4b`). Store in `summary`. Mark with `reviewed_by = 'ai-summariser'`.

**E2 — Entity extraction**  
Extract organisations, products, and technologies from `title + summary`. Write to `signal_entities`. Use a prompt that returns structured JSON. Validate entity types against the schema enum before writing.

**E3 — Confidence upgrade**  
For signals with `confidence = 'probable'` that have an associated DOI: resolve the DOI via Crossref, check if the venue is a peer-reviewed journal, and upgrade to `verified` if so. Log the upgrade reason.

**E4 — Duplicate detection**  
Beyond slug dedup, run a semantic similarity check (embedding cosine similarity > 0.92) against existing signals within the same domain and 30-day window. Flag near-duplicates for curator review rather than auto-rejecting.

**E5 — Geographic resolution**  
For signals with no `signal_locations` row, attempt to extract location from author affiliations or organisation name (via `signal_entities`). Look up known institution locations from a local mapping table. Low confidence only — set `location_confidence = 'low'`.

---

## Curation workflow

Workers write signals at `status = 'pending'`. The curation step (future Sprint R8D) provides a moderation UI where a curator can:

| Action | DB change |
|---|---|
| Approve | `status = 'approved'`, `reviewed_by = {curator}`, `reviewed_at = now()` |
| Reject | `status = 'rejected'` (not deleted — kept for audit) |
| Edit | Update `title`, `summary`, `curator_score`, `confidence` before approval |
| Flag duplicate | Link to existing signal slug; reject current |

Until the moderation UI is built, curators can approve signals directly via the Supabase dashboard table editor.

---

## Environment variables

Workers require these variables in addition to the base `.env`:

```bash
# Required for all workers
SUPABASE_URL=https://{ref}.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   # never the anon key

# Optional per worker
WORKER_CRON=0 */6 * * *                  # default every 6 hours
WORKER_LOOKBACK_DAYS=7                   # default 7
WORKER_MAX_RESULTS=50                    # default 50 per run
LOG_LEVEL=info                           # debug | info | warn | error

# Phase 3 enrichment (not needed until Phase 3)
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen3:4b
```

The `SUPABASE_ANON_KEY` is never used by workers. Workers write; they do not read back results for business logic.

---

## Sprint dependency map

```
Sprint R6B  ─── API bridge + JSON fallback          ✓ complete
Sprint R6C  ─── Frontend wired to API routes        ✓ complete
Sprint R7   ─── Source registry + attribution docs  ← current
Sprint R8A  ─── worker-arxiv (Phase 1, first)
Sprint R8B  ─── worker-openalex + worker-nsf-awards
Sprint R8C  ─── worker-nasa-ntrs + worker-esa + worker-nrel + worker-darpa
Sprint R8D  ─── Moderation UI (approve/reject pending signals)
Sprint R8E  ─── Institutional blog workers (Phase 1 complete)
Sprint R9A  ─── Phase 2 workers (university and lab feeds)
Sprint R9B  ─── Phase 3 enrichment (AI summarisation, entity extraction)
Sprint R9C  ─── Phase 3 additional sources (patents, Crossref, OSTI)
```

---

## Monitoring

Each worker run logs to `worker_runs`:

```sql
INSERT INTO worker_runs (
    worker_name, started_at, completed_at,
    status,                              -- 'success' | 'partial' | 'failed'
    signals_found, signals_written,
    error_message
) VALUES (...);
```

Alert conditions (implement in Sprint R8D alongside moderation UI):
- `status = 'failed'` on any worker run
- `signals_written = 0` for 3 consecutive runs on a P1 source (source may be down or changed)
- `signals_found > 200` in a single run (unexpected spike — possible feed anomaly)

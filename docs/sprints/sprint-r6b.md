# Sprint R6B — Research API Bridge

**Goal:** Create a stable API bridge so Research Map can migrate from the JSON data layer to Supabase safely, while keeping local development fully functional without a Supabase connection.  
**Status:** Complete  
**Date:** 2026-06-12

---

## What was built

### API routes (both were already scaffolded in R5; R6B adds JSON fallback and anon-key auth)

| Route | File |
|-------|------|
| `GET /api/research/signals` | `src/app/api/research/signals/route.ts` |
| `GET /api/research/trends` | `src/app/api/research/trends/route.ts` |

Both routes:
- Check `isSupabaseConfigured()` (SUPABASE_URL + SUPABASE_ANON_KEY present)
- If **not** configured → serve JSON fallback immediately (no DB call)
- If configured → query Supabase using the anon (read-only) key
- Return the same response shape in both paths

### JSON fallback

`src/lib/research-api-fallback.ts` contains:

- `getFallbackSignals()` — filters and shapes `src/data/research-signals.json` to match the API contract. Applies `domain`, `region`, `type`, `limit`, `offset`. Sorts by `curator_score DESC`. Returns `{ data, total, limit, offset, source: "json" }`.
- `getFallbackTrends()` — maps `src/data/top-trends.json` to the trends API shape. Looks up constituent signals by `signal_ids`, computes `trend_score` as mean signal_strength, returns `{ data, total, limit, offset, source: "json" }`.

The `source: "json"` field in fallback responses lets callers detect fallback mode if needed.

### Supabase client update

`src/lib/supabase.ts` now exports three functions:

| Function | Key used | Purpose |
|----------|----------|---------|
| `isSupabaseConfigured()` | — | True when SUPABASE_URL + SUPABASE_ANON_KEY are set |
| `getSupabaseAnon()` | `SUPABASE_ANON_KEY` | Public reads (API routes) |
| `getSupabase()` | `SUPABASE_SERVICE_ROLE_KEY` | Privileged writes (worker only) |

### Environment variable documentation

`.env.example` updated with `SUPABASE_ANON_KEY` and comments distinguishing read vs. write keys.

---

## What was not done (by design)

- No Supabase project created — run migrations when ready per `docs/research/research-data-foundation.md`
- No scraping
- No AI calls
- No `/research` UI changes
- The JSON data layer (`src/data/research-signals.json`, `src/lib/research-signals.ts`) is untouched

---

## Connecting Supabase when ready

1. Create a Supabase project.
2. Run migrations: `002_research_schema.sql` then `003_research_seed.sql`.
3. Add to `.env.local`:
   ```
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   ```
4. Restart dev server — routes switch to live data automatically.

---

## Next sprints

| Sprint | Goal | Depends on |
|--------|------|-----------|
| R6C | Wire `/research` frontend to API routes | R6B |
| R6D | Moderation UI — approve/reject pending signals | R6B + Supabase connected |
| R3B | Worker signal ingestion (real sources) | R6B + Supabase connected |

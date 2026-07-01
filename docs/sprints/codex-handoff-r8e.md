# Codex Handoff — Sprint R8E/F
**Date:** 2026-07-01  
**Branch:** `sprint/content-narrative-alignment`  
**From:** Worker pipeline (Robin + Claude)  
**To:** Frontend (Codex)

---

## What happened since the satellite handoff

Three new ingestion workers are live. The database now has **~250+ signals** from 6 sources.

| Worker | Signals | Category coverage | Notes |
|--------|---------|------------------|-------|
| `worker-openalex` | existing | all domains | Was already live |
| `worker-nsf` | existing | ai, quantum, robotics, energy | Was already live |
| `worker-osti` | ~94 | energy, materials, quantum, ai, robotics, space | DOE lab publications |
| `worker-nasa` | ~30 | space | Tagged with mission id (iss/hubble/jwst) |
| `worker-cordis` | ~48 | ai, energy, materials, robotics, quantum, space | **EU projects with real lat/lng** |
| `worker-arxiv` | ~100 | ai, robotics, quantum, xr, space, materials | arXiv preprints |

---

## BLOCKER — signals are invisible until approved

The API at `/api/research/signals` filters `status = 'approved'`. All worker signals land as `status = 'pending'`. Nothing new appears in the UI yet.

**Fix:** Run this SQL in the Supabase dashboard (SQL editor):

```sql
UPDATE signals
SET status = 'approved'
WHERE reviewed_by LIKE 'worker-%'
  AND status = 'pending'
  AND category != 'other';
```

This approves ~250 signals in one shot. `category = 'other'` rows stay pending — they are intentional rejects from the arXiv domain router and must never be approved.

---

## What the API already gives you (no code change needed)

The `GET /api/research/signals` route already JOINs `signal_locations`:

```json
{
  "id": "...",
  "title": "High-impedance superconducting circuits...",
  "category": "quantum",
  "signal_type": "funding",
  "confidence": "verified",
  "source_name": "EU Cordis / Horizon Europe",
  "source_url": "https://cordis.europa.eu/project/id/...",
  "tags": ["eu", "horizon", "quantum", "fr"],
  "curator_score": 7,
  "signal_strength": 0.7,
  "novelty_score": 0.68,
  "location": {
    "country_code": "FR",
    "country_name": "France",
    "region": "Europe",
    "lat": 48.9,
    "lng": 2.3,
    "location_confidence": "low",
    "place_type": "country"
  }
}
```

**Cordis signals are the first to have real `location.lat` / `location.lng`.** The globe can plot them as dots at the correct European position once you wire the location data through.

---

## Globe integration — dots from signal_locations

Signals without a `signal_locations` row get `location: null` from the API. Signals from Cordis have actual coordinates.

Suggested globe rendering logic:

```typescript
// In GlobeMap or page.tsx — build globe dots from approved signals with location
const globeSignals: GlobeSignal[] = signals
  .filter(s => s.location?.lat != null && s.location?.lng != null)
  .map(s => ({
    id:       s.id,
    lat:      s.location!.lat,
    lng:      s.location!.lng,
    category: s.category,
    title:    s.title,
    intensity: s.signal_strength ?? 0.5,
  }));
```

Signals from arXiv/OSTI/NSF/NASA have `location: null` — they still appear in the side panel but not as globe dots (unless you later add geo-extraction for those).

---

## Satellite panel — tag filtering

NASA signals are tagged `['nasa', 'iss']`, `['nasa', 'hubble']`, or `['nasa', 'jwst']`.

To filter signals for a satellite panel:
```typescript
const missionSignals = signals.filter(s =>
  s.tags?.includes(activeMission)  // activeMission = 'iss' | 'hubble' | 'jwst'
);
```

---

## Source badge rendering

Each signal has `source_name` and `confidence`. Suggest showing both:

| `confidence` | Badge style | Meaning |
|---|---|---|
| `verified` | solid green | Peer-reviewed / official govt source (OSTI, Cordis, NASA) |
| `probable` | amber | OpenAlex, NSF |
| `preliminary` | grey/dashed | arXiv preprint — not peer-reviewed |

`signal_type` values in the DB: `paper`, `lab_publication`, `funding`, `news`, `launch`, `release`, `patent`.

---

## Signal volume per domain (approximate, post-approval)

| Domain | Approx count |
|--------|-------------|
| ai | ~110 |
| quantum | ~35 |
| robotics | ~30 |
| energy | ~25 |
| materials | ~20 |
| space | ~20 |
| xr | ~10 |

XR is intentionally lean — the arXiv router requires explicit XR keywords in cs.HC papers before accepting them.

---

## Files Codex should know about

| File | What it is |
|------|-----------|
| `src/components/research/GlobeMap.tsx` | Three.js globe with ISS/Hubble/JWST satellites |
| `src/app/research/page.tsx` | Research page — imports GlobeMap dynamically |
| `src/app/api/research/signals/route.ts` | Signal API — JOINs signal_locations |
| `worker/src/cordis.ts` | EU worker — produces signals WITH location rows |
| `worker/src/arxiv.ts` | arXiv worker v1.3 — domain inference, LaTeX cleaning |
| `supabase/migrations/002_research_schema.sql` | Full schema — signals + signal_locations |

---

## Summary of what to do

1. **Run the approval SQL above** — unlocks all new signals in the UI
2. **Wire `location.lat/lng` to globe dots** — Cordis signals are already geolocated
3. **Add source badge** using `confidence` + `source_name`
4. **Satellite panel tag filter** using `tags.includes(missionId)`

Nothing else needs to change in the backend — the API, schema, and workers are all stable.

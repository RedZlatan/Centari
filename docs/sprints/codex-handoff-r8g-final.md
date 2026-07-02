# Codex Handoff — Sprint R8C–R8G (dag-summering)
**Datum:** 2026-07-02  
**Branch:** `sprint/content-narrative-alignment`  
**Från:** Worker-pipeline  

---

## Vad som byggts i dag

### 5 nya ingestionworkers

| Worker | Fil | Signaler | Domäner | Koordinater |
|--------|-----|----------|---------|-------------|
| DOE OSTI | `worker/src/osti.ts` | ~94 | energy, materials, quantum, ai, robotics, space | nej |
| NASA NTRS | `worker/src/nasa.ts` | ~30 | space | nej |
| EU Cordis | `worker/src/cordis.ts` | ~48 | ai, energy, materials, robotics, quantum, space | **ja — per EU-land** |
| arXiv | `worker/src/arxiv.ts` | ~100 | ai, robotics, quantum, xr, space, materials | nej |
| UKRI | `worker/src/ukri.ts` | ~80 | ai, quantum, robotics, energy, materials, space, xr | **ja — GB** |

**Totalt i databasen: ~350+ nya signaler** (alla `status = 'pending'`).

---

## BLOCKER #1 — ingenting syns förrän du kör detta

```sql
UPDATE signals
SET status = 'approved'
WHERE reviewed_by LIKE 'worker-%'
  AND status = 'pending'
  AND category != 'other';
```

Kör i Supabase SQL-editorn. Approvar alla ~350 worker-signaler. `category = 'other'` är avsiktliga reject från arXiv-routern och ska aldrig approveras.

---

## BLOCKER #2 — migration 006 saknas i main-branchen

Din kopia (`Documents/Centari`) har `006_signal_snapshots_and_human_layers.sql` som inte är i `Desktop/Centari` (`sprint/content-narrative-alignment`) ännu.

**006 lägger till:**
- `human_layers` — 8 kognitions-/beteendelager (perception, spatial-cognition, attention-load, memory-learning, stress-risk, decision-making, body-environment, team-coordination)
- `signal_human_layers` — junction: signal ↔ human layer med `relevance` + `reason`
- `trend_snapshot_runs` + `trend_snapshots` — daily/weekly/monthly aggregationer per domän
- `human_layer_snapshots` — aggregationer per human layer

Migrera och merga, annars är de nya tabellerna inte i produktion.

---

## Vad API:et redan ger dig (ingen backend-ändring krävs)

`GET /api/research/signals` JOINar redan `signal_locations`. Cordis- och UKRI-signaler returneras med:

```json
{
  "category": "quantum",
  "signal_type": "funding",
  "confidence": "verified",
  "source_name": "UKRI — EPSRC",
  "tags": ["ukri", "epsrc", "quantum", "research-grant"],
  "location": {
    "country_code": "GB",
    "region": "Europe",
    "lat": 51.5,
    "lng": -0.1
  }
}
```

**Confidence-nivåer i databasen:**
- `verified` — OSTI, Cordis, NASA, UKRI (officiella källor)
- `probable` — OpenAlex, NSF
- `preliminary` — arXiv (preprints)

---

## Globe: signaler med koordinater

Dessa workers ger `signal_locations`-rader med lat/lng:

| Worker | Koordinatnivå |
|--------|--------------|
| Cordis | Per EU-land (koordinator) |
| UKRI | GB (51.5, -0.1) — nationsnivå |

Filtrera i frontend:
```typescript
const locatedSignals = signals.filter(s => s.location?.lat != null);
```

---

## Satellit-panel: tag-filtrering

NASA-signaler är taggade `['nasa', 'iss']`, `['nasa', 'hubble']`, `['nasa', 'jwst']`.

```typescript
const missionSignals = signals.filter(s => s.tags?.includes(activeMission));
```

---

## Human layers — vad de är till för

`human_layers`-taxonomin är en **kors-skärande dimension** ortogonal mot domänerna (ai/quantum/etc.). Den beskriver hur en signal relaterar till mänsklig kognition och beteende — "perception", "team-coordination" osv.

Tänkt användning:
- En signal om ett XR-system kan taggas `perception` + `spatial-cognition`
- En signal om ett AI-beslutsstöd kan taggas `decision-making` + `attention-load`
- Tilldelning sker via regler (`assigned_by = 'rules'`) eller kurator

`trend_snapshots` och `human_layer_snapshots` är periodsnapshots (daily/weekly/monthly) för trendgrafer i UI:et.

---

## Filöversikt

```
worker/src/
  osti.ts         DOE OSTI (US)
  nasa.ts         NASA NTRS (space, mission-tagged)
  cordis.ts       EU Cordis / OpenAIRE (EU, med koordinater)
  arxiv.ts        arXiv preprints (v1.3, domain-inferens)
  ukri.ts         UKRI (UK, med koordinater)

supabase/migrations/
  002_research_schema.sql   signals + signal_locations + trends
  005_add_other_domain.sql  'other' som intern kategori
  006_*  ← I DIN KOPIA — behöver mergas in
```

---

## Sammanfattning: vad du ska göra

1. **Kör approval-SQL** ovan → ~350 signaler synliga
2. **Merga migration 006** → human_layers + snapshots i produktion
3. **Globe-dots** från `location.lat/lng` (Cordis + UKRI är redan geoplacerade)
4. **Source-badge** med `confidence` + `source_name`
5. **Satellit-panel** med tag-filter på `iss`/`hubble`/`jwst`
6. **Human layers UI** — valfritt i denna sprint, schemat är redo

# Source Attribution Standard v1

Every signal in the Centari Research Map must carry complete provenance metadata.  
This document defines the mandatory fields, how they map to the database schema, and how they should appear in the UI.

**Version:** 1  
**Last updated:** 2026-06-13  
**Applies to:** all signals ingested by automated workers or entered manually

---

## Why attribution matters

The Research Map is a curated signal layer, not a media aggregator. Users treating its signals as decision inputs need to know:

1. **Where** a signal originated (institution, publisher, API)
2. **When** it was published at the source vs. when Centari retrieved it
3. **How confident** we are in the claim
4. **Whether** the source is peer-reviewed, institutional, or press

Attribution is not a UI nicety — it is part of the signal's evidentiary weight.

---

## Required fields per signal

Every signal stored in the `signals` table must have all of the following populated before `status` is set to `approved`.

### Source identity

| DB column | Type | Required | Description |
|---|---|---|---|
| `source_id` | `uuid` (FK → sources) | Yes | Links to the sources registry. Never null for ingested signals. |
| `source_name` | `text` | Yes | Human-readable display name (e.g. `"DeepMind Research"`). Matches `sources.name`. |
| `source_url` | `text` | Yes | Direct URL to the specific article, paper, or announcement. Not the homepage. |

### Temporal provenance

| DB column | Type | Required | Description |
|---|---|---|---|
| `published_at` | `timestamptz` | Yes | The date/time the source published the content. If only a date is available (no time), store as `{date}T00:00:00Z`. |
| `ingested_at` | `timestamptz` | Yes | The timestamp when the worker retrieved and stored the signal. Set automatically by the worker. |

### Confidence and reliability

| DB column | Type | Required | Description |
|---|---|---|---|
| `confidence` | `text` (enum) | Yes | `verified` / `probable` / `preliminary`. See definitions below. |
| `curator_score` | `integer` (1–10) | Yes | Editorial quality score. See scoring rubric below. |
| `signal_strength` | `numeric(5,3)` | Yes | Computed from `curator_score / 10`. Range 0.000–10.000. |

---

## Confidence definitions

| Value | Meaning | Typical source |
|---|---|---|
| `verified` | Claim is peer-reviewed, published in a named journal, or is an official announcement from the originating organisation. The signal has been reproduced or confirmed by the source itself. | Nature, Science, arXiv peer-reviewed papers; official press releases from NASA, ESA, IBM |
| `probable` | Claim is credible and from a reputable source but has not yet been independently confirmed. Preprints, institutional blog posts, and conference proceedings without full review. | arXiv preprints, institutional blogs, conference papers |
| `preliminary` | Claim is from a source that is reliable but the result is early-stage, self-reported, or based on a press release without supporting technical documentation. Use sparingly. | Company press releases without white papers; media coverage of unconfirmed benchmarks |

Workers should default to `probable`. Confidence should be upgraded to `verified` during the curation review step when a peer-reviewed paper or official source is confirmed.

---

## Curator score rubric

The `curator_score` (1–10) reflects editorial judgement on signal importance and quality.

| Score | Meaning |
|---|---|
| 9–10 | Landmark result. Nature/Science publication, major mission milestone, record-breaking hardware benchmark. Will be cited for years. |
| 7–8 | Significant advance. Strong arXiv paper with clear domain impact, major funding announcement (≥$100M), product launch from a leading lab. |
| 5–6 | Notable. Solid research output, mid-size funding, incremental hardware improvement, or a promising preprint. |
| 3–4 | Informational. Conference paper, small grant, status update from an existing programme. Low urgency. |
| 1–2 | Marginal. Weak signal, speculative claim, or near-duplicate of an existing signal. Should rarely be ingested. |

Workers set an initial score based on the source registry `reliability` field and signal type. Human curators may adjust during the review step.

---

## Signal type definitions

| `signal_type` | Description | Example |
|---|---|---|
| `lab_publication` | Peer-reviewed journal article or formal technical report from a research institution. | AlphaFold 3 in Nature |
| `paper` | Preprint or conference paper not yet peer-reviewed. | arXiv submission |
| `launch` | First deployment, mission launch, hardware shipment, or product release. | Starship IFT-6 |
| `release` | Software, model, or dataset made publicly available. | Llama 3 open weights |
| `funding` | Government grant, VC round, or programme award. | NSF $50M quantum grant |
| `patent` | Filed or granted patent with strategic relevance. | — |
| `news` | Official announcement, milestone update, or institutional press release. | ESA Hera arrival |

---

## Attribution in the API response

The `/api/research/signals` endpoint surfaces attribution via these fields on each signal object:

```json
{
  "id": "...",
  "slug": "...",
  "title": "...",
  "summary": "...",
  "source_name": "Google DeepMind",
  "source_url": "https://deepmind.google/models/veo/",
  "published_at": "2026-05-20T00:00:00Z",
  "confidence": "verified",
  "curator_score": 9,
  "signal_strength": 0.900,
  "category": "ai",
  "signal_type": "launch",
  "location": {
    "city": "London",
    "country_code": "GB",
    "country_name": "United Kingdom",
    "region": "Europe",
    "lat": 51.5074,
    "lng": -0.1278
  }
}
```

`ingested_at` is available in the DB but intentionally omitted from the public API response — it is an internal provenance field, not user-facing.

---

## Attribution in the UI (future)

When the Research Map UI surfaces signal detail views, attribution must appear as:

### Required UI elements

| Element | Content | Notes |
|---|---|---|
| Source name | `source_name` | Plaintext, always visible |
| Source link | `source_url` | Opens original source in new tab |
| Published date | `published_at` formatted as `MMM YYYY` or full date | Human-readable |
| Confidence indicator | `confidence` value | Visual: star / verified badge / preliminary warning |
| Signal type | `signal_type` | Tag/chip: `lab_publication`, `funding`, etc. |

### Optional UI elements (Sprint R8+)

| Element | Content | Notes |
|---|---|---|
| Source icon | Favicon or custom icon from sources registry | Do not fetch favicons dynamically in production — cache them |
| Reliability stars | `sources.tier` rendered as 1–3 stars | Tier 1 = top-tier institutional source |
| Retrieved date | `ingested_at` | Only surface if user asks "when was this added?" |
| DOI / external ID | Not yet stored | Planned for schema v2 |

---

## Attribution for manually curated signals

Signals entered manually (e.g. seed data, editorial additions) must still follow all requirements above:

- `source_id` must point to a real entry in the `sources` table
- `source_url` must be a direct link to the originating document (not `"#"` or `"N/A"`)
- `reviewed_by` must identify the curator (e.g. `"seed"`, `"robin"`, `"editorial-review"`)
- `reviewed_at` must be set to the review date

Manually curated signals should default to `confidence = 'verified'` only when the `source_url` points to a peer-reviewed or official primary source. Use `probable` otherwise.

---

## What attribution is not

- Attribution does not require citing every secondary source that reported on a result. Cite the **primary source** — the institution or journal that produced the original work.
- Attribution does not require tracking all authors. The `signal_entities` table captures key organisations and named technologies, but author names are not stored at v1.
- Attribution does not grant or restrict reproduction rights. Centari stores summaries and metadata, not full-text content.

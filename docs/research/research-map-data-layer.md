# Research Signal Map — Data Layer Reference

**Schema version:** 2.0  
**Status:** Seed dataset complete — 50 signals, 7 domains, 7 regions  
**Audience:** Curators, engineers integrating the Research Map, future ingestion agents

---

## 1. Purpose

This document defines the data model, source standards, geographic taxonomy, trend scoring algorithm, and quality gates for the Centari Research Signal Map.

The Research Map surfaces real technology signals — publications, launches, funding rounds, lab releases — across seven deep-tech domains and seven world regions. The goal is editorial: show what is actually happening in frontier technology, not what is trending on social media.

---

## 2. Signal schema V2

The canonical TypeScript definition lives in `src/lib/research-signals.ts`. This section is the narrative reference.

### 2.1 Field reference

#### Identity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Globally unique kebab-case identifier. **Format:** `{descriptive-slug}-{YYYY-MM}`. Example: `microsoft-majorana1-qubit-2025-02`. The date portion reflects when the event occurred, not when the record was created. Must be stable once published — do not rename. |

#### Timestamps

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `published_at` | `string` (ISO 8601 date) | Yes | When the underlying event was published or occurred. For papers: submission or publication date. For funding: announcement date. For launches: event date. |
| `ingested_at` | `string` (ISO 8601 date) | Yes | When this record was added to the dataset. Set at curation time; never updated. |

#### Content

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | Yes | 5–200 characters. For papers: verbatim title. For news and launches: verbatim headline or close paraphrase. No promotional language or editorial framing. |
| `summary` | `string` | Yes | 2–4 sentences. 20–500 characters. Plain language. Describe what happened and why it matters technically. No claims absent from the source document. No marketing language. |
| `source_url` | `string` | Yes | Full `https://` URL to the specific document. See Section 4 for requirements. |

#### Classification

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `primary_domain` | `Domain` | Yes | The single most relevant domain. One of: `ai`, `xr`, `robotics`, `quantum`, `space`, `energy`, `materials`. |
| `secondary_domains` | `Domain[]` | Yes | 0–2 additional domains. Must not duplicate `primary_domain`. Empty array `[]` is acceptable and preferred when the signal is clearly single-domain. |
| `signal_type` | `SignalType` | Yes | Classification of the signal. See Section 7. |
| `tags` | `string[]` | Yes | 0–5 kebab-case factual tags. No promotional language. Examples: `fusion-energy`, `gate-all-around`, `humanoid-robotics`. |

#### Source quality

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source_name` | `string` | Yes | Display name of the publishing organisation. Examples: `"Nature"`, `"arXiv / CMU"`, `"SpaceX"`. |
| `source_tier` | `1 \| 2 \| 3` | Yes | Authority tier. See Section 4. |

#### Geography

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `city` | `string` | Yes | City at the point of the event: HQ, lab, launch site, or observation location. |
| `country_code` | `string` | Yes | ISO 3166-1 alpha-2 two-letter code. Examples: `"US"`, `"GB"`, `"JP"`, `"ZA"`. |
| `country_name` | `string` | Yes | Full English country name. Examples: `"United States"`, `"United Kingdom"`. |
| `region` | `Region` | Yes | Continent-scale geographic region. See Section 5. |
| `lat` | `number` | Yes | WGS84 latitude −90 to +90. Should be the city or institution centroid, not a country centroid (unless `location_confidence` is `"low"`). |
| `lng` | `number` | Yes | WGS84 longitude −180 to +180. |
| `location_confidence` | `LocationConfidence` | Yes | See Section 5.2. |

#### Scoring

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `curator_score` | `integer 1–10` | Yes | Editorial importance score. See rubric in Section 6. |
| `confidence` | `SignalConfidence` | Yes | Overall data quality for this record. See Section 2.2. |

### 2.2 Confidence levels

| Value | Meaning | When to use |
|-------|---------|-------------|
| `"verified"` | Curator personally confirmed: source URL returns HTTP 200, claims match source, geolocation independently verified (institution registry, maps). | Primary sources with stable URLs. Lab publications from known institutions. |
| `"probable"` | Source is plausible, claims are internally consistent, not independently verified at curation time. | Press releases not yet independently covered. Startup announcements without secondary confirmation. |
| `"preliminary"` | Breaking news or preprint. Claims may be revised, retracted, or superseded. | arXiv papers before peer review. Unconfirmed reports from a single source. |

---

## 3. Trend schema

Trend records are editorial summaries, not raw signals. They are derived from the signal dataset and authored by a curator.

```typescript
interface ResearchTrend {
  rank: number;          // 1-based. Re-ranked on each dataset update.
  headline: string;      // ≤ 60 characters. Present tense. No jargon.
  explanation: string;   // 2–4 sentences. What is happening and why it matters now.
  primary_domain: Domain;
  signal_ids: string[];  // 1–5 signal IDs that support this trend claim.
  trend_score?: number;  // Computed field. Not stored. See Section 8.
}
```

Trends are not stored in `research-signals.json`. They live in a separate `research-trends.json` (forthcoming). For the MVP, trends are authored manually by curators using `signal_ids` as evidence.

---

## 4. Source requirements

### 4.1 Source tiers

| Tier | Definition | Examples |
|------|-----------|----------|
| **1 — Primary source** | The originating institution, lab, or publication. The document was created by the people who did the work. | arXiv paper by the authors, Nature/Science journal article, official company blog post, official mission page, institution press release. |
| **2 — Specialist press** | Reputable specialist or trade publication with editorial standards. Secondary coverage with editorial accountability. | MIT Technology Review, IEEE Spectrum, TechCrunch (funding rounds with verified data), The Verge (hardware reviews), New Space Economy, WIRED Science. |
| **3 — General press** | General-interest journalism. Acceptable accuracy but lower editorial rigour. Use only when no tier-1/2 source is available. | BBC Science, Reuters, Bloomberg Technology, Guardian Tech. |

**Rule:** Always use the highest-tier source available. If a Nature paper exists, link to it — not to the university press release about the Nature paper.

### 4.2 source_url requirements

The `source_url` must satisfy all of the following:

1. **Direct link.** Points to the specific document, paper, press release, or primary announcement — not a homepage, category page, search result, or news aggregator.
2. **HTTP 200 at curation time.** The curator verifies the URL resolves at the time of record creation.
3. **Specific.** The linked page must contain the substance described in `title` and `summary`. A reader clicking the URL should land on the relevant content without further navigation.
4. **Persistent.** Prefer DOI links for papers (`https://doi.org/...`), official blog/newsroom posts over social media, and institutional pages over third-party aggregators. Avoid links to Twitter/X, Reddit, or Hacker News as the primary source.

**Disallowed as primary source_url:**
- `https://www.nature.com/` (homepage — link to the specific article DOI)
- `https://arxiv.org/` (homepage — link to the specific paper, e.g. `arxiv.org/abs/2405.21060`)
- `https://techcrunch.com/` (homepage — link to the specific article)
- `https://x.com/organizationname` (social media profile)

---

## 5. Geographic taxonomy

### 5.1 Regions

Signals are assigned to one of seven regions. These follow standard geopolitical groupings, not geographic centroids.

| Region | Countries included | Notes |
|--------|--------------------|-------|
| `"North America"` | US, Canada, Mexico | Mexico is Latin America in some systems; here it follows North American geopolitical grouping |
| `"Europe"` | EU member states, UK, Norway, Switzerland, Iceland, Turkey, Russia | Iceland and Greenland included despite Atlantic location |
| `"Asia-Pacific"` | China, Japan, South Korea, India, Southeast Asia, Central Asia | India is sometimes separated; here grouped with Asia-Pacific |
| `"Middle East"` | Arabian Peninsula, Israel, Iran, Iraq, Jordan, Lebanon, Syria | Includes North Africa in some systems; this taxonomy keeps them separate |
| `"Africa"` | Sub-Saharan Africa and North Africa | |
| `"Latin America"` | South America, Central America, Caribbean | Mexico: see North America note |
| `"Oceania"` | Australia, New Zealand, Pacific Islands | |

**When in doubt:** use the region that matches the organisation's headquarters nationality, not the country where a specific event occurred (e.g. a rocket launch in French Guiana is `"Europe"` if operated by ESA).

### 5.2 Location confidence

| Value | Meaning | lat/lng derivation |
|-------|---------|-------------------|
| `"high"` | City-level precision from an authoritative source: Research Organisation Registry (ROR), official institution website, Crunchbase HQ, official launch record. Error ≤ 5 km. | Institution centroid or launch site coordinates |
| `"medium"` | City-level from article text or affiliation string, not independently verified against maps. Error ≤ 50 km. | City centroid from geocoding the affiliation string |
| `"low"` | Country-level only. The city is not known or not applicable. lat/lng is the capital city centroid. | Capital city of `country_code` |

### 5.3 Geocoding rules

- Use institution or company headquarters coordinates — not the author's home city, campus building, or event venue (unless the event itself is the signal, e.g. a launch site).
- For multinational companies, use the HQ of the specific team or lab that produced the work.
- Do not use satellite campus coordinates unless the work is unambiguously located there.
- Round coordinates to 4 decimal places (≈11m precision).

---

## 6. Curator score rubric

The `curator_score` is an integer 1–10 reflecting the editorial importance and likely impact of the signal. It is not a measure of the organisation's size or prestige.

| Score | Category | Description | Examples |
|-------|----------|-------------|----------|
| 9–10 | **Landmark** | Defines the state of the art. Likely to be cited in 10-year retrospectives. | First topological qubit (Majorana 1), SPARC groundbreak, Starship booster catch |
| 7–8 | **Significant** | Meaningful step forward. Changes what practitioners consider possible or commercially viable. | 1,000-qubit processor, humanoid robot Series B at scale, new rocket maiden success |
| 5–6 | **Solid** | Credible contribution that advances the field. Worth tracking for domain specialists. | New foundation model release, incremental yield improvement, regional pilot deployment |
| 3–4 | **Background** | Stored for completeness. Not displayed by default on the map. | Minor version updates, company blog posts about roadmaps, conference talks without results |
| 1–2 | **Weak** | Edge of relevance. Curated for potential future significance. | Preliminary preprints, announcement-of-announcements, unverified reports |

**Display threshold:** Signals with `curator_score >= 4` are shown on the public map. Signals below 4 are stored but not rendered.

---

## 7. Signal type classification

| Type | Use when | Trend weight |
|------|----------|-------------|
| `"paper"` | Peer-reviewed or arXiv paper. The signal is the research result itself. | Low |
| `"lab_publication"` | A lab, company, or institution publishes its own work (blog post, technical report, GitHub release) without going through a journal. | Low–Medium |
| `"release"` | A software model, platform, or API that users can access. | Medium |
| `"launch"` | A physical product ships, a rocket launches, a factory opens, a facility comes online. | Medium–High |
| `"funding"` | A funding round, grant award, or government contract is announced and confirmed. | High |
| `"patent"` | A patent filing or grant that reveals a novel approach. Use sparingly — most patents are not signals. | Low |
| `"news"` | A meaningful development reported by a credible source that does not fit other categories. | Neutral |

**Rule for ambiguous cases:**
- If a company publishes a paper AND announces a product launch on the same day, classify by what is more significant — usually `"launch"`.
- A product demo at a conference without customer delivery is `"lab_publication"`, not `"launch"`.
- A funding round must be publicly confirmed by the company to be classified as `"funding"`. Unconfirmed reports = `"news"`.

---

## 8. Trend scoring algorithm

The trend score is a real-valued number computed at query time. It is not stored in the JSON — it is derived from stored fields.

### 8.1 Formula

```
trend_score = (curator_score × source_multiplier × recency_factor) + type_bonus
```

### 8.2 Components

**Recency factor** — exponential decay with a 30-day half-life:

```
recency_factor = exp(−λ × days_since_published)
λ = ln(2) / 30
```

At 0 days: factor = 1.0 (full weight)  
At 30 days: factor = 0.5 (half weight)  
At 90 days: factor = 0.125 (eighth weight)  
At 180 days: factor ≈ 0.016

**Source multiplier** — reflects the authority and reliability of the source tier:

| Source tier | Multiplier |
|-------------|-----------|
| 1 (primary) | 1.00 |
| 2 (specialist press) | 0.85 |
| 3 (general press) | 0.70 |

**Type bonus** — additive, reflects the trend-relevance of the signal type:

| Signal type | Bonus |
|-------------|-------|
| `funding` | +0.50 |
| `launch` | +0.30 |
| `release` | +0.20 |
| `lab_publication` | +0.20 |
| `paper` | +0.10 |
| `patent` | +0.10 |
| `news` | +0.00 |

### 8.3 Score range

| Scenario | Score |
|----------|-------|
| Brand-new tier-1 funding with curator_score=10 | ~10.5 |
| 30-day-old tier-1 launch with curator_score=10 | ~5.3 |
| 90-day-old tier-1 lab_publication with curator_score=8 | ~1.2 |
| 1-year-old tier-3 news with curator_score=3 | ~0.01 |

### 8.4 Top-10 selection algorithm

```
1. Filter: retain signals where curator_score >= 6
2. Compute trend_score for each signal using current date as reference
3. Sort by trend_score descending
4. Walk ranked list:
   - Track domain_count[domain] for all 7 domains
   - Accept signal if domain_count[signal.primary_domain] < 3
   - Increment domain_count[signal.primary_domain]
   - Stop when 10 signals are selected
```

The domain cap (`maxPerDomain = 3`) prevents a single active domain (e.g. AI in a busy quarter) from monopolising the top 10. This gives visibility to breakthroughs in less-covered domains.

---

## 9. Public quality gates

Every signal in `research-signals.json` must pass all gates before the file is committed.

### 9.1 Acceptance checklist

- [ ] `id` matches format `{slug}-{YYYY-MM}`, all lowercase, no spaces
- [ ] `source_url` resolves to HTTP 200 and links to the specific document
- [ ] `source_url` is not a homepage, aggregator, or social media profile
- [ ] `title` is ≤ 200 characters with no promotional language
- [ ] `summary` is 2–4 sentences, ≤ 500 characters, and contains no claims absent from the source
- [ ] `lat`/`lng` are city-level (not country centroid) unless `location_confidence = "low"`
- [ ] `country_code` is valid ISO 3166-1 alpha-2
- [ ] `region` correctly reflects the country
- [ ] `curator_score` reflects the rubric in Section 6
- [ ] `confidence` correctly reflects the verification state
- [ ] `secondary_domains` does not duplicate `primary_domain`
- [ ] `tags` are all kebab-case, factual, and ≤ 5 entries

### 9.2 Rejection criteria

A signal MUST NOT be added if:

- The source is a press release for a press release (meta-announcement with no substance)
- The `source_url` requires login, paywall, or institutional access (use abstract page or preprint instead)
- The event has not occurred yet (planned, rumoured, or speculative signals are not permitted until the event is confirmed)
- The signal duplicates an existing signal in the same quarter for the same organisation and same event
- The curator cannot summarise the technical significance in 4 sentences without using the source's own marketing language

### 9.3 Update hygiene

- Signals are immutable once published. Do not edit `id`, `published_at`, or `lat`/`lng` after the first commit.
- `confidence` may be updated upward (from `preliminary` → `probable` → `verified`) as evidence accumulates.
- `curator_score` may be revised downward if the result is not replicated or the claim is later disputed. Add a note to the commit message when a score is revised.
- Dead `source_url` links: if a URL returns non-200, find an archival copy (Wayback Machine, DOI resolver) and update `source_url`. If no archival copy exists, move `confidence` to `"preliminary"` and note in the commit message.

---

## 10. Curation workflow

### Adding a new signal

1. Identify the event and locate the best primary source (tier 1 if possible).
2. Verify `source_url` resolves and contains the described content.
3. Assign `id` following the format convention.
4. Write `summary` without reading the source's own description first — write it from the facts, then cross-check.
5. Assign `curator_score`, `confidence`, and `signal_type` using the rubrics.
6. Geocode the organisation or event location. Record `location_confidence`.
7. Run `validateSignal()` from `src/lib/research-signals.ts` against the new record.
8. Pass all checklist items in Section 9.1.
9. Add the signal to `src/data/research-signals.json` in insertion order (newest last).
10. Update `updated_at` in the dataset root.
11. Commit with message describing the signal and why it was added.

### Removing a signal

Signals should not be removed unless the event was fabricated, the company does not exist, or a court order requires removal. For superseded signals (e.g. a quarterly result replaced by a full-year result), retain both and note the relationship in `summary`.

### Quarterly review

Every quarter, run `selectTopTrends()` with the current date and compare the auto-ranked output to the published trend list. Manually authored trend records must remain grounded in the signal data; any trend claim not supported by at least one `signal_id` in the current display set should be retired.

---

## 11. Migration from V1 schema

The existing V1 schema (`src/lib/signals.ts`, `src/data/signals.json`) remains live and powers the current Research Map UI. It must not be modified.

| V1 field | V2 equivalent | Notes |
|----------|---------------|-------|
| `url` | `source_url` | Renamed. V2 adds stricter requirements (must be specific document, not homepage). |
| `location_label` | `city` + `country_name` | Split into structured fields. |
| *(absent)* | `country_code` | New. ISO 3166-1 alpha-2. |
| *(absent)* | `region` | New. One of 7 continent-scale regions. |
| *(absent)* | `confidence` | New. `"verified" \| "probable" \| "preliminary"`. |
| All other fields | Identical | `id`, `published_at`, `ingested_at`, `title`, `summary`, `primary_domain`, `secondary_domains`, `signal_type`, `tags`, `lat`, `lng`, `location_confidence`, `curator_score`, `source_name`, `source_tier` are unchanged. |

V1 → V2 migration of the 26 seed signals is complete in `src/data/research-signals.json`. The V2 dataset is independent; the V1 dataset is not replaced by this sprint.

---

## 12. Dataset statistics

As of schema version 2.0 (2026-06-12):

### Signals by domain

| Domain | Count |
|--------|-------|
| AI | 9 |
| Space | 9 |
| Robotics | 7 |
| Energy | 7 |
| Materials | 7 |
| Quantum | 6 |
| XR | 5 |
| **Total** | **50** |

### Signals by region

| Region | Count |
|--------|-------|
| North America | 19 |
| Europe | 15 |
| Asia-Pacific | 11 |
| Middle East | 2 |
| Africa | 1 |
| Latin America | 1 |
| Oceania | 1 |
| **Total** | **50** |

### Signals by confidence

| Confidence | Count |
|-----------|-------|
| verified | 21 |
| probable | 29 |
| preliminary | 0 |

### Signals by source tier

| Tier | Count |
|------|-------|
| 1 (primary) | 44 |
| 2 (specialist) | 6 |
| 3 (general) | 0 |

### Score distribution

| Range | Count |
|-------|-------|
| 9–10 (landmark) | 11 |
| 7–8 (significant) | 28 |
| 5–6 (solid) | 11 |
| 3–4 (background) | 0 |

# Research Signal Map — Architecture

**Type:** Architecture planning — no implementation  
**Sprint:** R1  
**Scope:** Data sources, ingestion pipeline, classification, geolocation, scoring, map logic, MVP, risks, future agent system

---

## What this system does

The Research Signal Map is a live world map tracking technology signals across eight domains: AI, XR, Robotics, Quantum, Nano, Simulation, Edge Computing, and Infrastructure. A ninth catch-all domain (Innovation) captures signals that are cross-domain or don't fit a primary classification.

Two modes:

**Trends mode** — commercial and industry signals: news, funding, company launches, patents, product releases. The state of the market.

**Research mode** — scientific and academic signals: papers, arXiv submissions, university publications, citations. The state of knowledge.

Some signals belong to both modes (e.g., a major research lab spinout with a paper and a funding announcement).

The primary outputs are:
1. A world map with geographic signal hotspots, filterable by domain and mode
2. A top 10 trends list, updated every 6 hours
3. Per-signal detail: what happened, where, when, and why it matters

---

## Data sources

### Trends mode

| Source | What it provides | Access | Notes |
|--------|-----------------|--------|-------|
| **Tech news RSS** | Articles from major publications | Free (RSS) | Whitelist of ~20 curated feeds. No scraping. |
| **Crunchbase** | Funding rounds, company founding | API (free tier + paid) | Free tier: 200 req/month, ~$349/mo for full. MVP: free tier + weekly batch. |
| **USPTO Patent Feed** | US patent publications | Free bulk data + API | Full-text RSS at patents.google.com. USPTO publishes weekly (Tuesdays). |
| **ProductHunt** | Product launches, company launches | API (free) | GraphQL API, daily new products. |
| **GitHub Trending** | Open-source project momentum | Public API (no key) | `/explore/trending` — proxy for what developers are building |
| **Hacker News API** | Tech community signal | Free, public | High-scoring stories in relevant domains. Indicator of practitioner attention. |

**RSS whitelist (starting set):**

```
MIT Technology Review       — feeds.technologyreview.com/magazine/feed/
IEEE Spectrum               — spectrum.ieee.org/rss/fulltext
Wired (Science)             — wired.com/feed/category/science/latest/rss
Ars Technica (Technology)   — feeds.arstechnica.com/arstechnica/technology-lab
VentureBeat (AI)            — feeds.feedburner.com/venturebeat/SZYF
TechCrunch                  — techcrunch.com/feed/
The Verge (Tech)            — theverge.com/tech/rss/index.xml
Engadget                    — engadget.com/rss.xml
New Scientist               — newscientist.com/feed/home/
Nature News                 — nature.com/nature.rss
```

These are all legitimate RSS consumers — no scraping, no terms of service concerns.

---

### Research mode

| Source | What it provides | Access | Notes |
|--------|-----------------|--------|-------|
| **arXiv API** | Papers across all CS, physics, materials, engineering categories | Free, no key | Most important source. Daily submissions feed. Very permissive usage. |
| **Semantic Scholar API** | Papers with citations, author affiliations, field classification | Free (key for higher limits) | 100 req/5min without key, 1 req/sec with free key. 200M+ papers. |
| **ROR (Research Organization Registry)** | Institution names → coordinates, metadata | Free, public | Primary geolocation source for academic affiliations. 100K+ institutions. |
| **PubMed / NCBI** | Biomedical and nano-bio papers | Free API | Relevant for nano/bio-digital intersection. E-utilities API. |
| **IEEE Xplore** | Engineering and computing papers | API (free 200 req/day) | Supplements arXiv for IEEE conference papers and journals. |

**arXiv categories in scope:**

```
cs.AI   — Artificial Intelligence
cs.LG   — Machine Learning
cs.CV   — Computer Vision
cs.CL   — Computation and Language (NLP/LLMs)
cs.RO   — Robotics
cs.AR   — Hardware Architecture
cs.DC   — Distributed Computing
cs.NE   — Neural and Evolutionary Computing
cs.GR   — Graphics (spatial/XR)
cs.HC   — Human-Computer Interaction (XR)
quant-ph — Quantum Physics
cond-mat.mes-hall — Mesoscale (nano)
eess.SP  — Signal Processing (sensor/edge)
eess.SY  — Systems and Control
physics.app-ph — Applied Physics
```

arXiv publishes new submissions once daily (around 00:00 UTC). Fetch the daily digest for each category in scope.

---

## Ingestion pipeline

Each stage is independent and can fail without breaking the others.

```
┌──────────────────────────────────────────────────────────────────────┐
│  SOURCES                                                             │
│  [arXiv]  [Semantic Scholar]  [RSS feeds]  [Crunchbase]  [USPTO]    │
│  [ProductHunt]  [GitHub]  [HN API]                                   │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  Raw items (title, url, text, metadata)
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  STAGE 1 — FETCH & DEDUPLICATE                                       │
│  • Pull new items from each source on its schedule                   │
│  • Deduplicate by URL (exact) and source_id                         │
│  • Skip if URL already exists in signals table                       │
│  • Parse publication date, author/org fields, citation counts        │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  Novel items only
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  STAGE 2 — CLASSIFICATION (LLM)                                      │
│  • Assign primary domain and secondary domains                       │
│  • Assign signal_type (paper / news / funding / patent / launch)     │
│  • Assign mode (trends / research / both)                            │
│  • Extract key entities (organisations, people, technologies)        │
│  • Generate 280-char summary                                         │
│  • Return confidence score per classification decision               │
│  • Low confidence (<0.6): flag for review queue, still store        │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  Classified items
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  STAGE 3 — GEOLOCATION                                               │
│  • Extract location candidates: institution names, company names,    │
│    city mentions, country mentions                                   │
│  • Resolve institutions via ROR API                                  │
│  • Resolve companies via Crunchbase API (if available)               │
│  • Resolve city/country strings via geocoding (Nominatim/OSM, free) │
│  • Assign confidence tier: high / medium / low / none               │
│  • Items with confidence=none: stored but excluded from map         │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  Geolocated items
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  STAGE 4 — SCORING                                                   │
│  • Calculate base_score, source_weight, recency_factor               │
│  • Compute final_score                                               │
│  • Signals below minimum score threshold: stored but not displayed  │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  Scored items
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  STAGE 5 — STORAGE                                                   │
│  • Write to signals table                                            │
│  • Update source_health record                                       │
└──────────────────────────┬───────────────────────────────────────────┘
                           │  (on schedule, every 6 hours)
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  STAGE 6 — DERIVED OUTPUTS                                           │
│  • Recalculate hotspot clusters (H3 grid aggregation)               │
│  • Generate top 10 snapshot (LLM, signals as context)               │
│  • Expire signals older than retention window                        │
└──────────────────────────────────────────────────────────────────────┘
```

### Classification prompt structure (Stage 2)

Each item is sent to the LLM with a structured prompt requesting a JSON response:

```json
{
  "primary_domain": "ai",
  "secondary_domains": ["edge_computing"],
  "signal_type": "paper",
  "mode": ["research"],
  "relevance_score": 0.87,
  "summary": "...",
  "key_entities": {
    "organisations": ["MIT", "Google DeepMind"],
    "locations": ["Cambridge, MA, US"],
    "technologies": ["transformer inference", "quantization"]
  },
  "classification_confidence": 0.91,
  "classification_rationale": "Paper addresses on-device inference optimisation..."
}
```

Low `classification_confidence` (< 0.6) writes to a `review_queue` table. The pipeline continues but the signal is held from map display until reviewed or confidence improves via a second LLM pass with more context.

---

## Classification categories

### Technology domains

| Domain ID | Display name | arXiv categories | Keyword anchors |
|-----------|--------------|-----------------|-----------------|
| `ai` | AI & Machine Learning | cs.AI, cs.LG, cs.CV, cs.CL, cs.NE | LLM, neural network, model, inference, training, foundation model |
| `xr` | XR & Spatial Computing | cs.GR, cs.HC | AR, VR, MR, XR, spatial computing, headset, haptics, display, immersive |
| `robotics` | Robotics | cs.RO | robot, autonomous, manipulation, locomotion, drone, UAV, humanoid |
| `quantum` | Quantum | quant-ph | quantum computing, qubit, quantum sensing, quantum communication |
| `nano` | Nano & Materials | cond-mat.mes-hall, physics.app-ph | nanomaterial, nanotechnology, metamaterial, 2D material, graphene, MEMS |
| `simulation` | Simulation | cs.GR, cs.AI (subset) | simulation, digital twin, physics engine, synthetic data, virtual testing |
| `edge` | Edge & Embedded | cs.AR, cs.DC, eess.SP, eess.SY | edge computing, embedded, FPGA, SoC, firmware, IoT, real-time inference |
| `infrastructure` | Infrastructure | eess.SY, cs.DC (subset) | power grid, network infrastructure, 5G, 6G, satellite, connectivity |
| `innovation` | Innovation | — | Cross-domain signals, significant events that don't fit a primary domain |

**Classification rules:**
- Every signal gets exactly one `primary_domain`
- Secondary domains are optional (0–3)
- `innovation` as primary domain is a last resort — the LLM should first attempt all other domains
- Signals that genuinely span multiple domains (e.g., quantum + AI) get the more specific domain as primary, the other as secondary

### Signal types

| Type | Description | Primary mode |
|------|-------------|--------------|
| `paper` | Peer-reviewed or preprint academic publication | Research |
| `news` | Industry or general tech news article | Trends |
| `funding` | Investment round, grant, or public funding | Trends |
| `patent` | Patent application or granted patent | Trends |
| `launch` | New product, company, or service announcement | Trends |
| `release` | Significant software or hardware release | Trends |
| `lab_publication` | Research lab report, technical blog, or position paper | Research |

---

## Geolocation strategy

### Resolution hierarchy

For each signal, geolocation is attempted in priority order. The first successful resolution stops the chain.

**For research papers (arXiv, Semantic Scholar):**

```
1. Author affiliation string → ROR API lookup → institution coordinates [HIGH confidence]
2. Author affiliation string → city/country extraction via NER → Nominatim geocode [MEDIUM]
3. Corresponding author country (from Semantic Scholar metadata) → country centroid [LOW]
4. No location resolvable → confidence=NONE (excluded from map, included in trends)
```

ROR (Research Organization Registry) has ~107,000 institutions mapped to coordinates. It is the most reliable source for academic geolocation.

**For news and funding (RSS, Crunchbase):**

```
1. Company HQ from Crunchbase (if source is Crunchbase) → direct coordinates [HIGH]
2. Company name extracted from article → Crunchbase lookup → HQ coordinates [HIGH if match found]
3. Location mention in article text → NER → Nominatim geocode [MEDIUM]
4. Publication dateline (e.g., "SAN FRANCISCO") → Nominatim geocode [MEDIUM]
5. Source publication location (MIT Tech Review → Cambridge, MA) → [LOW — publication, not subject]
6. No location → confidence=NONE
```

**For patents (USPTO):**

```
1. First inventor address (USPTO records include state/country) → Nominatim geocode [MEDIUM-HIGH]
2. Assignee HQ → Crunchbase lookup [HIGH if found]
3. Country only → country centroid [LOW]
```

### Confidence tiers

| Tier | What it means | How used on the map |
|------|--------------|---------------------|
| `high` | City-level precision from authoritative source | Shown as precise dot |
| `medium` | City-level from NER + geocoding, ±50km | Shown as slightly larger dot with lower opacity |
| `low` | Country-level only | Shown at country centroid, visually de-emphasised |
| `none` | No location determined | Excluded from map, counted in trends and top 10 |

### Country centroid exceptions

Some country centroids are poor representatives (Russia spans 11 time zones; China's centroid is in an uninhabited region). Use capital city as the fallback for `low` confidence signals rather than the geographic centroid.

---

## Trend scoring model

Every signal receives a `final_score`:

```
final_score = base_score × source_weight × recency_factor × cluster_boost
```

### Base score

By signal type:

```python
def base_score(signal):
    match signal.signal_type:
        case "paper":
            # Citation count drives score; minimum floor of 1 to avoid 0-score new papers
            return math.log(max(signal.citation_count, 1) + 1) * 10 + 5

        case "funding":
            # Log scale prevents a $1B round from burying everything else
            # Amount in USD; minimum $100K floor
            amount = max(signal.amount_usd or 0, 100_000)
            return math.log10(amount / 100_000) * 8 + 3

        case "news":
            return 6  # Base, modified by source_weight

        case "patent":
            return 4  # Low base; boosted if cited by subsequent patents

        case "launch" | "release":
            return 7  # Product launches are significant by default

        case "lab_publication":
            return 5  # Technical blogs/reports from known labs
```

### Source weight

Each source has an assigned authority weight. Applied as a multiplier.

| Source / tier | Weight | Examples |
|--------------|--------|---------|
| Tier 1 | 2.0 | Nature, Science, arXiv (top-cited papers), IEEE, Crunchbase verified |
| Tier 2 | 1.5 | MIT Tech Review, IEEE Spectrum, Semantic Scholar (cited papers), DARPA releases |
| Tier 3 | 1.0 | TechCrunch, VentureBeat, Ars Technica, Wired |
| Tier 4 | 0.6 | Unknown RSS feeds, unverified launches, uncited new papers |

Papers start at Tier 4 and are promoted to Tier 1 as citations accumulate. A paper with 0 citations is a Tier 4 signal; a paper with 100+ influential citations is a Tier 1 signal. Citation counts are re-fetched weekly from Semantic Scholar.

### Recency factor

Exponential decay with a 7-day half-life:

```python
λ = 0.099  # math.log(2) / 7
recency_factor = math.exp(-λ * days_since_published)
```

At this decay rate:
- Same day: 1.00
- 3 days: 0.74
- 7 days: 0.50
- 14 days: 0.25
- 30 days: 0.05

Signals older than 60 days are archived. They remain in the database but are excluded from scoring and display.

### Cluster boost

When multiple independent signals describe the same technology phenomenon (not the same event — similar events), they reinforce each other. This captures "waves" — moments when a technology domain is suddenly receiving multiple independent signals.

```python
# Count signals in the same domain published within 7 days
def cluster_boost(signal, all_signals):
    same_domain_recent = count(
        s for s in all_signals
        if s.primary_domain == signal.primary_domain
        and abs((s.published_at - signal.published_at).days) <= 7
        and s.id != signal.id
    )
    return 1.0 + (0.08 * min(same_domain_recent, 10))
    # Maximum 80% boost, reached at 10+ corroborating signals
```

Cluster boost is recalculated every 6 hours as new signals arrive.

---

## Top 10 trends logic

The top 10 is generated every 6 hours by a dedicated pipeline step, not by simple score ranking. Direct ranking produces redundant results (10 articles about the same event).

### Step 1 — Candidate pool

Collect all signals from the last 30 days with `final_score > 3.0`. Exclude signals with `classification_confidence < 0.6`.

### Step 2 — Semantic deduplication

Group signals that are about the same event. Two signals are the same event if:
- They have the same `source_id` (exact duplicate) — already filtered at ingestion
- Their titles have >85% string similarity (Levenshtein ratio) — catches wire service duplicates
- **In full version:** their summaries have >0.85 cosine similarity after embedding — catches semantically identical stories from different sources

For MVP: string similarity only (no embeddings). Cluster members share their scores: the cluster's aggregate score = sum of member scores (corroborated events score higher than isolated ones).

Represent each cluster with its highest-scoring member as the canonical signal.

### Step 3 — Domain diversification

No more than 3 of the top 10 from the same primary domain. If a domain would dominate (e.g., AI has 8 of the top 10 candidates), take its top 3 by score and fill remaining slots from other domains.

**Diversification algorithm:**

```python
def select_top_10(ranked_clusters, max_per_domain=3):
    selected = []
    domain_counts = defaultdict(int)
    
    for cluster in ranked_clusters:
        domain = cluster.primary_domain
        if domain_counts[domain] < max_per_domain:
            selected.append(cluster)
            domain_counts[domain] += 1
        if len(selected) == 10:
            break
    
    return selected
```

### Step 4 — LLM synthesis

The 10 selected signals are passed to the LLM with their titles, summaries, domains, and scores. The LLM produces:
- A 1-sentence headline for the trend (not copied from any single source)
- A 2–3 sentence explanation of why this is significant
- A confidence level that this is a genuine trend vs. a single event

This step is where hallucination risk is highest. Mitigations are covered in the Risks section.

### Step 5 — Snapshot storage

The top 10 result is written to `top_trend_snapshots` as a JSON record. The previous snapshot is not deleted — it becomes the historical record. The UI always reads the most recent snapshot.

---

## Map hotspot logic

### H3 hexagonal grid

The world is divided using Uber's H3 hexagonal grid at resolution 4. Resolution 4 cells have an average area of ~1,770 km² — roughly the size of greater London or the San Francisco Bay Area. This gives city-level clustering without merging distinct cities.

Why hexagons over squares: hexagons have equal distances to all 6 neighbours (squares have unequal diagonal distances). This matters for geographic clustering.

H3 resolution reference:
- Resolution 3: ~12,300 km² (~country subdivisions)
- **Resolution 4: ~1,770 km² (city-region level) ← MVP**
- Resolution 5: ~252 km² (city district level)

### Hotspot aggregation (runs every 6 hours, same cadence as top 10)

```python
def build_hotspots(signals):
    # Only include signals with confidence=high or confidence=medium
    mappable = [s for s in signals if s.location_confidence in ('high', 'medium')]
    
    # Assign each signal to its H3 cell at resolution 4
    for signal in mappable:
        signal.h3_index = h3.geo_to_h3(signal.lat, signal.lng, resolution=4)
    
    # Group by H3 index
    cells = groupby(mappable, key=lambda s: s.h3_index)
    
    hotspots = []
    for h3_index, cell_signals in cells.items():
        hotspot = {
            'h3_index': h3_index,
            'centroid': h3.h3_to_geo(h3_index),  # lat, lng of cell center
            'total_score': sum(s.final_score for s in cell_signals),
            'signal_count': len(cell_signals),
            'dominant_domain': mode(s.primary_domain for s in cell_signals),
            'top_signals': sorted(cell_signals, key=lambda s: -s.final_score)[:5],
        }
        hotspots.append(hotspot)
    
    return sorted(hotspots, key=lambda h: -h['total_score'])
```

### Hotspot display on the map

Each hotspot renders as a circle:
- **Position:** H3 cell centroid
- **Radius:** `sqrt(total_score) × scale_factor` — square root prevents dominant hotspots from filling the map
- **Color:** HSL hue assigned per domain (see below), same saturation/lightness for all
- **Opacity:** 0.6 default, 1.0 on hover

**Domain colors:**

```
ai              — #4A90D9  (blue)
xr              — #7B68EE  (medium slate blue)
robotics        — #50C878  (emerald)
quantum         — #DA70D6  (orchid)
nano            — #FFB347  (pastel orange)
simulation      — #87CEEB  (sky blue)
edge            — #98FF98  (mint)
infrastructure  — #C0A060  (brass — echoes Centari's brand accent)
innovation      — #E9E5DF  (stone — Centari's text color)
```

When a hotspot contains signals from multiple domains, it takes the dominant domain's color. A secondary ring (thinner, inner) shows the second-most-common domain if the split is close (>30% for second domain).

### Hover state

On hovering a hotspot:

```
┌────────────────────────────────────────────┐
│  LONDON — UNITED KINGDOM                   │
│  34 signals · Dominant: AI                 │
│  ─────────────────────────────────────── │
│  • DeepMind releases Gemini 3 Ultra        │
│  • UK AI Safety Institute publishes...     │
│  • £50M Series B for robotics startup...   │
│  ─────────────────────────────────────── │
│  [See all 34 signals →]                    │
└────────────────────────────────────────────┘
```

### Map modes

The map renders differently by mode:

**Trends mode:** Shows all signal types. Hotspot sizing based on total score including funding, launches, patents, news.

**Research mode:** Shows papers and lab publications only. Hotspots reflect academic output density. Many hotspots shift toward university cities; commercial hubs become less dominant.

**Both:** Overlay — both layers visible simultaneously with reduced opacity on each.

---

## Update frequency

Different data has different freshness characteristics. Over-polling wastes API quota; under-polling makes the map stale.

| Source | Fetch cadence | Reasoning |
|--------|--------------|-----------|
| arXiv daily digest | 01:30 UTC daily | arXiv publishes at ~00:00 UTC; 90-min delay ensures publication is complete |
| Semantic Scholar citations | Weekly (Sunday 02:00 UTC) | Citation counts change slowly; weekly re-score is sufficient |
| Tech news RSS feeds | Every 2 hours | News cycle is fast; 2h latency is acceptable |
| Crunchbase funding | Daily (06:00 UTC) | Announcements cluster on business day mornings |
| USPTO patent feed | Weekly (Wednesday) | USPTO publishes on Tuesdays; Wednesday fetch is clean |
| ProductHunt | Daily (09:00 UTC) | Daily leaderboard |
| GitHub trending | Every 6 hours | GitHub trending refreshes ~4× per day |
| Hacker News | Every 4 hours | Pick up top stories in the 24h window |

**Derived outputs:**

| Output | Recalculation cadence |
|--------|-----------------------|
| Signal scores | Recalculated for all signals < 30 days old, every 6 hours |
| Hotspot clusters | Every 6 hours, after score recalculation |
| Top 10 trends | Every 6 hours, after hotspot recalculation |
| Source health records | After every fetch attempt |

**Staleness indicator:** The UI shows "Last updated [N] minutes ago" drawn from the most recent ingestion timestamp per mode. If no signals have been ingested in > 4 hours, a warning indicator appears.

---

## Database schema

```sql
-- Core signal table
CREATE TABLE signals (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingested_at              timestamptz NOT NULL DEFAULT now(),
  published_at             timestamptz NOT NULL,
  source                   text NOT NULL,        -- 'arxiv', 'techcrunch_rss', 'crunchbase', etc.
  source_id                text,                  -- Source's own identifier, for deduplication
  signal_type              text NOT NULL,         -- 'paper' | 'news' | 'funding' | 'patent' | 'launch' | 'release' | 'lab_publication'
  modes                    text[] NOT NULL,       -- ['trends'] | ['research'] | ['trends','research']
  title                    text NOT NULL,
  url                      text UNIQUE NOT NULL,
  summary                  text,                  -- LLM-generated, max 280 chars

  -- Classification
  primary_domain           text NOT NULL,
  secondary_domains        text[],
  tags                     text[],
  classification_confidence float4,
  flagged_for_review       boolean NOT NULL DEFAULT false,

  -- Geolocation
  location_label           text,                  -- Human-readable: "Cambridge, MA, US"
  lat                      float8,
  lng                      float8,
  h3_index_r4              text,                  -- H3 cell at resolution 4
  location_confidence      text,                  -- 'high' | 'medium' | 'low' | 'none'
  location_source          text,                  -- 'ror' | 'crunchbase' | 'ner_geocode' | 'country_centroid'

  -- Scoring
  base_score               float4,
  source_weight            float4,
  recency_factor           float4,
  cluster_boost            float4 DEFAULT 1.0,
  final_score              float4,
  score_updated_at         timestamptz,

  -- Extra fields (type-specific, stored as JSONB)
  extra                    jsonb,
  -- For papers: { citation_count, influential_citation_count, authors, institutions }
  -- For funding: { amount_usd, currency, stage, investors, company_hq_country }
  -- For patents: { assignee, inventor_country, patent_class }

  archived_at              timestamptz             -- Set when signal > 60 days old
);

CREATE INDEX signals_published_at    ON signals(published_at DESC);
CREATE INDEX signals_domain          ON signals(primary_domain);
CREATE INDEX signals_h3_r4           ON signals(h3_index_r4);
CREATE INDEX signals_final_score     ON signals(final_score DESC);
CREATE INDEX signals_archived        ON signals(archived_at) WHERE archived_at IS NULL;

-- Hotspot clusters (rebuilt every 6 hours)
CREATE TABLE hotspot_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at    timestamptz NOT NULL DEFAULT now(),
  mode            text NOT NULL,         -- 'trends' | 'research' | 'combined'
  hotspots        jsonb NOT NULL
  -- Array of hotspot objects:
  -- { h3_index, centroid: {lat,lng}, total_score, signal_count,
  --   dominant_domain, top_signal_ids: uuid[] }
);

-- Top 10 trend snapshots (rebuilt every 6 hours)
CREATE TABLE top_trend_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at    timestamptz NOT NULL DEFAULT now(),
  mode            text NOT NULL,
  items           jsonb NOT NULL
  -- Array of 10 objects:
  -- { rank, headline, explanation, primary_domain, score,
  --   signal_ids: uuid[], confidence: float }
);

-- Source health monitoring
CREATE TABLE source_health (
  source              text PRIMARY KEY,
  last_fetched_at     timestamptz,
  last_success_at     timestamptz,
  signals_24h         int DEFAULT 0,
  status              text DEFAULT 'unknown',  -- 'healthy' | 'degraded' | 'failing'
  error_message       text
);

-- Low-confidence signals awaiting review
CREATE TABLE classification_review_queue (
  id              uuid PRIMARY KEY REFERENCES signals(id),
  queued_at       timestamptz NOT NULL DEFAULT now(),
  reason          text,
  reviewed_at     timestamptz,
  reviewer_action text   -- 'approved' | 'corrected' | 'rejected'
);
```

---

## MVP architecture

The full system described above is complex. The MVP trades coverage for speed to live.

### What the MVP includes

| Component | MVP version | Full version |
|-----------|-------------|-------------|
| Data sources | arXiv + 5 RSS feeds + Semantic Scholar | All sources in this document |
| Classification | LLM (Claude), single-pass | LLM with confidence scoring + review queue |
| Geolocation | ROR for institutions + basic NER → Nominatim | Full hierarchy per signal type |
| Deduplication | URL dedup only | Semantic similarity clustering |
| Scoring | base_score × source_weight × recency_factor | Full formula including cluster_boost |
| Map output | Individual signal dots (no hotspot merging) | H3-clustered hotspots |
| Top 10 | LLM-generated, 6-hour cadence | Same, plus diversity constraints |
| Update cadence | arXiv daily + RSS every 4 hours | Per-source cadence table above |
| Map library | MapLibre GL JS + free tile source | Same |
| Infrastructure | Supabase (Postgres) + Vercel Edge/Next.js API routes | Same, eventually migrates to Hetzner |

### MVP data flow (simplified)

```
Cron: arXiv daily digest
  → Parse new papers in scope categories
  → LLM: classify domain + generate summary
  → ROR lookup: resolve institution → coordinates
  → Score: base × source_weight × recency
  → Store in signals table

Cron: RSS feeds every 4h
  → Fetch and parse feeds
  → Skip known URLs
  → LLM: classify domain + generate summary
  → NER: extract location strings → Nominatim geocode
  → Score
  → Store

Cron: every 6h
  → Recalculate recency factors for all active signals
  → Pull top 50 signals by score, last 30 days
  → LLM: generate top 10 trends list
  → Write top_trend_snapshots
```

### MVP tech stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Map rendering | MapLibre GL JS | Open source, no API key, compatible with free tile sources |
| Map tiles | Stadia Maps (free tier: 200K tiles/month) | Free, no vendor lock-in, can switch tile providers later |
| Database | Supabase (Postgres) | Same instance as Bring Your Problem if applicable; built-in dashboard |
| LLM (classification + top 10) | Claude API (claude-haiku-4-5 for classification, claude-sonnet-4-6 for top 10) | Haiku for high-volume/cheap classification; Sonnet for synthesis quality |
| Geocoding | Nominatim (OpenStreetMap) | Free, no API key, self-hostable |
| Institution lookup | ROR API | Free, authoritative, 107K institutions |
| Cron jobs | Vercel Cron (if on Vercel) or a simple cron process on Hetzner | Matches deployment target |
| RSS parsing | `rss-parser` (npm) | Lightweight, handles malformed feeds |

### MVP cost estimate (monthly)

| Item | Est. cost |
|------|-----------|
| Claude API (classification: ~2,000 signals/day × $0.0004/signal) | ~$24 |
| Claude API (top 10 generation: 4×/day × $0.02/call) | ~$2.50 |
| Supabase free tier | $0 |
| Stadia Maps free tier | $0 |
| Nominatim (self-hosted or public API with fair use) | $0 |
| ROR API | $0 |
| Vercel free tier (or Hetzner if self-hosted) | $0–$20 |
| **Total** | **~$30–50/month** |

---

## Risks

### Source quality

**Risk:** RSS feeds and open APIs include low-quality, promotional, and spam content. A product press release from a startup claiming to have "solved AI" scores identically to a genuine breakthrough.

**Mitigations:**
- Source whitelist with per-source authority tiers. Unknown sources are not added without review.
- Minimum `final_score` threshold for map display (signals below threshold are stored but invisible)
- LLM classification includes a `relevance_score` — signals classified as low-relevance are stored but not displayed even if their source tier is high
- Hacker News and GitHub trending act as secondary validation signals — a story that appears in multiple independent sources (our RSS feed AND HN) gets a cluster boost

---

### Hallucinations

**Risk:** LLM-generated summaries and top 10 trend explanations may contain invented facts. The LLM may confidently describe a paper as having "demonstrated X" when the paper merely proposes X. The LLM may generate a plausible-sounding institution name for a paper when the actual institution is unknown.

**Mitigations:**
- **For summaries:** The prompt explicitly instructs the model to summarise only what is stated in the title and abstract provided — it is not given external context and is instructed to flag uncertainty rather than fill gaps. Any claim not present in the source text must be marked with a hedging qualifier.
- **For top 10:** Each trend item is generated from specific signal IDs passed as context. The prompt prohibits extrapolation beyond the provided signals. Confidence field in the output (< 0.7 = trend item is not published, regenerated with more context or held for human review).
- **For geolocation:** LLM is not used for coordinate generation. Coordinates come from ROR, Crunchbase, or Nominatim (deterministic APIs). The LLM extracts location strings; the geocoding API converts them to coordinates. This removes the hallucination risk from the most consequential classification decision.
- **Review queue:** Low-confidence classifications are flagged, not displayed.
- **Do not display model-generated content as fact.** UI framing: "AI-identified trend" not "Centari reports that..." The epistemic status of every output is clear.

---

### Copyright

**Risk:** Displaying article summaries or excerpts from paywalled publications may implicate copyright. Even LLM-generated summaries of copyrighted articles are in a legally ambiguous zone.

**Mitigations:**
- **For paywalled sources:** Store title, URL, publication date, and source only. Do not store full text. Display title and source in the UI, with an outbound link to the original. This is identical to an RSS reader or search engine snippet — clearly established fair use.
- **For open-access sources (arXiv, PubMed):** Full abstract may be stored and displayed. arXiv's terms permit this. Always attribute to original source with link.
- **LLM summaries:** The generated summary is based on the abstract or title (already public information). The summary is not a reproduction — it is a transformation. This is the stronger legal position. Avoid LLM summaries of paywalled content where the input to the LLM would require accessing the paywalled text.
- **RSS content:** RSS feeds are published by the source expressly for consumption by aggregators. Displaying the RSS description field (typically 1–2 sentences) is within normal usage.
- **Do not display news article body text under any circumstances.**

---

### Spam and gaming

**Risk:** arXiv has light moderation. Bad actors could publish junk papers in relevant categories to appear on the map. For commercial signals, a company could generate many small press releases to inflate their presence.

**Mitigations:**
- arXiv papers start at Tier 4 (lowest source weight) and only gain score through citations. A zero-citation junk paper will have a very low final score and will not reach the map display threshold.
- Minimum time filter: papers published less than 24 hours ago are shown as "new" but scored conservatively until citation data is available.
- Funding signals from Crunchbase require verified data — Crunchbase's verification process is a proxy filter.
- For news: source whitelist limits the attack surface. A company cannot inflate its signal by publishing to an unknown site.
- Rate limiting on ingestion: more than N signals from the same organisation in a 7-day window triggers a quality flag.

---

### API reliability and rate limits

**Risk:** Upstream APIs fail, change, or impose stricter rate limits. A silent ingestion failure leaves the map showing stale data without the user knowing.

**Mitigations:**
- `source_health` table tracks every source's last success, failure, and 24-hour signal count
- UI staleness indicator shows "Last updated N hours ago"
- Alert threshold: if any Tier 1 or Tier 2 source has not produced new signals in > 6 hours, an internal alert fires
- All ingestion failures log to `source_health.error_message`
- Design for graceful degradation: each source's pipeline is independent; one source failing does not break others

---

## Future agent architecture

The MVP pipeline is a sequential set of scripts. As data volume and complexity increase, it should evolve toward a multi-agent system.

### Agent roles

**Source Monitor Agents (one per source category)**  
Continuously polls assigned sources on their schedules. Responsible for rate limit management, retry logic with exponential backoff, source health reporting, and deduplication at the point of ingestion. Emits `new_signal_raw` events to the message queue.

**Classification Agent**  
Consumes `new_signal_raw` events. Classifies domain, type, mode, extracts entities, generates summary. Uses structured output format with confidence scoring. Emits `signal_classified` events. Sends low-confidence signals to `signal_review_queue`.

**Geolocation Agent**  
Consumes `signal_classified` events. Has tool access to ROR API, Crunchbase, and Nominatim. Attempts geolocation in priority order. Assigns confidence tier. Emits `signal_geolocated` events.

**Scoring Agent**  
Consumes `signal_geolocated` events. Computes base score, source weight, and initial recency factor. Records to the signals table. Runs as a periodic batch (every 6 hours) to recompute recency factors across all active signals.

**Deduplication Agent**  
Runs periodically (every 6 hours). Finds semantic duplicates among recently ingested signals using embedding similarity. Merges duplicates into clusters. Updates `cluster_boost` for all members of a cluster.

**Trend Analysis Agent**  
Runs every 6 hours after scoring and deduplication. Selects candidate signals, applies domain diversification, generates the top 10 trend summaries. Has read-only access to the signals database. Writes to `top_trend_snapshots`.

**Quality Review Agent**  
Reviews low-confidence signals from the `classification_review_queue`. In early phase: surfaces these signals for human review via an admin interface. In a later phase: re-attempts classification with more context or additional tool calls.

**Summary Agent** (Phase 2)  
For signals that are about to appear in the top 10, generates a richer explanation with appropriate hedging. A separate agent from Trend Analysis, specialised for output quality and epistemic conservatism.

### Message queue model

```
Source Monitor  ──► [new_signal_raw queue]
                          │
                          ▼
Classification Agent ──► [signal_classified queue]
                          │
                          ▼
Geolocation Agent ───► [signal_geolocated queue]
                          │
                          ▼
                     Signals table
                          │
                    (every 6 hours)
                          ▼
Deduplication Agent ─► Cluster boost update
                          │
                          ▼
Scoring Agent ──────► Score recalculation
                          │
                          ▼
Trend Analysis Agent ─► top_trend_snapshots
```

**Orchestration options for the full version:**
- Inngest (hosted durable execution, works with Next.js)
- Temporal (self-hosted, more complex, better for long-running workflows)
- Simple cron + database-backed job queue (sufficient for MVP and early growth)

**MVP uses:** Simple cron jobs. The agent architecture is the target state, not the starting point.

### What agents enable beyond the MVP

- **Parallel source processing:** agents process sources concurrently; the bottleneck is no longer sequential ingestion
- **Adaptive retry:** agents with memory can detect source degradation patterns and adjust polling frequency without hardcoded logic
- **Cross-agent learning:** the Deduplication Agent can feed back into classification (if two signals are consistently co-classified as duplicates but given different domains, classification quality has a gap)
- **Human-in-the-loop for top 10:** the Quality Review Agent can hold a top 10 candidate for human approval before it publishes — the system surfaces "this trend item scored above threshold but contains a claim I'm not confident about"
- **Proactive monitoring:** agents that notice a domain is generating unusually high signal volume can trigger an alert ("possible major development in quantum this week — 23 signals in 48 hours, 4× baseline")

---

## Open questions before implementation

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | What URL does the map live at? | `/research`, `/map`, `/signal-map` | `/research` — matches the section name |
| 2 | Is the map a public-facing page or a Centari-only internal tool? | Public (drives brand + credibility) vs. internal (research intelligence for team) | Design for public-facing; internal is a subset |
| 3 | What map tile provider for MVP? | Stadia Maps, MapTiler, OpenStreetMap | Stadia Maps free tier — clean base map, no attribution requirements for low volume |
| 4 | Does the map have a Trends/Research toggle, or are they separate pages? | Toggle on single page vs. two distinct URLs | Toggle — same page, same map, filter changes the data layer |
| 5 | How is the Supabase instance provisioned — shared with Bring Your Problem or separate? | Shared project vs. separate project | Separate — different data domain, different retention policies |
| 6 | Should the top 10 be shown publicly or only internally? | Public (demonstrates intelligence capability) vs. internal | Public — it is a strong demonstration of what Centari is tracking |
| 7 | What is the retention window for signals? | 30 days, 60 days, 90 days | 60 days active (visible on map); 2 years archived (for trend analysis) |

---

*This document covers architecture and planning only. Implementation sprints for the MVP pipeline and map frontend are separate.*

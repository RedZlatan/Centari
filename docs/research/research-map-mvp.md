# Research Signal Map — MVP Plan

**Type:** Implementation specification — buildable  
**Sprint:** R2  
**Depends on:** `docs/research/research-map-architecture.md`

---

## What the MVP is

A public-facing page at `/research` showing a curated set of 50–100 technology signals on a world map, with a top 10 trends sidebar. Data is seeded manually. No crawler, no LLM pipeline, no ingestion automation.

The MVP proves the concept and gets a live artifact in front of users. The pipeline described in R1 is the V2 target. This is V1.

**What makes it real:**
- Every signal links to a live source
- Every location is manually verified
- The top 10 is editorially accurate, not algorithmically noisy

---

## Explicit scope boundary

### In scope

- `/research` page with interactive world map
- Signal dots on the map, colored by technology domain
- Mode toggle: Trends / Research
- Domain filter: chip-based, multi-select
- Hover tooltip per signal dot
- Click-to-open signal detail panel with source link
- Top 10 trends sidebar (manually curated, one list per mode)
- Trend → map cross-highlight (hover a trend item, corresponding dots highlight)
- Static JSON data files (signals + top trends) committed to the repo
- Loading state, empty state (when filters return nothing), error state
- Responsive layout (desktop map + sidebar / mobile map stacked above list)
- "Data current as of [date]" staleness label driven by a field in the data file

### Out of scope for MVP

- No automated ingestion (no crawlers, no scheduled jobs, no RSS polling)
- No LLM classification (all fields manually filled by curator)
- No automated scoring (curator assigns score manually)
- No automated geolocation (curator verifies coordinates manually)
- No user submission form
- No admin UI — curation is done by editing the JSON data file directly
- No full-text search
- No pagination (50–100 signals fit in a single data file and a single GL layer)
- No H3 hotspot clustering (dots at individual signal locations)
- No heatmap layer
- No historical time-travel or date range filtering
- No authentication or access control
- No WebSocket or polling — page is built from static data, refreshed on deploy
- No signal detail page at its own URL (panel opens inline)

---

## Data schema

### TypeScript types

Location: `src/lib/signals.ts`

```typescript
export type Domain =
  | 'ai'
  | 'xr'
  | 'robotics'
  | 'quantum'
  | 'nano'
  | 'simulation'
  | 'edge'
  | 'infrastructure'
  | 'innovation';

export type SignalType =
  | 'paper'
  | 'news'
  | 'funding'
  | 'patent'
  | 'launch'
  | 'release'
  | 'lab_publication';

export type Mode = 'trends' | 'research';
export type LocationConfidence = 'high' | 'medium' | 'low';
export type SourceTier = 1 | 2 | 3;

export interface Signal {
  id: string;                        // kebab-case slug, globally unique
  published_at: string;              // ISO 8601 date: "2026-05-23"
  ingested_at: string;               // date added to the dataset

  title: string;                     // verbatim headline or paper title
  summary: string;                   // 1–3 sentences, hand-written
  url: string;                       // source link — required, must be live

  primary_domain: Domain;
  secondary_domains: Domain[];       // may be empty
  signal_type: SignalType;
  modes: Mode[];                     // which toggle(s) show this signal
  tags: string[];                    // kebab-case, 0–5

  location_label: string;            // "Cambridge, MA, US"
  lat: number;
  lng: number;
  location_confidence: LocationConfidence;

  curator_score: number;             // 1–10, see scoring guide below
  source_name: string;               // display name: "arXiv", "Nature", "TechCrunch"
  source_tier: SourceTier;
}

export interface TrendItem {
  rank: number;                      // 1–10
  headline: string;                  // short trend name, ≤ 60 chars
  explanation: string;               // 2–3 sentences, hand-written
  primary_domain: Domain;
  mode: Mode | 'both';
  signal_ids: string[];              // IDs of signals that support this trend
}

export interface TopTrendsData {
  updated_at: string;                // ISO date when this was last reviewed
  trends: TrendItem[];               // top 10 for Trends mode
  research: TrendItem[];             // top 10 for Research mode
}

export interface SignalDataset {
  updated_at: string;                // ISO date when signals were last updated
  signals: Signal[];
}
```

### Curator score guide

| Score | Meaning | Examples |
|-------|---------|---------|
| 9–10 | Landmark event | Major lab product launch, >$100M funding in novel domain, breakthrough paper with rapid citation |
| 7–8 | Significant development | Notable product, meaningful funding, well-cited paper from top institution |
| 5–6 | Solid signal | Relevant news, interesting paper, small-to-mid funding |
| 3–4 | Background signal | Minor release, incremental paper, small company news |
| 1–2 | Weak signal | Borderline relevance, minimal impact — include only if domain coverage requires it |

**Map display threshold:** Only signals with `curator_score >= 4` are rendered on the map. Lower-scored signals are stored in the dataset but invisible. This prevents the map being crowded with noise once data grows past 50 signals.

---

## File structure

```
src/
  data/
    signals.json          — all signals (Signal[])
    top-trends.json       — curated top 10 per mode (TopTrendsData)
  lib/
    signals.ts            — types + data access functions
  app/
    research/
      page.tsx            — the map page (Server Component wrapper)
  components/
    research/
      ResearchMap.tsx     — "use client", MapLibre map
      SignalLayer.tsx     — GeoJSON source + circle layer logic
      SignalTooltip.tsx   — hover tooltip markup
      SignalPanel.tsx     — click-to-open detail panel
      TopTrendsSidebar.tsx — top 10 list
      TrendItem.tsx       — individual trend row
      ModeToggle.tsx      — Trends / Research toggle
      DomainFilter.tsx    — domain filter chip group
      SignalMapPage.tsx   — "use client" orchestrator, holds shared state
```

`page.tsx` is a Server Component that imports data and renders `<SignalMapPage>` with data passed as props. All map interactivity is in the client component subtree.

### Data access functions (`src/lib/signals.ts`)

```typescript
import signalData from '@/data/signals.json';
import trendsData from '@/data/top-trends.json';

export function getAllSignals(): Signal[] {
  return (signalData as SignalDataset).signals;
}

export function getDisplaySignals(): Signal[] {
  return getAllSignals().filter(s => s.curator_score >= 4);
}

export function getSignalsByMode(mode: Mode): Signal[] {
  return getDisplaySignals().filter(s => s.modes.includes(mode));
}

export function getSignalsByDomain(domain: Domain): Signal[] {
  return getDisplaySignals().filter(s => s.primary_domain === domain);
}

export function getSignalById(id: string): Signal | undefined {
  return getAllSignals().find(s => s.id === id);
}

export function getTopTrends(): TopTrendsData {
  return trendsData as TopTrendsData;
}

export function getDatasetUpdatedAt(): string {
  return (signalData as SignalDataset).updated_at;
}
```

---

## Sample JSON dataset

### `src/data/signals.json`

```json
{
  "updated_at": "2026-06-11",
  "signals": [
    {
      "id": "google-deepmind-veo3-launch-2026-05",
      "published_at": "2026-05-20",
      "ingested_at": "2026-06-01",
      "title": "Google DeepMind releases Veo 3 with native audio and speech synthesis",
      "summary": "Veo 3 generates synchronised audio, ambient sound, and speech directly alongside video, advancing AI toward fully multimodal media generation. Released via Google Vertex AI and integrated into Gemini products.",
      "url": "https://deepmind.google/models/veo/",
      "primary_domain": "ai",
      "secondary_domains": [],
      "signal_type": "launch",
      "modes": ["trends"],
      "tags": ["generative-ai", "multimodal", "video-synthesis"],
      "location_label": "London, UK",
      "lat": 51.5074,
      "lng": -0.1278,
      "location_confidence": "high",
      "curator_score": 9,
      "source_name": "Google DeepMind",
      "source_tier": 1
    },
    {
      "id": "pi-zero2-robot-foundation-model-2025-11",
      "published_at": "2025-11-03",
      "ingested_at": "2026-06-01",
      "title": "Physical Intelligence publishes π0.2: a generalist robot policy for dexterous manipulation",
      "summary": "Physical Intelligence's π0.2 demonstrates a single robot policy transferring across manipulation tasks — folding laundry, making coffee, assembling objects — with minimal per-task fine-tuning. The approach uses flow matching over diffusion policies.",
      "url": "https://www.physicalintelligence.company/blog/pi0",
      "primary_domain": "robotics",
      "secondary_domains": ["ai"],
      "signal_type": "lab_publication",
      "modes": ["trends", "research"],
      "tags": ["robot-policy", "foundation-model", "manipulation", "dexterous"],
      "location_label": "San Francisco, CA, US",
      "lat": 37.7749,
      "lng": -122.4194,
      "location_confidence": "high",
      "curator_score": 9,
      "source_name": "Physical Intelligence",
      "source_tier": 1
    },
    {
      "id": "microsoft-topological-qubit-2025-02",
      "published_at": "2025-02-19",
      "ingested_at": "2026-06-01",
      "title": "Microsoft demonstrates topological qubit with Majorana 1 chip",
      "summary": "Microsoft's Majorana 1 chip demonstrates a topological qubit architecture based on topoconductor materials, claiming error rates orders of magnitude lower than conventional superconducting qubits. Published in Nature with independent verification.",
      "url": "https://azure.microsoft.com/en-us/blog/quantum/2025/02/19/microsoft-unveils-majorana-1/",
      "primary_domain": "quantum",
      "secondary_domains": [],
      "signal_type": "lab_publication",
      "modes": ["trends", "research"],
      "tags": ["topological-qubit", "majorana", "quantum-hardware", "error-correction"],
      "location_label": "Redmond, WA, US",
      "lat": 47.6740,
      "lng": -122.1215,
      "location_confidence": "high",
      "curator_score": 10,
      "source_name": "Nature / Microsoft",
      "source_tier": 1
    },
    {
      "id": "meta-aria-research-glasses-2025-09",
      "published_at": "2025-09-25",
      "ingested_at": "2026-06-01",
      "title": "Meta releases ARIA Gen 2 research glasses with on-device spatial AI",
      "summary": "The second generation of Meta's ARIA research platform adds on-device neural inference, eye-tracking at 200Hz, and an updated spatial audio array. Made available to academic research partners through an expanded programme.",
      "url": "https://about.meta.com/realitylabs/aria/",
      "primary_domain": "xr",
      "secondary_domains": ["ai", "edge"],
      "signal_type": "release",
      "modes": ["trends", "research"],
      "tags": ["ar-glasses", "spatial-ai", "edge-inference", "research-platform"],
      "location_label": "Menlo Park, CA, US",
      "lat": 37.4529,
      "lng": -122.1817,
      "location_confidence": "high",
      "curator_score": 8,
      "source_name": "Meta Reality Labs",
      "source_tier": 1
    },
    {
      "id": "eth-zurich-neuromorphic-chip-2025-10",
      "published_at": "2025-10-14",
      "ingested_at": "2026-06-01",
      "title": "ETH Zurich demonstrates sub-milliwatt spiking neural network chip for sensor fusion",
      "summary": "Researchers at ETH Zurich's Institute of Neuroinformatics demonstrate a neuromorphic chip running a spiking neural network for multi-sensor fusion at 0.8mW, suitable for always-on edge inference in wearable and implantable devices.",
      "url": "https://www.ini.uzh.ch/",
      "primary_domain": "edge",
      "secondary_domains": ["ai", "nano"],
      "signal_type": "paper",
      "modes": ["research"],
      "tags": ["neuromorphic", "spiking-neural-network", "ultra-low-power", "sensor-fusion"],
      "location_label": "Zurich, Switzerland",
      "lat": 47.3769,
      "lng": 8.5417,
      "location_confidence": "high",
      "curator_score": 7,
      "source_name": "ETH Zurich / arXiv",
      "source_tier": 1
    },
    {
      "id": "figure-ai-series-b-2025-02",
      "published_at": "2025-02-29",
      "ingested_at": "2026-06-01",
      "title": "Figure AI raises $675M Series B led by Microsoft, NVIDIA, and OpenAI",
      "summary": "Humanoid robotics company Figure AI closes a $675M Series B at a $2.6B valuation, with participation from Microsoft, NVIDIA, OpenAI, Amazon, and Intel. The round accelerates deployment of Figure 02 in commercial manufacturing environments.",
      "url": "https://techcrunch.com/2024/02/29/figure-raises-675m-from-microsoft-nvidia-others-at-2-6b-valuation/",
      "primary_domain": "robotics",
      "secondary_domains": ["ai"],
      "signal_type": "funding",
      "modes": ["trends"],
      "tags": ["humanoid-robotics", "series-b", "manufacturing"],
      "location_label": "Sunnyvale, CA, US",
      "lat": 37.3688,
      "lng": -122.0363,
      "location_confidence": "high",
      "curator_score": 9,
      "source_name": "TechCrunch",
      "source_tier": 3
    },
    {
      "id": "attention-free-ssm-mamba-2-arxiv-2025-05",
      "published_at": "2025-05-12",
      "ingested_at": "2026-06-01",
      "title": "Mamba-2: Structured state space models for long-sequence modelling at transformer parity",
      "summary": "This paper introduces a class of structured state space models achieving competitive performance to transformers on language tasks while scaling linearly with sequence length. Demonstrates particular advantages for sequences exceeding 64K tokens.",
      "url": "https://arxiv.org/abs/2405.21060",
      "primary_domain": "ai",
      "secondary_domains": [],
      "signal_type": "paper",
      "modes": ["research"],
      "tags": ["state-space-model", "long-context", "sequence-modelling", "efficiency"],
      "location_label": "Pittsburgh, PA, US",
      "lat": 40.4406,
      "lng": -79.9959,
      "location_confidence": "high",
      "curator_score": 8,
      "source_name": "arXiv",
      "source_tier": 1
    }
  ]
}
```

### `src/data/top-trends.json`

```json
{
  "updated_at": "2026-06-11",
  "trends": [
    {
      "rank": 1,
      "headline": "Humanoid robotics enters commercial deployment",
      "explanation": "Multiple humanoid robot companies closed large funding rounds and signed first commercial contracts with manufacturers in the past six months. The shift from demonstration to deployment defines this period. Figure, 1X, Apptronik, and Agility Robotics all announced production commitments.",
      "primary_domain": "robotics",
      "mode": "trends",
      "signal_ids": [
        "figure-ai-series-b-2025-02",
        "pi-zero2-robot-foundation-model-2025-11"
      ]
    },
    {
      "rank": 2,
      "headline": "Multimodal AI generation reaches production quality",
      "explanation": "Text-to-video, text-to-audio, and synchronised multimodal generation shipped from major labs as production products, not research previews. The gap between generated and captured media narrowed substantially in a single quarter.",
      "primary_domain": "ai",
      "mode": "trends",
      "signal_ids": [
        "google-deepmind-veo3-launch-2026-05"
      ]
    }
  ],
  "research": [
    {
      "rank": 1,
      "headline": "Generalist robot policies show cross-task transfer",
      "explanation": "Foundation model approaches to robot control are producing policies that transfer across manipulation tasks with minimal fine-tuning. Work from Physical Intelligence and concurrent papers from Stanford and CMU converge on flow matching and diffusion-based action generation as the dominant framework.",
      "primary_domain": "robotics",
      "mode": "research",
      "signal_ids": [
        "pi-zero2-robot-foundation-model-2025-11"
      ]
    },
    {
      "rank": 2,
      "headline": "Sub-quadratic sequence models challenge transformer dominance",
      "explanation": "A wave of papers on structured state space models, linear attention variants, and hybrid architectures demonstrates competitive performance with transformers at a fraction of the computational cost for long sequences. The research direction is consolidating around 2–3 dominant model families.",
      "primary_domain": "ai",
      "mode": "research",
      "signal_ids": [
        "attention-free-ssm-mamba-2-arxiv-2025-05"
      ]
    }
  ]
}
```

---

## Domain configuration

Location: `src/lib/signals.ts` (append to the file)

```typescript
export const DOMAIN_COLORS: Record<Domain, string> = {
  ai:             '#4A90D9',   // blue
  xr:             '#7B68EE',   // medium slate blue
  robotics:       '#50C878',   // emerald
  quantum:        '#DA70D6',   // orchid
  nano:           '#FFB347',   // pastel orange
  simulation:     '#87CEEB',   // sky blue
  edge:           '#98FF98',   // mint
  infrastructure: '#A88A5A',   // brass — echoes Centari accent colour
  innovation:     '#E9E5DF',   // stone — Centari text colour
};

export const DOMAIN_LABELS: Record<Domain, string> = {
  ai:             'AI & Machine Learning',
  xr:             'XR & Spatial Computing',
  robotics:       'Robotics',
  quantum:        'Quantum',
  nano:           'Nano & Materials',
  simulation:     'Simulation',
  edge:           'Edge & Embedded',
  infrastructure: 'Infrastructure',
  innovation:     'Innovation',
};

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  paper:           'Paper',
  news:            'News',
  funding:         'Funding',
  patent:          'Patent',
  launch:          'Launch',
  release:         'Release',
  lab_publication: 'Lab publication',
};

export const ALL_DOMAINS: Domain[] = [
  'ai', 'xr', 'robotics', 'quantum', 'nano',
  'simulation', 'edge', 'infrastructure', 'innovation',
];
```

---

## Page layout

### Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────────────────┐
│  HEADER  (72px, existing)                                              │
├──────────────────────────────────────────────────┬─────────────────────┤
│                                                  │                     │
│  MAP  (calc(100vh - 72px), fills remaining)      │  SIDEBAR  (320px)   │
│                                                  │  position: sticky   │
│  ┌─────────────────────────────────────────┐    │                     │
│  │ [Trends]  [Research]                    │    │  [Trends] [Research]│
│  └─────────────────────────────────────────┘    │  ─────────────────  │
│  ┌─────────────────────────────────────────┐    │  01 · [●] AI        │
│  │ [AI] [XR] [Robotics] [Quantum] [Nano]   │    │  Multimodal AI...   │
│  │ [Sim] [Edge] [Infra] [Innovation]       │    │                     │
│  └─────────────────────────────────────────┘    │  02 · [●] Robotics  │
│                                                  │  Humanoid robots... │
│  [ world map — MapLibre GL ]                     │                     │
│                                                  │  ...                │
│                                                  │                     │
│                                                  │  ─────────────────  │
│  Data current as of 11 Jun 2026                  │  [N signals shown]  │
└──────────────────────────────────────────────────┴─────────────────────┘
```

Constraints:
- Map takes `width: 100%; height: 100%` inside its container
- Sidebar is `position: sticky; top: 72px; height: calc(100vh - 72px); overflow-y: auto`
- Mode toggle and domain filter are overlaid on the map (position: absolute, top-left)
- Staleness label is overlaid on the map (position: absolute, bottom-left)
- No page scroll — the map and sidebar each scroll independently

### Mobile (< 640px)

```
┌──────────────────────────────────────┐
│  HEADER  (72px)                      │
├──────────────────────────────────────┤
│  [Trends]  [Research]  (sticky)      │
├──────────────────────────────────────┤
│                                      │
│  MAP  (60vh)                         │
│                                      │
│  [AI] [XR] [Robotics] ...            │
│  (horizontally scrollable chips)     │
│                                      │
├──────────────────────────────────────┤
│                                      │
│  TOP 10 LIST  (scrollable)           │
│  01 · Multimodal AI...               │
│  02 · Humanoid robots...             │
│  ...                                 │
│                                      │
│  Data current as of 11 Jun 2026      │
└──────────────────────────────────────┘
```

On mobile, the mode toggle sits between the header and the map and is sticky. Domain filters are horizontal scroll chips below the map. Top 10 list is below.

### Signal detail — desktop (slide-in panel)

```
┌────────────────────────────────────────────────────────────────────────┐
│  MAP (dimmed 40% overlay)            │  DETAIL PANEL  (400px)          │
│                                      │  (slides in from right)         │
│                                      ├─────────────────────────────────┤
│                                      │  ← All signals         [✕]      │
│                                      │                                  │
│                                      │  ● AI & Machine Learning         │
│                                      │  LAUNCH  ·  May 20, 2026        │
│                                      │                                  │
│                                      │  Google DeepMind releases Veo 3  │
│                                      │  with native audio synthesis     │
│                                      │                                  │
│                                      │  Veo 3 generates synchronised   │
│                                      │  audio, ambient sound, and      │
│                                      │  speech alongside video...       │
│                                      │                                  │
│                                      │  📍 London, UK                  │
│                                      │  Source: Google DeepMind        │
│                                      │                                  │
│                                      │  [View source ↗]                │
│                                      │                                  │
│                                      │  ──────────────────────────     │
│                                      │  generative-ai  ·  multimodal   │
└──────────────────────────────────────┴─────────────────────────────────┘
```

### Signal detail — mobile (bottom sheet)

Bottom sheet slides up from bottom, covering ~70% of the screen. Map remains visible at the top. Dismisses on drag-down or tap-outside.

---

## UI states

### Map states

| State | What triggers it | What shows |
|-------|-----------------|------------|
| **Loading** | Initial page load, map tiles not yet loaded | Skeleton: dark rectangle with a subtle pulse, no dots |
| **Populated — default** | Data loaded, no filters active | All `curator_score >= 4` signals as colored dots |
| **Mode filtered** | User selects Trends or Research toggle | Only signals with matching mode shown; dot count updates |
| **Domain filtered** | User selects/deselects domain chips | Only matching primary domains shown; non-matching dots fade (opacity 0.15), not removed |
| **Signal hovered** | Mouse enters a dot | Tooltip appears, dot scales up (1.4×), cursor: pointer |
| **Signal selected** | Click on a dot | Detail panel opens, dot gets white outline ring |
| **Trend highlighted** | Hover on a trend item in sidebar | Supporting signal dots pulse (scale animation) and brighten |
| **Empty (filtered)** | Active filters return 0 signals | Map shows no dots + inline message: "No signals match the current filters." |
| **Error** | Data file fails to load | Centered message: "Signal data could not be loaded." with a retry link |

### Dot visual spec

```
Default:
  radius: 6px
  fill: DOMAIN_COLORS[primary_domain]
  fill-opacity: 0.85
  stroke: none

Hovered:
  radius: 8px (transition 150ms)
  fill-opacity: 1.0

Selected:
  radius: 8px
  fill-opacity: 1.0
  stroke: #E9E5DF (Stone)
  stroke-width: 2px

Dimmed (filtered out):
  fill-opacity: 0.15

Trend highlighted:
  radius: 10px (pulse animation: keyframe 6px → 10px → 6px, 1.2s, 2 iterations)
  fill-opacity: 1.0
  stroke: #E9E5DF
  stroke-width: 1.5px
```

Dots use MapLibre's `circle` layer type via GeoJSON source. Properties for filtering and styling are stored as feature properties in the GeoJSON.

### Signal hover tooltip

Appears as an absolute-positioned element anchored to the dot (not MapLibre popup — custom React component for full style control).

```
┌──────────────────────────────────────────────────┐
│  ● AI  ·  LAUNCH                                 │
│  Google DeepMind releases Veo 3 with             │
│  native audio synthesis                          │
│                                                  │
│  London, UK  ·  May 2026                        │
│  Google DeepMind                                 │
└──────────────────────────────────────────────────┘
```

Styling: background `var(--color-surface)`, border `1px solid var(--color-border)`, font `var(--font-sans)`. Max width 280px. No arrow/caret.

### Top 10 sidebar item

```
┌──────────────────────────────────────────┐
│  01                    ● AI              │
│                                          │
│  Multimodal AI generation                │
│  reaches production quality             │
│                                          │
│  Text-to-video, text-to-audio, and      │
│  synchronised multimodal generation     │
│  shipped from major labs...             │
│                                          │
│  1 signal                               │
└──────────────────────────────────────────┘
```

- Rank number in `var(--font-mono)`, large, muted
- Domain dot (colored circle) + domain label aligned right of rank
- Headline in `var(--font-sans)`, Stone, medium weight
- Explanation truncated at 3 lines (CSS `-webkit-line-clamp: 3`), expands on hover
- Signal count in muted text
- On hover: subtle background to `var(--color-pine)`, corresponding map dots highlight

### Empty state

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                    No signals match the current                      │
│                    filters.                                          │
│                                                                      │
│                    [Clear filters]                                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

Centered in the map area. "Clear filters" resets mode to both and domain filter to all.

---

## Tech choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Map library | **MapLibre GL JS** | Open source, no API key, fork of Mapbox GL JS |
| Map tiles | **MapTiler** (free tier, 100K loads/month) | Best dark styles compatible with Centari's palette; `dataviz-dark` style. API key required but free. |
| Tile fallback | **OpenFreeMap** | Zero cost, no key, dark style; use if MapTiler quota is hit |
| Data access | **Static JSON import** at build time | No API route, no database round-trip; sufficient for 50–100 signals |
| State management | React `useState` in `SignalMapPage` | No external state library needed for MVP complexity |
| MapLibre in Next.js | `dynamic(() => import('./ResearchMap'), { ssr: false })` | MapLibre is browser-only; SSR would throw |
| GeoJSON signal layer | `maplibre.addSource('signals', { type: 'geojson', ... })` | Single GL layer, performant for 100 points |
| Tooltip | Custom React portal, positioned via MapLibre `project()` | Full style control; MapLibre popups are harder to style |

**MapTiler tile URL pattern:**
```
https://api.maptiler.com/maps/dataviz-dark/style.json?key=MAPTILER_KEY
```

Store `MAPTILER_KEY` in `.env.local` as `NEXT_PUBLIC_MAPTILER_KEY` (public — it's a read-only map tile key).

---

## Quality gates

Every signal in `signals.json` must pass all of the following before being committed.

### Signal acceptance checklist

```
CONTENT
[ ] Source URL is live and returns a valid page (not a 404, paywall, or redirect loop)
[ ] Source is a primary source — the originating lab, publication, or company
    (not a summary or newsletter referencing the primary source)
[ ] Published within the last 90 days OR historically significant and explicitly labelled
[ ] Title matches or closely paraphrases the actual headline — not rewritten for effect
[ ] Summary contains no claims absent from the source
[ ] Summary is 1–3 sentences, plain language, no jargon inflation
[ ] Curator score reflects the signal's actual significance (see scoring guide)

CLASSIFICATION
[ ] primary_domain is the most accurate single domain
[ ] signal_type matches the actual nature of the signal (paper ≠ news ≠ launch)
[ ] modes[] accurately reflects which toggle should show this signal
[ ] tags are kebab-case and factually accurate

GEOLOCATION
[ ] location_label is a real place at city level or better
[ ] lat/lng verified against Google Maps or OpenStreetMap — not guessed
[ ] location_confidence reflects how the location was determined:
      high   = official company HQ or institution from a trusted registry
      medium = city mentioned in article or extracted from affiliation string
      low    = country only, or approximate region

UNIQUENESS
[ ] No existing signal in the dataset covers the same event from the same source
[ ] If two sources cover the same event, only one is included (choose the primary source)

FORMAT
[ ] id is globally unique, kebab-case, format: {slug}-{YYYY-MM}
[ ] published_at and ingested_at are valid ISO 8601 date strings (YYYY-MM-DD)
[ ] lat/lng are numbers (not strings)
[ ] curator_score is an integer 1–10
[ ] source_tier is 1, 2, or 3
```

### Top trends checklist

```
[ ] headline is ≤ 60 characters
[ ] explanation is 2–3 sentences
[ ] all signal_ids in the item exist in signals.json
[ ] the trend describes a pattern or movement, not a single event
[ ] updated_at is current (top trends should be reviewed when new signals are added)
```

---

## Curation flow

How a signal goes from discovery to live. No admin UI — curation is done by editing the JSON directly.

```
1. DISCOVER
   Curator finds a signal — reading arXiv, following a publication,
   or tracking a company announcement.

2. EVALUATE
   Run through the acceptance checklist mentally.
   If any check fails, do not add. If borderline, skip.

3. GEOLOCATE
   Find the city/institution. Open Google Maps or OpenStreetMap.
   Copy the exact lat/lng. Record confidence level.

4. WRITE SUMMARY
   Write 1–3 sentences. Do not invent context. Describe what
   the source actually says. Plain language.

5. SCORE
   Assign curator_score 1–10 using the scoring guide.

6. COMPOSE JSON
   Add the signal object to signals.json following the schema exactly.
   Validate JSON with a linter (VS Code will catch syntax errors).

7. UPDATE METADATA
   Update signals.json top-level "updated_at" to today's date.

8. REVIEW TOP TRENDS (if adding multiple signals)
   If the new signals shift the landscape, update top-trends.json.
   Update top-trends.json "updated_at".

9. COMMIT AND DEPLOY
   git commit -m "[Research] Add N signals — [domains]"
   Push. Site rebuilds with new data on next deploy.
```

**Batch curation:** When adding multiple signals at once (weekly curation session), add all signals first, then review whether any new trends have emerged before updating top-trends.json.

---

## Build order for Codex

Numbered sequence. Each step is buildable independently. Do not start a step until the previous step's output is verified.

### Phase 1 — Data foundation

**Step 1: Types and data files**
- Create `src/lib/signals.ts` with all TypeScript types and DOMAIN_COLORS/DOMAIN_LABELS/SIGNAL_TYPE_LABELS constants
- Create `src/data/signals.json` with the 7 sample signals from this document
- Create `src/data/top-trends.json` with the 4 sample trend items from this document
- Add all data access functions to `signals.ts`
- Verify: `import { getAllSignals } from '@/lib/signals'` returns an array of 7 Signal objects with correct types

**Step 2: Page shell**
- Create `src/app/research/page.tsx` as a Server Component
- Import `getAllSignals`, `getTopTrends`, `getDatasetUpdatedAt` from `@/lib/signals`
- Pass data as props to a placeholder `<ResearchMapPage>` client component
- Add a temporary heading "Research Signal Map" to confirm routing works
- Verify: `localhost:3000/research` renders without errors

**Step 3: Install MapLibre**
- `npm install maplibre-gl`
- Add CSS import: `import 'maplibre-gl/dist/maplibre-gl.css'` (in the map component or global CSS)
- Add `NEXT_PUBLIC_MAPTILER_KEY` to `.env.local`
- Verify: no build errors after install

---

### Phase 2 — Map core

**Step 4: Base map component**
- Create `src/components/research/ResearchMap.tsx` as `"use client"`
- Initialise MapLibre with MapTiler `dataviz-dark` style
- Map fills its container div (`width: 100%; height: 100%`)
- Disable default MapLibre controls (zoom buttons, compass) — these will be re-added or styled later, or omitted
- Export as default; in `page.tsx`, dynamic-import with `{ ssr: false }`
- Verify: `/research` shows a dark world map, no console errors

**Step 5: Signal dots layer**
- Convert `Signal[]` to GeoJSON FeatureCollection in `ResearchMap.tsx`
  - Each feature: `{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { id, primary_domain, signal_type, title, location_label, published_at, curator_score, source_name, modes } }`
- Add GeoJSON source and circle layer to the map on load
- Circle paint properties: `circle-color` = `['get', 'primary_domain']` mapped through `DOMAIN_COLORS`, `circle-radius` = 6, `circle-opacity` = 0.85
- Verify: 7 colored dots appear on the map at correct locations

**Step 6: Mode toggle**
- Create `src/components/research/ModeToggle.tsx`
- Props: `activeMode: Mode | 'all'`, `onChange: (mode: Mode | 'all') => void`
- Three states: All / Trends / Research
- Styled as two-button toggle using Centari design tokens
- In `SignalMapPage.tsx`: `useState<Mode | 'all'>('all')` for `activeMode`
- When mode changes, filter GeoJSON and update the MapLibre source data
- Verify: toggling "Trends" shows only Trends signals; "Research" shows only Research signals; dot count changes

**Step 7: Domain filter**
- Create `src/components/research/DomainFilter.tsx`
- Props: `activeDomains: Domain[]`, `onChange: (domains: Domain[]) => void`
- Renders a chip per domain using `DOMAIN_LABELS` and `DOMAIN_COLORS`
- Active chip: colored background. Inactive: `var(--color-surface)` with colored dot
- Default state: all domains active
- In `SignalMapPage.tsx`: `useState<Domain[]>(ALL_DOMAINS)` for `activeDomains`
- When domains change, update MapLibre source data (filter + mode combined)
- Verify: deselecting "AI" removes AI dots; re-selecting restores them

---

### Phase 3 — Interactivity

**Step 8: Hover tooltip**
- Create `src/components/research/SignalTooltip.tsx`
- Props: `signal: Signal | null`, `position: { x: number; y: number } | null`
- Renders portal (via `document.body`) anchored to pixel coordinates
- Shows: domain dot + domain label, signal type, title (truncated at 80 chars), location label, month + year, source name
- In `ResearchMap.tsx`:
  - Listen for MapLibre `mousemove` event on the circle layer
  - On enter: call `queryRenderedFeatures`, get signal ID, look up full Signal object, update tooltip state with signal + pixel coordinates
  - On leave (`mouseleave` on layer): clear tooltip state
- Verify: hovering a dot shows tooltip; moving away hides it

**Step 9: Signal detail panel**
- Create `src/components/research/SignalPanel.tsx`
- Props: `signal: Signal | null`, `onClose: () => void`
- Desktop: slides in from right (CSS transform translateX, transition 250ms), 400px wide, fixed position
- Mobile: bottom sheet (CSS transform translateY), 70vh height, fixed position
- Content: domain badge, signal type badge, source name, date, title (full), summary, location, "View source ↗" link (opens in new tab, `rel="noopener noreferrer"`)
- Tags rendered as small chip row at bottom
- In `ResearchMap.tsx`: listen for `click` event on circle layer, get signal ID, pass to parent via callback
- In `SignalMapPage.tsx`: `useState<Signal | null>(null)` for `selectedSignal`
- Clicking outside the panel (overlay) or pressing Escape closes it
- Verify: clicking a dot opens the panel with full signal data; source link works; close button works

**Step 10: Top 10 trends sidebar**
- Create `src/components/research/TopTrendsSidebar.tsx`
- Props: `trends: TrendItem[]`, `mode: Mode`, `onModeChange: (mode: Mode) => void`, `onTrendHover: (signalIds: string[] | null) => void`
- Renders mode tabs (Trends / Research) at the top
- Renders 10 TrendItem rows
- On mode tab change: calls `onModeChange`, switches the list
- On trend item hover: calls `onTrendHover` with the trend's `signal_ids`; on unhover: calls `onTrendHover(null)`
- Verify: sidebar renders both modes; tab switch shows different lists

**Step 11: Trend → map cross-highlight**
- In `SignalMapPage.tsx`: `useState<string[] | null>(null)` for `highlightedSignalIds`
- Pass `highlightedSignalIds` to `ResearchMap.tsx` as a prop
- In `ResearchMap.tsx`: when `highlightedSignalIds` changes, update a separate "highlighted" circle layer:
  - Filter the layer to only features whose `id` is in `highlightedSignalIds`
  - Paint: larger radius (10), full opacity, Stone stroke
  - Simultaneously reduce all other circles to 0.25 opacity
- Verify: hovering a trend item with 2 signal IDs highlights exactly those 2 dots; unhover restores all dots

---

### Phase 4 — Polish

**Step 12: Loading and empty states**
- Loading state: `ResearchMap.tsx` tracks `mapLoaded: boolean` (set to true in MapLibre `load` event)
  - Before `mapLoaded`: render a dark rectangle with a pulsing shimmer (CSS animation)
  - After `mapLoaded`: render the map normally
- Empty state: computed in `SignalMapPage.tsx` — when the intersection of mode filter and domain filter returns 0 signals, render the empty message overlay on the map
- Staleness label: render `"Data current as of {getDatasetUpdatedAt()}"` in muted text, bottom-left of map, using MapLibre's overlay container
- Verify: empty state shows when all domain chips are deselected; staleness label shows correct date from `signals.json`

**Step 13: Responsive layout**
- Create the two-column desktop layout: map fills left, sidebar is 320px on right
- Mobile layout: mode toggle sticky, map 60vh, domain chips horizontal scroll, top 10 list below
- Test at 375px, 768px, 1024px, 1440px
- Verify: no overflow, no layout breakage at any viewport

**Step 14: Navigation and metadata**
- Add "Research" to the Header navigation (`src/components/layout/Header.tsx`)
- Add `href: "/research"` to `NAV_ITEMS` in the Header
- In `src/app/research/page.tsx`, export metadata:
  ```typescript
  export const metadata: Metadata = {
    title: "Research Signal Map · Centari",
    description: "Live technology signals across AI, XR, robotics, quantum, and more.",
  };
  ```
- Verify: Research appears in nav; page has correct browser tab title

---

## Risks specific to MVP

### Hardcoded data becomes stale fast

The dataset is static JSON committed to the repo. If no one adds signals for two weeks, the map looks abandoned.

Mitigation: the `updated_at` field makes staleness visible. Establish a weekly curation commitment before launch. Even 3–5 new signals per week keeps the page feeling live. The staleness label in the UI sets user expectations.

### MapTiler free tier quota (100K loads/month)

Early traffic is likely below this. If it isn't, fall back to OpenFreeMap (zero-cost, slightly simpler dark style).

Have the fallback tile URL ready before launch:
```
https://tiles.openfreemap.org/styles/dark
```

### Source links break over time

Articles get paywalled, moved, or deleted. A dead source link undermines the quality guarantee.

Mitigation: the quality gate requires a live source link at time of addition. Periodic curation sessions should include a link health check. This is a manual process in MVP — no automated dead-link detection.

### Geographic accuracy

Manually verified coordinates can still be wrong. A paper by an MIT author might be geolocated to Cambridge, MA when the work was done at a partner lab elsewhere.

Mitigation: `location_confidence` communicates this. `high` confidence means the curator verified the institution against a registry or official page. If in doubt, use `medium`. Low-confidence signals still appear on the map but are visually de-emphasised.

---

## Definition of done for MVP

The MVP is ready to ship when all of the following are true:

```
[ ] /research page loads without JavaScript errors in production build
[ ] At least 50 signals in signals.json, all passing the quality checklist
[ ] Top 10 trends populated for both modes
[ ] Mode toggle filters signals correctly
[ ] Domain filter dims non-matching signals (does not remove them — this is intentional)
[ ] Hover tooltip shows on every dot
[ ] Signal detail panel opens and source link works for every signal
[ ] Trend hover highlights corresponding map dots
[ ] Mobile layout is usable on a 375px viewport
[ ] Staleness label shows the correct date from signals.json
[ ] "Research" appears in the site header navigation
[ ] Page metadata (title, description) is set correctly
[ ] MapTiler key is in environment variable, not hardcoded
[ ] signals.json passes TypeScript type checking (add a type assertion in the data access layer)
```

---

*The pipeline described in R1 (automated ingestion, LLM classification, scoring) is V2. This MVP establishes the data model, UI, and quality standards that V2 will inherit.*

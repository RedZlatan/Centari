# Sprint 1 — Frontend Foundation

**Status:** Complete  
**Closed:** 2026-06-11  
**Goal:** Build the Centari homepage: a precise, serious web presence that communicates the product ecosystem and company intent. Not a portfolio. Not an open-source project page. A platform.

---

## Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15 (App Router) | SSG by default, excellent SEO, TypeScript-first |
| Language | TypeScript | Required; catches errors early, matches technical brand |
| Styling | CSS Modules + CSS custom properties | No lock-in, minimal output, full design control |
| Fonts | `next/font` (local or Google) | Zero layout shift, no external request at runtime |
| Animation | CSS transitions only | Restrained movement — approved |
| Deployment | Standard Next.js build | Platform decision deferred; Hetzner likely long-term |

No UI component library. No JS animation framework. Every visible element is purpose-built.

---

## Homepage section structure

Sections in render order, top to bottom:

### 1. Header (persistent)
- **Wordmark:** `CENTARI` — uppercase styled text, no logo asset in Sprint 1
- **Navigation (right):** Solutions · Products · Research · Journal · Control Room
- Transparent on hero, solid background on scroll
- `Control Room` treated as a distinct nav item — bold or visually differentiated

### 2. Hero
- Full-viewport height
- **Headline:** *Solve the problem.*
- **Body:** *Centari builds systems that help organisations understand, train for and shape the future.*
- **Primary CTA:** `Explore Solutions`
- **Secondary CTA:** `Enter Control Room`
- Background: dark, flat — no video, particles, or WebGL in Sprint 1

### 3. Products
- Six products in the Centari ecosystem: **Forge · Mission · Twin · Insight · Workstation · Lab**
- Grid layout: 3 columns × 2 rows on desktop, 2 × 3 on tablet, 1 column on mobile
- Each card: product name, one-sentence description (placeholder copy for Sprint 1)
- Section heading: *The ecosystem*

### 4. Principles
- The four core principles from `docs/vision.md`
- Two-column grid on desktop, single column on mobile
- Short label + body paragraph each
- No icons — text only

### 5. Footer
- `CENTARI` wordmark
- Contact: `hello@centari.se` (mailto link)
- Copyright line
- No social links, no GitHub link in Sprint 1

*No blog, team section, or case studies in Sprint 1.*

---

## Component structure

```
src/
├── app/
│   ├── layout.tsx          root layout: fonts, metadata, global CSS import
│   ├── page.tsx            homepage — composes sections in order
│   └── globals.css         design tokens (custom properties), reset
├── components/
│   ├── layout/
│   │   ├── Header.tsx      wordmark + nav, scroll-aware background
│   │   ├── Footer.tsx      wordmark, mailto, copyright
│   │   └── Container.tsx   max-width wrapper with horizontal padding
│   └── sections/
│       ├── Hero.tsx        headline, body, two CTAs
│       ├── Products.tsx    section heading + product grid
│       ├── ProductCard.tsx single product tile
│       └── Principles.tsx  two-column principle grid
└── lib/
    └── content.ts          typed constants: products[], principles[]
```

No shared `ui/` primitive layer in Sprint 1. Extract only if a pattern appears in three or more places.

---

## Design system

### Color palette

| Token | Name | Hex | Role |
|-------|------|-----|------|
| `--color-bg` | Carbon | `#17191A` | Page background |
| `--color-surface` | — | `#1E2022` | Card / surface layer |
| `--color-border` | — | `#2A2D2F` | Dividers, card borders |
| `--color-text` | Stone | `#E9E5DF` | Primary text |
| `--color-muted` | — | `#8A8480` | Secondary text, captions |
| `--color-accent` | Brass | `#A88A5A` | CTAs, highlights, active states |
| `--color-pine` | Granite Green | `#2C3430` | Subtle tints, hover states |

The palette is warm-dark. Carbon background, Stone text, Brass accent. Not cold tech blue. The feel is industrial precision — material, considered.

### Design tokens (CSS custom properties in `globals.css`)

```css
/* Palette */
--color-bg:       #17191A;
--color-surface:  #1E2022;
--color-border:   #2A2D2F;
--color-text:     #E9E5DF;
--color-muted:    #8A8480;
--color-accent:   #A88A5A;
--color-pine:     #2C3430;

/* Typography */
--font-sans:  'Inter', system-ui, sans-serif;
--font-mono:  'JetBrains Mono', monospace;

/* Spacing (4px grid) */
--space-1:  4px;
--space-2:  8px;
--space-4:  16px;
--space-6:  24px;
--space-8:  32px;
--space-12: 48px;
--space-16: 64px;
--space-24: 96px;
--space-32: 128px;

/* Type scale */
--text-xs:   0.75rem;
--text-sm:   0.875rem;
--text-base: 1rem;
--text-lg:   1.25rem;
--text-xl:   1.5rem;
--text-2xl:  2rem;
--text-4xl:  3.5rem;
--text-6xl:  5.5rem;
```

### Typography
- **Headline:** large, tight tracking, light weight (300) — `--text-6xl` on desktop, scales down
- **Body:** 400 weight, `1.7` line-height — readable at paragraph length
- **Nav / labels / product names:** monospace, uppercase, tracked — signals precision, not decoration
- **CTAs:** sans-serif, 400–500 weight, Brass color or Carbon-on-Stone

### Dark-first
Carbon background is primary. No light mode in Sprint 1. `prefers-color-scheme: light` is a future sprint decision.

---

## Content placeholders (`lib/content.ts`)

### Products
Six entries, one per product. Each has `id`, `name`, and `description` (one sentence). Descriptions are placeholder copy for Sprint 1 — final product copy is a separate deliverable.

```ts
export const products = [
  { id: 'forge',       name: 'Forge',       description: '...' },
  { id: 'mission',     name: 'Mission',     description: '...' },
  { id: 'twin',        name: 'Twin',        description: '...' },
  { id: 'insight',     name: 'Insight',     description: '...' },
  { id: 'workstation', name: 'Workstation', description: '...' },
  { id: 'lab',         name: 'Lab',         description: '...' },
]
```

### Principles
Four entries from `docs/vision.md`: Grounded in the physical · Intelligence at the edge · Small surface, deep value · Open process.

---

## Decisions made

All questions from the initial plan are resolved:

| Question | Decision |
|----------|----------|
| Logo | Styled text `CENTARI` uppercase — no asset in Sprint 1 |
| Accent color | Brass `#A88A5A` — warm, not blue |
| Contact | `mailto:hello@centari.se` — no form |
| Deployment | Standard Next.js build — platform TBD, likely Hetzner |
| Scope | Homepage only |
| Animation | CSS-only, restrained |
| Nav items | Solutions · Products · Research · Journal · Control Room |
| Hero copy | Approved — see Hero section above |
| Tone | Serious company platform — no open-source framing |

---

## Acceptance criteria

- [x] `npm run dev` starts a working local server with no errors
- [x] All homepage sections render correctly on desktop (1440px)
- [x] All sections are readable and functional on mobile (375px)
- [x] Header background transitions correctly on scroll
- [x] Both hero CTAs are present and correctly labelled
- [x] All six products render in the product grid
- [ ] Lighthouse performance score ≥ 90 on desktop
- [x] No external runtime dependencies beyond Next.js and React
- [x] `npm run build` completes with zero TypeScript errors

---

## Out of scope for Sprint 1

- Individual product pages (`/products/forge`, etc.)
- Control Room implementation (link placeholder only)
- Solutions, Research, Journal pages
- Light mode
- Scroll-triggered animations or WebGL
- Contact form
- Analytics
- CI/CD pipeline (Sprint 2)
- Final product copy (placeholder text acceptable)

---

## Retrospective

Homepage ships with zero TypeScript errors and a clean production build. All six acceptance criteria verifiable locally were met. Lighthouse score deferred to a live deployment. No scope was added.

One structural note: `next build` updated `next-env.d.ts` to add a reference to `.next/types/routes.d.ts` — this is normal Next.js behaviour and was committed alongside the app shell.

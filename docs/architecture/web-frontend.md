# Architecture: Web Frontend

**Decided:** 2026-06-11  
**Sprint:** 1

---

## Context

Centari needed a public-facing web presence as its first deliverable. The site must communicate the product ecosystem and company intent to a technical, professional audience. The design language (Carbon/Stone/Brass palette, industrial precision) required full control over styling.

## Decisions

### Framework: Next.js 15 (App Router)

Static generation by default means the homepage ships as a prerendered HTML file — no runtime server required for the public site. The App Router's Server Component default keeps client-side JS minimal; only components with interactive browser state (the scroll-aware Header) opt into `"use client"`.

**Not chosen:** Astro (considered for even lighter output, rejected because Next.js grows better into future product pages and authentication surfaces); plain HTML (no build pipeline, harder to scale).

### Styling: CSS Modules + CSS custom properties

All design tokens live in `src/app/globals.css` as CSS custom properties on `:root`. Each component owns a `.module.css` file that references those tokens. No utility classes, no runtime CSS-in-JS.

**Why not Tailwind:** Tailwind's utility class model leaks layout decisions into markup and makes it difficult to maintain the visual coherence a design-system-first approach requires. For a brand this precise, authored CSS is the right tool.

### Font injection: `next/font/google`

`Inter` and `JetBrains Mono` are loaded via `next/font`. The `variable` prop injects each font as a CSS custom property (`--font-sans`, `--font-mono`) on the `<html>` element — zero layout shift, no external runtime fetch.

### No UI library

Every visible element is purpose-built. This is not a compromise; the brand's industrial precision would be undermined by a generic component library's default aesthetics.

### Deployment: standard `next build`

The `output: "standalone"` config in `next.config.ts` produces a self-contained Node.js server bundle. This keeps the deployment target open — Hetzner VPS, container, or any Node-capable host. No platform-specific configuration is required.

## Consequences

**Easier:** Adding new pages (Next.js routing is free), maintaining visual consistency (one token file, no override complexity), deploying anywhere with Node.

**Harder:** Complex interactive UI (everything must be built; no pre-built components), real-time features (would require additional architecture), CMS-driven content (static constants in `lib/content.ts` must be replaced when content needs to be editable).

---

## File map

```
src/
├── app/
│   ├── globals.css      design tokens, reset, base styles
│   ├── layout.tsx       root layout: fonts, metadata, Header + Footer
│   └── page.tsx         homepage: Hero → Products → Principles
├── components/
│   ├── layout/
│   │   ├── Container    max-width wrapper, responsive padding
│   │   ├── Header       fixed nav, scroll-aware background (client)
│   │   └── Footer       wordmark, contact, copyright
│   └── sections/
│       ├── Hero         full-dvh, headline, two CTAs
│       ├── Products     6-product 3×2 grid
│       ├── ProductCard  single product tile
│       └── Principles   4-item 2-column grid
└── lib/
    └── content.ts       typed products[] and principles[] constants
```

# Centari

**XR · AI · Hardware** — We build tools that dissolve the boundary between the physical world and intelligent systems.

---

## What we do

Centari creates problem-solving products at the intersection of extended reality, artificial intelligence, and custom hardware. Our work ranges from spatial computing interfaces to embedded AI systems — always with a focus on practical outcomes over novelty.

## Repository structure

```
Centari/
├── src/
│   ├── app/            # Next.js App Router — layout, pages, global CSS
│   ├── components/     # Layout and section components
│   └── lib/            # Typed content constants
├── docs/               # Vision, architecture, and sprint documentation
│   ├── sprints/        # Per-sprint scope, goals, and retrospectives
│   └── architecture/   # Technical design documents
├── .github/            # PR and issue templates
└── CLAUDE.md           # AI assistant context
```

## Development process

Work is organized in short, focused sprints. Each sprint has a scope document in `docs/sprints/` that defines goals, deliverables, and acceptance criteria before work begins.

**Current phase:** Sprint 1 complete — homepage live locally (`npm run dev`)

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run type-check
```

For company direction and architecture decisions, start with `docs/vision.md` and `docs/architecture/`.

---

*Centari — built in the open, shipped with intent.*

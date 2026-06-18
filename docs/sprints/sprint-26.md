# Sprint 26 — Production Reality & Material Pipeline

## Goals

Get all SJ assets to a state where they can be imported into Unity, assigned materials, and used
in production. Unity is the source of truth. Blender reports are advisory only.

---

## Phase A — X2000 Reality Check

**Sprint 26A complete — 2026-06-18**

### Acceptance criteria

- [x] Original `X2000_prod.fbx` imported and analysed in Blender headless
- [x] Screenshots generated: top, side, perspective, interior, interior aisle view
- [x] Mesh counts: visible (1,124), hidden (9), multi-island objects (19 from sample)
- [x] Physical dimensions established: 26.2 m × 3.2 m × 2.4 m (one carriage)
- [x] Asset identity determined
- [x] `reports/x2000_asset_health.md` written with full findings and next-step recommendations

### Findings

| Question | Answer |
|----------|--------|
| Complete train model? | No — interior only, with a 324-tri exterior placeholder |
| Only an interior scene? | Yes — 99.8% of tris are interior geometry |
| Broken export? | No — geometry is spatially coherent |
| Maya workfile exported mid-session? | Yes — 98% of objects unnamed, no production materials |

**Verdict: REQUIRES MANUAL ARTIST CLEANUP**

The interior geometry is salvageable (244K tris, ~26 m × 3.2 m × 2.4 m carriage).
The exterior shell (`polySurface45`, 324 tris) is a placeholder, not a production mesh.
The pipeline correctly handles scale and export — the bottleneck is the asset state.

### Files

- `reports/x2000_asset_health.md` — full health report
- `reports/x2000_health_stats.json` — raw probe data
- `reports/x2000_screenshots/` — perspective, top, side, interior, interior_aisle views

---

## Phase B — X2000 Recovery

**Complete — 2026-06-18**

### Acceptance criteria

- [x] `reports/x2000_recovery_report.md` written with formal verdict

### Verdict

**RECOVERABLE — WITH REQUIRED ARTIST CLEANUP**

The pipeline delivers the asset correctly. The gap to production is artist work, not engineering
unknowns. Production risk: low technical / medium schedule / high exterior risk (no usable
exterior mesh exists).

### Files

- `reports/x2000_recovery_report.md`

---

## Phase A (full) — Unity Truth

**Complete — 2026-06-18**

All five normalized FBX files imported into Unity 6000.0.29f1 (URP) via batch validation.

### Acceptance criteria

- [x] All 5 models imported and validated: X2000, SJ Ro3 b4, bc011032, Prins August, sittvagn
- [x] Bounds, scale, materials, renderers, hierarchy recorded for each
- [x] Blender pipeline vs Unity agreement verified
- [x] `reports/unity_truth_report.md` written

### Unity validation results

| Model | Verdict | W × H × L (m) | Root Scale | Renderers | Materials |
|-------|---------|----------------|------------|-----------|-----------|
| X2000 | MINOR_FIX | 29.33 × 4.57 × 7.75 | (1,1,1) ✓ | 1132 | 3 |
| SJ Ro3 b4 | MINOR_FIX | 3.58 × 4.39 × 30.99 | (1,1,1) ✓ | 306 | 3 |
| bc011032 | MINOR_FIX | 10.14 × 9.70 × 16.48 | (1,1,1) ✓ | 950 | 2 |
| Prins August | MINOR_FIX | 2.62 × 3.84 × 11.57 | **(0.01) ⚠** | 3 | 3 |
| sittvagn | MINOR_FIX | 0.99 × 1.27 × 2.68 | **(0.01) ⚠** | 2 | 3 |

No BLOCKED models. Blender verify matches Unity for all three pipeline-verified models.

**Open issues requiring follow-up sprint:**
- Prins August and sittvagn have root_scale=0.01 (CLEAN assets not baked by pipeline). Must fix.
- bc011032 has 95 non-unit-scale child objects (residual after TYPE_B bake).
- Prins August has `lambert7` Maya default material — must be replaced.

### Files

- `reports/unity_truth_report.md`

---

## Phase C — Material Inventory

**Complete — 2026-06-18**

### Acceptance criteria

- [x] Material slot names extracted for all 5 models
- [x] Texture references recorded (result: none — no textures in any model)
- [x] `reports/material_inventory.json` written

### Summary

14 material slots across 5 models. No textures in any model. All materials are URP/Lit embedded
in their respective FBX files. 1 placeholder material (`lambert7` in Prins August).

Pipeline-renamed materials (X2000, SJ Ro3 b4, bc011032) have semantic names (e.g. `x2000_interior`,
`sj_ro3_body`). Preserved source names (Prins August, sittvagn) retain original Maya/artist names.

### Files

- `reports/material_inventory.json`

---

## Phase D — Asset Wizard Material Hooks

**Complete — 2026-06-18**

### Acceptance criteria

- [x] Interface schema for `scene_semantics.json` prepared (no classifier built — schema only)
- [x] Interface schema for `material_assignments.json` prepared

### Interface contracts

`scene_semantics.json` — maps mesh object names to semantic category + material_class.
Produced by classifier (not yet built). Consumed by material assignment pipeline.

`material_assignments.json` — maps material_class to AW library material ID + Unity material path.
Authored by project lead/artist. Consumed by material assignment pipeline.

### Files

- `schemas/scene_semantics.json` — interface stub with annotated schema
- `schemas/material_assignments.json` — interface stub with annotated schema and known material classes

---

## Sprint 26 Complete — 2026-06-18

### Open items for next sprint

1. **Fix Prins August and sittvagn root scale**: Pipeline must bake root EMPTY transform scale for
   CLEAN-classified assets. Currently the phantom 0.01 scale is passed through to Unity.

2. **Replace Prins August `lambert7` material**: Maya default name must be replaced with a
   semantic name before delivery.

3. **bc011032 non-unit child scales (95 objects)**: Freeze-transform pass needed.

4. **X2000 artist cleanup**: Rename, freeze transforms, assign production materials, exterior decision.

5. **Build scene classifier**: `scene_semantics.json` interface is defined; classifier implementation
   is a separate sprint.

6. **Build material assignment pipeline**: `material_assignments.json` interface is defined;
   pipeline implementation is a separate sprint.

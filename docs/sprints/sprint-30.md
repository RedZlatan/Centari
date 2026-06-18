# Sprint 30 — Production Delivery Readiness

_Status: Complete_
_Date: 2026-06-18_

---

## Goal

Prepare Asset Wizard for actual production assets and Worker Program–generated materials.
Verify every link in the chain from Worker Program output to Unity import.

---

## Acceptance Criteria

| # | Criterion | Result |
|---|-----------|--------|
| 1 | material_assignments.json from Worker Program consumed without manual edits | ✓ X2000: 3 slots renamed, Unity MINOR_FIX (unchanged) |
| 2 | ao.png added to standard PBR map set | ✓ _PBR_MAPS now includes "ao" |
| 3 | Full 5-map packaging validated end-to-end | ✓ sittvagn PASS, 18 texture files in Unity |
| 4 | X2000 scale outlier root cause identified | ✓ Category A — capture artifact (pre-normalisation cm data) |
| 5 | Delivery bundle spec defined | ✓ docs/production_bundle_spec.md |

---

## Priority 1 — Material Assignment Consumption

**Source**: Worker Program 1–3 (mesh_inventory → material_clusters → semantic_graph →
material_recommendations) + Codex assignment bridge.

**X2000 Worker Program output**:
- 92 clusters, 35 excluded (dimension_outlier — see Priority 3)
- 6 semantic groups: panel (0.41), seat (0.70), fastener_or_detail (0.73), window (0.63), curtain (0.60), door (0.52)

**Generated `material_assignments.json`** (Codex bridge output):

| Slot | Library material | Source semantic class | Confidence |
|------|-----------------|----------------------|------------|
| x2000_interior | laminate_wall_cream | panel | 0.56 |
| x2000_detail | plastic_interior_gray | fastener_or_detail | 0.73 |
| x2000_misc | x2000_glass | window | 0.63 |

**Pipeline result**: `production_prepare.py` loaded the file, applied 3 renames, exported
correctly. Unity validated MINOR_FIX (unchanged from baseline — no regression). All pre-existing
warnings (`many_renderers`, `non_unit_scales`, `suspicious_default_names`) are X2000 source
geometry issues, not material-related.

---

## Priority 2 — Material Packaging Validation

**Change**: `ao.png` (ambient occlusion) added to `_PBR_MAPS` in `production_prepare.py`.

```python
# Before Sprint 30:
_PBR_MAPS = ("albedo", "normal", "roughness", "metallic")

# Sprint 30:
_PBR_MAPS = ("albedo", "normal", "roughness", "metallic", "ao")
```

**Validation** (sittvagn, 3 materials × 5 maps = 15 source files):

| Step | Result |
|------|--------|
| collect_material_maps() | fabric_curtain: 6 maps (+ material_json), interior_trim: 6, painted_metal: 6 |
| package_material_maps() | 12 existing files skipped, 3 new ao files copied |
| Unity import | 18 texture files (15 + 3 ao) imported, 18 .meta files created |
| sittvagn verdict | PASS — no regression |

`tools/create_test_material_fixtures.py` updated to generate `ao.png` per material.

---

## Priority 3 — Scale Outlier Root Cause

**Finding**: 35/92 X2000 clusters flagged `dimension_outlier`. Root cause identified and documented.

**Verdict**: **Category A — harmless capture artifact**.

The `mesh_inventory_adapter` captures mesh dimensions from the Blender import state BEFORE
`production_prepare.py` runs its normalisation pass. The X2000 is a TYPE_A model: children of a
0.01-scale EMPTY have Maya cm vertex data unmodified at import. The cluster worker sees these
as outliers:

- `pCube258`: raw dim = 101.69m → post-normalisation: **1.02m** (arm rest / seat component)
- cluster_13 (30 × pCubeN): raw = 168m × 136m × 1m → post: **1.68m × 1.36m × 0.01m** (seat back panel)
- `no_windows`: raw = 2469m → post: **24.69m** (window reference box, full carriage width)

**After pipeline run**: X2000 exports at `29.33 × 4.57 × 7.75m` — correct physical dimensions.
No geometry defect.

**Recommended fix** (not in this sprint): run `mesh_inventory_adapter` on the post-normalisation
FBX rather than on the raw Blender import. This eliminates all cm-scale outliers at the source.

---

## Priority 4 — Delivery Bundle

**`docs/production_bundle_spec.md`** defines the canonical layout for a finished Asset Wizard delivery:

```
output/production/<model>/
├── normalized.fbx
├── production_data.json
├── material_assignments.json
├── semantic_graph.json
├── material_recommendations.json
├── materials/<material_id>/  (worker-written source)
│   ├── albedo.png  normal.png  roughness.png  metallic.png  ao.png
│   └── material.json
├── <material_id>_*.png       (packaged flat, alongside FBX)
└── validation_report.json
```

Includes per-file definitions, acceptance criteria, a bundle completeness matrix, and a
delivery checklist. Current bundle status for all 5 models documented in the spec.

---

## Carry-forward

| Item | Priority | Notes |
|------|---------|-------|
| Fix mesh_inventory capture to post-normalisation | P2 | Eliminates cm-scale outlier false positives |
| Real PBR maps for X2000 (Material Workers) | P1 | Delivery blocker — placeholder maps only exist for sittvagn |
| Rename lambert7 in Prins August source | P1 delivery blocker | Artist pass |
| bc011032 freeze-transform (95 non-unit objects) | P1 delivery | Pipeline sprint |
| Wire ao.png to Unity URP/Lit Occlusion Map | P2 | Worker task |
| Run Worker Program on SJ Ro3 b4, Prins August, bc011032 | P2 | Expand coverage |

# Sprint 31 — Fix Worker Program Data Source

_Status: Complete_
_Date: 2026-06-18_

---

## Goal

Fix the timing of `mesh_inventory_adapter`'s dimension capture so the Worker Program
receives post-normalisation metre-scale dimensions instead of pre-bake stale values.

Sprint 30 identified the root cause (Category A — capture artifact) and deferred the fix.
This sprint implements it.

---

## Acceptance Criteria

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Post-normalisation mesh snapshot added to `production_prepare.py` | ✓ `_snapshot_post_normalisation()` via numpy foreach_get |
| 2 | `mesh_inventory_adapter` consumes corrected data without manual edits | ✓ prefers `post_normalisation_meshes` key, falls back gracefully |
| 3 | X2000 Worker Program chain re-run end-to-end | ✓ all 4 workers + report |
| 4 | Outlier count drops | ✓ **35 → 1** (97% reduction) |
| 5 | Report written | ✓ `reports/x2000_worker_post_normalisation_report.md` |

---

## Technical Approach

### Root cause

`objects[].mesh.dims_world` in `production_data.json` is read from `Object.bound_box`,
a Blender-cached property that does **not** invalidate when `obj.data.transform()` is
called. The result is a mix of pre-bake and post-cm×100 values — neither gives correct
post-normalisation physical metre dimensions.

### Fix

**`_snapshot_post_normalisation(objects) → dict`** added to `production_prepare.py`:
- Called inside `export_fbx()` after `had_parent` bake + TYPE_B bake + scale reset
- **Before** the cm×100 conversion
- Uses `numpy.foreach_get` to read actual vertex buffer positions (not the stale bound_box)
- Local-space dimensions only — at this call site every object's scale is (1,1,1),
  so local dimension = physical metre dimension
- Avoiding `matrix_world` sidesteps a Blender depsgraph timing issue where root TYPE_B
  objects may report the pre-reset scale in `matrix_world`

`export_fbx()` returns the snapshot dict. Stored in `production_data.json` as
`"post_normalisation_meshes": {obj_name: {"dims_world": [x, y, z]}}`.

**`mesh_inventory_adapter.py`** updated to prefer `post_normalisation_meshes` when present,
falling back to `objects[].mesh.dims_world` for compatibility with Sprint ≤30 files.

---

## Results

### Cluster outliers

| Metric | Sprint 30 | Sprint 31 |
|--------|----------|----------|
| Total clusters | 92 | 92 |
| ok | 57 | **87** |
| dimension_outlier | **35** | **1** |
| near_zero_dimension | 0 | 4 |

The 1 remaining `dimension_outlier` contains `no_windows + polySurface45 + polySurface60`
(genuine 25m exterior carriage shells). This is expected — the cluster worker correctly
flags large-structure geometry as outliers relative to interior components.

### Semantic groups

Post-normalisation dims produce a fundamentally different (more accurate) clustering:

| Class | Sprint 30 | Sprint 31 |
|-------|----------|----------|
| fastener_or_detail | ~353 | **766** |
| curtain | 34 | 105 |
| panel | **434** | **22** |
| seat | **243** | **24** |
| window | 57 | 4 |
| door | 11 | 6 |

The Sprint 30 `panel` (434) and `seat` (243) counts were inflated by cm-scale objects
(pCube*/pCylinder*) whose 100m+ apparent dimensions matched large-block cluster signatures.
With correct metre-scale dims, these resolve to `fastener_or_detail` — the correct class
for the many small interior bolts, brackets, rivets, and trim clips that make up X2000
interior detail geometry.

---

## Carry-forward

| Item | Priority | Notes |
|------|---------|-------|
| Re-run Codex bridge with Sprint 31 semantic graph | P1 | material_assignments.json was generated from Sprint 30 (panel-dominant); Sprint 31 is fastener_or_detail-dominant — may change `x2000_interior` assignment |
| Run Worker Program on SJ Ro3 b4, Prins August, bc011032 | P2 | Expand coverage with corrected dims |
| Real PBR maps for X2000 | P1 delivery blocker | Workers only exist for sittvagn (placeholder) |
| bc011032 freeze-transform (95 non-unit objects) | P1 delivery | Pipeline sprint |
| lambert7 rename in Prins August | P1 delivery blocker | Artist pass |

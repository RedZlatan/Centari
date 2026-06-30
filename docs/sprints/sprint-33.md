# Sprint 33 — Scene Bounds Accuracy (Floor Contact Fix)

_Status: Complete_
_Date: 2026-06-19_
_Parent sprint: Sprint 32.1 (known gap: floor alignment)_

---

## Goal

Fix `scene_bbox` in `production_prepare.py` so the floor contact point is correctly computed, placing the X2000 carriage floor at Unity Y = 0.

Sprint 32.1 left `min_y = −0.757 m` in Unity due to a known stale-bounds bug. This sprint resolves it.

---

## Acceptance Criteria

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Use evaluated geometry, not stale `Object.bound_box` | ✓ `foreach_get('co', …)` reads raw vertex data directly |
| 2 | Unity floor contact at Y ≈ 0 (within 1 mm) | ✓ `lowest_y = 0.0000017 m` |
| 3 | Height preserved within 2% of Sprint 32.1 baseline (4.565 m) | ✓ `height = 4.5651 m` (0.00% drift) |
| 4 | Input guard preserved | ✓ Unchanged |
| 5 | Material assignment pipeline preserved | ✓ 3 materials, slot_renames intact |
| 6 | Mesh count stable | ✓ 1,133 |
| 7 | Root transform identity | ✓ |
| 8 | Unity verdict MINOR_FIX or better | ✓ MINOR_FIX |

---

## Root Cause

Two compounding bugs in the original `world_bbox_of`:

### Bug 1 — Stale `Object.bound_box`

`Object.bound_box` is a cached AABB that is not refreshed by `view_layer.update()` for objects that are hidden at the time of evaluation. For hidden root meshes (`no_windows`, etc.) the cached bound_box reflected stale import-time data.

Fix: read vertex positions via `mesh.vertices.foreach_get('co', flat_array)`. This reads the raw mesh data block directly, bypassing any evaluation cache, and is correct regardless of object visibility.

### Bug 2 — Wrong matrix treatment for root mesh objects

The export pipeline (`export_fbx`) treats root objects (no parent) and child objects (had_parent) differently:

**Child objects** — the `had_parent` bake multiplies vertex coordinates by the world scale, then clears parent and resets `obj.scale` to `(1,1,1)`. The net effect is that post-export world position equals `matrix_world @ vertex_local`. Use `matrix_world` directly.

**Root objects** — the export pipeline resets `obj.scale` to `(1,1,1)` **without** first baking vertex data. Post-export world position is therefore `rotation_matrix @ vertex_local` — the scale component stripped from `matrix_world`. Using full `matrix_world` for root objects includes the `0.01` scale factor, giving tiny world positions (~2 cm) that are wrong.

The critical root mesh is **polySurface62** (`obj.scale = (−0.01, −0.01, −0.01)`). Blender's `matrix_world.decompose()` absorbs the negative sign into the rotation quaternion, so the rotation-only matrix has `row2[Y] = −1.0`. With `local_Y_max = 2.2648 m`, the post-export floor position is:

```
world_Z_min = rotation_row2 @ vertex_local = −1.0 × 2.2648 = −2.2648 m
```

Setting `dz = +2.2648 m` in `translate_roots` places the floor at Unity Y = 0.

Sprint 32.1 accidentally got a plausible (but wrong) result of `dz = 1.3989 m` from `no_windows` using the stale import-time matrix, which maps `local_Z` to `world_Z` with coefficient 1.0. After `view_layer.update()`, the correct matrix maps `local_Y → world_Z` with coefficient `0.01`, so the world Z is tiny. The actual floor is set by `polySurface62`, not `no_windows`.

---

## What Was Built

### `world_bbox_of(obj)` — rewritten (`production_prepare.py`)

Replaced the `bound_box`-based implementation with:

1. **`foreach_get('co', flat_array)`** — reads raw vertex positions from the mesh data block. Always accurate; no evaluation cache involved.

2. **Root vs. child matrix path**:
   - `parent is None` → decompose `matrix_world` → build translation+rotation-only matrix (scale stripped)
   - `parent is not None` → use `matrix_world` directly

3. **numpy batched transform** — `(mat @ verts_homogeneous.T).T` for efficiency across 1,133 meshes.

Requires `matrix_world` to be current: the call in `main()` is wrapped in an unhide + `view_layer.update()` block so hidden objects have correct evaluated matrices before `world_bbox_of` reads them.

### `main()` bbox block — updated

Replaced the Sprint 33 broken attempt (which called `view_layer.update()` after re-hiding, too late) with a correct sequence:

```
unhide all → view_layer.update() → scene_bbox(visible_only=False) → re-hide all
```

Removed leftover debug prints `[scene_bbox]` and `[translate_roots]`. Simplified fallback.

---

## Unity Validation Results

Run: Unity 6000.0.29f1 batch mode, `X2000.fbx`, 2026-06-19.

| Metric | Sprint 32.1 | Sprint 33 |
|--------|-------------|-----------|
| Floor (`lowest_y`) | −0.757 m | **+0.000002 m ≈ 0** ✓ |
| Height | 4.565 m | **4.5651 m** ✓ |
| `plausibly_train_sized` | true | true ✓ |
| Materials | 3 correct | 3 correct ✓ |
| Mesh count | 1,133 | 1,133 ✓ |
| Root transform | identity | identity ✓ |
| Verdict | MINOR_FIX | **MINOR_FIX** ✓ |

Report: `reports/x2000_sprint33_floor_accuracy_validation.md`

---

## Carry-forward

| Item | Priority |
|------|----------|
| Real PBR maps for X2000 (artist pass) | P1 delivery blocker |
| Unity Editor script: auto-wire textures from material.json | P2 |
| Re-run Codex bridge with Sprint 31 semantic graph | P2 |
| bc011032 freeze-transform (95 non-unit-scale objects) | P2 |

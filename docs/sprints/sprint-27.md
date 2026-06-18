# Sprint 27 — Root Scale Fix & Material Pipeline Integration

## Goals

1. Fix CLEAN asset root-scale handling so Prins August and sittvagn export with unit root scale.
2. Add material assignment hooks to the production pipeline so Material Intelligence outputs can
   connect directly.
3. Produce a material slot mapping document that bridges current FBX material names to future AW
   library material classes.

---

## Phase A — CLEAN Asset Root Scale Fix

**Complete — 2026-06-18**

### Problem

Prins August and sittvagn had root_scale=(0.01, 0.01, 0.01) in Unity after pipeline export.
The root EMPTY transform was not baked. Physics colliders and prefab scale inheritance break
when the root has non-unit scale.

### Root cause

`bpy.ops.export_scene.fbx()` uses the **evaluated dependency graph**
(`bpy.context.evaluated_depsgraph_get()`), not the current base object data. Inside
`export_fbx()`, `view_layer.update()` was called once at the top of the function (to snapshot
world matrices). All subsequent mutations — parent clear, scale reset, cm×100 position
changes — modified base data without flushing the depsgraph. The FBX exporter therefore saw
the stale depsgraph: original hierarchy intact, root EMPTY at scale 0.01.

### Fix

One line added to `blender/production_prepare.py`, right before `bpy.ops.export_scene.fbx()`:

```python
bpy.context.view_layer.update()
```

This flushes all base-data mutations into the evaluated depsgraph before the exporter reads it.
The fix has no impact on already-working models — it is a pure correctness addition.

### Acceptance criteria

- [x] Root cause identified (stale evaluated depsgraph)
- [x] Fix applied in `blender/production_prepare.py`
- [x] Prins August rebuilt: `post_dims=[2.624, 11.573, 3.843]`, `scale_estimate=metres_correct`
- [x] sittvagn rebuilt: `post_dims=[0.989, 2.677, 1.272]`, `scale_estimate=metres_plausible`
- [x] Prins August Unity validation: `root_scale=(1,1,1)`, `non_unit_scale=0`, warnings=`default_material_names` only
- [x] sittvagn Unity validation: **PASS**, `root_scale=(1,1,1)`, `non_unit_scale=0`, no warnings

### Updated Unity results (post-fix)

| Model | Verdict | Root Scale | Non-Unit Scales | Key Change |
|-------|---------|------------|-----------------|------------|
| Prins August | MINOR_FIX | **(1,1,1) ✓** | 0 ✓ | Was 0.01, now unit |
| sittvagn | **PASS** | **(1,1,1) ✓** | 0 ✓ | Was 0.01, now PASS |

### Files modified

- `blender/production_prepare.py` — one-line fix at line ~504
- `output/production/Prins_August_UV_update_2/normalized.fbx` — rebuilt
- `output/production/sittvagn/normalized.fbx` — rebuilt

---

## Phase B — Material Pipeline Integration Points

**Complete — 2026-06-18**

### Goal

Add hooks to `production_prepare.py` so that when Material Intelligence produces
`material_assignments.json`, the pipeline can apply library material names automatically during
export — without rebuilding the integration from scratch.

### What was added

**`apply_material_assignments(assignments_path)`** in `production_prepare.py`:
- Reads `material_assignments.json` from the given path (or default pipeline root location)
- Maps material slot names in the Blender scene → library material IDs
- Renames matching materials before FBX export
- No-op if the file doesn't exist — fully backwards-compatible

**`apply_scene_semantics(semantics_path, assignments_path)`** in `production_prepare.py`:
- Dormant stub for the scene classifier sprint
- Defines the call signature for reading `scene_semantics.json` + `material_assignments.json`
  together (object-level semantic assignment)
- Returns 0 until the classifier is implemented

### Interface contract

- Pipeline reads `material_assignments.json` from: `{pipeline_root}/material_assignments.json`
  (override via `--material-assignments <path>` CLI flag — to be added in a future sprint)
- `scene_semantics.json` location: `{output_dir}/scene_semantics.json` (per-model, produced by
  classifier)
- Both files are optional — pipeline runs without them

### Acceptance criteria

- [x] `apply_material_assignments()` function added to `production_prepare.py`
- [x] `apply_scene_semantics()` stub added with documented interface
- [x] Both are no-ops when files are absent (backwards-compatible)
- [x] Schema stubs at `schemas/scene_semantics.json` and `schemas/material_assignments.json`

### Files modified

- `blender/production_prepare.py` — two new functions added before `export_fbx()`

---

## Phase C — Material Slot → AW Library Mapping

**Complete — 2026-06-18**

### Goal

For each of the 14 material slots across the 5 SJ models, propose an AW library material class.
This is the bridge document between current pipeline output and future Material Intelligence.

### Acceptance criteria

- [x] All 14 slots mapped to proposed AW library material classes
- [x] `reports/material_slot_mapping.md` written
- [x] Mappings are proposals — Material Intelligence will validate and refine

### Files created

- `reports/material_slot_mapping.md`

---

## Sprint 27 Complete — 2026-06-18

### Summary of all Unity verdicts (post-sprint)

| Model | Verdict | Root Scale | Non-Unit Scales | Warnings |
|-------|---------|------------|-----------------|---------- |
| X2000 | MINOR_FIX | (1,1,1) ✓ | 7 | many_renderers, suspicious_default_names |
| SJ Ro3 b4 | MINOR_FIX | (1,1,1) ✓ | 10 | suspicious_default_names |
| bc011032 | MINOR_FIX | (1,1,1) ✓ | 95 | suspicious_default_names |
| Prins August | MINOR_FIX | **(1,1,1) ✓** | **0** | default_material_names (`lambert7`) |
| sittvagn | **PASS** | **(1,1,1) ✓** | **0** | none |

### Open items for next sprint

1. **Rename `lambert7`** in Prins August source — the only remaining placeholder material.
2. **bc011032 non-unit child scales** (95 objects) — freeze-transform pass in Maya/Blender.
3. **X2000 artist cleanup** — rename, freeze transforms, assign production materials, exterior.
4. **Build scene classifier** — produce `scene_semantics.json` per model.
5. **Populate `material_assignments.json`** — as Material Intelligence outputs library IDs.

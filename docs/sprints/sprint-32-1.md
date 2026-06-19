# Sprint 32.1 — X2000 Raw Source Re-run + Input Guard

_Status: Complete_  
_Date: 2026-06-19_  
_Parent sprint: Sprint 32 (bounds regression fix)_

---

## Goal

Fix the Sprint 32 Unity bounds regression (16.94 m height) by re-running the production pipeline
from the original raw Maya FBX and preventing double-processing from recurring via an input guard.

---

## Acceptance Criteria

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Input guard detects and rejects normalized FBX input | ✓ Guard implemented; exits 2 with clear message |
| 2 | Pipeline ran on `input/X2000_prod.fbx` only | ✓ Raw Maya FBX used as sole source |
| 3 | `material_assignments.json` consumed via `slot_renames` | ✓ 3 renames: raw Maya → production names |
| 4 | Material slots renamed correctly in Unity | ✓ `laminate_wall_cream`, `plastic_interior_gray`, `x2000_glass` |
| 5 | PBR maps packaged beside FBX | ✓ 11 files |
| 6 | Unity bounds height regression gone | ✓ 4.565 m (was 16.94 m) |
| 7 | Model not floating 12.5 m above floor | ✓ max_y = 3.808 m |
| 8 | Root transform stable | ✓ position/rotation/scale at identity |
| 9 | Mesh count stable | ✓ 1,133 |
| 10 | Import verdict MINOR_FIX or better | ✓ MINOR_FIX |

---

## What was built

### 1. Input guard (`production_prepare.py`)

`_NORMALIZED_FBX_MARKERS` — list of byte strings that appear in pipeline-normalized FBX files
but never in raw artist exports (e.g. `b"laminate_wall_cream"`).

`check_normalized_fbx(fbx_path)` — reads the first 20 MB of the FBX binary and returns any
markers found. Empty list = clean raw source. Non-empty = reject.

Guard call at the top of `main()`: if any markers found, prints a fatal message to stderr with
the list of found markers and the correct source path (`input/X2000_prod.fbx`), then exits 2.

### 2. `slot_renames` support (`production_prepare.py`, `material_assignments.json`)

`apply_material_assignments()` extended with a `slot_renames` pre-pass: reads a new top-level
`slot_renames` dict from `material_assignments.json` and applies direct string → string material
renames before the semantic `assignments` lookup.

`material_assignments.json` updated with:
```json
"slot_renames": {
    "openPBR_shader1": "laminate_wall_cream",
    "standardSurface1": "plastic_interior_gray",
    "Default_Material": "x2000_glass"
}
```

This collapses the Sprint 23 + Sprint 30 two-step rename chain into a single direct mapping from
raw Maya shader names to production names.

### 3. Pipeline re-run

Pipeline ran on `input/X2000_prod.fbx` (raw Maya FBX, no production-name markers). Three renames
applied. 1,133 meshes exported. Output copied to `AssetWizardTest/Assets/AssetWizardValidationModels/X2000.fbx`.

---

## Unity validation results

Run: Unity 6000.0.29f1 batch mode with `-assetWizardValidate Assets/AssetWizardValidationModels/X2000.fbx`.

| Metric | Sprint 32 (regression) | Sprint 32.1 |
|--------|------------------------|-------------|
| Height | 16.94 m | **4.565 m** ✓ |
| Max Y | 17.07 m | 3.808 m ✓ |
| `plausibly_train_sized` | false | **true** ✓ |
| Materials | 3 correct | 3 correct ✓ |
| Mesh count | 1,132 | 1,133 ✓ |
| Root transform | identity | identity ✓ |
| Verdict | MINOR_FIX | MINOR_FIX ✓ |

---

## Known gaps

**Floor alignment**: `min_y = −0.757 m`. `scene_bbox` uses stale `Object.bound_box` for mesh
objects under 0.01-scale EMPTY parents (raw Maya FBX structure), causing an under-estimate of
the true lowest Z. `translate_roots` applies a smaller-than-correct floor offset. Height is
correct; only the floor contact point is off. Fix: use evaluated depsgraph in `scene_bbox`.

**Texture connection**: Texture files present in Unity project but not auto-wired to material
properties by batch FBX import. Requires a Unity Editor script.

---

## Report

`reports/x2000_raw_source_material_pipeline_validation.md`

---

## Carry-forward

| Item | Priority |
|------|---------|
| Fix `scene_bbox` stale bound_box (use evaluated depsgraph) | P1 |
| Unity Editor script: auto-wire textures from material.json | P2 |
| Real PBR maps for X2000 (artist pass) | P1 delivery blocker |
| Re-run Codex bridge with Sprint 31 semantic graph | P2 |

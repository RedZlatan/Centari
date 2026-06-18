# Sprint 28 — PBR Map Pipeline Preparation

_Status: Complete_
_Date: 2026-06-18_

---

## Goal

Prepare the Asset Wizard production pipeline to receive PBR texture maps from Material Workers.
Define the expected per-material output folder structure, add non-destructive map collection and
packaging functions to the pipeline, create test fixtures, and verify Unity sees textures beside
the imported model with no regressions.

**Out of scope**: classifier logic, texture generation, worker modifications.

---

## Acceptance Criteria

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Per-material folder structure defined | ✓ |
| 2 | `collect_material_maps()` added to pipeline | ✓ |
| 3 | `package_material_maps()` added to pipeline (non-destructive) | ✓ |
| 4 | Test fixtures created for sittvagn (fabric_curtain, painted_metal, interior_trim) | ✓ |
| 5 | Unity sees correct material slot names | ✓ fabric_curtain, interior_trim, painted_metal |
| 6 | Texture files present in Unity project alongside FBX | ✓ 30 assets (15 + .meta) |
| 7 | No geometry or scale regression | ✓ PASS — same dims, root_scale=(1,1,1) |

---

## Defined Folder Structure

Material Workers must write to:

```
output/production/<model>/materials/<material_id>/
    albedo.png
    normal.png
    roughness.png
    metallic.png
    material.json
```

`production_prepare.py` collects anything present in that tree and copies it flat beside
the exported FBX:

```
output/production/<model>/
    normalized.fbx
    <material_id>_albedo.png
    <material_id>_normal.png
    <material_id>_roughness.png
    <material_id>_metallic.png
    <material_id>_material.json
```

The flat layout makes Unity auto-discovery possible: textures in the same directory as an
imported FBX appear as sibling assets in the project.

---

## Pipeline Changes

**`blender/production_prepare.py`** — two new functions in the "PBR map collection" section:

- **`collect_material_maps(out_dir)`**: scans `out_dir/materials/` for subdirectories,
  returns `{material_id: {map_type: abs_path}}` for every file found. No-op if the
  directory does not exist (pre-worker models pass through unchanged).

- **`package_material_maps(out_dir, material_maps)`**: copies each discovered map file
  flat alongside the FBX using `<material_id>_<map_type>.png` naming. Non-destructive:
  existing destination files are skipped.

Both functions are called in `main()` immediately after the FBX export. Their results are
included in `production_data.json` and the stdout JSON summary:

```json
{ "material_maps_found": 3, "packaged_map_files": 15 }
```

---

## Test Fixtures

`tools/create_test_material_fixtures.py` generates minimal 1×1 PNG placeholders and
`material.json` for each of sittvagn's three material IDs:

| Material ID | Albedo colour | Represents |
|-------------|--------------|------------|
| `fabric_curtain` | (160, 80, 70) muted red-brown | Period curtain fabric |
| `painted_metal` | (100, 100, 110) dark grey | Painted body surface |
| `interior_trim` | (90, 60, 50) dark upholstery | Seat / trim fabric |

Fixtures live in `output/production/sittvagn/materials/` (gitignored output path).
The generator script is committed to `tools/`.

---

## Unity Validation (Sprint 28)

_Model: sittvagn. Unity 6000.0.29f1, URP._

| Property | Value |
|----------|-------|
| Verdict | **PASS** |
| root_scale | (1.0, 1.0, 1.0) |
| Dimensions (W×H×L) | 0.989 × 1.272 × 2.677 m |
| Material slots | fabric_curtain, interior_trim, painted_metal |
| Missing slots | 0 |
| Texture files in project | 30 (15 assets + .meta each) |
| Texture wiring | [] — files present, wiring is Material Worker's task |
| Warnings | none |

---

## What This Enables

Material Workers can now:

1. Write PBR maps to `output/production/<model>/materials/<material_id>/`
2. Trigger a pipeline rebuild
3. Find packaged textures alongside the FBX in the Unity project
4. Assign maps to URP/Lit material slots

The `material.json` per material provides the shader type and map filenames as a contract
between the worker and the Unity material setup step.

---

## Carry-forward

| Item | Notes |
|------|-------|
| Wire textures to URP/Lit material slots | Material Worker task — pipeline makes files available |
| Rename `lambert7` in Prins August source | Only remaining placeholder material name |
| bc011032 freeze-transform pass (95 objects) | Next geometry cleanup sprint |
| X2000 artist cleanup | Rename, freeze, exterior, production materials |
| Build scene classifier | Produce `scene_semantics.json` per model |

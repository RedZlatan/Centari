# Production Bundle Specification

_Version: 1.0_
_Date: 2026-06-18_
_Status: Approved for Sprint 30+_

---

## Overview

A **production bundle** is the complete, deliverable output of the Asset Wizard pipeline for one
model. It defines exactly what a finished delivery looks like: the geometry, material data,
semantic analysis, and texture maps packaged for Unity consumption.

This document is the interface contract between the Asset Wizard pipeline and downstream systems
(Unity project, Material Workers, QA automation).

---

## Bundle Layout

```
output/production/<model>/
│
├── normalized.fbx                    ← Unity-ready geometry export
├── production_data.json              ← Full pipeline run data (source of truth)
│
├── material_assignments.json         ← Slot → library material ID mapping
├── semantic_graph.json               ← Semantic analysis of mesh clusters
├── material_recommendations.json     ← Worker Program 3 output
│
├── materials/                        ← Per-material PBR map source (worker writes here)
│   └── <material_id>/
│       ├── albedo.png
│       ├── normal.png
│       ├── roughness.png
│       ├── metallic.png
│       ├── ao.png
│       └── material.json
│
├── <material_id>_albedo.png          ← Packaged flat (pipeline copies from materials/)
├── <material_id>_normal.png
├── <material_id>_roughness.png
├── <material_id>_metallic.png
├── <material_id>_ao.png
├── <material_id>_material.json
│
└── validation_report.json            ← Unity batch validation output
```

---

## File Definitions

### `normalized.fbx`

**Produced by**: `blender/production_prepare.py`  
**Unity import scale**: globalScale = 1 (no import scale override required)  
**Axis convention**: FBX_SCALE_ALL, `-Z Forward, Y Up`, UnitScaleFactor = 1 (cm convention)  
**Material slots**: renamed to `library_material_id` values from `material_assignments.json`

Requirements:
- Root scale = (1, 1, 1) at Unity import
- Physical dimensions match source model
- All material slots named (no Maya defaults like `lambert7`, `standardSurface1`)
- No hidden objects that break hierarchy (pipeline unhides, bakes, re-hides)

### `production_data.json`

**Produced by**: `blender/production_prepare.py`  
**Schema**: internal — see `blender/production_prepare.py` → `report` dict  
**Contains**: pre/post bbox, scale estimate, per-object data, material inventory, naming audit,
movable parts, hidden geometry, unity readiness score, material_maps summary

This is the pipeline's internal audit trail. Downstream tooling should read this for provenance,
not for delivery.

### `material_assignments.json`

**Produced by**: Worker Program 1–3 + Codex assignment bridge  
**Consumed by**: `production_prepare.py` (material rename pass)  
**Schema**: `schemas/material_assignments.json`  

```json
{
  "_meta": {
    "schema_version": "1.0",
    "model": "<model>",
    "generated": "<ISO date>",
    "producer": "worker_program_v1 + codex_bridge"
  },
  "assignments": {
    "<current_slot_name>": {
      "library_material_id": "<aw_catalog_id>",
      "fallback_material_id": "<aw_catalog_id | null>",
      "confidence": 0.0–1.0,
      "dominant_semantic_class": "<class>",
      "required_maps": ["albedo", "normal", "roughness", "metallic", "ao"]
    }
  }
}
```

Lookup order: `output/production/<model>/material_assignments.json` (per-model) takes priority over
`material_assignments.json` in the pipeline root (global fallback).

### `semantic_graph.json`

**Produced by**: `worker/semantic_group_resolver.py`  
**Consumed by**: Codex assignment bridge, QA  

Contains the resolved semantic groups (panel, seat, window, curtain, door, fastener_or_detail)
with mesh membership and confidence. Used to explain WHY a material was assigned to a slot.

### `material_recommendations.json`

**Produced by**: `worker/material_recommendation_worker.py`  
**Consumed by**: Codex assignment bridge  

Catalog-grounded probability distributions over material families per semantic class. This is
the direct precursor to `material_assignments.json`.

### `materials/<material_id>/` — Worker output (source)

**Written by**: Material Workers (fabric_worker, edge_wear_worker, future workers)  
**Read by**: `package_material_maps()` in production_prepare.py  

Each subdirectory is named after the `library_material_id` (from `material_assignments.json`).
Workers write to this directory; the pipeline packages it. Source files are kept here for
re-packaging without re-running workers.

**Required files per material** (all are optional — pipeline packages what exists):

| File | Purpose | URP/Lit input |
|------|---------|---------------|
| `albedo.png` | Base colour | Base Map |
| `normal.png` | Tangent-space normal | Normal Map |
| `roughness.png` | Perceptual roughness (greyscale) | Smoothness (inverted) |
| `metallic.png` | Metallic mask (greyscale) | Metallic Map |
| `ao.png` | Ambient occlusion (greyscale) | Occlusion Map |
| `material.json` | Shader hints and metadata | — |

**`material.json` schema**:
```json
{
  "material_id":    "<string>",
  "material_class": "<string>",
  "shader":         "UniversalRenderPipeline/Lit",
  "maps":           { "albedo": "albedo.png", ... },
  "notes":          "<string>",
  "placeholder":    true | false
}
```

### Packaged flat textures (`<material_id>_<map>.png`)

**Produced by**: `package_material_maps()` in production_prepare.py  
**Layout**: flat in `output/production/<model>/` alongside `normalized.fbx`  
**Naming**: `<material_id>_<map_type>.png` (e.g. `laminate_wall_cream_albedo.png`)  
**Non-destructive**: existing files are never overwritten on re-package

These files are what gets copied to the Unity project. Unity sees them as sibling assets to the
FBX and makes them available for material slot assignment.

### `validation_report.json`

**Produced by**: `AssetWizard.Validation.ImportValidator.ValidateCommandLineModels` (Unity batch)  
**Schema**: Unity C# `ValidationReport` — see `ImportValidator.cs`  

Contains: root_scale, renderer_bounds (W×H×L), material_names, missing_slots, warnings, verdict.

**Acceptance criteria for a finished bundle**:

| Property | Requirement |
|----------|-------------|
| verdict | PASS or MINOR_FIX |
| root_scale | (1.0, 1.0, 1.0) |
| missing_material_slots | 0 |
| default_or_placeholder_materials | [] |
| non_unit_scale_objects | 0 (PASS) or documented (MINOR_FIX) |

---

## Bundle Completeness Matrix

A bundle is INCOMPLETE if any of these files are missing:

| File | Required | Notes |
|------|----------|-------|
| normalized.fbx | ✓ always | Core deliverable |
| production_data.json | ✓ always | Pipeline audit |
| material_assignments.json | ✓ always | Even if no renames (empty assignments {}) |
| validation_report.json | ✓ always | Must be fresh (post-material-rename build) |
| semantic_graph.json | ✓ when Worker Program has run | Optional for pre-pipeline assets |
| material_recommendations.json | ✓ when Worker Program has run | Optional for pre-pipeline assets |
| materials/ textures | Optional | Absent = materials not yet generated |
| packaged flat textures | Auto-generated | Present if materials/ has content |

---

## Delivery Checklist

Before a bundle is considered production-ready:

- [ ] `normalized.fbx` exists and is < 30 days old
- [ ] `validation_report.json` verdict is PASS or MINOR_FIX
- [ ] `validation_report.json` `missing_material_slots = 0`
- [ ] `validation_report.json` `default_or_placeholder_materials = []`
- [ ] `material_assignments.json` exists and all slot keys map to non-null `library_material_id`
- [ ] `semantic_graph.json` exists (or model is pre-Worker-Program and explicitly waived)
- [ ] Flat packaged textures present for each material in `material_assignments.json`
- [ ] `ao.png` present for each non-transparent material

---

## Bundle Status by Model (Sprint 30 baseline)

| Model | normalized.fbx | material_assignments | semantic_graph | materials/ | validation | Status |
|-------|---------------|---------------------|----------------|------------|------------|--------|
| X2000 | ✓ | ✓ (auto-generated) | ✓ | ✗ (no maps yet) | MINOR_FIX | Incomplete — maps pending |
| sittvagn | ✓ | ✓ (integration test) | ✗ (not run) | ✓ (3 materials, placeholder) | PASS | Near-complete — real maps pending |
| SJ Ro3 b4 | ✓ | ✗ | ✗ | ✗ | MINOR_FIX | Incomplete — material pipeline not started |
| Prins August | ✓ | ✗ | ✗ | ✗ | MINOR_FIX | Incomplete — lambert7 rename blocking |
| bc011032 | ✓ | ✗ | ✗ | ✗ | MINOR_FIX | Incomplete — 95 non-unit-scale objects |

---

## Open Issues

| Issue | Blocking | Assignee |
|-------|---------|---------|
| `mesh_inventory_adapter` captures pre-normalisation data (cm-scale outliers in X2000 clusters) | No (quality) | Pipeline sprint |
| `lambert7` placeholder material name in Prins August | Yes (delivery blocker) | Artist |
| bc011032 freeze-transform pass (95 non-unit objects) | Yes (MINOR_FIX → PASS) | Pipeline sprint |
| Material Workers have not generated real PBR maps for any model | Yes (delivery) | Workers + Material Intelligence |
| X2000 semantic_graph excludes 35 cm-scale clusters — seat/panel counts are underestimates | No (quality) | Mesh inventory sprint |

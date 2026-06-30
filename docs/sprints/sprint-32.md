# Sprint 32 — X2000 Production Material Pass

_Status: Complete (with known regression — see Bounds below)_  
_Date: 2026-06-19_

---

## Goal

Run the full production pipeline on X2000 using Worker Program–generated material assignments
and library PBR maps. Prove the chain from raw production model to Unity-ready delivery bundle.

---

## Acceptance Criteria

| # | Criterion | Result |
|---|-----------|--------|
| 1 | `production_prepare.py` rebuilt X2000 with latest pipeline | ✓ Sprint 31 rev (post-norm snapshot included) |
| 2 | `material_assignments.json` consumed without manual edits | ✓ no-op rename (source already had renamed slots) |
| 3 | Material slots renamed/confirmed in FBX | ✓ `laminate_wall_cream`, `plastic_interior_gray`, `x2000_glass` |
| 4 | PBR maps packaged beside FBX | ✓ 11 files |
| 5 | Imported into Unity | ✓ 1,132 renderers, 3 materials |
| 6 | Unity Validation Toolkit run | ✓ MINOR_FIX verdict |
| 7 | Report written | ✓ `reports/x2000_full_material_pipeline_validation.md` |

---

## What passed

- **Material slot names**: all 3 production names present in Unity, 0 missing slots.
- **Root transform**: position (0,0,0), rotation (0,0,0), scale (1,1,1) — stable.
- **Mesh count**: 1,132 — no geometry regression.
- **PBR maps**: 11 files (albedo/normal/roughness/metallic × 2 + 3 material.json) delivered.
- **Hierarchy**: depth 1, 1,206 transforms, 73 empty transforms — unchanged from baseline.
- **Non-unit scales**: 7 pre-existing pCube hidden markers — no new offenders.

---

## Bounds regression

**Unity bounds height = 16.94 m** (baseline Sprint 30: 4.57 m). **Verdict: MINOR_FIX instead of PASS.**

Root cause: the pipeline was run on the Sprint 30 normalized FBX (already processed once).
When Blender re-imports a normalized FBX with UnitScaleFactor=1, object pivots are in cm-unit scale
while vertex data is scaled by 0.01. The combination produces an apparent scene Z extent of
−12.5 m to +12.19 m in Blender world-space. `translate_roots` applies dz=+12.5 m, floating the
carriage body 12.5 m above the nominal floor geometry. Unity sees height = 16.94 m.

**Fix**: pipeline must run on a raw (un-normalized) artist FBX. Guard needed to detect and reject
normalized FBX as input.

---

## Texture connection status

Texture files are present in the Unity project and imported correctly. However Unity's batch FBX
import does not auto-wire texture files to material properties — `textures: []` in validation
output is expected at this stage. Manual wiring (or a Unity Editor script) is the next step.

---

## Carry-forward

| Item | Priority |
|------|---------|
| Re-run pipeline on original `X2000_prod.fbx` to fix bounds | P1 |
| Pipeline guard: detect normalized FBX re-import → warn/abort | P1 |
| Unity Editor script: auto-wire textures to material slots from `material.json` | P2 |
| Real PBR maps for X2000 (artist pass) | P1 delivery blocker |
| Re-run Codex bridge with Sprint 31 semantic graph | P2 |

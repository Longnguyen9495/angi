# Garden model export (Three.js → GLB)

- Generated 2026-10-01 by `node scripts/export-garden-glb.mjs`, which renders the React Three Fiber
  components of `src/features/garden3d/scene/` (Island, Buildings, bed geometry, CropModel, Sky
  clouds) in headless Chrome/Edge and exports them with three's GLTFExporter
  ([scripts/garden-export/main.tsx](../../../../scripts/garden-export/main.tsx)).
- Instanced trees, rocks, tufts and flowers are baked into plain meshes, one mesh per material.
  Shader-only effects (wind sway, procedural surface detail) are not part of the files.
- Then quantized with `KHR_mesh_quantization` (`scripts/quantize-glb.mjs`; int16 positions and
  normals, uint8 colours): 12.7 → 7.5 MB, max position error 0.6 mm, normals 0.02°.
  `plot-soil.glb` stays float (the Editor puts its render asset straight on `soil` entities).
- Licence: original work generated from this repository's code, **CC0-1.0** like the farm pack
  ([../SOURCE.md](../SOURCE.md)). No third-party meshes or images.
- Pieces, triangles and bytes: [manifest.json](manifest.json). Scene pieces total 94,224 triangles;
  crops `crops/crop-{crop}-{stage}.glb` (40 files) are loaded by the PlayCanvas engine at runtime
  for scene corners.

# corner-v3: PlayCanvas Editor export

- Exported: 2026-10-01, build 71668 ("corner-v3-garden-q-2026-10-01").
- Project `angi-farm-corner` (id 1610400), scene `corner` (id 2608607), engine 2.22.6.
- Editor checkpoint: "corner v3: garden3d parity with quantized GLBs (plot-soil float)".
- Pruned with `node scripts/prune-scene-export.mjs <extracted-build> corner-v3`: 65 of 365 project
  assets kept (only what enabled entities use), 9,294,687 bytes. See [files.json](files.json).
- Enable in the app: `?renderer=playcanvas&scene=corner-v3`. Preview without the journey:
  `node scripts/preview-farm-pc.mjs corner-v3 storage/preview.png`.

## Contents

The island, buildings, beds and clouds are the Three.js garden (`src/features/garden3d`) exported
as GLB by `node scripts/export-garden-glb.mjs` (see [../../models/farm/garden/SOURCE.md](../../models/farm/garden/SOURCE.md)),
placed in the Editor at the garden's layout (`src/features/garden3d/layout.ts`):
barn (-5.2, -2.6, 36°), kitchen (0, -5.3), well (4.9, -1.9, -25.7°), coop (-5.1, 3.1, 56.3°),
pen (5.0, 3.2, -51.4°), plots 1–9 at `plotPosition(i)`. Gameplay names follow
`src/features/farm-pc/naming.ts`; `barn-door` is kept (empty) for the convention, the barn model has
its door painted in. The earlier corner geometry stays in the scene, disabled, for rollback.

| Source | Licence |
|---|---|
| Garden models (island, buildings, beds, clouds, islets) | Original, generated from this repo's code (CC0-1.0, as the farm pack) |
| `leafy_grass_*`, `sky_backdrop` textures (from corner v1) | Poly Haven, CC0 |
| `farm-motion.mjs` script metadata | Original (`src/features/farm-pc/scripts/motion.ts`); the host never runs exported code |

## Size

9.3 MB uncompressed, 8.2 MB of it GLB geometry (island alone 4.5 MB). The Editor re-encodes
uploaded GLBs as float, so the quantized uploads do not shrink this build. Brotli brings the
payload to about 2.5 MB, but `.glb` files are not precompressed or compressed by the current
deploy config (only `dist/assets` text files are). Over the 3 MB target until that changes.

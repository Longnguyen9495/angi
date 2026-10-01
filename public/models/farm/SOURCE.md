# Original local corner asset pack

- Author: Zoo (AI-assisted original mesh and raster-motif authoring for angi), 2026-09-30.
- Provenance: authored from scratch in [generator](../../../scripts/generate-farm-models.mjs). No downloaded mesh, photo, asset library or third-party image used in this pack. Existing props subdirectory is separate and retains its original provenance in the project manifest.
- Explicit licence: **CC0 1.0 Universal (CC0-1.0)**. To the extent copyright exists, the author dedicates the original meshes, atlas, generator and this pack to the public domain under https://creativecommons.org/publicdomain/zero/1.0/ ; commercial use, modification and web redistribution permitted. No attribution required. No claim of exclusive human authorship.
- Files: barn, tree-broadleaf, bed, path-stones, and 40 crop GLBs (rice, herbs, chili, scallion, bean, tomato, lemongrass, garlic, cucumber, lime × sprout, young, flowering, ready). Atlas is original 512×512 PNG, embedded in every GLB for independent upload; external copy provided for inspection.
- Rebuild offline: run the generator with Node from repo root. No dependency installation or runtime dependency added. Measurements in [metrics](metrics.json) are tested against actual GLB accessors and byte lengths by [test script](../../../scripts/test-farm-models.mjs).

## Upload / placement handoff

Metres, +Y up, front +Z; no scale or rotation on nodes. Barn is 2.6 m wide, 2 m deep, ridge approximately 2.7 m; position and rotate its root using existing BARN layout. Keep barn-hit unchanged. barn-door is a separate root node at (-0.45, 0.16, 1.06), geometry x ≥ 0: pivot is the left edge. Bind that node to the existing named door entity; avoid introducing two animated doors.

Tree root is at ground contact. Five separately named folded-leaf card clusters and branching tapered trunk; cards use opaque two-sided material, actual cut silhouette, not an alpha square or sphere canopy. Bed is a nine-cell frame (~3.98×3.98 m) with soil furrows and corner stakes, no crop meshes; place at BED centre. Crop roots sit at soil origin; scale consistently and attach to the existing crop entities (not gameplay hit targets). Path mesh uses world-space layout coordinates, including an eighth final step toward the barn; place root at world origin, not barn origin. Ground and contact shadow are out of this task.

## Measured verification (2026-09-30)

| Model | Actual triangles | Budget | GLB bytes |
|---|---:|---:|---:|
| Barn including separate door | 2042 | 6000 | 348812 |
| Broadleaf tree | 792 | 4000 | 232292 |
| Empty nine-cell bed | 300 | 2500 | 180872 |
| Eight path stones | 168 | 1200 | 168328 |
| Each of 40 crops | 12–672 | 800 | 153344–216680 |

All 44 GLBs total **7,786,316 bytes**, excluding the external 150,655-byte atlas copy. This standalone upload pack exceeds the scene-export target of 3 MB: embedded atlas duplication is the main cost. It is not a measured final Editor scene build; deduplicate atlas and optimise before publishing.

Passed: all 44 binary headers/accessors/buffer bounds, exact 40 crop filenames, actual triangle budgets and bytes, embedded PNG dimensions, separate door pivot at left edge, five leaf clusters, no crops in bed, geometry import with Three GLTFLoader (image decoding deliberately skipped), byte-identical SHA256 after regeneration; targeted ESLint, Prettier, TypeScript typecheck and direct Vite production build. Vite warns about existing large chunks and browser-externalised worker module.

Existing project asset Vitest suite failed before any test ran: current-suite initialisation error in test setup. Not fixed in this asset-only task. No full application test run, browser PNG/material decode, Khronos validator, Editor import or render acceptance was performed. Direct Vite build intentionally bypassed the package build command's catalogue export step.

## Continuation measurements (2026-09-30)

A separate [optimised pack](optimized/metrics.json) was produced by [offline tooling](../../../scripts/optimize-farm-pack.mjs). Originals are unchanged. The 44 GLBs reference one shared external PNG using standard glTF 2.0, with no optional WebP extension. Measured geometry GLBs: **1,154,584 bytes**; shared atlas: **150,655 bytes**; combined payload: **1,305,239 bytes** (excluding this report and metrics). This is a local asset payload, **not** a downloaded Editor scene/build measurement. Editor import, related-file resolution and texture deduplication remain unverified.

The 172-entity response-10 snapshot was reconstructed using real PlayCanvas GraphNode instances and checked with the project's actual validateCorner for plots 1–9: no missing required names; warnings for fx-water, fx-dust and fx-sparkle. Result is saved in storage/playcanvas-mcp/validation-before.json. It is a pre-edit snapshot check, not live runtime validation.

Local motion changes cancel in-flight pop on reduced motion and pool separate particle emitters per plot; template autoplay and emitter looping are disabled. Project TypeScript build-mode check and targeted ESLint passed. Added null-device regression test is not yet executed: Vitest still fails in src/test/setup.ts before collecting tests. Multi-plot particles, destruction and Editor script parsing are not runtime-verified.

Queue request 12 selects the existing game Camera by ID only, without changing its transform. No response-12 was present during repeated checks; request 8 also has no recorded response. The existing MCP session was not restarted, and dependent screenshot/upload/scene mutation/export requests were not dispatched without confirmation. No BEFORE/AFTER images or fresh scene export were produced by this continuation.

## Fix (2026-10-01): path-stone winding

Path stones rendered black in the Editor game camera: their top and side triangles were wound clockwise, so the stored normals pointed down/inwards and the sun never lit them. The generator now winds them counter-clockwise; only `path-stones.glb` (and its optimised copy) changed, same 168 triangles and byte size. A normal audit of all 44 GLBs found winding consistent with normals everywhere; blade crops face up/inwards as expected for outward-leaning leaves. The Editor source of `path-stones.glb` (asset 309298361) was replaced and re-captured through the game camera.

## Acceptance status / known limitations

Local geometry delivery, **not art sign-off**. Custom silhouette geometry is authored (curved overlapping tile courses, individual boards, braced hinged door, branches, folded leaves, crop blades, pods, fruit and flowers); low-poly helper cross sections are used as modelling tools, not exported bare primitive placeholders.

No Editor upload, game-camera capture, reference comparison or phone render/FPS measurement has been performed. Check canopy gaps, two-sided lighting, crop recognisability at phone size, wood UV seam repetition, soil normals, tile thickness at eaves, door clearances and final scale before art approval. Atlas uses simple hand-coded motifs, not painterly brushwork; sign is decorative marks, not Vietnamese lettering. Rice grains are deliberately sparse to meet budget. Herbs represent a generic leafy herb; lime flowering uses a stylised pale flower and ready green fruit. No baked AO/contact shadows. Each standalone GLB duplicates the atlas; upload may deduplicate texture manually in Editor. No loader/engine integration is included and running app still uses its existing assets until parent integrates.

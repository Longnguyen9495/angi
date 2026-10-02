# Updated reference add-on — Colorful Floating Farm

## Files
- `MASTER_REFERENCE_COLORFUL_FLOATING_FARM.png`: the newly supplied floating-island farm reference. Use this as the primary composition/style reference for this version.
- `GENERATED_FARM_ASSET_SPRITE_SHEET.png`: generated visual asset collage/sprite-sheet concept containing buildings, plants, crops, animals, water effects, island pieces, clouds, birds, leaves and particles. Treat it as a visual reference sheet, not a perfectly segmented production sprite atlas; some items may touch or have checkerboard artifacts and must be inspected/cut out/refined before use.

## Required workflow for Claude / PlayCanva
1. Inspect the existing V4 pack and this new reference add-on.
2. Prefer the newly supplied colorful farm image for overall composition and visual direction.
3. Do not use the full image as the only background. Recreate the scene from independently controllable objects/layers.
4. Use the sprite sheet as a guide to create/refine individual assets; do not assume every item is already a clean transparent sprite.
5. Build an animation-only demo first at a local route such as `/farm-animation-test`. No backend or full gameplay is required for this phase.
6. Animate each item independently: windmill blades, smoke, trees/leaves, grass, flowers, crops, cow, chickens, pond ripples, fish, clouds, birds, butterflies and particles.
7. Keep the existing website architecture intact; inspect before editing and do not rewrite the whole site.

## Important limitation
The source reference is a static image. It does not contain real animation frames or independently separated alpha layers. Any extracted/cropped objects are starting points and may need cleanup or recreation before production use.

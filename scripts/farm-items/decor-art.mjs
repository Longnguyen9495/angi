import sharp from 'sharp';
import { join } from 'node:path';

/*
 * Garden decorations as the painted farm shows them: each picture trimmed of its empty margin
 * and scaled to its spot's width (×2 for sharp screens) into public/farm-anim/decor-<id>.webp;
 * the six from the V4 sprite pack also get their market picture in public/images/garden.
 * Spots and widths: src/features/farm-anim/decorSpots.ts. Run: node scripts/farm-items/decor-art.mjs
 */

const ROOT = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const V4 = join(ROOT, 'assets/farm/pack-v4-sprites');
const GARDEN = join(ROOT, 'public/images/garden');
const FARM = join(ROOT, 'public/farm-anim');

// id: [source, width on the picture]
const DECOR = {
  scarecrow: [join(GARDEN, 'decor-scarecrow.webp'), 46],
  lantern: [join(GARDEN, 'decor-lantern.webp'), 26],
  jar: [join(GARDEN, 'decor-jar.webp'), 34],
  fence: [join(GARDEN, 'decor-fence.webp'), 84],
  barrel: [join(V4, 'buildings_and_props/sprite_008.png'), 44],
  cart: [join(V4, 'trees_water_animals/sprite_125.png'), 72],
  haybale: [join(V4, 'trees_water_animals/sprite_126.png'), 50],
  haystack: [join(V4, 'buildings_animals_props/sprite_038.png'), 66],
  flowers: [join(V4, 'trees_water_animals/sprite_139.png'), 58],
  rocks: [join(V4, 'trees_water_animals/sprite_153.png'), 66],
};
const FROM_PACK = ['barrel', 'cart', 'haybale', 'haystack', 'flowers', 'rocks'];

for (const [id, [src, width]] of Object.entries(DECOR)) {
  const trimmed = await sharp(src).trim({ threshold: 1 }).png().toBuffer();
  await sharp(trimmed)
    .resize({ width: width * 2 })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(join(FARM, `decor-${id}.webp`));
  if (FROM_PACK.includes(id))
    await sharp(trimmed)
      .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90, alphaQuality: 100 })
      .toFile(join(GARDEN, `decor-${id}.webp`));
}
console.log('decor art written');

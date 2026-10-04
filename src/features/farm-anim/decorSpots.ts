import type { DecorId } from '../../data/types';

/**
 * Where each garden decoration stands on the painted farm: picture px, the foot's centre
 * (x, y) and the width it is drawn at (its height follows the picture). Chosen on open grass
 * clear of paths and buildings; the pictures come from scripts/farm-items/decor-art.mjs.
 */
export const DECOR_SPOTS: Record<DecorId, { x: number; y: number; w: number }> = {
  scarecrow: { x: 881, y: 400, w: 46 },
  lantern: { x: 722, y: 312, w: 26 },
  jar: { x: 358, y: 352, w: 34 },
  fence: { x: 1470, y: 640, w: 84 },
  barrel: { x: 566, y: 300, w: 44 },
  cart: { x: 1478, y: 520, w: 72 },
  haybale: { x: 1085, y: 478, w: 50 },
  haystack: { x: 1525, y: 445, w: 66 },
  flowers: { x: 1452, y: 568, w: 58 },
  rocks: { x: 170, y: 478, w: 66 },
};

export function decorPicture(id: DecorId): string {
  return `/farm-anim/decor-${id}.webp`;
}

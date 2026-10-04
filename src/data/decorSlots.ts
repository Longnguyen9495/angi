import type { DecorId } from './types';

/**
 * Places on the painted farm a decoration can stand: picture px of the foot's centre, on open
 * grass or the sandy yard, clear of paths, plots, buildings and the pond. The first ten are the
 * decorations' home spots (where a new one appears); the guest moves them between all of them.
 */
export const DECOR_SLOTS: readonly { x: number; y: number }[] = [
  { x: 881, y: 400 },
  { x: 722, y: 312 },
  { x: 358, y: 352 },
  { x: 1470, y: 640 },
  { x: 566, y: 300 },
  { x: 1478, y: 520 },
  { x: 1085, y: 478 },
  { x: 1525, y: 445 },
  { x: 1452, y: 568 },
  { x: 170, y: 478 },
  { x: 128, y: 424 },
  { x: 230, y: 520 },
  { x: 250, y: 385 },
  { x: 455, y: 330 },
  { x: 640, y: 300 },
  { x: 1000, y: 480 },
  { x: 1150, y: 430 },
  { x: 1240, y: 470 },
  { x: 1450, y: 470 },
  { x: 1580, y: 500 },
  { x: 1380, y: 555 },
  { x: 1520, y: 600 },
  { x: 310, y: 270 },
  { x: 1120, y: 385 },
  { x: 1600, y: 420 },
];

/** Where each decoration stands until the guest moves it. */
export const DECOR_HOME: Record<DecorId, number> = {
  scarecrow: 0,
  lantern: 1,
  jar: 2,
  fence: 3,
  barrel: 4,
  cart: 5,
  haybale: 6,
  haystack: 7,
  flowers: 8,
  rocks: 9,
};

/** A decoration's place: a slot, mirrored or not. */
export interface DecorSlot {
  slot: number;
  flip: boolean;
}

/** Owned decorations by where they stand now (missing: home; null: put away in the barn). */
export type DecorSlots = Partial<Record<DecorId, DecorSlot | null>>;

/** Where an owned decoration stands, or null while it is put away. */
export function decorSlot(id: DecorId, slots: DecorSlots): DecorSlot | null {
  const s = slots[id];
  if (s === null) return null;
  return s ?? { slot: DECOR_HOME[id], flip: false };
}

/** Slot → the owned decoration standing on it. */
export function slotsTaken(owned: readonly DecorId[], slots: DecorSlots): Map<number, DecorId> {
  const out = new Map<number, DecorId>();
  for (const id of owned) {
    const s = decorSlot(id, slots);
    if (s) out.set(s.slot, id);
  }
  return out;
}

/** The first free slot, starting from `from` and going `dir` (wraps), or null when all are taken. */
export function freeSlot(
  owned: readonly DecorId[],
  slots: DecorSlots,
  from: number,
  dir: 1 | -1,
): number | null {
  const taken = slotsTaken(owned, slots);
  const n = DECOR_SLOTS.length;
  for (let i = 1; i <= n; i++) {
    const s = (((from + dir * i) % n) + n) % n;
    if (!taken.has(s)) return s;
  }
  return null;
}

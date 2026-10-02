import { t } from '../i18n';
import { ANIMAL_LIST, BASE_CROPS, CROP_LIST, isCrop } from '../data/game';
import type { CropId, ProduceId } from '../data/types';
import type { GuestProgress } from './progress';
import { dateKey } from './time';

export interface OrderReward {
  xp: number;
  seeds: { crop: CropId; qty: number }[];
  water: number;
}

/** A small request from Cô Ba: hand over produce, get seeds, water and XP. */
export interface ChefOrder {
  id: string;
  line: string;
  items: { crop: ProduceId; qty: number }[];
  reward: OrderReward;
}

export const ORDERS_PER_DAY = 2;

// What Cô Ba is cooking today; one line per order, picked by the day's hash.
const LINES: readonly string[] = t.domain.orderLines;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(list: readonly T[], n: number, r: () => number): T[] {
  const pool = [...list];
  const out: T[] = [];
  while (out.length < n && pool.length > 0)
    out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]!);
  return out;
}

/**
 * Today's orders, the same for everyone on a given local day: one small order
 * (two produce, pays a can of water and a seed) and one larger one (three
 * produce, pays two seeds and more XP). Only crops the guest can grow appear.
 */
export function dailyOrders(date: string, crops: readonly ProduceId[] = BASE_CROPS): ChefOrder[] {
  const r = rng(hash(`co-ba:${date}`));
  const small = pick(crops, 2, r);
  const big = pick(crops, 3, r);
  // Rewards are seeds, and only crops have seeds.
  const seedCrops = crops.filter((c): c is CropId => isCrop(c));
  const seedOf = () => seedCrops[Math.floor(r() * seedCrops.length)]!;
  return [
    {
      id: `${date}:0`,
      line: LINES[Math.floor(r() * LINES.length)]!,
      // A plot gives three of a crop, so orders ask for two of each crop (one egg or milk).
      items: small.map((crop) => ({ crop, qty: isCrop(crop) ? 2 : 1 })),
      reward: { xp: 15, seeds: [{ crop: seedOf(), qty: 1 }], water: 1 },
    },
    {
      id: `${date}:1`,
      line: LINES[Math.floor(r() * LINES.length)]!,
      items: big.map((crop, i) => ({ crop, qty: (i === 0 ? 2 : 1) * (isCrop(crop) ? 2 : 1) })),
      reward: {
        xp: 30,
        seeds: pick(seedCrops, 2, r).map((crop) => ({ crop, qty: 1 })),
        water: 0,
      },
    },
  ];
}

export function todaysOrders(p: GuestProgress, now: number): ChefOrder[] {
  return dailyOrders(dateKey(now), orderCrops(p));
}

/** Produce that can show up in orders: open crops, plus egg/milk once their animal is unlocked. */
export function orderCrops(p: GuestProgress): ProduceId[] {
  const crops: ProduceId[] = CROP_LIST.filter(
    (c) => !c.unlock || p.unlockedCrops.includes(c.id),
  ).map((c) => c.id);
  const lv = Math.floor(p.xp / 100) + 1;
  return [...crops, ...ANIMAL_LIST.filter((a) => lv >= a.unlockLevel).map((a) => a.product)];
}

export function orderDone(p: GuestProgress, order: ChefOrder): boolean {
  return p.orders.done.includes(order.id);
}

export function canFulfill(p: GuestProgress, order: ChefOrder): boolean {
  return !orderDone(p, order) && order.items.every((i) => p.ingredients[i.crop] >= i.qty);
}

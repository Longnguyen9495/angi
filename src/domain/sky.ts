import { CROPS, harvestXp, MARKET } from '../data/game';
import {
  BALLOON,
  BALLOON_GOODS,
  BUGS,
  BUG_ROLL,
  COMBOS,
  FLOORS,
  FLOOR_STEP,
  FREE_SLOTS,
  MACHINES,
  MAX_FLOORS,
  PRODUCE_VEG_TIME,
  SET_MAIN,
  SET_STATS,
  SKY_CROPS,
  SKY_GOOD_PRICE,
  SKY_ITEMS,
  SKY_LEVEL,
  SKY_RECIPES,
  SKY_XP_PER_DAY,
  STAT_CAP,
  STAR_STEP,
  STATS,
  TIER_MUL,
  TUTORIAL,
  type BugId,
  type ComboId,
  type MachineId,
  type SkyCropId,
  type SkyGoodId,
  type SkyItemId,
  type SkyRecipeId,
  type StatId,
  type Stats,
  type TutorialStep,
} from '../data/skyEconomy';
import {
  POT_SETS,
  POTS,
  SLOTS_PER_FLOOR,
  type PotId,
  type PotSetId,
  type PotTier,
} from '../data/skyGarden';
import type { CropId } from '../data/types';
import { HOUR_MS, dateKey } from './time';

/*
 * Vườn Mây state and rules (plans/vuon-may.md §0.2, §0.5, §0.6, §0.9). Lives in
 * GuestProgress.sky, saved with the rest of the garden and checked by ProgressGuard.php
 * (hướng A). What the server alone decides: which bug comes (a key only it holds, revealed
 * once a growth stage is reached) and stars, tiers and luck of the pots (it rolls them).
 */

export type SeedRef = { kind: 'sky'; id: SkyCropId } | { kind: 'farm'; id: CropId };

export interface SkyPlant {
  seed: SeedRef;
  /** The pot's planting number (0 for its first): keys this cycle in the ledger. */
  cycle: number;
  plantedAt: number;
  readyAt: number;
  wateredAt: number | null;
  /** The pot's stats when it was planted (bp); moving the pot later changes nothing. */
  stats: Stats;
  /**
   * Bugs of the three checks, as the server revealed them: undefined until revealed, null for
   * "no bug", a bug while it sits on the plant. `caught` lists the checks already caught.
   */
  bugs: (BugId | null | undefined)[];
  caught: number[];
}

export interface SkyPot {
  uid: string;
  pot: PotId;
  tier: PotTier;
  stars: number;
  /** Luck from failed star tries at the current star (bp) and how many tries were made. */
  luck: number;
  tries: number;
  /** Plantings so far (the next one's cycle number). */
  cycles: number;
  plant: SkyPlant | null;
}

export interface SkyJob {
  recipe: SkyRecipeId;
  startedAt: number;
  readyAt: number;
}

export interface SkyBalloon {
  date: string;
  packed: number[];
  done: boolean;
}

export interface SkyState {
  floors: number;
  /** Slots bought per floor (0–3) beyond the three that come with it. */
  bought: number[];
  /** [floor][slot] → pot uid. */
  slots: (string | null)[][];
  pots: Record<string, SkyPot>;
  /** Next pot number (uids are `<pot>.<n>`, never reused). */
  serial: number;
  /** The first pot placed: its first planting always has a ladybug (tutorial). */
  firstPot: string | null;
  seeds: Partial<Record<SkyCropId, number>>;
  bugs: Partial<Record<BugId, number>>;
  items: Partial<Record<SkyItemId, number>>;
  goods: Partial<Record<SkyGoodId, number>>;
  jobs: Partial<Record<MachineId, SkyJob[]>>;
  tutorial: TutorialStep[];
  sets: PotSetId[];
  /** Local-day tallies: sky XP (capped), sky harvests, dew made. */
  day: { date: string; xp: number; harvests: number; dew: number };
  balloon: SkyBalloon | null;
  /** Full balloon trips on consecutive days, and the last one's date. */
  balloonStreak: { count: number; last: string | null };
}

export function emptySky(now: number): SkyState {
  return {
    floors: 0,
    bought: [],
    slots: [],
    pots: {},
    serial: 0,
    firstPot: null,
    seeds: {},
    bugs: {},
    items: {},
    goods: {},
    jobs: {},
    tutorial: [],
    sets: [],
    day: { date: dateKey(now), xp: 0, harvests: 0, dew: 0 },
    balloon: null,
    balloonStreak: { count: 0, last: null },
  };
}

/** The day tallies for `now`'s local day (a new day starts them at zero). */
export function skyDay(sky: SkyState, now: number): SkyState['day'] {
  const today = dateKey(now);
  return sky.day.date === today ? sky.day : { date: today, xp: 0, harvests: 0, dew: 0 };
}

// ——— Unlocks ———

export function skyOpen(level: number): boolean {
  return level >= SKY_LEVEL;
}

/** The next floor to open (1-based), or null when all are open. */
export function nextFloor(sky: SkyState): number | null {
  return sky.floors < MAX_FLOORS ? sky.floors + 1 : null;
}

export function slotCount(sky: SkyState, floor: number): number {
  return floor < sky.floors ? FREE_SLOTS + (sky.bought[floor] ?? 0) : 0;
}

export function slotPrice(sky: SkyState, floor: number): number | null {
  const n = sky.bought[floor] ?? 0;
  if (floor >= sky.floors || n >= 3) return null;
  return FLOORS[floor]!.slots[n]!;
}

export function cropOpen(sky: SkyState, id: SkyCropId): boolean {
  return sky.floors >= SKY_CROPS[id].floor;
}

export function machineOpen(sky: SkyState, id: MachineId): boolean {
  return sky.floors >= MACHINES[id].floor;
}

export function recipeOpen(sky: SkyState, id: SkyRecipeId): boolean {
  const r = SKY_RECIPES[id];
  return machineOpen(sky, r.machine) && sky.floors >= (r.floor ?? 0);
}

// ——— Pots and stats (§0.5, §0.6) ———

/** Where a pot stands: [floor, slot], or null when it is in the store. */
export function potPlace(sky: SkyState, uid: string): [number, number] | null {
  for (let f = 0; f < sky.slots.length; f++) {
    const i = sky.slots[f]!.indexOf(uid);
    if (i >= 0) return [f, i];
  }
  return null;
}

/** A pot's own stats at its tier, before stars, floor and floor effect (bp). */
export function potBase(pot: PotId, tier: PotTier): Stats {
  const def = POTS[pot];
  const base = SET_STATS[def.set];
  const mul = TIER_MUL[tier] / TIER_MUL[def.tier];
  const out = { time: 0, xp: 0, bug: 0, coin: 0 };
  for (const k of STATS) out[k] = Math.floor((base[k] ?? 0) * mul);
  return out;
}

/** The effect a floor gives (first that fits, §0.6), or null. Needs six pots on six open slots. */
export function floorCombo(sky: SkyState, floor: number): ComboId | null {
  const uids = (sky.slots[floor] ?? []).filter((u): u is string => !!u);
  if (uids.length < SLOTS_PER_FLOOR || slotCount(sky, floor) < SLOTS_PER_FLOOR) return null;
  const pots = uids.map((u) => sky.pots[u]!).filter(Boolean);
  if (pots.length < SLOTS_PER_FLOOR) return null;
  const sets = pots.map((p) => POTS[p.pot].set);
  const kinds = new Set(pots.map((p) => p.pot));
  const setCount = new Map<PotSetId, number>();
  for (const s of sets) setCount.set(s, (setCount.get(s) ?? 0) + 1);
  const complete = (id: PotSetId) => POT_SETS.find((s) => s.id === id)?.complete ?? false;
  for (const c of COMBOS) {
    if (
      c.id === 'fullSet' &&
      setCount.size === 1 &&
      kinds.size === SLOTS_PER_FLOOR &&
      complete(sets[0]!)
    )
      return c.id;
    if (c.id === 'mixed' && setCount.size === SLOTS_PER_FLOOR) return c.id;
    if (c.id === 'gilded' && pots.every((p) => p.tier >= 3)) return c.id;
    if (c.id === 'pairs' && setCount.size === 3 && [...setCount.values()].every((n) => n === 2))
      return c.id;
  }
  return null;
}

/** What a floor effect adds to one pot's stats. */
export function comboBonus(combo: ComboId | null, pot: PotId): Stats {
  const out = { time: 0, xp: 0, bug: 0, coin: 0 };
  const def = COMBOS.find((c) => c.id === combo);
  if (!def) return out;
  for (const k of STATS) out[k] += def.bonus[k] ?? 0;
  if (def.main) out[SET_MAIN[POTS[pot].set]] += def.main;
  return out;
}

/**
 * A pot's stats where it stands: base × stars × floor, plus its floor's effect, each held to its
 * cap (bp). `veg`: a farm vegetable is planted (a produce pot's own time bonus counts twice).
 */
export function potStats(sky: SkyState, uid: string, veg = false): Stats {
  const p = sky.pots[uid];
  const out = { time: 0, xp: 0, bug: 0, coin: 0 };
  if (!p) return out;
  const place = potPlace(sky, uid);
  const floor = place ? place[0] : 0;
  const base = potBase(p.pot, p.tier);
  const star = 100 + STAR_STEP * p.stars;
  const fl = 100 + FLOOR_STEP * floor;
  const combo = place ? comboBonus(floorCombo(sky, floor), p.pot) : out;
  for (const k of STATS) {
    let v = Math.floor((base[k] * star * fl) / 10000);
    if (k === 'time' && veg && POTS[p.pot].set === 'produce') v *= PRODUCE_VEG_TIME;
    out[k] = Math.min(STAT_CAP[k], v + combo[k]);
  }
  return out;
}

/**
 * The most a pot of this kind, tier and stars could give anywhere (top floor, best effect):
 * what the server holds a planting's recorded stats to.
 */
export function potMax(pot: PotId, tier: PotTier, stars: number): Stats {
  const base = potBase(pot, tier);
  const star = 100 + STAR_STEP * stars;
  const fl = 100 + FLOOR_STEP * (MAX_FLOORS - 1);
  const out = { time: 0, xp: 0, bug: 0, coin: 0 };
  for (const k of STATS) {
    let v = Math.floor((base[k] * star * fl) / 10000);
    if (k === 'time' && POTS[pot].set === 'produce') v *= PRODUCE_VEG_TIME;
    out[k] = Math.min(STAT_CAP[k], v + 1500);
  }
  return out;
}

// ——— Plants ———

/** Grow time of a seed (ms) before any bonus. */
export function seedGrowMs(seed: SeedRef): number {
  return seed.kind === 'sky'
    ? SKY_CROPS[seed.id].growMin * 60_000
    : Math.round(CROPS[seed.id].growHours * HOUR_MS);
}

/** Grow time with the pot's time bonus (no watering): what the bug checks are timed on. */
export function plantGrowMs(seed: SeedRef, stats: Stats): number {
  return Math.round((seedGrowMs(seed) * (10000 - stats.time)) / 10000);
}

export type SkyStage = 'sprout' | 'young' | 'flowering' | 'ready';

export function skyStage(p: SkyPlant, now: number): SkyStage {
  if (now >= p.readyAt) return 'ready';
  const k = (now - p.plantedAt) / Math.max(1, p.readyAt - p.plantedAt);
  return k < 1 / 3 ? 'sprout' : k < 2 / 3 ? 'young' : 'flowering';
}

/** When bug check `i` comes for a plant (device ms). */
export function bugCheckAt(p: SkyPlant, i: number): number {
  return p.plantedAt + Math.round(plantGrowMs(p.seed, p.stats) * BUG_ROLL.stages[i]!);
}

/** Bugs sitting on the plant now: revealed, not caught. */
export function bugsOn(p: SkyPlant): { stage: number; bug: BugId }[] {
  const out: { stage: number; bug: BugId }[] = [];
  p.bugs.forEach((b, i) => {
    if (b && !p.caught.includes(i)) out.push({ stage: i, bug: b });
  });
  return out;
}

/** Checks reached by `now` but not yet revealed: what to ask the server for. */
export function pendingChecks(p: SkyPlant, now: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < BUG_ROLL.stages.length; i++) {
    if (p.bugs[i] === undefined && now >= bugCheckAt(p, i) && now < p.readyAt) out.push(i);
  }
  return out;
}

/** What a harvest pays: goods / items / farm produce, plus XP and the pot's coin bonus. */
export function harvestOf(p: SkyPlant): {
  goods: { good: SkyGoodId; qty: number }[];
  items: { item: SkyItemId; qty: number }[];
  farm: { crop: CropId; qty: number } | null;
  xp: number;
  coins: number;
} {
  const hours = seedGrowMs(p.seed) / HOUR_MS;
  const xp = Math.floor((harvestXp(hours) * (10000 + p.stats.xp)) / 10000);
  if (p.seed.kind === 'farm') {
    const c = CROPS[p.seed.id];
    const value = c.yield * MARKET.sell(c.id);
    return {
      goods: [],
      items: [],
      farm: { crop: c.id, qty: c.yield },
      xp,
      coins: Math.floor((value * p.stats.coin) / 10000),
    };
  }
  const def = SKY_CROPS[p.seed.id];
  const goods: { good: SkyGoodId; qty: number }[] = [];
  const items: { item: SkyItemId; qty: number }[] = [];
  let value = 0;
  for (const y of def.yield) {
    if ('good' in y) {
      goods.push({ good: y.good, qty: y.qty });
      value += SKY_GOOD_PRICE[y.good] * y.qty;
    } else items.push({ item: y.item, qty: y.qty });
  }
  return { goods, items, farm: null, xp, coins: Math.floor((value * p.stats.coin) / 10000) };
}

/** XP still allowed today in the clouds. */
export function skyXpLeft(sky: SkyState, now: number): number {
  return Math.max(0, SKY_XP_PER_DAY - skyDay(sky, now).xp);
}

// ——— Balloon (G4) ———

/** Same mixing as the pond's draw (selectors.ts / ProgressGuard::unit). */
export function unit(at: number, salt: number): number {
  let h = (at + Math.imul(salt, 0x9e3779b1)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The day number of a local date (for the balloon's draw). */
export function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T12:00:00Z`) / 86_400_000);
}

/** The balloon's boxes on a local date: what each asks for. */
export function balloonBoxes(date: string): { good: SkyGoodId; qty: number }[] {
  const d = dayNumber(date);
  return Array.from({ length: BALLOON.boxes }, (_, i) => ({
    good: BALLOON_GOODS[Math.floor(unit(d, i + 1) * BALLOON_GOODS.length)]!,
    qty: 1 + Math.floor(unit(d, i + 11) * 3),
  }));
}

/** Uids of a pot kind the garden owns. */
export function ownedOf(sky: SkyState, pot: PotId): SkyPot[] {
  return Object.values(sky.pots).filter((p) => p.pot === pot);
}

export function ownsSet(sky: SkyState, set: PotSetId): boolean {
  const def = POT_SETS.find((s) => s.id === set);
  return !!def && def.complete && def.pots.every((p) => ownedOf(sky, p).length > 0);
}

export const STAT_IDS: StatId[] = STATS;

// ——— Reading a stored garden ———

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const nat = (v: unknown, max = 1_000_000) =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;
const time = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0;

function counts<K extends string>(raw: unknown, known: readonly K[]): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  if (!isObj(raw)) return out;
  for (const k of known) if (nat(raw[k])) out[k] = raw[k] as number;
  return out;
}

/**
 * The sky branch of a stored garden, or undefined (none, or not readable). Unknown ids are
 * dropped, numbers held to sane ranges, a pot never stands on two slots. The server checks
 * the same shape (ProgressGuard::shape).
 */
export function parseSky(raw: unknown, now: number): SkyState | undefined {
  if (!isObj(raw) || !nat(raw.floors, MAX_FLOORS) || (raw.floors as number) < 1) return undefined;
  const base = emptySky(now);
  const floors = raw.floors as number;
  const pots: Record<string, SkyPot> = {};
  if (isObj(raw.pots)) {
    for (const [uid, v] of Object.entries(raw.pots)) {
      if (!isObj(v) || typeof v.pot !== 'string' || !(v.pot in POTS) || v.uid !== uid) continue;
      if (!/^[a-z_]+\.\d{1,6}$/.test(uid) || !uid.startsWith(`${v.pot}.`)) continue;
      const plant = parsePlant(v.plant);
      pots[uid] = {
        uid,
        pot: v.pot as PotId,
        tier: (nat(v.tier, 4) ? v.tier : POTS[v.pot as PotId].tier) as PotTier,
        stars: nat(v.stars, 5) ? (v.stars as number) : 0,
        luck: nat(v.luck, 10000) ? (v.luck as number) : 0,
        tries: nat(v.tries, 1000) ? (v.tries as number) : 0,
        cycles: nat(v.cycles) ? (v.cycles as number) : 0,
        plant,
      };
    }
  }
  const seen = new Set<string>();
  const slots = Array.from({ length: floors }, (_, f) => {
    const row =
      Array.isArray(raw.slots) && Array.isArray(raw.slots[f]) ? (raw.slots[f] as unknown[]) : [];
    return Array.from({ length: SLOTS_PER_FLOOR }, (_, i) => {
      const u = row[i];
      if (typeof u !== 'string' || !pots[u] || seen.has(u)) return null;
      seen.add(u);
      return u;
    });
  });
  const bought = Array.from({ length: floors }, (_, f) =>
    Array.isArray(raw.bought) && nat(raw.bought[f], 3) ? (raw.bought[f] as number) : 0,
  );
  const jobs: SkyState['jobs'] = {};
  if (isObj(raw.jobs)) {
    for (const m of Object.keys(MACHINES) as MachineId[]) {
      const list = raw.jobs[m];
      if (!Array.isArray(list)) continue;
      jobs[m] = list
        .filter(
          (j): j is SkyJob =>
            isObj(j) &&
            typeof j.recipe === 'string' &&
            j.recipe in SKY_RECIPES &&
            time(j.startedAt) &&
            time(j.readyAt),
        )
        .slice(0, MACHINES[m].slots);
    }
  }
  const day = isObj(raw.day) && typeof raw.day.date === 'string' ? raw.day : null;
  const balloon =
    isObj(raw.balloon) && typeof raw.balloon.date === 'string' && Array.isArray(raw.balloon.packed)
      ? {
          date: raw.balloon.date,
          packed: (raw.balloon.packed as unknown[]).filter((n): n is number =>
            nat(n, BALLOON.boxes - 1),
          ),
          done: raw.balloon.done === true,
        }
      : null;
  const streak = isObj(raw.balloonStreak) ? raw.balloonStreak : null;
  return {
    floors,
    bought,
    slots,
    pots,
    serial: nat(raw.serial)
      ? Math.max(raw.serial as number, Object.keys(pots).length)
      : Object.keys(pots).length,
    firstPot: typeof raw.firstPot === 'string' ? raw.firstPot : null,
    seeds: counts(raw.seeds, Object.keys(SKY_CROPS) as SkyCropId[]),
    bugs: counts(raw.bugs, Object.keys(BUGS) as BugId[]),
    items: counts(raw.items, SKY_ITEMS),
    goods: counts(raw.goods, Object.keys(SKY_GOOD_PRICE) as SkyGoodId[]),
    jobs,
    tutorial: Array.isArray(raw.tutorial)
      ? (raw.tutorial.filter((t) => TUTORIAL.some((x) => x.step === t)) as TutorialStep[])
      : [],
    sets: Array.isArray(raw.sets)
      ? (raw.sets.filter((x) => POT_SETS.some((s) => s.id === x)) as PotSetId[])
      : [],
    day: day
      ? {
          date: day.date as string,
          xp: nat(day.xp) ? (day.xp as number) : 0,
          harvests: nat(day.harvests) ? (day.harvests as number) : 0,
          dew: nat(day.dew) ? (day.dew as number) : 0,
        }
      : base.day,
    balloon,
    balloonStreak: {
      count: streak && nat(streak.count) ? (streak.count as number) : 0,
      last: streak && typeof streak.last === 'string' ? streak.last : null,
    },
  };
}

function parsePlant(raw: unknown): SkyPlant | null {
  if (!isObj(raw) || !isObj(raw.seed) || !time(raw.plantedAt) || !time(raw.readyAt)) return null;
  const s = raw.seed;
  let seed: SeedRef;
  if (s.kind === 'sky' && typeof s.id === 'string' && s.id in SKY_CROPS)
    seed = { kind: 'sky', id: s.id as SkyCropId };
  else if (s.kind === 'farm' && typeof s.id === 'string' && s.id in CROPS)
    seed = { kind: 'farm', id: s.id as CropId };
  else return null;
  const st = isObj(raw.stats) ? raw.stats : {};
  const stats = { time: 0, xp: 0, bug: 0, coin: 0 };
  for (const k of STATS) stats[k] = nat(st[k], STAT_CAP[k]) ? (st[k] as number) : 0;
  const bugs = Array.isArray(raw.bugs)
    ? raw.bugs
        .slice(0, 3)
        .map((b) =>
          b === null ? null : typeof b === 'string' && b in BUGS ? (b as BugId) : undefined,
        )
    : [];
  return {
    seed,
    cycle: nat(raw.cycle) ? (raw.cycle as number) : 0,
    plantedAt: raw.plantedAt as number,
    readyAt: raw.readyAt as number,
    wateredAt: time(raw.wateredAt) ? (raw.wateredAt as number) : null,
    stats,
    bugs,
    caught: Array.isArray(raw.caught)
      ? [...new Set(raw.caught.filter((n): n is number => nat(n, 2)))]
      : [],
  };
}

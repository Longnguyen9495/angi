import type { EventId } from './game';
import type { CropId } from './types';
import { POT_SETS, POTS, type PotId, type PotSetId, type PotTier } from './skyGarden';

/*
 * Vườn Mây economy (plans/vuon-may.md §0.4–§0.6, §4, §5): floors, sky plants and their goods,
 * bugs, machines and their recipes, pot prices, the tutorial, stars and tiers, floor effects,
 * the balloon. Every number the server checks is exported to server/data/game-rules.json by
 * src/domain/gameRules.ts (`sky`), so the game and ProgressGuard.php read the same tables.
 *
 * Numbers are first values (§0.4 "mô phỏng chỉnh"): scripts/sim/sky-economy.mjs runs 90 days
 * of play on them and reports where a player gets stuck or rich.
 *
 * Deviations from the plan, on purpose:
 * - Vườn Mây needs an account (bugs are rolled with a key only the server holds, and guest
 *   import is still off, Q5), so a guest never holds a sky branch.
 * - Sky goods and machine products sit in their own store (`skygood:*`), not in the farm's
 *   pantry; only honey and milk come up from the farm. Farm recipes, orders and the market are
 *   untouched.
 * - The farm already grows strawberries, so the fifth starting sky plant is the rose.
 * - The coin bonus of a pot is paid at harvest (a share of what the crop sells for), so no
 *   lot of goods has to remember which pot it came from (§0.1 D5).
 * - An uncaught bug does not slow the plant (§0.5): it flies off at harvest. Friendlier, and
 *   one less timer for the guard.
 */

// ——— Unlock ———

/** Level at which the beanstalk can be climbed (Q2), and at which its sprout shows. */
export const SKY_LEVEL = 12;
export const SKY_SPROUT_LEVEL = 10;
/** XP a garden may earn up in the clouds per local day (§0.5 D6). */
export const SKY_XP_PER_DAY = 150;

// ——— Items, goods, bugs ———

export type SkyItemId = 'cloudseed' | 'dew' | 'gem' | 'clover' | 'shard';
export const SKY_ITEMS: SkyItemId[] = ['cloudseed', 'dew', 'gem', 'clover', 'shard'];

export type SkyGoodId =
  | 'jasmine_bud'
  | 'mint_leaf'
  | 'kumquat'
  | 'lotus_seed'
  | 'lotus_flower'
  | 'rose'
  | 'tea_leaf'
  | 'coffee_bean'
  | 'chrysanthemum'
  | 'pepper'
  | 'orchid'
  | 'peach_branch'
  | 'apricot_branch'
  | 'vanilla'
  | 'saffron'
  | 'dried_jasmine'
  | 'jasmine_honey_tea'
  | 'kumquat_mint_honey'
  | 'lotus_sweet_soup'
  | 'rose_jam'
  | 'lotus_tea'
  | 'chrysanthemum_tea'
  | 'coffee_milk'
  | 'tet_basket';

/** What a sky good sells for at the cloud market (xu). */
export const SKY_GOOD_PRICE: Record<SkyGoodId, number> = {
  jasmine_bud: 6,
  mint_leaf: 5,
  kumquat: 7,
  lotus_seed: 9,
  lotus_flower: 10,
  rose: 8,
  tea_leaf: 9,
  coffee_bean: 10,
  chrysanthemum: 12,
  pepper: 14,
  orchid: 30,
  peach_branch: 40,
  apricot_branch: 40,
  vanilla: 46,
  saffron: 60,
  dried_jasmine: 22,
  jasmine_honey_tea: 70,
  kumquat_mint_honey: 48,
  lotus_sweet_soup: 52,
  rose_jam: 42,
  lotus_tea: 50,
  chrysanthemum_tea: 44,
  coffee_milk: 49,
  tet_basket: 220,
};
export const SKY_GOODS = Object.keys(SKY_GOOD_PRICE) as SkyGoodId[];

export type BugId =
  'ladybug' | 'bee' | 'caterpillar' | 'butterfly' | 'dragonfly' | 'firefly' | 'goldbeetle';
export type BugClass = 'common' | 'rare' | 'firefly' | 'gold';

export interface BugDef {
  id: BugId;
  cls: BugClass;
  /** Weight in the draw of which bug comes (not a chance on its own). */
  weight: number;
  /** Only at night (18:00–06:00, Vietnam time); by day the draw gives a ladybug instead. */
  night?: boolean;
}

export const BUGS: Record<BugId, BugDef> = {
  ladybug: { id: 'ladybug', cls: 'common', weight: 30 },
  bee: { id: 'bee', cls: 'common', weight: 25 },
  caterpillar: { id: 'caterpillar', cls: 'common', weight: 25 },
  butterfly: { id: 'butterfly', cls: 'rare', weight: 12 },
  dragonfly: { id: 'dragonfly', cls: 'rare', weight: 8 },
  firefly: { id: 'firefly', cls: 'firefly', weight: 4, night: true },
  goldbeetle: { id: 'goldbeetle', cls: 'gold', weight: 1 },
};
/** Draw order (the server walks the same order). */
export const BUG_IDS: BugId[] = Object.keys(BUGS) as BugId[];

/**
 * A plant is checked for a bug three times while it grows, at these shares of its full (un-watered)
 * grow time. The chance of a bug each time: `base` plus the pot's bug bonus, at most `cap` (bp).
 */
export const BUG_ROLL = { stages: [0.2, 0.45, 0.7], baseBp: 2500, capBp: 8500 } as const;

// ——— Sky plants ———

export type SkyCropId =
  | 'jasmine'
  | 'mint'
  | 'kumquat'
  | 'lotus'
  | 'rose'
  | 'tea'
  | 'coffee'
  | 'chrysanthemum'
  | 'pepper'
  | 'orchid'
  | 'peach'
  | 'apricot'
  | 'vanilla'
  | 'saffron'
  | 'beanstalk';

/** A harvest's yield: a sky good, or (the beanstalk) a sky item. */
export type SkyYield = { good: SkyGoodId; qty: number } | { item: SkyItemId; qty: number };

export interface SkyCropDef {
  id: SkyCropId;
  /** Floor that has to be open to buy its seed. */
  floor: number;
  /** Seed price at the cloud shop (xu). */
  seed: number;
  /** Minutes from planting to ripe, before pot bonuses and watering. */
  growMin: number;
  yield: SkyYield[];
  /** Farm picture it borrows until its own four stages are drawn (§0.7). */
  sprite: CropId;
}

function crop(
  id: SkyCropId,
  floor: number,
  seed: number,
  growMin: number,
  yields: SkyYield[],
  sprite: CropId,
): SkyCropDef {
  return { id, floor, seed, growMin, yield: yields, sprite };
}

export const SKY_CROPS: Record<SkyCropId, SkyCropDef> = {
  jasmine: crop('jasmine', 1, 15, 45, [{ good: 'jasmine_bud', qty: 3 }], 'herbs'),
  mint: crop('mint', 1, 12, 30, [{ good: 'mint_leaf', qty: 3 }], 'scallion'),
  kumquat: crop('kumquat', 1, 22, 120, [{ good: 'kumquat', qty: 4 }], 'lime'),
  lotus: crop(
    'lotus',
    2,
    24,
    180,
    [
      { good: 'lotus_seed', qty: 2 },
      { good: 'lotus_flower', qty: 1 },
    ],
    'cabbage',
  ),
  rose: crop('rose', 2, 26, 150, [{ good: 'rose', qty: 4 }], 'tomato'),
  tea: crop('tea', 3, 22, 240, [{ good: 'tea_leaf', qty: 3 }], 'herbs'),
  coffee: crop('coffee', 3, 26, 360, [{ good: 'coffee_bean', qty: 3 }], 'bean'),
  chrysanthemum: crop('chrysanthemum', 4, 30, 180, [{ good: 'chrysanthemum', qty: 3 }], 'pumpkin'),
  pepper: crop('pepper', 4, 36, 300, [{ good: 'pepper', qty: 3 }], 'chili'),
  orchid: crop('orchid', 5, 52, 480, [{ good: 'orchid', qty: 2 }], 'eggplant'),
  peach: crop('peach', 6, 34, 600, [{ good: 'peach_branch', qty: 1 }], 'strawberry'),
  apricot: crop('apricot', 6, 34, 600, [{ good: 'apricot_branch', qty: 1 }], 'corn'),
  vanilla: crop('vanilla', 7, 82, 720, [{ good: 'vanilla', qty: 2 }], 'bean'),
  saffron: crop('saffron', 8, 104, 960, [{ good: 'saffron', qty: 2 }], 'chili'),
  beanstalk: crop('beanstalk', 10, 400, 1440, [{ item: 'cloudseed', qty: 1 }], 'bean'),
};
export const SKY_CROP_IDS = Object.keys(SKY_CROPS) as SkyCropId[];

/** XP of a sky harvest: the farm's rule (harvestXp) on the plant's grow time. */
export function skyCropHours(id: SkyCropId): number {
  return SKY_CROPS[id].growMin / 60;
}

// ——— Floors and slots ———

export interface FloorDef {
  level: number;
  coins: number;
  cloudseed: number;
  dew: number;
  /** Slots 4, 5 and 6 of this floor, for xu (slots 1–3 come with the floor). */
  slots: [number, number, number];
}

const slotPrices = (n: number): [number, number, number] => {
  const k = 1 + 0.5 * (n - 1);
  const r = (v: number) => Math.round((v * k) / 10) * 10;
  return [r(60), r(100), r(160)];
};

/** §4.1 / §0.4. Floor 1 is free and comes with the starter pots. */
export const FLOORS: FloorDef[] = [
  { level: 12, coins: 0, cloudseed: 0, dew: 0 },
  { level: 15, coins: 400, cloudseed: 2, dew: 0 },
  { level: 19, coins: 900, cloudseed: 4, dew: 1 },
  { level: 24, coins: 1600, cloudseed: 6, dew: 2 },
  { level: 29, coins: 2500, cloudseed: 8, dew: 3 },
  { level: 35, coins: 3600, cloudseed: 10, dew: 4 },
  { level: 41, coins: 5000, cloudseed: 12, dew: 6 },
  { level: 45, coins: 5500, cloudseed: 15, dew: 8 },
  { level: 50, coins: 6500, cloudseed: 18, dew: 10 },
  { level: 55, coins: 6000, cloudseed: 22, dew: 12 },
].map((f, i) => ({ ...f, slots: slotPrices(i + 1) }));
export const MAX_FLOORS = FLOORS.length;
/** Slots a floor has before any is bought. */
export const FREE_SLOTS = 3;

// ——— Pots: prices, starters ———

/**
 * Pots given when floor 1 opens. Stand-ins until the clay set is drawn (§0.14 step 6): the two
 * market pots and the spare red-fruit pot. Not for release with these.
 */
export const STARTER_POTS: PotId[] = ['bamboo_basket', 'bamboo', 'redfruit'];

export type PotCurrency = 'coin' | 'gem';
export interface PotPrice {
  currency: PotCurrency;
  price: number;
  /** Floor that must be open for the pot to be on sale. */
  floor: number;
}

/** What the cloud shop sells (sets for xu from G2, for Mây Ngọc from G3). Festival pots: sets/events only. */
export const POT_PRICES: Partial<Record<PotId, PotPrice>> = {
  bamboo_basket: { currency: 'coin', price: 120, floor: 1 },
  bamboo: { currency: 'coin', price: 150, floor: 1 },
  redfruit: { currency: 'coin', price: 180, floor: 1 },
  pumpkin: { currency: 'coin', price: 400, floor: 2 },
  corn: { currency: 'coin', price: 450, floor: 2 },
  cabbage: { currency: 'coin', price: 500, floor: 2 },
  eggplant: { currency: 'coin', price: 550, floor: 2 },
  watermelon: { currency: 'gem', price: 3, floor: 3 },
  red_apple: { currency: 'gem', price: 3, floor: 3 },
  coconut: { currency: 'gem', price: 4, floor: 4 },
  crab: { currency: 'gem', price: 4, floor: 4 },
  porcelain_fish: { currency: 'gem', price: 4, floor: 5 },
  seashell: { currency: 'gem', price: 4, floor: 5 },
  pho_bowl: { currency: 'gem', price: 6, floor: 6 },
  teapot: { currency: 'gem', price: 6, floor: 6 },
  banh_chung: { currency: 'gem', price: 6, floor: 7 },
};

/**
 * Festival pots (§5.6, `EVENTS`): an event's last milestone gives these to a guest with a cloud
 * garden, claimed then or later once the garden is there. Never on sale.
 */
export const EVENT_POTS: Partial<Record<EventId, PotId[]>> = {
  'tet-dinh-mui': ['peach_blossom', 'golden_dragon'],
  'trung-thu': ['mooncake'],
  'quoc-khanh': ['lotus'],
};

/** Balloon shards: this many make one pot of the table set (§5.6). */
export const SHARDS_PER_POT = 10;
export const SHARD_POTS: PotId[] = ['pho_bowl', 'teapot', 'banh_chung'];

// ——— Pot stats (§0.5) ———

export type StatId = 'time' | 'xp' | 'bug' | 'coin';
export const STATS: StatId[] = ['time', 'xp', 'bug', 'coin'];
export type Stats = Record<StatId, number>;

/** Base stats of a set at its own base tier, in basis points (1% = 100). */
export const SET_STATS: Record<PotSetId, Partial<Stats>> = {
  clay: { time: 200 },
  produce: { time: 600, xp: 600 },
  table: { coin: 1000, xp: 600 },
  market: { coin: 800 },
  sea: { bug: 1200, time: 400 },
  festival: { coin: 1000, xp: 1000, time: 800 },
  spare: { time: 400, xp: 400 },
};
/** The stat a set's "Đủ bộ" floor effect raises (§0.6). */
export const SET_MAIN: Record<PotSetId, StatId> = {
  clay: 'time',
  produce: 'time',
  table: 'xp',
  market: 'coin',
  sea: 'bug',
  festival: 'xp',
  spare: 'time',
};
/** ×100 per tier: a pot raised a tier gains TIER_MUL[t] / TIER_MUL[base]. */
export const TIER_MUL = [100, 130, 170, 220, 300] as const;
export const STAR_STEP = 20;
export const FLOOR_STEP = 3;
/** Most a stat can reach, all bonuses together (bp). */
export const STAT_CAP: Stats = { time: 5000, xp: 10000, bug: 6000, coin: 10000 };
/** Farm vegetables in a produce pot: that pot's own time bonus counts twice. */
export const PRODUCE_VEG_TIME = 2;

export type ComboId = 'fullSet' | 'mixed' | 'gilded' | 'pairs';
export interface ComboDef {
  id: ComboId;
  bonus: Partial<Stats>;
  /** fullSet: added to the set's main stat instead of `bonus`. */
  main?: number;
}
/** Checked in this order; a floor takes the first that fits (§0.6). */
export const COMBOS: ComboDef[] = [
  { id: 'fullSet', bonus: {}, main: 1500 },
  { id: 'mixed', bonus: { time: 800, xp: 800, bug: 800 } },
  { id: 'gilded', bonus: { time: 1000 } },
  { id: 'pairs', bonus: { xp: 600, coin: 600 } },
];

// ——— Stars and tiers (§5.3) ———

export interface StarStep {
  common: number;
  rare: number;
  firefly: number;
  coins: number;
  /** Chance in bp before luck and clover. */
  rateBp: number;
}
/** Index n: from ★n to ★n+1. */
export const STAR_STEPS: StarStep[] = [
  { common: 3, rare: 0, firefly: 0, coins: 50, rateBp: 10000 },
  { common: 5, rare: 0, firefly: 0, coins: 120, rateBp: 8500 },
  { common: 6, rare: 1, firefly: 0, coins: 300, rateBp: 7000 },
  { common: 8, rare: 2, firefly: 0, coins: 700, rateBp: 5500 },
  { common: 10, rare: 3, firefly: 1, coins: 1500, rateBp: 4000 },
];
export const MAX_STARS = STAR_STEPS.length;
/** Luck a failed try adds (bp), what a clover adds, the try that always works, the double step. */
export const STAR_LUCK = { failBp: 1000, cloverBp: 1500, sureTry: 5, jumpBp: 500 } as const;
/** Raising a ★5 pot a tier: one gold beetle and one other ★0 pot of the same set (§5.3). */
export const TIER_UP = { goldbeetle: 1 } as const;
export const MAX_TIER: PotTier = 4;

// ——— Machines ———

export type MachineId = 'tea' | 'pot' | 'still' | 'phin';
export interface MachineDef {
  id: MachineId;
  floor: number;
  /** Jobs that can run at the same time. */
  slots: number;
}
export const MACHINES: Record<MachineId, MachineDef> = {
  tea: { id: 'tea', floor: 1, slots: 1 },
  pot: { id: 'pot', floor: 2, slots: 1 },
  still: { id: 'still', floor: 3, slots: 1 },
  // One machine at the head of each of the first four floors.
  phin: { id: 'phin', floor: 4, slots: 1 },
};
export const MACHINE_IDS = Object.keys(MACHINES) as MachineId[];

export type SkyRecipeId =
  | 'dried_jasmine'
  | 'jasmine_honey_tea'
  | 'kumquat_mint_honey'
  | 'lotus_tea'
  | 'chrysanthemum_tea'
  | 'lotus_sweet_soup'
  | 'rose_jam'
  | 'dew_jasmine'
  | 'dew_lotus'
  | 'coffee_milk'
  | 'tet_basket';

/** An input: a sky good, or honey / milk from the farm's pantry. */
export type SkyInput = { good: SkyGoodId; qty: number } | { farm: 'honey' | 'milk'; qty: number };
export type SkyOutput = { good: SkyGoodId; qty: number } | { item: SkyItemId; qty: number };

export interface SkyRecipeDef {
  id: SkyRecipeId;
  machine: MachineId;
  inputs: SkyInput[];
  out: SkyOutput;
  minutes: number;
  xp: number;
  /** At most this many a local day (the dew still). */
  perDay?: number;
  /** Floor that must be open besides the machine's (an input grows higher up). */
  floor?: number;
}

function recipe(
  id: SkyRecipeId,
  machine: MachineId,
  inputs: SkyInput[],
  out: SkyOutput,
  minutes: number,
  xp: number,
  extra: Partial<SkyRecipeDef> = {},
): SkyRecipeDef {
  return { id, machine, inputs, out, minutes, xp, ...extra };
}

/** §0.4 (MIX01, MIX02, MIX04, MIX07 and the rest). Sale price ≤ 1.35 × the inputs' (test). */
export const SKY_RECIPES: Record<SkyRecipeId, SkyRecipeDef> = {
  dried_jasmine: recipe(
    'dried_jasmine',
    'tea',
    [{ good: 'jasmine_bud', qty: 3 }],
    { good: 'dried_jasmine', qty: 1 },
    20,
    2,
  ),
  jasmine_honey_tea: recipe(
    'jasmine_honey_tea',
    'tea',
    [
      { good: 'dried_jasmine', qty: 2 },
      { farm: 'honey', qty: 1 },
    ],
    { good: 'jasmine_honey_tea', qty: 1 },
    40,
    5,
  ),
  kumquat_mint_honey: recipe(
    'kumquat_mint_honey',
    'tea',
    [
      { good: 'kumquat', qty: 2 },
      { good: 'mint_leaf', qty: 2 },
      { farm: 'honey', qty: 1 },
    ],
    { good: 'kumquat_mint_honey', qty: 1 },
    30,
    4,
  ),
  lotus_tea: recipe(
    'lotus_tea',
    'tea',
    [
      { good: 'lotus_flower', qty: 2 },
      { good: 'tea_leaf', qty: 2 },
    ],
    { good: 'lotus_tea', qty: 1 },
    60,
    5,
    { floor: 3 },
  ),
  chrysanthemum_tea: recipe(
    'chrysanthemum_tea',
    'tea',
    [
      { good: 'chrysanthemum', qty: 2 },
      { good: 'tea_leaf', qty: 1 },
    ],
    { good: 'chrysanthemum_tea', qty: 1 },
    45,
    4,
    { floor: 4 },
  ),
  lotus_sweet_soup: recipe(
    'lotus_sweet_soup',
    'pot',
    [
      { good: 'lotus_seed', qty: 3 },
      { farm: 'honey', qty: 1 },
    ],
    { good: 'lotus_sweet_soup', qty: 1 },
    60,
    5,
  ),
  rose_jam: recipe(
    'rose_jam',
    'pot',
    [{ good: 'rose', qty: 4 }],
    { good: 'rose_jam', qty: 1 },
    60,
    4,
  ),
  dew_jasmine: recipe(
    'dew_jasmine',
    'still',
    [{ good: 'jasmine_bud', qty: 3 }],
    { item: 'dew', qty: 1 },
    480,
    0,
    { perDay: 2 },
  ),
  dew_lotus: recipe(
    'dew_lotus',
    'still',
    [{ good: 'lotus_flower', qty: 2 }],
    { item: 'dew', qty: 1 },
    480,
    0,
    { perDay: 2 },
  ),
  coffee_milk: recipe(
    'coffee_milk',
    'phin',
    [
      { good: 'coffee_bean', qty: 3 },
      { farm: 'milk', qty: 1 },
    ],
    { good: 'coffee_milk', qty: 1 },
    30,
    5,
  ),
  tet_basket: recipe(
    'tet_basket',
    'pot',
    [
      { good: 'peach_branch', qty: 1 },
      { good: 'apricot_branch', qty: 1 },
      { good: 'rose_jam', qty: 2 },
    ],
    { good: 'tet_basket', qty: 1 },
    120,
    10,
    { floor: 6 },
  ),
};
export const SKY_RECIPE_IDS = Object.keys(SKY_RECIPES) as SkyRecipeId[];
/** Dew stills share one daily count (§0.4: two a day). */
export const DEW_PER_DAY = 2;

/** Farm pantry prices of the farm inputs (honey 12, milk 7), for the 1.35× rule. */
export const FARM_INPUT_PRICE = { honey: 12, milk: 7 } as const;

// ——— Tutorial (§0.4): every reward once, enough cloud seeds and dew for floors 2 and 3 ———

export type TutorialStep = 'place' | 'harvest' | 'bug' | 'dried' | 'floor2' | 'mix01';
export interface TutorialReward {
  step: TutorialStep;
  seeds?: { crop: SkyCropId; qty: number };
  items?: Partial<Record<SkyItemId, number>>;
  pot?: PotId;
}
export const TUTORIAL: TutorialReward[] = [
  { step: 'place', seeds: { crop: 'jasmine', qty: 3 } },
  { step: 'harvest', items: { cloudseed: 1 } },
  { step: 'bug', items: { cloudseed: 1 } },
  { step: 'dried', items: { dew: 1 } },
  { step: 'floor2', items: { cloudseed: 2 }, pot: 'pumpkin' },
  { step: 'mix01', items: { cloudseed: 2 } },
];
/** The 'dried' step also gives one honey when the farm pantry has none (MIX01 needs it). */
export const TUTORIAL_HONEY = 1;

/** From floor 4 on: one cloud seed a local day after the third sky harvest of the day (§0.4). */
/**
 * The day's third harvest brings a cloud seed once floor 3 is open: after the tutorial's six,
 * this is what opens floor 4 and up (§0.4), with the balloon from floor 5.
 */
export const DAILY_SKY = { harvests: 3, cloudseed: 1, fromFloor: 3 } as const;

// ——— Sets (§5.5) ———

/** Owning every pot of a complete set pays this once. */
export const SET_REWARD = { gem: 3, coins: 500 } as const;

// ——— Balloon (G4, §4.6) ———

/** Goods a balloon may ask for (all grow by floor 5). */
export const BALLOON_GOODS: SkyGoodId[] = [
  'jasmine_bud',
  'mint_leaf',
  'kumquat',
  'lotus_seed',
  'rose',
  'tea_leaf',
  'coffee_bean',
  'chrysanthemum',
  'dried_jasmine',
  'rose_jam',
  'lotus_sweet_soup',
  'jasmine_honey_tea',
];
export const BALLOON = {
  floor: 5,
  boxes: 6,
  /** XP per packed box, and the trip's pay once every box is packed. */
  boxXp: 6,
  coins: 300,
  cloudseed: 2,
  shards: 1,
  /** Every 7th full trip in a row also gives a Mây Ngọc. */
  streakDays: 7,
  streakGem: 1,
} as const;

// ——— Helpers shared by the domain and the export ———

/** A sky good's farm-pantry-free value, for the 1.35× rule. */
export function inputValue(i: SkyInput): number {
  return 'good' in i ? SKY_GOOD_PRICE[i.good] * i.qty : FARM_INPUT_PRICE[i.farm] * i.qty;
}

export function setOf(pot: PotId): PotSetId {
  return POTS[pot].set;
}

export function baseTierOf(pot: PotId): PotTier {
  return POTS[pot].tier;
}

/** Complete sets (six drawn pots), for the set reward and the "Đủ bộ" effect. */
export function completeSets(): PotSetId[] {
  return POT_SETS.filter((s) => s.complete).map((s) => s.id);
}

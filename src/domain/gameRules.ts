import {
  ANIMALS,
  BASE_CROPS,
  BOAT,
  CATCHES,
  CROPS,
  DECOR,
  FARM_PLOT_COUNT,
  FISHING,
  HIVE,
  MARKET,
  MEAT_FOR_SALE,
  PLOT_UNLOCK_LEVELS,
  PRODUCE_IDS,
  RECIPE_LIST,
  REGIONS,
  WATERING,
  XP,
  COLLECTIONS,
  COLLECTION_REWARD,
  GUESTS,
  UPGRADES,
  LAND_PRICES,
  LEVEL_CURVE,
  isBuiltinRecipe,
} from '../data/game';
import type { CropId } from '../data/types';
import { ORDERS_PER_DAY, dailyOrders } from './orders';
import {
  ACHIEVEMENTS,
  DAILY_COUNT,
  QUEST_DEFS,
  STREAK_CHESTS,
  WEEKLY_COUNT,
  badgeReward,
} from './quests';

/*
 * The numbers the server needs to check a saved garden (server/lib/ProgressGuard.php), taken
 * from the same tables the game plays by, so the two can never drift apart:
 * `npm run rules:export` writes server/data/game-rules.json, and gameRules.test.ts fails
 * whenever the committed file no longer matches the game.
 */
export const GAME_RULES_VERSION = 1;

/**
 * What the server counts for each achievement (its own verified tallies, see verified_stats).
 * A new achievement must be added here, or the export fails.
 */
const BADGE_METRIC: Record<string, string> = {
  cook: 'cook',
  recipes: 'recipes',
  explorer: 'eaten',
  discoverer: 'discovered',
  regular: 'checkin',
  photographer: 'photo',
  regions: 'regions',
  streak: 'streakMax',
  farmer: 'harvest',
  planter: 'plant',
  waterer: 'water',
  variety: 'variety',
  orchard: 'fruit',
  mycologist: 'mushroom',
  landowner: 'plots',
  angler: 'catch',
  rancher: 'collect',
  beekeeper: 'honey',
  sailor: 'boat',
  supplier: 'order',
  merchant: 'sell',
  tycoon: 'earn',
  decorator: 'decor',
  neighbour: 'help',
  sneaky: 'steal',
  generous: 'gift',
  level: 'level',
  diligent: 'allDaily',
};

export function buildGameRules() {
  const crops = Object.fromEntries(
    (Object.keys(CROPS) as CropId[]).map((id) => {
      const c = CROPS[id];
      return [
        id,
        {
          kind: c.kind,
          growMs: Math.round(c.growHours * 3_600_000),
          regrowMs: c.regrowHours !== undefined ? Math.round(c.regrowHours * 3_600_000) : null,
          yield: c.yield,
          flushes: c.flushes ?? null,
          unlockLevel: c.unlock?.level ?? 1,
          seedPrice: MARKET.seed(id),
        },
      ];
    }),
  );
  return {
    version: GAME_RULES_VERSION,
    levelCurve: { ...LEVEL_CURVE },
    xp: { ...XP },
    baseCrops: [...BASE_CROPS],
    crops,
    sell: Object.fromEntries(PRODUCE_IDS.map((id) => [id, MARKET.sell(id)])),
    guests: { ...GUESTS },
    upgrades: Object.fromEntries(Object.entries(UPGRADES).map(([id, u]) => [id, [...u.prices]])),
    collections: Object.fromEntries(COLLECTIONS.map((c) => [c.id, c.recipes])),
    collectionReward: { ...COLLECTION_REWARD },
    buy: Object.fromEntries(MEAT_FOR_SALE.map((id) => [id, MARKET.buy(id)])),
    animals: Object.fromEntries(
      Object.values(ANIMALS).map((a) => [
        a.id,
        {
          feed: a.feed,
          product: a.product,
          yield: a.yield,
          hoursMs: Math.round(a.hours * 3_600_000),
          unlockLevel: a.unlockLevel,
        },
      ]),
    ),
    hive: {
      unlockLevel: HIVE.unlockLevel,
      hoursMs: Math.round(HIVE.hours * 3_600_000),
      yield: { ...HIVE.yield },
    },
    boat: {
      unlockLevel: BOAT.unlockLevel,
      hoursMs: Math.round(BOAT.hours * 3_600_000),
      catches: BOAT.catches,
    },
    catches: Object.fromEntries(
      Object.values(CATCHES).map((c) => [
        c.id,
        { chance: c.chance, source: c.source, unlockLevel: c.unlockLevel },
      ]),
    ),
    // Insertion order matters: pickCatch walks the catches in this order.
    catchOrder: Object.keys(CATCHES),
    fishing: { ...FISHING },
    watering: { ...WATERING },
    plots: {
      start: FARM_PLOT_COUNT,
      unlockLevels: [...PLOT_UNLOCK_LEVELS],
      prices: [...LAND_PRICES],
    },
    decor: Object.fromEntries(Object.values(DECOR).map((d) => [d.id, d.price])),
    recipes: Object.fromEntries(
      builtinRecipes().map((r) => [
        r.id,
        { xp: r.xp, ingredients: r.ingredients.map((i) => ({ id: i.crop, qty: i.qty })) },
      ]),
    ),
    quests: Object.fromEntries(
      Object.values(QUEST_DEFS).map((q) => [
        q.id,
        { metric: q.metric, target: q.target, weekly: q.id.startsWith('w-'), ...q.reward },
      ]),
    ),
    dailyCount: DAILY_COUNT,
    weeklyCount: WEEKLY_COUNT,
    badges: Object.fromEntries(
      ACHIEVEMENTS.map((a) => {
        const metric = BADGE_METRIC[a.id];
        if (!metric) throw new Error(`No server metric for achievement ${a.id}`);
        // "Every recipe" grows with the catalogue: the server holds it to the built-in count.
        const tiers =
          a.id === 'recipes'
            ? a.tiers.map((t, i) => (i === a.tiers.length - 1 ? builtinRecipes().length : t))
            : [...a.tiers];
        return [
          a.id,
          {
            metric,
            tiers,
            rewards: tiers.map((_, i) => badgeReward(i + 1, a.id)),
            // What the build before 28 badges paid: a page loaded before an update still claims
            // with it. Drop once that build is gone from browsers.
            legacyRewards: tiers.map((_, i) => ({
              xp: 20 * (i + 1),
              coins: 10 * (i + 1),
              seeds: i + 1 >= 3 ? 2 : 1,
              water: 0,
            })),
          },
        ];
      }),
    ),
    regions: Object.fromEntries(Object.values(REGIONS).map((r) => [r.id, r.stampsToUnlock])),
    chests: Object.fromEntries(Object.entries(STREAK_CHESTS).map(([d, r]) => [d, { ...r }])),
    orders: orderBounds(),
  };
}

function builtinRecipes() {
  return RECIPE_LIST.filter((r) => isBuiltinRecipe(r.id));
}

/** The most any one of Cô Ba's orders can pay (orders are drawn per day, so sample a year). */
function orderBounds() {
  const all = Array.from({ length: 366 }, (_, i) =>
    dailyOrders(new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10), PRODUCE_IDS),
  ).flat();
  return {
    perDay: ORDERS_PER_DAY,
    maxXp: Math.max(...all.map((o) => o.reward.xp)),
    maxSeeds: Math.max(...all.map((o) => o.reward.seeds.reduce((n, s) => n + s.qty, 0))),
    maxWater: Math.max(...all.map((o) => o.reward.water)),
  };
}

export type GameRules = ReturnType<typeof buildGameRules>;

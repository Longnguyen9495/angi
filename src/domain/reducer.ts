import { getDish } from '../data/dishes';
import {
  ANIMALS,
  BOAT,
  CATCHES,
  CROPS,
  HIVE,
  DECOR,
  FISHING,
  MARKET,
  getRecipe,
  hasRecipe,
  WATERING,
  XP,
  harvestXp,
  isMeat,
  GUESTS,
  UPGRADES,
  EVENT,
  EVENTS,
  type EventId,
  type UpgradeId,
} from '../data/game';
import type { AnimalId, CropId, DecorId, Meat, ProduceId, RecipeId } from '../data/types';
import {
  DECOR_HOME,
  DECOR_SLOTS,
  decorSlot,
  freeSlot,
  slotsTaken,
  type DecorSlots,
} from '../data/decorSlots';
import {
  createInitialProgress,
  type AgainAnswer,
  type CheckInOutcome,
  type FriendEvent,
  type GuestProgress,
  type EffectsQuality,
  type MotionPref,
} from './progress';
import type { Filters } from './recommend';
import {
  animalStage,
  biteDelay,
  boatCatch,
  boatStage,
  catchFor,
  hiveStage,
  level,
  cropAvailable,
  fishingLeft,
  firstEmptyPlot,
  nextLand,
  upgradeLevel,
  newlyUnlockable,
  newlyUnlockableCrops,
  plotStage,
  recipeProgress,
  waterBlock,
} from './selectors';
import { collectionProgress } from './collections';
import { canServe, guestPay, todaysGuests } from './guests';
import { canFulfill, todaysOrders } from './orders';
import {
  QUEST_DEFS,
  STREAK_CHESTS,
  badgeReward,
  badges,
  questsFor,
  type QuestMetric,
  type QuestReward,
} from './quests';
import { HOUR_MS, dateKey, daysBetween, slotKey } from './time';
import { post } from './ledger';
import { isSkyAction, skyReducer, type SkyAction } from './skyReducer';

/** Timers fire a little early or late; a catch this close to the bite still counts. */
const BITE_SLACK_MS = 250;

export type Action =
  | { type: 'SET_FILTERS'; filters: Filters }
  | { type: 'CHOOSE_DISH'; dishId: string; now: number }
  | { type: 'PLANT_MEAL_SEED'; now: number }
  | { type: 'PLANT_FROM_TRAY'; crop: CropId; plotId: number; now: number }
  | { type: 'WATER'; plotId: number; now: number }
  | { type: 'HARVEST_ALL'; now: number }
  /** One ripe plot picked with a tap (same rewards as HARVEST_ALL gives it). */
  | { type: 'HARVEST_PLOT'; plotId: number; now: number }
  /** A bite landed at the pond for the cast made at `castAt` (what bites follows from it). */
  | { type: 'CATCH'; castAt: number; now: number }
  | { type: 'COOK'; recipeId: RecipeId; now: number }
  | { type: 'FULFILL_ORDER'; orderId: string; now: number }
  | { type: 'ATTACH_PHOTO'; slotKey: string; now: number }
  | { type: 'REMOVE_PHOTO'; slotKey: string }
  /** Replace everything with progress restored from the guest's account. */
  | { type: 'LOAD_PROGRESS'; progress: GuestProgress }
  | { type: 'SELL'; crop: ProduceId; now: number }
  | { type: 'FEED_ANIMAL'; animal: AnimalId; now: number }
  | { type: 'COLLECT_ANIMAL'; animal: AnimalId; now: number }
  | { type: 'PLACE_DECOR'; decor: DecorId; x: number; z: number; rot: number }
  | { type: 'STORE_DECOR'; decor: DecorId }
  /** Painted farm: stand an owned decoration on a slot (one standing there swaps places with it). */
  | { type: 'MOVE_DECOR'; decor: DecorId; slot: number }
  | { type: 'FLIP_DECOR'; decor: DecorId }
  /** A friend's help or gift, confirmed by the server; applied once per event id. */
  | { type: 'FRIEND_EVENT'; event: FriendEvent; now: number }
  /** We sent a friend a seed (the server recorded it as event `id`): it leaves our tray. */
  | { type: 'GIFT_SENT'; id: string; crop: CropId; now: number }
  /** Whether the guest has friends: the social quests join the draw once they do. */
  | { type: 'SET_SOCIAL'; on: boolean }
  /** Fixes today's and this week's quest lists the moment they are shown (a new day or week). */
  | { type: 'ROLL_QUESTS'; now: number }
  | { type: 'CLAIM_QUEST'; id: string; now: number }
  | { type: 'CLAIM_BADGE'; id: string; now: number }
  | { type: 'OPEN_CHEST'; now: number }
  /** Empties a plot on purpose: takes out a tree or a spent mushroom block (nothing is paid). */
  | { type: 'CLEAR_PLOT'; plotId: number }
  /** The beehive: start it once it opens, then empty it for honey and comb (it refills). */
  | { type: 'START_HIVE'; now: number }
  | { type: 'COLLECT_HIVE'; now: number }
  /** The fishing boat: send it out, then unload what it brought back. */
  | { type: 'SEND_BOAT'; now: number }
  | { type: 'COLLECT_BOAT'; now: number }
  | { type: 'BUY_SEED'; crop: CropId; now: number }
  | { type: 'BUY_ITEM'; item: Meat; now: number }
  | { type: 'BUY_LAND'; now: number }
  | { type: 'SERVE_GUEST'; guestId: string; now: number }
  | { type: 'CLAIM_COLLECTION'; id: string; now: number }
  | { type: 'BUY_UPGRADE'; id: UpgradeId; now: number }
  | { type: 'CLAIM_EVENT'; id: EventId; step: number; now: number }
  | { type: 'BUY_DECOR'; decor: DecorId; now: number }
  | {
      type: 'CHECK_IN';
      outcome: CheckInOutcome;
      rating: number | null;
      again: AgainAnswer | null;
      now: number;
    }
  | { type: 'HIDE_DISH'; dishId: string }
  | { type: 'UNHIDE_DISH'; dishId: string }
  | { type: 'UNHIDE_ALL' }
  | { type: 'SET_REMINDER'; now: number }
  | { type: 'SAVE_JOURNEY' }
  | { type: 'ACK_UNLOCK' }
  | { type: 'ACK_CROP_UNLOCK' }
  | { type: 'SET_MOTION'; motion: MotionPref }
  | { type: 'SET_QUALITY'; quality: EffectsQuality }
  /** On load: open what the guest's level already earns (a save from before new crops existed). */
  | { type: 'SYNC_UNLOCKS'; now: number }
  | { type: 'SET_SIMULATE_FAILURE'; value: boolean }
  /** This journey is now saved to that account (see GuestProgress.owner). */
  | { type: 'SET_OWNER'; owner: string | null }
  | { type: 'RESET'; now: number }
  /** Vườn Mây (src/domain/skyReducer.ts). */
  | SkyAction;

export { LEDGER_LIMIT } from './ledger';
/** Minutes after choosing a dish when the in-page check-in reminder fires. */
export const REMINDER_DELAY_MS = 45 * 60 * 1000;

function ensureDay(s: GuestProgress, now: number) {
  const today = dateKey(now);
  if (s.water.date !== today) s.water = { date: today, used: 0, bonus: 0 };
  if (s.fishing.date !== today) s.fishing = { date: today, used: 0 };
  if (s.orders.date !== today) s.orders = { date: today, done: [] };
}

/** Counts an action toward today's and this week's quests and the achievements. */
function track(s: GuestProgress, metric: QuestMetric, now: number, n = 1) {
  if (n <= 0) return;
  const qs = questsFor(s, now);
  const add = (t: Partial<Record<QuestMetric, number>>) => ({
    ...t,
    [metric]: (t[metric] ?? 0) + n,
  });
  s.quests = { ...qs, day: add(qs.day), weekTally: add(qs.weekTally), total: add(qs.total) };
}

/**
 * Pays a quest, badge or chest reward once (`key` is the idempotency key). Seeds are crops
 * the guest can grow, picked from the key so a replay picks the same ones.
 */
function grant(s: GuestProgress, key: string, r: QuestReward, reason: string, now: number) {
  if (!post(s, key, 'xp', r.xp, reason, now)) return false;
  if (r.coins > 0) post(s, `${key}:coin`, 'coin', r.coins, reason, now);
  const crops = (Object.keys(CROPS) as CropId[]).filter((c) => cropAvailable(s, c));
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  for (let i = 0; i < r.seeds && crops.length > 0; i++) {
    const crop = crops[(h + i * 7) % crops.length]!;
    post(s, `${key}:seed:${i}`, `seed:${crop}`, 1, reason, now);
  }
  if (r.water > 0) {
    ensureDay(s, now);
    s.water = { ...s.water, bonus: s.water.bonus + r.water };
  }
  return true;
}

/** A streak that just reached a chest day leaves a chest to open. */
function streakChest(s: GuestProgress, before: number, now: number) {
  const n = s.streak.count;
  if (n !== before && STREAK_CHESTS[n]) {
    s.quests = { ...questsFor(s, now), chest: { streak: n, date: dateKey(now) } };
  }
}

const STREAK_MILESTONES = [1, 3, 5, 7];

/** Soft streak: a missed day uses a rest pass or steps back one milestone, never to zero. */
export function touchStreak(streak: GuestProgress['streak'], now: number): GuestProgress['streak'] {
  const today = dateKey(now);
  const gap = daysBetween(streak.lastActiveDate, today);
  if (gap <= 0) return streak;
  if (gap === 1) return { ...streak, count: streak.count + 1, lastActiveDate: today };
  if (gap === 2 && streak.restPasses > 0) {
    return {
      count: streak.count + 1,
      lastActiveDate: today,
      restPasses: streak.restPasses - 1,
    };
  }
  const below = [...STREAK_MILESTONES].reverse().find((m) => m < streak.count) ?? 1;
  return { ...streak, count: below + 1, lastActiveDate: today };
}

function addStamp(s: GuestProgress, kind: 'discovered' | 'eaten', dishId: string, now: number) {
  if (s.stamps[kind].includes(dishId)) return;
  s.stamps = { ...s.stamps, [kind]: [...s.stamps[kind], dishId] };
  post(s, `stamp:${kind}:${dishId}`, 'stamp', 1, `stamp:${kind}`, now);
  const opened = newlyUnlockable(s);
  if (opened.length > 0) {
    s.unlockedRegions = [...s.unlockedRegions, ...opened];
    s.recentUnlock = opened[opened.length - 1] ?? null;
  }
}

/**
 * Levelling up opens new crops and gifts one seed of each, through the ledger
 * so a replayed action can never gift twice.
 */
function applyUnlocks(s: GuestProgress, now: number): GuestProgress {
  const crops = newlyUnlockableCrops(s);
  if (crops.length === 0) return s;
  const next = structuredClone(s);
  for (const crop of crops) {
    next.unlockedCrops = [...next.unlockedCrops, crop];
    post(next, `unlock:crop:${crop}`, `seed:${crop}`, 1, 'unlock', now);
  }
  next.recentCropUnlock = crops[crops.length - 1] ?? next.recentCropUnlock;
  return next;
}

/**
 * Cooks a recipe into `s` (a copy): spends its ingredients, pays its XP, counts it. All or
 * nothing: false (and `s` must be dropped) when it cannot, or this very cooking was done.
 */
function cookInto(s: GuestProgress, id: RecipeId, now: number): boolean {
  if (!hasRecipe(id) || !recipeProgress(s, id).canCook) return false;
  const recipe = getRecipe(id);
  const key = `cook:${recipe.id}:${now}`;
  for (const ing of recipe.ingredients) {
    if (!post(s, `${key}:${ing.crop}`, `ingredient:${ing.crop}`, -ing.qty, 'cook', now))
      return false;
  }
  if (!post(s, `${key}:xp`, 'xp', recipe.xp, 'cook', now)) return false;
  const first = !s.cooked[recipe.id];
  s.cooked = { ...s.cooked, [recipe.id]: (s.cooked[recipe.id] ?? 0) + 1 };
  track(s, 'cook', now);
  if (first) track(s, 'newRecipe', now);
  return true;
}

export function gameReducer(state: GuestProgress, action: Action): GuestProgress {
  const next = baseReducer(state, action);
  if (next === state || !('now' in action)) return next;
  return applyUnlocks(next, action.now);
}

function baseReducer(state: GuestProgress, action: Action): GuestProgress {
  if (isSkyAction(action)) return skyReducer(state, action);
  switch (action.type) {
    case 'SET_FILTERS':
      return { ...state, filters: action.filters };

    case 'CHOOSE_DISH': {
      const dish = getDish(action.dishId);
      if (!dish) return state;
      const key = slotKey(action.now);
      const current = state.meal?.slotKey === key ? state.meal : null;
      if (current?.dishId === dish.id) return state;
      // Once the slot's seed is planted or checked in, the reward is spent: the new
      // choice is still recorded (choosing food must always work) but pays nothing.
      if (current && (current.planted || current.checkedIn)) {
        return { ...state, meal: { ...current, dishId: dish.id, chosenAt: action.now } };
      }

      const s = structuredClone(state);
      ensureDay(s, action.now);
      const rev = s.ledger.filter((e) => e.key.startsWith(`seed:${key}:r`)).length;
      if (current) {
        // Switching dish before planting re-targets the pending seed instead of adding one;
        // when that seed is already gone (sent to a friend), the new choice pays nothing.
        const back = post(
          s,
          `seed:${key}:r${rev}:reverse`,
          `seed:${current.seedCrop}`,
          -1,
          'reversal',
          action.now,
        );
        if (!back) return { ...state, meal: { ...current, dishId: dish.id, chosenAt: action.now } };
      }
      post(s, `seed:${key}:r${rev + 1}`, `seed:${dish.seed}`, 1, `dish:${dish.id}`, action.now);
      post(s, `xp:choose:${key}`, 'xp', XP.chooseDish, 'choose', action.now);
      s.meal = {
        slotKey: key,
        dishId: dish.id,
        rewardDishId: dish.id,
        chosenAt: action.now,
        seedCrop: dish.seed,
        planted: false,
        plotId: null,
        checkedIn: false,
      };
      track(s, 'choose', action.now);
      const before = s.streak.count;
      s.streak = touchStreak(s.streak, action.now);
      streakChest(s, before, action.now);
      return s;
    }

    case 'PLANT_MEAL_SEED': {
      const meal = state.meal;
      if (!meal || meal.planted) return state;
      const plot = firstEmptyPlot(state.plots);
      if (!plot || state.seeds[meal.seedCrop] <= 0) return state;
      const s = structuredClone(state);
      const key = `plant:${meal.slotKey}`;
      if (!post(s, key, `seed:${meal.seedCrop}`, -1, `plot:${plot.id}`, action.now)) return state;
      const crop = CROPS[meal.seedCrop];
      s.plots = s.plots.map((p) =>
        p.id === plot.id
          ? {
              ...p,
              crop: crop.id,
              plantedAt: action.now,
              readyAt: action.now + crop.growHours * HOUR_MS,
              wateredAt: null,
              sourceDishId: meal.dishId,
            }
          : p,
      );
      s.meal = { ...meal, planted: true, plotId: plot.id };
      addStamp(s, 'discovered', meal.dishId, action.now);
      track(s, 'plant', action.now);
      return s;
    }

    case 'PLANT_FROM_TRAY': {
      const plot = state.plots.find((p) => p.id === action.plotId);
      if (!plot || plot.crop !== null || state.seeds[action.crop] <= 0) return state;
      const s = structuredClone(state);
      const key = `tray:${action.plotId}:${action.now}`;
      if (!post(s, key, `seed:${action.crop}`, -1, `plot:${plot.id}`, action.now)) return state;
      const crop = CROPS[action.crop];
      s.plots = s.plots.map((p) =>
        p.id === plot.id
          ? {
              ...p,
              crop: crop.id,
              plantedAt: action.now,
              readyAt: action.now + crop.growHours * HOUR_MS,
              wateredAt: null,
              sourceDishId: null,
            }
          : p,
      );
      // A meal seed planted manually from the tray still counts as the meal's planting.
      const meal = s.meal;
      if (meal && !meal.planted && meal.seedCrop === action.crop) {
        s.meal = { ...meal, planted: true, plotId: plot.id };
        s.plots = s.plots.map((p) => (p.id === plot.id ? { ...p, sourceDishId: meal.dishId } : p));
        addStamp(s, 'discovered', meal.dishId, action.now);
      }
      track(s, 'plant', action.now);
      return s;
    }

    case 'WATER': {
      const plot = state.plots.find((p) => p.id === action.plotId);
      if (!plot || waterBlock(state, plot, action.now) !== null) return state;
      const s = structuredClone(state);
      ensureDay(s, action.now);
      const left = plot.readyAt! - action.now;
      s.plots = s.plots.map((p) =>
        p.id === plot.id
          ? {
              ...p,
              readyAt: action.now + Math.round(left * (1 - WATERING.cut)),
              wateredAt: action.now,
            }
          : p,
      );
      s.water = { ...s.water, used: s.water.used + 1 };
      track(s, 'water', action.now);
      return s;
    }

    case 'CATCH': {
      const age = action.now - action.castAt;
      // Only once the fish has bitten (the bite comes biteDelay after the cast).
      if (
        age < biteDelay(action.castAt) - BITE_SLACK_MS ||
        age > FISHING.maxCastMs ||
        fishingLeft(state, action.now) <= 0
      )
        return state;
      const kind = catchFor(action.castAt, level(state.xp).level);
      const s = structuredClone(state);
      ensureDay(s, action.now);
      const key = `catch:${action.castAt}`;
      if (!post(s, key, `ingredient:${kind}`, 1, `Câu được ${CATCHES[kind].name}`, action.now))
        return state;
      post(s, `xp:${key}`, 'xp', XP.catch, 'Câu cá', action.now);
      s.fishing = { ...s.fishing, used: s.fishing.used + 1 };
      track(s, 'catch', action.now);
      return s;
    }

    case 'HARVEST_PLOT':
    case 'HARVEST_ALL': {
      const ready = state.plots.filter(
        (p) =>
          plotStage(p, action.now) === 'ready' &&
          (action.type === 'HARVEST_ALL' || p.id === action.plotId),
      );
      if (ready.length === 0) return state;
      const s = structuredClone(state);
      let picked = 0;
      for (const plot of ready) {
        const crop = CROPS[plot.crop!];
        // Each cycle starts at its own plantedAt, so a tree's next harvest has a new key.
        const tag = `${plot.id}:${plot.plantedAt}`;
        // A friend's pick took one of the plot's crops; the rest (and the XP) are ours.
        const got = Math.max(1, crop.yield - (plot.stolen ? 1 : 0));
        // A cycle already harvested (a plot restored from an older copy) pays and counts nothing.
        if (!post(s, `harvest:${tag}`, `ingredient:${crop.id}`, got, 'harvest', action.now))
          continue;
        picked++;
        if (crop.kind === 'tree') track(s, 'fruit', action.now);
        if (crop.kind === 'mushroom') track(s, 'mushroom', action.now);
        if (!(s.grown ?? []).includes(crop.id)) s.grown = [...(s.grown ?? []), crop.id];
        // XP grows with the wait of this cycle (first fruit, or a regrow for trees/mushrooms).
        const hours =
          (plot.harvests ?? 0) > 0 ? (crop.regrowHours ?? crop.growHours) : crop.growHours;
        post(s, `xp:harvest:${tag}`, 'xp', harvestXp(hours), 'harvest', action.now);
      }
      const readyIds = new Set(ready.map((p) => p.id));
      s.plots = s.plots.map((p) => {
        if (!readyIds.has(p.id)) return p;
        const def = CROPS[p.crop!];
        const harvests = (p.harvests ?? 0) + 1;
        // Trees stay and fruit again; a mushroom block gives its flushes, then is spent.
        const stays =
          def.kind === 'tree' || (def.kind === 'mushroom' && harvests < (def.flushes ?? 1));
        if (stays) {
          const again = (def.regrowHours ?? def.growHours) * HOUR_MS;
          return {
            ...p,
            plantedAt: action.now,
            readyAt: action.now + again,
            wateredAt: null,
            stolen: undefined,
            harvests,
          };
        }
        return {
          ...p,
          crop: null,
          plantedAt: null,
          readyAt: null,
          sourceDishId: null,
          wateredAt: null,
          stolen: undefined,
          harvests: undefined,
        };
      });
      track(s, 'harvest', action.now, picked);
      return s;
    }

    case 'COOK': {
      const s = structuredClone(state);
      return cookInto(s, action.recipeId, action.now) ? s : state;
    }

    case 'SERVE_GUEST': {
      const guest = todaysGuests(state, action.now).find((g) => g.id === action.guestId);
      if (!guest || !canServe(state, guest)) return state;
      const s = structuredClone(state);
      ensureDay(s, action.now);
      if (!cookInto(s, guest.recipe, action.now)) return state;
      // Paid for this cooking: its stars count it.
      const pay = guestPay(guest.recipe, s.cooked[guest.recipe] ?? 0, !!guest.event);
      if (guest.event) {
        const e = s.events[guest.event] ?? { days: [], claimed: [] };
        s.events = { ...s.events, [guest.event]: { ...e, days: [...e.days, guest.date] } };
      }
      post(s, `${guest.id}:coin`, 'coin', pay, 'guest', action.now);
      post(s, `${guest.id}:xp`, 'xp', GUESTS.xp, 'guest', action.now);
      s.orders = { ...s.orders, done: [...s.orders.done, guest.id] };
      track(s, 'earn', action.now, pay);
      return s;
    }

    case 'FULFILL_ORDER': {
      const order = todaysOrders(state, action.now).find((o) => o.id === action.orderId);
      if (!order || !canFulfill(state, order)) return state;
      const s = structuredClone(state);
      ensureDay(s, action.now);
      const key = `order:${order.id}`;
      for (const i of order.items) {
        post(s, `${key}:${i.crop}`, `ingredient:${i.crop}`, -i.qty, 'order', action.now);
      }
      for (const seed of order.reward.seeds) {
        post(s, `${key}:seed:${seed.crop}`, `seed:${seed.crop}`, seed.qty, 'order', action.now);
      }
      post(s, `${key}:xp`, 'xp', order.reward.xp, 'order', action.now);
      if (order.reward.water > 0) {
        s.water = { ...s.water, bonus: s.water.bonus + order.reward.water };
      }
      s.orders = { ...s.orders, done: [...s.orders.done, order.id] };
      track(s, 'order', action.now);
      return s;
    }

    case 'ATTACH_PHOTO': {
      // Only a meal that was actually eaten (or swapped) gets a photo, once.
      const record = state.history.find((h) => h.slotKey === action.slotKey);
      if (!record || record.outcome === 'skipped' || state.photos.includes(action.slotKey)) {
        return state;
      }
      const s = structuredClone(state);
      s.photos = [...s.photos, action.slotKey];
      // A photo put back after removing it shows again, but pays and counts only the first time.
      if (post(s, `photo:${action.slotKey}`, 'xp', XP.checkinPhoto, 'photo', action.now))
        track(s, 'photo', action.now);
      return s;
    }

    case 'REMOVE_PHOTO':
      // The XP stays: the ledger key is spent, so a new photo can't pay twice either.
      return state.photos.includes(action.slotKey)
        ? { ...state, photos: state.photos.filter((k) => k !== action.slotKey) }
        : state;

    case 'LOAD_PROGRESS':
      return { ...action.progress, settings: state.settings };

    case 'FEED_ANIMAL': {
      const def = ANIMALS[action.animal];
      if (animalStage(state, def.id, action.now) !== 'hungry' || state.ingredients[def.feed] <= 0) {
        return state;
      }
      const s = structuredClone(state);
      const key = `feed:${def.id}:${action.now}`;
      if (!post(s, key, `ingredient:${def.feed}`, -1, 'feed', action.now)) return state;
      s.animals[def.id] = { fedAt: action.now, readyAt: action.now + def.hours * HOUR_MS };
      track(s, 'feed', action.now);
      return s;
    }

    case 'COLLECT_ANIMAL': {
      const def = ANIMALS[action.animal];
      const a = state.animals[def.id];
      if (animalStage(state, def.id, action.now) !== 'ready' || a.fedAt === null) return state;
      const s = structuredClone(state);
      const tag = `${def.id}:${a.fedAt}`;
      const yieldN = def.yield + upgradeLevel(state, 'barn');
      post(s, `collect:${tag}`, `ingredient:${def.product}`, yieldN, 'animal', action.now);
      post(s, `xp:collect:${tag}`, 'xp', harvestXp(def.hours), 'animal', action.now);
      s.animals[def.id] = { fedAt: null, readyAt: null };
      track(s, 'collect', action.now);
      return s;
    }

    case 'PLACE_DECOR': {
      if (!state.decor.includes(action.decor)) return state;
      const x = Math.round(action.x);
      const z = Math.round(action.z);
      // Two decorations never share a cell.
      const taken = Object.entries(state.decorLayout).some(
        ([id, pos]) => id !== action.decor && pos && pos.x === x && pos.z === z,
      );
      if (taken) return state;
      return {
        ...state,
        decorLayout: {
          ...state.decorLayout,
          [action.decor]: { x, z, rot: ((action.rot % 4) + 4) % 4 },
        },
      };
    }

    case 'STORE_DECOR':
      if (!state.decor.includes(action.decor)) return state;
      return {
        ...state,
        decorLayout: { ...state.decorLayout, [action.decor]: null },
        decorSlots: { ...state.decorSlots, [action.decor]: null },
      };

    case 'MOVE_DECOR': {
      const id = action.decor;
      if (!state.decor.includes(id) || !Number.isInteger(action.slot)) return state;
      if (action.slot < 0 || action.slot >= DECOR_SLOTS.length) return state;
      const from = decorSlot(id, state.decorSlots);
      if (from?.slot === action.slot) return state;
      const there = slotsTaken(state.decor, state.decorSlots).get(action.slot);
      const slots: DecorSlots = {
        ...state.decorSlots,
        [id]: { slot: action.slot, flip: from?.flip ?? false },
      };
      // The one standing there takes our old place (or is put away when we came from the barn).
      if (there && there !== id) {
        const theirs = decorSlot(there, state.decorSlots);
        slots[there] = from ? { slot: from.slot, flip: theirs?.flip ?? false } : null;
      }
      return { ...state, decorSlots: slots };
    }

    case 'FLIP_DECOR': {
      const at = state.decor.includes(action.decor)
        ? decorSlot(action.decor, state.decorSlots)
        : null;
      if (!at) return state;
      return {
        ...state,
        decorSlots: { ...state.decorSlots, [action.decor]: { ...at, flip: !at.flip } },
      };
    }

    case 'FRIEND_EVENT': {
      const ev = action.event;
      const key = `friend:${ev.id}`;
      // `friend:1:` must not match `friend:10:xp`.
      if (state.ledger.some((e) => e.key.startsWith(`${key}:`))) return state;
      const s = structuredClone(state);
      if (ev.type === 'water') {
        // A friend's watering shortens the plot like a can would, without using ours.
        const plot = s.plots.find((p) => p.id === ev.plotId);
        if (
          plot &&
          (!ev.crop || plot.crop === ev.crop) &&
          (ev.cycle === undefined || plot.plantedAt === ev.cycle) &&
          plot.readyAt !== null &&
          plot.readyAt > action.now
        ) {
          plot.readyAt = action.now + Math.round((plot.readyAt - action.now) * (1 - WATERING.cut));
          plot.wateredAt = action.now;
        }
        post(s, `${key}:xp`, 'xp', XP.friendHelp, `friend:water`, action.now);
      } else if (ev.type === 'gift' && ev.crop) {
        post(s, `${key}:seed`, `seed:${ev.crop}`, 1, 'friend:gift', action.now);
      } else if (ev.type === 'helped') {
        // We watered a friend's plot: our reward for helping.
        post(s, `${key}:xp`, 'xp', XP.friendHelp, 'friend:helped', action.now);
        track(s, 'help', action.now);
      } else if (ev.type === 'stole' && ev.crop) {
        // We picked one from a friend's ripe plot.
        post(s, `${key}:item`, `ingredient:${ev.crop}`, 1, 'friend:stole', action.now);
        post(s, `${key}:xp`, 'xp', XP.steal, 'friend:stole', action.now);
        track(s, 'steal', action.now);
      } else if (ev.type === 'present' && ev.crop) {
        post(s, `${key}:seed`, `seed:${ev.crop}`, 1, 'friend:present', action.now);
      } else if (ev.type === 'referral' && ((ev.coins ?? 0) > 0 || (ev.xp ?? 0) > 0)) {
        if ((ev.coins ?? 0) > 0)
          post(s, `${key}:coin`, 'coin', Math.floor(ev.coins!), 'friend:referral', action.now);
        if ((ev.xp ?? 0) > 0)
          post(s, `${key}:xp`, 'xp', Math.floor(ev.xp!), 'friend:referral', action.now);
      } else {
        // stolen / thanks: nothing to pay, but mark the event as applied.
        if (ev.type === 'stolen') {
          const plot = s.plots.find((p) => p.id === ev.plotId);
          // Only the same planting, still unharvested: a replanted plot is not touched.
          if (
            plot &&
            plot.crop !== null &&
            (!ev.crop || plot.crop === ev.crop) &&
            (ev.cycle === undefined || plot.plantedAt === ev.cycle)
          )
            plot.stolen = true;
        }
        post(s, `${key}:seen`, 'xp', 0, `friend:${ev.type}`, action.now);
      }
      return s;
    }

    case 'GIFT_SENT': {
      if (state.seeds[action.crop] <= 0) return state;
      const s = structuredClone(state);
      if (!post(s, `present:${action.id}`, `seed:${action.crop}`, -1, 'friend:present', action.now))
        return state;
      track(s, 'gift', action.now);
      return s;
    }

    case 'SET_SOCIAL':
      return state.quests.social === action.on
        ? state
        : { ...state, quests: { ...state.quests, social: action.on } };

    case 'ROLL_QUESTS': {
      const qs = questsFor(state, action.now);
      return qs === state.quests ? state : { ...state, quests: qs };
    }

    case 'CLAIM_QUEST': {
      const qs = questsFor(state, action.now);
      const def = QUEST_DEFS[action.id];
      if (!def) return state;
      const weekly = qs.weekly.includes(def.id);
      if (!weekly && !qs.daily.includes(def.id)) return state;
      const tally = weekly ? qs.weekTally : qs.day;
      const claimed = weekly ? qs.weekClaimed : qs.claimed;
      if (claimed.includes(def.id) || (tally[def.metric] ?? 0) < def.target) return state;
      const s = structuredClone(state);
      s.quests = qs;
      const key = `quest:${weekly ? qs.week : qs.date}:${def.id}`;
      if (!grant(s, key, def.reward, `quest:${def.id}`, action.now)) return state;
      s.quests = weekly
        ? { ...s.quests, weekClaimed: [...s.quests.weekClaimed, def.id] }
        : { ...s.quests, claimed: [...s.quests.claimed, def.id] };
      if (!weekly && s.quests.daily.every((id) => s.quests.claimed.includes(id))) {
        track(s, 'allDaily', action.now);
      }
      return s;
    }

    case 'CLAIM_BADGE': {
      const b = badges(state).find((x) => x.def.id === action.id);
      if (!b || !b.ready) return state;
      const tier = b.claimed + 1;
      const s = structuredClone(state);
      if (
        !grant(
          s,
          `badge:${b.def.id}:${tier}`,
          badgeReward(tier, b.def.id),
          `badge:${b.def.id}`,
          action.now,
        )
      )
        return state;
      s.quests = { ...s.quests, badges: { ...s.quests.badges, [b.def.id]: tier } };
      return s;
    }

    case 'OPEN_CHEST': {
      const chest = state.quests.chest;
      const reward = chest ? STREAK_CHESTS[chest.streak] : undefined;
      if (!chest || !reward) return state;
      const s = structuredClone(state);
      grant(s, `chest:${chest.date}:${chest.streak}`, reward, 'chest', action.now);
      s.quests = { ...s.quests, chest: null };
      return s;
    }

    case 'CLEAR_PLOT': {
      const plot = state.plots.find((p) => p.id === action.plotId);
      if (!plot || plot.crop === null) return state;
      return {
        ...state,
        plots: state.plots.map((p) =>
          p.id === plot.id
            ? {
                ...p,
                crop: null,
                plantedAt: null,
                readyAt: null,
                sourceDishId: null,
                wateredAt: null,
                stolen: undefined,
                harvests: undefined,
              }
            : p,
        ),
      };
    }

    case 'START_HIVE': {
      if (hiveStage(state, action.now) !== 'idle') return state;
      return {
        ...state,
        hive: { startedAt: action.now, readyAt: action.now + HIVE.hours * HOUR_MS },
      };
    }

    case 'COLLECT_HIVE': {
      const h = state.hive;
      if (hiveStage(state, action.now) !== 'ready' || h.startedAt === null) return state;
      const s = structuredClone(state);
      const key = `hive:${h.startedAt}`;
      const honey = HIVE.yield.honey + upgradeLevel(state, 'hive');
      if (!post(s, `${key}:honey`, 'ingredient:honey', honey, 'hive', action.now)) return state;
      post(s, `${key}:comb`, 'ingredient:honeycomb', HIVE.yield.honeycomb, 'hive', action.now);
      post(s, `xp:${key}`, 'xp', harvestXp(HIVE.hours), 'hive', action.now);
      // The bees start filling it again straight away.
      s.hive = { startedAt: action.now, readyAt: action.now + HIVE.hours * HOUR_MS };
      track(s, 'honey', action.now);
      return s;
    }

    case 'SEND_BOAT': {
      if (boatStage(state, action.now) !== 'docked') return state;
      return {
        ...state,
        boat: { sentAt: action.now, returnAt: action.now + BOAT.hours * HOUR_MS },
      };
    }

    case 'COLLECT_BOAT': {
      const b = state.boat;
      if (boatStage(state, action.now) !== 'back' || b.sentAt === null) return state;
      const s = structuredClone(state);
      const items = boatCatch(b.sentAt, level(state.xp).level, upgradeLevel(state, 'boat'));
      items.forEach((kind, i) => {
        post(s, `boat:${b.sentAt}:${i}`, `ingredient:${kind}`, 1, 'boat', action.now);
      });
      post(s, `xp:boat:${b.sentAt}`, 'xp', XP.catch * items.length, 'boat', action.now);
      s.boat = { sentAt: null, returnAt: null };
      track(s, 'catch', action.now, items.length);
      track(s, 'boat', action.now);
      return s;
    }

    case 'SELL': {
      if (state.ingredients[action.crop] <= 0) return state;
      const s = structuredClone(state);
      const key = `sell:${action.crop}:${action.now}`;
      if (!post(s, `${key}:out`, `ingredient:${action.crop}`, -1, 'market', action.now)) {
        return state;
      }
      post(s, `${key}:coin`, 'coin', MARKET.sell(action.crop), 'market', action.now);
      track(s, 'sell', action.now);
      track(s, 'earn', action.now, MARKET.sell(action.crop));
      return s;
    }

    case 'BUY_SEED': {
      const price = MARKET.seed(action.crop);
      if (!cropAvailable(state, action.crop) || state.coins < price) return state;
      const s = structuredClone(state);
      const key = `buy:${action.crop}:${action.now}`;
      if (!post(s, `${key}:coin`, 'coin', -price, 'market', action.now)) return state;
      post(s, `${key}:seed`, `seed:${action.crop}`, 1, 'market', action.now);
      track(s, 'buy', action.now);
      return s;
    }

    case 'BUY_ITEM': {
      if (!isMeat(action.item)) return state;
      const price = MARKET.buy(action.item);
      if (state.coins < price) return state;
      const s = structuredClone(state);
      const key = `buy:${action.item}:${action.now}`;
      if (!post(s, `${key}:coin`, 'coin', -price, 'market', action.now)) return state;
      post(s, `${key}:item`, `ingredient:${action.item}`, 1, 'market', action.now);
      track(s, 'buy', action.now);
      return s;
    }

    case 'CLAIM_EVENT': {
      const ev = EVENTS.find((e) => e.id === action.id);
      const need = ev?.targets[action.step];
      const reward = EVENT.rewards[action.step];
      const log = state.events[action.id] ?? { days: [], claimed: [] };
      if (!ev || need === undefined || !reward || log.claimed.includes(action.step)) return state;
      if (log.days.length < need) return state;
      const s = structuredClone(state);
      const key = `event:${ev.id}:${action.step}`;
      if (!post(s, `${key}:coin`, 'coin', reward.coins, 'event', action.now)) return state;
      post(s, `${key}:xp`, 'xp', reward.xp, 'event', action.now);
      s.events = { ...s.events, [ev.id]: { ...log, claimed: [...log.claimed, action.step] } };
      track(s, 'earn', action.now, reward.coins);
      return s;
    }

    case 'BUY_UPGRADE': {
      const def = UPGRADES[action.id];
      if (!def) return state;
      const lvl = upgradeLevel(state, action.id) + 1;
      const price = def.prices[lvl - 1];
      if (price === undefined || state.coins < price) return state;
      const s = structuredClone(state);
      if (!post(s, `upgrade:${action.id}:${lvl}`, 'coin', -price, 'upgrade', action.now)) {
        return state;
      }
      s.upgrades = { ...s.upgrades, [action.id]: lvl };
      track(s, 'buy', action.now);
      return s;
    }

    case 'CLAIM_COLLECTION': {
      const c = collectionProgress(state).find((x) => x.id === action.id);
      if (!c || !c.complete || c.claimed) return state;
      const s = structuredClone(state);
      post(s, `collection:${c.id}:coin`, 'coin', c.reward.coins, 'collection', action.now);
      post(s, `collection:${c.id}:xp`, 'xp', c.reward.xp, 'collection', action.now);
      s.collections = [...s.collections, c.id];
      track(s, 'earn', action.now, c.reward.coins);
      return s;
    }

    case 'BUY_LAND': {
      // Clearing the next plot: open at this level, paid in xu.
      const land = nextLand(state);
      if (!land?.affordable) return state;
      const s = structuredClone(state);
      if (!post(s, `land:${land.id}:${action.now}`, 'coin', -land.price, 'land', action.now)) {
        return state;
      }
      s.plots = [
        ...s.plots,
        {
          id: land.id,
          crop: null,
          plantedAt: null,
          readyAt: null,
          sourceDishId: null,
          wateredAt: null,
        },
      ];
      track(s, 'buy', action.now);
      return s;
    }

    case 'BUY_DECOR': {
      const def = DECOR[action.decor];
      if (!def || state.decor.includes(def.id) || state.coins < def.price) return state;
      const s = structuredClone(state);
      if (!post(s, `decor:${def.id}`, 'coin', -def.price, 'decor', action.now)) return state;
      // Its home may hold a decoration the guest moved there: it then stands on a free slot.
      if (slotsTaken(s.decor, s.decorSlots).has(DECOR_HOME[def.id])) {
        const free = freeSlot(s.decor, s.decorSlots, DECOR_HOME[def.id], 1);
        s.decorSlots = {
          ...s.decorSlots,
          [def.id]: free === null ? null : { slot: free, flip: false },
        };
      }
      s.decor = [...s.decor, def.id];
      track(s, 'decor', action.now);
      return s;
    }

    case 'CHECK_IN': {
      const meal = state.meal;
      if (!meal || meal.checkedIn) return state;
      const s = structuredClone(state);
      const key = `checkin:${meal.slotKey}`;
      const xp =
        action.outcome === 'ate'
          ? XP.checkinAte
          : action.outcome === 'swapped'
            ? XP.checkinSwapped
            : XP.checkinSkipped;
      if (!post(s, key, 'xp', xp, `checkin:${action.outcome}`, action.now)) return state;

      if (action.outcome !== 'skipped') {
        // A real meal brings rain: the meal's plant ripens now, and the can gets a refill.
        if (meal.plotId !== null) {
          s.plots = s.plots.map((p) =>
            p.id === meal.plotId && p.crop && p.readyAt !== null && p.readyAt > action.now
              ? { ...p, readyAt: action.now, wateredAt: action.now }
              : p,
          );
        }
        ensureDay(s, action.now);
        s.water = { ...s.water, bonus: s.water.bonus + 1 };
      }
      if (action.outcome === 'ate') addStamp(s, 'eaten', meal.dishId, action.now);
      if (action.again === 'no' && !s.hiddenDishIds.includes(meal.dishId)) {
        s.hiddenDishIds = [...s.hiddenDishIds, meal.dishId];
      }
      s.meal = { ...meal, checkedIn: true };
      s.history = [
        {
          slotKey: meal.slotKey,
          dishId: meal.dishId,
          outcome: action.outcome,
          rating: action.outcome === 'skipped' ? null : action.rating,
          again: action.outcome === 'skipped' ? null : action.again,
          at: action.now,
        },
        ...s.history,
      ].slice(0, 30);
      if (s.reminder?.slotKey === meal.slotKey) s.reminder = null;
      track(s, 'checkin', action.now);
      if (action.outcome !== 'skipped' && action.rating !== null) track(s, 'rate', action.now);
      const before = s.streak.count;
      s.streak = touchStreak(s.streak, action.now);
      streakChest(s, before, action.now);
      return s;
    }

    case 'HIDE_DISH':
      if (state.hiddenDishIds.includes(action.dishId)) return state;
      return { ...state, hiddenDishIds: [...state.hiddenDishIds, action.dishId] };

    case 'UNHIDE_DISH':
      return { ...state, hiddenDishIds: state.hiddenDishIds.filter((d) => d !== action.dishId) };

    case 'UNHIDE_ALL':
      return state.hiddenDishIds.length ? { ...state, hiddenDishIds: [] } : state;

    case 'SET_REMINDER':
      if (!state.meal || state.meal.checkedIn) return state;
      return {
        ...state,
        reminder: { slotKey: state.meal.slotKey, at: action.now + REMINDER_DELAY_MS },
      };

    case 'SAVE_JOURNEY':
      return state.journeySaved ? state : { ...state, journeySaved: true };

    case 'ACK_UNLOCK':
      return state.recentUnlock ? { ...state, recentUnlock: null } : state;

    case 'ACK_CROP_UNLOCK':
      return state.recentCropUnlock ? { ...state, recentCropUnlock: null } : state;

    case 'SYNC_UNLOCKS':
      // A fresh object lets gameReducer apply the unlocks (and their gift seeds, once).
      return { ...state };

    case 'SET_QUALITY':
      return { ...state, settings: { ...state.settings, quality: action.quality } };

    case 'SET_MOTION':
      return { ...state, settings: { ...state.settings, motion: action.motion } };

    case 'SET_OWNER':
      return (state.owner ?? null) === action.owner ? state : { ...state, owner: action.owner };

    case 'SET_SIMULATE_FAILURE':
      return { ...state, settings: { ...state.settings, simulateFailure: action.value } };

    case 'RESET': {
      const fresh = createInitialProgress(action.now);
      return { ...fresh, settings: state.settings };
    }
  }
}

export function dishSeedName(dishId: string): string {
  const dish = getDish(dishId);
  return dish ? CROPS[dish.seed].seedName : '';
}

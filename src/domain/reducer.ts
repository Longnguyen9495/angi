import { getDish } from '../data/dishes';
import {
  ANIMALS,
  CATCHES,
  CROPS,
  DAILY_MISSIONS,
  DECOR,
  FISHING,
  MARKET,
  RECIPES,
  WATERING,
  XP,
} from '../data/game';
import type { AnimalId, CropId, DecorId, MissionKind, ProduceId, RecipeId } from '../data/types';
import {
  createInitialProgress,
  type AgainAnswer,
  type CheckInOutcome,
  type FriendEvent,
  type GuestProgress,
  type LedgerEntry,
  type MotionPref,
  type Resource,
} from './progress';
import type { Filters } from './recommend';
import {
  animalStage,
  catchFor,
  cropAvailable,
  fishingLeft,
  firstEmptyPlot,
  newPlotCount,
  newlyUnlockable,
  newlyUnlockableCrops,
  plotStage,
  recipeProgress,
  waterBlock,
} from './selectors';
import { canFulfill, todaysOrders } from './orders';
import { HOUR_MS, dateKey, daysBetween, slotKey } from './time';

export type Action =
  | { type: 'SET_FILTERS'; filters: Filters }
  | { type: 'CHOOSE_DISH'; dishId: string; now: number }
  | { type: 'PLANT_MEAL_SEED'; now: number }
  | { type: 'PLANT_FROM_TRAY'; crop: CropId; plotId: number; now: number }
  | { type: 'WATER'; plotId: number; now: number }
  | { type: 'HARVEST_ALL'; now: number }
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
  /** A friend's help or gift, confirmed by the server; applied once per event id. */
  | { type: 'FRIEND_EVENT'; event: FriendEvent; now: number }
  | { type: 'BUY_SEED'; crop: CropId; now: number }
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
  | { type: 'SET_SIMULATE_FAILURE'; value: boolean }
  | { type: 'RESET'; now: number };

const LEDGER_LIMIT = 400;
/** Minutes after choosing a dish when the in-page check-in reminder fires. */
export const REMINDER_DELAY_MS = 45 * 60 * 1000;

function hasKey(s: GuestProgress, key: string): boolean {
  return s.ledger.some((e) => e.key === key);
}

function balance(s: GuestProgress, resource: Resource): number {
  if (resource === 'xp') return s.xp;
  if (resource === 'coin') return s.coins;
  if (resource === 'stamp') return s.stamps.discovered.length + s.stamps.eaten.length;
  const [kind, id] = resource.split(':') as ['seed' | 'ingredient', string];
  return kind === 'seed' ? s.seeds[id as CropId] : s.ingredients[id as ProduceId];
}

/**
 * Applies a resource change through the ledger. Returns false (and changes
 * nothing) when the idempotency key was already used or the balance would go
 * negative — double taps and retries can never pay out twice.
 */
function post(
  s: GuestProgress,
  key: string,
  resource: Resource,
  delta: number,
  reason: string,
  now: number,
): boolean {
  if (hasKey(s, key)) return false;
  if (resource !== 'stamp') {
    const next = balance(s, resource) + delta;
    if (next < 0) return false;
    if (resource === 'xp') s.xp = next;
    else if (resource === 'coin') s.coins = next;
    else {
      const [kind, id] = resource.split(':') as ['seed' | 'ingredient', string];
      if (kind === 'seed') s.seeds[id as CropId] = next;
      else s.ingredients[id as ProduceId] = next;
    }
  }
  const entry: LedgerEntry = {
    key,
    resource,
    delta,
    balanceAfter: balance(s, resource),
    reason,
    at: now,
  };
  s.ledger = [...s.ledger, entry].slice(-LEDGER_LIMIT);
  return true;
}

function ensureDay(s: GuestProgress, now: number) {
  const today = dateKey(now);
  if (s.missions.date !== today) s.missions = { date: today, done: [] };
  if (s.water.date !== today) s.water = { date: today, used: 0, bonus: 0 };
  if (s.fishing.date !== today) s.fishing = { date: today, used: 0 };
  if (s.orders.date !== today) s.orders = { date: today, done: [] };
}

function completeMission(s: GuestProgress, id: MissionKind, now: number) {
  ensureDay(s, now);
  const xp = DAILY_MISSIONS.find((m) => m.id === id)?.xp ?? 0;
  if (s.missions.done.includes(id)) return;
  if (post(s, `mission:${s.missions.date}:${id}`, 'xp', xp, `mission:${id}`, now)) {
    s.missions = { ...s.missions, done: [...s.missions.done, id] };
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
  const plots = newPlotCount(s) - s.plots.length;
  if (crops.length === 0 && plots <= 0) return s;
  const next = structuredClone(s);
  for (const crop of crops) {
    next.unlockedCrops = [...next.unlockedCrops, crop];
    post(next, `unlock:crop:${crop}`, `seed:${crop}`, 1, 'unlock', now);
  }
  for (let i = 0; i < plots; i++) {
    next.plots = [
      ...next.plots,
      {
        id: next.plots.length + 1,
        crop: null,
        plantedAt: null,
        readyAt: null,
        sourceDishId: null,
        wateredAt: null,
      },
    ];
  }
  next.recentCropUnlock = crops[crops.length - 1] ?? next.recentCropUnlock;
  return next;
}

export function gameReducer(state: GuestProgress, action: Action): GuestProgress {
  const next = baseReducer(state, action);
  if (next === state || !('now' in action)) return next;
  return applyUnlocks(next, action.now);
}

function baseReducer(state: GuestProgress, action: Action): GuestProgress {
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
        // Switching dish before planting re-targets the pending seed instead of adding one.
        post(
          s,
          `seed:${key}:r${rev}:reverse`,
          `seed:${current.seedCrop}`,
          -1,
          'reversal',
          action.now,
        );
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
      completeMission(s, 'choose', action.now);
      s.streak = touchStreak(s.streak, action.now);
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
      return s;
    }

    case 'CATCH': {
      const age = action.now - action.castAt;
      if (age < 0 || age > FISHING.maxCastMs || fishingLeft(state, action.now) <= 0) return state;
      const kind = catchFor(action.castAt);
      const s = structuredClone(state);
      ensureDay(s, action.now);
      const key = `catch:${action.castAt}`;
      if (!post(s, key, `ingredient:${kind}`, 1, `Câu được ${CATCHES[kind].name}`, action.now))
        return state;
      post(s, `xp:${key}`, 'xp', XP.catch, 'Câu cá', action.now);
      s.fishing = { ...s.fishing, used: s.fishing.used + 1 };
      return s;
    }

    case 'HARVEST_ALL': {
      const ready = state.plots.filter((p) => plotStage(p, action.now) === 'ready');
      if (ready.length === 0) return state;
      const s = structuredClone(state);
      for (const plot of ready) {
        const crop = CROPS[plot.crop!];
        const tag = `${plot.id}:${plot.plantedAt}`;
        post(s, `harvest:${tag}`, `ingredient:${crop.id}`, crop.yield, 'harvest', action.now);
        post(s, `xp:harvest:${tag}`, 'xp', XP.harvestPerPlot, 'harvest', action.now);
      }
      const readyIds = new Set(ready.map((p) => p.id));
      s.plots = s.plots.map((p) =>
        readyIds.has(p.id)
          ? {
              ...p,
              crop: null,
              plantedAt: null,
              readyAt: null,
              sourceDishId: null,
              wateredAt: null,
            }
          : p,
      );
      completeMission(s, 'harvest-or-cook', action.now);
      return s;
    }

    case 'COOK': {
      if (!recipeProgress(state, action.recipeId).canCook) return state;
      const recipe = RECIPES[action.recipeId];
      const s = structuredClone(state);
      const key = `cook:${recipe.id}:${action.now}`;
      for (const ing of recipe.ingredients) {
        post(s, `${key}:${ing.crop}`, `ingredient:${ing.crop}`, -ing.qty, 'cook', action.now);
      }
      post(s, `${key}:xp`, 'xp', recipe.xp, 'cook', action.now);
      s.cooked = { ...s.cooked, [recipe.id]: (s.cooked[recipe.id] ?? 0) + 1 };
      completeMission(s, 'harvest-or-cook', action.now);
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
      return s;
    }

    case 'ATTACH_PHOTO': {
      // Only a meal that was actually eaten (or swapped) gets a photo, once.
      const record = state.history.find((h) => h.slotKey === action.slotKey);
      if (!record || record.outcome === 'skipped' || state.photos.includes(action.slotKey)) {
        return state;
      }
      const s = structuredClone(state);
      post(s, `photo:${action.slotKey}`, 'xp', XP.checkinPhoto, 'photo', action.now);
      s.photos = [...s.photos, action.slotKey];
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
      return s;
    }

    case 'COLLECT_ANIMAL': {
      const def = ANIMALS[action.animal];
      const a = state.animals[def.id];
      if (animalStage(state, def.id, action.now) !== 'ready' || a.fedAt === null) return state;
      const s = structuredClone(state);
      const tag = `${def.id}:${a.fedAt}`;
      post(s, `collect:${tag}`, `ingredient:${def.product}`, def.yield, 'animal', action.now);
      post(s, `xp:collect:${tag}`, 'xp', XP.collectAnimal, 'animal', action.now);
      s.animals[def.id] = { fedAt: null, readyAt: null };
      completeMission(s, 'harvest-or-cook', action.now);
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
      return { ...state, decorLayout: { ...state.decorLayout, [action.decor]: null } };

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
      }
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
      return s;
    }

    case 'BUY_SEED': {
      const price = MARKET.seed(action.crop);
      if (!cropAvailable(state, action.crop) || state.coins < price) return state;
      const s = structuredClone(state);
      const key = `buy:${action.crop}:${action.now}`;
      if (!post(s, `${key}:coin`, 'coin', -price, 'market', action.now)) return state;
      post(s, `${key}:seed`, `seed:${action.crop}`, 1, 'market', action.now);
      return s;
    }

    case 'BUY_DECOR': {
      const def = DECOR[action.decor];
      if (!def || state.decor.includes(def.id) || state.coins < def.price) return state;
      const s = structuredClone(state);
      if (!post(s, `decor:${def.id}`, 'coin', -def.price, 'decor', action.now)) return state;
      s.decor = [...s.decor, def.id];
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
      completeMission(s, 'checkin', action.now);
      s.streak = touchStreak(s.streak, action.now);
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

    case 'SET_MOTION':
      return { ...state, settings: { ...state.settings, motion: action.motion } };

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

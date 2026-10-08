import { CROPS, WATERING } from '../data/game';
import {
  BALLOON,
  DAILY_SKY,
  DEW_PER_DAY,
  FLOORS,
  MACHINES,
  POT_PRICES,
  SET_REWARD,
  SHARDS_PER_POT,
  SHARD_POTS,
  SKY_CROPS,
  SKY_GOOD_PRICE,
  SKY_RECIPES,
  STARTER_POTS,
  TUTORIAL,
  TUTORIAL_HONEY,
  type MachineId,
  type SkyCropId,
  type SkyGoodId,
  type SkyItemId,
  type SkyRecipeId,
  type TutorialStep,
} from '../data/skyEconomy';
import { POT_SETS, SLOTS_PER_FLOOR, type PotId, type PotSetId } from '../data/skyGarden';
import type { BugId } from '../data/skyEconomy';
import { post } from './ledger';
import type { GuestProgress } from './progress';
import { cropAvailable, level, waterLeft } from './selectors';
import {
  balloonBoxes,
  emptySky,
  harvestOf,
  machineOpen,
  nextFloor,
  ownsSet,
  potPlace,
  potStats,
  recipeOpen,
  skyDay,
  skyOpen,
  skyXpLeft,
  slotCount,
  slotPrice,
  cropOpen,
  type SeedRef,
  type SkyPot,
  type SkyState,
} from './sky';
import { dateKey, daysBetween } from './time';

/*
 * Vườn Mây actions. Each one is all or nothing (a copy is changed, the original returned when
 * any step fails), and every resource moves through the ledger with a key ProgressGuard.php
 * checks. Stars, tiers and luck are not here: the server rolls them (Sky.php) and the result
 * comes back as a whole saved garden (LOAD_PROGRESS).
 */

export type SkyAction =
  | { type: 'SKY_OPEN_FLOOR'; now: number }
  | { type: 'SKY_BUY_SLOT'; floor: number; now: number }
  | { type: 'SKY_BUY_POT'; pot: PotId; now: number }
  | { type: 'SKY_SHARD_POT'; pot: PotId; now: number }
  | { type: 'SKY_BUY_SEED'; crop: SkyCropId; now: number }
  /** Stand a pot on a slot (from the store, or from another slot: a pot there swaps with it). */
  | { type: 'SKY_PLACE_POT'; uid: string; floor: number; slot: number; now: number }
  | { type: 'SKY_STORE_POT'; uid: string; now: number }
  | { type: 'SKY_PLANT'; uid: string; seed: SeedRef; now: number }
  | { type: 'SKY_WATER'; uid: string; now: number }
  /** What the server revealed for checks of plantings (src/services/sky.ts). */
  | {
      type: 'SKY_REVEAL';
      bugs: { uid: string; cycle: number; stage: number; bug: BugId | null }[];
      now: number;
    }
  | { type: 'SKY_CATCH'; uid: string; stage: number; now: number }
  | { type: 'SKY_HARVEST'; uid: string; now: number }
  | { type: 'SKY_HARVEST_FLOOR'; floor: number; now: number }
  | { type: 'SKY_START_JOB'; machine: MachineId; recipe: SkyRecipeId; now: number }
  | { type: 'SKY_COLLECT_JOB'; machine: MachineId; now: number }
  | { type: 'SKY_SELL'; good: SkyGoodId; qty: number; now: number }
  | { type: 'SKY_CLAIM_SET'; set: PotSetId; now: number }
  | { type: 'SKY_PACK_BOX'; box: number; now: number };

export function isSkyAction(a: { type: string }): a is SkyAction {
  return a.type.startsWith('SKY_');
}

/** A working copy with today's tallies in place. */
function draft(state: GuestProgress, now: number): { s: GuestProgress; sky: SkyState } {
  const s = structuredClone(state);
  const sky = s.sky ?? emptySky(now);
  sky.day = skyDay(sky, now);
  s.sky = sky;
  return { s, sky };
}

/** Sky XP within today's cap; what was paid. */
function payXp(
  s: GuestProgress,
  sky: SkyState,
  key: string,
  xp: number,
  reason: string,
  now: number,
) {
  const n = Math.min(xp, skyXpLeft(sky, now));
  if (n <= 0) return 0;
  if (!post(s, key, 'xp', n, reason, now)) return 0;
  sky.day = { ...sky.day, xp: sky.day.xp + n };
  return n;
}

/** Pays a tutorial step once (§0.4). */
function tutorial(s: GuestProgress, sky: SkyState, step: TutorialStep, now: number) {
  if (sky.tutorial.includes(step)) return;
  const r = TUTORIAL.find((t) => t.step === step);
  if (!r) return;
  const key = `sky:tut:${step}`;
  if (r.seeds) post(s, `${key}:seed`, `skyseed:${r.seeds.crop}`, r.seeds.qty, 'sky:tutorial', now);
  for (const [item, qty] of Object.entries(r.items ?? {})) {
    post(s, `${key}:item:${item}`, `skyitem:${item as SkyItemId}`, qty!, 'sky:tutorial', now);
  }
  if (r.pot) addPot(s, sky, r.pot, `${key}:pot`, now);
  // MIX01 needs honey: the step before it brings one when the pantry has none.
  if (step === 'dried' && s.ingredients.honey <= 0) {
    post(s, `${key}:honey`, 'ingredient:honey', TUTORIAL_HONEY, 'sky:tutorial', now);
  }
  sky.tutorial = [...sky.tutorial, step];
}

/** A new pot in the store (uid `<pot>.<serial>`), posted as pot:<id> +1. */
function addPot(
  s: GuestProgress,
  sky: SkyState,
  pot: PotId,
  key: string,
  now: number,
): SkyPot | null {
  const uid = `${pot}.${sky.serial}`;
  const p: SkyPot = {
    uid,
    pot,
    tier: POT_SETS.find((x) => x.pots.includes(pot))?.baseTier ?? 0,
    stars: 0,
    luck: 0,
    tries: 0,
    cycles: 0,
    plant: null,
  };
  sky.pots = { ...sky.pots, [uid]: p };
  if (!post(s, key, `pot:${pot}`, 1, 'sky:pot', now)) {
    const { [uid]: _gone, ...rest } = sky.pots;
    void _gone;
    sky.pots = rest;
    return null;
  }
  sky.serial += 1;
  return p;
}

function ensureRows(sky: SkyState) {
  while (sky.slots.length < sky.floors) sky.slots.push(Array(SLOTS_PER_FLOOR).fill(null));
  while (sky.bought.length < sky.floors) sky.bought.push(0);
}

export function skyReducer(state: GuestProgress, action: SkyAction): GuestProgress {
  const lv = level(state.xp).level;
  if (!skyOpen(lv)) return state;
  const now = action.now;

  switch (action.type) {
    case 'SKY_OPEN_FLOOR': {
      const n = nextFloor(state.sky ?? emptySky(now));
      if (n === null) return state;
      const def = FLOORS[n - 1]!;
      if (lv < def.level) return state;
      const { s, sky } = draft(state, now);
      const key = `sky:floor:${n}`;
      // Evidence of the opening for the server, even for the free first floor.
      if (!post(s, `${key}:open`, 'coin', 0, 'sky:floor', now)) return state;
      if (def.coins > 0 && !post(s, `${key}:coin`, 'coin', -def.coins, 'sky:floor', now))
        return state;
      if (
        def.cloudseed > 0 &&
        !post(s, `${key}:cloudseed`, 'skyitem:cloudseed', -def.cloudseed, 'sky:floor', now)
      )
        return state;
      if (def.dew > 0 && !post(s, `${key}:dew`, 'skyitem:dew', -def.dew, 'sky:floor', now))
        return state;
      sky.floors = n;
      ensureRows(sky);
      if (n === 1) {
        for (const pot of STARTER_POTS) addPot(s, sky, pot, `sky:starter:${pot}`, now);
      }
      if (n === 2) tutorial(s, sky, 'floor2', now);
      return s;
    }

    case 'SKY_BUY_SLOT': {
      const sky0 = state.sky;
      if (!sky0) return state;
      const price = slotPrice(sky0, action.floor);
      if (price === null) return state;
      const { s, sky } = draft(state, now);
      const k = (sky.bought[action.floor] ?? 0) + FREE_SLOT_BASE;
      if (!post(s, `sky:slot:${action.floor + 1}:${k}`, 'coin', -price, 'sky:slot', now))
        return state;
      sky.bought = sky.bought.map((b, i) => (i === action.floor ? b + 1 : b));
      return s;
    }

    case 'SKY_BUY_POT': {
      const price = POT_PRICES[action.pot];
      const sky0 = state.sky;
      if (!sky0 || !price || sky0.floors < price.floor) return state;
      const { s, sky } = draft(state, now);
      const key = `sky:potbuy:${action.pot}:${now}`;
      const pay = price.currency === 'coin' ? 'coin' : 'skyitem:gem';
      if (!post(s, `${key}:pay`, pay, -price.price, 'sky:shop', now)) return state;
      return addPot(s, sky, action.pot, key, now) ? s : state;
    }

    case 'SKY_SHARD_POT': {
      if (!state.sky || !SHARD_POTS.includes(action.pot)) return state;
      const { s, sky } = draft(state, now);
      const key = `sky:shardpot:${action.pot}:${now}`;
      if (!post(s, `${key}:pay`, 'skyitem:shard', -SHARDS_PER_POT, 'sky:shards', now)) return state;
      return addPot(s, sky, action.pot, key, now) ? s : state;
    }

    case 'SKY_BUY_SEED': {
      const sky0 = state.sky;
      if (!sky0 || !cropOpen(sky0, action.crop)) return state;
      const { s } = draft(state, now);
      const key = `sky:seed:${action.crop}:${now}`;
      if (!post(s, `${key}:pay`, 'coin', -SKY_CROPS[action.crop].seed, 'sky:shop', now))
        return state;
      if (!post(s, key, `skyseed:${action.crop}`, 1, 'sky:shop', now)) return state;
      return s;
    }

    case 'SKY_PLACE_POT': {
      const sky0 = state.sky;
      if (!sky0 || !sky0.pots[action.uid]) return state;
      if (action.slot < 0 || action.slot >= slotCount(sky0, action.floor)) return state;
      const { s, sky } = draft(state, now);
      ensureRows(sky);
      const from = potPlace(sky, action.uid);
      const there = sky.slots[action.floor]![action.slot] ?? null;
      if (there === action.uid) return state;
      // A pot already there takes our old place, or goes to the store when we came from it
      // (only an empty one: a planted pot stays on the shelves).
      if (there && !from && sky.pots[there]?.plant) return state;
      sky.slots = sky.slots.map((row) => [...row]);
      if (from) sky.slots[from[0]]![from[1]] = there;
      sky.slots[action.floor]![action.slot] = action.uid;
      if (!sky.firstPot) sky.firstPot = action.uid;
      tutorial(s, sky, 'place', now);
      return s;
    }

    case 'SKY_STORE_POT': {
      const sky0 = state.sky;
      const pot = sky0?.pots[action.uid];
      if (!sky0 || !pot || pot.plant || !potPlace(sky0, action.uid)) return state;
      const { s, sky } = draft(state, now);
      sky.slots = sky.slots.map((row) => row.map((u) => (u === action.uid ? null : u)));
      return s;
    }

    case 'SKY_PLANT': {
      const sky0 = state.sky;
      const pot = sky0?.pots[action.uid];
      if (!sky0 || !pot || pot.plant || !potPlace(sky0, action.uid)) return state;
      const seed = action.seed;
      if (seed.kind === 'sky' && !cropOpen(sky0, seed.id)) return state;
      if (
        seed.kind === 'farm' &&
        (CROPS[seed.id]?.kind !== 'veg' || !cropAvailable(state, seed.id))
      )
        return state;
      const { s, sky } = draft(state, now);
      const p = sky.pots[action.uid]!;
      const key = `sky:plant:${p.uid}:${p.cycles}`;
      const res =
        seed.kind === 'sky' ? (`skyseed:${seed.id}` as const) : (`seed:${seed.id}` as const);
      if (!post(s, key, res, -1, 'sky:plant', now)) return state;
      const stats = potStats(sky, p.uid, seed.kind === 'farm');
      const grow =
        seed.kind === 'sky'
          ? SKY_CROPS[seed.id].growMin * 60_000
          : CROPS[seed.id].growHours * 3_600_000;
      p.plant = {
        seed,
        cycle: p.cycles,
        plantedAt: now,
        readyAt: now + Math.round((grow * (10000 - stats.time)) / 10000),
        wateredAt: null,
        stats,
        bugs: [],
        caught: [],
      };
      p.cycles += 1;
      sky.pots = { ...sky.pots, [p.uid]: p };
      return s;
    }

    case 'SKY_WATER': {
      const p0 = state.sky?.pots[action.uid];
      const plant = p0?.plant;
      if (!plant || now >= plant.readyAt || waterLeft(state, now) <= 0) return state;
      if (plant.wateredAt !== null && now - plant.wateredAt < WATERING.cooldownMs) return state;
      const { s, sky } = draft(state, now);
      if (s.water.date !== dateKey(now)) s.water = { date: dateKey(now), used: 0, bonus: 0 };
      const p = sky.pots[action.uid]!;
      const left = p.plant!.readyAt - now;
      p.plant = {
        ...p.plant!,
        readyAt: now + Math.round(left * (1 - WATERING.cut)),
        wateredAt: now,
      };
      s.water = { ...s.water, used: s.water.used + 1 };
      return s;
    }

    case 'SKY_REVEAL': {
      if (!state.sky) return state;
      const { s, sky } = draft(state, now);
      let changed = false;
      for (const r of action.bugs) {
        const p = sky.pots[r.uid];
        const plant = p?.plant;
        if (!plant || plant.cycle !== r.cycle || r.stage < 0 || r.stage > 2) continue;
        if (plant.bugs[r.stage] !== undefined) continue;
        const bugs = [...plant.bugs];
        while (bugs.length < r.stage) bugs.push(undefined);
        bugs[r.stage] = r.bug;
        p.plant = { ...plant, bugs };
        changed = true;
      }
      return changed ? s : state;
    }

    case 'SKY_CATCH': {
      const plant = state.sky?.pots[action.uid]?.plant;
      const bug = plant?.bugs[action.stage];
      if (!plant || !bug || plant.caught.includes(action.stage)) return state;
      const { s, sky } = draft(state, now);
      const p = sky.pots[action.uid]!;
      if (
        !post(s, `sky:bug:${p.uid}:${plant.cycle}:${action.stage}`, `bug:${bug}`, 1, 'sky:bug', now)
      )
        return state;
      p.plant = { ...p.plant!, caught: [...p.plant!.caught, action.stage] };
      tutorial(s, sky, 'bug', now);
      return s;
    }

    case 'SKY_HARVEST':
    case 'SKY_HARVEST_FLOOR': {
      const sky0 = state.sky;
      if (!sky0) return state;
      const uids =
        action.type === 'SKY_HARVEST'
          ? [action.uid]
          : (sky0.slots[action.floor] ?? []).filter((u): u is string => !!u);
      const ripe = uids.filter((u) => {
        const pl = sky0.pots[u]?.plant;
        return pl && now >= pl.readyAt;
      });
      if (!ripe.length) return state;
      const { s, sky } = draft(state, now);
      for (const uid of ripe) {
        const p = sky.pots[uid]!;
        const plant = p.plant!;
        const tag = `${uid}:${plant.cycle}`;
        const got = harvestOf(plant);
        let i = 0;
        for (const g of got.goods)
          post(s, `sky:harvest:${tag}:${i++}`, `skygood:${g.good}`, g.qty, 'sky:harvest', now);
        for (const it of got.items)
          post(s, `sky:harvest:${tag}:${i++}`, `skyitem:${it.item}`, it.qty, 'sky:harvest', now);
        if (got.farm)
          post(
            s,
            `sky:harvest:${tag}:${i}`,
            `ingredient:${got.farm.crop}`,
            got.farm.qty,
            'sky:harvest',
            now,
          );
        if (got.coins > 0)
          post(s, `sky:harvest:${tag}:coin`, 'coin', got.coins, 'sky:harvest', now);
        payXp(s, sky, `xp:sky:${tag}`, got.xp, 'sky:harvest', now);
        p.plant = null;
        sky.day = { ...sky.day, harvests: sky.day.harvests + 1 };
        tutorial(s, sky, 'harvest', now);
      }
      // Once floor 3 is open: the day's third harvest brings a cloud seed.
      if (sky.floors >= DAILY_SKY.fromFloor && sky.day.harvests >= DAILY_SKY.harvests) {
        post(
          s,
          `sky:daily:${sky.day.date}`,
          'skyitem:cloudseed',
          DAILY_SKY.cloudseed,
          'sky:daily',
          now,
        );
      }
      return s;
    }

    case 'SKY_START_JOB': {
      const sky0 = state.sky;
      const r = SKY_RECIPES[action.recipe];
      if (!sky0 || !r || r.machine !== action.machine || !recipeOpen(sky0, action.recipe))
        return state;
      if (!machineOpen(sky0, action.machine)) return state;
      const jobs = sky0.jobs[action.machine] ?? [];
      if (jobs.length >= MACHINES[action.machine].slots) return state;
      const { s, sky } = draft(state, now);
      if (r.perDay && sky.day.dew >= DEW_PER_DAY) return state;
      const key = `sky:job:${action.machine}:${now}`;
      let i = 0;
      for (const inp of r.inputs) {
        const res =
          'good' in inp ? (`skygood:${inp.good}` as const) : (`ingredient:${inp.farm}` as const);
        if (!post(s, `${key}:in:${i++}`, res, -inp.qty, `sky:${action.recipe}`, now)) return state;
      }
      sky.jobs = {
        ...sky.jobs,
        [action.machine]: [
          ...jobs,
          { recipe: action.recipe, startedAt: now, readyAt: now + r.minutes * 60_000 },
        ],
      };
      if (r.perDay) sky.day = { ...sky.day, dew: sky.day.dew + 1 };
      return s;
    }

    case 'SKY_COLLECT_JOB': {
      const jobs = state.sky?.jobs[action.machine] ?? [];
      const job = jobs.find((j) => now >= j.readyAt);
      if (!job) return state;
      const { s, sky } = draft(state, now);
      const r = SKY_RECIPES[job.recipe];
      const key = `sky:job:${action.machine}:${job.startedAt}`;
      const res =
        'good' in r.out ? (`skygood:${r.out.good}` as const) : (`skyitem:${r.out.item}` as const);
      if (!post(s, `${key}:out`, res, r.out.qty, `sky:${job.recipe}`, now)) return state;
      if (r.xp > 0)
        payXp(s, sky, `xp:skyjob:${action.machine}:${job.startedAt}`, r.xp, 'sky:machine', now);
      sky.jobs = {
        ...sky.jobs,
        [action.machine]: jobs.filter((j) => j !== job && j.startedAt !== job.startedAt),
      };
      if (job.recipe === 'dried_jasmine') tutorial(s, sky, 'dried', now);
      if (job.recipe === 'jasmine_honey_tea') tutorial(s, sky, 'mix01', now);
      return s;
    }

    case 'SKY_SELL': {
      const have = state.sky?.goods[action.good] ?? 0;
      const qty = Math.min(Math.max(1, Math.floor(action.qty)), have);
      if (qty <= 0) return state;
      const { s } = draft(state, now);
      const price = SKY_GOOD_PRICE[action.good];
      for (let i = 0; i < qty; i++) {
        const key = `sky:sell:${action.good}:${now + i}`;
        if (!post(s, `${key}:out`, `skygood:${action.good}`, -1, 'sky:sell', now)) return state;
        if (!post(s, `${key}:coin`, 'coin', price, 'sky:sell', now)) return state;
      }
      return s;
    }

    case 'SKY_CLAIM_SET': {
      const sky0 = state.sky;
      if (!sky0 || sky0.sets.includes(action.set) || !ownsSet(sky0, action.set)) return state;
      const { s, sky } = draft(state, now);
      const key = `sky:set:${action.set}`;
      if (!post(s, `${key}:gem`, 'skyitem:gem', SET_REWARD.gem, 'sky:set', now)) return state;
      post(s, `${key}:coin`, 'coin', SET_REWARD.coins, 'sky:set', now);
      sky.sets = [...sky.sets, action.set];
      return s;
    }

    case 'SKY_PACK_BOX': {
      const sky0 = state.sky;
      if (!sky0 || sky0.floors < BALLOON.floor) return state;
      const date = dateKey(now);
      const boxes = balloonBoxes(date);
      const box = boxes[action.box];
      const today = sky0.balloon?.date === date ? sky0.balloon : { date, packed: [], done: false };
      if (!box || today.packed.includes(action.box)) return state;
      const { s, sky } = draft(state, now);
      const key = `sky:balloon:${date}`;
      if (!post(s, `${key}:${action.box}`, `skygood:${box.good}`, -box.qty, 'sky:balloon', now))
        return state;
      payXp(s, sky, `xp:skybox:${date}:${action.box}`, BALLOON.boxXp, 'sky:balloon', now);
      const packed = [...today.packed, action.box];
      let done = today.done;
      if (packed.length === boxes.length && !done) {
        done = true;
        post(s, `${key}:coin`, 'coin', BALLOON.coins, 'sky:balloon', now);
        post(s, `${key}:cloudseed`, 'skyitem:cloudseed', BALLOON.cloudseed, 'sky:balloon', now);
        post(s, `${key}:shard`, 'skyitem:shard', BALLOON.shards, 'sky:balloon', now);
        const last = sky.balloonStreak.last;
        const count = last && daysBetween(last, date) === 1 ? sky.balloonStreak.count + 1 : 1;
        sky.balloonStreak = { count, last: date };
        if (count % BALLOON.streakDays === 0) {
          post(s, `${key}:gem`, 'skyitem:gem', BALLOON.streakGem, 'sky:balloon', now);
        }
      }
      sky.balloon = { date, packed, done };
      return s;
    }
  }
}

/** Slots 1–3 come with a floor; the bought ones are numbered 4, 5, 6 in the ledger. */
const FREE_SLOT_BASE = 4;

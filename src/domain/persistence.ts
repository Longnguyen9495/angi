import { t } from '../i18n';
import {
  CROPS,
  DECOR,
  FARM_PLOT_COUNT,
  MAX_PLOT_COUNT,
  PLOT_UNLOCK_LEVELS,
  EVENTS,
  UPGRADES,
  UPGRADE_IDS,
  levelForXp,
} from '../data/game';
import type { CropId, DecorId } from '../data/types';
import {
  createInitialProgress,
  EMPTY_ANIMALS,
  EMPTY_CROPS,
  EMPTY_PRODUCE,
  type AnimalState,
  type GuestProgress,
} from './progress';
import { emptyQuests, type QuestState, type Tally } from './quests';
import { DEFAULT_FILTERS } from './recommend';

export const STORAGE_KEY = 'hanh-trinh-bep-viet/guest';
/**
 * Save format version. Each step up is a migration in `migrate` below; a save is never
 * thrown away because it is older.
 *  1 → 2 (farm item pack): more crops, animals and catches (new pantry and seed counts start
 *        at 0), trees and mushrooms remember their harvests, the beehive and the boat.
 *        Nothing is renamed or removed, so the data itself carries over as is.
 */
export const SCHEMA_VERSION = 2;

/** Brings a stored snapshot of `from` up to the current version (before validation). */
function migrate(raw: unknown, from: number): unknown {
  if (from < 2 && isObject(raw)) {
    // New fields default in parseProgress; old plots simply have no harvest count yet.
    return { ...raw, hive: raw.hive ?? null, boat: raw.boat ?? null };
  }
  return raw;
}

interface Envelope {
  version: number;
  savedAt: number;
  data: GuestProgress;
}

export type LoadResult =
  | { status: 'fresh'; progress: GuestProgress }
  | { status: 'restored'; progress: GuestProgress }
  | { status: 'recovered'; progress: GuestProgress; reason: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function cropCounts(v: unknown): Record<CropId, number> | null {
  return counts(v, EMPTY_CROPS);
}

function counts<K extends string>(v: unknown, empty: Record<K, number>): Record<K, number> | null {
  if (!isObject(v)) return null;
  const out = { ...empty };
  for (const k of Object.keys(out) as K[]) {
    const n = v[k];
    if (n === undefined) continue;
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null;
    out[k] = Math.floor(n);
  }
  return out;
}

function parseEvents(v: unknown): GuestProgress['events'] {
  if (!isObject(v)) return {};
  const out: GuestProgress['events'] = {};
  for (const e of EVENTS) {
    const x = v[e.id];
    if (!isObject(x)) continue;
    const days = isStringArray(x.days) ? [...new Set(x.days)] : [];
    const claimed = Array.isArray(x.claimed)
      ? [...new Set(x.claimed.filter((n): n is number => Number.isInteger(n) && n >= 0))]
      : [];
    out[e.id] = { days, claimed };
  }
  return out;
}

function parseUpgrades(v: unknown): GuestProgress['upgrades'] {
  if (!isObject(v)) return {};
  const out: GuestProgress['upgrades'] = {};
  for (const id of UPGRADE_IDS) {
    const n = v[id];
    if (typeof n === 'number' && Number.isInteger(n) && n > 0)
      out[id] = Math.min(n, UPGRADES[id].prices.length);
  }
  return out;
}

function parseAnimals(v: unknown): GuestProgress['animals'] {
  const out = structuredClone(EMPTY_ANIMALS);
  if (!isObject(v)) return out;
  for (const id of Object.keys(out) as (keyof typeof out)[]) {
    const a = v[id];
    if (!isObject(a)) continue;
    const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
    out[id] = { fedAt: num(a.fedAt), readyAt: num(a.readyAt) } satisfies AnimalState;
  }
  return out;
}

function tally(v: unknown): Tally {
  if (!isObject(v)) return {};
  const out: Tally = {};
  for (const [k, n] of Object.entries(v)) {
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0)
      out[k as keyof Tally] = Math.floor(n);
  }
  return out;
}

/** Quests were added after v1: older saves (with the old `missions`) start them fresh. */
function parseQuests(v: unknown, now: number): QuestState {
  const base = emptyQuests(now);
  if (!isObject(v)) return base;
  const str = (x: unknown) => (typeof x === 'string' ? x : '');
  const list = (x: unknown) => (isStringArray(x) ? x : []);
  const badges: Record<string, number> = {};
  if (isObject(v.badges)) {
    for (const [k, n] of Object.entries(v.badges)) {
      if (typeof n === 'number' && Number.isFinite(n) && n > 0) badges[k] = Math.floor(n);
    }
  }
  const chest =
    isObject(v.chest) && typeof v.chest.streak === 'number' && typeof v.chest.date === 'string'
      ? { streak: v.chest.streak, date: v.chest.date }
      : null;
  return {
    date: str(v.date),
    week: str(v.week) || base.week,
    daily: list(v.daily),
    weekly: list(v.weekly),
    day: tally(v.day),
    weekTally: tally(v.weekTally),
    total: tally(v.total),
    claimed: list(v.claimed),
    weekClaimed: list(v.weekClaimed),
    badges,
    chest,
    social: v.social === true,
  };
}

/** Two nullable timestamps (hive, boat); anything else falls back to "not started". */
function timePair<A extends string, B extends string, T extends Record<A | B, number | null>>(
  v: unknown,
  a: A,
  b: B,
  fallback: T,
): T {
  if (!isObject(v)) return fallback;
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
  const first = num(v[a]);
  const second = num(v[b]);
  return first !== null && second !== null ? ({ [a]: first, [b]: second } as T) : fallback;
}

function parseLayout(v: Record<string, unknown>): GuestProgress['decorLayout'] {
  const out: GuestProgress['decorLayout'] = {};
  for (const [id, pos] of Object.entries(v)) {
    if (!Object.hasOwn(DECOR, id)) continue;
    if (pos === null) {
      out[id as DecorId] = null;
    } else if (
      isObject(pos) &&
      [pos.x, pos.z, pos.rot].every((n) => typeof n === 'number' && Number.isFinite(n))
    ) {
      out[id as DecorId] = {
        x: pos.x as number,
        z: pos.z as number,
        rot: (((pos.rot as number) % 4) + 4) % 4,
      };
    }
  }
  return out;
}

/**
 * Validates the parts of a stored snapshot the game logic relies on. Anything
 * structurally wrong is rejected as a whole; optional fields fall back to defaults.
 */
export function parseProgress(raw: unknown, now: number): GuestProgress | null {
  if (!isObject(raw)) return null;
  const base = createInitialProgress(now);
  const seeds = cropCounts(raw.seeds);
  const ingredients = counts(raw.ingredients, EMPTY_PRODUCE);
  if (!seeds || !ingredients) return null;
  if (typeof raw.guestId !== 'string' || typeof raw.xp !== 'number') return null;
  if (
    !Array.isArray(raw.plots) ||
    raw.plots.length < FARM_PLOT_COUNT ||
    raw.plots.length > MAX_PLOT_COUNT
  )
    return null;
  if (!raw.plots.every((p) => isObject(p) && typeof p.id === 'number')) return null;
  const stamps = raw.stamps;
  if (!isObject(stamps) || !isStringArray(stamps.discovered) || !isStringArray(stamps.eaten)) {
    return null;
  }
  if (!isStringArray(raw.unlockedRegions) || !Array.isArray(raw.ledger)) return null;

  const p = raw as unknown as GuestProgress;
  return fitToLevel({
    ...base,
    ...p,
    seeds,
    ingredients,
    filters: isObject(raw.filters) ? { ...DEFAULT_FILTERS, ...p.filters } : DEFAULT_FILTERS,
    hiddenDishIds: isStringArray(raw.hiddenDishIds) ? raw.hiddenDishIds : [],
    history: Array.isArray(raw.history) ? p.history : [],
    settings: isObject(raw.settings)
      ? {
          ...base.settings,
          ...p.settings,
          quality: (['auto', 'low', 'medium', 'high'] as const).find(
            (q) => q === p.settings.quality,
          ),
        }
      : base.settings,
    quests: parseQuests(raw.quests, now),
    streak: isObject(raw.streak) ? p.streak : base.streak,
    cooked: isObject(raw.cooked) ? p.cooked : {},
    // Added after v1 shipped: older saves simply start with a full can and dry soil.
    plots: p.plots.map((pl) => ({
      ...pl,
      // A crop id this version does not know (a newer save on an older app) leaves the plot empty.
      ...(pl.crop !== null && !Object.hasOwn(EMPTY_CROPS, pl.crop)
        ? { crop: null, plantedAt: null, readyAt: null }
        : {}),
      wateredAt: typeof pl.wateredAt === 'number' ? pl.wateredAt : null,
      harvests:
        typeof pl.harvests === 'number' && Number.isFinite(pl.harvests) && pl.harvests > 0
          ? Math.floor(pl.harvests)
          : undefined,
    })),
    hive: timePair(raw.hive, 'startedAt', 'readyAt', base.hive),
    boat: timePair(raw.boat, 'sentAt', 'returnAt', base.boat),
    water:
      isObject(raw.water) &&
      typeof p.water.date === 'string' &&
      Number.isFinite(p.water.used) &&
      Number.isFinite(p.water.bonus)
        ? p.water
        : base.water,
    // Added with the pond: older saves start with today's casts unused.
    fishing:
      isObject(raw.fishing) &&
      typeof p.fishing.date === 'string' &&
      Number.isFinite(p.fishing.used) &&
      p.fishing.used >= 0
        ? p.fishing
        : base.fishing,
    orders:
      isObject(raw.orders) && typeof p.orders.date === 'string' && isStringArray(p.orders.done)
        ? p.orders
        : base.orders,
    coins:
      typeof raw.coins === 'number' && Number.isFinite(raw.coins) && raw.coins >= 0
        ? Math.floor(raw.coins)
        : 0,
    photos: isStringArray(raw.photos) ? raw.photos : [],
    animals: parseAnimals(raw.animals),
    decorLayout: isObject(raw.decorLayout) ? parseLayout(raw.decorLayout) : {},
    collections: isStringArray(raw.collections) ? [...new Set(raw.collections)] : [],
    upgrades: parseUpgrades(raw.upgrades),
    events: parseEvents(raw.events),
    decor: isStringArray(raw.decor)
      ? (raw.decor.filter((d) => Object.hasOwn(DECOR, d)) as DecorId[])
      : [],
    recentCropUnlock:
      typeof raw.recentCropUnlock === 'string' && Object.hasOwn(EMPTY_CROPS, raw.recentCropUnlock)
        ? (raw.recentCropUnlock as CropId)
        : null,
    owner: typeof raw.owner === 'string' ? raw.owner : null,
    // Added with the 28 achievements: older saves start with no crop counted yet.
    grown: isStringArray(raw.grown)
      ? ([...new Set(raw.grown)].filter((c) => Object.hasOwn(EMPTY_CROPS, c)) as CropId[])
      : [],
    unlockedCrops: isStringArray(raw.unlockedCrops)
      ? (raw.unlockedCrops.filter((c) => Object.hasOwn(EMPTY_CROPS, c)) as CropId[])
      : [],
  });
}

/**
 * Holds a save to what its level opens. Levels follow LEVEL_CURVE (they used to be a flat
 * 100 XP), so a garden grown under the old pace keeps its XP but gives back the plots and
 * crops its level no longer reaches (the last plots, with whatever grew on them); the
 * server trims its stored copies the same way (ProgressGuard::fitToLevel). Idempotent.
 */
export function fitToLevel(p: GuestProgress): GuestProgress {
  const lv = levelForXp(p.xp);
  const allowed = FARM_PLOT_COUNT + PLOT_UNLOCK_LEVELS.filter((l) => lv >= l).length;
  const crops = p.unlockedCrops.filter((c) => (CROPS[c].unlock?.level ?? 1) <= lv);
  if (p.plots.length <= allowed && crops.length === p.unlockedCrops.length) return p;
  return {
    ...p,
    plots: [...p.plots].sort((a, b) => a.id - b.id).slice(0, allowed),
    unlockedCrops: crops,
  };
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadProgress(now: number): LoadResult {
  const store = storage();
  let text: string | null;
  try {
    text = store?.getItem(STORAGE_KEY) ?? null;
  } catch {
    text = null;
  }
  if (!text) return { status: 'fresh', progress: createInitialProgress(now) };
  try {
    const env = JSON.parse(text) as Partial<Envelope>;
    const version = typeof env.version === 'number' ? env.version : 0;
    // Older saves are migrated; only a save from a newer app (unknown format) is set aside.
    if (version < 1 || version > SCHEMA_VERSION) {
      return {
        status: 'recovered',
        progress: createInitialProgress(now),
        reason: t.domain.recovery.oldVersion,
      };
    }
    const progress = parseProgress(migrate(env.data, version), now);
    if (!progress) {
      return {
        status: 'recovered',
        progress: createInitialProgress(now),
        reason: t.domain.recovery.corrupt,
      };
    }
    return { status: 'restored', progress };
  } catch {
    return {
      status: 'recovered',
      progress: createInitialProgress(now),
      reason: t.domain.recovery.unreadable,
    };
  }
}

export function saveProgress(progress: GuestProgress, now: number): boolean {
  const store = storage();
  if (!store) return false;
  const env: Envelope = { version: SCHEMA_VERSION, savedAt: now, data: progress };
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(env));
    return true;
  } catch {
    return false;
  }
}

export function exportProgress(progress: GuestProgress): string {
  return JSON.stringify({ version: SCHEMA_VERSION, data: progress }, null, 2);
}

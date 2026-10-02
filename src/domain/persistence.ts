import { t } from '../i18n';
import { DECOR, FARM_PLOT_COUNT, MAX_PLOT_COUNT } from '../data/game';
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
export const SCHEMA_VERSION = 1;

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

function parseLayout(v: Record<string, unknown>): GuestProgress['decorLayout'] {
  const out: GuestProgress['decorLayout'] = {};
  for (const [id, pos] of Object.entries(v)) {
    if (!(id in DECOR)) continue;
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
  return {
    ...base,
    ...p,
    seeds,
    ingredients,
    filters: isObject(raw.filters) ? { ...DEFAULT_FILTERS, ...p.filters } : DEFAULT_FILTERS,
    hiddenDishIds: isStringArray(raw.hiddenDishIds) ? raw.hiddenDishIds : [],
    history: Array.isArray(raw.history) ? p.history : [],
    settings: isObject(raw.settings) ? { ...base.settings, ...p.settings } : base.settings,
    quests: parseQuests(raw.quests, now),
    streak: isObject(raw.streak) ? p.streak : base.streak,
    cooked: isObject(raw.cooked) ? p.cooked : {},
    // Added after v1 shipped: older saves simply start with a full can and dry soil.
    plots: p.plots.map((pl) => ({
      ...pl,
      wateredAt: typeof pl.wateredAt === 'number' ? pl.wateredAt : null,
    })),
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
    decor: isStringArray(raw.decor) ? (raw.decor.filter((d) => d in DECOR) as DecorId[]) : [],
    recentCropUnlock:
      typeof raw.recentCropUnlock === 'string' && raw.recentCropUnlock in EMPTY_CROPS
        ? (raw.recentCropUnlock as CropId)
        : null,
    unlockedCrops: isStringArray(raw.unlockedCrops)
      ? (raw.unlockedCrops.filter((c) => c in EMPTY_CROPS) as CropId[])
      : [],
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
    if (env.version !== SCHEMA_VERSION) {
      return {
        status: 'recovered',
        progress: createInitialProgress(now),
        reason: t.domain.recovery.oldVersion,
      };
    }
    const progress = parseProgress(env.data, now);
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

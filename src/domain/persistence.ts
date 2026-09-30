import { DECOR, FARM_PLOT_COUNT, MAX_PLOT_COUNT } from '../data/game';
import type { CropId, DecorId } from '../data/types';
import { createInitialProgress, EMPTY_CROPS, type GuestProgress } from './progress';
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
  if (!isObject(v)) return null;
  const out = { ...EMPTY_CROPS };
  for (const k of Object.keys(out) as CropId[]) {
    const n = v[k];
    if (n === undefined) continue;
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null;
    out[k] = Math.floor(n);
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
  const ingredients = cropCounts(raw.ingredients);
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
    missions: isObject(raw.missions) ? p.missions : base.missions,
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
    orders:
      isObject(raw.orders) && typeof p.orders.date === 'string' && isStringArray(p.orders.done)
        ? p.orders
        : base.orders,
    coins:
      typeof raw.coins === 'number' && Number.isFinite(raw.coins) && raw.coins >= 0
        ? Math.floor(raw.coins)
        : 0,
    photos: isStringArray(raw.photos) ? raw.photos : [],
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
        reason: 'Dữ liệu lưu từ phiên bản cũ nên hành trình được bắt đầu lại.',
      };
    }
    const progress = parseProgress(env.data, now);
    if (!progress) {
      return {
        status: 'recovered',
        progress: createInitialProgress(now),
        reason: 'Dữ liệu lưu trên máy bị lỗi nên hành trình được bắt đầu lại.',
      };
    }
    return { status: 'restored', progress };
  } catch {
    return {
      status: 'recovered',
      progress: createInitialProgress(now),
      reason: 'Không đọc được dữ liệu lưu trên máy nên hành trình được bắt đầu lại.',
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

import type { CropId, MissionKind, RecipeId, RegionId } from '../data/types';
import { FARM_PLOT_COUNT } from '../data/game';
import { DEFAULT_FILTERS, type Filters } from './recommend';
import { HOUR_MS, dateKey } from './time';

export type MotionPref = 'system' | 'reduce' | 'full';
export type CheckInOutcome = 'ate' | 'swapped' | 'skipped';
export type AgainAnswer = 'yes' | 'maybe' | 'no';

export interface Plot {
  id: number;
  crop: CropId | null;
  plantedAt: number | null;
  readyAt: number | null;
  /** Dish that produced the seed, if planted from a meal. */
  sourceDishId: string | null;
}

export interface MealSession {
  slotKey: string;
  dishId: string;
  /** Dish whose seed was granted for this slot (may differ if the guest re-chose later). */
  rewardDishId: string;
  chosenAt: number;
  seedCrop: CropId;
  planted: boolean;
  plotId: number | null;
  checkedIn: boolean;
}

export interface CheckInRecord {
  slotKey: string;
  dishId: string;
  outcome: CheckInOutcome;
  rating: number | null;
  again: AgainAnswer | null;
  at: number;
}

export type Resource = `seed:${CropId}` | `ingredient:${CropId}` | 'xp' | 'stamp';

/** Append-only reward ledger entry. `key` doubles as the idempotency key. */
export interface LedgerEntry {
  key: string;
  resource: Resource;
  delta: number;
  balanceAfter: number;
  reason: string;
  at: number;
}

export interface GuestProgress {
  guestId: string;
  createdAt: number;
  filters: Filters;
  hiddenDishIds: string[];
  seeds: Record<CropId, number>;
  ingredients: Record<CropId, number>;
  plots: Plot[];
  xp: number;
  stamps: { discovered: string[]; eaten: string[] };
  unlockedRegions: RegionId[];
  /** Region opened by the latest action, used once for the unlock reveal. */
  recentUnlock: RegionId | null;
  cooked: Partial<Record<RecipeId, number>>;
  meal: MealSession | null;
  history: CheckInRecord[];
  missions: { date: string; done: MissionKind[] };
  streak: { count: number; lastActiveDate: string; restPasses: number };
  reminder: { slotKey: string; at: number } | null;
  journeySaved: boolean;
  settings: { motion: MotionPref; simulateFailure: boolean };
  ledger: LedgerEntry[];
}

export const EMPTY_CROPS: Record<CropId, number> = {
  rice: 0,
  herbs: 0,
  chili: 0,
  scallion: 0,
  bean: 0,
  tomato: 0,
};

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `guest-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * A new guest starts with one herb plot ready (onboarding gift) and one
 * scallion sprouting, so the first recipe is visibly close but not faked.
 */
export function createInitialProgress(now: number): GuestProgress {
  const plots: Plot[] = Array.from({ length: FARM_PLOT_COUNT }, (_, i) => ({
    id: i + 1,
    crop: null,
    plantedAt: null,
    readyAt: null,
    sourceDishId: null,
  }));
  plots[0] = {
    id: 1,
    crop: 'herbs',
    plantedAt: now - 6 * HOUR_MS,
    readyAt: now - 3 * HOUR_MS,
    sourceDishId: null,
  };
  plots[1] = {
    id: 2,
    crop: 'scallion',
    plantedAt: now - HOUR_MS,
    readyAt: now + 2 * HOUR_MS,
    sourceDishId: null,
  };
  return {
    guestId: randomId(),
    createdAt: now,
    filters: DEFAULT_FILTERS,
    hiddenDishIds: [],
    seeds: { ...EMPTY_CROPS },
    ingredients: { ...EMPTY_CROPS },
    plots,
    xp: 0,
    stamps: { discovered: [], eaten: [] },
    unlockedRegions: ['south'],
    recentUnlock: null,
    cooked: {},
    meal: null,
    history: [],
    missions: { date: dateKey(now), done: [] },
    streak: { count: 2, lastActiveDate: dateKey(now - 24 * HOUR_MS), restPasses: 1 },
    reminder: null,
    journeySaved: false,
    settings: { motion: 'system', simulateFailure: false },
    ledger: [],
  };
}

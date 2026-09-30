import type {
  AnimalId,
  CropId,
  DecorId,
  MissionKind,
  ProduceId,
  RecipeId,
  RegionId,
} from '../data/types';
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
  /** Last time the plot was watered (can or post-meal rain); drives the wet-soil look. */
  wateredAt: number | null;
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

export type Resource = `seed:${CropId}` | `ingredient:${ProduceId}` | 'xp' | 'stamp' | 'coin';

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
  ingredients: Record<ProduceId, number>;
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
  /** Watering can: `used` of today's refills, plus `bonus` earned by check-ins today. */
  water: { date: string; used: number; bonus: number };
  /** Cô Ba's daily orders already delivered, for `date` only. */
  orders: { date: string; done: string[] };
  /** Crops opened by levelling up (the starting six are always available). */
  unlockedCrops: CropId[];
  /** Crop opened by the latest level-up, shown once in the garden. */
  recentCropUnlock: CropId | null;
  /** Xu earned at the market. */
  coins: number;
  /** Decorations bought for the garden. */
  decor: DecorId[];
  /** Where each decoration stands on the 3D island (grid cell + quarter turns); missing = default spot. */
  decorLayout: Partial<Record<DecorId, DecorPlacement | null>>;
  /** Animals: fed → producing until readyAt → collect. Never sick, never lost. */
  animals: Record<AnimalId, AnimalState>;
  /**
   * Meal slots that have a check-in photo. The images themselves stay on this
   * device (IndexedDB, see services/photoStore.ts) and never sync.
   */
  photos: string[];
  journeySaved: boolean;
  settings: { motion: MotionPref; simulateFailure: boolean };
  ledger: LedgerEntry[];
}

export interface DecorPlacement {
  x: number;
  z: number;
  /** Quarter turns (0–3). */
  rot: number;
}

/** Something a friend did for this garden, as recorded by the server (see server/lib/Friends.php). */
export interface FriendEvent {
  id: string;
  type: 'water' | 'gift' | 'helped';
  plotId?: number;
  crop?: CropId;
  from?: string;
}

export interface AnimalState {
  fedAt: number | null;
  readyAt: number | null;
}

export const EMPTY_ANIMALS: Record<AnimalId, AnimalState> = {
  chicken: { fedAt: null, readyAt: null },
  cow: { fedAt: null, readyAt: null },
};

export const EMPTY_CROPS: Record<CropId, number> = {
  rice: 0,
  herbs: 0,
  chili: 0,
  scallion: 0,
  bean: 0,
  tomato: 0,
  lemongrass: 0,
  garlic: 0,
  cucumber: 0,
  lime: 0,
};

export const EMPTY_PRODUCE: Record<ProduceId, number> = { ...EMPTY_CROPS, egg: 0, milk: 0 };

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
    wateredAt: null,
  }));
  plots[0] = {
    id: 1,
    crop: 'herbs',
    plantedAt: now - 6 * HOUR_MS,
    readyAt: now - 3 * HOUR_MS,
    sourceDishId: null,
    wateredAt: null,
  };
  plots[1] = {
    id: 2,
    crop: 'scallion',
    plantedAt: now - HOUR_MS,
    readyAt: now + 2 * HOUR_MS,
    sourceDishId: null,
    wateredAt: null,
  };
  return {
    guestId: randomId(),
    createdAt: now,
    filters: DEFAULT_FILTERS,
    hiddenDishIds: [],
    seeds: { ...EMPTY_CROPS },
    ingredients: { ...EMPTY_PRODUCE },
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
    water: { date: dateKey(now), used: 0, bonus: 0 },
    orders: { date: dateKey(now), done: [] },
    unlockedCrops: [],
    recentCropUnlock: null,
    coins: 0,
    decor: [],
    decorLayout: {},
    animals: structuredClone(EMPTY_ANIMALS),
    photos: [],
    journeySaved: false,
    settings: { motion: 'system', simulateFailure: false },
    ledger: [],
  };
}

import type { AnimalId, CropId, DecorId, ProduceId, RecipeId, RegionId } from '../data/types';
import { ANIMALS, CROPS, FARM_PLOT_COUNT, PRODUCE_IDS } from '../data/game';
import { emptyQuests, type QuestState } from './quests';
import { DEFAULT_FILTERS, type Filters } from './recommend';
import { HOUR_MS, dateKey } from './time';

export type MotionPref = 'system' | 'reduce' | 'full';
/** Effects detail (particles, how many animals and bees move, flights); 'auto' follows the device. */
export type EffectsQuality = 'auto' | 'low' | 'medium' | 'high';
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
  /** A friend picked one of this crop while it was ripe: the harvest gives one less. */
  stolen?: boolean;
  /** Trees and mushrooms: harvests taken from this planting (they stay in the plot). */
  harvests?: number;
}

/** The beehive fills on its own; `readyAt` is when it can be emptied (null: not started). */
export interface HiveState {
  startedAt: number | null;
  readyAt: number | null;
}

/** The fishing boat: out at sea between `sentAt` and `returnAt` (null: at the jetty). */
export interface BoatState {
  sentAt: number | null;
  returnAt: number | null;
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
  /** Daily and weekly quests, achievements and the streak chest (see quests.ts). */
  quests: QuestState;
  streak: { count: number; lastActiveDate: string; restPasses: number };
  reminder: { slotKey: string; at: number } | null;
  /** Watering can: `used` of today's refills, plus `bonus` earned by check-ins today. */
  water: { date: string; used: number; bonus: number };
  /** Pond: catches landed on `date` (local day); a missed bite is free. */
  fishing: { date: string; used: number };
  /** Cô Ba's daily orders already delivered, for `date` only. */
  orders: { date: string; done: string[] };
  /** Every crop ever harvested here (the "Vườn trăm thứ" achievement). */
  grown?: CropId[];
  /** Crops opened by levelling up (the starting six are always available). */
  unlockedCrops: CropId[];
  /** Crop opened by the latest level-up, shown once in the garden. */
  recentCropUnlock: CropId | null;
  /** Xu earned at the market. */
  coins: number;
  /** Decorations bought for the garden. */
  decor: DecorId[];
  /** Collections whose reward was claimed. */
  collections: string[];
  /** Where each decoration stands on the 3D island (grid cell + quarter turns); missing = default spot. */
  decorLayout: Partial<Record<DecorId, DecorPlacement | null>>;
  /** Animals: fed → producing until readyAt → collect. Never sick, never lost. */
  animals: Record<AnimalId, AnimalState>;
  hive: HiveState;
  boat: BoatState;
  /**
   * Meal slots that have a check-in photo. The images themselves stay on this
   * device (IndexedDB, see services/photoStore.ts) and never sync.
   */
  photos: string[];
  journeySaved: boolean;
  settings: { motion: MotionPref; simulateFailure: boolean; quality?: EffectsQuality };
  ledger: LedgerEntry[];
  /**
   * The account this journey is saved to (an opaque key from the server), null while it is
   * only on this device. A journey that belongs to one account is never uploaded to another.
   */
  owner?: string | null;
}

export interface DecorPlacement {
  x: number;
  z: number;
  /** Quarter turns (0–3). */
  rot: number;
}

/**
 * water / helped: a friend watered us / we watered a friend. gift: Cô Ba's daily seed.
 * stolen / stole: a friend picked from our ripe plot / we picked from theirs.
 * present: a friend sent us a seed. thanks: a friend said thanks.
 * referral: a garden we brought in (or the one that brought us in) reached a milestone.
 */
export type FriendEventType =
  'water' | 'gift' | 'helped' | 'stolen' | 'stole' | 'present' | 'thanks' | 'referral';

/** Something a friend did for this garden, as recorded by the server (see server/lib/Friends.php). */
export interface FriendEvent {
  id: string;
  type: FriendEventType;
  plotId?: number;
  crop?: CropId;
  /** water / stolen: the planting (plantedAt) it touched; a replanted plot is not affected. */
  cycle?: number;
  from?: string;
  /** referral: coins and XP paid to each side. */
  coins?: number;
  xp?: number;
}

export interface AnimalState {
  fedAt: number | null;
  readyAt: number | null;
}

/** Zero of everything listed: new items start at zero in new and in older saves alike. */
function zeros<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

export const EMPTY_ANIMALS: Record<AnimalId, AnimalState> = Object.fromEntries(
  (Object.keys(ANIMALS) as AnimalId[]).map((id) => [id, { fedAt: null, readyAt: null }]),
) as Record<AnimalId, AnimalState>;

export const EMPTY_CROPS: Record<CropId, number> = zeros(Object.keys(CROPS) as CropId[]);

export const EMPTY_PRODUCE: Record<ProduceId, number> = zeros(PRODUCE_IDS);

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
    quests: emptyQuests(now),
    streak: { count: 2, lastActiveDate: dateKey(now - 24 * HOUR_MS), restPasses: 1 },
    reminder: null,
    water: { date: dateKey(now), used: 0, bonus: 0 },
    fishing: { date: dateKey(now), used: 0 },
    orders: { date: dateKey(now), done: [] },
    unlockedCrops: [],
    grown: [],
    recentCropUnlock: null,
    coins: 0,
    decor: [],
    collections: [],
    decorLayout: {},
    animals: structuredClone(EMPTY_ANIMALS),
    hive: { startedAt: null, readyAt: null },
    boat: { sentAt: null, returnAt: null },
    photos: [],
    journeySaved: false,
    settings: { motion: 'system', simulateFailure: false },
    ledger: [],
  };
}

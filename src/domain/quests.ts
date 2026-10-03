import {
  ANIMAL_LIST,
  BOAT,
  CROPS,
  DECOR_LIST,
  HIVE,
  RECIPE_LIST,
  XP_PER_LEVEL,
} from '../data/game';
import { t } from '../i18n';
import type { GuestProgress } from './progress';
import { produceAvailable, recipeAvailable } from './selectors';
import { dateKey } from './time';

/*
 * Quests: daily ones drawn from a pool each day, weekly ones drawn each week, long-term
 * achievements in tiers, and a chest at streak milestones. Every action the game counts
 * goes through one tally (`track` in the reducer); a finished quest waits for the guest
 * to claim it, so the reward is something they see and tap.
 */

export type QuestMetric =
  | 'choose'
  | 'checkin'
  | 'plant'
  | 'water'
  | 'harvest'
  | 'cook'
  | 'catch'
  | 'sell'
  | 'buy'
  | 'feed'
  | 'collect'
  | 'order'
  | 'photo'
  | 'help'
  | 'steal'
  | 'gift'
  /** Honey taken from the hive (no longer counted as `collect`). */
  | 'honey'
  /** Boat trips brought home (counted when the boat is unloaded). */
  | 'boat'
  /** Fruit-tree plots and mushroom blocks picked. */
  | 'fruit'
  | 'mushroom'
  /** Xu earned at the market. */
  | 'earn'
  /** Meals given a rating at check-in. */
  | 'rate'
  /** A recipe cooked for the first time. */
  | 'newRecipe'
  /** Days on which every daily quest was claimed. */
  | 'allDaily'
  /** Decorations bought. */
  | 'decor';

export interface QuestReward {
  xp: number;
  coins: number;
  /** Seeds of crops the guest can grow, picked by the claim. */
  seeds: number;
  /** Extra watering-can refills for today. */
  water: number;
}

export interface QuestDef {
  id: string;
  metric: QuestMetric;
  target: number;
  reward: QuestReward;
  /** Only drawn when the guest can do it today (hive open, a fruit tree planted…). */
  when?: (p: GuestProgress, now: number) => boolean;
}

export type Tally = Partial<Record<QuestMetric, number>>;

export interface QuestState {
  /** Local day and Monday-start week the lists below belong to. */
  date: string;
  week: string;
  /** Today's and this week's quests, fixed when the period starts. */
  daily: string[];
  weekly: string[];
  day: Tally;
  weekTally: Tally;
  total: Tally;
  /** Claimed today / this week. */
  claimed: string[];
  weekClaimed: string[];
  /** Achievement id → highest tier claimed (1-based; 0 = none). */
  badges: Record<string, number>;
  /** A streak chest waiting to be opened. */
  chest: { streak: number; date: string } | null;
  /** Has friends (set from the friends list): unlocks the social quests. */
  social: boolean;
}

const R = (xp: number, coins = 0, seeds = 0, water = 0): QuestReward => ({
  xp,
  coins,
  seeds,
  water,
});

const q = t.data.quests;

/** Always today's first quest: choosing a meal is what the whole app is about. */
const CORE: QuestDef = { id: 'd-choose', metric: 'choose', target: 1, reward: R(10, 0, 1) };

const DAILY_POOL: QuestDef[] = [
  { id: 'd-checkin', metric: 'checkin', target: 1, reward: R(15, 0, 0, 1) },
  { id: 'd-plant', metric: 'plant', target: 2, reward: R(8, 0, 1) },
  { id: 'd-water', metric: 'water', target: 2, reward: R(8, 4) },
  { id: 'd-harvest', metric: 'harvest', target: 3, reward: R(10, 5) },
  { id: 'd-cook', metric: 'cook', target: 1, reward: R(15, 0, 1) },
  { id: 'd-catch', metric: 'catch', target: 2, reward: R(8, 4) },
  { id: 'd-sell', metric: 'sell', target: 3, reward: R(8, 0, 1) },
  { id: 'd-buy', metric: 'buy', target: 1, reward: R(6, 3) },
  { id: 'd-order', metric: 'order', target: 1, reward: R(12, 5) },
  { id: 'd-feed', metric: 'feed', target: 1, reward: R(8, 0, 1) },
  { id: 'd-collect', metric: 'collect', target: 1, reward: R(10, 4) },
  { id: 'd-photo', metric: 'photo', target: 1, reward: R(10, 3) },
  { id: 'd-help', metric: 'help', target: 1, reward: R(10, 0, 0, 1) },
  { id: 'd-steal', metric: 'steal', target: 1, reward: R(10, 3) },
  { id: 'd-gift', metric: 'gift', target: 1, reward: R(12, 0, 1) },
  // Harder levels of the same jobs (never two of one kind on the same day).
  { id: 'd-plant-5', metric: 'plant', target: 5, reward: R(14, 6) },
  { id: 'd-water-5', metric: 'water', target: 5, reward: R(14, 6) },
  { id: 'd-harvest-6', metric: 'harvest', target: 6, reward: R(18, 8) },
  { id: 'd-cook-2', metric: 'cook', target: 2, reward: R(25, 0, 2) },
  { id: 'd-catch-4', metric: 'catch', target: 4, reward: R(14, 6) },
  { id: 'd-earn-30', metric: 'earn', target: 30, reward: R(12, 0, 1) },
  { id: 'd-honey', metric: 'honey', target: 1, reward: R(12, 5), when: hiveOpen },
  { id: 'd-boat', metric: 'boat', target: 1, reward: R(10, 4), when: boatOpen },
  {
    id: 'd-fruit',
    metric: 'fruit',
    target: 1,
    reward: R(12, 5),
    when: (p, now) => ripensToday(p, 'tree', now),
  },
  {
    id: 'd-mushroom',
    metric: 'mushroom',
    target: 1,
    reward: R(12, 5),
    when: (p, now) => ripensToday(p, 'mushroom', now),
  },
  { id: 'd-rate', metric: 'rate', target: 1, reward: R(10, 0, 0, 1) },
];

const WEEKLY_POOL: QuestDef[] = [
  { id: 'w-harvest', metric: 'harvest', target: 25, reward: R(60, 30, 2) },
  { id: 'w-cook', metric: 'cook', target: 5, reward: R(60, 20, 3) },
  { id: 'w-checkin', metric: 'checkin', target: 5, reward: R(70, 25, 2, 2) },
  { id: 'w-catch', metric: 'catch', target: 12, reward: R(50, 30) },
  { id: 'w-order', metric: 'order', target: 6, reward: R(60, 35, 2) },
  { id: 'w-water', metric: 'water', target: 12, reward: R(40, 20, 2) },
  { id: 'w-sell', metric: 'sell', target: 20, reward: R(40, 0, 4) },
  { id: 'w-plant', metric: 'plant', target: 15, reward: R(50, 25, 2) },
  { id: 'w-help', metric: 'help', target: 5, reward: R(50, 20, 0, 2) },
  { id: 'w-steal', metric: 'steal', target: 5, reward: R(50, 30) },
  { id: 'w-all-daily', metric: 'allDaily', target: 3, reward: R(80, 40, 3, 2) },
  { id: 'w-choose', metric: 'choose', target: 6, reward: R(60, 20, 2) },
  { id: 'w-earn', metric: 'earn', target: 200, reward: R(50, 0, 3) },
  { id: 'w-feed', metric: 'feed', target: 10, reward: R(50, 25, 2) },
  { id: 'w-collect', metric: 'collect', target: 8, reward: R(50, 30) },
  { id: 'w-buy', metric: 'buy', target: 8, reward: R(40, 20, 2) },
  { id: 'w-photo', metric: 'photo', target: 3, reward: R(40, 20) },
  { id: 'w-gift', metric: 'gift', target: 5, reward: R(50, 0, 3) },
  {
    id: 'w-new-recipe',
    metric: 'newRecipe',
    target: 1,
    reward: R(70, 30, 2),
    // A recipe never cooked that this guest can actually make (open, every ingredient grows).
    when: (p) =>
      RECIPE_LIST.some(
        (r) =>
          !p.cooked[r.id] &&
          recipeAvailable(p, r.id) &&
          r.ingredients.every((i) => produceAvailable(p, i.crop)),
      ),
  },
  { id: 'w-fruit', metric: 'fruit', target: 6, reward: R(50, 25), when: (p) => planted(p, 'tree') },
  {
    id: 'w-mushroom',
    metric: 'mushroom',
    target: 5,
    reward: R(50, 25),
    when: (p) => planted(p, 'mushroom'),
  },
  { id: 'w-boat', metric: 'boat', target: 3, reward: R(50, 30), when: boatOpen },
];

export const DAILY_COUNT = 5;
export const WEEKLY_COUNT = 4;

function lv(p: GuestProgress): number {
  return Math.floor(p.xp / XP_PER_LEVEL) + 1;
}
function hiveOpen(p: GuestProgress): boolean {
  return lv(p) >= HIVE.unlockLevel;
}
function boatOpen(p: GuestProgress): boolean {
  return lv(p) >= BOAT.unlockLevel;
}
/** A fruit tree or mushroom block is in the ground now. */
function planted(p: GuestProgress, kind: 'tree' | 'mushroom'): boolean {
  return p.plots.some((pl) => pl.crop !== null && CROPS[pl.crop].kind === kind);
}

/** A tree or mushroom block that gives its next harvest before today ends (a daily quest). */
function ripensToday(p: GuestProgress, kind: 'tree' | 'mushroom', now: number): boolean {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return p.plots.some(
    (pl) =>
      pl.crop !== null &&
      CROPS[pl.crop].kind === kind &&
      pl.readyAt !== null &&
      pl.readyAt < end.getTime(),
  );
}

const SOCIAL: ReadonlySet<QuestMetric> = new Set(['help', 'steal', 'gift']);

/** The four shelves of the achievements screen. */
export type AchievementGroup = 'meals' | 'garden' | 'ranch' | 'social';

export interface AchievementDef {
  id: string;
  group: AchievementGroup;
  tiers: readonly number[];
  value: (p: GuestProgress) => number;
}

const total = (m: QuestMetric) => (p: GuestProgress) => p.quests.total[m] ?? 0;

export const ACHIEVEMENTS: AchievementDef[] = [
  // ——— Meals ———
  { id: 'cook', group: 'meals', tiers: [1, 10, 50, 150], value: total('cook') },
  {
    id: 'recipes',
    group: 'meals',
    tiers: [3, 7, RECIPE_LIST.length],
    value: (p) => Object.values(p.cooked).filter((n) => (n ?? 0) > 0).length,
  },
  { id: 'explorer', group: 'meals', tiers: [5, 20, 50], value: (p) => p.stamps.eaten.length },
  {
    id: 'discoverer',
    group: 'meals',
    tiers: [10, 30, 60],
    value: (p) => p.stamps.discovered.length,
  },
  { id: 'regular', group: 'meals', tiers: [5, 30, 100, 365], value: total('checkin') },
  { id: 'photographer', group: 'meals', tiers: [1, 10, 50], value: total('photo') },
  { id: 'regions', group: 'meals', tiers: [2, 3], value: (p) => p.unlockedRegions.length },
  { id: 'streak', group: 'meals', tiers: [3, 7, 14, 30, 60], value: (p) => p.streak.count },
  // ——— Garden ———
  { id: 'farmer', group: 'garden', tiers: [10, 50, 200, 500], value: total('harvest') },
  { id: 'planter', group: 'garden', tiers: [20, 100, 400, 1000], value: total('plant') },
  { id: 'waterer', group: 'garden', tiers: [20, 100, 400], value: total('water') },
  {
    id: 'variety',
    group: 'garden',
    tiers: [5, 15, 25, Object.keys(CROPS).length],
    value: (p) => (p.grown ?? []).length,
  },
  { id: 'orchard', group: 'garden', tiers: [5, 30, 100], value: total('fruit') },
  { id: 'mycologist', group: 'garden', tiers: [5, 30, 100], value: total('mushroom') },
  { id: 'landowner', group: 'garden', tiers: [6, 8, 10, 12], value: (p) => p.plots.length },
  // ——— Ranch & market ———
  { id: 'angler', group: 'ranch', tiers: [10, 50, 200], value: total('catch') },
  { id: 'rancher', group: 'ranch', tiers: [10, 50, 200], value: total('collect') },
  { id: 'beekeeper', group: 'ranch', tiers: [1, 10, 50], value: total('honey') },
  { id: 'sailor', group: 'ranch', tiers: [1, 10, 50], value: total('boat') },
  { id: 'supplier', group: 'ranch', tiers: [5, 25, 100], value: total('order') },
  { id: 'merchant', group: 'ranch', tiers: [20, 100, 500], value: total('sell') },
  { id: 'tycoon', group: 'ranch', tiers: [200, 1000, 5000], value: total('earn') },
  {
    id: 'decorator',
    group: 'ranch',
    tiers: [1, 2, DECOR_LIST.length],
    value: (p) => p.decor.length,
  },
  // ——— Friends & the farm itself ———
  { id: 'neighbour', group: 'social', tiers: [5, 25, 100], value: total('help') },
  { id: 'sneaky', group: 'social', tiers: [1, 10, 50], value: total('steal') },
  { id: 'generous', group: 'social', tiers: [1, 10, 50], value: total('gift') },
  { id: 'level', group: 'social', tiers: [5, 10, 20, 30], value: (p) => lv(p) },
  { id: 'diligent', group: 'social', tiers: [3, 15, 50], value: total('allDaily') },
];

export const ACHIEVEMENT_GROUPS: AchievementGroup[] = ['meals', 'garden', 'ranch', 'social'];

/**
 * Tier n (1-based) pays more the higher it is: XP for the first two, then more xu and seeds
 * than XP (28 achievements of XP would be some 50 levels). The level achievement pays no XP
 * (levelling up must not pay XP that levels you up).
 */
export function badgeReward(tier: number, id = ''): QuestReward {
  const r = tier <= 2 ? R(20 * tier, 10 * tier, 1) : R(15 * tier, 15 * tier, 3);
  return id === 'level' ? { ...r, xp: 0 } : r;
}

/** Streak days that open a chest, and what is inside. */
export const STREAK_CHESTS: Record<number, QuestReward> = {
  3: R(20, 15, 1, 1),
  5: R(30, 25, 2, 1),
  7: R(50, 40, 3, 2),
  14: R(80, 70, 4, 2),
  30: R(150, 150, 6, 3),
};

export const QUEST_DEFS: Record<string, QuestDef> = Object.fromEntries(
  [CORE, ...DAILY_POOL, ...WEEKLY_POOL].map((d) => [d.id, d]),
);

export function questTitle(def: QuestDef): string {
  return q.metric[def.metric](def.target);
}

export function badgeTitle(id: string): { name: string; goal: (n: number) => string } {
  return q.badges[id as keyof typeof q.badges];
}

/** Monday-start week of a local day, named by its Monday ("2026-09-28"). */
export function weekKey(now: number): string {
  const d = new Date(now);
  const back = (d.getDay() + 6) % 7;
  return dateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back, 12).getTime());
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Quests the guest can actually do: animals once one is open, friends' quests with friends. */
function doable(p: GuestProgress, def: QuestDef, now: number): boolean {
  const animals = ANIMAL_LIST.some((a) => a.unlockLevel <= lv(p));
  if ((def.metric === 'feed' || def.metric === 'collect') && !animals) return false;
  if (SOCIAL.has(def.metric) && !p.quests.social) return false;
  return def.when ? def.when(p, now) : true;
}

/**
 * Up to `n` quests from `pool`, stable for the guest and the period: at most one social one,
 * never two that count the same thing, none `taken` already (today's choose quest).
 */
function draw(
  p: GuestProgress,
  pool: QuestDef[],
  n: number,
  seed: string,
  now: number,
  taken: QuestMetric[] = [],
): string[] {
  const r = rng(hash(`${seed}:${p.guestId}`));
  // The whole pool is shuffled first and only then filtered: a gate that opens later in the
  // day (a tree planted) moves one quest in, it does not reshuffle the list.
  const order = [...pool];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const out: QuestDef[] = [];
  const used = new Set<QuestMetric>(taken);
  for (const d of order) {
    if (out.length >= n) break;
    if (!doable(p, d, now)) continue;
    if (used.has(d.metric)) continue;
    if (SOCIAL.has(d.metric) && out.some((o) => SOCIAL.has(o.metric))) continue;
    used.add(d.metric);
    out.push(d);
  }
  return out.map((d) => d.id);
}

export function emptyQuests(now: number): QuestState {
  return {
    date: '',
    week: weekKey(now),
    daily: [],
    weekly: [],
    day: {},
    weekTally: {},
    total: {},
    claimed: [],
    weekClaimed: [],
    badges: {},
    chest: null,
    social: false,
  };
}

/** The quest state for `now`: a new day or week draws new lists and starts its tally at zero. */
export function questsFor(p: GuestProgress, now: number): QuestState {
  const date = dateKey(now);
  const week = weekKey(now);
  let qs = p.quests;
  if (qs.date !== date) {
    qs = {
      ...qs,
      date,
      daily: [
        CORE.id,
        ...draw(p, DAILY_POOL, DAILY_COUNT - 1, `daily:${date}`, now, [CORE.metric]),
      ],
      day: {},
      claimed: [],
    };
  }
  if (qs.week !== week || qs.weekly.length === 0) {
    qs = {
      ...qs,
      week,
      weekly: draw(p, WEEKLY_POOL, WEEKLY_COUNT, `weekly:${week}`, now),
      weekTally: qs.week === week ? qs.weekTally : {},
      weekClaimed: qs.week === week ? qs.weekClaimed : [],
    };
  }
  return qs;
}

export type QuestStatus = 'open' | 'ready' | 'claimed';

export interface QuestView {
  def: QuestDef;
  title: string;
  progress: number;
  status: QuestStatus;
}

function view(def: QuestDef, tally: Tally, claimed: string[]): QuestView {
  const progress = Math.min(def.target, tally[def.metric] ?? 0);
  return {
    def,
    title: questTitle(def),
    progress,
    status: claimed.includes(def.id) ? 'claimed' : progress >= def.target ? 'ready' : 'open',
  };
}

export function dailyQuests(p: GuestProgress, now: number): QuestView[] {
  const qs = questsFor(p, now);
  return qs.daily.flatMap((id) =>
    QUEST_DEFS[id] ? [view(QUEST_DEFS[id], qs.day, qs.claimed)] : [],
  );
}

export function weeklyQuests(p: GuestProgress, now: number): QuestView[] {
  const qs = questsFor(p, now);
  return qs.weekly.flatMap((id) =>
    QUEST_DEFS[id] ? [view(QUEST_DEFS[id], qs.weekTally, qs.weekClaimed)] : [],
  );
}

export interface BadgeView {
  def: AchievementDef;
  value: number;
  /** Tiers claimed so far, and the next goal (null once every tier is claimed). */
  claimed: number;
  next: number | null;
  ready: boolean;
}

export function badges(p: GuestProgress): BadgeView[] {
  return ACHIEVEMENTS.map((def) => {
    const claimed = p.quests.badges[def.id] ?? 0;
    const value = def.value(p);
    const next = def.tiers[claimed] ?? null;
    return { def, value, claimed, next, ready: next !== null && value >= next };
  });
}

/** Rewards waiting to be claimed: drives the badge on the missions button. */
export function claimableCount(p: GuestProgress, now: number): number {
  return (
    dailyQuests(p, now).filter((v) => v.status === 'ready').length +
    weeklyQuests(p, now).filter((v) => v.status === 'ready').length +
    badges(p).filter((b) => b.ready).length +
    (p.quests.chest ? 1 : 0)
  );
}

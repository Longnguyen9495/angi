import { ANIMAL_LIST, RECIPE_LIST, XP_PER_LEVEL } from '../data/game';
import { t } from '../i18n';
import type { GuestProgress } from './progress';
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
  | 'gift';

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
];

export const DAILY_COUNT = 4;
export const WEEKLY_COUNT = 3;

const SOCIAL: ReadonlySet<QuestMetric> = new Set(['help', 'steal', 'gift']);

export interface AchievementDef {
  id: string;
  tiers: readonly number[];
  value: (p: GuestProgress) => number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'farmer', tiers: [10, 50, 200, 500], value: (p) => p.quests.total.harvest ?? 0 },
  { id: 'cook', tiers: [1, 10, 50, 150], value: (p) => p.quests.total.cook ?? 0 },
  {
    id: 'recipes',
    tiers: [3, 7, RECIPE_LIST.length],
    value: (p) => Object.values(p.cooked).filter((n) => (n ?? 0) > 0).length,
  },
  { id: 'angler', tiers: [10, 50, 200], value: (p) => p.quests.total.catch ?? 0 },
  { id: 'supplier', tiers: [5, 25, 100], value: (p) => p.quests.total.order ?? 0 },
  { id: 'neighbour', tiers: [5, 25, 100], value: (p) => p.quests.total.help ?? 0 },
  { id: 'sneaky', tiers: [1, 10, 50], value: (p) => p.quests.total.steal ?? 0 },
  { id: 'generous', tiers: [1, 10, 50], value: (p) => p.quests.total.gift ?? 0 },
  { id: 'explorer', tiers: [5, 20, 50], value: (p) => p.stamps.eaten.length },
];

/** Tier n (1-based) pays more the higher it is. */
export function badgeReward(tier: number): QuestReward {
  return R(20 * tier, 10 * tier, tier >= 3 ? 2 : 1);
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
function doable(p: GuestProgress, def: QuestDef): boolean {
  const lvl = Math.floor(p.xp / XP_PER_LEVEL) + 1;
  const animals = ANIMAL_LIST.some((a) => a.unlockLevel <= lvl);
  if ((def.metric === 'feed' || def.metric === 'collect') && !animals) return false;
  if (SOCIAL.has(def.metric) && !p.quests.social) return false;
  return true;
}

/** Up to `n` quests from `pool`, at most one social one, stable for the guest and the period. */
function draw(p: GuestProgress, pool: QuestDef[], n: number, seed: string): string[] {
  const r = rng(hash(`${seed}:${p.guestId}`));
  const left = pool.filter((d) => doable(p, d));
  const out: QuestDef[] = [];
  while (out.length < n && left.length > 0) {
    const d = left.splice(Math.floor(r() * left.length), 1)[0]!;
    if (SOCIAL.has(d.metric) && out.some((o) => SOCIAL.has(o.metric))) continue;
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
      daily: [CORE.id, ...draw(p, DAILY_POOL, DAILY_COUNT - 1, `daily:${date}`)],
      day: {},
      claimed: [],
    };
  }
  if (qs.week !== week || qs.weekly.length === 0) {
    qs = {
      ...qs,
      week,
      weekly: draw(p, WEEKLY_POOL, WEEKLY_COUNT, `weekly:${week}`),
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

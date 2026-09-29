export type MealSlot = 'breakfast' | 'lunch' | 'dinner';

const HOUR = 60 * 60 * 1000;
export const HOUR_MS = HOUR;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local calendar day, e.g. "2026-09-29". */
export function dateKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function mealSlot(now: number): MealSlot {
  const d = new Date(now);
  const minutes = d.getHours() * 60 + d.getMinutes();
  if (minutes < 10 * 60 + 30) return 'breakfast';
  if (minutes < 15 * 60) return 'lunch';
  return 'dinner';
}

/** One reward per meal slot per day — this key is the idempotency anchor. */
export function slotKey(now: number): string {
  return `${dateKey(now)}:${mealSlot(now)}`;
}

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: 'bữa sáng',
  lunch: 'bữa trưa',
  dinner: 'bữa tối',
};

/** Whole days between two date keys (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const ta = Date.UTC(ay ?? 0, (am ?? 1) - 1, ad ?? 1);
  const tb = Date.UTC(by ?? 0, (bm ?? 1) - 1, bd ?? 1);
  return Math.round((tb - ta) / (24 * HOUR));
}

export function formatClock(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(1, Math.ceil(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} phút`;
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
}

/** Wall-clock read used by event handlers (kept out of render on purpose). */
export function currentTime(): number {
  return Date.now();
}

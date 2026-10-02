import type { GuestProgress } from './progress';
import { level, stampCount } from './selectors';

/** What to do when a device meets the progress saved in the guest's account. */
export type Reconcile = { kind: 'push' } | { kind: 'pull' } | { kind: 'same' } | { kind: 'ask' };

export interface ProgressSummary {
  level: number;
  stamps: number;
  cooked: number;
  meals: number;
  /** The latest chosen dish, the easiest way to tell two journeys apart. */
  lastDishId: string | null;
}

export function summarize(p: GuestProgress): ProgressSummary {
  return {
    level: level(p.xp).level,
    stamps: stampCount(p),
    cooked: Object.values(p.cooked).reduce<number>((a, b) => a + (b ?? 0), 0),
    meals: p.history.length,
    lastDishId: p.meal?.dishId ?? p.history[0]?.dishId ?? null,
  };
}

/** A device where nothing has been earned yet — safe to overwrite. */
export function isTrivial(p: GuestProgress): boolean {
  return p.ledger.length === 0 && p.history.length === 0 && p.xp === 0;
}

/**
 * Never throw progress away silently: overwrite only an empty side, follow the
 * same journey forward (same guestId → the longer ledger wins), and ask the
 * guest when two different journeys meet.
 */
export function reconcile(local: GuestProgress, remote: GuestProgress | null): Reconcile {
  if (!remote) return { kind: 'push' };
  if (isTrivial(local)) return isTrivial(remote) ? { kind: 'same' } : { kind: 'pull' };
  if (isTrivial(remote)) return { kind: 'push' };
  if (local.guestId === remote.guestId) {
    if (local.ledger.length === remote.ledger.length && local.xp === remote.xp) {
      return { kind: 'same' };
    }
    return local.ledger.length >= remote.ledger.length ? { kind: 'push' } : { kind: 'pull' };
  }
  return { kind: 'ask' };
}

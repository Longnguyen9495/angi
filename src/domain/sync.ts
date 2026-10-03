import type { GuestProgress } from './progress';
import { level, stampCount } from './selectors';

/**
 * What to do when a device meets the progress saved in the guest's account. `fresh`: the
 * journey on this device belongs to another account, and this account has none yet — start a
 * new one for it instead of copying the other account's garden in.
 */
export type Reconcile =
  { kind: 'push' } | { kind: 'pull' } | { kind: 'same' } | { kind: 'ask' } | { kind: 'fresh' };

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

/** Everything that is worth something: two copies that differ here are not the same garden. */
function economy(p: GuestProgress): string {
  return JSON.stringify([p.xp, p.coins, p.seeds, p.ingredients, p.plots, p.decor, p.cooked]);
}

/**
 * Never throw progress away silently, and never carry one account's garden into another:
 * - a journey saved to a different account (its `owner`) is never uploaded here;
 * - an empty side is overwritten; the same journey follows its ledger forward (the copy
 *   that already holds the other's newest entry is ahead);
 * - two copies with the same newest entry but different balances, or two different
 *   journeys, are the guest's call.
 */
export function reconcile(
  local: GuestProgress,
  remote: GuestProgress | null,
  owner?: string | null,
): Reconcile {
  const foreign = !!local.owner && !!owner && local.owner !== owner;
  if (!remote) return foreign ? { kind: 'fresh' } : { kind: 'push' };
  if (foreign) return { kind: 'pull' };
  if (isTrivial(local)) return isTrivial(remote) ? { kind: 'same' } : { kind: 'pull' };
  if (isTrivial(remote)) return { kind: 'push' };
  if (local.guestId !== remote.guestId) return { kind: 'ask' };
  const localLast = local.ledger[local.ledger.length - 1]?.key;
  const remoteLast = remote.ledger[remote.ledger.length - 1]?.key;
  if (localLast === remoteLast) {
    return economy(local) === economy(remote) ? { kind: 'same' } : { kind: 'ask' };
  }
  if (remoteLast === undefined || local.ledger.some((e) => e.key === remoteLast)) {
    return { kind: 'push' };
  }
  if (localLast === undefined || remote.ledger.some((e) => e.key === localLast)) {
    return { kind: 'pull' };
  }
  return { kind: 'ask' };
}

import type { BugId, SkyCropId, SkyGoodId, SkyItemId } from '../data/skyEconomy';
import type { PotId } from '../data/skyGarden';
import type { CropId, ProduceId } from '../data/types';
import type { GuestProgress, LedgerEntry, Resource } from './progress';

/*
 * The reward ledger: every change to XP, xu, seeds, pantry and (Vườn Mây) sky seeds, bugs,
 * items, goods and pots goes through post(), keyed so a replay pays nothing twice. The server
 * (ProgressGuard.php) checks the same keys and balances.
 */

/**
 * Entries kept on the device. The server keeps every one-time reward for good
 * (server/lib/ProgressGuard.php checks each save against them), so this is just the window
 * a save is checked in; it holds far more than a day of play between two saves.
 */
export const LEDGER_LIMIT = 1000;

export function hasKey(s: GuestProgress, key: string): boolean {
  return s.ledger.some((e) => e.key === key);
}

export function balance(s: GuestProgress, resource: Resource): number {
  if (resource === 'xp') return s.xp;
  if (resource === 'coin') return s.coins;
  if (resource === 'stamp') return s.stamps.discovered.length + s.stamps.eaten.length;
  const [kind, id] = resource.split(':') as [string, string];
  const sky = s.sky;
  switch (kind) {
    case 'seed':
      return s.seeds[id as CropId];
    case 'ingredient':
      return s.ingredients[id as ProduceId];
    case 'skyseed':
      return sky?.seeds[id as SkyCropId] ?? 0;
    case 'bug':
      return sky?.bugs[id as BugId] ?? 0;
    case 'skyitem':
      return sky?.items[id as SkyItemId] ?? 0;
    case 'skygood':
      return sky?.goods[id as SkyGoodId] ?? 0;
    case 'pot':
      return sky ? Object.values(sky.pots).filter((p) => p.pot === (id as PotId)).length : 0;
    default:
      return 0;
  }
}

function setBalance(s: GuestProgress, resource: Resource, value: number) {
  if (resource === 'xp') s.xp = value;
  else if (resource === 'coin') s.coins = value;
  else {
    const [kind, id] = resource.split(':') as [string, string];
    const sky = s.sky;
    if (kind === 'seed') s.seeds[id as CropId] = value;
    else if (kind === 'ingredient') s.ingredients[id as ProduceId] = value;
    else if (sky && kind === 'skyseed') sky.seeds = { ...sky.seeds, [id]: value };
    else if (sky && kind === 'bug') sky.bugs = { ...sky.bugs, [id]: value };
    else if (sky && kind === 'skyitem') sky.items = { ...sky.items, [id]: value };
    else if (sky && kind === 'skygood') sky.goods = { ...sky.goods, [id]: value };
  }
}

/**
 * Applies a resource change through the ledger. Returns false (and changes
 * nothing) when the idempotency key was already used or the balance would go
 * negative — double taps and retries can never pay out twice.
 *
 * Pots (`pot:<id>`) are counted, not stored: the caller adds the pot before posting +1, and
 * removes it after posting −1; post() only records the entry.
 */
export function post(
  s: GuestProgress,
  key: string,
  resource: Resource,
  delta: number,
  reason: string,
  now: number,
): boolean {
  if (hasKey(s, key)) return false;
  if (resource !== 'stamp' && !resource.startsWith('pot:')) {
    const next = balance(s, resource) + delta;
    if (next < 0) return false;
    setBalance(s, resource, next);
  }
  const entry: LedgerEntry = {
    key,
    resource,
    delta,
    balanceAfter: balance(s, resource),
    reason,
    at: now,
  };
  s.ledger = [...s.ledger, entry].slice(-LEDGER_LIMIT);
  return true;
}

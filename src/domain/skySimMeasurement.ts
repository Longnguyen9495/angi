import type { GuestProgress } from './progress';
import { balance } from './ledger';

/** Reducers clone entries: compare keys, never object identity or ledger length. */
export function transitionEntries(before: GuestProgress, after: GuestProgress) {
  const keys = new Set(before.ledger.map((entry) => entry.key));
  if (before.ledger.length && after.ledger.length && !after.ledger.some((entry) => keys.has(entry.key))) {
    throw new Error('Transition replaced the entire ledger tail; measurement cannot prove completeness');
  }
  const entries = after.ledger.filter((entry) => !keys.has(entry.key));
  for (const resource of ['coin', 'xp'] as const) {
    const field = resource === 'coin' ? 'coins' : 'xp';
    const delta = entries.filter((entry) => entry.resource === resource).reduce((sum, entry) => sum + entry.delta, 0);
    if (after[field] - before[field] !== delta) throw new Error(`Unmeasured ${resource} transition`);
  }
  const resources = new Set(entries.map((entry) => entry.resource));
  for (const resource of resources) {
    if (resource === 'stamp' || resource.startsWith('pot:')) continue;
    const delta = entries.filter((entry) => entry.resource === resource).reduce((sum, entry) => sum + entry.delta, 0);
    if (balance(after, resource) - balance(before, resource) !== delta) {
      throw new Error(`Unmeasured ${resource} transition`);
    }
  }
  return entries;
}

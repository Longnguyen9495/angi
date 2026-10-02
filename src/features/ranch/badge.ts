import { ANIMAL_LIST } from '../../data/game';
import type { GuestProgress } from '../../domain/progress';
import { animalStage, boatStage, hiveStage } from '../../domain/selectors';

/**
 * What the ranch has waiting for the guest: products ready to collect, hungry animals that can
 * be fed from the pantry, a full hive, a boat back at the jetty. Shown on the "…" menu entry.
 */
export function ranchBadge(p: GuestProgress, now: number): number {
  let n = 0;
  for (const def of ANIMAL_LIST) {
    const st = animalStage(p, def.id, now);
    if (st === 'ready' || (st === 'hungry' && p.ingredients[def.feed] > 0)) n++;
  }
  if (hiveStage(p, now) === 'ready') n++;
  if (boatStage(p, now) === 'back') n++;
  return n;
}

import { CROPS } from '../../../data/game';
import { MACHINES, SKY_CROPS, type MachineId } from '../../../data/skyEconomy';
import { SLOTS_PER_FLOOR } from '../../../data/skyGarden';
import type { CropId } from '../../../data/types';
import { bugsOn, slotCount, type SeedRef, type SkyPlant, type SkyState } from '../../../domain/sky';
import type { MachineKind, MachinePhase } from '../art';
import type { SceneView } from '../SkyScene';

/*
 * The scene's view of the game's sky branch (SkyScene controlled mode): what stands on each
 * slot, how far each plant has grown, which bugs sit on it, and each floor's machine.
 */

/** The machine at the head of each floor (one per floor, MACHINES[].floor). */
export function machineOfFloor(floor: number): MachineId | null {
  const m = (Object.keys(MACHINES) as MachineId[]).find((id) => MACHINES[id].floor === floor + 1);
  return m ?? null;
}

/** The scene's drawing for a machine id. */
export const MACHINE_ART: Record<MachineId, MachineKind> = {
  tea: 'tea',
  pot: 'pot',
  still: 'dew',
  phin: 'phin',
};

/** The farm picture a seed borrows until sky plants have their own (§0.7). */
export function seedSprite(seed: SeedRef): CropId {
  return seed.kind === 'sky' ? SKY_CROPS[seed.id].sprite : seed.id;
}

export function plantProgress(p: SkyPlant, now: number): number {
  if (now >= p.readyAt) return 1;
  return Math.max(0, Math.min(0.999, (now - p.plantedAt) / Math.max(1, p.readyAt - p.plantedAt)));
}

export function machinePhase(sky: SkyState, m: MachineId, now: number): MachinePhase {
  const jobs = sky.jobs[m] ?? [];
  if (jobs.some((j) => now >= j.readyAt)) return 'done';
  return jobs.length ? 'run' : 'idle';
}

export function buildView(sky: SkyState, now: number): SceneView {
  return {
    floors: Array.from({ length: sky.floors }, (_, f) => {
      const open = slotCount(sky, f);
      const m = machineOfFloor(f);
      return {
        machine: m ? { kind: MACHINE_ART[m], phase: machinePhase(sky, m, now) } : null,
        slots: Array.from({ length: SLOTS_PER_FLOOR }, (_, i) => {
          const uid = sky.slots[f]?.[i] ?? null;
          const pot = uid ? sky.pots[uid] : undefined;
          const plant = pot?.plant ?? null;
          return {
            pot: pot?.pot ?? null,
            locked: i >= open,
            plant: plant
              ? { sprite: seedSprite(plant.seed), progress: plantProgress(plant, now) }
              : null,
            // A bug still on a ripe plant can be caught until it is picked (§12.1).
            bugs: plant ? bugsOn(plant) : [],
          };
        }),
      };
    }),
  };
}

/** A seed's display name key and its farm crop (for farm seeds). */
export function isFarmVeg(id: CropId): boolean {
  return CROPS[id]?.kind === 'veg';
}

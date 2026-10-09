import art from '../../data/skyGardenArt.json';
import type { BugId, MachineId, SkyCropId, SkyDecorId } from '../../data/skyEconomy';
import type { MachineKind } from './art';
import type { Stage } from './demo';

/*
 * Vườn Mây's own pictures, once drawn (scripts/sky-garden/prepare-art.mjs writes the list).
 * Until a plant has all four stages, a bug both frames, a machine its picture, the scene keeps
 * the borrowed farm sprite or the canvas drawing: a half-drawn set is never mixed in.
 */

const BASE = '/images/sky-garden/';
const plants = new Set<string>(art.plants);
const bugs = new Set<string>(art.bugs);
const machines = new Set<string>(art.machines);
const decor = new Set<string>(art.decor);

/** The machine id a scene drawing stands for (the dew still is drawn as 'dew'). */
const MACHINE_OF: Record<MachineKind, MachineId> = {
  tea: 'tea',
  pot: 'pot',
  dew: 'still',
  phin: 'phin',
};

/** A sky plant's own picture for a stage, or null while it borrows a farm sprite. */
export function skyPlantSprite(crop: SkyCropId, stage: Stage): string | null {
  return plants.has(crop) ? `${BASE}plants/${crop}-${stage}.webp` : null;
}

/** A bug's own picture for a wing-flap frame (0 or 1), or null while it is drawn in canvas. */
export function skyBugSprite(bug: BugId, frame: number): string | null {
  return bugs.has(bug) ? `${BASE}bugs/${bug}-${frame ? 'b' : 'a'}.webp` : null;
}

/** A cloud decoration's picture, or null: an undrawn decoration is not shown at all. */
export function skyDecorSprite(id: SkyDecorId): string | null {
  return decor.has(id) ? `${BASE}decor/${id}.webp` : null;
}

/** The magic bean sprout on the farm, or null while the button keeps its cloud icon. */
export function beanSproutSprite(): string | null {
  return art.beanSprout ? `${BASE}bean-sprout.webp` : null;
}

/** A machine's own picture, or null while it is drawn in canvas. */
export function skyMachineSprite(kind: MachineKind): string | null {
  const id = MACHINE_OF[kind];
  return machines.has(id) ? `${BASE}machines/${id}.webp` : null;
}

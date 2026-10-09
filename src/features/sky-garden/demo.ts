import type { BugId, SkyCropId } from '../../data/skyEconomy';
import type { PotId } from '../../data/skyGarden';
import type { CropId } from '../../data/types';
import type { MachineKind, MachinePhase } from './art';

/*
 * The G1 demo garden: three floors held in memory only. Nothing here touches GuestProgress, the
 * reducer, persistence or the server (plans/vuon-may.md §0.3 G1). Times are scene seconds and
 * every cycle is sped up so a short look shows plants grow, ripen and get picked.
 */

/** Every bug of the game (src/data/skyEconomy.ts); the demo sends four of them. */
export type BugKind = BugId;

/** Growth stages, as the farm sprites name them. */
export const STAGES = ['sprout', 'young', 'flowering', 'ready'] as const;
export type Stage = (typeof STAGES)[number];

export interface DemoPlant {
  crop: CropId;
  /** The sky plant it stands for, drawn with its own pictures once they exist (skyArt.ts). */
  sky?: SkyCropId;
  plantedAt: number;
  /** Seconds from planting to ripe (sped up for the demo). */
  grow: number;
}

export interface DemoSlot {
  pot: PotId | null;
  plant: DemoPlant | null;
  /** Not bought yet (the game): drawn with a lock. */
  locked?: boolean;
}

export interface DemoMachine {
  kind: MachineKind;
  phase: MachinePhase;
  /** When the current phase started, and how long a run takes. */
  since: number;
  run: number;
}

export interface DemoFloor {
  slots: DemoSlot[];
  machine: DemoMachine | null;
  /** A cloud decoration's picture at the floor's right end (the game only). */
  decor?: string | null;
}

/** Crops with all four stage sprites in public/images/farm-items (the real sky plants come later). */
export const DEMO_CROPS: CropId[] = [
  'strawberry',
  'herbs',
  'chili',
  'tomato',
  'scallion',
  'bean',
  'eggplant',
  'pumpkin',
  'corn',
  'cabbage',
];

/** Floor 1 the produce set, floor 2 the sea and festival pots, floor 3 a mix (G1 brief). */
const FLOORS: { pots: PotId[]; machine: MachineKind }[] = [
  { pots: ['pumpkin', 'corn', 'cabbage', 'eggplant', 'watermelon', 'red_apple'], machine: 'tea' },
  {
    pots: ['coconut', 'crab', 'porcelain_fish', 'seashell', 'mooncake', 'golden_dragon'],
    machine: 'pot',
  },
  {
    pots: ['pho_bowl', 'teapot', 'banh_chung', 'bamboo_basket', 'bamboo', 'lotus'],
    machine: 'dew',
  },
];

export function createDemo(now: number, rand: () => number): DemoFloor[] {
  return FLOORS.map((f, fi) => ({
    slots: f.pots.map((pot, si) => {
      // A spread of stages from the start: one pot empty, a couple ripe, the rest growing.
      if (fi === 2 && si === 3) return { pot, plant: null };
      const grow = 40 + rand() * 50;
      const done = (fi * 6 + si) % 5 === 0 ? 1.05 : rand() * 0.9;
      return { pot, plant: { crop: pickCrop(rand), plantedAt: now - grow * done, grow } };
    }),
    machine: {
      kind: f.machine,
      phase: fi === 1 ? 'done' : 'run',
      since: now - fi * 4,
      run: 14 + fi * 5,
    },
  }));
}

export function pickCrop(rand: () => number): CropId {
  return DEMO_CROPS[Math.floor(rand() * DEMO_CROPS.length)]!;
}

/** 0..1 grown. */
export function progress(p: DemoPlant, now: number): number {
  return Math.max(0, Math.min(1, (now - p.plantedAt) / p.grow));
}

/** Sprout → young → flowering in thirds of the wait, then ripe. */
export function stageOf(p: DemoPlant, now: number): Stage {
  const k = progress(p, now);
  if (k >= 1) return 'ready';
  return STAGES[Math.min(2, Math.floor(k * 3))]!;
}

/** Machines loop idle → run → done; a tap on a done machine collects and starts the next run. */
export function stepMachine(m: DemoMachine, now: number) {
  if (m.phase === 'run' && now - m.since >= m.run) {
    m.phase = 'done';
    m.since = now;
  } else if (m.phase === 'idle' && now - m.since >= 3) {
    m.phase = 'run';
    m.since = now;
  }
}

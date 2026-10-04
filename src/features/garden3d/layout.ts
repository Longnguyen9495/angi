import type { AnimalId, DecorId } from '../../data/types';

/*
 * Where everything stands on the floating island. World units ≈ metres;
 * y is up, the island's grass surface sits at y = 0, the camera looks from +z.
 */

export const ISLAND_RADIUS = 8.6;
/** Plot grid: 3 columns, rows added as the garden grows (6 → 9 plots). */
export const PLOT_SIZE = 1.55;
const PLOT_STEP = 1.95;
const PLOT_ORIGIN_Z = 0.2;

export type Vec2 = readonly [number, number];

/** Centre (x, z) of plot `index` (0-based), row by row from the back. */
export function plotPosition(index: number): Vec2 {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return [(col - 1) * PLOT_STEP, PLOT_ORIGIN_Z + (row - 1) * PLOT_STEP];
}

/** The rectangle the plot grid covers (for the fence), for `count` plots. */
export function plotBounds(count: number): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  const rows = Math.max(1, Math.ceil(count / 3));
  const half = PLOT_SIZE / 2 + 0.35;
  const [, z0] = plotPosition(0);
  const [, z1] = plotPosition((rows - 1) * 3);
  return { minX: -PLOT_STEP - half, maxX: PLOT_STEP + half, minZ: z0 - half, maxZ: z1 + half };
}

/** The 3D island (friends' visits) only has pens for the hen and the cow. */
export type BuildingId =
  'barn' | 'well' | 'kitchen' | 'pond' | Extract<AnimalId, 'chicken' | 'cow'>;

export interface Placement {
  x: number;
  z: number;
  /** Rotation around y, radians. */
  rot: number;
}

export const BUILDINGS: Record<BuildingId, Placement> = {
  kitchen: { x: 0, z: -5.3, rot: 0 },
  barn: { x: -5.2, z: -2.6, rot: Math.PI / 5 },
  well: { x: 4.9, z: -1.9, rot: -Math.PI / 7 },
  chicken: { x: -5.1, z: 3.1, rot: Math.PI / 3.2 },
  cow: { x: 5.0, z: 3.2, rot: -Math.PI / 3.5 },
  // Front right, like a village pond by the path: fishing for the pantry.
  pond: { x: 2.7, z: 5.35, rot: 0.12 },
};

/** The pond's water, an ellipse in the pond's own space (x across, z deep). */
export const POND_SHAPE = { rx: 1.55, rz: 1.05 } as const;

/** Scenery that is not tapped but needs flat ground and room around it. */
export const LANDMARKS = {
  windmill: { x: -2.75, z: -4.85, rot: 0.35 },
} satisfies Record<string, Placement>;

/** Everything with a footprint: buildings and landmarks. */
export const FOOTPRINTS: Placement[] = [...Object.values(BUILDINGS), ...Object.values(LANDMARKS)];

/** Where each decoration stands until the guest moves it (grid cells). */
export const DEFAULT_DECOR_CELLS: Record<PlaceableDecor, { x: number; z: number; rot: number }> = {
  scarecrow: { x: -4, z: 0, rot: 0 },
  lantern: { x: 3, z: -4, rot: 0 },
  jar: { x: 4, z: 1, rot: 1 },
};

/** Grid cells are 1 unit; a cell is free if it's on the island and clear of plots and buildings. */
export function cellIsFree(x: number, z: number, plotCount: number): boolean {
  if (Math.hypot(x, z) > ISLAND_RADIUS - 1.4) return false;
  const b = plotBounds(plotCount);
  if (x >= b.minX - 0.4 && x <= b.maxX + 0.4 && z >= b.minZ - 0.4 && z <= b.maxZ + 0.4)
    return false;
  for (const p of FOOTPRINTS) {
    if (Math.hypot(x - p.x, z - p.z) < 1.9) return false;
  }
  return true;
}

/** Decorations with a 3D model on the island (the others show on the painted farm only). */
export type PlaceableDecor = 'scarecrow' | 'lantern' | 'jar';

export function isPlaceable(id: DecorId): id is PlaceableDecor {
  return id === 'scarecrow' || id === 'lantern' || id === 'jar';
}

/**
 * Where each owned decoration stands now: its saved cell, else its default
 * cell; `null` in the layout means the guest put it back in the barn.
 */
export function decorSpots(
  owned: readonly DecorId[],
  layout: Partial<Record<DecorId, { x: number; z: number; rot: number } | null>>,
): Partial<Record<PlaceableDecor, Placement>> {
  const out: Partial<Record<PlaceableDecor, Placement>> = {};
  for (const id of owned) {
    if (!isPlaceable(id)) continue;
    const saved = layout[id];
    if (saved === null) continue;
    const cell = saved ?? DEFAULT_DECOR_CELLS[id];
    out[id] = { x: cell.x, z: cell.z, rot: cell.rot };
  }
  return out;
}

/** Grid cells a decoration may move to (free, and not taken by another one). */
export function freeCells(
  plotCount: number,
  taken: readonly Placement[],
): { x: number; z: number }[] {
  const out: { x: number; z: number }[] = [];
  const r = Math.floor(ISLAND_RADIUS);
  for (let x = -r; x <= r; x++) {
    for (let z = -r; z <= r; z++) {
      if (!cellIsFree(x, z, plotCount)) continue;
      if (CHEF_PATH.some(([px, pz]) => Math.hypot(px - x, pz - z) < 0.6)) continue;
      if (taken.some((t) => t.x === x && t.z === z)) continue;
      out.push({ x, z });
    }
  }
  return out;
}

/** Waypoints Cô Ba walks between: her kitchen, along the plots, to the well and back. */
export const CHEF_PATH: Vec2[] = [
  [0, -4.1],
  [-2.9, -1.4],
  [-2.9, 2.6],
  [0, 4.4],
  [2.9, 2.6],
  [3.8, -1.2],
  [1.6, -3.6],
];

/** Deterministic PRNG so the island looks the same on every visit. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** The island's edge radius toward angle `a`: an organic outline, never a perfect circle. */
export function edgeRadius(a: number): number {
  return (
    ISLAND_RADIUS *
    (1 +
      0.055 * Math.sin(3 * a + 0.8) +
      0.035 * Math.sin(5 * a + 2.1) +
      0.018 * Math.sin(9 * a + 0.3))
  );
}

/**
 * Ground height at (x, z). Exactly 0 where the game happens (plots, buildings,
 * the path loop); gentle knolls only toward the rim, and a rounded lip at the edge.
 */
export function groundAt(x: number, z: number): number {
  const d = Math.hypot(x, z);
  const rim = edgeRadius(Math.atan2(z, x));
  let m = smooth(5.9, rim - 1.1, d);
  for (const b of FOOTPRINTS) m *= smooth(1.8, 2.8, Math.hypot(x - b.x, z - b.z));
  if (m <= 0) return 0;
  const knoll = 0.5 + 0.5 * Math.sin(x * 1.05 + 0.4) * Math.cos(z * 0.85 - 0.7);
  const lip = smooth(rim - 0.9, rim, d) * 0.18;
  return m * (knoll * 0.42 - lip);
}

/** Cheap 2D value noise in [0, 1] (smooth, deterministic) for colour patches. */
export function noise2(x: number, z: number): number {
  const h = (i: number, j: number) => {
    const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fz = z - zi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = h(xi, zi) + (h(xi + 1, zi) - h(xi, zi)) * u;
  const b = h(xi, zi + 1) + (h(xi + 1, zi + 1) - h(xi, zi + 1)) * u;
  return a + (b - a) * v;
}

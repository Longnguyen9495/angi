import type { DayPart } from './contract';

/*
 * The corner's composition as plain data: this is the "scene file" of the
 * code-first workflow. Moving the barn or recolouring the sun is an edit here,
 * not in engine code. World units ≈ metres, y up, the camera looks from +z.
 *
 * Layout: barn back-left, tree back-right, the bed in front of centre, a stone
 * path from the front edge to the barn door.
 */

export type Vec3 = readonly [number, number, number];

export const GROUND = {
  radius: 6.2,
  /** Island thickness below the grass (soil band + rock). */
  depth: 1.5,
  rings: 18,
  segments: 56,
};

export const BARN = {
  x: -2.7,
  z: -2.0,
  rot: 0.42,
  width: 2.6,
  depth: 2.0,
  wall: 1.55,
  ridge: 1.05,
};

export const TREE = { x: 3.0, z: -2.3, trunk: 1.35, canopy: 1.25 };

/** Plots sit in one raised bed, 3 per row like the existing garden. */
export const BED = { x: 0.35, z: 1.05, cell: 1.0, gap: 0.14, frame: 0.16, height: 0.3 };

export function bedCell(index: number, count: number): { x: number; z: number } {
  const rows = Math.max(1, Math.ceil(count / 3));
  const col = index % 3;
  const row = Math.floor(index / 3);
  const step = BED.cell + BED.gap;
  return { x: BED.x + (col - 1) * step, z: BED.z + (row - (rows - 1) / 2) * step };
}

export function bedSize(count: number): { w: number; d: number } {
  const rows = Math.max(1, Math.ceil(count / 3));
  const step = BED.cell + BED.gap;
  return { w: 3 * step + BED.gap + BED.frame * 2, d: rows * step + BED.gap + BED.frame * 2 };
}

/** Stepping stones from the front edge, round the bed, to the barn door: x, z, radius, turn. */
export const PATH_STONES: readonly (readonly [number, number, number, number])[] = [
  [-1.0, 5.0, 0.36, 0.2],
  [-1.45, 4.25, 0.3, 1.1],
  [-1.95, 3.45, 0.34, 0.5],
  [-2.25, 2.55, 0.29, 2.0],
  [-2.35, 1.6, 0.33, 0.9],
  [-2.25, 0.7, 0.3, 1.7],
  [-2.1, -0.2, 0.35, 0.3],
];

/** Low foreground clusters so the front half is not an empty lawn. */
export const TUFTS: readonly (readonly [number, number, number])[] = [
  [2.9, 3.6, 1],
  [3.5, 2.6, 0.8],
  [-3.8, 3.1, 0.9],
  [1.2, 4.6, 0.7],
  [4.3, -0.4, 0.8],
];

export const CAMERA = {
  target: [0, 0.35, 0.4] as Vec3,
  distance: 13.2,
  pitch: 0.6,
  yaw: 0,
  /** Sideways drag range, radians. */
  yawLimit: 0.6,
  zoom: { min: 8.5, max: 17 },
  fov: 34,
};

/** Camera framing: the corner's own, or one derived from a loaded scene's camera. */
export type CameraConfig = typeof CAMERA;

export interface Lighting {
  sun: Vec3;
  sunIntensity: number;
  /** Sun direction as pitch/yaw in degrees. */
  sunAngles: readonly [number, number];
  ambient: Vec3;
  sky: Vec3;
  lamp: number;
  /** Image-based light strength (scene.skyboxIntensity). */
  ibl: number;
  /** Multiplier on the cloud backdrop photo. */
  backdrop: Vec3;
}

/** Warm key light over a slightly cool ambient; night keeps the scene readable. */
export const LIGHTING: Record<DayPart, Lighting> = {
  morning: {
    sun: [1, 0.9, 0.78],
    sunIntensity: 1.15,
    sunAngles: [42, 35],
    ambient: [0.42, 0.47, 0.55],
    sky: [0.8, 0.88, 0.9],
    lamp: 0,
    ibl: 0.6,
    backdrop: [1, 0.95, 0.88],
  },
  noon: {
    sun: [1, 0.96, 0.88],
    sunIntensity: 1.05,
    sunAngles: [58, 28],
    ambient: [0.45, 0.5, 0.56],
    sky: [0.82, 0.9, 0.93],
    lamp: 0,
    ibl: 0.7,
    backdrop: [1, 1, 1],
  },
  evening: {
    sun: [1, 0.74, 0.52],
    sunIntensity: 1.05,
    sunAngles: [24, 50],
    ambient: [0.42, 0.4, 0.48],
    sky: [0.93, 0.8, 0.68],
    lamp: 0.6,
    ibl: 0.6,
    backdrop: [1, 0.9, 0.8],
  },
  night: {
    sun: [0.55, 0.62, 0.85],
    sunIntensity: 0.55,
    sunAngles: [50, -30],
    ambient: [0.2, 0.24, 0.34],
    sky: [0.14, 0.17, 0.26],
    lamp: 1,
    ibl: 0.15,
    backdrop: [0.18, 0.22, 0.36],
  },
};

/** Palette (linear-ish sRGB 0–1): cream, honey wood, leaf greens, terracotta. */
export const PALETTE = {
  grass: [0.46, 0.6, 0.3] as Vec3,
  grassDeep: [0.33, 0.47, 0.22] as Vec3,
  grassLight: [0.62, 0.7, 0.36] as Vec3,
  worn: [0.64, 0.55, 0.4] as Vec3,
  soil: [0.36, 0.25, 0.17] as Vec3,
  soilWet: [0.22, 0.15, 0.1] as Vec3,
  cliff: [0.52, 0.4, 0.29] as Vec3,
  rock: [0.6, 0.56, 0.5] as Vec3,
  wood: [0.66, 0.46, 0.27] as Vec3,
  woodDark: [0.42, 0.28, 0.17] as Vec3,
  woodLight: [0.78, 0.62, 0.42] as Vec3,
  roof: [0.72, 0.33, 0.22] as Vec3,
  roofDark: [0.55, 0.24, 0.16] as Vec3,
  plaster: [0.93, 0.87, 0.75] as Vec3,
  stone: [0.6, 0.57, 0.51] as Vec3,
  stoneWarm: [0.66, 0.6, 0.51] as Vec3,
  bark: [0.45, 0.33, 0.24] as Vec3,
  leaf: [0.36, 0.55, 0.26] as Vec3,
  leafLight: [0.5, 0.66, 0.32] as Vec3,
  leafDeep: [0.27, 0.44, 0.21] as Vec3,
  cropLeaf: [0.4, 0.62, 0.28] as Vec3,
  flower: [0.98, 0.93, 0.78] as Vec3,
  select: [0.95, 0.76, 0.36] as Vec3,
  thirsty: [0.5, 0.74, 0.88] as Vec3,
  water: [0.55, 0.78, 0.95] as Vec3,
  lamp: [1, 0.78, 0.45] as Vec3,
};

/**
 * CC0 props (public/models/farm/props/{id}.glb). `at: 'barn'` places in barn
 * space (x right, z towards the door side). `size` is the target longest side
 * in metres (≈1.3× real life, so props read next to the diorama-scale barn);
 * the loader scales the model to it and stands it on the ground.
 * `replaces` names the placeholder shapes hidden once the model has loaded.
 */
export interface PropSpot {
  id: string;
  at: 'barn' | 'world';
  x: number;
  z: number;
  /** Degrees around Y, then optional tilt around X (lay an axe down). */
  rot: number;
  tilt?: number;
  size: number;
  replaces?: 'crate' | 'jar' | 'sack';
}

export const PROPS: readonly PropSpot[] = [
  { id: 'wooden_crate_02', at: 'barn', x: 1.78, z: 0.72, rot: 12, size: 0.8, replaces: 'crate' },
  { id: 'planter_pot_clay', at: 'barn', x: -1.66, z: 0.86, rot: 0, size: 0.62, replaces: 'jar' },
  { id: 'ceramic_pot', at: 'barn', x: -1.62, z: 1.46, rot: 30, size: 0.42 },
  { id: 'chinese_stool', at: 'barn', x: 1.6, z: 1.5, rot: -18, size: 0.56, replaces: 'sack' },
  { id: 'wooden_axe_02', at: 'barn', x: 2.0, z: 0.1, rot: 70, tilt: 90, size: 0.78 },
  { id: 'wooden_bucket_01', at: 'world', x: 2.75, z: 1.9, rot: 25, size: 0.5 },
];

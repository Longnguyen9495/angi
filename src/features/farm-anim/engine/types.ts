/** Shapes of public/farm-anim/layers.json (written by scripts/farm-anim/prepare.mjs). */

export type Vec2 = [number, number];

/** A sprite file placed in picture pixels (top-left x, y). */
export interface Placed {
  file: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A cut sprite with the anchor points its animation needs. */
export interface SpriteDef extends Placed {
  feet?: Vec2;
  /** Where an instance starts when it reuses another sprite. */
  start?: Vec2;
  base?: Vec2;
  hub?: Vec2;
  tips?: Vec2[];
  /** Which way the head points in the file (sheet animals), so the runtime flips correctly. */
  faces?: 'left' | 'right';
}

export interface CloudDef extends Placed {
  /** Front bank in front of the cliffs (sways in place) rather than a drifting sky cloud. */
  bank: boolean;
  /** Drawn mirrored (one sheet cloud reads as another). */
  flip?: boolean;
}

/** A loose piece from the asset sheet (leaf, butterfly, sparkle…), drawn at its own size. */
export interface FxDef {
  file: string;
  w: number;
  h: number;
}

export type FxId =
  | 'leaf1'
  | 'leaf2'
  | 'leaf3'
  | 'leaf4'
  | 'butterflyOrange'
  | 'butterflyBlue'
  | 'birdWhite'
  | 'birdBrown'
  | 'sparkle'
  | 'smoke'
  | 'splash'
  | 'flower';

export type LayerKind =
  | 'tree'
  | 'pine'
  | 'bush'
  | 'grass'
  | 'flower'
  | 'reed'
  | 'hay'
  | 'dock'
  /** Plants behind the greenhouse glass: a slow sway of their own, out of the wind. */
  | 'indoor';

export interface LayerDef extends Placed {
  id: string;
  kind: LayerKind;
  /** Soft mask ellipse [cx, cy, rx, ry]. */
  e: [number, number, number, number];
  /** Point that stays put (stem or trunk base). */
  pivot: Vec2;
  /** Crown parts of one tree share a trunk sway. */
  parent?: string;
  /** Fruit hanging in this part, drawn separately (file), when there is enough of it. */
  fruit?: string | boolean;
  /** Underwater plant: slower, wobblier. */
  under?: boolean;
}

export interface Places {
  chimney: { x: number; ridge: [Vec2, Vec2]; top: number; w: number };
  windows: [number, number, number, number][];
  door: { x0: number; y0: number; x1: number; y1: number };
  dockPosts: Vec2[];
  rope: { from: Vec2; to: Vec2 };
  pond: { cx: number; cy: number; rx: number; ry: number; poly: Vec2[] };
  /** Tap rectangles checked after the animals and the pond: [place, x0, y0, x1, y1]. */
  taps: [string, number, number, number, number][];
  /** Tap ellipses round the cows [cx, cy, rx, ry]. */
  cowSpots: [number, number, number, number][];
  hens: {
    /** Patches the hens wander in [x0, y0, x1, y1]. */
    zones: [number, number, number, number][];
    /** Front fence of the yard (from, to): hens stay behind it. */
    fence: [Vec2, Vec2];
    /** The coop box: no walking through it. */
    coop: [number, number, number, number];
  };
  /** Where the game's need bubbles float. */
  bubbles: { cow: Vec2; chicken: Vec2 };
  /** Camera stops in the game. */
  focus: { field: Vec2; barn: Vec2 };
  /** Picture rows the birds cross. */
  skyBand: [number, number];
}

/** The game plots on the painted field lattice. */
export interface FieldDef {
  v0: Vec2;
  R: Vec2;
  L: Vec2;
  plots: { id: number; quad: [Vec2, Vec2, Vec2, Vec2]; centre: Vec2 }[];
  /** Empty soil tile, cut at the lattice corner `anchor`. */
  soil: Placed & { anchor: Vec2 };
}

export interface FarmLayout {
  size: Vec2;
  field: FieldDef;
  clouds: CloudDef[];
  sprites: Record<string, SpriteDef>;
  layers: LayerDef[];
  lilies: { id: string; cx: number; cy: number }[];
  water: Placed;
  glass: Placed;
  places: Places;
  /** Koi boxes on the painting [x0, y0, x1, y1] (their start spots). */
  koi: [number, number, number, number][];
  fx: Record<FxId, FxDef>;
}

/** Debug-panel settings, read by every system each frame. */
export interface Settings {
  animation: boolean;
  particles: boolean;
  parallax: boolean;
  animals: boolean;
  environment: boolean;
  /** Base wind 0..1. */
  wind: number;
  /** Time scale for ambient life (0.25..2). */
  ambientSpeed: number;
  /** Parallax multiplier (0..2). */
  parallaxStrength: number;
  /** Particle spawn multiplier (0..2). */
  particleDensity: number;
}

export const DEFAULT_SETTINGS: Settings = {
  animation: true,
  particles: true,
  parallax: true,
  animals: true,
  environment: true,
  wind: 0.4,
  ambientSpeed: 1,
  parallaxStrength: 1,
  particleDensity: 1,
};

import type { Assets } from './assets';
import type { ParticleSystem } from './ParticleSystem';
import type { Settings } from './types';
import type { WindSystem } from './WindSystem';

/** What every system sees each frame. Times are in seconds, positions in picture pixels. */
export interface World {
  /** Scene time (scaled by ambient speed, frozen when animation is off). */
  t: number;
  /** Frame step after scaling (0 when frozen). */
  dt: number;
  wind: WindSystem;
  settings: Settings;
  assets: Assets;
  particles: ParticleSystem;
  /** prefers-reduced-motion. */
  reduced: boolean;
  /** Pointer in picture pixels, or null when outside the canvas. */
  pointer: { x: number; y: number } | null;
  /** Visible picture-space rectangle [x0, y0, x1, y1] (wider than the picture on wide screens). */
  view: [number, number, number, number];
  rand: () => number;
}

/** A self-contained animated part of the scene. */
export interface AnimSystem {
  update(w: World): void;
  /** Animated objects currently alive (for the debug panel). */
  count(): number;
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0→1 ease-in-out. */
export const smooth = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
/** 0→1 ease-out. */
export const easeOut = (t: number) => 1 - (1 - clamp(t, 0, 1)) ** 3;

/** Draws `img` (placed at x, y) bent about `pivot`: points `h` px above the pivot move `bend * h` sideways. */
export function drawBent(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  pivot: [number, number],
  bend: number,
  lift = 0,
  dx = 0,
  dy = 0,
) {
  ctx.save();
  ctx.translate(pivot[0] + dx, pivot[1] + dy);
  ctx.transform(1, 0, -bend, 1 - lift, 0, 0);
  ctx.drawImage(img, x - pivot[0], y - pivot[1]);
  ctx.restore();
}

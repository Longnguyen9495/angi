/*
 * Pure helpers for the ranch scene: no DOM, no canvas, so they are unit-tested on their own.
 * Positions are in CSS pixels of the layer they live in.
 */

export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Something that occupies room on the ground: its feet at (x, y), `r` its personal space. */
export interface Body extends Vec {
  r: number;
}

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Frame-rate independent easing toward a target: `rate` is "per second". */
export const approach = (v: number, target: number, rate: number, dt: number) =>
  lerp(v, target, 1 - Math.exp(-rate * dt));

/** Small seeded generator (mulberry32) so every actor gets its own, repeatable rhythm. */
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

export const between = (rand: () => number, lo: number, hi: number) => lo + rand() * (hi - lo);

/** Keeps a body (feet point plus radius) inside a pen. */
export function keepInBounds(b: Body, box: Rect): void {
  b.x = clamp(b.x, box.left + b.r, box.right - b.r);
  b.y = clamp(b.y, box.top, box.bottom);
}

/**
 * Pushes overlapping bodies apart (half each), a few passes, then keeps them in the pen.
 * Ground is seen at an angle, so vertical distance counts double: two animals one above the
 * other on screen are still "close". Returns how many pairs were overlapping on the first pass.
 */
export function separate(bodies: Body[], box: Rect, passes = 2): number {
  let first = 0;
  for (let pass = 0; pass < passes; pass++) {
    let overlaps = 0;
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i]!;
        const b = bodies[j]!;
        let dx = b.x - a.x;
        let dy = (b.y - a.y) * 2;
        let d = Math.hypot(dx, dy);
        const min = a.r + b.r;
        if (d >= min) continue;
        overlaps++;
        const push = (min - d) / 2;
        if (d < 1e-6) {
          // Exactly on top of each other: split them sideways, deterministically.
          dx = 1;
          dy = 0;
          d = 1;
        }
        const nx = dx / d;
        const ny = dy / d / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
    for (const b of bodies) keepInBounds(b, box);
    if (pass === 0) first = overlaps;
  }
  return first;
}

/** Shortest signed difference between two angles (radians), in (-π, π]. */
export function angleDiff(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Turns a heading toward a target heading by at most `maxStep` radians. */
export function turnToward(heading: number, target: number, maxStep: number): number {
  const d = angleDiff(heading, target);
  return heading + clamp(d, -maxStep, maxStep);
}

/** Where a point sits in an ellipse: 0 at the centre, 1 on the rim, above 1 outside. */
export function ellipseNorm(p: Vec, cx: number, cy: number, rx: number, ry: number): number {
  return Math.hypot((p.x - cx) / rx, (p.y - cy) / ry);
}

/** Pulls a point back inside an ellipse (scaled by `k`), keeping its direction from the centre. */
export function intoEllipse(p: Vec, cx: number, cy: number, rx: number, ry: number, k = 1): void {
  const n = ellipseNorm(p, cx, cy, rx, ry);
  if (n <= k || n === 0) return;
  p.x = cx + ((p.x - cx) * k) / n;
  p.y = cy + ((p.y - cy) * k) / n;
}

/** A point on a lissajous orbit and its depth (−1 behind, +1 in front), for the bees. */
export interface Orbit {
  cx: number;
  cy: number;
  ax: number;
  ay: number;
  fx: number;
  fy: number;
  phase: number;
}

export function orbitAt(o: Orbit, t: number, spread = 1): Vec & { depth: number } {
  const a = t * o.fx + o.phase;
  return {
    x: o.cx + Math.sin(a) * o.ax * spread,
    y: o.cy + Math.sin(t * o.fy + o.phase * 1.7) * o.ay * spread,
    depth: Math.cos(a),
  };
}

/** Ease for a one-off move (departing boat, hop): smooth start and end. */
export const easeInOut = (k: number) => {
  const c = clamp(k, 0, 1);
  return c < 0.5 ? 2 * c * c : 1 - (-2 * c + 2) ** 2 / 2;
};

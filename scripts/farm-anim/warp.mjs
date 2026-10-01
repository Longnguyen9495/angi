import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Carries points measured on the first painting (V4 MASTER_REFERENCE.png) onto the colourful
 * repaint (MASTER_REFERENCE_COLORFUL_FLOATING_FARM.png = nongtraivuive.png). Both are 1678×937 and
 * show the same farm; the repaint sits ~12 px left and ~10 px up, 1.2 % wider, with small local
 * drifts where objects were redrawn.
 *
 * v4-to-v5-flow.json holds ~1000 matches [x, y, dx, dy] (old point → its offset in the repaint),
 * found by normalised cross-correlation of gradient patches. A global affine fit carries every
 * point; the local median residual of the matches within 70 px corrects the redrawn bits.
 */

const here = dirname(fileURLToPath(import.meta.url));
const FLOW = JSON.parse(readFileSync(join(here, 'v4-to-v5-flow.json'), 'utf8'));

function solve3(S, t) {
  const M = S.map((r, i) => [...r, t[i]]);
  for (let i = 0; i < 3; i++)
    for (let k = i + 1; k < 3; k++) {
      const q = M[k][i] / M[i][i];
      for (let j = i; j < 4; j++) M[k][j] -= q * M[i][j];
    }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let s = M[i][3];
    for (let j = i + 1; j < 3; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

function fitAffine() {
  const S = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const tx = [0, 0, 0];
  const ty = [0, 0, 0];
  for (const [x, y, dx, dy] of FLOW) {
    const v = [x, y, 1];
    for (let i = 0; i < 3; i++) {
      tx[i] += v[i] * (x + dx);
      ty[i] += v[i] * (y + dy);
      for (let j = 0; j < 3; j++) S[i][j] += v[i] * v[j];
    }
  }
  return [solve3(S, tx), solve3(S, ty)];
}

const [AX, AY] = fitAffine();
const affine = (x, y) => [AX[0] * x + AX[1] * y + AX[2], AY[0] * x + AY[1] * y + AY[2]];
const RES = FLOW.map(([x, y, dx, dy]) => {
  const [ax, ay] = affine(x, y);
  return [x, y, x + dx - ax, y + dy - ay];
});
const median = (a) => {
  const s = [...a].sort((p, q) => p - q);
  return s.length ? s[s.length >> 1] : 0;
};

/** Horizontal scale of the repaint (radii and lengths). */
export const SCALE = (AX[0] + AY[1]) / 2;

/** An old picture point in the repaint. */
export function pt([x, y]) {
  const [ax, ay] = affine(x, y);
  const near = RES.filter(([px, py]) => Math.hypot(px - x, py - y) < 70);
  const rx = near.length >= 5 ? median(near.map((r) => r[2])) : 0;
  const ry = near.length >= 5 ? median(near.map((r) => r[3])) : 0;
  const round = (v) => Math.round(v * 2) / 2;
  return [round(ax + rx), round(ay + ry)];
}

/** A direction or offset (no translation, no local drift). */
export const vec = ([x, y]) => [AX[0] * x + AX[1] * y, AY[0] * x + AY[1] * y];

/** Box [x0, y0, x1, y1]. */
export function box([x0, y0, x1, y1]) {
  const [a, b] = pt([(x0 + x1) / 2, (y0 + y1) / 2]);
  const hw = ((x1 - x0) / 2) * SCALE;
  const hh = ((y1 - y0) / 2) * SCALE;
  return [Math.round(a - hw), Math.round(b - hh), Math.round(a + hw), Math.round(b + hh)];
}

/** Ellipse [cx, cy, rx, ry]. */
export function ell([cx, cy, rx, ry]) {
  const [a, b] = pt([cx, cy]);
  // Whole-pixel centre: callers build pixel boxes from it.
  return [Math.round(a), Math.round(b), Math.round(rx * SCALE), Math.round(ry * SCALE)];
}

/** Polygon (each corner on its own local drift would wobble edges: one shift for all). */
export function poly(points) {
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
  const [nx, ny] = pt([cx, cy]);
  return points.map(([x, y]) => {
    const [dx, dy] = vec([x - cx, y - cy]);
    return [Math.round((nx + dx) * 2) / 2, Math.round((ny + dy) * 2) / 2];
  });
}

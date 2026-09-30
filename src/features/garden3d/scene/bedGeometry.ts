import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  SphereGeometry,
  type BufferGeometry,
} from 'three';
import { box, Kit, type Surface } from './kit';
import { PLOT_SIZE, rng } from '../layout';

/*
 * Raised-bed pieces, built once and shared by every plot. Each piece is merged
 * into a single geometry so a detailed bed still costs only a few draw calls.
 */

const HALF = PLOT_SIZE / 2;
/** Plank thickness and height; two planks stacked per side. */
const PLANK_T = 0.09;
const PLANK_H = 0.105;
/** Where the soil surface sits and where the ridge rows run (z). */
export const SOIL_Y = 0.2;
export const RIDGE_Z = [-0.47, 0, 0.47] as const;
export const RIDGE_TOP = SOIL_Y + 0.1;

/** Paint each part (cycling through the colours) and merge — one draw call, natural variation. */
function merge(
  parts: BufferGeometry[],
  colors: string[],
  o: { vary?: number; ao?: number; surf?: Surface } = {},
): BufferGeometry {
  const k = new Kit();
  parts.forEach((p, i) =>
    k.add(p, colors[i % colors.length]!, {
      vary: o.vary ?? 0.06,
      ao: o.ao,
      seed: 900 + i,
      surf: o.surf,
    }),
  );
  return k.build();
}

/** Nudge every vertex a little: hand-cut wood, lumpy soil. Keeps shared vertices shared. */
function roughen(g: BufferGeometry, amount: number, seed: number, keepBottom = false) {
  const r = rng(seed);
  const pos = g.attributes.position!;
  const seen = new Map<string, [number, number, number]>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let d = seen.get(key);
    if (!d) {
      d = [(r() - 0.5) * amount, (r() - 0.5) * amount, (r() - 0.5) * amount];
      seen.set(key, d);
    }
    if (keepBottom && pos.getY(i) < 0) continue;
    pos.setXYZ(i, pos.getX(i) + d[0], pos.getY(i) + d[1], pos.getZ(i) + d[2]);
  }
  g.computeVertexNormals();
  return g;
}

function plank(len: number, x: number, y: number, z: number, alongX: boolean, seed: number) {
  const g = box(alongX ? len : PLANK_T, PLANK_H, alongX ? PLANK_T : len);
  roughen(g, 0.012, seed);
  // A slight twist per board so the frame doesn't read as one block.
  g.rotateY((rng(seed + 7)() - 0.5) * 0.02);
  g.translate(x, y, z);
  return g;
}

/** Two stacked boards on each side (ends overlap at the corners, like a real bed). */
export function frameGeometry(): BufferGeometry {
  const out = HALF + PLANK_T / 2;
  const parts: BufferGeometry[] = [];
  let seed = 1;
  for (const row of [0, 1]) {
    const y = PLANK_H / 2 + row * (PLANK_H + 0.012);
    for (const s of [-1, 1]) {
      parts.push(plank(PLOT_SIZE + PLANK_T * 2, 0, y, s * out, true, seed++));
      parts.push(plank(PLOT_SIZE, s * out, y, 0, false, seed++));
    }
  }
  return merge(parts, ['#b07a42', '#a56f3b', '#bb8549', '#9f6a39', '#b8834b'], { ao: 0.25 });
}

/** Corner posts poking above the boards, plus the dark seam between the two boards. */
export function postsGeometry(): BufferGeometry {
  const out = HALF + PLANK_T / 2;
  const parts: BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = box(0.13, 0.33, 0.13);
      post.translate(sx * (out + 0.005), 0.165, sz * (out + 0.005));
      parts.push(post);
      const cap = new CylinderGeometry(0.055, 0.075, 0.035, 6);
      cap.translate(sx * (out + 0.005), 0.345, sz * (out + 0.005));
      parts.push(cap);
    }
  }
  const seamY = PLANK_H + 0.006;
  for (const s of [-1, 1]) {
    const a = box(PLOT_SIZE + PLANK_T * 2 + 0.01, 0.014, PLANK_T + 0.01);
    a.translate(0, seamY, s * out);
    const b = box(PLANK_T + 0.01, 0.014, PLOT_SIZE);
    b.translate(s * out, seamY, 0);
    parts.push(a, b);
  }
  return merge(parts, ['#7d5534', '#6f4a2e'], { ao: 0.3 });
}

/** The flat soil between the ridges (the furrow floor). */
export function soilBaseGeometry(): BufferGeometry {
  const g = new BoxGeometry(PLOT_SIZE - 0.02, 0.06, PLOT_SIZE - 0.02, 6, 1, 6);
  roughen(g, 0.02, 31);
  g.translate(0, SOIL_Y - 0.03, 0);
  return merge([g], ['#4e3321'], { vary: 0.12, surf: 'soil' });
}

/** Three hilled rows of earth, lumpy on top, running left to right. */
export function ridgesGeometry(): BufferGeometry {
  const parts = RIDGE_Z.map((z, i) => {
    const g = new CylinderGeometry(0.19, 0.19, PLOT_SIZE - 0.16, 12, 8);
    roughen(g, 0.022, 40 + i);
    g.rotateZ(Math.PI / 2);
    g.scale(1, 0.55, 1);
    g.translate(0, SOIL_Y, z);
    return g;
  });
  return merge(parts, ['#7a5433', '#72502f', '#80593a'], { vary: 0.1, ao: 0.45, surf: 'soil' });
}

/** Crumbs of soil and a few pebbles in the furrows. */
export function clodsGeometry(): BufferGeometry {
  const r = rng(55);
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 22; i++) {
    const s = 0.022 + r() * 0.03;
    const g = new SphereGeometry(s, 5, 3);
    g.scale(1, 0.7, 1);
    // Mostly in the two furrows between ridges, some on the ridge flanks.
    const lane = r() < 0.5 ? -0.235 : 0.235;
    g.translate((r() - 0.5) * (PLOT_SIZE - 0.2), SOIL_Y + s * 0.3, lane + (r() - 0.5) * 0.14);
    parts.push(g);
  }
  return merge(parts, ['#58391f', '#6b4730', '#8a8074', '#5f4128'], { surf: 'soil' });
}

/** Grass tufts hugging the outside of the frame. */
export function fringeGeometry(): BufferGeometry {
  const r = rng(77);
  const parts: BufferGeometry[] = [];
  const edge = HALF + PLANK_T + 0.05;
  for (let i = 0; i < 40; i++) {
    const side = i % 4;
    const t = (r() - 0.5) * 2 * (edge + 0.05);
    const off = edge + r() * 0.12;
    const [x, z] = [
      [t, -off],
      [t, off],
      [-off, t],
      [off, t],
    ][side]! as [number, number];
    const h = 0.12 + r() * 0.16;
    const g = new ConeGeometry(0.035 + r() * 0.02, h, 4);
    g.rotateZ((r() - 0.5) * 0.5);
    g.rotateX((r() - 0.5) * 0.5);
    g.translate(x, h / 2, z);
    parts.push(g);
  }
  return merge(parts, ['#7fae4e', '#93a24a', '#5e8f3c', '#8fbf5a'], { ao: 0.3 });
}

/** The thin film of water that sits in the furrows right after watering. */
export function puddleGeometry(): BufferGeometry {
  const parts = [-0.235, 0.235].map((z) => {
    const g = box(PLOT_SIZE - 0.2, 0.004, 0.12);
    g.translate(0, SOIL_Y + 0.004, z);
    return g;
  });
  return merge(parts, ['#7fb6d6']);
}

let cache: Record<string, BufferGeometry> | null = null;

/** All bed pieces, created on first use (after WebGL is up) and kept for the session. */
export function bedGeometries() {
  cache ??= {
    frame: frameGeometry(),
    posts: postsGeometry(),
    base: soilBaseGeometry(),
    ridges: ridgesGeometry(),
    clods: clodsGeometry(),
    fringe: fringeGeometry(),
    puddle: puddleGeometry(),
  };
  return cache as Record<
    'frame' | 'posts' | 'base' | 'ridges' | 'clods' | 'fringe' | 'puddle',
    BufferGeometry
  >;
}

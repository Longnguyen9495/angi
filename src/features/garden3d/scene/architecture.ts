import {
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
} from 'three';
import { rng } from '../layout';
import { box, prop, type Kit } from './kit';
import { C } from './materials';

/*
 * Buildings and farm props, kit-built (one geometry each, vertex-coloured).
 * Local frame: ground at y = 0, the front faces +z.
 */

const WOODS = ['#b07a42', '#a56f3b', '#bb8549', '#9f6a39'];
const TILES = ['#b85a3e', '#a9503a', '#c46a4a', '#b0573f'];

type V3 = [number, number, number];

/** Vertical boards across a wall face (x span), with a dark gap between boards. */
function boardWall(
  k: Kit,
  o: { w: number; h: number; at: V3; ry?: number; board?: number; seed: number },
) {
  const r = rng(o.seed);
  const bw = o.board ?? 0.2;
  const n = Math.max(2, Math.round(o.w / bw));
  const step = o.w / n;
  const ry = o.ry ?? 0;
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  for (let i = 0; i < n; i++) {
    const lx = -o.w / 2 + step * (i + 0.5);
    const hh = o.h - r() * 0.03;
    k.add(box(step - 0.018, hh, 0.06), WOODS[Math.floor(r() * WOODS.length)]!, {
      at: [o.at[0] + lx * c, o.at[1] + hh / 2, o.at[2] - lx * s],
      rot: [0, ry, (r() - 0.5) * 0.01],
      vary: 0.05,
      ao: 0.3,
      rough: 0.008,
    });
  }
  // Backing in the gaps.
  k.add(box(o.w, o.h, 0.03), '#4b3322', {
    at: [o.at[0] - 0.02 * s, o.at[1] + o.h / 2, o.at[2] - 0.02 * c],
    rot: [0, ry, 0],
  });
}

/**
 * Terracotta roof with thickness: an underlayer board per slope, barrel tiles
 * running down the slope (ngói âm dương rhythm), cross rows, and a ridge cap.
 */
export function tileRoof(
  k: Kit,
  o: { w: number; depth: number; rise: number; y: number; seed: number; tile?: number },
) {
  const r = rng(o.seed);
  const half = o.depth / 2;
  const len = Math.hypot(half, o.rise);
  const ang = Math.atan2(o.rise, half);
  const tile = o.tile ?? 0.17;
  for (const side of [1, -1]) {
    const cz = (side * half) / 2;
    const cy = o.y + o.rise / 2;
    const rx = side * ang;
    // Underlayer: gives the roof a visible thickness at the eaves.
    k.add(box(o.w, 0.07, len + 0.04), C.roofDark, {
      surf: 'tile',
      at: [0, cy - 0.02, cz],
      rot: [rx, 0, 0],
      ao: 0.2,
    });
    const cols = Math.round(o.w / tile);
    for (let i = 0; i < cols; i++) {
      const x = -o.w / 2 + (i + 0.5) * (o.w / cols);
      const ny = Math.cos(ang);
      const nz = side * Math.sin(ang);
      k.add(
        new CylinderGeometry(tile * 0.46, tile * 0.5, len + 0.02, 6, 1, false, 0, Math.PI),
        TILES[Math.floor(r() * 4)]!,
        {
          surf: 'tile',
          at: [x, cy + ny * 0.03, cz + nz * 0.03],
          // Lay the half-pipe along the slope, curved side up.
          rot: [Math.PI / 2 + rx, Math.PI / 2, 0],
          vary: 0.07,
        },
      );
    }
    // Overlap rows across the slope.
    for (let t = 0.22; t < 1; t += 0.26) {
      const z = side * half * (1 - t);
      const y = o.y + o.rise * t;
      k.add(box(o.w + 0.02, 0.035, 0.05), '#9c4a33', {
        surf: 'tile',
        at: [0, y + 0.07, z],
        rot: [rx, 0, 0],
      });
    }
  }
  k.add(new CylinderGeometry(0.08, 0.08, o.w + 0.12, 8), '#9c4a33', {
    at: [0, o.y + o.rise + 0.05, 0],
    rot: [0, 0, Math.PI / 2],
    vary: 0.05,
  });
  for (const sx of [-1, 1]) {
    k.add(new SphereGeometry(0.09, 7, 5), '#8f4630', {
      at: [sx * (o.w / 2 + 0.06), o.y + o.rise + 0.05, 0],
    });
  }
}

/** Triangle gable filling the wall under a roof. */
function gable(k: Kit, o: { w: number; rise: number; y: number; z: number; color: string }) {
  const sh = new Shape();
  sh.moveTo(-o.w / 2, 0);
  sh.lineTo(o.w / 2, 0);
  sh.lineTo(0, o.rise);
  sh.closePath();
  k.add(new ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false }), o.color, {
    flat: true,
    at: [0, o.y, o.z - 0.03],
    vary: 0.04,
  });
}

/** Clay jar (chum): lathe profile, glazed dark brown lip. */
export function clayJar(k: Kit, o: { at: V3; h: number; color?: string }) {
  const h = o.h;
  const pts = [
    [0, 0],
    [0.22, 0],
    [0.34, 0.18],
    [0.4, 0.45],
    [0.36, 0.72],
    [0.24, 0.9],
    [0.22, 0.96],
    [0.25, 1],
    [0.2, 1],
  ].map(([x, y]) => new Vector2(x! * h, y! * h));
  k.add(new LatheGeometry(pts, 14), o.color ?? '#8a5a37', {
    at: o.at,
    vary: 0.05,
    ao: 0.35,
    surf: 'tile',
  });
}

/** Bamboo basket with produce heaped in it. */
function basket(k: Kit, o: { at: V3; r: number; fill: string[]; seed: number }) {
  const rr = rng(o.seed);
  k.add(new CylinderGeometry(o.r, o.r * 0.78, o.r * 0.7, 10, 1, true), '#c29a5b', {
    at: [o.at[0], o.at[1] + o.r * 0.35, o.at[2]],
    vary: 0.1,
    ao: 0.3,
  });
  k.add(new TorusGeometry(o.r, 0.02, 4, 12), '#a67f45', {
    at: [o.at[0], o.at[1] + o.r * 0.7, o.at[2]],
    rot: [Math.PI / 2, 0, 0],
  });
  k.add(new CylinderGeometry(o.r * 0.78, o.r * 0.78, 0.02, 10), '#8e6a38', {
    at: [o.at[0], o.at[1] + 0.01, o.at[2]],
  });
  for (let i = 0; i < 7; i++) {
    const a = rr() * Math.PI * 2;
    const d = rr() * o.r * 0.6;
    k.add(new SphereGeometry(o.r * 0.28, 6, 4), o.fill[i % o.fill.length]!, {
      at: [
        o.at[0] + Math.cos(a) * d,
        o.at[1] + o.r * (0.62 + rr() * 0.18),
        o.at[2] + Math.sin(a) * d,
      ],
      vary: 0.06,
    });
  }
}

function sack(k: Kit, at: V3, s: number, tilt: number) {
  k.add(new SphereGeometry(0.22 * s, 10, 8), '#d4b98a', {
    surf: 'fabric',
    at: [at[0], at[1] + 0.2 * s, at[2]],
    scale: [1, 1.15, 0.85],
    rot: [0, 0, tilt],
    rough: 0.03,
    vary: 0.05,
    ao: 0.45,
  });
  k.add(new CylinderGeometry(0.06 * s, 0.1 * s, 0.1 * s, 6), '#c2a676', {
    at: [at[0], at[1] + 0.46 * s, at[2]],
  });
}

function crate(k: Kit, at: V3, s: number, ry: number, seed: number) {
  const r = rng(seed);
  k.add(box(0.42 * s, 0.34 * s, 0.34 * s), '#5a3d27', {
    at: [at[0], at[1] + 0.17 * s, at[2]],
    rot: [0, ry, 0],
  });
  for (let i = 0; i < 3; i++) {
    const y = at[1] + (0.06 + i * 0.11) * s;
    k.add(box(0.44 * s, 0.07 * s, 0.36 * s), WOODS[Math.floor(r() * 4)]!, {
      at: [at[0], y, at[2]],
      rot: [0, ry, 0],
      vary: 0.05,
    });
  }
}

// ——— Nhà kho ———

export function barnGeometry(): BufferGeometry {
  return prop('barn', (k) => {
    const W = 1.9;
    const D = 1.55;
    const H = 1.25;
    k.add(box(W + 0.16, 0.2, D + 0.16), C.rockWarm, {
      at: [0, 0.1, 0],
      rough: 0.03,
      vary: 0.1,
      ao: 0.4,
    });
    boardWall(k, { w: W, h: H, at: [0, 0.2, D / 2], seed: 1 });
    boardWall(k, { w: W, h: H, at: [0, 0.2, -D / 2], ry: Math.PI, seed: 2 });
    boardWall(k, { w: D, h: H, at: [W / 2, 0.2, 0], ry: Math.PI / 2, seed: 3 });
    boardWall(k, { w: D, h: H, at: [-W / 2, 0.2, 0], ry: -Math.PI / 2, seed: 4 });
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        k.add(box(0.13, H + 0.08, 0.13), C.woodDark, {
          at: [(sx * W) / 2, 0.2 + H / 2, (sz * D) / 2],
          vary: 0.04,
        });
    // Top beam all round.
    k.add(box(W + 0.14, 0.1, D + 0.14), C.woodDark, { at: [0, 0.2 + H + 0.02, 0] });
    gable(k, { w: W, rise: 0.62, y: 0.2 + H + 0.06, z: D / 2 - 0.02, color: '#b98450' });
    gable(k, { w: W, rise: 0.62, y: 0.2 + H + 0.06, z: -D / 2 + 0.05, color: '#b98450' });
    tileRoof(k, { w: W + 0.36, depth: D + 0.5, rise: 0.66, y: 0.2 + H + 0.04, seed: 5 });

    // Double door with frame, cross braces, hinges and a handle.
    const dz = D / 2 + 0.05;
    k.add(box(0.98, 0.98, 0.05), '#6e4a2e', { at: [0, 0.2 + 0.49, dz] });
    for (const sx of [-1, 1]) {
      k.add(box(0.44, 0.9, 0.04), '#c08a52', {
        at: [sx * 0.23, 0.2 + 0.46, dz + 0.03],
        vary: 0.06,
      });
      k.add(box(0.06, 0.95, 0.03), '#7a5230', {
        at: [sx * 0.23, 0.2 + 0.46, dz + 0.06],
        rot: [0, 0, sx * 0.5],
      });
      for (const hy of [0.25, 0.7])
        k.add(box(0.14, 0.035, 0.02), '#3b3a37', {
          at: [sx * 0.4, 0.2 + hy, dz + 0.06],
        });
    }
    k.add(box(1.08, 0.08, 0.08), C.woodDark, { at: [0, 0.2 + 1.0, dz + 0.02] });
    for (const sx of [-1, 1])
      k.add(box(0.08, 1.0, 0.08), C.woodDark, {
        at: [sx * 0.52, 0.2 + 0.5, dz + 0.02],
      });
    k.add(new SphereGeometry(0.025, 5, 4), '#3b3a37', { at: [0.05, 0.2 + 0.5, dz + 0.08] });
    // Side window with frame, bars and shutters.
    const wx = W / 2 + 0.05;
    k.add(box(0.04, 0.42, 0.5), '#2f2a24', { at: [wx, 0.2 + 0.78, 0] });
    k.add(box(0.06, 0.5, 0.06), C.woodDark, { at: [wx + 0.02, 0.2 + 0.78, 0] });
    k.add(box(0.06, 0.06, 0.58), C.woodDark, { at: [wx + 0.02, 0.2 + 0.78, 0] });
    for (const sz of [-1, 1]) {
      k.add(box(0.06, 0.54, 0.06), C.woodDark, {
        at: [wx + 0.02, 0.2 + 0.78, sz * 0.28],
      });
      k.add(box(0.03, 0.46, 0.2), '#c08a52', {
        at: [wx + 0.04, 0.2 + 0.78, sz * 0.4],
        rot: [0, sz * 0.5, 0],
      });
    }
    k.add(box(0.1, 0.05, 0.62), C.woodDark, { at: [wx + 0.03, 0.2 + 0.54, 0] });
    // Name board above the door.
    k.add(box(0.62, 0.2, 0.04), '#c9975a', {
      at: [0, 0.2 + 1.16, dz + 0.06],
      vary: 0.04,
    });
    // Things kept outside: sacks, crates, a pitchfork, a basket.
    sack(k, [0.78, 0, dz + 0.3], 1, 0.12);
    sack(k, [1.08, 0, dz + 0.12], 0.85, -0.15);
    crate(k, [-0.8, 0, dz + 0.28], 1, 0.2, 7);
    crate(k, [-0.82, 0.34, dz + 0.26], 0.8, -0.1, 8);
    k.add(new CylinderGeometry(0.018, 0.022, 1.2, 5), C.woodLight, {
      at: [-1.08, 0.58, dz - 0.05],
      rot: [0.12, 0, 0.18],
    });
    for (const px of [-0.05, 0, 0.05])
      k.add(new ConeGeometry(0.012, 0.2, 4), '#6f6a62', {
        at: [-1.2 + px, 1.2, dz - 0.12],
        rot: [Math.PI + 0.12, 0, 0.18],
      });
    basket(k, { at: [1.02, 0, -0.1], r: 0.2, fill: ['#e6c052', '#d9a642'], seed: 9 });
  });
}

// ——— Bếp Cô Ba ———

/** Deck, counter, bamboo posts, jars and baskets — the striped awning is separate (it sways). */
export function stallGeometry(): BufferGeometry {
  return prop('stall', (k) => {
    k.add(box(2.6, 0.1, 1.6), C.woodDark, { at: [0, 0.05, 0], vary: 0.06, ao: 0.3 });
    for (let i = 0; i < 8; i++)
      k.add(box(0.3, 0.02, 1.6), WOODS[i % 4]!, { at: [-1.13 + i * 0.32, 0.11, 0] });
    // Counter: plank front, overhanging top.
    boardWall(k, { w: 2.1, h: 0.78, at: [0, 0.1, 0.42], board: 0.26, seed: 11 });
    k.add(box(2.1, 0.78, 0.8), '#6e4a2e', { at: [0, 0.1 + 0.39, 0] });
    k.add(box(2.3, 0.07, 1.0), C.woodLight, { at: [0, 0.92, 0.02], vary: 0.05 });
    // Bamboo posts with nodes.
    for (const [x, z] of [
      [-1.1, -0.55],
      [1.1, -0.55],
      [-1.1, 0.55],
      [1.1, 0.55],
    ] as [number, number][]) {
      const h = z < 0 ? 2.05 : 1.75;
      k.add(new CylinderGeometry(0.05, 0.055, h, 7), '#c9b26a', {
        at: [x, 0.1 + h / 2, z],
        vary: 0.05,
      });
      for (let y = 0.35; y < h; y += 0.38)
        k.add(new CylinderGeometry(0.062, 0.062, 0.03, 7), '#9d8747', { at: [x, 0.1 + y, z] });
    }
    // On the counter: two baskets of vegetables, a cutting board, a clay pot on a stove.
    basket(k, { at: [-0.72, 0.95, 0.15], r: 0.2, fill: [C.red, '#e2412b', '#f08a3a'], seed: 12 });
    basket(k, {
      at: [-0.28, 0.95, 0.22],
      r: 0.17,
      fill: [C.leaf, C.leafLight, '#4a7d35'],
      seed: 13,
    });
    k.add(box(0.36, 0.03, 0.24), '#d9b27a', {
      at: [0.18, 0.97, 0.2],
      rot: [0, 0.2, 0],
    });
    k.add(box(0.48, 0.2, 0.4), '#a5573a', {
      at: [0.62, 1.05, 0.02],
      rough: 0.02,
      vary: 0.08,
      ao: 0.3,
    });
    k.add(new CylinderGeometry(0.2, 0.16, 0.2, 12), '#3b3632', { at: [0.62, 1.25, 0.02] });
    k.add(new CylinderGeometry(0.21, 0.21, 0.025, 12), '#57504a', { at: [0.62, 1.35, 0.02] });
    // Jars and a small crate at the side of the stall.
    clayJar(k, { at: [1.45, 0.1, 0.35], h: 0.62 });
    clayJar(k, { at: [1.5, 0.1, -0.2], h: 0.46, color: '#6e4730' });
    crate(k, [-1.5, 0.1, 0.3], 0.9, 0.3, 14);
    basket(k, { at: [-1.48, 0.1, -0.3], r: 0.22, fill: ['#e6c052', '#93a24a'], seed: 15 });
  });
}

/** Striped fabric awning with a scalloped front valance. */
export function awningGeometry(): BufferGeometry {
  return prop('awning', (k) => {
    const strips = 7;
    const w = 2.5 / strips;
    for (let i = 0; i < strips; i++) {
      const x = -1.25 + w * (i + 0.5);
      const col = i % 2 ? '#f2e6cf' : '#c9563a';
      k.add(box(w + 0.004, 0.035, 1.35), col, { at: [x, 0, 0], vary: 0.03, surf: 'fabric' });
      k.add(new CylinderGeometry(w / 2, w / 2, 0.03, 10, 1, false, 0, Math.PI), col, {
        at: [x, -0.02, 0.675],
        rot: [Math.PI / 2, 0, 0],
      });
    }
    k.add(new CylinderGeometry(0.03, 0.03, 2.6, 6), '#9d8747', {
      at: [0, 0.02, 0.68],
      rot: [0, 0, Math.PI / 2],
    });
  });
}

// ——— Giếng ———

export function wellGeometry(): BufferGeometry {
  return prop('well', (k) => {
    const r = rng(21);
    // Three courses of stones, each course offset like real masonry.
    for (let c = 0; c < 3; c++) {
      const n = 11;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (c % 2) * (Math.PI / n);
        const rad = 0.62 - c * 0.015;
        k.add(box(0.34, 0.22, 0.2), [C.rockWarm, C.rock, '#c2b6a2'][Math.floor(r() * 3)]!, {
          at: [Math.cos(a) * rad, 0.12 + c * 0.23, Math.sin(a) * rad],
          rot: [0, -a + Math.PI / 2, 0],
          rough: 0.04,
          vary: 0.06,
          ao: c === 0 ? 0.4 : 0.1,
        });
      }
    }
    k.add(new TorusGeometry(0.6, 0.08, 5, 16), '#c9bfae', {
      at: [0, 0.74, 0],
      rot: [Math.PI / 2, 0, 0],
      rough: 0.02,
    });
    k.add(new CylinderGeometry(0.56, 0.56, 0.6, 14, 1, true), '#3a3a36', { at: [0, 0.44, 0] });
    // Posts, cross beam, crank and rope.
    for (const sx of [-1, 1]) {
      k.add(box(0.1, 1.55, 0.1), C.woodDark, {
        at: [sx * 0.66, 0.78 + 0.1, 0],
        vary: 0.04,
      });
      k.add(box(0.05, 0.4, 0.05), C.woodDark, {
        at: [sx * 0.55, 1.45, 0],
        rot: [0, 0, sx * 0.7],
      });
    }
    k.add(new CylinderGeometry(0.06, 0.06, 1.35, 8), C.wood, {
      at: [0, 1.35, 0],
      rot: [0, 0, Math.PI / 2],
    });
    k.add(box(0.04, 0.22, 0.04), C.woodDark, { at: [0.74, 1.27, 0.05] });
    k.add(new CylinderGeometry(0.02, 0.02, 0.16, 5), C.woodLight, {
      at: [0.78, 1.17, 0.12],
      rot: [Math.PI / 2, 0, 0],
    });
    k.add(new CylinderGeometry(0.075, 0.075, 0.2, 8), '#d9c7a0', {
      at: [0, 1.35, 0],
      rot: [0, 0, Math.PI / 2],
    });
    k.add(new CylinderGeometry(0.012, 0.012, 0.4, 4), '#d9c7a0', { at: [0.02, 1.13, 0] });
    tileRoof(k, { w: 1.6, depth: 1.05, rise: 0.42, y: 1.62, seed: 22, tile: 0.15 });
    // A spare wooden bucket on the ground.
    k.add(new CylinderGeometry(0.15, 0.12, 0.24, 9), C.wood, {
      at: [0.85, 0.12, 0.42],
      vary: 0.06,
      ao: 0.3,
    });
    for (const y of [0.05, 0.19])
      k.add(new TorusGeometry(0.14, 0.012, 3, 12), '#3b3a37', {
        at: [0.85, y, 0.42],
        rot: [Math.PI / 2, 0, 0],
      });
  });
}

/** The hanging bucket, apart so it can bob. */
export function bucketGeometry(): BufferGeometry {
  return prop('bucket', (k) => {
    k.add(new CylinderGeometry(0.12, 0.1, 0.18, 9), C.wood, { vary: 0.06 });
    k.add(new TorusGeometry(0.115, 0.01, 3, 12), '#3b3a37', {
      at: [0, 0.05, 0],
      rot: [Math.PI / 2, 0, 0],
    });
    k.add(new TorusGeometry(0.1, 0.008, 3, 10, Math.PI), '#3b3a37', { at: [0, 0.1, 0] });
  });
}

// ——— Chuồng gà ———

export function coopGeometry(): BufferGeometry {
  return prop('coop', (k) => {
    const cx = -0.35;
    const cz = -0.35;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        k.add(box(0.08, 0.3, 0.08), C.woodDark, {
          at: [cx + sx * 0.42, 0.15, cz + sz * 0.36],
        });
    k.add(box(0.96, 0.06, 0.84), C.woodDark, { at: [cx, 0.32, cz] });
    boardWall(k, { w: 0.9, h: 0.62, at: [cx, 0.35, cz + 0.4], board: 0.15, seed: 31 });
    boardWall(k, { w: 0.9, h: 0.62, at: [cx, 0.35, cz - 0.4], ry: Math.PI, board: 0.15, seed: 32 });
    boardWall(k, {
      w: 0.8,
      h: 0.62,
      at: [cx + 0.45, 0.35, cz],
      ry: Math.PI / 2,
      board: 0.15,
      seed: 33,
    });
    boardWall(k, {
      w: 0.8,
      h: 0.62,
      at: [cx - 0.45, 0.35, cz],
      ry: -Math.PI / 2,
      board: 0.15,
      seed: 34,
    });
    gable(k, { w: 0.9, rise: 0.34, y: 0.97, z: cz + 0.4, color: '#b98450' });
    gable(k, { w: 0.9, rise: 0.34, y: 0.97, z: cz - 0.37, color: '#b98450' });
    k.add(box(0.26, 0.3, 0.04), '#2a1f17', { at: [cx + 0.1, 0.55, cz + 0.45] });
    tileRoof(k, { w: 1.12, depth: 1.08, rise: 0.36, y: 0.97, seed: 35, tile: 0.14 });
    // Ramp with slats.
    k.add(box(0.22, 0.03, 0.6), C.wood, {
      at: [cx + 0.1, 0.18, cz + 0.72],
      rot: [0.55, 0, 0],
    });
    for (let i = 0; i < 4; i++)
      k.add(box(0.22, 0.02, 0.02), C.woodDark, {
        at: [cx + 0.1, 0.07 + i * 0.07, cz + 0.92 - i * 0.12],
        rot: [0.55, 0, 0],
      });
    // Straw nest and a feed trough out front.
    k.add(new TorusGeometry(0.16, 0.07, 5, 12), '#d9c16a', {
      at: [0.55, 0.06, -0.3],
      rot: [Math.PI / 2, 0, 0],
      rough: 0.03,
      vary: 0.12,
    });
    k.add(new CylinderGeometry(0.14, 0.14, 0.03, 10), '#b89c4d', { at: [0.55, 0.03, -0.3] });
    k.add(box(0.5, 0.1, 0.16), C.wood, { at: [0.35, 0.05, 0.75], ao: 0.3 });
    k.add(box(0.44, 0.02, 0.1), '#e6c052', { at: [0.35, 0.1, 0.75], vary: 0.2 });
    // Low fence that doesn't hide the hens: posts with caps and two rails.
    const posts: [number, number][] = [];
    for (let i = 0; i <= 6; i++) posts.push([-0.95 + i * 0.33, 1.02]);
    for (let i = 1; i <= 3; i++) posts.push([1.03, 1.02 - i * 0.33]);
    posts.forEach(([x, z], i) => {
      k.add(box(0.05, 0.36, 0.05), WOODS[i % 4]!, {
        at: [x, 0.18, z],
        rot: [0, 0, ((i % 3) - 1) * 0.04],
      });
    });
    for (const y of [0.13, 0.28]) {
      k.add(box(2.0, 0.03, 0.03), C.woodLight, { at: [0.04, y, 1.02] });
      k.add(box(0.03, 0.03, 1.0), C.woodLight, { at: [1.03, y, 0.52] });
    }
  });
}

// ——— Chuồng bò ———

export function penGeometry(): BufferGeometry {
  return prop('pen', (k) => {
    const r = rng(41);
    const corners: [number, number][] = [
      [-1.05, -0.95],
      [1.05, -0.95],
      [1.05, 0.95],
      [-1.05, 0.95],
    ];
    for (let s = 0; s < 4; s++) {
      const [x1, z1] = corners[s]!;
      const [x2, z2] = corners[(s + 1) % 4]!;
      const len = Math.hypot(x2 - x1, z2 - z1);
      const n = 4;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        // A gate gap at the front middle.
        if (s === 2 && i === 2) continue;
        k.add(box(0.08, 0.6 + r() * 0.06, 0.08), WOODS[Math.floor(r() * 4)]!, {
          at: [x1 + (x2 - x1) * t, 0.3, z1 + (z2 - z1) * t],
          rot: [(r() - 0.5) * 0.07, r(), (r() - 0.5) * 0.07],
          ao: 0.3,
        });
        k.add(new ConeGeometry(0.06, 0.07, 4), C.woodDark, {
          at: [x1 + (x2 - x1) * t, 0.64, z1 + (z2 - z1) * t],
        });
      }
      const ry = -Math.atan2(z2 - z1, x2 - x1);
      for (const y of [0.24, 0.46]) {
        k.add(box(len + 0.06, 0.05, 0.04), C.woodLight, {
          at: [(x1 + x2) / 2, y + (r() - 0.5) * 0.03, (z1 + z2) / 2],
          rot: [0, ry, (r() - 0.5) * 0.04],
          vary: 0.05,
        });
      }
    }
    // Hay bale with bands, a water trough.
    k.add(new CylinderGeometry(0.3, 0.3, 0.42, 12), '#d9c16a', {
      at: [-0.62, 0.3, -0.55],
      rot: [0, 0, Math.PI / 2],
      rough: 0.03,
      vary: 0.1,
    });
    for (const x of [-0.75, -0.49])
      k.add(new TorusGeometry(0.3, 0.012, 3, 14), '#8a6a2e', {
        at: [x, 0.3, -0.55],
        rot: [0, Math.PI / 2, 0],
      });
    k.add(box(0.7, 0.22, 0.28), C.woodDark, { at: [0.55, 0.11, -0.65], ao: 0.3 });
    k.add(box(0.62, 0.02, 0.2), C.water, { at: [0.55, 0.21, -0.65] });
    // Trampled earth inside the pen.
    k.add(new CylinderGeometry(0.9, 0.95, 0.02, 12), '#9a7a52', {
      at: [0, 0.01, 0],
      scale: [1.1, 1, 0.95],
      vary: 0.08,
      surf: 'soil',
    });
  });
}

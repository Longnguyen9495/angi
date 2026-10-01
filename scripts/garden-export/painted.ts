import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  type Material,
} from 'three';
import { rng } from '../../src/features/garden3d/layout';
import { box, kitMaterial, prop, type Kit } from '../../src/features/garden3d/scene/kit';
import {
  broadleaf,
  broadleafCards,
  bush,
  bushCards,
  flowers,
  leafCardMaterial,
  pine,
  tuft,
} from '../../src/features/garden3d/scene/nature';
import { bake, glb } from './bake';

/*
 * "Painted farm": the reference illustration (a square floating island seen
 * from its front corner) rebuilt as cartoon 3D for the PlayCanvas Editor.
 * Bright, warm palette taken from the picture, faceted kit props with
 * per-face variation, and an ink outline hull on every opaque piece.
 *
 * Layout (metres, y up; the camera looks from the front corner +x +z):
 *   front-left half  : the fenced field, 6 × 4 tiles (tilled ones at the back)
 *   front-right half : a big pond with a dock, reeds, lily pads and koi
 *   back-left        : L-shaped farmhouse, mango trees, well, small huts
 *   centre           : cream stone yard, windmill and a round tree on lawns
 *   back-right       : long greenhouse with two striped market stalls
 *   right corner     : sandy paddock — thatched cow barn, haystack, coop
 */

const HALF = 8.4;
const INK = 0.022;

/** Colours sampled from the reference picture. */
const P = {
  grass: '#8fd14f',
  grassDeep: '#6fbb3e',
  grassLight: '#a8de5e',
  lip: '#5fae37',
  yard: '#f0e1b6',
  yard2: '#dcc28f',
  sand: '#f1d9a0',
  sand2: '#e2c483',
  post: '#a8743f',
  rail: '#cf9a5c',
  cap: '#e0b06e',
  roof: ['#e3743f', '#d6643a', '#ea8752', '#cc5a32'],
  roofUnder: '#a8452a',
  roofRidge: '#b24f2e',
  wall: '#f8ecd0',
  beam: '#a8642f',
  stone: '#d3c9b4',
  stone2: '#bfb39b',
  soil: '#8f5c33',
  soilLight: '#a86d3d',
  tileGrass: '#5fae37',
  tileGrassTop: '#7cc648',
  straw: '#ecc15c',
  straw2: '#d9a846',
  wood: '#c08850',
  woodDark: '#8f5f35',
  woodLight: '#dcab6c',
  white: '#fbf7ee',
  red: '#e2412b',
};

// ——— Island shape ———

/** Rounded square as a superellipse |x/h|^n + |z/h|^n = 1. */
const SQ = 6;

/** Point on the rim at t ∈ [0, 1) (grown outwards by `grow`), plus its outward normal. */
function rim(t: number, grow = 0): [number, number, number, number] {
  const a = t * Math.PI * 2;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const h = HALF + grow;
  const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / SQ) * h;
  const z = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / SQ) * h;
  const nx = Math.sign(x) * Math.pow(Math.abs(x / h), SQ - 1);
  const nz = Math.sign(z) * Math.pow(Math.abs(z / h), SQ - 1);
  const l = Math.hypot(nx, nz) || 1;
  return [x, z, nx / l, nz / l];
}

function insideIsland(x: number, z: number, margin = 0) {
  const h = HALF - margin;
  return Math.pow(Math.abs(x) / h, SQ) + Math.pow(Math.abs(z) / h, SQ) < 1;
}

function noise(x: number, z: number) {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
function smoothNoise(x: number, z: number) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fz = z - zi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = noise(xi, zi) + (noise(xi + 1, zi) - noise(xi, zi)) * u;
  const b = noise(xi, zi + 1) + (noise(xi + 1, zi + 1) - noise(xi, zi + 1)) * u;
  return a + (b - a) * v;
}

type Rect = [number, number, number, number];
const inRect = (x: number, z: number, [x0, z0, x1, z1]: Rect, pad = 0) =>
  x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad;

// ——— Layout ———

export const FIELD = { x0: -7.3, z0: 1.3, cols: 6, rows: 4, tile: 1.3, gap: 0.12 };
const FS = FIELD.tile + FIELD.gap;
const FIELD_RECT: Rect = [
  FIELD.x0,
  FIELD.z0,
  FIELD.x0 + FIELD.gap + FS * FIELD.cols,
  FIELD.z0 + FIELD.gap + FS * FIELD.rows,
];
/** Big pond running most of the front-right edge (as in the picture), x 2.6–7.8, z -1.2–7.6. */
export const POND = { x: 5.2, z: 3.2, w: 5.2, d: 8.8 };
/** Paddock in the back-right corner, behind the pond and right of the market. */
const PADDOCK_RECT: Rect = [4.0, -7.6, 7.9, -1.9];
/** House further back and smaller, so it no longer dominates the scene. */
const HOUSE = { x: -4.2, z: -5.75, scale: 0.82 };
/** Windmill out in front, clear of the house facade on screen. */
const MILL = { x: 0.0, z: -1.3 };
/** Market group origin (greenhouse behind, stalls in front). */
const MARKET = { x: 1.6, z: -5.6 };
const LAWNS: Rect[] = [
  [-1.0, -2.3, 1.0, -0.4],
  [1.4, -2.8, 2.9, -1.3],
];
/** The cream stone yard: in front of the house, round the lawns, to the market and the paddock gate. */
const YARDS: Rect[] = [
  [-4.9, -4.3, 2.9, 0.6],
  [-0.2, -5.0, 2.9, -4.0],
  [2.6, -2.4, 3.3, -1.5],
];
const isYard = (x: number, z: number) =>
  YARDS.some((r) => inRect(x, z, r)) && !LAWNS.some((r) => inRect(x, z, r, 0.05));

/** Centre of field tile (col, row). */
export function tileAt(c: number, r: number): [number, number] {
  return [FIELD.x0 + FIELD.gap + FS * c + FIELD.tile / 2, FIELD.z0 + FIELD.gap + FS * r + FIELD.tile / 2];
}
const TILLED = (c: number, r: number) => r < 2 && c >= 1 && c <= 3;

// ——— Ground and cliff ———

function groundGeometry(): BufferGeometry {
  const step = 0.36;
  const pos: number[] = [];
  const col: number[] = [];
  const g1 = new Color(P.grass);
  const g2 = new Color(P.grassDeep);
  const g3 = new Color(P.grassLight);
  const yard = new Color(P.yard);
  const yard2 = new Color(P.yard2);
  const sand = new Color(P.sand);
  const sand2 = new Color(P.sand2);
  const lip = new Color(P.lip);
  const tmp = new Color();
  const paint = (x: number, z: number) => {
    const n = smoothNoise(x * 0.5, z * 0.5);
    const m = smoothNoise(x * 1.6 + 7, z * 1.6);
    tmp.copy(g1).lerp(n > 0.5 ? g3 : g2, Math.abs(n - 0.5) * 1.6);
    tmp.lerp(g2, m * 0.3);
    if (isYard(x, z)) {
      // Flagstone pattern: offset rows of slabs with darker joints.
      const row = Math.floor(z / 0.55);
      const u = (x + (row % 2) * 0.35) / 0.7;
      const joint = Math.min(u - Math.floor(u), z / 0.55 - row) < 0.12;
      tmp.copy(yard).lerp(yard2, joint ? 0.9 : m * 0.4);
    }
    if (inRect(x, z, PADDOCK_RECT)) tmp.copy(sand).lerp(sand2, m * 0.6);
    if (!insideIsland(x, z, 0.4)) tmp.copy(lip).lerp(g1, n * 0.4);
    return tmp;
  };
  const clamp = (x: number, z: number): [number, number] => {
    if (insideIsland(x, z)) return [x, z];
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 18; i++) {
      const m = (lo + hi) / 2;
      if (insideIsland(x * m, z * m)) lo = m;
      else hi = m;
    }
    return [x * lo, z * lo];
  };
  const n = Math.ceil((HALF * 2) / step);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const x0 = -HALF + i * step;
      const z0 = -HALF + j * step;
      const cx = x0 + step / 2;
      const cz = z0 + step / 2;
      if (!insideIsland(cx, cz, -step * 0.7)) continue;
      const q = [clamp(x0, z0), clamp(x0, z0 + step), clamp(x0 + step, z0 + step), clamp(x0 + step, z0)];
      const c = paint(cx, cz).clone();
      for (const tri of [
        [0, 1, 2],
        [0, 2, 3],
      ] as const)
        for (const k of tri) {
          const [x, z] = q[k]!;
          pos.push(x, 0, z);
          col.push(c.r, c.g, c.b);
        }
    }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Earth cliff like the picture: a grass lip that drips down in places, then
 * tall warm-tan rock columns (vertical facets, lighter on top), a ragged base.
 */
function cliffGeometry(): BufferGeometry {
  const N = 180;
  const rows = [0, -0.22, -0.4, -0.9, -1.6, -2.3, -2.9, -3.4];
  const grow = [0, 0.05, 0.03, 0.0, -0.06, -0.14, -0.4, -1.1];
  const r = rng(5);
  // One jag and one tone per column, shared by every row: vertical rock columns.
  const jag = Array.from({ length: N }, (_, i) => (Math.floor(i / 3) % 2 ? 0.07 : -0.05) + (r() - 0.5) * 0.06);
  const tone = Array.from({ length: N }, (_, i) => 0.86 + noise(Math.floor(i / 3), 3) * 0.26);
  const drip = Array.from({ length: N }, () => (r() < 0.22 ? 1 + Math.floor(r() * 2) : 0));
  const ring = rows.map((y, ri) =>
    Array.from({ length: N }, (_, i) => {
      const [x, z, nx, nz] = rim(i / N, grow[ri]!);
      const j = ri > 1 ? jag[i]! : 0;
      return [x + nx * j, y + (ri > 2 ? (r() - 0.5) * 0.06 : 0), z + nz * j] as const;
    }),
  );
  const pos: number[] = [];
  const col: number[] = [];
  const tmp = new Color();
  const earth = ['#ecc48a', '#e2b47a', '#d6a56b', '#c9955c', '#b98651', '#a67645', '#8f6439'];
  for (let ri = 0; ri < rows.length - 1; ri++)
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const a = ring[ri]![i]!;
      const b = ring[ri]![j]!;
      const c = ring[ri + 1]![j]!;
      const d = ring[ri + 1]![i]!;
      const grass = ri === 0 || (ri === 1 && drip[i]! > 0) || (ri === 2 && drip[i]! > 1);
      if (grass) tmp.set(ri === 0 ? P.lip : '#4f9a2f');
      else tmp.set(earth[Math.min(earth.length - 1, ri - 1)]!).multiplyScalar(tone[i]!);
      // Wound so the faces (and their normals) point outwards, into the light.
      for (const p of [a, c, d, a, b, c]) {
        pos.push(...p);
        col.push(tmp.r, tmp.g, tmp.b);
      }
    }
  const last = ring.at(-1)!;
  for (let i = 0; i < N; i++) {
    tmp.set('#6f4b2b');
    for (const p of [last[i]!, last[(i + 1) % N]!, [0, -4.0, 0] as const]) {
      pos.push(...p);
      col.push(tmp.r, tmp.g, tmp.b);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  g.computeVertexNormals();
  return g;
}

// ——— Fences ———

function fence(k: Kit, pts: [number, number][], seed: number, gaps: number[] = []) {
  const r = rng(seed);
  for (let i = 0; i < pts.length - 1; i++) {
    if (gaps.includes(i)) continue;
    const [ax, az] = pts[i]!;
    const [bx, bz] = pts[i + 1]!;
    const len = Math.hypot(bx - ax, bz - az);
    const yaw = -Math.atan2(bz - az, bx - ax);
    const n = Math.max(1, Math.round(len / 1.0));
    for (let p = 0; p <= n; p++) {
      const t = p / n;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      k.add(box(0.12, 0.66, 0.12), P.post, {
        at: [x, 0.33, z],
        rot: [0, yaw + (r() - 0.5) * 0.1, (r() - 0.5) * 0.05],
        vary: 0.08,
        ao: 0.25,
      });
      k.add(new ConeGeometry(0.1, 0.1, 4), P.cap, { at: [x, 0.71, z], rot: [0, Math.PI / 4 + yaw, 0] });
    }
    for (const y of [0.26, 0.52])
      k.add(box(len, 0.08, 0.05), y > 0.3 ? P.cap : P.rail, {
        at: [(ax + bx) / 2, y + (r() - 0.5) * 0.02, (az + bz) / 2],
        rot: [0, yaw, (r() - 0.5) * 0.03],
        vary: 0.07,
      });
  }
}

// ——— Field ———

/**
 * The field's tiles as low, soft-edged mounds (one indexed mesh, smooth shading):
 * colour varies per vertex — tilled soil with grit and darker crumbs and furrows,
 * grass in patches — and the rims slope down to the lawn, so nothing reads as a tray.
 */
function fieldTilesGeometry(): BufferGeometry {
  const r = rng(29);
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const tmp = new Color();
  const soilTones = [new Color('#7f4f2b'), new Color('#93603a'), new Color('#a86d3d')];
  // Darker, richer than the lawn around (as in the picture), so the field reads as planted turf.
  const grassTones = [new Color('#4c9a2e'), new Color('#5cac35'), new Color('#72be40')];
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  for (let c = 0; c < FIELD.cols; c++)
    for (let row = 0; row < FIELD.rows; row++) {
      const [cx, cz] = tileAt(c, row);
      const soil = TILLED(c, row);
      const n = soil ? 9 : 7;
      const T = FIELD.tile + 0.04;
      const base = pos.length / 3;
      for (let j = 0; j <= n; j++)
        for (let i = 0; i <= n; i++) {
          const u = (i / n - 0.5) * T;
          const v = (j / n - 0.5) * T;
          const edge = smooth(0, 0.16, T / 2 - Math.max(Math.abs(u), Math.abs(v)));
          const wob = (r() - 0.5) * 0.03;
          let h = (soil ? 0.07 : 0.05) * edge + wob * edge;
          if (soil) h += Math.max(0, Math.sin((v / T) * Math.PI * 8)) * 0.03 * edge;
          pos.push(cx + u, Math.max(0.005, h), cz + v);
          const nse = smoothNoise((cx + u) * 2.2, (cz + v) * 2.2);
          if (soil) {
            tmp.copy(soilTones[0]!).lerp(soilTones[nse > 0.5 ? 2 : 1]!, Math.abs(nse - 0.5) * 2);
            const q = r();
            if (q < 0.12) tmp.multiplyScalar(0.7);
            else if (q > 0.93) tmp.lerp(new Color('#c99a6a'), 0.5);
          } else {
            const big = smoothNoise((cx + u) * 0.9 + 3, (cz + v) * 0.9);
            tmp.copy(grassTones[1]!).lerp(grassTones[nse > 0.5 ? 2 : 0]!, Math.min(1, Math.abs(nse - 0.5) * 3));
            tmp.lerp(grassTones[big > 0.5 ? 2 : 0]!, Math.abs(big - 0.5) * 1.2);
            if (r() < 0.14) tmp.multiplyScalar(0.82);
          }
          tmp.multiplyScalar(0.84 + edge * 0.16);
          col.push(tmp.r, tmp.g, tmp.b);
        }
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const a = base + j * (n + 1) + i;
          idx.push(a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2);
        }
    }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Field fence and sign (outlined). */
function fieldGeometry() {
  return prop('painted-field', (k) => {
    const [x0, z0, x1, z1] = FIELD_RECT;
    fence(
      k,
      [
        [x1 + 0.15, z0 - 0.15],
        [x0 - 0.15, z0 - 0.15],
        [x0 - 0.15, z1 + 0.15],
        [x1 + 0.15, z1 + 0.15],
        [x1 + 0.15, z0 - 0.15],
      ],
      23,
    );
    k.add(box(0.08, 0.8, 0.08), P.post, { at: [x1 - 0.4, 0.4, z0 + 0.5] });
    k.add(box(0.8, 0.45, 0.07), P.woodLight, {
      at: [x1 - 0.4, 0.85, z0 + 0.52],
      rot: [0, -0.5, 0],
      vary: 0.05,
    });
  });
}

/** Sprouts on the tilled tiles: some tiles bare, others with 2–4 plants of different size and leafiness. */
function sproutsGeometry() {
  return prop('painted-sprouts', (k) => {
    const r = rng(41);
    const plants: Record<string, number> = { '1,0': 3, '2,0': 2, '3,1': 4, '1,1': 2, '2,1': 0, '3,0': 0 };
    for (const [key, count] of Object.entries(plants)) {
      const [c, row] = key.split(',').map(Number) as [number, number];
      const [x, z] = tileAt(c, row);
      for (let p = 0; p < count; p++) {
        const dx = (r() - 0.5) * 0.8;
        const dz = -0.45 + Math.floor(r() * 4) * 0.3;
        const s = 0.65 + r() * 0.6;
        const leaves = 2 + Math.floor(r() * 3);
        k.add(new CylinderGeometry(0.022 * s, 0.028 * s, 0.3 * s, 5), '#4f8f2f', { at: [x + dx, 0.1 + 0.15 * s, z + dz] });
        for (let l = 0; l < leaves; l++) {
          const a = (l / leaves) * Math.PI * 2 + r();
          k.add(new SphereGeometry(0.15 * s, 7, 5), l % 2 ? '#6fbf3e' : '#8fd451', {
            at: [x + dx + Math.cos(a) * 0.11 * s, 0.1 + 0.3 * s, z + dz + Math.sin(a) * 0.11 * s],
            scale: [1, 0.33, 0.58],
            rot: [0, -a, 0.3 + r() * 0.3],
          });
        }
      }
    }
  });
}

// ——— Roofs, windows ———

/**
 * Two props built together: the body (outlined) and its roof tiles (no ink —
 * hundreds of outlined tiles would read as a grid and double the triangles).
 */
function propPair(key: string, make: (k: Kit, tiles: Kit) => void): [BufferGeometry, BufferGeometry] {
  let tiles: BufferGeometry | null = null;
  const body = prop(key, (k) => {
    tiles = prop(`${key}-tiles`, (t) => make(k, t));
  });
  return [body, tiles ?? prop(`${key}-tiles`, () => {})];
}

const TILE_TONES = ['#e3743f', '#d6643a', '#cc5a32', '#ea8752', '#bf5230', '#dd6c3c'];

/**
 * Clay-tile roof, ridge along x: a solid underlayer (carries the silhouette and
 * its ink) and short tiles laid in staggered courses, each tipped up at its lower
 * edge so every course casts a small step of shade.
 */
function roof(
  k: Kit,
  t: Kit,
  o: { w: number; depth: number; rise: number; y: number; seed: number; tile?: number },
) {
  const r = rng(o.seed);
  const half = o.depth / 2;
  const len = Math.hypot(half, o.rise);
  const ang = Math.atan2(o.rise, half);
  const tw = o.tile ?? 0.22;
  const rows = Math.max(4, Math.round(len / 0.24));
  const tl = len / rows;
  const cols = Math.round(o.w / tw);
  for (const side of [1, -1]) {
    const rx = side * ang;
    k.add(box(o.w, 0.1, len + 0.08), P.roofUnder, {
      surf: 'tile',
      at: [0, o.y + o.rise / 2 - 0.03, (side * half) / 2],
      rot: [rx, 0, 0],
    });
    const ny = Math.cos(ang);
    const nz = side * Math.sin(ang);
    for (let row = 0; row < rows; row++) {
      const f = (row + 0.5) / rows;
      const y = o.y + o.rise * f;
      const z = side * half * (1 - f);
      const shift = row % 2 ? tw / 2 : 0;
      for (let c = -1; c < cols; c++) {
        const x = -o.w / 2 + (c + 0.5) * (o.w / cols) + shift;
        if (x < -o.w / 2 + tw * 0.3 || x > o.w / 2 - tw * 0.3) continue;
        // Plain 12-triangle box per tile (the kit's box is subdivided for roughening).
        t.add(new BoxGeometry(tw - 0.025, 0.05, tl + 0.05), TILE_TONES[Math.floor(r() * TILE_TONES.length)]!, {
          surf: 'tile',
          at: [x, y + ny * 0.075, z + nz * 0.075],
          rot: [rx + side * 0.08, (r() - 0.5) * 0.04, (r() - 0.5) * 0.03],
          vary: 0.08,
        });
      }
    }
  }
  k.add(new CylinderGeometry(0.11, 0.11, o.w + 0.14, 8), P.roofRidge, {
    at: [0, o.y + o.rise + 0.08, 0],
    rot: [0, 0, Math.PI / 2],
  });
}

/** Triangle filling a gable end (both windings). */
function gableEnd(k: Kit, x: number, y: number, half: number, rise: number, color: string) {
  const g = new BufferGeometry();
  g.setAttribute(
    'position',
    new BufferAttribute(
      new Float32Array([0, y, -half, 0, y, half, 0, y + rise, 0, 0, y, half, 0, y, -half, 0, y + rise, 0]),
      3,
    ),
  );
  g.computeVertexNormals();
  k.add(g, color, { at: [x, 0, 0] });
  k.add(box(0.07, rise * 0.9, 0.09), P.beam, { at: [x, y + rise * 0.45, 0] });
}

function windowAt(k: Kit, x: number, y: number, z: number, rot: number, flowers = true) {
  const o = (dx: number, dz: number): [number, number, number] => [
    x + Math.cos(rot) * dx + Math.sin(rot) * dz,
    y,
    z - Math.sin(rot) * dx + Math.cos(rot) * dz,
  ];
  k.add(box(0.52, 0.6, 0.07), P.beam, { at: o(0, 0), rot: [0, rot, 0] });
  k.add(box(0.42, 0.5, 0.05), '#86cdee', { at: o(0, 0.03), rot: [0, rot, 0] });
  k.add(box(0.045, 0.5, 0.06), P.white, { at: o(0, 0.045), rot: [0, rot, 0] });
  k.add(box(0.42, 0.045, 0.06), P.white, { at: o(0, 0.045), rot: [0, rot, 0] });
  if (flowers) {
    const [bx, , bz] = o(0, 0.14);
    k.add(box(0.6, 0.13, 0.18), P.wood, { at: [bx, y - 0.37, bz], rot: [0, rot, 0] });
    for (let i = 0; i < 5; i++) {
      const [fx, , fz] = o(-0.24 + i * 0.12, 0.16);
      k.add(new SphereGeometry(0.075, 6, 5), i % 2 ? P.red : '#f39ac0', { at: [fx, y - 0.27, fz] });
      k.add(new SphereGeometry(0.07, 6, 4), '#5fae3c', { at: [fx + 0.04, y - 0.31, fz] });
    }
  }
}

// ——— Farmhouse (L-shaped, like the picture) ———

function timberStorey(k: Kit, W: number, D: number, y0: number, h: number) {
  k.add(box(W + 0.12, h, D + 0.12), P.wall, { at: [0, y0 + h / 2, 0], vary: 0.03 });
  for (const z of [D / 2 + 0.07, -(D / 2 + 0.07)]) {
    for (const y of [y0 + 0.04, y0 + h - 0.04]) k.add(box(W + 0.2, 0.1, 0.06), P.beam, { at: [0, y, z] });
    const n = Math.max(2, Math.round(W / 0.85));
    for (let i = 0; i <= n; i++) k.add(box(0.09, h, 0.06), P.beam, { at: [-W / 2 + (W / n) * i, y0 + h / 2, z] });
    for (let i = 0; i < n; i += 2)
      k.add(box(0.07, h * 1.05, 0.05), P.beam, {
        at: [-W / 2 + (W / n) * (i + 0.5), y0 + h / 2, z],
        rot: [0, 0, i % 4 ? 0.7 : -0.7],
      });
  }
  for (const x of [W / 2 + 0.07, -(W / 2 + 0.07)])
    for (const y of [y0 + 0.04, y0 + h - 0.04]) k.add(box(0.06, 0.1, D + 0.2), P.beam, { at: [x, y, 0] });
}

function stoneStorey(k: Kit, W: number, D: number, h: number, seed: number) {
  k.add(box(W, h, D), P.stone, { at: [0, h / 2, 0], surf: 'stone', vary: 0.08, ao: 0.3 });
  const r = rng(seed);
  for (let i = 0; i < Math.round(W * 7); i++) {
    const side = i % 2 ? 1 : -1;
    k.add(box(0.34 + r() * 0.22, 0.2, 0.06), [P.stone2, '#ddd3be', '#b0a48c'][i % 3]!, {
      at: [(r() - 0.5) * (W - 0.3), 0.15 + r() * (h - 0.3), side * (D / 2 + 0.02)],
      vary: 0.05,
    });
  }
}

function houseGeometry() {
  return propPair('painted-house', (k, t) => {
    const W = 4.0;
    const D = 2.8;
    stoneStorey(k, W, D, 1.3, 7);
    timberStorey(k, W, D, 1.3, 1.2);
    roof(k, t, { w: W + 0.6, depth: D + 0.9, rise: 1.7, y: 2.5, seed: 31 });
    for (const x of [W / 2 + 0.06, -(W / 2 + 0.06)]) gableEnd(k, x, 2.5, D / 2 + 0.06, 1.62, P.wall);
    // Dormers on the front slope.
    for (const x of [-1.1, 0.9]) {
      k.add(box(0.7, 0.6, 0.8), P.wall, { at: [x, 3.05, D / 2 - 0.25] });
      windowAt(k, x, 3.05, D / 2 + 0.16, 0, false);
      k.add(new CylinderGeometry(0.46, 0.46, 0.85, 3, 1, false), P.roof[1]!, {
        at: [x, 3.42, D / 2 - 0.25],
        rot: [Math.PI / 2, 0, 0],
        scale: [1, 1, 0.5],
      });
    }
    // Door, step, windows.
    k.add(box(0.9, 1.1, 0.08), '#a4672f', { at: [0.2, 0.6, D / 2 + 0.04], vary: 0.06 });
    k.add(box(0.04, 1.05, 0.09), '#6b3f1f', { at: [0.2, 0.6, D / 2 + 0.06] });
    k.add(box(1.2, 0.12, 0.5), P.stone2, { at: [0.2, 0.06, D / 2 + 0.3], surf: 'stone' });
    for (const x of [-1.3, 1.4]) windowAt(k, x, 0.85, D / 2 + 0.03, 0);
    for (const x of [-1.3, 0.2, 1.4]) windowAt(k, x, 1.95, D / 2 + 0.1, 0);
    windowAt(k, -(W / 2 + 0.03), 0.85, 0, -Math.PI / 2);
    windowAt(k, -(W / 2 + 0.1), 1.95, 0, -Math.PI / 2);
    // Solar panel on the back slope (like the picture), chimney.
    k.add(box(1.4, 0.06, 1.0), '#27447d', { at: [0.9, 3.36, -0.7], rot: [-0.52, 0, 0] });
    for (let i = 1; i < 4; i++)
      k.add(box(0.025, 0.07, 1.0), '#a8bfe6', { at: [0.2 + i * 0.35, 3.37, -0.7], rot: [-0.52, 0, 0] });
    k.add(box(1.4, 0.07, 0.025), '#a8bfe6', { at: [0.9, 3.37, -0.7], rot: [-0.52, 0, 0] });
    k.add(box(0.42, 1.2, 0.42), P.stone2, { at: [-1.5, 3.7, -0.5], surf: 'stone' });
  });
}

/** The side wing, built with its ridge along x and turned so its gable faces the front. */
function wingGeometry() {
  return propPair('painted-wing', (k, t) => {
    const W = 2.8;
    const D = 2.2;
    stoneStorey(k, W, D, 1.2, 9);
    timberStorey(k, W, D, 1.2, 1.0);
    roof(k, t, { w: W + 0.4, depth: D + 0.7, rise: 1.3, y: 2.2, seed: 37 });
    for (const x of [W / 2 + 0.06, -(W / 2 + 0.06)]) gableEnd(k, x, 2.2, D / 2 + 0.06, 1.24, P.wall);
    // Gable end (+x becomes the front): barn-style door and two windows above.
    k.add(box(0.07, 1.0, 1.1), '#a4672f', { at: [W / 2 + 0.03, 0.55, 0], vary: 0.06 });
    for (const s of [-1, 1])
      k.add(box(0.08, 1.05, 0.07), '#6b3f1f', { at: [W / 2 + 0.05, 0.55, s * 0.28], rot: [s * 0.8, 0, 0] });
    windowAt(k, W / 2 + 0.1, 1.75, 0, Math.PI / 2);
    windowAt(k, W / 2 + 0.06, 2.7, 0, Math.PI / 2, false);
    windowAt(k, 0.4, 0.8, D / 2 + 0.03, 0);
    // Crates stacked by the wing.
    for (const [x, z, s] of [
      [W / 2 + 0.5, 1.0, 0.45],
      [W / 2 + 0.55, 0.45, 0.38],
      [W / 2 + 0.5, 0.75, 0.32],
    ] as [number, number, number][])
      k.add(box(s, s, s), P.wood, { at: [x, s / 2 + (s < 0.35 ? 0.42 : 0), z], vary: 0.08, ao: 0.3 });
  });
}

// ——— Windmill (stone tower, as in the picture) ———

function windmillTowerGeometry() {
  return prop('painted-windmill', (k) => {
    k.add(new CylinderGeometry(0.66, 0.7, 0.25, 10), P.stone2, { at: [0, 0.12, 0], flat: true });
    k.add(new CylinderGeometry(0.4, 0.58, 1.65, 9), P.stone, { at: [0, 1.05, 0], surf: 'stone', vary: 0.1, ao: 0.3 });
    const r = rng(43);
    for (let i = 0; i < 22; i++) {
      const a = r() * Math.PI * 2;
      const y = 0.35 + r() * 1.3;
      const rad = 0.58 - (y - 0.25) * 0.11;
      k.add(box(0.2, 0.12, 0.05), [P.stone2, '#e3dac6', '#a99c84'][i % 3]!, {
        at: [Math.cos(a) * rad, y, Math.sin(a) * rad],
        rot: [0, -a + Math.PI / 2, 0],
      });
    }
    k.add(box(0.32, 0.55, 0.06), '#7a4a26', { at: [0, 0.5, 0.56] });
    k.add(box(0.2, 0.2, 0.05), '#86cdee', { at: [0, 1.35, 0.47] });
    k.add(new ConeGeometry(0.62, 0.8, 9), P.woodDark, { at: [0, 2.28, 0], vary: 0.1, rough: 0.02 });
    k.add(new SphereGeometry(0.07, 6, 5), '#f4c04a', { at: [0, 2.72, 0] });
    k.add(box(0.26, 0.24, 0.32), '#6b3f1f', { at: [0, 1.98, 0.42] });
  });
}

export const SAILS_HUB: [number, number, number] = [0, 1.98, 0.64];

function sailsGeometry() {
  return prop('painted-sails', (k) => {
    k.add(new CylinderGeometry(0.09, 0.09, 0.12, 8), '#6b3f1f', { rot: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const c = Math.cos(a);
      const s = Math.sin(a);
      k.add(box(0.06, 1.45, 0.04), P.woodDark, { at: [s * 0.74, c * 0.74, 0.03], rot: [0, 0, -a] });
      k.add(box(0.34, 1.05, 0.02), '#f3e6c8', {
        at: [s * 0.84 + c * 0.19, c * 0.84 - s * 0.19, 0.05],
        rot: [0, 0, -a],
        vary: 0.05,
      });
      for (const t of [0.45, 0.8, 1.15])
        k.add(box(0.38, 0.035, 0.03), P.wood, { at: [s * t + c * 0.19, c * t - s * 0.19, 0.07], rot: [0, 0, -a] });
    }
  });
}

// ——— Greenhouse and market (back right) ———

function greenhouseGeometry() {
  return prop('painted-greenhouse', (k) => {
    const L = 5.2;
    const R = 1.3;
    k.add(box(L, 0.35, R * 2 + 0.1), P.stone, { at: [0, 0.18, 0], surf: 'stone', vary: 0.06 });
    k.add(new CylinderGeometry(R, R, L, 18, 1, false, -Math.PI / 2, Math.PI), '#cdf0f2', {
      at: [0, 0.35, 0],
      rot: [0, 0, Math.PI / 2],
      vary: 0.06,
    });
    for (let i = 0; i <= 8; i++)
      k.add(new TorusGeometry(R + 0.015, 0.045, 4, 16, Math.PI), '#f2f7ef', {
        at: [-L / 2 + (L / 8) * i, 0.35, 0],
        rot: [0, Math.PI / 2, 0],
      });
    for (const a of [0.45, 1.0, 1.57, 2.14, 2.7])
      k.add(box(L, 0.045, 0.045), '#f2f7ef', { at: [0, 0.35 + Math.sin(a) * (R + 0.01), Math.cos(a) * (R + 0.01)] });
    for (let i = 0; i < 7; i++)
      k.add(new SphereGeometry(0.34, 7, 5), i % 2 ? '#5fae3c' : '#7cc348', {
        at: [-L / 2 + 0.45 + i * 0.72, 0.52, 0.3],
        scale: [1, 0.8, 0.7],
      });
    for (const x of [L / 2 + 0.01, -(L / 2 + 0.01)]) {
      k.add(new CylinderGeometry(R, R, 0.04, 18, 1, false, -Math.PI / 2, Math.PI), '#dcf5f4', {
        at: [x, 0.35, 0],
        rot: [0, 0, Math.PI / 2],
      });
      k.add(box(0.06, 1.0, 0.55), '#f2f7ef', { at: [x, 0.85, 0] });
    }
  });
}

function stallGeometry(seed: number) {
  return prop(`painted-stall-${seed}`, (k) => {
    const r = rng(seed);
    const W = 2.2;
    k.add(box(W, 0.75, 0.8), P.wood, { at: [0, 0.38, 0], vary: 0.08, ao: 0.3 });
    for (let i = 0; i < 6; i++) k.add(box(0.05, 0.7, 0.04), P.woodDark, { at: [-W / 2 + 0.1 + i * 0.4, 0.38, 0.41] });
    const produce = ['#e2412b', '#f4c04a', '#7cc348', '#f08a3c', '#a77fd0', '#e2412b', '#5fae3c'];
    for (let i = 0; i < 5; i++) {
      const x = -W / 2 + 0.25 + i * 0.43;
      k.add(box(0.4, 0.16, 0.5), P.woodLight, { at: [x, 0.84, 0.05], vary: 0.06 });
      for (let q = 0; q < 6; q++)
        k.add(new SphereGeometry(0.065, 6, 5), produce[(i + seed) % produce.length]!, {
          at: [x - 0.12 + (q % 3) * 0.12, 0.95, -0.08 + Math.floor(q / 3) * 0.17],
        });
    }
    for (const x of [-W / 2, W / 2])
      for (const z of [-0.38, 0.38]) k.add(box(0.08, 1.95, 0.08), P.woodDark, { at: [x, 0.98, z] });
    const stripes = 10;
    for (let i = 0; i < stripes; i++)
      k.add(box(W / stripes + 0.005, 0.05, 1.2), i % 2 ? P.white : '#2f9a5e', {
        at: [-W / 2 + (W / stripes) * (i + 0.5), 1.96, 0.24],
        rot: [0.32, 0, 0],
      });
    for (let i = 0; i < stripes; i++)
      k.add(box(W / stripes, 0.18, 0.03), i % 2 ? P.white : '#2f9a5e', {
        at: [-W / 2 + (W / stripes) * (i + 0.5), 1.71, 0.82],
      });
    // Crates of greens on the ground in front, and a chalkboard.
    for (let i = 0; i < 3; i++) {
      const x = -W / 2 + 0.4 + i * 0.7;
      k.add(box(0.42, 0.28, 0.36), P.woodLight, { at: [x, 0.14, 0.85], rot: [0, (r() - 0.5) * 0.3, 0], vary: 0.08 });
      for (let q = 0; q < 4; q++)
        k.add(new SphereGeometry(0.08, 6, 5), i % 2 ? '#7cc348' : '#5fae3c', {
          at: [x - 0.1 + (q % 2) * 0.2, 0.32, 0.78 + Math.floor(q / 2) * 0.14],
        });
    }
    k.add(box(0.44, 0.58, 0.04), '#2f3a33', { at: [-W / 2 - 0.35, 0.47, 0.55], rot: [-0.25, 0.3, 0] });
  });
}

// ——— Paddock: thatched barn, haystack, coop, animals ———

const STRAW = ['#e8bd5c', '#d4a548', '#f0cd70', '#c99a40'];

/**
 * Thatched roof: four overlapping courses of rough straw bundles per side, each
 * course standing a little proud of the one below and tipped at its lower edge
 * (light / shade steps), a ragged fringe of uneven tufts at the eave, a rolled ridge.
 */
function thatch(k: Kit, W: number, D: number, y: number, rise: number, seed: number) {
  const r = rng(seed);
  const half = D / 2 + 0.38;
  const ang = Math.atan2(rise, half);
  const len = Math.hypot(half, rise);
  const courses = 4;
  for (const side of [1, -1]) {
    const ny = Math.cos(ang);
    const nz = side * Math.sin(ang);
    for (let c = 0; c < courses; c++) {
      const f = (c + 0.55) / courses;
      const off = 0.1 + c * 0.04;
      k.add(new BoxGeometry(W + 0.7 - c * 0.04, 0.17, (len / courses) * 1.35, 10, 1, 2), STRAW[(c + (side > 0 ? 0 : 1)) % 4]!, {
        at: [0, y + rise * f + ny * off, side * half * (1 - f) + nz * off],
        rot: [side * ang + side * 0.09, 0, 0],
        surf: 'straw',
        rough: 0.045,
        vary: 0.14,
        seed: seed + c * 3 + (side > 0 ? 1 : 2),
      });
    }
    // Eave fringe: uneven tufts, splayed.
    const n = Math.round((W + 0.7) * 7);
    for (let i = 0; i < n; i++) {
      const l = 0.14 + r() * 0.2;
      k.add(new ConeGeometry(0.055 + r() * 0.03, l, 4), STRAW[Math.floor(r() * 4)]!, {
        at: [-W / 2 - 0.33 + ((i + r() * 0.6) / n) * (W + 0.66), y + 0.02 - l * 0.3, side * (half + 0.04)],
        rot: [Math.PI + side * (0.35 + r() * 0.3), r() * 3, (r() - 0.5) * 0.4],
      });
    }
  }
  k.add(new CylinderGeometry(0.2, 0.24, W + 0.8, 9, 3), '#c99a40', {
    at: [0, y + rise + 0.1, 0],
    rot: [0, 0, Math.PI / 2],
    surf: 'straw',
    rough: 0.04,
    vary: 0.12,
  });
}

/**
 * Pieces now replaced by the Blender prototype (scripts/blender/proto_painted.py):
 * the barn's thatch and one stretch of pond bank (t along the pond outline).
 */
const PROTO = { barnThatch: true, bank: [0.18, 0.34] as [number, number] };
const inProtoBank = (t: number) => t >= PROTO.bank[0] && t <= PROTO.bank[1];

function barnGeometry() {
  return prop('painted-barn', (k) => {
    const W = 3.2;
    const D = 2.4;
    k.add(box(W, 0.1, D), '#d9b06a', { at: [0, 0.05, 0], surf: 'straw' });
    for (const x of [-W / 2, 0, W / 2])
      for (const z of [-D / 2, D / 2]) k.add(box(0.16, 1.7, 0.16), P.woodDark, { at: [x, 0.85, z], vary: 0.06 });
    for (let i = 0; i < 10; i++)
      k.add(box(W / 10 - 0.01, 1.5, 0.06), i % 2 ? P.wood : P.woodLight, {
        at: [-W / 2 + (W / 10) * (i + 0.5), 0.75, -D / 2],
        vary: 0.06,
      });
    for (const x of [-W / 2, W / 2])
      for (let i = 0; i < 7; i++)
        k.add(box(0.06, 1.5, D / 7 - 0.01), i % 2 ? P.wood : P.woodLight, {
          at: [x, 0.75, -D / 2 + (D / 7) * (i + 0.5)],
          vary: 0.06,
        });
    if (!PROTO.barnThatch) thatch(k, W, D, 1.7, 1.15, 53);
    k.add(new SphereGeometry(0.55, 8, 6), P.straw, { at: [-0.7, 0.32, -0.55], scale: [1.4, 0.6, 0.8], surf: 'straw' });
    for (const s of [-1, 1]) k.add(box(0.06, 1.8, 0.06), P.woodLight, { at: [W / 2 + 0.28, 0.9, s * 0.2], rot: [0, 0, -0.2] });
    for (let i = 0; i < 6; i++) k.add(box(0.05, 0.05, 0.46), P.woodLight, { at: [W / 2 + 0.37 - i * 0.055, 0.2 + i * 0.28, 0] });
  });
}

function haystackGeometry() {
  return prop('painted-haystack', (k) => {
    const r = rng(83);
    // Stacked, slightly lumpy courses, alternating light and shade, narrowing upwards.
    const rings: [number, number, number][] = [
      [0.92, 1.02, 0.34],
      [0.8, 0.92, 0.32],
      [0.63, 0.8, 0.3],
      [0.42, 0.63, 0.28],
      [0.18, 0.42, 0.26],
    ];
    let y = 0;
    rings.forEach(([top, bottom, h], i) => {
      k.add(new CylinderGeometry(top, bottom, h, 12, 2), STRAW[i % 4]!, {
        at: [0, y + h / 2, 0],
        surf: 'straw',
        rough: 0.05,
        vary: 0.14,
        seed: 90 + i,
      });
      y += h * 0.86;
    });
    k.add(new ConeGeometry(0.2, 0.3, 7), '#c99a40', { at: [0, y + 0.1, 0], rough: 0.03 });
    // Loose straw at the foot.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + r() * 0.3;
      k.add(new ConeGeometry(0.06, 0.26 + r() * 0.12, 4), STRAW[i % 4]!, {
        at: [Math.cos(a) * 1.02, 0.08, Math.sin(a) * 1.02],
        rot: [Math.sin(a) * 1.3, r(), -Math.cos(a) * 1.3],
      });
    }
    for (let i = 0; i < 5; i++)
      k.add(box(0.5, 0.025, 0.035), STRAW[i % 4]!, {
        at: [Math.cos(i * 1.3) * 1.25, 0.02, Math.sin(i * 1.3) * 1.25],
        rot: [0, i * 1.9, 0],
      });
  });
}

function coopGeometry() {
  return prop('painted-coop', (k) => {
    k.add(box(1.2, 0.8, 0.9), P.woodLight, { at: [0, 0.7, 0], vary: 0.08, ao: 0.2 });
    for (let i = 0; i < 6; i++) k.add(box(0.03, 0.8, 0.02), P.wood, { at: [-0.5 + i * 0.2, 0.7, 0.46] });
    for (const x of [-0.55, 0.55])
      for (const z of [-0.4, 0.4]) k.add(box(0.09, 0.3, 0.09), P.woodDark, { at: [x, 0.15, z] });
    thatch(k, 1.2, 0.9, 1.1, 0.5, 61);
    k.add(box(0.3, 0.32, 0.04), '#5e3b22', { at: [0.25, 0.62, 0.46] });
    k.add(box(0.28, 0.04, 0.8), P.wood, { at: [0.25, 0.2, 0.8], rot: [0.6, 0, 0] });
  });
}

function cowGeometry() {
  return prop('painted-cow', (k) => {
    k.add(new SphereGeometry(1, 12, 9), P.white, { at: [0, 0.62, 0], scale: [0.58, 0.32, 0.32], ao: 0.2 });
    for (const [x, y, z, s] of [
      [0.15, 0.72, 0.28, 0.17],
      [-0.25, 0.65, 0.27, 0.14],
      [-0.05, 0.75, -0.28, 0.18],
      [0.3, 0.6, -0.25, 0.11],
    ] as [number, number, number, number][])
      k.add(new SphereGeometry(s, 7, 5), '#2e2a27', { at: [x, y, z], scale: [1.2, 0.9, 0.25] });
    for (const [x, z] of [
      [-0.35, -0.14],
      [0.35, -0.14],
      [-0.35, 0.14],
      [0.35, 0.14],
    ] as [number, number][]) {
      k.add(new CylinderGeometry(0.06, 0.05, 0.42, 6), '#f3eee4', { at: [x, 0.25, z] });
      k.add(new CylinderGeometry(0.055, 0.06, 0.07, 6), '#2e2a27', { at: [x, 0.03, z] });
    }
    k.add(box(0.3, 0.27, 0.27), P.white, { at: [0.68, 0.78, 0] });
    k.add(box(0.13, 0.17, 0.25), '#f2b8a8', { at: [0.86, 0.72, 0] });
    for (const s of [-1, 1]) {
      k.add(new SphereGeometry(0.025, 5, 4), '#1d1a16', { at: [0.79, 0.85, s * 0.14] });
      k.add(new SphereGeometry(0.07, 6, 4), '#2e2a27', { at: [0.6, 0.88, s * 0.18], scale: [0.6, 0.35, 1] });
      k.add(new ConeGeometry(0.028, 0.13, 5), '#efe2b8', { at: [0.64, 0.97, s * 0.1], rot: [s * 0.4, 0, 0] });
    }
    k.add(new SphereGeometry(0.1, 7, 5), '#f2b8a8', { at: [-0.05, 0.34, 0], scale: [1, 0.6, 1] });
    k.add(new CylinderGeometry(0.015, 0.02, 0.45, 4), P.white, { at: [-0.6, 0.5, 0], rot: [0, 0, -0.3] });
    k.add(new SphereGeometry(0.05, 5, 4), '#2e2a27', { at: [-0.66, 0.28, 0] });
  });
}

function henGeometry() {
  return prop('painted-hen', (k) => {
    k.add(new SphereGeometry(0.16, 9, 7), P.white, { at: [0, 0.2, 0], scale: [1.15, 0.92, 0.82] });
    k.add(new ConeGeometry(0.08, 0.2, 6), '#f1ece2', { at: [-0.17, 0.3, 0], rot: [0, 0, 0.9] });
    k.add(new SphereGeometry(0.09, 8, 6), P.white, { at: [0.15, 0.36, 0] });
    for (const x of [0.12, 0.16, 0.2]) k.add(new SphereGeometry(0.03, 5, 4), '#d8442e', { at: [x, 0.45, 0] });
    k.add(new ConeGeometry(0.03, 0.08, 4), '#e8a93a', { at: [0.26, 0.35, 0], rot: [0, 0, -Math.PI / 2] });
    for (const s of [-1, 1]) {
      k.add(new SphereGeometry(0.015, 4, 3), '#1d1a16', { at: [0.2, 0.39, s * 0.055] });
      k.add(new CylinderGeometry(0.012, 0.012, 0.1, 4), '#e8a93a', { at: [0.02, 0.05, s * 0.05] });
    }
  });
}

// ——— Pond ———

function pondPoint(t: number, grow = 0): [number, number] {
  const w = POND.w / 2 + grow;
  const d = POND.d / 2 + grow;
  const a = t * Math.PI * 2;
  const cx = Math.cos(a);
  const cz = Math.sin(a);
  const n = 5;
  const sx = Math.sign(cx) * Math.pow(Math.abs(cx), 2 / n);
  const sz = Math.sign(cz) * Math.pow(Math.abs(cz), 2 / n);
  const wob = 1 + 0.02 * Math.sin(a * 5 + 1);
  return [POND.x + sx * w * wob, POND.z + sz * d * wob];
}

function discGeometry(grow: number, y: number, segs = 80): BufferGeometry {
  const pos: number[] = [];
  for (let i = 0; i < segs; i++) {
    const [ax, az] = pondPoint(i / segs, grow);
    const [bx, bz] = pondPoint((i + 1) / segs, grow);
    pos.push(POND.x, y, POND.z, bx, y, bz, ax, y, az);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

/** Dock on the pond's left edge (towards the field), running into the water along +x. */
const DOCK = { z: POND.z - 1.1, x0: POND.x - POND.w / 2 - 0.75, x1: POND.x - POND.w / 2 + 1.25, w: 1.25 };

/** Rim spots kept for reed clumps (t along the outline), with clump size. */
const REEDS: [number, number][] = [
  [0.06, 1.2],
  [0.11, 0.6],
  [0.31, 0.9],
  [0.55, 1.3],
  [0.6, 0.7],
  [0.83, 1.0],
  [0.97, 0.5],
];

function pondGeometry() {
  return prop('painted-pond', (k) => {
    const r = rng(77);
    // Bank and wet edge, then a bed that darkens towards the middle.
    // Bank: a darker lawn band and a narrow wet edge, so the stones sit in the grass.
    k.add(discGeometry(0.55, 0.008), '#6aae3d', { vary: 0.05 });
    k.add(discGeometry(0.14, 0.014), '#7d7a4e', { vary: 0.05 });
    k.add(discGeometry(0.0, 0.024), '#2e9cc0', { vary: 0.02 });
    k.add(discGeometry(-0.9, 0.028), '#1f7fa6', { vary: 0.02 });
    k.add(discGeometry(-1.8, 0.032), '#176a92', { vary: 0.02 });
    // A few dark pebbles on the bed near the rim (no flat blobs: through the water they read as polygons).
    for (let i = 0; i < 10; i++) {
      const [x, z] = pondPoint(r(), -0.25 - r() * 0.5);
      k.add(new DodecahedronGeometry(0.05 + r() * 0.04, 0), '#3f6f6a', {
        at: [x, 0.04, z],
        rot: [r(), r(), r()],
      });
    }
    // Rim stones: mixed sizes, shapes and tones, bigger boulders at the corners,
    // gaps where reeds and grass meet the water.
    const tones = ['#ded8cb', '#c9c1b0', '#b5ac9a', '#e8e3d8', '#a99f8c', '#d3cbb8'];
    let t = 0;
    while (t < 1) {
      const nearReed = REEDS.some(([rt, size]) => Math.abs(t - rt) < 0.012 * size) || inProtoBank(t);
      const [x, z] = pondPoint(t, 0.16 + (r() - 0.5) * 0.12);
      const onDock = Math.abs(z - DOCK.z) < DOCK.w / 2 + 0.25 && x < POND.x;
      const corner = Math.abs(Math.cos(t * Math.PI * 4)) > 0.92;
      const s = corner ? 0.3 + r() * 0.2 : 0.14 + r() * 0.2;
      if (!onDock && !inProtoBank(t) && !(nearReed && r() < 0.7)) {
        k.add(new DodecahedronGeometry(1, r() < 0.5 ? 0 : 1), tones[Math.floor(r() * tones.length)]!, {
          // Sunk into the bank (only the top shows), like stones set in the ground.
          at: [x, 0.02 + s * 0.1, z],
          scale: [s * (1.0 + r() * 0.6), s * (0.55 + r() * 0.35), s * (0.8 + r() * 0.4)],
          rot: [r() * 0.6, r() * 6, r() * 0.6],
          rough: 0.03,
          vary: 0.1,
        });
        // A smaller stone tucked against the big ones now and then.
        if (s > 0.28 || r() < 0.25)
          k.add(new DodecahedronGeometry(1, 0), tones[Math.floor(r() * tones.length)]!, {
            at: [x + (r() - 0.5) * 0.3, 0.05, z + (r() - 0.5) * 0.3],
            scale: [0.1 + r() * 0.06, 0.07, 0.09 + r() * 0.05],
            rot: [r(), r() * 6, r()],
          });
      }
      t += (s * 1.35 + 0.02 + r() * 0.05) / (2 * (POND.w + POND.d));
    }
    // Dock: separate planks with gaps, two cross beams below, posts standing in the water.
    const len = DOCK.x1 - DOCK.x0;
    const planks = 8;
    for (let i = 0; i < planks; i++)
      k.add(box(len / planks - 0.035, 0.07, DOCK.w), i % 3 === 1 ? P.woodLight : P.wood, {
        at: [DOCK.x0 + (i + 0.5) * (len / planks), 0.32, DOCK.z],
        rot: [0, (r() - 0.5) * 0.03, 0],
        vary: 0.1,
      });
    for (const dz of [-1, 1])
      k.add(box(len, 0.09, 0.1), P.woodDark, {
        at: [(DOCK.x0 + DOCK.x1) / 2, 0.24, DOCK.z + dz * (DOCK.w / 2 - 0.12)],
      });
    for (const x of DOCK_POSTS)
      for (const dz of [-1, 1]) {
        k.add(new CylinderGeometry(0.075, 0.085, 0.95, 7), P.woodDark, {
          at: [x, 0.3, DOCK.z + dz * (DOCK.w / 2 - 0.05)],
        });
        k.add(new CylinderGeometry(0.095, 0.075, 0.06, 7), P.cap, {
          at: [x, 0.79, DOCK.z + dz * (DOCK.w / 2 - 0.05)],
        });
      }
    k.add(box(0.3, 0.16, 0.22), P.woodDark, { at: [DOCK.x1 - 0.35, 0.44, DOCK.z + 0.35] });
    k.add(new CylinderGeometry(0.12, 0.12, 0.06, 10), '#d9c7a0', { at: [DOCK.x0 + 0.6, 0.39, DOCK.z - 0.35] });
    // Lily pads in two clusters, a few blossoms.
    for (const [ct, cn] of [
      [0.2, 6],
      [0.72, 5],
    ] as [number, number][])
      for (let i = 0; i < cn; i++) {
        const [x, z] = pondPoint(ct + (r() - 0.5) * 0.06, -0.45 - r() * 0.6);
        const s = 0.16 + r() * 0.1;
        k.add(
          new CylinderGeometry(s, s, 0.02, 11, 1, false, 0.4, Math.PI * 2 - 0.6),
          i % 2 ? '#5fae3c' : '#4c9a33',
          { at: [x, 0.125, z], rot: [0, r() * 6, 0] },
        );
        if (i % 2 === 0)
          k.add(new ConeGeometry(0.07, 0.1, 6), i % 4 ? '#f6b9d0' : '#fbf3e6', { at: [x + 0.05, 0.17, z] });
      }
    // Reed clumps of different sizes; cattails in the bigger ones.
    for (const [rt, size] of REEDS.filter(([rt]) => !inProtoBank(rt))) {
      const [x, z] = pondPoint(rt, 0.05);
      const n = Math.round(5 + size * 7);
      for (let q = 0; q < n; q++)
        k.add(new ConeGeometry(0.035, (0.5 + r() * 0.5) * (0.6 + size * 0.5), 4), q % 3 ? '#5fae3c' : '#8fd451', {
          at: [x + (r() - 0.5) * 0.35 * size, 0.3 * (0.6 + size * 0.5), z + (r() - 0.5) * 0.35 * size],
          rot: [(r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5],
        });
      if (size > 0.85)
        for (let q = 0; q < 2; q++)
          k.add(new CylinderGeometry(0.035, 0.035, 0.17, 5), '#7a4f2e', {
            at: [x + (r() - 0.5) * 0.25, 0.75 + size * 0.15, z + (r() - 0.5) * 0.25],
          });
    }
  });
}

/** Posts of the dock (x), standing in the water. */
const DOCK_POSTS = [DOCK.x0 + 0.15, DOCK.x0 + (DOCK.x1 - DOCK.x0) * 0.55, DOCK.x1 - 0.08];

/** Water: deep turquoise in the middle, light at the rim. */
function waterGeometry(): BufferGeometry {
  const g = discGeometry(0.08, 0.11, 96);
  const p = g.attributes.position!;
  const n = p.count;
  const col = new Float32Array(n * 3);
  const deep = new Color('#0b86bb');
  const mid = new Color('#1fb0d6');
  const shallow = new Color('#5cd0e2');
  for (let i = 0; i < n; i++) {
    const d = Math.min(
      1,
      Math.hypot((p.getX(i) - POND.x) / (POND.w / 2), (p.getZ(i) - POND.z) / (POND.d / 2)),
    );
    const c = d < 0.6 ? deep.clone().lerp(mid, d / 0.6) : mid.clone().lerp(shallow, (d - 0.6) / 0.4);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new BufferAttribute(col, 3));
  return g;
}

/** Curved ripple arcs and a few sparkles on the surface, rings round the dock posts (one transparent mesh). */
function shimmerGeometry(): BufferGeometry {
  return prop('painted-shimmer', (k) => {
    const r = rng(19);
    for (let i = 0; i < 16; i++) {
      const [x, z] = pondPoint(r(), -0.5 - r() * 1.5);
      const rad = 0.16 + r() * 0.3;
      k.add(new TorusGeometry(rad, 0.012, 3, 12, 1.3 + r() * 1.2), '#ffffff', {
        at: [x, 0.115, z],
        rot: [Math.PI / 2, 0, r() * 6],
      });
      if (i % 3 === 0)
        k.add(new TorusGeometry(rad * 0.6, 0.01, 3, 10, 1.0 + r()), '#ffffff', {
          at: [x, 0.115, z],
          rot: [Math.PI / 2, 0, r() * 6],
        });
    }
    for (const x of DOCK_POSTS.slice(1))
      for (const dz of [-1, 1])
        k.add(new TorusGeometry(0.15, 0.012, 3, 16), '#ffffff', {
          at: [x, 0.118, DOCK.z + dz * (DOCK.w / 2 - 0.05)],
          rot: [Math.PI / 2, 0, 0],
        });
  });
}

function koiGeometry(v: number) {
  const tones = [
    ['#ff7a1f', '#fff6ea'],
    ['#fff6ea', '#f0441f'],
    ['#ffb21f', '#fff2d6'],
  ][v % 3]!;
  return prop(`painted-koi${v}`, (k) => {
    k.add(new SphereGeometry(1, 10, 7), tones[0]!, { scale: [0.38, 0.09, 0.15] });
    k.add(new SphereGeometry(1, 8, 6), tones[1]!, { at: [0.08, 0.035, 0], scale: [0.18, 0.07, 0.11] });
    k.add(new SphereGeometry(1, 8, 6), tones[1]!, { at: [-0.18, 0.03, 0], scale: [0.1, 0.06, 0.08] });
    k.add(new ConeGeometry(0.13, 0.28, 6), tones[0]!, {
      at: [-0.45, 0, 0],
      rot: [0, 0, Math.PI / 2],
      scale: [1, 1, 0.3],
    });
    for (const sd of [-1, 1])
      k.add(new ConeGeometry(0.06, 0.14, 4), tones[0]!, {
        at: [0.1, -0.01, sd * 0.13],
        rot: [sd * 1.2, 0, 0.5],
        scale: [1, 1, 0.3],
      });
  });
}

// ——— Small props ———

function hutGeometry(seed: number) {
  return prop(`painted-hut-${seed}`, (k) => {
    for (const x of [-0.55, 0.55])
      for (const z of [-0.42, 0.42]) k.add(box(0.09, 0.85, 0.09), P.woodDark, { at: [x, 0.42, z] });
    k.add(box(1.1, 0.08, 0.85), P.wood, { at: [0, 0.42, 0] });
    for (const side of [1, -1])
      k.add(box(1.3, 0.07, 0.66), P.woodLight, { at: [0, 1.0, side * 0.26], rot: [side * 0.6, 0, 0], vary: 0.08 });
    k.add(box(0.7, 0.32, 0.45), P.woodLight, { at: [0, 0.62, 0] });
  });
}

function fruitGeometry(seed: number, color: string) {
  return prop(`painted-fruit-${seed}`, (k) => {
    const r = rng(seed);
    for (let i = 0; i < 22; i++) {
      const a = r() * Math.PI * 2;
      const h = 1.3 + r() * 1.3;
      const d = 0.6 + r() * 0.55;
      k.add(new SphereGeometry(0.12, 7, 5), color, { at: [Math.cos(a) * d, h, Math.sin(a) * d], scale: [0.8, 1.25, 0.8] });
    }
  });
}

function cloudGeometry(seed: number) {
  return prop(`painted-cloud-${seed}`, (k) => {
    const r = rng(seed);
    for (let i = 0; i < 6; i++)
      k.add(new IcosahedronGeometry(1, 2), P.white, {
        at: [(i - 2.5) * 0.85, r() * 0.35, (r() - 0.5) * 0.6],
        scale: [0.7 + r() * 0.55, 0.5 + r() * 0.3, 0.6],
      });
  });
}

function kerb(rect: Rect, key: string) {
  return prop(key, (k) => {
    const [x0, z0, x1, z1] = rect;
    const sides: [number, number, number, number][] = [
      [x0, z0, x1, z0],
      [x1, z0, x1, z1],
      [x1, z1, x0, z1],
      [x0, z1, x0, z0],
    ];
    for (const [ax, az, bx, bz] of sides) {
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.round(len / 0.4);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        k.add(box(len / n - 0.04, 0.12, 0.2), i % 2 ? '#e3ddd0' : '#cfc7b6', {
          at: [ax + (bx - ax) * t, 0.06, az + (bz - az) * t],
          rot: [0, ax === bx ? Math.PI / 2 : 0, 0],
          rough: 0.01,
        });
      }
    }
  });
}

function wellGeometry() {
  return prop('painted-well', (k) => {
    k.add(new CylinderGeometry(0.55, 0.6, 0.6, 12), P.stone, { at: [0, 0.3, 0], surf: 'stone', vary: 0.1, ao: 0.3 });
    k.add(new CylinderGeometry(0.47, 0.47, 0.05, 12), '#3fa6cf', { at: [0, 0.58, 0] });
    for (const s of [-1, 1]) k.add(box(0.1, 1.2, 0.1), P.woodDark, { at: [s * 0.55, 1.0, 0] });
    k.add(new CylinderGeometry(0.05, 0.05, 1.2, 6), P.wood, { at: [0, 1.25, 0], rot: [0, 0, Math.PI / 2] });
    for (const side of [1, -1])
      k.add(box(1.4, 0.07, 0.62), P.woodLight, { at: [0, 1.72, side * 0.24], rot: [side * 0.62, 0, 0], vary: 0.08 });
    k.add(new CylinderGeometry(0.12, 0.1, 0.18, 8), P.wood, { at: [0.05, 0.95, 0] });
  });
}

// ——— Assembly ———

function mesh(
  geo: BufferGeometry,
  mat: Material,
  at: [number, number, number] = [0, 0, 0],
  rotY = 0,
  s = 1,
  tint?: [number, number, number],
) {
  const m = new Mesh(geo, mat);
  m.position.set(...at);
  m.rotation.y = rotY;
  m.scale.setScalar(s);
  if (tint) m.userData.tint = tint;
  return m;
}

/** Light, fresh pine green (the shared pines are darker than the picture). */
const PINE_TINT: [number, number, number] = [1.3, 1.32, 1.05];

export async function exportPainted(opts: { preview?: boolean } = {}) {
  const files: Record<string, string> = {};
  const pieces: { file: string; tris: number; at?: [number, number, number] }[] = [];
  const baked: { group: Group; at?: [number, number, number] }[] = [];
  const matte = kitMaterial();
  const cards = leafCardMaterial();
  const sway = kitMaterial({ sway: 0.09 });
  /** Same look as `matte`, but no ink outline (tiles, roof courses). */
  const soft = kitMaterial({ tint: '#ffffff' });
  soft.userData.noOutline = true;
  const save = async (file: string, g: Group, at?: [number, number, number], outline = INK) => {
    const b = bake(g, file.replace('.glb', ''), undefined, { outline });
    pieces.push({ file, tris: b.tris, at });
    if (opts.preview) baked.push({ group: b.group, at });
    else files[file] = await glb(b.group);
  };
  const group = (...ms: Mesh[]) => {
    const g = new Group();
    g.add(...ms);
    return g;
  };

  await save('painted-island.glb', group(mesh(groundGeometry(), matte), mesh(cliffGeometry(), matte)), undefined, 0);
  await save('painted-field.glb', group(mesh(fieldGeometry(), matte), mesh(fieldTilesGeometry(), soft)));
  await save('painted-sprouts.glb', group(mesh(sproutsGeometry(), matte)), undefined, 0.012);

  await save(
    'painted-house.glb',
    group(
      mesh(houseGeometry()[0], matte, [0, 0, 0], 0, HOUSE.scale),
      mesh(houseGeometry()[1], soft, [0, 0, 0], 0, HOUSE.scale),
      mesh(wingGeometry()[0], matte, [3.0 * HOUSE.scale, 0, 0.55 * HOUSE.scale], -Math.PI / 2, HOUSE.scale),
      mesh(wingGeometry()[1], soft, [3.0 * HOUSE.scale, 0, 0.55 * HOUSE.scale], -Math.PI / 2, HOUSE.scale),
    ),
    [HOUSE.x, 0, HOUSE.z],
  );
  await save('painted-windmill.glb', group(mesh(windmillTowerGeometry(), matte)), [MILL.x, 0, MILL.z]);
  await save(
    'painted-sails.glb',
    group(mesh(sailsGeometry(), matte)),
    [MILL.x + SAILS_HUB[0], SAILS_HUB[1], MILL.z + SAILS_HUB[2]],
    0.015,
  );
  await save(
    'painted-market.glb',
    group(
      mesh(greenhouseGeometry(), matte, [0.5, 0, -1.15]),
      mesh(stallGeometry(3), matte, [-1.0, 0, 0.6]),
      mesh(stallGeometry(5), matte, [1.4, 0, 0.65]),
    ),
    [MARKET.x, 0, MARKET.z],
  );
  await save(
    'painted-paddock.glb',
    group(
      mesh(barnGeometry(), matte, [0.3, 0, -2.6], 0, 0.8),
      mesh(haystackGeometry(), matte, [-1.5, 0, 1.3], 0, 0.9),
      mesh(coopGeometry(), matte, [1.3, 0, 0.6], -0.4),
    ),
    [5.9, 0, -4.4],
  );
  {
    const [x0, z0, x1, z1] = PADDOCK_RECT;
    const f = prop('painted-paddock-fence', (k) =>
      fence(
        k,
        [
          [x0, z0 + 0.6],
          [x0, -4.4],
          [x0, -3.4],
          [x0, z1],
          [x1 - 0.2, z1],
        ],
        37,
        [1],
      ),
    );
    await save('painted-paddock-fence.glb', group(mesh(f, matte)));
  }
  await save(
    'painted-animals.glb',
    group(
      mesh(cowGeometry(), matte, [4.4, 0, -4.8], 0.5, 1.4),
      mesh(cowGeometry(), matte, [-0.3, 0, -4.35], -0.6, 1.3),
      mesh(henGeometry(), matte, [6.6, 0, -2.5], 2.2, 1.9),
      mesh(henGeometry(), matte, [7.6, 0, -2.4], -2.4, 1.9),
      mesh(henGeometry(), matte, [6.0, 0, -3.1], 0.8, 1.9),
    ),
    undefined,
    0.014,
  );

  await save('painted-pond.glb', group(mesh(pondGeometry(), matte)));
  {
    const water = new Mesh(
      waterGeometry(),
      new MeshStandardMaterial({
        name: 'water',
        color: new Color('#ffffff'),
        roughness: 0.15,
        transparent: true,
        opacity: 0.82,
        vertexColors: true,
      }),
    );
    const shimmer = new Mesh(
      shimmerGeometry(),
      new MeshStandardMaterial({
        name: 'shimmer',
        color: new Color('#ffffff'),
        transparent: true,
        opacity: 0.45,
        vertexColors: true,
      }),
    );
    await save('painted-water.glb', group(water, shimmer), undefined, 0);
  }
  // (`at` only places them for the preview; in the Editor each fish follows its swim path.)
  const koiAt: [number, number, number][] = [
    [4.6, 0, 1.0],
    [5.8, 0, 4.6],
    [4.8, 0, 6.0],
  ];
  for (const [i, file] of ['painted-koi-a.glb', 'painted-koi-b.glb', 'painted-koi-c.glb'].entries())
    await save(file, group(mesh(koiGeometry(i), matte, [0, 0.085, 0], 0, 1.45)), koiAt[i], 0.01);
  await save(
    'painted-koi.glb',
    group(
      mesh(koiGeometry(0), matte, [4.4, 0.085, 5.6], 0.4, 1.5),
      mesh(koiGeometry(1), matte, [6.2, 0.085, 3.0], 2.6, 1.5),
      mesh(koiGeometry(2), matte, [5.9, 0.085, 6.2], -0.8, 1.4),
      mesh(koiGeometry(0), matte, [4.3, 0.085, 1.2], 1.7, 1.3),
      mesh(koiGeometry(1), matte, [5.4, 0.085, 4.2], -2.0, 1.4),
      mesh(koiGeometry(2), matte, [6.6, 0.085, 0.2], 0.9, 1.2),
    ),
    undefined,
    0.01,
  );

  // Greenery.
  {
    const g = new Group();
    const r = rng(101);
    const free = (x: number, z: number, pad = 0) =>
      insideIsland(x, z, 0.5) &&
      !inRect(x, z, FIELD_RECT, 0.4 + pad) &&
      !inRect(x, z, PADDOCK_RECT, 0.3 + pad) &&
      !isYard(x, z) &&
      Math.hypot((x - POND.x) / (POND.w / 2 + 0.7), (z - POND.z) / (POND.d / 2 + 0.7)) > 1 &&
      Math.hypot(x - HOUSE.x - 0.8, z - HOUSE.z) > 2.8 + pad &&
      !inRect(x, z, [-0.9, -8.4, 5.2, -4.0], pad);
    // Back edge: round broadleaf trees mixed with light pines (as in the picture).
    // (Nothing directly behind the greenhouse: its glass vault must read clearly.)
    const back: [number, number, string][] = [
      [-7.4, -7.3, 'b'],
      [-6.0, -7.6, 'p'],
      [-2.6, -7.8, 'p'],
      [-1.5, -7.6, 'b'],
      [-7.7, -6.0, 'p'],
    ];
    back.forEach(([x, z, kind], i) => {
      const s = 0.85 + r() * 0.35;
      if (kind === 'p') g.add(mesh(pine(i % 3), matte, [x, 0, z], i * 1.3, s, PINE_TINT));
      else {
        g.add(mesh(broadleaf(i % 3), matte, [x, 0, z], i * 2, s * 1.1));
        g.add(mesh(broadleafCards(i % 3), cards, [x, 0, z], i * 2, s * 1.1));
      }
    });
    // Mango trees heavy with yellow fruit on the left, and the round tree on its lawn.
    const fruitTrees: [number, number, number, number, string | null][] = [
      [-6.7, -3.6, 1.25, 0, '#f6c53c'],
      [-5.4, -6.6, 1.1, 1, '#f6c53c'],
      [2.15, -2.05, 0.8, 2, null],
    ];
    fruitTrees.forEach(([x, z, s, v, fruit]) => {
      g.add(mesh(broadleaf(v), matte, [x, 0, z], v * 2, s));
      g.add(mesh(broadleafCards(v), cards, [x, 0, z], v * 2, s));
      if (fruit) g.add(mesh(fruitGeometry(v + 11, fruit), matte, [x, 0, z], v * 2, s));
    });
    // A hedge of bushes round the rim (not in front of the field or the pond).
    const N = 64;
    for (let i = 0; i < N; i++) {
      const [x, z, nx, nz] = rim(i / N, -0.75);
      if (!free(x, z)) continue;
      const s = 0.55 + r() * 0.35;
      g.add(mesh(bush(i % 2), matte, [x + nx * 0.1, 0, z + nz * 0.1], r() * 6, s));
      g.add(mesh(bushCards(i % 2), cards, [x + nx * 0.1, 0, z + nz * 0.1], r() * 6, s));
    }
    // Grass and a few low bushes along the pond bank, so stones and reeds sit in the lawn.
    for (let t = 0; t < 1; t += 0.018 + r() * 0.02) {
      const [x, z] = pondPoint(t, 0.42 + r() * 0.2);
      if (Math.abs(z - DOCK.z) < DOCK.w / 2 + 0.3 && x < POND.x) continue;
      if (!insideIsland(x, z, 0.35) || inRect(x, z, FIELD_RECT, 0.25) || inRect(x, z, PADDOCK_RECT, 0.2)) continue;
      if (r() < 0.16) {
        const s = 0.38 + r() * 0.2;
        g.add(mesh(bush(Math.floor(r() * 2)), matte, [x, 0, z], r() * 6, s));
      } else g.add(mesh(tuft(Math.floor(r() * 2)), sway, [x, 0, z], r() * 6, 0.8 + r() * 0.5));
    }
    // Bushes along the field fence and by the buildings.
    const extra: [number, number][] = [
      [-5.6, 0.5],
      [-2.4, 0.9],
      [1.0, 0.6],
      [-7.6, -1.2],
      [2.9, -3.4],
      [-1.4, -3.6],
      [0.6, -3.4],
      [2.9, 1.1],
    ];
    extra.forEach(([x, z], i) => {
      const s = 0.6 + r() * 0.3;
      g.add(mesh(bush(i % 2), matte, [x, 0, z], r() * 6, s));
      g.add(mesh(bushCards(i % 2), cards, [x, 0, z], r() * 6, s));
    });
    // Flowers and tufts everywhere the lawn is free.
    for (let i = 0; i < 140; i++) {
      const x = (r() - 0.5) * 16;
      const z = (r() - 0.5) * 16;
      if (!free(x, z)) continue;
      const geo = i % 3 ? tuft(i % 2) : flowers((['white', 'yellow', 'pink', 'purple'] as const)[i % 4], i % 2);
      g.add(mesh(geo, sway, [x, 0, z], r() * 6, 1.0 + r() * 0.6));
    }
    // Well (wooden, with a little roof) and small huts at the back left.
    g.add(mesh(wellGeometry(), matte, [-6.6, 0, -0.2], 0.5));
    g.add(mesh(hutGeometry(1), matte, [-4.8, 0, -1.4], 0.25));
    g.add(mesh(hutGeometry(2), matte, [-3.3, 0, -0.9], -0.15, 0.9));
    LAWNS.forEach((rect, i) => g.add(mesh(kerb(rect, `painted-kerb-${i}`), matte)));
    await save('painted-greenery.glb', g, undefined, 0.016);
  }

  await save(
    'painted-clouds.glb',
    group(
      mesh(cloudGeometry(1), matte, [-15, -3.5, 5], 0.8, 1.0),
      mesh(cloudGeometry(2), matte, [9, 1.5, -15], 0.4, 1.2),
      mesh(cloudGeometry(3), matte, [-13, 2.5, -12], 1.2, 0.9),
      mesh(cloudGeometry(4), matte, [15, -4.5, 4], 2, 1.0),
      mesh(cloudGeometry(5), matte, [4, -6.5, 15], 0.7, 1.2),
    ),
    undefined,
    0,
  );

  return { files, pieces, baked };
}

/** Renders the assembled farm from the reference's corner view (for quick iteration). */
export async function previewPainted(width = 1600, height = 833): Promise<string> {
  const { WebGLRenderer, Scene, OrthographicCamera, DirectionalLight, HemisphereLight, Color: C3, PCFShadowMap } =
    await import('three');
  const { baked } = await exportPainted({ preview: true });
  const scene = new Scene();
  scene.background = new C3('#7fc8f0');
  for (const { group, at } of baked) {
    if (at) group.position.set(...at);
    group.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    scene.add(group);
  }
  scene.add(new HemisphereLight('#ffffff', '#b8a57a', 2.0));
  const sun = new DirectionalLight('#fff4dd', 1.9);
  sun.position.set(-3, 14, 13);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const aspect = width / height;
  // Same framing as the Editor camera (orthoHeight, look-at height).
  const v = 8.6;
  const cam = new OrthographicCamera(-v * aspect, v * aspect, v, -v, 0.1, 200);
  cam.position.set(22, 19.6, 22);
  cam.lookAt(0, -0.4, 0);
  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.render(scene, cam);
  return canvas.toDataURL('image/png');
}

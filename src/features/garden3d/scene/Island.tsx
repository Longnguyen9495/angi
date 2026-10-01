import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry } from 'three';
import {
  BUILDINGS,
  CHEF_PATH,
  FOOTPRINTS,
  edgeRadius,
  groundAt,
  noise2,
  plotBounds,
  rng,
  type Vec2,
} from '../layout';
import { Blobs, Instances, type Placed } from './Instances';
import { kitMaterial, prop, surfCode, wind } from './kit';
import { C } from './materials';
import {
  broadleaf,
  broadleafCards,
  bush,
  bushCards,
  danglers,
  flagstone,
  flowers,
  leafCardMaterial,
  pine,
  rock,
  tuft,
} from './nature';

/*
 * The floating island as a miniature diorama: an organic lawn with colour
 * patches and a worn path, a grassy lip, a band of earth, a stepped cliff of
 * big and small rocks, roots and vines hanging off the rim, trees in clusters.
 */

const SEGS = 96;
const RINGS = 18;

function mix(a: Color, b: Color, t: number) {
  return a.clone().lerp(b, Math.min(1, Math.max(0, t)));
}

function distToPath(x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < CHEF_PATH.length; i++) {
    const [ax, az] = CHEF_PATH[i]!;
    const [bx, bz] = CHEF_PATH[(i + 1) % CHEF_PATH.length]!;
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

/** Lawn: rings out to the organic edge, painted with olive / fresh / moss patches. */
function lawnGeometry(): BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const g0 = new Color(C.grass);
  const gOlive = new Color(C.grassOlive);
  const gMoss = new Color(C.moss);
  const gDark = new Color(C.grassDark);
  const worn = new Color('#a39164');
  const paint = (x: number, z: number, edge: number) => {
    let c = mix(g0, gOlive, noise2(x * 0.32 + 3, z * 0.32) * 1.4 - 0.35);
    c = mix(c, gMoss, (noise2(x * 0.9 + 11, z * 0.9 - 4) - 0.55) * 1.6);
    c = mix(c, gDark, (edge - 0.86) * 5);
    const p = distToPath(x, z);
    c = mix(c, worn, (0.55 - p) * 1.4 * (0.7 + noise2(x * 3, z * 3) * 0.3));
    return c;
  };
  pos.push(0, 0, 0);
  const c0 = paint(0, 0, 0);
  col.push(c0.r, c0.g, c0.b);
  for (let k = 1; k <= RINGS; k++) {
    for (let i = 0; i < SEGS; i++) {
      const a = (i / SEGS) * Math.PI * 2;
      const rim = edgeRadius(a);
      const f = k / RINGS;
      const x = Math.cos(a) * rim * f;
      const z = Math.sin(a) * rim * f;
      pos.push(x, groundAt(x, z), z);
      const c = paint(x, z, f);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < SEGS; i++) idx.push(0, 1 + ((i + 1) % SEGS), 1 + i);
  for (let k = 1; k < RINGS; k++) {
    const a0 = 1 + (k - 1) * SEGS;
    const b0 = 1 + k * SEGS;
    for (let i = 0; i < SEGS; i++) {
      const j = (i + 1) % SEGS;
      idx.push(a0 + i, a0 + j, b0 + i, a0 + j, b0 + j, b0 + i);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  g.setAttribute(
    'surf',
    new BufferAttribute(new Float32Array(pos.length / 3).fill(surfCode('grass')), 1),
  );
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Grass lip curling over, then a band of layered earth down to the rocks. */
function skirtGeometry(): BufferGeometry {
  const rows: { f: number; y: number; c: string; j: number }[] = [
    { f: 1, y: 0, c: C.grassDark, j: 0 },
    { f: 1.018, y: -0.1, c: C.moss, j: 0.02 },
    { f: 1.0, y: -0.2, c: '#6f5a36', j: 0.04 },
    { f: 0.985, y: -0.45, c: C.dirt, j: 0.06 },
    { f: 0.975, y: -0.62, c: '#9a6c45', j: 0.06 },
    { f: 0.955, y: -0.95, c: C.dirtDark, j: 0.08 },
  ];
  const r = rng(61);
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const tmp = new Color();
  const surf: number[] = [];
  for (let row = 0; row < rows.length; row++) {
    const R = rows[row]!;
    for (let i = 0; i < SEGS; i++) {
      const a = (i / SEGS) * Math.PI * 2;
      const rim = edgeRadius(a);
      const jr = (r() - 0.5) * R.j * 3;
      const x = Math.cos(a) * (rim * R.f + jr);
      const z = Math.sin(a) * (rim * R.f + jr);
      const top = groundAt(Math.cos(a) * rim, Math.sin(a) * rim);
      pos.push(x, (row === 0 ? top : top * 0.5) + R.y + (r() - 0.5) * R.j, z);
      tmp.set(R.c).multiplyScalar(0.9 + r() * 0.2);
      col.push(tmp.r, tmp.g, tmp.b);
      surf.push(surfCode(row < 2 ? 'grass' : 'soil'));
    }
  }
  for (let row = 0; row < rows.length - 1; row++) {
    const a0 = row * SEGS;
    const b0 = (row + 1) * SEGS;
    for (let i = 0; i < SEGS; i++) {
      const j = (i + 1) % SEGS;
      idx.push(a0 + i, b0 + i, a0 + j, a0 + j, b0 + i, b0 + j);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  g.setAttribute('surf', new BufferAttribute(new Float32Array(surf), 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Rocks stacked in tiers that narrow downward, with a rough core behind them. */
function cliffRocks(): Placed[][] {
  const r = rng(71);
  const out: Placed[][] = [[], [], []];
  const tiers = [
    { y: -1.2, f: 0.9, n: 40, s: [0.75, 1.25] },
    { y: -2.4, f: 0.72, n: 30, s: [0.9, 1.5] },
    { y: -3.8, f: 0.5, n: 20, s: [0.9, 1.5] },
    { y: -5.1, f: 0.26, n: 9, s: [0.8, 1.3] },
    { y: -6.2, f: 0.08, n: 3, s: [0.6, 0.9] },
  ];
  let v = 0;
  for (const t of tiers) {
    for (let i = 0; i < t.n; i++) {
      const a = (i / t.n) * Math.PI * 2 + r() * 0.2;
      const rim = edgeRadius(a) * t.f;
      const s = t.s[0]! + r() * (t.s[1]! - t.s[0]!);
      const tone = ['#ffffff', '#f2ece2', '#e2dbd0'][Math.floor(r() * 3)]!;
      out[v++ % 3]!.push({
        x: Math.cos(a) * rim,
        y: t.y + (r() - 0.5) * 0.5,
        z: Math.sin(a) * rim,
        s: [s * (1 + r() * 0.4), s * (0.8 + r() * 0.5), s],
        ry: r() * 6,
        rx: (r() - 0.5) * 0.5,
        tint: tone,
      });
    }
  }
  return out;
}

function coreGeometry() {
  return prop('island-core', (k) => {
    k.add(new ConeGeometry(edgeRadius(0) * 0.92, 6.4, 18, 5), C.rockDark, {
      rot: [Math.PI, 0, 0],
      at: [0, -4.15, 0],
      rough: 0.9,
      vary: 0.1,
      seed: 91,
      flat: true,
    });
  });
}

/** Roots and vines hanging under the lip. */
function rimDanglers() {
  const r = rng(83);
  const pts: { x: number; y: number; z: number; len: number; vine: boolean }[] = [];
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const rim = edgeRadius(a) * 0.99;
    pts.push({
      x: Math.cos(a) * rim,
      y: -0.25,
      z: Math.sin(a) * rim,
      len: 0.6 + r() * 1.3,
      vine: r() < 0.55,
    });
  }
  return danglers(pts);
}

interface Scape {
  pines: Placed[][];
  broads: Placed[][];
  bushes: Placed[][];
  stones: Placed[][];
  tufts: Placed[][];
  flowers: Record<'white' | 'yellow' | 'pink' | 'purple', Placed[]>;
  blobs: { x: number; y?: number; z: number; r: number; sx?: number }[];
}

/** Buildings that stand on dry land (the pond dresses its own banks). */
const DRY_BUILDINGS = Object.entries(BUILDINGS)
  .filter(([id]) => id !== 'pond')
  .map(([, b]) => b);

function nearBuilding(x: number, z: number, d: number) {
  return FOOTPRINTS.some((b) => Math.hypot(b.x - x, b.z - z) < d);
}

/** Where every tree, stone, tuft and flower goes — deterministic, clustered, with breathing room. */
function landscape(density: number): Scape {
  const r = rng(11);
  const s: Scape = {
    pines: [[], [], []],
    broads: [[], [], []],
    bushes: [[], []],
    stones: [[], [], []],
    tufts: [[], []],
    flowers: { white: [], yellow: [], pink: [], purple: [] },
    blobs: [],
  };
  const greenTint = () => ['#ffffff', '#eef3e4', '#f6f0dc', '#e6eedd'][Math.floor(r() * 4)]!;

  // Trees in loose clusters around the back and sides; the camera side keeps to shrubs.
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + (r() - 0.5) * 0.18;
    const rim = edgeRadius(a);
    const d = rim - 0.7 - r() * 0.9;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (nearBuilding(x, z, 2.1) || distToPath(x, z) < 1) continue;
    const y = groundAt(x, z) - 0.03;
    const front = z > 2.6 && Math.abs(x) < 6.2;
    if (front || r() < 0.18) {
      if (r() < (front ? 0.5 : 0.75)) {
        s.bushes[i % 2]!.push({
          x,
          y,
          z,
          s: front ? 0.5 + r() * 0.35 : 0.75 + r() * 0.5,
          ry: r() * 6,
          tint: greenTint(),
        });
        s.blobs.push({ x, y, z, r: 0.5 });
      }
      continue;
    }
    const sc = 0.78 + r() * 0.5;
    const item = { x, y, z, s: sc, ry: r() * 6, tint: greenTint() };
    if (i % 3 === 1) s.broads[i % 3]!.push(item);
    else s.pines[i % 3]!.push(item);
    s.blobs.push({ x, y, z, r: 0.95 * sc });
  }
  // Shrubs tucked at building corners anchor them to the ground.
  for (const b of DRY_BUILDINGS) {
    for (let k = 0; k < 2; k++) {
      const a = b.rot + (k ? 2.3 : -2.5) + (r() - 0.5) * 0.4;
      const x = b.x + Math.cos(a) * 1.55;
      const z = b.z + Math.sin(a) * 1.55;
      if (distToPath(x, z) < 0.6) continue;
      s.bushes[k]!.push({
        x,
        y: groundAt(x, z),
        z,
        s: 0.6 + r() * 0.35,
        ry: r() * 6,
        tint: greenTint(),
      });
      s.blobs.push({ x, z, r: 0.38 });
    }
  }

  // Flagstones: irregular size, turn and spacing, but a readable line.
  for (let i = 0; i < CHEF_PATH.length; i++) {
    const [x1, z1] = CHEF_PATH[i]!;
    const [x2, z2] = CHEF_PATH[(i + 1) % CHEF_PATH.length]!;
    const len = Math.hypot(x2 - x1, z2 - z1);
    const nx = -(z2 - z1) / len;
    const nz = (x2 - x1) / len;
    for (let t = 0.2; t < len; t += 0.5 + r() * 0.28) {
      const side = (r() - 0.5) * 0.28;
      const x = x1 + ((x2 - x1) * t) / len + nx * side;
      const z = z1 + ((z2 - z1) * t) / len + nz * side;
      const size = 0.19 + r() * 0.13;
      s.stones[Math.floor(r() * 3)]!.push({
        x,
        y: -0.01,
        z,
        s: [size, 0.34, size * (0.8 + r() * 0.3)],
        ry: r() * 6,
        tint: ['#ffffff', '#f3eee4', '#e8e2d6'][Math.floor(r() * 3)],
      });
      // Low grass in some gaps and along the path edge.
      if (r() < 0.45 * density) {
        const o = (r() < 0.5 ? -1 : 1) * (0.34 + r() * 0.16);
        s.tufts[0]!.push({ x: x + nx * o, y: 0, z: z + nz * o, s: 0.7 + r() * 0.5, ry: r() * 6 });
      }
    }
  }

  const tuftAt = (x: number, z: number, big = false) => {
    if (distToPath(x, z) < 0.3) return;
    s.tufts[big ? 1 : 0]!.push({
      x,
      y: groundAt(x, z),
      z,
      s: (big ? 0.9 : 0.7) + r() * 0.5,
      ry: r() * 6,
    });
  };
  // Along the plot fence line.
  const pb = plotBounds(9);
  for (let x = pb.minX; x <= pb.maxX; x += 0.55) {
    if (r() < 0.6 * density) tuftAt(x + (r() - 0.5) * 0.2, pb.minZ - 0.25);
    if (r() < 0.6 * density) tuftAt(x + (r() - 0.5) * 0.2, pb.maxZ + 0.25);
  }
  for (let z = pb.minZ; z <= pb.maxZ; z += 0.55) {
    if (r() < 0.6 * density) tuftAt(pb.minX - 0.25, z);
    if (r() < 0.6 * density) tuftAt(pb.maxX + 0.25, z);
  }
  // Around building feet.
  for (const b of DRY_BUILDINGS) {
    for (let k = 0; k < Math.round(7 * density); k++) {
      const a = r() * Math.PI * 2;
      const d = 1.25 + r() * 0.5;
      tuftAt(b.x + Math.cos(a) * d, b.z + Math.sin(a) * d, r() < 0.4);
    }
  }
  // Thick at the rim.
  for (let k = 0; k < Math.round(70 * density); k++) {
    const a = r() * Math.PI * 2;
    const d = edgeRadius(a) - 0.2 - r() * 0.7;
    tuftAt(Math.cos(a) * d, Math.sin(a) * d, r() < 0.5);
  }
  // A light sprinkle elsewhere so the lawn isn't bare.
  for (let k = 0; k < Math.round(50 * density); k++) {
    const a = r() * Math.PI * 2;
    const d = 2 + Math.sqrt(r()) * 5.5;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (x > pb.minX - 0.3 && x < pb.maxX + 0.3 && z > pb.minZ - 0.3 && z < pb.maxZ + 0.3) continue;
    if (nearBuilding(x, z, 1.2)) continue;
    tuftAt(x, z);
  }

  // Flowers: a handful of intentional groups, not a uniform sprinkle.
  const kinds = ['white', 'yellow', 'pink', 'purple'] as const;
  const groups: Vec2[] = [
    [6.2, -0.6],
    [-4.1, -1.2],
    [-3.6, 4.6],
    [1.2, 5.6],
    [-1.8, 5.9],
    [3.4, -4.5],
    [-6.6, 1.2],
    [6.6, 1.6],
    [-2.3, -4.9],
    [4.1, 5.0],
  ];
  groups.forEach(([gx, gz], gi) => {
    const n = 2 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const x = gx + (r() - 0.5) * 0.9;
      const z = gz + (r() - 0.5) * 0.7;
      if (distToPath(x, z) < 0.35 || nearBuilding(x, z, 1.3)) continue;
      s.flowers[kinds[(gi + (k === 2 ? 1 : 0)) % 4]!].push({
        x,
        y: groundAt(x, z),
        z,
        s: 0.85 + r() * 0.4,
        ry: r() * 6,
      });
    }
  });
  return s;
}

/** Far-off islets for depth; they never compete with the main island. */
function Islets() {
  const geo = useMemo(
    () =>
      prop('islet', (k) => {
        k.add(new CylinderGeometry(1, 0.95, 0.22, 11), C.grass, {
          at: [0, 0.11, 0],
          rough: 0.08,
          vary: 0.08,
        });
        k.add(new CylinderGeometry(0.95, 0.8, 0.35, 11), C.dirt, {
          at: [0, -0.16, 0],
          rough: 0.1,
          surf: 'soil',
        });
        k.add(new ConeGeometry(0.8, 2.2, 9, 3), C.rock, {
          rot: [Math.PI, 0, 0],
          at: [0, -1.4, 0],
          rough: 0.35,
          vary: 0.12,
        });
      }),
    [],
  );
  const matte = kitMaterial();
  const leafy = kitMaterial({ sway: 0.016 });
  const spots: [number, number, number, number, number][] = [
    [-19, -3.5, -9, 1.5, 0],
    [21, -5.2, 1, 1.15, 1],
    [-13, -7.5, 15, 0.8, 2],
  ];
  return (
    <group>
      {spots.map(([x, y, z, s, v]) => (
        <group key={v} position={[x, y, z]} scale={s}>
          <mesh geometry={geo} material={matte} />
          <mesh
            geometry={v === 1 ? broadleaf(v) : pine(v)}
            material={leafy}
            position={[0.1, 0.2, 0]}
            scale={0.6}
          />
          {v === 1 && (
            <mesh
              geometry={broadleafCards(v)}
              material={leafCardMaterial()}
              position={[0.1, 0.2, 0]}
              scale={0.6}
            />
          )}
        </group>
      ))}
    </group>
  );
}

/** Advances the shared wind clock that foliage shaders read. */
function Wind({ still }: { still: boolean }) {
  useFrame((_, dt) => {
    if (!still) wind.value += Math.min(dt, 0.1);
  });
  return null;
}

export function Island({ grass, reduced = false }: { grass: number; reduced?: boolean }) {
  const density = Math.max(0.35, grass / 160);
  const lawn = useMemo(() => lawnGeometry(), []);
  const skirt = useMemo(() => skirtGeometry(), []);
  const core = useMemo(() => coreGeometry(), []);
  const hang = useMemo(() => rimDanglers(), []);
  const rocks = useMemo(() => cliffRocks(), []);
  const scape = useMemo(() => landscape(density), [density]);
  const matte = kitMaterial();
  const leafy = kitMaterial({ sway: 0.016 });
  const grassy = kitMaterial({ sway: 0.09 });
  const cards = leafCardMaterial();

  return (
    <group>
      <Wind still={reduced} />
      <mesh geometry={lawn} material={matte} receiveShadow />
      <mesh geometry={skirt} material={matte} receiveShadow />
      <mesh geometry={core} material={matte} />
      <mesh geometry={hang} material={leafy} />
      {rocks.map((items, v) => (
        <Instances key={v} geometry={rock(v)} material={matte} items={items} />
      ))}
      {scape.stones.map((items, v) => (
        <Instances key={v} geometry={flagstone(v)} material={matte} items={items} receiveShadow />
      ))}
      <Blobs items={scape.blobs} />
      {scape.pines.map((items, v) => (
        <Instances key={v} geometry={pine(v)} material={leafy} items={items} castShadow />
      ))}
      {scape.broads.map((items, v) => (
        <group key={v}>
          <Instances geometry={broadleaf(v)} material={leafy} items={items} castShadow />
          <Instances geometry={broadleafCards(v)} material={cards} items={items} castShadow />
        </group>
      ))}
      {scape.bushes.map((items, v) => (
        <group key={v}>
          <Instances geometry={bush(v)} material={leafy} items={items} castShadow />
          <Instances geometry={bushCards(v)} material={cards} items={items} castShadow />
        </group>
      ))}
      {scape.tufts.map((items, v) => (
        <Instances key={v} geometry={tuft(v)} material={grassy} items={items} />
      ))}
      {(Object.keys(scape.flowers) as (keyof Scape['flowers'])[]).map((kind, v) => (
        <Instances
          key={kind}
          geometry={flowers(kind, v)}
          material={grassy}
          items={scape.flowers[kind]}
        />
      ))}
      <Islets />
    </group>
  );
}

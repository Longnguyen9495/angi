import { Geometry, calculateNormals, calculateTangents } from 'playcanvas';
import { GROUND, PALETTE, PATH_STONES, BARN, BED, type Vec3 } from '../sceneLayout';

/*
 * Procedural meshes for the placeholder corner: the grass disc with painted
 * zones, the island cliff, and a gable prism for the barn. Vertex colours
 * carry the large colour masses so no texture file is needed.
 */

/** Deterministic value noise so the ground looks the same on every load. */
function hash(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi);
  const b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1);
  const d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Irregular island rim radius at angle `t`. */
export function rimRadius(t: number): number {
  return GROUND.radius * (1 + 0.035 * Math.sin(3 * t + 0.6) + 0.022 * Math.sin(7 * t + 1.9));
}

/**
 * Mesh.fromGeometry stores colours as normalised bytes (setColors32): 0–255,
 * not 0–1. Vertex colours are read as linear, while the palette is sRGB, so
 * they are converted here — otherwise the grass renders washed out.
 */
function rgba8(c: readonly [number, number, number]): [number, number, number, number] {
  const b = (v: number) => Math.round(Math.min(1, Math.max(0, v)) ** 2.2 * 255);
  return [b(c[0]), b(c[1]), b(c[2]), 255];
}

function mix(a: Vec3, b: Vec3, t: number): [number, number, number] {
  const k = Math.min(1, Math.max(0, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

/** Distance to the worn line the path stones follow (for the dirt band). */
function pathDistance(x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < PATH_STONES.length - 1; i++) {
    const a = PATH_STONES[i]!;
    const b = PATH_STONES[i + 1]!;
    best = Math.min(best, distToSegment(x, z, a[0], a[1], b[0], b[1]));
  }
  return best;
}

/** Flat under the bed and the barn so both stand level; gentle swell elsewhere. */
function heightAt(x: number, z: number): number {
  const bedD = Math.max(Math.abs(x - BED.x) - 2.3, Math.abs(z - BED.z) - 2.1, 0);
  const barnD = Math.max(Math.hypot(x - BARN.x, z - BARN.z) - 1.9, 0);
  const flat = Math.min(1, Math.min(bedD, barnD) / 1.2);
  return (noise(x * 0.45, z * 0.45) - 0.5) * 0.18 * flat;
}

function groundColour(x: number, z: number): [number, number, number] {
  const n = noise(x * 0.35 + 10, z * 0.35 - 4);
  const fine = noise(x * 1.6, z * 1.6);
  let c = mix(PALETTE.grassDeep, PALETTE.grass, n * 1.3);
  c = mix(c, PALETTE.grassLight, (fine - 0.55) * 1.6);
  // Worn earth along the path and in front of the barn door.
  const worn = Math.max(
    1 - pathDistance(x, z) / 0.75,
    1 - Math.hypot(x - (BARN.x + 0.4), z - (BARN.z + 1.3)) / 1.3,
  );
  c = mix(c, PALETTE.worn, worn * (0.6 + 0.3 * fine));
  return c;
}

/**
 * Grass disc. Vertex colours are the palette divided by `base` (the colour the
 * material multiplies in: texture average × boost), so the lawn keeps the art
 * direction's greens whether or not the photo texture has loaded.
 */
export function groundGeometry(base: Vec3 = [1, 1, 1]): Geometry {
  const { rings, segments } = GROUND;
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rings; r++) {
    for (let s = 0; s < segments; s++) {
      const t = (s / segments) * Math.PI * 2;
      const k = r / rings;
      const rad = rimRadius(t) * k;
      const x = Math.cos(t) * rad;
      const z = Math.sin(t) * rad;
      // The rim rolls down slightly so the edge reads as soft turf, not a knife.
      // At the rim it meets the cliff's top band exactly (y = -0.12).
      const edge = k > 0.93 ? (k - 0.93) / 0.07 : 0;
      positions.push(x, heightAt(x, z) * (1 - edge) - edge * edge * 0.12, z);
      uvs.push(x / 2.2, z / 2.2);
      const c = groundColour(x, z);
      colors.push(...rgba8([c[0] / base[0], c[1] / base[1], c[2] / base[2]]));
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * segments + s;
      const b = r * segments + ((s + 1) % segments);
      const c = (r + 1) * segments + s;
      const d = (r + 1) * segments + ((s + 1) % segments);
      indices.push(a, b, c, b, d, c);
    }
  }
  const g = new Geometry();
  g.positions = positions;
  g.uvs = uvs;
  g.colors = colors;
  g.indices = indices;
  g.normals = calculateNormals(positions, indices);
  g.tangents = calculateTangents(positions, g.normals, uvs, indices);
  return g;
}

/** Soil band under the turf, then rock tapering to a point: the floating-island cliff. */
export function cliffGeometry(base: Vec3 = [1, 1, 1]): Geometry {
  const { segments, depth } = GROUND;
  // [radius factor, y, colour]
  const bands: [number, number, Vec3][] = [
    [1, -0.12, PALETTE.grassDeep],
    [1, -0.5, PALETTE.soil],
    [0.97, -0.95, PALETTE.cliff],
    [0.88, -depth, PALETTE.rock],
    [0.66, -depth - 0.5, PALETTE.cliff],
    [0.32, -depth - 1.3, PALETTE.soil],
    [0.02, -depth - 1.9, PALETTE.soil],
  ];
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  bands.forEach(([f, y, col], bi) => {
    for (let s = 0; s < segments; s++) {
      const t = (s / segments) * Math.PI * 2;
      const jag = bi >= 2 ? (noise(s * 0.7, bi * 3.1) - 0.5) * 0.35 : 0;
      const rad = rimRadius(t) * f + jag * f;
      const dy = bi >= 2 ? (noise(s * 0.4, bi) - 0.5) * 0.2 : 0;
      positions.push(Math.cos(t) * rad, y + dy, Math.sin(t) * rad);
      // Cylindrical mapping: ~2 m per texture repeat around and down the cliff.
      uvs.push((s / segments) * 20, (y + dy) / 2);
      const shade = 0.88 + noise(s * 0.9, bi * 1.7) * 0.2;
      colors.push(
        ...rgba8([
          (col[0] * shade) / base[0],
          (col[1] * shade) / base[1],
          (col[2] * shade) / base[2],
        ]),
      );
    }
  });
  for (let b = 0; b < bands.length - 1; b++) {
    for (let s = 0; s < segments; s++) {
      const a = b * segments + s;
      const n = b * segments + ((s + 1) % segments);
      const c = (b + 1) * segments + s;
      const d = (b + 1) * segments + ((s + 1) % segments);
      indices.push(a, n, c, n, d, c);
    }
  }
  const g = new Geometry();
  g.positions = positions;
  g.uvs = uvs;
  g.colors = colors;
  g.indices = indices;
  g.normals = calculateNormals(positions, indices);
  g.tangents = calculateTangents(positions, g.normals, uvs, indices);
  return g;
}

/**
 * Unit gable prism: triangle in the y/z plane (base z ∈ [-0.5, 0.5] at y = 0,
 * apex at y = 1), extruded along x ∈ [-0.5, 0.5]. Flat-shaded faces.
 */
export function prismGeometry(): Geometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const face = (pts: number[][]) => {
    const base = positions.length / 3;
    for (const p of pts) {
      positions.push(p[0]!, p[1]!, p[2]!);
      // Gable ends map z/y, slopes map x/y: boards run horizontally on both.
      const endFace =
        Math.abs(Math.abs(pts[0]![0]!) - 0.5) < 1e-6 && pts.every((q) => q[0] === pts[0]![0]);
      uvs.push(endFace ? p[2]! : p[0]!, p[1]!);
    }
    for (let i = 1; i < pts.length - 1; i++) indices.push(base, base + i, base + i + 1);
  };
  const L = -0.5;
  const R = 0.5;
  face([
    [R, 0, 0.5],
    [R, 0, -0.5],
    [R, 1, 0],
  ]);
  face([
    [L, 0, -0.5],
    [L, 0, 0.5],
    [L, 1, 0],
  ]);
  face([
    [L, 0, 0.5],
    [R, 0, 0.5],
    [R, 1, 0],
    [L, 1, 0],
  ]);
  face([
    [R, 0, -0.5],
    [L, 0, -0.5],
    [L, 1, 0],
    [R, 1, 0],
  ]);
  const g = new Geometry();
  g.positions = positions;
  g.uvs = uvs;
  g.indices = indices;
  g.normals = calculateNormals(positions, indices);
  g.tangents = calculateTangents(positions, g.normals, uvs, indices);
  return g;
}

/** Ground height the props should sit on (matches the grass mesh). */
export { heightAt as groundHeight };

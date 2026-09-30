/* Original mesh authorship: Zoo / angi asset task, 2026. CC0-1.0.
 * Offline only; node built-ins, no runtime dependency. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const out = resolve(fileURLToPath(new URL('../public/models/farm/', import.meta.url)));
mkdirSync(resolve(out, 'crops'), { recursive: true });
const species = [
  'rice',
  'herbs',
  'chili',
  'scallion',
  'bean',
  'tomato',
  'lemongrass',
  'garlic',
  'cucumber',
  'lime',
];
const stages = ['sprout', 'young', 'flowering', 'ready'];
const palette = [
  [142, 94, 49],
  [186, 78, 43],
  [114, 105, 87],
  [79, 52, 32],
  [94, 137, 49],
  [155, 175, 70],
  [235, 216, 142],
  [193, 49, 30],
];
function crc(b) {
  let c = 0xffffffff;
  for (const x of b) {
    c ^= x;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type),
    n = Buffer.alloc(4),
    c = Buffer.alloc(4);
  n.writeUInt32BE(data.length);
  c.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([n, t, data, c]);
}
// Hand-authored raster motifs: wood grain, overlapping tile courses, stone speckles,
// soil furrows, leaf vein stripes. No downloaded or generated-image source.
const pixels = Buffer.alloc(512 * (512 * 4 + 1));
for (let y = 0; y < 512; y++)
  for (let x = 0; x < 512; x++) {
    const k = Math.floor(x / 128) + 4 * Math.floor(y / 256),
      p = palette[k];
    const noise = ((x * 17 + y * 31 + ((x * y) % 23)) % 13) - 6;
    let motif = noise;
    if (k === 0) motif += Math.sin(y * 0.18 + Math.sin(x * 0.04) * 3) * 12;
    if (k === 1) motif -= y % 32 < 3 || (x + Math.floor(y / 32) * 16) % 32 < 2 ? 28 : 0;
    if (k === 3) motif += Math.sin(y * 0.13) * 9;
    if (k === 4 || k === 5) motif += x % 32 < 2 ? 18 : Math.sin(y * 0.1 + x * 0.2) * 5;
    const o = y * 2049 + 1 + x * 4;
    for (let j = 0; j < 3; j++) pixels[o + j] = Math.max(0, Math.min(255, p[j] + motif));
    pixels[o + 3] = 255;
  }
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(512);
ihdr.writeUInt32BE(512, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const atlas = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(pixels, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
writeFileSync(resolve(out, 'farm-atlas.png'), atlas);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a) => {
  const l = Math.hypot(...a);
  return a.map((v) => v / (l || 1));
};
class Mesh {
  constructor(name, translation) {
    this.name = name;
    this.translation = translation;
    this.p = [];
    this.n = [];
    this.uv = [];
  }
  tri(a, b, c, k = 0) {
    const n = unit(cross(sub(b, a), sub(c, a)));
    for (const [i, v] of [a, b, c].entries()) {
      this.p.push(...v);
      this.n.push(...n);
      this.uv.push(
        ((k % 4) + [0.08, 0.92, 0.5][i]) / 4,
        (Math.floor(k / 4) + [0.08, 0.08, 0.92][i]) / 2,
      );
    }
  }
  quad(a, b, c, d, k) {
    this.tri(a, b, c, k);
    this.tri(a, c, d, k);
  }
  box(x, y, z, w, h, d, k = 0) {
    const a = [x - w / 2, y, z - d / 2],
      b = [x + w / 2, y, z - d / 2],
      c = [x + w / 2, y + h, z - d / 2],
      e = [x - w / 2, y + h, z - d / 2];
    const f = [x - w / 2, y, z + d / 2],
      g = [x + w / 2, y, z + d / 2],
      j = [x + w / 2, y + h, z + d / 2],
      l = [x - w / 2, y + h, z + d / 2];
    this.quad(a, e, c, b, k);
    this.quad(f, g, j, l, k);
    this.quad(a, f, l, e, k);
    this.quad(b, c, j, g, k);
    this.quad(e, l, j, c, k);
    this.quad(a, b, g, f, k);
  }
  tube(points, radii, k = 0, sides = 6) {
    const rings = points.map((p, i) => {
      const axis = unit(
        sub(points[Math.min(i + 1, points.length - 1)], points[Math.max(0, i - 1)]),
      );
      const u = unit(cross(axis, Math.abs(axis[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])),
        v = cross(axis, u);
      return Array.from({ length: sides }, (_, j) =>
        p.map(
          (x, q) =>
            x +
            radii[i] *
              (u[q] * Math.cos((j * 2 * Math.PI) / sides) +
                v[q] * Math.sin((j * 2 * Math.PI) / sides)),
        ),
      );
    });
    for (let i = 0; i < rings.length - 1; i++)
      for (let j = 0; j < sides; j++)
        this.quad(
          rings[i][j],
          rings[i][(j + 1) % sides],
          rings[i + 1][(j + 1) % sides],
          rings[i + 1][j],
          k,
        );
    for (let j = 0; j < sides; j++) {
      this.tri(points[0], rings[0][(j + 1) % sides], rings[0][j], k);
      this.tri(points.at(-1), rings.at(-1)[j], rings.at(-1)[(j + 1) % sides], k);
    }
  }
  leaf(base, angle, length, width, k = 4, droop = 0.12) {
    const dx = Math.cos(angle),
      dz = Math.sin(angle),
      side = [-dz, 0, dx];
    const tip = [base[0] + dx * length, base[1] + length * 0.55 - droop, base[2] + dz * length];
    const mid = [
      base[0] + dx * length * 0.48,
      base[1] + length * 0.34,
      base[2] + dz * length * 0.48,
    ];
    const l = mid.map((v, i) => v + side[i] * width),
      r = mid.map((v, i) => v - side[i] * width),
      ridge = [mid[0], mid[1] + width * 0.35, mid[2]];
    this.tri(base, l, ridge, k);
    this.tri(l, tip, ridge, k);
    this.tri(tip, r, ridge, k);
    this.tri(r, base, ridge, k);
  }
  fruit(p, r, k = 7, stretch = 1) {
    this.tube(
      [
        [p[0], p[1] - r * stretch, p[2]],
        [p[0], p[1] - r * 0.5 * stretch, p[2]],
        [p[0], p[1] + r * 0.5 * stretch, p[2]],
        [p[0], p[1] + r * stretch, p[2]],
      ],
      [0.012, r, r, 0.006],
      k,
      7,
    );
  }
}
const records = [];
function save(name, meshes, budget, extras = {}) {
  const doc = {
    asset: {
      version: '2.0',
      generator: 'angi original deterministic mesh authoring / Zoo',
      copyright: 'CC0-1.0',
    },
    scene: 0,
    scenes: [{ nodes: meshes.map((_, i) => i) }],
    nodes: [],
    meshes: [],
    accessors: [],
    bufferViews: [],
    buffers: [],
    images: [],
    textures: [{ source: 0, sampler: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9729, wrapS: 33071, wrapT: 33071 }],
    materials: [
      {
        name: 'original-painted-atlas',
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0,
          roughnessFactor: 0.88,
        },
      },
    ],
    extras: {
      units: 'metres',
      up: '+Y',
      front: '+Z',
      license: 'CC0-1.0',
      artApproved: false,
      ...extras,
    },
  };
  const bins = [];
  let bytes = 0;
  function view(data, target) {
    const b = Buffer.from(
      data.buffer ?? data,
      data.byteOffset ?? 0,
      data.byteLength ?? data.length,
    );
    const padded = Buffer.alloc(Math.ceil(b.length / 4) * 4);
    b.copy(padded);
    const index = doc.bufferViews.length;
    doc.bufferViews.push({
      buffer: 0,
      byteOffset: bytes,
      byteLength: b.length,
      ...(target ? { target } : {}),
    });
    bins.push(padded);
    bytes += padded.length;
    return index;
  }
  function accessor(values, type) {
    const arr = new Float32Array(values),
      count = values.length / (type === 'VEC3' ? 3 : 2);
    const a = { bufferView: view(arr, 34962), componentType: 5126, count, type };
    if (type === 'VEC3') {
      a.min = [0, 1, 2].map((i) => Math.min(...values.filter((_, j) => j % 3 === i)));
      a.max = [0, 1, 2].map((i) => Math.max(...values.filter((_, j) => j % 3 === i)));
    }
    doc.accessors.push(a);
    return doc.accessors.length - 1;
  }
  for (const m of meshes) {
    doc.nodes.push({
      name: m.name,
      mesh: doc.meshes.length,
      ...(m.translation ? { translation: m.translation } : {}),
    });
    doc.meshes.push({
      name: m.name,
      primitives: [
        {
          attributes: {
            POSITION: accessor(m.p, 'VEC3'),
            NORMAL: accessor(m.n, 'VEC3'),
            TEXCOORD_0: accessor(m.uv, 'VEC2'),
          },
          material: 0,
          mode: 4,
        },
      ],
    });
  }
  doc.images.push({ bufferView: view(atlas), mimeType: 'image/png' });
  doc.buffers.push({ byteLength: bytes });
  const json = Buffer.from(JSON.stringify(doc));
  const jp = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32);
  json.copy(jp);
  const bin = Buffer.concat(bins);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + jp.length + bin.length, 8);
  header.writeUInt32LE(jp.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(bin.length);
  bh.writeUInt32LE(0x004e4942, 4);
  const glb = Buffer.concat([header, jp, bh, bin]);
  const triangles = meshes.reduce((s, m) => s + m.p.length / 9, 0);
  if (triangles > budget) throw Error(`${name}: ${triangles} > ${budget}`);
  writeFileSync(resolve(out, `${name}.glb`), glb);
  records.push({ file: `${name}.glb`, triangles, bytes: glb.length, budget });
}
// Barn: individual boards, gables, curved tile courses, thick roof edges, stone footing.
const barn = new Mesh('barn-body');
for (let i = 0; i < 14; i++) {
  const x = -1.21 + i * 0.186;
  barn.box(x, 0.16, -0.98, 0.174, 1.4, 0.08);
  if (Math.abs(x) > 0.47) barn.box(x, 0.16, 0.98, 0.174, 1.4, 0.08);
}
for (const x of [-1.27, 1.27])
  for (let i = 0; i < 11; i++) barn.box(x, 0.16, -0.91 + i * 0.182, 0.08, 1.4, 0.17);
for (const z of [-1, 1]) {
  barn.tri([-1.3, 1.55, z], [1.3, 1.55, z], [0, 2.6, z], 0);
  barn.box(0, 1.5, z, 2.7, 0.12, 0.14);
}
for (const x of [-1.3, 1.3]) for (const z of [-1, 1]) barn.box(x, 0.1, z, 0.14, 1.53, 0.14);
for (let side of [-1, 1])
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 9; col++) {
      const x = side * (row * 0.24 + 0.09),
        y = 2.64 - Math.abs(x) * 0.79,
        z = -1.17 + col * 0.28;
      const pts = Array.from({ length: 5 }, (_, j) => [
        x + side * (j - 2) * 0.064,
        y - side * (side * (j - 2) * 0.064) * 0.79 + Math.sin((j * Math.PI) / 4) * 0.04,
        z,
      ]);
      for (let j = 0; j < 4; j++)
        barn.quad(
          pts[j],
          pts[j + 1],
          [pts[j + 1][0], pts[j + 1][1] - 0.035, z + 0.3],
          [pts[j][0], pts[j][1] - 0.035, z + 0.3],
          1,
        );
    }
barn.tube(
  [
    [0, 2.65, -1.25],
    [0, 2.65, 1.3],
  ],
  [0.1, 0.1],
  1,
  8,
);
for (let i = 0; i < 12; i++) barn.box(-1.22 + i * 0.22, 0, 1, 0.21, 0.16, 0.25, 2);
for (const x of [-1.27, 1.27])
  for (let i = 0; i < 9; i++) barn.box(x, 0, -0.9 + i * 0.23, 0.23, 0.16, 0.22, 2);
barn.box(0, 1.7, 1.09, 0.82, 0.24, 0.06, 0);
for (let i = 0; i < 5; i++) barn.box(-0.28 + i * 0.14, 1.76, 1.13, 0.05, 0.12, 0.02, 6);
const door = new Mesh('barn-door', [-0.45, 0.16, 1.06]);
for (let i = 0; i < 5; i++) door.box(0.085 + i * 0.18, 0, 0, 0.17, 1.24, 0.07, 0);
door.box(0.45, 0.14, 0.05, 0.87, 0.08, 0.06);
door.box(0.45, 1.03, 0.05, 0.87, 0.08, 0.06);
door.tube(
  [
    [0.08, 0.2, 0.09],
    [0.8, 1.02, 0.09],
  ],
  [0.045, 0.045],
  0,
  4,
);
door.box(0.77, 0.58, 0.09, 0.04, 0.08, 0.04, 2);
save('barn', [barn, door], 6000, {
  doorPivot: 'barn-door local x=0 is left edge; translation [-0.45,0.16,1.06]',
});
const tree = new Mesh('tree-trunk');
tree.tube(
  [
    [0, 0, 0],
    [0.08, 0.65, 0.04],
    [-0.08, 1.35, 0],
    [0.12, 2.05, 0.05],
  ],
  [0.2, 0.16, 0.11, 0.04],
  0,
  9,
);
const crowns = [
  [-0.73, 1.85, 0.05],
  [0.65, 1.92, 0.12],
  [-0.1, 2.5, -0.2],
  [-0.37, 2.12, -0.65],
  [0.35, 2.23, 0.66],
];
const foliage = crowns.map((p, i) => {
  tree.tube([[0, 0.9, 0], [p[0] * 0.5, p[1] - 0.45, p[2] * 0.5], p], [0.09, 0.055, 0.015], 0, 6);
  const m = new Mesh(`leaf-cluster-${i + 1}`);
  for (let j = 0; j < 22; j++) {
    const a = j * 2.399 + i,
      r = 0.18 + (0.3 * ((j * 7) % 11)) / 11;
    const base = [p[0] + Math.cos(a) * r, p[1] + Math.sin(j * 1.7) * 0.24, p[2] + Math.sin(a) * r];
    m.leaf(base, a, 0.35 + 0.12 * (j % 3), 0.13, j % 3 ? 4 : 5, 0.15);
  }
  return m;
});
for (let i = 0; i < 5; i++) {
  const a = i * 1.256;
  tree.tube(
    [
      [Math.cos(a) * 0.4, 0.025, Math.sin(a) * 0.4],
      [0, 0.27, 0],
    ],
    [0.065, 0.12],
    0,
    5,
  );
}
save('tree-broadleaf', [tree, ...foliage], 4000, { leafClusters: 5 });
const bed = new Mesh('bed-frame-soil');
for (const z of [-1.86, 1.86]) {
  bed.box(0, 0.03, z, 3.88, 0.27, 0.16);
  bed.box(0, 0.16, z + 0.01, 3.9, 0.05, 0.18);
}
for (const x of [-1.86, 1.86]) bed.box(x, 0.03, 0, 0.16, 0.27, 3.72);
for (const x of [-1.86, 1.86]) for (const z of [-1.86, 1.86]) bed.box(x, 0, z, 0.21, 0.4, 0.21);
for (let row = 0; row < 3; row++)
  for (let col = 0; col < 3; col++) {
    const cx = (col - 1) * 1.14,
      cz = (row - 1) * 1.14;
    for (let j = 0; j < 5; j++) {
      const z = cz - 0.5 + j * 0.2;
      bed.quad(
        [cx - 0.5, 0.19, z],
        [cx + 0.5, 0.19, z],
        [cx + 0.5, 0.24, z + 0.09],
        [cx - 0.5, 0.24, z + 0.09],
        3,
      );
      bed.quad(
        [cx - 0.5, 0.24, z + 0.09],
        [cx + 0.5, 0.24, z + 0.09],
        [cx + 0.5, 0.19, z + 0.2],
        [cx - 0.5, 0.19, z + 0.2],
        3,
      );
    }
  }
save('bed', [bed], 2500, { plots: 9, cropsIncluded: false, dimensions: [3.98, 0.4, 3.98] });
const path = new Mesh('path-stones');
const stones = [
  [-1, 5, 0.36],
  [-1.45, 4.25, 0.3],
  [-1.95, 3.45, 0.34],
  [-2.25, 2.55, 0.29],
  [-2.35, 1.6, 0.33],
  [-2.25, 0.7, 0.3],
  [-2.1, -0.2, 0.35],
  [-2.1, -0.78, 0.28],
];
for (const [i, [x, z, r]] of stones.entries()) {
  const ring = Array.from({ length: 7 }, (_, j) => {
    const a = (j * Math.PI * 2) / 7 + i * 0.41;
    return [
      x + Math.cos(a) * r * (1 + 0.13 * Math.sin(j * 5 + i)),
      0.09 + 0.018 * Math.sin(j + i),
      z + Math.sin(a) * r * 0.8,
    ];
  });
  for (let j = 0; j < 7; j++) {
    path.tri([x, 0.115, z], ring[j], ring[(j + 1) % 7], 2);
    path.quad(
      ring[j],
      [ring[j][0], 0, ring[j][2]],
      [ring[(j + 1) % 7][0], 0, ring[(j + 1) % 7][2]],
      ring[(j + 1) % 7],
      2,
    );
  }
}
save('path-stones', [path], 1200, {
  space: 'world coordinates matching PATH_STONES; eighth stone towards barn',
});
for (const sp of species)
  for (const [s, stage] of stages.entries()) {
    const m = new Mesh(`crop-${sp}-${stage}`),
      h = [0.16, 0.38, 0.65, 0.82][s];
    if (['rice', 'scallion', 'lemongrass', 'garlic'].includes(sp)) {
      const blades = s === 0 ? 3 : sp === 'lemongrass' ? 13 : 9;
      for (let j = 0; j < blades; j++) {
        const a = j * 2.399,
          base = [Math.cos(a) * 0.055, 0, Math.sin(a) * 0.055];
        m.leaf(
          base,
          a,
          h * (0.7 + (j % 3) * 0.15),
          sp === 'garlic' ? 0.032 : 0.016,
          j % 2 ? 4 : 5,
          -h * 0.24,
        );
      }
      if (sp === 'rice' && s >= 2)
        for (let j = 0; j < 3; j++) {
          const x = (j - 1) * 0.1;
          m.tube(
            [
              [x, 0, 0],
              [x, h, 0],
              [x + 0.12, h - 0.05, 0],
            ],
            [0.012, 0.008, 0.004],
            4,
            4,
          );
          for (let q = 0; q < 3; q++)
            m.fruit([x + q * 0.04, h - q * 0.03, 0.015], 0.018, s === 3 ? 6 : 5, 1.5);
        }
      if (['garlic', 'scallion'].includes(sp) && s >= 2) {
        m.tube(
          [
            [0, 0, 0],
            [0, h * 1.15, 0],
          ],
          [0.013, 0.009],
          4,
          5,
        );
        for (let j = 0; j < 6; j++)
          m.fruit([Math.cos(j) * 0.035, h * 1.15, Math.sin(j) * 0.035], 0.024, 6);
      }
      if (sp === 'garlic' && s === 3)
        for (let j = 0; j < 5; j++)
          m.fruit([Math.cos(j) * 0.025, 0.05, Math.sin(j) * 0.025], 0.035, 6, 1.4);
    } else {
      const vine = ['bean', 'cucumber'].includes(sp),
        herb = sp === 'herbs';
      const count = s === 0 ? 1 : herb ? 4 : 3;
      if (vine && s > 0) {
        m.tube(
          [
            [-0.16, 0, 0],
            [-0.12, h + 0.14, 0],
          ],
          [0.018, 0.013],
          0,
          5,
        );
        m.tube(
          [
            [0.17, 0, 0],
            [0.13, h + 0.14, 0],
          ],
          [0.018, 0.013],
          0,
          5,
        );
      }
      for (let b = 0; b < count; b++) {
        const a = b * 2.399,
          x = Math.cos(a) * 0.08,
          z = Math.sin(a) * 0.08;
        const top = [x + Math.cos(a) * h * 0.16, h * (1 - b * 0.07), z + Math.sin(a) * h * 0.16];
        m.tube(
          [[x, 0, z], [x, h * 0.5, z], top],
          [sp === 'lime' ? 0.028 : 0.014, 0.012, 0.004],
          4,
          5,
        );
        const leaves = s === 0 ? 2 : herb ? 5 : 6;
        for (let j = 0; j < leaves; j++) {
          const base = [x + ((top[0] - x) * j) / leaves, h * (0.22 + j * 0.1), z];
          m.leaf(
            base,
            a + j * 2.4,
            h * (herb ? 0.36 : 0.43),
            h * (sp === 'cucumber' ? 0.16 : sp === 'herbs' ? 0.09 : 0.085),
            j % 3 ? 4 : 5,
            0.06,
          );
        }
        if (s >= 2) {
          const p = [top[0] + 0.065, top[1] - 0.08, top[2] + 0.045];
          if (s === 2 || herb) {
            for (let j = 0; j < 5; j++) m.leaf(p, j * 1.256, 0.055, 0.023, 6, 0.025);
          } else if (sp === 'chili') {
            m.tube(
              [p, [p[0] + 0.015, p[1] - 0.1, p[2]], [p[0] + 0.06, p[1] - 0.19, p[2]]],
              [0.024, 0.028, 0.002],
              7,
              6,
            );
          } else if (sp === 'bean' || sp === 'cucumber') {
            m.tube(
              [p, [p[0] + 0.04, p[1] - 0.13, p[2]], [p[0] + 0.08, p[1] - 0.22, p[2]]],
              [0.016, sp === 'cucumber' ? 0.045 : 0.025, 0.004],
              5,
              6,
            );
          } else m.fruit(p, sp === 'lime' ? 0.065 : 0.075, sp === 'lime' ? 5 : 7);
        }
      }
    }
    save(`crops/crop-${sp}-${stage}`, [m], 800, { species: sp, stage });
  }
writeFileSync(
  resolve(out, 'metrics.json'),
  JSON.stringify(
    {
      generator: 'scripts/generate-farm-models.mjs',
      atlas: { width: 512, height: 512, bytes: atlas.length },
      files: records,
      totalBytes: records.reduce((s, r) => s + r.bytes, 0),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Wrote ${records.length} GLBs; ${records.reduce((s, r) => s + r.bytes, 0)} bytes; crop max ${Math.max(...records.filter((r) => r.file.startsWith('crops/')).map((r) => r.triangles))} triangles.`,
);

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// Node cannot decode browser images; this plugin skips textures only, retaining real geometry parsing.
const loader = new GLTFLoader();
loader.register(() => ({ name: 'offline-image-skip', loadTexture: () => Promise.resolve(null) }));
const root = fileURLToPath(new URL('../public/models/farm/', import.meta.url));
const crops = [
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
const names = crops.flatMap((c) => stages.map((s) => `crop-${c}-${s}.glb`));
assert.deepEqual(readdirSync(resolve(root, 'crops')).sort(), names.sort());
const metrics = JSON.parse(readFileSync(resolve(root, 'metrics.json'), 'utf8'));
assert.equal(metrics.files.length, 44);
const hashes = [];
let total = 0;
for (const record of metrics.files) {
  const b = readFileSync(resolve(root, record.file));
  hashes.push(createHash('sha256').update(b).digest('hex'));
  assert.equal(b.readUInt32LE(0), 0x46546c67);
  assert.equal(b.readUInt32LE(4), 2);
  assert.equal(b.readUInt32LE(8), b.length);
  const jl = b.readUInt32LE(12),
    doc = JSON.parse(b.subarray(20, 20 + jl).toString());
  assert.equal(b.readUInt32LE(24 + jl), 0x004e4942);
  const bin = b.subarray(28 + jl);
  assert.equal(bin.length, doc.buffers[0].byteLength);
  for (const view of doc.bufferViews) assert.ok(view.byteOffset + view.byteLength <= bin.length);
  let tris = 0;
  for (const mesh of doc.meshes)
    for (const primitive of mesh.primitives) {
      assert.equal(primitive.mode, 4);
      const a = doc.accessors[primitive.attributes.POSITION];
      tris +=
        (primitive.indices === undefined ? a.count : doc.accessors[primitive.indices].count) / 3;
      assert.ok(a.count > 0 && a.count % 3 === 0);
      const v = doc.bufferViews[a.bufferView];
      for (let i = 0; i < a.count * 3; i++)
        assert.ok(Number.isFinite(bin.readFloatLE(v.byteOffset + i * 4)));
      for (const id of Object.values(primitive.attributes)) {
        const ac = doc.accessors[id],
          vi = doc.bufferViews[ac.bufferView];
        assert.equal(ac.count, a.count);
        assert.equal(vi.byteLength, ac.count * (ac.type === 'VEC3' ? 3 : 2) * 4);
      }
    }
  const budget = record.file.startsWith('crops/')
    ? 800
    : { 'barn.glb': 6000, 'tree-broadleaf.glb': 4000, 'bed.glb': 2500, 'path-stones.glb': 1200 }[
        record.file
      ];
  assert.ok(tris <= budget, `${record.file}: ${tris}`);
  assert.equal(tris, record.triangles);
  assert.equal(b.length, record.bytes);
  assert.equal(doc.extras.artApproved, false);
  assert.equal(doc.extras.license, 'CC0-1.0');
  const image = doc.bufferViews[doc.images[0].bufferView];
  const png = bin.subarray(image.byteOffset, image.byteOffset + image.byteLength);
  assert.equal(png.readUInt32BE(16), 512);
  assert.equal(png.readUInt32BE(20), 512);
  if (record.file === 'barn.glb') {
    const door = doc.nodes.find((n) => n.name === 'barn-door');
    assert.deepEqual(door.translation, [-0.45, 0.16, 1.06]);
    const ac = doc.accessors[doc.meshes[door.mesh].primitives[0].attributes.POSITION];
    assert.ok(Math.abs(ac.min[0]) < 1e-6);
  }
  if (record.file === 'tree-broadleaf.glb')
    assert.equal(doc.nodes.filter((n) => n.name.startsWith('leaf-cluster-')).length, 5);
  if (record.file === 'bed.glb') assert.equal(doc.extras.cropsIncluded, false);
  const loaded = await loader.parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    '',
  );
  let loadedTris = 0;
  loaded.scene.traverse((o) => {
    if (o.isMesh)
      loadedTris += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
  });
  assert.equal(loadedTris, tris);
  total += b.length;
  console.log(`${record.file}: ${tris}/${budget} tris, ${b.length} bytes; glTF parsed`);
}
assert.equal(total, metrics.totalBytes);
execFileSync(
  process.execPath,
  [fileURLToPath(new URL('./generate-farm-models.mjs', import.meta.url))],
  { stdio: 'pipe' },
);
metrics.files.forEach((r, i) =>
  assert.equal(
    createHash('sha256')
      .update(readFileSync(resolve(root, r.file)))
      .digest('hex'),
    hashes[i],
  ),
);
console.log(
  `PASS: 44 GLBs, exact 40 crop names, budgets, binary structure, embedded 512 atlas, door pivot, five leaf clusters, Three GLTFLoader geometry import and deterministic SHA256. Total ${total} bytes.`,
);

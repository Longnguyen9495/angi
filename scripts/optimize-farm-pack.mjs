import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

// Standard glTF external PNG; no optional texture extension or engine change.
// Keep originals intact. All image bufferViews must be trailing and unreferenced
// by geometry before removing them.
const source = 'public/models/farm';
const output = 'public/models/farm/optimized';
const metrics = JSON.parse(await readFile(join(source, 'metrics.json'), 'utf8'));
console.log('Original metrics shape', Object.keys(metrics));
const { readdir } = await import('node:fs/promises');
const files = (await readdir(source)).filter((f) => f.endsWith('.glb'));
for (const f of await readdir(join(source, 'crops'))) {
  if (f.endsWith('.glb')) files.push(`crops/${f}`);
}
await mkdir(output, { recursive: true });
await writeFile(join(output, 'farm-atlas.png'), await readFile(join(source, 'farm-atlas.png')));
const results = [];
for (const file of files) {
  const original = await readFile(join(source, file));
  const jsonLength = original.readUInt32LE(12);
  const document = JSON.parse(original.subarray(20, 20 + jsonLength).toString());
  const binaryOffset = 20 + jsonLength + 8;
  const imageViews = document.images.map((image) => image.bufferView);
  if (imageViews.length !== 1 || imageViews[0] !== document.bufferViews.length - 1) {
    throw new Error(`Image is not a single trailing bufferView: ${file}`);
  }
  const index = imageViews[0];
  for (const accessor of document.accessors) {
    if (accessor.bufferView === index) throw new Error(`Geometry references image: ${file}`);
  }
  const end = document.bufferViews[index].byteOffset;
  document.bufferViews.pop();
  document.images = [{ uri: file.includes('/') ? '../farm-atlas.png' : 'farm-atlas.png' }];
  document.buffers[0].byteLength = end;
  const text = Buffer.from(JSON.stringify(document));
  const json = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32);
  text.copy(json);
  const bin = Buffer.alloc(Math.ceil(end / 4) * 4);
  original.subarray(binaryOffset, binaryOffset + end).copy(bin);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + json.length + bin.length, 8);
  header.writeUInt32LE(json.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  const target = join(output, file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, Buffer.concat([header, json, binHeader, bin]));
  results.push({ file, originalBytes: original.length, bytes: (await stat(target)).size });
}
const atlasBytes = (await stat(join(output, 'farm-atlas.png'))).size;
const report = {
  format: 'GLB geometry with one shared external PNG (standard glTF 2.0)',
  editorImportVerified: false,
  files: results,
  atlasBytes,
  originalGlbBytes: results.reduce((n, f) => n + f.originalBytes, 0),
  optimizedGlbBytes: results.reduce((n, f) => n + f.bytes, 0),
  totalBytes: atlasBytes + results.reduce((n, f) => n + f.bytes, 0),
};
await writeFile(join(output, 'metrics.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, files: results.length }, null, 2));

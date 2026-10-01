import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * Shrinks exported garden GLBs with KHR_mesh_quantization (glTF 2.0 extension,
 * supported by the PlayCanvas engine): positions as normalized int16 with the
 * range moved into the node transform, normals as int16 (int8 bends normals of
 * flat meshes by several degrees), colours as uint8 RGBA (values above 1 clamp).
 * About 20 instead of 36 bytes per vertex; indices and UVs are copied as is.
 * Only meshes on identity nodes are touched (the exporter's output).
 *
 * Run: node scripts/quantize-glb.mjs <dir-or-file>...
 */

function parse(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const binStart = 20 + jsonLen + 8;
  const bin = buf.subarray(binStart, binStart + buf.readUInt32LE(20 + jsonLen));
  return { json, bin };
}

const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const TYPED = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array,
};

/** Accessor contents as plain numbers (handles byteStride). */
function read(json, bin, index) {
  const a = json.accessors[index];
  const view = json.bufferViews[a.bufferView];
  const T = TYPED[a.componentType];
  const n = SIZE[a.type];
  const stride = view.byteStride ?? n * T.BYTES_PER_ELEMENT;
  const base = (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const out = new Array(a.count * n);
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const get = {
    5120: (o) => dv.getInt8(o),
    5121: (o) => dv.getUint8(o),
    5122: (o) => dv.getInt16(o, true),
    5123: (o) => dv.getUint16(o, true),
    5125: (o) => dv.getUint32(o, true),
    5126: (o) => dv.getFloat32(o, true),
  }[a.componentType];
  for (let i = 0; i < a.count; i++)
    for (let k = 0; k < n; k++) out[i * n + k] = get(base + i * stride + k * T.BYTES_PER_ELEMENT);
  return out;
}

function quantize(buf) {
  const { json, bin } = parse(buf);
  const chunks = [];
  let length = 0;
  const views = [];
  /** Appends bytes as a new 4-byte aligned bufferView; returns its index. */
  const push = (bytes, extra = {}) => {
    const pad = (4 - (length % 4)) % 4;
    if (pad) {
      chunks.push(Buffer.alloc(pad));
      length += pad;
    }
    views.push({ buffer: 0, byteOffset: length, byteLength: bytes.length, ...extra });
    chunks.push(bytes);
    length += bytes.length;
    return views.length - 1;
  };
  const accessors = [];
  const remap = new Map();
  /** Copies an accessor unchanged into the new binary. */
  const copy = (index) => {
    if (remap.has(index)) return remap.get(index);
    const a = json.accessors[index];
    const T = TYPED[a.componentType];
    const data = Buffer.from(new T(read(json, bin, index)).buffer);
    const target = json.bufferViews[a.bufferView].target;
    const bv = push(data, target ? { target } : {});
    accessors.push({ ...a, bufferView: bv, byteOffset: 0 });
    remap.set(index, accessors.length - 1);
    return accessors.length - 1;
  };

  const meshNodes = new Map();
  for (const node of json.nodes ?? [])
    if (node.mesh !== undefined)
      meshNodes.set(node.mesh, [...(meshNodes.get(node.mesh) ?? []), node]);

  for (const [m, mesh] of json.meshes.entries()) {
    const nodes = meshNodes.get(m) ?? [];
    const identity =
      nodes.length === 1 &&
      !nodes[0].matrix &&
      !nodes[0].translation &&
      !nodes[0].rotation &&
      !nodes[0].scale;
    // Mesh-wide position range (all primitives share the node's dequantization).
    let lo = [Infinity, Infinity, Infinity];
    let hi = [-Infinity, -Infinity, -Infinity];
    for (const p of mesh.primitives) {
      const a = json.accessors[p.attributes.POSITION];
      lo = lo.map((v, k) => Math.min(v, a.min[k]));
      hi = hi.map((v, k) => Math.max(v, a.max[k]));
    }
    const center = lo.map((v, k) => (v + hi[k]) / 2);
    const scale = lo.map((v, k) => Math.max((hi[k] - v) / 2, 1e-6));
    for (const p of mesh.primitives) {
      const attrs = {};
      for (const [name, index] of Object.entries(p.attributes)) {
        const a = json.accessors[index];
        if (identity && name === 'POSITION' && a.componentType === 5126) {
          const v = read(json, bin, index);
          const q = new Int16Array(a.count * 4);
          for (let i = 0; i < a.count; i++)
            for (let k = 0; k < 3; k++)
              q[i * 4 + k] = Math.round(((v[i * 3 + k] - center[k]) / scale[k]) * 32767);
          const qmin = [32767, 32767, 32767];
          const qmax = [-32767, -32767, -32767];
          for (let i = 0; i < a.count; i++)
            for (let k = 0; k < 3; k++) {
              qmin[k] = Math.min(qmin[k], q[i * 4 + k]);
              qmax[k] = Math.max(qmax[k], q[i * 4 + k]);
            }
          const bv = push(Buffer.from(q.buffer), { byteStride: 8, target: 34962 });
          accessors.push({
            bufferView: bv,
            componentType: 5122,
            normalized: true,
            count: a.count,
            type: 'VEC3',
            min: qmin,
            max: qmax,
          });
          attrs[name] = accessors.length - 1;
        } else if (identity && name === 'NORMAL' && a.componentType === 5126) {
          const v = read(json, bin, index);
          const q = new Int16Array(a.count * 4);
          for (let i = 0; i < a.count; i++) {
            // The node scale (inverse-transposed for normals) divides by `scale`; pre-multiply.
            const n = [0, 1, 2].map((k) => v[i * 3 + k] * scale[k]);
            const len = Math.hypot(...n) || 1;
            for (let k = 0; k < 3; k++) q[i * 4 + k] = Math.round((n[k] / len) * 32767);
          }
          const bv = push(Buffer.from(q.buffer), { byteStride: 8, target: 34962 });
          accessors.push({
            bufferView: bv,
            componentType: 5122,
            normalized: true,
            count: a.count,
            type: 'VEC3',
          });
          attrs[name] = accessors.length - 1;
        } else if (name === 'COLOR_0' && a.componentType === 5126) {
          const v = read(json, bin, index);
          const n = SIZE[a.type];
          const q = new Uint8Array(a.count * 4);
          for (let i = 0; i < a.count; i++)
            for (let k = 0; k < 4; k++)
              q[i * 4 + k] = k < n ? Math.round(Math.min(1, Math.max(0, v[i * n + k])) * 255) : 255;
          const bv = push(Buffer.from(q.buffer), { byteStride: 4, target: 34962 });
          accessors.push({
            bufferView: bv,
            componentType: 5121,
            normalized: true,
            count: a.count,
            type: 'VEC4',
          });
          attrs[name] = accessors.length - 1;
        } else attrs[name] = copy(index);
      }
      p.attributes = attrs;
      if (p.indices !== undefined) p.indices = copy(p.indices);
    }
    if (identity) {
      nodes[0].translation = center;
      nodes[0].scale = scale;
    }
  }
  // Images (embedded textures) keep their bytes.
  for (const img of json.images ?? []) {
    if (img.bufferView === undefined) continue;
    const view = json.bufferViews[img.bufferView];
    img.bufferView = push(
      Buffer.from(bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)),
    );
  }
  json.accessors = accessors;
  json.bufferViews = views;
  json.buffers = [{ byteLength: length }];
  json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), 'KHR_mesh_quantization'])];
  json.extensionsRequired = [
    ...new Set([...(json.extensionsRequired ?? []), 'KHR_mesh_quantization']),
  ];

  const binBuf = Buffer.concat([...chunks, Buffer.alloc((4 - (length % 4)) % 4)]);
  let jsonBuf = Buffer.from(JSON.stringify(json));
  jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc((4 - (jsonBuf.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + binBuf.length, 8);
  const jh = Buffer.alloc(8);
  jh.writeUInt32LE(jsonBuf.length, 0);
  jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(binBuf.length, 0);
  bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jh, jsonBuf, bh, binBuf]);
}

const files = process.argv.slice(2).flatMap(function list(p) {
  return statSync(p).isDirectory()
    ? readdirSync(p).flatMap((f) => list(join(p, f)))
    : p.endsWith('.glb')
      ? [p]
      : [];
});
let before = 0;
let after = 0;
for (const file of files) {
  const buf = readFileSync(file);
  if (parse(buf).json.extensionsUsed?.includes('KHR_mesh_quantization')) continue;
  const out = quantize(buf);
  writeFileSync(file, out);
  before += buf.length;
  after += out.length;
}
console.log(`Quantized ${files.length} GLBs: ${before} -> ${after} bytes`);

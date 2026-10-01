import { cpSync, mkdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/*
 * Copies an extracted PlayCanvas Editor build into public/farm-scenes/<name>/,
 * keeping only the scene, config and the asset files that ENABLED entities
 * actually use (directly or through materials/containers). Editor builds ship
 * every project asset; the farm loader registers every config asset, so
 * disabled rollback geometry would otherwise cost download and memory.
 *
 * Run: node scripts/prune-scene-export.mjs <extracted-build-dir> <name>
 */

const [src, name] = process.argv.slice(2);
if (!src || !name || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(name))
  throw new Error('usage: node scripts/prune-scene-export.mjs <extracted-build-dir> <name>');
const out = resolve('public/farm-scenes', name);
if (existsSync(out)) throw new Error(`${out} exists: export versions are never overwritten`);

const config = JSON.parse(readFileSync(join(src, 'config.json'), 'utf8'));
const sceneFile = config.scenes[0].url;
const scene = JSON.parse(readFileSync(join(src, sceneFile), 'utf8'));
const assets = config.assets;
const isAsset = (v) => typeof v === 'number' && Object.hasOwn(assets, String(v));

/** Every asset id mentioned anywhere inside `value`. */
function idsIn(value, found = new Set()) {
  if (isAsset(value)) found.add(value);
  else if (Array.isArray(value)) for (const v of value) idsIn(v, found);
  else if (value && typeof value === 'object')
    for (const v of Object.values(value)) idsIn(v, found);
  return found;
}

// Entities that render: enabled themselves and through every ancestor.
const entities = scene.entities;
const enabled = (e) => e.enabled !== false && (!e.parent || enabled(entities[e.parent]));
const keep = new Set(config.application_properties?.scripts ?? []);
for (const e of Object.values(entities)) if (enabled(e)) idsIn(e.components, keep);

// Close over dependencies: render -> container, material -> textures, etc.
const queue = [...keep];
while (queue.length) {
  const a = assets[String(queue.pop())];
  for (const id of idsIn(a.data ?? {})) {
    if (!keep.has(id)) {
      keep.add(id);
      queue.push(id);
    }
  }
}

const pruned = Object.fromEntries(Object.entries(assets).filter(([id]) => keep.has(Number(id))));
mkdirSync(out, { recursive: true });
let bytes = 0;
const files = [];
for (const a of Object.values(pruned)) {
  const url = a.file?.url;
  if (!url) continue;
  const from = join(src, decodeURIComponent(url));
  mkdirSync(dirname(join(out, decodeURIComponent(url))), { recursive: true });
  cpSync(from, join(out, decodeURIComponent(url)));
  const size = statSync(from).size;
  bytes += size;
  files.push({ path: decodeURIComponent(url), type: a.type, bytes: size });
}
writeFileSync(join(out, 'config.json'), JSON.stringify({ ...config, assets: pruned }));
cpSync(join(src, sceneFile), join(out, sceneFile));
const sceneBytes = statSync(join(out, sceneFile)).size + statSync(join(out, 'config.json')).size;
writeFileSync(
  join(out, 'files.json'),
  `${JSON.stringify({ assets: Object.keys(pruned).length, of: Object.keys(assets).length, bytes: bytes + sceneBytes, files }, null, 2)}\n`,
);
console.log(
  `${name}: kept ${Object.keys(pruned).length}/${Object.keys(assets).length} assets, ${bytes + sceneBytes} bytes`,
);

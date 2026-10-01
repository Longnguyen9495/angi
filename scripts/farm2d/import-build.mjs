import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/*
 * Copies an extracted PlayCanvas Editor build of the farm-2d scene into public/farm2d/play/
 * (served to the website as an iframe). Editor builds ship every project asset — the old 3D
 * scenes' models too — so only the farm2d assets (folder "farm2d": textures looked up by name at
 * runtime, the layout JSON, the farm2d.mjs script) are kept.
 *
 * Run: node scripts/farm2d/import-build.mjs <extracted-build-dir>
 */

const [src] = process.argv.slice(2);
if (!src || !existsSync(join(src, 'config.json')))
  throw new Error('usage: node scripts/farm2d/import-build.mjs <extracted-build-dir>');
const out = resolve('public/farm2d/play');

const config = JSON.parse(readFileSync(join(src, 'config.json'), 'utf8'));
const sceneFile = config.scenes[0].url;
const assets = config.assets;
const keep = Object.fromEntries(
  Object.entries(assets).filter(([, a]) => a.name.startsWith('farm2d')),
);
if (!Object.values(keep).some((a) => a.name === 'farm2d.mjs'))
  throw new Error('farm2d.mjs missing from the build');
if (!Object.values(keep).some((a) => a.name === 'farm2d-layout'))
  throw new Error('farm2d-layout missing from the build');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'styles.css', 'manifest.json', 'js', sceneFile])
  cpSync(join(src, f), join(out, f), { recursive: true });
let bytes = 0;
for (const a of Object.values(keep)) {
  const url = a.file?.url;
  if (!url || url.startsWith('./js/')) continue; // scripts are bundled into js/
  const rel = decodeURIComponent(url);
  mkdirSync(dirname(join(out, rel)), { recursive: true });
  cpSync(join(src, rel), join(out, rel));
  bytes += statSync(join(src, rel)).size;
}
const scripts = (config.application_properties?.scripts ?? []).filter((id) => keep[id]);
writeFileSync(
  join(out, 'config.json'),
  JSON.stringify({
    ...config,
    assets: keep,
    application_properties: { ...config.application_properties, scripts },
  }),
);
// The page lives inside the site's iframe: transparent-free full-bleed canvas, no pinch zoom.
const html = readFileSync(join(out, 'index.html'), 'utf8').replace(
  '<style></style>',
  '<style>html,body{margin:0;height:100%;overflow:hidden;background:#8fccf2;touch-action:none}</style>',
);
writeFileSync(join(out, 'index.html'), html);
console.log(
  `farm2d/play: kept ${Object.keys(keep).length}/${Object.keys(assets).length} assets, ${bytes} asset bytes`,
);

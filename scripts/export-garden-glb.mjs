import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { withPage } from './lib/headless.mjs';

/*
 * Exports the Three.js garden as GLB pieces for the PlayCanvas Editor: opens
 * scripts/garden-export/ in headless Chrome/Edge, writes what its exporter
 * returns to public/models/farm/garden/ (plus manifest.json with placements
 * and triangles), then quantizes them (scripts/quantize-glb.mjs).
 * Run: node scripts/export-garden-glb.mjs
 */

const OUT = resolve('public/models/farm/garden');

await withPage('scripts/garden-export/index.html', async ({ evaluate }) => {
  const result = await evaluate('window.__exportAll()');
  mkdirSync(OUT, { recursive: true });
  for (const [file, b64] of Object.entries(result.files)) {
    mkdirSync(dirname(join(OUT, file)), { recursive: true });
    writeFileSync(join(OUT, file), Buffer.from(b64, 'base64'));
  }
  // plot-soil stays float: the Editor puts its render asset straight on each plot's
  // `soil` entity, which drops the glTF node transform that dequantizes positions.
  const quantized = Object.keys(result.files)
    .filter((file) => file !== 'plot-soil.glb')
    .map((file) => join(OUT, file));
  execFileSync(process.execPath, ['scripts/quantize-glb.mjs', ...quantized], { stdio: 'inherit' });
  const pieces = result.pieces.map((p) => ({ ...p, bytes: statSync(join(OUT, p.file)).size }));
  const bytes = pieces.reduce((s, p) => s + p.bytes, 0);
  const source = 'src/features/garden3d (scripts/export-garden-glb.mjs)';
  writeFileSync(
    join(OUT, 'manifest.json'),
    `${JSON.stringify({ source, pieces, plots: result.plots, buildings: result.buildings, bytes }, null, 2)}\n`,
  );
  const tris = pieces.reduce((s, p) => s + (p.file.startsWith('crops/') ? 0 : p.tris), 0);
  console.log(`Wrote ${pieces.length} GLBs, ${bytes} bytes; scene pieces ${tris} triangles.`);
  for (const p of pieces.filter((p) => !p.file.startsWith('crops/')))
    console.log(
      `  ${p.file.padEnd(24)} ${String(p.tris).padStart(7)} tris ${String(p.bytes).padStart(9)} B`,
    );
});

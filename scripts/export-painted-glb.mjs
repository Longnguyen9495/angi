import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { withPage } from './lib/headless.mjs';

/*
 * Exports the "painted farm" (scripts/garden-export/painted.ts: the reference
 * illustration rebuilt as cartoon 3D with ink outlines) as GLB pieces to
 * public/models/farm/painted/, plus manifest.json (placement and triangles).
 * Run: node scripts/export-painted-glb.mjs
 */

const OUT = resolve('public/models/farm/painted');

await withPage('scripts/garden-export/index.html', async ({ evaluate }) => {
  const result = await evaluate('window.__exportPainted()');
  mkdirSync(OUT, { recursive: true });
  let bytes = 0;
  for (const [file, b64] of Object.entries(result.files)) {
    const buf = Buffer.from(b64, 'base64');
    mkdirSync(dirname(join(OUT, file)), { recursive: true });
    writeFileSync(join(OUT, file), buf);
    bytes += buf.length;
  }
  writeFileSync(
    join(OUT, 'manifest.json'),
    `${JSON.stringify({ pieces: result.pieces, bytes }, null, 2)}\n`,
  );
  const tris = result.pieces.reduce((s, p) => s + p.tris, 0);
  console.log(`Wrote ${result.pieces.length} GLBs, ${bytes} bytes, ${tris} triangles.`);
  for (const p of result.pieces)
    console.log(`  ${p.file.padEnd(28)} ${String(p.tris).padStart(7)} tris`);
});

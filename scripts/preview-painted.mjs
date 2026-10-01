import { writeFileSync } from 'node:fs';
import { withPage } from './lib/headless.mjs';

/** Renders the painted farm preview (scripts/garden-export/painted.ts) to a PNG. */
const out = process.argv[2] ?? 'storage/painted-preview.png';
await withPage('scripts/garden-export/index.html', async ({ evaluate }) => {
  const url = await evaluate('window.__previewPainted()');
  writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`Saved ${out}`);
});

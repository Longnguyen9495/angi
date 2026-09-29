// Writes .br and .gz siblings for text assets in dist/ so Apache can serve
// them without enabling mod_deflate globally (see deploy/apache/angi.local.conf).
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const root = new URL('../dist', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const EXT = new Set(['.js', '.css', '.json', '.svg', '.webmanifest']);
let files = 0;
let saved = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (EXT.has(extname(p))) {
      const buf = readFileSync(p);
      if (buf.length < 1024) continue;
      const br = brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } });
      writeFileSync(`${p}.br`, br);
      writeFileSync(`${p}.gz`, gzipSync(buf, { level: 9 }));
      files++;
      saved += buf.length - br.length;
    }
  }
}

walk(root);
console.log(`Precompressed ${files} files (brotli saves ${(saved / 1024).toFixed(0)} KB).`);

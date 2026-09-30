import { realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Windows file URLs are case-sensitive cache keys in Node even though the
// filesystem is not. Start Vitest with the same physical path casing that
// Vite resolves for test imports, avoiding a second collector instance.
const cli = realpathSync
  .native(fileURLToPath(import.meta.resolve('vitest/package.json')))
  .replace(/package\.json$/, 'vitest.mjs');
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: 'inherit',
});
if (result.error) {
  console.error(result.error);
}
process.exitCode = result.status ?? 1;

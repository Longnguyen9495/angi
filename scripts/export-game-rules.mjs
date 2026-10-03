// Writes server/data/game-rules.json (and the server-check fixtures) from the game's own
// tables: `npm run rules:export`. The same tests fail in `npm test` when the files are stale.
import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  [
    'scripts/run-vitest.mjs',
    'run',
    'src/domain/gameRules.test.ts',
    'src/domain/progressFixtures.test.ts',
  ],
  { stdio: 'inherit', env: { ...process.env, EXPORT_RULES: '1' } },
);
process.exitCode = result.status ?? 1;

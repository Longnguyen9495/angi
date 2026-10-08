// Vườn Mây over a 90-day season (src/domain/skySim.test.ts): prints the table of floors, pots,
// coins and sky XP per day. `npm run sky:sim` (SIM_DAYS=… for another length). Takes minutes.
import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  ['scripts/run-vitest.mjs', 'run', 'src/domain/skySim.test.ts'],
  { stdio: 'inherit', env: { ...process.env, SIM_REPORT: '1' } },
);
process.exitCode = result.status ?? 1;

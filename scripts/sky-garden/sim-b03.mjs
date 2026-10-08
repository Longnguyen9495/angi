// Test-only matrix: isolated environment, per-case log/exit, no B02 overwrite.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const dir = 'storage/sky-garden-qa/b03';
mkdirSync(dir, { recursive: true });
const cases = [];
for (const profile of ['three', 'one', 'six']) {
  for (const seed of [20261008, 20261009, 20261010]) {
    for (const repeat of [false, true]) {
      const id = `${profile}-${seed}${repeat ? '-repeat' : ''}`;
      const start = Date.now();
      const run = spawnSync(process.execPath, ['scripts/run-vitest.mjs', 'run', 'src/domain/skySimB03.test.ts'], {
        encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
        env: { ...process.env, TZ: 'Asia/Ho_Chi_Minh', SIM_B03: '1', SIM_DAYS: '90', SIM_PROFILE: profile, SIM_SEED: String(seed), SIM_REPEAT: repeat ? '1' : '0' },
      });
      writeFileSync(`${dir}/${id}.log`, (run.stdout ?? '') + (run.stderr ?? '') + (run.error ? String(run.error) : ''));
      const exit = run.status ?? 1;
      writeFileSync(`${dir}/${id}-exit.txt`, `${exit}\n`);
      cases.push({ id, profile, seed, repeat, exit, seconds: (Date.now() - start) / 1000 });
      writeFileSync(`${dir}/matrix.json`, JSON.stringify(cases, null, 2) + '\n');
      console.log(id, 'exit', exit);
    }
  }
}
const q = (values) => {
  const sorted = values.map((v) => v ?? Infinity).sort((a, b) => a - b);
  const at = (p) => { const n = sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)]; return Number.isFinite(n) ? n : null; };
  return { samples: values.length, reached: values.filter((v) => v !== null).length, p10: at(.1), p50: at(.5), p90: at(.9) };
};
const summary = {};
for (const profile of ['one', 'three', 'six']) {
  const reports = cases.filter((c) => c.profile === profile && !c.repeat && c.exit === 0).map((c) => JSON.parse(readFileSync(`${dir}/${c.id}.json`, 'utf8')));
  if (!reports.length) continue;
  summary[profile] = {
    successfulSeeds: reports.map((r) => r.seed),
    floors: Object.fromEntries([5, 6, 7, 8, 9, 10].map((f) => [`T${f}`, q(reports.map((r) => r.floorsOpened[f - 1]))])),
    inventory: reports.map((r) => ({ seed: r.seed, ...r.inventory })),
    coins: q(reports.map((r) => r.inventory.coins)),
    pots: q(reports.map((r) => r.inventory.pots)),
  };
}
writeFileSync(`${dir}/summary.json`, JSON.stringify({ quantileMethod: 'nearest-rank; null = right-censored beyond day 90; failed cases excluded explicitly', cases, summary }, null, 2) + '\n');
process.exitCode = cases.every((c) => c.exit === 0) ? 0 : 1;

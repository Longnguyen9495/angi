export const SIM_PROFILES = {
  one: [21],
  three: [8, 13, 21],
  six: [6, 9, 12, 15, 18, 21],
} as const;
export type SimProfile = keyof typeof SIM_PROFILES;
export const SIM_SEEDS = [20261008, 20261009, 20261010] as const;

export function validateSimConfig(days: number, seed: number, sessions: readonly number[]) {
  if (!Number.isInteger(days) || days < 1) throw new Error('Invalid days');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid seed');
  if (!sessions.length || sessions.some((h, i) => !Number.isInteger(h) || h < 0 || h > 23 || (i > 0 && h <= sessions[i - 1]!))) {
    throw new Error('Sessions must be strictly increasing local hours');
  }
}

/** Nearest-rank quantiles; null milestones are right-censored, never silently omitted. */
export function quantiles(values: readonly (number | null)[]) {
  if (!values.length) throw new Error('Empty sample');
  const sorted = values.map((v) => v ?? Infinity).sort((a, b) => a - b);
  const at = (p: number) => {
    const value = sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)]!;
    return Number.isFinite(value) ? value : null;
  };
  return { samples: values.length, reached: values.filter((v) => v !== null).length, p10: at(.1), p50: at(.5), p90: at(.9) };
}

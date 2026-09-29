import type { SpinPlan } from '../foodReel.types';

/** Small, fast, deterministic PRNG (mulberry32). Same seed → same sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function randomSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0]!;
  }
  return Math.floor(Math.random() * 2 ** 32);
}

export const SPIN_MIN_MS = 2600;
export const SPIN_MAX_MS = 3100;
/** Minimum number of items the reel travels so every spin reads as a spin. */
export const SPIN_MIN_TRAVEL = 24;
/** Fraction of the spin after which the reel is visibly slowing down. */
export const DECELERATE_AT = 0.56;

/**
 * Decides the whole spin up-front: winner, exact virtual target and duration.
 * The animation only performs the path to this target — it never decides it.
 */
export function planSpin(from: number, seed: number, count: number): SpinPlan {
  const rnd = mulberry32(seed);
  const start = Math.round(from);
  const current = mod(start, count);
  let winnerIndex = Math.floor(rnd() * count);
  if (winnerIndex === current && count > 1) {
    winnerIndex = mod(winnerIndex + 1 + Math.floor(rnd() * (count - 1)), count);
  }
  const travel = SPIN_MIN_TRAVEL + Math.floor(rnd() * 12);
  let target = start + travel;
  target += mod(winnerIndex - mod(target, count), count);
  const durationMs = SPIN_MIN_MS + Math.floor(rnd() * (SPIN_MAX_MS - SPIN_MIN_MS));
  return { seed, from: start, target, winnerIndex, durationMs };
}

// Velocity profile: ramp up (0–10%), cruise, then a long ease-out into the target.
const RAMP = 0.1;
function velocity(u: number): number {
  if (u <= 0) return 0;
  if (u < RAMP) {
    const k = u / RAMP;
    return k * k * (3 - 2 * k);
  }
  if (u < DECELERATE_AT) return 1;
  if (u >= 1) return 0;
  const k = (u - DECELERATE_AT) / (1 - DECELERATE_AT);
  return (1 - k) ** 2.6;
}

const SAMPLES = 512;
const TABLE: number[] = (() => {
  const out = [0];
  let acc = 0;
  for (let i = 1; i <= SAMPLES; i++) {
    const u0 = (i - 1) / SAMPLES;
    const u1 = i / SAMPLES;
    acc += ((velocity(u0) + velocity(u1)) / 2) * (u1 - u0);
    out.push(acc);
  }
  return out.map((v) => v / acc);
})();

/** Normalised distance travelled at normalised time u (0 → 0, 1 → 1, monotonic). */
export function spinProgress(u: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const x = u * SAMPLES;
  const i = Math.floor(x);
  const f = x - i;
  return TABLE[i]! + (TABLE[i + 1]! - TABLE[i]!) * f;
}

/** Instantaneous speed in items per second, for motion blur and sound. */
export function spinSpeed(plan: SpinPlan, elapsedMs: number): number {
  const u = elapsedMs / plan.durationMs;
  const du = 1 / SAMPLES;
  const d = spinProgress(Math.min(1, u + du)) - spinProgress(Math.max(0, u - du));
  return (((plan.target - plan.from) * d) / (2 * du * plan.durationMs)) * 1000;
}

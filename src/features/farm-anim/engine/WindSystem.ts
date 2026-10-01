/**
 * One wind for the whole island. Everything that moves in the wind samples `at(x)`, so trees,
 * grass, reeds, smoke and the windmill answer to the same breeze. Gusts arrive every 20–35 s,
 * build for a second, hold, fade, and roll across the island from west to east, so the trees on
 * the left bend before the ones on the right.
 */

/** Seeded random, so a reload shows the same first gust timing pattern in tests. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type GustPhase = 'calm' | 'rise' | 'hold' | 'fall';

export class WindSystem {
  /** Base intensity 0..1 (debug slider). */
  base = 0.4;
  /** Multiplier for reduced motion. */
  amplitude = 1;
  /** Current gust strength 0..1 at the gust front. */
  gust = 0;
  phase: GustPhase = 'calm';
  private timer = 6 + Math.random() * 8; // first gust soon, so a short look sees one
  private t = 0;
  /** History of the gust value, so a gust can travel across the island. */
  private history: number[] = new Array(240).fill(0);
  private histT = 0;
  /** Gust front speed, picture px per second. */
  readonly gustSpeed = 700;
  private readonly rand = rng(91);

  update(dt: number) {
    this.t += dt;
    this.timer -= dt;
    if (this.timer <= 0) {
      const next: Record<GustPhase, [GustPhase, number]> = {
        calm: ['rise', 0.9 + this.rand() * 0.6],
        rise: ['hold', 1.6 + this.rand() * 1.6],
        hold: ['fall', 1.4 + this.rand()],
        fall: ['calm', 20 + this.rand() * 15],
      };
      [this.phase, this.timer] = next[this.phase];
    }
    const target = this.phase === 'rise' || this.phase === 'hold' ? 1 : 0;
    const rate = this.phase === 'rise' ? 1.6 : this.phase === 'fall' ? 0.8 : 1.2;
    this.gust += (target - this.gust) * Math.min(1, dt * rate * 2);
    // Sample the gust 20 times a second into a ring for the travelling front.
    this.histT += dt;
    while (this.histT >= 0.05) {
      this.histT -= 0.05;
      this.history.push(this.gust);
      this.history.shift();
    }
  }

  /** Force a gust now (debug button). */
  trigger() {
    this.phase = 'rise';
    this.timer = 1;
  }

  /** Gust strength felt at picture x (the front reaches the east side later). */
  private gustAt(x: number) {
    const delay = Math.max(0, x) / this.gustSpeed;
    const k = Math.min(this.history.length - 1, Math.round(delay / 0.05));
    return this.history[this.history.length - 1 - k] ?? 0;
  }

  /** Wind at picture x: 0 (still) .. about 1.8 (strong gust). Slow lulls and swells run through it. */
  at(x: number) {
    const swell =
      0.78 +
      0.14 * Math.sin(this.t * 0.31 + x * 0.0021) +
      0.08 * Math.sin(this.t * 0.83 - x * 0.0047);
    return (this.base * swell + this.gustAt(x) * (0.35 + this.base * 0.9)) * this.amplitude;
  }

  /** Fast flutter term in -1..1 for leaves (different per object via `seed`). */
  flutter(seed: number, speed = 1) {
    const t = this.t * speed;
    return 0.6 * Math.sin(t * 2.1 + seed * 7.3) + 0.4 * Math.sin(t * 3.7 + seed * 3.1);
  }

  get time() {
    return this.t;
  }
}

/** Damped spring towards a moving target: gives lag, overshoot and settle instead of a sine. */
export class Spring {
  x = 0;
  v = 0;
  constructor(
    /** Natural frequency, rad/s. */
    public omega: number,
    /** Damping ratio (0.2 bouncy … 1 critical). */
    public zeta: number,
  ) {}

  step(target: number, dt: number) {
    const a = -this.omega * this.omega * (this.x - target) - 2 * this.zeta * this.omega * this.v;
    this.v += a * dt;
    this.x += this.v * dt;
    return this.x;
  }
}

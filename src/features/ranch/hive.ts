import type { HiveStage as HiveState } from '../../domain/selectors';
import { BEE_SPRITE, hiveSprite } from '../../data/sprites';
import type { Quality } from './images';
import { sprite } from './images';
import { approach, between, orbitAt, rng, type Orbit } from './math';
import { Backdrop, Stage, drawSprite } from './scene';

/*
 * The beehive on a flower meadow. Bees are one tiny static sprite each, flown on lissajous
 * orbits around the hive: depth (front/behind the hive) from the orbit phase gives their
 * size and opacity, their facing follows their direction, and a fast tiny jitter reads as
 * hovering. No wing frames: the sheet has none.
 */

export const BEE_COUNT: Record<Quality, number> = { low: 2, medium: 4, high: 7 };

/** How many bees fly for a quality, a hive state and the motion setting. */
export function beeCount(quality: Quality, state: HiveState, reduced: boolean): number {
  if (reduced || state === 'locked') return 0;
  const max = BEE_COUNT[quality];
  if (state === 'idle') return Math.max(1, Math.round(max * 0.5));
  if (state === 'filling-1') return Math.max(1, Math.round(max * 0.75));
  return max;
}

export function hiveStep(state: HiveState): 1 | 2 | 3 {
  return state === 'filling-2' ? 2 : state === 'ready' ? 3 : 1;
}

interface Bee {
  orbit: Orbit;
  speed: number;
  alpha: number;
  facing: number;
  jitter: number;
  x: number;
  y: number;
  depth: number;
}

const MAX_BEES = 7;

export class HiveStage extends Stage {
  state: HiveState = 'locked';
  private bees: Bee[] = [];
  private burst = 0;
  private bg = new Backdrop();
  private rand = rng(4242);

  constructor() {
    super();
    for (let i = 0; i < MAX_BEES; i++) {
      this.bees.push({
        orbit: {
          cx: 0,
          cy: 0,
          ax: between(this.rand, 0.7, 1.15),
          ay: between(this.rand, 0.35, 0.7),
          fx: between(this.rand, 0.55, 0.95),
          fy: between(this.rand, 1.1, 1.9),
          phase: this.rand() * Math.PI * 2,
        },
        speed: between(this.rand, 0.85, 1.25),
        alpha: 0,
        facing: 1,
        jitter: this.rand() * 10,
        x: 0,
        y: 0,
        depth: 0,
      });
    }
  }

  private center() {
    return { x: this.w * 0.5, y: this.h * 0.56 };
  }

  update(dt: number, t: number): void {
    const n = beeCount(this.env.quality, this.state, this.env.reduced);
    const c = this.center();
    const rx = Math.min(this.w * 0.42, 150);
    const ry = this.h * 0.36;
    this.burst = Math.max(0, this.burst - dt * 0.9);
    const spread = 1 + this.burst * 1.4;
    for (let i = 0; i < this.bees.length; i++) {
      const b = this.bees[i]!;
      const o = b.orbit;
      b.alpha = dt === 0 ? (i < n ? 1 : 0) : approach(b.alpha, i < n ? 1 : 0, 2.5, dt);
      if (b.alpha < 0.02) continue;
      const tt = t * b.speed;
      const p = orbitAt({ ...o, cx: c.x, cy: c.y - 6, ax: o.ax * rx, ay: o.ay * ry }, tt, spread);
      b.x = p.x;
      b.y = p.y;
      b.depth = p.depth;
      // Direction of travel along x decides which way the bee faces.
      const dir = Math.cos(tt * o.fx + o.phase) >= 0 ? 1 : -1;
      b.facing = dt === 0 ? dir : approach(b.facing, dir, 10, dt);
    }
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    this.bg.draw(ctx, this.w, this.h, paintMeadow);
    const c = this.center();
    const hive = sprite(hiveSprite(hiveStep(this.state)));
    const bee = sprite(BEE_SPRITE);
    const locked = this.state === 'locked';
    const drawBee = (b: Bee) => {
      if (!bee || b.alpha < 0.02) return;
      const front = (b.depth + 1) / 2;
      const s = 0.55 + 0.25 * front;
      const buzz = Math.sin(t * 38 + b.jitter) * 0.7;
      // The sprite looks left: mirror when flying right.
      const sx = -Math.sign(b.facing || 1) * Math.max(0.2, Math.abs(b.facing));
      drawSprite(ctx, bee, b.x, b.y + buzz, s, {
        sx,
        anchor: 'center',
        alpha: b.alpha * (0.55 + 0.45 * front),
      });
    };
    for (const b of this.bees) if (b.depth < 0) drawBee(b);
    // Ground shadow and the hive.
    ctx.fillStyle = 'rgba(40, 30, 10, 0.25)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 44, 46, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    if (hive) {
      const s = Math.min(1, (this.h * 0.68) / hive.naturalHeight);
      if (this.state === 'ready' && !this.env.reduced) {
        // Ready: a soft steady glow that breathes slowly (no blinking).
        ctx.save();
        ctx.shadowColor = 'rgba(255, 205, 90, 0.8)';
        ctx.shadowBlur = 14 + Math.sin(t * 1.2) * 4;
        drawSprite(ctx, hive, c.x, c.y + 46, s);
        ctx.restore();
      } else drawSprite(ctx, hive, c.x, c.y + 46, s, { alpha: locked ? 0.4 : 1 });
    }
    for (const b of this.bees) if (b.depth >= 0) drawBee(b);
  }

  /** Honey collected: the bees scatter wide, golden drops spray. */
  collect(): void {
    if (this.env.reduced) return;
    this.burst = 1;
    const c = this.center();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.particles.spawn({
        layer: this.layer,
        kind: i % 3 ? 'dot' : 'spark',
        x: c.x,
        y: c.y,
        vx: Math.cos(a) * between(this.rand, 40, 80),
        vy: Math.sin(a) * between(this.rand, 30, 60) - 30,
        g: 90,
        life: 0.8,
        size: i % 3 ? 2.4 : 5,
        color: i % 3 ? '#f2a93b' : '#ffe08a',
      });
    }
  }

  /** The bees are woken: a smaller stir. */
  start(): void {
    if (this.env.reduced) return;
    this.burst = 0.5;
  }

  tap(): void {
    if (this.env.reduced || this.state === 'locked') return;
    this.burst = Math.max(this.burst, 0.35);
  }

  /** Where the hive's honey sits, for flights. */
  honeyPoint() {
    const c = this.center();
    return { x: c.x, y: c.y };
  }
}

function paintMeadow(c: CanvasRenderingContext2D, w: number, h: number): void {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#bfdc9a');
  g.addColorStop(0.55, '#8dbb62');
  g.addColorStop(1, '#6e9c48');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const rand = rng(1234);
  const colors = ['#ffffff', '#ffd1e0', '#ffe27a', '#d6c4ff'];
  for (let i = 0; i < Math.round(w / 14); i++) {
    const x = rand() * w;
    const y = h * 0.45 + rand() * h * 0.52;
    // Leave the hive's spot clear.
    if (Math.abs(x - w / 2) < 60 && y > h * 0.4) continue;
    c.strokeStyle = 'rgba(60, 110, 40, 0.7)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, y + 6);
    c.lineTo(x, y);
    c.stroke();
    c.fillStyle = colors[i % colors.length]!;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      c.beginPath();
      c.arc(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.8, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#f2b632';
    c.beginPath();
    c.arc(x, y, 1.3, 0, Math.PI * 2);
    c.fill();
  }
}

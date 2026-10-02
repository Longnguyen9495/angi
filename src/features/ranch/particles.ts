import type { Quality } from './images';

/*
 * One fixed-size pool of particles for the whole ranch scene. Objects are made once and
 * reused; when the pool is full, a new particle takes the slot of the oldest one.
 */

export type ParticleKind =
  | 'dot' // grain, honey drop, crumb
  | 'heart'
  | 'spark'
  | 'bubble' // rises and wobbles
  | 'ring' // water ripple
  | 'z' // a sleepy "z"
  | 'splash';

export interface Particle {
  alive: boolean;
  /** Which canvas it is drawn on. */
  layer: number;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Downward pull, px/s². Negative floats up. */
  g: number;
  /** Seconds lived / to live. */
  age: number;
  life: number;
  size: number;
  color: string;
  /** Spawn order, to find the oldest when the pool is full. */
  born: number;
}

export const PARTICLE_CAP: Record<Quality, number> = { low: 24, medium: 60, high: 120 };

export interface Spawn {
  layer: number;
  kind: ParticleKind;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  g?: number;
  life?: number;
  size?: number;
  color?: string;
}

export class ParticlePool {
  readonly items: Particle[];
  private cap: number;
  private serial = 0;

  constructor(capacity = PARTICLE_CAP.high) {
    this.items = Array.from({ length: capacity }, () => ({
      alive: false,
      layer: 0,
      kind: 'dot' as ParticleKind,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      g: 0,
      age: 0,
      life: 1,
      size: 2,
      color: '#fff',
      born: 0,
    }));
    this.cap = capacity;
  }

  /** How many particles may be alive at once (quality); never more than the pool holds. */
  setCap(cap: number): void {
    this.cap = Math.max(0, Math.min(cap, this.items.length));
    for (let i = this.cap; i < this.items.length; i++) this.items[i]!.alive = false;
  }

  get capacity(): number {
    return this.cap;
  }

  get alive(): number {
    let n = 0;
    for (let i = 0; i < this.cap; i++) if (this.items[i]!.alive) n++;
    return n;
  }

  spawn(s: Spawn): Particle | null {
    if (this.cap === 0) return null;
    let slot: Particle | null = null;
    let oldest: Particle = this.items[0]!;
    for (let i = 0; i < this.cap; i++) {
      const p = this.items[i]!;
      if (!p.alive) {
        slot = p;
        break;
      }
      if (p.born < oldest.born) oldest = p;
    }
    const p = slot ?? oldest;
    p.alive = true;
    p.layer = s.layer;
    p.kind = s.kind;
    p.x = s.x;
    p.y = s.y;
    p.vx = s.vx ?? 0;
    p.vy = s.vy ?? 0;
    p.g = s.g ?? 0;
    p.age = 0;
    p.life = s.life ?? 0.8;
    p.size = s.size ?? 3;
    p.color = s.color ?? '#fff';
    p.born = ++this.serial;
    return p;
  }

  update(dt: number): void {
    for (let i = 0; i < this.cap; i++) {
      const p = this.items[i]!;
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        continue;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'bubble') p.x += Math.sin(p.age * 9 + p.born) * 6 * dt;
    }
  }

  clear(layer?: number): void {
    for (const p of this.items) if (layer === undefined || p.layer === layer) p.alive = false;
  }

  draw(ctx: CanvasRenderingContext2D, layer: number): void {
    for (let i = 0; i < this.cap; i++) {
      const p = this.items[i]!;
      if (!p.alive || p.layer !== layer) continue;
      const k = p.age / p.life;
      ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.5) / 0.5);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      switch (p.kind) {
        case 'dot':
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'heart':
          heart(ctx, p.x, p.y, p.size * (0.8 + k * 0.4));
          break;
        case 'spark':
          spark(ctx, p.x, p.y, p.size * (1 - k * 0.5));
          break;
        case 'bubble':
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'ring':
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * (0.3 + k * 1.7), p.size * (0.12 + k * 0.6), 0, 0, 7);
          ctx.stroke();
          break;
        case 'z':
          ctx.font = `700 ${Math.round(p.size)}px system-ui, sans-serif`;
          ctx.fillText('z', p.x, p.y);
          break;
        case 'splash':
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * 0.6, p.size, Math.atan2(p.vy, p.vx), 0, 7);
          ctx.fill();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  ctx.fill();
}

function spark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? s * 0.35 : s;
    const a = (i * Math.PI) / 4;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

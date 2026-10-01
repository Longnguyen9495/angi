import { canvas } from './assets';
import type { AnimSystem, World } from './world';

/**
 * Pooled particles: smoke, splash drops, pollen, dust, sparkles, straw. A fixed pool, nothing is
 * allocated per frame; when the pool is full new spawns are dropped.
 */

export type ParticleKind = 'smoke' | 'drop' | 'pollen' | 'dust' | 'sparkle' | 'straw';

interface Particle {
  alive: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  spin: number;
  seed: number;
  /** Ground / water line for drops (they vanish there). */
  floor: number;
}

const POOL = 160;

export class ParticleSystem implements AnimSystem {
  private pool: Particle[] = Array.from({ length: POOL }, () => ({
    alive: false,
    kind: 'dust',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    age: 0,
    life: 1,
    size: 1,
    spin: 0,
    seed: 0,
    floor: 1e9,
  }));
  private live = 0;
  private puff: HTMLCanvasElement;
  private glow: HTMLCanvasElement;

  constructor() {
    // Soft smoke puff: a light grey ball, a little darker underneath, painted once.
    const [p, pc] = canvas(64, 64);
    const g = pc.createRadialGradient(28, 26, 2, 32, 32, 31);
    g.addColorStop(0, 'rgba(250,248,246,0.95)');
    g.addColorStop(0.5, 'rgba(214,212,216,0.75)');
    g.addColorStop(1, 'rgba(190,188,196,0)');
    pc.fillStyle = g;
    pc.fillRect(0, 0, 64, 64);
    this.puff = p;
    const [s, sc] = canvas(32, 32);
    const sg = sc.createRadialGradient(16, 16, 0, 16, 16, 16);
    sg.addColorStop(0, 'rgba(255,255,240,1)');
    sg.addColorStop(0.3, 'rgba(255,250,210,0.6)');
    sg.addColorStop(1, 'rgba(255,250,210,0)');
    sc.fillStyle = sg;
    sc.fillRect(0, 0, 32, 32);
    this.glow = s;
  }

  spawn(
    kind: ParticleKind,
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    floor = 1e9,
  ) {
    const p = this.pool.find((q) => !q.alive);
    if (!p) return;
    p.alive = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.age = 0;
    p.life = life;
    p.size = size;
    p.spin = Math.random() * Math.PI * 2;
    p.seed = Math.random() * 100;
    p.floor = floor;
  }

  update(w: World) {
    const dt = w.dt;
    let live = 0;
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= p.life || p.y > p.floor) {
        p.alive = false;
        continue;
      }
      live++;
      const wind = w.wind.at(p.x);
      switch (p.kind) {
        case 'smoke':
          // Rises, slows, leans with the wind, spreads.
          p.vx += (wind * 26 - p.vx) * dt * 0.8;
          p.vy *= 1 - dt * 0.25;
          break;
        case 'drop':
          p.vy += 260 * dt;
          break;
        case 'straw':
          p.vx += (wind * 40 - p.vx) * dt * 1.5;
          p.vy += (12 - p.vy) * dt;
          p.spin += dt * 4;
          break;
        default:
          // Pollen and dust float on the breeze with a slow wander.
          p.vx += (wind * 14 + Math.sin(w.t * 0.9 + p.seed) * 6 - p.vx) * dt;
          p.vy += (Math.sin(w.t * 1.3 + p.seed * 2) * 4 - 1.5 - p.vy) * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.live = live;
  }

  /** Smoke goes in the mid layer (behind clouds); everything else in front. */
  draw(ctx: CanvasRenderingContext2D, which: 'smoke' | 'front') {
    for (const p of this.pool) {
      if (!p.alive || (which === 'smoke') !== (p.kind === 'smoke')) continue;
      const u = p.age / p.life;
      switch (p.kind) {
        case 'smoke': {
          const r = p.size * (0.5 + u * 1.8);
          ctx.globalAlpha = 0.85 * Math.min(1, u * 14) * (1 - u) ** 1.2;
          ctx.drawImage(this.puff, p.x - r, p.y - r, r * 2, r * 2);
          break;
        }
        case 'drop':
          ctx.globalAlpha = 0.85 * (1 - u);
          ctx.fillStyle = '#e9fbff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'sparkle': {
          const a = Math.sin(u * Math.PI);
          const r = p.size * (0.6 + a * 0.6);
          ctx.globalAlpha = a * 0.9;
          ctx.drawImage(this.glow, p.x - r * 2, p.y - r * 2, r * 4, r * 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(p.x - r, p.y - 0.35, r * 2, 0.7);
          ctx.fillRect(p.x - 0.35, p.y - r, 0.7, r * 2);
          break;
        }
        case 'straw':
          ctx.globalAlpha = Math.sin(u * Math.PI) * 0.9;
          ctx.strokeStyle = '#e8c35a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x - Math.cos(p.spin) * p.size, p.y - Math.sin(p.spin) * p.size * 0.5);
          ctx.lineTo(p.x + Math.cos(p.spin) * p.size, p.y + Math.sin(p.spin) * p.size * 0.5);
          ctx.stroke();
          break;
        default: {
          const a = Math.sin(u * Math.PI);
          ctx.globalAlpha = a * (p.kind === 'pollen' ? 0.85 : 0.5);
          ctx.fillStyle = p.kind === 'pollen' ? '#fff2a8' : '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    for (const p of this.pool) p.alive = false;
  }

  count() {
    return this.live;
  }
}

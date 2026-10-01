import { canvas } from './assets';
import type { AnimSystem, World } from './world';

/**
 * Pooled particles. A fixed pool, nothing is allocated per frame; when the pool is full new
 * spawns are dropped. Kinds (each with its own size, speed, fade and lifetime):
 *  smoke    chimney puffs: rise, slow, lean with the wind, swell and fade
 *  drop     water drops (watering, splashes): fall, vanish at their floor
 *  pollen   yellow motes over the flowers
 *  dust     light motes in the air
 *  wind     faint streaks carried by the wind (stronger in a gust)
 *  sparkle  white star glints
 *  grow     green-gold glints rising from a crop that grew
 *  soil     brown clods thrown up when a plot is worked
 *  seed     seeds falling into a plot in an arc
 *  harvest  golden and leafy bits bursting from a harvested plot
 *  straw    hay wisps
 *  splash   the sheet's splash crown flashing on the water (image)
 *  reward   an item icon floating up and fading (image)
 */

export type ParticleKind =
  | 'smoke'
  | 'drop'
  | 'pollen'
  | 'dust'
  | 'wind'
  | 'sparkle'
  | 'grow'
  | 'soil'
  | 'seed'
  | 'harvest'
  | 'straw'
  | 'splash'
  | 'reward';

export const PARTICLE_KINDS: ParticleKind[] = [
  'wind',
  'smoke',
  'drop',
  'splash',
  'dust',
  'soil',
  'seed',
  'grow',
  'harvest',
  'sparkle',
  'pollen',
  'straw',
  'reward',
];

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
  /** Ground / water line for falling bits (drops vanish there, clods and seeds settle). */
  floor: number;
  img: CanvasImageSource | null;
}

const POOL = 240;
const HARVEST_COLORS = ['#ffd34d', '#ffb02e', '#8fd14f', '#5fb83a', '#fff1a8'];

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
    img: null,
  }));
  private live = 0;
  private perKind = new Map<ParticleKind, number>();
  private puff: HTMLCanvasElement;
  private glow: HTMLCanvasElement;
  private greenGlow: HTMLCanvasElement;

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
    const glow = (inner: string, mid: string, outer: string) => {
      const [s, sc] = canvas(32, 32);
      const sg = sc.createRadialGradient(16, 16, 0, 16, 16, 16);
      sg.addColorStop(0, inner);
      sg.addColorStop(0.3, mid);
      sg.addColorStop(1, outer);
      sc.fillStyle = sg;
      sc.fillRect(0, 0, 32, 32);
      return s;
    };
    this.glow = glow('rgba(255,255,240,1)', 'rgba(255,250,210,0.6)', 'rgba(255,250,210,0)');
    this.greenGlow = glow('rgba(240,255,200,1)', 'rgba(170,240,120,0.6)', 'rgba(150,230,90,0)');
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
    img: CanvasImageSource | null = null,
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
    p.img = img;
  }

  update(w: World) {
    const dt = w.dt;
    let live = 0;
    this.perKind.clear();
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.age += dt;
      const settles = p.kind === 'soil' || p.kind === 'seed';
      if (p.age >= p.life || (p.y > p.floor && !settles)) {
        p.alive = false;
        continue;
      }
      live++;
      this.perKind.set(p.kind, (this.perKind.get(p.kind) ?? 0) + 1);
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
        case 'soil':
        case 'seed':
        case 'harvest':
          // Thrown, then falling; clods and seeds settle on their floor and fade there.
          p.vy += (p.kind === 'harvest' ? 140 : 300) * dt;
          p.vx *= 1 - dt * (p.kind === 'harvest' ? 1.2 : 0.6);
          p.spin += dt * (p.kind === 'harvest' ? 9 : 5);
          if (settles && p.y > p.floor) {
            p.y = p.floor;
            p.vx = 0;
            p.vy = 0;
          }
          break;
        case 'wind':
          // Carried along the wind, quicker in a gust; a slight vertical wave.
          p.vx += (60 + wind * 120 - p.vx) * dt * 2;
          p.vy = Math.sin(w.t * 2 + p.seed) * 6;
          break;
        case 'grow':
        case 'reward':
          // Rising, slowing down.
          p.vy *= 1 - dt * 1.4;
          break;
        case 'splash':
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
        case 'sparkle':
        case 'grow': {
          const a = Math.sin(u * Math.PI);
          const r = p.size * (0.6 + a * 0.6);
          ctx.globalAlpha = a * 0.9;
          ctx.drawImage(
            p.kind === 'grow' ? this.greenGlow : this.glow,
            p.x - r * 2,
            p.y - r * 2,
            r * 4,
            r * 4,
          );
          ctx.fillStyle = p.kind === 'grow' ? '#f4ffd0' : '#ffffff';
          ctx.fillRect(p.x - r, p.y - 0.35, r * 2, 0.7);
          ctx.fillRect(p.x - 0.35, p.y - r, 0.7, r * 2);
          break;
        }
        case 'soil':
          ctx.globalAlpha = Math.min(1, (1 - u) * 3);
          ctx.fillStyle = p.seed % 2 > 1 ? '#6b4423' : '#8a5a30';
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.spin);
          ctx.fillRect(-p.size, -p.size * 0.7, p.size * 2, p.size * 1.4);
          ctx.restore();
          break;
        case 'seed':
          ctx.globalAlpha = Math.min(1, (1 - u) * 3);
          ctx.fillStyle = '#e8cf8a';
          ctx.strokeStyle = 'rgba(90,60,20,0.8)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size, p.size * 0.6, p.spin, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        case 'harvest': {
          ctx.globalAlpha = Math.min(1, (1 - u) * 2.5);
          ctx.fillStyle = HARVEST_COLORS[Math.floor(p.seed) % HARVEST_COLORS.length]!;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.spin);
          // Confetti: a little card that turns as it falls.
          ctx.scale(Math.cos(p.spin * 1.3), 1);
          ctx.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9);
          ctx.restore();
          break;
        }
        case 'wind': {
          const a = Math.sin(u * Math.PI);
          ctx.globalAlpha = a * 0.35;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x - p.size, p.y);
          ctx.quadraticCurveTo(p.x, p.y - 2, p.x + p.size, p.y);
          ctx.stroke();
          break;
        }
        case 'splash': {
          if (!p.img) break;
          // Springs up from the water line, then sinks and fades.
          const grow = Math.min(1, u * 4);
          const h = p.size * (0.5 + 0.5 * grow) * (1 - Math.max(0, u - 0.5) * 0.8);
          const wpx = p.size * (0.7 + 0.5 * u);
          ctx.globalAlpha = Math.min(1, (1 - u) * 2.2);
          ctx.drawImage(p.img, p.x - wpx / 2, p.y - h, wpx, h);
          break;
        }
        case 'reward': {
          if (!p.img) break;
          const pop = u < 0.2 ? 0.6 + (u / 0.2) * 0.5 : 1.1 - Math.min(0.1, (u - 0.2) * 0.5);
          const r = p.size * pop;
          ctx.globalAlpha = u < 0.7 ? 1 : (1 - u) / 0.3;
          ctx.drawImage(p.img, p.x - r, p.y - r, r * 2, r * 2);
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

  /** Live particles by kind (for the showcase panel). */
  counts(): Partial<Record<ParticleKind, number>> {
    return Object.fromEntries(this.perKind);
  }
}

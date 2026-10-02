import { produceSprite } from '../../data/sprites';
import type { Catch } from '../../data/types';
import type { Quality } from './images';
import { sprite } from './images';
import {
  approach,
  between,
  clamp,
  ellipseNorm,
  intoEllipse,
  rng,
  separate,
  turnToward,
  type Body,
  type Vec,
} from './math';
import { Backdrop, Stage, drawSprite } from './scene';

/*
 * The pond: an ellipse of water with what lives in it at the guest's level.
 * - fish and carp swim smooth curved paths (a heading that turns at a capped rate toward a
 *   wandering target), tilting a little up or down, mirroring through zero when they turn;
 * - shrimp rest on the bottom and dart backwards in short bursts (tail first, like shrimp);
 * - crabs scuttle sideways along the bottom with pauses, never turning around.
 * Tapping the water drops crumbs: a ripple, and the fish come over for a few seconds.
 */

export type PondKind = Extract<Catch, 'fish' | 'shrimp' | 'carp' | 'crab'>;

const COUNT: Record<PondKind, Record<Quality, number>> = {
  fish: { low: 2, medium: 3, high: 4 },
  carp: { low: 1, medium: 2, high: 2 },
  shrimp: { low: 1, medium: 2, high: 3 },
  crab: { low: 1, medium: 1, high: 2 },
};

const SIZE: Record<PondKind, number> = { fish: 0.5, carp: 0.58, shrimp: 0.4, crab: 0.42 };

interface Swimmer extends Body {
  kind: PondKind;
  /** Its own place around a feeding spot, so a crowd of fish does not stack up. */
  slot: number;
  heading: number;
  speed: number;
  turn: number;
  tx: number;
  ty: number;
  retarget: number;
  facing: number;
  /** Shrimp: which way the head points. Crab: which way it scuttles. */
  dir: 1 | -1;
  vx: number;
  rest: number;
  phase: number;
  rand: () => number;
}

export class PondStage extends Stage {
  private kinds: PondKind[] = [];
  private actors: Swimmer[] = [];
  private fish: Swimmer[] = [];
  private bg = new Backdrop();
  private rand = rng(777);
  private attract: Vec | null = null;
  private attractLeft = 0;
  private ambient = 2;
  private builtFor = '';

  setKinds(kinds: PondKind[]): void {
    this.kinds = kinds;
    this.rebuild();
  }

  resize(w: number, h: number): void {
    super.resize(w, h);
    this.builtFor = '';
    this.rebuild();
  }

  private get water() {
    return { cx: this.w / 2, cy: this.h / 2 + 4, rx: this.w / 2 - 18, ry: this.h / 2 - 20 };
  }

  /** The bottom band where shrimp and crabs live, at a given x. */
  private floorY(x: number, k = 0.55): number {
    const { cx, cy, rx, ry } = this.water;
    const u = clamp((x - cx) / rx, -0.95, 0.95);
    return cy + ry * Math.sqrt(1 - u * u) * k;
  }

  private rebuild(): void {
    if (!this.w || !this.scene) return;
    const key = `${this.kinds.join(',')}|${this.env.quality}|${this.w}x${this.h}`;
    if (key === this.builtFor) return;
    this.builtFor = key;
    const { cx, cy, rx, ry } = this.water;
    const out: Swimmer[] = [];
    let n = 0;
    for (const kind of this.kinds) {
      for (let i = 0; i < COUNT[kind][this.env.quality]; i++) {
        const rand = rng(9001 + n * 131);
        // Static spots spread over the pond (also the reduced-motion picture).
        const u = ((n * 0.618 + 0.13) % 1) * 1.5 - 0.75;
        const bottom = kind === 'shrimp' || kind === 'crab';
        const x = cx + u * rx;
        const y = bottom ? 0 : cy + Math.sin(n * 2.3) * ry * 0.35 - ry * 0.1;
        const dir: 1 | -1 = n % 2 ? 1 : -1;
        out.push({
          kind,
          slot: n * 2.4,
          r: kind === 'carp' ? 19 : 17,
          x,
          y,
          heading: dir > 0 ? 0 : Math.PI,
          speed: kind === 'carp' ? between(rand, 13, 18) : between(rand, 16, 24),
          turn: between(rand, 0.9, 1.5),
          tx: x,
          ty: y,
          retarget: between(rand, 0, 2),
          facing: dir,
          dir,
          vx: 0,
          rest: between(rand, 0.5, 2.5),
          phase: rand() * Math.PI * 2,
          rand,
        });
        n++;
      }
    }
    for (const a of out) if (a.kind === 'shrimp' || a.kind === 'crab') a.y = this.floorY(a.x);
    this.actors = out;
    this.fish = out.filter((a) => a.kind === 'fish' || a.kind === 'carp');
    // Settle the starting spots apart (this is also the still picture under reduced motion).
    for (let i = 0; i < 8; i++) {
      separate(this.fish, { left: cx - rx, right: cx + rx, top: cy - ry, bottom: cy + ry }, 2);
      for (const f of this.fish) intoEllipse(f, cx, cy, rx, ry, 0.8);
    }
  }

  update(dt: number): void {
    this.rebuild();
    if (this.env.reduced || dt === 0) return;
    const { cx, cy, rx, ry } = this.water;
    const wasFed = this.attractLeft > 0;
    this.attractLeft = Math.max(0, this.attractLeft - dt);
    // The crumbs are gone: everyone picks a new place to go.
    if (wasFed && this.attractLeft === 0) for (const f of this.fish) f.retarget = 0;
    for (const a of this.actors) {
      if (a.kind === 'fish' || a.kind === 'carp') this.swim(a, dt, cx, cy, rx, ry);
      else if (a.kind === 'shrimp') this.dart(a, dt);
      else this.scuttle(a, dt);
    }
    // Fish keep a body's length apart, then stay in the water.
    separate(this.fish, { left: cx - rx, right: cx + rx, top: cy - ry, bottom: cy + ry }, 1);
    for (const f of this.fish) intoEllipse(f, cx, cy, rx, ry, 0.86);
    // Now and then a ripple somewhere, a bubble from a fish.
    this.ambient -= dt;
    if (this.ambient <= 0) {
      this.ambient = between(this.rand, 1.8, 4.5);
      const p = {
        x: cx + between(this.rand, -0.6, 0.6) * rx,
        y: cy + between(this.rand, -0.5, 0.5) * ry,
      };
      this.ring(p.x, p.y, 12);
      const f = this.actors.find((a) => a.kind === 'fish' || a.kind === 'carp');
      if (f) this.bubbles(f.x - f.facing * 14, f.y - 4, 2);
    }
  }

  private swim(a: Swimmer, dt: number, cx: number, cy: number, rx: number, ry: number) {
    a.retarget -= dt;
    const fed = this.attract && this.attractLeft > 0;
    if (fed && this.attract) {
      a.tx = this.attract.x + Math.cos(a.slot) * 26;
      a.ty = this.attract.y + Math.sin(a.slot) * 10;
    } else if (a.retarget <= 0) {
      a.retarget = between(a.rand, 2.5, 5);
      const ang = a.rand() * Math.PI * 2;
      const r = Math.sqrt(a.rand()) * 0.7;
      a.tx = cx + Math.cos(ang) * rx * r;
      a.ty = cy + Math.sin(ang) * ry * r * 0.8;
    }
    // Close to the bank: aim back at the middle.
    if (ellipseNorm(a, cx, cy, rx, ry) > 0.78) {
      a.tx = cx;
      a.ty = cy;
    }
    const want = Math.atan2((a.ty - a.y) * 1.6, a.tx - a.x);
    const near = Math.hypot(a.tx - a.x, a.ty - a.y) < 10;
    a.heading = turnToward(a.heading, want, a.turn * (fed ? 1.8 : 1) * dt);
    const v =
      a.speed * (fed ? (near ? 0.4 : 1.7) : 1) * (0.85 + 0.15 * Math.sin(a.phase + a.retarget));
    a.x += Math.cos(a.heading) * v * dt;
    a.y += Math.sin(a.heading) * v * 0.55 * dt;
    intoEllipse(a, cx, cy, rx, ry, 0.86);
    const dir = Math.cos(a.heading) >= 0 ? 1 : -1;
    a.facing = approach(a.facing, dir, 5, dt);
    a.phase += dt * (fed ? 9 : 5);
  }

  private dart(a: Swimmer, dt: number) {
    a.vx *= Math.exp(-5 * dt);
    if (a.rest > 0) {
      a.rest -= dt;
      if (a.rest <= 0 && a.rand() < 0.25) {
        a.dir = a.dir === 1 ? -1 : 1; // turned around while resting
        a.rest = between(a.rand, 0.6, 1.5);
      }
    } else {
      // Tail first: a quick kick away from where the head points.
      a.vx = -a.dir * between(a.rand, 110, 160);
      a.rest = between(a.rand, 1.2, 3.2);
      this.puff(a.x, a.y);
    }
    a.x += a.vx * dt;
    const { cx, rx } = this.water;
    const lim = rx * 0.78;
    if (Math.abs(a.x - cx) > lim) {
      a.x = cx + Math.sign(a.x - cx) * lim;
      a.vx = 0;
      a.dir = a.x > cx ? 1 : -1; // head toward the wall, so the next dart goes inward
    }
    a.y = this.floorY(a.x);
    a.phase += dt;
  }

  private scuttle(a: Swimmer, dt: number) {
    if (a.rest > 0) {
      a.rest -= dt;
      if (a.rest <= 0) {
        a.vx = (a.rand() < 0.5 ? -1 : 1) * between(a.rand, 22, 34);
        a.retarget = between(a.rand, 0.5, 1.3);
      }
    } else {
      a.retarget -= dt;
      a.x += a.vx * dt;
      a.phase += dt * 22;
      if (a.retarget <= 0) {
        a.vx = 0;
        a.rest = between(a.rand, 1, 2.6);
      }
    }
    const { cx, rx } = this.water;
    const lim = rx * 0.72;
    if (Math.abs(a.x - cx) > lim) {
      a.x = cx + Math.sign(a.x - cx) * lim;
      a.vx = -a.vx;
    }
    a.y = this.floorY(a.x, 0.62);
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    const { cx, cy, rx, ry } = this.water;
    this.bg.draw(ctx, this.w, this.h, (c, w, h) => paintPond(c, w, h, cx, cy, rx, ry));
    const reduced = this.env.reduced;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    // Bottom dwellers first, dimmer: they are deeper.
    for (const a of this.actors) {
      if (a.kind !== 'shrimp' && a.kind !== 'crab') continue;
      const img = sprite(produceSprite(a.kind));
      if (!img) continue;
      if (a.kind === 'crab') {
        const step = a.vx && !reduced ? Math.abs(Math.sin(a.phase)) * -1.2 : 0;
        const rock = a.vx && !reduced ? Math.sin(a.phase) * 0.05 : 0;
        drawSprite(ctx, img, a.x, a.y + step, SIZE.crab, { rot: rock, alpha: 0.78 });
      } else {
        // Shrimp sprite looks left; head points toward `dir`.
        const twitch = reduced ? 0 : Math.sin(t * 7 + a.phase) * 0.03;
        drawSprite(ctx, img, a.x, a.y, SIZE.shrimp, {
          sx: a.dir > 0 ? -1 : 1,
          rot: twitch,
          alpha: 0.8,
        });
      }
    }
    for (const a of this.actors) {
      if (a.kind !== 'fish' && a.kind !== 'carp') continue;
      const img = sprite(produceSprite(a.kind));
      if (!img) continue;
      const moveX = Math.cos(a.heading);
      const tilt = reduced
        ? 0
        : clamp(Math.atan2(Math.sin(a.heading) * 0.55, Math.abs(moveX)), -0.35, 0.35);
      const sx = -Math.sign(a.facing || 1) * Math.max(0.12, Math.abs(a.facing));
      // A slight body wave (the whole sprite; no cut-out tail).
      const wave = reduced ? 1 : 1 + Math.sin(a.phase * 1.6) * 0.03;
      drawSprite(ctx, img, a.x, a.y, SIZE[a.kind], {
        sx: sx * wave,
        rot: tilt * Math.sign(a.facing || 1),
        alpha: 0.9,
        anchor: 'center',
      });
    }
    ctx.restore();
    // Surface shimmer: two slow light streaks.
    if (!reduced) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) {
        const k = (t * 0.05 + i * 0.5) % 1;
        const x = cx - rx * 0.6 + k * rx * 1.2;
        const y = cy - ry * 0.35 + i * ry * 0.45;
        ctx.globalAlpha = Math.sin(Math.PI * k);
        ctx.beginPath();
        ctx.ellipse(x, y, 16, 3, 0, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // Lily pads float over the fish.
    paintPads(ctx, cx, cy, rx, ry, reduced ? 0 : t);
  }

  tap(x: number, y: number): void {
    const { cx, cy, rx, ry } = this.water;
    if (ellipseNorm({ x, y }, cx, cy, rx, ry) > 1) return;
    this.attract = { x, y };
    this.attractLeft = 3.5;
    if (this.env.reduced) return;
    this.ring(x, y, 16);
    for (let i = 0; i < 5; i++)
      this.particles.spawn({
        layer: this.layer,
        kind: 'dot',
        x: x + between(this.rand, -8, 8),
        y: y + between(this.rand, -3, 3),
        vy: between(this.rand, 4, 10),
        life: 1.4,
        size: 1.4,
        color: '#d9b26a',
      });
  }

  private ring(x: number, y: number, size: number) {
    this.particles.spawn({
      layer: this.layer,
      kind: 'ring',
      x,
      y,
      life: 1.6,
      size,
      color: 'rgba(255, 255, 255, 0.75)',
    });
  }

  private bubbles(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++)
      this.particles.spawn({
        layer: this.layer,
        kind: 'bubble',
        x: x + i * 3,
        y: y - i * 4,
        vy: -between(this.rand, 10, 18),
        life: 1.3,
        size: 1.6 + i * 0.6,
        color: 'rgba(230, 250, 255, 0.85)',
      });
  }

  private puff(x: number, y: number) {
    for (let i = 0; i < 2; i++)
      this.particles.spawn({
        layer: this.layer,
        kind: 'dot',
        x: x + between(this.rand, -6, 6),
        y: y - 2,
        vx: between(this.rand, -12, 12),
        vy: -between(this.rand, 4, 10),
        g: 10,
        life: 0.7,
        size: 2,
        color: 'rgba(200, 180, 130, 0.55)',
      });
  }
}

function paintPond(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): void {
  c.fillStyle = '#7fae55';
  c.fillRect(0, 0, w, h);
  // Bank.
  c.fillStyle = '#c9a971';
  c.beginPath();
  c.ellipse(cx, cy + 2, rx + 10, ry + 9, 0, 0, Math.PI * 2);
  c.fill();
  const g = c.createRadialGradient(cx, cy - ry * 0.3, 4, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, '#6cc3d6');
  g.addColorStop(0.7, '#3d97b3');
  g.addColorStop(1, '#2c7896');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
  // Sandy bottom toward the front.
  c.save();
  c.clip();
  c.fillStyle = 'rgba(220, 200, 150, 0.22)';
  c.beginPath();
  c.ellipse(cx, cy + ry * 0.75, rx * 0.95, ry * 0.45, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  // Reeds on the left bank.
  const rand = rng(31);
  c.strokeStyle = '#4f7d33';
  c.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const x = cx - rx - 2 + i * 4;
    const y = cy - ry * 0.2 + rand() * 6;
    c.beginPath();
    c.moveTo(x, y + 14);
    c.quadraticCurveTo(x - 2, y, x + rand() * 4 - 2, y - 10 - rand() * 8);
    c.stroke();
  }
}

function paintPads(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  t: number,
): void {
  const pads: [number, number, number][] = [
    [0.62, -0.45, 11],
    [0.74, -0.18, 8],
    [-0.7, 0.42, 9],
  ];
  pads.forEach(([u, v, r], i) => {
    const x = cx + u * rx + Math.sin(t * 0.4 + i) * 1.2;
    const y = cy + v * ry;
    c.fillStyle = '#5d9b3f';
    c.beginPath();
    c.moveTo(x, y);
    c.ellipse(x, y, r, r * 0.55, 0, 0.3, Math.PI * 2 - 0.1);
    c.closePath();
    c.fill();
    if (i === 0) {
      c.fillStyle = '#f7c6d8';
      c.beginPath();
      c.arc(x - 2, y - 3, 3, 0, Math.PI * 2);
      c.fill();
    }
  });
}

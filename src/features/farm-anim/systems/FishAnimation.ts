import type { Assets } from '../engine/assets';
import { type AnimSystem, type World, clamp } from '../engine/world';
import { KOI_LOOKS, type KoiLook, drawKoi } from './koiPainter';
import type { WaterAnimation } from './WaterAnimation';

/**
 * Koi: each picks a spot in open water, turns towards it at a limited rate, speeds up and slows
 * down, sometimes idles near the surface (a small ring) and now and then jumps: out of the water
 * on an arc, splash on take-off and a bigger one on landing. Drawn by koiPainter (a bending
 * body seen from above), squashed onto the water plane of the 3/4 view.
 */

/** Vertical squash of the water plane in the painting's 3/4 view. */
const PLANE = 0.6;
/** The fish has body depth, so it is squashed less than the water it swims in. */
const BODY_PLANE = 0.76;

type FishState = 'swim' | 'pause' | 'jump';

interface Fish {
  look: KoiLook;
  x: number;
  y: number;
  heading: number;
  speed: number;
  targetSpeed: number;
  tx: number;
  ty: number;
  state: FishState;
  timer: number;
  wag: number;
  /** Smoothed turn rate −1..1 (the body curls into turns). */
  turn: number;
  /** Jump progress. */
  jump: { u: number; x0: number; y0: number; dx: number; dy: number; h: number } | null;
}

const JUMP_TIME = 1.05;

export function animateFish(f: Fish, w: World, water: WaterAnimation) {
  const dt = w.dt;
  if (f.state === 'jump' && f.jump) {
    const j = f.jump;
    j.u += dt / JUMP_TIME;
    if (j.u >= 1) {
      f.x = j.x0 + j.dx;
      f.y = j.y0 + j.dy;
      splash(w, water, f.x, f.y, 1.2);
      f.jump = null;
      f.state = 'swim';
      f.speed = 18;
      pickTarget(f, w, water);
    }
    return;
  }
  f.timer -= dt;
  if (f.state === 'pause') {
    f.targetSpeed = 2;
    if (f.timer <= 0) {
      f.state = 'swim';
      pickTarget(f, w, water);
    }
  } else if (Math.hypot(f.tx - f.x, f.ty - f.y) < 14 || f.timer <= 0) {
    if (w.rand() < 0.35) {
      f.state = 'pause';
      f.timer = 1 + w.rand() * 2.5;
      // Nosing at the surface.
      water.ripple(f.x + Math.cos(f.heading) * 10, f.y + Math.sin(f.heading) * 5, 0.6);
    } else pickTarget(f, w, water);
  }
  // Steer: turn towards the target at a limited rate (slower when fast), speed eases.
  const want = Math.atan2(f.ty - f.y, f.tx - f.x);
  let d = want - f.heading;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const turn = 1.6 / (1 + f.speed / 30);
  const dh = clamp(d, -turn * dt, turn * dt);
  f.heading += dh;
  f.turn += ((dt > 0 ? dh / dt / 1.6 : 0) - f.turn) * Math.min(1, dt * 5);
  // Slow down for sharp turns.
  const target =
    f.state === 'pause' ? f.targetSpeed : f.targetSpeed * (1 - Math.min(0.7, Math.abs(d) / 2));
  f.speed += clamp(target - f.speed, -14 * dt, 10 * dt);
  // Water depth in 3/4 view: vertical movement looks shorter.
  const nx = f.x + Math.cos(f.heading) * f.speed * dt;
  const ny = f.y + Math.sin(f.heading) * f.speed * dt * PLANE;
  if (water.isWater(nx, ny, 10)) {
    f.x = nx;
    f.y = ny;
  } else {
    // Bumped the bank: turn away.
    f.heading += Math.PI * 0.6 * dt * 4;
    pickTarget(f, w, water);
  }
  f.wag += dt * (3.5 + f.speed * 0.3);
}

function pickTarget(f: Fish, w: World, water: WaterAnimation) {
  for (let k = 0; k < 30; k++) {
    // Mostly somewhere ahead-ish, so paths curve instead of zig-zagging.
    const a = f.heading + (w.rand() - 0.5) * 2.6;
    const dist = 50 + w.rand() * 140;
    const x = f.x + Math.cos(a) * dist;
    const y = f.y + Math.sin(a) * dist * PLANE;
    if (water.isWater(x, y, 16)) {
      f.tx = x;
      f.ty = y;
      break;
    }
  }
  f.targetSpeed = 9 + w.rand() * 18 + (w.rand() < 0.15 ? 18 : 0);
  f.timer = 6 + w.rand() * 6;
}

/** The sheet's splash crown (cached per asset set). */
let crown: { assets: World['assets']; img: HTMLImageElement | null } | null = null;
function crownImg(w: World) {
  if (crown?.assets !== w.assets) {
    const def = w.assets.layout.fx?.splash;
    crown = { assets: w.assets, img: def ? w.assets.img(def.file) : null };
  }
  return crown.img;
}

function splash(w: World, water: WaterAnimation, x: number, y: number, size: number) {
  water.ripple(x, y, size);
  water.ripple(x, y, size * 0.6);
  if (!w.settings.particles) return;
  const img = crownImg(w);
  if (img)
    w.particles.spawn('splash', x, y + 2, 0, 0, 0.55 + size * 0.15, 18 + size * 10, 1e9, img);
  const n = Math.round(6 + size * 6);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (w.rand() - 0.5) * 2.2;
    const v = 30 + w.rand() * 50 * size;
    w.particles.spawn(
      'drop',
      x + (w.rand() - 0.5) * 6,
      y - 1,
      Math.cos(a) * v,
      Math.sin(a) * v,
      1,
      0.8 + w.rand() * 1.1,
      y + 3,
    );
  }
}

export class FishAnimation implements AnimSystem {
  private fish: Fish[] = [];
  private nextJump = 9;

  constructor(
    assets: Assets,
    private water: WaterAnimation,
  ) {
    const { layout } = assets;
    const homes = [1, 2, 3, 4].map((i) => layout.sprites[`koi-${i}`]).filter((k) => !!k);
    KOI_LOOKS.forEach((look, i) => {
      const k = homes[i % homes.length];
      const x = k ? k.x + k.w / 2 + (i >= homes.length ? 60 : 0) : 1000;
      const y = k ? k.y + k.h / 2 : 760;
      const heading = i * 1.3;
      this.fish.push({
        look,
        x,
        y,
        heading,
        speed: 0,
        targetSpeed: 12,
        tx: x,
        ty: y,
        state: 'pause',
        timer: 0.4 + i * 0.5,
        wag: i * 1.7,
        turn: 0,
        jump: null,
      });
    });
  }

  update(w: World) {
    for (const f of this.fish) animateFish(f, w, this.water);
    this.nextJump -= w.dt;
    if (this.nextJump <= 0) {
      this.nextJump = 12 + w.rand() * 16;
      const f = this.fish.filter((q) => q.state !== 'jump')[
        Math.floor(w.rand() * this.fish.length)
      ];
      if (f) {
        const dx = Math.cos(f.heading) * 46;
        const dy = Math.sin(f.heading) * 26;
        if (this.water.isWater(f.x + dx, f.y + dy, 14)) {
          f.state = 'jump';
          f.jump = { u: 0, x0: f.x, y0: f.y, dx, dy, h: 30 + w.rand() * 12 };
          splash(w, this.water, f.x, f.y, 0.7);
        }
      }
    }
  }

  private drawFish(ctx: CanvasRenderingContext2D, f: Fish) {
    const L = f.look.length;
    let x = f.x;
    let y = f.y;
    let lift = 0;
    let pitch = 0;
    if (f.jump) {
      const j = f.jump;
      const u = j.u;
      x = j.x0 + j.dx * u;
      y = j.y0 + j.dy * u;
      lift = Math.sin(u * Math.PI) * j.h;
      pitch = 0.7 - u * 1.4;
    }
    // Shadow on the pond bed, a little behind and below the fish.
    ctx.globalAlpha = f.jump ? 0.12 : 0.18;
    ctx.fillStyle = '#0a4f6b';
    ctx.save();
    ctx.translate(x + 4, y + 6);
    ctx.scale(1, PLANE);
    ctx.rotate(f.heading);
    ctx.beginPath();
    ctx.ellipse(-L * 0.05, 0, L * 0.45, L * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const speedK = clamp(f.speed / 26, 0, 1);
    ctx.globalAlpha = f.jump ? 1 : 0.9;
    ctx.save();
    ctx.translate(x, y - lift);
    if (f.jump) {
      // In the air the fish shows more of its side: less squash, nose up then down.
      ctx.rotate(Math.cos(f.heading) >= 0 ? -pitch * 0.8 : pitch * 0.8);
      ctx.scale(1.08, 0.8);
    } else ctx.scale(1, BODY_PLANE);
    ctx.rotate(f.heading);
    drawKoi(ctx, f.look, f.wag, f.jump ? 1.4 : 0.35 + speedK * 0.9, -f.turn);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /** Fish under the surface (before reeds and the dock). */
  drawUnder(ctx: CanvasRenderingContext2D) {
    for (const f of this.fish) if (!f.jump) this.drawFish(ctx, f);
  }

  /** Fish in the air (above everything on the pond). */
  drawAir(ctx: CanvasRenderingContext2D) {
    for (const f of this.fish) if (f.jump) this.drawFish(ctx, f);
  }

  /** Make one fish jump now (debug). */
  jumpNow() {
    this.nextJump = 0;
  }

  count() {
    return this.fish.length;
  }
}

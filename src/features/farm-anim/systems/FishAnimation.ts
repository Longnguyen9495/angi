import type { Assets } from '../engine/assets';
import { type AnimSystem, type World, clamp } from '../engine/world';
import type { WaterAnimation } from './WaterAnimation';

/**
 * Koi: each picks a spot in open water, turns towards it at a limited rate, speeds up and slows
 * down, sometimes idles near the surface (a small ring) and now and then jumps: out of the water
 * on an arc, splash on take-off and a bigger one on landing.
 *
 * The fish are the asset sheet's koi (koi-N.webp, laid flat with the nose to the right by
 * prepare.mjs). Each is drawn in thin strips across its body, shifted sideways by a wave that grows
 * towards the tail, so it swims with its whole body and curls into turns. It faces left or right by
 * mirroring (squeezed through edge-on while it turns round) and tilts towards its heading within a
 * limit, so a side-view sprite never stands on its nose.
 */

/** Vertical squash of the water plane in the painting's 3/4 view. */
const PLANE = 0.6;
/** Strips the body is cut into for the swim wave. */
const STRIPS = 9;
/** Most the sprite tilts towards a heading that runs up or down the picture (radians). */
const MAX_TILT = 0.62;

type FishState = 'swim' | 'pause' | 'jump';

interface Fish {
  id: string;
  img: HTMLImageElement;
  /** Drawn length and height (picture px). */
  len: number;
  tall: number;
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
  /** Facing −1..1 (left..right; near 0 = edge-on, mid-turn) and drawn tilt. */
  face: number;
  tilt: number;
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
  // Face the way it swims (with some slack round straight up/down, so it doesn't flicker), and
  // tilt towards the heading as seen on screen.
  const cx = Math.cos(f.heading);
  const want2 = Math.abs(cx) > 0.2 ? Math.sign(cx) : f.face >= 0 ? 1 : -1;
  f.face += clamp(want2 - f.face, -3.2 * dt, 3.2 * dt);
  f.tilt += (tiltFor(f.heading, f.face) - f.tilt) * Math.min(1, dt * 4);
}

/** Screen tilt of a sprite facing `face` that swims along `heading` (on the water plane). */
function tiltFor(heading: number, face: number) {
  const a = Math.atan2(Math.sin(heading) * PLANE, Math.cos(heading));
  let r = face >= 0 ? a : a - Math.PI;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return clamp(r, -MAX_TILT, MAX_TILT);
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
    for (let i = 1; layout.sprites[`koi-${i}`]; i++) {
      const k = layout.sprites[`koi-${i}`]!;
      const x = k.x + k.w / 2;
      const y = k.y + k.h / 2;
      const heading = i * 1.3;
      this.fish.push({
        id: `koi-${i}`,
        img: assets.img(k.file),
        len: k.w,
        tall: k.h,
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
        face: Math.cos(heading) >= 0 ? 1 : -1,
        tilt: 0,
        jump: null,
      });
      const f = this.fish[this.fish.length - 1]!;
      f.tilt = tiltFor(heading, f.face);
    }
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
    const L = f.len;
    let x = f.x;
    let y = f.y;
    let lift = 0;
    let tilt = f.tilt;
    if (f.jump) {
      const j = f.jump;
      const u = j.u;
      x = j.x0 + j.dx * u;
      y = j.y0 + j.dy * u;
      lift = Math.sin(u * Math.PI) * j.h;
      // Nose up on the way out, down on the way back in.
      const pitch = 0.75 - u * 1.5;
      tilt = clamp(tilt * 0.4 - pitch * Math.sign(f.face || 1), -1.1, 1.1);
    }
    const face = Math.abs(f.face) < 0.06 ? 0.06 * Math.sign(f.face || 1) : f.face;
    // Shadow on the pond bed, a little behind and below the fish.
    ctx.globalAlpha = f.jump ? 0.12 : 0.18;
    ctx.fillStyle = '#0a4f6b';
    ctx.save();
    ctx.translate(x + 4, y + 7);
    ctx.rotate(f.tilt);
    ctx.beginPath();
    ctx.ellipse(0, 0, L * 0.44 * Math.max(0.35, Math.abs(face)), L * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const speedK = clamp(f.speed / 26, 0, 1);
    const amp = f.jump ? 1.2 : 0.35 + speedK * 0.9;
    // In the air the body arches; in the water it curls into turns.
    const curl = f.jump ? Math.sin(f.jump.u * Math.PI) * 0.5 : -f.turn * Math.sign(face);
    ctx.globalAlpha = f.jump ? 1 : 0.92;
    ctx.save();
    ctx.translate(x, y - lift);
    ctx.rotate(tilt);
    ctx.scale(face, 1);
    const img = f.img;
    const sw = img.naturalWidth / STRIPS;
    const dw = L / STRIPS;
    const H = f.tall;
    for (let i = 0; i < STRIPS; i++) {
      // s: 0 at the nose (right end), 1 at the tail.
      const s = 1 - (i + 0.5) / STRIPS;
      const wave = Math.sin(f.wag - s * 4.4) * 0.07 * amp * s * L;
      const bend = curl * s * s * L * 0.16;
      // Strips overlap by a hair so no seam shows between them.
      const last = i === STRIPS - 1;
      ctx.drawImage(
        img,
        i * sw,
        0,
        last ? sw : sw + 1,
        img.naturalHeight,
        -L / 2 + i * dw,
        -H / 2 + wave + bend,
        last ? dw : dw + 0.6,
        H,
      );
    }
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

  /** Where each fish is now (sprite inspector). */
  pieces() {
    return this.fish.map((f) => ({
      id: f.id,
      file: `${f.id}.webp`,
      at: [f.x, f.y - (f.jump ? Math.sin(f.jump.u * Math.PI) * f.jump.h : 0)] as [number, number],
      r: f.len / 2,
    }));
  }
}

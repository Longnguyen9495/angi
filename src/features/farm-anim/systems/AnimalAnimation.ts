import type { Assets } from '../engine/assets';
import type { SpriteDef, Vec2 } from '../engine/types';
import { type AnimSystem, type World, clamp } from '../engine/world';

/**
 * The painted animals, kept in the painting's own brushwork:
 *  - cows stay where they were painted and move as soft-edged copies of themselves: breathing,
 *    shifting their weight, grazing (head down, chewing), lifting the head to look, ear flicks
 *    (quick head shakes) and the house cow's tail swish. A few pixels of motion, so the painting
 *    underneath fills in and no cut edge shows.
 *  - hens (the painted hen, cut along its outline) walk with little hops, peck 1–3 times, flap,
 *    turn round; each on its own timing, inside its own patch behind the fence.
 */

type CowState = 'idle' | 'graze' | 'look' | 'shift';

interface Cow {
  body: SpriteDef & { feet: Vec2 };
  head: SpriteDef & { base: Vec2 };
  tail: (SpriteDef & { base: Vec2 }) | null;
  imgs: { body: HTMLImageElement; head: HTMLImageElement; tail: HTMLImageElement | null };
  state: CowState;
  timer: number;
  graze: number;
  look: number;
  shift: number;
  shiftTo: number;
  flick: number;
  swish: number;
  seed: number;
}

type HenState = 'idle' | 'peck' | 'walk' | 'flap';

interface Hen {
  sprite: SpriteDef & { feet: Vec2 };
  img: HTMLImageElement;
  x: number;
  y: number;
  dir: 1 | -1;
  state: HenState;
  timer: number;
  pecks: number;
  tx: number;
  ty: number;
  phase: number;
  zone: [number, number, number, number];
  ok: (x: number, y: number) => boolean;
  seed: number;
}

const PECK = 0.42;
const ease = (cur: number, target: number, rate: number, dt: number) =>
  cur + (target - cur) * Math.min(1, dt * rate);

export function animateCow(c: Cow, w: World) {
  const dt = w.dt;
  c.timer -= dt;
  if (c.timer <= 0) {
    const r = w.rand();
    c.state = r < 0.45 ? 'graze' : r < 0.65 ? 'look' : r < 0.85 ? 'shift' : 'idle';
    c.timer = c.state === 'graze' ? 4 + w.rand() * 5 : 2 + w.rand() * 2.5;
    // Shifting weight: the body sways a step's worth one way, then settles.
    if (c.state === 'shift') c.shiftTo = (w.rand() < 0.5 ? -1 : 1) * (1.2 + w.rand() * 1.2);
  }
  c.graze = ease(c.graze, c.state === 'graze' && c.timer > 0.9 ? 1 : 0, 1.8, dt);
  c.look = ease(c.look, c.state === 'look' ? 1 : 0, 2.5, dt);
  c.shift = ease(c.shift, c.state === 'shift' ? c.shiftTo : 0, 1.6, dt);
  c.flick -= dt;
  if (c.flick < -3 - w.rand() * 4) c.flick = 0.35;
  c.swish -= dt;
  if (c.swish < -2.5 - w.rand() * 3) c.swish = 1.1;
}

export function animateChicken(h: Hen, w: World) {
  const dt = w.dt;
  h.timer -= dt;
  if (h.state === 'walk') {
    const dx = h.tx - h.x;
    const dy = h.ty - h.y;
    const d = Math.hypot(dx, dy);
    if (d < 1 || h.timer <= 0) {
      h.state = 'peck';
      h.pecks = 1 + Math.floor(w.rand() * 3);
      h.timer = PECK;
    } else {
      const v = Math.min(d, 18 * dt);
      h.x += (dx / d) * v;
      h.y += (dy / d) * v;
      h.phase += v / 7;
    }
    return;
  }
  if (h.timer > 0) return;
  if (h.state === 'peck' && h.pecks > 1) {
    h.pecks--;
    h.timer = PECK;
    return;
  }
  const r = w.rand();
  if (r < 0.45) {
    for (let k = 0; k < 12; k++) {
      const [x0, y0, x1, y1] = h.zone;
      const tx = clamp(h.x + (w.rand() - 0.5) * 56, x0, x1);
      const ty = clamp(h.y + (w.rand() - 0.5) * 24, y0, y1);
      if (Math.hypot(tx - h.x, ty - h.y) > 8 && h.ok(tx, ty)) {
        h.tx = tx;
        h.ty = ty;
        h.state = 'walk';
        h.dir = tx > h.x ? 1 : -1;
        h.timer = 4;
        return;
      }
    }
  }
  if (r < 0.75) {
    h.state = 'peck';
    h.pecks = 1 + Math.floor(w.rand() * 3);
    h.timer = PECK;
  } else if (r < 0.86) {
    h.state = 'flap';
    h.timer = 0.6;
  } else {
    h.state = 'idle';
    h.timer = 0.8 + w.rand() * 1.8;
    if (w.rand() < 0.35) h.dir = h.dir === 1 ? -1 : 1;
  }
}

/** Front fence of the yard runs from (1130, 457) to (1257, 500): hens stay behind it. */
const behindFence = (x: number, y: number) => y < 457 + (x - 1130) * 0.34 - 4;
/** The coop stands between the two patches. */
const offCoop = (x: number, y: number) => !(x > 1255 && x < 1392 && y > 395 && y < 532);

export class AnimalAnimation implements AnimSystem {
  private cows: Cow[] = [];
  private flock: Hen[] = [];

  constructor(assets: Assets) {
    const { sprites } = assets.layout;
    const { img } = assets;
    for (const [i, id] of ['cowY', 'cowH'].entries()) {
      const body = sprites[`${id}-body`] as (SpriteDef & { feet: Vec2 }) | undefined;
      const head = sprites[`${id}-head`] as (SpriteDef & { base: Vec2 }) | undefined;
      const tail = (sprites[`${id}-tail`] as (SpriteDef & { base: Vec2 }) | undefined) ?? null;
      if (!body || !head) continue;
      this.cows.push({
        body,
        head,
        tail,
        imgs: { body: img(body.file), head: img(head.file), tail: tail ? img(tail.file) : null },
        state: 'idle',
        timer: 1 + i * 1.7,
        graze: 0,
        look: 0,
        shift: 0,
        shiftTo: 0,
        flick: -i * 2,
        swish: 0,
        seed: i * 2.3,
      });
    }
    const left: Hen['zone'] = [1150, 448, 1250, 492];
    const right: Hen['zone'] = [1395, 440, 1470, 488];
    const hen = (id: string, zone: Hen['zone'], dir: 1 | -1, seed: number) => {
      const s = sprites[id] as (SpriteDef & { feet: Vec2 }) | undefined;
      if (!s) return;
      const [x, y] = s.start ?? s.feet;
      this.flock.push({
        sprite: s,
        img: img(s.file),
        x,
        y,
        dir,
        state: 'idle',
        timer: 0.5 + seed,
        pecks: 0,
        tx: x,
        ty: y,
        phase: 0,
        zone,
        ok: (px, py) => behindFence(px, py) && offCoop(px, py),
        seed,
      });
    };
    hen('chicken-1', left, -1, 0.2);
    hen('chicken-2', right, 1, 1.3);
  }

  /** Where the hens stand now (for taps). */
  hens(): Vec2[] {
    return this.flock.map((h) => [h.x, h.y]);
  }

  update(w: World) {
    for (const c of this.cows) animateCow(c, w);
    for (const h of this.flock) animateChicken(h, w);
  }

  draw(ctx: CanvasRenderingContext2D, w: World) {
    for (const c of this.cows) this.drawCow(ctx, w, c);
    for (const h of [...this.flock].sort((a, b) => a.y - b.y)) this.drawHen(ctx, w, h);
  }

  private drawCow(ctx: CanvasRenderingContext2D, w: World, c: Cow) {
    const { body, head, tail, imgs } = c;
    const [fx, fy] = body.feet;
    const breathe = Math.sin(w.t * 1.6 + c.seed);
    ctx.save();
    // Body: breathing (chest rises), weight shifting sideways from the feet.
    ctx.translate(fx, fy);
    ctx.transform(1, 0, -c.shift * 0.012, 1 + 0.009 * breathe, c.shift * 0.4, 0);
    ctx.translate(-fx, -fy);
    ctx.drawImage(imgs.body, body.x, body.y);
    if (tail && imgs.tail) {
      const swing =
        Math.sin(w.t * 1.4 + c.seed) * 0.18 + (c.swish > 0 ? Math.sin(c.swish * 11) * 0.35 : 0);
      ctx.save();
      ctx.translate(tail.base[0], tail.base[1]);
      ctx.rotate(swing);
      ctx.drawImage(imgs.tail, tail.x - tail.base[0], tail.y - tail.base[1]);
      ctx.restore();
    }
    // Head about the neck: down to graze (it faces left, so down is anticlockwise), up to look,
    // chewing while it grazes, a quick shake for an ear flick.
    const chew = c.graze > 0.6 ? Math.sin(w.t * 7 + c.seed) * 0.025 : 0;
    const flick = c.flick > 0 ? Math.sin(c.flick * 40) * 0.035 : 0;
    const nod = Math.sin(w.t * 0.8 + c.seed) * 0.015;
    const rot = -0.15 * c.graze + 0.06 * c.look + chew + flick + nod;
    ctx.translate(head.base[0], head.base[1] + c.graze * 1.5);
    ctx.rotate(rot);
    ctx.drawImage(imgs.head, head.x - head.base[0], head.y - head.base[1]);
    ctx.restore();
  }

  private drawHen(ctx: CanvasRenderingContext2D, w: World, h: Hen) {
    const s = h.sprite;
    let rot = 0;
    let lift = 0;
    let sx = 1;
    let sy = 1;
    if (h.state === 'walk') {
      // Little hops, body rocking with each step.
      lift = Math.abs(Math.sin(h.phase * Math.PI)) * 1.8;
      rot = Math.sin(h.phase * Math.PI) * 0.06;
    } else if (h.state === 'peck') {
      const u = clamp(1 - h.timer / PECK, 0, 1);
      // Quick dip forward (the head end of the sprite), hold a moment, recover.
      const dip = u < 0.35 ? u / 0.35 : u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4;
      rot = -0.38 * dip;
      sy = 1 - 0.04 * dip;
    } else if (h.state === 'flap') {
      const u = 1 - h.timer / 0.6;
      lift = Math.sin(u * Math.PI) * 5;
      sx = 1 + Math.sin(u * Math.PI * 6) * 0.06;
      sy = 1 - Math.sin(u * Math.PI * 6) * 0.04;
    } else {
      // Idle: small head-and-body jerks.
      rot = Math.round(Math.sin(w.t * 1.7 + h.seed * 3) * 2) * 0.025;
    }
    ctx.fillStyle = 'rgba(70,45,20,0.22)';
    ctx.beginPath();
    ctx.ellipse(h.x, h.y, 13 - lift, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(h.x, h.y - lift);
    // The painted hen faces left; flip when it goes right.
    ctx.scale(h.dir === 1 ? -sx : sx, sy);
    ctx.rotate(rot);
    ctx.drawImage(h.img, s.x - s.feet[0], s.y - s.feet[1]);
    ctx.restore();
  }

  count() {
    return this.cows.length + this.flock.length;
  }
}

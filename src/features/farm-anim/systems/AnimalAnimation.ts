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
  temper: { walk: number; peck: number; flap: number; speed: number };
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
      const v = Math.min(d, h.temper.speed * dt);
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
  const t = h.temper;
  if (r < t.walk) {
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
  if (r < t.peck) {
    h.state = 'peck';
    h.pecks = 1 + Math.floor(w.rand() * 3);
    h.timer = PECK;
  } else if (r < t.flap) {
    h.state = 'flap';
    h.timer = 0.6;
  } else {
    h.state = 'idle';
    h.timer = 0.8 + w.rand() * 1.8;
    if (w.rand() < 0.35) h.dir = h.dir === 1 ? -1 : 1;
  }
}

/** Each hen's habits: how often it wanders, pecks, flaps, and how fast it walks. */
interface Temper {
  walk: number;
  peck: number;
  flap: number;
  speed: number;
}
const TEMPERS: Temper[] = [
  { walk: 0.45, peck: 0.75, flap: 0.86, speed: 18 }, // busy
  { walk: 0.25, peck: 0.8, flap: 0.86, speed: 14 }, // a pecker
  { walk: 0.55, peck: 0.7, flap: 0.9, speed: 22 }, // restless
  { walk: 0.3, peck: 0.55, flap: 0.95, speed: 15 }, // a looker (more idle, head jerks)
];

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
    const { zones, fence, coop } = assets.layout.places.hens;
    const [[fx0, fy0], [fx1, fy1]] = fence;
    const slope = (fy1 - fy0) / (fx1 - fx0);
    // Hens stay behind the yard's front fence and out of the coop.
    const ok = (x: number, y: number) =>
      y < fy0 + (x - fx0) * slope - 4 &&
      !(x > coop[0] && x < coop[2] && y > coop[1] && y < coop[3]);
    const ids = Object.keys(sprites)
      .filter((k) => /^chicken-\d+$/.test(k))
      .sort();
    ids.forEach((id, i) => {
      const s = sprites[id] as (SpriteDef & { feet: Vec2 }) | undefined;
      if (!s) return;
      const [x, y] = s.start ?? s.feet;
      // The patch the hen starts in (nearest centre).
      const zone =
        [...zones].sort(
          (a, b) =>
            Math.hypot((a[0] + a[2]) / 2 - x, (a[1] + a[3]) / 2 - y) -
            Math.hypot((b[0] + b[2]) / 2 - x, (b[1] + b[3]) / 2 - y),
        )[0] ?? ([x - 50, y - 20, x + 50, y + 20] as Hen['zone']);
      const seed = 0.2 + i * 1.1;
      this.flock.push({
        sprite: s,
        img: img(s.file),
        x,
        y,
        dir: i % 2 ? 1 : -1,
        state: 'idle',
        timer: 0.5 + seed,
        pecks: 0,
        tx: x,
        ty: y,
        phase: 0,
        zone,
        ok,
        seed,
        temper: TEMPERS[i % TEMPERS.length]!,
      });
    });
  }

  /** Showcase: the cows graze and swish, the hens each do something different at once. */
  replay() {
    for (const c of this.cows) {
      c.state = 'graze';
      c.timer = 4.5;
      c.flick = 0.35;
      c.swish = 1.1;
    }
    this.flock.forEach((h, i) => {
      const act = (['flap', 'peck', 'flap', 'peck'] as const)[i % 4]!;
      h.state = act;
      h.timer = act === 'flap' ? 0.6 : 0.42;
      h.pecks = 3;
    });
  }

  /** Cows and hens for the sprite inspector: id, file and where they stand. */
  pieces(): { id: string; file: string; at: Vec2; r: number }[] {
    return [
      ...this.cows.map((c, i) => ({
        id: ['cowY', 'cowH'][i] ?? 'cow',
        file: c.body.file,
        at: [c.body.x + c.body.w / 2, c.body.y + c.body.h / 2] as Vec2,
        r: Math.max(c.body.w, c.body.h) / 2,
      })),
      ...this.flock.map((h) => ({
        id: h.sprite.file.replace('.webp', ''),
        file: h.sprite.file,
        at: [h.x, h.y - 20] as Vec2,
        r: 22,
      })),
    ];
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
    // Mirror when it walks the other way from where its head points in the file.
    const facesRight = s.faces === 'right';
    const flip = (h.dir === 1) !== facesRight;
    ctx.scale(flip ? -sx : sx, sy);
    // Pecking tips the head end down: for a right-facing file that is a clockwise turn.
    ctx.rotate(facesRight ? -rot : rot);
    ctx.drawImage(h.img, s.x - s.feet[0], s.y - s.feet[1], s.w, s.h);
    ctx.restore();
  }

  count() {
    return this.cows.length + this.flock.length;
  }
}

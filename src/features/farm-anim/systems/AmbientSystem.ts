import type { Assets } from '../engine/assets';
import type { FxId, Vec2 } from '../engine/types';
import { type AnimSystem, type World, clamp } from '../engine/world';

/**
 * Ambient life: a few birds crossing the sky every 10–40 s, butterflies (the sheet's orange and
 * blue ones) that flutter round the flowers (and sometimes settle on one) before flying off,
 * leaves (sheet leaves) falling from the crowns and tumbling (more in a gust), pollen over the
 * flowers and dust motes in the light. A butterfly close to a flower makes it tremble.
 */

interface Bird {
  x: number;
  y: number;
  vx: number;
  phase: number;
  size: number;
  seed: number;
}

interface Butterfly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  home: Vec2;
  tx: number;
  ty: number;
  retarget: number;
  age: number;
  life: number;
  land: number;
  flap: number;
  kind: FxId;
  leaving: boolean;
}

interface Leaf {
  x: number;
  y: number;
  vy: number;
  rot: number;
  spin: number;
  tumble: number;
  age: number;
  life: number;
  kind: FxId;
  size: number;
}

const BUTTERFLIES: FxId[] = ['butterflyOrange', 'butterflyBlue'];
const LEAVES: FxId[] = ['leaf1', 'leaf2', 'leaf3', 'leaf4'];
/** Drawn size (picture px, longest side) of a butterfly and of a falling leaf. */
const BUTTERFLY_PX = 15;
const LEAF_PX = 9;

export function animateBird(b: Bird, w: World) {
  b.x += b.vx * w.dt;
  b.phase += w.dt * (7 + b.seed * 2);
  b.y += Math.sin(b.phase * 0.21 + b.seed) * 4 * w.dt;
}

export function animateButterfly(f: Butterfly, w: World) {
  f.age += w.dt;
  f.flap += w.dt * (f.land > 0 ? 4 : 17);
  if (f.land > 0) {
    f.land -= w.dt;
    return;
  }
  f.retarget -= w.dt;
  if (!f.leaving && f.age > f.life) {
    f.leaving = true;
    f.tx = f.x + (w.rand() < 0.5 ? -1 : 1) * 600;
    f.ty = f.y - 400;
  } else if (!f.leaving && f.retarget <= 0) {
    f.retarget = 0.7 + w.rand() * 1.1;
    if (w.rand() < 0.18) {
      // Settle on the flower for a moment.
      f.tx = f.home[0];
      f.ty = f.home[1];
      f.land = 0;
    } else {
      f.tx = f.home[0] + (w.rand() - 0.5) * 70;
      f.ty = f.home[1] - 6 - w.rand() * 34;
    }
  }
  // Curved path: steer velocity towards the target with a wobble, then flutter up and down.
  const ax = (f.tx - f.x) * 1.6 - f.vx * 1.4 + Math.sin(f.age * 3.1) * 18;
  const ay = (f.ty - f.y) * 1.6 - f.vy * 1.4 + Math.cos(f.age * 4.3) * 16;
  f.vx += ax * w.dt;
  f.vy += ay * w.dt;
  const sp = Math.hypot(f.vx, f.vy);
  const max = f.leaving ? 70 : 40;
  if (sp > max) {
    f.vx *= max / sp;
    f.vy *= max / sp;
  }
  f.x += f.vx * w.dt + w.wind.at(f.x) * 6 * w.dt;
  f.y += f.vy * w.dt + Math.sin(f.flap * 0.5) * 6 * w.dt;
  if (
    !f.leaving &&
    Math.hypot(f.x - f.home[0], f.y - f.home[1]) < 3 &&
    Math.abs(f.ty - f.home[1]) < 1
  )
    f.land = 1.5 + w.rand() * 1.5;
}

export function animateLeaf(l: Leaf, w: World) {
  l.age += w.dt;
  const wind = w.wind.at(l.x);
  l.x += (wind * 22 + Math.sin(l.age * 2.2) * 14) * w.dt;
  l.y += l.vy * w.dt;
  l.rot += l.spin * w.dt;
  l.tumble += w.dt * 3.3;
}

export class AmbientSystem implements AnimSystem {
  private birds: Bird[] = [];
  private flies: Butterfly[] = [];
  private leaves: Leaf[] = [];
  private nextBirds = 5;
  private nextFly = 2.5;
  private nextLeaf = 3;
  private motes = 0;
  private fx: Partial<Record<FxId, { img: HTMLImageElement; w: number; h: number }>> = {};

  constructor(
    private crowns: Vec2[],
    private flowers: Vec2[],
    /** Where the sky band is, for the birds. */
    private skyBand: [number, number],
    assets?: Assets,
  ) {
    for (const [id, def] of Object.entries(assets?.layout.fx ?? {}))
      this.fx[id as FxId] = { img: assets!.img(def.file), w: def.w, h: def.h };
  }

  /** Flowers a butterfly is hovering close to (for the flowers' tremble). */
  near(): Vec2[] {
    return this.flies.filter((f) => f.land <= 0 && !f.leaving).map((f) => [f.x, f.y]);
  }

  /** Draws a sheet piece centred on (0, 0), its longest side `px` long. */
  private sprite(ctx: CanvasRenderingContext2D, id: FxId, px: number) {
    const s = this.fx[id];
    if (!s) return false;
    const k = px / Math.max(s.w, s.h);
    ctx.drawImage(s.img, (-s.w * k) / 2, (-s.h * k) / 2, s.w * k, s.h * k);
    return true;
  }

  update(w: World) {
    const density = w.settings.particles ? w.settings.particleDensity : 0;
    // Birds.
    this.nextBirds -= w.dt;
    if (this.nextBirds <= 0) {
      this.nextBirds = 10 + w.rand() * 30;
      const n = 1 + Math.floor(w.rand() * 3);
      const dir = w.rand() < 0.5 ? 1 : -1;
      const y = this.skyBand[0] + w.rand() * (this.skyBand[1] - this.skyBand[0]);
      const v = 55 + w.rand() * 30;
      for (let i = 0; i < n; i++)
        this.birds.push({
          x: (dir > 0 ? w.view[0] - 30 : w.view[2] + 30) - dir * i * (18 + w.rand() * 10),
          y: y + i * (7 + w.rand() * 6) * (i % 2 ? -1 : 1),
          vx: dir * v * (0.95 + w.rand() * 0.1),
          phase: w.rand() * 6,
          size: 5.5 + w.rand() * 2.5,
          seed: w.rand(),
        });
    }
    for (const b of this.birds) animateBird(b, w);
    this.birds = this.birds.filter((b) => b.x > w.view[0] - 80 && b.x < w.view[2] + 80);

    // Butterflies (at most two around).
    this.nextFly -= w.dt;
    if (this.nextFly <= 0 && this.flies.length < 2 && this.flowers.length) {
      this.nextFly = 6 + w.rand() * 10;
      const home = this.flowers[Math.floor(w.rand() * this.flowers.length)] ?? [800, 400];
      const from = w.rand() < 0.5 ? -1 : 1;
      this.flies.push({
        x: home[0] + from * 120,
        y: home[1] - 80,
        vx: -from * 20,
        vy: 10,
        home,
        tx: home[0],
        ty: home[1] - 20,
        retarget: 1,
        age: 0,
        life: 10 + w.rand() * 8,
        land: 0,
        flap: 0,
        kind: BUTTERFLIES[Math.floor(w.rand() * BUTTERFLIES.length)] ?? 'butterflyOrange',
        leaving: false,
      });
    }
    for (const f of this.flies) animateButterfly(f, w);
    this.flies = this.flies.filter(
      (f) => !f.leaving || (f.y > w.view[1] - 40 && f.x > w.view[0] - 40 && f.x < w.view[2] + 40),
    );

    // Leaves: one every few seconds, more while a gust blows.
    const gust = w.wind.gust;
    this.nextLeaf -= w.dt * (1 + gust * 4) * Math.max(0.2, density);
    if (this.nextLeaf <= 0 && this.crowns.length && density > 0) {
      this.nextLeaf = this.leafBurstLeft > 0 ? 0.12 : 4 + w.rand() * 6;
      if (this.leafBurstLeft > 0) this.leafBurstLeft--;
      const c = this.crowns[Math.floor(w.rand() * this.crowns.length)] ?? [400, 200];
      this.leaves.push({
        x: c[0] + (w.rand() - 0.5) * 50,
        y: c[1] + (w.rand() - 0.2) * 30,
        vy: 13 + w.rand() * 8,
        rot: w.rand() * 6,
        spin: (w.rand() - 0.5) * 3,
        tumble: w.rand() * 6,
        age: 0,
        life: 4.5 + w.rand() * 2.5,
        kind: LEAVES[Math.floor(w.rand() * LEAVES.length)] ?? 'leaf1',
        size: LEAF_PX * (0.75 + w.rand() * 0.5),
      });
    }
    for (const l of this.leaves) animateLeaf(l, w);
    this.leaves = this.leaves.filter((l) => l.age < l.life);

    // Pollen over the flowers, dust motes anywhere in view.
    this.motes += w.dt * 2.2 * density;
    while (this.motes > 1) {
      this.motes--;
      if (w.rand() < 0.55 && this.flowers.length) {
        const f = this.flowers[Math.floor(w.rand() * this.flowers.length)] ?? [0, 0];
        w.particles.spawn(
          'pollen',
          f[0] + (w.rand() - 0.5) * 30,
          f[1] - w.rand() * 12,
          0,
          -3,
          3 + w.rand() * 2,
          0.9 + w.rand() * 0.6,
        );
      } else {
        const x = w.view[0] + w.rand() * (w.view[2] - w.view[0]);
        const y = 120 + w.rand() * 600;
        w.particles.spawn('dust', x, y, 0, 0, 4 + w.rand() * 3, 0.7 + w.rand() * 0.8);
      }
    }
  }

  drawLeaves(ctx: CanvasRenderingContext2D) {
    for (const l of this.leaves) {
      const a = clamp(Math.min(l.age * 3, (l.life - l.age) / 1.2), 0, 1);
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      // Tumbling: the leaf turns edge-on and back as it falls.
      ctx.scale(0.25 + 0.75 * Math.abs(Math.cos(l.tumble)), 1);
      if (!this.sprite(ctx, l.kind, l.size)) {
        ctx.fillStyle = '#6cbf3a';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.2, 2.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  drawCreatures(ctx: CanvasRenderingContext2D) {
    for (const f of this.flies) {
      const open =
        f.land > 0 ? 0.55 + 0.45 * Math.abs(Math.sin(f.flap)) : Math.abs(Math.sin(f.flap));
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(clamp(f.vx * 0.01, -0.4, 0.4));
      // Wing beat: the sheet butterfly is seen from above, so a beat folds it about its body.
      ctx.scale((f.vx < 0 ? -1 : 1) * (0.2 + 0.8 * open), 1);
      this.sprite(ctx, f.kind, BUTTERFLY_PX);
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(42,64,86,0.85)';
    ctx.lineCap = 'round';
    for (const b of this.birds) {
      const flap = Math.sin(b.phase);
      const s = b.size;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(b.x - s, b.y - flap * s * 0.6);
      ctx.quadraticCurveTo(b.x - s * 0.45, b.y - s * 0.35 - flap * s * 0.3, b.x, b.y);
      ctx.quadraticCurveTo(
        b.x + s * 0.45,
        b.y - s * 0.35 - flap * s * 0.3,
        b.x + s,
        b.y - flap * s * 0.6,
      );
      ctx.stroke();
    }
  }

  /** Showcase: a handful of leaves off the crowns at once and a butterfly. */
  leafBurst() {
    this.nextLeaf = 0;
    this.leafBurstLeft = 6;
    this.nextFly = 0;
  }
  private leafBurstLeft = 0;

  /** Debug: send birds now. */
  birdsNow() {
    this.nextBirds = 0;
  }

  count() {
    return this.birds.length + this.flies.length + this.leaves.length;
  }
}

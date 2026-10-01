import { type Assets, canvas } from '../engine/assets';
import type { Placed, Vec2 } from '../engine/types';
import type { AnimSystem, World } from '../engine/world';

/**
 * The pond surface: the painted water redrawn in thin rows that slide a fraction of a pixel
 * (a slow wave), moving light caustics clipped to the water, and ripple rings (random, round the
 * dock posts, where fish surface, and from splashes).
 */

interface Ripple {
  x: number;
  y: number;
  age: number;
  life: number;
  size: number;
  alive: boolean;
}

const ROW = 2;

export class WaterAnimation implements AnimSystem {
  private water: HTMLCanvasElement;
  private box: Placed;
  private scratch: HTMLCanvasElement;
  private scratchCtx: CanvasRenderingContext2D;
  private caustics: CanvasPattern;
  private caustics2: CanvasPattern;
  private mask: HTMLImageElement;
  private maskData: Uint8ClampedArray;
  private ripples: Ripple[] = Array.from({ length: 24 }, () => ({
    x: 0,
    y: 0,
    age: 0,
    life: 1,
    size: 1,
    alive: false,
  }));
  private nextRandom = 1;
  private nextPost: number[];
  private live = 0;

  constructor(
    assets: Assets,
    private posts: Vec2[],
  ) {
    const { layout, img } = assets;
    this.box = layout.water;
    const b = this.box;
    this.mask = img(b.file);
    // The water alone: island pixels inside the mask.
    const [wc, wctx] = canvas(b.w, b.h);
    wctx.drawImage(img('island.webp'), b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
    wctx.globalCompositeOperation = 'destination-in';
    wctx.drawImage(this.mask, 0, 0);
    this.water = wc;
    const [, mctx] = canvas(b.w, b.h);
    mctx.drawImage(this.mask, 0, 0);
    this.maskData = mctx.getImageData(0, 0, b.w, b.h).data;
    [this.scratch, this.scratchCtx] = canvas(b.w, b.h);
    this.caustics = this.makeCaustics(11, 0.5);
    this.caustics2 = this.makeCaustics(23, 0.35);
    this.nextPost = posts.map((_, i) => 1 + i * 1.3);
  }

  /** A tileable sheet of soft wavy light lines, squashed for the 3/4 view. */
  private makeCaustics(seed: number, alpha: number): CanvasPattern {
    const S = 192;
    const [c, ctx] = canvas(S, S);
    let s = seed;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const x = r() * S;
      const y = r() * S;
      const len = 10 + r() * 22;
      const ang = -0.25 + r() * 0.5;
      ctx.lineWidth = 0.8 + r() * 1.4;
      for (const ox of [-S, 0, S])
        for (const oy of [-S, 0, S]) {
          ctx.beginPath();
          ctx.moveTo(x + ox, y + oy);
          ctx.quadraticCurveTo(
            x + ox + len / 2,
            y + oy + Math.sin(ang) * len - 4,
            x + ox + len,
            y + oy + Math.sin(ang) * len,
          );
          ctx.stroke();
        }
    }
    const p = ctx.createPattern(c, 'repeat');
    if (!p) throw new Error('pattern unavailable');
    return p;
  }

  /** Is (x, y) open water (with `margin` px of water around it)? */
  isWater(x: number, y: number, margin = 0): boolean {
    const test = (px: number, py: number) => {
      const lx = Math.round(px - this.box.x);
      const ly = Math.round(py - this.box.y);
      if (lx < 0 || ly < 0 || lx >= this.box.w || ly >= this.box.h) return false;
      return (this.maskData[(ly * this.box.w + lx) * 4 + 3] ?? 0) > 200;
    };
    if (!test(x, y)) return false;
    if (!margin) return true;
    return (
      test(x + margin, y) &&
      test(x - margin, y) &&
      test(x, y + margin * 0.5) &&
      test(x, y - margin * 0.5)
    );
  }

  ripple(x: number, y: number, size = 1) {
    const r = this.ripples.find((q) => !q.alive);
    if (!r) return;
    r.alive = true;
    r.x = x;
    r.y = y;
    r.age = 0;
    r.life = 1.6 + size * 0.9;
    r.size = size;
  }

  update(w: World) {
    // Random rings on open water, and rings round the posts the water laps against.
    this.nextRandom -= w.dt;
    if (this.nextRandom <= 0) {
      this.nextRandom = 0.7 + w.rand() * 1.6;
      for (let k = 0; k < 6; k++) {
        const x = this.box.x + w.rand() * this.box.w;
        const y = this.box.y + w.rand() * this.box.h;
        if (this.isWater(x, y, 6)) {
          this.ripple(x, y, 0.5 + w.rand() * 0.5);
          break;
        }
      }
    }
    this.posts.forEach(([x, y], i) => {
      this.nextPost[i] = (this.nextPost[i] ?? 0) - w.dt;
      if ((this.nextPost[i] ?? 0) <= 0) {
        this.nextPost[i] = 2.6 + w.rand() * 2.5;
        this.ripple(x, y + 1, 0.55);
      }
    });
    // A few sparkles on the water now and then.
    if (w.settings.particles && w.rand() < w.dt * 1.4 * w.settings.particleDensity) {
      const x = this.box.x + w.rand() * this.box.w;
      const y = this.box.y + w.rand() * this.box.h;
      if (this.isWater(x, y, 4))
        w.particles.spawn('sparkle', x, y, 0, 0, 0.7 + w.rand() * 0.5, 1.6 + w.rand() * 1.4);
    }
    let live = 0;
    for (const r of this.ripples) {
      if (!r.alive) continue;
      r.age += w.dt;
      if (r.age >= r.life) r.alive = false;
      else live++;
    }
    this.live = live;
  }

  /** Waves and moving light, drawn right over the island's water. */
  drawSurface(ctx: CanvasRenderingContext2D, w: World) {
    const b = this.box;
    const wind = w.wind.at(b.x + b.w / 2);
    const amp = 0.55 + wind * 0.45;
    for (let y = 0; y < b.h; y += ROW) {
      const wy = b.y + y;
      const dx =
        amp * (Math.sin(wy * 0.13 + w.t * 1.6) * 0.7 + Math.sin(wy * 0.037 - w.t * 0.7) * 0.5);
      ctx.drawImage(this.water, 0, y, b.w, ROW, b.x + dx, wy, b.w, ROW);
    }
    // Caustics: two sheets drifting different ways, kept to the water by the mask.
    const s = this.scratchCtx;
    s.globalCompositeOperation = 'source-over';
    s.clearRect(0, 0, b.w, b.h);
    this.caustics.setTransform(
      new DOMMatrix().translateSelf(w.t * 7 + wind * w.t * 2, w.t * 2.2).scaleSelf(1, 0.5),
    );
    this.caustics2.setTransform(
      new DOMMatrix().translateSelf(-w.t * 4.5, w.t * 3.4 + 40).scaleSelf(1.4, 0.65),
    );
    s.fillStyle = this.caustics;
    s.fillRect(0, 0, b.w, b.h);
    s.fillStyle = this.caustics2;
    s.fillRect(0, 0, b.w, b.h);
    s.globalCompositeOperation = 'destination-in';
    s.drawImage(this.mask, 0, 0);
    ctx.globalAlpha = 0.28 + 0.06 * Math.sin(w.t * 0.5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(this.scratch, b.x, b.y);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  drawRipples(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#ffffff';
    for (const r of this.ripples) {
      if (!r.alive) continue;
      const u = r.age / r.life;
      const rad = (3 + u * 20) * r.size;
      ctx.globalAlpha = 0.55 * (1 - u) ** 1.5;
      ctx.lineWidth = 1.3 * (1 - u * 0.6);
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, rad, rad * 0.38, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (r.size > 0.8 && u > 0.15) {
        ctx.globalAlpha *= 0.6;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, rad * 0.6, rad * 0.23, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  count() {
    return 1 + this.live;
  }
}

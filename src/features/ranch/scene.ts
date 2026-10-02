import type { Quality } from './images';
import { onSpriteReady } from './images';
import { PARTICLE_CAP, ParticlePool } from './particles';

/*
 * The ranch animation engine: ONE requestAnimationFrame loop for every canvas in the panel.
 * Each canvas has a Stage (pens, hive, pond, boat) that updates its actors and draws them;
 * a shared particle pool draws on top. No timers per actor, no React state per frame.
 *
 * The loop runs only while it has something to show: it stops when the tab is hidden, when
 * every canvas is scrolled out of view (IntersectionObserver), under reduced motion (one
 * static frame is drawn on each change instead) and for good on destroy().
 */

export interface SceneEnv {
  reduced: boolean;
  quality: Quality;
}

export abstract class Stage {
  /** Canvas index, used to route particles. Set by the scene on attach. */
  layer = 0;
  scene!: RanchScene;
  w = 0;
  h = 0;

  get env(): SceneEnv {
    return this.scene.env;
  }

  get particles(): ParticlePool {
    return this.scene.particles;
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  /** dt in seconds (0 for a static redraw), t the scene clock in seconds. */
  abstract update(dt: number, t: number): void;
  abstract draw(ctx: CanvasRenderingContext2D, t: number): void;
  /** A tap on the canvas, in its CSS pixels. Decoration only. */
  tap?(x: number, y: number): void;
}

interface Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  stage: Stage;
  visible: boolean;
  dpr: number;
  off: () => void;
}

const DPR_CAP: Record<Quality, number> = { low: 1, medium: 1.5, high: 2 };

export interface SceneStats {
  frames: number;
  /** Average update + draw time per frame, ms (rolling). */
  ms: number;
}

export class RanchScene {
  env: SceneEnv;
  readonly particles = new ParticlePool(PARTICLE_CAP.high);
  readonly stats: SceneStats = { frames: 0, ms: 0 };
  private layers: Layer[] = [];
  private raf = 0;
  private staticRaf = 0;
  private last = 0;
  private t = 0;
  private destroyed = false;
  private io: IntersectionObserver | null = null;
  private ro: ResizeObserver | null = null;
  private offSprites: () => void;
  private onVisibility = () => this.kick();

  constructor(env: SceneEnv) {
    this.env = { ...env };
    this.particles.setCap(env.reduced ? 0 : PARTICLE_CAP[env.quality]);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.offSprites = onSpriteReady(() => this.invalidate());
    if (typeof IntersectionObserver !== 'undefined') {
      this.io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const l = this.layers.find((x) => x.canvas === e.target);
          if (l) l.visible = e.isIntersecting;
        }
        this.kick();
        this.invalidate();
      });
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver((entries) => {
        for (const e of entries) {
          const l = this.layers.find((x) => x.canvas === e.target);
          if (l) this.fit(l);
        }
        this.invalidate();
      });
    }
  }

  attach(canvas: HTMLCanvasElement, stage: Stage): () => void {
    stage.scene = this;
    stage.layer = this.layers.length ? Math.max(...this.layers.map((l) => l.stage.layer)) + 1 : 0;
    let ctx: CanvasRenderingContext2D | null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null; // jsdom
    }
    const onDown = (e: PointerEvent) => {
      if (!stage.tap) return;
      const r = canvas.getBoundingClientRect();
      stage.tap(e.clientX - r.left, e.clientY - r.top);
      this.invalidate();
    };
    canvas.addEventListener('pointerdown', onDown);
    const layer: Layer = {
      canvas,
      ctx,
      stage,
      // Until the observer reports, assume on screen (and always, where there is none).
      visible: true,
      dpr: 1,
      off: () => canvas.removeEventListener('pointerdown', onDown),
    };
    this.layers.push(layer);
    this.fit(layer);
    this.io?.observe(canvas);
    this.ro?.observe(canvas);
    this.kick();
    this.invalidate();
    return () => {
      layer.off();
      this.io?.unobserve(canvas);
      this.ro?.unobserve(canvas);
      this.particles.clear(stage.layer);
      this.layers = this.layers.filter((l) => l !== layer);
      this.kick();
    };
  }

  setEnv(env: SceneEnv): void {
    const dprChanged = env.quality !== this.env.quality;
    this.env = { ...env };
    this.particles.setCap(env.reduced ? 0 : PARTICLE_CAP[env.quality]);
    if (dprChanged) this.layers.forEach((l) => this.fit(l));
    this.kick();
    this.invalidate();
  }

  /** Canvas point → viewport point (for DOM flights that start in the scene). */
  toClient(stage: Stage, x: number, y: number): { x: number; y: number } | null {
    const l = this.layers.find((v) => v.stage === stage);
    if (!l) return null;
    const r = l.canvas.getBoundingClientRect();
    return { x: r.left + x, y: r.top + y };
  }

  /** Asks for one repaint when the loop is not running (reduced motion, a state change). */
  invalidate(): void {
    if (
      this.destroyed ||
      this.raf ||
      this.staticRaf ||
      typeof requestAnimationFrame === 'undefined'
    )
      return;
    this.staticRaf = requestAnimationFrame(() => {
      this.staticRaf = 0;
      for (const l of this.layers) {
        if (!l.visible) continue;
        l.stage.update(0, this.t);
        this.render(l);
      }
    });
  }

  destroy(): void {
    this.destroyed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.staticRaf) cancelAnimationFrame(this.staticRaf);
    this.raf = this.staticRaf = 0;
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.offSprites();
    this.io?.disconnect();
    this.ro?.disconnect();
    this.layers.forEach((l) => l.off());
    this.layers = [];
    this.particles.clear();
  }

  private shouldRun(): boolean {
    return (
      !this.destroyed &&
      !this.env.reduced &&
      !document.hidden &&
      this.layers.some((l) => l.visible && l.ctx)
    );
  }

  private kick(): void {
    if (typeof requestAnimationFrame === 'undefined') return;
    if (this.shouldRun()) {
      if (!this.raf) {
        this.last = performance.now();
        this.raf = requestAnimationFrame(this.frame);
      }
    } else if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private frame = (ts: number) => {
    this.raf = 0;
    // Clamp the step: after a stall the actors catch up gently instead of teleporting.
    const dt = Math.min(0.05, Math.max(0, (ts - this.last) / 1000));
    this.last = ts;
    this.t += dt;
    const t0 = performance.now();
    for (const l of this.layers) if (l.visible) l.stage.update(dt, this.t);
    this.particles.update(dt);
    for (const l of this.layers) if (l.visible) this.render(l);
    const spent = performance.now() - t0;
    this.stats.frames++;
    this.stats.ms = this.stats.ms * 0.95 + spent * 0.05;
    if (this.shouldRun()) this.raf = requestAnimationFrame(this.frame);
  };

  private fit(l: Layer): void {
    const w = l.canvas.clientWidth;
    const h = l.canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP[this.env.quality]);
    l.dpr = dpr;
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (l.canvas.width !== pw) l.canvas.width = pw;
    if (l.canvas.height !== ph) l.canvas.height = ph;
    l.stage.resize(w, h);
  }

  private render(l: Layer): void {
    const ctx = l.ctx;
    if (!ctx || !l.stage.w) return;
    ctx.setTransform(l.dpr, 0, 0, l.dpr, 0, 0);
    ctx.clearRect(0, 0, l.stage.w, l.stage.h);
    l.stage.draw(ctx, this.t);
    if (!this.env.reduced) this.particles.draw(ctx, l.stage.layer);
  }
}

/** A cached background, painted once per size into an offscreen canvas. */
export class Backdrop {
  private canvas: HTMLCanvasElement | null = null;
  private key = '';

  draw(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    paint: (c: CanvasRenderingContext2D, w: number, h: number) => void,
    salt = '',
  ): void {
    const dpr = ctx.getTransform().a || 1;
    const key = `${w}x${h}@${dpr}:${salt}`;
    if (key !== this.key || !this.canvas) {
      const c = this.canvas ?? document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * dpr));
      c.height = Math.max(1, Math.round(h * dpr));
      const cx = c.getContext('2d');
      if (!cx) return;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.clearRect(0, 0, w, h);
      paint(cx, w, h);
      this.canvas = c;
      this.key = key;
    }
    ctx.drawImage(this.canvas, 0, 0, w, h);
  }
}

/**
 * Draws a sprite with its anchor at (x, y): 'feet' = bottom centre, 'center' = middle.
 * `sx` may be negative (mirror) and passes near zero while turning; `sy` breathes.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  scale: number,
  opts: { sx?: number; sy?: number; rot?: number; alpha?: number; anchor?: 'feet' | 'center' } = {},
): void {
  const { sx = 1, sy = 1, rot = 0, alpha = 1, anchor = 'feet' } = opts;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.scale(sx, sy);
  ctx.drawImage(img, -w / 2, anchor === 'feet' ? -h : -h / 2, w, h);
  ctx.restore();
}

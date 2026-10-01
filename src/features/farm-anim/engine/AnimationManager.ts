import { AmbientSystem } from '../systems/AmbientSystem';
import { AnimalAnimation } from '../systems/AnimalAnimation';
import { BuildingAnimation } from '../systems/BuildingAnimation';
import { CloudAnimation } from '../systems/CloudAnimation';
import { EnvironmentAnimation } from '../systems/EnvironmentAnimation';
import { FarmGameLayer, type FarmView } from '../systems/FarmGameLayer';
import { FishAnimation } from '../systems/FishAnimation';
import { WaterAnimation } from '../systems/WaterAnimation';
import type { Assets } from './assets';
import { ParticleSystem } from './ParticleSystem';
import { DEFAULT_SETTINGS, type Settings } from './types';
import { WindSystem, rng } from './WindSystem';
import type { World } from './world';

/**
 * Owns the canvas and the frame loop: fits the picture to the screen, runs every system against
 * one World (shared clock and wind), draws the layers back to front in three parallax depths,
 * pauses when the tab is hidden, honours prefers-reduced-motion and measures frame rate.
 */

export interface Stats {
  fps: number;
  frameMs: number;
  objects: number;
  wind: number;
  gust: string;
}

/** Places on the island a tap can mean something for the game. */
export type FarmPlace = 'pond' | 'cow' | 'chicken' | 'farmhouse' | 'market' | 'field' | 'plot';

/** Where a tap landed: picture point, and the plot id for 'plot'. */
export interface PlaceInfo {
  x: number;
  y: number;
  plotId?: number;
}

export interface ManagerOptions {
  onStats?: (s: Stats) => void;
  /** A tap on a place of the island. */
  onPlace?: (place: FarmPlace, info: PlaceInfo) => void;
}

/** Tap areas in picture px (checked in this order after the cows, hens and the pond). */
const PLACES: [FarmPlace, number, number, number, number][] = [
  ['market', 845, 60, 1345, 300],
  ['farmhouse', 470, 10, 860, 300],
];
const COW_SPOTS: [number, number, number, number][] = [
  [1328, 368, 38, 34],
  [895, 189, 38, 36],
];

/** Parallax travel in CSS px at strength 1: background, island, foreground. */
const DEPTH = { back: 1.5, mid: 3, front: 7 };

export class AnimationManager {
  readonly settings: Settings = { ...DEFAULT_SETTINGS };
  readonly wind = new WindSystem();
  private particles = new ParticleSystem();
  private clouds: CloudAnimation;
  private env: EnvironmentAnimation;
  private water: WaterAnimation;
  private fish: FishAnimation;
  private animals: AnimalAnimation;
  private buildings: BuildingAnimation;
  private ambient: AmbientSystem;
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private t = 0;
  private reduced: boolean;
  private coarse: boolean;
  private pointerCss: { x: number; y: number } | null = null;
  private par = { x: 0, y: 0 };
  private fit = { s: 1, ox: 0, oy: 0, cw: 1, ch: 1, dpr: 1 };
  private frames = 0;
  private frameTime = 0;
  private statClock = 0;
  private stats: Stats = { fps: 0, frameMs: 0, objects: 0, wind: 0, gust: 'calm' };
  private rand = rng(2024);
  private sky: HTMLImageElement;
  private island: HTMLImageElement;
  private size: [number, number];
  private onStats: (s: Stats) => void;
  private onPlace: (place: FarmPlace, info: PlaceInfo) => void;
  private game: FarmGameLayer;
  private cleanup: (() => void)[] = [];
  private mediaReduced = false;
  private forcedReduced = false;
  private inView = true;

  constructor(
    private canvas: HTMLCanvasElement,
    private assets: Assets,
    opts: ManagerOptions = {},
  ) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
    this.onStats = opts.onStats ?? (() => {});
    this.onPlace = opts.onPlace ?? (() => {});
    const { layout, img } = assets;
    this.size = layout.size;
    this.sky = img('sky.jpg');
    this.island = img('island.webp');
    this.clouds = new CloudAnimation(layout.clouds, img);
    this.env = new EnvironmentAnimation(assets);
    this.game = new FarmGameLayer(assets);
    this.water = new WaterAnimation(assets, layout.places.dockPosts);
    this.fish = new FishAnimation(assets, this.water);
    this.animals = new AnimalAnimation(assets);
    this.buildings = new BuildingAnimation(assets, layout.places);
    this.ambient = new AmbientSystem(this.env.crowns(), this.env.flowers(), [40, 230]);

    const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.mediaReduced = rm.matches;
    this.reduced = rm.matches;
    this.coarse = window.matchMedia('(pointer: coarse)').matches;
    const onRm = () => {
      this.mediaReduced = rm.matches;
      this.reduced = this.mediaReduced || this.forcedReduced;
    };
    rm.addEventListener('change', onRm);
    this.cleanup.push(() => rm.removeEventListener('change', onRm));

    const onVis = () => (document.hidden ? this.stop() : this.start());
    document.addEventListener('visibilitychange', onVis);
    this.cleanup.push(() => document.removeEventListener('visibilitychange', onVis));
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(canvas);
    this.cleanup.push(() => ro.disconnect());
    // Scrolled out of sight (e.g. further down the Journey): no frames at all.
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => {
        this.inView = !!e?.isIntersecting;
        if (this.inView) this.start();
        else this.stop();
      });
      io.observe(canvas);
      this.cleanup.push(() => io.disconnect());
    }
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      this.pointerCss = { x: e.clientX - r.left, y: e.clientY - r.top };
      const p = this.toPicture(this.pointerCss);
      this.game.hover = this.game.hit(p);
      canvas.style.cursor = this.buildings.hover(p) || this.hit(p) ? 'pointer' : '';
    };
    const leave = () => {
      this.pointerCss = null;
      this.game.hover = null;
      this.buildings.hover(null);
    };
    const click = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const p = this.toPicture({ x: e.clientX - r.left, y: e.clientY - r.top });
      // The door swings open and counts as the farmhouse.
      const plotId = this.game.hit(p);
      if (plotId !== null) return this.onPlace('plot', { ...p, plotId });
      if (this.buildings.click(p)) return this.onPlace('farmhouse', p);
      const place = this.hit(p);
      if (place) this.onPlace(place, p);
    };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('pointerup', click);
    this.cleanup.push(() => {
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('pointerup', click);
    });
    this.resize();
  }

  get isReduced() {
    return this.reduced;
  }

  /** The game's own reduced-motion setting, on top of the system one. */
  setReduced(on: boolean) {
    this.forcedReduced = on;
    this.reduced = this.mediaReduced || on;
  }

  /** The game's state drawn into the scene (plots, animal bubbles); null = scenery only. */
  setFarm(view: FarmView | null) {
    this.game.setView(view);
    this.env.showCrops = !view;
  }

  /** Picture px → CSS px inside the canvas. */
  toScreen(x: number, y: number) {
    const { s, ox, oy } = this.fit;
    return { x: ox + this.par.x * DEPTH.mid + x * s, y: oy + this.par.y * DEPTH.mid + y * s };
  }

  /** Top of a plot in CSS px inside the canvas. */
  plotScreen(id: number) {
    const p = this.game.plotTop(id);
    return p ? this.toScreen(p[0], p[1]) : null;
  }

  /** The plot under a viewport point (drag and drop), or null. */
  plotAtClient(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null;
    return this.game.hit(this.toPicture({ x: clientX - r.left, y: clientY - r.top }));
  }

  /** Highlights: the plot with an open card, the plot a seed is dragged over. */
  select(id: number | null) {
    this.game.selected = id;
  }
  dropTarget(id: number | null) {
    this.game.drop = id;
  }

  /** Fishing float on the water at picture point (x, y); bite() pulls it under. */
  cast(x: number, y: number) {
    this.game.cast(x, y);
    this.water.ripple(x, y, 0.8);
  }
  bite(x: number, y: number) {
    this.game.bite();
    this.water.ripple(x, y, 1.2);
    this.fish.jumpNow();
  }

  /** What a tap at picture point p means. */
  hit(p: { x: number; y: number }): FarmPlace | null {
    if (this.game.hit(p) !== null) return 'plot';
    if (COW_SPOTS.some(([cx, cy, rx, ry]) => ((p.x - cx) / rx) ** 2 + ((p.y - cy) / ry) ** 2 < 1))
      return 'cow';
    if (
      this.animals
        .hens()
        .some(([hx, hy]) => Math.abs(p.x - hx) < 18 && p.y < hy + 4 && p.y > hy - 44)
    )
      return 'chicken';
    if (this.water.isWater(p.x, p.y)) return 'pond';
    for (const [place, x0, y0, x1, y1] of PLACES)
      if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) return place;
    return null;
  }

  private toPicture(p: { x: number; y: number }) {
    const { s, ox, oy } = this.fit;
    return {
      x: (p.x - ox - this.par.x * DEPTH.mid) / s,
      y: (p.y - oy - this.par.y * DEPTH.mid) / s,
    };
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.max(1, r.width);
    const ch = Math.max(1, r.height);
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    const [W, H] = this.size;
    const cover = Math.max(cw / W, ch / H);
    const contain = Math.min(cw / W, ch / H);
    // Wide screens fill; tall phones show more of the island than a hard crop would.
    const s = Math.min(cover, contain * 1.9);
    this.fit = { s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2, cw, ch, dpr };
    if (!this.raf) this.frame(performance.now(), true);
  }

  start() {
    if (this.raf || document.hidden || !this.inView) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  destroy() {
    this.stop();
    for (const c of this.cleanup) c();
  }

  /** Change settings (debug panel); returns a copy for the UI. */
  configure(patch: Partial<Settings>): Settings {
    Object.assign(this.settings, patch);
    return { ...this.settings };
  }

  gust() {
    this.wind.trigger();
  }
  jump() {
    this.fish.jumpNow();
  }
  birds() {
    this.ambient.birdsNow();
  }
  getStats() {
    return this.stats;
  }

  private frame(now: number, once = false) {
    const raw = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    const st = this.settings;
    const t0 = performance.now();
    const speed = st.ambientSpeed * (this.reduced ? 0.7 : 1);
    const dt = st.animation && !once ? raw * speed : 0;
    this.t += dt;
    this.wind.base = st.wind;
    this.wind.amplitude = this.reduced ? 0.4 : 1;
    const { s, ox, oy, cw, ch } = this.fit;
    const view: World['view'] = [-ox / s, -oy / s, (cw - ox) / s, (ch - oy) / s];
    const pointer = this.pointerCss ? this.toPicture(this.pointerCss) : null;
    const density = (this.reduced ? 0.3 : 1) * st.particleDensity;
    const w: World = {
      t: this.t,
      dt,
      wind: this.wind,
      settings: { ...st, particleDensity: density, particles: st.particles && density > 0 },
      assets: this.assets,
      particles: this.particles,
      reduced: this.reduced,
      pointer,
      view,
      rand: this.rand,
    };
    if (dt > 0) {
      this.wind.update(dt);
      if (st.environment) {
        this.clouds.update(w);
        this.env.update(w);
        this.water.update(w);
        this.buildings.update(w);
        this.game.update(w);
      }
      if (st.animals) {
        this.fish.update(w);
        this.animals.update(w);
      }
      this.ambient.update({
        ...w,
        settings: { ...w.settings, particles: w.settings.particles && st.animals },
      });
      this.particles.update(w);
      if (!st.particles) this.particles.clear();
    }

    // Parallax eases towards the pointer.
    const strength =
      st.parallax && !this.reduced ? st.parallaxStrength * (this.coarse ? 0.4 : 1) : 0;
    const target = this.pointerCss
      ? {
          x: (this.pointerCss.x / cw - 0.5) * -2 * strength,
          y: (this.pointerCss.y / ch - 0.5) * -2 * strength,
        }
      : { x: 0, y: 0 };
    this.par.x += (target.x - this.par.x) * Math.min(1, raw * 3);
    this.par.y += (target.y - this.par.y) * Math.min(1, raw * 3);

    this.draw(w);

    // Stats twice a second.
    this.frames++;
    this.frameTime += performance.now() - t0;
    this.statClock += raw;
    if (this.statClock >= 0.5) {
      this.stats = {
        fps: Math.round(this.frames / this.statClock),
        frameMs: +(this.frameTime / this.frames).toFixed(2),
        objects:
          this.clouds.count() +
          this.env.count() +
          this.water.count() +
          this.fish.count() +
          this.animals.count() +
          this.buildings.count() +
          this.ambient.count() +
          this.game.count() +
          this.particles.count(),
        wind: +this.wind.at(800).toFixed(2),
        gust: this.wind.phase,
      };
      this.onStats(this.stats);
      this.frames = 0;
      this.frameTime = 0;
      this.statClock = 0;
    }
    if (!once) this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  private draw(w: World) {
    const ctx = this.ctx;
    const { s, ox, oy, cw, ch, dpr } = this.fit;
    const [W, H] = this.size;
    // Sky fills the whole canvas, whatever the aspect.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const k = Math.max(cw / W, ch / H) * 1.04;
    ctx.drawImage(
      this.sky,
      (cw - W * k) / 2 + this.par.x * DEPTH.back,
      (ch - H * k) / 2 + this.par.y * DEPTH.back,
      W * k,
      H * k,
    );
    const layer = (depth: number) =>
      ctx.setTransform(
        dpr * s,
        0,
        0,
        dpr * s,
        dpr * (ox + this.par.x * depth),
        dpr * (oy + this.par.y * depth),
      );

    layer(DEPTH.back);
    this.clouds.drawSky(ctx, w);

    layer(DEPTH.mid);
    ctx.drawImage(this.island, 0, 0);
    this.game.drawTiles(ctx, w);
    this.water.drawSurface(ctx, w);
    this.fish.drawUnder(ctx);
    this.water.drawRipples(ctx);
    this.env.drawLilies(ctx, w);
    this.env.drawDock(ctx, w, this.assets.layout.places.rope);
    this.env.drawCrops(ctx);
    this.game.drawCrops(ctx, w);
    this.env.drawPlants(ctx);
    this.buildings.drawWindmill(ctx);
    this.buildings.drawChimney(ctx);
    this.particles.draw(ctx, 'smoke');
    this.buildings.drawHouse(ctx, w);
    this.animals.draw(ctx, w);
    this.fish.drawAir(ctx);
    this.particles.draw(ctx, 'front');
    this.game.drawOverlay(ctx, w);

    layer(DEPTH.front);
    this.clouds.drawBanks(ctx, w);
    this.ambient.drawLeaves(ctx);
    this.ambient.drawCreatures(ctx);
  }
}

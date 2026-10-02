import { CROPS } from '../../../data/game';
import { cropSprite } from '../../../data/sprites';
import type { CropId } from '../../../data/types';
import { AmbientSystem } from '../systems/AmbientSystem';
import { AnimalAnimation } from '../systems/AnimalAnimation';
import { BuildingAnimation } from '../systems/BuildingAnimation';
import { CloudAnimation } from '../systems/CloudAnimation';
import { EnvironmentAnimation } from '../systems/EnvironmentAnimation';
import {
  FarmGameLayer,
  type FarmView,
  type PlotKindView,
  type PlotStageView,
  type PlotView,
  type Quality,
} from '../systems/FarmGameLayer';
import { FishAnimation } from '../systems/FishAnimation';
import { SkySystem, type SkyMood } from '../systems/SkySystem';
import { WaterAnimation } from '../systems/WaterAnimation';
import type { Assets } from './assets';
import { PARTICLE_CAP, ParticleSystem } from './ParticleSystem';
import { DEFAULT_SETTINGS, type Settings, type Vec2 } from './types';
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

/**
 * What part of the island is in view (game mode): whether it can be dragged at all, and which
 * half the screen centre is over (the field on the left, the barn and pond on the right).
 */
export interface CameraView {
  canPan: boolean;
  side: 'field' | 'barn';
}

/** Named camera stops (layers.json places.focus). */
export type FocusName = 'field' | 'barn';

/** Animation groups: each can be frozen, sped up or replayed on its own (showcase). */
export type GroupId = 'environment' | 'buildings' | 'animals' | 'crops' | 'water' | 'particles';
export const GROUPS: GroupId[] = [
  'environment',
  'buildings',
  'animals',
  'crops',
  'water',
  'particles',
];

/** A sprite picked in the showcase: what it is, its file and where to ring it. */
export interface SpriteInfo {
  id: string;
  file: string;
  group: GroupId;
  /** Layer kind or object type (tree, reed, cow, windmill, koi…), keys the animation list. */
  kind: string;
  fruit?: boolean;
  /** Ellipse in picture px [cx, cy, rx, ry]. */
  ring: [number, number, number, number];
}

export interface ManagerOptions {
  onStats?: (s: Stats) => void;
  /** A tap on a place of the island. */
  onPlace?: (place: FarmPlace, info: PlaceInfo) => void;
  /**
   * 'scene' fits the picture into a box on a page; 'game' fills the screen, keeps the island
   * large on tall phones and lets a drag move the camera across it.
   */
  mode?: 'scene' | 'game';
  /** Picture point (or named camera stop) the game camera starts on. */
  focus?: [number, number] | FocusName;
  onCamera?: (v: CameraView) => void;
  /** A drag started moving the camera (cards anchored to the picture should close). */
  onPanStart?: () => void;
  /** CSS selector of the page element harvested produce flies to (the pantry button). */
  flyTarget?: string;
}

/** Produce icons in flight at most (screen space, outside the canvas). */
const MAX_FLIGHTS = 12;
const FLY_PX = 46;

/** A press that travels further than this (CSS px) is a drag, not a tap. */
const DRAG_PX = 8;

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
  /** Centred picture offset and how far the camera may travel from it (CSS px). */
  private base = { ox: 0, oy: 0, mx: 0, my: 0 };
  private cam = { x: 0, y: 0 };
  private camGoal: { x: number; y: number } | null = null;
  private camView: CameraView = { canPan: false, side: 'field' };
  private mode: 'scene' | 'game';
  private focusAt: [number, number] | null;
  private onCamera: (v: CameraView) => void;
  private onPanStart: () => void;
  private press: {
    id: number;
    x: number;
    y: number;
    cx: number;
    cy: number;
    moved: boolean;
  } | null = null;
  private frames = 0;
  private frameTime = 0;
  private statClock = 0;
  private stats: Stats = { fps: 0, frameMs: 0, objects: 0, wind: 0, gust: 'calm' };
  private rand = rng(2024);
  private sky: HTMLImageElement;
  private skyMood = new SkySystem();
  private island: HTMLImageElement;
  private size: [number, number];
  private onStats: (s: Stats) => void;
  private onPlace: (place: FarmPlace, info: PlaceInfo) => void;
  private game: FarmGameLayer;
  private cleanup: (() => void)[] = [];
  private mediaReduced = false;
  private forcedReduced = false;
  private inView = true;
  private groups = Object.fromEntries(
    GROUPS.map((id) => [id, { on: true, speed: 1, t: 0, dt: 0 }]),
  ) as Record<GroupId, { on: boolean; speed: number; t: number; dt: number }>;
  private worlds: Record<GroupId, World> | null = null;
  private selected: SpriteInfo | null = null;
  private quality: Quality = 'high';
  private flyTarget: string | null;
  private flights = new Set<HTMLElement>();

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
    this.mode = opts.mode ?? 'scene';
    const f = opts.focus;
    this.focusAt =
      this.mode !== 'game' || !f ? null : typeof f === 'string' ? assets.layout.places.focus[f] : f;
    this.onCamera = opts.onCamera ?? (() => {});
    this.onPanStart = opts.onPanStart ?? (() => {});
    this.flyTarget = opts.flyTarget ?? null;
    const { layout, img } = assets;
    this.size = layout.size;
    this.sky = img('sky.jpg');
    this.island = img('island.webp');
    this.clouds = new CloudAnimation(layout.clouds, img, layout.size);
    this.env = new EnvironmentAnimation(assets);
    this.game = new FarmGameLayer(assets);
    this.game.onHarvest = (at, icon, n) => this.fly(at, icon, n);
    this.water = new WaterAnimation(assets, layout.places.dockPosts);
    this.fish = new FishAnimation(assets, this.water);
    this.animals = new AnimalAnimation(assets);
    this.buildings = new BuildingAnimation(assets, layout.places);
    this.ambient = new AmbientSystem(
      this.env.crowns(),
      this.env.flowers(),
      layout.places.skyBand,
      assets,
    );

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
      const press = this.press;
      if (press && press.id === e.pointerId) {
        const dx = e.clientX - press.x;
        const dy = e.clientY - press.y;
        if (!press.moved && Math.hypot(dx, dy) > DRAG_PX && this.camView.canPan) {
          press.moved = true;
          this.camGoal = null;
          this.game.hover = null;
          this.onPanStart();
        }
        if (press.moved) {
          this.cam = { x: press.cx + dx, y: press.cy + dy };
          this.applyCam();
          if (!this.raf) this.frame(performance.now(), true);
          canvas.style.cursor = 'grabbing';
          return;
        }
      }
      const p = this.toPicture(this.pointerCss);
      this.game.hover = this.game.hit(p);
      canvas.style.cursor =
        this.buildings.hover(p) || this.hit(p) ? 'pointer' : this.camView.canPan ? 'grab' : '';
    };
    const leave = () => {
      this.pointerCss = null;
      this.game.hover = null;
      this.buildings.hover(null);
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.press = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        cx: this.cam.x,
        cy: this.cam.y,
        moved: false,
      };
      // Keep receiving the drag when the finger leaves the canvas (e.g. over the dock).
      try {
        if (this.camView.canPan) canvas.setPointerCapture?.(e.pointerId);
      } catch {
        /* the pointer is already gone */
      }
    };
    const click = (e: PointerEvent) => {
      const press = this.press;
      this.press = null;
      if (press && press.id === e.pointerId && press.moved) {
        canvas.style.cursor = 'grab';
        return;
      }
      const r = canvas.getBoundingClientRect();
      const p = this.toPicture({ x: e.clientX - r.left, y: e.clientY - r.top });
      // The door swings open and counts as the farmhouse.
      const plotId = this.game.hit(p);
      if (plotId !== null) {
        this.game.tap(plotId);
        return this.onPlace('plot', { ...p, plotId });
      }
      if (this.buildings.click(p)) return this.onPlace('farmhouse', p);
      const place = this.hit(p);
      if (place) this.onPlace(place, p);
    };
    const cancel = () => {
      this.press = null;
    };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', click);
    canvas.addEventListener('pointercancel', cancel);
    this.cleanup.push(() => {
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', click);
      canvas.removeEventListener('pointercancel', cancel);
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

  /** Graphics quality: how many particles may live at once and how big the bursts are. */
  /** Height at the bottom of the canvas covered by the game's UI (seed tray, dock), in CSS px. */
  private insetBottom = 0;
  setInsetBottom(px: number) {
    const v = Math.max(0, Math.round(px));
    if (v === this.insetBottom) return;
    this.insetBottom = v;
    this.resize();
  }

  setQuality(q: Quality) {
    this.quality = q;
    this.game.quality = q;
    this.particles.cap = PARTICLE_CAP[q];
  }

  /** CSS selector of the element harvested produce flies to (null: it floats up in the scene). */
  setFlyTarget(selector: string | null) {
    this.flyTarget = selector;
  }

  /**
   * Harvested produce flies from the plot to the pantry button: icons on fixed-position
   * elements over the page, animated by the browser (Web Animations), so they can leave the
   * canvas and cost the frame loop nothing. Start and end are read now, from the camera as it
   * is and the button where it is, so pans, zoom and resizes are always accounted for.
   * Returns false when it cannot fly (reduced motion, no target on the page).
   */
  private fly(at: Vec2, icon: string, count: number): boolean {
    if (this.reduced || !this.flyTarget || document.hidden) return false;
    const target = document.querySelector<HTMLElement>(this.flyTarget);
    const tr = target?.getBoundingClientRect();
    if (!target || !tr || tr.width === 0 || typeof target.animate !== 'function') return false;
    const cr = this.canvas.getBoundingClientRect();
    const p = this.toScreen(at[0], at[1]);
    const x0 = cr.left + p.x;
    const y0 = cr.top + p.y;
    const x1 = tr.left + tr.width / 2;
    const y1 = tr.top + tr.height / 2;
    const n = Math.min(count, this.quality === 'low' ? 1 : 3);
    for (let i = 0; i < n && this.flights.size < MAX_FLIGHTS; i++) {
      const el = document.createElement('img');
      el.src = icon;
      el.alt = '';
      el.setAttribute('aria-hidden', 'true');
      el.className = 'fa-fly';
      document.body.appendChild(el);
      this.flights.add(el);
      // A quadratic arc: up and over towards the button, the icons a little apart.
      const sx = x0 + (i - (n - 1) / 2) * 18;
      const mx = (sx + x1) / 2;
      const my = Math.min(y0, y1) - 80 - i * 14;
      const frames: Keyframe[] = [];
      for (let k = 0; k <= 12; k++) {
        const u = k / 12;
        const x = (1 - u) ** 2 * sx + 2 * (1 - u) * u * mx + u * u * x1;
        const y = (1 - u) ** 2 * y0 + 2 * (1 - u) * u * my + u * u * y1;
        const s = u < 0.15 ? 0.6 + (u / 0.15) * 0.6 : 1.2 - 0.55 * ((u - 0.15) / 0.85);
        frames.push({
          offset: u,
          transform: `translate(${(x - FLY_PX / 2).toFixed(1)}px, ${(y - FLY_PX / 2).toFixed(1)}px) scale(${s.toFixed(3)})`,
          opacity: u < 0.85 ? 1 : 1 - ((u - 0.85) / 0.15) * 0.7,
        });
      }
      const anim = el.animate(frames, {
        duration: 800 + i * 70,
        delay: i * 110,
        easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
        fill: 'both',
      });
      const done = () => {
        el.remove();
        this.flights.delete(el);
      };
      anim.onfinish = () => {
        done();
        // The pantry button takes it in with a small bump.
        if (i === n - 1)
          target.animate([{ scale: '1' }, { scale: '1.16' }, { scale: '1' }], {
            duration: 320,
            easing: 'ease-out',
          });
      };
      anim.oncancel = done;
    }
    return true;
  }

  /** Hour and weather for the sky behind the island. */
  setSky(mood: SkyMood) {
    this.skyMood.mood = mood;
    if (!this.raf) this.frame(performance.now(), true);
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

  /** Glide the game camera so picture point (x, y) is centred (as far as the edges allow). */
  panTo(x: number, y?: number, smooth = true) {
    const [W, H] = this.size;
    const { s } = this.fit;
    const goal = { x: (W / 2 - x) * s, y: y === undefined ? this.cam.y : (H / 2 - y) * s };
    if (!smooth || this.reduced) {
      this.camGoal = null;
      this.cam = goal;
      this.applyCam();
    } else this.camGoal = goal;
    if (!this.raf) this.frame(performance.now(), true);
  }

  /** Glide the game camera to a named stop (the field, the barn yard). */
  panToPlace(name: FocusName, smooth = true) {
    const [x, y] = this.assets.layout.places.focus[name];
    this.panTo(x, y, smooth);
  }

  /** Clamp the camera to the picture, place the picture, and report what is in view. */
  private applyCam() {
    const { ox, oy, mx, my } = this.base;
    this.cam.x = Math.max(-mx, Math.min(mx, this.cam.x));
    this.cam.y = Math.max(-my, Math.min(my, this.cam.y));
    this.fit.ox = ox + this.cam.x;
    this.fit.oy = oy + this.cam.y;
    const { s, cw } = this.fit;
    const centre = (cw / 2 - this.fit.ox) / s;
    const v: CameraView = {
      canPan: mx > 1 || my > 1,
      side: centre < this.size[0] * 0.5 ? 'field' : 'barn',
    };
    const c = this.camView;
    if (c.canPan !== v.canPan || c.side !== v.side) {
      this.camView = v;
      this.onCamera(v);
    }
  }

  /** What a tap at picture point p means. */
  hit(p: { x: number; y: number }): FarmPlace | null {
    if (this.game.hit(p) !== null) return 'plot';
    const { cowSpots, taps } = this.assets.layout.places;
    if (cowSpots.some(([cx, cy, rx, ry]) => ((p.x - cx) / rx) ** 2 + ((p.y - cy) / ry) ** 2 < 1))
      return 'cow';
    if (
      this.animals
        .hens()
        .some(([hx, hy]) => Math.abs(p.x - hx) < 18 && p.y < hy + 4 && p.y > hy - 44)
    )
      return 'chicken';
    if (this.water.isWater(p.x, p.y)) return 'pond';
    for (const [place, x0, y0, x1, y1] of taps)
      if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) return place as FarmPlace;
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
    // Scene: wide screens fill; tall phones show more of the island than a hard crop would.
    // Game: the whole island when it fits, otherwise two thirds of the screen tall, dragged.
    const game = this.mode === 'game';
    // On the farm the bottom is covered by the seed tray and the dock: the island lives above.
    const ah = game ? Math.max(ch * 0.5, ch - this.insetBottom) : ch;
    const fitIn = Math.min(cw / W, ah / H);
    const s = game
      ? Math.max(fitIn, Math.min(cover, (ch * 0.66) / H))
      : Math.min(cover, contain * 1.9);
    // Keep looking at the same spot across a resize (rotation, address bar).
    const k = s / this.fit.s;
    this.cam = { x: this.cam.x * k, y: this.cam.y * k };
    if (this.camGoal) this.camGoal = { x: this.camGoal.x * k, y: this.camGoal.y * k };
    this.fit = { s, ox: 0, oy: 0, cw, ch, dpr };
    // The painting ends in a flat cut under the cliffs. When the whole picture fits above the
    // covered band, sit it on top of that band with the cut just behind the tray, and let the
    // spare height be sky on top. Otherwise centre it in the free band and let it be dragged
    // up and down to see all of it.
    const sh = H * s;
    const fits = sh <= ah;
    this.base = {
      ox: (cw - W * s) / 2,
      oy: fits ? ah - sh * 0.97 : (ah - sh) / 2,
      mx: game ? Math.max(0, (W * s - cw) / 2) : 0,
      my: game && !fits ? (sh - ah) / 2 : 0,
    };
    if (this.focusAt && cw > 1) {
      this.cam = { x: (W / 2 - this.focusAt[0]) * s, y: (H / 2 - this.focusAt[1]) * s };
      this.focusAt = null;
    }
    this.applyCam();
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
    for (const el of this.flights) el.remove();
    this.flights.clear();
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
    // Real time since the last frame, and the step the scene takes (capped: a long stall must
    // not throw things across the screen).
    const elapsed = Math.max(0, (now - this.last) / 1000);
    const raw = Math.min(0.05, elapsed);
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
    // Each group runs on its own clock: switched off it freezes in place (still drawn), and its
    // own speed scales it on top of the global one.
    for (const id of GROUPS) {
      const g = this.groups[id];
      const on =
        g.on && (id !== 'animals' || st.animals) && (id !== 'environment' || st.environment);
      g.dt = on ? dt * g.speed : 0;
      g.t += g.dt;
    }
    const gw = (id: GroupId): World => ({ ...w, t: this.groups[id].t, dt: this.groups[id].dt });
    this.worlds = {
      environment: gw('environment'),
      buildings: gw('buildings'),
      animals: gw('animals'),
      crops: gw('crops'),
      water: gw('water'),
      particles: gw('particles'),
    };
    const W = this.worlds;
    if (dt > 0) {
      this.wind.update(dt);
      this.env.nudges = this.ambient.near();
      if (W.environment.dt > 0) {
        this.clouds.update(W.environment);
        this.env.update(W.environment);
        this.ambient.update(W.environment);
        this.spawnWind(W.environment);
      }
      if (W.buildings.dt > 0) this.buildings.update(W.buildings);
      if (W.crops.dt > 0) {
        this.runCropDemo(W.crops.dt);
        this.game.update(W.crops);
      }
      if (W.water.dt > 0) {
        this.water.update(W.water);
        this.fish.update(W.water);
      }
      if (W.animals.dt > 0) this.animals.update(W.animals);
      if (W.particles.dt > 0) this.particles.update(W.particles);
      if (!st.particles) this.particles.clear();
    }

    // Parallax eases towards the pointer.
    // The camera glides to a place asked for (side arrows, a hint pointing at the cows).
    if (this.camGoal) {
      const g = this.camGoal;
      const k = Math.min(1, raw * 7);
      this.cam = { x: this.cam.x + (g.x - this.cam.x) * k, y: this.cam.y + (g.y - this.cam.y) * k };
      if (Math.abs(g.x - this.cam.x) + Math.abs(g.y - this.cam.y) < 0.5 || once) {
        this.cam = { ...g };
        this.camGoal = null;
      }
      this.applyCam();
    }

    // No pointer parallax under a dragging finger.
    const strength =
      st.parallax && !this.reduced && !(this.mode === 'game' && this.coarse)
        ? st.parallaxStrength * (this.coarse ? 0.4 : 1)
        : 0;
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
    // Frame rate on real time (a capped step would never show less than 20 fps).
    this.statClock += Math.min(1, elapsed);
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

  private draw(w0: World) {
    const ctx = this.ctx;
    const G = this.worlds ?? {
      environment: w0,
      buildings: w0,
      animals: w0,
      crops: w0,
      water: w0,
      particles: w0,
    };
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
    this.clouds.drawSky(ctx, G.environment);
    // The hour and weather shade the backdrop only (sky picture and its clouds), not the island.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.mode === 'game') this.drawMist(ctx, cw, ch, oy + this.par.y * DEPTH.mid + H * s);
    this.skyMood.draw(ctx, cw, ch, this.t);

    layer(DEPTH.mid);
    ctx.drawImage(this.island, 0, 0);
    this.game.drawTiles(ctx, G.crops);
    this.water.drawSurface(ctx, G.water);
    this.fish.drawUnder(ctx);
    this.water.drawRipples(ctx);
    this.env.drawLilies(ctx, G.water);
    this.env.drawDock(ctx, G.water, this.assets.layout.places.rope);
    this.env.drawCrops(ctx);
    this.game.drawCrops(ctx, G.crops);
    this.env.drawPlants(ctx, (p) => this.game.onOpenPlot(p));
    this.buildings.drawWindmill(ctx);
    this.buildings.drawChimney(ctx);
    this.particles.draw(ctx, 'smoke');
    this.buildings.drawHouse(ctx, G.buildings);
    this.animals.draw(ctx, G.animals);
    this.fish.drawAir(ctx);
    this.particles.draw(ctx, 'front');
    this.game.drawOverlay(ctx, G.crops);
    this.drawSelection(ctx);

    layer(DEPTH.front);
    const bank = this.skyMood.bankFilter();
    if (bank !== 'none' && 'filter' in ctx) ctx.filter = bank;
    this.clouds.drawBanks(ctx, G.environment);
    if ('filter' in ctx) ctx.filter = 'none';
    this.ambient.drawLeaves(ctx);
    this.ambient.drawCreatures(ctx);
  }

  /**
   * Game: a sea of cloud under the floating island (screen space, behind it), so whatever sky
   * shows below the cliffs or beside them reads as mist rather than an empty band. `bottom` is
   * the island's lower edge on screen. Drawn before the sky shade, so the hour and weather tint it.
   */
  private drawMist(ctx: CanvasRenderingContext2D, cw: number, ch: number, bottom: number) {
    const top = bottom - Math.min(140, ch * 0.18);
    if (top >= ch) return;
    const g = ctx.createLinearGradient(0, top, 0, Math.min(ch, bottom + 40));
    g.addColorStop(0, 'rgba(236, 246, 252, 0)');
    g.addColorStop(0.55, 'rgba(236, 246, 252, 0.7)');
    g.addColorStop(1, 'rgba(240, 248, 253, 0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(0, top, cw, ch - top);
    // Soft puffs along the top of the mist, drifting slowly sideways.
    const r = Math.max(60, cw * 0.16);
    const n = Math.ceil(cw / (r * 1.1)) + 2;
    const drift = (this.t * 4) % (r * 1.1);
    for (let i = -1; i < n; i++) {
      const x = i * r * 1.1 + drift;
      const y = top + r * 0.55 + Math.sin(i * 1.7 + this.t * 0.2) * r * 0.08;
      const p = ctx.createRadialGradient(x, y, 0, x, y, r);
      p.addColorStop(0, 'rgba(248, 252, 255, 0.85)');
      p.addColorStop(1, 'rgba(248, 252, 255, 0)');
      ctx.fillStyle = p;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  /** Showcase: a dashed ring round the inspected sprite, softly pulsing. */
  private drawSelection(ctx: CanvasRenderingContext2D) {
    const sel = this.selected;
    if (!sel) return;
    const [cx, cy, rx, ry] = sel.ring;
    const pulse = 1 + 0.04 * Math.sin(performance.now() / 260);
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2 / this.fit.s;
    ctx.strokeStyle = 'rgba(255, 211, 107, 0.95)';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * pulse + 4, ry * pulse + 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ——— Showcase (/farm-animation-test) ———

  /** Groups' switches and speeds, for the panel. */
  getGroups(): Record<GroupId, { on: boolean; speed: number }> {
    const out = {} as Record<GroupId, { on: boolean; speed: number }>;
    for (const id of GROUPS) out[id] = { on: this.groups[id].on, speed: this.groups[id].speed };
    return out;
  }

  setGroup(id: GroupId, patch: { on?: boolean; speed?: number }) {
    Object.assign(this.groups[id], patch);
    if (!this.raf) this.frame(performance.now(), true);
  }

  /** Plays a group's showcase moment again (gust, sails spin-up, fish jump, crop cycle…). */
  replay(id: GroupId) {
    switch (id) {
      case 'environment':
        this.wind.trigger();
        this.ambient.leafBurst();
        this.ambient.birdsNow();
        break;
      case 'buildings':
        this.buildings.replay();
        break;
      case 'animals':
        this.animals.replay();
        break;
      case 'crops':
        this.startCropDemo();
        break;
      case 'water': {
        this.fish.jumpNow();
        const { cx, cy, rx, ry } = this.assets.layout.places.pond;
        for (let i = 0; i < 4; i++)
          this.water.ripple(
            cx + (this.rand() - 0.5) * rx,
            cy + (this.rand() - 0.5) * ry,
            0.7 + this.rand() * 0.6,
          );
        break;
      }
      case 'particles':
        this.particleShow();
        break;
    }
  }

  /** Live particles by kind (panel). */
  particleCounts() {
    return this.particles.counts();
  }

  /**
   * Faint wind streaks drifting across the island, more of them (and faster) in a gust.
   * At most a dozen alive at once.
   */
  private windClock = 0;
  private spawnWind(w: World) {
    if (!w.settings.particles) return;
    const strength = this.wind.at(800);
    this.windClock += w.dt * (0.4 + strength * 2.2) * w.settings.particleDensity;
    while (this.windClock > 1) {
      this.windClock--;
      if ((this.particles.counts().wind ?? 0) > 12) break;
      const [x0, y0, x1, y1] = w.view;
      this.particles.spawn(
        'wind',
        x0 + this.rand() * (x1 - x0) * 0.6,
        y0 + 60 + this.rand() * (y1 - y0 - 160),
        40,
        0,
        1.6 + this.rand() * 1.2,
        10 + this.rand() * 16,
      );
    }
  }

  /** Every particle kind once, each where it belongs, so they can be compared side by side. */
  private particleShow() {
    const r = this.rand;
    const P = this.particles;
    const { chimney, pond } = this.assets.layout.places;
    const plot = this.assets.layout.field.plots[3]?.centre ?? [500, 500];
    const [fx, fy] = this.env.flowers()[0] ?? [1000, 480];
    const [hx, hy] = this.assets.layout.places.focus.barn;
    for (let i = 0; i < 8; i++)
      P.spawn('wind', 200 + r() * 600, 120 + r() * 300, 60, 0, 2, 12 + r() * 14);
    for (let i = 0; i < 6; i++)
      P.spawn('smoke', chimney.x, chimney.top - i * 6, (r() - 0.5) * 6, -18, 4.5, 6 + r() * 3);
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2;
      P.spawn(
        'drop',
        pond.cx,
        pond.cy,
        Math.cos(a) * 60,
        Math.sin(a) * 80,
        1,
        1 + r(),
        pond.cy + 4,
      );
    }
    const crownFx = this.assets.layout.fx?.splash;
    if (crownFx)
      P.spawn(
        'splash',
        pond.cx + 60,
        pond.cy + 10,
        0,
        0,
        0.8,
        30,
        1e9,
        this.assets.img(crownFx.file),
      );
    for (let i = 0; i < 10; i++)
      P.spawn('dust', hx + (r() - 0.5) * 120, hy + (r() - 0.5) * 40, 0, -4, 2, 2 + r() * 2);
    for (let i = 0; i < 10; i++)
      P.spawn(
        'soil',
        plot[0],
        plot[1],
        (r() - 0.5) * 80,
        -60 - r() * 60,
        1.2,
        1.4 + r(),
        plot[1] + 6,
      );
    for (let i = 0; i < 6; i++)
      P.spawn(
        'seed',
        plot[0] - 30,
        plot[1] - 40,
        40 + r() * 20,
        -20,
        1.4,
        1.5,
        plot[1] + (r() - 0.5) * 10,
      );
    for (let i = 0; i < 8; i++)
      P.spawn('grow', plot[0] + 90 + (r() - 0.5) * 40, plot[1] - 20 - r() * 30, 0, -20, 1.2, 2.2);
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.2;
      P.spawn('harvest', plot[0] + 180, plot[1] - 10, Math.cos(a) * 90, Math.sin(a) * 90, 1.4, 2);
    }
    for (let i = 0; i < 8; i++)
      P.spawn('sparkle', pond.cx - 120 + r() * 240, pond.cy - 40 + r() * 60, 0, -6, 1, 2.5);
    for (let i = 0; i < 12; i++)
      P.spawn('pollen', fx + (r() - 0.5) * 40, fy - r() * 16, 0, -3, 2.5, 2);
    for (let i = 0; i < 6; i++) P.spawn('straw', hx - 30, hy - 10, 20 + r() * 20, -12, 2.5, 4);
    const icon = this.assets.layout.fx?.flower;
    if (icon)
      P.spawn(
        'reward',
        plot[0] + 180,
        plot[1] - 70,
        0,
        -38,
        1.8,
        16,
        1e9,
        this.assets.img(icon.file),
      );
  }

  // Crop cycle demo: six plots (vegetables, two fruit trees, a mushroom block, a root crop) go
  // sow → sprout → young (watered) → flowering → ready → harvest, staggered, with the crops' own
  // pictures. A tree fruits again after a harvest (three times, then it is cleared); the block
  // gives three flushes. The last three plots stay locked.
  private demo: {
    plots: {
      crop: CropId;
      kind: PlotKindView;
      stage: PlotStageView;
      clock: number;
      harvests: number;
      cycle: number;
      wet: boolean;
    }[];
    last: string;
  } | null = null;

  startCropDemo() {
    const crops: CropId[] = ['chili', 'durian', 'shiitake', 'carrot', 'mango', 'cucumber'];
    this.demo = {
      plots: crops.map((crop, i) => ({
        crop,
        kind: CROPS[crop].kind,
        stage: 'empty',
        clock: -i * 0.7,
        harvests: 0,
        cycle: 0,
        wet: false,
      })),
      last: '',
    };
  }

  stopCropDemo() {
    this.demo = null;
  }

  private runCropDemo(dt: number) {
    const d = this.demo;
    if (!d) return;
    const HOLD: Record<PlotStageView, number> = {
      empty: 1.4,
      sprout: 2.6,
      young: 2.6,
      flowering: 2.6,
      ready: 2.6,
    };
    for (const p of d.plots) {
      p.clock += dt;
      if (p.clock < HOLD[p.stage]) continue;
      p.clock = 0;
      const next: Record<PlotStageView, PlotStageView> = {
        empty: 'sprout',
        sprout: 'young',
        young: 'flowering',
        flowering: 'ready',
        ready: 'empty',
      };
      if (p.stage === 'ready') {
        p.harvests++;
        p.cycle++;
        if (p.kind === 'tree' && p.harvests < 3) p.stage = 'flowering';
        else if (p.kind === 'mushroom' && p.harvests < 3) p.stage = 'young';
        else {
          p.stage = 'empty';
          p.harvests = 0;
        }
      } else p.stage = next[p.stage];
      if (p.stage === 'sprout') p.cycle++;
      // Watered as it turns young (or, for a tree, as it flowers again).
      p.wet = p.stage === 'young' || (p.stage === 'flowering' && p.harvests > 0);
    }
    const plots: PlotView[] = this.assets.layout.field.plots.map((def, i) => {
      const p = d.plots[i];
      if (!p)
        return {
          id: def.id,
          unlocked: false,
          unlockLevel: 3,
          crop: null,
          stage: 'empty',
          image: null,
          wet: false,
          thirsty: false,
          label: '',
        };
      const planted = p.stage !== 'empty';
      const flushes = CROPS[p.crop].flushes ?? 1;
      return {
        id: def.id,
        unlocked: true,
        unlockLevel: null,
        crop: planted ? p.crop : null,
        stage: p.stage,
        image: planted ? cropSprite(p.crop, p.stage as Exclude<PlotStageView, 'empty'>) : null,
        wet: planted && p.wet && p.clock < 2,
        thirsty: false,
        needsWater: planted && p.stage !== 'ready' && !(p.wet && p.clock < 2),
        label: planted ? `${p.crop} · ${p.stage}` : '',
        kind: p.kind,
        harvests: p.harvests,
        left: p.kind === 'tree' ? Infinity : p.kind === 'mushroom' ? flushes - p.harvests : 1,
        cycle: p.cycle,
        produce: cropSprite(p.crop, 'produce'),
        yield: CROPS[p.crop].yield,
      };
    });
    const key = plots.map((p) => `${p.stage}${p.wet ? 'w' : ''}${p.harvests ?? ''}`).join(',');
    if (key === d.last) return;
    d.last = key;
    this.game.setView({
      plots,
      cow: { icon: null, kind: 'busy', label: '' },
      chicken: { icon: null, kind: 'busy', label: '' },
      watering: false,
    });
    this.env.showCrops = false;
  }

  /** What is under a viewport point, for the sprite inspector; also rings it in the scene. */
  inspect(clientX: number, clientY: number): SpriteInfo | null {
    const r = this.canvas.getBoundingClientRect();
    const p = this.toPicture({ x: clientX - r.left, y: clientY - r.top });
    const L = this.assets.layout;
    const info = ((): SpriteInfo | null => {
      for (const a of this.animals.pieces())
        if (Math.hypot(p.x - a.at[0], p.y - a.at[1]) < a.r)
          return {
            id: a.id,
            file: a.file,
            group: 'animals',
            kind: a.id.startsWith('cow') ? 'cow' : a.id === 'goose' ? 'goose' : 'chicken',
            ring: [a.at[0], a.at[1], a.r, a.r * 0.9],
          };
      const b = L.sprites.blades;
      if (b?.hub && Math.hypot(p.x - b.hub[0], p.y - b.hub[1]) < b.w / 2)
        return {
          id: 'blades',
          file: b.file,
          group: 'buildings',
          kind: 'windmill',
          ring: [b.hub[0], b.hub[1], b.w / 2, b.h / 2],
        };
      const ch = L.places.chimney;
      if (Math.abs(p.x - ch.x) < 18 && p.y < ch.top + 40 && p.y > ch.top - 60)
        return {
          id: 'chimney',
          file: 'fx-smoke.webp',
          group: 'buildings',
          kind: 'chimney',
          ring: [ch.x, ch.top - 10, 18, 40],
        };
      const { x0, y0, x1, y1 } = L.places.door;
      if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1)
        return {
          id: 'door',
          file: 'island.webp',
          group: 'buildings',
          kind: 'door',
          ring: [(x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2],
        };
      const g = L.glass;
      if (p.x >= g.x && p.x <= g.x + g.w && p.y >= g.y && p.y <= g.y + g.h * 0.8)
        return {
          id: 'greenhouse',
          file: g.file,
          group: 'buildings',
          kind: 'glass',
          ring: [g.x + g.w / 2, g.y + g.h / 2, g.w / 2, g.h / 2],
        };
      const plotId = this.game.hit(p);
      if (plotId !== null) {
        const d = L.field.plots.find((q) => q.id === plotId)!;
        return {
          id: `plot-${plotId}`,
          file: L.field.soil.file,
          group: 'crops',
          kind: 'plot',
          ring: [d.centre[0], d.centre[1], 70, 40],
        };
      }
      for (const k of this.fish.pieces())
        if (Math.hypot(p.x - k.at[0], (p.y - k.at[1]) * 1.6) < k.r)
          return {
            id: k.id,
            file: k.file,
            group: 'water',
            kind: 'koi',
            ring: [k.at[0], k.at[1], k.r, k.r * 0.5],
          };
      for (const l of L.lilies) {
        const s = L.sprites[l.id];
        if (s && Math.hypot(p.x - l.cx, p.y - l.cy) < 18)
          return {
            id: l.id,
            file: s.file,
            group: 'water',
            kind: 'lily',
            ring: [l.cx, l.cy, s.w / 2, s.h / 2],
          };
      }
      const layer = this.env.layerAt(p);
      if (layer) {
        const [cx, cy, rx, ry] = layer.e;
        const group: GroupId =
          layer.kind === 'reed' || layer.kind === 'dock' ? 'water' : 'environment';
        return {
          id: layer.id,
          file: layer.file,
          group,
          kind: layer.kind,
          fruit: !!layer.fruit,
          ring: [cx, cy, rx, ry],
        };
      }
      if (this.water.isWater(p.x, p.y)) {
        const { cx, cy, rx, ry } = L.places.pond;
        return {
          id: 'pond',
          file: L.water.file,
          group: 'water',
          kind: 'water',
          ring: [cx, cy, rx, ry],
        };
      }
      for (const c of L.clouds)
        if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h && c.bank)
          return {
            id: c.file.replace('.webp', ''),
            file: c.file,
            group: 'environment',
            kind: 'cloud',
            ring: [c.x + c.w / 2, c.y + c.h / 2, c.w / 2, c.h / 2],
          };
      return null;
    })();
    this.selected = info;
    if (!this.raf) this.frame(performance.now(), true);
    return info;
  }

  clearInspect() {
    this.selected = null;
  }
}

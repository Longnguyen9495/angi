import { POTS, PLANT_FIT, type PotDef } from '../../data/skyGarden';
import { cropSprite, BEE_SPRITE } from '../../data/sprites';
import type { CropId } from '../../data/types';
import type { Assets } from '../farm-anim/engine/assets';
import { ParticleSystem } from '../farm-anim/engine/ParticleSystem';
import { DEFAULT_SETTINGS } from '../farm-anim/engine/types';
import { WindSystem, rng } from '../farm-anim/engine/WindSystem';
import { drawBent, easeOut, smooth, type World } from '../farm-anim/engine/world';
import { SkySystem, type SkyPart } from '../farm-anim/systems/SkySystem';
import {
  drawBeanstalk,
  drawBubble,
  drawFirefly,
  drawLadybug,
  drawMachine,
  drawSign,
  platformBox,
  platformImage,
  stampDraft,
  villageImage,
} from './art';
import {
  createDemo,
  pickCrop,
  progress,
  stageOf,
  stepMachine,
  type BugKind,
  type DemoFloor,
  type Stage,
} from './demo';
import {
  floorAt,
  layoutFocus,
  layoutOverview,
  lerpLayout,
  slotAt,
  type FocusShape,
  type Rect,
  type SceneLayout,
  type ViewMode,
} from './layout';

/*
 * The Vườn Mây motion demo (G1, plans/vuon-may.md §0.3): one canvas, one frame loop. It reuses
 * the farm's wind, particles and sky shading (farm-anim/engine), draws the floors from layout.ts,
 * and runs the demo garden of demo.ts. It never reads or writes the player's progress.
 *
 * Content space: CSS px of the scrolling tower (overview) or of the zoomed floor (focus); the
 * scene lerps between the two layouts, so a zoom is just every box moving to its new place.
 */

export type DayPart = 'dawn' | 'day' | 'dusk' | 'night';

export interface SkyStats {
  fps: number;
  objects: number;
  /** Pot box side in CSS px (what a finger has to hit). */
  cell: number;
  viewW: number;
  viewH: number;
  mode: ViewMode;
  shape: FocusShape;
}

export interface SkySceneOptions {
  onStats?: (s: SkyStats) => void;
  onCaught?: (kind: BugKind, total: number) => void;
  onHarvest?: (total: number) => void;
  onMode?: (mode: ViewMode, floor: number | null) => void;
  /** Labels drawn on the canvas (i18n). */
  labels: { draft: string };
  /** Where the bug bag sits on screen (CSS px), caught bugs fly there. */
  bagAt?: () => { x: number; y: number };
}

const PART_TO_SKY: Record<DayPart, SkyPart> = {
  dawn: 'morning',
  day: 'noon',
  dusk: 'evening',
  night: 'night',
};

/** Colour laid over the garden for the hour (the sky picture is shaded by SkySystem). */
const TINT: Record<DayPart, string | null> = {
  dawn: 'rgba(255,186,140,0.12)',
  day: null,
  dusk: 'rgba(255,128,92,0.18)',
  night: 'rgba(16,24,66,0.5)',
};

const ZOOM_S = 0.45;
const DRAG_PX = 8;
const MAX_BUGS = 4;
const INTRO_KEY = 'sky-garden/intro-seen';

/**
 * Test art cut from the sprite sheet (scripts/sky-garden/prepare-sheet.mjs): cloud shelves by
 * floor colour, the beanstalk in three parts, butterfly, bird, rainbow and the flower bubbles that
 * hang under the floors. Not cleared for release yet (§0.14, Q6).
 */
const SHEET = '/images/sky-garden/sheet/';
const SHELVES = ['shelf-sky', 'shelf-purple', 'shelf-green', 'shelf-pink', 'shelf-blue'].map(
  (n) => `${SHEET}${n}.webp`,
);
const STALK = {
  top: `${SHEET}beanstalk-top.webp`,
  tile: `${SHEET}beanstalk-tile.webp`,
  base: `${SHEET}beanstalk-base.webp`,
};
const BUBBLES = Array.from({ length: 7 }, (_, i) => `${SHEET}bubble-${i + 1}.webp`);
const BUTTERFLY = `${SHEET}butterfly.webp`;
const BIRD = `${SHEET}bird.webp`;
const RAINBOW = `${SHEET}rainbow.webp`;
/** Shelf picture height, in platform heights; where its cloud top sits, as a share of it. */
const SHELF_H = 2.15;
const SHELF_TOP = 0.36;
/** Shelf ends kept unstretched, as a share of the picture width; the middle repeats. */
const SHELF_CAP = 0.14;
/** Beanstalk drawn this many times the stalk column's width (its leaves spread out). */
const STALK_W = 1.7;

interface Bug {
  kind: BugKind;
  floor: number;
  slot: number;
  state: 'fly' | 'perched' | 'caught' | 'leave';
  t0: number;
  /** Start of the flight (content px when it began). */
  from: { x: number; y: number };
  /** Perch spot on the plant, in pot boxes from the slot's top-left. */
  perch: { x: number; y: number };
  seed: number;
  /** Where it was when caught (content px), for the flight to the bag. */
  at?: { x: number; y: number };
}

interface Intro {
  kind: 'full' | 'quick' | 'fade';
  t0: number;
  dur: number;
}

const INTRO_DUR = { full: 3.2, quick: 0.6, fade: 0.3 } as const;

export class SkyScene {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private raf = 0;
  private last = 0;
  private t = 0;
  private alive = true;
  private ro: ResizeObserver;
  private rand = rng(2026);

  private wind = new WindSystem();
  private particles = new ParticleSystem();
  private sky = new SkySystem();
  private world: World;

  private floors: DemoFloor[];
  private lastStage = new Map<string, Stage | 'empty'>();
  private replant = new Map<string, number>();
  private bugs: Bug[] = [];
  private nextBug = 4;
  private caught = 0;
  private harvested = 0;

  private mode: ViewMode = 'overview';
  private shape: FocusShape = 'row';
  private focus: number | null = null;
  private from: SceneLayout | null = null;
  private to!: SceneLayout;
  private layout!: SceneLayout;
  private zoomT0 = -1;
  private scroll = { x: 0, y: 0 };
  private scrollFrom = { x: 0, y: 0 };
  private scrollTo = { x: 0, y: 0 };
  /** Overview scroll to come back to after a focus. */
  private overviewY: number | null = null;

  private part: DayPart = 'day';
  private reducedMedia: MediaQueryList;
  private reducedForce: boolean | null = null;
  private draftMarks = true;
  private intro: Intro | null = null;

  private images = new Map<string, HTMLImageElement | 'loading' | 'error'>();
  private skyClouds: { src: string; x: number; y: number; s: number; v: number; flip: boolean }[];

  private press: { x: number; y: number; sx: number; sy: number; id: number } | null = null;
  private dragging = false;

  /** The last stats sent (QA script reads it). */
  lastStats: SkyStats | null = null;
  private frames = 0;
  private fpsT = 0;
  private fps = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: SkySceneOptions,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
    this.reducedMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.particles.cap = 160;
    this.wind.base = 0.35;
    this.world = {
      t: 0,
      dt: 0,
      wind: this.wind,
      settings: { ...DEFAULT_SETTINGS },
      // The particles never read assets; the sky garden has no layers.json.
      assets: null as unknown as Assets,
      particles: this.particles,
      reduced: this.reduced,
      pointer: null,
      view: [0, 0, 0, 0],
      rand: this.rand,
    };
    this.floors = createDemo(0, this.rand);
    const r = rng(7);
    this.skyClouds = Array.from({ length: 6 }, (_, i) => ({
      src: `/farm-anim/cloud-${(i % 4) + 1}.webp`,
      x: r(),
      y: 0.05 + r() * 0.8,
      s: 0.6 + r() * 0.9,
      v: 0.006 + r() * 0.01,
      flip: r() > 0.5,
    }));

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement ?? canvas);
    this.resize();
    this.startIntro();

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onCancel);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    document.addEventListener('visibilitychange', this.onVisibility);
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onCancel);
    this.canvas.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  // ——— Controls (demo panel) ———

  get reduced(): boolean {
    return this.reducedForce ?? this.reducedMedia.matches;
  }

  setReducedMotion(force: boolean | null) {
    this.reducedForce = force;
    this.world.reduced = this.reduced;
    if (this.reduced) this.particles.clear();
  }

  setDraftMarks(on: boolean) {
    this.draftMarks = on;
  }

  setDayPart(p: DayPart) {
    this.part = p;
    this.sky.mood = { part: PART_TO_SKY[p], weather: 'clear' };
  }

  /** Overview of the tower, or one floor zoomed in (the floor nearest the centre by default). */
  setMode(mode: ViewMode, floor?: number) {
    if (mode === 'focus') {
      const f = floor ?? this.floorInView();
      if (this.mode === 'overview') this.overviewY = this.scroll.y;
      this.focus = f;
    } else this.focus = null;
    this.mode = mode;
    this.retarget(true);
    this.opts.onMode?.(mode, this.focus);
  }

  setShape(shape: FocusShape) {
    this.shape = shape;
    this.retarget(true);
  }

  replayIntro(full: boolean) {
    this.startIntro(full ? 'full' : 'quick');
  }

  /** Ripen every growing plant now. */
  ripenAll() {
    for (const f of this.floors)
      for (const s of f.slots) if (s.plant) s.plant.plantedAt = this.t - s.plant.grow;
  }

  /** Picks every ripe plant on the floor in focus; how many. */
  harvestFloor(): number {
    if (this.focus === null) return 0;
    const fi = this.focus;
    let n = 0;
    this.df(fi).slots.forEach((s, si) => {
      if (s.plant && progress(s.plant, this.t) >= 1) {
        this.harvest(fi, si);
        n++;
      }
    });
    return n;
  }

  /** A bug flies to a growing plant in view (any kind, or the one asked for). */
  spawnBug(kind?: BugKind) {
    const spots: [number, number][] = [];
    const visible = this.visibleFloors();
    this.floors.forEach((f, fi) => {
      if (!visible.includes(fi)) return;
      f.slots.forEach((s, si) => {
        if (
          s.plant &&
          progress(s.plant, this.t) < 1 &&
          !this.bugs.some((b) => b.floor === fi && b.slot === si)
        )
          spots.push([fi, si]);
      });
    });
    if (!spots.length) return false;
    const [floor, slot] = spots[Math.floor(this.rand() * spots.length)]!;
    const night = this.part === 'night';
    const k: BugKind =
      kind ??
      (night && this.rand() < 0.5
        ? 'firefly'
        : (['ladybug', 'bee', 'butterfly'] as const)[Math.floor(this.rand() * 3)]!);
    const leftSide = this.rand() < 0.5;
    this.bugs.push({
      kind: k,
      floor,
      slot,
      state: this.reduced ? 'perched' : 'fly',
      t0: this.t,
      from: {
        x: this.scroll.x + (leftSide ? -40 : this.w + 40),
        y: this.scroll.y + this.h * (0.15 + this.rand() * 0.5),
      },
      perch: { x: -0.08 + this.rand() * 0.16, y: -0.12 - this.rand() * 0.12 },
      seed: this.rand() * 10,
    });
    return true;
  }

  // ——— Layout and scrolling ———

  /** Floor boxes / demo floor by index (always in range: both have one entry per floor). */
  private lf(i: number) {
    return this.layout.floors[i]!;
  }

  private df(i: number) {
    return this.floors[i]!;
  }

  private resize() {
    const box = (this.canvas.parentElement ?? this.canvas).getBoundingClientRect();
    this.w = Math.max(1, Math.round(box.width));
    this.h = Math.max(1, Math.round(box.height));
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.retarget(false);
  }

  private target(): SceneLayout {
    return this.mode === 'focus' && this.focus !== null
      ? layoutFocus(this.w, this.h, this.floors.length, this.focus, this.shape)
      : layoutOverview(this.w, this.h, this.floors.length);
  }

  /** New target layout; `animate` zooms there, otherwise it snaps (resize). */
  private retarget(animate: boolean) {
    const next = this.target();
    const first = !this.layout;
    let scrollTo = { x: 0, y: 0 };
    if (next.mode === 'overview') {
      const bottom = Math.max(0, next.height - this.h);
      scrollTo = { x: 0, y: first ? bottom : Math.min(bottom, this.overviewY ?? this.scroll.y) };
      if (animate) this.overviewY = null;
    }
    if (animate && !first && !this.reduced) {
      this.from = this.layout;
      this.scrollFrom = { ...this.scroll };
      this.zoomT0 = this.t;
    } else {
      this.from = null;
      this.zoomT0 = -1;
    }
    this.to = next;
    this.scrollTo = scrollTo;
    if (!this.from) {
      this.layout = next;
      this.scroll = this.clampScroll(scrollTo, next);
    }
  }

  private clampScroll(s: { x: number; y: number }, l: SceneLayout) {
    return {
      x: Math.max(0, Math.min(l.width - this.w, s.x)),
      y: Math.max(0, Math.min(l.height - this.h, s.y)),
    };
  }

  private stepLayout() {
    if (!this.from || this.zoomT0 < 0) return;
    const k = smooth((this.t - this.zoomT0) / ZOOM_S);
    this.layout = lerpLayout(this.from, this.to, k);
    this.scroll = {
      x: this.scrollFrom.x + (this.scrollTo.x - this.scrollFrom.x) * k,
      y: this.scrollFrom.y + (this.scrollTo.y - this.scrollFrom.y) * k,
    };
    if (k >= 1) {
      this.from = null;
      this.zoomT0 = -1;
      this.layout = this.to;
      this.scroll = this.clampScroll(this.scrollTo, this.to);
    }
  }

  /** Floor alpha: in focus the others fade out while the zoom runs. */
  private floorAlpha(i: number) {
    const focusing = this.to.mode === 'focus';
    const k = this.from ? smooth((this.t - this.zoomT0) / ZOOM_S) : 1;
    if (focusing) return i === this.to.focus ? 1 : 1 - k;
    if (this.from && this.from.mode === 'focus') return i === this.from.focus ? 1 : k;
    return 1;
  }

  private floorInView(): number {
    const mid = this.scroll.y + this.h / 2;
    let best = 0;
    let d = Infinity;
    this.layout.floors.forEach((f, i) => {
      const dd = Math.abs(f.platform.y - mid);
      if (dd < d) {
        d = dd;
        best = i;
      }
    });
    return best;
  }

  private visibleFloors(margin = 0): number[] {
    const y0 = this.scroll.y - margin;
    const y1 = this.scroll.y + this.h + margin;
    const out: number[] = [];
    this.layout.floors.forEach((f, i) => {
      const top = f.slots[0]!.y - this.layout.cell;
      const bottom = f.platform.y + f.platform.h * 1.4;
      if (bottom >= y0 && top <= y1 && this.floorAlpha(i) > 0.01) out.push(i);
    });
    return out;
  }

  // ——— Images ———

  private img(src: string): HTMLImageElement | null {
    const got = this.images.get(src);
    if (got instanceof HTMLImageElement) return got;
    if (!got) {
      this.images.set(src, 'loading');
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => this.images.set(src, im);
      im.onerror = () => this.images.set(src, 'error');
      im.src = src;
    }
    return null;
  }

  private potImage(def: PotDef, drawn: number) {
    // The 512 px picture only when the pot is drawn bigger than the 256 px one can serve.
    const big = def.src2x && drawn * this.dpr > 280 ? this.img(def.src2x) : null;
    return big ?? this.img(def.src);
  }

  // ——— Intro (first visit: the beanstalk grows and the clouds part) ———

  private startIntro(kind?: Intro['kind']) {
    let seen = false;
    try {
      seen = localStorage.getItem(INTRO_KEY) === '1';
    } catch {
      /* private mode: the full intro plays every time */
    }
    const k: Intro['kind'] = this.reduced ? 'fade' : (kind ?? (seen ? 'quick' : 'full'));
    this.intro = { kind: k, t0: this.t, dur: INTRO_DUR[k] };
    if (k === 'full') {
      try {
        localStorage.setItem(INTRO_KEY, '1');
      } catch {
        /* nothing to remember it in */
      }
    }
  }

  private introK() {
    if (!this.intro) return 1;
    return Math.min(1, (this.t - this.intro.t0) / this.intro.dur);
  }

  // ——— Input ———

  private toContent(e: PointerEvent | WheelEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left + this.scroll.x, y: e.clientY - r.top + this.scroll.y };
  }

  private onDown = (e: PointerEvent) => {
    this.press = {
      x: e.clientX,
      y: e.clientY,
      sx: this.scroll.x,
      sy: this.scroll.y,
      id: e.pointerId,
    };
    this.dragging = false;
    this.canvas.setPointerCapture(e.pointerId);
  };

  private onMove = (e: PointerEvent) => {
    const p = this.press;
    if (!p || p.id !== e.pointerId || this.from) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!this.dragging && Math.hypot(dx, dy) > DRAG_PX) this.dragging = true;
    if (!this.dragging) return;
    const pan = this.layout.pan;
    this.scroll = this.clampScroll(
      { x: pan === 'x' ? p.sx - dx : this.scroll.x, y: pan === 'y' ? p.sy - dy : this.scroll.y },
      this.layout,
    );
    if (this.mode === 'overview') this.overviewY = this.scroll.y;
  };

  private onUp = (e: PointerEvent) => {
    const p = this.press;
    this.press = null;
    if (!p || p.id !== e.pointerId) return;
    if (!this.dragging) this.tap(this.toContent(e));
    this.dragging = false;
  };

  private onCancel = () => {
    this.press = null;
    this.dragging = false;
  };

  private onWheel = (e: WheelEvent) => {
    const pan = this.layout.pan;
    if (pan === 'none' || this.from) return;
    e.preventDefault();
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    this.scroll = this.clampScroll(
      {
        x: pan === 'x' ? this.scroll.x + d : this.scroll.x,
        y: pan === 'y' ? this.scroll.y + d : this.scroll.y,
      },
      this.layout,
    );
    if (this.mode === 'overview') this.overviewY = this.scroll.y;
  };

  private onVisibility = () => {
    if (document.hidden) cancelAnimationFrame(this.raf);
    else if (this.alive) {
      this.last = 0;
      this.raf = requestAnimationFrame(this.frame);
    }
  };

  /** Bugs first (their own hit circle), then the floor: machine, ripe plant, empty pot. */
  private tap(p: { x: number; y: number }) {
    if (this.from || (this.intro && this.introK() < 1)) return;
    const bug = this.bugAt(p);
    if (bug) {
      this.catchBug(bug);
      return;
    }
    if (this.mode === 'overview') {
      // The whole tower is for looking: a tap chooses the floor to work on.
      const f = floorAt(this.layout, p.x, p.y);
      if (f !== null) this.setMode('focus', f);
      return;
    }
    const fi = this.focus ?? 0;
    const floor = this.lf(fi);
    const m = floor.machine;
    if (p.x >= m.x && p.x <= m.x + m.w && p.y >= m.y && p.y <= m.y + m.h) {
      this.tapMachine(fi);
      return;
    }
    const si = slotAt(this.layout, fi, p.x, p.y);
    if (si === null) return;
    const slot = this.df(fi).slots[si]!;
    const r = floor.slots[si]!;
    if (!slot.plant) {
      slot.plant = { crop: pickCrop(this.rand), plantedAt: this.t, grow: 40 + this.rand() * 40 };
      this.burst('seed', r.x + r.w / 2, r.y + r.h * 0.3, 8);
    } else if (progress(slot.plant, this.t) >= 1) this.harvest(fi, si);
  }

  private bugAt(p: { x: number; y: number }): Bug | null {
    // At least a 22 px radius, more on a big floor, so a bug is always easy to hit (§14).
    const reach = Math.max(22, this.layout.cell * 0.22);
    let best: Bug | null = null;
    let d = reach;
    for (const b of this.bugs) {
      if (b.state !== 'perched' || this.floorAlpha(b.floor) < 0.5) continue;
      const at = this.bugPos(b);
      const dd = Math.hypot(at.x - p.x, at.y - p.y);
      if (dd < d) {
        d = dd;
        best = b;
      }
    }
    return best;
  }

  private catchBug(b: Bug) {
    b.at = this.bugPos(b);
    b.state = 'caught';
    b.t0 = this.t;
    this.caught++;
    this.burst('sparkle', b.at.x, b.at.y, 6);
    this.opts.onCaught?.(b.kind, this.caught);
  }

  private harvest(fi: number, si: number) {
    const slot = this.df(fi).slots[si]!;
    const r = this.lf(fi).slots[si]!;
    if (!slot.plant) return;
    const crop = slot.plant.crop;
    slot.plant = null;
    this.harvested++;
    // Bugs still on it fly off (§0.5: harvesting lets an uncaught bug go).
    for (const b of this.bugs)
      if (b.floor === fi && b.slot === si && b.state !== 'caught') b.state = 'leave';
    const icon = this.img(cropSprite(crop, 'produce'));
    this.burst('harvest', r.x + r.w / 2, r.y + r.h * 0.2, 10);
    if (!this.reduced && icon)
      this.particles.spawn(
        'reward',
        r.x + r.w / 2,
        r.y,
        0,
        -60,
        1.1,
        Math.max(18, r.w * 0.3),
        1e9,
        icon,
      );
    this.replant.set(`${fi}:${si}`, this.t + 1.5);
    this.opts.onHarvest?.(this.harvested);
  }

  private tapMachine(fi: number) {
    const m = this.df(fi).machine;
    const r = this.lf(fi).machine;
    if (m.phase === 'done') {
      m.phase = 'idle';
      m.since = this.t;
      this.burst('sparkle', r.x + r.w / 2, r.y + r.h * 0.3, 8);
    } else if (m.phase === 'idle') {
      m.phase = 'run';
      m.since = this.t;
    }
  }

  private burst(kind: 'seed' | 'harvest' | 'sparkle' | 'grow', x: number, y: number, n: number) {
    if (this.reduced) return;
    for (let i = 0; i < n; i++) {
      const a = this.rand() * Math.PI * 2;
      const v = 30 + this.rand() * 80;
      this.particles.spawn(
        kind,
        x,
        y,
        Math.cos(a) * v,
        Math.sin(a) * v - 60,
        0.7 + this.rand() * 0.5,
        3 + this.rand() * 3,
        y + 40,
      );
    }
  }

  // ——— Per frame ———

  private frame = (now: number) => {
    if (!this.alive) return;
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0;
    this.last = now;
    this.t += dt;
    this.frames++;
    this.fpsT += dt;
    if (this.fpsT >= 0.5) {
      this.fps = Math.round(this.frames / this.fpsT);
      this.frames = 0;
      this.fpsT = 0;
      this.lastStats = {
        fps: this.fps,
        objects: this.bugs.length + this.particles.count() + this.floors.length * 7,
        cell: Math.round(this.layout.cell),
        viewW: this.w,
        viewH: this.h,
        mode: this.mode,
        shape: this.shape,
      };
      this.opts.onStats?.(this.lastStats);
    }
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    this.wind.amplitude = this.reduced ? 0 : 1;
    this.wind.update(dt);
    this.world.t = this.t;
    this.world.dt = dt;
    this.world.view = [
      this.scroll.x,
      this.scroll.y,
      this.scroll.x + this.w,
      this.scroll.y + this.h,
    ];
    this.stepLayout();
    if (this.intro && this.introK() >= 1) this.intro = null;

    // Load the pots of the floors near the view only (§0.8: art by floor).
    for (const fi of this.visibleFloors(this.h)) {
      for (const s of this.df(fi).slots) this.potImage(POTS[s.pot], this.layout.cell);
    }

    this.floors.forEach((f, fi) => {
      stepMachine(f.machine, this.t);
      const mr = this.lf(fi).machine;
      if (f.machine.phase === 'run' && !this.reduced && this.rand() < dt * 2.2) {
        this.particles.spawn(
          'smoke',
          mr.x + mr.w * 0.5,
          mr.y + mr.h * 0.25,
          0,
          -18,
          2.2,
          mr.w * 0.18,
        );
      }
      f.slots.forEach((s, si) => {
        const key = `${fi}:${si}`;
        const due = this.replant.get(key);
        if (!s.plant && due !== undefined && this.t >= due) {
          this.replant.delete(key);
          s.plant = { crop: pickCrop(this.rand), plantedAt: this.t, grow: 40 + this.rand() * 40 };
        }
        const st: Stage | 'empty' = s.plant ? stageOf(s.plant, this.t) : 'empty';
        const was = this.lastStage.get(key);
        if (was && was !== st && st !== 'empty') {
          const r = this.lf(fi).slots[si]!;
          this.burst('grow', r.x + r.w / 2, r.y + r.h * 0.2, 6);
        }
        this.lastStage.set(key, st);
      });
    });

    // Bugs: new ones now and then, perched ones leave after a while if nobody catches them.
    this.nextBug -= dt;
    if (this.nextBug <= 0) {
      this.nextBug = 6 + this.rand() * 6;
      if (this.bugs.filter((b) => b.state === 'fly' || b.state === 'perched').length < MAX_BUGS)
        this.spawnBug();
    }
    for (const b of this.bugs) {
      if (b.state === 'fly' && this.t - b.t0 >= 2.2) {
        b.state = 'perched';
        b.t0 = this.t;
      } else if (b.state === 'perched' && this.t - b.t0 > 30) {
        b.state = 'leave';
        b.t0 = this.t;
      }
      const plant = this.df(b.floor).slots[b.slot]!.plant;
      if (b.state === 'perched' && !plant) b.state = 'leave';
    }
    this.bugs = this.bugs.filter(
      (b) =>
        !(
          (b.state === 'caught' && this.t - b.t0 > 0.9) ||
          (b.state === 'leave' && this.t - b.t0 > 1.6)
        ),
    );
    if (!this.reduced) this.particles.update(this.world);
  }

  /** Where a bug is now (content px). */
  private bugPos(b: Bug): { x: number; y: number } {
    const r = this.lf(b.floor).slots[b.slot]!;
    const pot = POTS[this.df(b.floor).slots[b.slot]!.pot];
    const perch = {
      x: r.x + r.w * (pot.anchor.cx + b.perch.x),
      y: r.y + r.h * (pot.anchor.cy + b.perch.y),
    };
    const bob = this.reduced ? 0 : Math.sin(this.t * 3 + b.seed) * 1.5;
    if (b.state === 'perched') return { x: perch.x, y: perch.y + bob };
    if (b.state === 'fly') {
      const k = easeOut((this.t - b.t0) / 2.2);
      const cx = (b.from.x + perch.x) / 2 + Math.sin(b.seed) * 80;
      const cy = Math.min(b.from.y, perch.y) - 90;
      const u = 1 - k;
      return {
        x:
          u * u * b.from.x +
          2 * u * k * cx +
          k * k * perch.x +
          Math.sin(this.t * 9 + b.seed) * 4 * u,
        y:
          u * u * b.from.y +
          2 * u * k * cy +
          k * k * perch.y +
          Math.cos(this.t * 7 + b.seed) * 4 * u,
      };
    }
    if (b.state === 'leave') {
      const k = (this.t - b.t0) / 1.6;
      return { x: perch.x + k * 220 * (b.seed > 5 ? 1 : -1), y: perch.y - k * 160 };
    }
    // Caught: off to the bag on screen.
    const bag = this.opts.bagAt?.() ?? { x: 28, y: 28 };
    const k = smooth((this.t - b.t0) / 0.9);
    const from = b.at ?? perch;
    return {
      x: from.x + (this.scroll.x + bag.x - from.x) * k,
      y: from.y + (this.scroll.y + bag.y - from.y) * k - Math.sin(k * Math.PI) * 60,
    };
  }

  // ——— Drawing ———

  private draw() {
    const c = this.ctx;
    const { w, h } = this;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    this.drawSky(c);

    const intro = this.intro;
    const k = this.introK();
    c.save();
    c.translate(-this.scroll.x, -this.scroll.y);
    const l = this.layout;

    if (l.ground.h > 1) {
      c.globalAlpha = l.mode === 'overview' && !this.from ? 1 : this.floorAlpha(-1);
      const v = villageImage(l.ground.w, l.ground.h, this.dpr);
      c.drawImage(v, l.ground.x, l.ground.y, l.ground.w, l.ground.h);
      if (this.draftMarks)
        stampDraft(c, l.ground.x + 12, l.ground.y + l.ground.h - 22, this.opts.labels.draft);
      c.globalAlpha = 1;
    }

    const grown = intro?.kind === 'full' ? smooth(k / 0.45) : 1;
    if (!this.drawStalkArt(c, l.stalk, grown)) {
      drawBeanstalk(c, l.stalk, this.t, this.reduced ? 0 : this.wind.at(l.stalk.x) * 0.3, grown);
      if (this.draftMarks)
        stampDraft(c, l.stalk.x, l.stalk.y + l.stalk.h - 40, this.opts.labels.draft);
    }

    const visible = this.visibleFloors();
    for (const fi of visible) {
      let a = this.floorAlpha(fi);
      if (intro?.kind === 'full') a *= smooth((k * intro.dur - 1.3 - fi * 0.35) / 0.5);
      if (a <= 0.01) continue;
      c.globalAlpha = a;
      this.drawFloor(c, fi);
      c.globalAlpha = 1;
    }
    this.drawBugs(c);
    if (!this.reduced) {
      this.particles.draw(c, 'smoke');
      this.particles.draw(c, 'front');
    }
    c.restore();

    const tint = TINT[this.part];
    if (tint) {
      c.fillStyle = tint;
      c.fillRect(0, 0, w, h);
    }
    if (this.part === 'night') this.drawNightGlow(c, visible);
    if (intro) this.drawIntro(c, intro, k);
  }

  /**
   * A floor's cloud shelf from the sheet: drawn at its own aspect by height, ends kept, the middle
   * repeated across the floor's width (so the flowers are never stretched). False until loaded.
   */
  private drawShelf(c: CanvasRenderingContext2D, r: Rect, fi: number): boolean {
    const im = this.img(SHELVES[fi % SHELVES.length]!);
    if (!im) return false;
    const H = r.h * SHELF_H;
    const s = H / im.height;
    const top = r.y - H * SHELF_TOP;
    const x0 = r.x - r.h * 0.3;
    const w = r.w + r.h * 0.6;
    const capSrc = Math.round(im.width * SHELF_CAP);
    const capW = Math.min(capSrc * s, w / 2);
    c.drawImage(im, 0, 0, capSrc, im.height, x0, top, capW, H);
    c.drawImage(im, im.width - capSrc, 0, capSrc, im.height, x0 + w - capW, top, capW, H);
    const midSrc = im.width - capSrc * 2;
    const end = x0 + w - capW;
    // Each repeat overlaps the last by a pixel, so no hairline shows between them.
    for (let x = x0 + capW - 1; x < end - 0.5;) {
      const dw = Math.min(midSrc * s, end - x + 1);
      c.drawImage(im, capSrc, 0, dw / s, im.height, x, top, dw, H);
      x += dw - 1;
    }
    return true;
  }

  /**
   * The beanstalk from the sheet: the base on the ground, the seamless stretch repeated up the
   * tower, the top above it; `grown` (intro) reveals it from the ground up. False until loaded.
   */
  private drawStalkArt(c: CanvasRenderingContext2D, r: Rect, grown: number): boolean {
    const top = this.img(STALK.top);
    const tile = this.img(STALK.tile);
    const base = this.img(STALK.base);
    if (!top || !tile || !base) return false;
    const w = r.w * STALK_W;
    const s = w / tile.width;
    const x = r.x + r.w / 2 - w / 2;
    const bottom = r.y + r.h;
    const reveal = bottom - r.h * grown;
    c.save();
    c.beginPath();
    c.rect(x - 10, reveal, w + 20, bottom - reveal + 10);
    c.clip();
    // A slow lean with the wind, from the root up.
    const lean = this.reduced ? 0 : this.wind.at(r.x) * 0.012;
    c.translate(x, bottom);
    c.transform(1, 0, -lean, 1, 0, 0);
    const bh = base.height * s;
    c.drawImage(base, 0, -bh, w, bh);
    const th = tile.height * s;
    const topH = top.height * s;
    let y = -bh;
    const ceiling = -r.h + topH;
    while (y > ceiling) {
      c.drawImage(tile, 0, y - th, w, th + 0.5);
      y -= th;
    }
    c.drawImage(top, 0, y - topH + 1, w, topH);
    c.restore();
    return true;
  }

  /** Flower bubbles hanging under a floor on a thin cord, swaying (decor, §4.7). */
  private drawHanging(c: CanvasRenderingContext2D, r: Rect, fi: number) {
    const size = Math.max(16, r.h * 1.05);
    for (const [k, at] of [0.32, 0.74].entries()) {
      const im = this.img(BUBBLES[(fi * 2 + k) % BUBBLES.length]!);
      if (!im) continue;
      const hx = r.x + r.w * at;
      const hy = r.y + r.h * 0.85;
      const len = size * 0.55;
      const sway = this.reduced ? 0 : Math.sin(this.t * 1.1 + fi * 1.7 + k * 2.3) * 0.12;
      c.save();
      c.translate(hx, hy);
      c.rotate(sway);
      c.strokeStyle = 'rgba(255,255,255,0.75)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, len);
      c.stroke();
      const bw = size * (im.width / im.height);
      c.drawImage(im, -bw / 2, len, bw, size);
      c.restore();
    }
  }

  /** Daytime extras in the sky: a rainbow up high and, now and then, a bird crossing. */
  private drawSkyLife(c: CanvasRenderingContext2D) {
    if (this.part === 'night') return;
    const { w, h } = this;
    const rainbow = this.img(RAINBOW);
    if (rainbow) {
      const rw = Math.min(160, w * 0.28);
      const rh = (rainbow.height / rainbow.width) * rw;
      c.globalAlpha = 0.9;
      c.drawImage(rainbow, w - rw - 14, h * 0.12 - this.scroll.y * 0.05, rw, rh);
      c.globalAlpha = 1;
    }
    const bird = this.img(BIRD);
    if (bird && !this.reduced) {
      const k = (this.t % 26) / 9;
      if (k < 1) {
        const bw = Math.min(46, w * 0.09);
        const bh = (bird.height / bird.width) * bw;
        c.drawImage(bird, -bw + (w + bw * 2) * k, h * 0.22 + Math.sin(this.t * 3) * 6, bw, bh);
      }
    }
  }

  private drawSky(c: CanvasRenderingContext2D) {
    const { w, h } = this;
    const pic = this.img('/farm-anim/sky.jpg');
    // Higher in the tower, the sky picture slides down a little (parallax).
    const lift = this.layout.height > h ? (this.scroll.y / (this.layout.height - h) - 1) * 40 : 0;
    if (pic) {
      const s = Math.max(w / pic.width, (h + 80) / pic.height);
      c.drawImage(
        pic,
        (w - pic.width * s) / 2,
        (h - pic.height * s) / 2 + lift,
        pic.width * s,
        pic.height * s,
      );
    } else {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#7cc4f2');
      g.addColorStop(1, '#d8f0ff');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
    this.sky.draw(c, w, h, this.t);
    for (const cl of this.skyClouds) {
      const im = this.img(cl.src);
      if (!im) continue;
      if (!this.reduced) cl.x = (cl.x + cl.v * this.world.dt) % 1.3;
      const cw = im.width * cl.s;
      const ch = im.height * cl.s;
      const x = cl.x * (w + cw * 2) - cw;
      const y = ((cl.y * h - this.scroll.y * 0.2) % (h + ch)) - ch / 2;
      c.globalAlpha = this.part === 'night' ? 0.35 : 0.85;
      c.save();
      if (cl.flip) {
        c.translate(x + cw, y);
        c.scale(-1, 1);
        c.drawImage(im, 0, 0, cw, ch);
      } else c.drawImage(im, x, y, cw, ch);
      c.restore();
      c.globalAlpha = 1;
    }
    this.drawSkyLife(c);
  }

  private drawFloor(c: CanvasRenderingContext2D, fi: number) {
    const lf = this.lf(fi);
    const df = this.df(fi);
    const pb = platformBox(lf.platform);
    for (const r of lf.shelf ? [lf.shelf, lf.platform] : [lf.platform]) {
      if (this.drawShelf(c, r, fi)) continue;
      const b = platformBox(r);
      c.drawImage(platformImage(r.w, r.h, fi, this.dpr), b.x, b.y, b.w, b.h);
      if (this.draftMarks && fi === 0)
        stampDraft(c, pb.x + pb.w - 60, pb.y + pb.h * 0.6, this.opts.labels.draft);
    }
    this.drawHanging(c, lf.platform, fi);

    drawMachine(c, df.machine.kind, lf.machine, df.machine.phase, this.t);
    if (this.draftMarks) stampDraft(c, lf.machine.x, lf.machine.y, this.opts.labels.draft);
    drawSign(c, lf.sign, fi + 1);
    if (df.machine.phase === 'done') {
      const bob = this.reduced ? 0 : Math.sin(this.t * 2.4 + fi) * 3;
      const r = Math.max(10, lf.machine.w * 0.16);
      drawBubble(
        c,
        lf.machine.x + lf.machine.w * 0.7,
        lf.machine.y + r * 0.6 + bob,
        r,
        null,
        '#fff3c4',
      );
      c.fillStyle = '#c99a2e';
      c.font = `700 ${Math.round(r * 1.1)}px system-ui, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('✓', lf.machine.x + lf.machine.w * 0.7, lf.machine.y + r * 0.6 + bob + 1);
    }

    df.slots.forEach((s, si) => {
      const r = lf.slots[si]!;
      const def = POTS[s.pot];
      const pot = this.potImage(def, r.w);
      if (pot) c.drawImage(pot, r.x, r.y, r.w, r.h);
      else {
        // Not loaded yet: a soft outline so the floor never looks empty.
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.beginPath();
        c.ellipse(r.x + r.w / 2, r.y + r.h * 0.6, r.w * 0.38, r.h * 0.3, 0, 0, Math.PI * 2);
        c.fill();
      }
      if (s.plant) this.drawPlant(c, r, def, s.plant.crop, stageOf(s.plant, this.t), fi * 6 + si);
    });
  }

  private drawPlant(
    c: CanvasRenderingContext2D,
    r: Rect,
    def: PotDef,
    crop: CropId,
    stage: Stage,
    seed: number,
  ) {
    const im = this.img(cropSprite(crop, stage));
    if (!im) return;
    const a = def.anchor;
    const pw = a.rx * 2 * r.w * PLANT_FIT.width;
    const ph = (im.height / im.width) * pw;
    const bx = r.x + a.cx * r.w;
    const by = r.y + (a.cy + a.ry * PLANT_FIT.sink) * r.h;
    const bend = this.reduced ? 0 : this.wind.at(bx) * 0.06 + this.wind.flutter(seed, 1.2) * 0.025;
    c.save();
    c.translate(bx - pw / 2, by - ph);
    c.scale(pw / im.width, ph / im.height);
    drawBent(c, im, 0, 0, [im.width / 2, im.height], bend);
    c.restore();
    if (stage === 'ready') {
      const bob = this.reduced ? 0 : Math.sin(this.t * 2.2 + seed) * 3;
      const br = Math.max(9, r.w * 0.16);
      drawBubble(c, bx, by - ph - br * 1.1 + bob, br, this.img(cropSprite(crop, 'produce')));
    }
  }

  private drawBugs(c: CanvasRenderingContext2D) {
    const size = Math.max(14, this.layout.cell * 0.2);
    for (const b of this.bugs) {
      const a = this.floorAlpha(b.floor);
      if (a <= 0.01 && b.state !== 'caught') continue;
      const p = this.bugPos(b);
      let s = size;
      let alpha = a;
      if (b.state === 'caught') s *= 1 - smooth((this.t - b.t0) / 0.9) * 0.7;
      if (b.state === 'leave') alpha *= 1 - (this.t - b.t0) / 1.6;
      if (this.reduced && b.state === 'perched') alpha *= smooth((this.t - b.t0) / 0.3);
      c.globalAlpha = Math.max(0, alpha);
      const flap = this.reduced
        ? 0
        : Math.floor(this.t * (b.state === 'perched' ? 4 : 18) + b.seed) % 2;
      if (b.kind === 'ladybug') drawLadybug(c, p.x, p.y, s, flap);
      else if (b.kind === 'firefly') drawFirefly(c, p.x, p.y, s * 0.35, this.t + b.seed);
      else {
        const im = this.img(b.kind === 'bee' ? BEE_SPRITE : BUTTERFLY);
        if (im) {
          const sx = flap ? 0.55 : 1;
          c.save();
          c.translate(p.x, p.y);
          c.scale(sx, 1);
          c.drawImage(im, -s / 2, -s / 2, s, s);
          c.restore();
        }
      }
      // The net's sweep when caught.
      if (b.state === 'caught' && b.at && this.t - b.t0 < 0.35 && !this.reduced) {
        const k = (this.t - b.t0) / 0.35;
        c.strokeStyle = 'rgba(255,255,255,0.9)';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(b.at.x, b.at.y, size * 1.3, -Math.PI * 0.9, -Math.PI * 0.9 + Math.PI * 1.4 * k);
        c.stroke();
      }
      c.globalAlpha = 1;
    }
  }

  /** At night: fireflies along the floors and lantern glows at the floor plates. */
  private drawNightGlow(c: CanvasRenderingContext2D, visible: number[]) {
    c.save();
    c.translate(-this.scroll.x, -this.scroll.y);
    c.globalCompositeOperation = 'lighter';
    for (const fi of visible) {
      const lf = this.lf(fi);
      const a = this.floorAlpha(fi);
      if (a < 0.05) continue;
      c.globalAlpha = a;
      const sg = lf.sign;
      const g = c.createRadialGradient(sg.x + sg.w / 2, sg.y, 0, sg.x + sg.w / 2, sg.y, sg.w * 2.4);
      g.addColorStop(0, 'rgba(255,200,120,0.6)');
      g.addColorStop(1, 'rgba(255,200,120,0)');
      c.fillStyle = g;
      c.fillRect(sg.x - sg.w * 2, sg.y - sg.w * 2.4, sg.w * 5, sg.w * 4.8);
      for (let i = 0; i < 5; i++) {
        const seed = fi * 13 + i * 3.7;
        const x =
          lf.platform.x + ((i + 0.5) / 5) * lf.platform.w + Math.sin(this.t * 0.6 + seed) * 18;
        const y = lf.slots[0]!.y + Math.cos(this.t * 0.8 + seed) * 14 - this.layout.cell * 0.2;
        drawFirefly(c, x, y, Math.max(3, this.layout.cell * 0.04), this.t + seed);
      }
    }
    c.restore();
  }

  private drawIntro(c: CanvasRenderingContext2D, intro: Intro, k: number) {
    const { w, h } = this;
    if (intro.kind !== 'full') {
      c.fillStyle = `rgba(255,255,255,${1 - k})`;
      c.fillRect(0, 0, w, h);
      return;
    }
    // Two cloud banks cover the screen, then part to show the tower.
    const s = k * intro.dur;
    const open = smooth((s - 0.8) / 1.4);
    const fog = 1 - smooth((s - 0.5) / 1.6);
    c.fillStyle = `rgba(255,255,255,${fog * 0.85})`;
    c.fillRect(0, 0, w, h);
    const im = this.img('/farm-anim/cloud-1.webp');
    if (!im) return;
    const cw = Math.max(w, h) * 1.1;
    const ch = (im.height / im.width) * cw;
    c.globalAlpha = 1 - smooth((s - 1.6) / 1.2);
    c.drawImage(im, -cw * 0.25 - open * w * 0.9, h * 0.45 - ch / 2, cw, ch);
    c.save();
    c.translate(w + cw * 0.25 + open * w * 0.9, h * 0.55 - ch / 2);
    c.scale(-1, 1);
    c.drawImage(im, 0, 0, cw, ch);
    c.restore();
    c.globalAlpha = 1;
  }
}

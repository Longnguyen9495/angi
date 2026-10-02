import { t } from '../../../i18n';
import { type Assets, canvas } from '../engine/assets';
import type { FieldDef, Vec2 } from '../engine/types';
import { Spring } from '../engine/WindSystem';
import { type World, clamp, easeOut, smooth } from '../engine/world';

/**
 * The game drawn into the painting: the 12 plots on the painted field (empty soil stamped on the
 * unlocked ones, crops growing with the wind, wet soil, thirsty and hover outlines, a lock on the
 * next plot to open), status bubbles over the cows and the coop, and the float while fishing.
 * The page pushes its state with setView(); every plot animation comes from the diff between two
 * views, so a re-render with the same state never plays anything twice:
 *  sow      empty → planted: seeds drop in, a soil puff, the sprout fades and grows in
 *  grow     a new stage: soft grow-in (0.9 → 1) cross-faded from the previous picture
 *  water    a stream of drops arcs into the plot, ripples on the soil, the soil darkens
 *  ready    a calm warm glow under the plant (slow breathing, no blinking), a glint now and then
 *  harvest  the plant shakes, leaves / sparkles / spores by kind, the produce flies to the
 *           pantry (the manager's flight, in screen space); a tree stays, a vegetable leaves
 *  clear    a tree or spent block taken out: it sinks and fades, clods fly
 * Everything runs on the scene's one clock (no timers). With reduced motion nothing moves:
 * pictures swap with a short fade, wet soil and the ready glow show still, no particles.
 */

export type PlotStageView = 'empty' | 'sprout' | 'young' | 'flowering' | 'ready';
export type PlotKindView = 'veg' | 'tree' | 'mushroom';

export interface PlotView {
  id: number;
  unlocked: boolean;
  /** Level that opens it (locked plots). */
  unlockLevel: number | null;
  crop: string | null;
  stage: PlotStageView;
  /** Crop picture for the stage (URL). */
  image: string | null;
  wet: boolean;
  /** Watering mode is on and this plot can be watered. */
  thirsty: boolean;
  /** Growing, dry and wateable now (a water-drop bubble floats over it). */
  needsWater?: boolean;
  /** Shown on hover, e.g. "Ô 3 · Hành · còn 2 giờ". */
  label: string;
  /** Vegetable (one harvest), fruit tree (stays), mushroom block (a few flushes). Default veg. */
  kind?: PlotKindView;
  /** Harvests already taken from this planting (trees, mushrooms). */
  harvests?: number;
  /** Harvests left (veg 1, tree Infinity, mushroom flushes left). Default 1. */
  left?: number;
  /** Start of the current growing cycle (a harvest key: one flight per cycle). */
  cycle?: number | null;
  /** Produce icon (URL) that flies to the pantry at harvest. */
  produce?: string | null;
  /** Items one harvest gives (how many icons fly, capped). */
  yield?: number;
}

export interface BubbleView {
  /** Icon URL (produce ready, or the feed it wants), or null for a lock. */
  icon: string | null;
  kind: 'ready' | 'hungry' | 'busy' | 'locked';
  label: string;
}

export interface FarmView {
  plots: PlotView[];
  cow: BubbleView;
  chicken: BubbleView;
  watering: boolean;
}

/** A harvest the page can show flying to the pantry: picture point, icon, how many. */
export type HarvestFlight = (at: Vec2, icon: string, count: number) => boolean;

/** What a plot's bubble says: ripe (its produce) or thirsty (a drop). */
type Mark = 'ready' | 'water';

interface PlotFx {
  prev: PlotView | null;
  /** Picture drawn now and the one it cross-fades from. */
  img: string | null;
  from: string | null;
  kind: PlotKindView;
  /** Seconds since the picture changed (negative: not shown yet, the seed is still falling). */
  grow: number;
  /** Seconds since sowing / watering / the harvest shake (large = idle). */
  sow: number;
  water: number;
  shake: number;
  /** Seconds since the plot was tapped (the plant bounces, a ring runs over the soil). */
  tap: number;
  /** Status bubble over the plot and seconds since it last changed (it pops in). */
  mark: Mark | null;
  markT: number;
  /** Wet look shown, 0..1 (fades in as the drops land, out as it dries). */
  wet: number;
  /** Drops still owed to the watering stream (fractional). */
  stream: number;
  /** Clock for the ready glint. */
  glint: number;
  sway: Spring;
  treeSway: Spring;
  bend: number;
  /** A plant leaving the plot (vegetable harvested, tree / block cleared). */
  gone: { img: string; t: number; up: boolean } | null;
  /** Last harvest played (crop:cycle:harvests), so a view pushed twice flies once. */
  harvestKey: string;
}

type Event =
  | {
      kind: 'sow' | 'grow' | 'water' | 'clear' | 'tap';
      id: number;
      at: Vec2;
      plant?: PlotKindView;
    }
  | {
      kind: 'harvest';
      id: number;
      at: Vec2;
      plant: PlotKindView;
      icon: string | null;
      count: number;
    };

/** Picture px per image px: one scale for every stage, so a sprout stays sprout-sized. */
const CROP_SCALE = 1.3;
/** Where the soil mound sits in a crop picture, as a share of its height from the bottom. */
const MOUND = 0.14;
const IDLE = 99;
const SOW_DROP = 0.35;
const WATER_STREAM = 0.9;
const WATER_FALL = 0.5;
const SHAKE = 0.45;
const GONE = 0.55;
/** Tap feedback: the plant's squash-and-bounce and the ring over the soil (s). */
const TAP = 0.5;
/** Breathing period of the ready glow (s) and the gap between its glints. */
const GLOW_PERIOD = 3.4;
const GLINT_GAP = 2.8;

/** Burst sizes by graphics quality. */
const FX_SCALE = { low: 0.35, medium: 0.7, high: 1 } as const;
export type Quality = keyof typeof FX_SCALE;

function inQuad(q: Vec2[], x: number, y: number) {
  let pos = 0;
  let neg = 0;
  for (let k = 0; k < 4; k++) {
    const [ax, ay] = q[k]!;
    const [bx, by] = q[(k + 1) % 4]!;
    const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (c > 0) pos++;
    else if (c < 0) neg++;
  }
  return pos === 0 || neg === 0;
}

function quadPath(ctx: CanvasRenderingContext2D, q: Vec2[], inset = 0, centre?: Vec2) {
  ctx.beginPath();
  q.forEach(([x, y], k) => {
    const [cx, cy] = centre ?? [x, y];
    const px = x + (cx - x) * inset;
    const py = y + (cy - y) * inset;
    if (k) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  });
  ctx.closePath();
}

/**
 * A stage picture that is not drawn (yet): young / flowering fall back to the sprout, ready to
 * the produce (the root crops have only those two drawings).
 */
function fallbackOf(url: string): string | null {
  const m = /^(.*)-(young|flowering|ready)\.webp$/.exec(url);
  if (!m) return null;
  return `${m[1]}-${m[2] === 'ready' ? 'produce' : 'sprout'}.webp`;
}

export class FarmGameLayer {
  view: FarmView | null = null;
  /** Plot under the pointer. */
  hover: number | null = null;
  /** Plot whose card is open. */
  selected: number | null = null;
  /** Plot a seed is being dragged over. */
  drop: number | null = null;
  /** Burst size by graphics quality. */
  quality: Quality = 'high';
  /** Shows the produce flying to the pantry; returns false when it cannot (no target, reduced). */
  onHarvest: HarvestFlight | null = null;
  private field: FieldDef;
  private soil: HTMLImageElement;
  private grass: HTMLImageElement | null = null;
  private sign: HTMLImageElement | null = null;
  /** Plot the signpost stands on; while it is locked its board carries the unlock level. */
  private signPlot: number | null = null;
  private fx = new Map<number, PlotFx>();
  private events: Event[] = [];
  private images = new Map<string, HTMLImageElement>();
  private glow: HTMLCanvasElement;
  private float: { x: number; y: number; t: number; bite: number } | null = null;
  /** Where the bubbles float over the cow and the hens (picture px). */
  private bubbles: Record<'cow' | 'chicken', Vec2>;

  constructor(assets: Assets) {
    this.field = assets.layout.field;
    this.bubbles = assets.layout.places.bubbles;
    this.soil = assets.img(this.field.soil.file);
    if (this.field.grass) this.grass = assets.img(this.field.grass.file);
    const sign = this.field.sign;
    if (sign) {
      this.sign = assets.img(sign.file);
      // The plot the post stands on: the one whose centre is nearest the post's foot.
      const foot: Vec2 = [(sign.board[0] + sign.board[2]) / 2, sign.y + sign.h];
      let best = Infinity;
      for (const p of this.field.plots) {
        const dd = Math.hypot(p.centre[0] - foot[0], p.centre[1] - foot[1]);
        if (dd < best) [best, this.signPlot] = [dd, p.id];
      }
    }
    for (const p of this.field.plots)
      this.fx.set(p.id, {
        prev: null,
        img: null,
        from: null,
        kind: 'veg',
        grow: IDLE,
        sow: IDLE,
        water: IDLE,
        shake: IDLE,
        tap: IDLE,
        mark: null,
        markT: IDLE,
        wet: 0,
        stream: 0,
        glint: (p.id * 0.37) % GLINT_GAP,
        sway: new Spring(4 + p.id * 0.17, 0.3),
        treeSway: new Spring(2.1 + p.id * 0.07, 0.45),
        bend: 0,
        gone: null,
        harvestKey: '',
      });
    // Warm glow under a ripe plant, painted once (squashed to lie on the soil when drawn).
    const [g, gc] = canvas(128, 128);
    const grad = gc.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,240,160,1)');
    grad.addColorStop(0.6, 'rgba(255,214,110,0.55)');
    grad.addColorStop(1, 'rgba(255,200,90,0)');
    gc.fillStyle = grad;
    gc.fillRect(0, 0, 128, 128);
    this.glow = g;
  }

  private img(url: string) {
    let im = this.images.get(url);
    if (!im) {
      const el = new Image();
      el.decoding = 'async';
      // A missing stage drawing falls back once to the nearest one that exists.
      el.onerror = () => {
        const fb = fallbackOf(url);
        if (fb && !el.dataset.fallback) {
          el.dataset.fallback = '1';
          el.src = fb;
        }
      };
      el.src = url;
      this.images.set(url, el);
      im = el;
    }
    return im;
  }

  private ready(url: string | null) {
    if (!url) return null;
    const im = this.img(url);
    return im.complete && im.naturalWidth ? im : null;
  }

  setView(view: FarmView | null) {
    if (view)
      for (const v of view.plots) {
        const f = this.fx.get(v.id);
        const def = this.field.plots.find((p) => p.id === v.id);
        if (!f || !def) continue;
        if (v.image) this.img(v.image);
        if (v.produce) this.img(v.produce);
        const prev = f.prev;
        f.prev = v;
        if (v.crop) f.kind = v.kind ?? 'veg';
        if (!prev) {
          // First view: show it as it is, nothing plays.
          f.img = v.unlocked && v.stage !== 'empty' ? v.image : null;
          f.wet = v.wet ? 1 : 0;
          continue;
        }
        const at = def.centre;
        const wasReady = prev.stage === 'ready' && !!prev.crop;
        const harvested =
          wasReady &&
          (v.crop === prev.crop ? (v.harvests ?? 0) > (prev.harvests ?? 0) : (prev.left ?? 1) <= 1);
        if (harvested) {
          const key = `${prev.crop}:${prev.cycle ?? ''}:${prev.harvests ?? 0}`;
          if (key !== f.harvestKey) {
            f.harvestKey = key;
            f.shake = 0;
            this.events.push({
              kind: 'harvest',
              id: v.id,
              at,
              plant: prev.kind ?? 'veg',
              icon: prev.produce ?? prev.image,
              count: Math.max(1, Math.min(3, prev.yield ?? 1)),
            });
          }
        }
        const nextImg = v.unlocked && v.stage !== 'empty' ? v.image : null;
        if (!v.crop && prev.crop) {
          // The plant leaves: picked (it lifts out) or cleared (it sinks), then empty soil.
          if (f.img) f.gone = { img: f.img, t: 0, up: harvested };
          if (!harvested) this.events.push({ kind: 'clear', id: v.id, at, plant: f.kind });
          f.img = null;
          f.from = null;
        } else if (nextImg !== f.img) {
          if (prev.stage === 'empty' || !f.img) {
            // Sown: the picture waits for the seeds to land.
            f.from = null;
            f.grow = -SOW_DROP;
            f.sow = 0;
            this.events.push({ kind: 'sow', id: v.id, at });
          } else {
            f.from = f.img;
            f.grow = 0;
            if (!harvested) this.events.push({ kind: 'grow', id: v.id, at });
          }
          f.img = nextImg;
        }
        if (!prev.wet && v.wet) {
          f.water = 0;
          f.stream = 0;
          this.events.push({ kind: 'water', id: v.id, at });
        }
      }
    for (const b of view ? [view.cow, view.chicken] : []) if (b.icon) this.img(b.icon);
    this.view = view;
  }

  /** Plot id at picture point p (any of them, locked ones too). */
  hit(p: { x: number; y: number }): number | null {
    if (!this.view) return null;
    for (const d of this.field.plots) if (inQuad(d.quad, p.x, p.y)) return d.id;
    return null;
  }

  /** True when picture point [x, y] is on an unlocked plot (painted grass there gives way). */
  onOpenPlot([x, y]: Vec2): boolean {
    if (!this.view) return false;
    for (const d of this.field.plots)
      if (inQuad(d.quad, x, y) && this.view.plots.some((v) => v.id === d.id && v.unlocked))
        return true;
    return false;
  }

  /** Picture point at the top corner of a plot (for anchoring a card). */
  plotTop(id: number): Vec2 | null {
    const d = this.field.plots.find((p) => p.id === id);
    return d ? [d.centre[0], d.quad[0][1]] : null;
  }

  /** A tap on a plot: the plant bounces, a ring runs over the soil, a puff (or a lock wiggle). */
  tap(id: number) {
    const f = this.fx.get(id);
    const d = this.field.plots.find((p) => p.id === id);
    if (!f || !d) return;
    f.tap = 0;
    this.events.push({ kind: 'tap', id, at: d.centre });
  }

  cast(x: number, y: number) {
    this.float = { x, y, t: 0, bite: -1 };
  }
  bite() {
    if (this.float) this.float.bite = 0;
  }

  /** How tall the plant in a plot is drawn (picture px), for placing bursts and flights. */
  private plantHeight(id: number) {
    const f = this.fx.get(id);
    const im = f ? this.ready(f.img ?? f.gone?.img ?? null) : null;
    return im ? im.naturalHeight * CROP_SCALE : 60;
  }

  /** Bursts for the events of the last view change. */
  private burst(w: World, e: Event) {
    const [x, y] = e.at;
    const P = w.particles;
    const r = w.rand;
    const q = FX_SCALE[this.quality];
    // Never more than the room left under the cap (a burst shrinks, it is not cut off).
    const n = (k: number) => Math.min(P.room(), Math.max(1, Math.round(k * q)));
    const h = this.plantHeight(e.id);
    switch (e.kind) {
      case 'sow':
        // Seeds drop from above into the furrow; the soil puff follows when they land.
        for (let i = n(6); i-- > 0;)
          P.spawn(
            'seed',
            x + (r() - 0.5) * 30,
            y - 70 - r() * 16,
            (r() - 0.5) * 14,
            20 + r() * 20,
            SOW_DROP + 0.9,
            1.4,
            y + 4 + (r() - 0.5) * 12,
          );
        break;
      case 'grow':
        for (let i = n(7); i-- > 0;)
          P.spawn(
            'grow',
            x + (r() - 0.5) * 50,
            y - 10 - r() * h * 0.7,
            0,
            -16 - r() * 10,
            0.9 + r() * 0.5,
            1.6 + r() * 1.2,
          );
        break;
      case 'water':
        break; // The stream is spawned frame by frame in update().
      case 'tap': {
        // A little soil kicked up round the plant, and a few glints over a ripe or growing one.
        const v = this.view?.plots.find((p) => p.id === e.id);
        if (!v?.unlocked) break;
        for (let i = n(5); i-- > 0;)
          P.spawn(
            'soil',
            x + (r() - 0.5) * 40,
            y + 2 + (r() - 0.5) * 10,
            (r() - 0.5) * 50,
            -30 - r() * 30,
            0.7,
            0.9 + r() * 0.8,
            y + 6 + (r() - 0.5) * 12,
          );
        if (v.crop)
          for (let i = n(v.stage === 'ready' ? 6 : 3); i-- > 0;)
            P.spawn(
              'sparkle',
              x + (r() - 0.5) * 50,
              y - h * (0.3 + r() * 0.5),
              0,
              -12,
              0.6 + r() * 0.3,
              2 + r(),
            );
        break;
      }
      case 'clear':
        for (let i = n(10); i-- > 0;)
          P.spawn(
            'soil',
            x + (r() - 0.5) * 34,
            y + (r() - 0.5) * 10,
            (r() - 0.5) * 80,
            -50 - r() * 60,
            1.1,
            1.3 + r() * 1.2,
            y + 6 + (r() - 0.5) * 14,
          );
        break;
      case 'harvest': {
        const top = y - h * 0.6;
        if (e.plant === 'mushroom')
          for (let i = n(12); i-- > 0;)
            P.spawn(
              'spore',
              x + (r() - 0.5) * 40,
              y - r() * h * 0.6,
              (r() - 0.5) * 10,
              -6 - r() * 10,
              1.6 + r() * 1,
              1.4 + r() * 1.2,
            );
        else {
          // Leaves shaken off (from the canopy for a tree), golden confetti for a crop.
          for (let i = n(e.plant === 'tree' ? 10 : 6); i-- > 0;)
            P.spawn(
              'leaf',
              x + (r() - 0.5) * (e.plant === 'tree' ? 70 : 40),
              top + (r() - 0.5) * h * 0.3,
              (r() - 0.5) * 40,
              -30 - r() * 30,
              1.4 + r() * 0.6,
              2 + r() * 1.5,
            );
          for (let i = n(e.plant === 'tree' ? 6 : 10); i-- > 0;) {
            const a = -Math.PI / 2 + (r() - 0.5) * 2.2;
            const v = 50 + r() * 60;
            P.spawn(
              'harvest',
              x,
              top,
              Math.cos(a) * v,
              Math.sin(a) * v,
              1.1 + r() * 0.4,
              1.5 + r(),
            );
          }
        }
        for (let i = n(6); i-- > 0;)
          P.spawn('sparkle', x + (r() - 0.5) * 60, top + (r() - 0.5) * h * 0.5, 0, -8, 0.7, 2.2);
        // The produce flies to the pantry; if the page cannot show that, it floats up here.
        const from: Vec2 = [x, top];
        if (e.icon && !this.onHarvest?.(from, e.icon, e.count))
          P.spawn('reward', x, top - 20, 0, -38, 1.4, 15, 1e9, this.img(e.icon));
        break;
      }
    }
  }

  update(w: World) {
    const still = w.reduced;
    const particles = w.settings.particles && !still;
    for (const e of this.events.splice(0)) {
      // Reduced motion: no bursts, but a harvest still reaches the page (it decides what shows).
      if (particles) this.burst(w, e);
      else if (e.kind === 'harvest' && e.icon) this.onHarvest?.(e.at, e.icon, e.count);
    }
    const q = FX_SCALE[this.quality];
    for (const d of this.field.plots) {
      const f = this.fx.get(d.id)!;
      const [cx, cy] = d.centre;
      const sow0 = f.sow;
      f.grow += w.dt;
      f.sow += w.dt;
      f.shake += w.dt;
      f.tap += w.dt;
      f.glint += w.dt;
      f.water += w.dt;
      f.markT += w.dt;
      const v = this.view?.plots.find((p) => p.id === d.id);
      const mark: Mark | null =
        !v?.unlocked || !v.crop
          ? null
          : v.stage === 'ready'
            ? 'ready'
            : v.needsWater
              ? 'water'
              : null;
      if (mark !== f.mark) {
        f.mark = mark;
        f.markT = 0;
      }
      // The soil puff when the seeds land.
      if (particles && sow0 < SOW_DROP && f.sow >= SOW_DROP)
        for (let i = Math.min(w.particles.room(), Math.round(8 * q)); i-- > 0;)
          w.particles.spawn(
            'soil',
            cx + (w.rand() - 0.5) * 30,
            cy + 4 + (w.rand() - 0.5) * 8,
            (w.rand() - 0.5) * 60,
            -40 - w.rand() * 40,
            0.9,
            1.1 + w.rand() * 1.1,
            cy + 6 + (w.rand() - 0.5) * 12,
          );
      // Watering: a stream of drops arcing from the can (up left) into the plot.
      if (particles && f.water < WATER_STREAM) {
        f.stream += w.dt * 34 * q;
        const sx = cx - 64;
        const sy = cy - 104;
        while (f.stream >= 1) {
          f.stream--;
          if (!w.particles.room()) break;
          const tx = cx + (w.rand() - 0.5) * 60;
          const ty = cy + (w.rand() - 0.5) * 18;
          const T = WATER_FALL * (0.9 + w.rand() * 0.2);
          const g = 260;
          w.particles.spawn(
            'drop',
            sx + (w.rand() - 0.5) * 6,
            sy + (w.rand() - 0.5) * 4,
            (tx - sx) / T,
            (ty - sy - 0.5 * g * T * T) / T,
            T + 0.2,
            1.3 + w.rand() * 0.8,
            ty,
          );
        }
      }
      // Wet soil fades in as the drops land and out as the plot dries (snaps when still).
      const wetGoal = v?.wet ? 1 : 0;
      if (still) f.wet = wetGoal;
      else if (wetGoal < f.wet || f.water >= WATER_FALL)
        f.wet = clamp(f.wet + Math.sign(wetGoal - f.wet) * w.dt * 1.2, 0, 1);
      // Sway: crops flutter with the wind, trees lean slowly about the trunk, blocks stay put.
      const wind = w.wind.at(cx);
      if (still || f.kind === 'mushroom') f.bend = 0;
      else if (f.kind === 'tree')
        f.bend = f.treeSway.step(
          wind * 0.022 + w.wind.flutter(d.id * 0.37, 0.8) * 0.006 * (0.3 + wind),
          w.dt,
        );
      else
        f.bend = f.sway.step(
          wind * 0.05 + w.wind.flutter(d.id * 0.37, 2) * 0.02 * (0.3 + wind),
          w.dt,
        );
      if (f.gone) {
        f.gone.t += w.dt;
        if (f.gone.t > GONE) f.gone = null;
      }
      // A ripe plant glints now and then (calm: one glint every few seconds).
      if (v?.stage === 'ready' && f.glint >= GLINT_GAP) {
        f.glint = 0;
        if (particles && w.particles.room()) {
          const h = this.plantHeight(d.id);
          w.particles.spawn(
            'sparkle',
            cx + (w.rand() - 0.5) * 50,
            cy - h * (0.35 + w.rand() * 0.4),
            0,
            -5,
            1.1,
            2.4,
          );
        }
      }
    }
    if (this.float) {
      this.float.t += w.dt;
      if (this.float.bite >= 0) {
        this.float.bite += w.dt;
        if (this.float.bite > 0.8) this.float = null;
      }
    }
  }

  /** Soil, wet patches, ripples, sowing puffs and outlines, right over the painted field. */
  drawTiles(ctx: CanvasRenderingContext2D, w: World) {
    const view = this.view;
    if (!view) return;
    const soil = this.field.soil;
    let nextLock: PlotView | null = null;
    const locked: { d: FieldDef['plots'][number]; v: PlotView }[] = [];
    for (const d of this.field.plots) {
      const v = view.plots.find((p) => p.id === d.id);
      if (!v) continue;
      if (!v.unlocked) {
        if (!nextLock || (v.unlockLevel ?? 99) < (nextLock.unlockLevel ?? 99)) nextLock = v;
        locked.push({ d, v });
        // A tile tilled in the painting stays grass until it opens.
        const g = this.field.grass;
        if (this.grass && g && d.id <= (this.field.painted ?? 0)) {
          const [gx, gy] = d.quad[0];
          ctx.drawImage(this.grass, g.x + gx - g.anchor[0], g.y + gy - g.anchor[1]);
        }
        continue;
      }
      const f = this.fx.get(d.id)!;
      const [qx, qy] = d.quad[0];
      ctx.drawImage(this.soil, soil.x + qx - soil.anchor[0], soil.y + qy - soil.anchor[1]);
      if (f.wet > 0.01) {
        quadPath(ctx, d.quad, 0.04, d.centre);
        ctx.fillStyle = `rgba(56,28,10,${0.42 * f.wet})`;
        ctx.fill();
        ctx.fillStyle = `rgba(200,230,255,${0.07 * f.wet})`;
        ctx.fill();
      }
      if (!w.reduced) this.drawGround(ctx, d.centre, f);
    }
    for (const d of this.field.plots) {
      const v = view.plots.find((p) => p.id === d.id);
      if (!v) continue;
      const hover = this.hover === d.id || this.selected === d.id;
      if (v.unlocked && v.stage === 'ready') {
        // Ripe: a warm rim round the plot, breathing slowly (still with reduced motion).
        const a = w.reduced ? 0.6 : 0.5 + 0.2 * Math.sin((w.t / GLOW_PERIOD) * Math.PI * 2 + d.id);
        quadPath(ctx, d.quad, 0.07, d.centre);
        ctx.strokeStyle = `rgba(255,222,120,${a})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      if (this.drop === d.id) {
        quadPath(ctx, d.quad, 0.02, d.centre);
        ctx.fillStyle = 'rgba(255,224,120,0.28)';
        ctx.fill();
        ctx.strokeStyle = '#ffd36b';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      if (v.unlocked && v.thirsty) {
        quadPath(ctx, d.quad, 0.06, d.centre);
        ctx.strokeStyle = `rgba(120,210,255,${0.55 + 0.35 * Math.sin(w.t * 5 + d.id)})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (hover) {
        // The chosen plot breathes a little so it reads as the one the card is about.
        const pulse = this.selected === d.id && !w.reduced ? Math.sin(w.t * 4) : 0;
        quadPath(ctx, d.quad, 0.03, d.centre);
        ctx.fillStyle = `rgba(255,248,210,${0.16 + 0.06 * pulse})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,244,190,0.95)';
        ctx.lineWidth = 2.5 + 0.8 * pulse;
        ctx.stroke();
      }
      const f = this.fx.get(d.id)!;
      if (f.tap < TAP) {
        // Tap: a flash on the plot and a ring running out past its edge.
        const u = f.tap / TAP;
        quadPath(ctx, d.quad, 0.03, d.centre);
        ctx.fillStyle = `rgba(255,250,220,${0.28 * (1 - u)})`;
        ctx.fill();
        if (!w.reduced) {
          quadPath(ctx, d.quad, 0.12 - 0.22 * easeOut(u), d.centre);
          ctx.strokeStyle = `rgba(255,244,190,${0.9 * (1 - u)})`;
          ctx.lineWidth = 3 * (1 - u) + 1;
          ctx.stroke();
        }
      }
    }
    // Every locked plot shows it is part of the field: a faint dashed rim and its own level (on
    // the board for the signpost plot), the next one to open stronger than the rest.
    for (const { d, v } of locked) {
      const next = v === nextLock;
      quadPath(ctx, d.quad, 0.08, d.centre);
      ctx.strokeStyle = `rgba(255,248,210,${next ? 0.55 : 0.3})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      // A tapped lock wiggles: "not yet".
      const tap = this.fx.get(d.id)!.tap;
      const wiggle = !w.reduced && tap < TAP ? Math.sin(tap * 38) * 5 * (1 - tap / TAP) : 0;
      if (d.id !== this.signPlot)
        this.drawLock(
          ctx,
          d.centre[0] + wiggle,
          d.centre[1] - 6,
          t.farm.anim.lockLevel(v.unlockLevel ?? '?'),
          next ? 0.92 : 0.6,
        );
    }
    const signView = view.plots.find((p) => p.id === this.signPlot);
    if (this.sign && signView) this.drawSign(ctx, signView);
  }

  /** On the soil: the dust puff where seeds landed, the ripples where the watering drops land. */
  private drawGround(ctx: CanvasRenderingContext2D, [cx, cy]: Vec2, f: PlotFx) {
    const puff = f.sow - SOW_DROP;
    if (puff >= 0 && puff < 0.7) {
      const u = puff / 0.7;
      ctx.fillStyle = `rgba(150,108,66,${0.35 * (1 - u)})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4, 14 + 34 * easeOut(u), 5 + 11 * easeOut(u), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 4; k++) {
      const r0 = f.water - WATER_FALL - k * 0.17;
      if (r0 < 0 || r0 > 0.7) continue;
      const u = r0 / 0.7;
      const ox = ((k * 37) % 50) - 25;
      const oy = ((k * 23) % 14) - 7;
      ctx.strokeStyle = `rgba(225,245,255,${0.6 * (1 - u)})`;
      ctx.beginPath();
      ctx.ellipse(cx + ox, cy + oy, 4 + 18 * easeOut(u), 1.5 + 6 * easeOut(u), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** The signpost over the soil stamp, its locked plot's level written on the board. */
  private drawSign(ctx: CanvasRenderingContext2D, v: PlotView) {
    const s = this.field.sign!;
    ctx.drawImage(this.sign!, s.x, s.y);
    if (v.unlocked) return;
    const [x0, y0, x1, y1] = s.board;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4a2a10';
    ctx.font = '800 14px "Be Vietnam Pro", system-ui, sans-serif';
    ctx.fillText(t.farm.anim.lockLevel(v.unlockLevel ?? '?'), cx, cy + 1, x1 - x0 - 6);
    ctx.restore();
  }

  private drawLock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    alpha = 0.92,
  ) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(40,30,20,0.55)';
    ctx.beginPath();
    ctx.roundRect(x - 34, y - 14, 68, 28, 14);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x - 18, y - 3, 4.5, Math.PI, 0);
    ctx.stroke();
    ctx.fillRect(x - 24, y - 3, 12, 9);
    ctx.font = '700 12px "Be Vietnam Pro", system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x - 6, y + 1);
    ctx.restore();
  }

  /**
   * Crops back to front (nearer plots over farther ones, trees reaching up): the ready glow,
   * the plant swaying about its base, growing in cross-faded from the last stage, shaking at a
   * harvest, and a plant leaving the plot.
   */
  drawCrops(ctx: CanvasRenderingContext2D, w: World) {
    const view = this.view;
    if (!view) return;
    const still = w.reduced;
    const order = [...this.field.plots].sort((a, b) => a.centre[1] - b.centre[1]);
    for (const d of order) {
      const v = view.plots.find((p) => p.id === d.id);
      const f = this.fx.get(d.id)!;
      const [cx, cy] = d.centre;
      const im = v?.unlocked ? this.ready(f.img) : null;
      if (im && v?.stage === 'ready') {
        // Calm, clearly visible, never blinking: the glow breathes over a few seconds.
        const k = still ? 0.8 : 0.7 + 0.18 * Math.sin((w.t / GLOW_PERIOD) * Math.PI * 2 + d.id);
        const gw = Math.max(150, im.naturalWidth * CROP_SCALE * 2);
        ctx.globalAlpha = k;
        ctx.drawImage(this.glow, cx - gw / 2, cy + 6 - gw * 0.22, gw, gw * 0.44);
        ctx.globalAlpha = 1;
      }
      if (im) {
        // Fade in (and grow 0.9 → 1) over the last picture; reduced motion: a short fade only.
        const fade = still ? clamp(f.grow / 0.25, 0, 1) : smooth(f.grow / 0.6);
        const scale = still ? 1 : 0.9 + 0.1 * easeOut(f.grow / 0.7);
        const old = f.from && fade < 1 ? this.ready(f.from) : null;
        const shake =
          !still && f.shake < SHAKE
            ? Math.sin(f.shake * 42) * 3.2 * (1 - f.shake / SHAKE) * (f.kind === 'tree' ? 1.3 : 1)
            : 0;
        // Soft contact shadow.
        const sw = im.naturalWidth * CROP_SCALE;
        ctx.fillStyle = 'rgba(50,28,10,0.18)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 10, sw * 0.32, sw * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tap: squash into the soil, spring up, settle (a tree only nods).
        const tu = f.tap / TAP;
        const squash =
          !still && tu < 1
            ? 1 - Math.sin(tu * Math.PI * 2.5) * (1 - tu) * (f.kind === 'tree' ? 0.05 : 0.14)
            : 1;
        if (old) this.drawPlant(ctx, old, cx + shake, cy, 1, f.bend, 1 - fade, squash);
        if (fade > 0) this.drawPlant(ctx, im, cx + shake, cy, scale, f.bend, fade, squash);
      }
      if (!still && f.water < WATER_STREAM + 0.3) this.drawCan(ctx, cx - 64, cy - 104, f.water);
      if (f.gone) {
        const g = this.ready(f.gone.img);
        if (g) {
          const u = f.gone.t / GONE;
          if (still) this.drawPlant(ctx, g, cx, cy, 1, 0, 1 - u);
          else {
            // Picked: lifts out of the soil; cleared: sinks into it.
            const dy = f.gone.up ? -22 * easeOut(u) : 10 * u;
            const s = f.gone.up ? 1 + 0.06 * u : 1 - 0.25 * u;
            this.drawPlant(ctx, g, cx, cy + dy, s, 0, clamp(1 - u, 0, 1));
          }
        }
      }
    }
  }

  /** The watering can over a plot being watered: tips in, pours (the stream), tips back, fades. */
  private drawCan(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
    const a = clamp(t / 0.15, 0, 1) * clamp((WATER_STREAM + 0.3 - t) / 0.3, 0, 1);
    if (a <= 0) return;
    const tilt = 0.15 + 0.4 * smooth(t / 0.2) - 0.3 * smooth((t - WATER_STREAM) / 0.3);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2f5f7a';
    ctx.lineWidth = 1.4;
    // Spout to the rose at (0, 0).
    ctx.fillStyle = '#5ea9cc';
    ctx.beginPath();
    ctx.moveTo(-17, 6);
    ctx.lineTo(-1, -2);
    ctx.lineTo(1, 2);
    ctx.lineTo(-15, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.2, 3.4, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Handle, then the body (light face, darker side).
    ctx.beginPath();
    ctx.moveTo(-38, 2);
    ctx.quadraticCurveTo(-28, -14, -18, 2);
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(-42, 0, 28, 22, 4);
    ctx.fillStyle = '#7cc6e6';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(30,80,110,0.25)';
    ctx.fillRect(-23, 1, 8, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(-38, 3, 4, 15);
    ctx.restore();
  }

  /** A crop picture at its native size (× CROP_SCALE), soil mound on the plot centre. */
  private drawPlant(
    ctx: CanvasRenderingContext2D,
    im: HTMLImageElement,
    cx: number,
    cy: number,
    scale: number,
    bend: number,
    alpha: number,
    squash = 1,
  ) {
    const pw = im.naturalWidth * CROP_SCALE * scale;
    const ph = im.naturalHeight * CROP_SCALE * scale;
    const baseY = cy + 8 + ph * MOUND;
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(cx, baseY);
    if (bend) ctx.transform(1, 0, -bend, 1, 0, 0);
    // Squash and stretch about the soil line, keeping the volume.
    if (squash !== 1) ctx.scale(1 + (1 - squash) * 0.6, squash);
    ctx.drawImage(im, -pw / 2, -ph, pw, ph);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /** Bubbles over the animals, the fishing float and the hover label (above everything). */
  drawOverlay(ctx: CanvasRenderingContext2D, w: World) {
    const view = this.view;
    if (!view) return;
    for (const key of ['cow', 'chicken'] as const) {
      const b = view[key];
      if (b.kind === 'busy') continue;
      const [bx, by0] = this.bubbles[key];
      const by = by0 + Math.sin(w.t * 2.2 + (key === 'cow' ? 0 : 1.5)) * 3;
      const r = b.kind === 'ready' ? 17 : 14;
      ctx.save();
      if (b.kind === 'ready' && !w.reduced) {
        // Same pulse as a ripe plot's bubble: something to collect here.
        const p = (w.t * 0.7 + (key === 'cow' ? 0 : 0.5)) % 1;
        ctx.strokeStyle = `rgba(255,214,107,${0.75 * (1 - p)})`;
        ctx.lineWidth = 3 * (1 - p) + 0.5;
        ctx.beginPath();
        ctx.arc(bx, by, r + 2 + p * 14, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = b.kind === 'locked' ? 0.75 : 1;
      ctx.fillStyle = b.kind === 'ready' ? '#fff8e1' : 'rgba(255,255,255,0.92)';
      ctx.strokeStyle = b.kind === 'ready' ? '#e8a52a' : 'rgba(80,60,40,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.moveTo(bx - 5, by + r - 1);
      ctx.lineTo(bx, by + r + 7);
      ctx.lineTo(bx + 5, by + r - 1);
      ctx.fill();
      ctx.stroke();
      const im = b.icon ? this.img(b.icon) : null;
      if (im?.complete && im.naturalWidth) {
        if (b.kind === 'hungry') ctx.globalAlpha = 0.85;
        ctx.drawImage(im, bx - r * 0.8, by - r * 0.8, r * 1.6, r * 1.6);
      } else if (b.kind === 'locked') {
        ctx.strokeStyle = '#7a5a3a';
        ctx.fillStyle = '#7a5a3a';
        ctx.beginPath();
        ctx.arc(bx, by - 3, 4.5, Math.PI, 0);
        ctx.stroke();
        ctx.fillRect(bx - 6, by - 3, 12, 9);
      }
      ctx.restore();
    }
    if (this.float) {
      const f = this.float;
      const sink = f.bite >= 0 ? Math.min(1, f.bite * 4) * 5 : 0;
      const y = f.y + Math.sin(f.t * 3) * 1.2 + sink;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y + 3, 9 + Math.sin(f.t * 2) * 2, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(f.x, y, 4, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#e53b2c';
      ctx.beginPath();
      ctx.arc(f.x, y, 4, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#4a2a14';
      ctx.stroke();
    }
    this.drawMarks(ctx, w);
    // The open card already says it all; the hover label is for the other plots.
    const hp =
      this.hover !== null && this.hover !== this.selected
        ? view.plots.find((p) => p.id === this.hover)
        : null;
    const d = hp ? this.field.plots.find((p) => p.id === hp.id) : null;
    if (hp && d) {
      ctx.font = '700 15px "Be Vietnam Pro", system-ui, sans-serif';
      const tw = ctx.measureText(hp.label).width;
      const x = d.centre[0];
      const y = d.quad[0][1] - 4;
      ctx.fillStyle = 'rgba(30,22,14,0.82)';
      ctx.beginPath();
      ctx.roundRect(x - tw / 2 - 10, y - 30, tw + 20, 26, 13);
      ctx.fill();
      ctx.fillStyle = '#fff4d6';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hp.label, x, y - 17);
      ctx.textAlign = 'start';
    }
  }

  /**
   * A bubble over each plot that wants something: its produce on a gold rim when ripe (a ring
   * pulses out of it), a water drop on a blue rim when it can be watered. Bubbles pop in when
   * they appear and bob gently; the hovered and the open plot skip theirs (label / card).
   */
  private drawMarks(ctx: CanvasRenderingContext2D, w: World) {
    const still = w.reduced;
    for (const d of this.field.plots) {
      const f = this.fx.get(d.id)!;
      if (!f.mark || d.id === this.selected || d.id === this.hover) continue;
      const v = this.view?.plots.find((p) => p.id === d.id);
      if (!v) continue;
      const ready = f.mark === 'ready';
      const r = ready ? 21 : 18;
      const [cx, cy] = d.centre;
      // Just over the plant's top (never far up a tall tree), and never below the plot's top.
      const top = Math.max(cy + 8 - this.plantHeight(d.id) * 0.86, cy - 150);
      const bob = still ? 0 : Math.sin(w.t * 2.4 + d.id * 0.9) * 3;
      const x = cx;
      const y = Math.min(top, d.quad[0][1]) - r - 8 + bob;
      // Pop in: overshoot a little, settle.
      const k = still ? 1 : clamp(f.markT / 0.35, 0, 1);
      const pop = k >= 1 ? 1 : 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;
      if (pop <= 0.01) continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pop, pop);
      if (ready && !still) {
        const p = (w.t * 0.7 + d.id * 0.31) % 1;
        ctx.strokeStyle = `rgba(255,214,107,${0.75 * (1 - p)})`;
        ctx.lineWidth = 3 * (1 - p) + 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, r + 2 + p * 14, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowColor = 'rgba(30,20,10,0.35)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = ready ? '#fff8e1' : '#eef8ff';
      ctx.strokeStyle = ready ? '#e8a52a' : '#3f9fd0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.moveTo(-5, r - 1);
      ctx.lineTo(0, r + 8);
      ctx.lineTo(5, r - 1);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();
      if (ready) {
        const im = this.ready(v.produce ?? v.image);
        if (im) {
          const s = (r * 1.5) / Math.max(im.naturalWidth, im.naturalHeight);
          const iw = im.naturalWidth * s;
          const ih = im.naturalHeight * s;
          ctx.drawImage(im, -iw / 2, -ih / 2, iw, ih);
        }
      } else {
        // A drop that tips now and then, as if asking.
        const tilt = still ? 0 : Math.sin(w.t * 3 + d.id) * 0.12;
        ctx.rotate(tilt);
        ctx.fillStyle = '#4fb3e8';
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.bezierCurveTo(5, -4, 8, 0, 8, 4);
        ctx.arc(0, 4, 8, 0, Math.PI);
        ctx.bezierCurveTo(-8, 0, -5, -4, 0, -11);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.ellipse(-3, 3, 2, 3.5, -0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  count() {
    return this.view ? this.view.plots.filter((p) => p.unlocked).length + 2 : 0;
  }
}

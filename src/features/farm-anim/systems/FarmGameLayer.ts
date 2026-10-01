import { t } from '../../../i18n';
import type { Assets } from '../engine/assets';
import type { FieldDef, Vec2 } from '../engine/types';
import { Spring } from '../engine/WindSystem';
import { type World, clamp, easeOut } from '../engine/world';

/**
 * The game drawn into the painting: the 9 plots on the painted field (empty soil stamped on the
 * unlocked ones, crops growing with the wind, wet soil, thirsty and hover outlines, a lock on the
 * next plot to open), status bubbles over the cows and the coop, and the float while fishing.
 * The page pushes its state with setView(); plant / water / harvest effects come from the diff.
 */

export type PlotStageView = 'empty' | 'sprout' | 'young' | 'flowering' | 'ready';

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
  /** Shown on hover, e.g. "Ô 3 · Hành · còn 2 giờ". */
  label: string;
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

interface PlotFx {
  prev: PlotView | null;
  /** Seconds since the crop last changed stage (pop-in). */
  pop: number;
  sway: Spring;
  bend: number;
  /** A harvested crop flying up out of the plot. */
  picked: { img: HTMLImageElement; t: number } | null;
}

type Event = { kind: 'plant' | 'water' | 'harvest' | 'grow'; at: Vec2; img?: HTMLImageElement };

const CROP_PX = 96;
const STAGE_SCALE: Record<PlotStageView, number> = {
  empty: 0,
  sprout: 0.5,
  young: 0.72,
  flowering: 0.88,
  ready: 1,
};

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

export class FarmGameLayer {
  view: FarmView | null = null;
  /** Plot under the pointer. */
  hover: number | null = null;
  /** Plot whose card is open. */
  selected: number | null = null;
  /** Plot a seed is being dragged over. */
  drop: number | null = null;
  private field: FieldDef;
  private soil: HTMLImageElement;
  private fx = new Map<number, PlotFx>();
  private events: Event[] = [];
  private images = new Map<string, HTMLImageElement>();
  private float: { x: number; y: number; t: number; bite: number } | null = null;
  /** Where the bubbles float over the cow and the hens (picture px). */
  private bubbles: Record<'cow' | 'chicken', Vec2>;

  constructor(assets: Assets) {
    this.field = assets.layout.field;
    this.bubbles = assets.layout.places.bubbles;
    this.soil = assets.img(this.field.soil.file);
    for (const p of this.field.plots)
      this.fx.set(p.id, {
        prev: null,
        pop: 9,
        sway: new Spring(4 + p.id * 0.17, 0.3),
        bend: 0,
        picked: null,
      });
  }

  private img(url: string) {
    let im = this.images.get(url);
    if (!im) {
      im = new Image();
      im.decoding = 'async';
      im.src = url;
      this.images.set(url, im);
    }
    return im;
  }

  setView(view: FarmView | null) {
    if (view)
      for (const v of view.plots) {
        const f = this.fx.get(v.id);
        const def = this.field.plots.find((p) => p.id === v.id);
        if (!f || !def) continue;
        const prev = f.prev;
        if (prev) {
          if (prev.stage !== v.stage && v.stage !== 'empty') {
            f.pop = 0;
            if (prev.stage !== 'empty') this.events.push({ kind: 'grow', at: def.centre });
          }
          if (prev.stage === 'empty' && v.stage !== 'empty')
            this.events.push({ kind: 'plant', at: def.centre });
          if (!prev.wet && v.wet) this.events.push({ kind: 'water', at: def.centre });
          if (prev.crop && !v.crop && prev.image) {
            f.picked = { img: this.img(prev.image), t: 0 };
            this.events.push({ kind: 'harvest', at: def.centre, img: f.picked.img });
          }
        }
        f.prev = v;
        if (v.image) this.img(v.image);
      }
    for (const b of view ? [view.cow, view.chicken] : []) if (b.icon) this.img(b.icon);
    this.view = view;
  }

  /** Plot id at picture point p (any of the 9, locked ones too). */
  hit(p: { x: number; y: number }): number | null {
    if (!this.view) return null;
    for (const d of this.field.plots) if (inQuad(d.quad, p.x, p.y)) return d.id;
    return null;
  }

  /** Picture point at the top corner of a plot (for anchoring a card). */
  plotTop(id: number): Vec2 | null {
    const d = this.field.plots.find((p) => p.id === id);
    return d ? [d.centre[0], d.quad[0][1]] : null;
  }

  cast(x: number, y: number) {
    this.float = { x, y, t: 0, bite: -1 };
  }
  bite() {
    if (this.float) this.float.bite = 0;
  }

  update(w: World) {
    for (const e of this.events.splice(0)) {
      const [x, y] = e.at;
      if (!w.settings.particles) continue;
      if (e.kind === 'plant') {
        // The hoe throws up clods, then seeds drop in an arc.
        for (let i = 0; i < 10; i++)
          w.particles.spawn(
            'soil',
            x + (w.rand() - 0.5) * 30,
            y + (w.rand() - 0.5) * 10,
            (w.rand() - 0.5) * 70,
            -60 - w.rand() * 60,
            1.1,
            1.2 + w.rand() * 1.2,
            y + 4 + (w.rand() - 0.5) * 14,
          );
        for (let i = 0; i < 6; i++)
          w.particles.spawn(
            'seed',
            x - 20 + w.rand() * 10,
            y - 46 - w.rand() * 8,
            30 + w.rand() * 25,
            -20 - w.rand() * 30,
            1.4,
            1.4,
            y + (w.rand() - 0.5) * 12,
          );
      }
      if (e.kind === 'grow')
        for (let i = 0; i < 8; i++)
          w.particles.spawn(
            'grow',
            x + (w.rand() - 0.5) * 50,
            y - 10 - w.rand() * 40,
            0,
            -18 - w.rand() * 12,
            0.9 + w.rand() * 0.5,
            1.8 + w.rand() * 1.4,
          );
      if (e.kind === 'harvest') {
        for (let i = 0; i < 16; i++) {
          const a = -Math.PI / 2 + (w.rand() - 0.5) * 2.2;
          const v = 60 + w.rand() * 70;
          w.particles.spawn(
            'harvest',
            x,
            y - 20,
            Math.cos(a) * v,
            Math.sin(a) * v,
            1.2 + w.rand() * 0.5,
            1.6 + w.rand(),
          );
        }
        if (e.img) w.particles.spawn('reward', x, y - 70, 0, -38, 1.6, 15, 1e9, e.img);
      }
      if (e.kind === 'plant' || e.kind === 'harvest')
        for (let i = 0; i < (e.kind === 'harvest' ? 10 : 5); i++)
          w.particles.spawn(
            'sparkle',
            x + (w.rand() - 0.5) * 60,
            y - w.rand() * 50,
            0,
            -8,
            0.6 + w.rand() * 0.5,
            2 + w.rand() * 1.5,
          );
      if (e.kind === 'water')
        for (let i = 0; i < 18; i++)
          w.particles.spawn(
            'drop',
            x + (w.rand() - 0.5) * 60,
            y - 60 - w.rand() * 30,
            (w.rand() - 0.5) * 10,
            40 + w.rand() * 40,
            1.2,
            1 + w.rand() * 0.8,
            y + 10 + (w.rand() - 0.5) * 20,
          );
    }
    for (const d of this.field.plots) {
      const f = this.fx.get(d.id)!;
      f.pop += w.dt;
      const wind = w.wind.at(d.centre[0]);
      f.bend = f.sway.step(
        wind * 0.05 + w.wind.flutter(d.id * 0.37, 2) * 0.02 * (0.3 + wind),
        w.dt,
      );
      if (f.picked) {
        f.picked.t += w.dt;
        if (f.picked.t > 0.9) f.picked = null;
      }
      const v = this.view?.plots.find((p) => p.id === d.id);
      // Ready crops glint now and then.
      if (v?.stage === 'ready' && w.settings.particles && w.rand() < w.dt * 0.8)
        w.particles.spawn(
          'sparkle',
          d.centre[0] + (w.rand() - 0.5) * 50,
          d.centre[1] - 20 - w.rand() * 50,
          0,
          -6,
          0.8,
          2,
        );
    }
    if (this.float) {
      this.float.t += w.dt;
      if (this.float.bite >= 0) {
        this.float.bite += w.dt;
        if (this.float.bite > 0.8) this.float = null;
      }
    }
  }

  /** Soil, wet patches and outlines, right over the painted field. */
  drawTiles(ctx: CanvasRenderingContext2D, w: World) {
    const view = this.view;
    if (!view) return;
    const soil = this.field.soil;
    let nextLock: PlotView | null = null;
    for (const d of this.field.plots) {
      const v = view.plots.find((p) => p.id === d.id);
      if (!v) continue;
      if (!v.unlocked) {
        if (!nextLock || (v.unlockLevel ?? 99) < (nextLock.unlockLevel ?? 99)) nextLock = v;
        continue;
      }
      const [qx, qy] = d.quad[0];
      ctx.drawImage(this.soil, soil.x + qx - soil.anchor[0], soil.y + qy - soil.anchor[1]);
      if (v.wet) {
        quadPath(ctx, d.quad, 0.04, d.centre);
        ctx.fillStyle = 'rgba(70,38,16,0.3)';
        ctx.fill();
        ctx.fillStyle = 'rgba(200,230,255,0.08)';
        ctx.fill();
      }
    }
    for (const d of this.field.plots) {
      const v = view.plots.find((p) => p.id === d.id);
      if (!v) continue;
      const hover = this.hover === d.id || this.selected === d.id;
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
        quadPath(ctx, d.quad, 0.03, d.centre);
        ctx.fillStyle = 'rgba(255,248,210,0.16)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,244,190,0.95)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
    if (nextLock) {
      const d = this.field.plots.find((p) => p.id === nextLock.id);
      if (d)
        this.drawLock(
          ctx,
          d.centre[0],
          d.centre[1] - 6,
          t.farm.anim.lockLevel(nextLock.unlockLevel ?? '?'),
        );
    }
  }

  private drawLock(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
    ctx.save();
    ctx.globalAlpha = 0.92;
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

  /** Crops back to front, swaying, popping in on a new stage, flying out at harvest. */
  drawCrops(ctx: CanvasRenderingContext2D, w: World) {
    const view = this.view;
    if (!view) return;
    const order = [...this.field.plots].sort((a, b) => a.centre[1] - b.centre[1]);
    for (const d of order) {
      const v = view.plots.find((p) => p.id === d.id);
      const f = this.fx.get(d.id)!;
      const [cx, cy] = d.centre;
      const baseY = cy + 16;
      if (v?.unlocked && v.image && v.stage !== 'empty') {
        const im = this.img(v.image);
        if (im.complete && im.naturalWidth) {
          const pop =
            f.pop < 0.6
              ? 0.55 + 0.45 * easeOut(f.pop / 0.6) + Math.sin(f.pop * 14) * 0.06 * (1 - f.pop / 0.6)
              : 1;
          const bob = v.stage === 'ready' ? Math.sin(w.t * 3 + d.id) * 1.5 : 0;
          const size = CROP_PX * STAGE_SCALE[v.stage] * pop;
          // Soft contact shadow.
          ctx.fillStyle = 'rgba(50,28,10,0.25)';
          ctx.beginPath();
          ctx.ellipse(cx, baseY - 2, size * 0.32, size * 0.09, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.save();
          ctx.translate(cx, baseY + bob);
          ctx.transform(1, 0, -f.bend, 1, 0, 0);
          ctx.drawImage(im, -size / 2, -size * 0.92, size, size);
          ctx.restore();
        }
      }
      if (f.picked) {
        const u = f.picked.t / 0.9;
        const size = CROP_PX * (1 + u * 0.2);
        ctx.globalAlpha = clamp(1 - u, 0, 1);
        ctx.drawImage(
          f.picked.img,
          cx - size / 2,
          baseY - size * 0.92 - easeOut(u) * 70,
          size,
          size,
        );
        ctx.globalAlpha = 1;
      }
    }
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

  count() {
    return this.view ? this.view.plots.filter((p) => p.unlocked).length + 2 : 0;
  }
}

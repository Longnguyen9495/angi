import type { AnimalId } from '../../data/types';
import { sprite } from './images';
import {
  approach,
  between,
  clamp,
  keepInBounds,
  rng,
  separate,
  type Body,
  type Rect,
} from './math';
import { Backdrop, Stage, drawSprite } from './scene';

/*
 * The shared pen: every unlocked animal on one patch of grass. The sprites are single
 * frames, so life comes from transforms only: breathing (scale-y), turning (scale-x through
 * zero), short walks with a body bob, hops, and bubbles above their heads.
 */

export type PenState = 'hungry' | 'busy' | 'ready';

export interface PenAnimal {
  id: AnimalId;
  state: PenState;
  sprite: string;
  product: string;
  feed: string;
}

/** Relative body size on screen (all ≤ 1.3× the sprite's own pixels). */
const SIZE: Record<AnimalId, number> = {
  chicken: 0.78,
  duck: 0.78,
  quail: 0.66,
  goose: 0.88,
  rabbit: 0.74,
  goat: 0.98,
  sheep: 1.0,
  cow: 1.15,
  pig: 0.92,
  broiler: 0.8,
  muscovy: 0.82,
  cattle: 1.15,
};

interface Actor extends Body {
  id: AnimalId;
  data: PenAnimal;
  homeX: number;
  homeY: number;
  mode: 'idle' | 'walk';
  modeLeft: number;
  tx: number;
  ty: number;
  speed: number;
  dir: 1 | -1;
  facing: number;
  phase: number;
  tempo: number;
  hop: number;
  stepPhase: number;
  rand: () => number;
}

const SEED: Record<AnimalId, number> = {
  chicken: 11,
  duck: 23,
  cow: 37,
  quail: 41,
  goat: 53,
  goose: 67,
  sheep: 79,
  rabbit: 83,
  pig: 97,
  broiler: 101,
  muscovy: 109,
  cattle: 113,
};

export class YardStage extends Stage {
  private actors: Actor[] = [];
  private order: Actor[] = [];
  private box: Rect = { left: 0, top: 0, right: 0, bottom: 0 };
  private bg = new Backdrop();

  setAnimals(list: PenAnimal[]): void {
    const keep = new Map(this.actors.map((a) => [a.id, a]));
    this.actors = list.map((d) => {
      const old = keep.get(d.id);
      if (old) {
        old.data = d;
        return old;
      }
      const rand = rng(SEED[d.id] * 7919);
      return {
        id: d.id,
        data: d,
        x: 0,
        y: 0,
        r: 16 * SIZE[d.id],
        homeX: 0,
        homeY: 0,
        mode: 'idle',
        modeLeft: between(rand, 0.5, 2.5),
        tx: 0,
        ty: 0,
        speed: between(rand, 14, 22),
        dir: rand() < 0.5 ? 1 : -1,
        facing: 1,
        phase: rand() * Math.PI * 2,
        tempo: between(rand, 0.75, 1.15),
        hop: 0,
        stepPhase: rand() * 6,
        rand,
      };
    });
    for (const a of this.actors) if (!keep.has(a.id)) a.facing = a.dir;
    this.order = [...this.actors];
    this.layout(false);
  }

  resize(w: number, h: number): void {
    super.resize(w, h);
    this.box = { left: 12, top: Math.round(h * 0.44), right: w - 12, bottom: h - 12 };
    this.layout(true);
  }

  /** Homes on two staggered rows, so a static (reduced motion) pen still reads well. */
  private layout(moveAll: boolean): void {
    const n = this.actors.length;
    if (!n || !this.w) return;
    const { left, right, top, bottom } = this.box;
    const rows = n > 4 ? 2 : 1;
    const perRow = Math.ceil(n / rows);
    this.actors.forEach((a, i) => {
      const row = rows === 2 ? i % 2 : 0;
      const col = rows === 2 ? Math.floor(i / 2) : i;
      const span = right - left;
      const shift = rows === 2 ? (row ? 0.22 : -0.22) : 0;
      a.homeX = left + (span * (col + 0.5 + shift)) / perRow;
      a.homeY = rows === 2 ? (row ? bottom - 4 : top + (bottom - top) * 0.42) : bottom - 10;
      if (moveAll || (a.x === 0 && a.y === 0)) {
        a.x = a.homeX;
        a.y = a.homeY;
        a.tx = a.x;
        a.ty = a.y;
      }
    });
    separate(this.actors, this.box, 3);
  }

  update(dt: number): void {
    if (!this.actors.length) return;
    if (this.env.reduced || dt === 0) {
      if (this.env.reduced) for (const a of this.actors) a.facing = a.dir;
      return;
    }
    for (const a of this.actors) this.think(a, dt);
    separate(this.actors, this.box);
  }

  private think(a: Actor, dt: number): void {
    a.hop = Math.max(0, a.hop - dt / 0.55);
    a.modeLeft -= dt;
    const calm = a.data.state === 'busy';
    if (a.modeLeft <= 0) {
      const roll = a.rand();
      if (a.mode === 'walk' || roll < (calm ? 0.75 : 0.35)) {
        a.mode = 'idle';
        a.modeLeft = calm ? between(a.rand, 3, 7) : between(a.rand, 1.2, 3.8);
      } else if (roll < (calm ? 0.85 : 0.6)) {
        // Look the other way.
        a.dir = a.dir === 1 ? -1 : 1;
        a.mode = 'idle';
        a.modeLeft = between(a.rand, 0.8, 2);
      } else {
        // A short stroll, drifting back toward home so the herd stays spread out.
        const dx = between(a.rand, 18, 70) * (a.rand() < 0.5 ? -1 : 1);
        const pull = (a.homeX - a.x) * 0.5;
        a.tx = clamp(a.x + dx + pull, this.box.left + a.r, this.box.right - a.r);
        a.ty = clamp(
          a.y + between(a.rand, -16, 16) + (a.homeY - a.y) * 0.4,
          this.box.top,
          this.box.bottom,
        );
        a.mode = 'walk';
        a.modeLeft = 4;
      }
    }
    if (a.mode === 'walk') {
      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 1.5) {
        a.mode = 'idle';
        a.modeLeft = between(a.rand, 1, 3);
      } else {
        if (Math.abs(dx) > 2) a.dir = dx > 0 ? 1 : -1;
        // Start walking only once mostly turned: no moonwalking while flipping.
        const ready = Math.abs(a.facing - a.dir) < 0.6;
        const v = ready ? a.speed * (calm ? 0.6 : 1) : 0;
        const step = Math.min(d, v * dt);
        a.x += (dx / d) * step;
        a.y += (dy / d) * step;
        a.stepPhase += step * 0.32;
      }
    }
    a.facing = approach(a.facing, a.dir, 7, dt);
    keepInBounds(a, this.box);
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    this.bg.draw(ctx, this.w, this.h, paintPen);
    // Back to front.
    this.order.sort((p, q) => p.y - q.y);
    const reduced = this.env.reduced;
    const span = Math.max(1, this.box.bottom - this.box.top);
    for (const a of this.order) {
      const img = sprite(a.data.sprite);
      if (!img) continue;
      const depth = 0.9 + 0.12 * clamp((a.y - this.box.top) / span, 0, 1);
      const scale = SIZE[a.id] * depth;
      const calm = a.data.state === 'busy';
      const breathe = reduced
        ? 1
        : 1 + Math.sin(t * Math.PI * 2 * a.tempo * (calm ? 0.35 : 0.6) + a.phase) * 0.022;
      const walking = !reduced && a.mode === 'walk';
      const bob = walking ? -Math.abs(Math.sin(a.stepPhase)) * 1.6 : 0;
      const hopK = reduced ? 0 : a.hop;
      const hopY = -Math.sin(Math.PI * (1 - hopK)) * 13 * (hopK > 0 ? 1 : 0);
      const squash = hopK > 0 && hopK < 0.15 ? 1 - (0.15 - hopK) * 0.6 : 1;
      // Ground shadow stays put while the body hops.
      const sw = img.naturalWidth * scale * 0.42;
      ctx.fillStyle = 'rgba(30, 40, 10, 0.22)';
      ctx.beginPath();
      ctx.ellipse(a.x, a.y - 1, sw * (1 + hopY / 60), sw * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      if (hopK > 0) {
        // Tapped: a ring runs out over the grass from its feet.
        const u = 1 - hopK;
        ctx.strokeStyle = `rgba(255, 244, 190, ${0.85 * hopK})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(a.x, a.y - 1, sw * (0.8 + u), sw * (0.18 + u * 0.22), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Mirror through zero while turning; never quite flat, so it stays visible.
      const sx = Math.sign(a.facing || 1) * Math.max(0.12, Math.abs(a.facing));
      drawSprite(ctx, img, a.x, a.y + bob + hopY, scale, { sx, sy: breathe * squash });
      const headY = a.y + hopY - img.naturalHeight * scale - 6;
      this.drawNeed(ctx, a, headY, t, reduced);
    }
  }

  private drawNeed(
    ctx: CanvasRenderingContext2D,
    a: Actor,
    headY: number,
    t: number,
    reduced: boolean,
  ): void {
    const st = a.data.state;
    if (st === 'busy') {
      if (reduced) return;
      ctx.fillStyle = 'rgba(255, 250, 235, 0.9)';
      ctx.font = '700 11px system-ui, sans-serif';
      for (let i = 0; i < 2; i++) {
        const k = (t * 0.3 + a.phase + i * 0.5) % 1;
        ctx.globalAlpha = Math.sin(Math.PI * k) * 0.85;
        ctx.fillText('z', a.x + 8 + k * 9, headY + 4 - k * 14);
      }
      ctx.globalAlpha = 1;
      return;
    }
    const ready = st === 'ready';
    const icon = sprite(ready ? a.data.product : a.data.feed);
    const float = reduced ? 0 : Math.sin(t * 1.7 + a.phase) * 2.5;
    const r = ready ? 16 : 13;
    const cy = headY - r + float;
    if (ready && !reduced) {
      // A ring pulses out of a ready bubble: something to collect here.
      const p = (t * 0.7 + a.phase) % 1;
      ctx.strokeStyle = `rgba(255, 214, 107, ${0.75 * (1 - p)})`;
      ctx.lineWidth = 2.5 * (1 - p) + 0.5;
      ctx.beginPath();
      ctx.arc(a.x, cy, r + 2 + p * 11, 0, Math.PI * 2);
      ctx.stroke();
    }
    // A hungry bubble nods now and then, as if asking.
    const nod = !ready && !reduced ? Math.max(0, Math.sin(t * 2.6 + a.phase)) ** 6 * 0.18 : 0;
    ctx.save();
    ctx.translate(a.x, cy + r);
    ctx.rotate(nod);
    ctx.translate(-a.x, -(cy + r));
    ctx.globalAlpha = ready ? 1 : 0.9;
    ctx.fillStyle = ready ? '#fff7e2' : 'rgba(255, 247, 226, 0.92)';
    ctx.strokeStyle = ready ? '#e8a52a' : 'rgba(120, 90, 50, 0.55)';
    ctx.lineWidth = ready ? 2.2 : 1.4;
    ctx.beginPath();
    ctx.arc(a.x, cy, r, 0, Math.PI * 2);
    ctx.moveTo(a.x - 4, cy + r - 1);
    ctx.lineTo(a.x, cy + r + 5);
    ctx.lineTo(a.x + 4, cy + r - 1);
    ctx.fill();
    ctx.stroke();
    if (icon) {
      const s = ((r * 2 - 6) / Math.max(icon.naturalWidth, icon.naturalHeight)) * 1;
      drawSprite(ctx, icon, a.x, cy, s, { anchor: 'center' });
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /** Where an animal's bubble is (for the product's flight to the pantry). */
  bubblePoint(id: AnimalId): { x: number; y: number } | null {
    const a = this.actors.find((v) => v.id === id);
    if (!a) return null;
    const img = sprite(a.data.sprite);
    const h = img ? img.naturalHeight * SIZE[id] : 40;
    return { x: a.x, y: a.y - h - 20 };
  }

  /** Tap feedback: a hop and a puff. */
  hop(id: AnimalId, kind: 'tap' | 'feed' | 'collect'): void {
    const a = this.actors.find((v) => v.id === id);
    if (!a || this.env.reduced) return;
    a.hop = 1;
    a.mode = 'idle';
    a.modeLeft = between(a.rand, 1, 2);
    const head = this.bubblePoint(id);
    const p = this.particles;
    const L = this.layer;
    if (kind === 'feed') {
      for (let i = 0; i < 8; i++)
        p.spawn({
          layer: L,
          kind: 'dot',
          x: a.x + between(a.rand, -16, 16),
          y: a.y - 30 - a.rand() * 12,
          vx: between(a.rand, -10, 10),
          vy: between(a.rand, -10, 20),
          g: 160,
          life: 0.55,
          size: 1.6,
          color: '#e3c26b',
        });
    }
    const hearts = kind === 'tap' ? 1 : 2;
    for (let i = 0; i < hearts; i++)
      p.spawn({
        layer: L,
        kind: kind === 'collect' ? 'spark' : 'heart',
        x: (head?.x ?? a.x) + between(a.rand, -10, 10),
        y: (head?.y ?? a.y - 40) + 8,
        vx: between(a.rand, -14, 14),
        vy: between(a.rand, -40, -26),
        life: 0.9,
        size: kind === 'collect' ? 5 : 4,
        color: kind === 'collect' ? '#ffd56b' : '#ff8a8a',
      });
    for (let i = 0; i < 3; i++)
      p.spawn({
        layer: L,
        kind: 'dot',
        x: a.x + between(a.rand, -10, 10),
        y: a.y - 2,
        vx: between(a.rand, -22, 22),
        vy: between(a.rand, -16, -6),
        g: 30,
        life: 0.5,
        size: 2.2,
        color: 'rgba(150, 120, 70, 0.7)',
      });
  }

  tap(x: number, y: number): void {
    const hit = this.hitTest(x, y);
    if (hit) this.hop(hit, 'tap');
  }

  hitTest(x: number, y: number): AnimalId | null {
    for (let i = this.order.length - 1; i >= 0; i--) {
      const a = this.order[i]!;
      const img = sprite(a.data.sprite);
      const w = (img?.naturalWidth ?? 60) * SIZE[a.id];
      const h = (img?.naturalHeight ?? 50) * SIZE[a.id];
      if (Math.abs(x - a.x) <= w / 2 && y <= a.y + 4 && y >= a.y - h - 8) return a.id;
    }
    return null;
  }
}

/** Grass, a back fence and a hay corner, painted once per size. */
function paintPen(c: CanvasRenderingContext2D, w: number, h: number): void {
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#9fc77a');
  sky.addColorStop(1, '#6f9e4c');
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
  // Darker back strip behind the fence.
  c.fillStyle = '#5f8a3f';
  c.fillRect(0, 0, w, h * 0.3);
  // Grass tufts, deterministic.
  const rand = rng(97);
  c.strokeStyle = 'rgba(60, 100, 30, 0.45)';
  c.lineWidth = 1.2;
  for (let i = 0; i < Math.round(w / 9); i++) {
    const x = rand() * w;
    const y = h * 0.34 + rand() * h * 0.64;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 2, y - 5);
    c.moveTo(x, y);
    c.lineTo(x + 2, y - 6);
    c.stroke();
  }
  // Hay in the corner.
  c.fillStyle = '#e6c766';
  c.beginPath();
  c.ellipse(w - 34, h * 0.36, 26, 10, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(160, 120, 40, 0.6)';
  for (let i = 0; i < 9; i++) {
    const x = w - 54 + rand() * 40;
    c.beginPath();
    c.moveTo(x, h * 0.36 - 6 + rand() * 4);
    c.lineTo(x + 6 - rand() * 12, h * 0.36 + 4);
    c.stroke();
  }
  // Wooden fence along the back.
  const top = h * 0.16;
  const base = h * 0.33;
  c.fillStyle = '#8a5a32';
  for (let x = 8; x < w; x += 34) c.fillRect(x, top, 5, base - top + 4);
  c.fillStyle = '#a8703f';
  c.fillRect(0, top + 5, w, 5);
  c.fillRect(0, top + 17, w, 5);
  c.fillStyle = 'rgba(0, 0, 0, 0.12)';
  c.fillRect(0, base + 2, w, 3);
}

import type { BoatStage as BoatState } from '../../domain/selectors';
import { BOAT_SPRITE } from '../../data/sprites';
import { sprite } from './images';
import { between, clamp, easeInOut, rng } from './math';
import { Backdrop, Stage, drawSprite } from './scene';

/*
 * The fishing boat. The sheet draws boat, net and baskets as one picture, so the whole picture
 * rides the swell: a gentle bob and roll at the jetty, a slow sail-off to the right when sent
 * (and a small silhouette on the horizon while away), a sail-in when it comes back.
 */

const DEPART_S = 2.6;
const RETURN_S = 2.4;

export class BoatStage extends Stage {
  state: BoatState = 'locked';
  /** 0 → 1 while sailing off, 1 → 0 while sailing in; null when not travelling. */
  private trip: { k: number; out: boolean } | null = null;
  private bg = new Backdrop();
  private rand = rng(55);

  setState(next: BoatState): void {
    const prev = this.state;
    this.state = next;
    if (!this.scene || this.env.reduced) {
      this.trip = null;
      return;
    }
    if (prev === 'docked' && next === 'away') this.trip = { k: 0, out: true };
    else if (prev === 'away' && next === 'back') this.trip = { k: 1, out: false };
    else if (next === 'docked' || next === 'locked') this.trip = null;
  }

  update(dt: number): void {
    if (!this.trip || dt === 0) return;
    if (this.env.reduced) {
      this.trip = null;
      return;
    }
    const tr = this.trip;
    tr.k = clamp(tr.k + (tr.out ? dt / DEPART_S : -dt / RETURN_S), 0, 1);
    if ((tr.out && tr.k >= 1) || (!tr.out && tr.k <= 0)) this.trip = null;
    // A little wake while it moves.
    if (this.trip && this.rand() < dt * 10) {
      const p = this.dock();
      this.particles.spawn({
        layer: this.layer,
        kind: 'splash',
        x: p.x - 40 + easeInOut(tr.k) * (this.w * 0.75),
        y: p.y - 6,
        vx: -between(this.rand, 10, 30),
        vy: -between(this.rand, 6, 16),
        g: 50,
        life: 0.6,
        size: 2.2,
        color: 'rgba(235, 248, 255, 0.85)',
      });
    }
  }

  private scale(img: HTMLImageElement): number {
    return Math.min(1, (this.w - 24) / img.naturalWidth, (this.h - 14) / img.naturalHeight);
  }

  /** The jetty spot: bottom centre of the picture. */
  private dock() {
    return { x: this.w / 2, y: this.h - 6 };
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    this.bg.draw(ctx, this.w, this.h, paintSea);
    const reduced = this.env.reduced;
    const horizon = this.h * 0.36;
    // Waves: two slow sine lines across the sea.
    if (!reduced) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1.2;
      for (let row = 0; row < 2; row++) {
        const y0 = horizon + 18 + row * 26;
        ctx.beginPath();
        for (let x = 0; x <= this.w; x += 12) {
          const y = y0 + Math.sin(x * 0.05 + t * (0.9 + row * 0.3) + row) * 2;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    const img = sprite(BOAT_SPRITE);
    if (!img) return;
    const s = this.scale(img);
    const p = this.dock();
    const bob = reduced ? 0 : Math.sin(t * 1.4) * 2.2;
    const roll = reduced ? 0 : Math.sin(t * 0.9 + 0.6) * 0.012;
    if (this.state === 'locked') {
      drawSprite(ctx, img, p.x, p.y, s, { alpha: 0.38 });
      return;
    }
    const away = this.state === 'away';
    if (this.trip) {
      // Sailing off (or in): slides right, sinks a touch toward the horizon, fades at the edge.
      const k = easeInOut(this.trip.k);
      const x = p.x + k * (this.w * 0.75);
      const y = p.y - k * 8 + bob;
      drawSprite(ctx, img, x, y, s * (1 - k * 0.25), { rot: roll, alpha: 1 - k * 0.6 });
      return;
    }
    if (away) {
      // Far out at sea: a small silhouette on the horizon.
      const hs = s * 0.2;
      drawSprite(ctx, img, this.w * 0.78, horizon + 10 + bob * 0.3, hs, {
        rot: roll,
        alpha: 0.75,
      });
      return;
    }
    drawSprite(ctx, img, p.x, p.y + bob, s, { rot: roll });
  }

  /** Unloading: a splash and a few sparkles over the baskets. */
  unload(): void {
    if (this.env.reduced) return;
    const p = this.dock();
    for (let i = 0; i < 10; i++)
      this.particles.spawn({
        layer: this.layer,
        kind: i % 2 ? 'splash' : 'spark',
        x: p.x + 60 + between(this.rand, -30, 30),
        y: p.y - 50,
        vx: between(this.rand, -50, 50),
        vy: -between(this.rand, 30, 70),
        g: 140,
        life: 0.8,
        size: i % 2 ? 2.6 : 4.5,
        color: i % 2 ? 'rgba(220, 245, 255, 0.9)' : '#ffe08a',
      });
  }

  tap(): void {
    if (this.env.reduced || this.state === 'locked' || this.state === 'away') return;
    const p = this.dock();
    for (let i = 0; i < 4; i++)
      this.particles.spawn({
        layer: this.layer,
        kind: 'splash',
        x: p.x - 60 + between(this.rand, -20, 20),
        y: p.y - 14,
        vx: between(this.rand, -20, 20),
        vy: -between(this.rand, 20, 40),
        g: 120,
        life: 0.6,
        size: 2.2,
        color: 'rgba(220, 245, 255, 0.9)',
      });
  }

  /** Where the catch is (the baskets on the right of the picture), for flights. */
  catchPoint() {
    const p = this.dock();
    return { x: p.x + Math.min(120, this.w * 0.3), y: p.y - 50 };
  }
}

function paintSea(c: CanvasRenderingContext2D, w: number, h: number): void {
  const horizon = h * 0.36;
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#9fd3ea');
  sky.addColorStop(1, '#dff1f4');
  c.fillStyle = sky;
  c.fillRect(0, 0, w, horizon);
  const sea = c.createLinearGradient(0, horizon, 0, h);
  sea.addColorStop(0, '#4fb0cf');
  sea.addColorStop(1, '#2a7ea6');
  c.fillStyle = sea;
  c.fillRect(0, horizon, w, h - horizon);
  // A far island on the horizon.
  c.fillStyle = 'rgba(70, 120, 90, 0.55)';
  c.beginPath();
  c.ellipse(w * 0.2, horizon, 46, 9, 0, Math.PI, 0);
  c.fill();
}

import { type Assets, canvas } from '../engine/assets';
import type { Placed, Places, Vec2 } from '../engine/types';
import { type AnimSystem, type World, smooth } from '../engine/world';

/**
 * Buildings: windmill sails (body never moves) turning in their own tilted plane with inertia,
 * so gusts spin them up and they coast down; a chimney with smoke that leans in the wind;
 * window light flicker; the farmhouse door (hover glow, click to open); a light sweep across
 * the greenhouse glass.
 */

export function animateWindmill(m: { angle: number; omega: number }, w: World, hubX: number) {
  const wind = w.wind.at(hubX);
  const target = 0.25 + wind * 2.2;
  // Heavy sails: speed follows the wind with a ~2 s lag (accelerate, coast down).
  m.omega += (target - m.omega) * Math.min(1, w.dt * 0.55);
  m.angle += m.omega * w.dt;
}

export class BuildingAnimation implements AnimSystem {
  private blades: Placed & { hub: Vec2 };
  private bladesImg: HTMLImageElement;
  private bladesShadow: HTMLCanvasElement;
  /** Sail plane: maps a unit circle onto the painted sails' ellipse. */
  private plane: [number, number, number, number];
  private planeInv: [number, number, number, number];
  private mill = { angle: 0, omega: 0.5 };
  private smokeClock = 0;
  private door: {
    left: HTMLCanvasElement;
    right: HTMLCanvasElement;
    open: number;
    target: number;
    hover: boolean;
    idle: number;
    ajar: number;
  };
  private glass: Placed;
  private glassMask: HTMLImageElement;
  private glassScratch: [HTMLCanvasElement, CanvasRenderingContext2D];
  private flicker: number[];

  constructor(
    assets: Assets,
    private places: Places,
  ) {
    const { layout, img } = assets;
    const b = layout.sprites.blades as Placed & { hub: Vec2; tips: Vec2[] };
    this.blades = b;
    this.bladesImg = img(b.file);
    const [sc, sctx] = canvas(b.w, b.h);
    sctx.drawImage(this.bladesImg, 0, 0);
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = '#2b1a0c';
    sctx.fillRect(0, 0, b.w, b.h);
    this.bladesShadow = sc;
    const [tl, tr, br, bl] = b.tips as [Vec2, Vec2, Vec2, Vec2];
    const u1: Vec2 = [(tl[0] - br[0]) / 2, (tl[1] - br[1]) / 2];
    const u2: Vec2 = [(tr[0] - bl[0]) / 2, (tr[1] - bl[1]) / 2];
    const r = (Math.hypot(...u1) + Math.hypot(...u2)) / 2;
    const [a, bb, c, d] = [u1[0] / r, u1[1] / r, u2[0] / r, u2[1] / r];
    this.plane = [a, bb, c, d];
    const det = a * d - c * bb;
    this.planeInv = [d / det, -bb / det, -c / det, a / det];

    // Door leaves cut from the painting, so they can swing open.
    const { x0, y0, x1, y1 } = places.door;
    const mid = (x0 + x1) / 2;
    const island = img('island.webp');
    const [l, lc] = canvas(mid - x0, y1 - y0);
    lc.drawImage(island, x0, y0, mid - x0, y1 - y0, 0, 0, mid - x0, y1 - y0);
    const [rr, rc] = canvas(x1 - mid, y1 - y0);
    rc.drawImage(island, mid, y0, x1 - mid, y1 - y0, 0, 0, x1 - mid, y1 - y0);
    this.door = { left: l, right: rr, open: 0, target: 0, hover: false, idle: 14, ajar: 0 };

    this.glass = layout.glass;
    this.glassMask = img(layout.glass.file);
    this.glassScratch = canvas(layout.glass.w, layout.glass.h);
    this.flicker = places.windows.map(() => Math.random());
  }

  /** Pointer helpers for the door. Returns true when the click was used. */
  hover(p: { x: number; y: number } | null) {
    const { x0, y0, x1, y1 } = this.places.door;
    this.door.hover = !!p && p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1;
    return this.door.hover;
  }
  click(p: { x: number; y: number }) {
    if (!this.hover(p)) return false;
    this.door.target = this.door.target > 0.5 ? 0 : 1;
    return true;
  }

  update(w: World) {
    animateWindmill(this.mill, w, this.blades.hub[0]);
    // Smoke: a puff every ~0.35 s, pushed by the wind at the chimney.
    const { chimney } = this.places;
    this.smokeClock -= w.dt;
    if (this.smokeClock <= 0 && w.settings.particles) {
      this.smokeClock = 0.2 + w.rand() * 0.1;
      const wind = w.wind.at(chimney.x);
      w.particles.spawn(
        'smoke',
        chimney.x + (w.rand() - 0.5) * 3,
        chimney.top - 1,
        wind * 8,
        -16 - w.rand() * 6,
        5 + w.rand() * 1.5,
        6.5 + w.rand() * 2.5,
      );
    }
    // Door: eases to its target; now and then it is left ajar for a moment on its own.
    const d = this.door;
    d.idle -= w.dt;
    if (d.ajar > 0) {
      d.ajar -= w.dt;
      if (d.ajar <= 0 && d.target === 0.18) d.target = 0;
    } else if (d.idle <= 0) {
      if (d.target === 0) {
        d.target = 0.18;
        d.ajar = 2.2;
      }
      d.idle = 16 + w.rand() * 10;
    }
    d.open += (d.target - d.open) * Math.min(1, w.dt * 4);
    for (let i = 0; i < this.flicker.length; i++)
      this.flicker[i] = (this.flicker[i] ?? 0) + w.dt * (0.6 + i * 0.07);
  }

  /** Windmill sails with their shadow on the tower. */
  drawWindmill(ctx: CanvasRenderingContext2D) {
    const b = this.blades;
    const [hx, hy] = b.hub;
    const draw = (img: CanvasImageSource, ox: number, oy: number) => {
      ctx.save();
      ctx.translate(hx + ox, hy + oy);
      ctx.transform(...this.plane, 0, 0);
      ctx.rotate(this.mill.angle);
      ctx.transform(...this.planeInv, 0, 0);
      ctx.drawImage(img, b.x - hx, b.y - hy);
      ctx.restore();
    };
    ctx.globalAlpha = 0.18;
    draw(this.bladesShadow, 7, 9);
    ctx.globalAlpha = 1;
    draw(this.bladesImg, 0, 0);
  }

  /** A brick chimney on the far roof slope, cut off by the ridge line. */
  drawChimney(ctx: CanvasRenderingContext2D) {
    const { x, ridge, top, w } = this.places.chimney;
    const [[rx0, ry0], [rx1, ry1]] = ridge;
    const ridgeY = (px: number) => ry0 + ((px - rx0) * (ry1 - ry0)) / (rx1 - rx0);
    const left = x - w / 2;
    const right = x + w / 2;
    const side = 5;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left - 10, top - 20);
    ctx.lineTo(right + side + 10, top - 20);
    ctx.lineTo(right + side + 10, ridgeY(right + side + 10));
    ctx.lineTo(left - 10, ridgeY(left - 10));
    ctx.closePath();
    ctx.clip();
    const bottom = ridgeY(left) + 2;
    // Side face (in shade), front face, bricks, cap.
    ctx.fillStyle = '#8f3f2c';
    ctx.beginPath();
    ctx.moveTo(right, top + 2);
    ctx.lineTo(right + side, top - 1);
    ctx.lineTo(right + side, bottom);
    ctx.lineTo(right, bottom);
    ctx.fill();
    ctx.fillStyle = '#c4613f';
    ctx.fillRect(left, top + 2, w, bottom - top);
    ctx.strokeStyle = 'rgba(110,45,28,0.55)';
    ctx.lineWidth = 0.8;
    for (let y = top + 6, row = 0; y < bottom; y += 4, row++) {
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      for (let bx = left + (row % 2 ? 3 : 6); bx < right; bx += 6) {
        ctx.beginPath();
        ctx.moveTo(bx, y);
        ctx.lineTo(bx, y + 4);
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#e2d6c6';
    ctx.fillRect(left - 1.5, top - 1, w + 3, 4);
    ctx.fillStyle = '#b9ab98';
    ctx.beginPath();
    ctx.moveTo(right + 1.5, top + 3);
    ctx.lineTo(right + side + 1.5, top);
    ctx.lineTo(right + side + 1.5, top - 4);
    ctx.lineTo(right + 1.5, top - 1);
    ctx.fill();
    ctx.fillStyle = '#3a2416';
    ctx.fillRect(left + 2, top - 1, w - 4, 1.6);
    ctx.strokeStyle = '#3b2418';
    ctx.lineWidth = 1.1;
    ctx.strokeRect(left - 1.5, top - 1, w + 3, 4);
    ctx.beginPath();
    ctx.moveTo(left, top + 3);
    ctx.lineTo(left, bottom);
    ctx.moveTo(right + side, top);
    ctx.lineTo(right + side, bottom);
    ctx.stroke();
    ctx.restore();
  }

  /** Window light flicker, the door and the greenhouse glass. */
  drawHouse(ctx: CanvasRenderingContext2D, w: World) {
    ctx.globalCompositeOperation = 'lighter';
    this.places.windows.forEach(([x, y, ww, hh], i) => {
      const f = this.flicker[i] ?? 0;
      const a = 0.07 + 0.05 * (0.5 + 0.5 * Math.sin(f * 2.3) * Math.sin(f * 5.1 + 1));
      const g = ctx.createRadialGradient(
        x + ww / 2,
        y + hh / 2,
        0,
        x + ww / 2,
        y + hh / 2,
        Math.max(ww, hh) * 0.9,
      );
      g.addColorStop(0, `rgba(255,214,140,${a * 2})`);
      g.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - ww * 0.4, y - hh * 0.4, ww * 1.8, hh * 1.8);
    });
    ctx.globalCompositeOperation = 'source-over';

    const d = this.door;
    const { x0, y0, x1, y1 } = this.places.door;
    const mid = (x0 + x1) / 2;
    if (d.open > 0.01) {
      // Dark warm room behind, leaves swing towards us round their hinges.
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, '#2a180c');
      g.addColorStop(1, '#5b3a1f');
      ctx.fillStyle = g;
      ctx.fillRect(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 1);
      const k = 1 - 0.78 * smooth(d.open);
      ctx.save();
      ctx.translate(x0, y0);
      ctx.transform(k, 0.25 * (1 - k), 0, 1, 0, 0);
      ctx.drawImage(d.left, 0, 0);
      ctx.restore();
      ctx.save();
      ctx.translate(x1, y0);
      ctx.transform(k, -0.25 * (1 - k), 0, 1, 0, 0);
      ctx.drawImage(d.right, -(x1 - mid), 0);
      ctx.restore();
    }
    if (d.hover) {
      ctx.strokeStyle = `rgba(255,236,170,${0.55 + 0.25 * Math.sin(w.t * 5)})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255,220,120,0.9)';
      ctx.shadowBlur = 8;
      ctx.strokeRect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2);
      ctx.shadowBlur = 0;
    }

    // Greenhouse: a soft light band sweeps across the glass every ~11 s.
    const g = this.glass;
    const [sc, s] = this.glassScratch;
    const u = (w.t % 11) / 4;
    if (u < 1) {
      s.globalCompositeOperation = 'source-over';
      s.clearRect(0, 0, g.w, g.h);
      const bx = -g.w * 0.3 + u * g.w * 1.6;
      const lg = s.createLinearGradient(bx - 40, 0, bx + 40, 20);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(0.5, 'rgba(255,255,255,0.9)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      s.fillStyle = lg;
      s.fillRect(0, 0, g.w, g.h);
      s.globalCompositeOperation = 'destination-in';
      s.drawImage(this.glassMask, 0, 0);
      ctx.globalAlpha = 0.45 * Math.sin(u * Math.PI);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(sc, g.x, g.y);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  }

  count() {
    return 4 + this.places.windows.length;
  }
}

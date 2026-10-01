import type { CloudDef } from '../engine/types';
import type { AnimSystem, World } from '../engine/world';

/**
 * Sky clouds drift west→east, each at its own pace (one crossing takes 35–65 s), bob a little,
 * breathe in size and opacity, and wrap round outside the view so the loop never shows. Front
 * banks below the island only sway and swell in place: they cover the cliff bottoms.
 * The clouds are clean cut-outs from the asset sheet, reused at several sizes and mirrored.
 */

interface Cloud {
  def: CloudDef;
  img: HTMLImageElement;
  x: number;
  speed: number;
  seed: number;
}

export function animateCloud(c: Cloud, w: World) {
  const span = w.view[2] - w.view[0] + c.def.w;
  // Bigger clouds are nearer and a little faster; the wind pushes all of them a bit.
  c.x += c.speed * (0.85 + w.wind.at(c.def.x) * 0.3) * w.dt;
  if (c.def.x + c.x > w.view[2]) c.x -= span + 20;
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  def: CloudDef,
  cx: number,
  cy: number,
  s: number,
) {
  const w = def.w * s;
  const h = def.h * s;
  if (!def.flip) {
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    return;
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

export class CloudAnimation implements AnimSystem {
  private sky: Cloud[] = [];
  private banks: Cloud[] = [];

  constructor(
    defs: CloudDef[],
    img: (f: string) => HTMLImageElement,
    size: [number, number] = [1678, 937],
  ) {
    defs.forEach((def, i) => {
      const seed = (i * 0.618) % 1;
      // Small (far) clouds cross slower than big (near) ones.
      const crossing = 70 - Math.min(30, def.w / 12) + seed * 20;
      const c = { def, img: img(def.file), x: 0, speed: size[0] / crossing, seed };
      (def.bank ? this.banks : this.sky).push(c);
    });
  }

  update(w: World) {
    for (const c of this.sky) animateCloud(c, w);
  }

  drawSky(ctx: CanvasRenderingContext2D, w: World) {
    for (const c of this.sky) {
      const { def } = c;
      const s = 1 + 0.015 * Math.sin(w.t * 0.11 + c.seed * 9);
      ctx.globalAlpha = 0.88 + 0.12 * Math.sin(w.t * 0.07 + c.seed * 5);
      const bob = 2.5 * Math.sin(w.t * 0.13 + c.seed * 7);
      drawCloud(ctx, c.img, def, def.x + c.x + def.w / 2, def.y + def.h / 2 + bob, s);
    }
    ctx.globalAlpha = 1;
  }

  drawBanks(ctx: CanvasRenderingContext2D, w: World) {
    for (const c of this.banks) {
      const { def } = c;
      const dx = 6 * Math.sin(w.t * 0.07 + c.seed * 6) + 2 * Math.sin(w.t * 0.19 + c.seed);
      const dy = 2 * Math.sin(w.t * 0.11 + c.seed * 3);
      const s = 1 + 0.008 * Math.sin(w.t * 0.13 + c.seed * 4);
      drawCloud(ctx, c.img, def, def.x + def.w / 2 + dx, def.y + def.h / 2 + dy, s);
    }
  }

  count() {
    return this.sky.length + this.banks.length;
  }
}

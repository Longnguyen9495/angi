import type { CloudDef } from '../engine/types';
import type { AnimSystem, World } from '../engine/world';

/**
 * Sky clouds drift west→east, each at its own pace (one crossing takes 35–65 s), breathe a
 * little in size and opacity, and wrap round outside the view so the loop never shows. Front
 * banks below the island only sway and swell in place: they cover the cliff bottoms.
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
  // Bigger clouds are farther and slower; the wind pushes all of them a bit.
  c.x += c.speed * (0.85 + w.wind.at(c.def.x) * 0.3) * w.dt;
  if (c.def.x + c.x > w.view[2]) c.x -= span + 20;
}

export class CloudAnimation implements AnimSystem {
  private sky: Cloud[] = [];
  private banks: Cloud[] = [];

  constructor(defs: CloudDef[], img: (f: string) => HTMLImageElement) {
    defs.forEach((def, i) => {
      const seed = (i * 0.618) % 1;
      const crossing = 35 + seed * 30 + Math.min(20, def.w / 30);
      const c = { def, img: img(def.file), x: 0, speed: 1678 / crossing, seed };
      (def.bank ? this.banks : this.sky).push(c);
    });
  }

  update(w: World) {
    for (const c of this.sky) animateCloud(c, w);
  }

  drawSky(ctx: CanvasRenderingContext2D, w: World) {
    for (const c of this.sky) {
      const { def } = c;
      const s = 1 + 0.012 * Math.sin(w.t * 0.11 + c.seed * 9);
      ctx.globalAlpha = 0.9 + 0.1 * Math.sin(w.t * 0.07 + c.seed * 5);
      const cx = def.x + c.x + def.w / 2;
      const cy = def.y + def.h / 2;
      ctx.drawImage(c.img, cx - (def.w * s) / 2, cy - (def.h * s) / 2, def.w * s, def.h * s);
    }
    ctx.globalAlpha = 1;
  }

  drawBanks(ctx: CanvasRenderingContext2D, w: World) {
    for (const c of this.banks) {
      const { def } = c;
      const dx = 5 * Math.sin(w.t * 0.07 + c.seed * 6) + 2 * Math.sin(w.t * 0.19 + c.seed);
      const dy = 1.5 * Math.sin(w.t * 0.11 + c.seed * 3);
      const s = 1 + 0.006 * Math.sin(w.t * 0.13 + c.seed * 4);
      ctx.drawImage(
        c.img,
        def.x + dx - (def.w * (s - 1)) / 2,
        def.y + dy - (def.h * (s - 1)) / 2,
        def.w * s,
        def.h * s,
      );
    }
  }

  count() {
    return this.sky.length + this.banks.length;
  }
}

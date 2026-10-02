import type { Assets } from '../engine/assets';
import type { LayerDef, LayerKind, Placed, Vec2 } from '../engine/types';
import { Spring } from '../engine/WindSystem';
import { type AnimSystem, type World, clamp, drawBent, easeOut } from '../engine/world';

/**
 * Plants in the wind: tree crowns (several parts per tree, each lagging the trunk on its own
 * spring), fruit swinging a little behind its branch, pines, bushes, grass, flowers (sway and a
 * small bounce), reeds, crops (sway + a growth demo on one plot), lily pads, the dock.
 * All sway comes from the shared WindSystem; springs give lag and settle instead of sines.
 */

interface Tuning {
  /** Bend (px per px of height) at wind 1. */
  amp: number;
  omega: number;
  zeta: number;
  /** Leaf flutter bend on top, scaled by wind. */
  flutter: number;
  flutterSpeed: number;
}

const TUNING: Record<LayerKind | 'crop', Tuning> = {
  tree: { amp: 0.03, omega: 1.5, zeta: 0.3, flutter: 0.008, flutterSpeed: 1 },
  pine: { amp: 0.022, omega: 1.9, zeta: 0.35, flutter: 0.006, flutterSpeed: 0.8 },
  bush: { amp: 0.04, omega: 2.6, zeta: 0.38, flutter: 0.012, flutterSpeed: 1.4 },
  grass: { amp: 0.075, omega: 4.2, zeta: 0.28, flutter: 0.028, flutterSpeed: 2.2 },
  flower: { amp: 0.05, omega: 4.8, zeta: 0.3, flutter: 0.02, flutterSpeed: 2 },
  reed: { amp: 0.065, omega: 3, zeta: 0.27, flutter: 0.02, flutterSpeed: 1.6 },
  crop: { amp: 0.05, omega: 4, zeta: 0.3, flutter: 0.02, flutterSpeed: 2 },
  hay: { amp: 0.004, omega: 2, zeta: 0.5, flutter: 0.001, flutterSpeed: 1 },
  dock: { amp: 0, omega: 1, zeta: 1, flutter: 0, flutterSpeed: 1 },
  indoor: { amp: 0, omega: 1, zeta: 1, flutter: 0, flutterSpeed: 1 },
};

interface Plant {
  def: LayerDef;
  img: HTMLImageElement;
  fruit: HTMLImageElement | null;
  tune: Tuning;
  /** Shared trunk spring (crown parts of one tree point at the same one). */
  trunk: Spring;
  part: Spring;
  fruitSwing: Spring;
  seed: number;
  bend: number;
  lift: number;
}

interface Crop {
  id: string;
  sprite: Placed & { base: Vec2 };
  img: HTMLImageElement;
  spring: Spring;
  seed: number;
  bend: number;
  /** Growth demo: scale 0..1 and opacity. */
  grow: { s: number; a: number } | null;
}

interface Lily {
  sprite: Placed;
  img: HTMLImageElement;
  seed: number;
}

export function animateTree(p: Plant, w: World, trunkDone: Set<Spring>) {
  const wind = w.wind.at(p.def.pivot[0]);
  if (!trunkDone.has(p.trunk)) {
    p.trunk.step(wind * p.tune.amp, w.dt);
    trunkDone.add(p.trunk);
  }
  // Crown parts follow the trunk with their own lag and flutter.
  const flutter = w.wind.flutter(p.seed, p.tune.flutterSpeed) * p.tune.flutter * (0.35 + wind);
  p.part.step(flutter + p.trunk.v * 0.06, w.dt);
  p.fruitSwing.step(-p.part.v * 0.9, w.dt);
  p.bend = p.trunk.x + p.part.x;
  p.lift = 0;
}

export function animateGrass(p: Plant, w: World) {
  const wind = w.wind.at(p.def.pivot[0]);
  const t = p.tune;
  const flutter = w.wind.flutter(p.seed, t.flutterSpeed) * t.flutter * (0.3 + wind);
  if (p.def.kind === 'indoor') {
    // Behind glass: no wind, just a slow lean of its own (air from the vents), two tempos.
    p.bend = 0.045 * Math.sin(w.t * 0.55 + p.seed * 6) + 0.02 * Math.sin(w.t * 1.7 + p.seed * 11);
    p.lift = 0;
    return;
  }
  if (p.def.under) {
    // Underwater weed: slow wobble of its own, barely any wind.
    p.bend = 0.03 * Math.sin(w.t * 0.9 + p.seed * 5) + wind * 0.008;
    p.lift = 0;
    return;
  }
  p.bend = p.part.step(wind * t.amp + flutter, w.dt);
  p.lift = Math.abs(p.bend) * 0.25;
  if (p.def.kind === 'flower')
    p.lift += 0.025 * Math.max(0, Math.sin(w.t * 2.7 + p.seed * 4)) * (0.3 + wind);
}

export function animateCrop(c: Crop, w: World, growDemo: boolean) {
  const wind = w.wind.at(c.sprite.base[0]);
  const t = TUNING.crop;
  c.bend = c.spring.step(
    wind * t.amp + w.wind.flutter(c.seed, t.flutterSpeed) * t.flutter * (0.3 + wind),
    w.dt,
  );
  if (!growDemo) return;
  // 15 s cycle: small → medium → mature, each step eased over 0.8 s, then it is picked and regrows.
  const u = w.t % 15;
  const stage = (from: number, to: number, at: number) =>
    from + (to - from) * easeOut((u - at) / 0.8);
  const s =
    u < 0.8
      ? stage(0.05, 0.28, 0)
      : u < 4
        ? 0.28
        : u < 8
          ? stage(0.28, 0.62, 4)
          : stage(0.62, 1, 8);
  const a = u > 14.2 ? 1 - (u - 14.2) / 0.8 : Math.min(1, u / 0.5);
  c.grow = { s, a };
}

export class EnvironmentAnimation implements AnimSystem {
  private plants: Plant[] = [];
  private crops: Crop[] = [];
  private lilies: Lily[] = [];
  private dockPlant: Plant | null = null;
  private straw = 0;

  constructor(
    assets: Assets,
    /** Plot whose sprout runs the growth demo. */
    private growId = 'sprout-2',
  ) {
    const { layout, img } = assets;
    const trunks = new Map<string, Spring>();
    layout.layers.forEach((def, i) => {
      const tune = TUNING[def.kind];
      const key = def.parent ?? def.id;
      let trunk = trunks.get(key);
      if (!trunk)
        trunks.set(key, (trunk = new Spring(tune.omega * (0.9 + ((i * 0.37) % 0.2)), tune.zeta)));
      const p: Plant = {
        def,
        img: img(def.file),
        fruit: typeof def.fruit === 'string' ? img(def.fruit) : null,
        tune,
        trunk,
        part: new Spring(tune.omega * (1.6 + ((i * 0.53) % 0.8)), tune.zeta + 0.05),
        fruitSwing: new Spring(3.2, 0.12),
        seed: (i * 0.754) % 1,
        bend: 0,
        lift: 0,
      };
      if (def.kind === 'dock') this.dockPlant = p;
      else this.plants.push(p);
    });
    // Back to front, so nearer plants overlap farther ones.
    this.plants.sort((a, b) => a.def.pivot[1] - b.def.pivot[1]);
    for (const [id, s] of Object.entries(layout.sprites)) {
      if (id.startsWith('sprout-'))
        this.crops.push({
          id,
          sprite: s as Placed & { base: Vec2 },
          img: img(s.file),
          spring: new Spring(4 + this.crops.length * 0.4, 0.3),
          seed: this.crops.length * 0.31 + 0.2,
          bend: 0,
          grow: null,
        });
    }
    for (const [i, l] of layout.lilies.entries()) {
      const s = layout.sprites[l.id];
      if (s) this.lilies.push({ sprite: s, img: img(s.file), seed: i * 0.43 });
    }
  }

  /** Crown centres (for falling leaves) and flowers (for butterflies). */
  crowns(): Vec2[] {
    return this.plants.filter((p) => p.def.kind === 'tree').map((p) => [p.def.e[0], p.def.e[1]]);
  }
  flowers(): Vec2[] {
    return this.plants
      .filter((p) => p.def.kind === 'flower')
      .map((p) => [p.def.e[0], p.def.e[1] - 4]);
  }

  /** Points a butterfly hovers at this frame: flowers close by tremble. */
  nudges: Vec2[] = [];

  /** The plant layer under picture point p (smallest ellipse first), for the sprite inspector. */
  layerAt(p: { x: number; y: number }) {
    const hits = [...this.plants, ...(this.dockPlant ? [this.dockPlant] : [])].filter(({ def }) => {
      const [cx, cy, rx, ry] = def.e;
      return ((p.x - cx) / rx) ** 2 + ((p.y - cy) / ry) ** 2 < 1;
    });
    hits.sort((a, b) => a.def.e[2] * a.def.e[3] - b.def.e[2] * b.def.e[3]);
    return hits[0]?.def ?? null;
  }

  update(w: World) {
    for (const p of this.plants) {
      if (p.def.kind !== 'flower') continue;
      for (const [nx, ny] of this.nudges)
        if (Math.hypot(nx - p.def.e[0], ny - p.def.e[1]) < 28) p.part.v += (w.rand() - 0.5) * 0.5;
    }
    const done = new Set<Spring>();
    for (const p of this.plants) {
      if (
        p.def.kind === 'tree' ||
        p.def.kind === 'pine' ||
        p.def.kind === 'bush' ||
        p.def.kind === 'hay'
      )
        animateTree(p, w, done);
      else animateGrass(p, w);
    }
    for (const c of this.crops) animateCrop(c, w, c.id === this.growId);
    // A gust lifts a few straws off the haystack.
    const hay = this.plants.find((p) => p.def.kind === 'hay');
    if (hay && w.settings.particles) {
      const wind = w.wind.at(hay.def.pivot[0]);
      this.straw += w.dt * Math.max(0, wind - 0.7) * 3 * w.settings.particleDensity;
      while (this.straw > 1) {
        this.straw--;
        const [cx, cy, rx, ry] = hay.def.e;
        w.particles.spawn(
          'straw',
          cx + (w.rand() - 0.5) * rx,
          cy - ry * 0.4 + w.rand() * 10,
          10 + w.rand() * 20,
          -10 - w.rand() * 10,
          2.5,
          3 + w.rand() * 2,
        );
      }
    }
  }

  /** Lily pads sit on the water (before reeds and the dock). */
  drawLilies(ctx: CanvasRenderingContext2D, w: World) {
    for (const l of this.lilies) {
      const { sprite: s } = l;
      const dy = 0.45 * Math.sin(w.t * 1.1 + l.seed * 6);
      const rot = 0.012 * Math.sin(w.t * 0.6 + l.seed * 4);
      const k = 1 + 0.015 * Math.sin(w.t * 0.8 + l.seed * 3);
      ctx.save();
      ctx.translate(s.x + s.w / 2, s.y + s.h / 2 + dy);
      ctx.rotate(rot);
      ctx.scale(k, 1 / k);
      ctx.drawImage(l.img, -s.w / 2, -s.h / 2);
      ctx.restore();
    }
  }

  drawDock(ctx: CanvasRenderingContext2D, w: World, rope: { from: Vec2; to: Vec2 }) {
    const p = this.dockPlant;
    if (!p) return;
    const dy = 0.35 * Math.sin(w.t * 0.8) + 0.2 * Math.sin(w.t * 1.9 + 1);
    ctx.drawImage(p.img, p.def.x, p.def.y + dy);
    // A mooring rope hangs off the corner post and swings with the wind.
    const wind = w.wind.at(rope.from[0]);
    const sway = Math.sin(w.t * 1.3) * 2 + wind * 3;
    const [ax, ay] = rope.from;
    const [bx, by] = rope.to;
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ax, ay + dy);
    ctx.quadraticCurveTo(ax + 4 + sway, (ay + by) / 2 + 4, bx + sway * 0.6, by + dy);
    ctx.stroke();
    ctx.strokeStyle = '#c9965a';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  /** `hide`: plants rooted where this returns true are left out (grass under an opened plot). */
  drawPlants(ctx: CanvasRenderingContext2D, hide?: (pivot: Vec2) => boolean) {
    for (const p of this.plants) {
      const { def } = p;
      if (hide?.(def.pivot)) continue;
      drawBent(ctx, p.img, def.x, def.y, def.pivot, p.bend, p.lift);
      if (p.fruit)
        drawBent(
          ctx,
          p.fruit,
          def.x,
          def.y,
          def.pivot,
          p.bend,
          0,
          clamp(p.fruitSwing.x * 40, -1.5, 1.5),
        );
    }
  }

  /** The painted sprouts and the growth demo (off when the game draws the real plots). */
  showCrops = true;

  drawCrops(ctx: CanvasRenderingContext2D) {
    if (!this.showCrops) return;
    for (const c of this.crops) {
      const s = c.sprite;
      if (c.grow) {
        // Growth: the plant rises out of the soil; leaves open a little after the stem.
        const { s: k, a } = c.grow;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(s.base[0], s.base[1]);
        ctx.transform(1, 0, -c.bend, 1, 0, 0);
        ctx.scale(k ** 1.15, k);
        ctx.drawImage(c.img, s.x - s.base[0], s.y - s.base[1]);
        ctx.restore();
        ctx.globalAlpha = 1;
      } else drawBent(ctx, c.img, s.x, s.y, s.base, c.bend, Math.abs(c.bend) * 0.2);
    }
  }

  count() {
    return this.plants.length + this.crops.length + this.lilies.length + (this.dockPlant ? 1 : 0);
  }
}

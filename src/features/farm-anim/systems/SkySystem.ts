import { rng } from '../engine/WindSystem';

/**
 * The hour and weather painted into the sky behind the island: the daytime sky picture is
 * shaded towards dawn, sunset or night (with a moon and twinkling stars), and greyed when it is
 * overcast or raining. Only the backdrop changes here; the island keeps its own light.
 */

export type SkyPart = 'morning' | 'noon' | 'evening' | 'night';
export type SkyWeather = 'clear' | 'cloudy' | 'rain';
export interface SkyMood {
  part: SkyPart;
  weather: SkyWeather;
}

/** Top → bottom colour stops of the shade over the sky picture, and how strongly it covers. */
const SHADE: Record<SkyPart, { stops: string[]; alpha: number } | null> = {
  morning: { stops: ['#ffb48c', '#ffd2a8', '#ffe8c8'], alpha: 0.32 },
  noon: null,
  evening: { stops: ['#ff8a5a', '#f6a878', '#c97c96'], alpha: 0.55 },
  night: { stops: ['#070c26', '#14204c', '#26346a'], alpha: 0.92 },
};

const GREY: Record<SkyWeather, number> = { clear: 0, cloudy: 0.22, rain: 0.4 };

const STARS = 90;

export class SkySystem {
  mood: SkyMood = { part: 'noon', weather: 'clear' };
  private stars: { x: number; y: number; r: number; ph: number; sp: number }[];

  constructor() {
    const r = rng(77);
    this.stars = Array.from({ length: STARS }, () => ({
      x: r(),
      // Denser near the top, thinning towards the horizon.
      y: Math.pow(r(), 1.6) * 0.75,
      r: 0.6 + r() * 1.3,
      ph: r() * Math.PI * 2,
      sp: 0.8 + r() * 2.2,
    }));
  }

  /** Shade, moon and stars over the sky picture (screen space, CSS px). */
  draw(ctx: CanvasRenderingContext2D, cw: number, ch: number, t: number) {
    const { part, weather } = this.mood;
    const shade = SHADE[part];
    if (shade) {
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      shade.stops.forEach((c, i) => g.addColorStop(i / (shade.stops.length - 1), c));
      ctx.globalAlpha = shade.alpha;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);
    }
    if (GREY[weather]) {
      ctx.globalAlpha = GREY[weather] * (part === 'night' ? 0.5 : 1);
      ctx.fillStyle = '#6c7688';
      ctx.fillRect(0, 0, cw, ch);
    }
    ctx.globalAlpha = 1;
    if (part !== 'night') return;

    const clear = weather === 'clear' ? 1 : weather === 'cloudy' ? 0.45 : 0;
    if (clear) {
      ctx.fillStyle = '#fffbe8';
      for (const s of this.stars) {
        ctx.globalAlpha = clear * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)));
        ctx.beginPath();
        ctx.arc(s.x * cw, s.y * ch, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Moon high on the right with a soft halo (dimmed behind rain clouds).
    const mx = cw * 0.86;
    const my = ch * 0.13;
    const mr = Math.max(14, Math.min(cw, ch) * 0.035);
    const lit = weather === 'rain' ? 0.25 : weather === 'cloudy' ? 0.6 : 1;
    const halo = ctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 7);
    halo.addColorStop(0, `rgba(200, 215, 255, ${0.35 * lit})`);
    halo.addColorStop(1, 'rgba(200, 215, 255, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(mx - mr * 7, my - mr * 7, mr * 14, mr * 14);
    ctx.globalAlpha = lit;
    ctx.fillStyle = '#f4f1dc';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** Canvas filter for the cloud banks drawn in front of the cliffs, to match the hour. */
  bankFilter(): string {
    const { part, weather } = this.mood;
    const f =
      part === 'night'
        ? 'brightness(0.42) saturate(0.7) hue-rotate(10deg)'
        : part === 'evening'
          ? 'sepia(0.35) saturate(1.3) brightness(0.92)'
          : part === 'morning'
            ? 'sepia(0.15) brightness(1.02)'
            : '';
    const grey = weather === 'rain' ? ' grayscale(0.4) brightness(0.85)' : '';
    return (f + grey).trim() || 'none';
  }
}

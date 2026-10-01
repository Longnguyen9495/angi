import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import type { DayPart, Weather } from './sky';
import './atmosphere.css';

/**
 * Light and weather laid over the painted farm, in HTML/CSS (and one small canvas for rain):
 * a light tint of the island that follows the guest's clock (dawn glow, midday sun rays, golden
 * evening, moonlight and fireflies), and the weather that changes every few hours (clear, cloudy
 * or rain). The sky behind the island (night sky, moon, stars) is painted by the scene itself.
 * Purely decorative: nothing here touches the game, and it never takes a tap.
 */

/** A small seeded random so the stars and fireflies keep their places between renders. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const FIREFLIES = 22;
const CLOUDS = 5;

export function Atmosphere({
  part,
  weather,
  reduced,
}: {
  part: DayPart;
  weather: Weather;
  reduced: boolean;
}) {
  const flies = useMemo(() => {
    const r = seeded(31);
    return Array.from({ length: FIREFLIES }, () => ({
      left: `${(6 + r() * 88).toFixed(2)}%`,
      top: `${(30 + r() * 58).toFixed(2)}%`,
      dx: `${((r() - 0.5) * 120).toFixed(0)}px`,
      dy: `${((r() - 0.5) * 80).toFixed(0)}px`,
      dur: `${(6 + r() * 8).toFixed(2)}s`,
      blink: `${(1.6 + r() * 2.4).toFixed(2)}s`,
      delay: `${(-r() * 10).toFixed(2)}s`,
      size: `${(3 + r() * 3).toFixed(1)}px`,
    }));
  }, []);

  const clouds = useMemo(() => {
    const r = seeded(91);
    return Array.from({ length: CLOUDS }, (_, i) => ({
      top: `${(-4 + r() * 14).toFixed(1)}%`,
      scale: (0.7 + r() * 0.8).toFixed(2),
      dur: `${(70 + r() * 70).toFixed(0)}s`,
      delay: `${(-r() * 140).toFixed(0)}s`,
      opacity: (0.35 + r() * 0.3).toFixed(2),
      key: i,
    }));
  }, []);

  const night = part === 'night';
  const raining = weather === 'rain';

  return (
    <div
      className="fg-atmo"
      data-part={part}
      data-weather={weather}
      data-reduced={reduced ? 'true' : undefined}
      aria-hidden="true"
    >
      {/* Colour grade of the whole picture, then light on top. */}
      <div className="fg-atmo__grade" />
      <div className="fg-atmo__glow" />
      {part === 'noon' && weather === 'clear' && <div className="fg-atmo__rays" />}

      <div className="fg-atmo__clouds">
        {clouds.map((c) => (
          <span
            key={c.key}
            className="fg-cloud"
            style={
              {
                top: c.top,
                '--s': c.scale,
                '--o': c.opacity,
                animationDuration: c.dur,
                animationDelay: c.delay,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {raining && <Rain reduced={reduced} />}

      {night && !raining && (
        <div className="fg-atmo__flies">
          {flies.map((f, i) => (
            <span
              key={i}
              style={
                {
                  left: f.left,
                  top: f.top,
                  width: f.size,
                  height: f.size,
                  '--dx': f.dx,
                  '--dy': f.dy,
                  '--dur': f.dur,
                  '--blink': f.blink,
                  animationDelay: `${f.delay}, ${f.delay}`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Rain on its own canvas: slanted streaks falling through the whole view and small splashes
 * on the lower half. Thinned out on small screens; with reduced motion a still veil of streaks.
 */
function Rain({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || reduced) return;
    let w = 0;
    let h = 0;
    let dpr = 1;
    type Drop = { x: number; y: number; len: number; v: number; a: number };
    type Splash = { x: number; y: number; t: number };
    let drops: Drop[] = [];
    const splashes: Splash[] = [];
    const wind = 0.22;
    const spawn = (d: Partial<Drop> = {}): Drop => ({
      x: Math.random() * (w + h * wind) - h * wind,
      y: -Math.random() * h,
      len: 10 + Math.random() * 16,
      v: 620 + Math.random() * 380,
      a: 0.25 + Math.random() * 0.35,
      ...d,
    });
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const count = Math.min(240, Math.round((w * h) / 6500));
      drops = Array.from({ length: count }, () => spawn({ y: Math.random() * h }));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.1;
      for (const d of drops) {
        d.y += d.v * dt;
        d.x += d.v * wind * dt;
        if (d.y > h) {
          if (d.y < h + 40 && splashes.length < 60 && Math.random() < 0.35)
            splashes.push({ x: d.x, y: h * (0.45 + Math.random() * 0.5), t: 0 });
          Object.assign(d, spawn());
        }
        ctx.strokeStyle = `rgba(210, 228, 255, ${d.a})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * wind, d.y - d.len);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i]!;
        s.t += dt;
        const u = s.t / 0.4;
        if (u >= 1) {
          splashes.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(220, 236, 255, ${0.5 * (1 - u)})`;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, 2 + u * 7, 1 + u * 2.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (raf || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    start();
    return () => {
      stop();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reduced]);

  return (
    <>
      <div className="fg-atmo__rainveil" />
      {reduced ? (
        <div className="fg-atmo__rainstill" />
      ) : (
        <canvas ref={ref} className="fg-atmo__rain" />
      )}
    </>
  );
}

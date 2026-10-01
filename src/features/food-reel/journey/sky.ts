// Time of day and weather for the farm game (drawn by Atmosphere.tsx).

export type DayPart = 'morning' | 'noon' | 'evening' | 'night';
export type Weather = 'clear' | 'cloudy' | 'rain';

/** Garden light follows the guest's local clock. */
export function dayPart(now: number): DayPart {
  const h = new Date(now).getHours();
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 16) return 'noon';
  if (h >= 16 && h < 19) return 'evening';
  return 'night';
}

/** Hours one weather lasts; the same block always rolls the same weather (no flicker on reload). */
const WEATHER_BLOCK_H = 3;

/** Random but stable weather for the 3-hour block `now` falls in: mostly fair, sometimes rain. */
export function weatherAt(now: number): Weather {
  const d = new Date(now);
  const block = Math.floor(d.getHours() / WEATHER_BLOCK_H);
  let h = (d.getFullYear() * 400 + (d.getMonth() + 1) * 32 + d.getDate()) * 8 + block;
  // Integer hash (xorshift-multiply) → 0..1.
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  const r = ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  return r < 0.55 ? 'clear' : r < 0.8 ? 'cloudy' : 'rain';
}

/** `?sky=night,rain` (any order) pins the look, for checking each mood without waiting. */
export function skyOverride(): { part?: DayPart; weather?: Weather } {
  if (typeof window === 'undefined') return {};
  const v = new URLSearchParams(window.location.search).get('sky') ?? '';
  const out: { part?: DayPart; weather?: Weather } = {};
  for (const w of v.split(',')) {
    if (w === 'morning' || w === 'noon' || w === 'evening' || w === 'night') out.part = w;
    if (w === 'clear' || w === 'cloudy' || w === 'rain') out.weather = w;
  }
  return out;
}

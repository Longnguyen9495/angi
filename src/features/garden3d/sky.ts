/*
 * Colours and light by the guest's local time. Day is the "khu vườn trên mây"
 * sky; the evening turns copper; night falls back to Bếp Việt's warm dark.
 */

export interface SkyLook {
  top: string;
  bottom: string;
  fog: string;
  sun: string;
  sunIntensity: number;
  ambient: number;
  /** Sun direction as an angle over the horizon (0 = horizon, π/2 = zenith). */
  elevation: number;
  /** Where the sun is around the island (radians). */
  azimuth: number;
  night: boolean;
  /** Cloud tint. */
  cloud: string;
}

interface Key {
  hour: number;
  look: Omit<SkyLook, 'azimuth' | 'night'>;
}

const KEYS: Key[] = [
  {
    hour: 0,
    look: {
      top: '#0b0d18',
      bottom: '#1d1712',
      fog: '#14110e',
      sun: '#9fb2ff',
      sunIntensity: 0.35,
      ambient: 0.35,
      elevation: 0.9,
      cloud: '#3a3a4a',
    },
  },
  {
    hour: 5,
    look: {
      top: '#1a2340',
      bottom: '#5b3c35',
      fog: '#3a2c2a',
      sun: '#ffb38a',
      sunIntensity: 0.55,
      ambient: 0.45,
      elevation: 0.12,
      cloud: '#c9a3a0',
    },
  },
  {
    hour: 7,
    look: {
      top: '#7fc4f0',
      bottom: '#ffe2c2',
      fog: '#f6dcc4',
      sun: '#ffe7c4',
      sunIntensity: 1.25,
      ambient: 0.7,
      elevation: 0.45,
      cloud: '#ffffff',
    },
  },
  {
    hour: 12,
    look: {
      top: '#4aa6ea',
      bottom: '#cfeefe',
      fog: '#d8f0ff',
      sun: '#fff7e8',
      sunIntensity: 1.6,
      ambient: 0.8,
      elevation: 1.15,
      cloud: '#ffffff',
    },
  },
  {
    hour: 16,
    look: {
      top: '#5fb0e8',
      bottom: '#fbe7c8',
      fog: '#f4e2c8',
      sun: '#ffe6b8',
      sunIntensity: 1.35,
      ambient: 0.72,
      elevation: 0.6,
      cloud: '#fff8ee',
    },
  },
  {
    hour: 18,
    look: {
      top: '#3b3f7a',
      bottom: '#f39a5b',
      fog: '#d9825a',
      sun: '#ff9a5c',
      sunIntensity: 0.9,
      ambient: 0.55,
      elevation: 0.14,
      cloud: '#ffc9a3',
    },
  },
  {
    hour: 19.5,
    look: {
      top: '#141a33',
      bottom: '#4a2c26',
      fog: '#2a1f1b',
      sun: '#ffb38a',
      sunIntensity: 0.4,
      ambient: 0.4,
      elevation: 0.05,
      cloud: '#5a4a4f',
    },
  },
  {
    hour: 24,
    look: {
      top: '#0b0d18',
      bottom: '#1d1712',
      fog: '#14110e',
      sun: '#9fb2ff',
      sunIntensity: 0.35,
      ambient: 0.35,
      elevation: 0.9,
      cloud: '#3a3a4a',
    },
  },
];

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const c = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

/** Sky look at a local hour (0–24, fractional). Blends between the keys above. */
export function skyAt(hour: number): SkyLook {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1]!.hour <= h) i++;
  const a = KEYS[i]!;
  const b = KEYS[i + 1]!;
  const t = (h - a.hour) / (b.hour - a.hour);
  const la = a.look;
  const lb = b.look;
  const num = (x: number, y: number) => x + (y - x) * t;
  return {
    top: mix(la.top, lb.top, t),
    bottom: mix(la.bottom, lb.bottom, t),
    fog: mix(la.fog, lb.fog, t),
    sun: mix(la.sun, lb.sun, t),
    cloud: mix(la.cloud, lb.cloud, t),
    sunIntensity: num(la.sunIntensity, lb.sunIntensity),
    ambient: num(la.ambient, lb.ambient),
    elevation: num(la.elevation, lb.elevation),
    // The sun travels from east (morning) to west (evening); the moon takes over at night.
    azimuth: ((h - 6) / 12) * Math.PI - Math.PI / 2,
    night: h < 5.5 || h >= 19,
  };
}

export function hourOf(now: number): number {
  const d = new Date(now);
  return d.getHours() + d.getMinutes() / 60;
}

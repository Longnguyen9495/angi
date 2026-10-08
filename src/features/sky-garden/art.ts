import { canvas } from '../farm-anim/engine/assets';
import type { Rect } from './layout';

/*
 * Stand-in art for the G1 motion demo, painted with Canvas until the real layers of §0.7 are
 * drawn: cloud platforms, the beanstalk, the machines, the ladybug and firefly, the village at
 * the foot of the tower. Each is listed in PLACEHOLDERS and can be stamped "tạm" in the demo so
 * nobody mistakes it for final art. Static parts are painted once into offscreen canvases.
 */

export type MachineKind = 'tea' | 'pot' | 'dew' | 'phin';

/**
 * What still has to be drawn, for the demo panel and the hand-over report (§0.7 art table).
 * The shelves and the beanstalk come from the test sprite sheet now; their Canvas versions here
 * are only drawn until those pictures load.
 */
export const PLACEHOLDERS = ['machine', 'village', 'ladybug', 'firefly', 'bubble', 'sign'] as const;
export type PlaceholderId = (typeof PLACEHOLDERS)[number];

/** Cloud colour per floor, low → high: white-blue, lavender, mint, pink, gold… (§0.7). */
const FLOOR_TINTS = [
  '#cfeeff',
  '#ddd0ff',
  '#cdf3dc',
  '#ffd9ea',
  '#fff0c4',
  '#d6e4ff',
  '#ffe0cc',
  '#e4d6ff',
  '#d2f5f0',
  '#fff6d8',
];

export function floorTint(i: number): string {
  return FLOOR_TINTS[i % FLOOR_TINTS.length]!;
}

const cache = new Map<string, HTMLCanvasElement>();

function cached(key: string, w: number, h: number, paint: (c: CanvasRenderingContext2D) => void) {
  const k = `${key}:${Math.round(w)}x${Math.round(h)}`;
  let c = cache.get(k);
  if (!c) {
    const [cv, ctx] = canvas(w, h);
    paint(ctx);
    c = cv;
    if (cache.size > 64) cache.clear();
    cache.set(k, c);
  }
  return c;
}

/**
 * A floor's cloud: puffs along the bottom, a flat top where the pots stand, and a bamboo rail
 * along the front edge (the Vietnamese touch of §0.7, instead of a plain cloud shelf).
 * `dpr` scales the offscreen picture so it stays sharp.
 */
export function platformImage(w: number, h: number, floor: number, dpr: number) {
  const tint = floorTint(floor);
  const pad = h * 0.5;
  const W = (w + pad * 2) * dpr;
  const H = h * 1.9 * dpr;
  return cached(`platform-${floor}`, W, H, (c) => {
    c.scale(dpr, dpr);
    const cw = w + pad * 2;
    const top = h * 0.35;
    // Puffs: a row of overlapping circles, bigger in the middle.
    const n = Math.max(5, Math.round(cw / (h * 0.9)));
    const g = c.createLinearGradient(0, top, 0, top + h * 1.4);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, tint);
    g.addColorStop(1, shade(tint, -0.18));
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(cw / 2, top + h * 0.35, cw / 2 - h * 0.1, h * 0.45, 0, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < n; i++) {
      const x = pad * 0.6 + ((cw - pad * 1.2) * (i + 0.5)) / n;
      const mid = 1 - Math.abs(i / (n - 1) - 0.5) * 0.8;
      const r = h * (0.42 + 0.22 * mid) * (0.85 + 0.3 * ((i * 0.618) % 1));
      c.beginPath();
      c.arc(x, top + h * 0.55, r, 0, Math.PI * 2);
      c.fill();
    }
    // Soft highlight on the top.
    c.globalAlpha = 0.7;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(cw / 2, top + h * 0.12, cw / 2 - h * 0.6, h * 0.16, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    // Bamboo rail with nodes.
    const ry = top + h * 0.28;
    const rh = Math.max(4, h * 0.12);
    const rg = c.createLinearGradient(0, ry - rh / 2, 0, ry + rh / 2);
    rg.addColorStop(0, '#d9c27a');
    rg.addColorStop(0.5, '#b89443');
    rg.addColorStop(1, '#8a6a2a');
    c.fillStyle = rg;
    roundRect(c, pad * 0.75, ry - rh / 2, cw - pad * 1.5, rh, rh / 2);
    c.fill();
    c.fillStyle = '#7a5a22';
    const step = Math.max(24, h * 0.9);
    for (let x = pad * 0.75 + step / 2; x < cw - pad * 0.75; x += step)
      c.fillRect(x, ry - rh / 2, 2, rh);
  });
}

/** Where platformImage's picture goes for a platform rect (it is padded on every side). */
export function platformBox(r: Rect): Rect {
  const pad = r.h * 0.5;
  return { x: r.x - pad, y: r.y - r.h * 0.35, w: r.w + pad * 2, h: r.h * 1.9 };
}

/** The beanstalk: a thick vine up the left of the tower, swaying a little, leaves at intervals. */
export function drawBeanstalk(
  c: CanvasRenderingContext2D,
  r: Rect,
  t: number,
  sway: number,
  /** 0..1 grown (the first-visit intro grows it from the ground). */
  grown = 1,
) {
  const cx = r.x + r.w / 2;
  const bottom = r.y + r.h;
  const topY = bottom - r.h * grown;
  const w = r.w * 0.36;
  c.save();
  c.lineCap = 'round';
  const path = (dx: number) => {
    c.beginPath();
    for (let y = bottom; y >= topY; y -= 8) {
      const k = (bottom - y) / Math.max(1, r.h);
      const x = cx + Math.sin(y * 0.012 + t * 0.4) * r.w * 0.18 + sway * k * r.w * 0.25 + dx;
      if (y === bottom) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
  };
  c.strokeStyle = '#2f6b25';
  c.lineWidth = w + 4;
  path(0);
  c.stroke();
  c.strokeStyle = '#5fae3a';
  c.lineWidth = w;
  path(0);
  c.stroke();
  c.strokeStyle = 'rgba(214,255,160,0.55)';
  c.lineWidth = w * 0.25;
  path(-w * 0.2);
  c.stroke();
  // Leaves: alternate sides, a slight flutter.
  const gap = Math.max(36, r.w * 1.4);
  let side = 1;
  for (let y = bottom - gap * 0.6; y > topY + 10; y -= gap) {
    const k = (bottom - y) / Math.max(1, r.h);
    const x = cx + Math.sin(y * 0.012 + t * 0.4) * r.w * 0.18 + sway * k * r.w * 0.25;
    const a = side * (0.7 + 0.12 * Math.sin(t * 1.3 + y));
    leaf(c, x, y, r.w * 0.55, a);
    side = -side;
  }
  c.restore();
}

function leaf(c: CanvasRenderingContext2D, x: number, y: number, s: number, a: number) {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  const g = c.createLinearGradient(0, 0, s, 0);
  g.addColorStop(0, '#3f8f2b');
  g.addColorStop(1, '#8fd65a');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(s * 0.5, -s * 0.45, s, 0);
  c.quadraticCurveTo(s * 0.5, s * 0.45, 0, 0);
  c.fill();
  c.strokeStyle = 'rgba(30,80,20,0.6)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(s * 0.9, 0);
  c.stroke();
  c.restore();
}

export type MachinePhase = 'idle' | 'run' | 'done';

/** The machine at the head of a floor (stand-in): tea stove, sweet-soup pot or dew still. */
export function drawMachine(
  c: CanvasRenderingContext2D,
  kind: MachineKind,
  r: Rect,
  phase: MachinePhase,
  t: number,
) {
  const { x, y, w, h } = r;
  const cx = x + w / 2;
  const shake = phase === 'run' ? Math.sin(t * 22) * w * 0.008 : 0;
  c.save();
  c.translate(shake, 0);
  // Shadow on the cloud.
  c.fillStyle = 'rgba(60,70,120,0.18)';
  c.beginPath();
  c.ellipse(cx, y + h * 0.95, w * 0.38, h * 0.06, 0, 0, Math.PI * 2);
  c.fill();
  if (kind === 'tea') {
    // Clay stove with a glow, a jade kettle on it.
    c.fillStyle = '#a5582f';
    trapezoid(c, cx, y + h * 0.62, w * 0.62, w * 0.5, h * 0.32);
    c.fillStyle = phase === 'run' ? '#ffb347' : '#5a2d17';
    c.beginPath();
    c.ellipse(cx, y + h * 0.8, w * 0.1, h * 0.06, 0, 0, Math.PI * 2);
    c.fill();
    gloss(c, '#2aa38a', '#0e6b5a', cx, y + h * 0.48, w * 0.26, h * 0.17);
    c.strokeStyle = '#e8c45a';
    c.lineWidth = Math.max(2, w * 0.03);
    c.beginPath();
    c.arc(cx, y + h * 0.36, w * 0.13, Math.PI, 0);
    c.stroke();
    c.beginPath();
    c.moveTo(cx + w * 0.24, y + h * 0.46);
    c.lineTo(cx + w * 0.36, y + h * 0.36);
    c.stroke();
  } else if (kind === 'pot') {
    gloss(c, '#d8413a', '#8c1d18', cx, y + h * 0.6, w * 0.36, h * 0.26);
    c.fillStyle = '#e8c45a';
    c.fillRect(cx - w * 0.36, y + h * 0.45, w * 0.72, h * 0.05);
    c.fillStyle = '#f2d98a';
    c.beginPath();
    c.ellipse(cx, y + h * 0.36, w * 0.3, h * 0.07, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#c99a2e';
    c.fillRect(cx - w * 0.04, y + h * 0.26, w * 0.08, h * 0.08);
  } else if (kind === 'phin') {
    // A coffee filter on a glass: dark drops when running.
    c.fillStyle = 'rgba(220,240,255,0.75)';
    c.fillRect(cx - w * 0.2, y + h * 0.52, w * 0.4, h * 0.38);
    c.fillStyle = '#5a3216';
    c.fillRect(
      cx - w * 0.18,
      y + h * (phase === 'idle' ? 0.86 : 0.7),
      w * 0.36,
      h * (phase === 'idle' ? 0.04 : 0.2),
    );
    gloss(c, '#c9ced6', '#7b828e', cx, y + h * 0.42, w * 0.26, h * 0.12);
    c.fillStyle = '#9aa1ad';
    c.fillRect(cx - w * 0.22, y + h * 0.28, w * 0.44, h * 0.12);
    if (phase === 'run') {
      const k = (t * 1.4) % 1;
      c.fillStyle = '#3a1f0c';
      c.beginPath();
      c.arc(cx, y + h * (0.55 + k * 0.12), w * 0.025, 0, Math.PI * 2);
      c.fill();
    }
  } else {
    // Glass still: a round flask with a coil, drops when running.
    c.globalAlpha = 0.85;
    gloss(c, '#bfe8ff', '#5fa8d8', cx, y + h * 0.6, w * 0.28, h * 0.26);
    c.globalAlpha = 1;
    c.fillStyle = '#9fd4f2';
    c.fillRect(cx - w * 0.06, y + h * 0.2, w * 0.12, h * 0.2);
    c.strokeStyle = '#e8c45a';
    c.lineWidth = Math.max(2, w * 0.025);
    c.beginPath();
    for (let i = 0; i < 3; i++)
      c.arc(cx + w * 0.3, y + h * (0.38 + i * 0.09), w * 0.06, 0, Math.PI * 2);
    c.stroke();
    if (phase !== 'idle') {
      const k = (t * 1.6) % 1;
      c.fillStyle = '#7cc8ff';
      c.beginPath();
      c.arc(cx + w * 0.3, y + h * (0.66 + k * 0.2), w * 0.03, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}

function gloss(
  c: CanvasRenderingContext2D,
  light: string,
  dark: string,
  x: number,
  y: number,
  rx: number,
  ry: number,
) {
  const g = c.createRadialGradient(x - rx * 0.35, y - ry * 0.4, rx * 0.1, x, y, rx * 1.1);
  g.addColorStop(0, shade(light, 0.35));
  g.addColorStop(0.5, light);
  g.addColorStop(1, dark);
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#e8c45a';
  c.lineWidth = Math.max(1.5, rx * 0.06);
  c.stroke();
}

function trapezoid(
  c: CanvasRenderingContext2D,
  cx: number,
  y: number,
  wTop: number,
  wBottom: number,
  h: number,
) {
  c.beginPath();
  c.moveTo(cx - wTop / 2, y);
  c.lineTo(cx + wTop / 2, y);
  c.lineTo(cx + wBottom / 2, y + h);
  c.lineTo(cx - wBottom / 2, y + h);
  c.closePath();
  c.fill();
}

/** Floor number plate: a small wooden board on the rail. */
export function drawSign(c: CanvasRenderingContext2D, r: Rect, n: number) {
  const { x, y, w, h } = r;
  c.fillStyle = '#8a5a2b';
  roundRect(c, x, y, w, h, Math.min(w, h) * 0.2);
  c.fill();
  c.strokeStyle = '#e8c45a';
  c.lineWidth = Math.max(1.5, w * 0.06);
  c.stroke();
  c.fillStyle = '#fff6dc';
  c.font = `700 ${Math.round(h * 0.58)}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(String(n), x + w / 2, y + h / 2 + 1);
}

/** Ladybug seen from above, two frames (wing cases a little apart in frame 1). */
export function drawLadybug(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  frame: number,
) {
  c.save();
  c.translate(x, y);
  const open = frame ? s * 0.08 : 0;
  c.fillStyle = '#1d1d24';
  c.beginPath();
  c.arc(0, -s * 0.42, s * 0.22, 0, Math.PI * 2);
  c.fill();
  for (const side of [-1, 1]) {
    c.save();
    c.translate(side * open, 0);
    c.fillStyle = '#e2302b';
    c.beginPath();
    c.ellipse(side * s * 0.2, 0, s * 0.22, s * 0.38, side * 0.15, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#1d1d24';
    c.beginPath();
    c.arc(side * s * 0.22, -s * 0.08, s * 0.07, 0, Math.PI * 2);
    c.arc(side * s * 0.2, s * 0.18, s * 0.06, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.beginPath();
  c.arc(-s * 0.12, -s * 0.2, s * 0.05, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** A firefly: a warm glowing dot, pulsing. */
export function drawFirefly(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  t: number,
) {
  const k = 0.55 + 0.45 * Math.sin(t * 5);
  const g = c.createRadialGradient(x, y, 0, x, y, s * 2.2);
  g.addColorStop(0, `rgba(255,250,190,${0.95 * k})`);
  g.addColorStop(0.3, `rgba(220,255,120,${0.55 * k})`);
  g.addColorStop(1, 'rgba(200,255,120,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, s * 2.2, 0, Math.PI * 2);
  c.fill();
}

/** A soap-bubble badge over a ripe plant or a finished machine, with an icon inside. */
export function drawBubble(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  icon: CanvasImageSource | null,
  tint = '#ffffff',
) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.7, `${tint}cc`);
  g.addColorStop(1, 'rgba(255,255,255,0.55)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(232,196,90,0.95)';
  c.lineWidth = Math.max(1.5, r * 0.1);
  c.stroke();
  if (icon) c.drawImage(icon, x - r * 0.68, y - r * 0.68, r * 1.36, r * 1.36);
}

/** The village at the foot of the tower: hills, a few roofs and a market awning (stand-in). */
export function villageImage(w: number, h: number, dpr: number) {
  return cached('village', w * dpr, h * dpr, (c) => {
    c.scale(dpr, dpr);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#9fd68a');
    g.addColorStop(1, '#4f9a45');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, h * 0.45);
    for (let x = 0; x <= w; x += 20)
      c.lineTo(x, h * (0.35 + 0.12 * Math.sin(x * 0.012) + 0.05 * Math.sin(x * 0.041)));
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();
    c.fill();
    const houses = Math.max(3, Math.round(w / 160));
    for (let i = 0; i < houses; i++) {
      const hx = ((i + 0.5) * w) / houses + Math.sin(i * 7) * 20;
      const hy = h * 0.5 + (i % 2) * h * 0.08;
      const s = Math.min(46, h * 0.32);
      c.fillStyle = '#f4e6c8';
      c.fillRect(hx - s / 2, hy, s, s * 0.7);
      c.fillStyle = i % 3 === 2 ? '#d8413a' : '#4a6fa8';
      c.beginPath();
      c.moveTo(hx - s * 0.65, hy + 2);
      c.lineTo(hx, hy - s * 0.5);
      c.lineTo(hx + s * 0.65, hy + 2);
      c.closePath();
      c.fill();
      c.fillStyle = '#8a5a2b';
      c.fillRect(hx - s * 0.1, hy + s * 0.32, s * 0.2, s * 0.38);
    }
  });
}

/** Small "tạm" stamp on stand-in art. */
export function stampDraft(c: CanvasRenderingContext2D, x: number, y: number, label: string) {
  c.save();
  c.font = '600 10px system-ui, sans-serif';
  const w = c.measureText(label).width + 8;
  c.fillStyle = 'rgba(255,45,122,0.85)';
  roundRect(c, x, y, w, 14, 7);
  c.fill();
  c.fillStyle = '#fff';
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillText(label, x + 4, y + 7.5);
  c.restore();
}

export function roundRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const k = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}

/** Lighter (amount > 0) or darker hex colour. */
export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) =>
    Math.round(Math.max(0, Math.min(255, amount > 0 ? v + (255 - v) * amount : v * (1 + amount))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** A green caterpillar inching along (stand-in). */
export function drawCaterpillar(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  t: number,
) {
  const n = 5;
  for (let i = n - 1; i >= 0; i--) {
    const k = i / (n - 1);
    const bob = Math.sin(t * 6 - i * 0.9) * s * 0.06;
    c.fillStyle = i === 0 ? '#5aa83a' : i % 2 ? '#86cf4f' : '#74c046';
    c.beginPath();
    c.arc(x - s * 0.4 + k * s * 0.8, y + bob, s * (i === 0 ? 0.2 : 0.17), 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#1d1d24';
  c.beginPath();
  c.arc(x - s * 0.46, y - s * 0.05, s * 0.04, 0, Math.PI * 2);
  c.fill();
}

/** A dragonfly: long body, four glassy wings (stand-in). */
export function drawDragonfly(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  frame: number,
) {
  c.save();
  c.translate(x, y);
  c.fillStyle = 'rgba(200,235,255,0.6)';
  const spread = frame ? 0.25 : 0.05;
  for (const side of [-1, 1]) {
    for (const off of [-0.08, 0.12]) {
      c.beginPath();
      c.ellipse(side * s * 0.32, off * s, s * 0.34, s * 0.08, side * spread, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.fillStyle = '#2f7fc1';
  c.fillRect(-s * 0.04, -s * 0.2, s * 0.08, s * 0.7);
  c.beginPath();
  c.arc(0, -s * 0.24, s * 0.09, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** The gold beetle: a ladybug's shape in gold, with a glint. */
export function drawBeetle(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  frame: number,
) {
  c.save();
  c.translate(x, y);
  const open = frame ? s * 0.06 : 0;
  c.fillStyle = '#3a2a08';
  c.beginPath();
  c.arc(0, -s * 0.42, s * 0.2, 0, Math.PI * 2);
  c.fill();
  for (const side of [-1, 1]) {
    const g = c.createLinearGradient(side * s * 0.4, -s * 0.4, 0, s * 0.4);
    g.addColorStop(0, '#fff3b0');
    g.addColorStop(0.5, '#f2c230');
    g.addColorStop(1, '#a8740c');
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(side * (s * 0.2 + open), 0, s * 0.22, s * 0.38, side * 0.15, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.beginPath();
  c.arc(-s * 0.12, -s * 0.18, s * 0.06, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

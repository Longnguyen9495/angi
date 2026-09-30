// Renders the garden sprites: 10 crops × 4 growth stages + 10 produce icons + 4 decorations.
// Static raster output only (WebP with alpha) — the vector drawing below never ships.
// Usage: node scripts/generate-crop-sprites.mjs
// Output: public/images/garden/<crop>-<stage>.webp and <crop>-produce.webp (256×256).
// To swap in AI art later, drop same-named 256×256 transparent WebPs into that folder.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const outDir = join(root, 'public/images/garden');
mkdirSync(outDir, { recursive: true });

const SIZE = 256;
const BX = 128; // plant base x
const BY = 246; // plant base y (soil line)

/** Deterministic PRNG so re-running the script gives identical sprites. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => Number(n.toFixed(1));

const DEFS = `
<defs>
  <linearGradient id="leaf" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#3f7d2c"/><stop offset=".6" stop-color="#6fae45"/><stop offset="1" stop-color="#9fd06a"/>
  </linearGradient>
  <linearGradient id="leafDark" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#2d5e22"/><stop offset="1" stop-color="#5a9a3a"/>
  </linearGradient>
  <linearGradient id="leafLight" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#5e9e3a"/><stop offset="1" stop-color="#b7e07e"/>
  </linearGradient>
  <linearGradient id="gold" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#9a8a32"/><stop offset=".55" stop-color="#cdb44c"/><stop offset="1" stop-color="#ecd57a"/>
  </linearGradient>
  <linearGradient id="stem" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#4c7a2e"/><stop offset="1" stop-color="#7fb04f"/>
  </linearGradient>
  <linearGradient id="tube" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#3f8a36"/><stop offset=".45" stop-color="#8fd06e"/><stop offset="1" stop-color="#3a7a30"/>
  </linearGradient>
  <linearGradient id="bulb" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#d9d2bf"/><stop offset=".5" stop-color="#fbf7ec"/><stop offset="1" stop-color="#cfc6ae"/>
  </linearGradient>
  <linearGradient id="stake" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#8a6a3a"/><stop offset=".5" stop-color="#c9a468"/><stop offset="1" stop-color="#7a5a2e"/>
  </linearGradient>
  <linearGradient id="chili" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#8e1a12"/><stop offset=".45" stop-color="#e2412b"/><stop offset=".7" stop-color="#ff7a5c"/><stop offset="1" stop-color="#a52316"/>
  </linearGradient>
  <linearGradient id="pod" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#8fae3a"/><stop offset=".5" stop-color="#dcef8a"/><stop offset="1" stop-color="#7f9e30"/>
  </linearGradient>
  <radialGradient id="tomato" cx=".38" cy=".35" r=".7">
    <stop offset="0" stop-color="#ff8a6a"/><stop offset=".45" stop-color="#e2412b"/><stop offset="1" stop-color="#8e1f12"/>
  </radialGradient>
  <radialGradient id="tomatoGreen" cx=".38" cy=".35" r=".7">
    <stop offset="0" stop-color="#d8ec8a"/><stop offset=".5" stop-color="#8fbf4a"/><stop offset="1" stop-color="#4f7a2a"/>
  </radialGradient>
  <linearGradient id="grass" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#6f9a4a"/><stop offset=".6" stop-color="#a6c878"/><stop offset="1" stop-color="#cfe39e"/>
  </linearGradient>
  <linearGradient id="lgBase" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#b78aa6"/><stop offset=".5" stop-color="#e8e2c9"/><stop offset="1" stop-color="#b9d17f"/>
  </linearGradient>
  <linearGradient id="garlicLeaf" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#4f7f4a"/><stop offset="1" stop-color="#9cc48a"/>
  </linearGradient>
  <radialGradient id="garlic" cx=".4" cy=".35" r=".75">
    <stop offset="0" stop-color="#fffdf6"/><stop offset=".6" stop-color="#efe6d2"/><stop offset="1" stop-color="#c9b9a0"/>
  </radialGradient>
  <linearGradient id="cucumber" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#2f5e22"/><stop offset=".45" stop-color="#5f9a3a"/><stop offset="1" stop-color="#284f1c"/>
  </linearGradient>
  <radialGradient id="lime" cx=".38" cy=".35" r=".7">
    <stop offset="0" stop-color="#d8f08a"/><stop offset=".5" stop-color="#8cc43f"/><stop offset="1" stop-color="#4f7f22"/>
  </radialGradient>
  <linearGradient id="trunk" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#5a4028"/><stop offset=".5" stop-color="#8a6a48"/><stop offset="1" stop-color="#4f3822"/>
  </linearGradient>
  <linearGradient id="stakeH" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#c9a468"/><stop offset="1" stop-color="#7a5a2e"/>
  </linearGradient>
  <radialGradient id="lantern" cx=".4" cy=".4" r=".7">
    <stop offset="0" stop-color="#ffcf7a"/><stop offset=".45" stop-color="#e2412b"/><stop offset="1" stop-color="#8e1f12"/>
  </radialGradient>
  <radialGradient id="jar" cx=".35" cy=".35" r=".8">
    <stop offset="0" stop-color="#b8743f"/><stop offset=".6" stop-color="#7a4424"/><stop offset="1" stop-color="#3f2012"/>
  </radialGradient>
  <radialGradient id="egg" cx=".38" cy=".32" r=".75">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f3ead8"/><stop offset="1" stop-color="#d9ccb0"/>
  </radialGradient>
  <radialGradient id="eggBrown" cx=".38" cy=".32" r=".75">
    <stop offset="0" stop-color="#f3d2a8"/><stop offset=".7" stop-color="#d9a36a"/><stop offset="1" stop-color="#b07a44"/>
  </radialGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#cfe3ea"/><stop offset=".5" stop-color="#f4fbfd"/><stop offset="1" stop-color="#b9d2db"/>
  </linearGradient>
  <radialGradient id="shadow" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
  </radialGradient>
</defs>`;

/** Leaf pointing "up" from (x,y), rotated `angle` degrees (0 = straight up). */
function leaf(x, y, len, width, angle, fill = 'url(#leaf)', rib = true) {
  const w = width;
  const l = len;
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})">
    <path d="M0 0 C ${f(w)} ${f(-l * 0.2)}, ${f(w * 1.05)} ${f(-l * 0.7)}, 0 ${f(-l)} C ${f(-w * 1.05)} ${f(-l * 0.7)}, ${f(-w)} ${f(-l * 0.2)}, 0 0Z" fill="${fill}"/>
    ${rib ? `<path d="M0 -1 Q ${f(w * 0.12)} ${f(-l * 0.5)} 0 ${f(-l * 0.92)}" stroke="#264d1b" stroke-opacity=".45" stroke-width="${f(Math.max(0.8, w * 0.12))}" fill="none" stroke-linecap="round"/>` : ''}
  </g>`;
}

/** Thin arching blade (rice, grass) from base, bending towards `bend`. */
function blade(x, y, len, bend, width, fill = 'url(#leaf)') {
  const tipX = x + bend;
  const tipY = y - len;
  const cX = x + bend * 0.15;
  const cY = y - len * 0.65;
  return `<path d="M ${f(x - width)} ${f(y)} Q ${f(cX - width * 0.6)} ${f(cY)} ${f(tipX)} ${f(tipY)} Q ${f(cX + width * 0.6)} ${f(cY)} ${f(x + width)} ${f(y)} Z" fill="${fill}"/>`;
}

function stemPath(d, width, color = 'url(#stem)') {
  return `<path d="${d}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" fill="none"/>`;
}

function shadow(w = 70) {
  return `<ellipse cx="${BX}" cy="${BY + 2}" rx="${w}" ry="${f(w * 0.16)}" fill="url(#shadow)"/>`;
}

function stake(height) {
  const top = BY - height;
  let nodes = '';
  for (let y = BY - 30; y > top + 10; y -= 38) {
    nodes += `<rect x="${BX - 5}" y="${y}" width="10" height="3" rx="1.5" fill="#6d4f25" opacity=".7"/>`;
  }
  return `<rect x="${BX - 4}" y="${top}" width="8" height="${height}" rx="3" fill="url(#stake)"/>${nodes}`;
}

function flower5(x, y, r, petal, center) {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    s += `<ellipse cx="${f(x + Math.cos(a) * r * 0.55)}" cy="${f(y + Math.sin(a) * r * 0.55)}" rx="${f(r * 0.5)}" ry="${f(r * 0.34)}" transform="rotate(${f((a * 180) / Math.PI + 90)} ${f(x + Math.cos(a) * r * 0.55)} ${f(y + Math.sin(a) * r * 0.55)})" fill="${petal}"/>`;
  }
  return s + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.28)}" fill="${center}"/>`;
}

function cotyledons(len, width, spread = 52, stemH = 22) {
  const top = BY - stemH;
  return (
    stemPath(`M ${BX} ${BY} Q ${BX + 2} ${BY - stemH / 2} ${BX} ${top}`, 3.5) +
    leaf(BX, top, len, width, -spread, 'url(#leafLight)') +
    leaf(BX, top, len, width, spread, 'url(#leaf)')
  );
}

// ——— Crops ———

function rice(stage) {
  const r = rng(11 + stage.length);
  const conf = {
    sprout: { n: 5, len: [52, 72], fill: 'url(#leafLight)' },
    young: { n: 11, len: [85, 120], fill: 'url(#leaf)' },
    flowering: { n: 14, len: [120, 150], fill: 'url(#leaf)' },
    ready: { n: 14, len: [125, 155], fill: 'url(#gold)' },
  }[stage];
  let s = shadow(stage === 'sprout' ? 30 : 60);
  const blades = [];
  for (let i = 0; i < conf.n; i++) {
    const t = conf.n === 1 ? 0.5 : i / (conf.n - 1);
    const len = conf.len[0] + r() * (conf.len[1] - conf.len[0]);
    const bend = (t - 0.5) * (stage === 'sprout' ? 30 : 90) + (r() - 0.5) * 18;
    blades.push({ x: BX + (t - 0.5) * (stage === 'sprout' ? 8 : 22), len, bend });
  }
  // Back blades darker, front lighter.
  blades.forEach((b, i) => {
    const fill = i % 3 === 0 && stage !== 'ready' ? 'url(#leafDark)' : conf.fill;
    s += blade(b.x, BY, b.len, b.bend, stage === 'sprout' ? 2.4 : 3.4, fill);
  });
  if (stage === 'flowering' || stage === 'ready') {
    const heads = stage === 'ready' ? 5 : 3;
    for (let h = 0; h < heads; h++) {
      const t = heads === 1 ? 0.5 : h / (heads - 1);
      const x0 = BX + (t - 0.5) * 16;
      const topY = BY - (stage === 'ready' ? 170 : 175) + r() * 16;
      const droop = stage === 'ready' ? (t - 0.5) * 70 + (t < 0.5 ? -18 : 18) : (t - 0.5) * 22;
      const tipX = x0 + droop;
      const tipY = stage === 'ready' ? topY + 40 : topY - 10;
      const cx = x0 + droop * 0.3;
      const cy = topY - 20;
      s += stemPath(
        `M ${f(x0)} ${BY - 20} L ${f(x0 + droop * 0.1)} ${f(topY + 10)} Q ${f(cx)} ${f(cy)} ${f(tipX)} ${f(tipY)}`,
        2,
        stage === 'ready' ? '#b89a3a' : '#7fa845',
      );
      // Grains along the upper curve.
      for (let g = 0; g < 11; g++) {
        const u = 0.25 + (g / 10) * 0.75;
        const px = (1 - u) * (1 - u) * (x0 + droop * 0.1) + 2 * (1 - u) * u * cx + u * u * tipX;
        const py = (1 - u) * (1 - u) * (topY + 10) + 2 * (1 - u) * u * cy + u * u * tipY;
        const side = g % 2 ? 4 : -4;
        s += `<ellipse cx="${f(px + side)}" cy="${f(py)}" rx="2.6" ry="4.6" transform="rotate(${f(side * 6 + droop * 0.4)} ${f(px + side)} ${f(py)})" fill="${stage === 'ready' ? '#e8c55a' : '#b9d77a'}" stroke="${stage === 'ready' ? '#a8872c' : '#7d9f45'}" stroke-width=".6"/>`;
      }
    }
  }
  return s;
}

function herbs(stage) {
  const r = rng(23 + stage.length);
  if (stage === 'sprout') return shadow(34) + cotyledons(32, 17, 58, 30);
  const conf = {
    young: { stems: 1, pairs: 3, h: 95, size: 26 },
    flowering: { stems: 3, pairs: 4, h: 150, size: 30 },
    ready: { stems: 5, pairs: 5, h: 165, size: 34 },
  }[stage];
  let s = shadow(conf.stems === 1 ? 40 : 72);
  let flowers = '';
  for (let k = 0; k < conf.stems; k++) {
    const t = conf.stems === 1 ? 0.5 : k / (conf.stems - 1);
    const lean = (t - 0.5) * (conf.stems > 3 ? 90 : 60);
    const h = conf.h * (1 - Math.abs(t - 0.5) * 0.35) + (r() - 0.5) * 14;
    const x1 = BX + lean;
    const y1 = BY - h;
    s += stemPath(
      `M ${BX + (t - 0.5) * 10} ${BY} Q ${f(BX + lean * 0.2)} ${f(BY - h * 0.6)} ${f(x1)} ${f(y1)}`,
      3.6,
    );
    for (let p = 0; p < conf.pairs; p++) {
      const u = 0.3 + (p / conf.pairs) * 0.7;
      const px = BX + (t - 0.5) * 10 + (x1 - BX) * u * u;
      const py = BY - h * u;
      const sz = conf.size * (1.1 - u * 0.45);
      const fill = p % 2 ? 'url(#leaf)' : 'url(#leafLight)';
      s += leaf(px, py, sz, sz * 0.46, -62 - r() * 20 + lean * 0.2, fill);
      s += leaf(
        px,
        py,
        sz,
        sz * 0.46,
        62 + r() * 20 + lean * 0.2,
        p % 2 ? 'url(#leafLight)' : 'url(#leaf)',
      );
    }
    // Crown of small leaves at the tip.
    s += leaf(x1, y1 + 4, conf.size * 0.6, conf.size * 0.28, lean * 0.4 - 18, 'url(#leafLight)');
    s += leaf(x1, y1 + 4, conf.size * 0.6, conf.size * 0.28, lean * 0.4 + 18, 'url(#leafLight)');
    if (stage !== 'young' && k % 2 === 0) {
      // Purple basil flower spike above the crown.
      for (let q = 0; q < 6; q++) {
        const fy = y1 - 6 - q * 5.5;
        flowers += `<ellipse cx="${f(x1 + lean * 0.05 - 3)}" cy="${f(fy)}" rx="3.2" ry="2.4" fill="#b58bd6"/><ellipse cx="${f(x1 + lean * 0.05 + 3)}" cy="${f(fy - 2)}" rx="3.2" ry="2.4" fill="#9d72c4"/>`;
      }
    }
  }
  return s + flowers;
}

function chiliPod(x, y, len, angle) {
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})">
    <path d="M -5 2 C -7 ${f(len * 0.4)}, -2 ${f(len * 0.85)}, 3 ${f(len)} C 4 ${f(len * 0.7)}, 7 ${f(len * 0.35)}, 5 2 Z" fill="url(#chili)"/>
    <path d="M -2 6 C -3 ${f(len * 0.4)}, -1 ${f(len * 0.7)}, 1 ${f(len * 0.85)}" stroke="#fff" stroke-opacity=".35" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M -6 3 Q 0 -3 6 3 Q 0 6 -6 3Z" fill="#4f8a2e"/>
    <path d="M 0 0 Q 2 -6 0 -10" stroke="#5a9a3a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </g>`;
}

function chili(stage) {
  const r = rng(37 + stage.length);
  if (stage === 'sprout') return shadow(34) + cotyledons(36, 11, 50, 34);
  const conf = {
    young: { h: 105, branches: 2, leaves: 8 },
    flowering: { h: 160, branches: 4, leaves: 14 },
    ready: { h: 175, branches: 4, leaves: 16 },
  }[stage];
  let s = shadow(conf.branches > 2 ? 70 : 44);
  const top = BY - conf.h;
  s += stemPath(`M ${BX} ${BY} Q ${BX - 4} ${f(BY - conf.h * 0.5)} ${BX + 2} ${f(top)}`, 5);
  const tips = [[BX + 2, top]];
  for (let b = 0; b < conf.branches; b++) {
    const side = b % 2 ? 1 : -1;
    const y0 = BY - conf.h * (0.35 + (b / conf.branches) * 0.45);
    const x1 = BX + side * (38 + r() * 18);
    const y1 = y0 - 30 - r() * 20;
    s += stemPath(`M ${BX} ${f(y0)} Q ${f(BX + side * 18)} ${f(y0 - 6)} ${f(x1)} ${f(y1)}`, 3.4);
    tips.push([x1, y1]);
  }
  let leaves = '';
  for (let i = 0; i < conf.leaves; i++) {
    const [tx, ty] = tips[i % tips.length];
    const u = 0.35 + r() * 0.65;
    const x = BX + (tx - BX) * u;
    const y = BY - (BY - ty) * (0.4 + u * 0.6);
    const angle = (tx >= BX ? 1 : -1) * (35 + r() * 55) + (r() - 0.5) * 20;
    leaves += leaf(
      x,
      y,
      22 + r() * 12,
      7 + r() * 2,
      angle,
      i % 3 ? 'url(#leaf)' : 'url(#leafDark)',
    );
  }
  s += leaves;
  if (stage === 'flowering') {
    tips.forEach(([x, y], i) => {
      s += flower5(x + (i % 2 ? 6 : -6), y + 14, 7, '#fbf8ef', '#e6c34a');
      s += flower5(x + (i % 2 ? -8 : 8), y + 26, 6, '#f3efe2', '#e6c34a');
    });
  }
  if (stage === 'ready') {
    tips.forEach(([x, y], i) => {
      s += chiliPod(x + (i % 2 ? 4 : -4), y + 12, 30 + r() * 10, (i % 2 ? -1 : 1) * (8 + r() * 14));
      if (i > 0) s += chiliPod(x + (i % 2 ? -14 : 14), y + 22, 26 + r() * 8, (i % 2 ? 1 : -1) * 12);
    });
  }
  return s;
}

function scallion(stage) {
  const r = rng(41 + stage.length);
  const conf = {
    sprout: { n: 4, h: [52, 68], w: 5 },
    young: { n: 6, h: [95, 125], w: 5.6 },
    flowering: { n: 7, h: [120, 150], w: 6 },
    ready: { n: 9, h: [150, 190], w: 6.4 },
  }[stage];
  let s = shadow(stage === 'sprout' ? 22 : 46);
  for (let i = 0; i < conf.n; i++) {
    const t = conf.n === 1 ? 0.5 : i / (conf.n - 1);
    const h = conf.h[0] + r() * (conf.h[1] - conf.h[0]);
    const x0 = BX + (t - 0.5) * (conf.w * conf.n * 0.55);
    const lean = (t - 0.5) * 40 + (r() - 0.5) * 12;
    const tipX = x0 + lean;
    const tipY = BY - h;
    s += `<path d="M ${f(x0)} ${BY - 6} Q ${f(x0 + lean * 0.2)} ${f(BY - h * 0.6)} ${f(tipX)} ${f(tipY)}" stroke="url(#tube)" stroke-width="${conf.w}" stroke-linecap="round" fill="none"/>`;
    // Lighter, slightly bent tip.
    s += `<path d="M ${f(tipX)} ${f(tipY + 8)} L ${f(tipX + lean * 0.05)} ${f(tipY)}" stroke="#c4e89a" stroke-width="${f(conf.w * 0.6)}" stroke-linecap="round"/>`;
  }
  if (stage === 'ready' || stage === 'flowering') {
    // White bulb bundle showing above the soil.
    s += `<path d="M ${BX - 16} ${BY} C ${BX - 18} ${BY - 16}, ${BX - 8} ${BY - 30}, ${BX} ${BY - 34} C ${BX + 8} ${BY - 30}, ${BX + 18} ${BY - 16}, ${BX + 16} ${BY} Z" fill="url(#bulb)"/>`;
    for (let k = -2; k <= 2; k++) {
      s += `<path d="M ${BX + k * 5} ${BY} Q ${BX + k * 4} ${BY - 18} ${BX + k * 2} ${BY - 30}" stroke="#bdb49a" stroke-opacity=".5" stroke-width="1" fill="none"/>`;
    }
  }
  if (stage === 'flowering') {
    const fx = BX + 6;
    const fy = BY - 175;
    s += `<path d="M ${BX + 2} ${BY - 20} Q ${BX + 6} ${BY - 100} ${fx} ${fy}" stroke="url(#tube)" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    for (let k = 0; k < 34; k++) {
      const a = r() * Math.PI * 2;
      const rr = Math.sqrt(r()) * 15;
      s += `<circle cx="${f(fx + Math.cos(a) * rr)}" cy="${f(fy + Math.sin(a) * rr)}" r="${f(2 + r() * 1.6)}" fill="${k % 3 ? '#f7f3e6' : '#e2dccb'}"/>`;
    }
  }
  return s;
}

function trifoliate(x, y, size, angle, fill) {
  return (
    leaf(x, y, size, size * 0.42, angle, fill) +
    leaf(x, y, size * 0.8, size * 0.36, angle - 55, fill) +
    leaf(x, y, size * 0.8, size * 0.36, angle + 55, fill)
  );
}

function beanPod(x, y, len, angle) {
  let bumps = '';
  for (let k = 0; k < 4; k++) {
    bumps += `<ellipse cx="0" cy="${f(6 + (k * (len - 12)) / 3)}" rx="3.2" ry="4" fill="#b4e27c" opacity=".55"/>`;
  }
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})">
    <path d="M -4 0 C -7 ${f(len * 0.3)}, -6 ${f(len * 0.8)}, 1 ${f(len)} C 6 ${f(len * 0.8)}, 7 ${f(len * 0.3)}, 4 0 Z" fill="url(#pod)"/>
    ${bumps}
    <path d="M 0 0 Q 2 -5 0 -9" stroke="#4f8a2e" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>`;
}

function bean(stage) {
  const r = rng(53 + stage.length);
  if (stage === 'sprout') {
    // Thick heart-shaped first leaves on a hooked stem.
    return (
      shadow(34) +
      stemPath(`M ${BX} ${BY} Q ${BX + 6} ${BY - 20} ${BX} ${BY - 36}`, 5) +
      leaf(BX, BY - 36, 36, 19, -48, 'url(#leafLight)') +
      leaf(BX, BY - 36, 36, 19, 48, 'url(#leaf)')
    );
  }
  const conf = {
    young: { h: 110, stakeH: 150, nodes: 3 },
    flowering: { h: 180, stakeH: 200, nodes: 5 },
    ready: { h: 195, stakeH: 205, nodes: 5 },
  }[stage];
  let s = shadow(54) + stake(conf.stakeH);
  // Vine winding around the stake.
  let d = `M ${BX} ${BY}`;
  const steps = 10;
  for (let k = 1; k <= steps; k++) {
    const y = BY - (conf.h * k) / steps;
    const x = BX + (k % 2 ? 9 : -9);
    d += ` Q ${f(x * 1 + (k % 2 ? 6 : -6))} ${f(y + conf.h / steps / 2)} ${f(x)} ${f(y)}`;
  }
  s += stemPath(d, 3.2);
  let pods = '';
  for (let n = 0; n < conf.nodes; n++) {
    const y = BY - conf.h * (0.25 + (n / conf.nodes) * 0.72);
    const side = n % 2 ? 1 : -1;
    s += stemPath(`M ${BX} ${f(y)} q ${side * 12} -2 ${side * 18} -10`, 2.2);
    s += trifoliate(
      BX + side * 18,
      y - 10,
      30 + r() * 6,
      side * (50 + r() * 20),
      n % 2 ? 'url(#leaf)' : 'url(#leafLight)',
    );
    if (stage === 'flowering' && n > 0) {
      s += `<ellipse cx="${f(BX - side * 14)}" cy="${f(y + 4)}" rx="6" ry="4.5" fill="#c58ad8"/><ellipse cx="${f(BX - side * 12)}" cy="${f(y)}" rx="4" ry="3.4" fill="#e6c5ef"/>`;
    }
    if (stage === 'ready' && n > 0) {
      pods += beanPod(BX - side * 12, y + 2, 42 + r() * 10, side * (8 + r() * 10));
      if (n % 2) pods += beanPod(BX - side * 24, y + 8, 36 + r() * 8, side * 20);
    }
  }
  return s + pods;
}

function tomatoFruit(x, y, rr, ripe) {
  let calyx = '';
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
    calyx += `<path d="M ${f(x)} ${f(y - rr + 2)} L ${f(x + Math.cos(a) * rr * 0.6)} ${f(y - rr + 2 + Math.sin(a) * rr * 0.35 + 3)}" stroke="#3f7d2c" stroke-width="2.2" stroke-linecap="round"/>`;
  }
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="url(#${ripe ? 'tomato' : 'tomatoGreen'})"/>
  <ellipse cx="${f(x - rr * 0.35)}" cy="${f(y - rr * 0.4)}" rx="${f(rr * 0.25)}" ry="${f(rr * 0.15)}" fill="#fff" opacity=".45"/>${calyx}`;
}

function tomato(stage) {
  const r = rng(67 + stage.length);
  if (stage === 'sprout') return shadow(34) + cotyledons(34, 9, 55, 34);
  const conf = {
    young: { h: 110, stakeH: 140, nodes: 4 },
    flowering: { h: 170, stakeH: 190, nodes: 6 },
    ready: { h: 185, stakeH: 195, nodes: 6 },
  }[stage];
  let s = shadow(64) + stake(conf.stakeH);
  s += stemPath(
    `M ${BX + 3} ${BY} Q ${BX + 10} ${f(BY - conf.h * 0.5)} ${BX + 5} ${f(BY - conf.h)}`,
    5,
  );
  // Ties to the stake.
  for (let y = BY - 50; y > BY - conf.h; y -= 55) {
    s += `<path d="M ${BX - 5} ${y} q 8 4 14 -1" stroke="#e8dcc0" stroke-width="2" fill="none"/>`;
  }
  const fruitSpots = [];
  for (let n = 0; n < conf.nodes; n++) {
    const y = BY - conf.h * (0.2 + (n / conf.nodes) * 0.78);
    const side = n % 2 ? 1 : -1;
    const len = 46 - n * 3;
    const ex = BX + 6 + side * len;
    const ey = y - 12;
    s += stemPath(
      `M ${BX + 6} ${f(y)} Q ${f(BX + 6 + side * len * 0.5)} ${f(y - 16)} ${f(ex)} ${f(ey)}`,
      2.6,
    );
    // Compound leaf: leaflets along the branch.
    for (let k = 0; k < 4; k++) {
      const u = 0.3 + k * 0.22;
      const px = BX + 6 + side * len * u;
      const py = y - 10 * u - 4;
      s += leaf(px, py, 15 - k, 7, side * 20 - 40, 'url(#leaf)', false);
      s += leaf(px, py, 15 - k, 7, side * 20 + 140, 'url(#leafDark)', false);
    }
    s += leaf(ex, ey, 15, 7, side * 70, 'url(#leafLight)', false);
    fruitSpots.push([BX + 6 + side * len * 0.45, y + 10, side]);
  }
  if (stage === 'flowering') {
    fruitSpots.slice(1).forEach(([x, y]) => {
      s += flower5(x, y, 6.5, '#f4d03f', '#c99a1c');
      s += flower5(x + 9, y + 6, 5.5, '#f7dc5c', '#c99a1c');
    });
  }
  if (stage === 'ready') {
    fruitSpots.slice(1).forEach(([x, y, side], i) => {
      s += stemPath(`M ${f(x)} ${f(y - 8)} l ${side * 4} 6`, 1.8, '#4c7a2e');
      s += tomatoFruit(x, y + 6, 11 + r() * 3, true);
      s += tomatoFruit(x + side * 17, y + 12, 9 + r() * 2, i % 3 !== 1);
    });
  }
  return s;
}

// ——— Crops opened by level (sả, tỏi, dưa leo, chanh) ———

function lemongrass(stage) {
  const r = rng(71 + stage.length);
  const conf = {
    sprout: { n: 4, len: [52, 68] },
    young: { n: 9, len: [100, 130] },
    flowering: { n: 12, len: [135, 160] },
    ready: { n: 14, len: [150, 180] },
  }[stage];
  let s = shadow(stage === 'sprout' ? 26 : 58);
  for (let i = 0; i < conf.n; i++) {
    const t = conf.n === 1 ? 0.5 : i / (conf.n - 1);
    const len = conf.len[0] + r() * (conf.len[1] - conf.len[0]);
    // Lemongrass blades arch out widely and droop at the tips.
    const bend = (t - 0.5) * 150 + (r() - 0.5) * 24;
    s += blade(
      BX + (t - 0.5) * 14,
      BY - 20,
      len,
      bend,
      4.6,
      i % 3 ? 'url(#grass)' : 'url(#leafDark)',
    );
  }
  if (stage !== 'sprout') {
    // Pale, purple-tinged stalk bases.
    const n = stage === 'young' ? 3 : 5;
    for (let k = 0; k < n; k++) {
      const x = BX + (k - (n - 1) / 2) * 7;
      s += `<path d="M ${x} ${BY} L ${x + (k - 2) * 1.5} ${BY - 44}" stroke="url(#lgBase)" stroke-width="8" stroke-linecap="round"/>`;
    }
  }
  if (stage === 'flowering') {
    for (let k = 0; k < 2; k++) {
      const x = BX + (k ? 10 : -12);
      s += stemPath(
        `M ${x} ${BY - 40} Q ${x + (k ? 8 : -8)} ${BY - 150} ${x + (k ? 20 : -18)} ${BY - 205}`,
        1.8,
        '#a8a060',
      );
      for (let q = 0; q < 8; q++) {
        s += `<ellipse cx="${f(x + (k ? 18 : -16) - q * (k ? 1.2 : -1.2))}" cy="${f(BY - 200 + q * 8)}" rx="6" ry="2.4" fill="#d8c98f" opacity=".85" transform="rotate(${k ? -30 : 30} ${f(x + (k ? 18 : -16))} ${f(BY - 200 + q * 8)})"/>`;
      }
    }
  }
  return s;
}

function garlic(stage) {
  const r = rng(83 + stage.length);
  const conf = {
    sprout: { n: 3, len: [44, 60] },
    young: { n: 6, len: [95, 120] },
    flowering: { n: 7, len: [115, 140] },
    ready: { n: 7, len: [110, 135] },
  }[stage];
  let s = shadow(stage === 'sprout' ? 24 : 46);
  for (let i = 0; i < conf.n; i++) {
    const t = conf.n === 1 ? 0.5 : i / (conf.n - 1);
    const len = conf.len[0] + r() * (conf.len[1] - conf.len[0]);
    const bend = (t - 0.5) * 70 + (r() - 0.5) * 16;
    const fill = stage === 'ready' && i % 2 ? 'url(#gold)' : 'url(#garlicLeaf)';
    s += blade(BX + (t - 0.5) * 8, BY - (stage === 'ready' ? 30 : 4), len, bend, 3.6, fill);
  }
  if (stage === 'flowering') {
    // The curling scape with its pointed flower bud.
    s += `<path d="M ${BX} ${BY - 10} C ${BX + 4} ${BY - 120}, ${BX + 50} ${BY - 150}, ${BX + 30} ${BY - 185} C ${BX + 14} ${BY - 205}, ${BX - 10} ${BY - 185}, ${BX + 4} ${BY - 172}" stroke="url(#stem)" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M ${BX + 4} ${BY - 172} q -8 -10 -2 -26 q 10 12 2 26 Z" fill="#dfe9c6"/>`;
  }
  if (stage === 'ready') s += garlicBulb(BX, BY - 12, 30, false);
  return s;
}

function garlicBulb(x, y, rr, roots = true) {
  let cloves = '';
  for (let k = -2; k <= 2; k++) {
    cloves += `<path d="M ${f(x + k * rr * 0.28)} ${f(y + rr * 0.8)} Q ${f(x + k * rr * 0.42)} ${f(y)} ${f(x + k * rr * 0.12)} ${f(y - rr * 0.85)}" stroke="#cbbfa6" stroke-width="1.2" fill="none"/>`;
  }
  const rootLines = roots
    ? `<path d="M ${x - 8} ${f(y + rr * 0.95)} q -4 10 -9 14 M ${x} ${f(y + rr)} q 0 10 1 15 M ${x + 8} ${f(y + rr * 0.95)} q 4 10 9 13" stroke="#cdbf9a" stroke-width="1.6" fill="none"/>`
    : '';
  return `${rootLines}<path d="M ${x} ${f(y - rr * 1.1)} C ${f(x + rr * 0.3)} ${f(y - rr * 0.7)}, ${f(x + rr * 1.1)} ${f(y - rr * 0.3)}, ${f(x + rr)} ${f(y + rr * 0.35)} C ${f(x + rr * 0.9)} ${f(y + rr)}, ${f(x - rr * 0.9)} ${f(y + rr)}, ${f(x - rr)} ${f(y + rr * 0.35)} C ${f(x - rr * 1.1)} ${f(y - rr * 0.3)}, ${f(x - rr * 0.3)} ${f(y - rr * 0.7)}, ${x} ${f(y - rr * 1.1)} Z" fill="url(#garlic)"/>
  ${cloves}<path d="M ${f(x - rr * 0.5)} ${f(y + rr * 0.2)} q ${f(rr * 0.2)} ${f(-rr * 0.6)} ${f(rr * 0.1)} ${f(-rr)}" stroke="#b58ab8" stroke-opacity=".5" stroke-width="2" fill="none"/>`;
}

function cucumberFruit(x, y, len, angle) {
  let dots = '';
  for (let k = 0; k < 6; k++) {
    dots += `<circle cx="${k % 2 ? 2 : -2}" cy="${f(6 + (k * (len - 12)) / 5)}" r="1.1" fill="#d9ef9f" opacity=".7"/>`;
  }
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})">
    <rect x="-7" y="0" width="14" height="${f(len)}" rx="7" fill="url(#cucumber)"/>
    <path d="M -2 4 L -2 ${f(len - 6)}" stroke="#b9dc7c" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>
    ${dots}
    <path d="M 0 0 Q 3 -5 0 -9" stroke="#4f8a2e" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>`;
}

function tendril(x, y, side) {
  return `<path d="M ${x} ${y} q ${side * 10} -2 ${side * 12} -10 q 2 -8 ${side * -4} -8 q -5 0 ${side * -3} 5" stroke="#7fb04f" stroke-width="1.3" fill="none"/>`;
}

function cucumber(stage) {
  const r = rng(97 + stage.length);
  if (stage === 'sprout') return shadow(30) + cotyledons(30, 15, 55, 26);
  const conf = {
    young: { h: 110, stakeH: 150, nodes: 3 },
    flowering: { h: 175, stakeH: 200, nodes: 5 },
    ready: { h: 190, stakeH: 205, nodes: 5 },
  }[stage];
  let s = shadow(58) + stake(conf.stakeH);
  let d = `M ${BX} ${BY}`;
  for (let k = 1; k <= 8; k++) {
    const y = BY - (conf.h * k) / 8;
    const x = BX + (k % 2 ? 7 : -7);
    d += ` Q ${f(x + (k % 2 ? 5 : -5))} ${f(y + conf.h / 16)} ${f(x)} ${f(y)}`;
  }
  s += stemPath(d, 3.6);
  let fruit = '';
  for (let n = 0; n < conf.nodes; n++) {
    const y = BY - conf.h * (0.2 + (n / conf.nodes) * 0.75);
    const side = n % 2 ? 1 : -1;
    // Big, broad, slightly lobed leaves.
    s += stemPath(`M ${BX} ${f(y)} q ${side * 14} -2 ${side * 22} -12`, 2.4);
    s += leaf(
      BX + side * 22,
      y - 12,
      38 + r() * 6,
      22,
      side * 62,
      n % 2 ? 'url(#leaf)' : 'url(#leafDark)',
    );
    s += tendril(BX - side * 6, y - 20, -side);
    if (stage === 'flowering' && n > 0)
      s += flower5(BX - side * 16, y + 2, 8, '#f4d03f', '#d9a520');
    if (stage === 'ready' && n > 0) {
      fruit += cucumberFruit(BX - side * 14, y, 46 + r() * 10, side * (6 + r() * 8));
      if (n % 2 === 0) s += flower5(BX + side * 30, y - 30, 6, '#f4d03f', '#d9a520');
    }
  }
  return s + fruit;
}

function limeFruit(x, y, rr) {
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="url(#lime)"/>
  <ellipse cx="${f(x - rr * 0.35)}" cy="${f(y - rr * 0.35)}" rx="${f(rr * 0.28)}" ry="${f(rr * 0.18)}" fill="#fff" opacity=".4"/>`;
}

function lime(stage) {
  const r = rng(101 + stage.length);
  if (stage === 'sprout') return shadow(28) + cotyledons(30, 13, 52, 30);
  const conf = {
    young: { h: 110, branches: 3, leaves: 12 },
    flowering: { h: 170, branches: 5, leaves: 22 },
    ready: { h: 180, branches: 5, leaves: 24 },
  }[stage];
  let s = shadow(64);
  const top = BY - conf.h;
  s += stemPath(
    `M ${BX} ${BY} Q ${BX - 6} ${f(BY - conf.h * 0.45)} ${BX + 2} ${f(BY - conf.h * 0.55)}`,
    8,
    'url(#trunk)',
  );
  const tips = [];
  for (let b = 0; b < conf.branches; b++) {
    const t = conf.branches === 1 ? 0.5 : b / (conf.branches - 1);
    const x1 = BX + (t - 0.5) * 120 + (r() - 0.5) * 12;
    const y1 = top + Math.abs(t - 0.5) * 50 + r() * 12;
    s += stemPath(
      `M ${BX + 2} ${f(BY - conf.h * 0.55)} Q ${f(BX + (x1 - BX) * 0.3)} ${f(y1 + 30)} ${f(x1)} ${f(y1)}`,
      3.4,
      'url(#trunk)',
    );
    tips.push([x1, y1]);
  }
  // Dense rounded canopy of glossy oval leaves.
  let canopy = '';
  for (let i = 0; i < conf.leaves; i++) {
    const [tx, ty] = tips[i % tips.length];
    const a = r() * Math.PI * 2;
    const rr = 6 + r() * 24;
    canopy += leaf(
      tx + Math.cos(a) * rr,
      ty + Math.sin(a) * rr * 0.7 + 10,
      20 + r() * 6,
      8.5,
      (r() - 0.5) * 160,
      i % 3 ? 'url(#leafDark)' : 'url(#leaf)',
    );
  }
  s += canopy;
  if (stage === 'flowering') {
    tips.forEach(
      ([x, y], i) => (s += flower5(x + (i % 2 ? 10 : -10), y + 18, 6.5, '#fdfbf2', '#e8d36a')),
    );
  }
  if (stage === 'ready') {
    tips.forEach(([x, y], i) => {
      s += limeFruit(x + (i % 2 ? 8 : -8), y + 24, 10 + r() * 2);
      if (i % 2 === 0) s += limeFruit(x + (i % 2 ? -12 : 12), y + 34, 9 + r() * 2);
    });
  }
  return s;
}

// ——— Decorations sold at the market ———

function decor(id) {
  switch (id) {
    case 'scarecrow':
      return `<ellipse cx="128" cy="244" rx="48" ry="8" fill="url(#shadow)"/>
        <rect x="123" y="70" width="10" height="176" rx="4" fill="url(#stake)"/>
        <rect x="58" y="112" width="140" height="9" rx="4" fill="url(#stake)"/>
        <path d="M 96 108 L 160 108 L 170 176 L 86 176 Z" fill="#6f8fb3"/>
        <path d="M 86 176 L 170 176 L 164 196 L 92 196 Z" fill="#8a6a3a"/>
        <path d="M 70 116 l -14 18 M 186 116 l 14 18 M 64 116 l -4 22 M 192 116 l 4 22" stroke="#e2c46a" stroke-width="3" stroke-linecap="round"/>
        <circle cx="128" cy="86" r="22" fill="#e9d7a8"/>
        <circle cx="120" cy="84" r="2.6" fill="#3a2a1a"/><circle cx="136" cy="84" r="2.6" fill="#3a2a1a"/>
        <path d="M 120 94 q 8 6 16 0" stroke="#3a2a1a" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M 76 74 L 128 34 L 180 74 Z" fill="#e3c77a"/>
        <path d="M 76 74 L 128 34 L 180 74" stroke="#b8983f" stroke-width="2" fill="none"/>
        <path d="M 96 64 L 128 40 L 160 64" stroke="#c9ab55" stroke-width="1.2" fill="none"/>
        <rect x="112" y="140" width="10" height="10" fill="#c9663d" opacity=".8"/>`;
    case 'lantern':
      return `<ellipse cx="128" cy="244" rx="30" ry="6" fill="url(#shadow)"/>
        <rect x="124" y="20" width="8" height="226" rx="3" fill="url(#stake)"/>
        <path d="M 132 40 q 30 0 34 24" stroke="#6d4f25" stroke-width="4" fill="none"/>
        <line x1="166" y1="64" x2="166" y2="84" stroke="#3a2a1a" stroke-width="2"/>
        <rect x="150" y="82" width="32" height="8" rx="2" fill="#d7a85d"/>
        <path d="M 142 90 C 128 110, 128 150, 142 170 L 190 170 C 204 150, 204 110, 190 90 Z" fill="url(#lantern)"/>
        <path d="M 156 90 C 150 110, 150 150, 156 170 M 176 90 C 182 110, 182 150, 176 170" stroke="#8e1f12" stroke-opacity=".5" stroke-width="2" fill="none"/>
        <rect x="150" y="170" width="32" height="8" rx="2" fill="#d7a85d"/>
        <path d="M 166 178 l 0 26 M 160 180 l -2 24 M 172 180 l 2 24" stroke="#e6b24f" stroke-width="2"/>`;
    case 'jar':
      return `<ellipse cx="128" cy="240" rx="64" ry="10" fill="url(#shadow)"/>
        <path d="M 92 92 C 40 120, 44 222, 96 236 L 160 236 C 212 222, 216 120, 164 92 Z" fill="url(#jar)"/>
        <ellipse cx="128" cy="92" rx="38" ry="10" fill="#4a2c18"/>
        <ellipse cx="128" cy="90" rx="30" ry="7" fill="#1d2e36"/>
        <ellipse cx="120" cy="89" rx="12" ry="2.4" fill="#9cc9e2" opacity=".5"/>
        <path d="M 66 150 Q 128 170 190 150" stroke="#e2b27a" stroke-opacity=".35" stroke-width="3" fill="none"/>
        <ellipse cx="96" cy="140" rx="10" ry="24" fill="#fff" opacity=".12"/>`;
    case 'fence': {
      let posts = '';
      for (let k = 0; k < 6; k++) {
        const x = 30 + k * 40;
        posts += `<rect x="${x - 6}" y="${118 + (k % 2) * 8}" width="12" height="${124 - (k % 2) * 8}" rx="5" fill="url(#stake)"/>
          <rect x="${x - 6}" y="${150}" width="12" height="3" fill="#6d4f25" opacity=".7"/>
          <rect x="${x - 6}" y="${196}" width="12" height="3" fill="#6d4f25" opacity=".7"/>`;
      }
      return `<ellipse cx="128" cy="244" rx="120" ry="8" fill="url(#shadow)"/>${posts}
        <rect x="16" y="150" width="224" height="8" rx="4" fill="url(#stakeH)"/>
        <rect x="16" y="196" width="224" height="8" rx="4" fill="url(#stakeH)"/>`;
    }
  }
  return '';
}

// ——— Produce icons (harvest / pantry) ———

function produce(crop) {
  switch (crop) {
    case 'rice': {
      let grains = '';
      const r = rng(5);
      for (let k = 0; k < 70; k++) {
        const a = r() * Math.PI;
        const rr = Math.sqrt(r());
        const x = 128 + Math.cos(a) * rr * 74;
        const y = 150 - Math.sin(a) * rr * 44;
        grains += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="3" ry="6" transform="rotate(${f(r() * 180)} ${f(x)} ${f(y)})" fill="${k % 4 ? '#fbf8ef' : '#e9e2cf'}" stroke="#cfc6ae" stroke-width=".6"/>`;
      }
      return `<ellipse cx="128" cy="222" rx="84" ry="14" fill="url(#shadow)"/>
        <path d="M 40 150 Q 44 216 128 220 Q 212 216 216 150 Z" fill="#8a5a33"/>
        <path d="M 40 150 Q 44 216 128 220 Q 212 216 216 150" stroke="#5f3b20" stroke-width="3" fill="none"/>
        <path d="M 58 170 Q 128 200 198 170" stroke="#a8743f" stroke-width="3" fill="none"/>
        <ellipse cx="128" cy="150" rx="88" ry="14" fill="#6d4424"/>
        <path d="M 46 152 Q 128 88 210 152 Z" fill="#f4efe0"/>${grains}`;
    }
    case 'herbs': {
      let s = `<ellipse cx="128" cy="222" rx="70" ry="12" fill="url(#shadow)"/>`;
      const r = rng(9);
      for (let k = 0; k < 7; k++) {
        const a = -50 + k * 16 + (r() - 0.5) * 8;
        const len = 120 + r() * 30;
        const rad = (a * Math.PI) / 180;
        const tx = 128 + Math.sin(rad) * len;
        const ty = 210 - Math.cos(rad) * len;
        s += stemPath(`M 128 212 L ${f(tx)} ${f(ty)}`, 3.2);
        for (let q = 0; q < 3; q++) {
          const u = 0.45 + q * 0.25;
          const px = 128 + (tx - 128) * u;
          const py = 212 + (ty - 212) * u;
          s += leaf(
            px,
            py,
            30 - q * 4,
            14 - q * 2,
            a - 55,
            q % 2 ? 'url(#leaf)' : 'url(#leafLight)',
          );
          s += leaf(
            px,
            py,
            30 - q * 4,
            14 - q * 2,
            a + 55,
            q % 2 ? 'url(#leafLight)' : 'url(#leaf)',
          );
        }
        s += leaf(tx, ty + 6, 26, 12, a, 'url(#leafLight)');
      }
      return (
        s +
        `<rect x="112" y="188" width="32" height="12" rx="4" fill="#d9c08a"/><path d="M 116 194 h 24" stroke="#9c7b3d" stroke-width="2"/>`
      );
    }
    case 'chili':
      return `<ellipse cx="128" cy="220" rx="76" ry="12" fill="url(#shadow)"/>${chiliPod(96, 70, 130, -32)}${chiliPod(150, 64, 138, 26)}${chiliPod(126, 92, 112, 4)}`;
    case 'scallion': {
      let s = `<ellipse cx="128" cy="226" rx="70" ry="12" fill="url(#shadow)"/>`;
      for (let k = 0; k < 6; k++) {
        const x = 104 + k * 9;
        const lean = (k - 2.5) * 14;
        s += `<path d="M ${x} 180 Q ${x + lean * 0.3} 110 ${x + lean} 26" stroke="url(#tube)" stroke-width="8" stroke-linecap="round" fill="none"/>`;
        s += `<path d="M ${x} 214 L ${x} 176" stroke="url(#bulb)" stroke-width="10" stroke-linecap="round"/>`;
        s += `<path d="M ${x - 3} 218 q -3 8 -6 12 M ${x} 219 q 0 8 1 13 M ${x + 3} 218 q 3 8 6 11" stroke="#d8cfb6" stroke-width="1.4" fill="none"/>`;
      }
      return s + `<rect x="96" y="160" width="64" height="12" rx="5" fill="#c9a468"/>`;
    }
    case 'bean':
      return `<ellipse cx="128" cy="222" rx="80" ry="12" fill="url(#shadow)"/>${beanPod(84, 60, 150, -28)}${beanPod(172, 56, 156, 30)}
        <g transform="rotate(-6 128 150)"><path d="M 96 120 C 90 160, 110 200, 130 210 C 150 200, 170 160, 162 120 Z" fill="#6aa83c"/>
        <path d="M 104 124 C 100 160, 116 192, 130 200 C 144 192, 158 160, 154 124 Z" fill="#dff0b8"/>
        ${[136, 158, 180].map((y) => `<ellipse cx="129" cy="${y}" rx="11" ry="9" fill="#8fc75a" stroke="#5f9a35" stroke-width="1.2"/>`).join('')}</g>`;
    case 'tomato':
      return `<ellipse cx="128" cy="222" rx="78" ry="12" fill="url(#shadow)"/>${tomatoFruit(112, 142, 66, true)}${tomatoFruit(186, 184, 30, true)}
        ${stemPath('M 112 76 q 4 -18 16 -24', 5, '#4c7a2e')}`;
    case 'lemongrass': {
      let st = '<ellipse cx="128" cy="226" rx="70" ry="12" fill="url(#shadow)"/>';
      for (let k = 0; k < 5; k++) {
        const x = 100 + k * 14;
        const lean = (k - 2) * 10;
        st += `<path d="M ${x} 214 Q ${x + lean * 0.3} 120 ${x + lean} 30" stroke="url(#lgBase)" stroke-width="12" stroke-linecap="round" fill="none"/>`;
      }
      return st + '<rect x="90" y="150" width="76" height="12" rx="5" fill="#c9a468"/>';
    }
    case 'garlic':
      return `<ellipse cx="128" cy="226" rx="78" ry="12" fill="url(#shadow)"/>${garlicBulb(118, 140, 70)}
        <path d="M 196 176 C 214 190, 212 214, 190 220 C 176 212, 178 188, 196 176 Z" fill="url(#garlic)" stroke="#cbbfa6" stroke-width="1.4"/>`;
    case 'cucumber':
      return `<ellipse cx="128" cy="226" rx="84" ry="12" fill="url(#shadow)"/>${cucumberFruit(70, 60, 170, -40).replace('width="14"', 'width="34"').replace('x="-7"', 'x="-17"').replace('rx="7"', 'rx="17"')}
        ${[
          [176, 196],
          [206, 176],
          [150, 214],
        ]
          .map(
            ([x, y]) =>
              `<circle cx="${x}" cy="${y}" r="22" fill="#2f5e22"/><circle cx="${x}" cy="${y}" r="18" fill="#e8f3c4"/><circle cx="${x}" cy="${y}" r="10" fill="#cfe59a"/>`,
          )
          .join('')}`;
    case 'lime':
      return `<ellipse cx="128" cy="226" rx="80" ry="12" fill="url(#shadow)"/>${limeFruit(100, 140, 62)}
        <circle cx="188" cy="186" r="38" fill="#6e9e30"/><circle cx="188" cy="186" r="33" fill="#f1f7cf"/>
        ${Array.from({ length: 8 }, (_, k) => {
          const a = (k / 8) * Math.PI * 2;
          return `<path d="M 188 186 L ${f(188 + Math.cos(a) * 30)} ${f(186 + Math.sin(a) * 30)}" stroke="#d2e79a" stroke-width="2.4"/>`;
        }).join('')}
        <circle cx="188" cy="186" r="30" fill="#c9e27a" opacity=".35"/>`;
    case 'egg':
      return `<ellipse cx="128" cy="222" rx="86" ry="12" fill="url(#shadow)"/>
        <path d="M 40 170 Q 128 250 216 170 Q 206 214 128 222 Q 50 214 40 170 Z" fill="#b8864a"/>
        ${[
          [70, 176],
          [96, 190],
          [128, 196],
          [160, 190],
          [186, 176],
          [110, 182],
          [148, 182],
        ]
          .map(
            ([x, y]) =>
              `<path d="M ${x - 14} ${y} q 14 -8 28 0" stroke="#d9b370" stroke-width="3" fill="none"/>`,
          )
          .join('')}
        <ellipse cx="100" cy="132" rx="38" ry="48" fill="url(#egg)" transform="rotate(-12 100 132)"/>
        <ellipse cx="160" cy="138" rx="36" ry="46" fill="url(#eggBrown)" transform="rotate(10 160 138)"/>
        <ellipse cx="88" cy="112" rx="10" ry="16" fill="#fff" opacity=".6" transform="rotate(-20 88 112)"/>
        <ellipse cx="150" cy="118" rx="9" ry="14" fill="#fff" opacity=".35" transform="rotate(10 150 118)"/>`;
    case 'milk':
      return `<ellipse cx="128" cy="226" rx="70" ry="12" fill="url(#shadow)"/>
        <path d="M 102 40 L 154 40 L 154 70 Q 184 92 184 128 L 184 206 Q 184 222 168 222 L 88 222 Q 72 222 72 206 L 72 128 Q 72 92 102 70 Z" fill="url(#glass)"/>
        <path d="M 78 120 Q 78 100 104 84 L 152 84 Q 178 100 178 120 L 178 206 Q 178 216 166 216 L 90 216 Q 78 216 78 206 Z" fill="#fbf8ef"/>
        <rect x="98" y="30" width="60" height="16" rx="5" fill="#5f97b7"/>
        <rect x="88" y="140" width="80" height="44" rx="8" fill="#c9663d"/>
        <path d="M 108 170 q 20 -26 40 0" stroke="#fbf8ef" stroke-width="5" fill="none" stroke-linecap="round"/>
        <rect x="86" y="96" width="8" height="100" rx="4" fill="#fff" opacity=".55"/>`;
  }
  return '';
}

const DRAW = { rice, herbs, chili, scallion, bean, tomato, lemongrass, garlic, cucumber, lime };
const DECOR = ['scarecrow', 'lantern', 'jar', 'fence'];
const PRODUCTS = ['egg', 'milk'];
const STAGES = ['sprout', 'young', 'flowering', 'ready'];

let count = 0;
for (const [crop, draw] of Object.entries(DRAW)) {
  const jobs = STAGES.map((stage) => [`${crop}-${stage}`, draw(stage)]);
  jobs.push([`${crop}-produce`, produce(crop)]);
  for (const [name, body] of jobs) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE * 2}" height="${SIZE * 2}" viewBox="0 0 ${SIZE} ${SIZE}">${DEFS}${body}</svg>`;
    await sharp(Buffer.from(svg))
      .resize(SIZE, SIZE)
      .webp({ quality: 88, alphaQuality: 92, effort: 6 })
      .toFile(join(outDir, `${name}.webp`));
    count++;
  }
}
for (const id of PRODUCTS) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE * 2}" height="${SIZE * 2}" viewBox="0 0 ${SIZE} ${SIZE}">${DEFS}${produce(id)}</svg>`;
  await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE)
    .webp({ quality: 88, alphaQuality: 92, effort: 6 })
    .toFile(join(outDir, `${id}-produce.webp`));
  count++;
}
for (const id of DECOR) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE * 2}" height="${SIZE * 2}" viewBox="0 0 ${SIZE} ${SIZE}">${DEFS}${decor(id)}</svg>`;
  await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE)
    .webp({ quality: 88, alphaQuality: 92, effort: 6 })
    .toFile(join(outDir, `decor-${id}.webp`));
  count++;
}
console.log(`Rendered ${count} garden sprites into public/images/garden/`);

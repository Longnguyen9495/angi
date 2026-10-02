import { memo, useMemo } from 'react';
import {
  BufferAttribute,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  PlaneGeometry,
  SphereGeometry,
  type BufferGeometry,
} from 'three';
import type { CropId } from '../../../data/types';
import type { PlotStage } from '../../../domain/selectors';
import { rng } from '../layout';
import { kitMaterial, prop, type Kit } from './kit';
import { C } from './materials';

type Stage = Exclude<PlotStage, 'empty'>;

/*
 * Plants built from curved leaves, stems and fruit — one merged geometry per
 * crop and stage (one draw call per plant). A mature plant is ~1 unit tall.
 * Ripe crops are told apart by their produce (red tomatoes, hanging chillies,
 * golden drooping rice heads), not by a glow.
 */

/** A curved, tapered leaf blade: base at the origin, growing along +y, bending toward +z. */
function leafGeometry(len: number, w: number, curl: number, segs = 5): BufferGeometry {
  const g = new PlaneGeometry(w, len, 2, segs);
  g.translate(0, len / 2, 0);
  const pos = g.attributes.position as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = y / len;
    const width = Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)), 0.75);
    const x = pos.getX(i) * width;
    // Midrib fold (a shallow V) and a bend toward the tip.
    const fold = Math.abs(x) * 0.35;
    pos.setXYZ(i, x, y * (1 - t * curl * 0.25), curl * t * t * len + fold);
  }
  return g;
}

interface LeafOpts {
  at?: [number, number, number];
  len: number;
  w: number;
  /** Direction around the stem (radians). */
  yaw: number;
  /** Tilt from vertical toward the outside (radians). */
  tilt: number;
  curl?: number;
  color: string;
}

function leaf(k: Kit, o: LeafOpts) {
  // Lean out first, then turn around the stem, so every leaf tilts away from the centre.
  const g = leafGeometry(o.len, o.w, o.curl ?? 0.5);
  g.rotateX(o.tilt);
  g.rotateY(o.yaw);
  k.add(g, o.color, {
    at: o.at ?? [0, 0, 0],
    vary: 0.08,
    ao: 0.3,
  });
}

function stem(
  k: Kit,
  h: number,
  r = 0.022,
  color: string = C.leafDark,
  at: [number, number, number] = [0, 0, 0],
) {
  k.add(new CylinderGeometry(r * 0.75, r, h, 5), color, {
    at: [at[0], at[1] + h / 2, at[2]],
    ao: 0.3,
  });
}

function stake(k: Kit, h: number) {
  k.add(new CylinderGeometry(0.018, 0.024, h, 5), C.woodLight, {
    at: [0.13, h / 2, -0.04],
    vary: 0.05,
  });
  k.add(new CylinderGeometry(0.03, 0.03, 0.02, 5), '#c9b26a', { at: [0.13, h * 0.6, -0.04] });
}

function ball(k: Kit, at: [number, number, number], r: number, color: string, squash = 1) {
  k.add(new SphereGeometry(r, 8, 6), color, { at, scale: [1, squash, 1], vary: 0.05 });
}

/** A rosette of leaves around the stem. */
function rosette(
  k: Kit,
  r: () => number,
  o: {
    n: number;
    y: number;
    len: number;
    w: number;
    tilt: number;
    curl?: number;
    colors: string[];
  },
) {
  for (let i = 0; i < o.n; i++) {
    leaf(k, {
      at: [0, o.y, 0],
      len: o.len * (0.85 + r() * 0.3),
      w: o.w,
      yaw: (i / o.n) * Math.PI * 2 + r() * 0.5,
      tilt: o.tilt + (r() - 0.5) * 0.3,
      curl: o.curl,
      color: o.colors[i % o.colors.length]!,
    });
  }
}

const GREENS: string[] = [C.leaf, C.leafDark, C.leafLight];

type Builder = (k: Kit, s: Exclude<Stage, 'sprout'>, r: () => number) => void;

/** Modelled plants: the first ten crops. Others are drawn from their 2D sprite (see Crop below). */
const PLANTS: Partial<Record<CropId, Builder>> = {
  rice: (k, s, r) => {
    const n = s === 'young' ? 9 : 13;
    const len = s === 'young' ? 0.5 : 0.78;
    for (let i = 0; i < n; i++) {
      const gold = s === 'ready' && i % 3 !== 0;
      leaf(k, {
        len: len * (0.8 + r() * 0.35),
        w: 0.035,
        yaw: r() * Math.PI * 2,
        tilt: 0.12 + r() * 0.35,
        curl: 0.6,
        color: gold ? '#c9ae4f' : i % 2 ? C.leaf : '#5f9a3f',
      });
    }
    if (s === 'young') return;
    // Panicles: arching strings of grains, heavy and golden when ripe.
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2 + r();
      const droop = s === 'ready' ? 1.1 : 0.45;
      for (let g = 0; g < 7; g++) {
        const t = g / 6;
        const x = Math.cos(a) * (0.05 + t * 0.16);
        const z = Math.sin(a) * (0.05 + t * 0.16);
        const y = 0.72 + t * 0.12 - t * t * droop * 0.3;
        ball(k, [x, y, z], 0.024, s === 'ready' ? '#e3bf54' : '#b9d27a', 1.4);
      }
    }
  },
  herbs: (k, s, r) => {
    const big = s !== 'young';
    rosette(k, r, {
      n: big ? 8 : 5,
      y: 0.02,
      len: big ? 0.3 : 0.22,
      w: 0.16,
      tilt: 1.0,
      curl: 0.3,
      colors: GREENS,
    });
    rosette(k, r, {
      n: big ? 6 : 4,
      y: 0.1,
      len: big ? 0.26 : 0.18,
      w: 0.14,
      tilt: 0.6,
      curl: 0.35,
      colors: [C.leafLight, C.leaf],
    });
    if (big) rosette(k, r, { n: 4, y: 0.2, len: 0.2, w: 0.12, tilt: 0.3, colors: [C.leafLight] });
    if (s === 'flowering' || s === 'ready') {
      for (let i = 0; i < (s === 'ready' ? 5 : 3); i++) {
        const a = r() * Math.PI * 2;
        const x = Math.cos(a) * 0.09;
        const z = Math.sin(a) * 0.09;
        stem(k, 0.36, 0.012, C.leafDark, [x, 0.1, z]);
        k.add(new ConeGeometry(0.035, 0.14, 6), s === 'ready' ? '#8e6cc4' : C.purple, {
          at: [x, 0.52, z],
          vary: 0.1,
        });
      }
    }
  },
  chili: (k, s, r) => {
    const h = s === 'young' ? 0.42 : 0.62;
    stem(k, h, 0.026);
    for (const [y, sp] of [
      [0.18, 0.6],
      [0.34, 0.8],
      [h - 0.06, 1.0],
    ] as [number, number][]) {
      for (let i = 0; i < 4; i++) {
        leaf(k, {
          at: [0, y, 0],
          len: 0.16 * sp + 0.06,
          w: 0.09,
          yaw: i * 1.7 + y * 9,
          tilt: 1.0,
          curl: 0.4,
          color: GREENS[i % 3]!,
        });
      }
    }
    if (s === 'flowering')
      for (let i = 0; i < 5; i++)
        ball(k, [(r() - 0.5) * 0.3, 0.3 + r() * 0.3, (r() - 0.5) * 0.3], 0.025, C.white);
    if (s === 'ready') {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + r() * 0.4;
        const d = 0.12 + r() * 0.08;
        k.add(new ConeGeometry(0.028, 0.2, 7), i % 4 === 3 ? '#4f8a2e' : C.red, {
          at: [Math.cos(a) * d, 0.24 + (i % 3) * 0.12, Math.sin(a) * d],
          rot: [Math.PI + Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35],
          vary: 0.05,
        });
      }
    }
  },
  scallion: (k, s, r) => {
    const n = s === 'young' ? 6 : 9;
    const h = s === 'young' ? 0.48 : 0.78;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.4;
      const tilt = 0.06 + r() * 0.2;
      const hh = h * (0.8 + r() * 0.3);
      const off = 0.03 + (Math.sin(tilt) * hh) / 2;
      k.add(new CylinderGeometry(0.012, 0.024, hh, 6), i % 2 ? '#6fb453' : '#4f9a3f', {
        at: [Math.cos(a) * off, hh / 2, Math.sin(a) * off],
        rot: [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt],
        vary: 0.06,
      });
    }
    if (s !== 'young')
      k.add(new CylinderGeometry(0.07, 0.08, 0.1, 8), '#eef0dc', { at: [0, 0.05, 0] });
    if (s === 'flowering') ball(k, [0.04, h + 0.06, 0], 0.07, '#eef0dc');
  },
  bean: (k, s, r) => {
    const h = s === 'young' ? 0.7 : 1.05;
    stake(k, h);
    const n = s === 'young' ? 5 : 9;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const a = t * Math.PI * 5;
      const at: [number, number, number] = [
        0.13 + Math.cos(a) * 0.06,
        0.1 + t * (h - 0.15),
        -0.04 + Math.sin(a) * 0.06,
      ];
      leaf(k, {
        at,
        len: 0.17,
        w: 0.14,
        yaw: a + Math.PI / 2,
        tilt: 1.1,
        curl: 0.3,
        color: GREENS[i % 3]!,
      });
      leaf(k, {
        at,
        len: 0.14,
        w: 0.12,
        yaw: a - 1.2,
        tilt: 1.2,
        curl: 0.3,
        color: GREENS[(i + 1) % 3]!,
      });
    }
    if (s === 'flowering')
      for (let i = 0; i < 4; i++)
        ball(
          k,
          [0.13 + (r() - 0.5) * 0.24, 0.35 + i * 0.16, -0.04 + (r() - 0.5) * 0.2],
          0.03,
          C.purple,
        );
    if (s === 'ready') {
      for (let i = 0; i < 6; i++) {
        const a = r() * Math.PI * 2;
        k.add(new CapsuleGeometry(0.022, 0.22, 2, 6), '#9cc34f', {
          at: [0.13 + Math.cos(a) * 0.13, 0.3 + i * 0.12, -0.04 + Math.sin(a) * 0.13],
          rot: [Math.sin(a) * 0.3, 0, 0.25],
          vary: 0.06,
        });
      }
    }
  },
  tomato: (k, s, r) => {
    const h = s === 'young' ? 0.6 : 0.95;
    stake(k, h + 0.05);
    stem(k, h, 0.028);
    const tiers = s === 'young' ? 3 : 5;
    for (let i = 0; i < tiers; i++) {
      const y = 0.12 + (i / tiers) * (h - 0.1);
      for (let j = 0; j < 3; j++) {
        const yaw = j * 2.1 + i * 0.9;
        leaf(k, {
          at: [0, y, 0],
          len: 0.2,
          w: 0.11,
          yaw,
          tilt: 1.15,
          curl: 0.5,
          color: GREENS[(i + j) % 3]!,
        });
        leaf(k, {
          at: [0, y, 0],
          len: 0.14,
          w: 0.09,
          yaw: yaw + 0.5,
          tilt: 1.35,
          curl: 0.4,
          color: C.leafDark,
        });
      }
    }
    if (s === 'flowering')
      for (let i = 0; i < 6; i++)
        ball(k, [(r() - 0.5) * 0.3, 0.35 + r() * 0.45, (r() - 0.5) * 0.3], 0.028, C.yellow);
    if (s === 'ready') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + r() * 0.5;
        const d = 0.13 + r() * 0.06;
        const at: [number, number, number] = [
          Math.cos(a) * d,
          0.28 + (i % 3) * 0.18,
          Math.sin(a) * d,
        ];
        ball(k, at, 0.075, i === 4 ? '#e59a3a' : '#d8392a', 0.85);
        k.add(new ConeGeometry(0.035, 0.03, 5), '#4a7d35', { at: [at[0], at[1] + 0.065, at[2]] });
      }
    }
  },
  lemongrass: (k, s, r) => {
    const n = s === 'young' ? 8 : 13;
    const len = s === 'young' ? 0.6 : 0.95;
    for (let i = 0; i < n; i++) {
      leaf(k, {
        at: [0, 0.08, 0],
        len: len * (0.75 + r() * 0.4),
        w: 0.045,
        yaw: r() * Math.PI * 2,
        tilt: 0.2 + r() * 0.35,
        curl: 1.1,
        color: i % 3 ? '#a6c878' : '#86a85e',
      });
    }
    k.add(new CylinderGeometry(0.06, 0.085, s === 'young' ? 0.12 : 0.24, 8), '#dcc9c4', {
      at: [0, s === 'young' ? 0.06 : 0.12, 0],
      vary: 0.05,
    });
  },
  garlic: (k, s, r) => {
    const n = s === 'young' ? 5 : 7;
    for (let i = 0; i < n; i++) {
      const yellow = s === 'ready' && i % 2 === 0;
      leaf(k, {
        len: (s === 'young' ? 0.45 : 0.6) * (0.8 + r() * 0.3),
        w: 0.05,
        yaw: (i / n) * Math.PI * 2,
        tilt: 0.25 + r() * 0.3,
        curl: 0.7,
        color: yellow ? '#c9b35a' : '#7fae6a',
      });
    }
    if (s === 'flowering') {
      stem(k, 0.8, 0.012, '#7fae6a');
      ball(k, [0, 0.82, 0], 0.05, '#dfe9c6');
    }
    if (s === 'ready') ball(k, [0, 0.07, 0], 0.12, '#f3ecdc', 0.8);
  },
  cucumber: (k, s, r) => {
    const h = s === 'young' ? 0.7 : 1.05;
    stake(k, h);
    const n = s === 'young' ? 3 : 6;
    for (let i = 0; i < n; i++) {
      const a = i * 2.2;
      leaf(k, {
        at: [0.13 + Math.cos(a) * 0.05, 0.12 + i * (h / (n + 1)), -0.04 + Math.sin(a) * 0.05],
        len: 0.24,
        w: 0.26,
        yaw: a,
        tilt: 1.05,
        curl: 0.35,
        color: GREENS[i % 3]!,
      });
    }
    if (s === 'flowering')
      for (let i = 0; i < 3; i++)
        ball(k, [0.13 + (r() - 0.5) * 0.3, 0.4 + i * 0.2, (r() - 0.5) * 0.25], 0.04, C.yellow);
    if (s === 'ready') {
      for (let i = 0; i < 3; i++) {
        const a = r() * Math.PI * 2;
        k.add(new CapsuleGeometry(0.045, 0.2, 3, 7), '#3f7a2c', {
          at: [0.13 + Math.cos(a) * 0.16, 0.32 + i * 0.2, -0.04 + Math.sin(a) * 0.16],
          rot: [0, 0, 0.12],
          vary: 0.05,
        });
      }
    }
  },
  lime: (k, s, r) => {
    const young = s === 'young';
    k.add(new CylinderGeometry(0.035, 0.05, young ? 0.45 : 0.62, 6), C.woodDark, {
      at: [0, young ? 0.22 : 0.31, 0],
    });
    const top = young ? 0.5 : 0.75;
    const clumps = young ? 3 : 5;
    for (let i = 0; i < clumps; i++) {
      const a = (i / clumps) * Math.PI * 2;
      const sc = young ? 0.16 : 0.22;
      k.add(new IcosahedronGeometry(1, 1), GREENS[i % 3]!, {
        at: [Math.cos(a) * sc * 0.8, top + (i % 2) * 0.1, Math.sin(a) * sc * 0.8],
        scale: [sc * 1.1, sc * 0.85, sc],
        rough: 0.04,
        vary: 0.1,
        ao: 0.35,
      });
    }
    if (s === 'flowering')
      for (let i = 0; i < 6; i++)
        ball(k, [(r() - 0.5) * 0.45, top + r() * 0.2, (r() - 0.5) * 0.45], 0.03, C.white);
    if (s === 'ready') {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        ball(
          k,
          [Math.cos(a) * 0.3, top - 0.06 + (i % 3) * 0.09, Math.sin(a) * 0.3],
          0.055,
          '#9ccf4a',
          1.1,
        );
      }
    }
  },
};

function seedling(k: Kit) {
  stem(k, 0.12, 0.014, C.leafLight);
  leaf(k, {
    at: [0, 0.11, 0],
    len: 0.1,
    w: 0.08,
    yaw: 0,
    tilt: 1.1,
    curl: 0.2,
    color: C.leafLight,
  });
  leaf(k, {
    at: [0, 0.11, 0],
    len: 0.1,
    w: 0.08,
    yaw: Math.PI,
    tilt: 1.1,
    curl: 0.2,
    color: C.leaf,
  });
}

function cropGeometry(crop: CropId, stage: Stage): BufferGeometry {
  return prop(`crop-${stage === 'sprout' ? 'sprout' : `${crop}-${stage}`}`, (k) => {
    if (stage === 'sprout') seedling(k);
    else PLANTS[crop]?.(k, stage, rng(crop.length * 31 + stage.length));
  });
}

/** One plant of `crop` at `stage` (a single cached geometry per crop and stage). */
export const CropModel = memo(function CropModel({ crop, stage }: { crop: CropId; stage: Stage }) {
  const geo = useMemo(() => cropGeometry(crop, stage), [crop, stage]);
  return <mesh geometry={geo} material={kitMaterial({ side: 'double' })} castShadow />;
});

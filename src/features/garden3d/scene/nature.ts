import {
  BufferAttribute,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../layout';
import { patchMaterial, prop, type Kit } from './kit';
import { C } from './materials';

/*
 * Nature props for the diorama, each built once (kit → one geometry) and
 * reused through instancing. Variants differ by seed so repeats don't read
 * as copies; instances add scale, turn and a colour tint on top.
 */

const PINE_GREENS = ['#44713a', '#4f7d3c', '#3d6534', '#5a8a44'];
const LEAF_GREENS = ['#6a9f45', '#7fae4e', '#93a24a', '#5e8f3c', '#9cc567'];

/** Tiered pine: drooping, uneven skirts of needles around a visible trunk. */
export function pine(variant: number): BufferGeometry {
  return prop(`pine${variant}`, (k) => {
    const r = rng(100 + variant * 13);
    k.add(new CylinderGeometry(0.1, 0.17, 1.2, 7), C.woodDark, {
      surf: 'bark',
      at: [0, 0.6, 0],
      ao: 0.45,
      rough: 0.03,
    });
    const tiers = 4 + (variant % 2);
    for (let i = 0; i < tiers; i++) {
      const t = i / (tiers - 1);
      const rad = 0.95 - t * 0.62 + (r() - 0.5) * 0.08;
      const h = 0.78 - t * 0.2;
      const y = 0.85 + i * 0.5;
      k.add(
        new ConeGeometry(rad, h, 9, 2, true),
        PINE_GREENS[(i + variant) % PINE_GREENS.length]!,
        {
          at: [(r() - 0.5) * 0.08, y, (r() - 0.5) * 0.08],
          rot: [(r() - 0.5) * 0.12, r() * 3, (r() - 0.5) * 0.12],
          rough: 0.12,
          vary: 0.12,
          ao: 0.35,
        },
      );
      // Solid underside so the skirt isn't see-through from below.
      k.add(new CylinderGeometry(rad * 0.92, rad * 0.4, 0.12, 9), '#34552d', {
        at: [0, y - h / 2 + 0.04, 0],
        rough: 0.06,
      });
    }
    k.add(new ConeGeometry(0.16, 0.42, 7), PINE_GREENS[1]!, {
      at: [0, 0.85 + tiers * 0.5 - 0.05, 0],
      rough: 0.04,
    });
  });
}

interface Clump {
  c: [number, number, number];
  s: [number, number, number];
  color: string;
}

/** Where a broadleaf tree's branches end and its leaf clumps sit (shared by core and cards). */
function broadPlan(variant: number) {
  const r = rng(200 + variant * 29);
  const forks: { tip: [number, number, number]; a: number; tilt: number; len: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + r() * 0.8;
    const tilt = 0.55 + r() * 0.3;
    const len = 0.75 + r() * 0.3;
    forks.push({
      tip: [
        Math.sin(tilt) * Math.cos(a) * len,
        1.25 + Math.cos(tilt) * len,
        Math.sin(tilt) * Math.sin(a) * len,
      ],
      a,
      tilt,
      len,
    });
  }
  const clumps: Clump[] = [];
  const n = 5 + (variant % 3);
  for (let i = 0; i < n; i++) {
    const f = forks[i % forks.length]!.tip;
    const s = 0.46 + r() * 0.3;
    clumps.push({
      c: [f[0] + (r() - 0.5) * 0.5, f[1] + (r() - 0.3) * 0.45, f[2] + (r() - 0.5) * 0.5],
      s: [s * (1 + r() * 0.25), s * 0.8, s],
      color: LEAF_GREENS[(i + variant) % LEAF_GREENS.length]!,
    });
  }
  return { forks, clumps };
}

function bushPlan(variant: number): Clump[] {
  const r = rng(300 + variant * 7);
  const n = 3 + (variant % 2);
  return Array.from({ length: n }, (_, i) => {
    const s = 0.26 + r() * 0.16;
    return {
      c: [(r() - 0.5) * 0.55, s * 0.75, (r() - 0.5) * 0.45] as [number, number, number],
      s: [s * 1.2, s, s] as [number, number, number],
      color: LEAF_GREENS[(i + variant * 2) % LEAF_GREENS.length]!,
    };
  });
}

/** Broadleaf tree: forked trunk and a dark inner canopy (the leaf cards sit around it). */
export function broadleaf(variant: number): BufferGeometry {
  return prop(`broad${variant}`, (k) => {
    const { forks, clumps } = broadPlan(variant);
    k.add(new CylinderGeometry(0.12, 0.2, 1.3, 8), C.woodDark, {
      surf: 'bark',
      at: [0, 0.65, 0],
      ao: 0.45,
      rough: 0.03,
    });
    for (const f of forks) {
      k.add(new CylinderGeometry(0.05, 0.09, f.len, 7), C.woodDark, {
        surf: 'bark',
        at: [f.tip[0] / 2, 1.25 + (f.tip[1] - 1.25) / 2, f.tip[2] / 2],
        rot: [Math.sin(f.a) * f.tilt, 0, -Math.cos(f.a) * f.tilt],
      });
    }
    for (const c of clumps) {
      k.add(new IcosahedronGeometry(1, 1), '#3f6a31', {
        at: c.c,
        scale: [c.s[0] * 0.72, c.s[1] * 0.72, c.s[2] * 0.72],
        rough: 0.12,
        vary: 0.1,
        ao: 0.4,
        surf: 'leaf',
      });
    }
  });
}

/** Low shrub: a dark core under its leaf cards. */
export function bush(variant: number): BufferGeometry {
  return prop(`bush${variant}`, (k) => {
    for (const c of bushPlan(variant)) {
      k.add(new IcosahedronGeometry(1, 1), '#44703a', {
        at: c.c,
        scale: [c.s[0] * 0.78, c.s[1] * 0.78, c.s[2] * 0.78],
        rough: 0.1,
        vary: 0.1,
        ao: 0.5,
        surf: 'leaf',
      });
    }
  });
}

let leafTex: CanvasTexture | null = null;

/** A cluster of painted leaves on transparency, drawn once at runtime (no image files). */
function leafTexture(): CanvasTexture {
  if (leafTex) return leafTex;
  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  if (ctx) {
    const r = rng(4242);
    const dark = [63, 106, 47];
    const light = [168, 204, 108];
    const n = 190;
    for (let i = 0; i < n; i++) {
      // Denser in the middle; later (upper) leaves are lighter, like sun on the outer canopy.
      const ang = r() * Math.PI * 2;
      const rad = Math.sqrt(r()) * size * 0.44;
      const x = size / 2 + Math.cos(ang) * rad;
      const y = size / 2 + Math.sin(ang) * rad;
      const t = Math.min(1, i / n + (r() - 0.5) * 0.35 + ((size / 2 - y) / size) * 0.4);
      const c = dark.map((d, j) => Math.round(d + (light[j]! - d) * Math.max(0, t)));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r() * Math.PI * 2);
      const lx = 8 + r() * 9;
      const ly = 3.5 + r() * 3.5;
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, lx, ly, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,70,30,0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-lx * 0.8, 0);
      ctx.lineTo(lx * 0.8, 0);
      ctx.stroke();
      ctx.restore();
    }
  }
  leafTex = new CanvasTexture(cv);
  leafTex.colorSpace = SRGBColorSpace;
  leafTex.anisotropy = 4;
  return leafTex;
}

let cardMat: MeshStandardMaterial | null = null;

/** Alpha-cut leaf cards: gaps between leaves, cut-out shadows, sway in the wind. */
export function leafCardMaterial(): MeshStandardMaterial {
  if (cardMat) return cardMat;
  cardMat = new MeshStandardMaterial({
    map: leafTexture(),
    alphaTest: 0.45,
    side: 2,
    vertexColors: true,
    roughness: 0.85,
    metalness: 0,
  });
  patchMaterial(cardMat, 0.02, false);
  return cardMat;
}

/**
 * Crossed leaf cards around each clump. Normals point out from the canopy's
 * centre, so light wraps the whole crown like one soft volume.
 */
function cardsFor(clumps: Clump[], seed: number, per = 4): BufferGeometry {
  const r = rng(seed);
  const center = new Vector3();
  clumps.forEach((c) => center.add(new Vector3(...c.c)));
  center.divideScalar(Math.max(1, clumps.length));
  center.y -= 0.25;
  const parts: BufferGeometry[] = [];
  const v = new Vector3();
  for (const c of clumps) {
    for (let i = 0; i < per; i++) {
      const g = new PlaneGeometry(c.s[0] * 2.5, c.s[1] * 2.6);
      g.rotateX((r() - 0.5) * 1.0);
      g.rotateY((i / per) * Math.PI + r() * 0.4);
      g.translate(
        c.c[0] + (r() - 0.5) * 0.15,
        c.c[1] + (r() - 0.5) * 0.1,
        c.c[2] + (r() - 0.5) * 0.15,
      );
      const pos = g.attributes.position!;
      const nrm = g.attributes.normal!;
      const col = new Float32Array(pos.count * 3);
      const tone = 0.86 + r() * 0.24;
      for (let k = 0; k < pos.count; k++) {
        v.set(pos.getX(k), pos.getY(k), pos.getZ(k)).sub(center).normalize();
        nrm.setXYZ(k, v.x, v.y, v.z);
        // Lower leaves sit in the crown's own shade.
        const shade = tone * (0.78 + Math.min(1, Math.max(0, v.y * 0.5 + 0.5)) * 0.3);
        col.set([shade, shade, shade * 0.97], k * 3);
      }
      g.setAttribute('color', new BufferAttribute(col, 3));
      parts.push(g);
    }
  }
  const out = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  if (!out) throw new Error('leaf cards');
  out.computeBoundingSphere();
  return out;
}

const cardCache = new Map<string, BufferGeometry>();

export function broadleafCards(variant: number): BufferGeometry {
  const key = `bc${variant}`;
  let g = cardCache.get(key);
  if (!g) {
    g = cardsFor(broadPlan(variant).clumps, 900 + variant);
    cardCache.set(key, g);
  }
  return g;
}

export function bushCards(variant: number): BufferGeometry {
  const key = `bu${variant}`;
  let g = cardCache.get(key);
  if (!g) {
    g = cardsFor(bushPlan(variant), 950 + variant, 3);
    cardCache.set(key, g);
  }
  return g;
}

/** Chunky cliff rock (the island's underside is stacked from these). */
export function rock(variant: number): BufferGeometry {
  return prop(`rock${variant}`, (k) => {
    const tones = [C.rockWarm, C.rock, C.rockDark];
    k.add(new DodecahedronGeometry(1, 1), tones[variant % 3]!, {
      surf: 'stone',
      flat: true,
      scale: [1, 0.75, 1],
      rough: 0.32,
      vary: 0.12,
      ao: 0.3,
      seed: 400 + variant,
    });
  });
}

/** A flagstone: thick, soft-edged, slightly domed. */
export function flagstone(variant: number): BufferGeometry {
  return prop(`flag${variant}`, (k) => {
    const tones = ['#c8bba5', '#b9ad98', '#d2c6b0'];
    k.add(new CylinderGeometry(0.88, 1, 0.22, 7 + (variant % 3), 1), tones[variant % 3]!, {
      surf: 'stone',
      flat: true,
      rough: 0.1,
      vary: 0.08,
      ao: 0.35,
      seed: 500 + variant,
    });
    k.add(new CylinderGeometry(0.62, 0.86, 0.06, 7 + (variant % 3)), tones[(variant + 1) % 3]!, {
      surf: 'stone',
      flat: true,
      at: [0, 0.13, 0],
      rough: 0.06,
      seed: 510 + variant,
    });
  });
}

/** A tuft of grass blades, dark at the root and light at the tips. */
export function tuft(variant: number): BufferGeometry {
  return prop(`tuft${variant}`, (k) => {
    const r = rng(600 + variant * 5);
    const n = 6 + variant * 2;
    const greens = [C.grass, C.grassOlive, '#8fbf5a', C.grassDark];
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const h = 0.18 + r() * 0.2;
      const lean = 0.2 + r() * 0.35;
      k.add(new ConeGeometry(0.03, h, 3), greens[(i + variant) % greens.length]!, {
        scale: [1.5, 1, 0.55],
        at: [
          Math.cos(a) * 0.05 + (Math.cos(a) * h * lean) / 2,
          h / 2,
          Math.sin(a) * 0.05 + (Math.sin(a) * h * lean) / 2,
        ],
        rot: [Math.sin(a) * lean, 0, -Math.cos(a) * lean],
        ao: 0.28,
        vary: 0.1,
      });
    }
  });
}

const FLOWER_TONES: Record<string, [string, string]> = {
  white: ['#f7f2e6', '#f0d25a'],
  yellow: ['#f2cf4a', '#c98d2c'],
  pink: ['#ef9fb8', '#f7e3a0'],
  purple: ['#a98ad6', '#f3e2a3'],
};

/** A small clump of one kind of flower with leaves — placed in intentional groups. */
export function flowers(kind: keyof typeof FLOWER_TONES, variant: number): BufferGeometry {
  return prop(`fl-${kind}-${variant}`, (k) => {
    const r = rng(700 + variant * 11 + kind.length);
    const [petal, heart] = FLOWER_TONES[kind]!;
    const n = 4 + (variant % 3);
    for (let i = 0; i < n; i++) {
      const x = (r() - 0.5) * 0.4;
      const z = (r() - 0.5) * 0.4;
      const h = 0.14 + r() * 0.14;
      k.add(new CylinderGeometry(0.008, 0.012, h, 3), C.leafDark, { at: [x, h / 2, z] });
      k.add(new SphereGeometry(0.045, 6, 3), petal, {
        at: [x, h, z],
        scale: [1, 0.45, 1],
        vary: 0.05,
      });
      k.add(new SphereGeometry(0.018, 4, 2), heart, { at: [x, h + 0.015, z] });
    }
    for (let i = 0; i < 3; i++) {
      k.add(new SphereGeometry(0.08, 5, 3), C.leaf, {
        at: [(r() - 0.5) * 0.3, 0.03, (r() - 0.5) * 0.3],
        scale: [1.3, 0.35, 0.8],
        rot: [0, r() * 3, 0],
        ao: 0.3,
      });
    }
  });
}

/** Hanging roots and vines under the grass lip (one geometry for the whole rim). */
export function danglers(
  points: { x: number; y: number; z: number; len: number; vine: boolean }[],
) {
  return prop('danglers', (k: Kit) => {
    const r = rng(808);
    for (const p of points) {
      const segs = 4;
      let x = p.x;
      let y = p.y;
      let z = p.z;
      for (let s = 0; s < segs; s++) {
        const l = p.len / segs;
        const dx = (r() - 0.5) * 0.12;
        const dz = (r() - 0.5) * 0.12;
        k.add(
          new CylinderGeometry(p.vine ? 0.018 : 0.028, p.vine ? 0.022 : 0.035, l, 4),
          p.vine ? C.moss : '#5c3f2a',
          {
            at: [x + dx / 2, y - l / 2, z + dz / 2],
            rot: [dz * 2, 0, -dx * 2],
          },
        );
        if (p.vine && s % 2 === 1) {
          k.add(new SphereGeometry(0.06, 4, 2), C.leaf, {
            at: [x + dx, y - l, z + dz],
            scale: [1, 0.5, 1],
          });
        }
        x += dx;
        y -= l;
        z += dz;
      }
    }
  });
}

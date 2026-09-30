import {
  BoxGeometry,
  BufferAttribute,
  Color,
  Euler,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../layout';
import { detailUniforms, loadDetail } from './detail';

/*
 * A small "modelling kit" for the diorama. Every prop is assembled from
 * primitives, each part painted with its own colour (per-face variation and a
 * darker foot — a cheap baked ambient occlusion) and tagged with a surface
 * kind, then merged into ONE geometry. A detailed barn is one draw call.
 *
 * Surface detail is procedural, in the shader: wood grain runs along each
 * board's length, stone gets mottling and cracks, soil crumbs, leaves dapple,
 * lawn blades — no texture files, no visible tiling, faded out with distance
 * so nothing shimmers.
 */

export type Surface =
  'plain' | 'wood' | 'stone' | 'tile' | 'soil' | 'leaf' | 'straw' | 'grass' | 'bark' | 'fabric';

const SURFACE_ID: Record<Surface, number> = {
  plain: 0,
  wood: 1,
  stone: 2,
  tile: 3,
  soil: 4,
  leaf: 5,
  straw: 6,
  grass: 7,
  bark: 8,
  fabric: 9,
};

/** Encoded per vertex as id * 4 + axis (the part's long axis, for grain direction). */
export function surfCode(s: Surface, axis = 1): number {
  return SURFACE_ID[s] * 4 + axis;
}

export interface PartOptions {
  at?: [number, number, number];
  rot?: [number, number, number];
  scale?: number | [number, number, number];
  /** Per-face brightness variation, 0–0.3 (hand-painted look). */
  vary?: number;
  /** Darken the lowest part of this piece by up to this much (0–0.6). */
  ao?: number;
  /** Move vertices by up to this much (hand-cut, organic). */
  rough?: number;
  seed?: number;
  /** Surface kind for the shader detail; guessed from the colour when omitted. */
  surf?: Surface;
  /** Faceted shading (rocks, cut stone). Default: smooth across shared edges. */
  flat?: boolean;
}

const tmp = new Color();
const hsl = { h: 0, s: 0, l: 0 };
const m4 = new Matrix4();

/** Best guess of what a part is made of from its paint colour. */
function guessSurface(color: string): Surface {
  tmp.set(color).getHSL(hsl);
  const h = hsl.h * 360;
  if (hsl.l > 0.86) return 'plain';
  if (hsl.s < 0.2) return 'stone';
  if (h >= 68 && h <= 165) return 'leaf';
  if (h >= 40 && h < 68 && hsl.s > 0.35 && hsl.l > 0.45) return 'straw';
  if (h >= 16 && h < 45 && hsl.l < 0.72) return 'wood';
  return 'plain';
}

/** Jitter positions; vertices that share a spot move together, so no cracks open. */
export function roughen(g: BufferGeometry, amount: number, seed: number): BufferGeometry {
  const r = rng(seed);
  const pos = g.attributes.position!;
  const seen = new Map<string, [number, number, number]>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let d = seen.get(key);
    if (!d) {
      d = [(r() - 0.5) * amount, (r() - 0.5) * amount, (r() - 0.5) * amount];
      seen.set(key, d);
    }
    pos.setXYZ(i, pos.getX(i) + d[0], pos.getY(i) + d[1], pos.getZ(i) + d[2]);
  }
  pos.needsUpdate = true;
  return g;
}

const ROUNDISH = /Icosahedron|Sphere|Lathe|Capsule|Torus/;

/**
 * A box with softly rounded edges (a real bevel catches the light like cut
 * wood). Very thin pieces stay plain boxes — their bevel would be invisible
 * and only cost triangles.
 */
export function box(w: number, h: number, d: number): BufferGeometry {
  const m = Math.min(w, h, d);
  if (m < 0.045) return new BoxGeometry(w, h, d);
  return new RoundedBoxGeometry(w, h, d, 1, Math.min(0.03, m * 0.22));
}

export class Kit {
  private parts: BufferGeometry[] = [];
  private n = 0;

  add(geo: BufferGeometry, color: string, o: PartOptions = {}): this {
    const seed = o.seed ?? ++this.n * 17;
    const roundish = ROUNDISH.test(geo.type);
    // A bevelled box already carries the right (rounded) normals.
    const keepNormals = geo.type === 'RoundedBoxGeometry' && !o.rough && !o.flat;
    let g: BufferGeometry = geo.clone();
    geo.dispose();
    for (const k of Object.keys(g.attributes))
      if (k !== 'position' && !(keepNormals && k === 'normal')) g.deleteAttribute(k);
    // Organic shapes are welded so they shade smoothly; boxes keep crisp faces.
    if (!o.flat && (roundish || !g.index)) g = mergeVertices(g, 1e-4);
    if (o.rough) roughen(g, o.rough, seed);
    if (o.flat) {
      g = g.index ? g.toNonIndexed() : g;
      g.computeVertexNormals();
    } else {
      if (!keepNormals) g.computeVertexNormals();
      g = g.index ? g.toNonIndexed() : g;
    }
    const s = o.scale ?? 1;
    const sv = typeof s === 'number' ? new Vector3(s, s, s) : new Vector3(...s);
    m4.compose(
      new Vector3(...(o.at ?? [0, 0, 0])),
      new Quaternion().setFromEuler(new Euler(...(o.rot ?? [0, 0, 0]))),
      sv,
    );
    g.applyMatrix4(m4);

    const pos = g.attributes.position!;
    g.computeBoundingBox();
    const box = g.boundingBox!;
    const ext = [box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z];
    const axis = ext.indexOf(Math.max(...ext));
    const h = Math.max(1e-4, ext[1]!);
    const col = new Float32Array(pos.count * 3);
    const code = new Float32Array(pos.count).fill(surfCode(o.surf ?? guessSurface(color), axis));
    const r = rng(seed + 3);
    const base = new Color(color);
    const vary = o.vary ?? 0.06;
    // Colour per face: base × (1 ± vary) × foot darkening.
    for (let f = 0; f < pos.count; f += 3) {
      const k = 1 + (r() - 0.5) * 2 * vary;
      for (let v = f; v < f + 3 && v < pos.count; v++) {
        const t = (pos.getY(v) - box.min.y) / h;
        const occl = o.ao ? 1 - o.ao * Math.pow(1 - Math.min(1, t * 1.6), 2) : 1;
        tmp.copy(base).multiplyScalar(k * occl);
        col.set([tmp.r, tmp.g, tmp.b], v * 3);
      }
    }
    g.setAttribute('color', new BufferAttribute(col, 3));
    g.setAttribute('surf', new BufferAttribute(code, 1));
    this.parts.push(g);
    return this;
  }

  /** Merge everything added so far. */
  build(): BufferGeometry {
    const g = mergeGeometries(this.parts, false);
    this.parts.forEach((p) => p.dispose());
    this.parts = [];
    if (!g) throw new Error('kit: nothing to merge');
    g.computeBoundingSphere();
    return g;
  }
}

const cache = new Map<string, BufferGeometry>();

/** Build a prop once per session. */
export function prop(key: string, make: (k: Kit) => void): BufferGeometry {
  let g = cache.get(key);
  if (!g) {
    const k = new Kit();
    make(k);
    g = k.build();
    cache.set(key, g);
  }
  return g;
}

// ——— Shader patch: wind + procedural surface detail ———

/** Wind: one uniform shared by every swaying material; ticked by <Wind/>. */
export const wind = { value: 0 };

const DETAIL_GLSL = /* glsl */ `
varying float vSurf;
varying vec3 vLPos;
float kh3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float kn3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(kh3(i), kh3(i + vec3(1, 0, 0)), f.x), mix(kh3(i + vec3(0, 1, 0)), kh3(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(kh3(i + vec3(0, 0, 1)), kh3(i + vec3(1, 0, 1)), f.x), mix(kh3(i + vec3(0, 1, 1)), kh3(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
vec3 surfDetail(vec3 col) {
  float id = floor((vSurf + 0.5) / 4.0);
  float axis = vSurf - id * 4.0;
  // Procedural fallback: bark reads like coarse wood, linen stays plain.
  if (id > 8.5) return col;
  if (id > 7.5) id = 1.0;
  vec3 p = vLPos;
  // Fade fine detail as it shrinks on screen (no shimmer at a distance).
  float fw = max(length(fwidth(p)), 1e-4);
  float near = clamp(1.6 - fw * 22.0, 0.0, 1.0);
  float fine = clamp(1.6 - fw * 70.0, 0.0, 1.0);
  if (id < 0.5) {
    return col;
  } else if (id < 1.5) {
    // Wood: fine grain along the board, broader streaks, rare darker knots.
    vec3 q = axis < 0.5 ? p.yzx : (axis < 1.5 ? p.xzy : p.xyz);
    float grain = kn3(vec3(q.x * 30.0, q.y * 30.0, q.z * 1.4));
    float streak = kn3(vec3(q.x * 7.0, q.y * 7.0, q.z * 0.5));
    float knot = smoothstep(0.86, 0.95, kn3(p * 5.0));
    return col * (0.9 + (streak - 0.5) * 0.22 * near + (grain - 0.5) * 0.2 * fine) * (1.0 - knot * 0.25 * near);
  } else if (id < 2.5) {
    // Stone: mottling and thin dark cracks.
    float m = kn3(p * 4.0) * 0.6 + kn3(p * 11.0) * 0.4;
    float crack = 1.0 - (1.0 - smoothstep(0.0, 0.03, abs(kn3(p * 2.6 + 3.0) - 0.5))) * 0.4 * near;
    return col * (0.88 + (m - 0.5) * 0.3) * crack;
  } else if (id < 3.5) {
    // Fired clay tiles: uneven firing, weathered streaks down the slope.
    float w = kn3(p * vec3(2.0, 9.0, 2.0));
    return col * (0.9 + (w - 0.5) * 0.24 * near + (kn3(p * 30.0) - 0.5) * 0.08 * fine);
  } else if (id < 4.5) {
    // Soil: clumps, dark crumbs and the odd pale grit.
    float clump = kn3(p * 7.0);
    float crumb = step(0.78, kn3(p * 26.0)) * fine;
    float grit = step(0.93, kn3(p * 41.0 + 7.0)) * fine;
    vec3 c = col * (0.84 + (clump - 0.5) * 0.3);
    c = mix(c, c * 0.62, crumb * 0.7);
    return mix(c, vec3(0.63, 0.56, 0.46), grit * 0.45);
  } else if (id < 5.5) {
    // Leaves: dappled, sun-warmed patches.
    float d = kn3(p * 6.0);
    float warm = smoothstep(0.55, 0.9, kn3(p * 2.2 + 5.0));
    vec3 c = col * (0.86 + (d - 0.5) * 0.3 * near);
    return mix(c, c * vec3(1.1, 1.08, 0.82), warm * 0.45);
  } else if (id < 6.5) {
    vec3 q = axis < 0.5 ? p.yzx : (axis < 1.5 ? p.xzy : p.xyz);
    return col * (0.88 + (kn3(vec3(q.x * 55.0, q.y * 55.0, q.z * 3.0)) - 0.5) * 0.26 * fine);
  }
  // Lawn: broad patches, tiny blade speckle, a few clover spots.
  float patchy = kn3(vec3(p.xz * 0.9, 0.0));
  float blades = kn3(vec3(p.xz * 34.0, 1.0));
  float clover = smoothstep(0.8, 0.9, kn3(vec3(p.xz * 3.0, 2.0)));
  vec3 c = col * (0.9 + (patchy - 0.5) * 0.16 + (blades - 0.5) * 0.18 * fine);
  return mix(c, c * vec3(0.86, 1.02, 0.84), clover * 0.5 * near);
}
`;

/*
 * Photo detail (CC0, see ./detail.ts): triplanar in object space, so no UVs are
 * needed and nothing swims when foliage sways. Boards and trunks are swizzled
 * so the grain runs along their length. The same height drives a bump.
 */
const TEX_GLSL = /* glsl */ `
uniform sampler2D uDetA;
uniform sampler2D uDetB;
uniform float uDetOn;
varying vec3 vLNrm;
float gKitH;
float gKitBump;
vec4 kitTri(sampler2D t, vec3 p, vec3 n) {
  vec3 w = pow(abs(n), vec3(4.0));
  w /= (w.x + w.y + w.z + 1e-5);
  return texture2D(t, p.zy) * w.x + texture2D(t, p.xz) * w.y + texture2D(t, p.xy) * w.z;
}
vec3 kitDetail(vec3 col) {
  gKitH = 0.5;
  gKitBump = 0.0;
  if (uDetOn < 0.5) return surfDetail(col);
  float id = floor((vSurf + 0.5) / 4.0);
  float axis = vSurf - id * 4.0;
  vec3 p = vLPos;
  vec3 n = normalize(vLNrm);
  // Grain along the long axis: move that axis to y (the image's grain direction).
  bool grain = (id > 0.5 && id < 1.5) || (id > 5.5 && id < 6.5) || (id > 7.5 && id < 8.5);
  if (grain && axis < 0.5) { p = p.yxz; n = n.yxz; }
  if (grain && axis > 1.5) { p = p.xzy; n = n.xzy; }
  // Texture repeats per unit, by material (1 unit ≈ 1 m).
  float s = id < 1.5 ? 1.6 : id < 2.5 ? 0.9 : id < 3.5 ? 1.4 : id < 4.5 ? 1.3 : id < 5.5 ? 1.8
          : id < 6.5 ? 4.0 : id < 7.5 ? 0.55 : id < 8.5 ? 1.2 : 2.2;
  vec4 a = kitTri(uDetA, p * s, n);
  vec4 b = kitTri(uDetB, p * s, n);
  // Sampled above in uniform control flow; plain surfaces opt out only now.
  if (id < 0.5) return col;
  float d = id < 1.5 ? a.r : id < 2.5 ? a.g : id < 3.5 ? b.r : id < 4.5 ? a.b : id < 5.5 ? b.b
          : id < 6.5 ? a.r : id < 7.5 ? a.a : id < 8.5 ? b.g : b.a;
  float str = id < 1.5 ? 0.3 : id < 2.5 ? 0.42 : id < 3.5 ? 0.26 : id < 4.5 ? 0.42 : id < 5.5 ? 0.28
            : id < 6.5 ? 0.3 : id < 7.5 ? 0.26 : id < 8.5 ? 0.45 : 0.22;
  gKitBump = id < 1.5 ? 0.7 : id < 2.5 ? 1.6 : id < 3.5 ? 0.8 : id < 4.5 ? 1.4 : id < 5.5 ? 0.5
           : id < 6.5 ? 0.6 : id < 7.5 ? 0.7 : id < 8.5 ? 2.0 : 0.6;
  gKitH = d;
  vec3 c = col * (1.0 + (d - 0.5) * 2.0 * str);
  // Keep the light, hand-painted feel: a hint of the procedural grain for boards.
  return (id > 0.5 && id < 1.5) ? mix(c, surfDetail(col), 0.25) : c;
}
vec3 kitPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {
  vec3 vSigmaX = normalize(dFdx(surf_pos.xyz));
  vec3 vSigmaY = normalize(dFdy(surf_pos.xyz));
  vec3 R1 = cross(vSigmaY, surf_norm);
  vec3 R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDir;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}
`;

/** Adds wind sway (amp > 0) and the surface detail to a standard material. */
export function patchMaterial(m: MeshStandardMaterial, amp: number, detail = true) {
  if (detail) loadDetail();
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uWind = wind;
    if (detail) Object.assign(shader.uniforms, detailUniforms);
    let vs = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      uniform float uWind;
      attribute float surf;
      varying float vSurf;
      varying vec3 vLPos;
      varying vec3 vLNrm;`,
    );
    vs = vs.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vSurf = surf;
      vLPos = position;
      vLNrm = normal;
      #ifdef USE_INSTANCING
        vLPos += instanceMatrix[3].xyz * 0.37;
      #endif
      ${
        amp > 0
          ? `vec3 wp = position;
      #ifdef USE_INSTANCING
        wp = (instanceMatrix * vec4(position, 1.0)).xyz;
      #endif
      float bend = max(0.0, position.y) * ${amp.toFixed(3)};
      float ph = wp.x * 0.61 + wp.z * 0.37;
      transformed.x += sin(uWind * 1.3 + ph) * bend;
      transformed.z += cos(uWind * 1.1 + ph * 1.3) * bend * 0.6;`
          : ''
      }`,
    );
    shader.vertexShader = vs;
    if (detail) {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${DETAIL_GLSL}\n${TEX_GLSL}`)
        .replace(
          '#include <color_fragment>',
          '#include <color_fragment>\n diffuseColor.rgb = kitDetail(diffuseColor.rgb);',
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          {
            // Derivatives outside any branch; a zero bump leaves the normal as is.
            vec2 dH = vec2(dFdx(gKitH), dFdy(gKitH)) * gKitBump * 0.6;
            normal = kitPerturb(-vViewPosition, normal, dH, faceDirection);
          }`,
        );
    }
  };
  m.customProgramCacheKey = () => `kit${amp}${detail ? 'd' : ''}`;
}

const mats = new Map<string, MeshStandardMaterial>();

/**
 * Vertex-coloured, matte, smooth-shaded with procedural surface detail.
 * `tint` multiplies the painted colours (e.g. soil darkens when watered);
 * `sway` makes foliage move in the wind, more toward the top, phase-shifted by
 * position so nothing moves in unison.
 */
export function kitMaterial(opts: { tint?: string; sway?: number; side?: 'double' } = {}) {
  const key = `${opts.tint ?? ''}|${opts.sway ?? 0}|${opts.side ?? ''}`;
  let m = mats.get(key);
  if (m) return m;
  m = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0,
    color: new Color(opts.tint ?? '#ffffff'),
    side: opts.side === 'double' ? 2 : 0,
  });
  patchMaterial(m, opts.sway ?? 0);
  mats.set(key, m);
  return m;
}

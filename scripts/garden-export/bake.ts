import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Sprite,
  type Material,
} from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/*
 * Baking for the GLB exporters: copies meshes (and instanced copies) into one
 * space, merges them per material and writes binary glTF. With `outline`, a
 * cartoon ink line is added as an inverted hull: the surface pushed out along
 * smoothed normals, wound inside out, in one dark material — it shows only
 * around silhouettes and creases, in any engine, with no post-processing.
 */

/** Ink colour of the outline hull: warm dark brown, never pure black. */
const OUTLINE = new MeshStandardMaterial({
  name: 'outline',
  color: new Color('#3a2a1d'),
  roughness: 1,
  metalness: 0,
});

/** Inverted hull of `g`: offset by `width` along normals averaged per position, winding flipped. */
function hull(g: BufferGeometry, width: number): BufferGeometry {
  const p = g.attributes.position!;
  const n = g.attributes.normal!;
  const key = (i: number) =>
    `${Math.round(p.getX(i) * 2000)},${Math.round(p.getY(i) * 2000)},${Math.round(p.getZ(i) * 2000)}`;
  const sums = new Map<string, [number, number, number]>();
  for (let i = 0; i < p.count; i++) {
    const k = key(i);
    const s = sums.get(k) ?? [0, 0, 0];
    s[0] += n.getX(i);
    s[1] += n.getY(i);
    s[2] += n.getZ(i);
    sums.set(k, s);
  }
  const pos = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const s = sums.get(key(i))!;
    const l = Math.hypot(...s) || 1;
    pos[i * 3] = p.getX(i) + (s[0] / l) * width;
    pos[i * 3 + 1] = p.getY(i) + (s[1] / l) * width;
    pos[i * 3 + 2] = p.getZ(i) + (s[2] / l) * width;
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(pos, 3));
  out.setAttribute('normal', n.clone());
  out.setAttribute('color', new BufferAttribute(new Float32Array(p.count * 3).fill(1), 3));
  const idx = Array.from(g.index!.array);
  for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2]!, idx[i + 1]!];
  out.setIndex(idx);
  return out;
}

/** Export copy of a kit material: same colours/maps, standard PBR, no shader patches. */
const exportMats = new Map<Material, MeshStandardMaterial>();
export function exportMaterial(m: Material): MeshStandardMaterial {
  let out = exportMats.get(m);
  if (out) return out;
  const src = m as MeshStandardMaterial & { map?: unknown };
  out = new MeshStandardMaterial({
    name: m.name || materialName(src),
    color: src.color ? src.color.clone() : new Color('#ffffff'),
    vertexColors: true,
    roughness: src.roughness ?? 0.9,
    metalness: 0,
    map: src.map ?? null,
    alphaTest: src.alphaTest,
    side: src.side,
    transparent: src.transparent,
    opacity: src.opacity,
    depthWrite: src.depthWrite,
  });
  if (src.emissive && src.emissive.getHex() !== 0) {
    out.emissive = src.emissive.clone();
    out.emissiveIntensity = src.emissiveIntensity;
  }
  exportMats.set(m, out);
  return out;
}
function materialName(m: MeshStandardMaterial): string {
  const key = (m as { customProgramCacheKey?: () => string }).customProgramCacheKey?.() ?? '';
  const sway = /^kit([\d.]+)/.exec(key)?.[1];
  if (m.map && m.alphaTest > 0) return 'leaf-cards';
  if (m.transparent) return 'decal';
  if (sway && Number(sway) > 0) return `foliage-${sway}`;
  return m.vertexColors ? 'kit' : `flat-${m.color?.getHexString() ?? 'fff'}`;
}

/** Copy of `g` in a target space: only the attributes the export needs, colours baked. */
function place(g: BufferGeometry, matrix: Matrix4, tint: Color | null, mat: Material) {
  const src = g.index ? g : g.clone().setIndex([...Array(g.attributes.position!.count).keys()]);
  const out = new BufferGeometry();
  out.setAttribute('position', src.attributes.position!.clone());
  if (src.attributes.normal) out.setAttribute('normal', src.attributes.normal.clone());
  else {
    out.computeVertexNormals();
  }
  const n = src.attributes.position!.count;
  const col = new Float32Array(n * 3).fill(1);
  const c = src.attributes.color;
  if (c) for (let i = 0; i < n; i++) col.set([c.getX(i), c.getY(i), c.getZ(i)], i * 3);
  if (tint) for (let i = 0; i < n * 3; i++) col[i]! *= [tint.r, tint.g, tint.b][i % 3]!;
  out.setAttribute('color', new BufferAttribute(col, 3));
  const hasMap = Boolean((mat as MeshStandardMaterial).map);
  if (hasMap) {
    out.setAttribute(
      'uv',
      src.attributes.uv
        ? src.attributes.uv.clone()
        : new BufferAttribute(new Float32Array(n * 2), 2),
    );
  }
  const idx = Array.from(src.index!.array);
  // Mirrored transforms flip triangle winding: swap two corners to keep faces outward.
  if (matrix.determinant() < 0)
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2]!, idx[i + 1]!];
  out.setIndex(idx);
  out.applyMatrix4(matrix);
  return out;
}

/**
 * Bakes every mesh under `root` into `root`'s local space, merged per material.
 * `skip` drops helpers (labels, steam puffs, selection rings).
 */
export function bake(
  root: Object3D,
  name: string,
  skip: (o: Object3D) => boolean = () => false,
  opts: { outline?: number } = {},
) {
  root.updateMatrixWorld(true);
  const inv = new Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map<Material, BufferGeometry[]>();
  const add = (mat: Material, g: BufferGeometry) => {
    const list = groups.get(mat) ?? [];
    list.push(g);
    groups.set(mat, list);
  };
  const visit = (o: Object3D) => {
    if (skip(o) || o instanceof Sprite || !o.visible) return;
    if (o instanceof InstancedMesh) {
      const m = new Matrix4();
      const c = new Color();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m);
        const world = new Matrix4().multiplyMatrices(o.matrixWorld, m);
        if (o.instanceColor) o.getColorAt(i, c);
        add(
          o.material as Material,
          place(
            o.geometry,
            new Matrix4().multiplyMatrices(inv, world),
            o.instanceColor ? c.clone() : null,
            o.material as Material,
          ),
        );
      }
    } else if (o instanceof Mesh) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      // userData.tint: [r, g, b] multiplier (above 1 brightens), e.g. to recolour shared props.
      const t = o.userData.tint as [number, number, number] | undefined;
      add(
        mats[0]!,
        place(
          o.geometry,
          new Matrix4().multiplyMatrices(inv, o.matrixWorld),
          t ? new Color(t[0], t[1], t[2]) : null,
          mats[0]!,
        ),
      );
    }
    o.children.forEach(visit);
  };
  root.children.forEach(visit);
  const out = new Group();
  out.name = name;
  let tris = 0;
  const outlines: BufferGeometry[] = [];
  for (const [mat, list] of groups) {
    const merged = mergeGeometries(list, false);
    if (!merged) throw new Error(`merge failed: ${name}`);
    const mesh = new Mesh(merged, exportMaterial(mat));
    mesh.name = `${name}-${mesh.material.name}`;
    tris += merged.index!.count / 3;
    out.add(mesh);
    const m = mat as MeshStandardMaterial;
    // userData.noOutline: surfaces that read better without ink (roof tiles, field tiles, straw fringes).
    if (opts.outline && !m.transparent && !(m.alphaTest > 0) && !m.userData.noOutline) outlines.push(merged);
  }
  if (outlines.length) {
    const shell = mergeGeometries(
      outlines.map((g) => hull(g, opts.outline!)),
      false,
    )!;
    const mesh = new Mesh(shell, OUTLINE);
    mesh.name = `${name}-outline`;
    tris += shell.index!.count / 3;
    out.add(mesh);
  }
  return { group: out, tris };
}

export async function glb(object: Object3D): Promise<string> {
  const buffer = (await new GLTFExporter().parseAsync(object, {
    binary: true,
    onlyVisible: true,
  })) as ArrayBuffer;
  let s = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}


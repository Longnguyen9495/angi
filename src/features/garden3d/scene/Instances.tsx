import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  CanvasTexture,
  Color,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';

export interface Placed {
  x: number;
  y: number;
  z: number;
  s: number | [number, number, number];
  ry?: number;
  rx?: number;
  rz?: number;
  /** Multiplies the painted colours (subtle variety between copies). */
  tint?: string;
}

/** One instanced draw for many copies of a kit prop. */
export function Instances({
  geometry,
  material,
  items,
  castShadow = false,
  receiveShadow = false,
}: {
  geometry: BufferGeometry;
  material: Material;
  items: Placed[];
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    const q = new Quaternion();
    const e = new Euler();
    const c = new Color();
    items.forEach((it, i) => {
      const s = typeof it.s === 'number' ? new Vector3(it.s, it.s, it.s) : new Vector3(...it.s);
      q.setFromEuler(e.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0));
      m.compose(new Vector3(it.x, it.y, it.z), q, s);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(it.tint ?? '#ffffff'));
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  if (items.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  );
}

let blobTex: CanvasTexture | null = null;
let blobMat: MeshBasicMaterial | null = null;
let blobGeo: PlaneGeometry | null = null;

/** Soft round darkening, drawn once. */
function blobMaterial() {
  if (!blobMat) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const ctx = cv.getContext('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
      g.addColorStop(0, 'rgba(0,0,0,0.9)');
      g.addColorStop(0.5, 'rgba(0,0,0,0.45)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    }
    blobTex = new CanvasTexture(cv);
    // Cool-tinted, never pure black: shadows pick up the sky.
    blobMat = new MeshBasicMaterial({
      map: blobTex,
      color: new Color('#1d2a33'),
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    blobGeo = new PlaneGeometry(1, 1);
    blobGeo.rotateX(-Math.PI / 2);
  }
  return { mat: blobMat, geo: blobGeo! };
}

/**
 * Contact shadows: a soft dark disc under things that stand on the ground, so
 * nothing floats — on every quality tier, one draw call for all of them.
 */
export function Blobs({
  items,
}: {
  items: { x: number; y?: number; z: number; r: number; sx?: number }[];
}) {
  const { mat, geo } = useMemo(() => blobMaterial(), []);
  const placed = useMemo<Placed[]>(
    () =>
      items.map((b) => ({
        x: b.x,
        y: (b.y ?? 0) + 0.012,
        z: b.z,
        s: [b.r * 2 * (b.sx ?? 1), 1, b.r * 2],
      })),
    [items],
  );
  return <Instances geometry={geo} material={mat} items={placed} />;
}

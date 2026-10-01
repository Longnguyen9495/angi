import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import {
  CanvasTexture,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  RingGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { POND_SHAPE, rng } from '../layout';
import { Instances, type Placed } from './Instances';
import { box, kitMaterial, prop } from './kit';
import { C, mat } from './materials';
import { rock, tuft } from './nature';

/*
 * The village pond: rippling water over a dark bed, a stone rim, lily pads,
 * reeds, a plank dock, koi circling (one leaps now and then) and — while the
 * guest fishes — a rod, line and bobber that dips when something bites.
 * Everything is in the pond's own space; the building spot places it.
 */

export type FishingPhase = 'idle' | 'waiting' | 'bite' | 'caught' | 'missed';

const { rx: RX, rz: RZ } = POND_SHAPE;
const WATER_Y = 0.035;
/** Dock runs in from the left bank (towards the plots); the bobber floats off its end. */
const DOCK = { x0: -RX - 0.55, x1: -RX + 0.75, z: 0.18, w: 0.5, y: 0.13 };
const BOBBER = new Vector3(DOCK.x1 + 0.5, WATER_Y, DOCK.z + 0.05);
const ROD_TIP = new Vector3(DOCK.x1 + 0.05, 0.85, DOCK.z - 0.12);

/** Organic outline: an ellipse with a gentle wobble. */
function outline(a: number, grow = 0) {
  const w = 1 + 0.05 * Math.sin(3 * a + 1.1) + 0.03 * Math.sin(5 * a + 0.4);
  return [Math.cos(a) * (RX + grow) * w, Math.sin(a) * (RZ + grow) * w] as const;
}

/** Flat disc following the outline (XZ plane, facing up). */
function pondDisc(grow: number, segs = 48): CircleGeometry {
  const g = new CircleGeometry(1, segs);
  const p = g.attributes.position!;
  for (let i = 1; i < p.count; i++) {
    const a = Math.atan2(p.getY(i), p.getX(i));
    const [x, z] = outline(a, grow);
    // Keep the circle's winding (a sign flip would turn the face downwards).
    p.setXY(i, x, z);
  }
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

let rippleTex: CanvasTexture | null = null;

/** Tileable normal map of soft crossing ripples (drawn once). */
function rippleNormals(): CanvasTexture {
  if (rippleTex) return rippleTex;
  const n = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const ctx = cv.getContext('2d');
  const h = (x: number, y: number) => {
    const u = (x / n) * Math.PI * 2;
    const v = (y / n) * Math.PI * 2;
    return (
      Math.sin(u * 3 + Math.sin(v * 2) * 0.8) * 0.5 +
      Math.sin(v * 4 + u) * 0.3 +
      Math.sin((u + v) * 5) * 0.2
    );
  };
  if (ctx) {
    const img = ctx.createImageData(n, n);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const dx = h(x + 1, y) - h(x - 1, y);
        const dy = h(x, y + 1) - h(x, y - 1);
        const nx = -dx * 2;
        const ny = -dy * 2;
        const l = Math.hypot(nx, ny, 1);
        const o = (y * n + x) * 4;
        img.data[o] = ((nx / l) * 0.5 + 0.5) * 255;
        img.data[o + 1] = ((ny / l) * 0.5 + 0.5) * 255;
        img.data[o + 2] = ((1 / l) * 0.5 + 0.5) * 255;
        img.data[o + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  }
  rippleTex = new CanvasTexture(cv);
  rippleTex.wrapS = rippleTex.wrapT = RepeatWrapping;
  rippleTex.repeat.set(2.5, 1.7);
  return rippleTex;
}

function koiGeometry(variant: number) {
  const tones = [
    ['#f08a3c', '#fbf3e6'],
    ['#fbf3e6', '#e2412b'],
    ['#f4c04a', '#f6e7c8'],
  ][variant % 3]!;
  return prop(`koi${variant}`, (k) => {
    k.add(new SphereGeometry(1, 10, 7), tones[0]!, { scale: [0.17, 0.045, 0.07] });
    k.add(new SphereGeometry(1, 8, 6), tones[1]!, {
      at: [0.04, 0.012, 0],
      scale: [0.08, 0.04, 0.055],
    });
    k.add(new ConeGeometry(0.06, 0.12, 6), tones[0]!, {
      at: [-0.2, 0, 0],
      rot: [0, 0, Math.PI / 2],
      scale: [1, 1, 0.35],
    });
    for (const s of [-1, 1])
      k.add(new SphereGeometry(0.035, 5, 4), tones[1]!, {
        at: [0.06, -0.01, s * 0.07],
        scale: [1, 0.3, 1.4],
      });
  });
}

function dockGeometry() {
  return prop('pond-dock', (k) => {
    const len = DOCK.x1 - DOCK.x0;
    const planks = 9;
    for (let i = 0; i < planks; i++) {
      const x = DOCK.x0 + (i + 0.5) * (len / planks);
      k.add(box(len / planks - 0.015, 0.04, DOCK.w), i % 2 ? C.wood : C.woodLight, {
        at: [x, DOCK.y, DOCK.z],
        rot: [0, (i % 3) * 0.02 - 0.02, 0],
        vary: 0.08,
        rough: 0.01,
      });
    }
    for (const x of [DOCK.x0 + 0.08, (DOCK.x0 + DOCK.x1) / 2, DOCK.x1 - 0.05])
      for (const s of [-1, 1])
        k.add(new CylinderGeometry(0.045, 0.05, 0.42, 7), C.woodDark, {
          at: [x, 0.0, DOCK.z + s * (DOCK.w / 2 - 0.03)],
          ao: 0.4,
        });
    // A little bait box and a coil of rope at the end.
    k.add(box(0.2, 0.12, 0.14), C.woodDark, { at: [DOCK.x1 - 0.25, DOCK.y + 0.08, DOCK.z + 0.14] });
    k.add(new CylinderGeometry(0.08, 0.08, 0.05, 10), '#d9c7a0', {
      at: [DOCK.x0 + 0.35, DOCK.y + 0.04, DOCK.z - 0.12],
    });
  });
}

function rodGeometry() {
  return prop('pond-rod', (k) => {
    // Rod propped on a forked stick at the end of the dock, leaning over the water.
    const base = new Vector3(DOCK.x1 - 0.45, DOCK.y + 0.04, DOCK.z - 0.12);
    const dir = ROD_TIP.clone().sub(base);
    const len = dir.length();
    const mid = base.clone().addScaledVector(dir, 0.5);
    const tilt = Math.atan2(Math.hypot(dir.x, dir.z), dir.y);
    const yaw = Math.atan2(dir.x, dir.z);
    k.add(new CylinderGeometry(0.008, 0.018, len, 5), '#6b4a2a', {
      at: [mid.x, mid.y, mid.z],
      rot: [tilt, yaw, 0],
    });
    k.add(new CylinderGeometry(0.02, 0.02, 0.32, 5), C.woodDark, {
      at: [DOCK.x1 - 0.2, DOCK.y + 0.16, DOCK.z - 0.12],
    });
  });
}

function bobberGeometry() {
  return prop('pond-bobber', (k) => {
    k.add(new SphereGeometry(0.045, 8, 6), C.red, { at: [0, 0.02, 0] });
    k.add(new SphereGeometry(0.044, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), C.white, {
      at: [0, 0.025, 0],
    });
    k.add(new CylinderGeometry(0.006, 0.006, 0.06, 4), C.woodDark, { at: [0, 0.08, 0] });
  });
}

/** Stones round the rim, reeds and cattails on the far bank, lily pads on the water. */
function banks() {
  const r = rng(131);
  const stones: Placed[][] = [[], [], []];
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.08;
    // Leave the dock's landing clear.
    if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) < 0.32) continue;
    const [x, z] = outline(a, 0.08);
    const s = 0.11 + r() * 0.1;
    stones[i % 3]!.push({
      x,
      y: 0.01,
      z,
      s: [s * 1.3, s * 0.7, s],
      ry: r() * 6,
      tint: ['#ffffff', '#efe9de', '#e0d8ca'][Math.floor(r() * 3)],
    });
  }
  const reeds: Placed[] = [];
  for (let i = 0; i < 9; i++) {
    const a = -0.6 - r() * 2.2;
    const [x, z] = outline(a, 0.22 + r() * 0.12);
    reeds.push({ x, y: 0, z, s: [0.9, 1.7 + r() * 0.6, 0.9], ry: r() * 6 });
  }
  const pads: { x: number; z: number; s: number; ry: number; bloom: boolean }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = 0.2 + i * 0.75 + r() * 0.3;
    const d = 0.55 + r() * 0.3;
    pads.push({
      x: Math.cos(a) * RX * d,
      z: Math.sin(a) * RZ * d,
      s: 0.8 + r() * 0.5,
      ry: r() * 6,
      bloom: i % 3 === 0,
    });
  }
  return { stones, reeds, pads };
}

/** One koi's loop round the pond: speed, radii, phase, depth. */
const SWIM = [
  { v: 0.32, a: 0.62, b: 0.5, p: 0, y: 0.02 },
  { v: -0.25, a: 0.45, b: 0.62, p: 2.1, y: 0.018 },
  { v: 0.2, a: 0.7, b: 0.35, p: 4.2, y: 0.022 },
];

function swimAt(i: number, t: number, out: Vector2) {
  const s = SWIM[i]!;
  const k = t * s.v + s.p;
  out.set(Math.cos(k) * RX * s.a - 0.15, Math.sin(k) * RZ * s.b);
  return Math.atan2(-Math.cos(k) * RZ * s.b * s.v, -Math.sin(k) * RX * s.a * s.v);
}

export const Pond = memo(function Pond({
  phase,
  reduced,
}: {
  phase: FishingPhase;
  reduced: boolean;
}) {
  const water = useMemo(() => pondDisc(0), []);
  const bed = useMemo(() => pondDisc(-0.08), []);
  const bank = useMemo(() => pondDisc(0.42), []);
  const shore = useMemo(() => pondDisc(0.2), []);
  const dock = useMemo(() => dockGeometry(), []);
  const rod = useMemo(() => rodGeometry(), []);
  const bobber = useMemo(() => bobberGeometry(), []);
  const koi = useMemo(() => [0, 1, 2].map((v) => koiGeometry(v)), []);
  const { stones, reeds, pads } = useMemo(() => banks(), []);
  const waterMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#47b4dc',
        roughness: 0.12,
        metalness: 0.05,
        transparent: true,
        opacity: 0.8,
        normalMap: rippleNormals(),
        normalScale: new Vector2(0.55, 0.55),
        depthWrite: false,
      }),
    [],
  );
  const ringMats = useMemo(
    () =>
      [0, 1, 2, 3].map(
        () =>
          new MeshBasicMaterial({
            color: '#ffffff',
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
      ),
    [],
  );
  const ringGeo = useMemo(() => {
    const g = new RingGeometry(0.9, 1, 28);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const padGeo = useMemo(() => {
    const g = new CircleGeometry(0.15, 14, 0.35, Math.PI * 2 - 0.5);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const fish = useRef<(Group | null)[]>([]);
  const rings = useRef<(Mesh | null)[]>([]);
  const bob = useRef<Group>(null);
  const line = useRef<Mesh>(null);
  const leap = useRef({ next: 6, i: 0, at: -10 });
  const tmp = useMemo(() => new Vector2(), []);
  const phaseAt = useRef({ phase, at: 0 });

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (phaseAt.current.phase !== phase) phaseAt.current = { phase, at: t };
    const since = t - phaseAt.current.at;
    if (!reduced) {
      const n = waterMat.normalMap!;
      n.offset.set(t * 0.012, t * 0.008);
    }
    // Koi circle; now and then one leaps in an arc.
    const L = leap.current;
    if (!reduced && t > L.next) {
      L.at = t;
      L.i = (L.i + 1) % 3;
      L.next = t + 7 + ((L.i * 37) % 6);
    }
    fish.current.forEach((g, i) => {
      if (!g) return;
      const yaw = swimAt(i, reduced ? 0 : t, tmp);
      const jt = (t - L.at) / 0.8;
      const jumping = i === L.i && jt >= 0 && jt <= 1;
      g.position.set(tmp.x, SWIM[i]!.y + (jumping ? Math.sin(jt * Math.PI) * 0.32 : 0), tmp.y);
      g.rotation.set(0, yaw, jumping ? Math.cos(jt * Math.PI) * 0.9 : 0);
    });
    // Ripples: two drifting rings, one where a koi lands, one at the bobber.
    const showBob = phase !== 'idle' && !(phase === 'missed' && since > 1.2);
    rings.current.forEach((m, i) => {
      if (!m) return;
      let k = ((t * 0.35 + i * 0.5) % 1) as number;
      let at: [number, number] = [Math.cos(i * 2.4) * RX * 0.45, Math.sin(i * 1.7) * RZ * 0.4];
      let size = 0.25;
      if (i === 2) {
        const jt = (t - L.at - 0.8) / 1.1;
        k = jt >= 0 && jt <= 1 ? jt : 1;
        swimAt(L.i, t, tmp);
        at = [tmp.x, tmp.y];
        size = 0.3;
      }
      if (i === 3) {
        k = showBob ? (t * (phase === 'bite' ? 1.6 : 0.6)) % 1 : 1;
        at = [BOBBER.x, BOBBER.z];
        size = phase === 'bite' ? 0.32 : 0.16;
      }
      if (reduced && i < 3) k = 1;
      m.position.set(at[0], WATER_Y + 0.004, at[1]);
      m.scale.setScalar(0.05 + k * size);
      ringMats[i]!.opacity = (1 - k) * (i === 3 ? 0.7 : 0.35);
    });
    // Bobber and line.
    if (bob.current) {
      bob.current.visible = showBob;
      const dip =
        phase === 'bite'
          ? -0.035 + Math.sin(t * 24) * 0.012
          : phase === 'caught'
            ? Math.min(0.5, since * 1.2)
            : Math.sin(t * 2.6) * 0.008;
      bob.current.position.set(BOBBER.x, BOBBER.y + dip, BOBBER.z);
    }
    if (line.current) {
      line.current.visible = showBob;
      const end = bob.current ? bob.current.position : BOBBER;
      const d = end.clone().sub(ROD_TIP);
      line.current.position.copy(ROD_TIP).addScaledVector(d, 0.5);
      line.current.scale.set(1, d.length(), 1);
      line.current.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), d.normalize());
    }
  });

  const matte = kitMaterial();
  const grassy = kitMaterial({ sway: 0.09 });
  return (
    <group>
      <mesh geometry={bank} material={mat('#9fb565')} position={[0, 0.006, 0]} receiveShadow />
      <mesh geometry={shore} material={mat('#b9a57a')} position={[0, 0.012, 0]} receiveShadow />
      <mesh geometry={bed} material={mat('#285f73')} position={[0, 0.016, 0]} />
      {[0, 1, 2].map((i) => (
        <group
          key={i}
          ref={(g) => {
            fish.current[i] = g;
          }}
        >
          <mesh geometry={koi[i]} material={matte} />
        </group>
      ))}
      <mesh geometry={water} material={waterMat} position={[0, WATER_Y, 0]} renderOrder={2} />
      {ringMats.map((m, i) => (
        <mesh
          key={i}
          ref={(r) => {
            rings.current[i] = r;
          }}
          geometry={ringGeo}
          material={m}
          renderOrder={3}
        />
      ))}
      {pads.map((p, i) => (
        <group key={i} position={[p.x, WATER_Y + 0.006, p.z]} rotation={[0, p.ry, 0]} scale={p.s}>
          <mesh geometry={padGeo} material={mat(i % 2 ? C.leaf : C.leafDark)} renderOrder={4} />
          {p.bloom && (
            <mesh position={[0.03, 0.03, 0.02]} material={mat('#f3a9c4')}>
              <coneGeometry args={[0.045, 0.06, 6]} />
            </mesh>
          )}
        </group>
      ))}
      {stones.map((items, v) => (
        <Instances key={v} geometry={rock(v)} material={matte} items={items} castShadow />
      ))}
      <Instances geometry={tuft(1)} material={grassy} items={reeds} />
      {reeds.slice(0, 4).map((p, i) => (
        <group key={i} position={[p.x + 0.06, 0, p.z - 0.04]}>
          <mesh position={[0, 0.3, 0]} material={mat('#6f8a3c')}>
            <cylinderGeometry args={[0.008, 0.01, 0.6, 4]} />
          </mesh>
          <mesh position={[0, 0.58, 0]} material={mat('#7a4f2e')}>
            <capsuleGeometry args={[0.022, 0.08, 3, 6]} />
          </mesh>
        </group>
      ))}
      <mesh geometry={dock} material={matte} castShadow receiveShadow />
      <mesh geometry={rod} material={matte} castShadow />
      <mesh ref={line} material={mat('#f4ede1')}>
        <cylinderGeometry args={[0.004, 0.004, 1, 3]} />
      </mesh>
      <group ref={bob}>
        <mesh geometry={bobber} material={matte} />
      </group>
    </group>
  );
});

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import {
  AdditiveBlending,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  SphereGeometry,
  type Group,
  type PointLight,
} from 'three';
import { groundAt, plotBounds, rng, type Placement, type PlaceableDecor } from '../layout';
import { clayJar } from './architecture';
import { Blobs } from './Instances';
import { box, kitMaterial, prop } from './kit';
import { C, mat } from './materials';
import { isTap } from './tap';

/** Bù nhìn nón lá: straw body on a cross, shirt, conical hat, straw tufts at the cuffs. */
function scarecrowGeometry() {
  return prop('scarecrow', (k) => {
    k.add(new CylinderGeometry(0.04, 0.05, 1.45, 6), C.woodDark, { at: [0, 0.72, 0], ao: 0.4 });
    k.add(new CylinderGeometry(0.035, 0.035, 1.05, 6), C.woodDark, {
      at: [0, 1.06, 0],
      rot: [0, 0, Math.PI / 2],
    });
    k.add(box(0.46, 0.46, 0.2), '#4f7fb3', {
      surf: 'fabric',
      at: [0, 0.96, 0],
      rough: 0.04,
      vary: 0.06,
    });
    k.add(box(0.9, 0.14, 0.16), '#4a76a6', {
      surf: 'fabric',
      at: [0, 1.08, 0],
      rough: 0.03,
    });
    k.add(box(0.1, 0.44, 0.02), '#e6d7b4', { at: [0.12, 0.96, 0.105] });
    k.add(new SphereGeometry(0.16, 8, 6), '#e0c681', { at: [0, 1.38, 0], rough: 0.03 });
    k.add(new ConeGeometry(0.44, 0.24, 14), '#dcc27a', { at: [0, 1.56, 0], vary: 0.05 });
    for (const x of [-0.5, 0.5])
      for (let i = 0; i < 3; i++)
        k.add(new ConeGeometry(0.018, 0.16, 3), '#d9c16a', {
          at: [x + Math.sign(x) * 0.06, 1.06 + (i - 1) * 0.04, 0],
          rot: [0, 0, -Math.sign(x) * (1.2 + i * 0.2)],
        });
    for (let i = 0; i < 5; i++)
      k.add(new ConeGeometry(0.02, 0.2, 3), '#d9c16a', {
        at: [(i - 2) * 0.07, 0.68, 0],
        rot: [Math.PI, 0, (i - 2) * 0.15],
      });
  });
}

function lanternPostGeometry() {
  return prop('lantern-post', (k) => {
    k.add(new CylinderGeometry(0.04, 0.06, 1.6, 6), C.woodDark, { at: [0, 0.8, 0], ao: 0.4 });
    k.add(new CylinderGeometry(0.03, 0.03, 0.55, 6), C.woodDark, {
      at: [0.25, 1.58, 0],
      rot: [0, 0, Math.PI / 2],
    });
    k.add(box(0.14, 0.08, 0.14), C.rockWarm, { at: [0, 0.04, 0], rough: 0.02 });
  });
}

function lanternGeometry() {
  return prop('lantern', (k) => {
    k.add(new SphereGeometry(0.17, 12, 9), '#c9362a', { at: [0, -0.25, 0], scale: [1, 1.1, 1] });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      k.add(box(0.008, 0.36, 0.008), '#8f2a20', {
        at: [Math.cos(a) * 0.172, -0.25, Math.sin(a) * 0.172],
      });
    }
    k.add(new CylinderGeometry(0.08, 0.08, 0.05, 10), C.gold, { at: [0, -0.06, 0] });
    k.add(new CylinderGeometry(0.08, 0.08, 0.04, 10), C.gold, { at: [0, -0.44, 0] });
    k.add(new ConeGeometry(0.03, 0.16, 5), '#e0b54a', { at: [0, -0.53, 0], rot: [Math.PI, 0, 0] });
  });
}

let haloTex: CanvasTexture | null = null;

/** Soft warm halo (a cheap stand-in for bloom, only on the lantern). */
function halo(): CanvasTexture {
  if (haloTex) return haloTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const ctx = cv.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,190,120,0.9)');
    g.addColorStop(0.35, 'rgba(255,140,70,0.35)');
    g.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  haloTex = new CanvasTexture(cv);
  return haloTex;
}

function Lantern({ glow, light }: { glow: boolean; light: boolean }) {
  const lamp = useRef<Group>(null);
  const pl = useRef<PointLight>(null);
  const post = useMemo(() => lanternPostGeometry(), []);
  const body = useMemo(() => lanternGeometry(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (lamp.current) lamp.current.rotation.z = Math.sin(t * 1.4) * 0.06;
    if (pl.current) pl.current.intensity = 5 + Math.sin(t * 7) * 0.4 + Math.sin(t * 3.1) * 0.3;
  });
  return (
    <group>
      <mesh geometry={post} material={kitMaterial()} castShadow />
      <group ref={lamp} position={[0.45, 1.55, 0]}>
        <mesh geometry={body} material={kitMaterial(glow ? { tint: '#ffd9b0' } : {})} castShadow />
        {glow && (
          <mesh
            position={[0, -0.25, 0]}
            material={mat('#ffb070', { emissive: '#ff7a3a', transparent: 0.55 })}
          >
            <sphereGeometry args={[0.13, 10, 8]} />
          </mesh>
        )}
        {glow && (
          <sprite position={[0, -0.25, 0]} scale={[1.5, 1.5, 1]}>
            <spriteMaterial
              map={halo()}
              blending={AdditiveBlending}
              depthWrite={false}
              transparent
            />
          </sprite>
        )}
        {glow && light && (
          <pointLight ref={pl} position={[0, -0.25, 0]} color="#ffb070" distance={6} decay={1.6} />
        )}
      </group>
    </group>
  );
}

function jarGeometry() {
  return prop('jar-decor', (k) => {
    clayJar(k, { at: [0, 0, 0], h: 0.78 });
    k.add(new CylinderGeometry(0.15, 0.15, 0.02, 12), C.water, { at: [0, 0.74, 0] });
    k.add(new CylinderGeometry(0.1, 0.08, 0.08, 10), '#6e4730', {
      at: [0.36, 0.04, 0.12],
      vary: 0.06,
    });
  });
}

function bambooFence(plotCount: number) {
  return prop(`fence-${plotCount}`, (k) => {
    const b = plotBounds(plotCount);
    const r = rng(plotCount * 7 + 3);
    const posts: [number, number][] = [];
    const step = 0.55;
    for (let x = b.minX; x <= b.maxX + 0.01; x += step) {
      posts.push([x, b.minZ]);
      if (Math.abs(x) > 0.8) posts.push([x, b.maxZ]);
    }
    for (let z = b.minZ + step; z < b.maxZ - 0.01; z += step) {
      posts.push([b.minX, z]);
      posts.push([b.maxX, z]);
    }
    const bamboo = ['#c9b26a', '#b9a257', '#d2bd79'];
    for (const [x, z] of posts) {
      const h = 0.46 + r() * 0.08;
      k.add(new CylinderGeometry(0.032, 0.038, h, 6), bamboo[Math.floor(r() * 3)]!, {
        at: [x, h / 2, z],
        rot: [(r() - 0.5) * 0.08, 0, (r() - 0.5) * 0.08],
        ao: 0.35,
      });
      k.add(new CylinderGeometry(0.041, 0.041, 0.02, 6), '#9d8747', { at: [x, 0.28, z] });
      // Rope ties where the rails meet the post.
      for (const y of [0.2, 0.38])
        k.add(new SphereGeometry(0.03, 4, 3), '#8a6a3c', { at: [x, y, z], scale: [1.3, 0.6, 1.3] });
    }
    const w = b.maxX - b.minX;
    const d = b.maxZ - b.minZ;
    for (const y of [0.2, 0.38]) {
      k.add(new CylinderGeometry(0.018, 0.018, w, 5), bamboo[0]!, {
        at: [0, y, b.minZ],
        rot: [0, 0, Math.PI / 2 + (r() - 0.5) * 0.02],
      });
      for (const x of [b.minX, b.maxX])
        k.add(new CylinderGeometry(0.018, 0.018, d, 5), bamboo[1]!, {
          at: [x, y, (b.minZ + b.maxZ) / 2],
          rot: [Math.PI / 2, 0, 0],
        });
      for (const s of [-1, 1]) {
        const len = b.maxX - 0.8;
        k.add(new CylinderGeometry(0.018, 0.018, len, 5), bamboo[2]!, {
          at: [s * (0.8 + len / 2), y, b.maxZ],
          rot: [0, 0, Math.PI / 2],
        });
      }
    }
  });
}

/** Low bamboo fence around the plots, with a gap in front for the path. */
export function Fence({ plotCount }: { plotCount: number }) {
  const geo = useMemo(() => bambooFence(plotCount), [plotCount]);
  return <mesh geometry={geo} material={kitMaterial()} castShadow />;
}

function Scarecrow() {
  const geo = useMemo(() => scarecrowGeometry(), []);
  return <mesh geometry={geo} material={kitMaterial()} castShadow />;
}

function Jar() {
  const geo = useMemo(() => jarGeometry(), []);
  return <mesh geometry={geo} material={kitMaterial()} castShadow />;
}

const MODEL: Record<PlaceableDecor, (p: { night: boolean; lights: boolean }) => ReactNode> = {
  scarecrow: () => <Scarecrow />,
  lantern: ({ night, lights }) => <Lantern glow={night} light={lights} />,
  jar: () => <Jar />,
};

const FOOT: Record<PlaceableDecor, number> = { scarecrow: 0.3, lantern: 0.22, jar: 0.4 };

export function Decor3D({
  spots,
  night,
  lights,
  arranging,
  picked,
  onPick,
}: {
  spots: Partial<Record<PlaceableDecor, Placement>>;
  night: boolean;
  lights: boolean;
  arranging: boolean;
  picked: PlaceableDecor | null;
  onPick: (id: PlaceableDecor) => void;
}) {
  const entries = useMemo(() => Object.entries(spots) as [PlaceableDecor, Placement][], [spots]);
  const blobs = useMemo(
    () => entries.map(([id, p]) => ({ x: p.x, y: groundAt(p.x, p.z), z: p.z, r: FOOT[id] })),
    [entries],
  );
  return (
    <group>
      <Blobs items={blobs} />
      {entries.map(([id, p]) => (
        <group
          key={id}
          position={[p.x, groundAt(p.x, p.z), p.z]}
          rotation={[0, (p.rot * Math.PI) / 2, 0]}
          onClick={
            arranging
              ? (e: ThreeEvent<MouseEvent>) => {
                  e.stopPropagation();
                  if (isTap(e)) onPick(id);
                }
              : undefined
          }
        >
          {MODEL[id]({ night, lights })}
          {arranging && (
            <mesh
              position={[0, 0.03, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              material={mat(picked === id ? C.gold : C.white, {
                emissive: picked === id ? '#6a4d10' : undefined,
                transparent: picked === id ? undefined : 0.6,
              })}
            >
              <ringGeometry args={[0.42, 0.5, 20]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/** In arrange mode: the free cells where the picked decoration can go. */
export function CellMarkers({
  cells,
  onPlace,
}: {
  cells: { x: number; z: number }[];
  onPlace: (x: number, z: number) => void;
}) {
  const cellMat = mat(C.white, { transparent: 0.35 });
  return (
    <group>
      {cells.map((c) => (
        <mesh
          key={`${c.x},${c.z}`}
          position={[c.x, groundAt(c.x, c.z) + 0.04, c.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={cellMat}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            if (isTap(e)) onPlace(c.x, c.z);
          }}
        >
          <planeGeometry args={[0.82, 0.82]} />
        </mesh>
      ))}
    </group>
  );
}

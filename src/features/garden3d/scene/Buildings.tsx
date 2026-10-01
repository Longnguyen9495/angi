import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { memo, useMemo, useRef, type ReactNode } from 'react';
import { ConeGeometry, CylinderGeometry, SphereGeometry, type Group, type Mesh } from 'three';
import { ANIMALS } from '../../../data/game';
import { t } from '../../../i18n';
import type { AnimalId } from '../../../data/types';
import type { AnimalStage } from '../../../domain/selectors';
import { BUILDINGS, type BuildingId } from '../layout';
import {
  awningGeometry,
  barnGeometry,
  bucketGeometry,
  coopGeometry,
  penGeometry,
  stallGeometry,
  wellGeometry,
} from './architecture';
import { Blobs } from './Instances';
import { box, kitMaterial, prop } from './kit';
import { C, labelTexture, mat } from './materials';
import { Pond, type FishingPhase } from './Pond';
import { isTap } from './tap';

function Sign({ text, y, bg, fg }: { text: string; y: number; bg?: string; fg?: string }) {
  const tex = useMemo(() => labelTexture(text, { bg, fg }), [text, bg, fg]);
  const aspect = tex.image.width / tex.image.height;
  return (
    <sprite position={[0, y, 0]} scale={[0.46 * aspect, 0.46, 1]} renderOrder={10}>
      <spriteMaterial map={tex} transparent depthWrite={false} depthTest={false} />
    </sprite>
  );
}

function Spot({
  id,
  selected,
  onSelect,
  children,
}: {
  id: BuildingId;
  selected: boolean;
  onSelect: (id: BuildingId) => void;
  children: ReactNode;
}) {
  const p = BUILDINGS[id];
  return (
    <group
      position={[p.x, 0, p.z]}
      rotation={[0, p.rot, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (isTap(e)) onSelect(id);
      }}
    >
      {children}
      {selected && (
        <mesh
          position={[0, 0.03, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={mat(C.gold, { emissive: '#6a4d10', transparent: 0.85 })}
        >
          <ringGeometry args={[1.45, 1.56, 40]} />
        </mesh>
      )}
    </group>
  );
}

function Kitchen({ steam }: { steam: boolean }) {
  const puff = useRef<Group>(null);
  const awning = useRef<Group>(null);
  const stall = useMemo(() => stallGeometry(), []);
  const cloth = useMemo(() => awningGeometry(), []);
  const puffMats = useMemo(
    () => [0, 1, 2].map(() => mat('#ffffff', { transparent: 0.6 }).clone()),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // The awning lifts a touch in the breeze.
    if (awning.current && steam)
      awning.current.rotation.x = 0.24 + Math.sin(t * 1.6) * 0.012 + Math.sin(t * 3.7) * 0.005;
    if (!puff.current || !steam) return;
    puff.current.children.forEach((c, i) => {
      const k = (t * 0.45 + i / 3) % 1;
      c.position.set(0.62 + Math.sin(t + i) * 0.07, 1.42 + k * 0.85, 0.02);
      c.scale.setScalar(0.08 + k * 0.16);
      puffMats[i]!.opacity = 0.55 * (1 - k);
    });
  });
  return (
    <group>
      <mesh geometry={stall} material={kitMaterial()} castShadow receiveShadow />
      <group ref={awning} position={[0, 1.95, -0.02]} rotation={[0.24, 0, 0]}>
        <mesh geometry={cloth} material={kitMaterial()} castShadow />
      </group>
      <group ref={puff}>
        {puffMats.map((m, i) => (
          <mesh key={i} material={m}>
            <icosahedronGeometry args={[1, 1]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Well({ active, still }: { active: boolean; still: boolean }) {
  const bucket = useRef<Mesh>(null);
  const geo = useMemo(() => wellGeometry(), []);
  const pail = useMemo(() => bucketGeometry(), []);
  useFrame(({ clock }) => {
    if (!bucket.current || still) return;
    const t = clock.elapsedTime;
    bucket.current.position.y =
      (active ? 0.62 + Math.abs(Math.sin(t * 1.4)) * 0.4 : 0.86) + Math.sin(t * 2) * 0.01;
    bucket.current.rotation.z = Math.sin(t * 1.3) * 0.06;
  });
  return (
    <group>
      <mesh geometry={geo} material={kitMaterial()} castShadow receiveShadow />
      <mesh
        position={[0, 0.66, 0]}
        material={mat(active ? '#7fbfe0' : '#3f7390', { emissive: active ? '#1b4a66' : undefined })}
      >
        <cylinderGeometry args={[0.5, 0.5, 0.02, 16]} />
      </mesh>
      <mesh
        ref={bucket}
        geometry={pail}
        material={kitMaterial()}
        position={[0.02, 0.86, 0]}
        castShadow
      />
    </group>
  );
}

function henGeometry() {
  return prop('hen', (k) => {
    k.add(new SphereGeometry(0.16, 9, 7), C.white, {
      at: [0, 0.2, 0],
      scale: [1.15, 0.92, 0.82],
      ao: 0.3,
    });
    k.add(new ConeGeometry(0.08, 0.2, 6), '#f1ece2', { at: [-0.17, 0.3, 0], rot: [0, 0, 0.9] });
    for (const s of [-1, 1])
      k.add(new SphereGeometry(0.1, 7, 5), '#ece6da', {
        at: [-0.02, 0.21, s * 0.11],
        scale: [1.2, 0.6, 0.35],
      });
    k.add(new SphereGeometry(0.09, 8, 6), C.white, { at: [0.15, 0.36, 0] });
    for (const [x, y] of [
      [0.12, 0.45],
      [0.16, 0.46],
      [0.2, 0.44],
    ] as [number, number][])
      k.add(new SphereGeometry(0.028, 5, 4), '#d8442e', { at: [x, y, 0] });
    k.add(new SphereGeometry(0.022, 5, 4), '#d8442e', { at: [0.22, 0.3, 0], scale: [1, 1.4, 0.8] });
    k.add(new ConeGeometry(0.028, 0.08, 4), '#e8a93a', {
      at: [0.26, 0.35, 0],
      rot: [0, 0, -Math.PI / 2],
    });
    for (const s of [-1, 1]) {
      k.add(new SphereGeometry(0.014, 4, 3), '#1d1a16', { at: [0.2, 0.39, s * 0.055] });
      k.add(new CylinderGeometry(0.012, 0.012, 0.1, 4), '#e8a93a', { at: [0.02, 0.05, s * 0.05] });
    }
  });
}

/** A hen pottering about inside the fence: wanders, stops, pecks. Never leaves the pen. */
function Hen({
  cx,
  cz,
  phase,
  active,
}: {
  cx: number;
  cz: number;
  phase: number;
  active: boolean;
}) {
  const ref = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const geo = useMemo(() => henGeometry(), []);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g || !active) return;
    const t = clock.elapsedTime * 0.5 + phase;
    const x = cx + Math.sin(t * 0.46) * 0.36;
    const z = cz + Math.sin(t * 0.62 + phase) * 0.22;
    const dx = Math.cos(t * 0.46) * 0.46 * 0.36;
    const dz = Math.cos(t * 0.62 + phase) * 0.62 * 0.22;
    g.position.set(x, 0, z);
    g.rotation.y = Math.atan2(-dz, dx);
    const speed = Math.hypot(dx, dz);
    if (body.current)
      body.current.rotation.z = speed < 0.08 ? -Math.max(0, Math.sin(t * 14)) * 0.6 : 0;
  });
  return (
    <group ref={ref} position={[cx, 0, cz]}>
      <mesh ref={body} geometry={geo} material={kitMaterial()} castShadow />
    </group>
  );
}

function Coop({ stage }: { stage: AnimalStage }) {
  const geo = useMemo(() => coopGeometry(), []);
  const live = stage !== 'locked';
  return (
    <group>
      <mesh geometry={geo} material={kitMaterial()} castShadow receiveShadow />
      {live && (
        <>
          <Hen cx={0.35} cz={0.45} phase={0} active={stage !== 'hungry'} />
          <Hen cx={0.1} cz={0.55} phase={2.4} active={stage !== 'hungry'} />
        </>
      )}
      {stage === 'ready' &&
        [0, 1].map((i) => (
          <mesh
            key={i}
            position={[0.52 + i * 0.07, 0.09, -0.3 + i * 0.04]}
            scale={[1, 1.25, 1]}
            material={mat('#f3e6cf')}
          >
            <sphereGeometry args={[0.055, 8, 6]} />
          </mesh>
        ))}
    </group>
  );
}

function cowBodyGeometry() {
  return prop('cow-body', (k) => {
    k.add(new SphereGeometry(1, 12, 9), C.white, {
      at: [0, 0.62, 0],
      scale: [0.56, 0.3, 0.3],
      ao: 0.25,
    });
    for (const [x, y, z, s] of [
      [0.12, 0.7, 0.27, 0.16],
      [-0.25, 0.62, 0.26, 0.13],
      [-0.1, 0.72, -0.27, 0.17],
      [0.3, 0.6, -0.24, 0.1],
    ] as [number, number, number, number][])
      k.add(new SphereGeometry(s, 7, 5), '#3b3632', { at: [x, y, z], scale: [1.2, 0.9, 0.25] });
    for (const [x, z] of [
      [-0.34, -0.14],
      [0.34, -0.14],
      [-0.34, 0.14],
      [0.34, 0.14],
    ] as [number, number][]) {
      k.add(new CylinderGeometry(0.055, 0.045, 0.42, 6), '#f3eee4', { at: [x, 0.26, z] });
      k.add(new CylinderGeometry(0.05, 0.055, 0.06, 6), '#3b3632', { at: [x, 0.03, z] });
    }
    k.add(new SphereGeometry(0.1, 7, 5), '#f2b8a8', { at: [-0.08, 0.36, 0], scale: [1, 0.7, 1] });
    k.add(new CylinderGeometry(0.015, 0.02, 0.42, 4), '#f3eee4', {
      at: [-0.6, 0.5, 0],
      rot: [0, 0, -0.3],
    });
    k.add(new SphereGeometry(0.045, 5, 4), '#3b3632', { at: [-0.66, 0.3, 0] });
  });
}

function cowHeadGeometry() {
  return prop('cow-head', (k) => {
    k.add(box(0.3, 0.26, 0.26), C.white, { at: [0.15, -0.04, 0], rough: 0.03 });
    k.add(box(0.12, 0.16, 0.24), '#f2b8a8', { at: [0.33, -0.1, 0], rough: 0.02 });
    for (const s of [-1, 1]) {
      k.add(new SphereGeometry(0.018, 4, 3), '#3b3632', { at: [0.39, -0.09, s * 0.06] });
      k.add(new SphereGeometry(0.02, 5, 4), '#1d1a16', { at: [0.24, 0.03, s * 0.13] });
      k.add(new SphereGeometry(0.06, 6, 4), '#f3eee4', {
        at: [0.08, 0.06, s * 0.17],
        scale: [0.6, 0.35, 1],
      });
      k.add(new ConeGeometry(0.025, 0.12, 5), '#e6d7a8', {
        at: [0.1, 0.13, s * 0.1],
        rot: [s * 0.4, 0, 0],
      });
    }
  });
}

function Cow({ active }: { active: boolean }) {
  const head = useRef<Group>(null);
  const body = useMemo(() => cowBodyGeometry(), []);
  const face = useMemo(() => cowHeadGeometry(), []);
  useFrame(({ clock }) => {
    if (!head.current || !active) return;
    const t = clock.elapsedTime;
    head.current.rotation.z = -0.35 - Math.max(0, Math.sin(t * 0.7)) * 0.45; // grazing
    head.current.rotation.x = Math.sin(t * 2.3) * 0.04; // chewing
  });
  return (
    <group position={[0.05, 0, 0.18]}>
      <mesh geometry={body} material={kitMaterial()} castShadow />
      <group ref={head} position={[0.5, 0.72, 0]} rotation={[0, 0, -0.35]}>
        <mesh geometry={face} material={kitMaterial()} castShadow />
      </group>
    </group>
  );
}

function Pen({ stage }: { stage: AnimalStage }) {
  const geo = useMemo(() => penGeometry(), []);
  return (
    <group>
      <mesh geometry={geo} material={kitMaterial()} castShadow receiveShadow />
      {stage !== 'locked' && <Cow active={stage !== 'hungry'} />}
      {stage === 'ready' && (
        <group position={[-0.62, 0, 0.55]}>
          <mesh position={[0, 0.16, 0]} material={mat('#c9c6bd')}>
            <cylinderGeometry args={[0.1, 0.12, 0.32, 10]} />
          </mesh>
          <mesh position={[0, 0.34, 0]} material={mat('#fbf8ef')}>
            <cylinderGeometry args={[0.06, 0.09, 0.06, 10]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

const ANIMAL_SIGN: Record<AnimalStage, string | null> = {
  locked: null,
  hungry: t.farm.garden3d.signs.hungry,
  busy: null,
  ready: t.farm.garden3d.signs.ready,
};

/** Contact shadows under each building. */
const FOOTPRINTS: { x: number; z: number; r: number; sx?: number }[] = [
  { x: BUILDINGS.barn.x, z: BUILDINGS.barn.z, r: 1.25, sx: 1.2 },
  { x: BUILDINGS.kitchen.x, z: BUILDINGS.kitchen.z, r: 1.0, sx: 1.6 },
  { x: BUILDINGS.well.x, z: BUILDINGS.well.z, r: 0.9 },
  { x: BUILDINGS.chicken.x - 0.2, z: BUILDINGS.chicken.z - 0.2, r: 0.75 },
];

export const Buildings = memo(function Buildings({
  selected,
  animals,
  watering,
  steam,
  fishing = 'idle',
  onSelect,
}: {
  selected: BuildingId | null;
  animals: Record<AnimalId, AnimalStage>;
  watering: boolean;
  steam: boolean;
  /** Fishing state at the pond (rod, line and bobber show while fishing). */
  fishing?: FishingPhase;
  onSelect: (id: BuildingId) => void;
}) {
  const barn = useMemo(() => barnGeometry(), []);
  const animalSign = (id: AnimalId) => {
    const st = animals[id];
    if (st === 'locked')
      return <Sign text={t.farm.garden3d.signs.unlockAt(ANIMALS[id].unlockLevel)} y={1.7} />;
    const sign = ANIMAL_SIGN[st];
    return sign ? (
      <Sign
        text={sign}
        y={1.75}
        bg={st === 'ready' ? 'rgba(215,168,93,0.95)' : undefined}
        fg={st === 'ready' ? '#1d1a16' : undefined}
      />
    ) : null;
  };
  return (
    <group>
      <Blobs items={FOOTPRINTS} />
      <Spot id="kitchen" selected={selected === 'kitchen'} onSelect={onSelect}>
        <Kitchen steam={steam} />
        <Sign text={t.farm.garden3d.signs.kitchen} y={2.55} />
      </Spot>
      <Spot id="barn" selected={selected === 'barn'} onSelect={onSelect}>
        <mesh geometry={barn} material={kitMaterial()} castShadow receiveShadow />
        <Sign text={t.farm.garden3d.signs.barn} y={2.75} />
      </Spot>
      <Spot id="well" selected={selected === 'well'} onSelect={onSelect}>
        <Well active={watering} still={!steam} />
      </Spot>
      <Spot id="chicken" selected={selected === 'chicken'} onSelect={onSelect}>
        <Coop stage={animals.chicken} />
        {animalSign('chicken')}
      </Spot>
      <Spot id="cow" selected={selected === 'cow'} onSelect={onSelect}>
        <Pen stage={animals.cow} />
        {animalSign('cow')}
      </Spot>
      <Spot id="pond" selected={selected === 'pond'} onSelect={onSelect}>
        <Pond phase={fishing} reduced={!steam} />
        {fishing === 'bite' && (
          <Sign text={t.farm.garden3d.signs.bite} y={1.2} bg="rgba(215,168,93,0.95)" fg="#1d1a16" />
        )}
      </Spot>
    </group>
  );
});

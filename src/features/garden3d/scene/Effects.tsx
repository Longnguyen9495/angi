import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { rng } from '../layout';
import { C, mat } from './materials';

export type FxKind = 'water' | 'harvest' | 'plant' | 'collect';

export interface FxEvent {
  id: number;
  kind: FxKind;
  x: number;
  z: number;
}

/** How long one burst lives (ms); the owner drops it afterwards. */
export const FX_MS = 1400;

const COLOR: Record<FxKind, string[]> = {
  water: [C.water, '#9fd6f2'],
  harvest: [C.gold, C.yellow, C.white],
  plant: [C.dirt, C.dirtDark],
  collect: [C.white, C.gold],
};

function WateringCan() {
  return (
    <group rotation={[0, 0, 0.5]}>
      <mesh material={mat('#4f8fb8')}>
        <cylinderGeometry args={[0.22, 0.25, 0.36, 10]} />
      </mesh>
      <mesh position={[0.3, 0.08, 0]} rotation={[0, 0, -1]} material={mat('#4f8fb8')}>
        <cylinderGeometry args={[0.03, 0.05, 0.42, 6]} />
      </mesh>
      <mesh position={[-0.05, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat('#3d7196')}>
        <torusGeometry args={[0.14, 0.025, 5, 10, Math.PI]} />
      </mesh>
    </group>
  );
}

function Burst({ ev }: { ev: FxEvent }) {
  const group = useRef<Group>(null);
  const start = useRef<number | null>(null);
  const bits = useMemo(() => {
    const r = rng(ev.id * 13 + 1);
    const n = ev.kind === 'water' ? 14 : 10;
    return Array.from({ length: n }, (_, i) => ({
      a: r() * Math.PI * 2,
      speed: 0.6 + r() * 0.9,
      up: ev.kind === 'water' ? -0.2 : 1.4 + r() * 1.2,
      delay: ev.kind === 'water' ? r() * 0.8 : 0,
      color: COLOR[ev.kind][i % COLOR[ev.kind].length]!,
      size: 0.05 + r() * 0.05,
    }));
  }, [ev.id, ev.kind]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    if (start.current === null) start.current = clock.elapsedTime;
    const t = clock.elapsedTime - start.current;
    g.children.forEach((c, i) => {
      const b = bits[i];
      if (!b) {
        // The watering can: bob and tilt while pouring.
        c.visible = ev.kind === 'water' && t < 1.1;
        c.rotation.z = Math.min(1, t * 3) * 0.6;
        return;
      }
      const k = Math.max(0, t - b.delay);
      if (ev.kind === 'water') {
        // Drops fall from the spout onto the bed.
        const f = (k * 1.6) % 1;
        c.visible = t < 1.2 && k > 0;
        c.position.set(0.35 + Math.cos(b.a) * 0.25 * f, 1.35 - f * 1.1, Math.sin(b.a) * 0.25 * f);
      } else {
        c.visible = k < 1.1;
        c.position.set(
          Math.cos(b.a) * b.speed * k,
          0.4 + b.up * k - 2.6 * k * k,
          Math.sin(b.a) * b.speed * k,
        );
      }
      c.scale.setScalar(b.size * Math.max(0.001, 1 - k * 0.7));
    });
  });

  return (
    <group ref={group} position={[ev.x, 0, ev.z]}>
      {bits.map((b, i) => (
        <mesh
          key={i}
          material={mat(b.color, { emissive: ev.kind === 'harvest' ? '#6a4d10' : undefined })}
          scale={b.size}
        >
          {ev.kind === 'water' ? (
            <sphereGeometry args={[1, 5, 4]} />
          ) : (
            <octahedronGeometry args={[1, 0]} />
          )}
        </mesh>
      ))}
      <group position={[-0.2, 1.5, 0]}>
        <WateringCan />
      </group>
    </group>
  );
}

export function Effects({ events }: { events: FxEvent[] }) {
  return (
    <>
      {events.map((e) => (
        <Burst key={e.id} ev={e} />
      ))}
    </>
  );
}

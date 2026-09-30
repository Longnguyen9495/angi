import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import type { Plot } from '../../../domain/progress';
import { isWet, plotGrowth, plotStage, type PlotStage } from '../../../domain/selectors';
import { PLOT_SIZE, plotPosition } from '../layout';
import { RIDGE_TOP, RIDGE_Z, bedGeometries } from './bedGeometry';
import { CropModel } from './Crop';
import { Blobs } from './Instances';
import { kitMaterial } from './kit';
import { C, labelTexture, mat } from './materials';
import { isTap } from './tap';

const STAGE_SCALE: Record<Exclude<PlotStage, 'empty'>, number> = {
  sprout: 0.9,
  young: 0.8,
  flowering: 0.95,
  ready: 1,
};

/** Spots for 1 or 3 plants, each on top of a ridge row. */
const SPOTS: Record<number, [number, number][]> = {
  1: [[0, RIDGE_Z[1]]],
  3: [
    [-0.38, RIDGE_Z[0]],
    [0.36, RIDGE_Z[1]],
    [-0.08, RIDGE_Z[2]],
  ],
};

interface PlotBedProps {
  plot: Plot;
  index: number;
  now: number;
  selected: boolean;
  plants: number;
  reduced: boolean;
  thirsty: boolean;
  onSelect: (plotId: number) => void;
}

const PlotBed = memo(function PlotBed({
  plot,
  index,
  now,
  selected,
  plants,
  reduced,
  thirsty,
  onSelect,
}: PlotBedProps) {
  const [x, z] = plotPosition(index);
  const stage = plotStage(plot, now);
  const wet = isWet(plot, now);
  const sway = useRef<Group>(null);
  const pop = useRef<Group>(null);
  const star = useRef<Mesh>(null);
  const born = useRef({ stage, at: -1 });
  const phase = index * 1.37;

  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.elapsedTime;
    if (sway.current) {
      sway.current.rotation.z = Math.sin(t * 1.6 + phase) * 0.06;
      sway.current.rotation.x = Math.cos(t * 1.3 + phase) * 0.04;
    }
    // Each new stage pops in once: scale 0.6 → overshoot → 1.
    if (born.current.stage !== stage) born.current = { stage, at: t };
    if (born.current.at < 0) born.current.at = t - 1;
    const k = Math.min(1, (t - born.current.at) / 0.55);
    const s = k >= 1 ? 1 : 0.6 + 0.4 * (1 - Math.pow(1 - k, 3)) + Math.sin(k * Math.PI) * 0.12;
    if (pop.current)
      pop.current.scale.setScalar(s * STAGE_SCALE[stage === 'empty' ? 'sprout' : stage]);
    if (star.current) {
      star.current.rotation.y = t * 1.8;
      star.current.position.y = 1.35 + Math.sin(t * 2.4 + phase) * 0.08;
    }
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (isTap(e)) onSelect(plot.id);
  };
  const progress = plotGrowth(plot, now);
  const spots = SPOTS[plants] ?? SPOTS[1]!;
  const geo = bedGeometries();
  // Freshly watered soil is a shade darker — matte, never shiny.
  const soilTint = kitMaterial(wet ? { tint: '#8a8078' } : {});

  return (
    <group position={[x, 0, z]}>
      {/* Raised bed: two stacked boards a side, corner posts, hilled rows, crumbs, grass at the foot. */}
      <mesh
        geometry={geo.frame}
        material={kitMaterial()}
        castShadow
        receiveShadow
        onClick={click}
      />
      <mesh geometry={geo.posts} material={kitMaterial()} castShadow onClick={click} />
      <mesh geometry={geo.base} material={soilTint} receiveShadow onClick={click} />
      <mesh geometry={geo.ridges} material={soilTint} castShadow receiveShadow onClick={click} />
      <mesh geometry={geo.clods} material={soilTint} />
      <mesh geometry={geo.fringe} material={kitMaterial({ sway: 0.08 })} />

      {plot.crop && stage !== 'empty' && (
        <group ref={sway} position={[0, RIDGE_TOP - 0.03, 0]}>
          <group ref={pop}>
            {spots.map(([sx, sz], i) => (
              <group
                key={i}
                position={[sx, 0, sz]}
                rotation={[0, i * 2.1 + index, 0]}
                scale={i === 0 && plants > 1 ? 1.05 : 0.92}
              >
                <CropModel crop={plot.crop!} stage={stage} />
              </group>
            ))}
          </group>
        </group>
      )}

      {/* Growth bar on the front edge of the bed. */}
      {plot.crop && stage !== 'ready' && stage !== 'empty' && (
        <group position={[0, 0.27, PLOT_SIZE / 2 + 0.1]}>
          <mesh position={[0, 0, 0]} material={mat('#3a2a1c')}>
            <boxGeometry args={[PLOT_SIZE - 0.3, 0.05, 0.05]} />
          </mesh>
          <mesh
            position={[-(PLOT_SIZE - 0.3) / 2 + ((PLOT_SIZE - 0.3) * progress) / 2, 0.01, 0.01]}
            material={mat(wet ? C.water : C.gold, { emissive: wet ? '#1b4a66' : '#5a4210' })}
          >
            <boxGeometry args={[Math.max(0.01, (PLOT_SIZE - 0.3) * progress), 0.055, 0.055]} />
          </mesh>
        </group>
      )}

      {stage === 'ready' && (
        <mesh ref={star} position={[0, 1.35, 0]} material={mat(C.gold, { emissive: '#8a6a10' })}>
          <octahedronGeometry args={[0.13, 0]} />
        </mesh>
      )}

      {(selected || thirsty) && (
        <mesh
          position={[0, 0.03, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={mat(thirsty && !selected ? C.water : C.gold, {
            emissive: thirsty && !selected ? '#1b4a66' : '#6a4d10',
          })}
        >
          <ringGeometry args={[PLOT_SIZE * 0.72, PLOT_SIZE * 0.8, 4, 1, Math.PI / 4]} />
        </mesh>
      )}
    </group>
  );
});

const STAKE = PLOT_SIZE / 2 - 0.06;
const STAKES: [number, number][] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

/** The "coming soon" plot: staked-out earth and a level sign. */
function LockedPlot({ index, level }: { index: number; level: number }) {
  const [x, z] = plotPosition(index);
  const tex = useMemo(() => labelTexture(`Mở ở cấp ${level}`), [level]);
  const aspect = tex.image.width / tex.image.height;
  return (
    <group position={[x, 0, z]}>
      {/* Ground marked out for the next bed: bare earth, four stakes and twine, boards waiting. */}
      <mesh position={[0, 0.015, 0]} material={mat('#b48a5c')} receiveShadow>
        <boxGeometry args={[PLOT_SIZE - 0.05, 0.03, PLOT_SIZE - 0.05]} />
      </mesh>
      {STAKES.map(([sx, sz]) => (
        <mesh
          key={sx * 2 + sz}
          position={[sx * STAKE, 0.17, sz * STAKE]}
          material={mat(C.wood)}
          castShadow
        >
          <boxGeometry args={[0.05, 0.34, 0.05]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0, 0.27, s * STAKE]} material={mat('#efe2bd')}>
            <boxGeometry args={[STAKE * 2, 0.012, 0.012]} />
          </mesh>
          <mesh position={[s * STAKE, 0.27, 0]} material={mat('#efe2bd')}>
            <boxGeometry args={[0.012, 0.012, STAKE * 2]} />
          </mesh>
        </group>
      ))}
      {[0, 1].map((k) => (
        <mesh
          key={k}
          position={[0.15 - k * 0.05, 0.045 + k * 0.07, 0.25 + k * 0.05]}
          rotation={[0, 0.25 - k * 0.3, 0]}
          material={mat(k ? C.wood : C.woodDark)}
          castShadow
        >
          <boxGeometry args={[PLOT_SIZE * 0.85, 0.07, 0.16]} />
        </mesh>
      ))}
      <sprite position={[0, 0.7, 0]} scale={[0.48 * aspect, 0.48, 1]}>
        <spriteMaterial map={tex} transparent depthWrite={false} />
      </sprite>
    </group>
  );
}

export function Plots({
  plots,
  now,
  selectedPlot,
  plants,
  reduced,
  wateringIds,
  nextPlotLevel,
  onSelect,
}: {
  plots: Plot[];
  now: number;
  selectedPlot: number | null;
  plants: number;
  reduced: boolean;
  /** Plots that can be watered right now (highlighted in watering mode). */
  wateringIds: Set<number>;
  nextPlotLevel: number | null;
  onSelect: (plotId: number) => void;
}) {
  const count = plots.length;
  const blobs = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const [x, z] = plotPosition(i);
        return { x, z, r: PLOT_SIZE * 0.62 };
      }),
    [count],
  );
  return (
    <group>
      <Blobs items={blobs} />
      {plots.map((p, i) => (
        <PlotBed
          key={p.id}
          plot={p}
          index={i}
          now={now}
          selected={selectedPlot === p.id}
          plants={plants}
          reduced={reduced}
          thirsty={wateringIds.has(p.id)}
          onSelect={onSelect}
        />
      ))}
      {nextPlotLevel !== null && plots.length < 9 && (
        <LockedPlot index={plots.length} level={nextPlotLevel} />
      )}
    </group>
  );
}

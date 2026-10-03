import { Canvas } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { ANIMALS, ANIMAL_LIST, DECOR } from '../../data/game';
import type { AnimalId, DecorId } from '../../data/types';
import type { AnimalStage } from '../../domain/selectors';
import type { FriendGarden } from '../../services/account';
import { friendPlots } from './friendGarden';
import { decorSpots } from './layout';
import { QUALITY, deviceQuality } from './quality';
import { Buildings } from './scene/Buildings';
import { CameraRig, type CameraHandle } from './scene/CameraRig';
import { Chef } from './scene/Chef';
import { Decor3D, Fence } from './scene/Decor3D';
import { Island } from './scene/Island';
import { Plots } from './scene/Plots';
import { Sky } from './scene/Sky';
import { hourOf, skyAt } from './sky';
import './garden3d.css';

function friendAnimals(garden: FriendGarden, now: number): Record<AnimalId, AnimalStage> {
  return Object.fromEntries(
    ANIMAL_LIST.map((a) => {
      const s = garden.animals[a.id];
      let stage: AnimalStage;
      if (garden.level < ANIMALS[a.id].unlockLevel) stage = 'locked';
      else if (!s || s.readyAt === null) stage = 'hungry';
      else stage = now >= s.readyAt ? 'ready' : 'busy';
      return [a.id, stage];
    }),
  ) as Record<AnimalId, AnimalStage>;
}

/** A friend's island, look-only: same scene as ours, no actions but picking a plot. */
export default function FriendIsland({
  garden,
  now,
  reduced,
  selectedPlot,
  highlight,
  onPlot,
}: {
  garden: FriendGarden;
  now: number;
  reduced: boolean;
  selectedPlot: number | null;
  /** Plots the visitor can water. */
  highlight: Set<number>;
  onPlot: (plotId: number) => void;
}) {
  const q = QUALITY[deviceQuality()];
  const cam = useRef<CameraHandle>(null);
  const plots = useMemo(() => friendPlots(garden), [garden]);
  const decor = useMemo(
    () => garden.decor.filter((d): d is DecorId => Object.hasOwn(DECOR, d)),
    [garden.decor],
  );
  const spots = useMemo(
    () => decorSpots(decor, garden.decorLayout as Parameters<typeof decorSpots>[1]),
    [decor, garden.decorLayout],
  );
  const look = useMemo(() => skyAt(Math.round(hourOf(now) * 12) / 12), [now]);
  return (
    <div className="g3d g3d--visit">
      <div className="g3d__stage" aria-hidden="true">
        <Canvas
          frameloop={reduced ? 'demand' : 'always'}
          dpr={q.dpr}
          shadows={q.shadows ? 'soft' : false}
          camera={{ fov: 38, near: 0.5, far: 200, position: [0, 14, 17] }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <Sky
            look={look}
            clouds={q.clouds}
            shadowSize={q.shadows ? q.shadowSize : 0}
            reduced={reduced}
          />
          <Island grass={q.grass} reduced={reduced} />
          <Plots
            plots={plots}
            now={now}
            selectedPlot={selectedPlot}
            plants={q.plantsPerPlot}
            reduced={reduced}
            wateringIds={highlight}
            nextPlotLevel={null}
            onSelect={onPlot}
          />
          <Buildings
            selected={null}
            animals={friendAnimals(garden, now)}
            watering={highlight.size > 0}
            steam={!reduced}
            onSelect={() => undefined}
          />
          {decor.includes('fence') && <Fence plotCount={plots.length} />}
          <Decor3D
            spots={spots}
            night={look.night}
            lights={q.lights}
            arranging={false}
            picked={null}
            onPick={() => undefined}
          />
          <Chef reduced={reduced} />
          <CameraRig handle={cam} reduced={reduced} />
        </Canvas>
      </div>
    </div>
  );
}

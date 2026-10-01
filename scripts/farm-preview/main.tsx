/* eslint-disable react-refresh/only-export-components -- dev preview tool, not part of the app */
import * as pc from 'playcanvas';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CROP_LIST } from '../../src/data/game';
import type { CropId } from '../../src/data/types';
import { currentTime } from '../../src/domain/time';
import FarmPlayCanvas from '../../src/features/farm-pc/FarmPlayCanvas';
import { FeedbackProvider } from '../../src/state/FeedbackProvider';
import { GameProvider } from '../../src/state/GameProvider';
import { useGame } from '../../src/state/hooks';
import '../../src/styles/index.css';

/*
 * The PlayCanvas garden with the real reducer and persistence (same wiring as
 * GardenSection), outside the journey drawer: ?scene=corner-vN loads an Editor
 * export, without it the code-built corner shows. Used for screenshots.
 */
function Preview() {
  const { state, dispatch, now, reduced } = useGame();
  const [picked, setPicked] = useState<CropId | null>(null);
  const seeds = CROP_LIST.filter((c) => state.seeds[c.id] > 0).map((c) => c.id);
  const active = picked && state.seeds[picked] > 0 ? picked : (seeds[0] ?? null);
  return (
    <FarmPlayCanvas
      state={state}
      now={now}
      reduced={reduced}
      dayPart="noon"
      watering={false}
      activeSeed={active}
      seeds={seeds}
      onPickSeed={setPicked}
      onPlant={(plotId, crop) =>
        dispatch({ type: 'PLANT_FROM_TRAY', crop, plotId, now: currentTime() })
      }
      onWater={(plotId) => dispatch({ type: 'WATER', plotId, now: currentTime() })}
      onHarvest={() => dispatch({ type: 'HARVEST_ALL', now: currentTime() })}
      onFlat={() => {}}
      onClassic={() => {}}
    />
  );
}

// For inspecting the running app from DevTools: pc.AppBase.getApplication().
(window as unknown as { pc: typeof pc }).pc = pc;

createRoot(document.getElementById('root')!).render(
  <GameProvider>
    <FeedbackProvider>
      <Preview />
    </FeedbackProvider>
  </GameProvider>,
);

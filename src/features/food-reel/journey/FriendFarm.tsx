import { Suspense, lazy } from 'react';
import {
  ANIMALS,
  CROPS,
  FARM_PLOT_COUNT,
  MAX_PLOT_COUNT,
  PLOT_UNLOCK_LEVELS,
} from '../../../data/game';
import type { AnimalId, CropId, DecorId } from '../../../data/types';
import { DECOR } from '../../../data/game';
import type { DecorSlots } from '../../../data/decorSlots';
import { cropSprite, produceSprite } from '../../../data/sprites';
import { harvestsLeft, isWet, plotStage } from '../../../domain/selectors';
import { formatDuration } from '../../../domain/time';
import type { FarmView } from '../../farm-anim/FarmScene';
import type { FriendGarden } from '../../../services/account';
import { friendPlots } from '../../garden3d/friendGarden';
import { t } from '../../../i18n';

const FarmScene = lazy(() => import('../../farm-anim/FarmScene'));
const v = t.journey.visit;

/**
 * A friend's garden in the same painted 2D farm as our own, look-only: their plots and
 * animals as they saved them. Bubbles show only what the visitor may do — a water drop
 * over a plot to water, a basket over a long-ripe plot to pick — and a tap on that plot
 * (or its bubble) does it.
 */
export function FriendFarm({
  garden,
  now,
  reduced,
  quality,
  waterable,
  pickable,
  onPlot,
}: {
  garden: FriendGarden;
  now: number;
  reduced: boolean;
  quality: 'low' | 'medium' | 'high';
  waterable: Set<number>;
  pickable: Set<number>;
  onPlot: (plotId: number) => void;
}) {
  const plots = friendPlots(garden);
  const view: FarmView = {
    watering: false,
    // Their decorations where they put them, and their garden's name on the board.
    decor: garden.decor.filter((d): d is DecorId => Object.hasOwn(DECOR, d)),
    decorSlots: (garden.decorSlots ?? {}) as DecorSlots,
    sign: garden.name || null,
    plots: Array.from({ length: MAX_PLOT_COUNT }, (_, i) => {
      const id = i + 1;
      const plot = plots.find((p) => p.id === id);
      const unlockLevel =
        id > FARM_PLOT_COUNT ? (PLOT_UNLOCK_LEVELS[id - FARM_PLOT_COUNT - 1] ?? null) : null;
      if (!plot)
        return {
          id,
          unlocked: false,
          unlockLevel,
          crop: null,
          stage: 'empty' as const,
          image: null,
          wet: false,
          thirsty: false,
          label: v.plot(id, v.empty),
          mark: null,
        };
      const stage = plotStage(plot, now);
      const crop = plot.crop ? CROPS[plot.crop] : null;
      const left =
        plot.readyAt && plot.readyAt > now ? v.timeLeft(formatDuration(plot.readyAt - now)) : '';
      return {
        id,
        unlocked: true,
        unlockLevel: null,
        crop: plot.crop,
        stage,
        image: plot.crop && stage !== 'empty' ? cropSprite(plot.crop as CropId, stage) : null,
        wet: isWet(plot, now),
        thirsty: false,
        needsWater: waterable.has(id),
        label: v.plot(id, crop ? crop.name : v.empty) + left,
        kind: crop?.kind,
        harvests: plot.harvests ?? 0,
        left: harvestsLeft(plot),
        cycle: plot.plantedAt,
        produce: plot.crop ? produceSprite(plot.crop as CropId) : null,
        yield: crop?.yield,
        // Only what the visitor can do gets a bubble: a ripe plot already picked has none.
        mark: pickable.has(id) ? ('ready' as const) : waterable.has(id) ? ('water' as const) : null,
      };
    }),
    cow: animal('cow'),
    chicken: animal('chicken'),
  };

  function animal(id: AnimalId): FarmView['cow'] {
    const def = ANIMALS[id];
    const s = garden.animals[id];
    if (garden.level < def.unlockLevel) return { kind: 'locked', icon: null, label: def.name };
    if (s?.readyAt && now >= s.readyAt)
      return { kind: 'ready', icon: produceSprite(def.product), label: def.name };
    return { kind: s?.readyAt ? 'busy' : 'hungry', icon: null, label: def.name };
  }

  return (
    <div className="fj-visit__farm">
      <Suspense fallback={<p className="fa-loading">{v.flying}</p>}>
        <FarmScene
          className="fj-visit__scene"
          mode="game"
          focus="field"
          // The sheet is smaller than the screen: come closer to the field (drag to see the rest).
          zoom={1.7}
          farm={view}
          reduced={reduced}
          quality={quality}
          label={v.plotsLabel}
          onPlace={(place, info) => {
            if (place === 'plot' && info.plotId !== undefined) onPlot(info.plotId);
          }}
        />
      </Suspense>
    </div>
  );
}

import type { PointerEvent as ReactPointerEvent } from 'react';
import { CropIcon } from '../../../components/ui/CropIcon';
import type { CropId, ProduceId, RecipeId } from '../../../data/types';
import { t } from '../../../i18n';

const m = t.journey.garden;

export type PlotCardMode =
  | { kind: 'locked'; level: string }
  | { kind: 'empty' }
  | {
      kind: 'growing';
      crop: string;
      left: string;
      water: { ok: boolean; note: string; cans: number };
    }
  | { kind: 'ready'; crop: string }
  | { kind: 'harvested'; produce: string; crop: ProduceId };

export interface CookIdea {
  id: RecipeId;
  name: string;
  canCook: boolean;
  missing: string;
}

/**
 * The card that opens over a tapped plot of the painted farm: seeds to drag in (or tap), the
 * watering can, the harvest, and after a harvest the dishes it can go into.
 */
export function FarmPlotCard({
  plotId,
  at,
  mode,
  seeds,
  onSeedDown,
  onWater,
  onHarvest,
  cook,
  onCook,
  onClose,
}: {
  plotId: number;
  /** Anchor in the scene box (top of the plot), CSS px; `below` near the top; null = docked at the bottom (phones). */
  at: { x: number; y: number; below: boolean } | null;
  mode: PlotCardMode;
  seeds: { id: CropId; name: string; count: number }[];
  onSeedDown: (crop: CropId) => (e: ReactPointerEvent) => void;
  onWater: () => void;
  onHarvest: () => void;
  cook: CookIdea[];
  onCook: (id: RecipeId) => void;
  onClose: () => void;
}) {
  return (
    <div
      className={`fj-plot-card${!at ? ' is-docked' : at.below ? ' is-below' : ''}`}
      style={at ? { left: at.x, top: at.y } : undefined}
      data-game-overlay
      role="dialog"
      aria-label={m.cardPlot(plotId)}
    >
      <div className="fj-plot-card__head">
        <strong>{m.cardPlot(plotId)}</strong>
        <button
          type="button"
          className="fj-plot-card__x"
          onClick={onClose}
          aria-label={m.placeClose}
        >
          ×
        </button>
      </div>

      {mode.kind === 'locked' && <p>{m.cardLocked(mode.level)}</p>}

      {mode.kind === 'empty' &&
        (seeds.length === 0 ? (
          <p>{m.cardNoSeed}</p>
        ) : (
          <>
            <p>{m.cardEmpty}</p>
            <div className="fj-plot-card__seeds">
              {seeds.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="fj-plot-card__seed"
                  onPointerDown={onSeedDown(s.id)}
                  title={s.name}
                >
                  <CropIcon crop={s.id} size={30} />
                  <span>{s.name}</span>
                  <b>×{s.count}</b>
                </button>
              ))}
            </div>
          </>
        ))}

      {mode.kind === 'growing' && (
        <>
          <p>{m.cardGrowing(mode.crop, mode.left)}</p>
          {mode.water.ok ? (
            <button type="button" className="fj-plot-card__act is-water" onClick={onWater}>
              💧 {m.cardWater} <small>· {m.cardWaterLeft(mode.water.cans)}</small>
            </button>
          ) : (
            <p className="fj-plot-card__note">{mode.water.note}</p>
          )}
        </>
      )}

      {mode.kind === 'ready' && (
        <>
          <p>{m.cardReady(mode.crop)}</p>
          <button type="button" className="fj-plot-card__act is-harvest" onClick={onHarvest}>
            🧺 {m.cardHarvest}
          </button>
        </>
      )}

      {mode.kind === 'harvested' && (
        <>
          <p className="fj-plot-card__got">
            <CropIcon crop={mode.crop} size={22} /> {m.cardHarvested(mode.produce)}
          </p>
          {cook.length === 0 ? (
            <p className="fj-plot-card__note">{m.cardNoRecipe}</p>
          ) : (
            <>
              <p className="fj-plot-card__label">{m.cardCookWith}</p>
              <ul className="fj-plot-card__cook">
                {cook.map((r) => (
                  <li key={r.id}>
                    <span>
                      {r.name}
                      {!r.canCook && <small> · {m.cardMissing(r.missing)}</small>}
                    </span>
                    <button type="button" disabled={!r.canCook} onClick={() => onCook(r.id)}>
                      {m.cardCook}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

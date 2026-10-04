import { ArrowsLeftRight, Archive, CaretLeft, CaretRight, Plant } from '@phosphor-icons/react';
import { DECOR } from '../../../data/game';
import { decorSlot, type DecorSlots } from '../../../data/decorSlots';
import { decorSprite } from '../../../data/sprites';
import type { DecorId } from '../../../data/types';
import { t } from '../../../i18n';

const m = t.journey.garden;

/**
 * Arranging the garden: the decorations the guest owns (put-away ones dimmed), and for the
 * picked one: step to the previous / next free slot, mirror it, put it away or bring it back.
 * Tapping a decoration and then a free ring on the farm does the same as the arrows.
 */
export function DecorBar({
  owned,
  slots,
  picked,
  onPick,
  onStep,
  onFlip,
  onStore,
}: {
  owned: DecorId[];
  slots: DecorSlots;
  picked: DecorId | null;
  onPick: (id: DecorId | null) => void;
  onStep: (dir: 1 | -1) => void;
  onFlip: () => void;
  /** Put the picked one away, or bring it back onto a free slot. */
  onStore: () => void;
}) {
  const at = picked ? decorSlot(picked, slots) : null;
  return (
    <div className="fg-decorbar">
      <div className="fg-seeds fg-decorbar__list" role="radiogroup" aria-label={m.arrangeLabel}>
        {owned.map((id) => {
          const away = decorSlot(id, slots) === null;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={picked === id}
              aria-label={away ? `${DECOR[id].name}, ${m.decorAway}` : DECOR[id].name}
              title={DECOR[id].name}
              className={`fg-seed fg-decor${picked === id ? ' is-on' : ''}${away ? ' is-away' : ''}`}
              onClick={() => onPick(picked === id ? null : id)}
            >
              <img src={decorSprite(id)} alt="" width={40} height={40} draggable={false} />
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="fg-seeds fg-decorbar__acts">
          <button
            type="button"
            className="fg-seed fg-decorbar__act"
            onClick={() => onStep(-1)}
            aria-label={m.decorPrev}
          >
            <CaretLeft size={18} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="fg-seed fg-decorbar__act"
            onClick={() => onStep(1)}
            aria-label={m.decorNext}
          >
            <CaretRight size={18} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="fg-seed fg-decorbar__act"
            onClick={onFlip}
            disabled={!at}
            aria-label={m.decorFlip}
            title={m.decorFlip}
          >
            <ArrowsLeftRight size={18} weight="bold" aria-hidden="true" />
          </button>
          <button type="button" className="fg-seed fg-decorbar__act" onClick={onStore}>
            {at ? (
              <Archive size={18} weight="bold" aria-hidden="true" />
            ) : (
              <Plant size={18} weight="bold" aria-hidden="true" />
            )}
            <span className="fg-seed__name">{at ? m.decorStore : m.decorPlace}</span>
          </button>
        </div>
      )}
    </div>
  );
}

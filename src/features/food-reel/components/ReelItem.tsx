import { memo, useState, type CSSProperties, type Ref } from 'react';
import { formatReelPrice, REGION_LABEL } from '../data/reelCatalogue';
import type { ReelDish } from '../foodReel.types';
import { pad3 } from '../utils';

interface ReelItemProps {
  dish: ReelDish;
  number: number;
  isCentre: boolean;
  isWinner: boolean;
  useFull: boolean;
  busy: boolean;
  driftSeed: number;
  /** Virtual index of this slot, handed back on activation. */
  vi: number;
  onActivate: (vi: number) => void;
  onHover?: (hover: boolean) => void;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * One dish on the reel. Outer transform/opacity come from the frame loop;
 * the inner layer owns the slow idle drift and pointer tilt (CSS).
 */
export const ReelItem = memo(function ReelItem({
  dish,
  number,
  isCentre,
  isWinner,
  useFull,
  busy,
  driftSeed,
  vi,
  onActivate,
  onHover,
  ref,
}: ReelItemProps) {
  const [fullLoaded, setFullLoaded] = useState(false);
  return (
    <button
      ref={ref}
      type="button"
      className={`fr-item ${isCentre ? 'is-centre' : ''} ${isWinner ? 'is-winner' : ''}`}
      tabIndex={isCentre ? 0 : -1}
      data-reel-centre={isCentre || undefined}
      data-vi={vi}
      aria-disabled={busy || undefined}
      onClick={() => {
        if (!busy) onActivate(vi);
      }}
      onPointerEnter={onHover ? (e) => e.pointerType === 'mouse' && onHover(true) : undefined}
      onPointerLeave={onHover ? () => onHover(false) : undefined}
      onFocus={onHover ? () => onHover(true) : undefined}
      onBlur={onHover ? () => onHover(false) : undefined}
      style={{ '--drift': driftSeed } as CSSProperties}
    >
      <span className="fr-item__drift">
        <span className="fr-item__frame">
          <img
            className="fr-item__img"
            src={dish.thumbnail}
            alt=""
            width={384}
            height={384}
            decoding="async"
            fetchPriority={isCentre ? 'high' : 'auto'}
            draggable={false}
            style={{ '--tone': dish.palette[1] } as CSSProperties}
          />
          {useFull && (
            <img
              className={`fr-item__img fr-item__img--full ${fullLoaded ? 'is-loaded' : ''}`}
              src={dish.image}
              alt=""
              width={768}
              height={768}
              decoding="async"
              draggable={false}
              onLoad={() => setFullLoaded(true)}
            />
          )}
          <span className="fr-item__sheen" aria-hidden="true" />
        </span>
        {/* Accessible name starts with the visible dish name (WCAG 2.5.3). */}
        <span className="fr-item__caption">
          <span className="fr-item__no" aria-hidden="true">
            {pad3(number)}
          </span>
          <span className="fr-item__name">{dish.name}</span>
        </span>
        <span className="sr-only">
          {` — ${dish.subtitle}, ${REGION_LABEL[dish.region]}, khoảng ${formatReelPrice(dish.price)}. ${
            isCentre ? 'Nhấn để xem câu chuyện món ăn' : 'Nhấn để đưa món ra giữa'
          }`}
        </span>
      </span>
    </button>
  );
});

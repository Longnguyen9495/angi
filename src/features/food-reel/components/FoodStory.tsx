import {
  ArrowLeft,
  ArrowsClockwise,
  Basket,
  BookmarkSimple,
  CheckCircle,
  CookingPot,
  MapPin,
  WarningCircle,
} from '@phosphor-icons/react';
import { m } from 'motion/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { RECIPE_LIST } from '../../../data/game';
import { t } from '../../../i18n';
import { useGame } from '../../../state/hooks';
import { formatReelPrice, REGION_LABEL } from '../data/reelCatalogue';
import { flyImage, type FlightHandle } from '../engine/sharedTransition';
import type { ReelDish, ReelPhase } from '../foodReel.types';
import type { ShopeeCity } from '../data/orderLinks';
import { StoryChapters } from './StoryChapters';
import { OrderLinks } from './OrderLinks';
import { splitName } from '../utils';
import { SplitLines } from './SplitLines';

const OPEN_MS = 700;
const CLOSE_MS = 560;
const REDUCED_MS = 150;

interface FoodStoryProps {
  dish: ReelDish;
  phase: ReelPhase;
  reduced: boolean;
  saved: boolean;
  onToggleSave: () => void;
  /** Whether the dish is in the Rổ quay. */
  inPool: boolean;
  onTogglePool: () => void;
  orderCity: ShopeeCity;
  onOrderCity: (city: ShopeeCity) => void;
  onOpened: () => void;
  onClosed: () => void;
  onClose: (then?: 'spin') => void;
  onConfirm: () => void;
  confirmError: string | null;
  number: number;
}

function centreFrameRect(): DOMRect | undefined {
  return document.querySelector('[data-reel-centre] .fr-item__frame')?.getBoundingClientRect();
}

/**
 * Scene E. Opening flies the centre dish into the poster slot; closing flies
 * it back, so the reel underneath never flashes or loses its place.
 */
export function FoodStory({
  dish,
  phase,
  reduced,
  saved,
  onToggleSave,
  inPool,
  onTogglePool,
  orderCity,
  onOrderCity,
  onOpened,
  onClosed,
  onClose,
  onConfirm,
  confirmError,
  number,
}: FoodStoryProps) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [flying, setFlying] = useState(!reduced);
  const cbs = useRef({ onOpened, onClosed, onClose });
  useEffect(() => {
    cbs.current = { onOpened, onClosed, onClose };
  });

  // Open choreography (runs once per mount).
  useEffect(() => {
    let flight: FlightHandle | null = null;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const finish = () => {
      setFlying(false);
      cbs.current.onOpened();
      document.getElementById('fr-story-title')?.focus({ preventScroll: true });
    };
    if (reduced) {
      timers.push(setTimeout(finish, REDUCED_MS));
    } else {
      flight = flyImage({
        src: dish.image,
        from: centreFrameRect(),
        to: mediaRef.current?.getBoundingClientRect(),
        duration: OPEN_MS,
        radiusFrom: '50%',
        radiusTo: '28px',
      });
      let finished = false;
      void flight.finished.then(() => {
        finished = true;
        finish();
      });
      // Safety net if the browser never reports the end of the flight.
      timers.push(setTimeout(() => !finished && finish(), OPEN_MS + 250));
    }
    return () => {
      flight?.cancel();
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open plays once per mount
  }, []);

  // Close choreography, triggered by the scene machine.
  useEffect(() => {
    if (phase !== 'closing-detail') return;
    let flight: FlightHandle | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (reduced) {
      timer = setTimeout(() => cbs.current.onClosed(), REDUCED_MS);
    } else {
      flight = flyImage({
        src: dish.image,
        from: mediaRef.current?.getBoundingClientRect(),
        to: centreFrameRect(),
        duration: CLOSE_MS,
        radiusFrom: '28px',
        radiusTo: '50%',
      });
      let finished = false;
      void flight.finished.then(() => {
        finished = true;
        cbs.current.onClosed();
      });
      timer = setTimeout(() => !finished && cbs.current.onClosed(), CLOSE_MS + 250);
    }
    return () => {
      flight?.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [phase, reduced, dish.image]);

  // Escape closes the story; Tab stays inside it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape' && !document.querySelector('.sheet-layer')) {
        e.preventDefault();
        cbs.current.onClose();
      }
      if (e.key === 'Tab' && scrollRef.current) {
        const items = scrollRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex="0"]',
        );
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        const outside = !Array.from(items).includes(document.activeElement as HTMLElement);
        if (e.shiftKey && (document.activeElement === first || outside)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || outside)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const closing = phase === 'closing-detail';
  const confirming = phase === 'confirming';

  return (
    <div
      className={`fr-story ${closing ? 'is-closing' : ''} ${reduced ? 'is-reduced' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fr-story-title"
      style={
        {
          '--story-bg': dish.palette[0],
          '--story-mid': dish.palette[1],
          '--story-accent': dish.palette[2],
        } as CSSProperties
      }
    >
      <div className="fr-story__bg" aria-hidden="true" />
      <div className="fr-story__scroll" ref={scrollRef}>
        <header className="fr-story__bar">
          <button type="button" className="fr-ghost" onClick={() => onClose()}>
            <ArrowLeft aria-hidden="true" size={16} />
            {t.reel.story.back}
            <span className="fr-hide-sm">{t.reel.story.backSuffix}</span>
          </button>
          <span className="fr-story__no" aria-hidden="true">
            {String(number).padStart(3, '0')}
          </span>
          <span className="fr-story__tools">
            <button type="button" className="fr-ghost" aria-pressed={saved} onClick={onToggleSave}>
              <BookmarkSimple aria-hidden="true" size={16} weight={saved ? 'fill' : 'regular'} />
              {saved ? t.reel.story.saved : t.reel.story.save}
            </button>
            <button
              type="button"
              className="fr-ghost"
              aria-pressed={inPool}
              onClick={onTogglePool}
              aria-label={t.reel.story.pool}
              title={inPool ? t.reel.story.poolIn : t.reel.story.poolAdd}
            >
              <Basket aria-hidden="true" size={16} weight={inPool ? 'fill' : 'regular'} />
              <span className="fr-hide-sm">{t.reel.story.pool}</span>
            </button>
          </span>
        </header>

        <section className="fr-story__hero">
          <div className="fr-story__media" ref={mediaRef}>
            <img
              className="fr-story__poster"
              src={dish.image}
              alt={dish.name}
              width={800}
              height={800}
              decoding="async"
              style={{ visibility: flying || closing ? 'hidden' : 'visible' }}
            />
          </div>
          <div className="fr-story__intro">
            <m.p
              className="fr-kicker"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, duration: 0.45 }}
            >
              <MapPin aria-hidden="true" size={14} /> {REGION_LABEL[dish.region]} ·{' '}
              {formatReelPrice(dish.price)} · {dish.subtitle}
            </m.p>
            <SplitLines
              as="h2"
              id="fr-story-title"
              className="fr-story__title"
              lines={splitName(dish.name)}
              delay={reduced ? 0 : 0.48}
              tabIndex={-1}
            />
            <m.p
              className="fr-story__lede"
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.62, duration: 0.5 }}
            >
              {dish.story}
            </m.p>
            <CookedBadge dishId={dish.id} />
          </div>
        </section>

        <StoryChapters dish={dish} reduced={reduced} scrollRef={scrollRef} />

        <OrderLinks
          dishName={dish.name}
          searchName={dish.nameVi}
          city={orderCity}
          onCity={onOrderCity}
          compact
        />

        <p className="fr-story__credit">{t.reel.story.credit(dish.credit)}</p>

        <div className="fr-story__actions">
          {confirmError && (
            <p className="fr-story__error" role="alert">
              <WarningCircle aria-hidden="true" size={18} /> {confirmError}
            </p>
          )}
          <button
            type="button"
            className="fr-cta"
            onClick={onConfirm}
            aria-disabled={confirming}
            aria-busy={confirming}
          >
            <CheckCircle aria-hidden="true" size={18} />
            {confirming
              ? t.reel.story.confirming
              : confirmError
                ? t.reel.story.retry
                : t.reel.story.confirm}
          </button>
          <button type="button" className="fr-ghost" onClick={() => onClose('spin')}>
            <ArrowsClockwise aria-hidden="true" size={16} />
            {t.reel.story.spinOther}
          </button>
        </div>
      </div>
    </div>
  );
}

/** "Tự nấu": the guest cooked this dish's recipe in the Journey kitchen. */
function CookedBadge({ dishId }: { dishId: string }) {
  const { state } = useGame();
  const recipe = RECIPE_LIST.find((r) => r.dishId === dishId);
  const n = recipe ? (state.cooked[recipe.id] ?? 0) : 0;
  if (!recipe || n === 0) return null;
  return (
    <p className="fr-story__cooked">
      <CookingPot aria-hidden="true" size={16} weight="fill" />
      <span>
        {t.reel.story.cooked(n)}
        <em>{recipe.fact}</em>
      </span>
    </p>
  );
}

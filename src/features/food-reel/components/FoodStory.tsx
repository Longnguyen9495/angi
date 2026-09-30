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
import { useGame } from '../../../state/hooks';
import { formatReelPrice, REGION_LABEL } from '../data/reelCatalogue';
import { flyImage, type FlightHandle } from '../engine/sharedTransition';
import type { ReelDish, ReelPhase } from '../foodReel.types';
import type { ShopeeCity } from '../data/orderLinks';
import { FlavorProfile } from './FlavorProfile';
import { OrderLinks } from './OrderLinks';
import { FoodVideo } from './FoodVideo';
import { splitName } from '../utils';
import { SplitLines } from './SplitLines';

const REGION_STORY: Record<ReelDish['region'], string> = {
  north:
    'Bắc Bộ chuộng vị thanh và cân bằng: nước dùng trong, gia vị vừa đủ để nguyên liệu tự lên tiếng.',
  central: 'Trung Bộ đậm đà và nồng nàn: sả, ớt, mắm ruốc và những món nhỏ tinh tế của đất cố đô.',
  south: 'Nam Bộ phóng khoáng, ngọt thanh, nhiều rau sống — bữa ăn luôn có chút vui của sông nước.',
  world: 'Một món từ bếp thế giới, đã quen thuộc trên những con phố ăn trưa ở Việt Nam.',
};

const OPEN_MS = 700;
const CLOSE_MS = 560;
const REDUCED_MS = 150;

interface FoodStoryProps {
  dish: ReelDish;
  phase: ReelPhase;
  reduced: boolean;
  autoplay: boolean;
  videoMuted: boolean;
  onVideoMuted: (muted: boolean) => void;
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
  autoplay,
  videoMuted,
  onVideoMuted,
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
  const [videoGate, setVideoGate] = useState(false);
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
    timers.push(setTimeout(() => setVideoGate(true), OPEN_MS));
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
      if (e.key === 'Escape' && !document.querySelector('.sheet-layer')) {
        e.preventDefault();
        cbs.current.onClose();
      }
      if (e.key === 'Tab' && scrollRef.current) {
        const items = scrollRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], video, [tabindex="0"]',
        );
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
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
  const section = {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, root: scrollRef, amount: 0.2 },
    transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const },
  };

  return (
    <div
      className={`fr-story ${closing ? 'is-closing' : ''}`}
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
            Quay lại<span className="fr-hide-sm"> reel</span>
          </button>
          <span className="fr-story__no" aria-hidden="true">
            {String(number).padStart(3, '0')}
          </span>
          <span className="fr-story__tools">
            <button type="button" className="fr-ghost" aria-pressed={saved} onClick={onToggleSave}>
              <BookmarkSimple aria-hidden="true" size={16} weight={saved ? 'fill' : 'regular'} />
              {saved ? 'Đã lưu' : 'Lưu món'}
            </button>
            <button
              type="button"
              className="fr-ghost"
              aria-pressed={inPool}
              onClick={onTogglePool}
              aria-label="Rổ quay"
              title={inPool ? 'Đang trong rổ quay — nhấn để bỏ ra' : 'Thêm vào rổ quay'}
            >
              <Basket aria-hidden="true" size={16} weight={inPool ? 'fill' : 'regular'} />
              <span className="fr-hide-sm">Rổ quay</span>
            </button>
          </span>
        </header>

        <section className="fr-story__hero">
          <div className="fr-story__media" ref={mediaRef}>
            <FoodVideo
              dish={dish}
              autoplay={autoplay}
              opened={videoGate && !closing}
              muted={videoMuted}
              onMutedChange={onVideoMuted}
              hidden={flying || closing}
            />
          </div>
          <div className="fr-story__intro">
            <m.p
              className="fr-kicker"
              initial={{ opacity: 0, y: 8 }}
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
              delay={0.48}
              tabIndex={-1}
            />
            <m.p
              className="fr-story__lede"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.62, duration: 0.5 }}
            >
              {dish.story}
            </m.p>
            <CookedBadge dishId={dish.id} />
          </div>
        </section>

        <m.section className="fr-story__section" aria-labelledby="fr-sec-ing" {...section}>
          <h3 id="fr-sec-ing" className="fr-story__h">
            <span className="fr-story__h-no">01</span> Thành phần
          </h3>
          <ol className="fr-ingredients">
            {dish.ingredients.map((ing, i) => (
              <li key={ing.id} className="fr-ingredients__item">
                <span className="fr-ingredients__no" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="fr-ingredients__name">{ing.name}</span>
                <span className="fr-ingredients__desc">{ing.description}</span>
              </li>
            ))}
          </ol>
        </m.section>

        <m.section
          className="fr-story__section fr-story__section--split"
          aria-labelledby="fr-sec-origin"
          {...section}
        >
          <div>
            <h3 id="fr-sec-origin" className="fr-story__h">
              <span className="fr-story__h-no">02</span> Vùng miền & xuất xứ
            </h3>
            <p className="fr-story__origin-region">{REGION_LABEL[dish.region]}</p>
            <p className="fr-story__text">{REGION_STORY[dish.region]}</p>
          </div>
          <div>
            <h3 id="fr-sec-flavor" className="fr-story__h">
              <span className="fr-story__h-no">03</span> Hồ sơ vị
            </h3>
            <FlavorProfile flavor={dish.flavor} />
          </div>
        </m.section>

        <OrderLinks dishName={dish.name} city={orderCity} onCity={onOrderCity} compact />

        <p className="fr-story__credit">Ảnh món: {dish.credit}. Giá chỉ mang tính tham khảo.</p>

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
            {confirming ? 'Đang chốt…' : confirmError ? 'Thử chốt lại' : 'Chốt món này'}
          </button>
          <button type="button" className="fr-ghost" onClick={() => onClose('spin')}>
            <ArrowsClockwise aria-hidden="true" size={16} />
            Quay món khác
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
        Tự nấu ×{n} ở Hành trình · <em>{recipe.fact}</em>
      </span>
    </p>
  );
}

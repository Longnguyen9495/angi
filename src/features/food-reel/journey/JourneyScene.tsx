import { X } from '@phosphor-icons/react';
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { RecipeId } from '../../../data/types';
import { t } from '../../../i18n';
import { useGame } from '../../../state/hooks';
import type { ReelDish } from '../foodReel.types';
import { AtlasSection } from './AtlasSection';
import { Cookbook } from './Cookbook';
import { CookingSheet } from './CookingSheet';
import { CurrentMeal } from './CurrentMeal';
import { FarmGame, type PanelId } from './FarmGame';
import { FriendsSection } from './FriendsSection';
import { JourneyStats } from './JourneyStats';
import { MealLog, MissionsSection } from './MissionsSection';
import { MarketSection } from './MarketSection';
import { MealAlbum } from './MealAlbum';
import { OrdersSection } from './OrdersSection';
import { pressFx } from './pressFx';
import { RecipesSection } from './RecipesSection';
import { SaveJourneyPrompt } from './SaveJourneyPrompt';
import { StoragePanel } from './StoragePanel';

const sec = t.journey.scene.sections;
const g = t.journey.game;

const PANEL_TITLE: Record<PanelId, string> = {
  meal: sec.meal.title,
  storage: g.panel.storage,
  kitchen: g.panel.kitchen,
  orders: sec.orders.title,
  market: sec.market.title,
  map: sec.map.title,
  missions: sec.missions.title,
  friends: g.panel.friends,
  stats: g.panel.stats,
};

const PANEL_INTRO: Partial<Record<PanelId, string>> = {
  kitchen: sec.recipes.intro,
  orders: sec.orders.intro,
  market: sec.market.intro,
  map: sec.map.intro,
};

/**
 * A farm area opened over the game: a bottom sheet on phones, a side drawer on wide screens.
 * The farm stays live behind it; Escape or the close button returns to the island.
 */
function GamePanel({
  id,
  onClose,
  children,
}: {
  id: PanelId;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      // A sheet over the panel (cooking, check-in) closes first.
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('.sheet-layer'))
        return;
      e.preventDefault();
      closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [id]);

  return (
    <>
      <div className="fg-panel-backdrop" onClick={onClose} aria-hidden="true" />
      <section
        className="fg-panel"
        data-panel={id}
        role="region"
        aria-labelledby="fg-panel-title"
        tabIndex={-1}
        ref={ref}
        data-game-overlay
      >
        <header className="fg-panel__head">
          <span className="fg-panel__grip" aria-hidden="true" />
          <h2 id="fg-panel-title" className="fg-panel__title">
            {PANEL_TITLE[id]}
          </h2>
          <button type="button" className="fg-round" onClick={onClose} aria-label={g.close}>
            <X size={18} weight="bold" aria-hidden="true" />
          </button>
        </header>
        <div className="fg-panel__body">
          {PANEL_INTRO[id] && <p className="fj-section__intro">{PANEL_INTRO[id]}</p>}
          {children}
        </div>
      </section>
    </>
  );
}

interface JourneySceneProps {
  onBackToReel: () => void;
  onOpenDish: (dish: ReelDish) => void;
}

/**
 * The farm ("Nông trại"): nothing but the game. Every other part of the journey (this meal,
 * the kitchen, orders, the market, the map, missions, friends) opens as a panel inside it.
 */
export default function JourneyScene({ onBackToReel, onOpenDish }: JourneySceneProps) {
  const { reduced } = useGame();
  const [cooking, setCooking] = useState<RecipeId | null>(null);
  // An invite link (?ban=CODE) lands on the friends panel, where the friendship is made.
  const [panel, setPanel] = useState<PanelId | null>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('ban')
      ? 'friends'
      : null,
  );

  const content: Record<PanelId, () => ReactNode> = {
    meal: () => (
      <>
        <CurrentMeal onSpin={onBackToReel} />
        <SaveJourneyPrompt />
      </>
    ),
    storage: () => <StoragePanel />,
    kitchen: () => (
      <>
        <RecipesSection onCook={setCooking} />
        <Cookbook />
      </>
    ),
    orders: () => <OrdersSection />,
    market: () => <MarketSection />,
    map: () => <AtlasSection onOpenDish={onOpenDish} />,
    missions: () => (
      <>
        <MissionsSection />
        <div className="fj-album-wrap">
          <h3 className="fj-h3">{sec.missions.recent}</h3>
          <MealLog />
        </div>
        <div className="fj-album-wrap">
          <h3 className="fj-h3">{sec.missions.album}</h3>
          <MealAlbum />
        </div>
      </>
    ),
    friends: () => <FriendsSection />,
    stats: () => (
      <>
        <JourneyStats />
        <SaveJourneyPrompt />
      </>
    ),
  };

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <LazyMotion features={domAnimation} strict>
        <div className="fj fj--game" onPointerDown={(e) => pressFx(e, reduced)}>
          <FarmGame onCook={setCooking} onPanel={setPanel} onBack={onBackToReel} panel={panel} />
          {panel && (
            <GamePanel key={panel} id={panel} onClose={() => setPanel(null)}>
              {content[panel]()}
            </GamePanel>
          )}
          <CookingSheet
            recipeId={cooking}
            onClose={() => setCooking(null)}
            onOpenCookbook={() => {
              setCooking(null);
              setPanel('kitchen');
              window.setTimeout(() => {
                const el = document.getElementById('so-bep');
                // Scroll the panel body only: scrollIntoView would also scroll the clipped game
                // frame and lift the whole panel off the bottom on phones.
                const body = el?.closest('.fg-panel__body');
                if (el && body) {
                  const top =
                    el.getBoundingClientRect().top -
                    body.getBoundingClientRect().top +
                    body.scrollTop;
                  body.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
                }
                el?.focus({ preventScroll: true });
              }, 50);
            }}
          />
        </div>
      </LazyMotion>
    </MotionConfig>
  );
}

import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { RecipeId } from '../../../data/types';
import { BRAND, t } from '../../../i18n';
import { useGame } from '../../../state/hooks';
import { SplitLines } from '../components/SplitLines';
import type { ReelDish } from '../foodReel.types';
import { AtlasSection } from './AtlasSection';
import { Cookbook } from './Cookbook';
import { CookingSheet } from './CookingSheet';
import { CurrentMeal } from './CurrentMeal';
import { FriendsSection } from './FriendsSection';
import { GardenSection } from './GardenSection';
import { JourneyStats } from './JourneyStats';
import { MealLog, MissionsSection } from './MissionsSection';
import { MarketSection } from './MarketSection';
import { MealAlbum } from './MealAlbum';
import { OrdersSection } from './OrdersSection';
import { pressFx } from './pressFx';
import { RecipesSection } from './RecipesSection';
import { SaveJourneyPrompt } from './SaveJourneyPrompt';

const m = t.journey.scene;
const sec = m.sections;

const SECTIONS = [
  { id: 'bua-nay', label: m.nav.meal },
  { id: 'khu-vuon', label: m.nav.garden },
  { id: 'cong-thuc', label: m.nav.recipes },
  { id: 'don-co-ba', label: m.nav.orders },
  { id: 'cho-que', label: m.nav.market },
  { id: 'ban-do', label: m.nav.map },
  { id: 'nhiem-vu', label: m.nav.missions },
] as const;

function Section({
  id,
  no,
  title,
  intro,
  children,
}: {
  id: string;
  no: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="fj-section" aria-labelledby={`${id}-title`}>
      <header className="fj-section__head">
        <span className="fj-section__no" aria-hidden="true">
          {no}
        </span>
        {/* tabIndex -1 lets reward actions jump here ("Xem khu vườn"). */}
        <h2 id={`${id}-title`} className="fj-section__title" tabIndex={-1}>
          {title}
        </h2>
        {intro && <p className="fj-section__intro">{intro}</p>}
      </header>
      {children}
    </section>
  );
}

type SectionId = (typeof SECTIONS)[number]['id'];

/**
 * Section tabs with a pill that glides to whichever section is being read,
 * tracked from the Journey's own scroll container.
 */
function SectionNav({ onJump }: { onJump: (id: SectionId) => void }) {
  const navRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState<SectionId>(SECTIONS[0].id);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  useEffect(() => {
    const nav = navRef.current;
    const scroller = nav?.closest<HTMLElement>('.fr-journey__scroll');
    const target: HTMLElement | Window = scroller ?? window;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = (nav?.getBoundingClientRect().bottom ?? 0) + 120;
      let current: SectionId = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      if (scroller && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) {
        current = SECTIONS[SECTIONS.length - 1]!.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const btn = nav?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!nav || !btn) return;
    const place = () => setPill({ x: btn.offsetLeft, w: btn.offsetWidth });
    place();
    // Keep the active tab in view when the row scrolls sideways (phones).
    const left = btn.offsetLeft - (nav.clientWidth - btn.offsetWidth) / 2;
    if (nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left, behavior: 'smooth' });
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [active]);

  return (
    <nav className="fj-nav" aria-label={m.navLabel} ref={navRef}>
      {pill && (
        <span
          className="fj-nav__pill"
          aria-hidden="true"
          style={{ transform: `translateX(${pill.x}px)`, width: pill.w }}
        />
      )}
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          className="fj-nav__item"
          data-section={s.id}
          aria-current={active === s.id ? 'true' : undefined}
          onClick={() => {
            setActive(s.id);
            onJump(s.id);
          }}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}

interface JourneySceneProps {
  onBackToReel: () => void;
  onOpenDish: (dish: ReelDish) => void;
}

/**
 * The Journey: everything the guest accumulates after choosing food, in the
 * same dark, editorial language as the reel.
 */
export default function JourneyScene({ onBackToReel, onOpenDish }: JourneySceneProps) {
  const { reduced } = useGame();
  const [cooking, setCooking] = useState<RecipeId | null>(null);
  const jump = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    document.getElementById(`${id}-title`)?.focus({ preventScroll: true });
  };

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <LazyMotion features={domAnimation} strict>
        <div className="fj" onPointerDown={(e) => pressFx(e, reduced)}>
          <header className="fj-hero">
            <p className="fr-kicker">{m.kicker(BRAND)}</p>
            <SplitLines as="h1" className="fj-hero__title" lines={m.titleLines} delay={0.05} />
            <p className="fj-hero__lede">{m.lede}</p>
            <JourneyStats />
            <SaveJourneyPrompt />
          </header>

          <SectionNav onJump={jump} />

          <Section id="bua-nay" no="01" title={sec.meal.title}>
            <CurrentMeal onSpin={onBackToReel} />
          </Section>

          <Section id="khu-vuon" no="02" title={sec.garden.title}>
            <GardenSection onCook={setCooking} onOrders={() => jump('don-co-ba')} onGo={jump} />
            <FriendsSection />
          </Section>

          <Section id="cong-thuc" no="03" title={sec.recipes.title} intro={sec.recipes.intro}>
            <RecipesSection onCook={setCooking} />
            <Cookbook />
          </Section>

          <Section id="don-co-ba" no="04" title={sec.orders.title} intro={sec.orders.intro}>
            <OrdersSection />
          </Section>

          <Section id="cho-que" no="05" title={sec.market.title} intro={sec.market.intro}>
            <MarketSection />
          </Section>

          <Section id="ban-do" no="06" title={sec.map.title} intro={sec.map.intro}>
            <AtlasSection onOpenDish={onOpenDish} />
          </Section>

          <Section id="nhiem-vu" no="07" title={sec.missions.title}>
            <div className="fj-split">
              <div>
                <h3 className="fj-h3">{sec.missions.today}</h3>
                <MissionsSection />
              </div>
              <div>
                <h3 className="fj-h3">{sec.missions.recent}</h3>
                <MealLog />
              </div>
            </div>
            <div className="fj-album-wrap">
              <h3 className="fj-h3">{sec.missions.album}</h3>
              <MealAlbum />
            </div>
          </Section>
          <CookingSheet
            recipeId={cooking}
            onClose={() => setCooking(null)}
            onOpenCookbook={() => {
              setCooking(null);
              window.setTimeout(() => {
                const el = document.getElementById('so-bep');
                el?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
                el?.focus({ preventScroll: true });
              }, 50);
            }}
          />
        </div>
      </LazyMotion>
    </MotionConfig>
  );
}

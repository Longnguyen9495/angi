import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { FoodReelExperience } from './features/food-reel/FoodReelExperience';
import { JourneyDrawer } from './features/food-reel/components/JourneyDrawer';
import { useRoute } from './features/food-reel/hooks/useRoute';
import { UiContext, type UiContextValue } from './state/context';

const CheckInSheet = lazy(() =>
  import('./components/checkin/CheckInSheet').then((m) => ({ default: m.CheckInSheet })),
);
const ProfileSheet = lazy(() =>
  import('./components/profile/ProfileSheet').then((m) => ({ default: m.ProfileSheet })),
);

/**
 * App shell: the Food Reel is the whole landing experience. Game UI lives in
 * the Journey drawer (also reachable at /journey), never beside the reel.
 */
export function App() {
  const { route, navigate, back } = useRoute();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const journeyOpen = route.name === 'journey';

  const openJourney = useCallback(() => navigate({ name: 'journey' }), [navigate]);
  const closeJourney = useCallback(() => back({ name: 'reel' }), [back]);

  const focusSection = useCallback<UiContextValue['focusSection']>(
    (id) => {
      // Reward actions such as "Xem khu vườn" open the Journey on that section.
      openJourney();
      window.setTimeout(() => {
        const section = document.getElementById(id);
        section?.scrollIntoView({ block: 'start' });
        section?.querySelector<HTMLElement>('h2[tabindex="-1"]')?.focus({ preventScroll: true });
      }, 350);
    },
    [openJourney],
  );

  const ui = useMemo<UiContextValue>(
    () => ({
      openCheckIn: () => setCheckInOpen(true),
      openProfile: () => setProfileOpen(true),
      focusSection,
    }),
    [focusSection],
  );

  return (
    <UiContext.Provider value={ui}>
      <a className="skip-link" href="#noi-dung">
        Bỏ qua, tới reel món ăn
      </a>
      <FoodReelExperience
        route={route}
        navigate={navigate}
        back={back}
        onOpenJourney={openJourney}
        onOpenProfile={() => setProfileOpen(true)}
        covered={journeyOpen}
      />
      <JourneyDrawer
        open={journeyOpen}
        onClose={closeJourney}
        onOpenDish={(dish) => navigate({ name: 'dish', slug: dish.slug })}
      />
      <Suspense fallback={null}>
        {checkInOpen && <CheckInSheet open onClose={() => setCheckInOpen(false)} variant="dark" />}
        {profileOpen && <ProfileSheet open onClose={() => setProfileOpen(false)} variant="dark" />}
      </Suspense>
    </UiContext.Provider>
  );
}

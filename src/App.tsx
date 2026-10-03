import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { FoodReelExperience } from './features/food-reel/FoodReelExperience';
import { JourneyDrawer } from './features/food-reel/components/JourneyDrawer';
import { useRoute } from './features/food-reel/hooks/useRoute';
import type { CropId } from './data/types';
import { AccountProvider } from './state/AccountProvider';
import { UiContext, type UiContextValue } from './state/context';
import { useAccount } from './state/hooks';
import { t } from './i18n';

const CheckInSheet = lazy(() =>
  import('./components/checkin/CheckInSheet').then((m) => ({ default: m.CheckInSheet })),
);
const AccountSheet = lazy(() =>
  import('./components/account/AccountSheet').then((m) => ({ default: m.AccountSheet })),
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [spinRequest, setSpinRequest] = useState<{ crop: CropId; nonce: number } | null>(null);
  const journeyOpen = route.name === 'journey';

  const openJourney = useCallback(() => navigate({ name: 'journey' }), [navigate]);
  const closeJourney = useCallback(() => back({ name: 'reel' }), [back]);

  const focusSection = useCallback<UiContextValue['focusSection']>(
    (id) => {
      // Reward actions such as "Xem khu vườn" open the farm game and land focus on it.
      openJourney();
      window.setTimeout(() => {
        document.getElementById(`${id}-title`)?.focus({ preventScroll: true });
      }, 350);
    },
    [openJourney],
  );

  const spinForSeed = useCallback(
    (crop: CropId) => {
      setSpinRequest((r) => ({ crop, nonce: (r?.nonce ?? 0) + 1 }));
      closeJourney();
    },
    [closeJourney],
  );

  const ui = useMemo<UiContextValue>(
    () => ({
      openCheckIn: () => setCheckInOpen(true),
      openProfile: () => setProfileOpen(true),
      focusSection,
      spinForSeed,
      openAccount: () => {
        setProfileOpen(false);
        setAccountOpen(true);
      },
    }),
    [focusSection, spinForSeed],
  );

  return (
    <UiContext.Provider value={ui}>
      <AccountProvider>
        <a className="skip-link" href="#noi-dung">
          {t.account.app.skipLink}
        </a>
        <FoodReelExperience
          route={route}
          navigate={navigate}
          back={back}
          onOpenJourney={openJourney}
          onOpenProfile={() => setProfileOpen(true)}
          covered={journeyOpen}
          spinRequest={spinRequest}
        />
        <JourneyDrawer
          open={journeyOpen}
          onClose={closeJourney}
          onOpenDish={(dish) => navigate({ name: 'dish', slug: dish.slug })}
        />
        <Suspense fallback={null}>
          {checkInOpen && (
            <CheckInSheet open onClose={() => setCheckInOpen(false)} variant="dark" />
          )}
          {profileOpen && (
            <ProfileSheet open onClose={() => setProfileOpen(false)} variant="dark" />
          )}
          <AccountLayer open={accountOpen} onClose={() => setAccountOpen(false)} />
        </Suspense>
      </AccountProvider>
    </UiContext.Provider>
  );
}

/** Mounts the sign-in sheet when asked for, or when two journeys need a choice. */
function AccountLayer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { conflict, linkConfirm } = useAccount();
  if (!open && !conflict && !linkConfirm) return null;
  return <AccountSheet open={open} onClose={onClose} />;
}

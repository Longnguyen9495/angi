import { Suspense, lazy, useEffect, useRef } from 'react';
import { t } from '../../../i18n';
import type { ReelDish } from '../foodReel.types';

// The journey loads on demand; the reel is what people came for.
const JourneyScene = lazy(() => import('../journey/JourneyScene'));

interface JourneyDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenDish: (dish: ReelDish) => void;
}

/** Full-screen Journey layer over the reel (route /journey). */
export function JourneyDrawer({ open, onClose, onOpenDish }: JourneyDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      // A sheet, a panel or a card on the farm closes first (each handles its own Escape).
      if (
        e.key === 'Escape' &&
        !e.defaultPrevented &&
        !document.querySelector('.sheet-layer, [data-game-overlay]')
      )
        closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fr fr-journey fr-journey--game"
      role="dialog"
      aria-modal="true"
      aria-label={t.reel.journey.dialog}
    >
      {/* The farm is a full-screen game: its own HUD carries the way back to the reel. */}
      <div className="fr-journey__game" ref={panelRef} tabIndex={-1}>
        <Suspense
          fallback={
            <p className="fr-journey__loading" aria-busy="true">
              {t.reel.journey.loading}
            </p>
          }
        >
          <JourneyScene onBackToReel={onClose} onOpenDish={onOpenDish} />
        </Suspense>
      </div>
    </div>
  );
}

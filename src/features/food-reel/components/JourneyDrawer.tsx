import { ArrowLeft } from '@phosphor-icons/react';
import { Suspense, lazy, useEffect, useRef } from 'react';
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
      if (e.key === 'Escape' && !document.querySelector('.sheet-layer')) closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fr fr-journey" role="dialog" aria-modal="true" aria-label="Hành trình của bạn">
      <div className="fr-grain" aria-hidden="true" />
      <div className="fr-journey__scroll" ref={panelRef} tabIndex={-1}>
        <div className="fr-journey__bar">
          <button type="button" className="fr-ghost" onClick={onClose}>
            <ArrowLeft aria-hidden="true" size={16} />
            Về reel
          </button>
          <span className="fr-journey__title">Hành trình</span>
        </div>
        <Suspense
          fallback={
            <p className="fr-journey__loading" aria-busy="true">
              Đang mở Hành trình…
            </p>
          }
        >
          <JourneyScene onBackToReel={onClose} onOpenDish={onOpenDish} />
        </Suspense>
      </div>
    </div>
  );
}

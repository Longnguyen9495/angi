import { X } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FeedbackContext, type ToastInput } from './context';

interface ToastItem extends ToastInput {
  id: number;
}

const MAX_TOASTS = 2;
const TOAST_MS = 4800;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setToasts((list) => list.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = ++seq.current;
      setToasts((list) => {
        // Same message twice in a row is noise: replace instead of stacking.
        const rest = list.filter((x) => x.message !== input.message);
        return [...rest, { ...input, id }].slice(-MAX_TOASTS);
      });
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_MS),
      );
    },
    [dismiss],
  );

  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announce = useCallback((text: string) => {
    // Clear first so repeating the same sentence is still read out.
    setAnnouncement('');
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnouncement(text), 60);
  }, []);

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
      if (announceTimer.current) clearTimeout(announceTimer.current);
    };
  }, []);

  const value = useMemo(() => ({ toast, announce }), [toast, announce]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone ?? 'info'}`}>
            <p className="toast__msg">{t.message}</p>
            {t.action && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              className="icon-btn icon-btn--sm"
              aria-label="Đóng thông báo"
              onClick={() => dismiss(t.id)}
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>
        ))}
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="announcer">
        {announcement}
      </div>
    </FeedbackContext.Provider>
  );
}

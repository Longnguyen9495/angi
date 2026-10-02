import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motionReduced } from '../components/feedback/motion';
import { ToastStack, type ToastItem, type ToastLeave } from '../components/feedback/ToastStack';
import { FeedbackContext, type ToastInput, type ToastTone } from './context';

const MAX_TOASTS = 3;
/** Problems and rewards stay a little longer than a plain "done". */
const TOAST_MS: Record<ToastTone, number> = {
  info: 2500,
  success: 2500,
  warning: 4000,
  error: 4500,
  reward: 3000,
};
/** Matches the longest exit keyframes in toast.css. */
const EXIT_MS = 340;

/** A pausable countdown: `left` ms remain whenever `timer` is unset. */
interface Clock {
  timer: ReturnType<typeof setTimeout> | null;
  due: number;
  left: number;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const list = useRef<ToastItem[]>([]);
  const clocks = useRef(new Map<number, Clock>());
  const exits = useRef(new Set<ReturnType<typeof setTimeout>>());
  const seq = useRef(0);

  const commit = useCallback((next: ToastItem[]) => {
    list.current = next;
    setToasts(next);
  }, []);

  const stopClock = (id: number) => {
    const c = clocks.current.get(id);
    if (c?.timer) clearTimeout(c.timer);
    clocks.current.delete(id);
  };

  const remove = useCallback(
    (id: number) => commit(list.current.filter((x) => x.id !== id)),
    [commit],
  );

  const dismiss = useCallback(
    (id: number, how: ToastLeave = 'out') => {
      stopClock(id);
      const item = list.current.find((x) => x.id === id);
      if (!item || item.leaving) return;
      if (motionReduced()) {
        remove(id);
        return;
      }
      // Play the exit, then take it out of the stack.
      commit(list.current.map((x) => (x.id === id ? { ...x, leaving: how } : x)));
      const t = setTimeout(() => {
        exits.current.delete(t);
        remove(id);
      }, EXIT_MS);
      exits.current.add(t);
    },
    [commit, remove],
  );

  const run = useCallback(
    (id: number, ms: number) => {
      const timer = setTimeout(() => dismiss(id), ms);
      clocks.current.set(id, { timer, due: Date.now() + ms, left: ms });
    },
    [dismiss],
  );

  const setPaused = useCallback(
    (id: number, paused: boolean) => {
      const item = list.current.find((x) => x.id === id);
      if (item && item.paused !== paused) {
        commit(list.current.map((x) => (x.id === id ? { ...x, paused } : x)));
      }
    },
    [commit],
  );

  const pause = useCallback(
    (id: number) => {
      const c = clocks.current.get(id);
      if (!c?.timer) return;
      clearTimeout(c.timer);
      c.timer = null;
      c.left = Math.max(0, c.due - Date.now());
      setPaused(id, true);
    },
    [setPaused],
  );

  const resume = useCallback(
    (id: number) => {
      const c = clocks.current.get(id);
      if (!c || c.timer) return;
      c.due = Date.now() + c.left;
      c.timer = setTimeout(() => dismiss(id), c.left);
      setPaused(id, false);
    },
    [dismiss, setPaused],
  );

  const toast = useCallback(
    (input: ToastInput) => {
      const id = ++seq.current;
      const tone = input.tone ?? 'info';
      const ms = input.duration ?? TOAST_MS[tone];
      // Same message twice in a row is noise: replace instead of stacking.
      list.current
        .filter((x) => x.message === input.message)
        .forEach((x) => {
          stopClock(x.id);
        });
      const rest = list.current.filter((x) => x.message !== input.message);
      commit([...rest, { ...input, id, tone, ms, paused: false, leaving: null }]);
      run(id, ms);
      // Too many on screen: the oldest still-visible one bows out.
      const live = list.current.filter((x) => !x.leaving);
      live.slice(0, Math.max(0, live.length - MAX_TOASTS)).forEach((x) => dismiss(x.id));
    },
    [commit, dismiss, run],
  );

  // A hidden tab should not burn through the countdowns.
  useEffect(() => {
    const onVis = () => list.current.forEach((x) => (document.hidden ? pause(x.id) : resume(x.id)));
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [pause, resume]);

  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announce = useCallback((text: string) => {
    // Clear first so repeating the same sentence is still read out.
    setAnnouncement('');
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnouncement(text), 60);
  }, []);

  useEffect(() => {
    const map = clocks.current;
    const pending = exits.current;
    return () => {
      map.forEach((c) => c.timer && clearTimeout(c.timer));
      map.clear();
      pending.forEach((t) => clearTimeout(t));
      pending.clear();
      if (announceTimer.current) clearTimeout(announceTimer.current);
    };
  }, []);

  const value = useMemo(() => ({ toast, announce }), [toast, announce]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} onPause={pause} onResume={resume} />
      <div className="sr-only" aria-live="polite" aria-atomic="true" data-testid="announcer">
        {announcement}
      </div>
    </FeedbackContext.Provider>
  );
}

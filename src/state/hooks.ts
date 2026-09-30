import { useCallback, useContext, useEffect, useState } from 'react';
import type { MotionPref } from '../domain/progress';
import { AccountContext, FeedbackContext, GameContext, UiContext } from './context';

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside <FeedbackProvider>');
  return ctx;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside <AccountProvider>');
  return ctx;
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside <UiContext.Provider>');
  return ctx;
}

const QUERY = '(prefers-reduced-motion: reduce)';

function systemPrefersReduced(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(QUERY).matches
    : false;
}

/** Combines the OS setting (live) with the in-app override. */
export function useReducedMotion(pref: MotionPref): boolean {
  const [system, setSystem] = useState(systemPrefersReduced);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setSystem(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  if (pref === 'reduce') return true;
  if (pref === 'full') return false;
  return system;
}

/** Minute-level clock; pauses while the tab is hidden. The setter lets actions advance it. */
export function useNow(intervalMs = 60_000): [number, (t: number) => void] {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id === null) id = setInterval(() => setNow(Date.now()), intervalMs);
    };
    const stop = () => {
      if (id !== null) clearInterval(id);
      id = null;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        setNow(Date.now());
        start();
      }
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);
  const advance = useCallback((t: number) => setNow((n) => Math.max(n, t)), []);
  return [now, advance];
}

import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { loadProgress, saveProgress } from '../domain/persistence';
import { gameReducer, type Action } from '../domain/reducer';
import { deviceQuality } from '../features/garden3d/quality';
import { GameContext } from './context';
import { useNow, useReducedMotion } from './hooks';

export function GameProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => loadProgress(Date.now()));
  const [state, baseDispatch] = useReducer(gameReducer, initial.progress);
  const reduced = useReducedMotion(state.settings.motion);
  const [device] = useState(() => (typeof window === 'undefined' ? 'medium' : deviceQuality()));
  const pref = state.settings.quality ?? 'auto';
  const quality = pref === 'auto' ? device : pref;
  const [now, advanceClock] = useNow();

  // Timestamped actions move the clock too, so crop stages never lag behind a check-in.
  const dispatch = useCallback(
    (action: Action) => {
      baseDispatch(action);
      if ('now' in action) advanceClock(action.now);
    },
    [advanceClock],
  );

  useEffect(() => {
    saveProgress(state, Date.now());
  }, [state]);

  // CSS keys every motion rule off this attribute, so the in-app toggle wins over the OS.
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  }, [reduced]);

  useEffect(() => {
    document.documentElement.dataset.quality = quality;
  }, [quality]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      reduced,
      quality,
      now,
      recoveryNotice: initial.status === 'recovered' ? initial.reason : null,
      restored: initial.status === 'restored',
    }),
    [state, dispatch, reduced, quality, now, initial],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

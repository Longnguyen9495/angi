import { useCallback, useEffect, useState } from 'react';

const KEY = 'hanh-trinh-bep-viet/reel';

interface ReelPrefs {
  version: 1;
  sound: boolean;
  videoMuted: boolean;
  saved: string[];
  lastIndex: number;
}

const DEFAULTS: ReelPrefs = { version: 1, sound: false, videoMuted: true, saved: [], lastIndex: 0 };

function read(): ReelPrefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<ReelPrefs>;
    if (p.version !== 1) return DEFAULTS;
    return {
      version: 1,
      sound: p.sound === true,
      videoMuted: p.videoMuted !== false,
      saved: Array.isArray(p.saved)
        ? p.saved.filter((x): x is string => typeof x === 'string')
        : [],
      lastIndex: Number.isFinite(p.lastIndex) ? Math.round(p.lastIndex!) : 0,
    };
  } catch {
    return DEFAULTS;
  }
}

/** Per-device reel conveniences: sound/mute choice, saved dishes, last position. */
export function useReelPrefs() {
  const [prefs, setPrefs] = useState<ReelPrefs>(read);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* storage unavailable: preferences simply don't persist */
    }
  }, [prefs]);

  const update = useCallback(
    (patch: Partial<ReelPrefs>) => setPrefs((p) => ({ ...p, ...patch })),
    [],
  );
  const toggleSaved = useCallback(
    (id: string) =>
      setPrefs((p) => ({
        ...p,
        saved: p.saved.includes(id) ? p.saved.filter((x) => x !== id) : [id, ...p.saved],
      })),
    [],
  );

  return { prefs, update, toggleSaved };
}

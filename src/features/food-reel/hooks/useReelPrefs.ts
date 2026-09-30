import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_CITY, isShopeeCity, type ShopeeCity } from '../data/orderLinks';

const KEY = 'hanh-trinh-bep-viet/reel';

interface ReelPrefs {
  version: 1;
  sound: boolean;
  videoMuted: boolean;
  saved: string[];
  lastIndex: number;
  /**
   * Rổ quay: dish ids the guest wants to spin between. Only the list is kept;
   * every visit starts on the full reel.
   */
  pool: string[];
  /** City for ShopeeFood search links (it needs one; maps and other apps use location). */
  orderCity: ShopeeCity;
}

const DEFAULTS: ReelPrefs = {
  version: 1,
  sound: false,
  videoMuted: true,
  saved: [],
  lastIndex: 0,
  pool: [],
  orderCity: DEFAULT_CITY,
};

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

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
      saved: strings(p.saved),
      lastIndex: Number.isFinite(p.lastIndex) ? Math.round(p.lastIndex!) : 0,
      pool: strings(p.pool),
      orderCity: isShopeeCity(p.orderCity) ? p.orderCity : DEFAULT_CITY,
    };
  } catch {
    return DEFAULTS;
  }
}

/** Per-device reel conveniences: sound/mute choice, saved dishes, last position, Rổ quay. */
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

  const togglePool = useCallback(
    (id: string) =>
      setPrefs((p) => ({
        ...p,
        pool: p.pool.includes(id) ? p.pool.filter((x) => x !== id) : [...p.pool, id],
      })),
    [],
  );

  return { prefs, update, toggleSaved, togglePool };
}

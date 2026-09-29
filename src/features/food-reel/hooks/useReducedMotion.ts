import { useEffect, useState } from 'react';
import { useGame } from '../../../state/hooks';

interface NetworkInformationLike {
  saveData?: boolean;
  addEventListener?: (type: 'change', cb: () => void) => void;
  removeEventListener?: (type: 'change', cb: () => void) => void;
}

function connection(): NetworkInformationLike | undefined {
  return typeof navigator !== 'undefined'
    ? (navigator as Navigator & { connection?: NetworkInformationLike }).connection
    : undefined;
}

/** Browser "Save-Data" hint: fewer items, no video preload or autoplay. */
export function useSaveData(): boolean {
  const [saveData, setSaveData] = useState(() => !!connection()?.saveData);
  useEffect(() => {
    const c = connection();
    if (!c?.addEventListener) return;
    const onChange = () => setSaveData(!!c.saveData);
    c.addEventListener('change', onChange);
    return () => c.removeEventListener?.('change', onChange);
  }, []);
  return saveData;
}

/**
 * Reel-level motion preferences. Reuses the app-wide setting (OS preference
 * or the in-app override from the profile sheet) so both worlds agree.
 */
export function useReelMotionPrefs() {
  const { reduced } = useGame();
  const saveData = useSaveData();
  return { reduced, saveData, autoplayVideo: !reduced && !saveData };
}

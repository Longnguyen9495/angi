import { useCallback, useEffect, useRef, useState } from 'react';
import { AccountError, spinsApi, type SpinStatus } from '../../../services/account';

export type SpinBlock = 'no_spins' | 'sign_in';

/**
 * The reel's spin allowance (server/lib/Spins.php): free spins per day, then bought ones.
 *
 * `take()` answers at once so the spin stays instant: it counts the spin locally and tells the
 * server, whose answer replaces the local count. Only a known empty allowance stops a spin
 * (and opens the paywall); while the server is unreachable or not answered yet, spins go on.
 * `account` changes on sign-in/out, which brings another allowance.
 */
export function useSpinQuota(account: string | null) {
  const [status, setStatus] = useState<SpinStatus | null>(null);
  const [blocked, setBlocked] = useState<SpinBlock | null>(null);
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  });

  const refresh = useCallback(async () => {
    try {
      const s = await spinsApi.status();
      setStatus(s);
      return s;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    spinsApi
      .status()
      .then((s) => alive && setStatus(s))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [account]);

  const take = useCallback((): boolean => {
    const s = statusRef.current;
    if (s && s.freeLeft <= 0 && s.credits <= 0) {
      setBlocked(s.signedIn ? 'no_spins' : 'sign_in');
      return false;
    }
    if (s) {
      const free = s.freeLeft > 0;
      const next = {
        ...s,
        freeLeft: free ? s.freeLeft - 1 : 0,
        credits: free ? s.credits : s.credits - 1,
      };
      statusRef.current = next;
      setStatus(next);
    }
    spinsApi
      .use()
      .then((next) => setStatus(next))
      .catch((e) => {
        // Out on the server (another tab, another device): the next spin asks.
        if (e instanceof AccountError && e.status === 402) void refresh();
      });
    return true;
  }, [refresh]);

  return {
    status,
    blocked,
    take,
    refresh,
    close: useCallback(() => setBlocked(null), []),
  };
}

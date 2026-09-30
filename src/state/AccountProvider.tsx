import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { parseProgress } from '../domain/persistence';
import type { GuestProgress } from '../domain/progress';
import { reconcile, summarize } from '../domain/sync';
import { AccountError, accountApi, type AccountUser } from '../services/account';
import { AccountContext, type AccountContextValue, type SyncState } from './context';
import { useFeedback, useGame } from './hooks';

/** Changes are gathered for this long before one save to the account. */
const PUSH_DELAY_MS = 3000;

/**
 * Optional guest account. Signed out, nothing happens here beyond one /me call.
 * Signed in, the whole progress snapshot is mirrored to the server (with a
 * version so two devices can't silently overwrite each other).
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useGame();
  const { toast } = useFeedback();
  const [status, setStatus] = useState<AccountContextValue['status']>('loading');
  const [user, setUser] = useState<AccountUser | null>(null);
  const [sync, setSync] = useState<SyncState>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [conflict, setConflict] = useState<{
    remote: GuestProgress;
    version: number;
  } | null>(null);
  const version = useRef(0);
  const ready = useRef(false);
  const skipPush = useRef(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const push = useCallback(
    async (data: GuestProgress) => {
      setSync('saving');
      try {
        const r = await accountApi.putProgress(data, version.current);
        version.current = r.version;
        setSync('saved');
        setLastSyncAt(Date.now());
      } catch (e) {
        if (e instanceof AccountError && e.status === 409) {
          // Another device saved first: follow whichever journey is further along.
          const remote = await accountApi.getProgress().catch(() => null);
          if (!remote) return setSync('offline');
          version.current = remote.version;
          const parsed = parseProgress(remote.data, Date.now());
          if (parsed && reconcile(stateRef.current, parsed).kind === 'pull') {
            skipPush.current = true;
            dispatch({ type: 'LOAD_PROGRESS', progress: parsed });
            setSync('saved');
            setLastSyncAt(Date.now());
            return;
          }
          // Ours is ahead: one retry on top of the version we just read.
          try {
            const r = await accountApi.putProgress(stateRef.current, version.current);
            version.current = r.version;
            setSync('saved');
            setLastSyncAt(Date.now());
          } catch {
            setSync('offline');
          }
          return;
        }
        if (e instanceof AccountError && e.status === 401) {
          ready.current = false;
          setUser(null);
          setStatus('guest');
          return;
        }
        setSync('offline');
      }
    },
    [dispatch],
  );

  /** First contact after sign-in (or page load): decide push, pull or ask. */
  const attach = useCallback(
    async (u: AccountUser) => {
      setUser(u);
      setStatus('signed-in');
      const remote = await accountApi.getProgress().catch(() => null);
      if (!remote) {
        setSync('offline');
        return;
      }
      version.current = remote.version;
      const parsed = remote.data ? parseProgress(remote.data, Date.now()) : null;
      const plan = reconcile(stateRef.current, parsed);
      if (plan.kind === 'ask' && parsed) {
        setConflict({ remote: parsed, version: remote.version });
        return;
      }
      ready.current = true;
      if (plan.kind === 'pull' && parsed) {
        skipPush.current = true;
        dispatch({ type: 'LOAD_PROGRESS', progress: parsed });
        setSync('saved');
        setLastSyncAt(Date.now());
      } else if (plan.kind === 'push') {
        await push(stateRef.current);
      } else {
        setSync('saved');
        setLastSyncAt(Date.now());
      }
    },
    [dispatch, push],
  );

  // Who is this? One quiet request per page load; failure just means "guest".
  useEffect(() => {
    let alive = true;
    accountApi
      .me()
      .then((r) => {
        if (!alive) return;
        if (r.user) void attach(r.user);
        else setStatus('guest');
      })
      .catch(() => alive && setStatus('guest'));
    // Coming back from the email link: say so once and tidy the URL.
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('account');
    if (flag) {
      toast(
        flag === 'ok'
          ? { message: 'Đã đăng nhập — hành trình của bạn đang được lưu.', tone: 'success' }
          : { message: 'Link đăng nhập đã hết hạn. Gửi mã mới trong Hồ sơ nhé.', tone: 'warning' },
      );
      params.delete('account');
      const q = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''));
    }
    return () => {
      alive = false;
    };
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror every change, gathered into one save every few seconds.
  useEffect(() => {
    if (status !== 'signed-in' || !ready.current || conflict) return;
    if (skipPush.current) {
      skipPush.current = false;
      return;
    }
    const t = setTimeout(() => void push(state), PUSH_DELAY_MS);
    return () => clearTimeout(t);
  }, [state, status, conflict, push]);

  const value = useMemo<AccountContextValue>(
    () => ({
      status,
      user,
      sync,
      lastSyncAt,
      conflict: conflict ? { local: summarize(state), remote: summarize(conflict.remote) } : null,
      resolveConflict: async (keep) => {
        if (!conflict) return;
        version.current = conflict.version;
        setConflict(null);
        ready.current = true;
        if (keep === 'remote') {
          skipPush.current = true;
          dispatch({ type: 'LOAD_PROGRESS', progress: conflict.remote });
          setSync('saved');
          setLastSyncAt(Date.now());
        } else {
          await push(stateRef.current);
        }
      },
      signedIn: attach,
      logout: async () => {
        await accountApi.logout().catch(() => undefined);
        ready.current = false;
        setUser(null);
        setStatus('guest');
        setSync('idle');
        setConflict(null);
      },
      deleteAccount: async () => {
        await accountApi.remove();
        ready.current = false;
        setUser(null);
        setStatus('guest');
        setSync('idle');
        setConflict(null);
      },
      setMarketing: async (on) => {
        setUser(await accountApi.setMarketing(on));
      },
    }),
    [status, user, sync, lastSyncAt, conflict, state, dispatch, push, attach],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { parseProgress } from '../domain/persistence';
import type { GuestProgress } from '../domain/progress';
import { reconcile, summarize } from '../domain/sync';
import { CROPS } from '../data/game';
import type { CropId } from '../data/types';
import {
  AccountError,
  accountApi,
  friendsApi,
  type AccountUser,
  type FriendsList,
  type RemoteProgress,
} from '../services/account';
import { AccountContext, type AccountContextValue, type SyncState } from './context';
import { useFeedback, useGame } from './hooks';
import { t } from '../i18n';

/** Changes are gathered for this long before one save to the account. */
const PUSH_DELAY_MS = 3000;
/** How often a signed-in garden asks for friends' help and Cô Ba's gift. */
const EVENTS_EVERY_MS = 5 * 60 * 1000;
/** A garden code from an invite link (?ban=K7QM2P), kept until the guest is signed in. */
const INVITE_KEY = 'angi:invite';

function readInvite(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('ban') ?? '';
    if (/^[A-Za-z0-9]{6}$/.test(fromUrl)) {
      sessionStorage.setItem(INVITE_KEY, fromUrl.toUpperCase());
      return fromUrl.toUpperCase();
    }
    return sessionStorage.getItem(INVITE_KEY);
  } catch {
    return null;
  }
}

function clearInvite() {
  try {
    sessionStorage.removeItem(INVITE_KEY);
  } catch {
    /* storage blocked */
  }
  const params = new URLSearchParams(window.location.search);
  if (!params.has('ban')) return;
  params.delete('ban');
  const q = params.toString();
  window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''));
}

/** The emailed link's token (#login=…), taken out of the address bar at once. */
function takeLoginToken(): string | null {
  const m = /(?:^#|&)login=([a-f0-9]{48})(?:&|$)/.exec(window.location.hash);
  if (!m) return null;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return m[1] ?? null;
}

/**
 * Optional guest account. Signed out, nothing happens here beyond one /me call.
 * Signed in, the whole progress snapshot is mirrored to the server (with a version so two
 * devices can't silently overwrite each other); the server checks every save against the
 * game's rules and may refuse one, in which case the saved copy comes back.
 *
 * Each sign-in starts a new "session generation": anything still in flight from before
 * (a save, the inbox, the friends list) is dropped when it returns, so one account's answer
 * can never land in another account's garden.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useGame();
  const { toast } = useFeedback();
  const [status, setStatus] = useState<AccountContextValue['status']>('loading');
  const [user, setUser] = useState<AccountUser | null>(null);
  const [sync, setSync] = useState<SyncState>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [friends, setFriends] = useState<FriendsList | null>(null);
  const [linkConfirm, setLinkConfirm] = useState<{ token: string; email: string } | null>(null);
  const [conflict, setConflict] = useState<{
    remote: GuestProgress;
    version: number;
  } | null>(null);
  const version = useRef(0);
  const ready = useRef(false);
  const skipPush = useRef(false);
  const pushing = useRef(false);
  /** A change arrived while a save was in flight: save again when it returns. */
  const again = useRef(false);
  const generation = useRef(0);
  const owner = useRef<string | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const saved = useCallback(() => {
    setSync('saved');
    setLastSyncAt(Date.now());
  }, []);

  /** Replaces the garden on this device with the account's saved copy. */
  const load = useCallback(
    (remote: RemoteProgress): boolean => {
      version.current = remote.version;
      const parsed = remote.data ? parseProgress(remote.data, Date.now()) : null;
      if (!parsed) return false;
      skipPush.current = true;
      dispatch({ type: 'LOAD_PROGRESS', progress: { ...parsed, owner: owner.current } });
      return true;
    },
    [dispatch],
  );

  /** Friends' watering, Cô Ba's daily seed, XP for helping: applied once, kept by the next save. */
  const pullEvents = useCallback(async () => {
    if (!ready.current) return;
    const gen = generation.current;
    const r = await friendsApi.events().catch(() => null);
    if (!r || gen !== generation.current || !ready.current) return;
    const now = Date.now();
    // Seeds this garden sent whose debit never reached a save (a closed tab): take them now.
    for (const g of r.pendingGifts ?? []) {
      if (!(g.crop in CROPS)) continue;
      if (stateRef.current.ledger.some((l) => l.key === `present:${g.id}`)) continue;
      dispatch({ type: 'GIFT_SENT', id: g.id, crop: g.crop as CropId, now });
    }
    const lines: string[] = [];
    for (const e of r.events) {
      const seen = stateRef.current.ledger.some((l) => l.key.startsWith(`friend:${e.id}:`));
      const crop = e.crop && e.crop in CROPS ? (e.crop as CropId) : undefined;
      dispatch({
        type: 'FRIEND_EVENT',
        event: {
          id: e.id,
          type: e.type,
          plotId: e.plotId ?? undefined,
          crop,
          cycle: e.cycle ?? undefined,
          from: e.from,
          coins: e.coins,
          xp: e.xp,
        },
        now,
      });
      if (seen) continue;
      if (e.type === 'water') lines.push(t.account.friendEvents.watered(e.from, e.plotId));
      if (e.type === 'gift' && crop)
        lines.push(t.account.friendEvents.gift(CROPS[crop].seedName.toLowerCase()));
      if (e.type === 'stolen' && crop)
        lines.push(t.account.friendEvents.stolen(e.from, CROPS[crop].name.toLowerCase()));
      // 'stole' and 'helped' come from our own taps, which already showed a toast.
      if (e.type === 'present' && crop)
        lines.push(t.account.friendEvents.present(e.from, CROPS[crop].seedName.toLowerCase()));
      if (e.type === 'thanks') lines.push(t.account.friendEvents.thanks(e.from));
      if (e.type === 'referral')
        lines.push(t.account.friendEvents.referral(e.from, e.coins ?? 0, e.xp ?? 0));
    }
    // No acknowledging: the server stops sending an event once a save holds its effect.
    if (lines.length > 0) {
      toast({
        message:
          lines.slice(0, 2).join(' · ') +
          (lines.length > 2 ? t.account.friendEvents.more(lines.length - 2) : '') +
          '.',
        tone: 'reward',
      });
    }
  }, [dispatch, toast]);

  /**
   * The server refused a save. The saved copy is the truth: load it (after re-anchoring it
   * to this device's clock when the clock is what moved), then fetch the inbox again so
   * seeds sent to friends are taken from the tray.
   */
  const refused = useCallback(
    async (code: string, gen: number) => {
      if (code === 'import') {
        // A first save this account cannot take: keep the garden on this device untouched.
        ready.current = false;
        setSync('offline');
        toast({ message: t.account.toasts.importRefused, tone: 'warning' });
        return;
      }
      const remote =
        code === 'clock'
          ? await accountApi.rebase().catch(() => null)
          : await accountApi.getProgress().catch(() => null);
      if (gen !== generation.current) return;
      if (!remote) return setSync('offline');
      if (code === 'owned' || !load(remote)) {
        // This device's journey belongs to another account: this one starts its own.
        skipPush.current = false;
        dispatch({ type: 'RESET', now: Date.now() });
        dispatch({ type: 'SET_OWNER', owner: owner.current });
      }
      saved();
      toast({
        message:
          code === 'clock' ? t.account.toasts.clockChanged : t.account.toasts.progressRefused,
        tone: 'warning',
      });
      void pullEvents();
    },
    [dispatch, load, pullEvents, saved, toast],
  );

  /** One save at a time; a newer state waits for the next debounce. */
  const push = useCallback(
    async (data: GuestProgress) => {
      if (pushing.current) {
        again.current = true;
        return;
      }
      pushing.current = true;
      again.current = false;
      const gen = generation.current;
      setSync('saving');
      try {
        const r = await accountApi.putProgress(data, version.current);
        if (gen !== generation.current) return;
        version.current = r.version;
        saved();
      } catch (e) {
        if (gen !== generation.current) return;
        if (e instanceof AccountError && e.status === 409) {
          // Another device saved first: follow its copy only when it is clearly ahead.
          const remote = await accountApi.getProgress().catch(() => null);
          if (gen !== generation.current) return;
          if (!remote) return setSync('offline');
          version.current = remote.version;
          const parsed = remote.data ? parseProgress(remote.data, Date.now()) : null;
          const plan = reconcile(stateRef.current, parsed, owner.current);
          if (plan.kind === 'pull' && parsed) {
            load(remote);
            return saved();
          }
          if (plan.kind === 'ask' && parsed) {
            // Two different copies: the guest chooses; nothing is overwritten meanwhile.
            ready.current = false;
            setConflict({ remote: parsed, version: remote.version });
            return;
          }
          // Ours is ahead: save again on top of the version just read.
          again.current = true;
          return;
        }
        if (e instanceof AccountError && e.status === 422 && typeof e.body.code === 'string') {
          return void (await refused(e.body.code, gen));
        }
        if (e instanceof AccountError && e.status === 401) {
          ready.current = false;
          generation.current++;
          setUser(null);
          setStatus('guest');
          return;
        }
        setSync('offline');
      } finally {
        pushing.current = false;
        if (again.current && gen === generation.current && ready.current) {
          again.current = false;
          setTimeout(() => void pushRef.current(stateRef.current), 0);
        }
      }
    },
    [load, refused, saved],
  );

  const pushRef = useRef(push);
  useEffect(() => {
    pushRef.current = push;
  });

  /** Friends list for badges and the social quests; also adds a friend from an invite link. */
  const refreshFriends = useCallback(async () => {
    if (!ready.current) return;
    const gen = generation.current;
    const invite = readInvite();
    if (invite) {
      try {
        const r = await friendsApi.add(invite);
        const name = r.friends.find((f) => f.code === invite)?.name;
        if (name) toast({ message: t.journey.friends.inviteAdded(name), tone: 'success' });
      } catch (e) {
        // Own code, unknown code, a full list: say why once and drop the invite.
        if (e instanceof AccountError) toast({ message: e.message, tone: 'warning' });
      }
      clearInvite();
    }
    const r = await friendsApi.list().catch(() => null);
    if (!r || gen !== generation.current) return;
    setFriends(r);
    dispatch({ type: 'SET_SOCIAL', on: r.friends.length > 0 });
  }, [dispatch, toast]);

  /** First contact after sign-in (or page load): decide push, pull or ask. */
  const attach = useCallback(
    async (u: AccountUser) => {
      const gen = ++generation.current;
      owner.current = u.key ?? null;
      setUser(u);
      setStatus('signed-in');
      const remote = await accountApi.getProgress().catch(() => null);
      if (gen !== generation.current) return;
      if (!remote) {
        setSync('offline');
        return;
      }
      version.current = remote.version;
      const parsed = remote.data ? parseProgress(remote.data, Date.now()) : null;
      const plan = reconcile(stateRef.current, parsed, owner.current);
      if (plan.kind === 'ask' && parsed) {
        setConflict({ remote: parsed, version: remote.version });
        return;
      }
      ready.current = true;
      if (plan.kind === 'pull' && parsed) {
        load(remote);
        saved();
      } else if (plan.kind === 'fresh') {
        // Another account's journey is on this device: this account begins its own.
        dispatch({ type: 'RESET', now: Date.now() });
        dispatch({ type: 'SET_OWNER', owner: owner.current });
      } else if (plan.kind === 'push') {
        dispatch({ type: 'SET_OWNER', owner: owner.current });
        await push({ ...stateRef.current, owner: owner.current });
      } else {
        dispatch({ type: 'SET_OWNER', owner: owner.current });
        saved();
      }
      void pullEvents();
      void refreshFriends();
    },
    [dispatch, load, push, pullEvents, refreshFriends, saved],
  );

  /** The emailed link: sign in here, or ask first when it was asked for in another browser. */
  const openLink = useCallback(
    async (token: string, confirm: boolean) => {
      try {
        const r = await accountApi.link(token, confirm);
        if ('needsConfirm' in r) {
          setLinkConfirm({ token, email: r.email });
          return;
        }
        setLinkConfirm(null);
        toast({ message: t.account.toasts.signedIn, tone: 'success' });
        await attach(r.user);
      } catch {
        setLinkConfirm(null);
        toast({ message: t.account.toasts.linkExpired, tone: 'warning' });
      }
    },
    [attach, toast],
  );

  // While signed in: check for friends' help now and then, and when the tab comes back.
  useEffect(() => {
    if (status !== 'signed-in' || conflict) return;
    const tick = () => {
      void pullEvents();
      void refreshFriends();
    };
    const timer = setInterval(tick, EVENTS_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status, conflict, pullEvents, refreshFriends]);

  // Who is this? One quiet request per page load; failure just means "guest".
  useEffect(() => {
    let alive = true;
    const token = takeLoginToken();
    accountApi
      .me()
      .then((r) => {
        if (!alive) return;
        if (token) void openLink(token, false);
        else if (r.user) void attach(r.user);
        else setStatus('guest');
        if (token && !r.user) setStatus('guest');
      })
      .catch(() => alive && setStatus('guest'));
    // Older links land on ?account=expired: say so once and tidy the URL.
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('account');
    if (flag) {
      toast(
        flag === 'ok'
          ? { message: t.account.toasts.signedIn, tone: 'success' }
          : { message: t.account.toasts.linkExpired, tone: 'warning' },
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
    const timer = setTimeout(() => void push(state), PUSH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, status, conflict, push]);

  /** Signed out (or deleted): the garden on this device starts over as a guest's. */
  const leave = useCallback(() => {
    generation.current++;
    ready.current = false;
    owner.current = null;
    setUser(null);
    setStatus('guest');
    setSync('idle');
    setConflict(null);
    setFriends(null);
    // The account keeps its garden; this device must not carry it into the next account.
    dispatch({ type: 'RESET', now: Date.now() });
  }, [dispatch]);

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
          load({ data: conflict.remote, version: conflict.version, updatedAt: null });
          saved();
        } else {
          dispatch({ type: 'SET_OWNER', owner: owner.current });
          await push({ ...stateRef.current, owner: owner.current });
        }
        void pullEvents();
        void refreshFriends();
      },
      signedIn: attach,
      linkConfirm: linkConfirm ? { email: linkConfirm.email } : null,
      answerLink: async (yes) => {
        const pending = linkConfirm;
        setLinkConfirm(null);
        if (yes && pending) await openLink(pending.token, true);
      },
      logout: async () => {
        // Out on the server first: a failed sign-out must not look like one.
        await accountApi.logout();
        leave();
      },
      deleteAccount: async () => {
        await accountApi.remove();
        leave();
      },
      checkInbox: pullEvents,
      friends,
      refreshFriends,
      setMarketing: async (on) => {
        setUser(await accountApi.setMarketing(on));
      },
    }),
    [
      status,
      user,
      sync,
      lastSyncAt,
      conflict,
      linkConfirm,
      state,
      dispatch,
      push,
      load,
      saved,
      attach,
      openLink,
      leave,
      pullEvents,
      friends,
      refreshFriends,
    ],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

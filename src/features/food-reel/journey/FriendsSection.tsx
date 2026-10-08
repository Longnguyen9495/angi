import {
  Basket,
  Coins,
  Copy,
  Drop,
  Gift,
  HandHeart,
  ShareNetwork,
  Trash,
  UsersThree,
} from '@phosphor-icons/react';
import { Suspense, lazy, useCallback, useEffect, useState, type FormEvent } from 'react';
import { CropIcon } from '../../../components/ui/CropIcon';
import { Sheet } from '../../../components/ui/Sheet';
import { CROPS, XP, chefTitleIndex } from '../../../data/game';
import type { CropId } from '../../../data/types';
import { STAGE_LABEL, plotStage } from '../../../domain/selectors';
import { currentTime, formatDuration } from '../../../domain/time';
import { friendCanWater, friendPlots } from '../../garden3d/friendGarden';
import { canUseWebGL } from '../../garden3d/quality';
import {
  AccountError,
  friendsApi,
  type FeedItem,
  type FriendGarden,
  type FriendsList,
  type Referrals,
} from '../../../services/account';
import { BRAND, intlLocale, t } from '../../../i18n';
import { useAccount, useFeedback, useGame, useUi } from '../../../state/hooks';

const m = t.journey.friends;
const v = t.journey.visit;

import { FriendFarm } from './FriendFarm';

const FriendIsland = lazy(() => import('../../garden3d/FriendIsland'));
const FriendSky = lazy(() =>
  import('../../sky-garden/game/FriendSky').then((x) => ({ default: x.FriendSky })),
);
/** Bugs a visitor may catch in friends' cloud gardens per day (server/lib/Friends.php). */
const SKY_HELPS_PER_DAY = 5;
/** The old 3D island stays reachable with ?visit=3d while the 2D farm is new. */
const VISIT_3D =
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('visit') === '3d';

/** ?ban=K7QM2P in a shared link pre-fills the add-friend box. */
function codeFromUrl(): string {
  if (typeof window === 'undefined') return '';
  const c = new URLSearchParams(window.location.search).get('ban') ?? '';
  return /^[A-Za-z0-9]{6}$/.test(c) ? c.toUpperCase() : '';
}

function shareUrl(code: string): string {
  return `${window.location.origin}/journey?ban=${code}`;
}

/**
 * Khu vườn bạn bè: a garden code to share, friends ranked by XP, visits to
 * their island and one watering-help per friend per day. Needs the optional
 * account; signed out it is a short invitation.
 */
export function FriendsSection() {
  const { status, checkInbox, refreshFriends, friends } = useAccount();
  const { openAccount } = useUi();
  const { toast } = useFeedback();
  const [data, setData] = useState<FriendsList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState(codeFromUrl);
  const [busy, setBusy] = useState(false);
  const [naming, setNaming] = useState<string | null>(null);
  const [visit, setVisit] = useState<string | null>(null);
  const [gifting, setGifting] = useState<{ code: string; name: string } | null>(null);

  const load = useCallback(() => {
    friendsApi
      .list()
      .then((r) => {
        setData(r);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof AccountError ? e.message : m.loadFailed));
  }, []);

  // The account refreshes the list too (every few minutes, after an invite link adds a
  // friend): take its newer copy as soon as it arrives.
  const [seenFriends, setSeenFriends] = useState(friends);
  if (friends !== seenFriends) {
    setSeenFriends(friends);
    if (friends) setData(friends);
  }

  useEffect(() => {
    if (status !== 'signed-in') return;
    let alive = true;
    friendsApi
      .list()
      .then((r) => alive && setData(r))
      .catch((e: unknown) => {
        if (alive) setError(e instanceof AccountError ? e.message : m.loadFailed);
      });
    return () => {
      alive = false;
    };
  }, [status]);

  if (status !== 'signed-in') {
    return (
      <div className="fj-friends fj-friends--invite">
        <UsersThree size={28} aria-hidden="true" />
        <div>
          <h3 className="fj-h3">{m.title}</h3>
          <p className="fj-note">{codeFromUrl() ? m.invitePending : m.invite(XP.friendHelp)}</p>
        </div>
        <button
          type="button"
          className="fr-ghost"
          onClick={openAccount}
          disabled={status === 'loading'}
        >
          {m.saveToFriend}
        </button>
      </div>
    );
  }

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const r = await friendsApi.add(code);
      setData(r);
      setCode('');
      void refreshFriends();
      toast({ message: m.added, tone: 'success' });
    } catch (err) {
      toast({
        message: err instanceof AccountError ? err.message : m.addFailed,
        tone: 'warning',
      });
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!data) return;
    const text = m.shareText(BRAND, data.me.code);
    const url = shareUrl(data.me.code);
    try {
      if (navigator.share) {
        await navigator.share({ title: m.shareTitle(BRAND), text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}: ${url}`);
      toast({ message: m.inviteCopied, tone: 'success' });
    } catch {
      /* the guest closed the share sheet */
    }
  };

  const copy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.me.code);
      toast({ message: m.codeCopied(data.me.code), tone: 'success' });
    } catch {
      toast({ message: m.yourCode(data.me.code) });
    }
  };

  /** A code that leaked (posted somewhere) stops working; current friends stay. */
  const renewCode = async () => {
    if (!data || !window.confirm(m.confirmNewCode)) return;
    try {
      const p = await friendsApi.newCode();
      toast({ message: m.newCodeDone(p.code), tone: 'success' });
      load();
    } catch (err) {
      toast({
        message: err instanceof AccountError ? err.message : m.renameFailed,
        tone: 'warning',
      });
    }
  };

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (naming === null) return;
    try {
      await friendsApi.rename(naming);
      setNaming(null);
      load();
      // The farm's name board reads the name from the shared friends list.
      void refreshFriends();
    } catch (err) {
      toast({
        message: err instanceof AccountError ? err.message : m.renameFailed,
        tone: 'warning',
      });
    }
  };

  const remove = async (friendCode: string, name: string) => {
    if (!window.confirm(m.confirmRemove(name))) return;
    try {
      setData(await friendsApi.remove(friendCode));
    } catch {
      toast({ message: m.removeFailed, tone: 'error' });
    }
  };

  const board = data
    ? [
        { ...data.me, name: data.me.displayName, isMe: true as const },
        ...data.friends.map((f) => ({ ...f, isMe: false as const })),
      ].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0) || b.xp - a.xp)
    : [];

  return (
    <div className="fj-friends">
      <div className="fj-friends__head">
        <h3 className="fj-h3">{m.title}</h3>
        {data && (
          <p className="fj-note">
            {m.helpsLeft(data.helpsLeft, XP.friendHelp)} {m.stealsLeft(data.stealsLeft)}
          </p>
        )}
      </div>

      {error && !data && <p className="fj-note">{error}</p>}

      {data && (
        <div className="fj-friends__grid">
          <div className="fj-friends__me">
            <p className="fj-friends__label">{m.myCode}</p>
            <p
              className="fj-friends__code"
              aria-label={m.codeAria(data.me.code.split('').join(' '))}
            >
              {data.me.code}
            </p>
            <div className="fj-friends__row">
              <button type="button" className="fr-ghost" onClick={copy}>
                <Copy size={16} aria-hidden="true" /> {m.copyCode}
              </button>
              <button type="button" className="fr-ghost" onClick={share}>
                <ShareNetwork size={16} aria-hidden="true" /> {m.inviteFriend}
              </button>
              <button type="button" className="fr-ghost" onClick={() => void renewCode()}>
                {m.newCode}
              </button>
            </div>
            {naming === null ? (
              <button
                type="button"
                className="fj-friends__rename"
                onClick={() => setNaming(data.me.name)}
              >
                {data.me.name ? m.renameCurrent(data.me.name) : m.nameGarden}
              </button>
            ) : (
              <form className="fj-friends__form" onSubmit={saveName}>
                <label className="sr-only" htmlFor="fj-garden-name">
                  {m.gardenName}
                </label>
                <input
                  id="fj-garden-name"
                  value={naming}
                  maxLength={40}
                  placeholder={m.gardenNamePlaceholder}
                  onChange={(e) => setNaming(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="fr-ghost">
                  {m.save}
                </button>
              </form>
            )}
          </div>

          <form className="fj-friends__add" onSubmit={add}>
            <label className="fj-friends__label" htmlFor="fj-friend-code">
              {m.addByCode}
            </label>
            <div className="fj-friends__form">
              <input
                id="fj-friend-code"
                value={code}
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={8}
                placeholder={m.codePlaceholder}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <button type="submit" className="fr-cta" disabled={busy || code.trim().length < 6}>
                {m.add}
              </button>
            </div>
            <p className="fj-note">{m.limit(data.max)}</p>
          </form>
        </div>
      )}

      {data && (
        <ol className="fj-board" aria-label={m.boardLabel}>
          {board.map((f, i) => (
            <li key={f.code} className={`fj-board__row ${f.isMe ? 'is-me' : ''}`}>
              <span className="fj-board__rank">{i + 1}</span>
              <span className="fj-board__name">
                {f.isMe ? m.me(f.name) : f.name}
                <span className="fj-board__meta">
                  {m.boardMeta(f.level, f.xp)}
                  {` · ★ ${f.stars ?? 0} · ${t.data.chefTitles[chefTitleIndex(f.stars ?? 0)]}`}
                  {!f.isMe && f.growing > 0 && !f.helpedToday && m.needWater(f.growing)}
                  {!f.isMe && f.helpedToday && m.wateredToday}
                  {!f.isMe &&
                    f.stealable > 0 &&
                    !f.stoleToday &&
                    data.stealsLeft > 0 &&
                    m.ripe(f.stealable)}
                  {!f.isMe && f.giftedToday && m.giftedToday}
                  {typeof f.skyScore === 'number' && t.sky.game.friend.scoreShort(f.skyScore)}
                </span>
              </span>
              {!f.isMe && (
                <span className="fj-board__actions">
                  <button type="button" className="fr-ghost" onClick={() => setVisit(f.code)}>
                    {m.visit}
                  </button>
                  <button
                    type="button"
                    className="fj-board__remove"
                    aria-label={m.giftLabel(f.name)}
                    title={m.gift}
                    disabled={f.giftedToday || data.giftsLeft <= 0}
                    onClick={() => setGifting({ code: f.code, name: f.name })}
                  >
                    <Gift size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="fj-board__remove"
                    aria-label={m.removeLabel(f.name)}
                    onClick={() => remove(f.code, f.name)}
                  >
                    <Trash size={16} aria-hidden="true" />
                  </button>
                </span>
              )}
            </li>
          ))}
          {data.friends.length === 0 && <li className="fj-board__empty">{m.empty}</li>}
        </ol>
      )}

      {data?.referrals && <ReferralPanel r={data.referrals} />}

      {data && <FriendFeed onVisit={setVisit} />}

      {visit && (
        <FriendVisit
          code={visit}
          onClose={() => setVisit(null)}
          onHelped={() => {
            load();
            void checkInbox();
            void refreshFriends();
          }}
        />
      )}

      {gifting && data && (
        <GiftSheet
          friend={gifting}
          left={data.giftsLeft}
          onClose={() => setGifting(null)}
          onSent={(r) => {
            setData(r);
            setGifting(null);
            void refreshFriends();
          }}
        />
      )}
    </div>
  );
}

/** One seed from our tray to a friend; the server records it, then the seed leaves the tray. */
function GiftSheet({
  friend,
  left,
  onClose,
  onSent,
}: {
  friend: { code: string; name: string };
  left: number;
  onClose: () => void;
  onSent: (list: FriendsList) => void;
}) {
  const { state, dispatch } = useGame();
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const seeds = (Object.keys(state.seeds) as CropId[]).filter((c) => state.seeds[c] > 0);

  const send = async (crop: CropId) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await friendsApi.gift(friend.code, crop);
      dispatch({ type: 'GIFT_SENT', id: r.id, crop, now: currentTime() });
      toast({
        message: m.giftSent(CROPS[crop].seedName.toLowerCase(), friend.name),
        tone: 'success',
      });
      onSent(r);
    } catch (e) {
      toast({ message: e instanceof AccountError ? e.message : m.giftFailed, tone: 'warning' });
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={m.giftTitle(friend.name)}
      description={m.giftNote(left)}
      variant="dark"
    >
      {seeds.length === 0 ? (
        <p className="fj-note">{m.giftNone}</p>
      ) : (
        <ul className="fj-gift">
          {seeds.map((c) => (
            <li key={c}>
              <button type="button" className="fr-ghost" disabled={busy} onClick={() => send(c)}>
                <CropIcon crop={c} size={20} /> {m.giftSeed(CROPS[c].seedName, state.seeds[c])}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

function feedText(i: FeedItem): string {
  const f = m.feed;
  const crop = i.crop && Object.hasOwn(CROPS, i.crop) ? CROPS[i.crop as CropId] : null;
  switch (i.type) {
    case 'water':
      return f.water(i.name, i.plotId);
    case 'helped':
      return f.helped(i.name);
    case 'stolen':
      return f.stolen(i.name, crop?.name.toLowerCase() ?? '');
    case 'stole':
      return f.stole(i.name, crop?.name.toLowerCase() ?? '');
    case 'present':
      return f.present(i.name, crop?.seedName.toLowerCase() ?? '');
    case 'sentPresent':
      return f.sentPresent(i.name, crop?.seedName.toLowerCase() ?? '');
    case 'thanks':
      return f.thanks(i.name);
    case 'gift':
      return f.gift(crop?.seedName.toLowerCase() ?? '');
    case 'referral':
      return f.referral(i.name, i.coins ?? 0, i.xp ?? 0);
    case 'skyhelp':
      return t.sky.game.friend.feedHelp(i.name);
    case 'skycaught':
      return t.sky.game.friend.caughtForYou(i.name);
  }
}

/**
 * Mời bạn mới: the milestones a newcomer reaches to pay both gardens, who brought me in,
 * and how far the gardens I brought in have got. The server pays; this only shows it.
 */
function ReferralPanel({ r }: { r: Referrals }) {
  const p = m.referral;
  const coins = r.milestones.reduce((n, ms) => n + ms.coins, 0);
  const xp = r.milestones.reduce((n, ms) => n + ms.xp, 0);
  const paid = r.invitedBy?.done ?? [];
  return (
    <section className="fj-referral" aria-labelledby="fj-referral-title">
      <h3 className="fj-h3" id="fj-referral-title">
        <Coins size={20} aria-hidden="true" /> {p.title}
      </h3>
      <p className="fj-note">{r.invitedBy ? p.invitedBy(r.invitedBy.name) : p.intro(coins, xp)}</p>
      <ol className="fj-referral__steps">
        {r.milestones.map((ms) => {
          const done = paid.includes(ms.id);
          return (
            <li key={ms.id} className={done ? 'is-done' : undefined}>
              <span>{p.milestone[ms.metric](ms.target)}</span>
              <span className="fj-referral__coins">
                {done ? p.done : p.reward(ms.coins, ms.xp)}
              </span>
            </li>
          );
        })}
      </ol>
      {r.invitedBy && <p className="fj-note">{p.intro(coins, xp)}</p>}
      <p className="fj-friends__label">{p.invitedTitle(r.invited.length, r.max)}</p>
      {r.invited.length === 0 ? (
        <p className="fj-note">{p.none}</p>
      ) : (
        <ul className="fj-referral__list">
          {r.invited.map((f, i) => (
            <li key={i}>
              <span>{f.name}</span>
              <span className="fj-board__meta">
                {p.invitedMeta(f.level, f.done.length, r.milestones.length)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="fj-note">{r.invited.length >= r.max ? p.full(r.max) : p.rule}</p>
    </section>
  );
}

/** Friends' news: who helped, picked or gave, with a way to visit back or say thanks. */
function FriendFeed({ onVisit }: { onVisit: (code: string) => void }) {
  const { toast } = useFeedback();
  const [items, setItems] = useState<FeedItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    friendsApi
      .feed()
      .then((r) => alive && setItems(r.items))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);

  const thank = async (code: string) => {
    try {
      await friendsApi.thanks(code);
      setItems((list) => list?.map((x) => (x.code === code ? { ...x, thanked: true } : x)) ?? null);
    } catch {
      toast({ message: m.feed.thankFailed, tone: 'warning' });
    }
  };

  if (!items) return null;
  return (
    <section className="fj-feed" aria-labelledby="fj-feed-title">
      <h3 className="fj-h3" id="fj-feed-title">
        {m.feed.title}
      </h3>
      {items.length === 0 ? (
        <p className="fj-note">{m.feed.empty}</p>
      ) : (
        <ul className="fj-feed__list">
          {items.map((i) => (
            <li key={i.id} className={`fj-feed__item is-${i.type}`}>
              <span className="fj-feed__text">
                {feedText(i)}
                <span className="fj-board__meta">
                  {new Date(i.at * 1000).toLocaleString(intlLocale, {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </span>
              {i.code && i.type === 'stolen' && (
                <button type="button" className="fr-ghost" onClick={() => onVisit(i.code!)}>
                  <Basket size={16} aria-hidden="true" /> {m.feed.revenge}
                </button>
              )}
              {i.code && (i.type === 'water' || i.type === 'present') && (
                <button
                  type="button"
                  className="fr-ghost"
                  disabled={i.thanked}
                  onClick={() => thank(i.code!)}
                >
                  <HandHeart size={16} aria-hidden="true" />{' '}
                  {i.thanked ? m.feed.thanked : m.feed.thank}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FriendVisit({
  code,
  onClose,
  onHelped,
}: {
  code: string;
  onClose: () => void;
  onHelped: () => void;
}) {
  const { now, reduced, quality } = useGame();
  const { toast } = useFeedback();
  const [garden, setGarden] = useState<FriendGarden | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  /** The plot we just watered (their snapshot only updates once they open the app). */
  const [helped, setHelped] = useState<number | null>(null);
  /** Their farm, or their Vườn Mây (when they have one). */
  const [tab, setTab] = useState<'farm' | 'sky'>('farm');

  useEffect(() => {
    let alive = true;
    friendsApi
      .visit(code)
      .then((g) => alive && setGarden(g))
      .catch((e: unknown) => {
        if (alive) setError(e instanceof AccountError ? e.message : v.loadFailed);
      });
    return () => {
      alive = false;
    };
  }, [code]);

  const canHelp = !!garden && !garden.helpedToday && garden.helpsLeft > 0;
  const canPick = !!garden && !garden.stoleToday && garden.stealsLeft > 0;
  const plots = garden ? friendPlots(garden) : [];
  const waterable = new Set(
    canHelp ? plots.filter((p) => friendCanWater(p, now)).map((p) => p.id) : [],
  );
  const pickable = new Set(
    canPick && garden ? garden.plots.filter((p) => p.stealable).map((p) => p.id) : [],
  );
  const stolen = new Set(garden ? garden.plots.filter((p) => p.stolen).map((p) => p.id) : []);

  const pick = async (plotId: number) => {
    if (!garden || busy) return;
    setBusy(true);
    try {
      const g = await friendsApi.steal(code, plotId);
      setGarden(g);
      const crop = Object.hasOwn(CROPS, g.crop)
        ? CROPS[g.crop as CropId].name.toLowerCase()
        : g.crop;
      toast({ message: v.stole(crop, g.name, XP.steal), tone: 'reward' });
      onHelped();
    } catch (e) {
      toast({
        message: e instanceof AccountError ? e.message : v.stealFailed,
        tone: 'warning',
      });
    } finally {
      setBusy(false);
    }
  };

  const water = async (plotId: number) => {
    if (!garden || busy) return;
    setBusy(true);
    try {
      const g = await friendsApi.water(code, plotId);
      setGarden(g);
      setHelped(plotId);
      toast({
        message: v.watered(plotId, g.name, XP.friendHelp),
        tone: 'reward',
      });
      onHelped();
    } catch (e) {
      toast({
        message: e instanceof AccountError ? e.message : v.waterFailed,
        tone: 'warning',
      });
    } finally {
      setBusy(false);
    }
  };

  const catchBug = async (uid: string, stage: number) => {
    if (!garden || busy) return;
    setBusy(true);
    try {
      const g = await friendsApi.skyCatch(code, uid, stage);
      setGarden(g);
      toast({
        message: t.sky.game.friend.caught(t.sky.bugs[g.bug], g.name),
        tone: 'reward',
      });
      onHelped();
    } catch (e) {
      toast({
        message: e instanceof AccountError ? e.message : t.sky.game.friend.failed,
        tone: 'warning',
      });
    } finally {
      setBusy(false);
    }
  };
  const onSky = tab === 'sky' && !!garden?.sky;

  return (
    <Sheet
      open
      onClose={onClose}
      title={garden?.name ?? v.loading}
      description={
        garden
          ? v.description(
              garden.level,
              garden.helpedToday ? v.helpedToday : canHelp ? v.canHelp : v.noHelpsLeft,
            )
          : undefined
      }
      variant="dark"
      fullOnMobile
    >
      {error && <p className="fj-note">{error}</p>}
      {garden?.sky && (
        <div className="fj-chips" role="tablist" aria-label={t.sky.name}>
          {(['farm', 'sky'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className="fj-market__tab"
              onClick={() => setTab(id)}
            >
              {id === 'farm' ? t.sky.game.friend.farmTab : t.sky.game.friend.skyTab}
            </button>
          ))}
        </div>
      )}
      {garden && onSky && (
        <Suspense fallback={<p className="fj-note">{v.loading}</p>}>
          <FriendSky
            sky={garden.sky}
            now={now}
            helpsLeft={garden.skyHelpsLeft ?? 0}
            helpsMax={SKY_HELPS_PER_DAY}
            busy={busy}
            onCatch={(uid, stage) => void catchBug(uid, stage)}
          />
        </Suspense>
      )}
      {garden && !onSky && !VISIT_3D && (
        <FriendFarm
          garden={garden}
          now={now}
          reduced={reduced}
          quality={quality}
          waterable={waterable}
          pickable={pickable}
          onPlot={(id) => {
            setPicked(id);
            if (waterable.has(id)) void water(id);
            else if (pickable.has(id)) void pick(id);
          }}
        />
      )}
      {garden && !onSky && VISIT_3D && canUseWebGL() && (
        <Suspense fallback={<div className="g3d-loading">{v.flying}</div>}>
          <FriendIsland
            garden={garden}
            now={now}
            reduced={reduced}
            selectedPlot={picked}
            highlight={new Set([...waterable, ...pickable])}
            onPlot={(id) => {
              setPicked(id);
              if (waterable.has(id)) void water(id);
              else if (pickable.has(id)) void pick(id);
            }}
          />
        </Suspense>
      )}
      {garden && !onSky && canPick && garden.plots.some((p) => p.stealable) && (
        <p className="fj-note">{v.stealRule(garden.stealsLeft, garden.stealGraceMin)}</p>
      )}
      {garden && !onSky && (
        <ul className="fj-visit__plots" aria-label={v.plotsLabel}>
          {plots.map((p) => {
            const stage = plotStage(p, now);
            const crop = p.crop ? CROPS[p.crop as CropId] : null;
            return (
              <li key={p.id} className={picked === p.id ? 'is-picked' : ''}>
                <span>
                  {v.plot(p.id, crop ? crop.name : v.empty)}
                  {crop && (
                    <span className="fj-board__meta">
                      {STAGE_LABEL[stage]}
                      {p.readyAt && p.readyAt > now
                        ? v.timeLeft(formatDuration(p.readyAt - now))
                        : ''}
                    </span>
                  )}
                </span>
                {helped === p.id && <span className="fj-visit__done">{v.helped}</span>}
                {stolen.has(p.id) && <span className="fj-visit__done">{v.stolen}</span>}
                {pickable.has(p.id) && (
                  <button
                    type="button"
                    className="fj-can-btn"
                    disabled={busy}
                    onClick={() => pick(p.id)}
                  >
                    <Basket size={16} aria-hidden="true" /> {v.steal}
                  </button>
                )}
                {waterable.has(p.id) && (
                  <button
                    type="button"
                    className="fj-can-btn"
                    disabled={busy}
                    onClick={() => water(p.id)}
                  >
                    <Drop size={16} aria-hidden="true" /> {v.water}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

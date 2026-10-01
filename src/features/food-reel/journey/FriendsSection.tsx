import { Copy, Drop, ShareNetwork, Trash, UsersThree } from '@phosphor-icons/react';
import { Suspense, lazy, useCallback, useEffect, useState, type FormEvent } from 'react';
import { Sheet } from '../../../components/ui/Sheet';
import { CROPS, XP } from '../../../data/game';
import type { CropId } from '../../../data/types';
import { STAGE_LABEL, plotStage } from '../../../domain/selectors';
import { formatDuration } from '../../../domain/time';
import { friendCanWater, friendPlots } from '../../garden3d/friendGarden';
import { canUseWebGL } from '../../garden3d/quality';
import {
  AccountError,
  friendsApi,
  type FriendGarden,
  type FriendsList,
} from '../../../services/account';
import { BRAND, t } from '../../../i18n';
import { useAccount, useFeedback, useGame, useUi } from '../../../state/hooks';

const m = t.journey.friends;
const v = t.journey.visit;

const FriendIsland = lazy(() => import('../../garden3d/FriendIsland'));

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
  const { status, checkInbox } = useAccount();
  const { openAccount } = useUi();
  const { toast } = useFeedback();
  const [data, setData] = useState<FriendsList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState(codeFromUrl);
  const [busy, setBusy] = useState(false);
  const [naming, setNaming] = useState<string | null>(null);
  const [visit, setVisit] = useState<string | null>(null);

  const load = useCallback(() => {
    friendsApi
      .list()
      .then((r) => {
        setData(r);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof AccountError ? e.message : m.loadFailed));
  }, []);

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
          <p className="fj-note">{m.invite(XP.friendHelp)}</p>
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

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (naming === null) return;
    try {
      await friendsApi.rename(naming);
      setNaming(null);
      load();
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
      ].sort((a, b) => b.xp - a.xp)
    : [];

  return (
    <div className="fj-friends">
      <div className="fj-friends__head">
        <h3 className="fj-h3">{m.title}</h3>
        {data && <p className="fj-note">{m.helpsLeft(data.helpsLeft, XP.friendHelp)}</p>}
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
                  {!f.isMe && f.growing > 0 && !f.helpedToday && m.needWater(f.growing)}
                  {!f.isMe && f.helpedToday && m.wateredToday}
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

      {visit && (
        <FriendVisit
          code={visit}
          onClose={() => setVisit(null)}
          onHelped={() => {
            load();
            void checkInbox();
          }}
        />
      )}
    </div>
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
  const { now, reduced } = useGame();
  const { toast } = useFeedback();
  const [garden, setGarden] = useState<FriendGarden | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  /** The plot we just watered (their snapshot only updates once they open the app). */
  const [helped, setHelped] = useState<number | null>(null);

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
  const plots = garden ? friendPlots(garden) : [];
  const waterable = new Set(
    canHelp ? plots.filter((p) => friendCanWater(p, now)).map((p) => p.id) : [],
  );

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
      {garden && canUseWebGL() && (
        <Suspense fallback={<div className="g3d-loading">{v.flying}</div>}>
          <FriendIsland
            garden={garden}
            now={now}
            reduced={reduced}
            selectedPlot={picked}
            highlight={waterable}
            onPlot={(id) => {
              setPicked(id);
              if (waterable.has(id)) void water(id);
            }}
          />
        </Suspense>
      )}
      {garden && (
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

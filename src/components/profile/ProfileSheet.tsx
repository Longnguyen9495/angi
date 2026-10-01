import { DownloadSimple, Eye, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { getDish } from '../../data/dishes';
import type { MotionPref } from '../../domain/progress';
import { exportProgress } from '../../domain/persistence';
import { level, stampCount } from '../../domain/selectors';
import { t } from '../../i18n';
import { clearPhotos } from '../../services/photoStore';
import { useAccount, useFeedback, useGame } from '../../state/hooks';
import { AccountBlock } from '../account/AccountBlock';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { ProgressBar } from '../ui/ProgressBar';
import { Sheet } from '../ui/Sheet';
import { currentTime } from '../../domain/time';

const p = t.account.profile;

const MOTION_OPTIONS: { id: MotionPref; label: string; hint: string }[] = [
  { id: 'system', label: p.motion.system.label, hint: p.motion.system.hint },
  { id: 'reduce', label: p.motion.reduce.label, hint: p.motion.reduce.hint },
  { id: 'full', label: p.motion.full.label, hint: p.motion.full.hint },
];

const OUTCOME_TEXT = p.outcomes;

export function ProfileSheet({
  open,
  onClose,
  variant,
}: {
  open: boolean;
  onClose: () => void;
  variant?: 'light' | 'dark';
}) {
  const { state, dispatch, reduced } = useGame();
  const { toast } = useFeedback();
  const [confirmReset, setConfirmReset] = useState(false);
  const lv = level(state.xp);
  const signedIn = useAccount().status === 'signed-in';

  const download = () => {
    const blob = new Blob([exportProgress(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'an-gi-nong-trai.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Sheet
      variant={variant}
      open={open}
      onClose={() => {
        setConfirmReset(false);
        onClose();
      }}
      title={p.title}
      description={signedIn ? p.descriptionSignedIn : p.descriptionGuest}
    >
      <div className="profile">
        <section className="profile__block" aria-labelledby="pf-level">
          <h3 id="pf-level" className="profile__heading">
            {p.level(lv.level)}
          </h3>
          <ProgressBar
            label={p.xpLabel}
            value={lv.into}
            max={lv.span}
            valueText={`${lv.into}/${lv.span} XP`}
            size="sm"
          />
          <p className="profile__stats">
            {p.stats.streakBefore}
            <strong>{p.stats.streakDays(state.streak.count)}</strong>
            {p.stats.after(state.streak.restPasses, stampCount(state))}
          </p>
          <p className="empty-note">{p.streakNote}</p>
        </section>

        <AccountBlock />

        <section className="profile__block" aria-labelledby="pf-language">
          <h3 id="pf-language" className="profile__heading">
            {p.language}
          </h3>
          <LanguageSwitcher variant="full" className="profile__lang" />
        </section>

        <fieldset className="profile__block option-group">
          <legend className="profile__heading">{p.motionHeading}</legend>
          {MOTION_OPTIONS.map((m) => (
            <label key={m.id} className="option-card option-card--compact">
              <input
                type="radio"
                name="motion"
                value={m.id}
                checked={state.settings.motion === m.id}
                onChange={() => dispatch({ type: 'SET_MOTION', motion: m.id })}
                data-autofocus={state.settings.motion === m.id ? true : undefined}
              />
              <span className="option-card__face">
                <span className="option-card__label">{m.label}</span>
                <span className="option-card__hint">{m.hint}</span>
              </span>
            </label>
          ))}
          <p className="empty-note">{p.motionApplied(reduced)}</p>
        </fieldset>

        <section className="profile__block" aria-labelledby="pf-history">
          <h3 id="pf-history" className="profile__heading">
            {p.history}
          </h3>
          {state.history.length === 0 ? (
            <p className="empty-note">{p.historyEmpty}</p>
          ) : (
            <ul className="history-list">
              {state.history.slice(0, 5).map((h) => (
                <li key={`${h.slotKey}-${h.at}`}>
                  <span>{getDish(h.dishId)?.name}</span>
                  <span className="history-list__meta">
                    {OUTCOME_TEXT[h.outcome]}
                    {h.rating ? ` · ${h.rating}/5` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="profile__block" aria-labelledby="pf-hidden">
          <h3 id="pf-hidden" className="profile__heading">
            {p.hidden}
          </h3>
          {state.hiddenDishIds.length === 0 ? (
            <p className="empty-note">{p.hiddenEmpty}</p>
          ) : (
            <ul className="history-list">
              {state.hiddenDishIds.map((id) => (
                <li key={id}>
                  <span>{getDish(id)?.name ?? id}</span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => dispatch({ type: 'UNHIDE_DISH', dishId: id })}
                  >
                    <Eye aria-hidden="true" size={16} />
                    {p.unhide}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="profile__block" aria-labelledby="pf-demo">
          <h3 id="pf-demo" className="profile__heading">
            {p.demo}
          </h3>
          <label className="switch">
            <input
              type="checkbox"
              role="switch"
              className="switch__input"
              checked={state.settings.simulateFailure}
              onChange={(e) => dispatch({ type: 'SET_SIMULATE_FAILURE', value: e.target.checked })}
            />
            <span className="switch__track" aria-hidden="true">
              <span className="switch__thumb" />
            </span>
            <span className="switch__label">{p.simulateFailure}</span>
          </label>
        </section>

        <section className="profile__block" aria-labelledby="pf-data">
          <h3 id="pf-data" className="profile__heading">
            {p.data}
          </h3>
          <div className="profile__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={download}>
              <DownloadSimple aria-hidden="true" size={18} />
              {p.download}
            </button>
            {confirmReset ? (
              <span className="profile__confirm" role="group" aria-label={p.confirmResetLabel}>
                <span className="profile__confirm-note">
                  {signedIn ? p.confirmResetSignedIn : p.confirmResetGuest}
                </span>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => {
                    dispatch({ type: 'RESET', now: currentTime() });
                    void clearPhotos().catch(() => undefined);
                    setConfirmReset(false);
                    toast({ message: p.resetDone, tone: 'info' });
                  }}
                >
                  {p.resetConfirm}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setConfirmReset(false)}
                >
                  {p.keep}
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirmReset(true)}
              >
                <Trash aria-hidden="true" size={18} />
                {p.reset}
              </button>
            )}
          </div>
        </section>
      </div>
    </Sheet>
  );
}

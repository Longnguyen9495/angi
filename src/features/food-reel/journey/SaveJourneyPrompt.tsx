import { CloudArrowUp } from '@phosphor-icons/react';
import { useState } from 'react';
import { stampCount } from '../../../domain/selectors';
import { t } from '../../../i18n';
import { useAccount, useGame, useUi } from '../../../state/hooks';

const m = t.journey.savePrompt;

const KEY = 'hanh-trinh-bep-viet/account-prompt';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
/** After this many "Để sau", the offer only lives in the profile. */
const MAX_DISMISSALS = 2;

interface PromptMemo {
  dismissedAt: number;
  count: number;
}

function readMemo(): PromptMemo {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<PromptMemo> | null;
    return { dismissedAt: Number(raw?.dismissedAt) || 0, count: Number(raw?.count) || 0 };
  } catch {
    return { dismissedAt: 0, count: 0 };
  }
}

function writeMemo(m: PromptMemo) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* storage unavailable: the prompt just comes back next visit */
  }
}

/**
 * A quiet offer to keep the journey, shown only once there is something worth
 * keeping (3 stamps or a first cooked dish). Never a popup, always dismissible.
 */
export function SaveJourneyPrompt() {
  const { state, now } = useGame();
  const { status } = useAccount();
  const { openAccount } = useUi();
  const [memo, setMemo] = useState(readMemo);

  const cooked = Object.values(state.cooked).some((n) => (n ?? 0) > 0);
  const worthKeeping = stampCount(state) >= 3 || cooked;
  const snoozed = memo.count >= MAX_DISMISSALS || now - memo.dismissedAt < SNOOZE_MS;
  if (status !== 'guest' || !worthKeeping || snoozed) return null;

  const later = () => {
    const next = { dismissedAt: Date.now(), count: memo.count + 1 };
    writeMemo(next);
    setMemo(next);
  };

  return (
    <aside className="fj-keep" aria-labelledby="fj-keep-title">
      <CloudArrowUp className="fj-keep__icon" aria-hidden="true" size={26} />
      <div className="fj-keep__copy">
        <p id="fj-keep-title" className="fj-keep__title">
          {m.title}
        </p>
        <p className="fj-keep__body">
          {cooked ? m.hasCookbook : m.hasStamps(stampCount(state))} {m.body}
        </p>
      </div>
      <div className="fj-keep__actions">
        <button type="button" className="fr-cta fr-cta--quiet" onClick={openAccount}>
          {m.save}
        </button>
        <button type="button" className="fr-ghost" onClick={later}>
          {m.later}
        </button>
      </div>
    </aside>
  );
}

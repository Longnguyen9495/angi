import { ArrowLeft, LockSimple } from '@phosphor-icons/react';
import { t } from '../../../i18n';
import { formatUntil, type FarmBan } from '../../../services/account';

const m = t.journey.farmLock;

/**
 * Shown instead of the farm while a fair-play lock is in force (server/lib/FairPlay.php):
 * until when, and why. The reel and the dish stories stay open.
 */
export function FarmLock({ ban, onBack }: { ban: FarmBan; onBack: () => void }) {
  const until = formatUntil(ban.until);
  return (
    <div className="fg fg-lock" role="alert">
      <div className="fg-lock__card">
        <span className="fg-lock__icon" aria-hidden="true">
          <LockSimple size={30} weight="duotone" />
        </span>
        <h2 className="fg-lock__title">{m.title}</h2>
        <p>{ban.reason === 'admin' ? m.admin(until) : m.auto(until)}</p>
        <p className="fg-lock__help">{m.help}</p>
        <button type="button" className="fg-lock__back" onClick={onBack} data-autofocus>
          <ArrowLeft size={16} weight="bold" aria-hidden="true" />
          {m.back}
        </button>
      </div>
    </div>
  );
}

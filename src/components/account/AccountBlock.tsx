import { CloudArrowUp, DownloadSimple, SignOut, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { formatTime, t } from '../../i18n';
import { accountApi, maskEmail } from '../../services/account';
import { useAccount, useFeedback, useUi } from '../../state/hooks';

function syncText(sync: string, at: number | null): string {
  const m = t.account.block.sync;
  if (sync === 'saving') return m.saving;
  if (sync === 'offline') return m.offline;
  if (at) return m.syncedAt(formatTime(at));
  return m.connected;
}

/** Profile block: the account's data and every control over it, in one place. */
export function AccountBlock() {
  const account = useAccount();
  const { openAccount } = useUi();
  const { toast } = useFeedback();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const m = t.account.block;

  if (account.status !== 'signed-in' || !account.user) {
    return (
      <section className="profile__block" aria-labelledby="pf-account">
        <h3 id="pf-account" className="profile__heading">
          {m.heading}
        </h3>
        <p className="empty-note">{m.guestNote}</p>
        <div className="profile__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={openAccount}>
            <CloudArrowUp aria-hidden="true" size={18} />
            {m.saveWithEmail}
          </button>
        </div>
      </section>
    );
  }

  const downloadServerCopy = async () => {
    try {
      const data = await accountApi.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'an-gi-du-lieu-tai-khoan.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast({ message: m.downloadFailed, tone: 'error' });
    }
  };

  return (
    <section className="profile__block" aria-labelledby="pf-account">
      <h3 id="pf-account" className="profile__heading">
        {m.heading}
      </h3>
      <p className="profile__stats">
        <strong>{maskEmail(account.user.email)}</strong> ·{' '}
        {syncText(account.sync, account.lastSyncAt)}
      </p>
      <label className="switch">
        <input
          type="checkbox"
          role="switch"
          className="switch__input"
          checked={account.user.marketing}
          onChange={(e) =>
            void account
              .setMarketing(e.target.checked)
              .catch(() => toast({ message: m.marketingFailed, tone: 'error' }))
          }
        />
        <span className="switch__track" aria-hidden="true">
          <span className="switch__thumb" />
        </span>
        <span className="switch__label">{m.marketing}</span>
      </label>
      <p className="empty-note">{m.serverNote}</p>
      <div className="profile__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={downloadServerCopy}>
          <DownloadSimple aria-hidden="true" size={18} />
          {m.download}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            void account.logout();
            toast({ message: m.loggedOut, tone: 'info' });
          }}
        >
          <SignOut aria-hidden="true" size={18} />
          {m.logout}
        </button>
        {confirmDelete ? (
          <span className="profile__confirm" role="group" aria-label={m.confirmDeleteLabel}>
            <button
              type="button"
              className="btn btn--danger btn--sm"
              aria-busy={busy || undefined}
              onClick={async () => {
                setBusy(true);
                try {
                  await account.deleteAccount();
                  toast({ message: m.deleted, tone: 'info' });
                } catch {
                  toast({ message: m.deleteFailed, tone: 'error' });
                } finally {
                  setBusy(false);
                  setConfirmDelete(false);
                }
              }}
            >
              {m.deleteForever}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setConfirmDelete(false)}
            >
              {m.keep}
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash aria-hidden="true" size={18} />
            {m.delete}
          </button>
        )}
      </div>
    </section>
  );
}

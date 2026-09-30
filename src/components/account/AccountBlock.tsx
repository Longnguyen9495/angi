import { CloudArrowUp, DownloadSimple, SignOut, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { accountApi, maskEmail } from '../../services/account';
import { useAccount, useFeedback, useUi } from '../../state/hooks';

function syncText(sync: string, at: number | null): string {
  if (sync === 'saving') return 'Đang lưu…';
  if (sync === 'offline') return 'Chưa kết nối được — sẽ thử lại khi có thay đổi.';
  if (at) {
    const t = new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `Đã đồng bộ lúc ${t}`;
  }
  return 'Đã kết nối';
}

/** Profile block: the account's data and every control over it, in one place. */
export function AccountBlock() {
  const account = useAccount();
  const { openAccount } = useUi();
  const { toast } = useFeedback();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  if (account.status !== 'signed-in' || !account.user) {
    return (
      <section className="profile__block" aria-labelledby="pf-account">
        <h3 id="pf-account" className="profile__heading">
          Tài khoản
        </h3>
        <p className="empty-note">
          Tiến trình chỉ nằm trên máy này. Lưu bằng email để không mất khi đổi máy — không cần mật
          khẩu, tên hay số điện thoại.
        </p>
        <div className="profile__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={openAccount}>
            <CloudArrowUp aria-hidden="true" size={18} />
            Lưu hành trình bằng email
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
      a.download = 'bep-viet-du-lieu-tai-khoan.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast({ message: 'Chưa tải được dữ liệu, bạn thử lại nhé.', tone: 'warning' });
    }
  };

  return (
    <section className="profile__block" aria-labelledby="pf-account">
      <h3 id="pf-account" className="profile__heading">
        Tài khoản
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
              .catch(() => toast({ message: 'Chưa lưu được lựa chọn.', tone: 'warning' }))
          }
        />
        <span className="switch__track" aria-hidden="true">
          <span className="switch__thumb" />
        </span>
        <span className="switch__label">Nhận tin ưu đãi qua email</span>
      </label>
      <p className="empty-note">
        Máy chủ chỉ giữ email và tiến trình trò chơi. Ảnh check-in không bao giờ được tải lên.
      </p>
      <div className="profile__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={downloadServerCopy}>
          <DownloadSimple aria-hidden="true" size={18} />
          Tải dữ liệu trên máy chủ
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            void account.logout();
            toast({ message: 'Đã đăng xuất. Tiến trình vẫn còn trên máy này.', tone: 'info' });
          }}
        >
          <SignOut aria-hidden="true" size={18} />
          Đăng xuất
        </button>
        {confirmDelete ? (
          <span className="profile__confirm" role="group" aria-label="Xác nhận xoá tài khoản">
            <button
              type="button"
              className="btn btn--danger btn--sm"
              aria-busy={busy || undefined}
              onClick={async () => {
                setBusy(true);
                try {
                  await account.deleteAccount();
                  toast({
                    message: 'Đã xoá tài khoản và mọi dữ liệu trên máy chủ.',
                    tone: 'info',
                  });
                } catch {
                  toast({ message: 'Chưa xoá được, bạn thử lại nhé.', tone: 'warning' });
                } finally {
                  setBusy(false);
                  setConfirmDelete(false);
                }
              }}
            >
              Xoá vĩnh viễn
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setConfirmDelete(false)}
            >
              Giữ lại
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash aria-hidden="true" size={18} />
            Xoá tài khoản
          </button>
        )}
      </div>
    </section>
  );
}

import { DownloadSimple, Eye, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { getDish } from '../../data/dishes';
import type { MotionPref } from '../../domain/progress';
import { exportProgress } from '../../domain/persistence';
import { level, stampCount } from '../../domain/selectors';
import { clearPhotos } from '../../services/photoStore';
import { useAccount, useFeedback, useGame } from '../../state/hooks';
import { AccountBlock } from '../account/AccountBlock';
import { ProgressBar } from '../ui/ProgressBar';
import { Sheet } from '../ui/Sheet';
import { currentTime } from '../../domain/time';

const MOTION_OPTIONS: { id: MotionPref; label: string; hint: string }[] = [
  {
    id: 'system',
    label: 'Theo thiết bị',
    hint: 'Dùng cài đặt “giảm chuyển động” của hệ điều hành',
  },
  { id: 'reduce', label: 'Giảm chuyển động', hint: 'Không bay, không nảy, không hạt đất' },
  { id: 'full', label: 'Đầy đủ', hint: 'Hiệu ứng ngắn, luôn bỏ qua được' },
];

const OUTCOME_TEXT = { ate: 'Đã ăn', swapped: 'Đổi món', skipped: 'Bỏ bữa' } as const;

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
    a.download = 'hanh-trinh-bep-viet.json';
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
      title="Hồ sơ khách"
      description={
        signedIn
          ? 'Tiến trình được lưu trên máy này và trong tài khoản của bạn.'
          : 'Tiến trình được lưu trên thiết bị này. Chưa cần tài khoản.'
      }
    >
      <div className="profile">
        <section className="profile__block" aria-labelledby="pf-level">
          <h3 id="pf-level" className="profile__heading">
            Cấp {lv.level}
          </h3>
          <ProgressBar
            label="Kinh nghiệm"
            value={lv.into}
            max={lv.span}
            valueText={`${lv.into}/${lv.span} XP`}
            size="sm"
          />
          <p className="profile__stats">
            Chuỗi mềm <strong>{state.streak.count} ngày</strong> · {state.streak.restPasses} vé nghỉ
            tuần này · {stampCount(state)} dấu hành trình
          </p>
          <p className="empty-note">
            Bỏ một ngày chỉ lùi một mốc (3 · 5 · 7 ngày), không bao giờ về 0.
          </p>
        </section>

        <AccountBlock />

        <fieldset className="profile__block option-group">
          <legend className="profile__heading">Chuyển động</legend>
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
          <p className="empty-note">
            Đang áp dụng: {reduced ? 'giảm chuyển động' : 'chuyển động đầy đủ'}.
          </p>
        </fieldset>

        <section className="profile__block" aria-labelledby="pf-history">
          <h3 id="pf-history" className="profile__heading">
            Lịch sử bữa ăn
          </h3>
          {state.history.length === 0 ? (
            <p className="empty-note">Chưa có check-in nào.</p>
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
            Món đã ẩn
          </h3>
          {state.hiddenDishIds.length === 0 ? (
            <p className="empty-note">Không có món nào bị ẩn.</p>
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
                    Hiện lại
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="profile__block" aria-labelledby="pf-demo">
          <h3 id="pf-demo" className="profile__heading">
            Chế độ demo
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
            <span className="switch__label">Giả lập lỗi mạng (tìm món và gieo hạt)</span>
          </label>
        </section>

        <section className="profile__block" aria-labelledby="pf-data">
          <h3 id="pf-data" className="profile__heading">
            Dữ liệu của bạn
          </h3>
          <div className="profile__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={download}>
              <DownloadSimple aria-hidden="true" size={18} />
              Tải bản sao (.json)
            </button>
            {confirmReset ? (
              <span className="profile__confirm" role="group" aria-label="Xác nhận xóa tiến trình">
                <span className="profile__confirm-note">
                  {signedIn
                    ? 'Xoá tiến trình, ảnh trên máy này và bản lưu trong tài khoản?'
                    : 'Xoá tiến trình và ảnh trên máy này?'}
                </span>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => {
                    dispatch({ type: 'RESET', now: currentTime() });
                    void clearPhotos().catch(() => undefined);
                    setConfirmReset(false);
                    toast({ message: 'Đã bắt đầu hành trình mới.', tone: 'info' });
                  }}
                >
                  Xóa thật
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setConfirmReset(false)}
                >
                  Giữ lại
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirmReset(true)}
              >
                <Trash aria-hidden="true" size={18} />
                Xóa tiến trình
              </button>
            )}
          </div>
        </section>
      </div>
    </Sheet>
  );
}

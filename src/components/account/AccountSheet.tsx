import { CheckCircle, CloudCheck, DeviceMobile, EnvelopeSimple } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getDish } from '../../data/dishes';
import { AccountError, accountApi, maskEmail } from '../../services/account';
import { useAccount, useFeedback } from '../../state/hooks';
import { Sheet } from '../ui/Sheet';

type Step = 'email' | 'code' | 'done';

const RESEND_AFTER_S = 30;

/**
 * "Lưu hành trình": the only place Bếp Việt asks for personal data, and it
 * asks for one thing — an email — to send a 6-digit code. No password, no name.
 */
export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const account = useAccount();
  const conflict = account.conflict;
  return (
    <Sheet
      open={open || !!conflict}
      onClose={conflict ? () => undefined : onClose}
      title={conflict ? 'Chọn hành trình để giữ' : 'Lưu hành trình'}
      description={
        conflict
          ? 'Máy này và tài khoản của bạn đang có hai hành trình khác nhau.'
          : 'Không cần mật khẩu — chỉ một email để nhận mã.'
      }
      variant="dark"
    >
      {conflict ? <ConflictChoice onDone={onClose} /> : <SignIn onDone={onClose} />}
    </Sheet>
  );
}

function SignIn({ onDone }: { onDone: () => void }) {
  const { signedIn, status, user } = useAccount();
  const { announce } = useFeedback();
  const [step, setStep] = useState<Step>(status === 'signed-in' ? 'done' : 'email');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    if (!consent) {
      setError('Bạn cần đồng ý với cách lưu dữ liệu để tiếp tục.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await accountApi.requestCode(email, true, marketing);
      setEmail(r.email);
      setDevCode(r.devCode ?? null);
      setStep('code');
      setCode('');
      setResendIn(RESEND_AFTER_S);
      announce(`Đã gửi mã tới ${maskEmail(r.email)}.`);
      window.setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      setError(err instanceof AccountError ? err.message : 'Chưa gửi được mã, bạn thử lại nhé.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (busy || value.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const u = await accountApi.verify(email, value);
      await signedIn(u);
      setStep('done');
      announce('Đã đăng nhập. Hành trình của bạn đang được lưu.');
    } catch (err) {
      setError(
        err instanceof AccountError ? err.message : 'Chưa xác nhận được mã, bạn thử lại nhé.',
      );
      setCode('');
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="account account--done">
        <p className="account__lead">
          <CheckCircle aria-hidden="true" size={22} weight="fill" />
          <span>Hành trình đã được lưu{user ? ` với ${maskEmail(user.email)}` : ''}.</span>
        </p>
        <p className="account__note">
          Đăng nhập cùng email trên máy khác để chơi tiếp. Ảnh check-in vẫn chỉ nằm trên máy này.
        </p>
        <button type="button" className="fr-cta" onClick={onDone}>
          Xong
        </button>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <form
        className="account"
        onSubmit={(e) => {
          e.preventDefault();
          void verify();
        }}
      >
        <p className="account__lead">
          <EnvelopeSimple aria-hidden="true" size={20} />
          <span>
            Đã gửi mã 6 số tới <strong>{maskEmail(email)}</strong>. Mã hết hạn sau 10 phút.
          </span>
        </p>
        {devCode && (
          <p className="account__dev" role="note">
            Môi trường thử nghiệm — mã là <strong>{devCode}</strong>
          </p>
        )}
        <label className="account__field">
          <span>Mã đăng nhập</span>
          <input
            ref={codeRef}
            className="account__code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(v);
              if (v.length === 6) void verify(v);
            }}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? 'account-error' : undefined}
          />
        </label>
        {error && (
          <p id="account-error" className="account__error" role="alert">
            {error}
          </p>
        )}
        <div className="account__actions">
          <button
            type="submit"
            className="fr-cta"
            aria-disabled={code.length !== 6 || busy}
            aria-busy={busy || undefined}
          >
            Xác nhận
          </button>
          <button
            type="button"
            className="fr-ghost"
            aria-disabled={resendIn > 0 || busy}
            onClick={() => {
              if (resendIn <= 0) void send();
            }}
          >
            {resendIn > 0 ? `Gửi lại sau ${resendIn}s` : 'Gửi lại mã'}
          </button>
          <button
            type="button"
            className="account__link"
            onClick={() => {
              setStep('email');
              setError(null);
            }}
          >
            Đổi email
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="account" onSubmit={send} noValidate>
      <ul className="account__perks">
        <li>
          <CloudCheck aria-hidden="true" size={18} /> Không mất cấp, hạt giống, sổ bếp khi xoá trình
          duyệt hay đổi máy.
        </li>
        <li>
          <DeviceMobile aria-hidden="true" size={18} /> Chơi tiếp trên điện thoại khác với cùng
          email.
        </li>
      </ul>
      <label className="account__field">
        <span>Email</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ban@example.com"
          required
          data-autofocus
          aria-invalid={!!error || undefined}
          aria-describedby="account-email-note"
        />
      </label>
      <p id="account-email-note" className="account__note">
        Chỉ dùng để gửi mã đăng nhập và lưu hành trình. Không cần tên hay số điện thoại.
      </p>

      <label className="account__check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          Tôi đồng ý để Bếp Việt lưu email và tiến trình trò chơi của tôi để đồng bộ giữa các thiết
          bị (
          <a href="/quyen-rieng-tu.html" target="_blank" rel="noopener">
            cách xử lý dữ liệu
          </a>
          ). Bắt buộc.
        </span>
      </label>
      <label className="account__check">
        <input
          type="checkbox"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
        />
        <span>Gửi tôi tin ưu đãi qua email (không bắt buộc, tắt được bất cứ lúc nào).</span>
      </label>

      {error && (
        <p className="account__error" role="alert">
          {error}
        </p>
      )}
      <div className="account__actions">
        <button
          type="submit"
          className="fr-cta"
          aria-disabled={!email || busy}
          aria-busy={busy || undefined}
        >
          Gửi mã
        </button>
        <button type="button" className="fr-ghost" onClick={onDone}>
          Để sau
        </button>
      </div>
    </form>
  );
}

function ConflictChoice({ onDone }: { onDone: () => void }) {
  const { conflict, resolveConflict } = useAccount();
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  if (!conflict) return null;
  const pick = async (keep: 'local' | 'remote') => {
    setBusy(true);
    await resolveConflict(keep);
    setBusy(false);
    toast({
      message:
        keep === 'local'
          ? 'Đã lưu hành trình trên máy này vào tài khoản.'
          : 'Đã chuyển sang hành trình trong tài khoản.',
      tone: 'success',
    });
    onDone();
  };
  const card = (title: string, s: typeof conflict.local) => (
    <div className="account__side">
      <p className="account__side-title">{title}</p>
      <p>
        Cấp {s.level} · {s.stamps} dấu · {s.cooked} món đã nấu · {s.meals} bữa check-in
      </p>
      {s.lastDishId && <p>Bữa gần nhất: {getDish(s.lastDishId)?.name ?? s.lastDishId}</p>}
    </div>
  );
  return (
    <div className="account">
      <div className="account__compare">
        {card('Trên máy này', conflict.local)}
        {card('Đã lưu trong tài khoản', conflict.remote)}
      </div>
      <p className="account__note">
        Bản không chọn sẽ bị thay thế. Ảnh check-in trên máy này vẫn giữ nguyên.
      </p>
      <div className="account__actions">
        <button type="button" className="fr-cta" disabled={busy} onClick={() => void pick('local')}>
          Giữ bản trên máy này
        </button>
        <button
          type="button"
          className="fr-ghost"
          disabled={busy}
          onClick={() => void pick('remote')}
        >
          Dùng bản đã lưu
        </button>
      </div>
    </div>
  );
}

import { CheckCircle, CloudCheck, DeviceMobile, EnvelopeSimple } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getDish } from '../../data/dishes';
import { BRAND, t } from '../../i18n';
import { AccountError, accountApi, maskEmail } from '../../services/account';
import { useAccount, useFeedback } from '../../state/hooks';
import { Sheet } from '../ui/Sheet';

type Step = 'email' | 'code' | 'done';

const RESEND_AFTER_S = 30;

/**
 * "Lưu nông trại": the only place the app asks for personal data, and it
 * asks for one thing — an email — to send a 6-digit code. No password, no name.
 */
export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const account = useAccount();
  const conflict = account.conflict;
  const m = t.account.sheet;
  return (
    <Sheet
      open={open || !!conflict}
      onClose={conflict ? () => undefined : onClose}
      title={conflict ? m.conflictTitle : m.title}
      description={conflict ? m.conflictDescription : m.description}
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
  const m = t.account.sheet;

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    if (!consent) {
      setError(m.consentRequired);
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
      announce(m.codeSentAnnounce(maskEmail(r.email)));
      window.setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      setError(err instanceof AccountError ? err.message : m.sendFailed);
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
      announce(m.signedInAnnounce);
    } catch (err) {
      setError(err instanceof AccountError ? err.message : m.verifyFailed);
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
          <span>{m.saved(user ? maskEmail(user.email) : null)}</span>
        </p>
        <p className="account__note">{m.savedNote}</p>
        <button type="button" className="fr-cta" onClick={onDone}>
          {m.done}
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
            {m.codeSent.before}
            <strong>{maskEmail(email)}</strong>
            {m.codeSent.after}
          </span>
        </p>
        {devCode && (
          <p className="account__dev" role="note">
            {m.devCode}
            <strong>{devCode}</strong>
          </p>
        )}
        <label className="account__field">
          <span>{m.codeLabel}</span>
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
            {m.confirm}
          </button>
          <button
            type="button"
            className="fr-ghost"
            aria-disabled={resendIn > 0 || busy}
            onClick={() => {
              if (resendIn <= 0) void send();
            }}
          >
            {resendIn > 0 ? m.resendIn(resendIn) : m.resend}
          </button>
          <button
            type="button"
            className="account__link"
            onClick={() => {
              setStep('email');
              setError(null);
            }}
          >
            {m.changeEmail}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="account" onSubmit={send} noValidate>
      <ul className="account__perks">
        <li>
          <CloudCheck aria-hidden="true" size={18} /> {m.perks.keep}
        </li>
        <li>
          <DeviceMobile aria-hidden="true" size={18} /> {m.perks.otherPhone}
        </li>
      </ul>
      <label className="account__field">
        <span>{m.emailLabel}</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={m.emailPlaceholder}
          required
          data-autofocus
          aria-invalid={!!error || undefined}
          aria-describedby="account-email-note"
        />
      </label>
      <p id="account-email-note" className="account__note">
        {m.emailNote}
      </p>

      <label className="account__check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          {m.consent.before(BRAND)}
          <a href={t.common.privacyUrl} target="_blank" rel="noopener">
            {m.consent.link}
          </a>
          {m.consent.after}
        </span>
      </label>
      <label className="account__check">
        <input
          type="checkbox"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
        />
        <span>{m.marketing}</span>
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
          {m.sendCode}
        </button>
        <button type="button" className="fr-ghost" onClick={onDone}>
          {m.later}
        </button>
      </div>
    </form>
  );
}

function ConflictChoice({ onDone }: { onDone: () => void }) {
  const { conflict, resolveConflict } = useAccount();
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const m = t.account.conflict;
  if (!conflict) return null;
  const pick = async (keep: 'local' | 'remote') => {
    setBusy(true);
    await resolveConflict(keep);
    setBusy(false);
    toast({ message: keep === 'local' ? m.keptLocal : m.keptRemote, tone: 'success' });
    onDone();
  };
  const card = (title: string, s: typeof conflict.local) => (
    <div className="account__side">
      <p className="account__side-title">{title}</p>
      <p>{m.summary(s.level, s.stamps, s.cooked, s.meals)}</p>
      {s.lastDishId && <p>{m.lastMeal(getDish(s.lastDishId)?.name ?? s.lastDishId)}</p>}
    </div>
  );
  return (
    <div className="account">
      <div className="account__compare">
        {card(m.local, conflict.local)}
        {card(m.remote, conflict.remote)}
      </div>
      <p className="account__note">{m.note}</p>
      <div className="account__actions">
        <button type="button" className="fr-cta" disabled={busy} onClick={() => void pick('local')}>
          {m.keepLocal}
        </button>
        <button
          type="button"
          className="fr-ghost"
          disabled={busy}
          onClick={() => void pick('remote')}
        >
          {m.useRemote}
        </button>
      </div>
    </div>
  );
}

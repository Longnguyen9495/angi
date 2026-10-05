import { Check, Copy, Coins, SignIn } from '@phosphor-icons/react';
import qrcode from 'qrcode-generator';
import { useEffect, useMemo, useState } from 'react';
import { Sheet } from '../../../components/ui/Sheet';
import { locale, t } from '../../../i18n';
import { AccountError, spinsApi, type SpinOrder, type SpinStatus } from '../../../services/account';
import type { SpinBlock } from '../hooks/useSpinQuota';
import './spin-paywall.css';

const m = t.reel.quota;
/** How often an open order asks whether the transfer arrived. */
const POLL_MS = 5000;

const vnd = (n: number) =>
  `${new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : locale).format(n)}${locale === 'vi' ? 'đ' : ' VND'}`;

const resetText = (seconds: number) => {
  const mins = Math.max(1, Math.ceil(seconds / 60));
  return m.hours(Math.floor(mins / 60), mins % 60);
};

interface SpinPaywallProps {
  status: SpinStatus | null;
  block: SpinBlock;
  onClose: () => void;
  onSignIn: () => void;
  /** Bought spins arrived: refresh the allowance. */
  onPaid: (spins: number) => void;
}

/**
 * Out of spins: when the free ones come back, and (signed in) packs to buy by bank transfer.
 * A pack makes an order whose VietQR code carries the amount and the order's code as the
 * transfer message; the sheet then waits for the server to see the payment (the admin or the
 * bank's webhook confirms it) and adds the spins.
 */
export default function SpinPaywall({
  status,
  block,
  onClose,
  onSignIn,
  onPaid,
}: SpinPaywallProps) {
  const [order, setOrder] = useState<SpinOrder | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // While an order waits, ask now and then whether it was paid.
  useEffect(() => {
    if (!order || order.status !== 'pending') return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      spinsApi
        .orderStatus(order.code)
        .then((o) => {
          setOrder(o);
          if (o.status === 'paid') onPaid(o.spins);
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [order, onPaid]);

  const qrText = order?.qr ?? null;
  const qrSvg = useMemo(() => {
    if (!qrText) return null;
    const qr = qrcode(0, 'M');
    qr.addData(qrText);
    qr.make();
    return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }, [qrText]);

  const buy = async (spins: number) => {
    setBusy(spins);
    setError(null);
    try {
      setOrder(await spinsApi.order(spins));
    } catch (e) {
      setError(e instanceof AccountError && e.status !== 0 ? e.message : m.orderFailed);
    } finally {
      setBusy(null);
    }
  };

  const copy = (key: string, text: string) => {
    void navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(key);
        window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
      })
      .catch(() => undefined);
  };

  const free = status?.freePerDay ?? 0;
  const lead =
    block === 'sign_in' && status?.networkFull
      ? m.networkFull
      : m.lead(free, resetText(status?.resetIn ?? 0));

  const row = (key: string, label: string, value: string, copyable = false) => (
    <div className="sp-row">
      <dt>{label}</dt>
      <dd>
        <span>{value}</span>
        {copyable && (
          <button
            type="button"
            className="sp-copy"
            onClick={() => copy(key, value)}
            aria-label={`${m.copy} ${label}`}
          >
            {copied === key ? <Check size={14} weight="bold" /> : <Copy size={14} />}
            <span>{copied === key ? m.copied : m.copy}</span>
          </button>
        )}
      </dd>
    </div>
  );

  let body;
  if (order && order.status === 'paid') {
    body = (
      <p className="sp-done" role="status">
        <Check size={20} weight="bold" aria-hidden="true" /> {m.paid(order.spins)}
      </p>
    );
  } else if (order && order.status === 'pending') {
    body = (
      <div className="sp-pay">
        <p className="sp-lead">{m.scan}</p>
        {qrSvg && (
          <div
            className="sp-qr"
            role="img"
            aria-label={m.qrLabel(vnd(order.amount), order.code)}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        )}
        <dl className="sp-details">
          {row('bank', m.bank, order.bank.name || order.bank.bin)}
          {row('account', m.account, order.bank.account, true)}
          {row('holder', m.holder, order.bank.holder)}
          {row('amount', m.amount, vnd(order.amount))}
          {row('memo', m.memo, order.code, true)}
        </dl>
        <p className="sp-hint">{m.memoHint}</p>
        <p className="sp-wait" role="status">
          <span className="sp-dot" aria-hidden="true" /> {m.waiting}
        </p>
      </div>
    );
  } else if (block === 'sign_in' || !status?.signedIn) {
    body = <p className="sp-lead">{m.signInLead}</p>;
  } else if (!status.payments) {
    body = <p className="sp-lead">{m.paymentsOff}</p>;
  } else {
    body = (
      <>
        {order?.status === 'expired' && <p className="sp-hint">{m.expired}</p>}
        <h3 className="sp-h3">{m.buyTitle}</h3>
        <p className="sp-hint">{m.perSpin(vnd(status.price))}</p>
        <div className="sp-packs">
          {status.packs.map((n) => (
            <button
              key={n}
              type="button"
              className="sp-pack"
              onClick={() => void buy(n)}
              disabled={busy !== null}
              aria-busy={busy === n}
              data-autofocus={n === status.packs[0] ? true : undefined}
            >
              <Coins size={18} aria-hidden="true" />
              <span className="sp-pack__n">{m.pack(n)}</span>
              <span className="sp-pack__price">{vnd(n * status.price)}</span>
            </button>
          ))}
        </div>
        {error && (
          <p className="sp-error" role="alert">
            {error}
          </p>
        )}
      </>
    );
  }

  const signIn = block === 'sign_in' || !status?.signedIn;
  return (
    <Sheet
      open
      onClose={onClose}
      variant="dark"
      title={order?.status === 'pending' ? m.payTitle(order.spins) : m.title}
      description={order?.status === 'pending' ? undefined : lead}
      footer={
        <>
          {order?.status === 'pending' && (
            <button type="button" className="btn btn--quiet" onClick={() => setOrder(null)}>
              {m.otherPack}
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            {m.later}
          </button>
          {signIn && !order && (
            <button type="button" className="btn btn--primary" onClick={onSignIn} data-autofocus>
              <SignIn size={16} aria-hidden="true" /> {m.signIn}
            </button>
          )}
        </>
      }
    >
      {body}
    </Sheet>
  );
}

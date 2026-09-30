/*
 * Client for the optional guest account (server/lib/Account.php). Every write
 * carries X-Bepviet: 1 — the server refuses writes without it (CSRF guard).
 */

export interface AccountUser {
  email: string;
  marketing: boolean;
  createdAt: number;
}

export interface RemoteProgress {
  data: unknown;
  version: number;
  updatedAt: number | null;
}

export class AccountError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

const BASE = '/api/account';

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (typeof fetch !== 'function') throw new AccountError('Không có kết nối.', 0);
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(method !== 'GET' && { 'X-Bepviet': '1', 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AccountError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại nhé.', 0);
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new AccountError(
      String(data.error ?? 'Có lỗi xảy ra, bạn thử lại nhé.'),
      res.status,
      data,
    );
  }
  return data as T;
}

export const accountApi = {
  requestCode: (email: string, consent: boolean, marketing: boolean) =>
    call<{ sent: true; email: string; expiresIn: number; devCode?: string }>('POST', '/code', {
      email,
      consent,
      marketing,
    }),
  verify: (email: string, code: string) => call<AccountUser>('POST', '/verify', { email, code }),
  me: () => call<{ user: AccountUser | null }>('GET', '/me'),
  getProgress: () => call<RemoteProgress>('GET', '/progress'),
  putProgress: (data: unknown, baseVersion: number) =>
    call<{ version: number; updatedAt: number }>('PUT', '/progress', { data, baseVersion }),
  setMarketing: (marketing: boolean) => call<AccountUser>('PUT', '/preferences', { marketing }),
  exportData: () => call<Record<string, unknown>>('GET', '/export'),
  logout: () => call<{ ok: true }>('POST', '/logout'),
  remove: () => call<{ ok: true }>('DELETE', ''),
};

/** "khach@example.vn" → "kh•••@example.vn" for display. */
export function maskEmail(email: string): string {
  const [name = '', domain = ''] = email.split('@');
  const keep = name.slice(0, Math.min(2, Math.max(1, name.length - 1)));
  return `${keep}${'•'.repeat(Math.max(1, Math.min(4, name.length - keep.length)))}@${domain}`;
}

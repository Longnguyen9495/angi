/*
 * Client for the optional guest account (server/lib/Account.php). Every write
 * carries X-Bepviet: 1 — the server refuses writes without it (CSRF guard).
 * Every request carries X-Locale so server errors and the login email come
 * back in the visitor's language.
 */
import { locale, t } from '../i18n';

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
  if (typeof fetch !== 'function') throw new AccountError(t.account.api.offline, 0);
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'X-Locale': locale,
        ...(method !== 'GET' && { 'X-Bepviet': '1', 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AccountError(t.account.api.unreachable, 0);
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new AccountError(String(data.error ?? t.account.api.generic), res.status, data);
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

// ——— Khu vườn bạn bè (server/lib/Friends.php) ———

export interface GardenProfile {
  code: string;
  name: string;
  displayName: string;
}

export interface FriendSummary {
  code: string;
  name: string;
  xp: number;
  level: number;
  /** Plots ready to harvest / growing plots a visitor could water. */
  ready: number;
  growing: number;
  helpedToday: boolean;
  updatedAt: number | null;
}

export interface FriendsList {
  me: GardenProfile & { xp: number; level: number };
  friends: FriendSummary[];
  helpsLeft: number;
  max: number;
}

export interface FriendPlot {
  id: number;
  crop: string | null;
  plantedAt: number | null;
  readyAt: number | null;
  wateredAt: number | null;
}

export interface FriendGarden {
  code: string;
  name: string;
  xp: number;
  level: number;
  plots: FriendPlot[];
  decor: string[];
  decorLayout: Record<string, { x: number; z: number; rot: number } | null>;
  animals: Record<string, { fedAt: number | null; readyAt: number | null }>;
  updatedAt: number | null;
  helpedToday: boolean;
  helpsLeft: number;
}

export interface RemoteFriendEvent {
  id: string;
  type: 'water' | 'gift' | 'helped';
  plotId: number | null;
  crop: string | null;
  from: string;
  at: number;
}

export const friendsApi = {
  profile: () => call<GardenProfile>('GET', '/garden'),
  rename: (name: string) => call<GardenProfile>('PUT', '/garden', { name }),
  list: () => call<FriendsList>('GET', '/friends'),
  add: (code: string) => call<FriendsList>('POST', '/friends', { code }),
  remove: (code: string) => call<FriendsList>('DELETE', `/friends/${encodeURIComponent(code)}`),
  visit: (code: string) => call<FriendGarden>('GET', `/friends/${encodeURIComponent(code)}/garden`),
  water: (code: string, plotId: number) =>
    call<FriendGarden & { ok: true }>('POST', `/friends/${encodeURIComponent(code)}/water`, {
      plotId,
    }),
  events: () => call<{ events: RemoteFriendEvent[] }>('GET', '/events'),
  ack: (ids: string[]) => call<{ ok: true }>('POST', '/events/ack', { ids }),
};

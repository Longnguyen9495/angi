import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { mockConfig } from '../../services/mockApi';
import { FeedbackProvider } from '../../state/FeedbackProvider';
import { GameProvider } from '../../state/GameProvider';
import { reelBootConfig } from '../../features/food-reel/hooks/useAssetPreloader';

const realFetch = globalThis.fetch;

/** A tiny in-memory stand-in for server/api /account/*. */
function fakeServer() {
  const calls: { method: string; path: string; body: unknown; headers: Record<string, string> }[] =
    [];
  let user: { email: string; marketing: boolean; createdAt: number } | null = null;
  let progress: { data: unknown; version: number } = { data: null, version: 0 };
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const path = url.replace(/^.*\/api\/account/, '');
    calls.push({ method, path, body, headers });
    if (!url.includes('/api/account')) return json({ error: 'nope' }, 404);
    if (method !== 'GET' && headers['X-Bepviet'] !== '1') return json({ error: 'csrf' }, 403);
    if (method === 'GET' && path === '/me') return json({ user });
    if (method === 'POST' && path === '/code') {
      if (body.consent !== true) return json({ error: 'consent' }, 422);
      return json({ sent: true, email: body.email, expiresIn: 600, devCode: '246810' });
    }
    if (method === 'POST' && path === '/verify') {
      if (body.code !== '246810') return json({ error: 'Mã chưa đúng, bạn còn 4 lần thử.' }, 422);
      user = { email: body.email, marketing: false, createdAt: 1 };
      return json(user);
    }
    if (method === 'GET' && path === '/progress') return json({ ...progress, updatedAt: null });
    if (method === 'PUT' && path === '/progress') {
      if (body.baseVersion !== progress.version) return json({ version: progress.version }, 409);
      progress = { data: body.data, version: progress.version + 1 };
      return json({ version: progress.version, updatedAt: 2 });
    }
    return json({ error: 'not found' }, 404);
  });
  return { fetchMock, calls, progress: () => progress };
}

beforeEach(() => {
  reelBootConfig.timeoutMs = 20;
  mockConfig.commandLatencyMs = 0;
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('Lưu nông trại (optional account)', () => {
  it('asks only for an email plus consent, signs in with the code and saves the journey', async () => {
    const server = fakeServer();
    globalThis.fetch = server.fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();
    render(
      <GameProvider>
        <FeedbackProvider>
          <App />
        </FeedbackProvider>
      </GameProvider>,
    );
    await screen.findByRole('button', { name: /quay món/i }, { timeout: 2000 });
    await user.click(screen.getByRole('button', { name: /hồ sơ/i }));
    const profile = await screen.findByRole('dialog', { name: /hồ sơ khách/i });
    await user.click(within(profile).getByRole('button', { name: /lưu nông trại bằng email/i }));

    const sheet = await screen.findByRole('dialog', { name: 'Lưu nông trại' });
    // One field, no name or phone.
    expect(within(sheet).getAllByRole('textbox')).toHaveLength(1);
    const consent = within(sheet).getByRole('checkbox', { name: /tôi đồng ý/i });
    const marketing = within(sheet).getByRole('checkbox', { name: /tin ưu đãi/i });
    expect(consent).not.toBeChecked();
    expect(marketing).not.toBeChecked();

    await user.type(within(sheet).getByRole('textbox', { name: /email/i }), 'khach@example.vn');
    await user.click(within(sheet).getByRole('button', { name: 'Gửi mã' }));
    expect(within(sheet).getByRole('alert')).toHaveTextContent(/cần đồng ý/i);
    expect(server.calls.some((c) => c.path === '/code')).toBe(false);

    await user.click(consent);
    await user.click(within(sheet).getByRole('button', { name: 'Gửi mã' }));
    const codeBox = await within(sheet).findByRole('textbox', { name: /mã đăng nhập/i });
    expect(within(sheet).getByText(/kh•••@example\.vn/)).toBeInTheDocument();
    const sent = server.calls.find((c) => c.path === '/code')!;
    expect(sent.body).toEqual({ email: 'khach@example.vn', consent: true, marketing: false });
    expect(sent.headers['X-Bepviet']).toBe('1');
    expect(sent.headers['X-Locale']).toBe('vi');

    await user.type(codeBox, '111111');
    expect(await within(sheet).findByRole('alert')).toHaveTextContent(/mã chưa đúng/i);
    await user.type(codeBox, '246810');
    expect(await within(sheet).findByText(/nông trại đã được lưu/i)).toBeInTheDocument();

    // An empty account receives this device's journey right away.
    await waitFor(() => expect(server.progress().version).toBe(1));
    expect((server.progress().data as { guestId: string }).guestId).toBeTruthy();
  });
});

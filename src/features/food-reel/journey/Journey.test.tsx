import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../../App';
import { STORAGE_KEY } from '../../../domain/persistence';
import { mockConfig } from '../../../services/mockApi';
import { FeedbackProvider } from '../../../state/FeedbackProvider';
import { GameProvider } from '../../../state/GameProvider';
import { reelBootConfig } from '../hooks/useAssetPreloader';

const realMatchMedia = window.matchMedia;

function mockMedia(reduced: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

function renderApp() {
  return render(
    <GameProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </GameProvider>,
  );
}

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').data;

beforeEach(() => {
  mockMedia(true);
  reelBootConfig.timeoutMs = 20;
  mockConfig.commandLatencyMs = 0;
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  window.matchMedia = realMatchMedia;
  window.history.replaceState(null, '', '/');
});

/** Deep-links to a dish story and confirms it, landing on the epilogue. */
async function chooseDish(user: ReturnType<typeof userEvent.setup>, slug = 'com-tam') {
  window.history.replaceState(null, '', `/mon/${slug}`);
  const view = renderApp();
  const story = await screen.findByRole('dialog', {}, { timeout: 2000 });
  await user.click(within(story).getByRole('button', { name: /chốt món này/i }));
  await screen.findByText(/đã chốt cho/i);
  return view;
}

async function openJourney(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^hành trình/i }));
  const layer = await screen.findByRole('dialog', { name: /hành trình của bạn/i });
  await within(layer).findByRole('heading', { name: 'Khu vườn' }, { timeout: 3000 });
  return layer;
}

describe('Journey layer', () => {
  it('is always reachable from the reel header and shows the accumulated numbers', async () => {
    const user = userEvent.setup();
    renderApp();
    const entry = await screen.findByRole('button', { name: /^hành trình/i }, { timeout: 2000 });
    expect(entry).toHaveTextContent(/cấp 1 · 2 ngày/i);
    const layer = await openJourney(user);
    expect(window.location.pathname).toBe('/journey');
    for (const label of ['Cấp độ', 'Chuỗi ngày', 'Dấu hành trình', 'Món đã khám phá']) {
      expect(within(layer).getByText(label)).toBeInTheDocument();
    }
    expect(within(layer).getByText('/128')).toBeInTheDocument();
    for (const title of [
      'Bữa này',
      'Khu vườn',
      'Công thức',
      'Bản đồ ẩm thực',
      'Nhiệm vụ & nhật ký',
    ]) {
      expect(within(layer).getByRole('heading', { name: title })).toBeInTheDocument();
    }
    // The old filter-based chooser is gone for good.
    expect(within(layer).queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /chọn món ngay/i })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('asks a guest without a meal to spin first', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole('button', { name: /quay món/i }, { timeout: 2000 });
    const layer = await openJourney(user);
    expect(within(layer).getByText(/chưa chốt món cho/i)).toBeInTheDocument();
    await user.click(within(layer).getByRole('button', { name: /quay món/i }));
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });
});

describe('seed reward loop', () => {
  it('plants the meal seed exactly once, even on rapid taps, without particles in reduced motion', async () => {
    const user = userEvent.setup();
    await chooseDish(user);
    const plant = screen.getByRole('button', { name: /gieo ngay/i });
    await user.tripleClick(plant);
    expect(await screen.findByText(/cô ba bếp/i)).toBeInTheDocument();
    expect(document.querySelectorAll('.soil-particle, .fly-ghost')).toHaveLength(0);
    const data = stored();
    expect(data.ledger.filter((e: { key: string }) => e.key.startsWith('plant:'))).toHaveLength(1);
    expect(data.plots.filter((p: { sourceDishId: string | null }) => p.sourceDishId)).toHaveLength(
      1,
    );
    expect(screen.queryByRole('button', { name: /gieo ngay/i })).not.toBeInTheDocument();
  });

  it('keeps the seed and offers a retry when planting fails', async () => {
    const user = userEvent.setup();
    await chooseDish(user);
    await user.click(screen.getByRole('button', { name: /hồ sơ và cài đặt/i }));
    await user.click(await screen.findByRole('switch', { name: /giả lập lỗi mạng/i }));
    await user.click(screen.getByRole('button', { name: /^đóng$/i }));
    await user.click(screen.getByRole('button', { name: /gieo ngay/i }));
    expect(await screen.findByText(/hạt vẫn nằm trong khay\. bạn thử lại/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thử gieo lại/i })).toBeInTheDocument();
    expect(stored().meal.planted).toBe(false);
  });

  it('checks in from the Journey, ripens the crop and harvests it', async () => {
    const user = userEvent.setup();
    await chooseDish(user);
    await user.click(screen.getByRole('button', { name: /gieo ngay/i }));
    await screen.findByText(/cô ba bếp/i);
    const xpBefore = stored().xp;

    const layer = await openJourney(user);
    expect(within(layer).getByText('Đã gieo hạt')).toBeInTheDocument();
    await user.click(within(layer).getByRole('button', { name: /check-in bữa này/i }));
    const sheet = await screen.findByRole('dialog', { name: /check-in sau bữa/i });
    await user.click(within(sheet).getByRole('radio', { name: /^đã ăn/i }));
    await user.click(within(sheet).getByRole('button', { name: /tiếp/i }));
    await user.click(within(sheet).getByRole('radio', { name: /rất ngon/i }));
    await user.click(within(sheet).getByRole('button', { name: /tiếp/i }));
    await user.click(within(sheet).getByRole('radio', { name: /có, gợi ý lại/i }));
    await user.click(within(sheet).getByRole('button', { name: /hoàn tất/i }));
    expect(await within(sheet).findByText(/sẵn sàng thu hoạch/i)).toBeInTheDocument();
    expect(within(sheet).getByText(/mở vùng mới: trung bộ/i)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /check-in/i })).toBeNull());

    const data = stored();
    expect(data.xp).toBeGreaterThan(xpBefore);
    expect(data.meal.checkedIn).toBe(true);
    expect(within(layer).getByText(/^đã check-in · đã ăn$/i)).toBeInTheDocument();

    // Onboarding herb plot + the meal's plot are both ready now.
    await user.click(within(layer).getByRole('button', { name: /thu hoạch tất cả \(2\)/i }));
    const after = stored();
    expect(after.ingredients.herbs + after.ingredients.rice).toBe(2);
    expect(within(layer).getByText(/kho nguyên liệu/i)).toBeInTheDocument();
    expect(within(layer).getByText('Mới mở!')).toBeInTheDocument();
  });

  it('plants from the seed tray into a chosen empty plot', async () => {
    const user = userEvent.setup();
    await chooseDish(user, 'bun-moc');
    const layer = await openJourney(user);
    const plot = within(layer).getByRole('button', { name: /ô 3, trống\. gieo/i });
    await user.click(plot);
    const data = stored();
    expect(data.plots[2].crop).toBeTruthy();
    expect(data.meal.planted).toBe(true);
    expect(within(layer).queryByText(/khay trống/i)).toBeInTheDocument();
  });

  it('restores the journey after a reload and opens discovered dishes from the atlas', async () => {
    const user = userEvent.setup();
    const first = await chooseDish(user, 'bun-moc');
    await user.click(screen.getByRole('button', { name: /gieo ngay/i }));
    await screen.findByText(/cô ba bếp/i);
    first.unmount();

    window.history.replaceState(null, '', '/journey');
    renderApp();
    const layer = await screen.findByRole(
      'dialog',
      { name: /hành trình của bạn/i },
      { timeout: 2000 },
    );
    await within(layer).findByRole('heading', { name: 'Khu vườn' }, { timeout: 3000 });
    expect(within(layer).getByText('Bún mọc')).toBeInTheDocument();
    expect(within(layer).getByText('Đã gieo hạt')).toBeInTheDocument();

    await user.click(within(layer).getByRole('button', { name: /xem câu chuyện bún mọc/i }));
    await waitFor(() => expect(window.location.pathname).toBe('/mon/bun-moc'));
    expect(
      await screen.findByRole('dialog', { name: 'Bún mọc' }, { timeout: 2000 }),
    ).toBeInTheDocument();
  });
});

describe('dialog behaviour', () => {
  it('profile sheet closes on Escape and returns focus to the opener', async () => {
    const user = userEvent.setup();
    renderApp();
    const opener = await screen.findByRole(
      'button',
      { name: /hồ sơ và cài đặt/i },
      { timeout: 2000 },
    );
    await user.click(opener);
    expect(await screen.findByRole('dialog', { name: /hồ sơ khách/i })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it('reduced-motion toggle in the profile applies app-wide', async () => {
    mockMedia(false);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: /hồ sơ và cài đặt/i }, { timeout: 2000 }),
    );
    await user.click(await screen.findByRole('radio', { name: /^giảm chuyển động/i }));
    expect(document.documentElement.dataset.motion).toBe('reduced');
    vi.restoreAllMocks();
  });
});

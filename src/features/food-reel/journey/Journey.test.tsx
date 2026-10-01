import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../../App';
import { STORAGE_KEY, saveProgress } from '../../../domain/persistence';
import { EMPTY_PRODUCE, createInitialProgress } from '../../../domain/progress';
import { mockConfig } from '../../../services/mockApi';
import { FeedbackProvider } from '../../../state/FeedbackProvider';
import { GameProvider } from '../../../state/GameProvider';
import { reelBootConfig } from '../hooks/useAssetPreloader';
import { reelCount } from '../data/reelCatalogue';

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
  await user.click(screen.getByRole('button', { name: /^nông trại/i }));
  const layer = await screen.findByRole('dialog', { name: /nông trại của bạn/i });
  await within(layer).findByRole('heading', { name: 'Khu vườn' }, { timeout: 3000 });
  return layer;
}

type User = ReturnType<typeof userEvent.setup>;

/** Opens a farm area from the game's dock (or its "Thêm" menu) and returns the panel. */
async function openPanel(user: User, layer: HTMLElement, name: string) {
  const dock = within(layer).getByRole('navigation', { name: /các khu trong nông trại/i });
  const inDock = within(dock).queryByRole('button', { name });
  if (inDock) await user.click(inDock);
  else {
    await user.click(within(layer).getByRole('button', { name: 'Thêm' }));
    await user.click(within(layer).getByRole('button', { name }));
  }
  return within(layer).findByRole('region', { name: new RegExp(name, 'i') });
}

/** Closes the open panel; the farm stays open. */
async function closePanel(user: User, layer: HTMLElement) {
  await user.keyboard('{Escape}');
  await waitFor(() => expect(layer.querySelector('.fg-panel')).toBeNull());
}

describe('Journey layer', () => {
  it('is always reachable from the reel header and shows the accumulated numbers', async () => {
    const user = userEvent.setup();
    renderApp();
    const entry = await screen.findByRole('button', { name: /^nông trại/i }, { timeout: 2000 });
    expect(entry).toHaveTextContent(/cấp 1 · 2 ngày/i);
    const layer = await openJourney(user);
    expect(window.location.pathname).toBe('/journey');
    // The farm is only the game: no page sections, every area sits behind the dock.
    expect(within(layer).queryByRole('heading', { name: 'Công thức' })).not.toBeInTheDocument();
    const dock = within(layer).getByRole('navigation', { name: /các khu trong nông trại/i });
    for (const area of ['Bữa này', 'Kho', 'Bếp', 'Đơn', 'Chợ']) {
      expect(within(dock).getByRole('button', { name: area })).toBeInTheDocument();
    }

    // The level chip opens the numbers.
    await user.click(within(layer).getByRole('button', { name: /cấp 1, .*xem thống kê/i }));
    const stats = await within(layer).findByRole('region', { name: /thống kê nông trại/i });
    for (const label of ['Cấp độ', 'Chuỗi ngày', 'Con dấu', 'Món đã khám phá']) {
      expect(within(stats).getByText(label)).toBeInTheDocument();
    }
    expect(within(stats).getByText(`/${reelCount()}`)).toBeInTheDocument();
    await closePanel(user, layer);

    for (const [area, title] of [
      ['Bữa này', 'Bữa này'],
      ['Bếp', 'Bếp'],
      ['Bản đồ', 'Bản đồ ẩm thực'],
      ['Nhiệm vụ', 'Nhiệm vụ & nhật ký'],
    ] as const) {
      await openPanel(user, layer, area);
      expect(within(layer).getByRole('heading', { name: title })).toBeInTheDocument();
      await closePanel(user, layer);
    }
    // The old filter-based chooser is gone for good.
    expect(within(layer).queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /chọn món ngay/i })).not.toBeInTheDocument();
    // With nothing open on the farm, Escape leaves it.
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('asks a guest without a meal to spin first', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole('button', { name: /quay món/i }, { timeout: 2000 });
    const layer = await openJourney(user);
    await openPanel(user, layer, 'Bữa này');
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
    await openPanel(user, layer, 'Bữa này');
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
    // The sheet closed on Escape; the panel is still open over the farm.
    await closePanel(user, layer);
    expect(screen.getByRole('dialog', { name: /nông trại của bạn/i })).toBeInTheDocument();

    // Onboarding herb plot + the meal's plot are both ready now.
    await user.click(within(layer).getByRole('button', { name: /thu hoạch tất cả \(2\)/i }));
    const after = stored();
    expect(after.ingredients.herbs + after.ingredients.rice).toBe(2);
    const storage = await openPanel(user, layer, 'Kho');
    expect(within(storage).getByText(/kho nguyên liệu/i)).toBeInTheDocument();
    await closePanel(user, layer);
    const atlas = await openPanel(user, layer, 'Bản đồ');
    expect(within(atlas).getByText('Mới mở!')).toBeInTheDocument();
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
    const storage = await openPanel(user, layer, 'Kho');
    expect(within(storage).queryByText(/khay trống/i)).toBeInTheDocument();
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
      { name: /nông trại của bạn/i },
      { timeout: 2000 },
    );
    await within(layer).findByRole('heading', { name: 'Khu vườn' }, { timeout: 3000 });
    await openPanel(user, layer, 'Bữa này');
    expect(within(layer).getByText('Bún mọc')).toBeInTheDocument();
    expect(within(layer).getByText('Đã gieo hạt')).toBeInTheDocument();
    await closePanel(user, layer);

    await openPanel(user, layer, 'Bản đồ');
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

describe('watering the garden', () => {
  it('waters a growing plot once, then the soil stays wet until the next hour', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole('button', { name: /quay món/i }, { timeout: 2000 });
    const layer = await openJourney(user);
    const can = within(layer).getByRole('button', { name: /tưới cây, còn 3 lượt/i });
    await user.click(can);
    expect(can).toHaveAttribute('aria-pressed', 'true');
    // New guests have one sprouting scallion (plot 2); the ready herbs cannot be watered.
    expect(within(layer).queryByRole('button', { name: /tưới ô 1/i })).not.toBeInTheDocument();
    const before = stored().plots[1].readyAt;
    await user.click(within(layer).getByRole('button', { name: /tưới ô 2/i }));
    const after = stored();
    expect(after.plots[1].readyAt).toBeLessThan(before);
    expect(after.water.used).toBe(1);

    // A second tap is refused: the soil is still wet.
    const again = within(layer).getByRole('button', { name: /tưới ô 2.*đất còn ẩm/i });
    expect(again).toHaveAttribute('aria-disabled', 'true');
    await user.click(again);
    expect(stored().water.used).toBe(1);
    // With nothing else thirsty the can can still be put away.
    await user.click(within(layer).getByRole('button', { name: /cất bình/i }));
    expect(within(layer).queryByRole('button', { name: /tưới ô/i })).not.toBeInTheDocument();
  });
});

describe('after the harvest', () => {
  it('suggests the next step and can spin the reel over dishes that grant the missing seed', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole('button', { name: /quay món/i }, { timeout: 2000 });
    const layer = await openJourney(user);
    // New guests have one herb plot ready: the card asks to harvest it first.
    const card = within(layer).getByRole('region', { name: /ô đã chín/i });
    await user.click(within(card).getByRole('button', { name: 'Thu hoạch' }));
    expect(stored().ingredients.herbs).toBe(1);

    // Nothing ready, tray empty, plots free → find the seed the closest recipe needs.
    const find = await within(layer).findByRole('button', { name: /quay các món cho/i });
    await user.click(find);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await screen.findByRole('button', { name: /khám phá món này/i }, { timeout: 3000 });
    expect(document.querySelector('.fr-headline__sub')).toHaveTextContent(/món cho (hạt|củ)/i);
  });
});

describe('the kitchen', () => {
  it('cooks from the next-step card, commits once and fills the cookbook page', async () => {
    const user = userEvent.setup();
    const now = Date.now();
    const base = createInitialProgress(now);
    saveProgress(
      {
        ...base,
        plots: base.plots.map((p) => ({ ...p, crop: null, plantedAt: null, readyAt: null })),
        ingredients: { ...EMPTY_PRODUCE, rice: 1, scallion: 1 },
      },
      now,
    );
    renderApp();
    await screen.findByRole('button', { name: /quay món/i }, { timeout: 2000 });
    const layer = await openJourney(user);
    const card = within(layer).getByRole('region', { name: /đủ nguyên liệu nấu cơm tấm sườn/i });
    await user.click(within(card).getByRole('button', { name: 'Nấu Cơm tấm sườn' }));
    const sheet = await screen.findByRole('dialog', { name: 'Cơm tấm sườn' });
    const start = within(sheet).getByRole('button', { name: /bắt đầu nấu/i });
    await user.click(start);
    await user.click(start);
    expect(within(sheet).getByRole('list', { name: 'Các bước nấu' })).toBeInTheDocument();
    expect(within(sheet).getByText('Bước 1/4')).toBeInTheDocument();
    // Jump the kitchen clock past the whole cooking timeline.
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 60_000);
    expect(await within(sheet).findByText(/đã nấu xong/i)).toBeInTheDocument();
    clock.mockRestore();
    const data = stored();
    expect(data.cooked['com-tam']).toBe(1);
    expect(data.ingredients.rice).toBe(0);

    await user.click(within(sheet).getByRole('button', { name: /xem sổ bếp/i }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Cơm tấm sườn' })).not.toBeInTheDocument(),
    );
    expect(within(layer).getByRole('heading', { name: 'Sổ bếp · 1/14 trang' })).toBeInTheDocument();
    expect(document.querySelector('.fj-page.is-cooked .fj-page__name')).toHaveTextContent(
      'Cơm tấm sườn',
    );
  });
});

describe('after choosing', () => {
  it('offers map and delivery searches for the chosen dish, remembering the ShopeeFood city', async () => {
    const user = userEvent.setup();
    await chooseDish(user, 'com-tam');
    const box = screen.getByRole('region', { name: /tìm quán & đặt món · cơm tấm/i });
    const links = within(box).getAllByRole('link');
    expect(links).toHaveLength(4);
    for (const a of links) {
      expect(a).toHaveAttribute('target', '_blank');
      expect(a.getAttribute('href')).toMatch(/C%C6%A1m\+t%E1%BA%A5m|C%C6%A1m%20t%E1%BA%A5m/);
    }
    await user.selectOptions(within(box).getByRole('combobox'), 'ha-noi');
    expect(
      within(box)
        .getByRole('link', { name: /shopeefood/i })
        .getAttribute('href'),
    ).toContain('shopeefood.vn/ha-noi/');
    expect(JSON.parse(localStorage.getItem('hanh-trinh-bep-viet/reel')!).orderCity).toBe('ha-noi');
  });
});

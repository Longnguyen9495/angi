import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { STORAGE_KEY } from '../../domain/persistence';
import { mockConfig } from '../../services/mockApi';
import { FeedbackProvider } from '../../state/FeedbackProvider';
import { GameProvider } from '../../state/GameProvider';
import { dishAt, getReelDish, getReelDishBySlug, reelCount } from './data/reelCatalogue';
import { reelBootConfig } from './hooks/useAssetPreloader';

const realMatchMedia = window.matchMedia;

/** Reduced motion swaps reel physics for instant jumps, so tests stay fast. */
function mockMedia({ reduced }: { reduced: boolean }) {
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

/** Accessible text of a split-line heading (the visible lines are aria-hidden). */
function headingName(el: HTMLElement): string {
  return el.querySelector('.sr-only')?.textContent ?? el.textContent ?? '';
}

async function booted() {
  return screen.findByRole('button', { name: /quay món/i }, { timeout: 2000 });
}

beforeEach(() => {
  mockMedia({ reduced: true });
  reelBootConfig.timeoutMs = 20;
  mockConfig.commandLatencyMs = 0;
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  window.matchMedia = realMatchMedia;
  window.history.replaceState(null, '', '/');
});

async function spinToWinner(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await booted());
  const explore = await screen.findByRole(
    'button',
    { name: /khám phá món này/i },
    { timeout: 2000 },
  );
  await waitFor(() => expect(explore).not.toHaveAttribute('aria-disabled', 'true'));
  return explore;
}

describe('Food Reel landing', () => {
  it('is a full-screen reel with one CTA — no filters, no dashboard panels', async () => {
    renderApp();
    await booted();
    expect(screen.getByRole('group', { name: /vũ trụ món ăn/i })).toBeInTheDocument();
    expect(screen.getByLabelText(`Món 1 trên ${reelCount()}`)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /chọn món ngay/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/nhiệm vụ hôm nay/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/khu vườn/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /gieo ngay/i })).not.toBeInTheDocument();
  });

  it('virtualises the reel: never more than 15 dishes mounted', async () => {
    renderApp();
    await booted();
    const items = document.querySelectorAll('.fr-item');
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(15);
    // Reel items use 384 px thumbnails; at rest only the centre (and, on desktop,
    // its two neighbours) add the 768 px image.
    expect(document.querySelectorAll('.fr-item__img--full').length).toBeLessThanOrEqual(3);
  });

  it('moves between dishes with arrow keys and keeps focus on the centre dish', async () => {
    const user = userEvent.setup();
    renderApp();
    await booted();
    const centre = document.querySelector<HTMLElement>('[data-reel-centre]')!;
    centre.focus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(screen.getByLabelText(`Món 2 trên ${reelCount()}`)).toBeInTheDocument(),
    );
    expect(document.activeElement).toHaveAttribute('data-reel-centre');
    expect(document.activeElement).toHaveAccessibleName(new RegExp(dishAt(1).name));
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    await waitFor(() =>
      expect(screen.getByLabelText(`Món ${reelCount()} trên ${reelCount()}`)).toBeInTheDocument(),
    );
  });
});

describe('spin → story → back', () => {
  it('announces the winner, opens its story, and restores the reel on close', async () => {
    const user = userEvent.setup();
    renderApp();
    const explore = await spinToWinner(user);
    const winnerName = headingName(screen.getByRole('heading', { level: 2 }));
    await waitFor(() =>
      expect(screen.getByTestId('announcer')).toHaveTextContent(`Đã chọn ${winnerName}`),
    );
    expect(screen.queryByRole('button', { name: /^quay món$/i })).not.toBeInTheDocument();

    await user.click(explore);
    const story = await screen.findByRole('dialog', { name: winnerName });
    await waitFor(() => expect(document.activeElement?.id).toBe('fr-story-title'));
    expect(window.location.pathname).toMatch(/^\/mon\//);
    expect(within(story).getByRole('img', { name: winnerName })).toBeInTheDocument();
    expect(
      within(story).getByRole('heading', { name: /Nguyên liệu & biểu tượng/ }),
    ).toBeInTheDocument();
    expect(within(story).getByText('Hồ sơ vị')).toBeInTheDocument();
    expect(story.querySelector('video, iframe, .fr-youtube-trigger')).toBeNull();
    expect(within(story).queryByRole('button', { name: /phát video/i })).not.toBeInTheDocument();

    await user.click(within(story).getByRole('button', { name: /quay lại/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    // Same winner, same scene, focus back on its CTA.
    expect(headingName(screen.getByRole('heading', { level: 2 }))).toBe(winnerName);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /khám phá món này/i })).toHaveFocus(),
    );
  });

  it('closes the story with Escape and can spin another dish from it', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(await spinToWinner(user));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /khám phá món này/i }));
    const story = await screen.findByRole('dialog');
    const first = headingName(screen.getAllByRole('heading', { level: 2 })[0]!);
    await user.click(within(story).getByRole('button', { name: /quay món khác/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('announcer').textContent).toMatch(/^Đã chọn /));
    const explore = await screen.findByRole('button', { name: /khám phá món này/i });
    expect(explore).toBeInTheDocument();
    expect(first).toBeTruthy();
  });

  it('opens a story straight from a /mon/<slug> deep link', async () => {
    window.history.replaceState(null, '', '/mon/bun-moc');
    renderApp();
    const story = await screen.findByRole('dialog', { name: 'Bún mọc' }, { timeout: 2000 });
    // The story text is catalogue content (editable), so read it from the catalogue.
    expect(story.querySelector('.fr-story__lede')).toHaveTextContent(
      getReelDishBySlug('bun-moc')!.story,
    );
    expect(document.querySelector('[data-reel-centre]')).toHaveAccessibleName(/^Bún mọc/);
  });
});

describe('chosen epilogue and journey', () => {
  it('confirms a dish once, shows the seed reward, and opens the Journey drawer', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(await spinToWinner(user));
    const story = await screen.findByRole('dialog');
    await user.click(within(story).getByRole('button', { name: /chốt món này/i }));

    expect(await screen.findByText(/đã chốt cho/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /gieo ngay/i })).toHaveLength(1);
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)!).data;
    expect(getReelDish(data.meal.dishId)).toBeDefined();
    const seedGrants = data.ledger.filter((e: { key: string }) => e.key.startsWith('seed:'));
    expect(seedGrants).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /mở nông trại/i }));
    const drawer = await screen.findByRole('dialog', { name: /nông trại của bạn/i });
    expect(window.location.pathname).toBe('/journey');
    // The farm game, lazy loaded; map, missions and this meal open as panels inside it.
    expect(
      await within(drawer).findByRole('heading', { name: 'Khu vườn' }, { timeout: 3000 }),
    ).toBeInTheDocument();
    await user.click(within(drawer).getByRole('button', { name: 'Thêm' }));
    await user.click(within(drawer).getByRole('button', { name: 'Nhiệm vụ' }));
    expect(
      await within(drawer).findByRole('heading', { name: /nhiệm vụ & nhật ký/i }),
    ).toBeInTheDocument();
    await user.click(within(drawer).getByRole('button', { name: 'Bữa này' }));
    expect(await within(drawer).findByText(/bạn nhận được|đã gieo/i)).toBeInTheDocument();
    await user.click(within(drawer).getByRole('button', { name: /về reel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /nông trại/i })).toBeNull());
  });

  it('saves a dish from its story into “Đã lưu”', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(await spinToWinner(user));
    const story = await screen.findByRole('dialog');
    await user.click(within(story).getByRole('button', { name: /lưu món/i }));
    expect(within(story).getByRole('button', { name: /đã lưu/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Đã lưu 1 món' })).toBeInTheDocument();
  });
});

describe('Rổ quay', () => {
  it('spins only between the dishes the guest picked, then knocks them out one by one', async () => {
    const user = userEvent.setup();
    renderApp();
    await booted();
    await user.click(screen.getByRole('button', { name: /chọn vài món/i }));
    const sheet = await screen.findByRole('dialog', { name: 'Rổ quay' });
    const picks = [dishAt(4), dishAt(9), dishAt(20)];
    await user.type(within(sheet).getByRole('searchbox'), picks[0]!.name);
    await user.click(within(sheet).getByRole('checkbox', { name: new RegExp(picks[0]!.name) }));
    await user.clear(within(sheet).getByRole('searchbox'));
    for (const d of picks.slice(1)) {
      await user.click(within(sheet).getAllByRole('checkbox', { name: new RegExp(d.name) })[0]!);
    }
    await user.click(within(sheet).getByRole('button', { name: 'Quay 3 món' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const names = picks.map((d) => d.name);
    await screen.findByRole('button', { name: /khám phá món này/i }, { timeout: 2000 });
    const first = headingName(screen.getByRole('heading', { level: 2 }));
    expect(names).toContain(first);

    // "Loại & quay tiếp" removes the winner and spins over the other two.
    const knock = screen.getByRole('button', { name: /loại & quay tiếp/i });
    await waitFor(() => expect(knock).not.toHaveAttribute('aria-disabled', 'true'));
    await user.click(knock);
    await waitFor(() =>
      expect(headingName(screen.getByRole('heading', { level: 2 }))).not.toBe(first),
    );
    expect(names).toContain(headingName(screen.getByRole('heading', { level: 2 })));
    // Two left: nothing more to knock out.
    expect(screen.queryByRole('button', { name: /loại & quay tiếp/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /quay lại/i }));
    expect(screen.getByLabelText(/^Món [12] trên 2$/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /tất cả/i }));
    expect(screen.getByLabelText(new RegExp(`trên ${reelCount()}$`))).toBeInTheDocument();
    // Several full spins with real timers: allow a busy machine more than the default 5 s.
  }, 20_000);
});

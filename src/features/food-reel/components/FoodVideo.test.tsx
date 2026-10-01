import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FoodVideo } from './FoodVideo';
import { getReelDish } from '../data/reelCatalogue';
import { normalizeProvince, provinceStorageKey, reviewDish, reviewItems } from '../data/reviews';

const videos = ['abcdefghijk', 'lmnopqrstuv'].map((videoId, i) => ({
  videoId,
  title: `Review ${i}`,
  channelId: `UC${'a'.repeat(22)}`,
  channelTitle: `Kênh ${i}`,
  publishedAt: '2026-01-01T00:00:00Z',
  duration: 'PT2M',
  thumbnail: 'https://evil.example/image',
}));
const dish = {
  ...getReelDish('com-tam')!,
  id: 'com-tam',
  video: { src: '/original.mp4', poster: '/poster.jpg' },
  youtubeVideos: videos,
};
const props = { dish, autoplay: false, opened: true, muted: true, onMutedChange: vi.fn() };
const response = (data: unknown, status = 200) =>
  ({ ok: status === 200, status, json: async () => data }) as Response;
let success: PositionCallback;
let failure: PositionErrorCallback;
let geo: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal('isSecureContext', true);
  geo = vi.fn((ok: PositionCallback, fail: PositionErrorCallback) => {
    success = ok;
    failure = fail;
  });
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: geo },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (String(url).includes('/provinces'))
        return response({
          items: [
            { id: 'HN', name: 'Hà Nội' },
            { id: 'HCMC', name: 'Hồ Chí Minh' },
          ],
        });
      if (String(url).includes('/reverse'))
        return response({ provinceId: 'HN', provinceName: 'Hà Nội' });
      const query = new URL(String(url), 'https://example.test').searchParams;
      return response({
        dishId: query.get('dish'),
        provinceId: query.get('province'),
        basis: 'title-description-only',
        items: videos,
      });
    }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.style.overflow = '';
});
async function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Xem review quán theo tỉnh' }));
  await act(async () => {});
}
async function select(id = 'HN') {
  fireEvent.change(screen.getByRole('combobox'), { target: { value: id } });
  await act(async () => {});
}
const position = { coords: { latitude: 21, longitude: 105 } } as GeolocationPosition;

describe('review UI', () => {
  it('requires manual choice or explicit GPS; ignores recipe videos and preserves local', async () => {
    render(<FoodVideo {...props} />);
    await open();
    expect(geo).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /^Phát YouTube:/ })).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
    await select();
    expect(screen.getAllByRole('button', { name: /^Phát YouTube:/ })).toHaveLength(2);
    expect(localStorage.getItem(provinceStorageKey)).toBe('HN');
    expect(document.querySelector('.fr-youtube img')).toHaveAttribute(
      'src',
      'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Phát YouTube: Review 0' }));
    const first = document.querySelector('iframe');
    expect(first?.getAttribute('src')).toContain('youtube-nocookie.com/embed/abcdefghijk');
    fireEvent.click(screen.getByRole('button', { name: 'Phát YouTube: Review 1' }));
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    expect(first?.isConnected).toBe(false);
    await select('HCMC');
    expect(document.querySelector('iframe')).toBeNull();
    expect(document.querySelector('video source')).toHaveAttribute('src', '/original.mp4');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng thư viện video' }));
    expect(document.querySelector('iframe')).toBeNull();
  });
  it('normalizes aliases and legacy dish; validates pair/basis and caps deduplicated metadata', () => {
    expect(normalizeProvince('Sài Gòn')).toBe('HCMC');
    expect(normalizeProvince('Hà Nội')).toBe('HN');
    expect(normalizeProvince('Đà Nẵng')).toBeNull();
    expect(reviewDish('com-tam-suon-bi-cha-trung')).toBe('com-tam');
    const list = Array.from({ length: 8 }, (_, i) => ({ ...videos[0], videoId: `abcdefghij${i}` }));
    expect(
      reviewItems(
        {
          dishId: 'com-tam',
          provinceId: 'HN',
          basis: 'title-description-only',
          items: [list[0], ...list],
        },
        'com-tam',
        'HN',
      ),
    ).toHaveLength(5);
    for (const patch of [{ dishId: 'pho-bo' }, { provinceId: 'HCMC' }, { basis: 'watched' }])
      expect(() =>
        reviewItems(
          { dishId: 'com-tam', provinceId: 'HN', basis: 'title-description-only', ...patch },
          'com-tam',
          'HN',
        ),
      ).toThrow();
  });
  it('persists only canonical province, sends GPS only in POST body', async () => {
    localStorage.setItem(provinceStorageKey, 'Hanoi');
    render(<FoodVideo {...props} />);
    await open();
    expect(localStorage.getItem(provinceStorageKey)).toBe('HN');
    fireEvent.click(screen.getByText('Dùng vị trí của tôi'));
    await act(async () => success(position));
    expect(fetch).toHaveBeenCalledWith(
      '/api/reverse',
      expect.objectContaining({ method: 'POST', body: '{"latitude":21,"longitude":105}' }),
    );
    expect(localStorage.length).toBe(1);
    expect(screen.getByText(/không cam kết việc lưu\/log/)).toBeInTheDocument();
  });
  it('retains GPS success feedback after a new province triggers review loading', async () => {
    render(<FoodVideo {...props} />);
    await open();
    fireEvent.click(screen.getByText('Dùng vị trí của tôi'));
    await act(async () => success(position));
    expect(screen.getByRole('combobox')).toHaveValue('HN');
    expect(screen.getByText('Đã chọn Hà Nội.')).toBeInTheDocument();
  });
  it('explains insecure HTTP without requesting GPS', async () => {
    vi.stubGlobal('isSecureContext', false);
    render(<FoodVideo {...props} />);
    await open();
    fireEvent.click(screen.getByText('Dùng vị trí của tôi'));
    expect(geo).not.toHaveBeenCalled();
    expect(screen.getByText(/GPS cần HTTPS hoặc localhost/)).toBeInTheDocument();
  });
  it.each([1, 2, 3])('handles browser geolocation error %s', async (code) => {
    render(<FoodVideo {...props} />);
    await open();
    fireEvent.click(screen.getByText('Dùng vị trí của tôi'));
    act(() => failure({ code } as GeolocationPositionError));
    expect(
      screen.getByText(
        code === 1 ? /từ chối quyền/ : code === 3 ? /GPS quá thời gian/ : /Không lấy được vị trí/,
      ),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([422, 429, 503])('handles reverse HTTP %s and retains manual choice', async (status) => {
    vi.mocked(fetch).mockImplementation(async (url) =>
      String(url).includes('/reverse')
        ? response({}, status)
        : response({
            items: [
              { id: 'HN', name: 'Hà Nội' },
              { id: 'HCMC', name: 'Hồ Chí Minh' },
            ],
          }),
    );
    render(<FoodVideo {...props} />);
    await open();
    fireEvent.click(screen.getByText('Dùng vị trí của tôi'));
    await act(async () => success(position));
    expect(screen.getByRole('combobox')).toBeEnabled();
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getAllByRole('status')[0]).not.toHaveTextContent('Đang xác định');
  });
  it('invalidates late GPS on manual selection, dish change and unmount', async () => {
    const { rerender, unmount } = render(<FoodVideo {...props} />);
    await open();
    fireEvent.click(screen.getByText('Dùng vị trí của tôi'));
    const late = success;
    await select('HCMC');
    await act(async () => late(position));
    expect(vi.mocked(fetch).mock.calls.some(([url]) => url === '/api/reverse')).toBe(false);
    fireEvent.click(screen.getByText('Dùng vị trí của tôi'));
    const dishLate = success;
    rerender(<FoodVideo {...props} dish={{ ...dish, id: 'pho-bo' }} />);
    await act(async () => dishLate(position));
    expect(document.querySelector('.fr-youtube-layer')).toBeNull();
    await open();
    fireEvent.click(screen.getByText('Dùng vị trí của tôi'));
    const unmountLate = success;
    unmount();
    await act(async () => unmountLate(position));
    expect(vi.mocked(fetch).mock.calls.some(([url]) => url === '/api/reverse')).toBe(false);
  });
  it('aborts reverse when manual choice wins and ignores late response', async () => {
    let resolve!: (value: Response) => void;
    let signal!: AbortSignal;
    const original = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation((url, init) => {
      if (url === '/api/reverse') {
        signal = init!.signal as AbortSignal;
        return new Promise((done) => {
          resolve = done;
        });
      }
      return original(url, init);
    });
    render(<FoodVideo {...props} />);
    await open();
    fireEvent.click(screen.getByText('Dùng vị trí của tôi'));
    await act(async () => success(position));
    await select('HCMC');
    expect(signal.aborted).toBe(true);
    await act(async () => resolve(response({ provinceId: 'HN' })));
    expect(screen.getByRole('combobox')).toHaveValue('HCMC');
  });
  it('ignores stale review responses on province change', async () => {
    let resolve!: (value: Response) => void;
    const original = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation((url, init) =>
      String(url).includes('province=HN')
        ? new Promise((done) => {
            resolve = done;
          })
        : original(url, init),
    );
    render(<FoodVideo {...props} />);
    await open();
    await select();
    await select('HCMC');
    await act(async () =>
      resolve(
        response({
          dishId: 'com-tam',
          provinceId: 'HN',
          basis: 'title-description-only',
          items: [{ ...videos[0], title: 'Stale' }],
        }),
      ),
    );
    expect(screen.queryByText('Stale')).toBeNull();
  });
  it('has browser watchdog and ignores late callbacks after timeout', async () => {
    render(<FoodVideo {...props} />);
    await open();
    vi.useFakeTimers();
    fireEvent.click(screen.getByText('Dùng vị trí của tôi'));
    act(() => vi.advanceTimersByTime(15000));
    expect(screen.getByText(/GPS quá thời gian/)).toBeInTheDocument();
    await act(async () => success(position));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('preserves modal inert/locks, capture Escape and opener focus; select participates in trap', async () => {
    const parentClose = vi.fn();
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') parentClose();
    };
    document.addEventListener('keydown', listener);
    document.body.style.overflow = 'clip';
    const { container } = render(
      <div className="fr-story">
        <div className="fr-story__scroll" style={{ overflow: 'auto' }}>
          <FoodVideo {...props} />
        </div>
      </div>,
    );
    const trigger = screen.getByText('Xem review quán theo tỉnh');
    trigger.focus();
    await open();
    const close = screen.getByRole('button', { name: 'Đóng thư viện video' });
    expect(close).toHaveFocus();
    expect(container.querySelector<HTMLElement>('.fr-story')!.inert).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(screen.getByText('Thử tải lại')).toHaveFocus();
    screen.getByRole('combobox').focus();
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(screen.getByRole('combobox')).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Escape' });
    expect(parentClose).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('clip');
    expect(container.querySelector<HTMLElement>('.fr-story__scroll')!.style.overflow).toBe('auto');
    expect(container.querySelector<HTMLElement>('.fr-story')!.inert).toBe(false);
    document.removeEventListener('keydown', listener);
  });
  it('aborts stalled fetch with timeout feedback', async () => {
    let signal!: AbortSignal;
    render(<FoodVideo {...props} />);
    await open();
    vi.mocked(fetch).mockImplementation((_url, init) => {
      signal = init!.signal as AbortSignal;
      return new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
      );
    });
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'HN' } });
    await act(async () => vi.advanceTimersByTime(12000));
    expect(signal.aborted).toBe(true);
    expect(screen.getByText(/Yêu cầu quá thời gian/)).toBeInTheDocument();
  });
  it('keeps player loading/error feedback and external fallback; resets on inactivity', async () => {
    const { rerender } = render(<FoodVideo {...props} />);
    await open();
    await select();
    fireEvent.click(screen.getByRole('button', { name: 'Phát YouTube: Review 0' }));
    const frame = document.querySelector('iframe')!;
    fireEvent.load(frame);
    expect(screen.queryByRole('link')).toBeNull();
    fireEvent.click(screen.getByText('Video không phát được?'));
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=abcdefghijk',
    );
    rerender(<FoodVideo {...props} active={false} />);
    expect(frame.isConnected).toBe(false);
    rerender(<FoodVideo {...props} active />);
    expect(document.querySelector('iframe')).toBeNull();
  });
  it('shows empty/unsupported pilot honestly without recipe fallback', async () => {
    const { rerender } = render(<FoodVideo {...props} dish={{ ...dish, id: 'bun-moc' }} />);
    await open();
    await select();
    expect(screen.getByText(/Món này chưa thuộc pilot/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Phát YouTube:/ })).toBeNull();
    rerender(<FoodVideo {...props} />);
    vi.mocked(fetch).mockImplementation(async (url) =>
      response(
        String(url).includes('/provinces')
          ? {
              items: [
                { id: 'HN', name: 'Hà Nội' },
                { id: 'HCMC', name: 'Hồ Chí Minh' },
              ],
            }
          : { dishId: 'com-tam', provinceId: 'HN', basis: 'title-description-only', items: [] },
      ),
    );
    await open();
    expect(screen.getByText(/Chưa có review phù hợp/)).toBeInTheDocument();
  });
});

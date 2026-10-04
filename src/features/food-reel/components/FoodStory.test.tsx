import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FoodStory } from './FoodStory';
import { getReelDish } from '../data/reelCatalogue';

vi.mock('../../../state/hooks', () => ({ useGame: () => ({ state: { cooked: {} } }) }));
const props = {
  dish: getReelDish('pho-bo')!,
  phase: 'detail' as const,
  reduced: true,
  saved: false,
  inPool: false,
  onToggleSave: vi.fn(),
  onTogglePool: vi.fn(),
  orderCity: 'ha-noi' as const,
  onOrderCity: vi.fn(),
  onOpened: vi.fn(),
  onClosed: vi.fn(),
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  confirmError: null,
  number: 1,
};
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('food story reading experience', () => {
  it('shows a static hero and five chapters without video, reviews, GPS or network', () => {
    const network = vi.spyOn(globalThis, 'fetch');
    const { container } = render(<FoodStory {...props} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: props.dish.name })).toHaveAttribute(
      'src',
      props.dish.image,
    );
    expect(
      container.querySelector('video, iframe, .fr-youtube-trigger, .fr-youtube-layer'),
    ).toBeNull();
    expect(screen.queryByText(/Xem review quán theo tỉnh/)).toBeNull();
    expect(container.querySelector('.fr-review-browser select')).toBeNull();
    expect(
      screen
        .getByRole('navigation', { name: 'Các chương câu chuyện món ăn' })
        .querySelectorAll('button'),
    ).toHaveLength(5);
    expect(screen.getByText(/Nam Định/)).toBeInTheDocument();
    expect(screen.getByText(/chưa kiểm chứng trực tiếp trong lần biên tập/)).toBeInTheDocument();
    expect(network).not.toHaveBeenCalled();
  });
  it('supports chapter navigation, reduced-motion scrolling and focus', () => {
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scroll,
    });
    render(<FoodStory {...props} />);
    const chapter = screen.getByRole('button', { name: /Ý nghĩa văn hóa/ });
    fireEvent.click(chapter);
    expect(scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    expect(document.activeElement).toHaveAttribute('id', 'fr-chapter-culture');
    expect(chapter).toHaveAttribute('aria-current', 'location');
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getAllByRole('button')[0]);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalled();
  });
  it('focuses the title after opening and explains missing histories', () => {
    vi.useFakeTimers();
    render(<FoodStory {...props} dish={getReelDish('ga-ran')!} />);
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(document.activeElement).toHaveAttribute('id', 'fr-story-title');
    expect(
      screen.getByText(/Chưa có tư liệu nguồn gốc được biên tập riêng cho Gà rán/),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Chưa có nguồn tham khảo bên ngoài được gắn riêng cho món này.'),
    ).toBeInTheDocument();
  });
});

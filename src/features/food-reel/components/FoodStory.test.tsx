import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FoodStory } from './FoodStory';
import { getReelDish } from '../data/reelCatalogue';
import { findDishStory } from '../data/dishStories';

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
  it('shows a static hero and seven chapters without video, reviews, GPS or network', () => {
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
    ).toHaveLength(7);
    const story = findDishStory('pho-bo')!;
    expect(screen.getByText(story.homeland)).toBeInTheDocument();
    expect(screen.getByText(story.origin[0]!)).toBeInTheDocument();
    expect(screen.getByText(story.facts[0]!)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Dòng thời gian/ })).toBeInTheDocument();
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
    expect(document.activeElement).toHaveAttribute('id', 'fr-chapter-meaning');
    expect(chapter).toHaveAttribute('aria-current', 'location');
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getAllByRole('button')[0]);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalled();
  });
  it('focuses the title after opening and tells the story of any dish', () => {
    vi.useFakeTimers();
    render(<FoodStory {...props} dish={getReelDish('ga-ran')!} />);
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(document.activeElement).toHaveAttribute('id', 'fr-story-title');
    expect(screen.getByText(findDishStory('ga-ran')!.origin[0]!)).toBeInTheDocument();
  });
});

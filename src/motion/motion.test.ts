import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_PARTICLES, burstSoil, flyTo } from './effects';
import { createTimeline } from './timeline';

type FakeAnim = { onfinish: (() => void) | null; cancel: () => void; finish: () => void };

function installFakeAnimate() {
  const anims: FakeAnim[] = [];
  const spy = vi.fn(function (this: HTMLElement) {
    const a: FakeAnim = {
      onfinish: null,
      cancel: vi.fn(),
      finish() {
        this.onfinish?.();
      },
    };
    anims.push(a);
    return a as unknown as Animation;
  });
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    value: spy,
    configurable: true,
    writable: true,
  });
  return { spy, anims };
}

afterEach(() => {
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
  vi.useRealTimers();
});

describe('soil particles', () => {
  it('creates no particles under reduced motion', () => {
    const { spy } = installFakeAnimate();
    const box = document.createElement('div');
    burstSoil(box, 8, true);
    expect(box.querySelectorAll('.soil-particle')).toHaveLength(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('caps particles and removes them on finish and on cancel', () => {
    const { anims } = installFakeAnimate();
    const box = document.createElement('div');
    burstSoil(box, 50);
    expect(box.querySelectorAll('.soil-particle')).toHaveLength(MAX_PARTICLES);
    anims.forEach((a) => a.finish());
    expect(box.querySelectorAll('.soil-particle')).toHaveLength(0);

    const handle = burstSoil(box, 6);
    expect(box.querySelectorAll('.soil-particle')).toHaveLength(6);
    handle.cancel();
    expect(box.querySelectorAll('.soil-particle')).toHaveLength(0);
  });
});

describe('seed flight', () => {
  it('lands immediately without a ghost node under reduced motion', () => {
    installFakeAnimate();
    const a = document.createElement('span');
    const b = document.createElement('span');
    document.body.append(a, b);
    const onLand = vi.fn();
    flyTo(a, b, { reduced: true, onLand });
    expect(onLand).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('.fly-ghost')).toHaveLength(0);
  });

  it('cleans up its ghost node when cancelled and still reports landing once', () => {
    installFakeAnimate();
    const a = document.createElement('span');
    const b = document.createElement('span');
    document.body.append(a, b);
    const onLand = vi.fn();
    const h = flyTo(a, b, { onLand });
    expect(document.querySelectorAll('.fly-ghost')).toHaveLength(1);
    h.cancel();
    h.cancel();
    expect(document.querySelectorAll('.fly-ghost')).toHaveLength(0);
    expect(onLand).toHaveBeenCalledTimes(1);
  });
});

describe('timeline', () => {
  it('runs steps in order, can finish early and cancels pending timers', () => {
    vi.useFakeTimers();
    const seen: string[] = [];
    const done = vi.fn();
    const t = createTimeline(
      [
        { at: 300, run: () => seen.push('b') },
        { at: 100, run: () => seen.push('a') },
        { at: 900, run: () => seen.push('c') },
      ],
      done,
    );
    vi.advanceTimersByTime(350);
    expect(seen).toEqual(['a', 'b']);
    t.finish();
    expect(seen).toEqual(['a', 'b', 'c']);
    expect(done).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000);
    expect(seen).toEqual(['a', 'b', 'c']);

    const cancelled: string[] = [];
    const t2 = createTimeline([{ at: 100, run: () => cancelled.push('x') }]);
    t2.cancel();
    vi.advanceTimersByTime(500);
    expect(cancelled).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});

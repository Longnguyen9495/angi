import { describe, expect, it } from 'vitest';
import { dayPart, weatherAt } from './sky';

const at = (y: number, mo: number, d: number, h: number, mi = 0) =>
  new Date(y, mo - 1, d, h, mi).getTime();

describe('farm sky', () => {
  it('follows the local clock', () => {
    expect(dayPart(at(2026, 10, 1, 6))).toBe('morning');
    expect(dayPart(at(2026, 10, 1, 12))).toBe('noon');
    expect(dayPart(at(2026, 10, 1, 17))).toBe('evening');
    expect(dayPart(at(2026, 10, 1, 22))).toBe('night');
    expect(dayPart(at(2026, 10, 1, 3))).toBe('night');
  });

  it('keeps one weather for a whole 3-hour block, so a reload never flips it', () => {
    expect(weatherAt(at(2026, 10, 1, 9, 0))).toBe(weatherAt(at(2026, 10, 1, 11, 59)));
    expect(weatherAt(at(2026, 10, 1, 21, 5))).toBe(weatherAt(at(2026, 10, 1, 23, 50)));
  });

  it('is mostly fair, with cloudy and rainy spells', () => {
    const seen = { clear: 0, cloudy: 0, rain: 0 };
    for (let day = 0; day < 120; day++)
      for (let h = 0; h < 24; h += 3) seen[weatherAt(at(2026, 1, 1 + day, h))]++;
    const total = seen.clear + seen.cloudy + seen.rain;
    expect(seen.clear / total).toBeGreaterThan(0.4);
    expect(seen.cloudy).toBeGreaterThan(0);
    expect(seen.rain / total).toBeGreaterThan(0.08);
    expect(seen.rain / total).toBeLessThan(0.35);
  });
});

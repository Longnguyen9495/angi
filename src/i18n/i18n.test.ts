import { detectLocale, localized, mergeMessages, t } from '.';
import en from './messages/en';
import vi from './messages/vi';

/** Every key path in a dictionary, with the kind of value it holds. */
function shape(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [`${prefix}:${typeof obj}`];
  return Object.entries(obj).flatMap(([k, v]) => shape(v, prefix ? `${prefix}.${k}` : k));
}

describe('i18n', () => {
  it('English mirrors the Vietnamese dictionary key for key', () => {
    expect(shape(en).sort()).toEqual(shape(vi).sort());
  });

  it('has no empty translations', () => {
    const empty: string[] = [];
    const walk = (o: unknown, p: string) => {
      if (typeof o === 'string' && o.trim() === '') empty.push(p);
      else if (typeof o === 'object' && o)
        for (const [k, v] of Object.entries(o)) walk(v, `${p}.${k}`);
    };
    walk(en, 'en');
    expect(empty).toEqual([]);
  });

  it('picks the language from the URL, then the saved choice, then the browser', () => {
    expect(detectLocale('?lang=en', 'vi', ['vi-VN'])).toBe('en');
    expect(detectLocale('', 'en', ['vi-VN'])).toBe('en');
    expect(detectLocale('', null, ['vi-VN', 'en'])).toBe('vi');
    expect(detectLocale('', null, ['en-GB'])).toBe('en');
    expect(detectLocale('?lang=xx', 'zz', ['ko-KR'])).toBe('en');
    expect(detectLocale('', null, [])).toBe('vi');
  });

  it('falls back to Vietnamese for keys a partial translation lacks', () => {
    const merged = mergeMessages(vi, { common: { close: 'X' } });
    expect(merged.common.close).toBe('X');
    expect(merged.common.back).toBe(vi.common.back);
  });

  it('runs the tests in Vietnamese', () => {
    expect(t.common.close).toBe(vi.common.close);
  });

  it('keeps the base field when a translation is missing or blank', () => {
    const base = { name: 'Phở bò', story: 'Chuyện' };
    expect(localized(base, { en: { story: '' } })).toEqual(base);
    expect(localized(base, null)).toEqual(base);
  });
});

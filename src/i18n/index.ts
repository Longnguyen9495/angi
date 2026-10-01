/*
 * App-wide i18n. The language is fixed for the lifetime of the page: it is
 * resolved once (URL ?lang= → saved choice → browser languages), its dictionary
 * is loaded before any other module evaluates (top-level await), and switching
 * languages reloads the page. That keeps module-level data (crops, recipes,
 * region labels, the dish catalogue) translated without re-render plumbing.
 *
 * Usage:  import { t } from '../i18n';   t.common.close   t.reel.spinsLeft(3)
 */
import {
  DEFAULT_LOCALE,
  FOREIGN_FALLBACK,
  LOCALES,
  LOCALE_CODES,
  isLocale,
  type LocaleCode,
} from './locales';
import vi from './messages/vi';
import type { LocaleMessages, Messages } from './types';

export { LOCALES, LOCALE_CODES, DEFAULT_LOCALE, isLocale };
export type { LocaleCode, Messages, LocaleMessages };

/** Brand name; not translated. */
export const BRAND = 'Ăn gì?';

const STORAGE_KEY = 'an-gi/locale';

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function store(code: LocaleCode): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Private mode: the choice lasts for this page only.
  }
}

/** Picks the page language. Exported for tests. */
export function detectLocale(
  search = typeof location === 'undefined' ? '' : location.search,
  stored = readStored(),
  languages: readonly string[] = typeof navigator === 'undefined'
    ? []
    : navigator.languages?.length
      ? navigator.languages
      : [navigator.language].filter(Boolean),
): LocaleCode {
  const asked = new URLSearchParams(search).get('lang');
  if (isLocale(asked)) return asked;
  if (isLocale(stored)) return stored;
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLocale(base)) return base;
  }
  // A browser that names only languages we lack is most likely a visitor from abroad.
  return languages.length > 0 ? FOREIGN_FALLBACK : DEFAULT_LOCALE;
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Overlays a (possibly partial) translation on the Vietnamese dictionary. */
export function mergeMessages<T>(base: T, over: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(over)) {
    return (over === undefined || over === null ? base : over) as T;
  }
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base)) {
    if (key in over) out[key] = mergeMessages(base[key], over[key]);
  }
  return out as T;
}

async function load(code: LocaleCode): Promise<Messages> {
  if (code === DEFAULT_LOCALE) return vi;
  try {
    const mod = await LOCALES[code].load();
    return mergeMessages(vi, mod.default);
  } catch {
    return vi;
  }
}

/** The active language code. */
export const locale: LocaleCode = detectLocale();

/** The active dictionary (Vietnamese fallback merged in). */
export const t: Messages = await load(locale);

/** BCP 47 tag of the active language, for Intl and <html lang>. */
export const intlLocale = LOCALES[locale].intl;

if (typeof document !== 'undefined') document.documentElement.lang = locale;

/** Saves the choice and reloads so every module picks the new dictionary. */
export function setLocale(code: LocaleCode): void {
  if (code === locale) return;
  store(code);
  const url = new URL(window.location.href);
  url.searchParams.delete('lang');
  window.location.replace(url.toString());
}

// ——— Formatting in the active language ———

export function formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocale, options).format(n);
}

export function formatTime(date: Date | number): string {
  return new Date(date).toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString(
    intlLocale,
    options ?? { day: 'numeric', month: 'short' },
  );
}

/** Picks the dish/ingredient field for the active language from a `translations` map. */
export function localized<T extends object>(
  base: T,
  translations: Partial<Record<string, Partial<T>>> | null | undefined,
): T {
  const over = translations?.[locale];
  if (!over) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (typeof v === 'string' ? v.trim() !== '' : v !== undefined && v !== null) {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

/*
 * Language registry. To add a language:
 *   1. Copy src/i18n/messages/en/ to src/i18n/messages/<code>/ and translate it
 *      (missing keys fall back to Vietnamese, so a partial dictionary still works).
 *   2. Add one entry below.
 *   3. Optionally add dish/ingredient translations for <code> in /admin
 *      (the catalogue falls back to Vietnamese per field).
 *   4. Add server strings in server/lang/<code>.php (emails, API errors).
 */
import type { LocaleMessages } from './types';

export interface LocaleDef {
  /** Name of the language in that language, for the switcher. */
  name: string;
  /** Two/three-letter badge for compact switchers. */
  short: string;
  /** BCP 47 tag for <html lang> and Intl formatting. */
  intl: string;
  load: () => Promise<{ default: LocaleMessages }>;
}

export const DEFAULT_LOCALE = 'vi';

/** Used when the browser asks for a language we do not have yet. */
export const FOREIGN_FALLBACK = 'en';

export const LOCALES = {
  vi: { name: 'Tiếng Việt', short: 'VI', intl: 'vi-VN', load: () => import('./messages/vi') },
  en: { name: 'English', short: 'EN', intl: 'en-US', load: () => import('./messages/en') },
} satisfies Record<string, LocaleDef>;

export type LocaleCode = keyof typeof LOCALES;

export const LOCALE_CODES = Object.keys(LOCALES) as LocaleCode[];

export function isLocale(code: unknown): code is LocaleCode {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(LOCALES, code);
}

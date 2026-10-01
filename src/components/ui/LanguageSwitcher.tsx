import { LOCALES, LOCALE_CODES, locale, setLocale, t, type LocaleCode } from '../../i18n';

interface Props {
  className?: string;
  /** 'compact' shows the short code (VI / EN); 'full' shows the language names. */
  variant?: 'compact' | 'full';
}

/** Lists every registered language; picking one reloads the page in it. */
export function LanguageSwitcher({ className, variant = 'compact' }: Props) {
  return (
    <div
      className={['lang-switch', `lang-switch--${variant}`, className].filter(Boolean).join(' ')}
      role="group"
      aria-label={t.common.chooseLanguage}
    >
      {LOCALE_CODES.map((code: LocaleCode) => {
        const def = LOCALES[code];
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            className="lang-switch__option"
            aria-pressed={active}
            aria-label={variant === 'compact' ? def.name : undefined}
            title={def.name}
            onClick={() => setLocale(code)}
          >
            {variant === 'compact' ? def.short : def.name}
          </button>
        );
      })}
    </div>
  );
}

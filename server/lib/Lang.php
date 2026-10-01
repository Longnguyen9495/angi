<?php

declare(strict_types=1);

/*
 * Server-side messages. Every language is one file in server/lang/<code>.php
 * returning ['key' => 'text with {param}', ...] (a value may also be a
 * Closure(array $params): string for plurals or word order). Vietnamese is the
 * source and the fallback: a key missing from another language falls back to vi.
 * Adding a language = adding its file; nothing here needs to change.
 */
final class Lang
{
    public const FALLBACK = 'vi';
    private const DIR = __DIR__ . '/../lang';

    private static ?string $locale = null;
    /** @var array<string, array<string, string|Closure>> */
    private static array $messages = [];

    /** @return list<string> language codes that have a file, fallback first */
    public static function available(): array
    {
        static $codes = null;
        if ($codes === null) {
            $codes = [];
            foreach (glob(self::DIR . '/*.php') ?: [] as $file) {
                $code = basename($file, '.php');
                if (preg_match('/^[a-z]{2,3}(-[A-Z]{2})?$/D', $code)) {
                    $codes[] = $code;
                }
            }
            sort($codes);
            $codes = array_values(array_unique([self::FALLBACK, ...$codes]));
        }
        return $codes;
    }

    /** Languages a translation may be stored for (all but the base language). @return list<string> */
    public static function extra(): array
    {
        return array_values(array_filter(self::available(), fn ($c) => $c !== self::FALLBACK));
    }

    /** @return list<array{code: string, name: string}> each language named in itself */
    public static function describe(): array
    {
        return array_map(fn ($c) => ['code' => $c, 'name' => self::get('meta.name', [], $c)], self::available());
    }

    /** "en-US", "EN", "en_GB" → "en" when that file exists; null otherwise. */
    public static function normalize(?string $tag): ?string
    {
        $tag = str_replace('_', '-', trim((string) $tag));
        if ($tag === '') {
            return null;
        }
        $available = self::available();
        $parts = explode('-', $tag);
        $full = strtolower($parts[0]) . (isset($parts[1]) ? '-' . strtoupper($parts[1]) : '');
        if (in_array($full, $available, true)) {
            return $full;
        }
        $base = strtolower($parts[0]);
        return in_array($base, $available, true) ? $base : null;
    }

    /** Request language: X-Locale header → ?lang= → Accept-Language → vi. */
    public static function locale(): string
    {
        return self::$locale ??= self::fromRequest();
    }

    /** Forces the language (CLI tools, tests); null re-reads the request. */
    public static function setLocale(?string $locale): void
    {
        self::$locale = $locale === null ? null : (self::normalize($locale) ?? self::FALLBACK);
    }

    private static function fromRequest(): string
    {
        foreach ([$_SERVER['HTTP_X_LOCALE'] ?? null, is_string($_GET['lang'] ?? null) ? $_GET['lang'] : null] as $candidate) {
            if (($code = self::normalize($candidate)) !== null) {
                return $code;
            }
        }
        return self::fromAcceptLanguage((string) ($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '')) ?? self::FALLBACK;
    }

    /** Best available language from an Accept-Language header, honouring q-values. */
    public static function fromAcceptLanguage(string $header): ?string
    {
        $ranked = [];
        foreach (explode(',', $header) as $i => $part) {
            $bits = explode(';', trim($part));
            $q = 1.0;
            foreach (array_slice($bits, 1) as $p) {
                if (preg_match('/^\s*q=([0-9.]+)\s*$/', $p, $m)) {
                    $q = (float) $m[1];
                }
            }
            if ($q > 0 && ($code = self::normalize($bits[0])) !== null) {
                // Stable sort: earlier entries win ties.
                $ranked[] = [$q, -$i, $code];
            }
        }
        if (!$ranked) {
            return null;
        }
        rsort($ranked);
        return $ranked[0][2];
    }

    /** Message for $key in $locale (default: the request's), falling back to vi, then to the key. */
    public static function get(string $key, array $params = [], ?string $locale = null): string
    {
        $locale = $locale !== null ? (self::normalize($locale) ?? self::FALLBACK) : self::locale();
        $msg = self::load($locale)[$key] ?? self::load(self::FALLBACK)[$key] ?? $key;
        if ($msg instanceof Closure) {
            return (string) $msg($params);
        }
        if (!$params) {
            return $msg;
        }
        $pairs = [];
        foreach ($params as $k => $v) {
            $pairs['{' . $k . '}'] = (string) $v;
        }
        return strtr($msg, $pairs);
    }

    /** @return array<string, string|Closure> */
    private static function load(string $locale): array
    {
        if (!isset(self::$messages[$locale])) {
            $file = self::DIR . '/' . $locale . '.php';
            $data = in_array($locale, self::available(), true) && is_file($file) ? require $file : [];
            self::$messages[$locale] = is_array($data) ? $data : [];
        }
        return self::$messages[$locale];
    }
}

/** Translated message for the current request (see Lang::get). */
function __t(string $key, array $params = [], ?string $locale = null): string
{
    return Lang::get($key, $params, $locale);
}

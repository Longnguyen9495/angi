<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/Schema.php';

/*
 * Values the admin changes without a deploy: the spin allowance and its price, the bank the
 * guests pay into, and how hard fair-play refusals are punished. Stored as JSON in
 * app_settings (Schema v7); anything missing falls back to DEFAULTS, and every value is
 * clamped on the way in so a typo cannot hand out unlimited spins or a year-long ban.
 */
final class Settings
{
    public const DEFAULTS = [
        'spins' => [
            // Free spins per Vietnam day, per account (or per browser for guests).
            'freePerDay' => 30,
            // VND per bought spin.
            'price' => 5000,
            // Packs offered in the app (spins per pack).
            'packs' => [1, 5, 10, 20],
            // Guests without an account: free spins per network per day, on top of the per-browser
            // count (clearing cookies alone does not reset the allowance). 0 = no network cap.
            'guestNetworkCap' => 100,
        ],
        'bank' => [
            // VietQR: the bank's 6-digit BIN (e.g. 970436 Vietcombank), account number and holder.
            'bin' => '',
            'name' => '',
            'account' => '',
            'holder' => '',
        ],
        'fairPlay' => [
            // Points one refused save adds, by guard code. Same code + reason within an hour counts once.
            'weights' => [
                'clock' => 0, 'owned' => 0, 'import' => 1, 'gap' => 1, 'gift_debit' => 1,
                'shape' => 2, 'rule' => 2, 'balance' => 3, 'replay' => 3,
            ],
            // Points are summed over this many days.
            'windowDays' => 7,
            // Crossing a level alerts the admin; a level with hours > 0 also locks the farm that long.
            'levels' => [
                ['points' => 3, 'hours' => 0],
                ['points' => 6, 'hours' => 6],
                ['points' => 12, 'hours' => 72],
                ['points' => 24, 'hours' => 336],
            ],
            // Off: levels only alert, the admin locks by hand.
            'autoBan' => true,
        ],
    ];

    /** Longest lock, automatic or by hand: 90 days. */
    public const MAX_BAN_HOURS = 90 * 24;

    private static ?array $cache = null;

    public static function all(PDO $db): array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }
        Schema::ensure($db);
        $stored = [];
        foreach ($db->query('SELECT name, value FROM app_settings')->fetchAll() as $r) {
            $v = json_decode((string) $r['value'], true);
            if (is_array($v)) {
                $stored[(string) $r['name']] = $v;
            }
        }
        $out = [];
        foreach (self::DEFAULTS as $group => $defaults) {
            $out[$group] = self::clean($group, array_replace($defaults, $stored[$group] ?? []));
        }
        // The bank can also come from .env (PAY_BANK_BIN, …) until the admin fills it in.
        foreach (['bin' => 'PAY_BANK_BIN', 'name' => 'PAY_BANK_NAME', 'account' => 'PAY_ACCOUNT_NO', 'holder' => 'PAY_ACCOUNT_NAME'] as $k => $envKey) {
            if ($out['bank'][$k] === '') {
                $out['bank'][$k] = self::clean('bank', [$k => (string) env($envKey, '')] + self::DEFAULTS['bank'])[$k];
            }
        }
        return self::$cache = $out;
    }

    public static function get(PDO $db, string $group): array
    {
        return self::all($db)[$group];
    }

    /** Saves the groups given (unknown groups and keys are ignored); returns everything. */
    public static function save(PDO $db, array $body): array
    {
        Schema::ensure($db);
        $current = self::all($db);
        $sqlite = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
        $upsert = $db->prepare($sqlite
            ? 'INSERT INTO app_settings (name, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
            : 'INSERT INTO app_settings (name, value, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)');
        foreach (self::DEFAULTS as $group => $defaults) {
            if (!is_array($body[$group] ?? null)) {
                continue;
            }
            $merged = self::clean($group, array_replace($current[$group], array_intersect_key($body[$group], $defaults)));
            $upsert->execute([$group, json_encode($merged, JSON_UNESCAPED_UNICODE), time()]);
        }
        self::$cache = null;
        return self::all($db);
    }

    /** Forget the cached copy (tests change settings between steps). */
    public static function reset(): void
    {
        self::$cache = null;
    }

    private static function clean(string $group, array $v): array
    {
        $int = fn (mixed $x, int $min, int $max, int $def) => is_numeric($x) ? max($min, min($max, (int) $x)) : $def;
        $str = fn (mixed $x, int $len, string $pattern = '') => (function () use ($x, $len, $pattern) {
            $s = trim(mb_substr(is_scalar($x) ? (string) $x : '', 0, $len));
            return $pattern === '' || preg_match($pattern, $s) ? $s : '';
        })();
        $d = self::DEFAULTS[$group];
        return match ($group) {
            'spins' => [
                'freePerDay' => $int($v['freePerDay'] ?? null, 0, 1000, $d['freePerDay']),
                'price' => $int($v['price'] ?? null, 1000, 1_000_000, $d['price']),
                'packs' => (function () use ($v, $d) {
                    $packs = array_values(array_unique(array_filter(
                        array_map('intval', is_array($v['packs'] ?? null) ? $v['packs'] : []),
                        fn ($n) => $n >= 1 && $n <= 500,
                    )));
                    sort($packs);
                    return $packs ? array_slice($packs, 0, 6) : $d['packs'];
                })(),
                'guestNetworkCap' => $int($v['guestNetworkCap'] ?? null, 0, 100_000, $d['guestNetworkCap']),
            ],
            'bank' => [
                'bin' => $str($v['bin'] ?? '', 6, '/^\d{6}$/'),
                'name' => $str($v['name'] ?? '', 60),
                'account' => $str($v['account'] ?? '', 19, '/^[0-9A-Za-z]{4,19}$/'),
                // VietQR shows the holder in capitals without accents.
                'holder' => strtoupper($str(self::ascii((string) ($v['holder'] ?? '')), 50, '/^[A-Za-z0-9 .]*$/')),
            ],
            'fairPlay' => [
                'weights' => (function () use ($v, $d, $int) {
                    $w = [];
                    foreach ($d['weights'] as $code => $def) {
                        $w[$code] = $int($v['weights'][$code] ?? null, 0, 50, $def);
                    }
                    return $w;
                })(),
                'windowDays' => $int($v['windowDays'] ?? null, 1, 90, $d['windowDays']),
                'levels' => (function () use ($v, $d, $int) {
                    $levels = [];
                    foreach (is_array($v['levels'] ?? null) ? array_slice($v['levels'], 0, 8) : [] as $l) {
                        if (!is_array($l)) {
                            continue;
                        }
                        $levels[] = [
                            'points' => $int($l['points'] ?? null, 1, 10_000, 0),
                            'hours' => $int($l['hours'] ?? null, 0, self::MAX_BAN_HOURS, 0),
                        ];
                    }
                    $levels = array_values(array_filter($levels, fn ($l) => $l['points'] > 0));
                    usort($levels, fn ($a, $b) => $a['points'] <=> $b['points']);
                    // One level per threshold.
                    $levels = array_values(array_column($levels, null, 'points'));
                    return $levels ?: $d['levels'];
                })(),
                'autoBan' => (bool) ($v['autoBan'] ?? $d['autoBan']),
            ],
        };
    }

    private static function ascii(string $s): string
    {
        if (class_exists('Normalizer')) {
            $s = (string) Normalizer::normalize($s, Normalizer::FORM_D);
            $s = (string) preg_replace('/[\x{0300}-\x{036f}]/u', '', $s);
        }
        // Without intl: Vietnamese letters by hand (precomposed, as keyboards type them).
        static $map = null;
        if ($map === null) {
            $map = [];
            foreach ([
                'a' => 'àáạảãâầấậẩẫăằắặẳẵ', 'e' => 'èéẹẻẽêềếệểễ', 'i' => 'ìíịỉĩ', 'o' => 'òóọỏõôồốộổỗơờớợởỡ',
                'u' => 'ùúụủũưừứựửữ', 'y' => 'ỳýỵỷỹ', 'd' => 'đ',
            ] as $plain => $letters) {
                foreach (mb_str_split($letters) as $ch) {
                    $map[$ch] = $plain;
                    $map[mb_strtoupper($ch)] = strtoupper($plain);
                }
            }
        }
        return strtr($s, $map);
    }
}

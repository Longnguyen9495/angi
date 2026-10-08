<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/*
 * Vườn Mây rules on the server, the same as src/domain/sky.ts on the game's side and read from
 * the same tables (server/data/game-rules.json → "sky"). Used by ProgressGuard (to check sky
 * entries) and by Sky.php (bug reveals, stars, tiers).
 *
 * Bugs: whether a check of a planting brings a bug, and which, comes from an HMAC with a key
 * only the server holds (SKY_SECRET), so nobody can know ahead which planting will bring what.
 * The server reveals a check only once its time has come (plans/vuon-may.md §0.2 step 5).
 */
final class SkyRules
{
    public static function R(): array
    {
        require_once __DIR__ . '/ProgressGuard.php';
        return ProgressGuard::rules()['sky'] ?? [];
    }

    private static function secret(): string
    {
        $s = (string) env('SKY_SECRET', '');
        return $s !== '' ? $s : hash_hmac('sha256', 'sky-bugs', (string) env('APP_KEY', 'bepviet-local-key'));
    }

    // ——— Stats (bp) ———

    /** A pot's own stats at a tier (TS potBase). */
    public static function potBase(string $pot, int $tier): array
    {
        $S = self::R();
        $def = $S['pots'][$pot] ?? null;
        $out = ['time' => 0, 'xp' => 0, 'bug' => 0, 'coin' => 0];
        if ($def === null) {
            return $out;
        }
        $base = $S['setStats'][$def['set']];
        $mul = (int) $S['tierMul'][$tier] / (int) $S['tierMul'][(int) $def['tier']];
        foreach ($out as $k => $_) {
            $out[$k] = (int) floor((int) $base[$k] * $mul);
        }
        return $out;
    }

    /** The most a pot could give anywhere: top floor, best floor effect (TS potMax). */
    public static function potMax(string $pot, int $tier, int $stars): array
    {
        $S = self::R();
        $base = self::potBase($pot, $tier);
        $star = 100 + (int) $S['starStep'] * $stars;
        $fl = 100 + (int) $S['floorStep'] * (count($S['floors']) - 1);
        $out = [];
        foreach ($base as $k => $v) {
            $x = intdiv($v * $star * $fl, 10000);
            if ($k === 'time' && ($S['pots'][$pot]['set'] ?? '') === 'produce') {
                $x *= (int) $S['produceVegTime'];
            }
            $out[$k] = min((int) $S['statCap'][$k], $x + 1500);
        }
        return $out;
    }

    // ——— Plants ———

    /** Grow time of a seed before bonuses (ms), or null for an unknown one. */
    public static function growMs(array $seed, array $R): ?int
    {
        $kind = $seed['kind'] ?? null;
        $id = (string) ($seed['id'] ?? '');
        if ($kind === 'sky') {
            return isset(self::R()['crops'][$id]) ? (int) self::R()['crops'][$id]['growMs'] : null;
        }
        if ($kind === 'farm') {
            $c = $R['crops'][$id] ?? null;
            return $c !== null && $c['kind'] === 'veg' ? (int) $c['growMs'] : null;
        }
        return null;
    }

    /** With the pot's time bonus, no watering (TS plantGrowMs; JS Math.round of a positive). */
    public static function plantGrowMs(int $growMs, int $timeBp): int
    {
        return (int) floor($growMs * (10000 - $timeBp) / 10000 + 0.5);
    }

    /** When check `i` comes for a planting (device ms). */
    public static function checkAt(int $plantedAt, int $plantGrowMs, int $i): int
    {
        return $plantedAt + (int) floor($plantGrowMs * (float) self::R()['bugRoll']['stages'][$i] + 0.5);
    }

    /** 18:00–06:00 in Vietnam at server time `$ms`. */
    public static function night(int $ms): bool
    {
        $h = (int) gmdate('G', intdiv($ms, 1000) + 7 * 3600);
        return $h >= 18 || $h < 6;
    }

    /**
     * The bug of a check, or null. `$tutorial`: the first planting of the first pot always
     * brings a ladybug at its first check (§0.4). `$serverMs`: when the check came, server time.
     */
    public static function rollBug(int $user, string $uid, int $cycle, int $stage, int $bugBp, int $serverMs, bool $tutorial): ?string
    {
        if ($tutorial && $cycle === 0 && $stage === 0) {
            return 'ladybug';
        }
        $S = self::R();
        $h = hash_hmac('sha256', "$user|$uid|$cycle|$stage", self::secret());
        $u1 = hexdec(substr($h, 0, 8)) / 4294967296;
        $u2 = hexdec(substr($h, 8, 8)) / 4294967296;
        $p = min((int) $S['bugRoll']['capBp'], (int) $S['bugRoll']['baseBp'] + max(0, $bugBp)) / 10000;
        if ($u1 >= $p) {
            return null;
        }
        $total = 0;
        foreach ($S['bugOrder'] as $b) {
            $total += (int) $S['bugs'][$b]['weight'];
        }
        $acc = 0;
        $pick = $S['bugOrder'][0];
        foreach ($S['bugOrder'] as $b) {
            $acc += (int) $S['bugs'][$b]['weight'];
            if ($u2 * $total < $acc) {
                $pick = $b;
                break;
            }
        }
        if (!empty($S['bugs'][$pick]['night']) && !self::night($serverMs)) {
            return 'ladybug';
        }
        return $pick;
    }

    // ——— Balloon ———

    /** Same as dayNumber() in src/domain/sky.ts. */
    public static function dayNumber(string $date): int
    {
        return intdiv((int) strtotime($date . ' 12:00:00 UTC'), 86400);
    }

    /** Same as balloonBoxes(): what each box of a date's balloon asks for. */
    public static function balloonBoxes(string $date): array
    {
        $B = self::R()['balloon'];
        $d = self::dayNumber($date);
        $out = [];
        for ($i = 0; $i < (int) $B['boxes']; $i++) {
            $out[] = [
                'good' => $B['goods'][(int) floor(self::unit($d, $i + 1) * count($B['goods']))],
                'qty' => 1 + (int) floor(self::unit($d, $i + 11) * 3),
            ];
        }
        return $out;
    }

    /** JS: (floor(at) + salt·0x9e3779b1) | 0, two rounds of imul/xorshift, / 2^32. */
    public static function unit(int $at, int $salt): float
    {
        $h = ($at + $salt * 0x9e3779b1) & 0xFFFFFFFF;
        $h = self::imul($h ^ ($h >> 16), 0x45d9f3b);
        $h = self::imul($h ^ ($h >> 16), 0x45d9f3b);
        return (($h ^ ($h >> 16)) & 0xFFFFFFFF) / 4294967296;
    }

    private static function imul(int $a, int $b): int
    {
        $a &= 0xFFFFFFFF;
        $b &= 0xFFFFFFFF;
        $lo = ($a & 0xFFFF) * $b;
        $hi = (($a >> 16) * $b) & 0xFFFF;
        return ($lo + ($hi << 16)) & 0xFFFFFFFF;
    }

    /** Same as harvestOf() XP: harvestXp × (1 + xp bonus), floored. */
    public static function harvestXp(int $growMs, int $xpBp): int
    {
        require_once __DIR__ . '/ProgressGuard.php';
        return intdiv(ProgressGuard::harvestXp($growMs) * (10000 + $xpBp), 10000);
    }

    /** Where a pot stands in a sky branch: [floor, slot] or null. */
    public static function place(array $sky, string $uid): ?array
    {
        foreach ((array) ($sky['slots'] ?? []) as $f => $row) {
            foreach ((array) $row as $i => $u) {
                if ($u === $uid) {
                    return [(int) $f, (int) $i];
                }
            }
        }
        return null;
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/Schema.php';
require_once __DIR__ . '/RateLimit.php';
require_once __DIR__ . '/SkyGuard.php';

/*
 * Checks a saved garden against the copy the server already holds, so a guest can only gain
 * what the game's rules allow (server/data/game-rules.json, exported from the game itself).
 *
 * The game keeps a ledger: every change to XP, xu, seeds and pantry is an entry with an
 * idempotency key. For a save to be accepted:
 *  - each balance must equal the stored one plus the new entries' deltas (no silent edits);
 *  - every new entry that pays something must follow a rule — a harvest needs a planting of
 *    that crop on that plot that had time to ripen, a sale pays the market price for an item
 *    that left the pantry, a quest pays exactly its reward, a friend's gift is an event the
 *    server recorded for this garden, and so on; spending is always allowed;
 *  - one-time rewards are remembered here (progress_claims), not just in the ledger's tail;
 *  - times are on the server's clock: the device's offset to it is recorded on the first save
 *    and may not jump afterwards, and new entries must fall between the last save and now;
 *  - timers (plots, animals, hive, boat) can only start inside that window, with a seed or
 *    feed spent, and their durations are the game's.
 * A garden seen for the first time (or a different journey brought into the account) is an
 * import: checked for shape and capped, but it earns nothing that pays other gardens.
 * What this does not stop: a bot playing by the rules, several real accounts, or
 * self-declared meals (check-ins are the game's honour system).
 */
final class ProgressGuard
{
    use SkyGuard;

    /** Device clock drift allowed between two saves. */
    private const SKEW_MS = 10 * 60 * 1000;
    /** How far past the device's "now" an entry may be dated. */
    private const FUTURE_MS = 2 * 60 * 1000;
    /** First check of a save stored before the guard existed (its clock offset is unknown). */
    private const LEGACY_SKEW_MS = 7 * 86400 * 1000;
    /** Small slack for timers computed from rounded times. */
    private const SLACK_MS = 2000;
    public const MAX_LEDGER = 1000;
    private const IMPORT_CAPS = ['xp' => 20000, 'coins' => 100000, 'items' => 20000, 'seeds' => 5000];
    private const SLOT = '(\d{4}-\d{2}-\d{2}):(breakfast|lunch|dinner)';
    /** Tallies the server counts itself from each accepted save (verified_stats). */
    private const COUNTED = ['harvest', 'cook', 'catch', 'order', 'help', 'steal', 'gift', 'checkin', 'photo', 'plant', 'collect', 'honey', 'boat', 'sell', 'earn', 'fruit', 'mushroom'];
    /** How much XP one of each could at least have earned: caps a copy's own claims (see baseTotals). */
    /** XP a garden may gain in one server day, however it is split into saves. */
    private const XP_PER_DAY = 20000;
    private const XP_PER = ['harvest' => 2, 'cook' => 15, 'catch' => 3, 'order' => 15, 'help' => 3, 'steal' => 2, 'gift' => 10, 'checkin' => 5, 'photo' => 5, 'plant' => 3, 'collect' => 2, 'honey' => 10, 'boat' => 6, 'fruit' => 2, 'mushroom' => 2];

    /** Upper bound for a decoration's slot on the painted farm (the game has fewer). */
    public const DECOR_SLOTS = 64;
    /** Days progress_events and guard_rejections are kept. */
    private const LOG_DAYS = 90;

    private static ?array $rules = null;
    private array $r;
    /** The refusal check() threw, [code, detail], for logRejection() once its transaction is gone. */
    public ?array $refused = null;

    /** `$nowMs` fixes the server clock (self-tests replay days of play in a moment). */
    public function __construct(private PDO $db, private int $user, private ?int $nowMs = null)
    {
        Schema::ensure($db);
        $this->r = self::rules();
    }

    public static function rules(): array
    {
        if (self::$rules === null) {
            $json = file_get_contents(APP_ROOT . '/server/data/game-rules.json');
            self::$rules = is_string($json) ? (json_decode($json, true) ?: []) : [];
            if (!self::$rules) {
                throw new RuntimeException('server/data/game-rules.json is missing (npm run rules:export).');
            }
        }
        return self::$rules;
    }

    // ——— Entry point ———

    /**
     * Validates `$new` against the stored row (null: first save). Returns what commit() needs;
     * throws HttpError 422 (with a `code`) when the save must be refused.
     */
    public function check(?array $row, array $new, ?int $clientNow): array
    {
        $serverMs = $this->nowMs ?? (int) floor(microtime(true) * 1000);
        $clientNow ??= $serverMs;
        if (abs($clientNow - $serverMs) > 400 * 86400 * 1000) {
            $this->reject('clock', 'device clock is more than a year off');
        }
        $offset = $clientNow - $serverMs;
        if ($this->nowMs === null) {
            // The game saves a few seconds after a change: far more often is a script.
            (new RateLimit($this->db))->hit(['save:' . $this->user => [1500, 3600]], __t('account.progressRejected'));
        }
        // Parts an older client may leave out: read as empty, never as a PHP warning.
        foreach (['animals', 'decor', 'cooked', 'unlockedRegions', 'unlockedCrops', 'decorLayout', 'decorSlots'] as $k) {
            $new[$k] ??= [];
        }
        foreach ((array) ($new['plots'] ?? []) as $i => $pl) {
            if (is_array($pl)) {
                $new['plots'][$i] += ['crop' => null, 'plantedAt' => null, 'readyAt' => null, 'wateredAt' => null];
            }
        }
        $this->shape($new);
        $guestId = (string) $new['guestId'];

        // One journey, one account: the same local garden cannot be copied into a second one.
        $st = $this->db->prepare('SELECT user_id FROM user_progress WHERE guest_id = ? AND user_id <> ? LIMIT 1');
        $st->execute([$guestId, $this->user]);
        if ($st->fetchColumn()) {
            $this->reject('owned', 'journey belongs to another account');
        }

        $old = $row ? json_decode((string) $row['data'], true) : null;
        if (!is_array($old) || ($old['guestId'] ?? null) !== $guestId) {
            return $this->import($new, $clientNow, $offset, is_array($old));
        }
        $prevOffset = $row['client_offset'] ?? null;
        if ($prevOffset !== null && abs($offset - (int) $prevOffset) > self::SKEW_MS) {
            $this->reject('clock', 'device clock moved since the last save');
        }
        // Small moves add up: a device clock may wander SKEW_MS in a day, not SKEW_MS a save
        // (twenty saves each nine minutes ahead would otherwise ripen crops three hours early).
        $drift = $prevOffset === null ? 0 : abs($offset - (int) $prevOffset);
        $driftKey = 'drift:' . intdiv(intdiv($serverMs, 1000), 86400);
        if ($drift > 0 && $this->counted($driftKey) + intdiv($drift, 1000) > intdiv(self::SKEW_MS, 1000)) {
            $this->reject('clock', 'device clock keeps moving');
        }
        $skew = $prevOffset === null ? self::LEGACY_SKEW_MS : self::SKEW_MS;
        $ctx = [
            'old' => $old,
            'new' => $new,
            'lower' => (int) $row['updated_at'] * 1000 + $offset - $skew,
            'upper' => $clientNow + self::FUTURE_MS,
            'offset' => $offset,
            'level' => self::level((int) $new['xp']),
            'elapsedMs' => max(0, $serverMs - (int) $row['updated_at'] * 1000),
            'serverMs' => $serverMs,
        ];
        $out = $this->diff($ctx) + ['guestId' => $guestId, 'clientAt' => $clientNow, 'offset' => $offset];
        if ($prevOffset === null) {
            // Saved before the guard existed: what that copy counted is where badges build on.
            $out['base'] = self::baseTotals($old, PHP_INT_MAX, $this->r);
        }
        if ($drift >= 1000) {
            $out['stats'][$driftKey] = intdiv($drift, 1000);
        }
        $out['stats'][self::dayKey('xpday', $serverMs)] = $out['gained'];
        $out['streakBase'] = $this->streakBase($ctx, $serverMs);
        return $out;
    }

    /** Records what an accepted save earned: claims, verified tallies, settled and delivered events. */
    public function commit(array $c): void
    {
        $sqlite = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
        $now = $this->nowMs !== null ? intdiv($this->nowMs, 1000) : time();
        if ($c['claims']) {
            $ins = $this->db->prepare(($sqlite ? 'INSERT OR IGNORE' : 'INSERT IGNORE') . ' INTO progress_claims (user_id, claim_key, created_at) VALUES (?, ?, ?)');
            foreach (array_unique($c['claims']) as $k) {
                $ins->execute([$this->user, substr($k, 0, 160), $now]);
            }
        }
        $add = $this->db->prepare($sqlite
            ? 'INSERT INTO verified_stats (user_id, metric, value) VALUES (?, ?, ?) ON CONFLICT(user_id, metric) DO UPDATE SET value = value + excluded.value'
            : 'INSERT INTO verified_stats (user_id, metric, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = value + VALUES(value)');
        foreach ($c['stats'] as $metric => $n) {
            if ($n > 0) {
                $add->execute([$this->user, $metric, $n]);
            }
        }
        $set = $this->db->prepare($sqlite
            ? 'INSERT INTO verified_stats (user_id, metric, value) VALUES (?, ?, ?) ON CONFLICT(user_id, metric) DO UPDATE SET value = excluded.value'
            : 'INSERT INTO verified_stats (user_id, metric, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)');
        foreach ($c['base'] as $metric => $n) {
            $set->execute([$this->user, 'base:' . $metric, $n]);
        }
        // The longest streak this garden has shown (a running maximum, not a sum).
        if (($c['streak'] ?? 0) > $this->longestStreak()) {
            $set->execute([$this->user, 'streakMax', (int) $c['streak']]);
        }
        if (isset($c['streakBase'])) {
            $set->execute([$this->user, 'streakBase', $c['streakBase'][0]]);
            $set->execute([$this->user, 'streakBaseDay', $c['streakBase'][1]]);
        }
        // Per-day tallies (clock drift, XP) are only read for today.
        if (random_int(1, 20) === 1) {
            $today = intdiv($now, 86400);
            $this->db->prepare("DELETE FROM verified_stats WHERE user_id = ? AND (metric LIKE 'drift:%' OR metric LIKE 'xpday:%' OR metric LIKE 'sky%:%') AND metric NOT IN (?, ?, ?, ?, ?)")
                ->execute([$this->user, "drift:$today", "xpday:$today", "skyxp:$today", "skyharvest:$today", "skydew:$today"]);
        }
        $this->log($c['fresh'] ?? [], $now);
        foreach (array_chunk($c['settle'], 100) as $ids) {
            $marks = implode(',', array_fill(0, count($ids), '?'));
            $this->db->prepare("UPDATE farm_events SET settled_at = ? WHERE from_user = ? AND type = 'present' AND settled_at IS NULL AND id IN ($marks)")
                ->execute([$now, $this->user, ...$ids]);
        }
        // An event counts as delivered once its effect is in a saved garden (not merely shown).
        foreach (array_chunk($c['deliver'], 100) as $ids) {
            $marks = implode(',', array_fill(0, count($ids), '?'));
            $this->db->prepare("UPDATE farm_events SET delivered_at = ? WHERE to_user = ? AND delivered_at IS NULL AND id IN ($marks)")
                ->execute([$now, $this->user, ...$ids]);
        }
    }

    /** Writes an accepted save's new entries to progress_events (see Schema v6). */
    private function log(array $fresh, int $now): void
    {
        $ip = self::ipHash();
        $ins = $this->db->prepare('INSERT INTO progress_events (user_id, entry_key, resource, delta, at_ms, saved_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?)');
        foreach ($fresh as $e) {
            $ins->execute([$this->user, substr((string) $e['key'], 0, 160), substr((string) $e['resource'], 0, 80), (int) $e['delta'], (int) $e['at'], $now, $ip]);
        }
        if (random_int(1, 200) === 1) {
            $this->db->prepare('DELETE FROM progress_events WHERE saved_at < ?')->execute([$now - self::LOG_DAYS * 86400]);
        }
    }

    /**
     * Records the refusal check() threw. Called after the save's transaction rolled back (a row
     * written inside it would be undone with the save).
     */
    public function logRejection(): bool
    {
        if ($this->refused === null) {
            return false;
        }
        $now = $this->nowMs !== null ? intdiv($this->nowMs, 1000) : time();
        [$code, $detail] = $this->refused;
        $this->db->prepare('INSERT INTO guard_rejections (user_id, code, detail, created_at, ip_hash) VALUES (?, ?, ?, ?, ?)')
            ->execute([$this->user, $code, mb_substr($detail, 0, 255), $now, self::ipHash()]);
        if (random_int(1, 50) === 1) {
            $this->db->prepare('DELETE FROM guard_rejections WHERE created_at < ?')->execute([$now - self::LOG_DAYS * 86400]);
        }
        return true;
    }

    /** The caller's address as a short keyed hash (null from the command line). */
    private static function ipHash(): ?string
    {
        return PHP_SAPI === 'cli' ? null : substr(secret_hash('ip:' . client_ip()), 0, 16);
    }

    /**
     * The same garden on a device whose clock was moved by `$delta` ms: every time in it moves
     * by the same amount, so what was left to grow, to brew or to sail stays exactly as long —
     * changing the clock gains nothing. Used by Account::rebaseProgress().
     */
    public static function shiftTimes(array $p, int $delta): array
    {
        $move = fn ($v) => is_int($v) ? $v + $delta : $v;
        foreach ($p['plots'] ?? [] as $i => $pl) {
            if (is_array($pl)) {
                foreach (['plantedAt', 'readyAt', 'wateredAt'] as $k) {
                    $p['plots'][$i][$k] = $move($pl[$k] ?? null);
                }
            }
        }
        foreach ($p['animals'] ?? [] as $id => $a) {
            if (is_array($a)) {
                $p['animals'][$id] = ['fedAt' => $move($a['fedAt'] ?? null), 'readyAt' => $move($a['readyAt'] ?? null)];
            }
        }
        foreach (['hive' => ['startedAt', 'readyAt'], 'boat' => ['sentAt', 'returnAt']] as $k => $pair) {
            if (is_array($p[$k] ?? null)) {
                foreach ($pair as $f) {
                    $p[$k][$f] = $move($p[$k][$f] ?? null);
                }
            }
        }
        foreach ($p['ledger'] ?? [] as $i => $e) {
            if (is_array($e)) {
                $p['ledger'][$i]['at'] = $move($e['at'] ?? null);
            }
        }
        foreach ($p['history'] ?? [] as $i => $h) {
            if (is_array($h)) {
                $p['history'][$i]['at'] = $move($h['at'] ?? null);
            }
        }
        if (is_array($p['meal'] ?? null)) {
            $p['meal']['chosenAt'] = $move($p['meal']['chosenAt'] ?? null);
        }
        if (is_array($p['reminder'] ?? null)) {
            $p['reminder']['at'] = $move($p['reminder']['at'] ?? null);
        }
        if (is_array($p['sky'] ?? null)) {
            $p['sky'] = self::shiftSky($p['sky'], $delta);
        }
        return $p;
    }

    // ——— A journey seen for the first time ———

    private function import(array $new, int $clientNow, int $offset, bool $replacing = false): array
    {
        if ($this->nowMs === null) {
            // A garden replacing the account's own (the guest chose this device's copy) is rare.
            (new RateLimit($this->db))->hit(
                ['import:' . $this->user => [3, 7 * 86400]] + ($replacing ? ['import-replace:' . $this->user => [2, 7 * 86400]] : []),
                __t('account.progressRejected'),
            );
        }
        if (!empty($new['sky'])) {
            // Vườn Mây is played on an account only, and bringing a guest's in is still off (Q5).
            $this->reject('import', 'a garden with a sky branch cannot be imported');
        }
        $xp = (int) $new['xp'];
        $items = array_sum(array_map('intval', $new['ingredients']));
        $seeds = array_sum(array_map('intval', $new['seeds']));
        if ($xp > self::IMPORT_CAPS['xp'] || (int) $new['coins'] > self::IMPORT_CAPS['coins']
            || $items > self::IMPORT_CAPS['items'] || $seeds > self::IMPORT_CAPS['seeds']) {
            $this->reject('import', 'imported garden exceeds what a new account may bring');
        }
        $level = self::level($xp);
        $this->unlocksFit($new, $level);
        $upper = $clientNow + self::FUTURE_MS;
        foreach ($this->timers($new) as $t) {
            if ($t !== null && $t > $upper + 30 * 86400 * 1000) {
                $this->reject('clock', 'imported timer far in the future');
            }
        }
        $claims = [];
        foreach ($new['ledger'] as $e) {
            if (self::claimable($e)) {
                $claims[] = (string) $e['key'];
            }
        }
        // What the copy already holds beyond its ledger's tail: badge tiers (later tiers follow
        // them in order) and the crops it has grown ("Vườn trăm thứ").
        foreach ((array) ($new['quests']['badges'] ?? []) as $id => $tier) {
            for ($n = 1; isset($this->r['badges'][$id]) && $n <= min((int) $tier, count($this->r['badges'][$id]['tiers'])); $n++) {
                $claims[] = "badge:$id:$n";
            }
        }
        foreach (self::grownCrops($new, $this->r) as $c) {
            $claims[] = "grown:$c";
        }
        // What badges may build on; never what invite rewards are paid from. A garden replacing
        // the account's own never raises what that one had already shown.
        $base = self::baseTotals($new, $xp, $this->r, $clientNow);
        if ($replacing) {
            $st = $this->db->prepare("SELECT metric FROM verified_stats WHERE user_id = ? AND metric LIKE 'base:%'");
            $st->execute([$this->user]);
            foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $m) {
                unset($base[substr((string) $m, 5)]);
            }
        }
        return [
            'mode' => 'import',
            'fresh' => [['key' => 'import:' . count($new['ledger']), 'resource' => 'import', 'delta' => $xp, 'at' => $clientNow]],
            'guestId' => (string) $new['guestId'],
            'clientAt' => $clientNow,
            'offset' => $offset,
            'claims' => $claims,
            'stats' => [],
            'base' => $base,
            'settle' => [],
            'deliver' => [],
            'streakBase' => [(int) ($new['streak']['count'] ?? 0), self::serverDay($this->nowMs ?? (int) floor(microtime(true) * 1000))],
        ];
    }

    /**
     * Tallies a copy claims (quests.total), held to what its XP could have earned (`$xp`;
     * PHP_INT_MAX for a copy the server already accepted). Base for badges only.
     */
    public static function baseTotals(array $p, int $xp, array $R, ?int $nowMs = null): array
    {
        $total = is_array($p['quests']['total'] ?? null) ? $p['quests']['total'] : [];
        $cap = fn (string $m, int $div) => max(0, min((int) ($total[$m] ?? 0), $xp === PHP_INT_MAX ? PHP_INT_MAX : intdiv($xp, $div)));
        $out = [];
        foreach (self::XP_PER as $m => $div) {
            $out[$m] = $cap($m, $div);
        }
        // Market tallies earn no XP: held to the xu the copy could have made instead.
        $out['sell'] = max(0, min((int) ($total['sell'] ?? 0), $xp === PHP_INT_MAX ? PHP_INT_MAX : $xp * 2));
        $out['earn'] = max(0, min((int) ($total['earn'] ?? 0), $xp === PHP_INT_MAX ? PHP_INT_MAX : $xp * 20));
        $out['variety'] = count(self::grownCrops($p, $R));
        $out['streakMax'] = max(0, min((int) ($p['streak']['count'] ?? 0), $xp === PHP_INT_MAX ? 100_000 : 30));
        // Watering and full quest days are not in the ledger: held to the garden's age (the
        // same 15 cans a day the badge allows later), and to one full day per day.
        $created = (int) ($p['createdAt'] ?? 0);
        $now = $nowMs ?? (int) floor(microtime(true) * 1000);
        $days = $created > 0 ? min(400, max(0, intdiv($now - $created, 86_400_000))) + 1 : 1;
        $out['water'] = max(0, min((int) ($total['water'] ?? 0), 15 * $days));
        $out['allDaily'] = max(0, min((int) ($total['allDaily'] ?? 0), $days));
        return $out;
    }

    /** The crops a copy says it has grown, as known crop ids without repeats. */
    private static function grownCrops(array $p, array $R): array
    {
        $out = [];
        foreach ((array) ($p['grown'] ?? []) as $c) {
            if (is_string($c) && isset($R['crops'][$c])) {
                $out[$c] = true;
            }
        }
        return array_keys($out);
    }

    // ——— A save of the same journey ———

    private function diff(array $ctx): array
    {
        $old = $ctx['old'];
        $new = $ctx['new'];
        $oldLedger = is_array($old['ledger'] ?? null) ? $old['ledger'] : [];
        $oldByKey = [];
        foreach ($oldLedger as $e) {
            if (is_array($e) && isset($e['key'])) {
                $oldByKey[(string) $e['key']] = $e;
            }
        }
        // New entries: everything after the stored ledger. Old entries may not change.
        $fresh = [];
        $seen = [];
        $lastOld = $oldLedger ? (string) (end($oldLedger)['key'] ?? '') : null;
        $foundLast = $lastOld === null;
        foreach ($new['ledger'] as $e) {
            $key = (string) $e['key'];
            if (isset($seen[$key])) {
                $this->reject('rule', "duplicate ledger key $key");
            }
            $seen[$key] = true;
            if (isset($oldByKey[$key])) {
                if ($fresh || (int) $oldByKey[$key]['delta'] !== (int) $e['delta'] || (string) $oldByKey[$key]['resource'] !== (string) $e['resource']) {
                    $this->reject('rule', "ledger entry $key rewritten");
                }
                if ($key === $lastOld) {
                    $foundLast = true;
                }
                continue;
            }
            $fresh[] = $e;
        }
        if (!$foundLast) {
            $this->reject('gap', 'saved ledger entries are missing');
        }
        // One spelling per number: "e05", "01" or "-0" would be a new key (a new claim) for the
        // same event, cycle or tier.
        foreach ($fresh as $e) {
            foreach (explode(':', (string) $e['key']) as $part) {
                if (preg_match('/^(?:e|r)?(-?\d+)$/', $part, $m) && $m[1] !== (string) (int) $m[1]) {
                    $this->reject('rule', "ledger key {$e['key']} spells a number oddly");
                }
            }
        }

        // Balances: stored value + new deltas, exactly.
        $sum = [];
        foreach ($fresh as $e) {
            $sum[(string) $e['resource']] = ($sum[(string) $e['resource']] ?? 0) + (int) $e['delta'];
        }
        $resources = array_merge(['xp', 'coin'], array_keys($sum));
        foreach (['seeds' => 'seed', 'ingredients' => 'ingredient'] as $field => $kind) {
            foreach (array_keys(($old[$field] ?? []) + $new[$field]) as $id) {
                $resources[] = "$kind:$id";
            }
        }
        $resources = array_merge($resources, self::skyResources($old, $new));
        foreach (array_unique($resources) as $res) {
            if ($res === 'stamp') {
                continue;
            }
            $before = self::balance($old, $res);
            $after = self::balance($new, $res);
            if ($after !== $before + ($sum[$res] ?? 0)) {
                $this->reject('balance', "$res is $after, expected " . ($before + ($sum[$res] ?? 0)));
            }
        }

        // Times: inside the window since the last save, in order.
        $prev = PHP_INT_MIN;
        foreach ($fresh as $e) {
            $at = (int) $e['at'];
            if ($at < $ctx['lower'] || $at > $ctx['upper']) {
                $this->reject('clock', "entry {$e['key']} dated outside this save's window");
            }
            if ($at < $prev - 5000) {
                $this->reject('clock', "entry {$e['key']} goes back in time");
            }
            $prev = max($prev, $at);
        }

        $claimed = $this->claimed(array_map(fn ($e) => (string) $e['key'], $fresh));
        foreach ($fresh as $e) {
            if (isset($claimed[(string) $e['key']])) {
                $this->reject('replay', "reward {$e['key']} was already paid");
            }
        }
        $out = $this->entries($ctx, $fresh, $new['ledger']);
        $this->stateFits($ctx, $fresh, $out);
        $sky = $out['sky'];

        $gained = 0;
        foreach ($fresh as $e) {
            if ($e['resource'] === 'xp' && (int) $e['delta'] > 0) {
                $gained += (int) $e['delta'];
            }
        }
        // Backstop on top of the rules: more than any real session could earn, in one save and
        // over the server's day (many quick saves must not add up past it).
        if ($gained > 2000 + intdiv($ctx['elapsedMs'], 3_600_000) * 800) {
            $this->reject('rule', "XP gained ($gained) too fast");
        }
        if ($gained > 0 && $this->counted(self::dayKey('xpday', $ctx['serverMs'])) + $gained > self::XP_PER_DAY) {
            $this->reject('rule', 'more XP than a day of play earns');
        }
        $earned = 0;
        foreach ($fresh as $e) {
            if ($e['resource'] === 'xp' && (int) $e['delta'] > 0 && !preg_match('/^(quest|badge|chest|friend):/', (string) $e['key'])) {
                $earned += (int) $e['delta'];
            }
        }
        $out['stats']['xp'] = $earned;
        // Vườn Mây day tallies (sky XP cap, harvests for the daily cloud seed, dew made).
        if ($sky['xp'] > 0) {
            $out['stats'][self::dayKey('skyxp', $ctx['serverMs'])] = $sky['xp'];
        }
        if ($sky['harvests']) {
            $out['stats'][self::dayKey('skyharvest', $ctx['serverMs'])] = count($sky['harvests']);
        }
        if ($this->skyDew > 0) {
            $out['stats'][self::dayKey('skydew', $ctx['serverMs'])] = $this->skyDew;
        }
        $out['streak'] = (int) ($new['streak']['count'] ?? 0);
        $out['claims'] = array_values(array_merge(
            array_map(fn ($e) => (string) $e['key'], array_filter($fresh, [self::class, 'claimable'])),
            // Every crop ever harvested here, for "Vườn trăm thứ".
            array_map(fn ($c) => "grown:$c", $out['grown']),
        ));
        $out['mode'] = 'diff';
        $out['fresh'] = $fresh;
        $out['base'] = [];
        $out['gained'] = $gained;
        return $out;
    }

    /** Every new entry that pays something must follow one of the game's rules. */
    private function entries(array $ctx, array $fresh, array $ledger): array
    {
        $R = $this->r;
        $old = $ctx['old'];
        $new = $ctx['new'];
        $level = $ctx['level'];
        $S = self::SLOT;
        // A building's level before and after this save: a yield may use either (it can be
        // upgraded in the same save, before or after the collection).
        $up = fn (string $id, array $p) => (int) ($p['upgrades'][$id] ?? 0);
        $upOk = fn (string $id, int $extra) => $extra >= $up($id, $old) && $extra <= $up($id, $new);
        $byKey = [];
        foreach ($fresh as $e) {
            $byKey[(string) $e['key']] = $e;
        }
        $stats = array_fill_keys(self::COUNTED, 0);
        $grown = [];
        $settle = [];
        $deliver = [];
        $cooked = [];
        $plantings = []; // "plot:T" => crop
        $regrows = [];   // "plot:T" => crop (a tree/mushroom harvest restarts the cycle at T)
        $fed = [];       // "animal:T"
        $hiveRestarts = [];
        $checkins = [];  // non-skipped check-ins: at => used
        $stamps = ['discovered' => [], 'eaten' => []];
        $decor = [];
        $lands = [];     // plot id => cleared in this save
        $upgrades = [];  // building => levels bought in this save
        $harvests = [];  // plot => [{t, at, kind}]
        $collects = [];  // animal => [fedAt => at]
        $hiveRuns = [];  // startedAt => emptied at
        $boatTrips = []; // sentAt => back at

        // Evidence first: plantings, feeding, check-ins (rewards are checked against them below).
        foreach ($fresh as $e) {
            $key = (string) $e['key'];
            $at = (int) $e['at'];
            // A planting spends one seed of the crop it plants; feeding spends one of the feed.
            $seedSpent = (int) $e['delta'] === -1 && self::sub((string) $e['resource'], 'seed') !== '';
            if (preg_match('/^tray:(\d+):(-?\d+)$/', $key, $m) && (int) $m[2] === $at) {
                $seedSpent || $this->reject('rule', "$key: a planting spends one seed");
                $plantings["{$m[1]}:$at"] = self::sub((string) $e['resource'], 'seed');
                $stats['plant']++;
            } elseif (preg_match("/^plant:$S$/", $key) && preg_match('/^plot:(\d+)$/', (string) $e['reason'], $m)) {
                $seedSpent || $this->reject('rule', "$key: a planting spends one seed");
                $plantings["{$m[1]}:$at"] = self::sub((string) $e['resource'], 'seed');
                $stats['plant']++;
            } elseif (preg_match('/^feed:([a-z]+):(-?\d+)$/', $key, $m) && (int) $m[2] === $at) {
                $a = $R['animals'][$m[1]] ?? null;
                ($a !== null && (int) $e['delta'] === -1 && $e['resource'] === "ingredient:{$a['feed']}")
                    || $this->reject('rule', "$key: feeding spends one of the animal's feed");
                $fed["{$m[1]}:$at"] = true;
            } elseif (preg_match("/^checkin:$S$/", $key) && (int) $e['delta'] !== (int) $R['xp']['checkinSkipped']) {
                $checkins[$at] = false;
            }
        }

        $sky = $this->skyEntries($ctx, $fresh, $byKey);
        $events = $this->events($fresh);
        $catches = [];
        $catchKeys = [];
        foreach ($ledger as $e) {
            if (preg_match('/^catch:\d+$/', (string) $e['key'])) {
                $catches[] = (int) $e['at'];
                $catchKeys[(string) $e['key']] = true;
            }
        }
        $xpRun = (int) $old['xp'];
        foreach ($fresh as $e) {
            $key = (string) $e['key'];
            $res = (string) $e['resource'];
            $d = (int) $e['delta'];
            $at = (int) $e['at'];
            $lvBefore = self::level($xpRun);
            if ($res === 'xp') {
                $xpRun += $d;
            }
            $fail = fn (string $why) => $this->reject('rule', "$key: $why");

            if (preg_match("/^seed:$S:r(\d+)$/", $key, $m)) {
                // The dish's seed: usually a starting crop, sometimes one its recipe needs.
                if ($d !== 1 || !isset($R['crops'][self::sub($res, 'seed')])) {
                    $fail('a meal pays one seed');
                }
                $this->slotDate($m[1], $at) || $fail('meal slot is not today');
                $grants = $this->countClaims("seed:{$m[1]}:{$m[2]}:r%", fn ($k) => !str_ends_with($k, ':reverse'));
                $reversals = $this->countClaims("seed:{$m[1]}:{$m[2]}:r%", fn ($k) => str_ends_with($k, ':reverse'));
                foreach ($fresh as $f) {
                    if (preg_match("/^seed:{$m[1]}:{$m[2]}:r\d+(:reverse)?$/", (string) $f['key'], $mm)) {
                        isset($mm[1]) ? $reversals++ : $grants++;
                    }
                }
                $grants <= $reversals + 1 || $fail('more than one seed for a meal');
            } elseif (preg_match("/^seed:$S:r\d+:reverse$/", $key)) {
                // Switching dish hands the pending seed back: a reversal takes one seed.
                ($d === -1 && self::sub($res, 'seed') !== '') || $fail('a reversal takes the seed back');
            } elseif (preg_match("/^xp:choose:$S$/", $key, $m)) {
                $d === (int) $R['xp']['chooseDish'] || $fail('choose XP');
                $this->slotDate($m[1], $at) || $fail('meal slot is not today');
            } elseif (preg_match('/^harvest:(\d+):(-?\d+)$/', $key, $m)) {
                $crop = self::sub($res, 'ingredient');
                $cycle = $this->cycle($old, $plantings, $regrows, (int) $m[1], (int) $m[2], $crop);
                $cycle !== null || $fail('no planting of this crop on this plot');
                $def = $R['crops'][$crop];
                $stolen = $this->stolen((int) $m[1], (int) $m[2]);
                $max = max(1, (int) $def['yield'] - ($stolen ? 1 : 0));
                ($d >= 1 && $d <= $max) || $fail("yield $d over $max");
                $grow = $cycle['regrow'] ? (int) ($def['regrowMs'] ?? $def['growMs']) : (int) $def['growMs'];
                $ready = (int) $m[2] + $this->minReady($grow, $this->friendWaters((int) $m[1], (int) $m[2], $at, $ctx['offset']));
                if ($at + self::SLACK_MS < $ready
                    && !($cycle['readyAt'] !== null && $cycle['readyAt'] <= $at + self::SLACK_MS)
                    && !$this->useCheckin($checkins, (int) $m[2], $at)) {
                    $fail('harvested before it could ripen');
                }
                if (in_array($def['kind'], ['tree', 'mushroom'], true)) {
                    $regrows["{$m[1]}:$at"] = $crop;
                }
                $harvests[(int) $m[1]][] = ['t' => (int) $m[2], 'at' => $at, 'kind' => $def['kind']];
                $stats['harvest']++;
                $stats['fruit'] += $def['kind'] === 'tree' ? 1 : 0;
                $stats['mushroom'] += $def['kind'] === 'mushroom' ? 1 : 0;
                $grown[$crop] = true;
            } elseif (preg_match('/^xp:harvest:(\d+):(-?\d+)$/', $key, $m)) {
                $h = $byKey["harvest:{$m[1]}:{$m[2]}"] ?? null;
                $h !== null || $fail('XP without its harvest');
                $def = $R['crops'][self::sub((string) $h['resource'], 'ingredient')];
                $ok = [self::harvestXp((int) $def['growMs'])];
                if ($def['regrowMs'] !== null) {
                    $ok[] = self::harvestXp((int) $def['regrowMs']);
                }
                in_array($d, $ok, true) || $fail('harvest XP');
            } elseif (preg_match('/^catch:(\d+)$/', $key, $m)) {
                $castAt = (int) $m[1];
                $kind = self::sub($res, 'ingredient');
                ($d === 1 && $kind === $this->catchFor($castAt, $lvBefore)) || $fail('not what bites on this cast');
                $age = $at - $castAt;
                ($age >= $this->biteDelay($castAt) - 1500 && $age <= (int) $R['fishing']['maxCastMs']) || $fail('caught before the bite');
                // Counted from the server's own record too: a ledger can leave old catches out.
                $recent = count(array_filter($catches, fn ($t) => $t > $at - 86_400_000 && $t <= $at));
                $recent += count(array_filter(
                    $this->claimKeysBetween('catch:', $at - 86_400_000, $at),
                    fn ($k) => !isset($catchKeys[$k]),
                ));
                $recent <= 2 * (int) $R['fishing']['perDay'] || $fail('more catches than a day allows');
                $stats['catch']++;
            } elseif (preg_match('/^xp:catch:(\d+)$/', $key, $m)) {
                ($d === (int) $R['xp']['catch'] && isset($byKey["catch:{$m[1]}"])) || $fail('catch XP');
            } elseif (preg_match('/^cook:([a-z0-9-]+):(-?\d+):xp$/', $key, $m)) {
                $debits = [];
                foreach ($fresh as $f) {
                    if (str_starts_with((string) $f['key'], "cook:{$m[1]}:{$m[2]}:") && $f['key'] !== $key) {
                        ((int) $f['delta'] < 0 && str_starts_with((string) $f['resource'], 'ingredient:')) || $fail('cooking only spends pantry items');
                        $debits[self::sub((string) $f['resource'], 'ingredient')] = -(int) $f['delta'];
                    }
                }
                $builtin = $R['recipes'][$m[1]] ?? null;
                if ($builtin) {
                    $want = array_column($builtin['ingredients'], 'qty', 'id');
                    ksort($want);
                    ksort($debits);
                    ($debits === $want && $d === (int) $builtin['xp']) || $fail('not this recipe');
                } else {
                    // A catalogue dish's recipe: the dish must exist (its ingredients may have been
                    // edited since the guest's copy was loaded, so only the size is checked).
                    $this->dishExists($m[1]) || $fail('no such dish to cook');
                    $pieces = array_sum($debits);
                    (count($debits) >= 1 && count($debits) <= 6 && max($debits) <= 3 && $d === self::recipeXp($pieces)) || $fail('recipe XP');
                }
                $cooked[$m[1]] = ($cooked[$m[1]] ?? 0) + 1;
                $stats['cook']++;
            } elseif (preg_match('/^order:(\d{4}-\d{2}-\d{2}):(\d+):xp$/', $key, $m)) {
                ($d >= 1 && $d <= (int) $R['orders']['maxXp']) || $fail('order XP');
                $this->slotDate($m[1], $at) || $fail('order is not today');
                $debits = 0;
                $seeds = 0;
                foreach ($fresh as $f) {
                    $fk = (string) $f['key'];
                    if (!str_starts_with($fk, "order:{$m[1]}:{$m[2]}:") || $fk === $key) {
                        continue;
                    }
                    if (str_starts_with($fk, "order:{$m[1]}:{$m[2]}:seed:")) {
                        $seeds += (int) $f['delta'];
                        $this->available(self::sub((string) $f['resource'], 'seed'), $level) || $fail('order seed not open');
                    } elseif ((int) $f['delta'] < 0) {
                        $debits++;
                    }
                }
                ($debits >= 2 && $seeds <= (int) $R['orders']['maxSeeds']) || $fail('order without its produce');
                $count = $this->countClaims("order:{$m[1]}:%", fn ($k) => str_ends_with($k, ':xp')) + 1;
                $count <= (int) $R['orders']['perDay'] || $fail('more orders than a day has');
                $stats['order']++;
            } elseif (preg_match('/^event:([a-z-]+):(\d+):(coin|xp)$/', $key, $m)) {
                // An event milestone: its guest served on enough days of the event.
                $e = $R['events'][$m[1]] ?? null;
                $step = (int) $m[2];
                ($e !== null && isset($e['targets'][$step], $R['event']['rewards'][$step])) || $fail('unknown event milestone');
                ($res === $m[3] && $d === (int) $R['event']['rewards'][$step][$m[3] === 'coin' ? 'coins' : 'xp']) || $fail('event reward');
                $slot = (int) $R['event']['slot'];
                $days = [];
                foreach ($this->claimKeys("guest:%:$slot:coin") as $k) {
                    $days[explode(':', $k)[1]] = true;
                }
                foreach ($fresh as $f) {
                    if (preg_match("/^guest:(\d{4}-\d{2}-\d{2}):$slot:coin$/", (string) $f['key'], $g)) {
                        $days[$g[1]] = true;
                    }
                }
                $in = count(array_filter(array_keys($days), fn ($day) => $day >= $e['from'] && $day <= $e['to']));
                $in >= (int) $e['targets'][$step] || $fail('event milestone not reached');
                if ($m[3] === 'coin') {
                    $stats['earn'] += $d;
                }
            } elseif (preg_match('/^upgrade:([a-z]+):(\d+)$/', $key, $m)) {
                // A building's next level, for its price; levels are bought in order.
                $prices = $R['upgrades'][$m[1]] ?? null;
                $lvl = (int) $m[2];
                ($prices !== null && $lvl >= 1 && $lvl <= count($prices) && $res === 'coin' && $d === -(int) $prices[$lvl - 1]) || $fail('upgrade price');
                ($lvl > $up($m[1], $old) && $lvl <= $up($m[1], $new)) || $fail('upgrade level');
                $upgrades[$m[1]][] = $lvl;
            } elseif (preg_match('/^collection:([a-z-]+):(coin|xp)$/', $key, $m)) {
                // A finished collection: every dish of the set the game still has was cooked.
                $set = $R['collections'][$m[1]] ?? null;
                $set !== null || $fail('unknown collection');
                $kept = 0;
                foreach ($set as $id) {
                    if (isset($R['recipes'][$id]) || $this->dishExists($id)) {
                        $kept++;
                        ((int) ($new['cooked'][$id] ?? 0) > 0) || $fail('collection not complete');
                    }
                }
                $kept > 0 || $fail('collection not complete');
                $per = $m[2] === 'coin' ? (int) $R['collectionReward']['coinsPerDish'] : (int) $R['collectionReward']['xpPerDish'];
                ($res === $m[2] && $d === $per * count($set)) || $fail('collection reward');
                if ($m[2] === 'coin') {
                    $stats['earn'] += $d;
                }
            } elseif (preg_match('/^guest:(\d{4}-\d{2}-\d{2}):(\d+):(coin|xp)$/', $key, $m)) {
                // A guest served: the dish was cooked in this same moment, and pays what its
                // ingredients sell for times payPct%, plus the mastery bonus (src/domain/guests.ts).
                $G = $R['guests'];
                // The event guest (slot event.slot) comes only while an event runs, for one of its dishes.
                $event = self::eventOn($m[1]);
                $isEvent = (int) $m[2] === (int) $R['event']['slot'];
                ((int) $m[2] < (int) $G['perDay'] || ($isEvent && $event !== null)) || $fail('no such guest');
                $this->slotDate($m[1], $at) || $fail('guest is not today');
                $dish = null;
                $value = 0;
                foreach ($fresh as $f) {
                    if (preg_match('/^cook:([a-z0-9-]+):(-?\d+):([a-z]+)$/', (string) $f['key'], $c) && (int) $c[2] === $at && $c[3] !== 'xp') {
                        $dish = $c[1];
                        $value += -(int) $f['delta'] * (int) ($R['sell'][$c[3]] ?? 0);
                    }
                }
                $dish !== null || $fail('a guest served nothing');
                (!$isEvent || in_array($dish, $event['recipes'], true)) || $fail('not an event dish');
                if ($m[3] === 'xp') {
                    ($res === 'xp' && $d === (int) $G['xp']) || $fail('guest XP');
                } else {
                    $pay = self::guestPay($value, (int) ($new['cooked'][$dish] ?? 0), $isEvent);
                    ($res === 'coin' && $d === $pay) || $fail('guest pay');
                    $count = $this->countClaims("guest:{$m[1]}:%", fn ($k) => str_ends_with($k, ':coin')) + 1;
                    $count <= (int) $G['perDay'] + 1 || $fail('more guests than a day has');
                    $stats['earn'] += $d;
                }
            } elseif (preg_match('/^order:(\d{4}-\d{2}-\d{2}:\d+):seed:([a-z]+)$/', $key, $m)) {
                // Paid with its order (whose XP entry checks the order as a whole), never alone.
                (isset($byKey["order:{$m[1]}:xp"]) && $res === "seed:{$m[2]}" && $d >= 1 && $d <= (int) $R['orders']['maxSeeds'])
                    || $fail('order seed without its order');
            } elseif (preg_match("/^photo:$S$/", $key, $m)) {
                $d === (int) $R['xp']['checkinPhoto'] || $fail('photo XP');
                (isset($byKey["checkin:{$m[1]}:{$m[2]}"]) || $this->countClaims("checkin:{$m[1]}:{$m[2]}") > 0) || $fail('photo of a meal never checked in');
                $stats['photo']++;
            } elseif (preg_match("/^checkin:$S$/", $key, $m)) {
                in_array($d, [(int) $R['xp']['checkinAte'], (int) $R['xp']['checkinSwapped'], (int) $R['xp']['checkinSkipped']], true) || $fail('check-in XP');
                $this->slotDate($m[1], $at) || $fail('check-in is not today');
                $stats['checkin']++;
            } elseif (preg_match('/^stamp:(discovered|eaten):([a-z0-9-]{1,80})$/', $key, $m)) {
                $res === 'stamp' || $fail('stamp');
                $stamps[$m[1]][] = $m[2];
            } elseif (preg_match('/^unlock:crop:([a-z]+)$/', $key, $m)) {
                $def = $R['crops'][$m[1]] ?? null;
                ($def && $d === 1 && $res === "seed:{$m[1]}" && (int) $def['unlockLevel'] > 1 && (int) $def['unlockLevel'] <= $level) || $fail('crop not unlocked');
            } elseif (preg_match('/^quest:(\d{4}-\d{2}-\d{2}):([a-z0-9-]+)(:coin|:seed:(\d+))?$/', $key, $m)) {
                $q = $R['quests'][$m[2]] ?? null;
                $q !== null || $fail('unknown quest');
                $this->rewardPart($m[3] ?? '', $m[4] ?? null, $res, $d, $q, $level) || $fail('not this quest\'s reward');
                (($m[3] ?? '') === '' || isset($byKey["quest:{$m[1]}:{$m[2]}"])) || $fail('reward part without its quest');
                // A daily quest is the device's today; a weekly one is keyed by the week's Monday.
                $q['weekly']
                    ? ($this->isMonday($m[1]) && $this->inWeek($m[1], $at)) || $fail('quest week is not now')
                    : $this->slotDate($m[1], $at, 1.2) || $fail('quest day is not now');
                if (($m[3] ?? '') === '') {
                    $same = $this->countClaims("quest:{$m[1]}:%", fn ($k) => preg_match('/^quest:[0-9-]+:[a-z0-9-]+$/', $k) === 1
                        && (($R['quests'][explode(':', $k)[2]]['weekly'] ?? false) === $q['weekly']));
                    foreach ($fresh as $f) {
                        if (preg_match("/^quest:{$m[1]}:([a-z0-9-]+)$/", (string) $f['key'], $mm) && (($R['quests'][$mm[1]]['weekly'] ?? false) === $q['weekly'])) {
                            $same++;
                        }
                    }
                    $same <= ($q['weekly'] ? (int) $R['weeklyCount'] : (int) $R['dailyCount']) || $fail('more quests than the period has');
                }
            } elseif (preg_match('/^badge:([a-z]+):(\d+)(:coin|:seed:(\d+))?$/', $key, $m)) {
                $b = $R['badges'][$m[1]] ?? null;
                $tier = (int) $m[2];
                ($b !== null && $tier >= 1 && $tier <= count($b['tiers'])) || $fail('unknown badge tier');
                // Today's table, or the one before it (a client still running the older build).
                $ok = false;
                foreach ([$b['rewards'][$tier - 1], $b['legacyRewards'][$tier - 1] ?? null] as $reward) {
                    $ok = $ok || ($reward !== null && $this->rewardPart($m[3] ?? '', $m[4] ?? null, $res, $d, $reward, $level));
                }
                $ok || $fail('not this badge\'s reward');
                (($m[3] ?? '') === '' || isset($byKey["badge:{$m[1]}:{$m[2]}"])) || $fail('reward part without its badge');
                if (($m[3] ?? '') === '') {
                    ($tier === 1 || isset($byKey["badge:{$m[1]}:" . ($tier - 1)]) || $this->countClaims("badge:{$m[1]}:" . ($tier - 1)) > 0) || $fail('tiers are claimed in order');
                    $this->badgeValue($b['metric'], $ctx, $stats, $grown, $fresh) >= (int) $b['tiers'][$tier - 1] || $fail('badge goal not reached');
                }
            } elseif (preg_match('/^chest:(\d{4}-\d{2}-\d{2}):(\d+)(:coin|:seed:(\d+))?$/', $key, $m)) {
                $chest = $R['chests'][$m[2]] ?? null;
                $chest !== null || $fail('no chest at this streak');
                $this->rewardPart($m[3] ?? '', $m[4] ?? null, $res, $d, $chest, $level) || $fail('not this chest');
                (($m[3] ?? '') === '' || isset($byKey["chest:{$m[1]}:{$m[2]}"])) || $fail('reward part without its chest');
                if (($m[3] ?? '') === '') {
                    $n = (int) $m[2];
                    // The streak reached that day (it may have dropped since; the chest waits).
                    $n <= max((int) ($new['streak']['count'] ?? 0), (int) ($old['streak']['count'] ?? 0), $this->longestStreak()) || $fail('streak never reached this chest');
                    // Opened within two weeks of the day it came, and that milestone at most once per its own length.
                    ($this->slotDate($m[1], $at, 15) && strtotime($m[1] . ' 12:00:00 UTC') * 1000 <= $at + 86_400_000) || $fail('chest date is not recent');
                    $day = intdiv((int) strtotime($m[1] . ' 12:00:00 UTC'), 86400);
                    foreach ($this->claimKeys("chest:%:$n") as $k) {
                        if (preg_match('/^chest:(\d{4}-\d{2}-\d{2}):\d+$/', $k, $cm) && abs(intdiv((int) strtotime($cm[1] . ' 12:00:00 UTC'), 86400) - $day) < $n) {
                            $fail('this chest was opened too recently');
                        }
                    }
                }
            } elseif (preg_match('/^friend:e(\d+):(xp|seed|item|coin|seen)$/', $key, $m)) {
                $ev = $events[(int) $m[1]] ?? null;
                ($ev !== null && (int) $ev['to_user'] === $this->user) || $fail('no such event for this garden');
                $this->friendReward($ev, $m[2], $res, $d) || $fail('not what this event gives');
                $deliver[] = (int) $m[1];
                if ($ev['type'] === 'helped' && $m[2] === 'xp') {
                    $stats['help']++;
                }
                if ($ev['type'] === 'stole' && $m[2] === 'item') {
                    $stats['steal']++;
                }
            } elseif (preg_match('/^present:e(\d+)$/', $key, $m)) {
                $ev = $events[(int) $m[1]] ?? null;
                ($ev !== null && (int) $ev['from_user'] === $this->user && $ev['type'] === 'present' && $res === "seed:{$ev['crop']}" && $d === -1) || $fail('not a seed this garden sent');
                $settle[] = (int) $m[1];
                $stats['gift']++;
            } elseif (preg_match('/^collect:([a-z]+):(-?\d+)$/', $key, $m)) {
                $a = $R['animals'][$m[1]] ?? null;
                $a !== null || $fail('unknown animal');
                $t = (int) $m[2];
                ($res === "ingredient:{$a['product']}" && $upOk('barn', $d - (int) $a['yield'])) || $fail('not what this animal gives');
                ((int) ($old['animals'][$m[1]]['fedAt'] ?? PHP_INT_MIN) === $t || isset($fed["{$m[1]}:$t"])) || $fail('animal was not fed');
                ($at + self::SLACK_MS >= $t + (int) $a['hoursMs'] && $level >= (int) $a['unlockLevel']) || $fail('collected too early');
                $collects[$m[1]][$t] = $at;
                $stats['collect']++;
            } elseif (preg_match('/^xp:collect:([a-z]+):(-?\d+)$/', $key, $m)) {
                $a = $R['animals'][$m[1]] ?? null;
                ($a !== null && isset($byKey["collect:{$m[1]}:{$m[2]}"]) && $d === self::harvestXp((int) $a['hoursMs'])) || $fail('animal XP');
            } elseif (preg_match('/^hive:(-?\d+):(honey|comb)$/', $key, $m)) {
                $t = (int) $m[1];
                $want = $m[2] === 'honey' ? ['ingredient:honey', $R['hive']['yield']['honey']] : ['ingredient:honeycomb', $R['hive']['yield']['honeycomb']];
                ($res === $want[0] && ($m[2] === 'honey' ? $upOk('hive', $d - (int) $want[1]) : $d === (int) $want[1])) || $fail('hive yield');
                ((int) ($old['hive']['startedAt'] ?? PHP_INT_MIN) === $t || isset($hiveRestarts[$t]) || $t >= $ctx['lower']) || $fail('hive was not started');
                ($at + self::SLACK_MS >= $t + (int) $R['hive']['hoursMs'] && $level >= (int) $R['hive']['unlockLevel']) || $fail('hive emptied too early');
                $hiveRestarts[$at] = true;
                $hiveRuns[$t] = $at;
                $stats['honey'] += $m[2] === 'honey' ? 1 : 0;
            } elseif (preg_match('/^xp:hive:(-?\d+)$/', $key, $m)) {
                (isset($byKey["hive:{$m[1]}:honey"]) && $d === self::harvestXp((int) $R['hive']['hoursMs'])) || $fail('hive XP');
            } elseif (preg_match('/^boat:(-?\d+):(\d+)$/', $key, $m)) {
                $t = (int) $m[1];
                $i = (int) $m[2];
                $catch = $this->boatCatch($t, $lvBefore, $up('boat', $new));
                ($i < count($catch) && $d === 1 && $res === "ingredient:{$catch[$i]}") || $fail('not what the boat brought');
                ((int) ($old['boat']['sentAt'] ?? PHP_INT_MIN) === $t || $t >= $ctx['lower']) || $fail('boat was not sent');
                ($at + self::SLACK_MS >= $t + (int) $R['boat']['hoursMs'] && $level >= (int) $R['boat']['unlockLevel']) || $fail('boat back too early');
                $boatTrips[$t] = $at;
                $stats['catch']++;
            } elseif (preg_match('/^xp:boat:(-?\d+)$/', $key, $m)) {
                $n = count(array_filter(array_keys($byKey), fn ($k) => preg_match("/^boat:{$m[1]}:\d+$/", (string) $k) === 1));
                ($n > 0 && $d === (int) $R['xp']['catch'] * $n) || $fail('boat XP');
                $stats['boat']++;
            } elseif (preg_match('/^sell:([a-z0-9]+):(-?\d+):coin$/', $key, $m)) {
                $out = $byKey["sell:{$m[1]}:{$m[2]}:out"] ?? null;
                ($out !== null && (int) $out['delta'] === -1 && $out['resource'] === "ingredient:{$m[1]}" && $d === (int) ($R['sell'][$m[1]] ?? -1)) || $fail('sale price');
                $stats['sell']++;
                $stats['earn'] += $d;
            } elseif (preg_match('/^buy:([a-z]+):(-?\d+):seed$/', $key, $m)) {
                $pay = $byKey["buy:{$m[1]}:{$m[2]}:coin"] ?? null;
                $def = $R['crops'][$m[1]] ?? null;
                ($def && $pay !== null && (int) $pay['delta'] === -(int) $def['seedPrice'] && $d === 1 && $res === "seed:{$m[1]}" && $this->available($m[1], $level)) || $fail('seed purchase');
            } elseif (preg_match('/^buy:([a-z]+):(-?\d+):item$/', $key, $m)) {
                $pay = $byKey["buy:{$m[1]}:{$m[2]}:coin"] ?? null;
                $price = $R['buy'][$m[1]] ?? null;
                ($price !== null && $pay !== null && (int) $pay['delta'] === -(int) $price && $d === 1 && $res === "ingredient:{$m[1]}") || $fail('market purchase');
            } elseif (preg_match('/^land:(\d+):(-?\d+)$/', $key, $m)) {
                // Clearing a plot: the next one in order, open at this level, for its price.
                $i = (int) $m[1] - (int) $R['plots']['start'] - 1;
                $need = $R['plots']['unlockLevels'][$i] ?? null;
                ($need !== null && $level >= (int) $need && $res === 'coin' && $d === -(int) $R['plots']['prices'][$i]) || $fail('land price');
                $lands[(int) $m[1]] = true;
            } elseif (preg_match('/^decor:([a-z]+)$/', $key, $m)) {
                $price = $R['decor'][$m[1]] ?? null;
                ($price !== null && $d === -(int) $price && $res === 'coin') || $fail('decoration price');
                $decor[] = $m[1];
            } elseif (self::isSkyKey($key)) {
                // Vườn Mây: checked by skyEntries() above.
            } elseif ($d > 0) {
                $fail('nothing in the game pays this');
            }
        }
        $this->oneAtATime($ctx, $plantings, $harvests, $fed, $collects, $hiveRuns, $boatTrips);
        $ret = [
            'stats' => $stats,
            'grown' => array_keys($grown),
            'settle' => $settle,
            'deliver' => array_values(array_unique($deliver)),
            'cooked' => $cooked,
            'plantings' => $plantings,
            'regrows' => $regrows,
            'fed' => $fed,
            'checkins' => $checkins,
            'stamps' => $stamps,
            'decor' => $decor,
            'lands' => $lands,
            'sky' => $sky,
        ];
        foreach (array_keys((array) ($R['upgrades'] ?? [])) as $id) {
            $gained = $up($id, $new) - $up($id, $old);
            $bought = $upgrades[$id] ?? [];
            sort($bought);
            ($gained >= 0 && $bought === ($gained > 0 ? range($up($id, $old) + 1, $up($id, $new)) : [])) || $this->reject('rule', "$id upgraded without paying");
        }
        return $ret;
    }

    /**
     * A plot holds one crop at a time, an animal eats once per cycle, the hive fills once and the
     * boat makes one trip at a time. A new planting needs the plot's previous crop picked (a
     * vegetable or the last mushroom flush leaves the plot empty); clearing a plot by hand is not
     * in the ledger, so that is allowed once per plot per save.
     */
    private function oneAtATime(array $ctx, array $plantings, array $harvests, array $fed, array $collects, array $hiveRuns, array $boatTrips): void
    {
        $old = $ctx['old'];
        $byPlot = [];
        foreach (array_keys($plantings) as $k) {
            [$plot, $t] = array_map('intval', explode(':', (string) $k, 2));
            $byPlot[$plot][] = $t;
        }
        $oldPlots = [];
        foreach ((array) ($old['plots'] ?? []) as $p) {
            if (is_array($p) && isset($p['id'])) {
                $oldPlots[(int) $p['id']] = $p;
            }
        }
        foreach ($byPlot as $plot => $times) {
            sort($times);
            $o = $oldPlots[$plot] ?? null;
            $cycle = ($o['crop'] ?? null) !== null ? (int) $o['plantedAt'] : null;
            $handCleared = false;
            foreach ($times as $t) {
                if ($cycle !== null) {
                    $picked = false;
                    foreach ($harvests[$plot] ?? [] as $h) {
                        $picked = $picked || ($h['t'] === $cycle && $h['kind'] !== 'tree' && $h['at'] <= $t + self::SLACK_MS);
                    }
                    if (!$picked) {
                        $handCleared && $this->reject('rule', "plot $plot planted while it still held a crop");
                        $handCleared = true;
                    }
                }
                $cycle = $t;
            }
        }

        $feeds = [];
        foreach (array_keys($fed) as $k) {
            [$animal, $t] = explode(':', (string) $k, 2);
            $feeds[$animal][] = (int) $t;
        }
        foreach ($feeds as $animal => $times) {
            sort($times);
            $busy = isset($old['animals'][$animal]['fedAt']) ? (int) $old['animals'][$animal]['fedAt'] : null;
            foreach ($times as $t) {
                if ($busy !== null && !(isset($collects[$animal][$busy]) && $collects[$animal][$busy] <= $t + self::SLACK_MS)) {
                    $this->reject('rule', "$animal fed again before its last yield was collected");
                }
                $busy = $t;
            }
        }

        // The hive starts once (from idle) and then refills from each emptying.
        ksort($hiveRuns);
        $next = isset($old['hive']['startedAt']) ? (int) $old['hive']['startedAt'] : null;
        $idle = $next === null;
        foreach ($hiveRuns as $t => $at) {
            if ($t === $next) {
                // the run already under way, or the refill after the last emptying
            } elseif ($idle && $t >= $ctx['lower']) {
                $idle = false;
            } else {
                $this->reject('rule', 'hive runs overlap');
            }
            $next = $at;
        }

        // The boat sails again only once it is back.
        ksort($boatTrips);
        $out = isset($old['boat']['sentAt']) ? (int) $old['boat']['sentAt'] : null;
        $back = $ctx['lower'];
        foreach ($boatTrips as $t => $at) {
            if ($out !== null) {
                $t === $out || $this->reject('rule', 'boat trips overlap');
                $out = null;
            } elseif ($t < $back - self::SLACK_MS) {
                $this->reject('rule', 'boat trips overlap');
            }
            $back = $at;
        }
    }

    /** Things outside the ledger: timers, unlocks, decorations, stamps, the gift debt. */
    private function stateFits(array $ctx, array $fresh, array $out): void
    {
        $R = $this->r;
        $old = $ctx['old'];
        $new = $ctx['new'];
        $level = $ctx['level'];
        $lower = $ctx['lower'];
        $upper = $ctx['upper'];
        $inWindow = fn (?int $t) => $t === null || ($t >= $lower && $t <= $upper);
        $this->unlocksFit($new, $level);
        if (count($new['plots']) < count($old['plots'] ?? [])) {
            $this->reject('rule', 'plots disappeared');
        }
        // Every plot beyond the old copy's was cleared (paid for) in this save. A first save has
        // no old copy to compare with: there the level cap in unlocksFit is the rule.
        if (count($old['plots'] ?? []) > 0) {
            for ($id = count($old['plots']) + 1; $id <= count($new['plots']); $id++) {
                isset($out['lands'][$id]) || $this->reject('rule', "plot $id was not cleared");
            }
        }

        $oldPlots = [];
        foreach ((array) ($old['plots'] ?? []) as $p) {
            if (is_array($p) && isset($p['id'])) {
                $oldPlots[(int) $p['id']] = $p;
            }
        }
        foreach ($new['plots'] as $p) {
            $id = (int) $p['id'];
            $o = $oldPlots[$id] ?? ['crop' => null, 'plantedAt' => null, 'readyAt' => null];
            $crop = $p['crop'];
            if ($crop === null) {
                continue;
            }
            $planted = (int) $p['plantedAt'];
            $ready = (int) $p['readyAt'];
            $sameCycle = $o['crop'] === $crop && (int) ($o['plantedAt'] ?? -1) === $planted;
            if (!$sameCycle) {
                // A new cycle: a seed spent on this plot at that moment, or a tree/mushroom regrowing.
                $how = $out['plantings']["$id:$planted"] ?? $out['regrows']["$id:$planted"] ?? null;
                if ($how !== $crop || !$inWindow($planted)) {
                    $this->reject('rule', "plot $id: $crop appeared without being planted");
                }
            }
            if ($sameCycle && (int) ($o['readyAt'] ?? 0) === $ready) {
                continue;
            }
            $def = $R['crops'][$crop];
            $regrow = isset($out['regrows']["$id:$planted"]) || ($sameCycle && (int) ($o['harvests'] ?? 0) > 0);
            $grow = $regrow ? (int) ($def['regrowMs'] ?? $def['growMs']) : (int) $def['growMs'];
            $min = $planted + $this->minReady($grow, $this->friendWaters($id, $planted, $upper, $ctx['offset']));
            $rained = array_key_exists($ready, $out['checkins']) && $ready >= $planted;
            if ($ready + self::SLACK_MS < $min && !$rained) {
                $this->reject('rule', "plot $id ripens too soon");
            }
        }

        foreach ($new['animals'] as $id => $a) {
            $o = $old['animals'][$id] ?? ['fedAt' => null, 'readyAt' => null];
            if (($o['fedAt'] ?? null) === $a['fedAt'] && ($o['readyAt'] ?? null) === $a['readyAt']) {
                continue;
            }
            if ($a['fedAt'] === null && $a['readyAt'] === null) {
                continue;
            }
            $def = $R['animals'][$id];
            if (!isset($out['fed']["$id:{$a['fedAt']}"]) || (int) $a['readyAt'] !== (int) $a['fedAt'] + (int) $def['hoursMs']) {
                $this->reject('rule', "animal $id timer");
            }
        }
        foreach (['hive' => ['startedAt', 'readyAt'], 'boat' => ['sentAt', 'returnAt']] as $what => [$a, $b]) {
            $n = $new[$what] ?? null;
            $o = $old[$what] ?? null;
            if (!is_array($n) || $n[$a] === null || (is_array($o) && ($o[$a] ?? null) === $n[$a] && ($o[$b] ?? null) === $n[$b])) {
                continue;
            }
            $def = $R[$what];
            if (!$inWindow((int) $n[$a]) || (int) $n[$b] !== (int) $n[$a] + (int) $def['hoursMs'] || $level < (int) $def['unlockLevel']) {
                $this->reject('rule', "$what timer");
            }
        }

        $decor = array_merge((array) ($old['decor'] ?? []), $out['decor']);
        foreach ($new['decor'] as $d) {
            if (!in_array($d, $decor, true)) {
                $this->reject('rule', "decoration $d never bought");
            }
        }
        foreach (['discovered', 'eaten'] as $kind) {
            foreach (array_diff($new['stamps'][$kind], (array) ($old['stamps'][$kind] ?? [])) as $dish) {
                if (!in_array($dish, $out['stamps'][$kind], true)) {
                    $this->reject('rule', "stamp $dish without its entry");
                }
                if (!$this->dishExists($dish)) {
                    $this->reject('rule', "stamp for unknown dish $dish");
                }
            }
        }
        // "Eaten" is stamped by a check-in that says the meal was eaten.
        if ($out['stamps']['eaten']) {
            $ate = false;
            foreach ($fresh as $e) {
                $ate = $ate || (str_starts_with((string) $e['key'], 'checkin:') && (int) $e['delta'] === (int) $R['xp']['checkinAte']);
            }
            $ate || $this->reject('rule', 'eaten stamp without a check-in');
        }
        foreach ($new['cooked'] as $recipe => $n) {
            if ((int) $n - (int) ($old['cooked'][$recipe] ?? 0) > ($out['cooked'][$recipe] ?? 0)) {
                $this->reject('rule', "cooked $recipe more often than recipes were cooked");
            }
        }
        // A streak grows one a day: never past where it stood on a remembered day plus the days
        // since (one more for time zones), however many saves come in between.
        [$from, $day] = $this->streakFrom($ctx);
        if ((int) ($new['streak']['count'] ?? 0) > $from + max(0, self::serverDay($ctx['serverMs']) - $day) + 1) {
            $this->reject('rule', 'streak grew faster than days passed');
        }

        $this->skyState($ctx, $fresh, $out['sky']);

        // Seeds sent to friends: until the garden saves the debit, they still count against it.
        $owed = [];
        $st = $this->db->prepare("SELECT id, crop FROM farm_events WHERE from_user = ? AND type = 'present' AND settled_at IS NULL");
        $st->execute([$this->user]);
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $ev) {
            if (!in_array((int) $ev['id'], $out['settle'], true)) {
                $owed[(string) $ev['crop']] = ($owed[(string) $ev['crop']] ?? 0) + 1;
            }
        }
        foreach ($owed as $crop => $n) {
            if ((int) ($new['seeds'][$crop] ?? 0) < $n) {
                $this->reject('gift_debit', "seed $crop already sent to a friend");
            }
        }
    }

    // ——— Shape (what a save may contain at all) ———

    private function shape(array $p): void
    {
        $R = $this->r;
        $int = fn ($v, int $min, int $max) => is_int($v) && $v >= $min && $v <= $max;
        $num = fn ($v) => is_int($v) || (is_float($v) && is_finite($v));
        $time = fn ($v) => $v === null || ($num($v) && $v > 0 && $v < 32_503_680_000_000);
        $bad = fn (string $what) => $this->reject('shape', $what);
        is_string($p['guestId'] ?? null) && preg_match('/^[A-Za-z0-9-]{4,64}$/', $p['guestId']) || $bad('guestId');
        ($num($p['xp'] ?? null) && $p['xp'] >= 0 && $p['xp'] <= 100_000_000) || $bad('xp');
        ($num($p['coins'] ?? 0) && ($p['coins'] ?? 0) >= 0 && ($p['coins'] ?? 0) <= 1_000_000_000) || $bad('coins');
        foreach (['seeds' => $R['crops'], 'ingredients' => $R['sell']] as $field => $known) {
            is_array($p[$field] ?? null) || $bad($field);
            foreach ($p[$field] as $k => $n) {
                (isset($known[$k]) && $int($n, 0, 1_000_000)) || $bad("$field.$k");
            }
        }
        is_array($p['plots'] ?? null) && array_is_list($p['plots']) || $bad('plots');
        $max = (int) $R['plots']['start'] + count($R['plots']['unlockLevels']);
        (count($p['plots']) >= (int) $R['plots']['start'] && count($p['plots']) <= $max) || $bad('plot count');
        $ids = [];
        foreach ($p['plots'] as $pl) {
            is_array($pl) && $int($pl['id'] ?? null, 1, $max) && !isset($ids[$pl['id']]) || $bad('plot id');
            $ids[$pl['id']] = true;
            $crop = $pl['crop'] ?? null;
            ($crop === null || (is_string($crop) && isset($R['crops'][$crop]))) || $bad('plot crop');
            foreach (['plantedAt', 'readyAt', 'wateredAt'] as $k) {
                $time($pl[$k] ?? null) || $bad("plot $k");
            }
            if ($crop !== null && (!$num($pl['plantedAt'] ?? null) || !$num($pl['readyAt'] ?? null))) {
                $bad('planted plot without times');
            }
            (($pl['harvests'] ?? null) === null || $int($pl['harvests'], 0, 100_000)) || $bad('plot harvests');
        }
        is_array($p['ledger'] ?? null) && array_is_list($p['ledger']) && count($p['ledger']) <= self::MAX_LEDGER || $bad('ledger');
        foreach ($p['ledger'] as $e) {
            (is_array($e) && is_string($e['key'] ?? null) && strlen($e['key']) <= 160
                && is_string($e['resource'] ?? null) && preg_match('/^(xp|coin|stamp|seed:[a-z]+|ingredient:[a-z]+|skyseed:[a-z]+|bug:[a-z]+|skyitem:[a-z]+|skygood:[a-z_]+|pot:[a-z_]+)$/', $e['resource'])
                && $num($e['delta'] ?? null) && abs($e['delta']) <= 1_000_000
                && $num($e['at'] ?? null) && $time($e['at'])
                && is_string($e['reason'] ?? '') ) || $bad('ledger entry');
        }
        $stamps = $p['stamps'] ?? null;
        is_array($stamps) || $bad('stamps');
        foreach (['discovered', 'eaten'] as $k) {
            (is_array($stamps[$k] ?? null) && array_is_list($stamps[$k]) && count($stamps[$k]) <= 2000) || $bad("stamps.$k");
            foreach ($stamps[$k] as $d) {
                (is_string($d) && preg_match('/^[a-z0-9-]{1,80}$/', $d)) || $bad('stamp id');
            }
            count(array_unique($stamps[$k])) === count($stamps[$k]) || $bad('duplicate stamp');
        }
        foreach (['unlockedRegions' => $R['regions'], 'unlockedCrops' => $R['crops'], 'decor' => $R['decor']] as $field => $known) {
            is_array($p[$field] ?? []) || $bad($field);
            foreach ($p[$field] ?? [] as $v) {
                (is_string($v) && isset($known[$v])) || $bad("$field value");
            }
        }
        $layout = $p['decorLayout'] ?? [];
        is_array($layout) || $bad('decorLayout');
        foreach ($layout as $id => $pos) {
            $coord = fn ($v) => $num($v) && $v >= -64 && $v <= 64;
            (isset($R['decor'][$id]) && ($pos === null || (is_array($pos) && $coord($pos['x'] ?? null) && $coord($pos['z'] ?? null) && $num($pos['rot'] ?? null)))) || $bad('decorLayout value');
        }
        // Painted farm: a slot number and a mirror flag per decoration (see src/data/decorSlots.ts).
        $slots = $p['decorSlots'] ?? [];
        is_array($slots) || $bad('decorSlots');
        foreach ($slots as $id => $pos) {
            (isset($R['decor'][$id]) && ($pos === null || (is_array($pos) && is_int($pos['slot'] ?? null) && $pos['slot'] >= 0 && $pos['slot'] < self::DECOR_SLOTS && is_bool($pos['flip'] ?? false)))) || $bad('decorSlots value');
        }
        $animals = $p['animals'] ?? [];
        is_array($animals) || $bad('animals');
        foreach ($animals as $id => $a) {
            (isset($R['animals'][$id]) && is_array($a) && $time($a['fedAt'] ?? null) && $time($a['readyAt'] ?? null)) || $bad('animal');
        }
        foreach (['hive' => ['startedAt', 'readyAt'], 'boat' => ['sentAt', 'returnAt']] as $k => $pair) {
            $v = $p[$k] ?? null;
            ($v === null || (is_array($v) && $time($v[$pair[0]] ?? null) && $time($v[$pair[1]] ?? null))) || $bad($k);
        }
        $cooked = $p['cooked'] ?? [];
        is_array($cooked) || $bad('cooked');
        foreach ($cooked as $id => $n) {
            (preg_match('/^[a-z0-9-]{1,80}$/', (string) $id) && $int($n, 0, 1_000_000)) || $bad('cooked value');
        }
        $streak = $p['streak'] ?? [];
        (is_array($streak) && $int($streak['count'] ?? 0, 0, 100_000)) || $bad('streak');
        (is_array($p['history'] ?? []) && count($p['history'] ?? []) <= 60) || $bad('history');
        (is_array($p['photos'] ?? []) && count($p['photos'] ?? []) <= 2000) || $bad('photos');
        $this->skyShape($p['sky'] ?? null);
    }

    // ——— Helpers ———

    private static function serverDay(int $ms): int
    {
        return intdiv(intdiv($ms, 1000), 86400);
    }

    /** A per-server-day tally's metric name (verified_stats), e.g. "xpday:20729". */
    private static function dayKey(string $what, int $ms): string
    {
        return $what . ':' . self::serverDay($ms);
    }

    /** Where the streak stood on a remembered server day: [count, day] (the stored copy at first). */
    private function streakFrom(array $ctx): array
    {
        $st = $this->db->prepare("SELECT metric, value FROM verified_stats WHERE user_id = ? AND metric IN ('streakBase', 'streakBaseDay')");
        $st->execute([$this->user]);
        $row = $st->fetchAll(PDO::FETCH_KEY_PAIR);
        if (isset($row['streakBase'], $row['streakBaseDay'])) {
            return [(int) $row['streakBase'], (int) $row['streakBaseDay']];
        }
        return [(int) ($ctx['old']['streak']['count'] ?? 0), self::serverDay($ctx['serverMs'])];
    }

    /** What to remember after this save: the same base, or a new one when the streak fell back. */
    private function streakBase(array $ctx, int $serverMs): array
    {
        [$from, $day] = $this->streakFrom($ctx);
        $now = (int) ($ctx['new']['streak']['count'] ?? 0);
        $today = self::serverDay($serverMs);
        return $now < $from + max(0, $today - $day) - 1 ? [$now, $today] : [$from, $day];
    }

    private function dishExists(string $id): bool
    {
        static $cache = [];
        if (!array_key_exists($id, $cache)) {
            $st = $this->db->prepare('SELECT 1 FROM dishes WHERE id = ?');
            $st->execute([$id]);
            $cache[$id] = (bool) $st->fetchColumn();
        }
        return $cache[$id];
    }

    /**
     * Claimed keys `<prefix><t>` with t in [from, to] (device ms; thirteen digits, so they sort
     * as text). Catches the guest's ledger left out still count.
     */
    private function claimKeysBetween(string $prefix, int $from, int $to): array
    {
        $st = $this->db->prepare('SELECT claim_key FROM progress_claims WHERE user_id = ? AND claim_key >= ? AND claim_key <= ?');
        $st->execute([$this->user, $prefix . max(0, $from), $prefix . $to]);
        return array_filter($st->fetchAll(PDO::FETCH_COLUMN), fn ($k) => preg_match('/^' . preg_quote($prefix, '/') . '\d{13}$/', (string) $k) === 1);
    }

    private function isMonday(string $date): bool
    {
        $t = strtotime($date . ' 12:00:00 UTC');
        return $t !== false && gmdate('N', $t) === '1';
    }

    /** `at` falls in the week starting on that Monday (on any device's time zone). */
    private function inWeek(string $monday, int $at): bool
    {
        $t = strtotime($monday . ' 12:00:00 UTC');
        return $t !== false && $at >= $t * 1000 - 1.2 * 86_400_000 && $at <= $t * 1000 + 7.2 * 86_400_000;
    }

    private function reject(string $code, string $detail): never
    {
        error_log("[angi progress] user {$this->user} refused ($code): $detail");
        $this->refused = [$code, $detail];
        throw new HttpError(422, __t('account.progressRejected'), ['code' => $code]);
    }

    /** Whether an entry is a one-time reward to remember beyond the ledger's tail. */
    private static function claimable(mixed $e): bool
    {
        if (!is_array($e) || !is_string($e['key'] ?? null)) {
            return false;
        }
        $k = $e['key'];
        return (int) ($e['delta'] ?? 0) > 0 || ($e['resource'] ?? '') === 'stamp'
            || preg_match('/^(friend|present|checkin|plant|seed|xp:choose|badge|quest|chest):/', $k) === 1
            // Vườn Mây: openings, plantings and balloon boxes count once (some move no balance).
            || preg_match('/^sky:(floor|plant|balloon):/', $k) === 1;
    }

    /** Which of these keys were already paid to this garden. */
    private function claimed(array $keys): array
    {
        $out = [];
        foreach (array_chunk(array_values(array_unique($keys)), 200) as $chunk) {
            $marks = implode(',', array_fill(0, count($chunk), '?'));
            $st = $this->db->prepare("SELECT claim_key FROM progress_claims WHERE user_id = ? AND claim_key IN ($marks)");
            $st->execute([$this->user, ...$chunk]);
            foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $k) {
                $out[$k] = true;
            }
        }
        return $out;
    }

    private function countClaims(string $like, ?callable $filter = null): int
    {
        $keys = $this->claimKeys($like);
        return count($filter ? array_filter($keys, $filter) : $keys);
    }

    private function claimKeys(string $like): array
    {
        $st = $this->db->prepare('SELECT claim_key FROM progress_claims WHERE user_id = ? AND claim_key LIKE ?');
        $st->execute([$this->user, $like]);
        return $st->fetchAll(PDO::FETCH_COLUMN);
    }

    private function longestStreak(): int
    {
        $st = $this->db->prepare("SELECT COALESCE(MAX(value), 0) FROM verified_stats WHERE user_id = ? AND metric IN ('streakMax', 'base:streakMax')");
        $st->execute([$this->user]);
        return (int) $st->fetchColumn();
    }

    /** One of this garden's verified tallies (increments plus base). */
    private function stat(string $metric): int
    {
        $st = $this->db->prepare('SELECT COALESCE(SUM(value), 0) FROM verified_stats WHERE user_id = ? AND metric IN (?, ?)');
        $st->execute([$this->user, $metric, 'base:' . $metric]);
        return (int) $st->fetchColumn();
    }

    /** Server events named by friend:e<id> / present:e<id> keys in this save. */
    private function events(array $fresh): array
    {
        $ids = [];
        foreach ($fresh as $e) {
            if (preg_match('/^(?:friend|present):e(\d+)(?::|$)/', (string) $e['key'], $m)) {
                $ids[] = (int) $m[1];
            }
        }
        $out = [];
        foreach (array_chunk(array_values(array_unique($ids)), 200) as $chunk) {
            $marks = implode(',', array_fill(0, count($chunk), '?'));
            $st = $this->db->prepare("SELECT id, to_user, from_user, type, plot_id, crop, cycle FROM farm_events WHERE id IN ($marks)");
            $st->execute($chunk);
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $out[(int) $r['id']] = $r;
            }
        }
        return $out;
    }

    private function friendReward(array $ev, string $part, string $res, int $d): bool
    {
        $xp = $this->r['xp'];
        return match ($ev['type']) {
            'water', 'helped' => $part === 'xp' && $res === 'xp' && $d === (int) $xp['friendHelp'],
            'gift', 'present' => $part === 'seed' && $res === "seed:{$ev['crop']}" && $d === 1,
            'stole' => ($part === 'item' && $res === "ingredient:{$ev['crop']}" && $d === 1)
                || ($part === 'xp' && $res === 'xp' && $d === (int) $xp['steal']),
            'referral' => (function () use ($ev, $part, $res, $d) {
                require_once __DIR__ . '/Friends.php';
                $ms = Friends::MILESTONES[(int) $ev['plot_id']] ?? null;
                return $ms !== null && (($part === 'coin' && $res === 'coin' && $d === $ms['coins'])
                    || ($part === 'xp' && $res === 'xp' && $d === $ms['xp']));
            })(),
            'stolen', 'thanks' => $part === 'seen' && $d === 0,
            default => false,
        };
    }

    /**
     * The cycle a harvest of `crop` on `plot` started at `t`: the stored plot, a planting in this
     * save, or a tree/mushroom harvest in this save that restarted it.
     */
    private function cycle(array $old, array $plantings, array $regrows, int $plot, int $t, string $crop): ?array
    {
        if (!isset($this->r['crops'][$crop])) {
            return null;
        }
        foreach ((array) ($old['plots'] ?? []) as $p) {
            if (is_array($p) && (int) ($p['id'] ?? 0) === $plot && ($p['crop'] ?? null) === $crop && (int) ($p['plantedAt'] ?? -1) === $t) {
                return ['regrow' => (int) ($p['harvests'] ?? 0) > 0, 'readyAt' => isset($p['readyAt']) ? (int) $p['readyAt'] : null];
            }
        }
        if (($plantings["$plot:$t"] ?? null) === $crop) {
            return ['regrow' => false, 'readyAt' => null];
        }
        if (($regrows["$plot:$t"] ?? null) === $crop) {
            return ['regrow' => true, 'readyAt' => null];
        }
        return null;
    }

    /** A check-in after a real meal ripens the meal's plot at once (one plot per check-in). */
    private function useCheckin(array &$checkins, int $from, int $at): bool
    {
        foreach ($checkins as $t => $used) {
            if (!$used && $t >= $from && $t <= $at + self::SLACK_MS) {
                $checkins[$t] = true;
                return true;
            }
        }
        return false;
    }

    /**
     * Soonest a crop can ripen when watered as often as the game allows: the guest's can
     * every hour (cooldown) plus every friend's watering, each removing a quarter of what is left.
     */
    private function minReady(int $growMs, int $friendWaters): int
    {
        $cut = 1 - (float) $this->r['watering']['cut'];
        $cool = (int) $this->r['watering']['cooldownMs'];
        $left = $growMs * ($cut ** (1 + $friendWaters));
        $t = 0;
        for ($i = 0; $i < 200 && $left > $cool; $i++) {
            $t += $cool;
            $left = ($left - $cool) * $cut;
        }
        return (int) floor($t + $left);
    }

    private function friendWaters(int $plot, int $from, int $to, int $offset): int
    {
        $st = $this->db->prepare("SELECT COUNT(*) FROM farm_events WHERE to_user = ? AND type = 'water' AND plot_id = ? AND created_at >= ? AND created_at <= ?");
        $st->execute([$this->user, $plot, intdiv($from - $offset - self::SKEW_MS, 1000), intdiv($to - $offset + self::SKEW_MS, 1000)]);
        return (int) $st->fetchColumn();
    }

    /** A friend picked from this plot's crop of cycle `t`: its harvest gives one less. */
    private function stolen(int $plot, int $t): bool
    {
        $st = $this->db->prepare("SELECT 1 FROM farm_events WHERE uniq = ?");
        $st->execute(["stolen:{$this->user}:$plot:$t"]);
        return (bool) $st->fetchColumn();
    }

    /**
     * What an achievement measures, from what the server can stand behind: the checked save
     * itself (stamps, recipes, regions, plots, decorations, level), its own counts of accepted
     * saves (plus the base a first copy brought, capped by its XP), or — for watering, which
     * the ledger does not record — the garden's own count held to a daily maximum.
     */
    private function badgeValue(string $metric, array $ctx, array $stats, array $grown, array $fresh): int
    {
        $new = $ctx['new'];
        $old = $ctx['old'];
        return match ($metric) {
            'eaten' => count($new['stamps']['eaten']),
            'discovered' => count($new['stamps']['discovered']),
            'recipes' => count(array_filter($new['cooked'], fn ($n) => (int) $n > 0)),
            'regions' => count($new['unlockedRegions'] ?? []),
            'plots' => count($new['plots']),
            'decor' => count($new['decor'] ?? []),
            'level' => $ctx['level'],
            'streakMax' => max((int) ($new['streak']['count'] ?? 0), $this->longestStreak()),
            'variety' => max($this->baseStat('variety'), count(array_unique(array_merge(
                array_map(fn ($k) => substr($k, strlen('grown:')), $this->claimKeys('grown:%')),
                array_keys($grown),
            )))),
            'water' => min((int) ($new['quests']['total']['water'] ?? 0), $this->baseStat('water') + 15 * ($this->accountDays() + 1)),
            'allDaily' => $this->fullQuestDays($fresh),
            default => $this->baseStat($metric) + $this->counted($metric) + (int) ($stats[$metric] ?? 0),
        };
    }

    /** verified_stats increments for one metric. */
    private function counted(string $metric): int
    {
        $st = $this->db->prepare('SELECT value FROM verified_stats WHERE user_id = ? AND metric = ?');
        $st->execute([$this->user, $metric]);
        return (int) $st->fetchColumn();
    }

    /**
     * The base a metric starts from: what the garden brought when it was first seen (or, for a
     * metric added later, what its stored copy held on the day that metric came: backfillBases).
     * Never read from the copy now: a save could have inflated it just before.
     */
    private function baseStat(string $metric): int
    {
        $st = $this->db->prepare('SELECT value FROM verified_stats WHERE user_id = ? AND metric = ?');
        $st->execute([$this->user, 'base:' . $metric]);
        return (int) $st->fetchColumn();
    }

    /**
     * Run once when the schema moves to a version with new badge metrics: every stored garden
     * gets the bases it lacks, from its copy as stored right now, held to its XP (uncapped for a
     * copy saved before the guard existed, as check() does), plus the crops it has grown and
     * the badge tiers it holds. Existing rows are never changed.
     */
    public static function backfillBases(PDO $db): void
    {
        $R = self::rules();
        $sqlite = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
        $ignore = $sqlite ? 'INSERT OR IGNORE' : 'INSERT IGNORE';
        $stat = $db->prepare("$ignore INTO verified_stats (user_id, metric, value) VALUES (?, ?, ?)");
        $claim = $db->prepare("$ignore INTO progress_claims (user_id, claim_key, created_at) VALUES (?, ?, ?)");
        $rows = $db->query('SELECT user_id, data, client_offset FROM user_progress')->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $row) {
            $p = json_decode((string) $row['data'], true);
            if (!is_array($p)) {
                continue;
            }
            $uid = (int) $row['user_id'];
            $xp = $row['client_offset'] === null ? PHP_INT_MAX : max(0, (int) ($p['xp'] ?? 0));
            foreach (self::baseTotals($p, $xp, $R) as $metric => $v) {
                $stat->execute([$uid, 'base:' . $metric, $v]);
            }
            foreach (self::grownCrops($p, $R) as $c) {
                $claim->execute([$uid, "grown:$c", time()]);
            }
            foreach ((array) ($p['quests']['badges'] ?? []) as $id => $tier) {
                for ($n = 1; isset($R['badges'][$id]) && $n <= min((int) $tier, count($R['badges'][$id]['tiers'])); $n++) {
                    $claim->execute([$uid, "badge:$id:$n", time()]);
                }
            }
        }
    }

    /**
     * Same as fitToLevel() in src/domain/persistence.ts: a garden keeps no more plots than its
     * level opens (the last ones go, with what grew on them) and no crop above its level. The
     * seed gift of a crop it gives back is forgotten, so reaching that level again pays it again.
     * Idempotent: a garden that already fits is not touched.
     */
    public static function fitToLevel(array $p): array
    {
        $R = self::rules();
        $lv = self::level((int) ($p['xp'] ?? 0));
        $allowed = (int) $R['plots']['start'] + count(array_filter($R['plots']['unlockLevels'], fn ($l) => $lv >= (int) $l));
        $plots = array_values(array_filter((array) ($p['plots'] ?? []), 'is_array'));
        usort($plots, fn ($a, $b) => (int) ($a['id'] ?? 0) <=> (int) ($b['id'] ?? 0));
        $p['plots'] = array_slice($plots, 0, $allowed);
        $p['unlockedCrops'] = array_values(array_filter(
            (array) ($p['unlockedCrops'] ?? []),
            fn ($c) => isset($R['crops'][$c]) && (int) $R['crops'][$c]['unlockLevel'] <= $lv,
        ));
        return $p;
    }

    /** Runs fitToLevel over every stored garden (schema v5). */
    public static function fitStoredToLevel(PDO $db): void
    {
        $save = $db->prepare('UPDATE user_progress SET data = ? WHERE user_id = ?');
        $forget = $db->prepare('DELETE FROM progress_claims WHERE user_id = ? AND claim_key = ?');
        $rows = $db->query('SELECT user_id, data FROM user_progress')->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $row) {
            $p = json_decode((string) $row['data'], true);
            if (!is_array($p)) {
                continue;
            }
            $fit = self::fitToLevel($p);
            $gone = array_diff((array) ($p['unlockedCrops'] ?? []), $fit['unlockedCrops']);
            if (count($fit['plots']) === count((array) ($p['plots'] ?? [])) && !$gone) {
                continue;
            }
            $save->execute([json_encode($fit, JSON_UNESCAPED_UNICODE), (int) $row['user_id']]);
            foreach ($gone as $c) {
                $forget->execute([(int) $row['user_id'], "unlock:crop:$c"]);
            }
        }
    }

    private function accountDays(): int
    {
        $st = $this->db->prepare('SELECT created_at FROM users WHERE id = ?');
        $st->execute([$this->user]);
        $created = (int) $st->fetchColumn();
        $now = $this->nowMs !== null ? intdiv($this->nowMs, 1000) : time();
        return $created > 0 ? intdiv(max(0, $now - $created), 86400) : 0;
    }

    /** Days on which at least four daily quests were claimed (four or five were drawn). */
    private function fullQuestDays(array $fresh): int
    {
        $keys = $this->claimKeys('quest:%:d-%');
        foreach ($fresh as $e) {
            $keys[] = (string) $e['key'];
        }
        $per = [];
        foreach (array_unique($keys) as $k) {
            if (preg_match('/^quest:(\d{4}-\d{2}-\d{2}):d-[a-z0-9-]+$/', $k, $m)) {
                $per[$m[1]] = ($per[$m[1]] ?? 0) + 1;
            }
        }
        return count(array_filter($per, fn ($n) => $n >= 4)) + $this->baseStat('allDaily');
    }

    /** One part of a quest/badge/chest reward: the XP itself, `:coin`, or `:seed:<i>`. */
    private function rewardPart(string $part, ?string $i, string $res, int $d, array $reward, int $level): bool
    {
        if ($part === '') {
            return $res === 'xp' && $d === (int) $reward['xp'];
        }
        if ($part === ':coin') {
            return $res === 'coin' && $d === (int) $reward['coins'] && $d > 0;
        }
        return (int) $i < (int) $reward['seeds'] && $d === 1 && str_starts_with($res, 'seed:') && $this->available(self::sub($res, 'seed'), $level);
    }

    private function available(string $crop, int $level): bool
    {
        $def = $this->r['crops'][$crop] ?? null;
        return $def !== null && (int) $def['unlockLevel'] <= $level;
    }

    private function unlocksFit(array $p, int $level): void
    {
        foreach ($p['unlockedCrops'] ?? [] as $c) {
            if (!$this->available($c, $level)) {
                $this->reject('rule', "crop $c not open at level $level");
            }
        }
        $earned = (int) $this->r['plots']['start'] + count(array_filter($this->r['plots']['unlockLevels'], fn ($l) => $level >= $l));
        if (count($p['plots']) > $earned) {
            $this->reject('rule', 'more plots than the level opens');
        }
        $stamps = count($p['stamps']['discovered']) + count($p['stamps']['eaten']);
        foreach ($p['unlockedRegions'] ?? [] as $region) {
            if ((int) ($this->r['regions'][$region] ?? PHP_INT_MAX) > $stamps) {
                $this->reject('rule', "region $region not earned");
            }
        }
        foreach ((array) ($p['quests']['badges'] ?? []) as $id => $tier) {
            if (!isset($this->r['badges'][$id]) || (int) $tier > count($this->r['badges'][$id]['tiers'])) {
                $this->reject('rule', 'badge tier');
            }
        }
    }

    private function timers(array $p): array
    {
        $out = [];
        foreach ($p['plots'] as $pl) {
            $out[] = $pl['plantedAt'] ?? null;
        }
        foreach ($p['animals'] ?? [] as $a) {
            $out[] = $a['fedAt'] ?? null;
        }
        $out[] = $p['hive']['startedAt'] ?? null;
        $out[] = $p['boat']['sentAt'] ?? null;
        return $out;
    }

    /** A dated key (meal slot, order, quest day) belongs near this entry's time (device time zones vary). */
    private function slotDate(string $date, int $at, float $days = 2): bool
    {
        $t = strtotime($date . ' 12:00:00 UTC');
        return $t !== false && abs($t * 1000 - $at) <= $days * 86_400_000;
    }

    private static function sub(string $resource, string $kind): string
    {
        return str_starts_with($resource, "$kind:") ? substr($resource, strlen($kind) + 1) : '';
    }

    private static function balance(array $p, string $res): int
    {
        if ($res === 'xp') {
            return (int) ($p['xp'] ?? 0);
        }
        if ($res === 'coin') {
            return (int) ($p['coins'] ?? 0);
        }
        [$kind, $id] = array_pad(explode(':', $res, 2), 2, '');
        if (in_array($kind, ['skyseed', 'bug', 'skyitem', 'skygood', 'pot'], true)) {
            return self::skyBalance($p, $kind, $id);
        }
        $field = $kind === 'seed' ? 'seeds' : 'ingredients';
        return (int) ($p[$field][$id] ?? 0);
    }

    /** Same as levelForXp() in src/data/game.ts: level L → L+1 costs base + step × (L − 1) XP. */
    public static function level(int $xp): int
    {
        $c = self::rules()['levelCurve'];
        $xp = max(0, $xp);
        $b = (int) $c['base'] - (int) $c['step'] / 2;
        $lv = (int) floor((-$b + sqrt($b * $b + 2 * (int) $c['step'] * $xp)) / (int) $c['step']) + 1;
        while ($lv > 1 && self::xpForLevel($lv) > $xp) {
            $lv--;
        }
        while (self::xpForLevel($lv + 1) <= $xp) {
            $lv++;
        }
        return $lv;
    }

    /** Same as guestPay() in src/domain/guests.ts: ingredients worth `$value`, cooked `$times` times. */
    public static function guestPay(int $value, int $times, bool $event = false): int
    {
        $G = self::rules()['guests'];
        $stars = count(array_filter($G['starAt'], fn ($n) => $times >= (int) $n));
        $extra = $event ? (int) self::rules()['event']['bonusPct'] : 0;
        return intdiv($value * (int) $G['payPct'] * (100 + (int) $G['starBonusPct'][$stars]) * (100 + $extra) + 500_000, 1_000_000);
    }

    /** Same as eventOn() in src/data/game.ts: the event running on a local date. */
    public static function eventOn(string $date): ?array
    {
        foreach ((array) (self::rules()['events'] ?? []) as $e) {
            if ($date >= $e['from'] && $date <= $e['to']) {
                return $e;
            }
        }
        return null;
    }

    /** Same as xpForLevel() in src/data/game.ts. */
    public static function xpForLevel(int $lv): int
    {
        $c = self::rules()['levelCurve'];
        $n = max(0, $lv - 1);
        return (int) $c['base'] * $n + intdiv((int) $c['step'] * $n * ($n - 1), 2);
    }

    /** Same as harvestXp() in src/data/game.ts. */
    public static function harvestXp(int $ms): int
    {
        return (int) min(40, max(2, round(2 + ($ms / 3_600_000) * 1.5)));
    }

    /** Same as recipeXp() in src/features/food-reel/data/reelCatalogue.ts. */
    public static function recipeXp(int $pieces): int
    {
        return (int) min(75, max(15, round(($pieces * 7.5) / 5) * 5));
    }

    // ——— Same pond and boat draws as src/domain/selectors.ts ———

    public function catchFor(int $castAt, int $lv): string
    {
        return $this->pick('pond', $lv, self::unit($castAt, 0));
    }

    /** Same as biteDelay() in src/domain/selectors.ts. */
    public function biteDelay(int $castAt): int
    {
        $f = $this->r['fishing'];
        $t = (intdiv($castAt, 7) % 997) / 997;
        return (int) round((int) $f['biteMinMs'] + $t * ((int) $f['biteMaxMs'] - (int) $f['biteMinMs']));
    }

    public function boatCatch(int $sentAt, int $lv, int $extra = 0): array
    {
        $out = [];
        for ($i = 0; $i < (int) $this->r['boat']['catches'] + $extra; $i++) {
            $out[] = $this->pick('boat', $lv, self::unit($sentAt, $i + 1));
        }
        return $out;
    }

    private function pick(string $source, int $lv, float $t): string
    {
        $open = array_values(array_filter($this->r['catchOrder'], fn ($c) => $this->r['catches'][$c]['source'] === $source && (int) $this->r['catches'][$c]['unlockLevel'] <= $lv));
        $total = 0.0;
        foreach ($open as $c) {
            $total += (float) $this->r['catches'][$c]['chance'];
        }
        $acc = 0.0;
        foreach ($open as $c) {
            $acc += (float) $this->r['catches'][$c]['chance'] / $total;
            if ($t < $acc) {
                return $c;
            }
        }
        return $open ? $open[count($open) - 1] : 'fish';
    }

    /** JS: h = (at + salt·0x9e3779b1) | 0, two rounds of imul/xorshift, then / 2^32. */
    private static function unit(int $at, int $salt): float
    {
        $h = ($at + $salt * 0x9e3779b1) & 0xFFFFFFFF;
        $h = self::imul($h ^ ($h >> 16), 0x45d9f3b);
        $h = self::imul($h ^ ($h >> 16), 0x45d9f3b);
        return (($h ^ ($h >> 16)) & 0xFFFFFFFF) / 4294967296;
    }

    /** Math.imul on unsigned 32-bit values, without overflowing PHP's 64-bit integers. */
    private static function imul(int $a, int $b): int
    {
        $a &= 0xFFFFFFFF;
        $b &= 0xFFFFFFFF;
        $lo = ($a & 0xFFFF) * $b;
        $hi = (($a >> 16) * $b) & 0xFFFF;
        return ($lo + ($hi << 16)) & 0xFFFFFFFF;
    }
}

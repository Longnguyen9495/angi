<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/Schema.php';
require_once __DIR__ . '/RateLimit.php';

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

    private static ?array $rules = null;
    private array $r;

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
            return $this->import($new, $clientNow, $offset);
        }
        $prevOffset = $row['client_offset'] ?? null;
        if ($prevOffset !== null && abs($offset - (int) $prevOffset) > self::SKEW_MS) {
            $this->reject('clock', 'device clock moved since the last save');
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
        ];
        $out = $this->diff($ctx) + ['guestId' => $guestId, 'clientAt' => $clientNow, 'offset' => $offset];
        if ($prevOffset === null) {
            // Saved before the guard existed: what that copy counted is where badges build on.
            $out['base'] = self::baseTotals($old, PHP_INT_MAX);
        }
        return $out;
    }

    /** Records what an accepted save earned: claims, verified tallies, settled and delivered events. */
    public function commit(array $c): void
    {
        $sqlite = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
        $now = time();
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
        return $p;
    }

    // ——— A journey seen for the first time ———

    private function import(array $new, int $clientNow, int $offset): array
    {
        if ($this->nowMs === null) {
            (new RateLimit($this->db))->hit(['import:' . $this->user => [3, 7 * 86400]], __t('account.progressRejected'));
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
        return [
            'mode' => 'import',
            'guestId' => (string) $new['guestId'],
            'clientAt' => $clientNow,
            'offset' => $offset,
            'claims' => $claims,
            'stats' => [],
            // What badges may build on; never what invite rewards are paid from.
            'base' => self::baseTotals($new, $xp),
            'settle' => [],
            'deliver' => [],
        ];
    }

    /**
     * Tallies a copy claims (quests.total), held to what its XP could have earned (`$xp`;
     * PHP_INT_MAX for a copy the server already accepted). Base for badges only.
     */
    private static function baseTotals(array $p, int $xp): array
    {
        $total = is_array($p['quests']['total'] ?? null) ? $p['quests']['total'] : [];
        $cap = fn (string $m, int $div) => max(0, min((int) ($total[$m] ?? 0), $xp === PHP_INT_MAX ? PHP_INT_MAX : intdiv($xp, $div)));
        return [
            'harvest' => $cap('harvest', 2),
            'cook' => $cap('cook', 15),
            'catch' => $cap('catch', 3),
            'order' => $cap('order', 15),
            'help' => $cap('help', 3),
            'steal' => $cap('steal', 2),
            'gift' => $cap('gift', 10),
            'streakMax' => max(0, min((int) ($p['streak']['count'] ?? 0), $xp === PHP_INT_MAX ? 100_000 : 30)),
        ];
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

        $gained = 0;
        foreach ($fresh as $e) {
            if ($e['resource'] === 'xp' && (int) $e['delta'] > 0) {
                $gained += (int) $e['delta'];
            }
        }
        // Backstop on top of the rules: more than any real session could earn.
        if ($gained > 2000 + intdiv($ctx['elapsedMs'], 3_600_000) * 800) {
            $this->reject('rule', "XP gained ($gained) too fast");
        }
        $out['stats']['xp'] = $gained;
        $out['streak'] = (int) ($new['streak']['count'] ?? 0);
        $out['claims'] = array_values(array_map(fn ($e) => (string) $e['key'], array_filter($fresh, [self::class, 'claimable'])));
        $out['mode'] = 'diff';
        $out['base'] = [];
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
        $byKey = [];
        foreach ($fresh as $e) {
            $byKey[(string) $e['key']] = $e;
        }
        $stats = ['harvest' => 0, 'cook' => 0, 'catch' => 0, 'order' => 0, 'help' => 0, 'steal' => 0, 'gift' => 0];
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

        // Evidence first: plantings, feeding, check-ins (rewards are checked against them below).
        foreach ($fresh as $e) {
            $key = (string) $e['key'];
            $at = (int) $e['at'];
            if (preg_match('/^tray:(\d+):(-?\d+)$/', $key, $m) && (int) $m[2] === $at) {
                $plantings["{$m[1]}:$at"] = self::sub((string) $e['resource'], 'seed');
            } elseif (preg_match("/^plant:$S$/", $key) && preg_match('/^plot:(\d+)$/', (string) $e['reason'], $m)) {
                $plantings["{$m[1]}:$at"] = self::sub((string) $e['resource'], 'seed');
            } elseif (preg_match('/^feed:([a-z]+):(-?\d+)$/', $key, $m) && (int) $m[2] === $at) {
                $fed["{$m[1]}:$at"] = true;
            } elseif (preg_match("/^checkin:$S$/", $key) && (int) $e['delta'] !== (int) $R['xp']['checkinSkipped']) {
                $checkins[$at] = false;
            }
        }

        $events = $this->events($fresh);
        $catches = [];
        foreach ($ledger as $e) {
            if (preg_match('/^catch:\d+$/', (string) $e['key'])) {
                $catches[] = (int) $e['at'];
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
                $stats['harvest']++;
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
                $recent = count(array_filter($catches, fn ($t) => $t > $at - 86_400_000 && $t <= $at));
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
                    $pieces = array_sum($debits);
                    (count($debits) >= 1 && count($debits) <= 5 && max($debits) <= 3 && $d === self::recipeXp($pieces)) || $fail('recipe XP');
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
            } elseif (preg_match('/^order:\d{4}-\d{2}-\d{2}:\d+:seed:[a-z]+$/', $key)) {
                $d >= 1 || $fail('order seed');
            } elseif (preg_match("/^photo:$S$/", $key, $m)) {
                $d === (int) $R['xp']['checkinPhoto'] || $fail('photo XP');
                (isset($byKey["checkin:{$m[1]}:{$m[2]}"]) || $this->countClaims("checkin:{$m[1]}:{$m[2]}") > 0) || $fail('photo of a meal never checked in');
            } elseif (preg_match("/^checkin:$S$/", $key, $m)) {
                in_array($d, [(int) $R['xp']['checkinAte'], (int) $R['xp']['checkinSwapped'], (int) $R['xp']['checkinSkipped']], true) || $fail('check-in XP');
                $this->slotDate($m[1], $at) || $fail('check-in is not today');
            } elseif (preg_match('/^stamp:(discovered|eaten):([a-z0-9-]{1,80})$/', $key, $m)) {
                $res === 'stamp' || $fail('stamp');
                $stamps[$m[1]][] = $m[2];
            } elseif (preg_match('/^unlock:crop:([a-z]+)$/', $key, $m)) {
                $def = $R['crops'][$m[1]] ?? null;
                ($def && $d === 1 && $res === "seed:{$m[1]}" && (int) $def['unlockLevel'] > 1 && (int) $def['unlockLevel'] <= $level) || $fail('crop not unlocked');
            } elseif (preg_match('/^quest:(\d{4}-\d{2}-\d{2}):([a-z-]+)(:coin|:seed:(\d+))?$/', $key, $m)) {
                $q = $R['quests'][$m[2]] ?? null;
                $q !== null || $fail('unknown quest');
                $this->rewardPart($m[3] ?? '', $m[4] ?? null, $res, $d, $q, $level) || $fail('not this quest\'s reward');
                $this->slotDate($m[1], $at, $q['weekly'] ? 8 : 2) || $fail('quest period is not now');
                if (($m[3] ?? '') === '') {
                    $same = $this->countClaims("quest:{$m[1]}:%", fn ($k) => preg_match('/^quest:[0-9-]+:[a-z-]+$/', $k) === 1
                        && (($R['quests'][explode(':', $k)[2]]['weekly'] ?? false) === $q['weekly']));
                    foreach ($fresh as $f) {
                        if (preg_match("/^quest:{$m[1]}:([a-z-]+)$/", (string) $f['key'], $mm) && (($R['quests'][$mm[1]]['weekly'] ?? false) === $q['weekly'])) {
                            $same++;
                        }
                    }
                    $same <= ($q['weekly'] ? (int) $R['weeklyCount'] : (int) $R['dailyCount']) || $fail('more quests than the period has');
                }
            } elseif (preg_match('/^badge:([a-z]+):(\d+)(:coin|:seed:(\d+))?$/', $key, $m)) {
                $b = $R['badges'][$m[1]] ?? null;
                $tier = (int) $m[2];
                ($b !== null && $tier >= 1 && $tier <= count($b['tiers'])) || $fail('unknown badge tier');
                $reward = ['xp' => 20 * $tier, 'coins' => 10 * $tier, 'seeds' => $tier >= 3 ? 2 : 1, 'water' => 0];
                $this->rewardPart($m[3] ?? '', $m[4] ?? null, $res, $d, $reward, $level) || $fail('not this badge\'s reward');
                if (($m[3] ?? '') === '') {
                    ($tier === 1 || isset($byKey["badge:{$m[1]}:" . ($tier - 1)]) || $this->countClaims("badge:{$m[1]}:" . ($tier - 1)) > 0) || $fail('tiers are claimed in order');
                    $this->badgeValue($b['metric'], $new, $stats, $cooked) >= (int) $b['tiers'][$tier - 1] || $fail('badge goal not reached');
                }
            } elseif (preg_match('/^chest:(\d{4}-\d{2}-\d{2}):(\d+)(:coin|:seed:(\d+))?$/', $key, $m)) {
                $chest = $R['chests'][$m[2]] ?? null;
                $chest !== null || $fail('no chest at this streak');
                $this->rewardPart($m[3] ?? '', $m[4] ?? null, $res, $d, $chest, $level) || $fail('not this chest');
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
                ($res === "ingredient:{$a['product']}" && $d === (int) $a['yield']) || $fail('not what this animal gives');
                ((int) ($old['animals'][$m[1]]['fedAt'] ?? PHP_INT_MIN) === $t || isset($fed["{$m[1]}:$t"])) || $fail('animal was not fed');
                ($at + self::SLACK_MS >= $t + (int) $a['hoursMs'] && $level >= (int) $a['unlockLevel']) || $fail('collected too early');
            } elseif (preg_match('/^xp:collect:([a-z]+):(-?\d+)$/', $key, $m)) {
                $a = $R['animals'][$m[1]] ?? null;
                ($a !== null && isset($byKey["collect:{$m[1]}:{$m[2]}"]) && $d === self::harvestXp((int) $a['hoursMs'])) || $fail('animal XP');
            } elseif (preg_match('/^hive:(-?\d+):(honey|comb)$/', $key, $m)) {
                $t = (int) $m[1];
                $want = $m[2] === 'honey' ? ['ingredient:honey', $R['hive']['yield']['honey']] : ['ingredient:honeycomb', $R['hive']['yield']['honeycomb']];
                ($res === $want[0] && $d === (int) $want[1]) || $fail('hive yield');
                ((int) ($old['hive']['startedAt'] ?? PHP_INT_MIN) === $t || isset($hiveRestarts[$t]) || $t >= $ctx['lower']) || $fail('hive was not started');
                ($at + self::SLACK_MS >= $t + (int) $R['hive']['hoursMs'] && $level >= (int) $R['hive']['unlockLevel']) || $fail('hive emptied too early');
                $hiveRestarts[$at] = true;
            } elseif (preg_match('/^xp:hive:(-?\d+)$/', $key, $m)) {
                (isset($byKey["hive:{$m[1]}:honey"]) && $d === self::harvestXp((int) $R['hive']['hoursMs'])) || $fail('hive XP');
            } elseif (preg_match('/^boat:(-?\d+):(\d+)$/', $key, $m)) {
                $t = (int) $m[1];
                $i = (int) $m[2];
                $catch = $this->boatCatch($t, $lvBefore);
                ($i < count($catch) && $d === 1 && $res === "ingredient:{$catch[$i]}") || $fail('not what the boat brought');
                ((int) ($old['boat']['sentAt'] ?? PHP_INT_MIN) === $t || $t >= $ctx['lower']) || $fail('boat was not sent');
                ($at + self::SLACK_MS >= $t + (int) $R['boat']['hoursMs'] && $level >= (int) $R['boat']['unlockLevel']) || $fail('boat back too early');
                $stats['catch']++;
            } elseif (preg_match('/^xp:boat:(-?\d+)$/', $key, $m)) {
                $n = count(array_filter(array_keys($byKey), fn ($k) => preg_match("/^boat:{$m[1]}:\d+$/", (string) $k) === 1));
                ($n > 0 && $d === (int) $R['xp']['catch'] * $n) || $fail('boat XP');
            } elseif (preg_match('/^sell:([a-z0-9]+):(-?\d+):coin$/', $key, $m)) {
                $out = $byKey["sell:{$m[1]}:{$m[2]}:out"] ?? null;
                ($out !== null && (int) $out['delta'] === -1 && $out['resource'] === "ingredient:{$m[1]}" && $d === (int) ($R['sell'][$m[1]] ?? -1)) || $fail('sale price');
            } elseif (preg_match('/^buy:([a-z]+):(-?\d+):seed$/', $key, $m)) {
                $pay = $byKey["buy:{$m[1]}:{$m[2]}:coin"] ?? null;
                $def = $R['crops'][$m[1]] ?? null;
                ($def && $pay !== null && (int) $pay['delta'] === -(int) $def['seedPrice'] && $d === 1 && $res === "seed:{$m[1]}" && $this->available($m[1], $level)) || $fail('seed purchase');
            } elseif (preg_match('/^decor:([a-z]+)$/', $key, $m)) {
                $price = $R['decor'][$m[1]] ?? null;
                ($price !== null && $d === -(int) $price && $res === 'coin') || $fail('decoration price');
                $decor[] = $m[1];
            } elseif ($d > 0) {
                $fail('nothing in the game pays this');
            }
        }
        return [
            'stats' => $stats,
            'settle' => $settle,
            'deliver' => array_values(array_unique($deliver)),
            'cooked' => $cooked,
            'plantings' => $plantings,
            'regrows' => $regrows,
            'fed' => $fed,
            'checkins' => $checkins,
            'stamps' => $stamps,
            'decor' => $decor,
        ];
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
            }
        }
        foreach ($new['cooked'] as $recipe => $n) {
            if ((int) $n - (int) ($old['cooked'][$recipe] ?? 0) > ($out['cooked'][$recipe] ?? 0)) {
                $this->reject('rule', "cooked $recipe more often than recipes were cooked");
            }
        }
        $days = intdiv($ctx['elapsedMs'], 86_400_000) + 2;
        if ((int) ($new['streak']['count'] ?? 0) > (int) ($old['streak']['count'] ?? 0) + $days) {
            $this->reject('rule', 'streak grew faster than days passed');
        }

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
                && is_string($e['resource'] ?? null) && preg_match('/^(xp|coin|stamp|seed:[a-z]+|ingredient:[a-z]+)$/', $e['resource'])
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
    }

    // ——— Helpers ———

    private function reject(string $code, string $detail): never
    {
        error_log("[angi progress] user {$this->user} refused ($code): $detail");
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
            || preg_match('/^(friend|present|checkin|plant|seed|xp:choose):/', $k) === 1;
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

    private function badgeValue(string $metric, array $new, array $stats, array $cooked): int
    {
        if ($metric === 'eaten') {
            return count($new['stamps']['eaten']);
        }
        if ($metric === 'recipes') {
            return count(array_filter($new['cooked'], fn ($n) => (int) $n > 0));
        }
        $st = $this->db->prepare('SELECT metric, value FROM verified_stats WHERE user_id = ? AND metric IN (?, ?)');
        $st->execute([$this->user, $metric, 'base:' . $metric]);
        $total = array_sum(array_map('intval', $st->fetchAll(PDO::FETCH_KEY_PAIR)));
        return $total + (int) ($stats[$metric] ?? 0);
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
    private function slotDate(string $date, int $at, int $days = 2): bool
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
        $field = $kind === 'seed' ? 'seeds' : 'ingredients';
        return (int) ($p[$field][$id] ?? 0);
    }

    public static function level(int $xp): int
    {
        return intdiv(max(0, $xp), (int) self::rules()['xpPerLevel']) + 1;
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

    public function boatCatch(int $sentAt, int $lv): array
    {
        $out = [];
        for ($i = 0; $i < (int) $this->r['boat']['catches']; $i++) {
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

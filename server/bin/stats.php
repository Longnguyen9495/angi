<?php

declare(strict_types=1);

// Command-line only: a web request that reaches this file gets a 404 and nothing runs.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

/*
 * How accounts play over time, read from the database (guests without an account are not
 * in it). Usage: php server/bin/stats.php [--user=ID]
 *   --user=ID   one garden: its refused saves and the last 100 entries of its activity log.
 *
 * Retention is "rolling": of the accounts at least N days old, the share still seen on day N
 * or later (last session or last save). The activity log (progress_events) only keeps 90
 * days, so retention is read from sessions and saves instead.
 */

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/ProgressGuard.php';

$pdo = db();
Schema::ensure($pdo);
$now = time();
$day = 86400;

$one = null;
foreach (array_slice($argv, 1) as $arg) {
    if (preg_match('/^--user=(\d+)$/', $arg, $m)) {
        $one = (int) $m[1];
    }
}
if ($one !== null) {
    $at = fn (int $s) => gmdate('Y-m-d H:i', $s) . 'Z';
    $q = $pdo->prepare('SELECT code, detail, created_at, ip_hash FROM guard_rejections WHERE user_id = ? ORDER BY id DESC LIMIT 50');
    $q->execute([$one]);
    echo "Refused saves of user $one (newest first):
";
    foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $r) {
        echo sprintf("  %s  %-8s %s  [%s]
", $at((int) $r['created_at']), $r['code'], $r['detail'], $r['ip_hash'] ?? '-');
    }
    $q = $pdo->prepare('SELECT entry_key, resource, delta, at_ms, saved_at, ip_hash FROM progress_events WHERE user_id = ? ORDER BY id DESC LIMIT 100');
    $q->execute([$one]);
    echo "
Activity of user $one (last 100 entries, newest first; time on the device clock):
";
    foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $e) {
        echo sprintf("  %s  %+6d %-22s %s  [%s]
", $at(intdiv((int) $e['at_ms'], 1000)), (int) $e['delta'], $e['resource'], $e['entry_key'], $e['ip_hash'] ?? '-');
    }
    exit(0);
}

$users = $pdo->query(
    'SELECT u.id, u.created_at,
            MAX(COALESCE(s.last_seen, 0)) AS seen,
            p.updated_at AS saved, p.data
       FROM users u
       LEFT JOIN user_sessions s ON s.user_id = u.id
       LEFT JOIN user_progress p ON p.user_id = u.id
      GROUP BY u.id, u.created_at, p.updated_at, p.data',
)->fetchAll(PDO::FETCH_ASSOC);

$pct = fn (int $a, int $b) => $b === 0 ? '—' : sprintf('%d%% (%d/%d)', (int) round(100 * $a / $b), $a, $b);
$last = function (array $u): int {
    $saved = (int) ($u['saved'] ?? 0);
    // updated_at may be in ms or s depending on the writer; keep seconds.
    if ($saved > 20_000_000_000) {
        $saved = intdiv($saved, 1000);
    }
    return max((int) $u['seen'], $saved);
};

echo "Accounts: " . count($users) . "\n";
foreach ([7, 30] as $n) {
    $new = count(array_filter($users, fn ($u) => (int) $u['created_at'] >= $now - $n * $day));
    echo "  created in the last $n days: $new\n";
}

echo "\nRolling retention (still seen on day N or later):\n";
foreach ([1, 3, 7, 14, 30] as $n) {
    $eligible = array_filter($users, fn ($u) => (int) $u['created_at'] <= $now - $n * $day);
    $kept = array_filter($eligible, fn ($u) => $last($u) >= (int) $u['created_at'] + $n * $day);
    echo sprintf("  D%-3d %s\n", $n, $pct(count($kept), count($eligible)));
}

$games = array_values(array_filter(array_map(fn ($u) => json_decode((string) ($u['data'] ?? ''), true), $users), 'is_array'));
echo "\nGardens with a save: " . count($games) . "\n";
if ($games) {
    $levels = array_map(fn ($p) => ProgressGuard::level((int) ($p['xp'] ?? 0)), $games);
    sort($levels);
    $buckets = ['1–4' => 0, '5–9' => 0, '10–14' => 0, '15–21' => 0, '22+' => 0];
    foreach ($levels as $lv) {
        $k = $lv < 5 ? '1–4' : ($lv < 10 ? '5–9' : ($lv < 15 ? '10–14' : ($lv < 22 ? '15–21' : '22+')));
        $buckets[$k]++;
    }
    echo '  level: median ' . $levels[intdiv(count($levels), 2)] . ', max ' . end($levels) . "\n";
    foreach ($buckets as $k => $n) {
        echo sprintf("    %-6s %d\n", $k, $n);
    }
    $starAt = ProgressGuard::rules()['guests']['starAt'];
    $stars = fn ($p) => array_sum(array_map(fn ($t) => count(array_filter($starAt, fn ($n) => (int) $t >= (int) $n)), (array) ($p['cooked'] ?? [])));
    $has = fn (callable $f) => $pct(count(array_filter($games, $f)), count($games));
    echo "\nFeatures used (share of gardens):\n";
    echo '  cleared a plot          ' . $has(fn ($p) => count((array) ($p['plots'] ?? [])) > 4) . "\n";
    echo '  upgraded a building     ' . $has(fn ($p) => array_sum(array_map('intval', (array) ($p['upgrades'] ?? []))) > 0) . "\n";
    echo '  claimed a collection    ' . $has(fn ($p) => count((array) ($p['collections'] ?? [])) > 0) . "\n";
    echo '  served an event guest   ' . $has(fn ($p) => array_sum(array_map(fn ($e) => count((array) ($e['days'] ?? [])), (array) ($p['events'] ?? []))) > 0) . "\n";
    echo '  bought decorations      ' . $has(fn ($p) => count((array) ($p['decor'] ?? [])) > 0) . "\n";
    echo '  cooked 10+ recipes      ' . $has(fn ($p) => count(array_filter((array) ($p['cooked'] ?? []), fn ($n) => (int) $n > 0)) >= 10) . "\n";
    $all = array_map($stars, $games);
    echo '  mastery stars: average ' . round(array_sum($all) / count($all), 1) . ', max ' . max($all) . "\n";
}

// ——— Fair play: what deserves a look (from progress_events and guard_rejections, Schema v6) ———
$week = $now - 7 * $day;
$rows = fn (string $sql, array $args = []) => (function () use ($pdo, $sql, $args) {
    $st = $pdo->prepare($sql);
    $st->execute($args);
    return $st->fetchAll(PDO::FETCH_ASSOC);
})();
echo "
Fair play, last 7 days (details: php server/bin/stats.php --user=ID):
";

$refused = $rows('SELECT code, COUNT(*) AS n, COUNT(DISTINCT user_id) AS users FROM guard_rejections WHERE created_at >= ? GROUP BY code ORDER BY n DESC', [$week]);
echo "  refused saves by code:" . ($refused ? '' : ' none') . "
";
foreach ($refused as $r) {
    echo sprintf("    %-8s %d (%d accounts)
", $r['code'], $r['n'], $r['users']);
}
// "clock" is mostly honest devices changing time zone; the other codes are edited saves.
$repeat = $rows("SELECT user_id, COUNT(*) AS n, GROUP_CONCAT(DISTINCT code) AS codes FROM guard_rejections WHERE created_at >= ? AND code <> 'clock' GROUP BY user_id HAVING COUNT(*) >= 3 ORDER BY n DESC LIMIT 20", [$week]);
echo "  accounts refused 3+ times (not clock):" . ($repeat ? '' : ' none') . "
";
foreach ($repeat as $r) {
    echo sprintf("    user %-6d %d refusals (%s)
", $r['user_id'], $r['n'], $r['codes']);
}

// Near the daily XP cap (20000) on some day: a bot, or someone playing very hard.
$xpDay = [];
foreach ($rows("SELECT user_id, saved_at, delta FROM progress_events WHERE saved_at >= ? AND resource = 'xp' AND delta > 0 AND entry_key NOT LIKE 'import:%'", [$week]) as $e) {
    $k = $e['user_id'] . ' ' . gmdate('Y-m-d', (int) $e['saved_at']);
    $xpDay[$k] = ($xpDay[$k] ?? 0) + (int) $e['delta'];
}
$xpDay = array_filter($xpDay, fn ($n) => $n >= 15000);
arsort($xpDay);
echo "  days with 15000+ XP:" . ($xpDay ? '' : ' none') . "
";
foreach (array_slice($xpDay, 0, 20, true) as $k => $n) {
    [$uid, $date] = explode(' ', $k);
    echo sprintf("    user %-6d %s  %d XP
", $uid, $date, $n);
}

// Round the clock: active in 20+ different hours of one day (people sleep; scripts do not).
$hours = [];
foreach ($rows('SELECT user_id, at_ms FROM progress_events WHERE saved_at >= ?', [$week]) as $e) {
    $sec = intdiv((int) $e['at_ms'], 1000);
    $hours[$e['user_id']][intdiv($sec, $day)][intdiv($sec % $day, 3600)] = true;
}
$sleepless = [];
foreach ($hours as $uid => $days) {
    $most = max(array_map('count', $days));
    if ($most >= 20) {
        $sleepless[$uid] = $most;
    }
}
arsort($sleepless);
echo "  active 20+ hours in one day:" . ($sleepless ? '' : ' none') . "
";
foreach (array_slice($sleepless, 0, 20, true) as $uid => $n) {
    echo sprintf("    user %-6d %d hours
", $uid, $n);
}

// Many accounts saving from one network (keyed hash of the address): family and school
// wifi are normal, a dozen new accounts gifting the same garden is not (see farm_events).
$shared = $rows('SELECT ip_hash, COUNT(DISTINCT user_id) AS users FROM progress_events WHERE saved_at >= ? AND ip_hash IS NOT NULL GROUP BY ip_hash HAVING COUNT(DISTINCT user_id) >= 4 ORDER BY users DESC LIMIT 10', [$week]);
echo "  networks with 4+ accounts:" . ($shared ? '' : ' none') . "
";
foreach ($shared as $r) {
    $ids = array_column($rows('SELECT DISTINCT user_id FROM progress_events WHERE ip_hash = ? AND saved_at >= ? LIMIT 30', [$r['ip_hash'], $week]), 'user_id');
    $gifts = $ids ? (int) $rows('SELECT COUNT(*) AS n FROM farm_events WHERE created_at >= ? AND from_user IN (' . implode(',', array_map('intval', $ids)) . ') AND to_user IN (' . implode(',', array_map('intval', $ids)) . ')', [$week])[0]['n'] : 0;
    echo sprintf("    %s  %d accounts (%s), %d friend events between them
", $r['ip_hash'], $r['users'], implode(', ', $ids), $gifts);
}

// Biggest earners of xu this week, to compare against what play can earn.
$rich = $rows("SELECT user_id, SUM(delta) AS xu FROM progress_events WHERE saved_at >= ? AND resource = 'coin' AND delta > 0 GROUP BY user_id ORDER BY xu DESC LIMIT 10", [$week]);
echo "  most xu earned:" . ($rich ? '' : ' none') . "
";
foreach ($rich as $r) {
    echo sprintf("    user %-6d %d xu
", $r['user_id'], $r['xu']);
}

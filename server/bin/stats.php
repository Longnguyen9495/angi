<?php

declare(strict_types=1);

// Command-line only: a web request that reaches this file gets a 404 and nothing runs.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

/*
 * How accounts play over time, read from the database (guests without an account are not
 * in it). Usage: php server/bin/stats.php
 *
 * Retention is "rolling": of the accounts at least N days old, the share still seen on day N
 * or later (last session or last save). There is no per-day activity log, so this is the
 * closest measure the data allows.
 */

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/ProgressGuard.php';

$pdo = db();
$now = time();
$day = 86400;

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

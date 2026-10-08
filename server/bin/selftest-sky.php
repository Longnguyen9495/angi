<?php

declare(strict_types=1);

// Command-line only: a web request that reaches this file gets a 404 and nothing runs.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

// Exercises Vườn Mây's server side (Sky.php) on a throwaway SQLite database: the switch, bug
// reveals, star-up (stale version, retry with the same opId, the sure fifth try), tier-up, and a
// save on top of a server-made change passing the guard.
// Usage: php server/bin/selftest-sky.php   (touches no real data)

$tmp = sys_get_temp_dir() . '/bepviet-sky-' . bin2hex(random_bytes(4)) . '.sqlite';
putenv('DB_DRIVER=sqlite');
putenv("DB_PATH=$tmp");
putenv('APP_ENV=local');
putenv('MAIL_DRIVER=log');
putenv('SKY_SECRET=selftest-sky-secret');

require_once __DIR__ . '/../lib/Sky.php';
require_once __DIR__ . '/testkit.php';

db()->exec(file_get_contents(__DIR__ . '/../sql/schema.sqlite.sql'));
$acc = new Account(db());
Settings::save(db(), ['fairPlay' => ['autoBan' => false]]);
$failures = 0;
$check = function (string $name, bool $ok, string $why = '') use (&$failures): void {
    echo ($ok ? 'PASS ' : 'FAIL ') . $name . ($ok || $why === '' ? '' : " — $why") . "\n";
    if (!$ok) {
        $failures++;
    }
};
$status = function (callable $fn): int {
    try {
        $fn();
    } catch (HttpError $e) {
        return $e->status;
    }
    return 0;
};

try {
    $r = $acc->requestCode(['email' => 'may@example.vn', 'consent' => true], '9.9.9.9');
    $before = array_column(db()->query('SELECT token_hash FROM user_sessions')->fetchAll(), 'token_hash');
    $acc->verifyCode(['email' => 'may@example.vn', 'code' => $r['devCode']]);
    $token = bin2hex(random_bytes(32));
    $marks = count($before) ? implode(',', array_fill(0, count($before), '?')) : "''";
    db()->prepare("UPDATE user_sessions SET token_hash = ? WHERE token_hash NOT IN ($marks)")->execute([hash('sha256', $token), ...$before]);
    $_COOKIE['bepviet_guest'] = $token;
    $uid = (int) $acc->requireUser()['id'];

    $sky = new Sky(db(), $acc);
    $check('off by default', $sky->status()['enabled'] === false);
    $check('star-up refused while off', $status(fn () => $sky->starUp([])) === 403);
    Settings::save(db(), ['sky' => ['enabled' => true]]);
    Settings::reset();
    $check('on after the admin turns it on', $sky->status()['enabled'] === true);

    // A stored garden with a sky branch (written as the server holds it).
    $now = (int) floor(microtime(true) * 1000);
    $xp19 = ProgressGuard::xpForLevel(19);
    $pot = fn (string $uid, string $kind, int $stars = 0, array $extra = []) => array_replace([
        'uid' => $uid, 'pot' => $kind, 'tier' => SkyRules::R()['pots'][$kind]['tier'], 'stars' => $stars,
        'luck' => 0, 'tries' => 0, 'cycles' => 0, 'plant' => null,
    ], $extra);
    $plant = ['seed' => ['kind' => 'sky', 'id' => 'jasmine'], 'cycle' => 0, 'plantedAt' => $now - 40 * 60_000,
        'readyAt' => $now + 5 * 60_000, 'wateredAt' => null, 'stats' => ['time' => 0, 'xp' => 0, 'bug' => 0, 'coin' => 0], 'bugs' => [], 'caught' => []];
    $garden = progress_fixture('sky-guest', ['xp' => $xp19, 'coins' => 5000]) + ['sky' => [
        'floors' => 2, 'bought' => [0, 0],
        'slots' => [['bamboo_basket.0', null, null, null, null, null], [null, null, null, null, null, null]],
        'pots' => [
            'bamboo_basket.0' => $pot('bamboo_basket.0', 'bamboo_basket', 0, ['cycles' => 1, 'plant' => $plant]),
            'pumpkin.1' => $pot('pumpkin.1', 'pumpkin', 5),
            'corn.2' => $pot('corn.2', 'corn'),
        ],
        'serial' => 3, 'firstPot' => 'bamboo_basket.0',
        'seeds' => [], 'bugs' => ['ladybug' => 20, 'butterfly' => 3, 'goldbeetle' => 1], 'items' => [], 'goods' => [],
        'jobs' => [], 'tutorial' => [], 'sets' => [],
        'day' => ['date' => gmdate('Y-m-d'), 'xp' => 0, 'harvests' => 0, 'dew' => 0], 'balloon' => null,
        'balloonStreak' => ['count' => 0, 'last' => null],
    ]];
    db()->prepare('INSERT INTO user_progress (user_id, data, version, updated_at, guest_id, client_at, client_offset, baseline_at) VALUES (?, ?, 1, ?, ?, ?, 0, ?)')
        ->execute([$uid, json_encode($garden), time(), 'sky-guest', $now, time()]);

    // Bugs: the checks reached so far, the tutorial pot's first one a ladybug.
    $b = $sky->bugs()['bugs'];
    $check('reveals the checks already reached', count($b) === 3, json_encode($b));
    $check('tutorial ladybug on the first check of the first pot', ($b[0]['bug'] ?? null) === 'ladybug');
    $again = $sky->bugs()['bugs'];
    $check('the same bugs every time', $again === $b);

    // Star-up.
    $check('stale version refused', $status(fn () => $sky->starUp(['uid' => 'bamboo_basket.0', 'opId' => 'op-stale-0001', 'baseVersion' => 0, 'clientNow' => $now])) === 409);
    $s1 = $sky->starUp(['uid' => 'bamboo_basket.0', 'opId' => 'op-first-0001', 'baseVersion' => 1, 'clientNow' => $now]);
    $p1 = $s1['data']['sky']['pots']['bamboo_basket.0'];
    $check('first star always works', $s1['result'] === 'success' && $p1['stars'] >= 1, json_encode($s1['result']));
    $check('three common bugs and 50 xu paid', $s1['data']['sky']['bugs']['ladybug'] === 17 && $s1['data']['coins'] === 4950);
    $check('version moved on', $s1['version'] === 2);
    $rep = $sky->starUp(['uid' => 'bamboo_basket.0', 'opId' => 'op-first-0001', 'baseVersion' => 1, 'clientNow' => $now]);
    $check('the same opId never rolls twice', $rep['result'] === 'repeat' && $rep['version'] === 2
        && $rep['data']['sky']['pots']['bamboo_basket.0']['stars'] === $p1['stars']);

    // The fifth try at a star always works (luck or not).
    $version = 2;
    $tries = 0;
    $stars = $p1['stars'];
    do {
        $res = $sky->starUp(['uid' => 'bamboo_basket.0', 'opId' => 'op-try-' . str_pad((string) $tries, 6, '0', STR_PAD_LEFT), 'baseVersion' => $version, 'clientNow' => $now]);
        $version = $res['version'];
        $tries++;
    } while ($res['result'] === 'fail' && $tries < 10);
    $check('a star within five tries', $res['result'] === 'success' && $tries <= 5, "$tries tries");

    // A save of the garden as the server left it passes the guard.
    $data = $res['data'];
    $data['settings']['motion'] = 'reduce';
    $ok = $status(fn () => $acc->putProgress(['data' => $data, 'baseVersion' => $version, 'clientNow' => $now + 1000]));
    $check('a save on top of a server star passes', $ok === 0, "status $ok");
    $version++;

    // A client may not give itself stars.
    $forged = $data;
    $forged['sky']['pots']['corn.2']['stars'] = 4;
    $check('stars written by the client refused', $status(fn () => $acc->putProgress(['data' => $forged, 'baseVersion' => $version, 'clientNow' => $now + 2000])) === 422);

    // Tier-up: the ★5 pumpkin, the ★0 corn of the same set, the gold beetle.
    $t = $sky->tierUp(['uid' => 'pumpkin.1', 'feed' => 'corn.2', 'opId' => 'op-tier-0001', 'baseVersion' => $version, 'clientNow' => $now + 3000]);
    $pk = $t['data']['sky']['pots']['pumpkin.1'];
    $check('tier up', $pk['tier'] === SkyRules::R()['pots']['pumpkin']['tier'] + 1 && $pk['stars'] === 0);
    $check('the fed pot is gone', !isset($t['data']['sky']['pots']['corn.2']));
    $check('the gold beetle is spent', ($t['data']['sky']['bugs']['goldbeetle'] ?? 0) === 0);
    $ok = $status(fn () => $acc->putProgress(['data' => $t['data'], 'baseVersion' => $t['version'], 'clientNow' => $now + 4000]));
    $check('a save on top of a tier-up passes', $ok === 0, "status $ok");
} finally {
    @unlink($tmp);
}
echo $failures === 0 ? "ALL PASS\n" : "$failures FAILED\n";
exit($failures === 0 ? 0 : 1);

<?php

declare(strict_types=1);

// Command-line only: a web request that reaches this file gets a 404 and nothing runs.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

// Vườn Mây with friends (G5, plans/vuon-may.md §13.2) on a throwaway SQLite database: the
// cloud garden shown to a visiting friend, catching a common bug for them (once per bug, five a
// day for the helper, five a day for the garden), and both saves that take the events passing
// the guard while a forged one does not.
// Usage: php server/bin/selftest-sky-friends.php   (touches no real data)

$tmp = sys_get_temp_dir() . '/bepviet-skyfr-' . bin2hex(random_bytes(4)) . '.sqlite';
putenv('DB_DRIVER=sqlite');
putenv("DB_PATH=$tmp");
putenv('APP_ENV=local');
putenv('MAIL_DRIVER=log');
putenv('SKY_SECRET=selftest-sky-secret');

require_once __DIR__ . '/../lib/Friends.php';
require_once __DIR__ . '/testkit.php';

db()->exec(file_get_contents(__DIR__ . '/../sql/schema.sqlite.sql'));
$acc = new Account(db());
$fr = new Friends(db(), $acc);
Settings::save(db(), ['fairPlay' => ['autoBan' => false], 'sky' => ['enabled' => true]]);
Settings::reset();
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
$guest = function (string $email) use ($acc): string {
    $r = $acc->requestCode(['email' => $email, 'consent' => true], '9.9.9.' . random_int(1, 200));
    $before = array_column(db()->query('SELECT token_hash FROM user_sessions')->fetchAll(), 'token_hash');
    $acc->verifyCode(['email' => $email, 'code' => $r['devCode']]);
    $token = bin2hex(random_bytes(32));
    $marks = count($before) ? implode(',', array_fill(0, count($before), '?')) : "''";
    db()->prepare("UPDATE user_sessions SET token_hash = ? WHERE token_hash NOT IN ($marks)")
        ->execute([hash('sha256', $token), ...$before]);
    return $token;
};
$as = function (string $token): void {
    $_COOKIE['bepviet_guest'] = $token;
};

$now = (int) floor(microtime(true) * 1000);
$R = SkyRules::R();
/** A stored garden with a cloud garden: `$pots` pots on floor 1, all planted long enough for every check. */
$garden = function (string $guestId, int $pots) use ($now, $R): array {
    $all = ['bamboo_basket', 'bamboo', 'redfruit', 'pumpkin', 'corn', 'cabbage'];
    $slots = [[null, null, null, null, null, null]];
    $out = [];
    for ($i = 0; $i < $pots; $i++) {
        $uid = $all[$i] . '.' . $i;
        $slots[0][$i] = $uid;
        $out[$uid] = [
            'uid' => $uid, 'pot' => $all[$i], 'tier' => $R['pots'][$all[$i]]['tier'], 'stars' => $i % 3,
            'luck' => 0, 'tries' => 0, 'cycles' => 1,
            'plant' => ['seed' => ['kind' => 'sky', 'id' => 'jasmine'], 'cycle' => 0, 'plantedAt' => $now - 44 * 60_000,
                'readyAt' => $now + 60_000, 'wateredAt' => null,
                'stats' => ['time' => 0, 'xp' => 0, 'bug' => 6000, 'coin' => 0], 'bugs' => [], 'caught' => []],
        ];
    }
    return progress_fixture($guestId, ['xp' => ProgressGuard::xpForLevel(15), 'coins' => 1000]) + ['sky' => [
        'floors' => 1, 'bought' => [3], 'slots' => $slots, 'pots' => $out,
        'serial' => $pots, 'firstPot' => null,
        'seeds' => [], 'bugs' => [], 'items' => [], 'goods' => [],
        'jobs' => [], 'tutorial' => [], 'sets' => [],
        'day' => ['date' => gmdate('Y-m-d'), 'xp' => 0, 'harvests' => 0, 'dew' => 0], 'balloon' => null,
        'balloonStreak' => ['count' => 0, 'last' => null],
    ]];
};
$store = function (int $uid, array $data) use ($now): void {
    db()->prepare('INSERT INTO user_progress (user_id, data, version, updated_at, guest_id, client_at, client_offset, baseline_at) VALUES (?, ?, 1, ?, ?, ?, 0, ?)')
        ->execute([$uid, json_encode($data), time(), $data['guestId'], $now, time()]);
};

try {
    $a = $guest('an@example.vn');
    $b = $guest('binh@example.vn');
    $c = $guest('chi@example.vn');
    $d = $guest('dung@example.vn');
    $ids = [];
    foreach (['a' => $a, 'b' => $b, 'c' => $c, 'd' => $d] as $k => $tok) {
        $as($tok);
        $ids[$k] = (int) $acc->requireUser()['id'];
    }
    $aGarden = $garden('guest-a', 1);
    $store($ids['a'], $aGarden);
    $store($ids['b'], $garden('guest-b', 6));
    $store($ids['d'], $garden('guest-d', 1));
    // c has no cloud garden.
    $as($b);
    $bCode = $fr->profile()['code'];
    foreach ([$a, $c, $d] as $tok) {
        $as($tok);
        $fr->add(['code' => $bCode]);
    }

    // A visits B.
    $as($a);
    $v = $fr->visit($bCode);
    $sky = $v['sky'] ?? null;
    $check('a friend sees the cloud garden', is_array($sky) && count($sky['floors']) === 1);
    $expect = 0;
    foreach ($sky['floors'][0] as $p) {
        $expect += $p === null ? 0 : 10 * ($p['tier'] + 1) + $p['stars'];
    }
    $check('Điểm vườn = Σ 10 × (tier + 1) + stars', $sky['score'] === $expect && $expect > 0, (string) $sky['score']);
    $json = json_encode($v);
    $check('no ledger, seeds or store in the friend view', !str_contains($json, 'ledger') && !str_contains($json, '"luck"') && !str_contains($json, 'sky-test'));
    $catchable = [];
    $rare = [];
    foreach ($sky['floors'][0] as $p) {
        foreach ($p['bugs'] ?? [] as $bug) {
            $bug['catchable'] ? $catchable[] = [$p['uid'], $bug['stage']] : $rare[] = [$p['uid'], $bug['stage']];
            if ($bug['catchable'] && $R['bugs'][$bug['bug']]['cls'] !== 'common') {
                $check('only common bugs are catchable', false, $bug['bug']);
            }
        }
    }
    $check('enough common bugs to test the quotas', count($catchable) >= 6, (string) count($catchable));
    $check('the list says how many catches are left', $v['skyHelpsLeft'] === Friends::SKY_HELPS_PER_DAY);
    $list = $fr->list();
    $check('the friends board shows the garden score', ($list['friends'][0]['skyScore'] ?? null) === $sky['score'] && is_int($list['me']['skyScore']));

    // Catching.
    [$u0, $s0] = $catchable[0];
    $r = $fr->skyCatch($bCode, ['uid' => $u0, 'stage' => $s0]);
    $check('a common bug caught for a friend', $r['ok'] === true && $r['bug'] === 'ladybug');
    $gone = true;
    foreach ($r['sky']['floors'][0] as $p) {
        foreach ($p['bugs'] ?? [] as $bug) {
            if ($p['uid'] === $u0 && $bug['stage'] === $s0 && $bug['catchable']) {
                $gone = false;
            }
        }
    }
    $check('that bug is no longer catchable', $gone);
    $check('the same bug twice is refused', $status(fn () => $fr->skyCatch($bCode, ['uid' => $u0, 'stage' => $s0])) === 429);
    if ($rare) {
        $check('a rare bug is the owner\'s', $status(fn () => $fr->skyCatch($bCode, ['uid' => $rare[0][0], 'stage' => $rare[0][1]])) === 422);
    }
    $check('a pot that is not there', $status(fn () => $fr->skyCatch($bCode, ['uid' => 'corn.99', 'stage' => 0])) === 422);
    $check('a bad pot id', $status(fn () => $fr->skyCatch($bCode, ['uid' => '../x', 'stage' => 0])) === 422);
    for ($i = 1; $i < Friends::SKY_HELPS_PER_DAY; $i++) {
        $fr->skyCatch($bCode, ['uid' => $catchable[$i][0], 'stage' => $catchable[$i][1]]);
    }
    $check('five catches a day for the helper', $status(fn () => $fr->skyCatch($bCode, ['uid' => $catchable[5][0], 'stage' => $catchable[5][1]])) === 429);

    $as($c);
    $check('a helper without a cloud garden is refused', $status(fn () => $fr->skyCatch($bCode, ['uid' => $catchable[5][0], 'stage' => $catchable[5][1]])) === 403);
    $as($d);
    $check('five catches a day for the garden', $status(fn () => $fr->skyCatch($bCode, ['uid' => $catchable[5][0], 'stage' => $catchable[5][1]])) === 429);

    // The helper's save takes the ladybug of one event.
    $as($a);
    $evs = array_values(array_filter($fr->events()['events'], fn ($e) => $e['type'] === 'skyhelp'));
    $check('the helper gets a skyhelp event per catch', count($evs) === Friends::SKY_HELPS_PER_DAY);
    $at = $now + 1000;
    $save = $aGarden;
    $save['sky']['bugs']['ladybug'] = 1;
    $save['ledger'][] = ['key' => "friend:{$evs[0]['id']}:bug", 'resource' => 'bug:ladybug', 'delta' => 1, 'balanceAfter' => 1, 'reason' => 'friend:skyhelp', 'at' => $at];
    $forged = $save;
    $forged['sky']['bugs'] = ['butterfly' => 1];
    $forged['ledger'][count($forged['ledger']) - 1]['resource'] = 'bug:butterfly';
    $check('a butterfly for a ladybug event refused', $status(fn () => $acc->putProgress(['data' => $forged, 'baseVersion' => 1, 'clientNow' => $at])) === 422);
    $ok = $status(fn () => $acc->putProgress(['data' => $save, 'baseVersion' => 1, 'clientNow' => $at]));
    $check('the helper\'s ladybug passes the guard', $ok === 0, "status $ok");
    $twice = $save;
    $twice['sky']['bugs']['ladybug'] = 2;
    $twice['ledger'][] = ['key' => "friend:{$evs[0]['id']}:bug", 'resource' => 'bug:ladybug', 'delta' => 1, 'balanceAfter' => 2, 'reason' => 'friend:skyhelp', 'at' => $at + 1];
    $check('the same event paid twice refused', $status(fn () => $acc->putProgress(['data' => $twice, 'baseVersion' => 2, 'clientNow' => $at + 1])) === 422);

    // The owner hears of it.
    $as($b);
    $own = array_values(array_filter($fr->events()['events'], fn ($e) => $e['type'] === 'skycaught'));
    $check('the owner gets a skycaught event per catch', count($own) === Friends::SKY_HELPED_PER_DAY
        && $own[0]['crop'] === $u0 && $own[0]['plotId'] === $s0 && $own[0]['cycle'] === 0);

    // Watering B's cloud pots (§5.7). Before any friend waters, a planting that ripens as soon as
    // one friend's watering would allow is refused; after it, the same save passes.
    $bGarden = $garden('guest-b', 6);
    $bUids = array_keys($bGarden['sky']['pots']);
    $pl0 = $bGarden['sky']['pots'][$bUids[0]]['plant'];
    $grow = SkyRules::plantGrowMs(SkyRules::growMs($pl0['seed'], ProgressGuard::rules()), 0);
    $cut = 1 - (float) ProgressGuard::rules()['watering']['cut'];
    $soon = $pl0['plantedAt'] + (int) ($grow * ($cut + $cut ** 2) / 2);
    $early = $bGarden;
    $early['sky']['pots'][$bUids[0]]['plant']['readyAt'] = $soon;
    $as($b);
    $check('ripening as if a friend watered, before one did, refused', $status(fn () => $acc->putProgress(['data' => $early, 'baseVersion' => 1, 'clientNow' => $now + 500])) === 422);

    $as($a);
    $v = $fr->visit($bCode);
    $check('growing pots are waterable', ($v['sky']['floors'][0][0]['waterable'] ?? null) === true && $v['skyWatersLeft'] === Friends::SKY_WATERS_PER_DAY);
    $r = $fr->skyWater($bCode, ['uid' => $bUids[0]]);
    $check('a friend waters a cloud pot', $r['ok'] === true && $r['sky']['floors'][0][0]['waterable'] === false && $r['skyWatersLeft'] === Friends::SKY_WATERS_PER_DAY - 1);
    $as($d);
    $check('one friend\'s watering per planting', $status(fn () => $fr->skyWater($bCode, ['uid' => $bUids[0]])) === 429);
    $as($c);
    $check('a waterer without a cloud garden is refused', $status(fn () => $fr->skyWater($bCode, ['uid' => $bUids[1]])) === 403);
    $as($a);
    $check('a pot that is not there cannot be watered', $status(fn () => $fr->skyWater($bCode, ['uid' => 'corn.99'])) === 422);
    for ($i = 1; $i < Friends::SKY_WATERS_PER_DAY; $i++) {
        $fr->skyWater($bCode, ['uid' => $bUids[$i]]);
    }
    $check('five waterings a day for the helper', $status(fn () => $fr->skyWater($bCode, ['uid' => $bUids[5]])) === 429);
    $wev = array_values(array_filter($fr->events()['events'], fn ($e) => $e['type'] === 'skywatered'));
    $check('the helper gets a skywatered event per watering', count($wev) === Friends::SKY_WATERS_PER_DAY);

    $as($b);
    $own = array_values(array_filter($fr->events()['events'], fn ($e) => $e['type'] === 'skywater'));
    $check('the owner gets a skywater event naming the pot and planting', count($own) === Friends::SKY_WATERS_PER_DAY
        && $own[0]['crop'] === $bUids[0] && $own[0]['cycle'] === 0);
    $xp = (int) ProgressGuard::rules()['xp']['friendHelp'];
    $watered = $early;
    $watered['xp'] += $xp;
    $watered['sky']['pots'][$bUids[0]]['plant']['wateredAt'] = $now + 500;
    $watered['ledger'][] = ['key' => "friend:{$own[0]['id']}:xp", 'resource' => 'xp', 'delta' => $xp, 'balanceAfter' => $watered['xp'], 'reason' => 'friend:skywater', 'at' => $now + 500];
    $ok = $status(fn () => $acc->putProgress(['data' => $watered, 'baseVersion' => 1, 'clientNow' => $now + 500]));
    $check('the owner\'s save with the friend\'s watering passes', $ok === 0, "status $ok");
    $twoCuts = $watered;
    $twoCuts['sky']['pots'][$bUids[1]]['plant']['readyAt'] = $bGarden['sky']['pots'][$bUids[1]]['plant']['plantedAt'] + (int) ($grow * $cut ** 3);
    $check('more cuts than the friends\' waterings refused', $status(fn () => $acc->putProgress(['data' => $twoCuts, 'baseVersion' => 2, 'clientNow' => $now + 600])) === 422);

    Settings::save(db(), ['sky' => ['enabled' => false]]);
    Settings::reset();
    $as($d);
    $check('no catching while Vườn Mây is off', $status(fn () => $fr->skyCatch($bCode, ['uid' => $catchable[5][0], 'stage' => $catchable[5][1]])) === 403);
    $check('no watering while Vườn Mây is off', $status(fn () => $fr->skyWater($bCode, ['uid' => $bUids[5]])) === 403);
} finally {
    @unlink($tmp);
}
echo $failures === 0 ? "ALL PASS\n" : "$failures FAILED\n";
exit($failures === 0 ? 0 : 1);

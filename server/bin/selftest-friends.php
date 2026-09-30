<?php

declare(strict_types=1);

// Exercises Khu vườn bạn bè end to end on a throwaway SQLite database.
// Usage: php server/bin/selftest-friends.php   (touches no real data)

$tmp = sys_get_temp_dir() . '/bepviet-friends-' . bin2hex(random_bytes(4)) . '.sqlite';
putenv('DB_DRIVER=sqlite');
putenv("DB_PATH=$tmp");
putenv('APP_ENV=local');
putenv('MAIL_DRIVER=log');

require_once __DIR__ . '/../lib/Friends.php';

db()->exec(file_get_contents(__DIR__ . '/../sql/schema.sqlite.sql'));
$acc = new Account(db());
$fr = new Friends(db(), $acc);
$failures = 0;
$check = function (string $name, bool $ok) use (&$failures): void {
    echo ($ok ? 'PASS ' : 'FAIL ') . $name . "\n";
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
/** Creates a signed-in guest and returns their session token (setcookie is a no-op in CLI). */
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

try {
    $check('signed-out guests get 401', $status(fn () => $fr->list()) === 401);

    $a = $guest('an@example.vn');
    $b = $guest('binh@example.vn');
    $nowMs = time() * 1000;

    $as($b);
    $acc->putProgress(['data' => [
        'guestId' => 'gb',
        'xp' => 230,
        'decor' => ['lantern'],
        'plots' => [
            ['id' => 1, 'crop' => 'rice', 'plantedAt' => $nowMs - 1000, 'readyAt' => $nowMs + 3600e3, 'wateredAt' => null],
            ['id' => 2, 'crop' => 'tomato', 'plantedAt' => $nowMs - 9e6, 'readyAt' => $nowMs - 1000, 'wateredAt' => null],
            ['id' => 3, 'crop' => null, 'plantedAt' => null, 'readyAt' => null, 'wateredAt' => null],
        ],
        'email' => 'should-not-leak@example.vn',
    ], 'baseVersion' => 0]);
    $bCode = $fr->profile()['code'];
    $check('garden code is 6 safe characters', (bool) preg_match('/^[A-HJ-NP-Z2-9]{6}$/', $bCode));
    $check('profile code is stable', $fr->profile()['code'] === $bCode);
    $renamed = $fr->rename(['name' => '  Vườn   nhà <b>Bình</b> ']);
    $check('garden name is trimmed and stripped', $renamed['name'] === 'Vườn nhà Bình');
    $check('long names are refused', $status(fn () => $fr->rename(['name' => str_repeat('a', 41)])) === 422);

    $as($a);
    $aCode = $fr->profile()['code'];
    $check('bad code format is 422', $status(fn () => $fr->add(['code' => 'abc'])) === 422);
    $check('unknown code is 404', $status(fn () => $fr->add(['code' => $aCode === 'ZZZZZZ' ? 'YYYYYY' : 'ZZZZZZ'])) === 404);
    $check('own code is refused', $status(fn () => $fr->add(['code' => $aCode])) === 422);
    $check('visiting a stranger is 404', $status(fn () => $fr->visit($bCode)) === 404);

    $list = $fr->add(['code' => strtolower($bCode)]);
    $check('adding by code (any case) links the gardens', count($list['friends']) === 1 && $list['friends'][0]['code'] === $bCode);
    $check('friend summary: level, ready and growing plots', $list['friends'][0]['level'] === 3 && $list['friends'][0]['ready'] === 1 && $list['friends'][0]['growing'] === 1);
    $check('adding twice is harmless', count($fr->add(['code' => $bCode])['friends']) === 1);
    $as($b);
    $check('friendship is mutual', count($fr->list()['friends']) === 1);

    $as($a);
    $visit = $fr->visit($bCode);
    $check('visit shows plots and decor', count($visit['plots']) === 3 && $visit['decor'] === ['lantern'] && $visit['name'] === 'Vườn nhà Bình');
    $check('visit never includes emails', !str_contains(json_encode($visit), '@'));

    $check('watering a ready plot is refused', $status(fn () => $fr->water($bCode, ['plotId' => 2])) === 422);
    $check('watering an empty plot is refused', $status(fn () => $fr->water($bCode, ['plotId' => 3])) === 422);
    $w = $fr->water($bCode, ['plotId' => 1]);
    $check('watering a growing plot works', $w['ok'] === true && $w['helpedToday'] === true && $w['helpsLeft'] === Friends::HELPS_PER_DAY - 1);
    $check('only once per friend per day', $status(fn () => $fr->water($bCode, ['plotId' => 1])) === 429);

    $mine = $fr->events()['events'];
    $types = array_column($mine, 'type');
    $check('helper gets a "helped" event and a daily gift', in_array('helped', $types, true) && in_array('gift', $types, true));
    $gift = array_values(array_filter($mine, fn ($e) => $e['type'] === 'gift'))[0];
    $check('gift is a starter seed from Cô Ba', $gift['from'] === 'Cô Ba' && in_array($gift['crop'], ['rice', 'herbs', 'chili', 'scallion', 'bean', 'tomato'], true));
    $check('one gift per day', count(array_filter($fr->events()['events'], fn ($e) => $e['type'] === 'gift')) === 1);

    $as($b);
    $bEvents = $fr->events()['events'];
    $water = array_values(array_filter($bEvents, fn ($e) => $e['type'] === 'water'))[0] ?? null;
    $check('owner gets the water event with plot and crop', $water && $water['plotId'] === 1 && $water['crop'] === 'rice');
    $check('event names the helper by garden code, not email', $water && $water['from'] === "Khu vườn $aCode");
    $fr->ack(['ids' => array_column($bEvents, 'id')]);
    $check('acked events are not sent again', count($fr->events()['events']) === 0);

    $as($a);
    $check('helps left counts down', $fr->list()['helpsLeft'] === Friends::HELPS_PER_DAY - 1);
    $check('removing a friend unlinks both sides', count($fr->remove($bCode)['friends']) === 0);
    $as($b);
    $check('…for the friend too', count($fr->list()['friends']) === 0);

    $as($a);
    $fr->add(['code' => $bCode]);
    $acc->delete();
    $as($b);
    $check('deleting an account removes it from friends lists', count($fr->list()['friends']) === 0);
    $aId = (int) (db()->query("SELECT COUNT(*) FROM users WHERE email = 'an@example.vn'")->fetchColumn());
    $leftRows = (int) db()->query('SELECT COUNT(*) FROM garden_profiles')->fetchColumn();
    $check('…and its garden profile', $aId === 0 && $leftRows === 1);
} catch (Throwable $e) {
    $check('unexpected error: ' . $e->getMessage() . ' @' . $e->getLine(), false);
}
echo $failures === 0 ? "All friends checks passed.\n" : "$failures friends check(s) failed.\n";
@unlink($tmp);
exit($failures === 0 ? 0 : 1);

<?php

declare(strict_types=1);

// Command-line only: a web request that reaches this file gets a 404 and nothing runs.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

// Exercises Khu vườn bạn bè end to end on a throwaway SQLite database.
// Usage: php server/bin/selftest-friends.php   (touches no real data)

$tmp = sys_get_temp_dir() . '/bepviet-friends-' . bin2hex(random_bytes(4)) . '.sqlite';
putenv('DB_DRIVER=sqlite');
putenv("DB_PATH=$tmp");
putenv('APP_ENV=local');
putenv('MAIL_DRIVER=log');

require_once __DIR__ . '/../lib/Friends.php';
require_once __DIR__ . '/testkit.php';

db()->exec(file_get_contents(__DIR__ . '/../sql/schema.sqlite.sql'));
$acc = new Account(db());
// These checks send forged saves on purpose: refusals alert but never lock the farm here.
Settings::save(db(), ['fairPlay' => ['autoBan' => false]]);
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
    $bGarden = progress_fixture('guest-gb', [
        'xp' => 230,
        'decor' => ['lantern'],
        'plots' => [
            ['id' => 1, 'crop' => 'rice', 'plantedAt' => $nowMs - 1000, 'readyAt' => $nowMs + 3_600_000, 'wateredAt' => null],
            ['id' => 2, 'crop' => 'tomato', 'plantedAt' => $nowMs - 9_000_000, 'readyAt' => $nowMs - 1000, 'wateredAt' => null],
            ['id' => 3, 'crop' => null, 'plantedAt' => null, 'readyAt' => null, 'wateredAt' => null],
            ['id' => 4, 'crop' => 'chili', 'plantedAt' => $nowMs - 9_000_000, 'readyAt' => $nowMs - 7_200_000, 'wateredAt' => null],
        ],
        'email' => 'should-not-leak@example.vn',
    ]);
    $acc->putProgress(['data' => $bGarden, 'baseVersion' => 0]);
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
    $check('friend summary: level, ready and growing plots', $list['friends'][0]['level'] === 3 && $list['friends'][0]['ready'] === 2 && $list['friends'][0]['growing'] === 1);
    $check('friend summary: only the long-ripe plot can be picked', $list['friends'][0]['stealable'] === 1 && $list['stealsLeft'] === Friends::STEALS_PER_DAY);
    $check('adding twice is harmless', count($fr->add(['code' => $bCode])['friends']) === 1);
    $as($b);
    $check('friendship is mutual', count($fr->list()['friends']) === 1);

    $as($a);
    $visit = $fr->visit($bCode);
    $check('visit shows plots and decor', count($visit['plots']) === 4 && $visit['decor'] === ['lantern'] && $visit['name'] === 'Vườn nhà Bình');
    $check('visit never includes emails', !str_contains(json_encode($visit), '@'));

    $check('watering a ready plot is refused', $status(fn () => $fr->water($bCode, ['plotId' => 2])) === 422);
    $check('watering an empty plot is refused', $status(fn () => $fr->water($bCode, ['plotId' => 3])) === 422);
    $w = $fr->water($bCode, ['plotId' => 1]);
    $check('watering a growing plot works', $w['ok'] === true && $w['helpedToday'] === true && $w['helpsLeft'] === Friends::HELPS_PER_DAY - 1);
    $check('only once per friend per day', $status(fn () => $fr->water($bCode, ['plotId' => 1])) === 429);

    $check('picking a just-ripe plot is refused', $status(fn () => $fr->steal($bCode, ['plotId' => 2])) === 422);
    $check('picking a growing plot is refused', $status(fn () => $fr->steal($bCode, ['plotId' => 1])) === 422);
    $s = $fr->steal($bCode, ['plotId' => 4]);
    $picked = array_values(array_filter($s['plots'], fn ($p) => $p['id'] === 4))[0];
    $check('picking a long-ripe plot works and marks it', $s['ok'] === true && $s['crop'] === 'chili' && $picked['stolen'] === true && $picked['stealable'] === false);
    $check('one pick per friend per day', $status(fn () => $fr->steal($bCode, ['plotId' => 4])) === 429 && $s['stoleToday'] === true && $s['stealsLeft'] === Friends::STEALS_PER_DAY - 1);

    $check('gifting an unknown seed is refused', $status(fn () => $fr->gift($bCode, ['crop' => 'gold'])) === 422);
    $check('gifting a seed you do not have is refused', $status(fn () => $fr->gift($bCode, ['crop' => 'rice'])) === 422);
    $aGarden = progress_fixture('guest-ga', ['seeds' => ['rice' => 1]]);
    $acc->putProgress(['data' => $aGarden, 'baseVersion' => 0]);
    $g = $fr->gift($bCode, ['crop' => 'rice']);
    $check('gifting a seed returns its event id', $g['ok'] === true && str_starts_with($g['id'], 'e') && $g['giftsLeft'] === Friends::GIFTS_PER_DAY - 1);
    $check('one gift per friend per day', $status(fn () => $fr->gift($bCode, ['crop' => 'bean'])) === 429);
    $sync = $fr->syncEvents();
    $check('the sent seed is owed until a save takes it out of the tray', $sync['pendingGifts'] === [['id' => $g['id'], 'crop' => 'rice']]);
    $check('a save that still holds the sent seed for planting is refused', $status(fn () => $acc->putProgress([
        'data' => with_entries($aGarden, [['tray:3:' . $nowMs, 'seed:rice', -1, $nowMs]]),
        'baseVersion' => 1,
    ])) === 422);
    $acc->putProgress(['data' => with_entries($aGarden, [['present:' . $g['id'], 'seed:rice', -1]]), 'baseVersion' => 1]);
    $check('…and once saved, nothing is owed', $fr->events()['pendingGifts'] === []);

    $mine = $fr->syncEvents()['events'];
    $types = array_column($mine, 'type');
    $check('helper gets a "helped" event and a daily gift', in_array('helped', $types, true) && in_array('gift', $types, true));
    $stoleEv = array_values(array_filter($mine, fn ($e) => $e['type'] === 'stole'))[0] ?? null;
    $check('picker gets a "stole" event with the crop', $stoleEv && $stoleEv['crop'] === 'chili');
    $gift = array_values(array_filter($mine, fn ($e) => $e['type'] === 'gift'))[0];
    $check('gift is a starter seed from Cô Ba', $gift['from'] === 'Cô Ba' && in_array($gift['crop'], ['rice', 'herbs', 'chili', 'scallion', 'bean', 'tomato'], true));
    $check('one gift per day', count(array_filter($fr->syncEvents()['events'], fn ($e) => $e['type'] === 'gift')) === 1);
    $check('reading events writes nothing', count($fr->events()['events']) === count($fr->events()['events']));

    $as($b);
    $bEvents = $fr->syncEvents()['events'];
    $water = array_values(array_filter($bEvents, fn ($e) => $e['type'] === 'water'))[0] ?? null;
    $check('owner gets the water event with plot and crop', $water && $water['plotId'] === 1 && $water['crop'] === 'rice');
    $check('event names the helper by garden code, not email', $water && $water['from'] === "Khu vườn $aCode");
    $stolen = array_values(array_filter($bEvents, fn ($e) => $e['type'] === 'stolen'))[0] ?? null;
    $present = array_values(array_filter($bEvents, fn ($e) => $e['type'] === 'present'))[0] ?? null;
    $check('owner hears about the pick (plot, crop and planting)', $stolen && $stolen['plotId'] === 4 && $stolen['crop'] === 'chili' && $stolen['cycle'] === $nowMs - 9_000_000);
    $check('friend receives the seed', $present && $present['crop'] === 'rice');
    // B's app applies each event under friend:<id>; the save carrying them is what counts.
    $apply = [];
    foreach ($bEvents as $ev) {
        $apply[] = match ($ev['type']) {
            'water' => ["friend:{$ev['id']}:xp", 'xp', 3],
            'gift', 'present' => ["friend:{$ev['id']}:seed", "seed:{$ev['crop']}", 1],
            default => ["friend:{$ev['id']}:seen", 'xp', 0],
        };
    }
    $check('an event cannot pay more than it gives', $status(fn () => $acc->putProgress(['data' => with_entries($bGarden, [["friend:{$water['id']}:xp", 'xp', 30]]), 'baseVersion' => 1])) === 422);
    $bSaved = with_entries($bGarden, $apply);
    $acc->putProgress(['data' => $bSaved, 'baseVersion' => 1]);
    $check('events saved into the garden are not sent again', count($fr->events()['events']) === 0);
    // The device ledger forgets old entries; the server does not.
    $evicted = $bSaved;
    $evicted['ledger'] = array_values(array_filter($evicted['ledger'], fn ($e) => !str_starts_with($e['key'], "friend:{$present['id']}")));
    $acc->putProgress(['data' => $evicted, 'baseVersion' => 2]);
    $check('a saved gift cannot be applied again once it left the ledger', $status(fn () => $acc->putProgress([
        'data' => with_entries($evicted, [["friend:{$present['id']}:seed", 'seed:rice', 1]]),
        'baseVersion' => 3,
    ])) === 422);
    $stolenHarvest = with_entries($evicted, [['harvest:4:' . ($nowMs - 9_000_000), 'ingredient:chili', 3]]);
    $stolenHarvest['plots'][3] = ['id' => 4, 'crop' => null, 'plantedAt' => null, 'readyAt' => null, 'wateredAt' => null];
    $check('a picked plot cannot be harvested in full', $status(fn () => $acc->putProgress(['data' => $stolenHarvest, 'baseVersion' => 3])) === 422);
    $stolenHarvest = with_entries($evicted, [['harvest:4:' . ($nowMs - 9_000_000), 'ingredient:chili', 2]]);
    $stolenHarvest['plots'][3] = ['id' => 4, 'crop' => null, 'plantedAt' => null, 'readyAt' => null, 'wateredAt' => null];
    $acc->putProgress(['data' => $stolenHarvest, 'baseVersion' => 3]);
    $check('…but the rest of it can', $acc->getProgress()['data']['ingredients']['chili'] === 2);
    $feed = $fr->feed()['items'];
    $pickedNews = array_values(array_filter($feed, fn ($i) => $i['type'] === 'stolen'))[0] ?? null;
    $check('news keeps acked events, with who to visit back', $pickedNews && $pickedNews['code'] === $aCode && $pickedNews['thanked'] === false);
    $fr->thanks($aCode);
    $fr->thanks($aCode);
    $check('thanks is remembered for today', (array_values(array_filter($fr->feed()['items'], fn ($i) => $i['type'] === 'present'))[0]['thanked'] ?? false) === true);

    $as($a);
    $check('helps left counts down', $fr->list()['helpsLeft'] === Friends::HELPS_PER_DAY - 1);
    $aFeed = $fr->feed()['items'];
    $check('news shows thanks received and the seed I sent', in_array('thanks', array_column($aFeed, 'type'), true) && in_array('sentPresent', array_column($aFeed, 'type'), true));
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

    // ——— Mời bạn mới ———
    $c = $guest('chi@example.vn');
    $d = $guest('dung@example.vn');
    $e = $guest('em@example.vn');
    $as($c);
    $cCode = $fr->profile()['code'];
    $as($d);
    $dCode = $fr->profile()['code'];
    $ref = $fr->add(['code' => $cCode])['referrals'];
    $check('a new account\'s first friend becomes its inviter', $ref['invitedBy'] !== null && $ref['invitedBy']['name'] === "Khu vườn $cCode" && $ref['invitedBy']['done'] === []);
    $check('referral lists the milestones', count($ref['milestones']) === count(Friends::MILESTONES) && $ref['max'] === Friends::MAX_REFERRALS);
    $as($c);
    $cRef = $fr->list()['referrals'];
    $check('the inviter sees the newcomer', count($cRef['invited']) === 1 && $cRef['invited'][0]['name'] === "Khu vườn $dCode" && $cRef['invitedBy'] === null);
    $fr->add(['code' => $dCode]);
    $check('never both ways round', $fr->list()['referrals']['invitedBy'] === null);
    $check('no reward before a milestone', !in_array('referral', array_column($fr->events()['events'], 'type'), true));

    $as($d);
    $acc->putProgress(['data' => progress_fixture('guest-gd', ['xp' => 250, 'quests' => ['total' => ['harvest' => 6, 'cook' => 0], 'badges' => []]]), 'baseVersion' => 0]);
    $refCoins = fn (array $events) => array_sum(array_column(array_filter($events, fn ($x) => $x['type'] === 'referral'), 'coins'));
    $check('numbers written in a save pay no invite reward', $refCoins($fr->syncEvents()['events']) === 0);
    // What the server verified from D's saves (ProgressGuard counts harvests and XP earned).
    $did = (int) db()->query("SELECT id FROM users WHERE email = 'dung@example.vn'")->fetchColumn();
    db()->prepare("INSERT INTO verified_stats (user_id, metric, value) VALUES (?, 'harvest', 6), (?, 'xp', 250)")->execute([$did, $did]);
    $want = Friends::MILESTONES[1]['coins'] + Friends::MILESTONES[3]['coins'];
    $check('the newcomer is paid for each verified milestone', $refCoins($fr->syncEvents()['events']) === $want);
    $check('…once', $refCoins($fr->syncEvents()['events']) === $want);
    $refXp = array_sum(array_column(array_filter($fr->syncEvents()['events'], fn ($x) => $x['type'] === 'referral'), 'xp'));
    $check('…with XP too', $refXp === Friends::MILESTONES[1]['xp'] + Friends::MILESTONES[3]['xp']);
    $check('…and sees them as done', $fr->list()['referrals']['invitedBy']['done'] === [1, 3]);
    $as($c);
    $cEvents = $fr->syncEvents()['events'];
    $check('the inviter is paid the same', $refCoins($cEvents) === $want);
    $check('the inviter sees the newcomer\'s progress', $fr->list()['referrals']['invited'][0]['done'] === [1, 3] && $fr->list()['referrals']['invited'][0]['level'] === 3);
    $check('referral news shows the coins', in_array($want, [array_sum(array_column(array_filter($fr->feed()['items'], fn ($x) => $x['type'] === 'referral'), 'coins'))], true));

    db()->prepare('UPDATE users SET created_at = ? WHERE email = ?')->execute([time() - 30 * 86400, 'em@example.vn']);
    $as($e);
    $check('an old account is not anyone\'s newcomer', $fr->add(['code' => $cCode])['referrals']['invitedBy'] === null);
    $as($d);
    $acc->delete();
    $check('deleting an account removes its referral', (int) db()->query('SELECT COUNT(*) FROM referrals')->fetchColumn() === 0);
    $as($c);
    $check('the inviter keeps what it was paid', $refCoins($fr->feed()['items']) === $want);
    $d2 = $guest('dung@example.vn');
    $as($d2);
    $check('a re-created account cannot be invited (and paid for) again', $fr->add(['code' => $cCode])['referrals']['invitedBy'] === null);
} catch (Throwable $e) {
    $check('unexpected error: ' . $e->getMessage() . ' @' . $e->getLine(), false);
}
echo $failures === 0 ? "All friends checks passed.\n" : "$failures friends check(s) failed.\n";
@unlink($tmp);
exit($failures === 0 ? 0 : 1);

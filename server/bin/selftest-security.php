<?php

declare(strict_types=1);

// Command-line only: a web request that reaches this file gets a 404 and nothing runs.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

/*
 * Security regressions for the audit findings (plans/kiem-toan-gian-lan-game.md and
 * plans/kiem-toan-bao-mat-project.md). In-memory SQLite, synthetic accounts, no mail,
 * no network, no production configuration. Every check states the safe behaviour; the
 * `--security` flag is kept for older scripts (all checks are strict now).
 *   php server/bin/selftest-security.php
 */
require_once __DIR__ . '/../lib/Friends.php';
require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Images.php';
require_once __DIR__ . '/testkit.php';

$pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pdo->exec('PRAGMA foreign_keys = ON');
$pdo->exec(file_get_contents(__DIR__ . '/../sql/schema.sqlite.sql'));
$account = new Account($pdo);
$friends = new Friends($pdo, $account);
$pass = $fail = 0;
$check = function (string $name, bool $ok) use (&$pass, &$fail): void {
    $ok ? $pass++ : $fail++;
    echo ($ok ? 'PASS ' : 'FAIL ') . $name . "\n";
};
$status = static function (callable $fn): int {
    try { $fn(); } catch (HttpError $e) { return $e->status; }
    return 0;
};
$code = static function (callable $fn): ?string {
    try { $fn(); } catch (HttpError $e) { return (string) ($e->extra['code'] ?? $e->status); }
    return null;
};
$guest = function (string $name) use ($pdo): array {
    $now = time();
    $pdo->prepare('INSERT INTO users (email, consent_version, consent_at, created_at) VALUES (?, ?, ?, ?)')
        ->execute([$name . '@example.invalid', Account::CONSENT_VERSION, $now, $now]);
    $id = (int) $pdo->lastInsertId();
    $token = bin2hex(random_bytes(32));
    $pdo->prepare('INSERT INTO user_sessions (token_hash, user_id, created_at, last_seen, expires_at) VALUES (?, ?, ?, ?, ?)')
        ->execute([hash('sha256', $token), $id, $now, $now, $now + 3600]);
    return ['id' => $id, 'token' => $token];
};
$as = static function (array $user): void { $_COOKIE['bepviet_guest'] = $user['token']; };
$save = function (array $data) use ($account): void {
    $account->putProgress(['data' => $data, 'baseVersion' => $account->getProgress()['version']]);
};
try {
    // ——— Controls ———
    $check('control signed-out progress is 401', $status(fn () => $account->getProgress()) === 401);
    $check('control missing application header is 403', $status(fn () => Account::requireAppHeader()) === 403);
    $_SERVER['HTTP_X_BEPVIET'] = '1';
    $_SERVER['HTTP_SEC_FETCH_SITE'] = 'cross-site';
    $check('A05/F14 a cross-site write is refused even with the header', $status(fn () => Account::requireAppHeader()) === 403);
    $_SERVER['HTTP_SEC_FETCH_SITE'] = 'same-origin';
    $check('control same-origin write with the header passes', $status(fn () => Account::requireAppHeader()) === 0);
    unset($_SERVER['HTTP_X_BEPVIET'], $_SERVER['HTTP_SEC_FETCH_SITE']);
    $check('A05 admin login without the same-origin header is refused', $status(fn () => Auth::requireSameOrigin()) === 403);

    $a = $guest('sender'); $b = $guest('recipient'); $c = $guest('stranger');
    $as($b); $bCode = $friends->profile()['code'];
    $as($a); $aCode = $friends->profile()['code'];
    $check('control stranger visit is 404', $status(fn () => $friends->visit($bCode)) === 404);
    $friends->add(['code' => $bCode]);

    // ——— F01: what a save may claim ———
    $aGarden = progress_fixture('guest-sender', ['seeds' => ['rice' => 1]]);
    $save($aGarden);
    $forged = with_entries($aGarden, []);
    $forged['coins'] = 999999999;
    $check('F01 xu edited without a ledger entry is refused', $code(fn () => $save($forged)) === 'balance');
    $check('F01 an XP entry nothing in the game pays is refused', $code(fn () => $save(with_entries($aGarden, [['bonus:1', 'xp', 1000]]))) === 'rule');
    $check('F01 a first save far beyond a new account is refused', $code(fn () => $save(progress_fixture('guest-other', ['xp' => 1_000_000]))) !== null);
    $check('control missing guestId is 422', $status(fn () => $save(['xp' => 1])) === 422);
    $check('control oversized snapshot is 413', $status(fn () => $save(['guestId' => 'large', 'padding' => str_repeat('x', 524288)])) === 413);
    $future = with_entries($aGarden, [['sell:rice:1:out', 'ingredient:rice', 0, (int) (microtime(true) * 1000) + 3_600_000]]);
    $check('F05 an entry dated an hour ahead of the device clock is refused', $code(fn () => $save($future)) === 'clock');
    $check('F05 a jump of the device clock between saves is refused', $code(fn () => $account->putProgress([
        'data' => $aGarden, 'baseVersion' => $account->getProgress()['version'], 'clientNow' => (int) (microtime(true) * 1000) + 3 * 3_600_000,
    ])) === 'clock');

    // ——— F02: a seed must exist to be sent, and is owed until saved as gone ———
    $check('F02 a locked seed with zero stock cannot be sent', $status(fn () => $friends->gift($bCode, ['crop' => 'durian'])) === 422);
    $gift = $friends->gift($bCode, ['crop' => 'rice']);
    $check('control a seed in the saved tray can be sent', $gift['ok'] === true);
    $check('F02 the same seed cannot be planted while still owed', $code(fn () => $save(with_entries($aGarden, [['tray:1:' . time() * 1000, 'seed:rice', -1, time() * 1000]]))) === 'gift_debit');
    $check('control sequential duplicate gift is 429', $status(fn () => $friends->gift($bCode, ['crop' => 'rice'])) === 429);
    $as($b);
    $present = array_values(array_filter($friends->syncEvents()['events'], fn ($e) => $e['type'] === 'present'));
    $check('control recipient receives the real seed', count($present) === 1 && $present[0]['crop'] === 'rice');

    // ——— F03: invite rewards follow verified activity only ———
    $as($a);
    $save(with_entries($aGarden, [['present:' . $gift['id'], 'seed:rice', -1]]));
    $big = progress_fixture('guest-sender-2', ['xp' => 5000, 'quests' => ['total' => ['harvest' => 5000, 'cook' => 5000], 'badges' => []]]);
    $save($big);
    $ref = array_values(array_filter($friends->syncEvents()['events'], fn ($e) => $e['type'] === 'referral'));
    $check('F03 made-up milestones pay nothing', count($ref) === 0);
    $pdo->prepare("INSERT INTO verified_stats (user_id, metric, value) VALUES (?, 'harvest', 5), (?, 'cook', 1), (?, 'xp', 400)")->execute([$a['id'], $a['id'], $a['id']]);
    $ref = array_values(array_filter($friends->syncEvents()['events'], fn ($e) => $e['type'] === 'referral'));
    $check('control verified milestones pay 200 xu + 90 XP', count($ref) === 4 && array_sum(array_column($ref, 'coins')) === 200 && array_sum(array_column($ref, 'xp')) === 90);
    $check('control referral events are not duplicated', count(array_filter($friends->syncEvents()['events'], fn ($e) => $e['type'] === 'referral')) === 4);

    // ——— F04/F10/F11: picks, cycles, the visitor's view ———
    $as($b);
    $now = time() * 1000;
    $garden = progress_fixture('guest-garden', [
        'plots' => [
            ['id' => 1, 'crop' => 'rice', 'plantedAt' => $now - 30_000_000, 'readyAt' => $now - 7_200_000, 'wateredAt' => null],
            ['id' => 2, 'crop' => null, 'plantedAt' => null, 'readyAt' => null, 'wateredAt' => null],
            ['id' => 3, 'crop' => null, 'plantedAt' => null, 'readyAt' => null, 'wateredAt' => null],
            ['id' => 4, 'crop' => null, 'plantedAt' => null, 'readyAt' => null, 'wateredAt' => null],
        ],
    ]);
    $save($garden);
    $pdo->prepare('UPDATE user_progress SET data = ? WHERE user_id = ?')->execute([json_encode(array_replace($garden, ['animals' => ['cow' => ['readyAt' => 'invalid']], 'decorLayout' => ['lantern' => ['x' => 1e100]]])), $b['id']]);
    $as($a);
    $visit = $friends->visit($bCode);
    $check('F11 malformed animals and layout never reach a visitor', $visit['animals'] == ['cow' => ['fedAt' => null, 'readyAt' => null]] && $visit['decorLayout'] == new stdClass());
    $pdo->prepare('UPDATE user_progress SET data = ? WHERE user_id = ?')->execute([json_encode($garden), $b['id']]);
    $friends->steal($bCode, ['plotId' => 1]);
    $as($b);
    $stolen = array_values(array_filter($friends->syncEvents()['events'], fn ($e) => $e['type'] === 'stolen'))[0];
    $check('F10 a pick names the planting it touched', $stolen['cycle'] === $now - 30_000_000);
    $friends->ack(['ids' => [$stolen['id']]]);
    $full = with_entries($garden, [['harvest:1:' . ($now - 30_000_000), 'ingredient:rice', 3]]);
    $full['plots'][0] = ['id' => 1, 'crop' => null, 'plantedAt' => null, 'readyAt' => null, 'wateredAt' => null];
    $check('F04 ignoring the pick does not bring back the picked crop', $code(fn () => $save($full)) === 'rule');
    $as($a);
    $friends->ack(['ids' => [$present[0]['id']]]);
    $as($b);
    $check('control cannot ACK another recipient event', in_array($present[0]['id'], array_column($friends->events()['events'], 'id'), true));

    // ——— F15: one journey, one account ———
    $as($c);
    $check('F15 the same journey cannot be saved under a second account', $code(fn () => $save($garden)) === 'owned');

    // ——— F17: deleting the sender keeps what it gave ———
    $as($a); $account->delete();
    $as($b);
    $remaining = $friends->events()['events'];
    $kept = in_array($present[0]['id'], array_column($remaining, 'id'), true);
    $check('F17 a gift from a deleted garden still arrives', $kept);
    $from = array_values(array_filter($remaining, fn ($e) => $e['id'] === $present[0]['id']))[0]['from'] ?? '';
    $check('F17 …from an anonymous former friend', $from === __t('friends.formerFriend'));
    $check('F03 a deleted invitee stays counted for its inviter (referral_log)', (int) $pdo->query('SELECT COUNT(*) FROM referral_log WHERE inviter_id = ' . $b['id'])->fetchColumn() === 1);
    $again = $guest('sender');
    $as($again);
    $friends->add(['code' => $bCode]);
    $check('F03 a re-created email is nobody\'s newcomer again', (int) $pdo->query('SELECT COUNT(*) FROM referrals WHERE invitee_id = ' . $again['id'])->fetchColumn() === 0);

    // SQLite fault injection: a failure in the middle of deleting changes nothing.
    $pdo->exec("CREATE TRIGGER fail_delete BEFORE DELETE ON friendships BEGIN SELECT RAISE(ABORT, 'injected deletion failure'); END");
    $before = (int) $pdo->query('SELECT COUNT(*) FROM farm_events WHERE from_user = ' . $again['id'] . ' OR to_user = ' . $again['id'])->fetchColumn()
        + (int) $pdo->query('SELECT COUNT(*) FROM garden_profiles WHERE user_id = ' . $again['id'])->fetchColumn();
    $threw = false;
    try { $account->delete(); } catch (PDOException $e) { $threw = str_contains($e->getMessage(), 'injected deletion failure'); }
    $after = (int) $pdo->query('SELECT COUNT(*) FROM farm_events WHERE from_user = ' . $again['id'] . ' OR to_user = ' . $again['id'])->fetchColumn()
        + (int) $pdo->query('SELECT COUNT(*) FROM garden_profiles WHERE user_id = ' . $again['id'])->fetchColumn();
    $check('F17 a failed deletion rolls back every step', $threw && $after === $before && $account->me() !== null);
    $pdo->exec('DROP TRIGGER fail_delete');

    // ——— A01/A02: one-time codes ———
    $pdo->exec("INSERT INTO login_codes (email, code_hash, link_hash, ip_hash, consent_version, marketing, attempts, expires_at, created_at)
        VALUES ('x@example.invalid', 'h', 'l', 'i', 'v', 0, 0, " . (time() + 600) . ', ' . time() . ')');
    $id = (int) $pdo->lastInsertId();
    $use = $pdo->prepare('UPDATE login_codes SET used_at = ? WHERE id = ? AND used_at IS NULL AND expires_at > ? AND attempts < 5');
    $use->execute([time(), $id, time()]);
    $first = $use->rowCount();
    $use->execute([time(), $id, time()]);
    $check('A01 a code is consumed by exactly one request', $first === 1 && $use->rowCount() === 0);
    $check('A02 code hashes are keyed (a plain SHA-256 of the code does not match)', secret_hash('otp|x@example.invalid|123456') !== hash('sha256', '123456'));

    // ——— A04: admin TOTP ———
    $secret = 'JBSWY3DPEHPK3PXP';
    $key = (function (string $s): string {
        $m = new ReflectionMethod(Auth::class, 'base32');
        return $m->invoke(null, $s);
    })($secret);
    $t = 1_700_000_000;
    $check('A04 TOTP accepts the current code', Auth::totpValid($secret, Auth::totp($key, intdiv($t, 30)), $t));
    $check('A04 TOTP refuses an old code', !Auth::totpValid($secret, Auth::totp($key, intdiv($t, 30) - 5), $t));

    // ——— B01/FE-01: media paths ———
    $check('B01 image paths with dot segments are refused', !preg_match(Images::LOCAL_IMAGE, '/uploads/../.env.webp') && !preg_match(Images::LOCAL_IMAGE, '/images/a/../../x.png'));
    $check('B01 the AI reader resolves nothing outside our folders', Images::safeLocalImage('/uploads/../../.env') === null && Images::safeLocalImage('/images/../../server/lib/bootstrap.php') === null);
    $check('control a normal image path is accepted', (bool) preg_match(Images::LOCAL_IMAGE, '/uploads/dishes/pho-bo-20260101-abc-768.webp'));
    $check('FE-01 a video must be one of ours (or an allowed https host)', !Images::allowedVideoUrl('https://evil.example/x.mp4') && !Images::allowedVideoUrl('javascript:alert(1)')
        && Images::allowedVideoUrl('/uploads/videos/pho-bo-1.mp4'));
} catch (Throwable $e) {
    $check('unexpected exception: ' . $e->getMessage() . ' line ' . $e->getLine(), false);
} finally {
    unset($_COOKIE['bepviet_guest']);
    $pdo = null;
}
echo "SUMMARY passed=$pass failed=$fail\n";
exit($fail === 0 ? 0 : 1);

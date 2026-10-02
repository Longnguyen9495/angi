<?php

declare(strict_types=1);

// No db(), OTP request, Mailer, HTTP or production configuration is used.
require_once __DIR__ . '/../lib/Friends.php';

$strict = in_array('--security', $argv, true);
$pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pdo->exec('PRAGMA foreign_keys = ON');
$pdo->exec(file_get_contents(__DIR__ . '/../sql/schema.sqlite.sql'));
$account = new Account($pdo);
$friends = new Friends($pdo, $account);
$pass = $fail = $known = 0;
$check = function (string $name, bool $ok) use (&$pass, &$fail): void {
    $ok ? $pass++ : $fail++;
    echo ($ok ? 'PASS ' : 'FAIL ') . $name . "\n";
};
$expect = function (string $name, bool $safe) use ($strict, &$known, $check): void {
    if (!$safe && !$strict) {
        $known++;
        echo 'KNOWN-FAIL security expectation: ' . $name . "\n";
    } else {
        $check('security expectation: ' . $name, $safe);
    }
};
$status = static function (callable $fn): int {
    try { $fn(); } catch (HttpError $e) { return $e->status; }
    return 0;
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
    $check('control signed-out progress is 401', $status(fn () => $account->getProgress()) === 401);
    $check('control missing application header is 403', $status(fn () => Account::requireAppHeader()) === 403);
    $a = $guest('sender'); $b = $guest('recipient'); $c = $guest('stranger');
    $as($b); $bCode = $friends->profile()['code'];
    $as($a); $aCode = $friends->profile()['code'];
    $check('control stranger visit is 404', $status(fn () => $friends->visit($bCode)) === 404);
    $friends->add(['code' => $bCode]);
    $forged = ['guestId' => 'forged', 'xp' => 1000000, 'coins' => 999999999, 'seeds' => ['durian' => 0], 'unlockedCrops' => [], 'quests' => ['total' => ['harvest' => 5000, 'cook' => 5000]]];
    $save($forged);
    $stored = $account->getProgress()['data'];
    $check('F01 characterization forged economics saved exactly', $stored === $forged);
    $expect('F01 forged economics must be rejected', $stored !== $forged);
    $check('control missing guestId is 422', $status(fn () => $save(['xp' => 1])) === 422);
    $check('control oversized snapshot is 413', $status(fn () => $save(['guestId' => 'large', 'padding' => str_repeat('x', 524288)])) === 413);
    $gift = $friends->gift($bCode, ['crop' => 'durian']);
    $check('F02 characterization locked seed with zero stock creates gift', $gift['ok'] === true && $account->getProgress()['data']['seeds']['durian'] === 0);
    $expect('F02 gift without stock must not commit', $gift['ok'] !== true);
    $check('control sequential duplicate gift is 429', $status(fn () => $friends->gift($bCode, ['crop' => 'rice'])) === 429);
    $as($b);
    $present = array_values(array_filter($friends->events()['events'], fn ($e) => $e['type'] === 'present'));
    $check('F02 recipient receives unsupported-stock seed', count($present) === 1 && $present[0]['crop'] === 'durian');
    $as($a);
    $ref = array_values(array_filter($friends->events()['events'], fn ($e) => $e['type'] === 'referral'));
    $check('F03 characterization forged milestones pay 200 coins and 90 XP', count($ref) === 4 && array_sum(array_column($ref, 'coins')) === 200 && array_sum(array_column($ref, 'xp')) === 90);
    $expect('F03 forged milestones must not pay', count($ref) === 0);
    $check('control referral events are not duplicated sequentially', count(array_filter($friends->events()['events'], fn ($e) => $e['type'] === 'referral')) === 4);
    $as($b);
    $recipientRef = array_values(array_filter($friends->events()['events'], fn ($e) => $e['type'] === 'referral'));
    $check('F03 inviter also receives 200 coins and 90 XP', count($recipientRef) === 4 && array_sum(array_column($recipientRef, 'coins')) === 200 && array_sum(array_column($recipientRef, 'xp')) === 90);
    $now = time() * 1000;
    $garden = ['guestId' => 'garden', 'plots' => [['id' => 1, 'crop' => 'durian', 'plantedAt' => $now - 9000000, 'readyAt' => $now - 7200000]], 'animals' => ['cow' => ['readyAt' => 'invalid']], 'decorLayout' => ['lantern' => ['x' => 1e100]]];
    $save($garden);
    $as($a);
    $visit = $friends->visit($bCode);
    $check('F11 characterization malformed animals/layout are passed through', $visit['animals'] === $garden['animals'] && $visit['decorLayout'] === $garden['decorLayout']);
    $friends->steal($bCode, ['plotId' => 1]);
    $as($b);
    $check('F04 characterization stealing does not debit owner snapshot', $account->getProgress()['data'] === $garden);
    $stolen = array_values(array_filter($friends->events()['events'], fn ($e) => $e['type'] === 'stolen'))[0];
    $check('F10 characterization event omits planting cycle', !array_key_exists('plantedAt', $stolen) && !array_key_exists('cycleId', $stolen));
    $friends->ack(['ids' => [$stolen['id']]]);
    $check('F10 characterization ACK needs no persisted application', $account->getProgress()['data'] === $garden && !in_array($stolen['id'], array_column($friends->events()['events'], 'id'), true));
    $as($a);
    $friends->ack(['ids' => [$present[0]['id']]]);
    $as($b);
    $check('control cannot ACK another recipient event', in_array($present[0]['id'], array_column($friends->events()['events'], 'id'), true));
    $as($a); $account->delete();
    $as($b);
    $remaining = $friends->events()['events'];
    $lost = !in_array($present[0]['id'], array_column($remaining, 'id'), true) && count(array_filter($remaining, fn ($e) => $e['type'] === 'referral')) === 0;
    $check('F17 characterization deleting sender loses pending gift/referral', $lost);
    $expect('F17 committed recipient effects must survive sender deletion', !$lost);
    $check('F03 deletion removes referral count', (int) $pdo->query('SELECT COUNT(*) FROM referrals')->fetchColumn() === 0);
    $again = $guest('sender'); $as($again); $friends->add(['code' => $bCode]); $save($forged);
    $check('F03 recreated same email can earn four milestones again', count(array_filter($friends->events()['events'], fn ($e) => $e['type'] === 'referral')) === 4);
    $as($c);
    $save($forged);
    $check('F15 identical snapshot can be stored under second owner', $account->getProgress()['data'] === $forged);
    // SQLite fault injection proves deletion is not atomic; all state is in memory.
    $pdo->exec("CREATE TRIGGER fail_delete BEFORE DELETE ON friendships BEGIN SELECT RAISE(ABORT, 'injected deletion failure'); END");
    $as($again);
    $before = (int) $pdo->query('SELECT COUNT(*) FROM farm_events WHERE from_user = ' . $again['id'] . ' OR to_user = ' . $again['id'])->fetchColumn();
    $threw = false;
    try { $account->delete(); } catch (PDOException $e) { $threw = str_contains($e->getMessage(), 'injected deletion failure'); }
    $after = (int) $pdo->query('SELECT COUNT(*) FROM farm_events WHERE from_user = ' . $again['id'] . ' OR to_user = ' . $again['id'])->fetchColumn();
    $check('F17 characterization injected failure leaves user but deletes events', $threw && $before > 0 && $after === 0 && $account->me() !== null);
    $expect('F17 failed deletion must roll back prior deletes', $after === $before);
} catch (Throwable $e) {
    $check('unexpected exception: ' . $e->getMessage() . ' line ' . $e->getLine(), false);
} finally {
    unset($_COOKIE['bepviet_guest']);
    $pdo = null;
}
echo "SUMMARY passed=$pass failed=$fail known_security_failures=$known mode=" . ($strict ? 'security' : 'characterization') . "\n";
exit($fail === 0 ? 0 : 1);

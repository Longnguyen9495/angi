<?php

declare(strict_types=1);

// Command-line only: a web request that reaches this file gets a 404 and nothing runs.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

/*
 * Spins (free per day, bought by transfer, the SePay webhook) and fair-play locks, on an
 * in-memory SQLite database. Usage: php server/bin/selftest-spins.php
 */
require_once __DIR__ . '/../lib/Spins.php';
require_once __DIR__ . '/../lib/FairPlay.php';
require_once __DIR__ . '/../lib/AdminUsers.php';

$pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pdo->exec(file_get_contents(__DIR__ . '/../sql/schema.sqlite.sql'));
Schema::upgrade($pdo);
Settings::reset();
$pdo->prepare("INSERT INTO users (id, email, consent_version, consent_at, created_at) VALUES (1, 'a@example.invalid', 'x', 0, 0), (2, 'b@example.invalid', 'x', 0, 0)")->execute();
$userA = ['id' => 1];
$_SERVER['REMOTE_ADDR'] = '203.0.113.7';

$pass = $fail = 0;
$check = function (string $name, bool $ok, string $why = '') use (&$pass, &$fail): void {
    $ok ? $pass++ : $fail++;
    if (!$ok) {
        echo "FAIL $name" . ($why !== '' ? " — $why" : '') . "\n";
    }
};
$status = function (callable $fn): array {
    try {
        $fn();
        return [200, null];
    } catch (HttpError $e) {
        return [$e->status, $e->extra['code'] ?? null];
    }
};
$browser = fn (string $id) => $_COOKIE['angi_spins'] = str_pad($id, 32, '0');

// ——— Free spins ———
// Pinned so the counts below don't follow the shipped default.
Settings::save($pdo, ['spins' => ['freePerDay' => 5]]);
$browser('a');
$guest = new Spins($pdo, null);
$check('guest starts with the daily allowance', $guest->status()['freeLeft'] === 5);
for ($i = 0; $i < 5; $i++) {
    $guest->use();
}
$check('guest has none left', $guest->status()['freeLeft'] === 0);
$check('guest past the allowance is asked to sign in', $status(fn () => $guest->use()) === [402, 'sign_in']);

// Same browser, now signed in: the browser already used the day.
$a = new Spins($pdo, $userA);
$check('signing in does not refill the day', $a->status()['freeLeft'] === 0);
$check('account without bought spins gets no_spins', $status(fn () => $a->use()) === [402, 'no_spins']);

// Another browser for the same account: the account's own count is what matters.
$browser('b');
$a2 = new Spins($pdo, $userA);
$check('a fresh browser of the account still has 5', $a2->status()['freeLeft'] === 5);
$a2->use();
$browser('c');
$a3 = new Spins($pdo, $userA);
$check('the account count follows it to a third browser', $a3->status()['freeLeft'] === 4);

// The next Vietnam day brings them back.
$tomorrow = (Spins::day(time()) + 1) * 86400 - 7 * 3600 + 60;
$check('free spins come back at Vietnam midnight', (new Spins($pdo, $userA, $tomorrow))->status()['freeLeft'] === 5);

// Network cap for guests: clearing cookies does not reset it forever.
Settings::save($pdo, ['spins' => ['guestNetworkCap' => 7]]);
$browser('d');
(new Spins($pdo, null))->use();
(new Spins($pdo, null))->use();
$browser('e');
$check('a guest network past its cap is asked to sign in', $status(fn () => (new Spins($pdo, null))->use()) === [402, 'sign_in']);
$check('signed-in accounts ignore the network cap', (new Spins($pdo, $userA))->status()['networkFull'] === false);
Settings::save($pdo, ['spins' => ['guestNetworkCap' => 100]]);

// ——— Orders ———
$browser('f');
$a = new Spins($pdo, $userA);
$check('no bank: buying is closed', $status(fn () => $a->createOrder(['spins' => 5])) === [503, null]);
Settings::save($pdo, ['bank' => ['bin' => '970436', 'name' => 'Vietcombank', 'account' => '0123456789', 'holder' => 'Nguyễn Văn Án']]);
$check('holder is stored as VietQR expects', Settings::get($pdo, 'bank')['holder'] === 'NGUYEN VAN AN');
$check('a pack that is not offered is refused', $status(fn () => $a->createOrder(['spins' => 3])) === [422, null]);
$o = $a->createOrder(['spins' => 5]);
$check('order price is 5 × 5.000đ', $o['amount'] === 25000 && $o['status'] === 'pending');
$check('order code shape', (bool) preg_match('/^AG[A-HJ-NP-Z2-9]{6}$/', $o['code']));
$check('asking again returns the same order', $a->createOrder(['spins' => 5])['code'] === $o['code']);
$check('qr carries amount and memo', str_contains((string) $o['qr'], '540525000') && str_contains((string) $o['qr'], $o['code']));
$crc = (new ReflectionMethod(Spins::class, 'crc16'));
$check('crc16 is CCITT-FALSE', $crc->invoke(null, '123456789') === '29B1');
$check('qr ends with its own crc', substr((string) $o['qr'], -4) === $crc->invoke(null, substr((string) $o['qr'], 0, -4)));
$check('another account cannot read the order', $status(fn () => (new Spins($pdo, ['id' => 2]))->order($o['code'])) === [404, null]);

$r = Spins::markPaid($pdo, $o['code'], 'admin');
$check('paying credits the spins', $r['credited'] && $a->status()['credits'] === 5);
$check('paying twice credits once', !Spins::markPaid($pdo, $o['code'], 'admin')['credited'] && $a->status()['credits'] === 5);
$check('paid order cannot be cancelled', $status(fn () => Spins::cancel($pdo, $o['code']))[0] === 409);
while ($a->status()['freeLeft'] > 0) {
    $a->use();
}
$u = $a->use();
$check('out of free spins, a bought one is used', $u['used'] === 'credit' && $u['credits'] === 4);

// ——— SePay webhook ———
$o2 = $a->createOrder(['spins' => 10]);
putenv('SEPAY_API_KEY=test-key');
$_SERVER['HTTP_AUTHORIZATION'] = 'Apikey wrong';
$check('webhook refuses a wrong key', $status(fn () => Spins::sepayWebhook($pdo, [])) === [401, null]);
$_SERVER['HTTP_AUTHORIZATION'] = 'Apikey test-key';
$short = Spins::sepayWebhook($pdo, ['id' => 91, 'transferType' => 'in', 'transferAmount' => 49000, 'content' => 'CK ' . strtolower($o2['code'])]);
$check('a short transfer pays nothing', !$short['matched'] && $a->status()['credits'] === 4);
$ok = Spins::sepayWebhook($pdo, ['id' => 92, 'transferType' => 'in', 'transferAmount' => 50000, 'content' => 'MBVCB.123 ' . $o2['code'] . ' FT26']);
$check('a matching transfer pays the order', $ok['matched'] && $ok['credited'] && $a->status()['credits'] === 14);
$again = Spins::sepayWebhook($pdo, ['id' => 92, 'transferType' => 'in', 'transferAmount' => 50000, 'content' => $o2['code']]);
$check('a retried webhook credits once', $again['matched'] && !$again['credited'] && $a->status()['credits'] === 14);
putenv('SEPAY_API_KEY');

// ——— Fair play ———
$fp = new FairPlay($pdo);
$now = time();
$reject = function (string $code, string $detail, int $at) use ($pdo): void {
    $pdo->prepare('INSERT INTO guard_rejections (user_id, code, detail, created_at) VALUES (2, ?, ?, ?)')->execute([$code, $detail, $at]);
};
$reject('clock', 'device clock moved since the last save', $now - 100);
$check('clock refusals are worth nothing', $fp->points(2, $now)['points'] === 0 && $fp->review(2, $now) === null);
$reject('rule', 'plot 3 ripens too soon', $now - 90);
$reject('rule', 'plot 4 ripens too soon', $now - 80);
$check('one reason retried within the hour counts once', $fp->points(2, $now)['points'] === 2);
$reject('balance', 'coin is 900, expected 100', $now - 70);
$r = $fp->review(2, $now);
$check('level 1 alerts without a lock', $r !== null && $r['level'] === 1 && !$r['banned'] && FairPlay::activeBan($pdo, 2, $now) === null);
$check('the same level does not alert twice', $fp->review(2, $now) === null);
$check('alert is unread', FairPlay::unseen($pdo) === 1);
$reject('replay', 'reward quest:x was already paid', $now - 60);
$r = $fp->review(2, $now);
$ban = FairPlay::activeBan($pdo, 2, $now);
$check('level 2 locks the farm for 6 hours', $r !== null && $r['level'] === 2 && $r['banned'] && $ban !== null && $ban['until'] === $now + 6 * 3600);
$check('a locked farm answers 423', $status(fn () => FairPlay::requireNotBanned($pdo, 2)) === [423, 'banned']);
$check('the lock ends on time', FairPlay::activeBan($pdo, 2, $now + 6 * 3600 + 1) === null);
$check('the other account is not locked', $status(fn () => FairPlay::requireNotBanned($pdo, 1)) === [200, null]);

Settings::save($pdo, ['fairPlay' => ['autoBan' => false]]);
$reject('replay', 'reward badge:y was already paid', $now - 50);
$reject('replay', 'reward chest:z was already paid', $now - 40);
$reject('shape', 'plots', $now - 30);
$r = $fp->review(2, $now);
$check('autoBan off: a new level only alerts', $r !== null && $r['level'] === 3 && !$r['banned']);
Settings::save($pdo, ['fairPlay' => ['autoBan' => true]]);

$admin = new AdminUsers($pdo);
$check('admin lifts the lock', $admin->unban(2, 'tester')['lifted'] === 1 && FairPlay::activeBan($pdo, 2) === null);
$admin->ban(2, ['hours' => 48, 'reason' => 'thử'], 'tester');
$b = FairPlay::activeBan($pdo, 2);
$check('admin locks by hand', $b !== null && $b['source'] === 'admin' && $b['by'] === 'tester' && $b['until'] >= time() + 48 * 3600 - 5);
$check('admin lock is capped at 90 days', $status(fn () => $admin->ban(2, ['hours' => 24 * 91], 'tester'))[0] === 422);
$check('admin gifts spins', $admin->giftSpins(1, ['spins' => 3], 'tester')['credits'] === 17);
$check('taking spins back never goes below zero', $admin->giftSpins(1, ['spins' => -100], 'tester')['credits'] === 0);
$details = $admin->get(2);
$check('user details carry fair play', $details['fairPlay']['ban'] !== null && $details['fairPlay']['points'] > 0);
$check('mark alerts read', $fp->markSeen(['all' => true])['unseen'] === 0);

$s = Settings::save($pdo, ['spins' => ['freePerDay' => -4, 'price' => 5, 'packs' => [0, 3, 3, 700]], 'fairPlay' => ['levels' => [['points' => 2, 'hours' => 99999]]]]);
$check('settings are clamped', $s['spins']['freePerDay'] === 0 && $s['spins']['price'] === 1000 && $s['spins']['packs'] === [3]
    && $s['fairPlay']['levels'] === [['points' => 2, 'hours' => Settings::MAX_BAN_HOURS]]);

echo "spins & fair play: $pass passed, $fail failed\n";
exit($fail === 0 ? 0 : 1);

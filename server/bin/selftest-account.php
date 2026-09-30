<?php

declare(strict_types=1);

// Exercises guest accounts end to end on a throwaway SQLite database.
// Usage: php server/bin/selftest-account.php   (touches no real data)

$tmp = sys_get_temp_dir() . '/bepviet-account-' . bin2hex(random_bytes(4)) . '.sqlite';
putenv('DB_DRIVER=sqlite');
putenv("DB_PATH=$tmp");
putenv('APP_ENV=local');
putenv('MAIL_DRIVER=log');

require_once __DIR__ . '/../lib/Account.php';

db()->exec(file_get_contents(__DIR__ . '/../sql/schema.sqlite.sql'));
$acc = new Account(db());
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
/** Sign in and hand the new session cookie to the next "request". */
$signIn = function (string $email, string $code) use ($acc): array {
    $before = array_column(db()->query('SELECT token_hash FROM user_sessions')->fetchAll(), 'token_hash');
    $user = $acc->verifyCode(['email' => $email, 'code' => $code]);
    // setcookie() is a no-op in CLI: mint a matching token by hand for the checks below.
    $token = bin2hex(random_bytes(32));
    db()->prepare('UPDATE user_sessions SET token_hash = ? WHERE token_hash NOT IN (' . (count($before) ? implode(',', array_fill(0, count($before), '?')) : "''") . ')')
        ->execute([hash('sha256', $token), ...$before]);
    $_COOKIE['bepviet_guest'] = $token;
    return $user;
};

try {
    $check('consent is required', $status(fn () => $acc->requestCode(['email' => 'a@b.vn'], '1.1.1.1')) === 422);
    $check('bad email rejected', $status(fn () => $acc->requestCode(['email' => 'nope', 'consent' => true], '1.1.1.1')) === 422);

    $r = $acc->requestCode(['email' => '  Khach@Example.VN ', 'consent' => true, 'marketing' => false], '1.1.1.1');
    $check('code sent, email normalised', $r['sent'] === true && $r['email'] === 'khach@example.vn' && strlen($r['devCode']) === 6);
    $wrong = $r['devCode'] === '000000' ? '111111' : '000000';
    $check('wrong code rejected', $status(fn () => $acc->verifyCode(['email' => 'khach@example.vn', 'code' => $wrong])) === 422);
    $check('codes are stored hashed', !db()->query("SELECT 1 FROM login_codes WHERE code_hash = '{$r['devCode']}'")->fetch());

    $user = $signIn('khach@example.vn', $r['devCode']);
    $check('right code signs in', $user['email'] === 'khach@example.vn' && $user['marketing'] === false);
    $check('code is single-use', $status(fn () => $acc->verifyCode(['email' => 'khach@example.vn', 'code' => $r['devCode']])) === 410);
    $check('session resolves the user', ($acc->me()['email'] ?? null) === 'khach@example.vn');

    $check('no progress yet', $acc->getProgress()['version'] === 0);
    $v1 = $acc->putProgress(['data' => ['guestId' => 'g1', 'xp' => 40], 'baseVersion' => 0]);
    $check('first save is version 1', $v1['version'] === 1);
    $v2 = $acc->putProgress(['data' => ['guestId' => 'g1', 'xp' => 55], 'baseVersion' => 1]);
    $check('next save bumps the version', $v2['version'] === 2 && $acc->getProgress()['data']['xp'] === 55);
    $check('invalid progress rejected', $status(fn () => $acc->putProgress(['data' => ['xp' => 1], 'baseVersion' => 2])) === 422);

    $check('marketing opt-in can be turned on', $acc->setPreferences(['marketing' => true])['marketing'] === true);
    $export = $acc->export();
    $check('export holds account, progress and sessions', $export['account']['email'] === 'khach@example.vn'
        && $export['progress']['data']['xp'] === 55 && count($export['sessions']) === 1);

    for ($i = 0; $i < 3; $i++) {
        $acc->requestCode(['email' => 'spam@example.vn', 'consent' => true], '2.2.2.2');
    }
    $check('4th code in 15 minutes is refused', $status(fn () => $acc->requestCode(['email' => 'spam@example.vn', 'consent' => true], '2.2.2.2')) === 429);

    $acc->delete();
    $left = (int) db()->query("SELECT COUNT(*) FROM users WHERE email = 'khach@example.vn'")->fetchColumn()
        + (int) db()->query('SELECT COUNT(*) FROM user_progress')->fetchColumn()
        + (int) db()->query("SELECT COUNT(*) FROM login_codes WHERE email = 'khach@example.vn'")->fetchColumn();
    $check('delete removes email, progress and codes', $left === 0);
    unset($_COOKIE['bepviet_guest']);
    $check('signed out after delete', $acc->me() === null);
} catch (Throwable $e) {
    $check('unexpected error: ' . $e->getMessage(), false);
}
echo $failures === 0 ? "All account checks passed.\n" : "$failures account check(s) failed.\n";
@unlink($tmp);
exit($failures === 0 ? 0 : 1);

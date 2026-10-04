<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/Schema.php';
require_once __DIR__ . '/RateLimit.php';
require_once __DIR__ . '/Mailer.php';
require_once __DIR__ . '/LoginCodeEmail.php';
require_once __DIR__ . '/ProgressGuard.php';

/*
 * Optional guest accounts: email + one-time code, no password. The only thing
 * stored besides the email is the guest's game progress (JSON) — no photos,
 * no location. Codes are kept as keyed hashes (useless without APP_KEY), link and session
 * tokens as SHA-256 hashes; every one-time step is a conditional update in a transaction.
 */
final class Account
{
    /** Bump when the privacy text the guest agrees to changes. */
    public const CONSENT_VERSION = '2026-10-03';

    private const COOKIE = 'bepviet_guest';
    /** Binds an emailed link to the browser that asked for it (see verifyLink). */
    private const LOGIN_COOKIE = 'bepviet_login';
    private const SESSION_DAYS = 180;
    private const CODE_TTL = 600;
    private const MAX_ATTEMPTS = 5;
    public const MAX_PROGRESS_BYTES = 512 * 1024;

    public function __construct(private PDO $db)
    {
        Schema::ensure($db);
    }

    // ——— Sign in ———

    public function requestCode(array $body, string $ip): array
    {
        $email = self::normaliseEmail((string) ($body['email'] ?? ''));
        if (($body['consent'] ?? false) !== true) {
            throw new HttpError(422, __t('account.consentRequired'));
        }
        $now = time();
        $ipHash = secret_hash('ip|' . $ip);
        (new RateLimit($this->db))->hit([
            'code:email:' . secret_hash('email|' . $email) => [3, 900],
            'code:ip:' . secret_hash('ip|' . ip_bucket($ip)) => [10, 3600],
            // The whole site: a ceiling on mail sent (and on what a flood can cost).
            'code:all' => [300, 3600],
        ], __t('account.tooManyCodes'));
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $link = bin2hex(random_bytes(24));
        $browser = bin2hex(random_bytes(16));
        $this->db->prepare(
            'INSERT INTO login_codes (email, code_hash, link_hash, ip_hash, browser_hash, consent_version, marketing, attempts, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)'
        )->execute([
            $email, self::codeHash($email, $code), self::hash($link), $ipHash, self::hash($browser), self::CONSENT_VERSION,
            ($body['marketing'] ?? false) === true ? 1 : 0, $now + self::CODE_TTL, $now,
        ]);
        self::setCookie(self::LOGIN_COOKIE, $browser, $now + self::CODE_TTL);

        // The token rides in the fragment: browsers never send it to a server, so it stays out
        // of access logs, proxies and Referer headers. The app posts it back (POST /account/link).
        $url = app_origin() . '/journey#login=' . $link;
        $mail = LoginCodeEmail::build($code, $url, ($body['marketing'] ?? false) === true, Lang::locale());
        Mailer::send($email, $mail['subject'], $mail['text'], $mail['html']);
        $out = ['sent' => true, 'email' => $email, 'expiresIn' => self::CODE_TTL];
        if (!is_production()) {
            $out['devCode'] = $code; // local only: test without a mailbox
        }
        return $out;
    }

    public function verifyCode(array $body): array
    {
        $email = self::normaliseEmail((string) ($body['email'] ?? ''));
        $code = preg_replace('/\D/', '', (string) ($body['code'] ?? '')) ?? '';
        // Across every code this email asks for, not just the latest one's five tries; and per
        // network, so one machine cannot spend five guesses on each of many accounts' codes.
        (new RateLimit($this->db))->hit([
            'verify:email:' . secret_hash('email|' . $email) => [20, 3600],
            'verify:ip:' . secret_hash('ip|' . ip_bucket(client_ip())) => [60, 3600],
        ], __t('account.tooManyAttempts'));
        // The check, the attempt count and the one-time use happen under one lock: two
        // parallel requests can neither both use the code nor both get the last try.
        $result = db_tx($this->db, function () use ($email, $code) {
            $now = time();
            $row = $this->one(
                'SELECT * FROM login_codes WHERE email = ? AND used_at IS NULL AND expires_at > ? ORDER BY id DESC LIMIT 1' . for_update($this->db),
                [$email, $now],
            );
            if (!$row) {
                return ['status' => 410];
            }
            if ((int) $row['attempts'] >= self::MAX_ATTEMPTS) {
                return ['status' => 429];
            }
            if (strlen($code) !== 6 || !hash_equals((string) $row['code_hash'], self::codeHash($email, $code))) {
                $this->db->prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE id = ? AND attempts < ?')
                    ->execute([$row['id'], self::MAX_ATTEMPTS]);
                return ['status' => 422, 'left' => self::MAX_ATTEMPTS - (int) $row['attempts'] - 1];
            }
            if (!$this->consume((int) $row['id'], $now)) {
                return ['status' => 410];
            }
            return ['status' => 200, 'user' => $this->signIn($row)];
        });
        return match ($result['status']) {
            200 => $result['user'],
            410 => throw new HttpError(410, __t('account.codeExpired')),
            429 => throw new HttpError(429, __t('account.tooManyAttempts')),
            default => throw new HttpError(422, $result['left'] > 0
                ? __t('account.wrongCode', ['left' => $result['left']])
                : __t('account.tooManyAttempts')),
        };
    }

    /**
     * The emailed link, posted by the app from the URL fragment. Opened in the browser that
     * asked for the code, it signs in straight away. Anywhere else (another device, or a link
     * someone else sent) it first answers which account it is for, and signs in only when the
     * visitor confirms — so a forwarded link cannot silently log a victim into someone
     * else's garden, and a mail scanner that opens it consumes nothing.
     */
    public function verifyLink(array $body): array
    {
        $token = (string) ($body['t'] ?? '');
        if (!preg_match('/^[a-f0-9]{48}$/', $token)) {
            throw new HttpError(410, __t('account.codeExpired'));
        }
        $browser = (string) ($_COOKIE[self::LOGIN_COOKIE] ?? '');
        $confirmed = ($body['confirm'] ?? false) === true;
        $result = db_tx($this->db, function () use ($token, $browser, $confirmed) {
            $now = time();
            $row = $this->one(
                'SELECT * FROM login_codes WHERE link_hash = ? AND used_at IS NULL AND expires_at > ? LIMIT 1' . for_update($this->db),
                [self::hash($token), $now],
            );
            if (!$row) {
                return null;
            }
            $sameBrowser = $browser !== '' && $row['browser_hash'] !== null && hash_equals((string) $row['browser_hash'], self::hash($browser));
            if (!$sameBrowser && !$confirmed) {
                // The whole address: the link's holder learns nothing new, and a look-alike
                // account (lu•••@gmail.com) cannot pass for the visitor's own.
                return ['needsConfirm' => true, 'email' => (string) $row['email']];
            }
            if (!$this->consume((int) $row['id'], $now)) {
                return null;
            }
            return ['user' => $this->signIn($row)];
        });
        if ($result === null) {
            throw new HttpError(410, __t('account.codeExpired'));
        }
        return $result;
    }

    /** Links sent before the fragment change: hand the token to the app without using it. */
    public function legacyLink(string $token): never
    {
        header('Referrer-Policy: no-referrer');
        header('Cache-Control: no-store');
        $target = preg_match('/^[a-f0-9]{48}$/', $token) ? '/journey#login=' . $token : '/journey?account=expired';
        header('Location: ' . $target, true, 303);
        exit;
    }

    /** Marks a code used exactly once; false when a parallel request got there first. */
    private function consume(int $id, int $now): bool
    {
        $st = $this->db->prepare('UPDATE login_codes SET used_at = ? WHERE id = ? AND used_at IS NULL AND expires_at > ? AND attempts < ?');
        $st->execute([$now, $id, $now, self::MAX_ATTEMPTS]);
        return $st->rowCount() === 1;
    }

    private function signIn(array $codeRow): array
    {
        $now = time();
        $user = $this->one('SELECT * FROM users WHERE email = ?', [$codeRow['email']]);
        if (!$user) {
            $this->db->prepare(
                'INSERT INTO users (email, marketing, consent_version, consent_at, created_at) VALUES (?, ?, ?, ?, ?)'
            )->execute([$codeRow['email'], $codeRow['marketing'], $codeRow['consent_version'], $now, $now]);
            $user = $this->one('SELECT * FROM users WHERE email = ?', [$codeRow['email']]);
        } else {
            // Signing in again re-confirms consent; the marketing box reflects the latest choice.
            $this->db->prepare('UPDATE users SET marketing = ?, consent_version = ?, consent_at = ? WHERE id = ?')
                ->execute([$codeRow['marketing'], $codeRow['consent_version'], $now, $user['id']]);
            $user = $this->one('SELECT * FROM users WHERE id = ?', [$user['id']]);
        }
        // Signing in again on this browser ends the session it held before (a new token each time).
        $previous = (string) ($_COOKIE[self::COOKIE] ?? '');
        if ($previous !== '') {
            $this->db->prepare('DELETE FROM user_sessions WHERE token_hash = ?')->execute([self::hash($previous)]);
        }
        $token = bin2hex(random_bytes(32));
        $expires = $now + self::SESSION_DAYS * 86400;
        $this->db->prepare('INSERT INTO user_sessions (token_hash, user_id, created_at, last_seen, expires_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([self::hash($token), $user['id'], $now, $now, $expires]);
        // Now and then, forget what has expired (codes after a day, sessions at their end).
        if (random_int(1, 50) === 1) {
            $this->db->prepare('DELETE FROM user_sessions WHERE expires_at < ?')->execute([$now]);
            $this->db->prepare('DELETE FROM login_codes WHERE expires_at < ?')->execute([$now - 86400]);
            $this->db->prepare('DELETE FROM rate_limits WHERE reset_at < ?')->execute([$now]);
        }
        self::setCookie(self::COOKIE, $token, $expires);
        self::setCookie(self::LOGIN_COOKIE, '', 1);
        return $this->publicUser($user);
    }

    /** No-op when headers are gone (CLI self-test). */
    private static function setCookie(string $name, string $value, int $expires): void
    {
        if (headers_sent()) {
            return;
        }
        setcookie($name, $value, [
            'expires' => $expires,
            'path' => '/api/account',
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => cookie_secure(),
        ]);
    }

    // ——— Session ———

    public function current(): ?array
    {
        $token = (string) ($_COOKIE[self::COOKIE] ?? '');
        if ($token === '') {
            return null;
        }
        $row = $this->one(
            'SELECT u.*, s.token_hash, s.last_seen FROM user_sessions s JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = ? AND s.expires_at > ?',
            [self::hash($token), time()],
        );
        if (!$row) {
            return null;
        }
        // Once a minute at most: fresh enough for the admin's "online now" view.
        if ((int) $row['last_seen'] < time() - 60) {
            $this->db->prepare('UPDATE user_sessions SET last_seen = ? WHERE token_hash = ?')->execute([time(), $row['token_hash']]);
        }
        return $row;
    }

    public function me(): ?array
    {
        $u = $this->current();
        return $u ? $this->publicUser($u) : null;
    }

    public function logout(): void
    {
        $token = (string) ($_COOKIE[self::COOKIE] ?? '');
        if ($token !== '') {
            $this->db->prepare('DELETE FROM user_sessions WHERE token_hash = ?')->execute([self::hash($token)]);
        }
        self::setCookie(self::COOKIE, '', 1);
    }

    // ——— Data ———

    public function getProgress(): array
    {
        $u = $this->requireUser();
        $row = $this->one('SELECT data, version, updated_at FROM user_progress WHERE user_id = ?', [$u['id']]);
        return ($row
            ? ['data' => json_decode($row['data'], true), 'version' => (int) $row['version'], 'updatedAt' => (int) $row['updated_at']]
            : ['data' => null, 'version' => 0, 'updatedAt' => null]) + ['serverNow' => (int) (microtime(true) * 1000)];
    }

    /**
     * Saves the garden. Optimistic concurrency (the write names the version it was based on,
     * and only one write per version can win), then ProgressGuard checks the change against
     * the stored copy: everything the guest gained must be explained by the game's rules and
     * the server's clock. A rejected save leaves the stored copy as it was.
     */
    public function putProgress(array $body): array
    {
        $u = $this->requireUser();
        $data = $body['data'] ?? null;
        $base = (int) ($body['baseVersion'] ?? -1);
        if (!is_array($data) || !isset($data['guestId'])) {
            throw new HttpError(422, __t('account.badProgress'));
        }
        $json = json_encode($data, JSON_UNESCAPED_UNICODE);
        if ($json === false || strlen($json) > self::MAX_PROGRESS_BYTES) {
            throw new HttpError(413, __t('account.progressTooLarge'));
        }
        $clientNow = is_numeric($body['clientNow'] ?? null) ? (int) $body['clientNow'] : null;
        $uid = (int) $u['id'];
        $guard = new ProgressGuard($this->db, $uid);
        try {
            $out = $this->writeProgress($guard, $uid, $data, $json, $base, $clientNow);
        } catch (HttpError $e) {
            // The refusal rolled the save back; its record is written after, on its own.
            $guard->logRejection();
            throw $e;
        }
        if (isset($out['conflict'])) {
            throw new HttpError(409, __t('account.progressConflict'), ['version' => $out['conflict']]);
        }
        return $out + ['serverNow' => (int) (microtime(true) * 1000)];
    }

    private function writeProgress(ProgressGuard $guard, int $uid, array $data, string $json, int $base, ?int $clientNow): array
    {
        return db_tx($this->db, function () use ($guard, $uid, $data, $json, $base, $clientNow) {
            $row = $this->one('SELECT * FROM user_progress WHERE user_id = ?' . for_update($this->db), [$uid]);
            $current = $row ? (int) $row['version'] : 0;
            if ($base !== $current) {
                return ['conflict' => $current];
            }
            $checked = $guard->check($row, $data, $clientNow);
            $now = time();
            if ($row) {
                $st = $this->db->prepare(
                    'UPDATE user_progress SET data = ?, version = version + 1, updated_at = ?, guest_id = ?, client_at = ?, client_offset = ?
                     WHERE user_id = ? AND version = ?'
                );
                $st->execute([$json, $now, $checked['guestId'], $checked['clientAt'], $checked['offset'], $uid, $current]);
                // Two writes from the same version: the one that did not change a row lost.
                if ($st->rowCount() !== 1) {
                    return ['conflict' => $current + 1];
                }
            } else {
                $this->db->prepare(
                    'INSERT INTO user_progress (user_id, data, version, updated_at, guest_id, client_at, client_offset, baseline_at) VALUES (?, ?, 1, ?, ?, ?, ?, ?)'
                )->execute([$uid, $json, $now, $checked['guestId'], $checked['clientAt'], $checked['offset'], $now]);
            }
            $guard->commit($checked);
            return ['version' => $current + 1, 'updatedAt' => $now];
        });
    }

    /**
     * The device's clock moved since the last save (the guard refused a save with code
     * "clock"): re-anchor the stored garden to the new clock. Every time in it shifts by the
     * same amount (ProgressGuard::shiftTimes), so the move gains nothing; the app then loads
     * the shifted copy. A few times a day at most.
     */
    public function rebaseProgress(array $body): array
    {
        $u = $this->requireUser();
        $uid = (int) $u['id'];
        $clientNow = is_numeric($body['clientNow'] ?? null) ? (int) $body['clientNow'] : null;
        if ($clientNow === null) {
            throw new HttpError(422, __t('account.badRequest'));
        }
        (new RateLimit($this->db))->hit(['rebase:' . $uid => [6, 86400]], __t('account.progressRejected'));
        db_tx($this->db, function () use ($uid, $clientNow) {
            $row = $this->one('SELECT * FROM user_progress WHERE user_id = ?' . for_update($this->db), [$uid]);
            if (!$row || $row['client_offset'] === null) {
                return;
            }
            $offset = $clientNow - (int) floor(microtime(true) * 1000);
            $delta = $offset - (int) $row['client_offset'];
            if (abs($delta) < 60_000) {
                return;
            }
            if (abs($offset) > 400 * 86_400_000) {
                throw new HttpError(422, __t('account.progressRejected'), ['code' => 'clock']);
            }
            // A clock set right again moves freely. One moving further from the real time is a
            // new day's quests and check-ins sooner than the day comes: once a week at most.
            if (abs($offset) > abs((int) $row['client_offset']) + 10 * 60_000) {
                (new RateLimit($this->db))->hit(['rebase-away:' . $uid => [1, 7 * 86400]], __t('account.progressRejected'));
            }
            $data = json_decode((string) $row['data'], true);
            $json = json_encode(ProgressGuard::shiftTimes(is_array($data) ? $data : [], $delta), JSON_UNESCAPED_UNICODE);
            $this->db->prepare('UPDATE user_progress SET data = ?, version = version + 1, updated_at = ?, client_offset = ?, client_at = ? WHERE user_id = ?')
                ->execute([$json, time(), $offset, $clientNow, $uid]);
        });
        return $this->getProgress();
    }

    public function setPreferences(array $body): array
    {
        $u = $this->requireUser();
        $this->db->prepare('UPDATE users SET marketing = ? WHERE id = ?')->execute([($body['marketing'] ?? false) === true ? 1 : 0, $u['id']]);
        return $this->publicUser($this->one('SELECT * FROM users WHERE id = ?', [$u['id']]));
    }

    /** Everything the server holds about this guest (hashed secrets aside). */
    public function export(): array
    {
        $u = $this->requireUser();
        $id = (int) $u['id'];
        $sessions = $this->all('SELECT created_at, last_seen, expires_at FROM user_sessions WHERE user_id = ?', [$id]);
        $events = $this->all(
            'SELECT e.id, e.type, e.plot_id, e.crop, e.day, e.created_at, e.delivered_at,
                    CASE WHEN e.to_user = ? THEN \'received\' ELSE \'sent\' END AS direction,
                    g.friend_code AS other_code
             FROM farm_events e
             LEFT JOIN garden_profiles g ON g.user_id = CASE WHEN e.to_user = ? THEN e.from_user ELSE e.to_user END
             WHERE e.to_user = ? OR e.from_user = ?
             ORDER BY e.id DESC LIMIT 2000',
            [$id, $id, $id, $id],
        );
        return [
            'account' => $this->publicUser($u) + ['consentVersion' => $u['consent_version'], 'consentAt' => (int) $u['consent_at']],
            'progress' => $this->getProgress(),
            'garden' => $this->one('SELECT friend_code, garden_name, created_at FROM garden_profiles WHERE user_id = ?', [$id]),
            'friends' => array_column($this->all(
                'SELECT g.friend_code FROM friendships f JOIN garden_profiles g ON g.user_id = f.friend_id WHERE f.user_id = ?',
                [$id],
            ), 'friend_code'),
            'invitedBy' => $this->one(
                'SELECT g.friend_code FROM referrals r JOIN garden_profiles g ON g.user_id = r.inviter_id WHERE r.invitee_id = ?',
                [$id],
            )['friend_code'] ?? null,
            'invited' => array_column($this->all(
                'SELECT g.friend_code FROM referrals r JOIN garden_profiles g ON g.user_id = r.invitee_id WHERE r.inviter_id = ?',
                [$id],
            ), 'friend_code'),
            'invitesCounted' => (int) ($this->one('SELECT COUNT(*) AS n FROM referral_log WHERE inviter_id = ?', [$id])['n'] ?? 0),
            'events' => array_map(fn ($e) => [
                'id' => 'e' . $e['id'],
                'type' => $e['type'],
                'direction' => $e['direction'],
                'garden' => $e['other_code'],
                'plotId' => $e['plot_id'] !== null ? (int) $e['plot_id'] : null,
                'crop' => $e['crop'],
                'day' => $e['day'],
                'at' => (int) $e['created_at'],
                'deliveredAt' => $e['delivered_at'] !== null ? (int) $e['delivered_at'] : null,
            ], $events),
            'verifiedStats' => array_map('intval', array_column($this->all('SELECT metric, value FROM verified_stats WHERE user_id = ?', [$id]), 'value', 'metric')),
            'rewardsClaimed' => (int) ($this->one('SELECT COUNT(*) AS n FROM progress_claims WHERE user_id = ?', [$id])['n'] ?? 0),
            // The activity log kept for fair play (90 days), without the address hashes.
            'activity' => array_map(fn ($a) => [
                'key' => $a['entry_key'],
                'resource' => $a['resource'],
                'delta' => (int) $a['delta'],
                'at' => (int) $a['at_ms'],
                'savedAt' => (int) $a['saved_at'],
            ], $this->all('SELECT entry_key, resource, delta, at_ms, saved_at FROM progress_events WHERE user_id = ? ORDER BY id DESC LIMIT 5000', [$id])),
            'refusedSaves' => array_map(fn ($r) => ['code' => $r['code'], 'detail' => $r['detail'], 'at' => (int) $r['created_at']],
                $this->all('SELECT code, detail, created_at FROM guard_rejections WHERE user_id = ? ORDER BY id DESC LIMIT 500', [$id])),
            'loginCodes' => array_map(fn ($c) => array_map(fn ($v) => $v === null ? null : (int) $v, $c), $this->all(
                'SELECT created_at, expires_at, used_at FROM login_codes WHERE email = ? ORDER BY id DESC LIMIT 50',
                [$u['email']],
            )),
            'sessions' => array_map(fn ($s) => array_map('intval', $s), $sessions),
            'exportedAt' => time(),
        ];
    }

    /**
     * Deletes the account in one transaction (all or nothing). What this garden already gave
     * others stays theirs: seeds, help and invite rewards it sent keep existing with the
     * sender anonymised. A keyed hash of the email stays in referral_log so the account
     * cannot be re-created to be invited (and paid for) again — see the privacy page.
     */
    public function delete(): void
    {
        $u = $this->requireUser();
        self::deleteUser($this->db, (int) $u['id'], (string) $u['email']);
        $this->logout();
    }

    /** Shared with the admin's delete (AdminUsers). */
    public static function deleteUser(PDO $db, int $id, string $email): void
    {
        db_tx($db, function () use ($db, $id, $email) {
            $run = fn (string $sql, array $args) => $db->prepare($sql)->execute($args);
            $run('DELETE FROM farm_events WHERE to_user = ?', [$id]);
            $run('UPDATE farm_events SET from_user = NULL WHERE from_user = ?', [$id]);
            $run('DELETE FROM friendships WHERE user_id = ? OR friend_id = ?', [$id, $id]);
            $run('DELETE FROM referrals WHERE invitee_id = ? OR inviter_id = ?', [$id, $id]);
            $run('DELETE FROM referral_log WHERE inviter_id = ?', [$id]);
            $run('DELETE FROM progress_claims WHERE user_id = ?', [$id]);
            $run('DELETE FROM verified_stats WHERE user_id = ?', [$id]);
            $run('DELETE FROM progress_events WHERE user_id = ?', [$id]);
            $run('DELETE FROM guard_rejections WHERE user_id = ?', [$id]);
            $run('DELETE FROM garden_profiles WHERE user_id = ?', [$id]);
            $run('DELETE FROM user_progress WHERE user_id = ?', [$id]);
            $run('DELETE FROM user_sessions WHERE user_id = ?', [$id]);
            $run('DELETE FROM login_codes WHERE email = ?', [$email]);
            $run('DELETE FROM users WHERE id = ?', [$id]);
        });
    }

    // ——— Helpers ———

    public function requireUser(): array
    {
        return $this->current() ?? throw new HttpError(401, __t('account.notSignedIn'));
    }

    /**
     * Writes must carry this header: a cross-site form can't set it, and a cross-site fetch
     * that sets it needs a CORS preflight we never grant — so it doubles as CSRF protection.
     * Browsers that send Fetch Metadata are also held to same-origin.
     */
    public static function requireAppHeader(): void
    {
        $site = strtolower((string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
        if (($_SERVER['HTTP_X_BEPVIET'] ?? '') !== '1' || ($site !== '' && $site !== 'same-origin' && $site !== 'none')) {
            throw new HttpError(403, __t('account.badRequest'));
        }
    }

    private function publicUser(array $u): array
    {
        return [
            'email' => $u['email'],
            'marketing' => (bool) $u['marketing'],
            'createdAt' => (int) $u['created_at'],
            // Opaque and stable: the app tags its local journey with it, so a journey saved to
            // one account is never uploaded into another one signed in on the same device.
            'key' => substr(secret_hash('owner|' . $u['id']), 0, 24),
        ];
    }

    public static function normaliseEmail(string $email): string
    {
        $email = mb_strtolower(trim($email), 'UTF-8');
        // A plain mailbox only: no quoted local part ("a>b"@x) and no address literal (a@[1.2.3.4]),
        // which would point the mail relay at an arbitrary host.
        if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL) || str_contains($email, '"') || str_contains($email, '[')) {
            throw new HttpError(422, __t('account.badEmail'));
        }
        return $email;
    }

    /** "khach@example.vn" → "kh•••@example.vn" (same rule as the app's maskEmail). */
    public static function maskEmail(string $email): string
    {
        [$name, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $keep = mb_substr($name, 0, min(2, max(1, mb_strlen($name) - 1)));
        return $keep . str_repeat('•', max(1, min(4, mb_strlen($name) - mb_strlen($keep)))) . '@' . $domain;
    }

    /** A six-digit code has a million values: hashed with APP_KEY, a database dump alone cannot test them. */
    private static function codeHash(string $email, string $code): string
    {
        return secret_hash("otp|$email|$code");
    }

    private static function hash(string $value): string
    {
        return hash('sha256', $value);
    }

    private function one(string $sql, array $args): ?array
    {
        $st = $this->db->prepare($sql);
        $st->execute($args);
        $row = $st->fetch();
        return $row ?: null;
    }

    private function all(string $sql, array $args): array
    {
        $st = $this->db->prepare($sql);
        $st->execute($args);
        return $st->fetchAll();
    }
}

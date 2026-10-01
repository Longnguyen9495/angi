<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/Mailer.php';
require_once __DIR__ . '/LoginCodeEmail.php';

/*
 * Optional guest accounts: email + one-time code, no password. The only thing
 * stored besides the email is the guest's game progress (JSON) — no photos,
 * no location. Codes and session tokens are kept as SHA-256 hashes only.
 */
final class Account
{
    /** Bump when the privacy text the guest agrees to changes. */
    public const CONSENT_VERSION = '2026-09-30';

    private const COOKIE = 'bepviet_guest';
    private const SESSION_DAYS = 180;
    private const CODE_TTL = 600;
    private const MAX_ATTEMPTS = 5;
    private const CODES_PER_EMAIL = 3; // per 15 minutes
    private const CODES_PER_IP = 10; // per hour
    private const MAX_PROGRESS_BYTES = 512 * 1024;

    public function __construct(private PDO $db)
    {
    }

    // ——— Sign in ———

    public function requestCode(array $body, string $ip): array
    {
        $email = self::normaliseEmail((string) ($body['email'] ?? ''));
        if (($body['consent'] ?? false) !== true) {
            throw new HttpError(422, __t('account.consentRequired'));
        }
        $now = time();
        $ipHash = self::hash($ip . '|' . env('APP_KEY', 'bepviet'));
        if ($this->count('SELECT COUNT(*) FROM login_codes WHERE email = ? AND created_at > ?', [$email, $now - 900]) >= self::CODES_PER_EMAIL
            || $this->count('SELECT COUNT(*) FROM login_codes WHERE ip_hash = ? AND created_at > ?', [$ipHash, $now - 3600]) >= self::CODES_PER_IP) {
            throw new HttpError(429, __t('account.tooManyCodes'));
        }
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $link = bin2hex(random_bytes(24));
        $this->db->prepare(
            'INSERT INTO login_codes (email, code_hash, link_hash, ip_hash, consent_version, marketing, attempts, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)'
        )->execute([
            $email, self::hash($code), self::hash($link), $ipHash, self::CONSENT_VERSION,
            ($body['marketing'] ?? false) === true ? 1 : 0, $now + self::CODE_TTL, $now,
        ]);

        $url = rtrim((string) env('APP_URL', 'http://angi.local'), '/') . '/api/account/link?t=' . $link;
        $mail = LoginCodeEmail::build($code, $url, ($body['marketing'] ?? false) === true, Lang::locale());
        Mailer::send($email, $mail['subject'], $mail['text'], $mail['html']);
        $out = ['sent' => true, 'email' => $email, 'expiresIn' => self::CODE_TTL];
        if (env('APP_ENV', 'production') === 'local') {
            $out['devCode'] = $code; // local only: test without a mailbox
        }
        return $out;
    }

    public function verifyCode(array $body): array
    {
        $email = self::normaliseEmail((string) ($body['email'] ?? ''));
        $code = preg_replace('/\D/', '', (string) ($body['code'] ?? '')) ?? '';
        $row = $this->one(
            'SELECT * FROM login_codes WHERE email = ? AND used_at IS NULL AND expires_at > ? ORDER BY id DESC LIMIT 1',
            [$email, time()],
        );
        if (!$row) {
            throw new HttpError(410, __t('account.codeExpired'));
        }
        if ((int) $row['attempts'] >= self::MAX_ATTEMPTS) {
            throw new HttpError(429, __t('account.tooManyAttempts'));
        }
        if (strlen($code) !== 6 || !hash_equals($row['code_hash'], self::hash($code))) {
            $this->db->prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE id = ?')->execute([$row['id']]);
            $left = self::MAX_ATTEMPTS - (int) $row['attempts'] - 1;
            throw new HttpError(422, $left > 0 ? __t('account.wrongCode', ['left' => $left]) : __t('account.tooManyAttempts'));
        }
        return $this->signIn($row);
    }

    /** The link in the email: same result as typing the code, then back to the Journey. */
    public function verifyLink(string $token): void
    {
        $row = $this->one(
            'SELECT * FROM login_codes WHERE link_hash = ? AND used_at IS NULL AND expires_at > ? LIMIT 1',
            [self::hash($token), time()],
        );
        if (!$row) {
            header('Location: /journey?account=expired', true, 303);
            exit;
        }
        $this->signIn($row);
        header('Location: /journey?account=ok', true, 303);
        exit;
    }

    private function signIn(array $codeRow): array
    {
        $now = time();
        $this->db->prepare('UPDATE login_codes SET used_at = ? WHERE id = ?')->execute([$now, $codeRow['id']]);
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
        $token = bin2hex(random_bytes(32));
        $expires = $now + self::SESSION_DAYS * 86400;
        $this->db->prepare('INSERT INTO user_sessions (token_hash, user_id, created_at, last_seen, expires_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([self::hash($token), $user['id'], $now, $now, $expires]);
        self::cookie($token, $expires);
        return $this->publicUser($user);
    }

    /** No-op when headers are gone (CLI self-test). */
    private static function cookie(string $value, int $expires): void
    {
        if (headers_sent()) {
            return;
        }
        setcookie(self::COOKIE, $value, [
            'expires' => $expires,
            'path' => '/api/account',
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => !empty($_SERVER['HTTPS']) || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https',
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
        self::cookie('', 1);
    }

    // ——— Data ———

    public function getProgress(): array
    {
        $u = $this->requireUser();
        $row = $this->one('SELECT data, version, updated_at FROM user_progress WHERE user_id = ?', [$u['id']]);
        return $row
            ? ['data' => json_decode($row['data'], true), 'version' => (int) $row['version'], 'updatedAt' => (int) $row['updated_at']]
            : ['data' => null, 'version' => 0, 'updatedAt' => null];
    }

    /** Optimistic concurrency: the write must name the version it was based on. */
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
        $row = $this->one('SELECT version FROM user_progress WHERE user_id = ?', [$u['id']]);
        $current = $row ? (int) $row['version'] : 0;
        if ($base !== $current) {
            json_response(['error' => __t('account.progressConflict'), 'version' => $current], 409);
        }
        $now = time();
        if ($row) {
            $this->db->prepare('UPDATE user_progress SET data = ?, version = version + 1, updated_at = ? WHERE user_id = ? AND version = ?')
                ->execute([$json, $now, $u['id'], $current]);
        } else {
            $this->db->prepare('INSERT INTO user_progress (user_id, data, version, updated_at) VALUES (?, ?, 1, ?)')
                ->execute([$u['id'], $json, $now]);
        }
        return ['version' => $current + 1, 'updatedAt' => $now];
    }

    public function setPreferences(array $body): array
    {
        $u = $this->requireUser();
        $this->db->prepare('UPDATE users SET marketing = ? WHERE id = ?')->execute([($body['marketing'] ?? false) === true ? 1 : 0, $u['id']]);
        return $this->publicUser($this->one('SELECT * FROM users WHERE id = ?', [$u['id']]));
    }

    /** Everything the server holds about this guest. */
    public function export(): array
    {
        $u = $this->requireUser();
        $sessions = $this->all('SELECT created_at, last_seen, expires_at FROM user_sessions WHERE user_id = ?', [$u['id']]);
        return [
            'account' => $this->publicUser($u) + ['consentVersion' => $u['consent_version'], 'consentAt' => (int) $u['consent_at']],
            'progress' => $this->getProgress(),
            'garden' => $this->one('SELECT friend_code, garden_name, created_at FROM garden_profiles WHERE user_id = ?', [$u['id']]),
            'friends' => array_column($this->all(
                'SELECT g.friend_code FROM friendships f JOIN garden_profiles g ON g.user_id = f.friend_id WHERE f.user_id = ?',
                [$u['id']],
            ), 'friend_code'),
            'sessions' => array_map(fn ($s) => array_map('intval', $s), $sessions),
            'exportedAt' => time(),
        ];
    }

    public function delete(): void
    {
        $u = $this->requireUser();
        // Explicit deletes as well as ON DELETE CASCADE, so nothing is left behind on either driver.
        $this->db->prepare('DELETE FROM farm_events WHERE to_user = ? OR from_user = ?')->execute([$u['id'], $u['id']]);
        $this->db->prepare('DELETE FROM friendships WHERE user_id = ? OR friend_id = ?')->execute([$u['id'], $u['id']]);
        $this->db->prepare('DELETE FROM garden_profiles WHERE user_id = ?')->execute([$u['id']]);
        $this->db->prepare('DELETE FROM user_progress WHERE user_id = ?')->execute([$u['id']]);
        $this->db->prepare('DELETE FROM user_sessions WHERE user_id = ?')->execute([$u['id']]);
        $this->db->prepare('DELETE FROM login_codes WHERE email = ?')->execute([$u['email']]);
        $this->db->prepare('DELETE FROM users WHERE id = ?')->execute([$u['id']]);
        $this->logout();
    }

    // ——— Helpers ———

    public function requireUser(): array
    {
        return $this->current() ?? throw new HttpError(401, __t('account.notSignedIn'));
    }

    /** Writes must carry this header: a cross-site form can't set it, so it doubles as CSRF protection. */
    public static function requireAppHeader(): void
    {
        if (($_SERVER['HTTP_X_BEPVIET'] ?? '') !== '1') {
            throw new HttpError(403, __t('account.badRequest'));
        }
    }

    private function publicUser(array $u): array
    {
        return ['email' => $u['email'], 'marketing' => (bool) $u['marketing'], 'createdAt' => (int) $u['created_at']];
    }

    public static function normaliseEmail(string $email): string
    {
        $email = mb_strtolower(trim($email), 'UTF-8');
        if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new HttpError(422, __t('account.badEmail'));
        }
        return $email;
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

    private function count(string $sql, array $args): int
    {
        $st = $this->db->prepare($sql);
        $st->execute($args);
        return (int) $st->fetchColumn();
    }
}

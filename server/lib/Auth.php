<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/RateLimit.php';

/*
 * Single admin account from .env, PHP session + CSRF token for every write.
 *   ADMIN_USER / ADMIN_PASSWORD   the account (empty password: admin disabled)
 *   ADMIN_TOTP_SECRET             optional base32 secret: a 6-digit authenticator code is
 *                                 then required at login (Google Authenticator, 1Password…)
 * Failed logins are limited per IP and in total; a session ends after 2 hours idle or 12
 * hours in all, and changing the password (or TOTP secret) signs every session out.
 */
final class Auth
{
    private const IDLE = 2 * 3600;
    private const ABSOLUTE = 12 * 3600;

    public static function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        session_name('bepviet_admin');
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Strict',
            'secure' => cookie_secure(),
        ]);
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        session_start();
    }

    /**
     * Login and logout are writes too: they need the same-origin header (a cross-site form
     * cannot set it), so another site can neither log the admin out nor into its account.
     */
    public static function requireSameOrigin(): void
    {
        $site = strtolower((string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
        if (($_SERVER['HTTP_X_BEPVIET'] ?? '') !== '1' || ($site !== '' && $site !== 'same-origin')) {
            throw new HttpError(403, 'Yêu cầu không hợp lệ.');
        }
    }

    public static function login(string $user, string $password, string $otp = ''): array
    {
        self::requireSameOrigin();
        $limits = new RateLimit(db());
        $tooMany = 'Đăng nhập sai quá nhiều lần — đợi 15 phút rồi thử lại.';
        $ipBucket = 'admin:ip:' . secret_hash('ip|' . ip_bucket(client_ip()));
        // Every attempt is counted before anything is checked, in one transaction: a burst of
        // parallel guesses cannot all slip in under the limit. Refused once it is reached.
        $limits->hit([$ipBucket => [5, 900]], $tooMany);
        // Guesses spread over many addresses fill the site-wide bucket. That must not lock the
        // real admin out for good: while it is full, only a valid TOTP code still gets in.
        $siteFull = $limits->full('admin:all', 30);
        self::start();
        $expectedUser = (string) env('ADMIN_USER', 'admin');
        $expectedPass = (string) env('ADMIN_PASSWORD', '');
        $secret = (string) env('ADMIN_TOTP_SECRET', '');
        $ok = $expectedPass !== '' && hash_equals($expectedUser, $user) && hash_equals($expectedPass, $password)
            && ($secret === '' || self::totpValid($secret, $otp));
        if ($siteFull && !($ok && $secret !== '')) {
            throw new HttpError(429, $tooMany);
        }
        if (!$ok) {
            try {
                $limits->hit(['admin:all' => [30, 3600]], $tooMany);
            } catch (HttpError) {
                // This was the attempt that filled the bucket: still just "wrong".
            }
            usleep(600_000); // slows down guessing
            error_log('[angi admin] failed login from ' . secret_hash('ip|' . client_ip()));
            throw new HttpError(401, $secret !== '' ? 'Sai tên đăng nhập, mật khẩu hoặc mã xác thực.' : 'Sai tên đăng nhập hoặc mật khẩu.');
        }
        $limits->clear($ipBucket);
        session_regenerate_id(true);
        $_SESSION['admin'] = $user;
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
        $_SESSION['at'] = time();
        $_SESSION['seen'] = time();
        $_SESSION['ver'] = self::credentialVersion();
        return self::session();
    }

    public static function logout(): void
    {
        self::requireSameOrigin();
        self::start();
        $_SESSION = [];
        session_destroy();
    }

    public static function session(): array
    {
        self::start();
        return self::valid()
            ? ['user' => $_SESSION['admin'], 'csrf' => $_SESSION['csrf'], 'mfa' => (string) env('ADMIN_TOTP_SECRET', '') !== '']
            : ['user' => null, 'csrf' => null, 'mfa' => (string) env('ADMIN_TOTP_SECRET', '') !== ''];
    }

    public static function require(bool $write): void
    {
        self::start();
        if (!self::valid()) {
            throw new HttpError(401, 'Cần đăng nhập.');
        }
        if ($write && !hash_equals((string) $_SESSION['csrf'], (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''))) {
            throw new HttpError(403, 'Phiên làm việc đã hết hạn, hãy tải lại trang.');
        }
        if (time() - (int) ($_SESSION['seen'] ?? 0) > 60) {
            $_SESSION['seen'] = time();
        }
        // Long AI calls must not hold the session lock for other admin requests.
        session_write_close();
    }

    /** Signed in, not idle or too old, and signed in with the current password/TOTP secret. */
    private static function valid(): bool
    {
        if (!isset($_SESSION['admin'])) {
            return false;
        }
        $now = time();
        $fresh = $now - (int) ($_SESSION['at'] ?? 0) <= self::ABSOLUTE
            && $now - (int) ($_SESSION['seen'] ?? 0) <= self::IDLE
            && hash_equals((string) ($_SESSION['ver'] ?? ''), self::credentialVersion())
            && (string) env('ADMIN_PASSWORD', '') !== '';
        if (!$fresh) {
            $_SESSION = [];
            if (session_status() === PHP_SESSION_ACTIVE) {
                session_regenerate_id(true);
            }
        }
        return $fresh;
    }

    /** Changes when the password or TOTP secret does, which ends every older session. */
    private static function credentialVersion(): string
    {
        return secret_hash('admin|' . env('ADMIN_USER', 'admin') . '|' . env('ADMIN_PASSWORD', '') . '|' . env('ADMIN_TOTP_SECRET', ''));
    }

    /** RFC 6238 (SHA-1, 30 s, 6 digits), one step of clock drift either way; each code works once. */
    public static function totpValid(string $secret, string $code, ?int $now = null): bool
    {
        $code = preg_replace('/\D/', '', $code) ?? '';
        $key = self::base32($secret);
        if (strlen($code) !== 6 || $key === '') {
            return false;
        }
        $step = intdiv($now ?? time(), 30);
        foreach ([-1, 0, 1] as $d) {
            if (hash_equals(self::totp($key, $step + $d), $code)) {
                if ($now === null) {
                    // Replay of a code already used in this window is refused.
                    $used = 'admin:totp:' . secret_hash($code . '|' . ($step + $d));
                    $limits = new RateLimit(db());
                    if ($limits->full($used, 1)) {
                        return false;
                    }
                    $limits->hit([$used => [1, 120]], '');
                }
                return true;
            }
        }
        return false;
    }

    public static function totp(string $key, int $step): string
    {
        $mac = hash_hmac('sha1', pack('N2', 0, $step), $key, true);
        $o = ord($mac[19]) & 0x0f;
        $n = ((ord($mac[$o]) & 0x7f) << 24) | (ord($mac[$o + 1]) << 16) | (ord($mac[$o + 2]) << 8) | ord($mac[$o + 3]);
        return str_pad((string) ($n % 1_000_000), 6, '0', STR_PAD_LEFT);
    }

    private static function base32(string $s): string
    {
        $s = strtoupper(preg_replace('/[\s=-]/', '', $s) ?? '');
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $bits = '';
        for ($i = 0; $i < strlen($s); $i++) {
            $v = strpos($alphabet, $s[$i]);
            if ($v === false) {
                return '';
            }
            $bits .= str_pad(decbin($v), 5, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $out .= chr(bindec($byte));
            }
        }
        return $out;
    }
}

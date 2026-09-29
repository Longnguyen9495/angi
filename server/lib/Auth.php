<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/** Single admin account from .env, PHP session + CSRF token for every write. */
final class Auth
{
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
            'secure' => !empty($_SERVER['HTTPS']),
        ]);
        session_start();
    }

    public static function login(string $user, string $password): array
    {
        self::start();
        $expectedUser = (string) env('ADMIN_USER', 'admin');
        $expectedPass = (string) env('ADMIN_PASSWORD', '');
        if ($expectedPass === '' || !hash_equals($expectedUser, $user) || !hash_equals($expectedPass, $password)) {
            usleep(600_000); // slows down guessing
            throw new HttpError(401, 'Sai tên đăng nhập hoặc mật khẩu.');
        }
        session_regenerate_id(true);
        $_SESSION['admin'] = $user;
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
        return self::session();
    }

    public static function logout(): void
    {
        self::start();
        $_SESSION = [];
        session_destroy();
    }

    public static function session(): array
    {
        self::start();
        return isset($_SESSION['admin'])
            ? ['user' => $_SESSION['admin'], 'csrf' => $_SESSION['csrf']]
            : ['user' => null, 'csrf' => null];
    }

    public static function require(bool $write): void
    {
        self::start();
        if (!isset($_SESSION['admin'])) {
            throw new HttpError(401, 'Cần đăng nhập.');
        }
        if ($write && !hash_equals((string) $_SESSION['csrf'], (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''))) {
            throw new HttpError(403, 'Phiên làm việc đã hết hạn, hãy tải lại trang.');
        }
        // Long AI calls must not hold the session lock for other admin requests.
        session_write_close();
    }
}

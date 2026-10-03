<?php

declare(strict_types=1);

/*
 * Shared bootstrap for the Ăn gì? API, admin and CLI tools.
 * Secrets come from the project-root .env, which is never served or bundled.
 */

const APP_ROOT = __DIR__ . '/../..';
const UPLOAD_DIR = APP_ROOT . '/storage/uploads';
const UPLOAD_URL = '/uploads';

require_once __DIR__ . '/Lang.php';

function env(string $key, ?string $default = null): ?string
{
    static $vars = null;
    if ($vars === null) {
        $vars = [];
        $file = APP_ROOT . '/.env';
        if (is_file($file)) {
            foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                $line = trim($line);
                if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
                    continue;
                }
                [$k, $v] = explode('=', $line, 2);
                $v = trim($v);
                // Laravel-style values: "quoted", 'quoted', null, and ${OTHER_KEY} references.
                if (strlen($v) >= 2 && ($v[0] === '"' || $v[0] === "'") && $v[-1] === $v[0]) {
                    $v = substr($v, 1, -1);
                }
                if (strtolower($v) === 'null') {
                    $v = '';
                }
                $v = preg_replace_callback('/\$\{([A-Z0-9_]+)\}/', fn ($m) => $vars[$m[1]] ?? '', $v) ?? $v;
                $vars[trim($k)] = $v;
            }
        }
    }
    $value = getenv($key);
    if ($value !== false && $value !== '') {
        return $value;
    }
    return $vars[$key] ?? $default;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    // Production (VPS) runs on SQLite; local XAMPP keeps MariaDB.
    if (env('DB_DRIVER', 'mysql') === 'sqlite') {
        $pdo = new PDO('sqlite:' . sqlite_path(), null, null, $options);
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA busy_timeout = 5000');
        $pdo->exec('PRAGMA journal_mode = WAL');
        return $pdo;
    }
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        env('DB_HOST', '127.0.0.1'),
        env('DB_PORT', '3306'),
        env('DB_NAME', 'angi'),
    );
    $pdo = new PDO($dsn, env('DB_USER', 'root'), env('DB_PASS', ''), $options);
    return $pdo;
}

/** SQLite file; relative DB_PATH values resolve from the project root. */
function sqlite_path(): string
{
    $path = env('DB_PATH', 'storage/database/angi.sqlite');
    return str_starts_with($path, '/') || preg_match('#^[A-Za-z]:[\\\\/]#', $path) ? $path : APP_ROOT . '/' . $path;
}

/** Vietnamese-aware slug: "Bánh mì chảo" → "banh-mi-chao". */
function slugify(string $text): string
{
    $map = [
        'à' => 'a', 'á' => 'a', 'ả' => 'a', 'ã' => 'a', 'ạ' => 'a',
        'ă' => 'a', 'ằ' => 'a', 'ắ' => 'a', 'ẳ' => 'a', 'ẵ' => 'a', 'ặ' => 'a',
        'â' => 'a', 'ầ' => 'a', 'ấ' => 'a', 'ẩ' => 'a', 'ẫ' => 'a', 'ậ' => 'a',
        'è' => 'e', 'é' => 'e', 'ẻ' => 'e', 'ẽ' => 'e', 'ẹ' => 'e',
        'ê' => 'e', 'ề' => 'e', 'ế' => 'e', 'ể' => 'e', 'ễ' => 'e', 'ệ' => 'e',
        'ì' => 'i', 'í' => 'i', 'ỉ' => 'i', 'ĩ' => 'i', 'ị' => 'i',
        'ò' => 'o', 'ó' => 'o', 'ỏ' => 'o', 'õ' => 'o', 'ọ' => 'o',
        'ô' => 'o', 'ồ' => 'o', 'ố' => 'o', 'ổ' => 'o', 'ỗ' => 'o', 'ộ' => 'o',
        'ơ' => 'o', 'ờ' => 'o', 'ớ' => 'o', 'ở' => 'o', 'ỡ' => 'o', 'ợ' => 'o',
        'ù' => 'u', 'ú' => 'u', 'ủ' => 'u', 'ũ' => 'u', 'ụ' => 'u',
        'ư' => 'u', 'ừ' => 'u', 'ứ' => 'u', 'ử' => 'u', 'ữ' => 'u', 'ự' => 'u',
        'ỳ' => 'y', 'ý' => 'y', 'ỷ' => 'y', 'ỹ' => 'y', 'ỵ' => 'y', 'đ' => 'd',
    ];
    $s = mb_strtolower(trim($text), 'UTF-8');
    $s = strtr($s, $map);
    $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
    return trim($s, '-');
}

final class HttpError extends RuntimeException
{
    /** `$extra` is merged into the JSON error body (e.g. a machine-readable `code`). */
    public function __construct(public readonly int $status, string $message, public readonly array $extra = [])
    {
        parent::__construct($message);
    }
}

function json_response(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * The request's JSON body, read with a cap: never more than `$max` bytes reach memory or the
 * decoder (a declared Content-Length over the cap is refused before reading), and nesting is
 * limited so a deep payload cannot blow the stack.
 */
function read_json_body(int $max = 64 * 1024): array
{
    $declared = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($declared > $max) {
        throw new HttpError(413, __t('api.badJson'));
    }
    $raw = file_get_contents('php://input', false, null, 0, $max + 1);
    if ($raw === false || $raw === '') {
        return [];
    }
    if (strlen($raw) > $max) {
        throw new HttpError(413, __t('api.badJson'));
    }
    $data = json_decode($raw, true, 64);
    if (!is_array($data)) {
        throw new HttpError(400, __t('api.badJson'));
    }
    return $data;
}

function is_production(): bool
{
    return env('APP_ENV', 'production') !== 'local';
}

/**
 * This site's own origin for links in emails, canonical URLs and previews: APP_URL, never
 * the request's Host header (a forged Host must not end up in a link). Local development
 * without APP_URL falls back to the XAMPP vhost.
 */
function app_origin(): string
{
    $url = rtrim((string) env('APP_URL', ''), '/');
    return $url !== '' ? $url : 'http://angi.local';
}

/**
 * Whether this request reached us over HTTPS: directly, or through a reverse proxy listed in
 * TRUSTED_PROXIES (exact IPs) that says so. A client cannot claim HTTPS by sending the header
 * itself; behind no proxy the header is ignored.
 */
function request_is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off') {
        return true;
    }
    $proxies = array_filter(array_map('trim', explode(',', (string) env('TRUSTED_PROXIES', ''))));
    return in_array((string) ($_SERVER['REMOTE_ADDR'] ?? ''), $proxies, true)
        && strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
}

/** Secure cookies whenever the request is HTTPS, and always in production (HTTPS-only there). */
function cookie_secure(): bool
{
    return is_production() || request_is_https();
}

/** The caller's address (REMOTE_ADDR; a trusted proxy's X-Forwarded-For when behind one). */
function client_ip(): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    $proxies = array_filter(array_map('trim', explode(',', (string) env('TRUSTED_PROXIES', ''))));
    if (in_array($ip, $proxies, true) && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $hops = array_map('trim', explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR']));
        $last = end($hops);
        if (is_string($last) && filter_var($last, FILTER_VALIDATE_IP)) {
            return $last;
        }
    }
    return $ip;
}

/**
 * What is unsafe about this configuration for a public deployment, as short messages that
 * never contain a value (server/bin/check-config.php prints them; web requests refuse to run
 * with any of them in production).
 */
function config_problems(): array
{
    if (!is_production()) {
        return [];
    }
    $out = [];
    $placeholder = fn (string $v) => (bool) preg_match('/replace|change[-_ ]?me|example|^bepviet$|^secret$|^admin$|^password$/i', $v);
    $url = (string) env('APP_URL', '');
    if (!preg_match('#^https://[a-z0-9.-]+(:\d+)?$#i', rtrim($url, '/'))) {
        $out[] = 'APP_URL must be the https origin of the site (no path).';
    }
    $key = (string) env('APP_KEY', '');
    if (strlen($key) < 32 || $placeholder($key)) {
        $out[] = 'APP_KEY must be a random string of at least 32 characters.';
    }
    $pass = (string) env('ADMIN_PASSWORD', '');
    // A short password is only a warning (check-config.php): the login limiter slows guessing.
    if ($pass !== '' && (strlen($pass) < 8 || $placeholder($pass))) {
        $out[] = 'ADMIN_PASSWORD must be at least 8 characters and not a placeholder (or empty to disable admin).';
    }
    $mail = (string) (env('MAIL_DRIVER', '') ?: env('MAIL_MAILER', '') ?: 'log');
    if (!in_array($mail, ['smtp', 'mail'], true)) {
        $out[] = 'MAIL_DRIVER must be smtp or mail (the log driver writes login codes to disk).';
    }
    if ((string) env('AI_API_KEY', '') !== '' && $placeholder((string) env('AI_API_KEY', ''))) {
        $out[] = 'AI_API_KEY is a placeholder.';
    }
    return $out;
}

/** Web entry points call this first: a production site with an unsafe .env does not serve the API. */
function require_safe_config(): void
{
    $problems = config_problems();
    if ($problems) {
        error_log('[angi config] refusing to serve: ' . implode(' ', $problems));
        throw new HttpError(503, __t('api.serverError'));
    }
}

/** CLI tools and dev scripts call this first: they must never run from a web request. */
function require_cli(): void
{
    if (PHP_SAPI !== 'cli') {
        http_response_code(404);
        exit;
    }
}

/**
 * Runs `$fn` in one transaction that holds the write lock from the start (SQLite: BEGIN
 * IMMEDIATE; MariaDB: the caller locks rows with FOR UPDATE), so a check and the write it
 * guards cannot interleave with a parallel request. Joins an outer transaction if one is open.
 */
function db_tx(PDO $pdo, callable $fn): mixed
{
    // PDO does not see a transaction begun with exec('BEGIN IMMEDIATE'), so track our own.
    static $open = null;
    $open ??= new WeakMap();
    if ($pdo->inTransaction() || ($open[$pdo] ?? false)) {
        return $fn();
    }
    $sqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
    $sqlite ? $pdo->exec('BEGIN IMMEDIATE') : $pdo->beginTransaction();
    $open[$pdo] = true;
    try {
        $out = $fn();
        $sqlite ? $pdo->exec('COMMIT') : $pdo->commit();
        return $out;
    } catch (Throwable $e) {
        try {
            $sqlite ? $pdo->exec('ROLLBACK') : $pdo->rollBack();
        } catch (Throwable) {
            // The failure itself may have ended the transaction.
        }
        throw $e;
    } finally {
        unset($open[$pdo]);
    }
}

/** " FOR UPDATE" on MariaDB (row lock inside db_tx); SQLite already holds the database lock. */
function for_update(PDO $pdo): string
{
    return $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite' ? '' : ' FOR UPDATE';
}

/** Keyed hash for short secrets (OTP codes, IPs, emails kept for limits): useless without APP_KEY. */
function secret_hash(string $value): string
{
    return hash_hmac('sha256', $value, (string) env('APP_KEY', 'bepviet-local-key'));
}

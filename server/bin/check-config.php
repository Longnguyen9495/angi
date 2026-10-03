<?php

declare(strict_types=1);

// Command-line only: a web request that reaches this file gets a 404 and nothing runs.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

/*
 * Is this .env safe for a public deployment? Prints problems, never values.
 *   php server/bin/check-config.php      (exit 1 when the API would refuse to serve)
 * Same rules as config_problems() in lib/bootstrap.php, plus a few file checks.
 */
require_once __DIR__ . '/../lib/bootstrap.php';

$problems = config_problems();
$notes = [];
if (!is_production()) {
    $notes[] = 'APP_ENV=local: production rules are not applied (login codes are returned by the API).';
}
$env = APP_ROOT . '/.env';
if (is_file($env) && DIRECTORY_SEPARATOR === '/' && (fileperms($env) & 0o007)) {
    $problems[] = '.env is readable by every user on the machine (chmod 640).';
}
if (is_production() && trim((string) env('TRUSTED_PROXIES', '')) === '' && empty($_SERVER['HTTPS'])) {
    $notes[] = 'TRUSTED_PROXIES is empty: fine when PHP sees HTTPS directly; set it to the proxy IP when TLS ends at a proxy.';
}
foreach ($notes as $n) {
    echo "note: $n\n";
}
foreach ($problems as $p) {
    echo "PROBLEM: $p\n";
}
echo $problems ? "Configuration is NOT safe for production.\n" : "Configuration looks safe.\n";
exit($problems ? 1 : 0);

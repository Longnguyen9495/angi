<?php
// Dev only: `php -S 127.0.0.1:8111` in this folder (see public/images/garden3d/detail/CREDITS.md).
// Under Apache/FPM, or from any address but loopback, it does nothing.
if (PHP_SAPI !== 'cli-server' || !in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) {
    http_response_code(404);
    exit;
}
$name = preg_replace('/[^a-z0-9-]/', '', $_GET['name'] ?? 'out');
$data = file_get_contents('php://input', false, null, 0, 8 * 1024 * 1024);
$b64 = substr($data, strpos($data, ',') + 1);
file_put_contents(__DIR__ . "/$name.jpg", base64_decode($b64));
echo 'ok';

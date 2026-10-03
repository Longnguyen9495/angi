<?php

declare(strict_types=1);

// Command-line only: a web request that reaches this file gets a 404 and nothing runs.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

// Creates the database and tables (idempotent). Usage: php server/bin/migrate.php

require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/ReviewService.php';
require_once __DIR__ . '/../lib/Schema.php';

if (env('DB_DRIVER', 'mysql') === 'sqlite') {
    $dir = dirname(sqlite_path());
    if (!is_dir($dir) && !mkdir($dir, 0775, true)) {
        fwrite(STDERR, "Cannot create $dir\n");
        exit(1);
    }
    // PDO's SQLite driver runs a multi-statement script (triggers included) in one exec.
    db()->exec(file_get_contents(__DIR__ . '/../sql/schema.sqlite.sql'));
    (new ReviewService(db()))->migrate();
    // Columns and tables added after the first release (idempotent).
    Schema::upgrade(db());
    echo 'Schema ready in ' . sqlite_path() . ".\n";
    exit;
}

$dsn = sprintf('mysql:host=%s;port=%s;charset=utf8mb4', env('DB_HOST', '127.0.0.1'), env('DB_PORT', '3306'));
$pdo = new PDO($dsn, env('DB_USER', 'root'), env('DB_PASS', ''), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$sql = file_get_contents(__DIR__ . '/../sql/schema.sql');
$sql = str_replace('CREATE DATABASE IF NOT EXISTS angi', 'CREATE DATABASE IF NOT EXISTS `' . env('DB_NAME', 'angi') . '`', $sql);
$sql = str_replace('USE angi;', 'USE `' . env('DB_NAME', 'angi') . '`;', $sql);
foreach (array_filter(array_map('trim', explode(';', preg_replace('/^--.*$/m', '', $sql)))) as $statement) {
    $pdo->exec($statement);
}
(new ReviewService(db()))->migrate();
Schema::upgrade(db());
echo "Schema ready in database " . env('DB_NAME', 'angi') . ".\n";

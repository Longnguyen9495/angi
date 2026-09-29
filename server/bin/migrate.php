<?php

declare(strict_types=1);

// Creates the database and tables (idempotent). Usage: php server/bin/migrate.php

require_once __DIR__ . '/../lib/bootstrap.php';

$dsn = sprintf('mysql:host=%s;port=%s;charset=utf8mb4', env('DB_HOST', '127.0.0.1'), env('DB_PORT', '3306'));
$pdo = new PDO($dsn, env('DB_USER', 'root'), env('DB_PASS', ''), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$sql = file_get_contents(__DIR__ . '/../sql/schema.sql');
$sql = str_replace('CREATE DATABASE IF NOT EXISTS angi', 'CREATE DATABASE IF NOT EXISTS `' . env('DB_NAME', 'angi') . '`', $sql);
$sql = str_replace('USE angi;', 'USE `' . env('DB_NAME', 'angi') . '`;', $sql);
foreach (array_filter(array_map('trim', explode(';', preg_replace('/^--.*$/m', '', $sql)))) as $statement) {
    $pdo->exec($statement);
}
echo "Schema ready in database " . env('DB_NAME', 'angi') . ".\n";

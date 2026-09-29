<?php

declare(strict_types=1);

// Imports server/sql/seed.json. Refuses to touch a non-empty catalogue unless --force.
// Usage: php server/bin/seed.php [--force]

require_once __DIR__ . '/../lib/Catalogue.php';

$force = in_array('--force', $argv, true);
$pdo = db();
$count = (int) $pdo->query('SELECT COUNT(*) FROM dishes')->fetchColumn();
if ($count > 0 && !$force) {
    fwrite(STDERR, "Catalogue already has $count dishes. Re-run with --force to replace it.\n");
    exit(1);
}
$seed = json_decode(file_get_contents(__DIR__ . '/../sql/seed.json'), true, flags: JSON_THROW_ON_ERROR);
$cat = new Catalogue($pdo);

$pdo->exec('DELETE FROM dish_ingredients');
$pdo->exec('DELETE FROM dishes');
$pdo->exec('DELETE FROM ingredients');
foreach ($seed['ingredients'] as $ing) {
    $cat->ensureIngredient($ing);
}
foreach ($seed['dishes'] as $dish) {
    $cat->saveDish($dish, null, 'curated');
}
echo 'Seeded ' . count($seed['dishes']) . ' dishes and ' . count($seed['ingredients']) . " ingredients.\n";

<?php

declare(strict_types=1);

// Imports server/sql/seed.json. Refuses to touch a non-empty catalogue unless --force.
// --from=<file> imports a catalogue snapshot instead (GET /api/dishes shape, e.g.
// src/features/food-reel/data/catalogue.snapshot.json) — used to copy a local catalogue to production.
// Afterwards every server/sql/i18n/<locale>.json is applied (see import-translations.php).
// Usage: php server/bin/seed.php [--force] [--from=<file>]

require_once __DIR__ . '/../lib/Catalogue.php';

$force = in_array('--force', $argv, true);
$from = null;
foreach ($argv as $arg) {
    if (str_starts_with($arg, '--from=')) {
        $from = substr($arg, 7);
    }
}
$pdo = db();
$count = (int) $pdo->query('SELECT COUNT(*) FROM dishes')->fetchColumn();
if ($count > 0 && !$force) {
    fwrite(STDERR, "Catalogue already has $count dishes. Re-run with --force to replace it.\n");
    exit(1);
}
$seed = json_decode(file_get_contents($from ?? __DIR__ . '/../sql/seed.json'), true, flags: JSON_THROW_ON_ERROR);
$dishes = $seed['dishes'] ?? $seed['items'];
$cat = new Catalogue($pdo);

$pdo->exec('DELETE FROM dish_translations');
$pdo->exec('DELETE FROM ingredient_translations');
$pdo->exec('DELETE FROM dish_ingredients');
$pdo->exec('DELETE FROM dishes');
$pdo->exec('DELETE FROM ingredients');
foreach ($seed['ingredients'] ?? [] as $ing) {
    $cat->ensureIngredient($ing);
}
foreach ($dishes as $dish) {
    $cat->saveDish($dish, null, $dish['contentSource'] ?? 'curated');
}
$ingredients = (int) $pdo->query('SELECT COUNT(*) FROM ingredients')->fetchColumn();
echo 'Seeded ' . count($dishes) . " dishes and $ingredients ingredients.\n";
foreach (glob(__DIR__ . '/../sql/i18n/*.json') ?: [] as $file) {
    $locale = basename($file, '.json');
    if (!in_array($locale, Lang::extra(), true)) {
        echo "Skipped $file: no server/lang/$locale.php.\n";
        continue;
    }
    $r = $cat->importTranslations($locale, json_decode(file_get_contents($file), true, flags: JSON_THROW_ON_ERROR));
    echo "Translations [$locale]: {$r['dishes']} dishes, {$r['ingredients']} ingredients.\n";
}

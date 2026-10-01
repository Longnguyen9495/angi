<?php

declare(strict_types=1);

// Upserts catalogue translations from server/sql/i18n/<locale>.json into the existing
// database. Only *_translations rows change: Vietnamese fields are never touched, ids
// that are not in the catalogue are skipped (and listed), fields missing from the file
// keep their stored translation.
//
// File shape: { "dishes": { "<dishId>": { "name"?, "subtitle"?, "story"? } },
//               "ingredients": { "<ingredientId>": { "name"?, "description"? } } }
//
// Usage: php server/bin/import-translations.php                 every server/sql/i18n/*.json
//        php server/bin/import-translations.php --locale=en     only server/sql/i18n/en.json
//        php server/bin/import-translations.php --locale=en --file=path/to/en.json
//        add --dry-run to validate and count without writing

require_once __DIR__ . '/../lib/Catalogue.php';

$opts = ['locale' => null, 'file' => null];
$dry = false;
foreach (array_slice($argv, 1) as $arg) {
    if ($arg === '--dry-run') {
        $dry = true;
    } elseif (preg_match('/^--(locale|file)=(.+)$/', $arg, $m)) {
        $opts[$m[1]] = $m[2];
    } else {
        fwrite(STDERR, "Unknown argument: $arg\n");
        exit(2);
    }
}

$dir = __DIR__ . '/../sql/i18n';
if ($opts['file'] !== null) {
    $locale = $opts['locale'] ?? basename($opts['file'], '.json');
    $jobs = [$locale => $opts['file']];
} elseif ($opts['locale'] !== null) {
    $jobs = [$opts['locale'] => "$dir/{$opts['locale']}.json"];
} else {
    $jobs = [];
    foreach (glob("$dir/*.json") ?: [] as $file) {
        $jobs[basename($file, '.json')] = $file;
    }
}
if (!$jobs) {
    fwrite(STDERR, "No translation files found in server/sql/i18n/.\n");
    exit(1);
}

$pdo = db();
$cat = new Catalogue($pdo);
$failed = false;
foreach ($jobs as $locale => $file) {
    if (!in_array($locale, Lang::extra(), true)) {
        fwrite(STDERR, "[$locale] skipped: no server/lang/$locale.php (available: " . implode(', ', Lang::extra()) . ").\n");
        $failed = true;
        continue;
    }
    if (!is_file($file)) {
        fwrite(STDERR, "[$locale] missing file: $file\n");
        $failed = true;
        continue;
    }
    try {
        $doc = json_decode((string) file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);
        if (!is_array($doc)) {
            throw new RuntimeException('top level must be an object');
        }
        if ($dry) {
            $pdo->beginTransaction();
        }
        $r = $cat->importTranslations($locale, $doc);
        if ($dry) {
            $pdo->rollBack();
        }
        printf(
            "[%s] %s%d dishes, %d ingredients from %s\n",
            $locale,
            $dry ? '(dry run) would import ' : 'imported ',
            $r['dishes'],
            $r['ingredients'],
            $file,
        );
        foreach (['skippedDishes' => 'dish', 'skippedIngredients' => 'ingredient'] as $k => $what) {
            if ($r[$k]) {
                printf("[%s] skipped %d unknown %s id(s): %s\n", $locale, count($r[$k]), $what, implode(', ', $r[$k]));
            }
        }
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        fwrite(STDERR, "[$locale] failed: " . $e->getMessage() . "\n");
        $failed = true;
    }
}
exit($failed ? 1 : 0);

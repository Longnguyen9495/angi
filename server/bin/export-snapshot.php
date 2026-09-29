<?php

declare(strict_types=1);

// Writes the bundled fallback catalogue (same shape as GET /api/dishes).
// Runs before every production build; if the database is down the existing
// snapshot is kept so the build still succeeds.
// Usage: php server/bin/export-snapshot.php

require_once __DIR__ . '/../lib/Catalogue.php';

$target = APP_ROOT . '/src/features/food-reel/data/catalogue.snapshot.json';
try {
    $catalogue = new Catalogue(db());
    $items = array_values(array_filter(
        $catalogue->listDishes(),
        fn ($d) => $d['image'] !== '' && $d['thumbnail'] !== '' && $d['ingredients'],
    ));
    $items = array_map(function ($d) {
        unset($d['aiModel'], $d['aiAt'], $d['updatedAt'], $d['contentSource']);
        return $d;
    }, $items);
    $json = json_encode(
        ['version' => $catalogue->version(), 'count' => count($items), 'items' => $items],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT,
    );
    file_put_contents($target, $json . "\n");
    echo 'Snapshot: ' . count($items) . " dishes → src/features/food-reel/data/catalogue.snapshot.json\n";
} catch (Throwable $e) {
    if (!is_file($target)) {
        fwrite(STDERR, 'Cannot export snapshot and none exists: ' . $e->getMessage() . "\n");
        exit(1);
    }
    fwrite(STDERR, 'Database unavailable, keeping the existing snapshot: ' . $e->getMessage() . "\n");
}

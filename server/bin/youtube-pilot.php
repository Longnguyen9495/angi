<?php

declare(strict_types=1);

// Command-line only: a web request that reaches this file gets a 404 and nothing runs.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require_once __DIR__ . '/../lib/YoutubePilot.php';
require_once __DIR__ . '/../lib/Catalogue.php';
$options = getopt('', ['check-config', 'dry-run', 'resume', 'dish:']);
if (isset($options['check-config'])) {
    $presence = YoutubePilot::presence();
    echo json_encode(['presence' => $presence, 'ready' => !in_array(false, $presence, true)], JSON_UNESCAPED_UNICODE) . "\n";
    exit(in_array(false, $presence, true) ? 2 : 0);
}
try {
    $pilot = new YoutubePilot();
    $dishes = isset($options['dish']) ? [$options['dish']] : array_keys(YoutubePilot::DISHES);
    foreach ($dishes as $dish) {
        if (!is_string($dish) || !isset(YoutubePilot::DISHES[$dish])) {
            throw new RuntimeException('Dish ngoài whitelist pilot.');
        }
    }
    $catalogue = isset($options['dry-run']) ? null : new Catalogue(db());
    foreach ($dishes as $dish) {
        $videos = $pilot->run($dish, isset($options['resume']));
        if ($catalogue !== null) {
            $catalogue->saveYoutubeVideos($dish, $videos);
        }
        echo json_encode(['dish' => $dish, 'dryRun' => $catalogue === null, 'count' => count($videos), 'ids' => array_column($videos, 'videoId')], JSON_UNESCAPED_UNICODE) . "\n";
    }
} catch (Throwable $e) {
    // Only our controlled service errors can be printed; DB errors may contain credentials.
    fwrite(STDERR, ($e instanceof PDOException ? 'Database operation failed; run migration and check configuration.' : $e->getMessage()) . "\n");
    exit(str_starts_with($e->getMessage(), 'config-error:') ? 2 : 1);
}

<?php

declare(strict_types=1);

// Command-line only: a web request that reaches this file gets a 404 and nothing runs.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

/*
 * Rewrites dish content from each photo with the configured vision model.
 * Usage:
 *   php server/bin/ai-enrich.php                 # every dish not yet written by AI
 *   php server/bin/ai-enrich.php --all           # every dish, even ones already done
 *   php server/bin/ai-enrich.php --only=pho-bo,bun-moc
 *   php server/bin/ai-enrich.php --limit=5 --concurrency=4
 */

require_once __DIR__ . '/../lib/AiEnricher.php';

$opts = getopt('', ['all', 'only:', 'limit:', 'concurrency:']);
$catalogue = new Catalogue(db());
$ai = new AiEnricher($catalogue);

$dishes = $catalogue->listDishes();
if (isset($opts['only'])) {
    $only = array_map('trim', explode(',', (string) $opts['only']));
    $dishes = array_values(array_filter($dishes, fn ($d) => in_array($d['id'], $only, true)));
} elseif (!isset($opts['all'])) {
    $dishes = array_values(array_filter($dishes, fn ($d) => $d['contentSource'] !== 'ai'));
}
if (isset($opts['limit'])) {
    $dishes = array_slice($dishes, 0, max(1, (int) $opts['limit']));
}
$concurrency = max(1, min(8, (int) ($opts['concurrency'] ?? 4)));
$total = count($dishes);
echo "Model {$ai->model()} · $total món · song song $concurrency\n";
if ($total === 0) {
    exit(0);
}

$queue = array_map(fn ($d) => ['dish' => $d, 'tries' => 0], $dishes);
$running = [];
$done = 0;
$failed = [];
$mh = curl_multi_init();
$started = microtime(true);

$launch = function () use (&$queue, &$running, $mh, $ai, $catalogue): void {
    $job = array_shift($queue);
    $job['tries']++;
    // Library is re-read per request so later dishes reuse ingredients created earlier.
    $ch = $ai->curlHandle($ai->buildRequest($job['dish'], $catalogue->listIngredients()));
    curl_multi_add_handle($mh, $ch);
    $running[(int) $ch] = ['ch' => $ch, 'job' => $job];
};

while ($queue || $running) {
    while ($queue && count($running) < $concurrency) {
        $launch();
    }
    curl_multi_exec($mh, $active);
    curl_multi_select($mh, 1.0);
    while ($info = curl_multi_info_read($mh)) {
        $ch = $info['handle'];
        ['job' => $job] = $running[(int) $ch];
        unset($running[(int) $ch]);
        $body = (string) curl_multi_getcontent($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_multi_remove_handle($mh, $ch);
        $id = $job['dish']['id'];
        try {
            if ($err !== '') {
                throw new RuntimeException($err);
            }
            $saved = $ai->apply($job['dish'], $ai->parse($body, $status));
            $done++;
            $names = implode(', ', array_map(fn ($i) => $i['name'], $saved['ingredients']));
            printf("[%3d/%d] ✓ %s → %s · %s\n", $done + count($failed), $total, $id, $saved['region'], $names);
        } catch (Throwable $e) {
            if ($job['tries'] < 2) {
                $queue[] = $job; // one retry
                printf("        ↻ %s: %s (thử lại)\n", $id, $e->getMessage());
            } else {
                $failed[$id] = $e->getMessage();
                printf("[%3d/%d] ✗ %s: %s\n", $done + count($failed), $total, $id, $e->getMessage());
            }
        }
    }
}
curl_multi_close($mh);

printf("\nXong %d/%d món trong %.0fs.", $done, $total, microtime(true) - $started);
if ($failed) {
    echo ' Lỗi: ' . implode(', ', array_keys($failed)) . "\n";
    exit(1);
}
echo "\n";

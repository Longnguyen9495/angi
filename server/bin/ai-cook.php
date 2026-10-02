<?php

declare(strict_types=1);

/*
 * Writes how the farm game cooks each dish (steps + pantry items, table dish_cook).
 * Text-only requests: the dish's name, story and ingredients are enough, no photo.
 * Usage:
 *   php server/bin/ai-cook.php                    # every dish without a recipe yet
 *   php server/bin/ai-cook.php --all              # every dish, rewriting existing ones
 *   php server/bin/ai-cook.php --only=pho-bo,bun-cha --limit=5 --concurrency=4
 *   php server/bin/ai-cook.php --import=src/features/food-reel/data/catalogue.snapshot.json
 *       copies `cook` from a snapshot (no AI): how production gets the recipes made locally.
 *       Dishes that are not in the database are skipped; add --all to overwrite existing ones.
 */

require_once __DIR__ . '/../lib/AiEnricher.php';

$opts = getopt('', ['all', 'only:', 'limit:', 'concurrency:', 'import:']);
$catalogue = new Catalogue(db());

$dishes = $catalogue->listDishes();
if (isset($opts['only'])) {
    $only = array_map('trim', explode(',', (string) $opts['only']));
    $dishes = array_values(array_filter($dishes, fn ($d) => in_array($d['id'], $only, true)));
} elseif (!isset($opts['all'])) {
    $dishes = array_values(array_filter($dishes, fn ($d) => $d['cook'] === null));
}
if (isset($opts['limit'])) {
    $dishes = array_slice($dishes, 0, max(1, (int) $opts['limit']));
}

if (isset($opts['import'])) {
    $doc = json_decode((string) @file_get_contents((string) $opts['import']), true);
    if (!is_array($doc['items'] ?? null)) {
        fwrite(STDERR, "Không đọc được {$opts['import']}.\n");
        exit(1);
    }
    $from = array_column($doc['items'], 'cook', 'id');
    $n = 0;
    foreach ($dishes as $d) {
        $cook = Catalogue::cleanCook($from[$d['id']] ?? null);
        if ($cook !== null) {
            $catalogue->saveCook($d['id'], $cook);
            $n++;
        }
    }
    echo "Đã chép cách nấu cho $n/" . count($dishes) . " món.\n";
    exit(0);
}

$ai = new AiEnricher($catalogue);
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

while ($queue || $running) {
    while ($queue && count($running) < $concurrency) {
        $job = array_shift($queue);
        $job['tries']++;
        $ch = $ai->curlHandle($ai->buildCookRequest($job['dish']));
        curl_multi_add_handle($mh, $ch);
        $running[(int) $ch] = $job;
    }
    curl_multi_exec($mh, $active);
    curl_multi_select($mh, 1.0);
    while ($info = curl_multi_info_read($mh)) {
        $ch = $info['handle'];
        $job = $running[(int) $ch];
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
            $cook = $ai->parseCook($body, $status);
            $catalogue->saveCook($id, $cook);
            $done++;
            printf(
                "[%3d/%d] ✓ %s: %s · %s\n",
                $done + count($failed),
                $total,
                $id,
                implode(' → ', array_column($cook['steps'], 'label')),
                implode(', ', array_map(fn ($p) => "{$p['id']}×{$p['qty']}", $cook['produce'])),
            );
        } catch (Throwable $e) {
            if ($job['tries'] < 2) {
                $queue[] = $job; // one retry
                printf("        ↻ %s: %s (thử lại)\n", $id, $e->getMessage());
            } else {
                $failed[] = $id;
                printf("[%3d/%d] ✗ %s: %s\n", $done + count($failed), $total, $id, $e->getMessage());
            }
        }
    }
}
curl_multi_close($mh);
echo "Xong: $done món" . ($failed ? ', lỗi: ' . implode(', ', $failed) : '') . "\n";
exit($failed ? 1 : 0);

<?php

declare(strict_types=1);

// Command-line only: a web request that reaches this file gets a 404 and nothing runs.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

/*
 * Helpers shared by the self-tests: a garden save in the shape the app writes (what
 * ProgressGuard accepts as a first save), and the same save with ledger entries applied the
 * way the game's reducer applies them.
 */

/** A new garden as createInitialProgress() writes it, with `$over` merged on top. */
function progress_fixture(string $guestId, array $over = []): array
{
    $plots = [];
    for ($i = 1; $i <= 4; $i++) {
        $plots[] = ['id' => $i, 'crop' => null, 'plantedAt' => null, 'readyAt' => null, 'sourceDishId' => null, 'wateredAt' => null];
    }
    return array_replace([
        'guestId' => $guestId,
        'createdAt' => time() * 1000,
        'xp' => 0,
        'coins' => 0,
        'seeds' => [],
        'ingredients' => [],
        'plots' => $plots,
        'stamps' => ['discovered' => [], 'eaten' => []],
        'unlockedRegions' => ['south'],
        'unlockedCrops' => [],
        'cooked' => [],
        'decor' => [],
        'decorLayout' => [],
        'animals' => [],
        'hive' => ['startedAt' => null, 'readyAt' => null],
        'boat' => ['sentAt' => null, 'returnAt' => null],
        'streak' => ['count' => 1, 'lastActiveDate' => gmdate('Y-m-d'), 'restPasses' => 1],
        'quests' => ['total' => [], 'badges' => []],
        'history' => [],
        'photos' => [],
        'ledger' => [],
    ], $over);
}

/**
 * `$p` with entries [key, resource, delta, at?] appended and balances moved, like the
 * reducer's post(); `at` defaults to now.
 */
function with_entries(array $p, array $entries): array
{
    foreach ($entries as $e) {
        [$key, $res, $delta] = $e;
        $at = $e[3] ?? (int) floor(microtime(true) * 1000);
        if ($res === 'xp') {
            $p['xp'] += $delta;
        } elseif ($res === 'coin') {
            $p['coins'] += $delta;
        } elseif ($res !== 'stamp') {
            [$kind, $id] = explode(':', $res, 2);
            $field = $kind === 'seed' ? 'seeds' : 'ingredients';
            $p[$field][$id] = ($p[$field][$id] ?? 0) + $delta;
        }
        $p['ledger'][] = ['key' => $key, 'resource' => $res, 'delta' => $delta, 'balanceAfter' => 0, 'reason' => 'test', 'at' => $at];
    }
    return $p;
}

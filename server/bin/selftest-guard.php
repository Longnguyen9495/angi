<?php

declare(strict_types=1);

// Command-line only: a web request that reaches this file gets a 404 and nothing runs.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

/*
 * Replays a fixture of saves through ProgressGuard on an in-memory SQLite database.
 * The fixture comes from src/domain/progressGuard.test.ts (a bot playing a week by the rules,
 * plus forged saves): every honest save must pass, every forged one must fail with its code,
 * and the pond/boat/XP formulas must match the game's exactly.
 *   npm test -- progressGuard     (writes a fixture to a temp folder and runs this)
 */
require_once __DIR__ . '/../lib/ProgressGuard.php';
require_once __DIR__ . '/../lib/Friends.php';

$file = $argv[1] ?? '';
$fixture = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
if (!is_array($fixture)) {
    fwrite(STDERR, "Usage: php server/bin/selftest-guard.php <fixture.json> (see src/domain/progressGuard.test.ts)\n");
    exit(2);
}

$pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pdo->exec(file_get_contents(__DIR__ . '/../sql/schema.sqlite.sql'));
Schema::upgrade($pdo);
$pdo->prepare("INSERT INTO users (id, email, consent_version, consent_at, created_at) VALUES (1, 'bot@example.invalid', 'x', 0, ?)")
    ->execute([intdiv((int) $fixture['steps'][0]['clientNow'], 1000)]);
// The catalogue the honest bot ate and cooked from (stamps and dish recipes must be real dishes).
$dish = $pdo->prepare("INSERT OR IGNORE INTO dishes (id, name, image, thumbnail) VALUES (?, ?, '', '')");
foreach ($fixture['steps'] as $step) {
    foreach (['discovered', 'eaten'] as $k) {
        foreach ($step['data']['stamps'][$k] ?? [] as $id) {
            $dish->execute([$id, $id]);
        }
    }
    foreach (array_keys($step['data']['cooked'] ?? []) as $id) {
        if (!isset(ProgressGuard::rules()['recipes'][$id])) {
            $dish->execute([$id, $id]);
        }
    }
}

$pass = $fail = 0;
$check = function (string $name, bool $ok, string $why = '') use (&$pass, &$fail): void {
    $ok ? $pass++ : $fail++;
    if (!$ok) {
        echo "FAIL $name" . ($why !== '' ? " — $why" : '') . "\n";
    }
};
/** Last refusal detail from the guard (it logs one line per refusal). */
$detail = function (Throwable $e): string {
    return $e instanceof HttpError ? (($e->extra['code'] ?? '?') . ': ' . $e->getMessage()) : get_class($e) . ': ' . $e->getMessage();
};

// ——— Formulas shared with the game ———
$guard = new ProgressGuard($pdo, 1, 0);
foreach ($fixture['parity']['casts'] as [$t, $lv, $kind]) {
    $check("catchFor($t, $lv)", $guard->catchFor((int) $t, (int) $lv) === $kind, $guard->catchFor((int) $t, (int) $lv) . " vs $kind");
}
foreach ($fixture['parity']['boats'] as [$t, $lv, $kinds]) {
    $check("boatCatch($t, $lv)", $guard->boatCatch((int) $t, (int) $lv) === $kinds);
}
foreach ($fixture['parity']['bites'] as [$t, $delay]) {
    $check("biteDelay($t)", $guard->biteDelay((int) $t) === (int) $delay);
}
foreach ($fixture['parity']['xp'] as [$ms, $xp]) {
    $check("harvestXp($ms)", ProgressGuard::harvestXp((int) $ms) === (int) $xp);
}
echo "parity checked\n";

// ——— A week of honest saves ———
$row = null;
foreach ($fixture['steps'] as $i => $step) {
    $now = (int) $step['clientNow'];
    $g = new ProgressGuard($pdo, 1, $now);
    try {
        $c = $g->check($row, $step['data'], $now);
        $g->commit($c);
        $row = ['data' => json_encode($step['data']), 'client_offset' => $c['offset'], 'updated_at' => intdiv($now, 1000)];
        $check("honest save $i", true);
    } catch (Throwable $e) {
        $check("honest save $i", false, $detail($e));
        break;
    }
}
echo 'honest saves: ' . count($fixture['steps']) . "\n";

// ——— Forged saves on top of the last honest one ———
foreach ($fixture['cheats'] as $cheat) {
    $now = (int) $cheat['clientNow'];
    $code = null;
    try {
        // The server's clock stays at the cheat's intended "now" except for the clock-jump case.
        $server = $cheat['code'] === 'clock' && str_contains($cheat['name'], 'device clock') ? $now - 3 * 3_600_000 : $now;
        $g = new ProgressGuard($pdo, 1, $server);
        $g->check($row, $cheat['data'], $now);
    } catch (HttpError $e) {
        $code = $e->extra['code'] ?? null;
    }
    $check("refuses: {$cheat['name']}", $code === $cheat['code'], 'got ' . var_export($code, true) . ", want {$cheat['code']}");
}

echo 'forged saves: ' . count($fixture['cheats']) . "\n";
echo "SUMMARY passed=$pass failed=$fail\n";
exit($fail === 0 ? 0 : 1);

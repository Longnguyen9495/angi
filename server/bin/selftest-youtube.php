<?php

declare(strict_types=1);
require_once __DIR__ . '/../lib/YoutubePilot.php';
require_once __DIR__ . '/../lib/Catalogue.php';
$failures = 0;
$check = function (string $name, bool $ok) use (&$failures): void {
    echo ($ok ? 'PASS ' : 'FAIL ') . $name . "\n";
    $failures += $ok ? 0 : 1;
};
$rejects = function (callable $fn): bool {
    try { $fn(); } catch (RuntimeException $e) { return true; }
    return false;
};
$item = ['id' => 'abcdefghijk', 'status' => ['privacyStatus' => 'public', 'uploadStatus' => 'processed', 'embeddable' => true], 'snippet' => ['title' => 'Nấu phở bò', 'channelId' => 'UC' . str_repeat('a', 22), 'channelTitle' => 'Bếp', 'publishedAt' => '2025-01-01T00:00:00Z'], 'contentDetails' => ['duration' => 'PT10M']];
$ids = ['abcdefghijk', 'lmnopqrstuv'];
$candidates = YoutubePilot::candidates($ids, [$item]);
$check('valid candidate and missing videos omitted', count($candidates) === 1);
foreach ([['status', 'privacyStatus', 'private'], ['status', 'uploadStatus', 'uploaded'], ['status', 'embeddable', false], ['contentDetails', 'contentRating', ['ytRating' => 'ytAgeRestricted']], ['contentDetails', 'regionRestriction', ['allowed' => ['US']]], ['contentDetails', 'regionRestriction', ['blocked' => ['VN']]]] as [$part, $field, $value]) {
    $bad = $item;
    $bad[$part][$field] = $value;
    $check('reject ' . $field . ':' . json_encode($value), YoutubePilot::candidates($ids, [$bad]) === []);
}
$allowed = $item;
$allowed['contentDetails']['regionRestriction'] = ['allowed' => ['VN']];
$check('region VN allowed', count(YoutubePilot::candidates($ids, [$allowed])) === 1);
$check('unknown IDs rejected', $rejects(fn () => YoutubePilot::select(['lmnopqrstuv'], $candidates)));
$check('duplicate IDs rejected', $rejects(fn () => YoutubePilot::select(['abcdefghijk', 'abcdefghijk'], $candidates)));
$check('over five rejected', $rejects(fn () => YoutubePilot::select(range(1, 6), $candidates)));
$check('valid selection only returns provider metadata', YoutubePilot::select(['abcdefghijk'], $candidates) === $candidates);
$check('empty selection allowed', YoutubePilot::select([], $candidates) === []);

// Standalone integration: no .env database, existing dishes or frontend artifacts touched.
$pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$pdo->exec('PRAGMA foreign_keys = ON');
$sql = (string) file_get_contents(__DIR__ . '/../sql/schema.sqlite.sql');
$pdo->exec($sql);
$pdo->exec($sql);
$cat = new Catalogue($pdo);
$input = ['id' => 'com-tam', 'name' => 'Cơm tấm', 'image' => '/images/test.webp', 'thumbnail' => '/images/test.webp', 'video' => ['src' => '/video/original.mp4', 'poster' => '/images/test.webp', 'credit' => 'original'], 'ingredients' => [['name' => 'Gạo tấm']]];
$original = $cat->saveDish($input, null);
$v1 = $cat->version();
$cat->saveYoutubeVideos('com-tam', $candidates);
$v2 = $cat->version();
$dish = $cat->getDish('com-tam');
$check('SQLite migration idempotent and public shape', $dish['youtubeVideos'] === $candidates && $cat->listDishes()[0]['youtubeVideos'] === $candidates);
$check('original video and dish unchanged', $dish['video'] === $original['video'] && $dish['updatedAt'] === $original['updatedAt']);
$check('version changes on insertion', $v1 !== $v2);
$second = $candidates[0];
$second['videoId'] = 'lmnopqrstuv';
$second['thumbnail'] = 'https://i.ytimg.com/vi/lmnopqrstuv/hqdefault.jpg';
$cat->saveYoutubeVideos('com-tam', [$candidates[0], $second]);
$v3 = $cat->version();
$cat->saveYoutubeVideos('com-tam', [$second, $candidates[0]]);
$check('version changes on order within same second', $v3 !== $cat->version());
$v4 = $cat->version();
$second['title'] = 'Metadata mới';
$cat->saveYoutubeVideos('com-tam', [$second, $candidates[0]]);
$check('version changes on metadata within same second', $v4 !== $cat->version());
$before = $cat->getDish('com-tam')['youtubeVideos'];
$check('atomic duplicate rejection', $rejects(fn () => $cat->saveYoutubeVideos('com-tam', [$second, $second])) && $cat->getDish('com-tam')['youtubeVideos'] === $before);
$check('whitelist enforced', $rejects(fn () => $cat->saveYoutubeVideos('banh-mi', [])));
$check('max five enforced in repository', $rejects(fn () => $cat->saveYoutubeVideos('com-tam', array_fill(0, 6, $second))));
$check('bad metadata rejected', $rejects(fn () => $cat->saveYoutubeVideos('com-tam', [['videoId' => 'abcdefghijk']])));
$withAi = $second + ['aiModel' => 'private-model', 'aiRaw' => 'private-answer'];
$cat->saveYoutubeVideos('com-tam', [$withAi]);
$check('AI metadata never exposed', !isset($cat->getDish('com-tam')['youtubeVideos'][0]['aiRaw']) && !isset($cat->getDish('com-tam')['youtubeVideos'][0]['aiModel']));
$check('missing dish rejected', $rejects(fn () => $cat->saveYoutubeVideos('pho-bo', [$second])));
$cat->saveYoutubeVideos('com-tam', []);
$check('empty selection clears videos', $cat->getDish('com-tam')['youtubeVideos'] === []);
$cat->saveYoutubeVideos('com-tam', [$second]);
$cat->deleteDish('com-tam');
$check('foreign key cascade', (int) $pdo->query('SELECT COUNT(*) FROM dish_youtube_videos')->fetchColumn() === 0);
echo $failures ? "$failures checks failed.\n" : "All YouTube checks passed.\n";
exit($failures ? 1 : 0);

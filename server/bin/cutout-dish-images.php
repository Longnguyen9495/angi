<?php

declare(strict_types=1);

// Command-line only: a web request that reaches this file gets a 404 and nothing runs.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

/*
 * Gives every dish photo stored under /uploads/dishes a transparent background instead of the
 * black square it was generated on (Images::cutOutBackground, the same step new uploads get).
 *
 *   php server/bin/cutout-dish-images.php --dry-run   # writes previews to storage/cutout-preview
 *   php server/bin/cutout-dish-images.php             # writes new files and points the dishes at them
 *
 * New files get new names (the old URLs are cached by browsers for a year) and the old files
 * stay where they are, so going back is one UPDATE per dish. Photos that already have a
 * transparent corner, or a real (not flat) background, are skipped. Run it as the user that
 * owns storage/ (www-data on the server).
 */
require_once __DIR__ . '/../lib/bootstrap.php';
require_once __DIR__ . '/../lib/Images.php';

$dry = in_array('--dry-run', $argv, true);
$preview = APP_ROOT . '/storage/cutout-preview';
if ($dry && !is_dir($preview) && !mkdir($preview, 0775, true)) {
    fwrite(STDERR, "Cannot create $preview\n");
    exit(1);
}

$db = db();
$rows = $db->query("SELECT id, image, thumbnail FROM dishes WHERE image LIKE '/uploads/dishes/%' OR thumbnail LIKE '/uploads/dishes/%'")->fetchAll(PDO::FETCH_ASSOC);
$update = $db->prepare('UPDATE dishes SET image = ?, thumbnail = ? WHERE id = ?');
$done = $skipped = 0;
$log = [];

/** The new file for one photo, or null when it needs nothing. */
$convert = function (string $url) use ($dry, $preview): ?string {
    if (!preg_match('#^/uploads/dishes/([A-Za-z0-9_.-]+)\.webp$#', $url, $m)) {
        return null;
    }
    $path = UPLOAD_DIR . '/dishes/' . $m[1] . '.webp';
    $im = is_file($path) ? @imagecreatefromwebp($path) : false;
    if (!$im) {
        echo "  missing or unreadable: $url\n";
        return null;
    }
    if (((imagecolorat($im, 0, 0) >> 24) & 0x7F) === 127 || !Images::cutOutBackground($im)) {
        return null; // already transparent, or a real photo background
    }
    // "<dish>-<stamp>-<size>" → "<dish>-<stamp>-a-<size>": same dish, size and stamp, new URL.
    $name = preg_replace('/-(\d+)$/', '-a-$1', $m[1]) ?? $m[1] . '-a';
    $target = ($dry ? $preview : UPLOAD_DIR . '/dishes') . "/$name.webp";
    if (!$dry && file_exists($target)) {
        return UPLOAD_URL . "/dishes/$name.webp";
    }
    if (!imagewebp($im, $target, 84)) {
        throw new RuntimeException("Cannot write $target");
    }
    return UPLOAD_URL . "/dishes/$name.webp";
};

foreach ($rows as $r) {
    $image = $convert((string) $r['image']);
    $thumb = $convert((string) $r['thumbnail']);
    if ($image === null && $thumb === null) {
        $skipped++;
        continue;
    }
    $newImage = $image ?? (string) $r['image'];
    $newThumb = $thumb ?? (string) $r['thumbnail'];
    if (!$dry) {
        $update->execute([$newImage, $newThumb, $r['id']]);
    }
    $log[] = "{$r['id']}\t{$r['image']}\t{$r['thumbnail']}";
    $done++;
    echo "  {$r['id']}: " . basename($newImage) . "\n";
}

if (!$dry && $log) {
    // What each dish pointed at before: enough to put any of them back.
    $undo = APP_ROOT . '/storage/cutout-undo-' . date('Ymd-His') . '.tsv';
    file_put_contents($undo, "id\timage\tthumbnail\n" . implode("\n", $log) . "\n");
    echo "Old paths saved in $undo\n";
}
echo ($dry ? 'Dry run: ' : '') . "$done dishes " . ($dry ? "previewed in $preview" : 'updated') . ", $skipped left as they were.\n";

<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/** Turns an uploaded photo into the reel's two square WebP sizes (768 + 384). */
final class Images
{
    private const MAX_BYTES = 15 * 1024 * 1024;
    /** Decoding cost grows with pixels, not bytes: a small PNG can still be a huge canvas. */
    private const MAX_PIXELS = 40_000_000;
    private const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
    /** What a stored dish image may be read back as (AI requests, previews). */
    private const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp'];
    /**
     * A public media path we serve ourselves: /uploads/… or /images/…, plain segments that
     * never start with a dot (so no "..", no hidden files), no backslashes or encoded bytes.
     */
    public const LOCAL_IMAGE = '#^/(uploads|images)/(?:[A-Za-z0-9_-][A-Za-z0-9_.-]{0,120}/){0,6}[A-Za-z0-9_-][A-Za-z0-9_.-]{0,120}\.(?:webp|jpe?g|png)\z#i';
    public const LOCAL_VIDEO = '#^/(?:uploads/videos|video)/[A-Za-z0-9_-][A-Za-z0-9_.-]{0,160}\.(?:mp4|webm)\z#i';

    /** @return array{image: string, thumbnail: string} public URLs */
    public static function storeDishPhoto(array $file, string $dishId): array
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new HttpError(422, 'Tải ảnh lên không thành công (mã lỗi ' . ($file['error'] ?? '?') . ').');
        }
        if ($file['size'] > self::MAX_BYTES) {
            throw new HttpError(422, 'Ảnh lớn hơn 15 MB.');
        }
        $info = @getimagesize($file['tmp_name']);
        if ($info && (int) $info[0] * (int) $info[1] > self::MAX_PIXELS) {
            throw new HttpError(422, 'Ảnh quá lớn (tối đa 40 megapixel).');
        }
        $src = match ($info['mime'] ?? '') {
            'image/jpeg' => @imagecreatefromjpeg($file['tmp_name']),
            'image/png' => @imagecreatefrompng($file['tmp_name']),
            'image/webp' => @imagecreatefromwebp($file['tmp_name']),
            default => throw new HttpError(422, 'Chỉ nhận ảnh JPG, PNG hoặc WebP.'),
        };
        if (!$src) {
            throw new HttpError(422, 'Không đọc được file ảnh.');
        }

        $dir = UPLOAD_DIR . '/dishes';
        if (!is_dir($dir) && !mkdir($dir, 0775, true)) {
            throw new HttpError(500, 'Không tạo được thư mục lưu ảnh.');
        }
        // Unique names so browsers and the immutable cache never show a stale photo.
        $stamp = date('YmdHis') . '-' . bin2hex(random_bytes(6));
        $out = [];
        $written = [];
        try {
            foreach (['image' => 768, 'thumbnail' => 384] as $key => $size) {
                $name = "{$dishId}-{$stamp}-{$size}.webp";
                self::squareWebp($src, $size, "$dir/$name");
                $written[] = "$dir/$name";
                $out[$key] = UPLOAD_URL . "/dishes/$name";
            }
        } catch (Throwable $e) {
            // Half a pair is no use to anyone: take back what was written.
            foreach ($written as $path) {
                @unlink($path);
            }
            throw $e;
        }
        return $out;
    }

    /**
     * Makes a plain studio background transparent, in place: the dish photos are a plate on
     * black (or charcoal), which shows as a dark square on any other backdrop. The background
     * is what the border is made of; everything reachable from the border through pixels close
     * to it fades out (fully below LO, partly up to HI, so edges stay soft), and the dark fringe
     * on those edges is unblended from it. A photo with a real background (its border not one
     * flat colour) is left alone. Returns whether anything changed.
     */
    public static function cutOutBackground(GdImage $im): bool
    {
        $lo = 10;
        $hi = 34;
        $w = imagesx($im);
        $h = imagesy($im);
        if ($w < 16 || $h < 16) {
            return false;
        }
        if (!imageistruecolor($im)) {
            imagepalettetotruecolor($im);
        }
        $rgb = static fn (int $c): array => [($c >> 16) & 0xFF, ($c >> 8) & 0xFF, $c & 0xFF];
        $edge = [];
        for ($x = 0; $x < $w; $x += 3) {
            $edge[] = $rgb(imagecolorat($im, $x, 0));
            $edge[] = $rgb(imagecolorat($im, $x, $h - 1));
        }
        for ($y = 0; $y < $h; $y += 3) {
            $edge[] = $rgb(imagecolorat($im, 0, $y));
            $edge[] = $rgb(imagecolorat($im, $w - 1, $y));
        }
        $bg = [];
        foreach ([0, 1, 2] as $ch) {
            $vals = array_column($edge, $ch);
            sort($vals);
            $bg[$ch] = $vals[intdiv(count($vals), 2)];
        }
        $dist = static fn (array $c): int => max(abs($c[0] - $bg[0]), abs($c[1] - $bg[1]), abs($c[2] - $bg[2]));
        $flat = count(array_filter($edge, fn ($c) => $dist($c) <= $lo + 6));
        // A dark studio backdrop, and a border that is (almost) all of it.
        if (max($bg) > 70 || $flat < 0.9 * count($edge)) {
            return false;
        }

        // Flood from the border through background-like pixels.
        $seen = array_fill(0, $w * $h, false);
        $stack = [];
        $push = function (int $x, int $y) use (&$seen, &$stack, $w, $im, $rgb, $dist, $hi): void {
            $i = $y * $w + $x;
            if (!$seen[$i] && $dist($rgb(imagecolorat($im, $x, $y))) <= $hi) {
                $seen[$i] = true;
                $stack[] = $i;
            }
        };
        for ($x = 0; $x < $w; $x++) {
            $push($x, 0);
            $push($x, $h - 1);
        }
        for ($y = 0; $y < $h; $y++) {
            $push(0, $y);
            $push($w - 1, $y);
        }
        $region = [];
        while ($stack) {
            $i = array_pop($stack);
            $region[] = $i;
            $x = $i % $w;
            $y = intdiv($i, $w);
            if ($x > 0) {
                $push($x - 1, $y);
            }
            if ($x < $w - 1) {
                $push($x + 1, $y);
            }
            if ($y > 0) {
                $push($x, $y - 1);
            }
            if ($y < $h - 1) {
                $push($x, $y + 1);
            }
        }
        if (!$region) {
            return false;
        }

        imagealphablending($im, false);
        imagesavealpha($im, true);
        foreach ($region as $i) {
            $x = $i % $w;
            $y = intdiv($i, $w);
            $c = $rgb(imagecolorat($im, $x, $y));
            $d = $dist($c);
            $a = $d <= $lo ? 0.0 : ($d - $lo) / ($hi - $lo); // opacity 0..1
            if ($a <= 0.0) {
                imagesetpixel($im, $x, $y, 127 << 24);
                continue;
            }
            // Unblend from the backdrop so the edge keeps the plate's colour, not a dark rim.
            $out = [];
            foreach ([0, 1, 2] as $ch) {
                $out[$ch] = (int) max(0, min(255, round(($c[$ch] - $bg[$ch] * (1 - $a)) / $a)));
            }
            $alpha = (int) round(127 * (1 - $a));
            imagesetpixel($im, $x, $y, ($alpha << 24) | ($out[0] << 16) | ($out[1] << 8) | $out[2]);
        }
        return true;
    }

    /** Centre-crops to a square and saves a WebP of $size px. */
    private static function squareWebp(GdImage $src, int $size, string $path): void
    {
        if (file_exists($path)) {
            throw new HttpError(500, 'Tên file ảnh đã tồn tại.');
        }
        $w = imagesx($src);
        $h = imagesy($src);
        $side = min($w, $h);
        $dst = imagecreatetruecolor($size, $size);
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        imagecopyresampled($dst, $src, 0, 0, (int) (($w - $side) / 2), (int) (($h - $side) / 2), $size, $size, $side, $side);
        // A plate on a black studio backdrop: keep the plate, drop the square around it.
        self::cutOutBackground($dst);
        if (!imagewebp($dst, $path, 84)) {
            throw new HttpError(500, 'Không lưu được ảnh WebP.');
        }
    }

    /** Stores an MP4/WebM food-story video as-is. */
    public static function storeVideo(array $file, string $dishId): string
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new HttpError(422, 'Tải video lên không thành công.');
        }
        if ((int) ($file['size'] ?? 0) > self::MAX_VIDEO_BYTES) {
            throw new HttpError(422, 'Video lớn hơn 60 MB.');
        }
        $ext = match (mime_content_type($file['tmp_name'])) {
            'video/mp4' => 'mp4',
            'video/webm' => 'webm',
            default => throw new HttpError(422, 'Chỉ nhận video MP4 hoặc WebM.'),
        };
        $dir = UPLOAD_DIR . '/videos';
        if (!is_dir($dir) && !mkdir($dir, 0775, true)) {
            throw new HttpError(500, 'Không tạo được thư mục lưu video.');
        }
        // Random suffix: two uploads in the same second never overwrite each other.
        $name = "{$dishId}-" . date('YmdHis') . '-' . bin2hex(random_bytes(6)) . ".$ext";
        if (file_exists("$dir/$name") || !move_uploaded_file($file['tmp_name'], "$dir/$name")) {
            throw new HttpError(500, 'Không lưu được video.');
        }
        return UPLOAD_URL . "/videos/$name";
    }

    /**
     * The file behind a stored dish image, or null when the path is not one of ours: it must
     * match LOCAL_IMAGE, resolve (symlinks included) inside the uploads or public/images
     * folder, be a real image of an allowed type and stay under the size caps. Used before
     * any bytes are read, e.g. to send a photo to the AI provider.
     */
    public static function safeLocalImage(string $url): ?string
    {
        if (!preg_match(self::LOCAL_IMAGE, $url)) {
            return null;
        }
        $candidate = str_starts_with($url, UPLOAD_URL . '/')
            ? UPLOAD_DIR . substr($url, strlen(UPLOAD_URL))
            : APP_ROOT . '/public' . $url;
        $real = realpath($candidate);
        if ($real === false || !is_file($real)) {
            return null;
        }
        $inside = false;
        foreach ([UPLOAD_DIR, APP_ROOT . '/public/images'] as $root) {
            $base = realpath($root);
            if ($base !== false && str_starts_with(self::norm($real), rtrim(self::norm($base), '/') . '/')) {
                $inside = true;
            }
        }
        if (!$inside || !in_array(strtolower(pathinfo($real, PATHINFO_EXTENSION)), self::IMAGE_EXT, true)) {
            return null;
        }
        $size = @filesize($real);
        $info = @getimagesize($real);
        if ($size === false || $size > self::MAX_BYTES || !$info
            || !in_array($info['mime'] ?? '', ['image/jpeg', 'image/png', 'image/webp'], true)
            || (int) $info[0] * (int) $info[1] > self::MAX_PIXELS) {
            return null;
        }
        return $real;
    }

    /** Same separators and case rules on Windows (XAMPP) as on Linux. */
    private static function norm(string $path): string
    {
        $p = str_replace('\\', '/', $path);
        return DIRECTORY_SEPARATOR === '\\' ? strtolower($p) : $p;
    }

    /**
     * A video source the reel may play: one of our uploads, or an https URL on a host listed
     * in MEDIA_HOSTS (exact names, comma separated). Anything else is refused.
     */
    public static function allowedVideoUrl(string $url): bool
    {
        if (preg_match(self::LOCAL_VIDEO, $url)) {
            return true;
        }
        return self::allowedRemote($url, ['mp4', 'webm']);
    }

    /** A poster frame: one of our images, or https on an allowed media host. */
    public static function allowedPosterUrl(string $url): bool
    {
        return $url === '' || (bool) preg_match(self::LOCAL_IMAGE, $url) || self::allowedRemote($url, self::IMAGE_EXT);
    }

    private static function allowedRemote(string $url, array $ext): bool
    {
        $hosts = array_filter(array_map('trim', explode(',', strtolower((string) env('MEDIA_HOSTS', '')))));
        if (!$hosts || strlen($url) > 500 || preg_match('/[\x00-\x20\\\\]/', $url)) {
            return false;
        }
        $p = parse_url($url);
        if (!is_array($p) || ($p['scheme'] ?? '') !== 'https' || isset($p['user']) || isset($p['pass']) || isset($p['port'])) {
            return false;
        }
        $path = (string) ($p['path'] ?? '');
        return in_array(strtolower((string) ($p['host'] ?? '')), $hosts, true)
            && !str_contains($path, '..') && !str_contains(strtolower($path), '%2e')
            && in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), $ext, true);
    }
}

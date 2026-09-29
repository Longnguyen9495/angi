<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/** Turns an uploaded photo into the reel's two square WebP sizes (768 + 384). */
final class Images
{
    private const MAX_BYTES = 15 * 1024 * 1024;

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
        $stamp = date('YmdHis') . '-' . bin2hex(random_bytes(3));
        $out = [];
        foreach (['image' => 768, 'thumbnail' => 384] as $key => $size) {
            $name = "{$dishId}-{$stamp}-{$size}.webp";
            self::squareWebp($src, $size, "$dir/$name");
            $out[$key] = UPLOAD_URL . "/dishes/$name";
        }
        imagedestroy($src);
        return $out;
    }

    /** Centre-crops to a square and saves a WebP of $size px. */
    private static function squareWebp(GdImage $src, int $size, string $path): void
    {
        $w = imagesx($src);
        $h = imagesy($src);
        $side = min($w, $h);
        $dst = imagecreatetruecolor($size, $size);
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        imagecopyresampled($dst, $src, 0, 0, (int) (($w - $side) / 2), (int) (($h - $side) / 2), $size, $size, $side, $side);
        if (!imagewebp($dst, $path, 84)) {
            throw new HttpError(500, 'Không lưu được ảnh WebP.');
        }
        imagedestroy($dst);
    }

    /** Stores an MP4/WebM food-story video as-is. */
    public static function storeVideo(array $file, string $dishId): string
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new HttpError(422, 'Tải video lên không thành công.');
        }
        $ext = match (mime_content_type($file['tmp_name'])) {
            'video/mp4' => 'mp4',
            'video/webm' => 'webm',
            default => throw new HttpError(422, 'Chỉ nhận video MP4 hoặc WebM.'),
        };
        $dir = UPLOAD_DIR . '/videos';
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $name = "{$dishId}-" . date('YmdHis') . ".$ext";
        if (!move_uploaded_file($file['tmp_name'], "$dir/$name")) {
            throw new HttpError(500, 'Không lưu được video.');
        }
        return UPLOAD_URL . "/videos/$name";
    }
}

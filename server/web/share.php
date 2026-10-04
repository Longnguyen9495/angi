<?php

declare(strict_types=1);

/*
 * Link previews per dish. Crawlers (Facebook, Zalo, Messenger, X…) don't run
 * the app's JavaScript, so nginx sends two paths here:
 *   /mon/<slug>      → the normal app shell (dist/index.html) with that dish's
 *                      title, description and image in the <head>
 *   /og/<slug>.jpg   → a 1200×630 preview image for the dish (built once, cached
 *                      in storage/og/)
 *   /sitemap.xml     → live sitemap from the catalogue (the build writes a static
 *                      fallback into dist/ from the bundled snapshot)
 * An unknown dish still gets the app shell (generic tags) but with a 404 + noindex.
 * Anything unexpected falls back to the plain app shell: this script must never
 * be the reason a page fails to load.
 *
 * Language: the page follows ?lang= or Accept-Language (server/lang/<code>.php) and
 * uses the dish's translation for that language when the catalogue has one. The
 * preview image only follows an explicit ?lang= (the page adds it to og:image), so
 * the plain /og/<slug>.jpg stays Vietnamese and caches per language.
 */

require_once __DIR__ . '/../lib/Catalogue.php';

const DIST_INDEX = APP_ROOT . '/dist/index.html';
const OG_CACHE = APP_ROOT . '/storage/og';

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

try {
    if (preg_match('#^/og/([a-z0-9-]{1,80})\.jpg$#', $path, $m)) {
        // Explicit ?lang= only: crawlers' Accept-Language must not change the default image.
        Lang::setLocale(is_string($_GET['lang'] ?? null) ? $_GET['lang'] : Lang::FALLBACK);
        serve_og_image($m[1]);
    }
    if (preg_match('#^/mon/([a-z0-9-]{1,80})/?$#', $path, $m)) {
        $dish = find_dish($m[1], $missing);
        serve_page($dish, $missing);
    }
    if ($path === '/sitemap.xml') {
        serve_sitemap();
    }
} catch (Throwable $e) {
    error_log('[angi share] ' . $e->getMessage());
}
serve_page(null);

// ——— Page ———

/** $missing: true only when the catalogue answered and has no such dish (not on a DB error). */
function find_dish(string $slug, ?bool &$missing = null): ?array
{
    $missing = false;
    try {
        $catalogue = new Catalogue(db());
        $dish = $catalogue->getDish($slug);
        // Same alias as the app (getReelDishBySlug): /mon/com-tam opens the first cơm tấm.
        if (!$dish && $slug === 'com-tam') {
            foreach ($catalogue->listDishes() as $d) {
                if (str_starts_with($d['id'], 'com-tam-')) {
                    $dish = $d;
                    break;
                }
            }
        }
        $missing = $dish === null;
        return $dish ? localize_dish($dish, Lang::locale()) : null;
    } catch (Throwable $e) {
        error_log('[angi share] ' . $e->getMessage());
        return null;
    }
}

/** Swaps in the dish's translated name/subtitle/story where the catalogue has them. */
function localize_dish(array $dish, string $locale): array
{
    $all = (array) ($dish['translations'] ?? []);
    $t = (array) ($all[$locale] ?? []);
    foreach (['name', 'subtitle', 'story'] as $field) {
        if (is_string($t[$field] ?? null) && trim($t[$field]) !== '') {
            $dish[$field] = $t[$field];
        }
    }
    return $dish;
}

function site_url(): string
{
    // APP_URL (required in production, see bootstrap) — never the request's Host header.
    return app_origin();
}

/** Version of a dish's preview: changes when its name, photo or the artwork does. */
function og_version(array $dish): string
{
    $base = @filemtime(__DIR__ . '/og-dish-base.png') ?: 0;
    return substr(sha1($dish['name'] . '|' . $dish['subtitle'] . '|' . $dish['image'] . '|' . $base . '|' . Lang::locale() . '|v3'), 0, 10);
}

/** Cache file prefix: plain slug for Vietnamese (as before), slug.<locale> otherwise. */
function og_prefix(string $slug): string
{
    return Lang::locale() === Lang::FALLBACK ? $slug : $slug . '.' . Lang::locale();
}

function set_meta(string $html, string $key, string $value): string
{
    $v = htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    // A callback keeps "$" and "\" in the text literal (a replacement string reads them as groups).
    return preg_replace_callback(
        '#(<meta\b[^>]*\b(?:property|name)="' . preg_quote($key, '#') . '"[^>]*?\bcontent=")[^"]*(")#s',
        fn ($m) => $m[1] . $v . $m[2],
        $html,
        1,
    ) ?? $html;
}

function esc_html(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function serve_page(?array $dish, bool $missing = false): never
{
    $html = @file_get_contents(DIST_INDEX);
    if ($html === false) {
        http_response_code(503);
        header('Content-Type: text/plain; charset=utf-8');
        echo __t('share.updating');
        exit;
    }
    $locale = Lang::locale();
    $html = preg_replace('#<html lang="[^"]*"#', '<html lang="' . $locale . '"', $html, 1) ?? $html;
    $html = set_meta($html, 'og:locale', __t('meta.ogLocale'));
    if ($dish) {
        $site = site_url();
        $url = $site . '/mon/' . $dish['id'];
        $title = __t('share.title', ['name' => $dish['name']]);
        $desc = trim($dish['story']) !== ''
            ? $dish['story']
            : __t('share.description', ['name' => $dish['name'], 'subtitle' => $dish['subtitle']]);
        if (mb_strlen($desc) > 180) {
            $desc = rtrim(mb_substr($desc, 0, 177)) . '…';
        }
        $image = $site . '/og/' . $dish['id'] . '.jpg?v=' . og_version($dish) . ($locale !== Lang::FALLBACK ? '&lang=' . $locale : '');
        $alt = $dish['name'] . ($dish['subtitle'] !== '' ? ' — ' . $dish['subtitle'] : '');

        // Callbacks keep $ and \ in a dish name literal (a replacement string would read them as groups).
        $html = preg_replace_callback('#<title>.*?</title>#s', fn () => '<title>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</title>', $html, 1) ?? $html;
        $html = preg_replace_callback('#(<link rel="canonical" href=")[^"]*(")#', fn ($m) => $m[1] . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . $m[2], $html, 1) ?? $html;
        foreach ([
            'description' => $desc,
            'og:type' => 'article',
            'og:url' => $url,
            'og:title' => $title,
            'og:description' => $desc,
            'og:image' => $image,
            'og:image:secure_url' => $image,
            'og:image:alt' => $alt,
            'twitter:title' => $title,
            'twitter:description' => $desc,
            'twitter:image' => $image,
            'twitter:image:alt' => $alt,
        ] as $key => $value) {
            $html = set_meta($html, $key, $value);
        }
        // Crawlers that don't run JS read the <noscript> block: give them this dish.
        $photo = $dish['image'] !== '' ? (str_starts_with($dish['image'], 'http') ? $dish['image'] : $site . $dish['image']) : '';
        $block = '<h1>' . esc_html($dish['name']) . '</h1>'
            . ($dish['subtitle'] !== '' ? '<p>' . esc_html($dish['subtitle']) . '</p>' : '')
            . ($photo !== '' ? '<img src="' . esc_html($photo) . '" alt="' . esc_html($alt) . '" width="384" height="384" style="max-width:100%;height:auto">' : '')
            . (trim($dish['story']) !== '' ? '<p>' . esc_html($dish['story']) . '</p>' : '')
            . '<p><a href="/" style="color:#d7a85d">' . esc_html(__t('share.more')) . '</a></p>';
        $html = preg_replace_callback('#<!--seo-->.*?<!--/seo-->#s', fn () => $block, $html, 1) ?? $html;
    } elseif ($missing) {
        // No such dish: the app still opens (on the reel), but search engines shouldn't keep the URL.
        http_response_code(404);
        $html = set_meta($html, 'robots', 'noindex');
    }
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    header('Content-Language: ' . $locale);
    header('Vary: Accept-Language');
    header('X-Content-Type-Options: nosniff');
    echo $html;
    exit;
}

// ——— Sitemap ———

/**
 * Live sitemap: home, every published dish (same filter as export-snapshot.php) and the
 * privacy pages. The build also writes a static dist/sitemap.xml from the bundled snapshot,
 * served when nginx doesn't route /sitemap.xml here.
 */
function serve_sitemap(): never
{
    try {
        $dishes = (new Catalogue(db()))->listDishes();
    } catch (Throwable $e) {
        error_log('[angi share] ' . $e->getMessage());
        $static = APP_ROOT . '/dist/sitemap.xml';
        if (!is_file($static)) {
            http_response_code(503);
            exit;
        }
        header('Content-Type: application/xml; charset=utf-8');
        readfile($static);
        exit;
    }
    $site = site_url();
    $urls = [['/', null]];
    foreach ($dishes as $d) {
        if ($d['image'] !== '' && $d['thumbnail'] !== '' && $d['ingredients'] && preg_match('#^[a-z0-9-]{1,80}$#', $d['id'])) {
            $urls[] = ['/mon/' . $d['id'], $d['updatedAt'] ?? null];
        }
    }
    $urls[] = ['/quyen-rieng-tu.html', null];
    $urls[] = ['/privacy.html', null];
    $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
    foreach ($urls as [$path, $updated]) {
        $time = is_string($updated) ? strtotime($updated) : false;
        $xml .= '  <url><loc>' . htmlspecialchars($site . $path, ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</loc>'
            . ($time ? '<lastmod>' . gmdate('Y-m-d', $time) . '</lastmod>' : '')
            . "</url>\n";
    }
    $xml .= "</urlset>\n";
    header('Content-Type: application/xml; charset=utf-8');
    header('Cache-Control: public, max-age=3600');
    header('X-Content-Type-Options: nosniff');
    echo $xml;
    exit;
}

// ——— Preview image ———

function serve_og_image(string $slug): never
{
    $dish = find_dish($slug);
    if (!$dish) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo __t('share.notFound');
        exit;
    }
    $file = OG_CACHE . '/' . og_prefix($slug) . '-' . og_version($dish) . '.jpg';
    if (!is_file($file)) {
        if (!is_dir(OG_CACHE)) {
            @mkdir(OG_CACHE, 0775, true);
        }
        $jpeg = render_og_image($dish);
        // Drop older versions of this dish's preview before caching the new one.
        foreach (glob(OG_CACHE . '/' . og_prefix($slug) . '-*.jpg') ?: [] as $old) {
            @unlink($old);
        }
        @file_put_contents($file, $jpeg, LOCK_EX);
        $body = $jpeg;
    } else {
        $body = (string) file_get_contents($file);
    }
    header('Content-Type: image/jpeg');
    header('Content-Length: ' . strlen($body));
    header('Cache-Control: public, max-age=86400');
    echo $body;
    exit;
}

/** Local file behind a catalogue image URL (/images/… in dist, /uploads/… in storage). */
function image_file(string $url): ?string
{
    $path = parse_url($url, PHP_URL_PATH) ?: '';
    if (str_contains($path, '..')) {
        return null;
    }
    $file = str_starts_with($path, UPLOAD_URL . '/')
        ? UPLOAD_DIR . substr($path, strlen(UPLOAD_URL))
        : APP_ROOT . '/dist' . $path;
    return is_file($file) ? $file : null;
}

function load_image(string $file): GdImage|false
{
    return match (strtolower(pathinfo($file, PATHINFO_EXTENSION))) {
        'webp' => @imagecreatefromwebp($file),
        'png' => @imagecreatefrompng($file),
        'jpg', 'jpeg' => @imagecreatefromjpeg($file),
        default => false,
    };
}

/** Greedy word wrap to a pixel width. */
function wrap_text(string $text, string $font, float $size, int $width): array
{
    $lines = [];
    $line = '';
    foreach (preg_split('/\s+/u', trim($text)) ?: [] as $word) {
        $try = $line === '' ? $word : "$line $word";
        $box = imagettfbbox($size, 0, $font, $try);
        if ($line !== '' && ($box[2] - $box[0]) > $width) {
            $lines[] = $line;
            $line = $word;
        } else {
            $line = $try;
        }
    }
    if ($line !== '') {
        $lines[] = $line;
    }
    return $lines;
}

function render_og_image(array $dish): string
{
    $im = imagecreatefrompng(__DIR__ . '/og-dish-base.png');
    imagealphablending($im, true);

    // Dish photo in a soft-edged circle inside the ring (centre 908,315).
    $src = ($f = image_file($dish['image'])) ? load_image($f) : false;
    if ($src) {
        $d = 500;
        $cx = 908;
        $cy = 315;
        $sw = imagesx($src);
        $sh = imagesy($src);
        // Photos sit on black with the plate filling ~70%: crop in a little.
        $crop = (int) (min($sw, $sh) * 0.84);
        $ph = imagecreatetruecolor($d, $d);
        imagecopyresampled($ph, $src, 0, 0, (int) (($sw - $crop) / 2), (int) (($sh - $crop) / 2), $d, $d, $crop, $crop);
        $r = $d / 2;
        $feather = 3.0;
        for ($y = 0; $y < $d; $y++) {
            for ($x = 0; $x < $d; $x++) {
                $dist = sqrt(($x - $r + 0.5) ** 2 + ($y - $r + 0.5) ** 2);
                if ($dist > $r) {
                    continue;
                }
                $rgb = imagecolorat($ph, $x, $y);
                // 0 = opaque … 127 = transparent in GD.
                $alpha = $dist > $r - $feather ? (int) (127 * ($dist - ($r - $feather)) / $feather) : 0;
                imagesetpixel($im, $cx - (int) $r + $x, $cy - (int) $r + $y, ($alpha << 24) | $rgb);
            }
        }
    }

    // Dish name: big, up to three lines, shrinking to fit; then its details.
    $bold = __DIR__ . '/fonts/BeVietnamPro-Bold.ttf';
    $regular = __DIR__ . '/fonts/BeVietnamPro-Regular.ttf';
    $ivory = imagecolorallocate($im, 244, 237, 225);
    $muted = imagecolorallocate($im, 169, 160, 149);
    foreach ([64, 56, 48, 42] as $size) {
        $lines = wrap_text($dish['name'], $bold, $size, 540);
        if (count($lines) <= 2 || $size === 42) {
            break;
        }
    }
    $lines = array_slice($lines, 0, 3);
    $y = 300;
    foreach ($lines as $line) {
        imagettftext($im, $size, 0, 72, $y, $ivory, $bold, $line);
        $y += (int) ($size * 1.18);
    }
    // Some subtitles already name the region ("Sườn nướng • Nam Bộ"): don't say it twice.
    $region = in_array($dish['region'], Catalogue::REGIONS, true) ? __t('region.' . $dish['region']) : '';
    $details = array_filter([
        $dish['subtitle'],
        $region !== '' && !str_contains(mb_strtolower($dish['subtitle']), mb_strtolower($region)) ? $region : '',
        $dish['price'] > 0 ? __t('share.price', ['price' => $dish['price']]) : '',
    ]);
    // Up to two lines of details; a line never ends on a dangling separator.
    $info = wrap_text(implode(' · ', $details), $regular, 22, 540);
    foreach (array_slice($info, 0, 2) as $i => $line) {
        $line = rtrim($line, ' ·');
        imagettftext($im, 22, 0, 74, $y + 8 + $i * 32, $muted, $regular, $line);
    }

    ob_start();
    imagejpeg($im, null, 86);
    return (string) ob_get_clean();
}

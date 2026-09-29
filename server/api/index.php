<?php

declare(strict_types=1);

/*
 * Front controller for http://angi.local/api/*
 *   Public : GET /api/dishes, GET /api/health
 *   Admin  : /api/admin/* (session + CSRF header on writes)
 */

require_once __DIR__ . '/../lib/Catalogue.php';
require_once __DIR__ . '/../lib/AiEnricher.php';
require_once __DIR__ . '/../lib/Images.php';
require_once __DIR__ . '/../lib/Auth.php';

header('X-Content-Type-Options: nosniff');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = '/' . trim((string) preg_replace('#^/api#', '', $path), '/');

try {
    $catalogue = new Catalogue(db());

    // ——— Public ———
    if ($method === 'GET' && $path === '/dishes') {
        $items = array_values(array_filter(
            $catalogue->listDishes(),
            fn ($d) => $d['image'] !== '' && $d['thumbnail'] !== '' && $d['ingredients'],
        ));
        // Admin-only fields stay private.
        $items = array_map(function ($d) {
            unset($d['aiModel'], $d['aiAt'], $d['updatedAt'], $d['contentSource']);
            return $d;
        }, $items);
        json_response(['version' => $catalogue->version(), 'count' => count($items), 'items' => $items]);
    }
    if ($method === 'GET' && $path === '/health') {
        json_response(['ok' => true, 'dishes' => $catalogue->stats()['dishes']]);
    }

    // ——— Admin session ———
    if ($path === '/admin/session' && $method === 'GET') {
        json_response(Auth::session());
    }
    if ($path === '/admin/login' && $method === 'POST') {
        $body = read_json_body();
        json_response(Auth::login((string) ($body['user'] ?? ''), (string) ($body['password'] ?? '')));
    }
    if ($path === '/admin/logout' && $method === 'POST') {
        Auth::logout();
        json_response(['ok' => true]);
    }

    if (str_starts_with($path, '/admin/')) {
        Auth::require($method !== 'GET');

        if ($path === '/admin/stats' && $method === 'GET') {
            json_response($catalogue->stats());
        }
        if ($path === '/admin/dishes') {
            if ($method === 'GET') {
                json_response(['items' => $catalogue->listDishes()]);
            }
            if ($method === 'POST') {
                json_response($catalogue->saveDish(read_json_body(), null, 'manual'), 201);
            }
        }
        // Photo only → AI identifies the dish and fills the blanks (form reviews it).
        if ($path === '/admin/ai/identify' && $method === 'POST') {
            set_time_limit(180);
            json_response((new AiEnricher($catalogue))->identifyUpload($_FILES['image'] ?? [], $_POST));
        }
        // Photo only → finished dish, no typing (bulk upload).
        if ($path === '/admin/dishes/quick' && $method === 'POST') {
            set_time_limit(180);
            json_response((new AiEnricher($catalogue))->quickCreate($_FILES['image'] ?? []), 201);
        }
        if (preg_match('#^/admin/dishes/([a-z0-9-]+)(/(image|video|ai))?$#', $path, $m)) {
            $id = $m[1];
            $action = $m[3] ?? '';
            if ($action === '' && $method === 'GET') {
                json_response($catalogue->getDish($id) ?? throw new HttpError(404, 'Không tìm thấy món.'));
            }
            if ($action === '' && $method === 'PUT') {
                json_response($catalogue->saveDish(read_json_body(), $id, 'manual'));
            }
            if ($action === '' && $method === 'DELETE') {
                $catalogue->deleteDish($id);
                json_response(['ok' => true]);
            }
            if ($action === 'image' && $method === 'POST') {
                $urls = Images::storeDishPhoto($_FILES['image'] ?? [], $id);
                json_response($catalogue->setImages($id, $urls['image'], $urls['thumbnail']));
            }
            if ($action === 'video' && $method === 'POST') {
                json_response(['src' => Images::storeVideo($_FILES['video'] ?? [], $id)]);
            }
            if ($action === 'ai' && $method === 'POST') {
                set_time_limit(180);
                $mode = ($_GET['mode'] ?? '') === 'fill' ? 'fill' : 'rewrite';
                json_response((new AiEnricher($catalogue))->enrichOne($id, $mode));
            }
        }
        if ($path === '/admin/ingredients' && $method === 'GET') {
            json_response(['items' => $catalogue->listIngredients()]);
        }
        if (preg_match('#^/admin/ingredients/([a-z0-9-]+)$#', $path, $m)) {
            if ($method === 'PUT') {
                $catalogue->saveIngredient($m[1], read_json_body());
                json_response(['ok' => true]);
            }
            if ($method === 'DELETE') {
                $catalogue->deleteIngredient($m[1]);
                json_response(['ok' => true]);
            }
        }
    }

    throw new HttpError(404, 'Không có API này.');
} catch (HttpError $e) {
    json_response(['error' => $e->getMessage()], $e->status);
} catch (PDOException $e) {
    error_log('[angi api] ' . $e->getMessage());
    json_response(['error' => 'Lỗi cơ sở dữ liệu.'], 500);
} catch (Throwable $e) {
    error_log('[angi api] ' . $e->getMessage());
    json_response(['error' => 'Lỗi máy chủ.'], 500);
}

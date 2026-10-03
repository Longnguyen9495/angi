<?php

declare(strict_types=1);

/*
 * Front controller for http://angi.local/api/*
 *   Public : GET /api/dishes, GET /api/health
 *   Account: /api/account/* (optional guest account; writes need X-Bepviet: 1)
 *   Admin  : /api/admin/* (session + CSRF header on writes)
 * Messages follow the request language (X-Locale → ?lang= → Accept-Language → vi), see lib/Lang.php.
 */

require_once __DIR__ . '/../lib/Catalogue.php';
require_once __DIR__ . '/../lib/AiEnricher.php';
require_once __DIR__ . '/../lib/Images.php';
require_once __DIR__ . '/../lib/Auth.php';
require_once __DIR__ . '/../lib/Account.php';
require_once __DIR__ . '/../lib/Friends.php';
require_once __DIR__ . '/../lib/AdminUsers.php';

require_once __DIR__ . '/../lib/ReviewService.php';

/** Admin dish/ingredient JSON (translations included) stays well under this. */
const ADMIN_JSON_MAX = 900 * 1024;

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Content-Language: ' . Lang::locale());

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = '/' . trim((string) preg_replace('#^/api#', '', $path), '/');

try {
    // A production site with a placeholder key, http URL or log-file mail does not serve.
    require_safe_config();
    if (in_array($path, ['/provinces', '/reviews', '/reverse'], true)) {
        header('Cache-Control: no-store');
        if ($path === '/provinces' && $method === 'GET') {
            $items = []; foreach (ReviewService::PROVINCES as $id => $name) { $items[] = ['id' => $id, 'name' => $name]; }
            json_response(['count' => count($items), 'items' => $items]);
        }
        if (($path === '/reviews' && $method !== 'GET') || ($path === '/reverse' && $method !== 'POST')) {
            throw new HttpError(405, 'Method not allowed.');
        }
        $reviews = new ReviewService(db());
        $reviews->rate(client_ip() ?: 'unknown');
        if ($path === '/reviews') {
            json_response($reviews->reviews((string) ($_GET['dish'] ?? ''), (string) ($_GET['province'] ?? '')));
        }
        if ($_GET || (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 1024 || !str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
            throw new HttpError(400, 'Reverse requires bounded JSON body, no query.');
        }
        $raw = file_get_contents('php://input', false, null, 0, 1025);
        if ($raw === false || strlen($raw) > 1024) { throw new HttpError(413, 'Reverse body too large.'); }
        $body = json_decode($raw, true);
        if (!is_array($body)) { throw new HttpError(400, 'Invalid JSON.'); }
        json_response($reviews->reverse($body));
    }
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

    // ——— Guest account (email + one-time code) ———
    if ($path === '/account' || str_starts_with($path, '/account/')) {
        $account = new Account(db());
        if ($method !== 'GET') {
            Account::requireAppHeader();
        }
        // Khu vườn bạn bè: routes with a garden code in the path.
        $friends = new Friends(db(), $account);
        if (preg_match('#^/account/friends/([A-Za-z0-9]{6})(/(garden|water|steal|gift|thanks))?$#', $path, $fm)) {
            $code = $fm[1];
            match ($method . ' ' . ($fm[3] ?? '')) {
                'GET garden' => json_response($friends->visit($code)),
                'POST water' => json_response($friends->water($code, read_json_body())),
                'POST steal' => json_response($friends->steal($code, read_json_body())),
                'POST gift' => json_response($friends->gift($code, read_json_body())),
                'POST thanks' => json_response($friends->thanks($code)),
                'DELETE ' => json_response($friends->remove($code)),
                default => throw new HttpError(404, __t('api.notFound')),
            };
        }
        $route = $method . ' ' . $path;
        match ($route) {
            'GET /account/garden' => json_response($friends->profile()),
            'PUT /account/garden' => json_response($friends->rename(read_json_body())),
            'POST /account/garden/code' => json_response($friends->newCode()),
            'GET /account/friends' => json_response($friends->list()),
            'POST /account/friends' => json_response($friends->add(read_json_body())),
            'GET /account/events' => json_response($friends->events()),
            'POST /account/events' => json_response($friends->syncEvents()),
            'GET /account/feed' => json_response($friends->feed()),
            'POST /account/events/ack' => json_response($friends->ack(read_json_body())),
            'POST /account/code' => json_response($account->requestCode(read_json_body(), client_ip())),
            'POST /account/verify' => json_response($account->verifyCode(read_json_body())),
            'POST /account/link' => json_response($account->verifyLink(read_json_body())),
            'GET /account/link' => $account->legacyLink((string) ($_GET['t'] ?? '')),
            'GET /account/me' => json_response(['user' => $account->me()]),
            'GET /account/progress' => json_response($account->getProgress()),
            'PUT /account/progress' => json_response($account->putProgress(read_json_body(Account::MAX_PROGRESS_BYTES + 64 * 1024))),
            'POST /account/progress/rebase' => json_response($account->rebaseProgress(read_json_body())),
            'PUT /account/preferences' => json_response($account->setPreferences(read_json_body())),
            'GET /account/export' => json_response($account->export()),
            'POST /account/logout' => (function () use ($account) {
                $account->logout();
                json_response(['ok' => true]);
            })(),
            'DELETE /account' => (function () use ($account) {
                $account->delete();
                json_response(['ok' => true]);
            })(),
            default => throw new HttpError(404, __t('api.notFound')),
        };
    }

    // ——— Admin session ———
    if ($path === '/admin/session' && $method === 'GET') {
        json_response(Auth::session());
    }
    if ($path === '/admin/login' && $method === 'POST') {
        $body = read_json_body();
        json_response(Auth::login((string) ($body['user'] ?? ''), (string) ($body['password'] ?? ''), (string) ($body['otp'] ?? '')));
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
        // Languages with a server/lang file; the editor shows translation fields for every "extra" one.
        if ($path === '/admin/locales' && $method === 'GET') {
            json_response(['base' => Lang::FALLBACK, 'locales' => Lang::describe(), 'extra' => Lang::extra()]);
        }
        if ($path === '/admin/dishes') {
            if ($method === 'GET') {
                json_response(['items' => $catalogue->listDishes()]);
            }
            if ($method === 'POST') {
                json_response($catalogue->saveDish(read_json_body(ADMIN_JSON_MAX), null, 'manual'), 201);
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
                json_response($catalogue->saveDish(read_json_body(ADMIN_JSON_MAX), $id, 'manual'));
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
        // Guest accounts: who is online, activity, sign-out everywhere, delete.
        if ($path === '/admin/users' && $method === 'GET') {
            json_response((new AdminUsers(db()))->list($_GET));
        }
        if (preg_match('#^/admin/users/(\d+)(/(logout))?$#', $path, $m)) {
            $users = new AdminUsers(db());
            $uid = (int) $m[1];
            match ($method . ' ' . ($m[3] ?? '')) {
                'GET ' => json_response($users->get($uid)),
                'POST logout' => json_response($users->signOut($uid)),
                'DELETE ' => json_response($users->delete($uid)),
                default => throw new HttpError(405, __t('api.notSupported')),
            };
        }
        if ($path === '/admin/ingredients' && $method === 'GET') {
            json_response(['items' => $catalogue->listIngredients()]);
        }
        if (preg_match('#^/admin/ingredients/([a-z0-9-]+)$#', $path, $m)) {
            if ($method === 'PUT') {
                $catalogue->saveIngredient($m[1], read_json_body(ADMIN_JSON_MAX));
                json_response(['ok' => true]);
            }
            if ($method === 'DELETE') {
                $catalogue->deleteIngredient($m[1]);
                json_response(['ok' => true]);
            }
        }
    }

    throw new HttpError(404, __t('api.notFound'));
} catch (HttpError $e) {
    json_response(['error' => $e->getMessage()] + $e->extra, $e->status);
} catch (PDOException $e) {
    error_log('[angi api] database operation failed');
    json_response(['error' => __t('api.dbError')], 500);
} catch (Throwable $e) {
    error_log('[angi api] server operation failed');
    json_response(['error' => __t('api.serverError')], 500);
}

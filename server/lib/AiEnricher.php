<?php

declare(strict_types=1);

require_once __DIR__ . '/Catalogue.php';
require_once __DIR__ . '/Images.php';

/**
 * Reads a dish photo with a vision model (OpenAI-compatible chat API) and
 * rewrites the dish's descriptive content: region, tone, story, flavour
 * profile and visible ingredients. Name, price and images are never changed.
 */
final class AiEnricher
{
    private string $baseUrl;
    private string $apiKey;
    private string $model;

    public function __construct(private readonly Catalogue $catalogue)
    {
        $this->baseUrl = rtrim((string) env('AI_BASE_URL', ''), '/');
        $this->apiKey = (string) env('AI_API_KEY', '');
        $this->model = (string) env('AI_MODEL', 'gpt-5.6-sol');
        if ($this->baseUrl === '' || $this->apiKey === '') {
            throw new HttpError(500, 'Chưa cấu hình AI_BASE_URL / AI_API_KEY trong .env.');
        }
    }

    public function model(): string
    {
        return $this->model;
    }

    /** Builds the chat request for one dish. */
    public function buildRequest(array $dish, array $library, bool $identify = false): array
    {
        $imagePath = self::localPath($dish['thumbnail'] ?: $dish['image']);
        if (!is_file($imagePath)) {
            throw new HttpError(422, "Không tìm thấy file ảnh của món {$dish['id']}.");
        }
        $mime = match (strtolower(pathinfo($imagePath, PATHINFO_EXTENSION))) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            default => 'image/webp',
        };
        $dataUri = "data:$mime;base64," . base64_encode((string) file_get_contents($imagePath));
        $lib = implode('; ', array_map(fn ($i) => "{$i['id']}={$i['name']}", $library));
        // Identify mode: the photo is all we have, so the model also names and prices the dish.
        $identifyKeys = $identify ? '"name":"...","subtitle":"...","price":0,"vegetarian":false,' : '';
        $identifyRules = $identify ? <<<RULES
- name: tên món thường gọi ở Việt Nam (món nước ngoài giữ tên quen dùng, ví dụ Pizza, Ramen, Pad Thai).
- subtitle: 2–6 từ nói phần đặc trưng, dạng “Sườn bì chả • Việt Nam” hoặc “Cà ri gà kèm naan”.
- price: giá tham khảo một phần ăn trưa ở quán tại Hà Nội/TP.HCM, đơn vị nghìn đồng, số nguyên bội số 5.
- vegetarian: true chỉ khi món không có thịt, cá, hải sản hay mắm.
RULES : '';

        $system = <<<TXT
Bạn là biên tập viên ẩm thực cho một ứng dụng chọn món ở Việt Nam. Bạn nhìn ảnh món ăn và viết nội dung ngắn, chính xác, bằng tiếng Việt.
Chỉ trả về MỘT đối tượng JSON, không kèm giải thích, theo đúng cấu trúc:
{{$identifyKeys}"region":"north|central|south|world","tone":"amber|copper|herb|crimson|ivory|ocean|gold","story":"...","flavor":{"spicy":0,"sweet":0,"rich":0,"fresh":0,"crunchy":0},"ingredients":[{"id":"...","name":"...","description":"...","crop":"rice|herbs|chili|scallion|bean|tomato|null"}]}
Quy tắc:
- ingredients: 4 đến 8 thành phần NHÌN THẤY trong ảnh hoặc chắc chắn là cốt lõi của món, xếp từ nổi bật nhất. Tên thường gọi tiếng Việt.
- Nếu thành phần đã có trong thư viện dưới đây thì dùng đúng "id" và "name" của thư viện; nếu chưa có thì để "id" rỗng.
- description: tối đa 18 từ, mô tả thành phần trong món này (cách chế biến, hương vị). Không nói về sức khoẻ, dị ứng hay dinh dưỡng.
- crop: loại cây trồng trong game mà thành phần đó thuộc về: rice (gạo, bún, phở, bánh tráng, xôi, bột gạo), herbs (rau thơm, rau sống, xà lách, húng, ngò, sả), chili (ớt, sa tế, tương ớt, kimchi), scallion (hành, hành phi, tỏi), bean (đậu, đậu hũ, giá, tương/nước tương đậu nành), tomato (cà chua, sốt cà chua); còn lại là null. Cố gắng có ít nhất một thành phần có crop.
- story: một câu 12–26 từ, giàu hình ảnh và cảm xúc về món, không bịa số liệu hay lịch sử.
- flavor: mỗi trục 0–5 (spicy cay, sweet ngọt, rich béo/đậm, fresh thanh/mát, crunchy giòn).
- region: north/central/south cho món Việt theo vùng gắn bó nhất; món có nguồn gốc nước ngoài là world.
- tone (màu nền trang): amber = món nước dùng; copper = nướng, xào đậm; herb = rau, món chay, thanh mát; crimson = cay hoặc sốt đỏ; ivory = cháo, sốt kem, món sáng màu nhẹ; ocean = hải sản, cá; gold = chiên giòn, vàng óng.
$identifyRules
Thư viện thành phần (id=tên): $lib
TXT;

        $user = ($dish['name'] ?? '') !== ''
            ? "Món: {$dish['name']}" . (($dish['subtitle'] ?? '') !== '' ? " — {$dish['subtitle']}" : '') .
                (!empty($dish['vegetarian']) ? ' (món chay)' : '') . '. Hãy đọc ảnh và trả JSON.'
            : 'Chưa biết tên món. Hãy nhận diện món trong ảnh và trả JSON.';

        return [
            'model' => $this->model,
            'temperature' => 0.4,
            'response_format' => ['type' => 'json_object'],
            'messages' => [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user', 'content' => [
                    ['type' => 'text', 'text' => $user],
                    ['type' => 'image_url', 'image_url' => ['url' => $dataUri]],
                ]],
            ],
        ];
    }

    public function curlHandle(array $request): CurlHandle
    {
        $ch = curl_init("{$this->baseUrl}/chat/completions");
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 120,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->apiKey,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($request, JSON_UNESCAPED_UNICODE),
        ]);
        return $ch;
    }

    /** Parses and validates the model answer into the dish input shape. */
    public function parse(string $httpBody, int $status): array
    {
        if ($status !== 200) {
            throw new RuntimeException("AI trả về HTTP $status: " . mb_substr($httpBody, 0, 200));
        }
        $envelope = json_decode($httpBody, true);
        $content = $envelope['choices'][0]['message']['content'] ?? null;
        if (!is_string($content)) {
            throw new RuntimeException('AI không trả nội dung.');
        }
        if (preg_match('/\{.*\}/s', $content, $m)) {
            $content = $m[0];
        }
        $data = json_decode($content, true);
        if (!is_array($data)) {
            throw new RuntimeException('AI trả về JSON không hợp lệ.');
        }

        $ingredients = [];
        foreach (array_slice(is_array($data['ingredients'] ?? null) ? $data['ingredients'] : [], 0, 10) as $ing) {
            $name = trim((string) ($ing['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $crop = $ing['crop'] ?? null;
            $ingredients[] = [
                'id' => trim((string) ($ing['id'] ?? '')),
                'name' => $name,
                'description' => mb_substr(trim((string) ($ing['description'] ?? '')), 0, 200),
                'crop' => in_array($crop, Catalogue::CROPS, true) ? $crop : null,
            ];
        }
        if (count($ingredients) < 3) {
            throw new RuntimeException('AI trả quá ít thành phần.');
        }
        $flavor = [];
        foreach (Catalogue::FLAVORS as $f) {
            $flavor[$f] = max(0, min(5, (int) round((float) ($data['flavor'][$f] ?? 0))));
        }
        $story = trim((string) ($data['story'] ?? ''));
        if (mb_strlen($story) < 12) {
            throw new RuntimeException('AI không viết câu chuyện món.');
        }
        $price = isset($data['price']) && is_numeric($data['price'])
            ? max(5, min(2000, (int) (round(((float) $data['price']) / 5) * 5)))
            : null;
        return [
            // Identify-mode fields (null when the model was not asked for them).
            'name' => mb_substr(trim((string) ($data['name'] ?? '')), 0, 160) ?: null,
            'subtitle' => mb_substr(trim((string) ($data['subtitle'] ?? '')), 0, 200) ?: null,
            'price' => $price,
            'vegetarian' => isset($data['vegetarian']) ? (bool) $data['vegetarian'] : null,
            'region' => in_array($data['region'] ?? null, Catalogue::REGIONS, true) ? $data['region'] : null,
            'tone' => in_array($data['tone'] ?? null, Catalogue::TONES, true) ? $data['tone'] : null,
            'story' => mb_substr($story, 0, 400),
            'flavor' => $flavor,
            'ingredients' => $ingredients,
            'raw' => $content,
        ];
    }

    /** Maps the model's ingredients onto the shared library (reusing entries, never duplicating). */
    private function libraryIngredients(array $aiIngredients): array
    {
        $library = array_column($this->catalogue->listIngredients(), null, 'id');
        $out = [];
        $seen = [];
        foreach ($aiIngredients as $ing) {
            $id = $ing['id'] !== '' && isset($library[$ing['id']]) ? $ing['id'] : slugify($ing['name']);
            if ($id === '' || isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $out[] = isset($library[$id])
                ? ['id' => $id, 'name' => $library[$id]['name'], 'description' => $library[$id]['description'], 'crop' => $library[$id]['crop'], 'library' => true]
                : ['id' => $id] + $ing + ['library' => false];
        }
        return $out;
    }

    /**
     * Merges an AI answer into a dish.
     *   rewrite: replaces the descriptive content (keeps name/price/images unless empty)
     *   fill:    only fills what is still empty — typed values always win
     */
    public function merge(array $dish, array $ai, string $mode): array
    {
        $fill = $mode === 'fill';
        $blank = fn ($v) => $v === null || $v === '' || $v === [] || $v === 0;
        $out = $dish;
        foreach (['name', 'subtitle', 'price'] as $k) {
            if ($blank($dish[$k] ?? null) && $ai[$k] !== null) {
                $out[$k] = $ai[$k];
            }
        }
        if (!array_key_exists('vegetarian', $dish) || $dish['vegetarian'] === null) {
            $out['vegetarian'] = (bool) ($ai['vegetarian'] ?? false);
        }
        $flavorEmpty = array_sum(array_map('intval', $dish['flavor'] ?? [])) === 0;
        if (!$fill || $blank($dish['story'] ?? '')) {
            $out['story'] = $ai['story'];
        }
        if (!$fill || $flavorEmpty) {
            $out['flavor'] = $ai['flavor'];
        }
        if (!$fill || $blank($dish['ingredients'] ?? [])) {
            $out['ingredients'] = $this->libraryIngredients($ai['ingredients']);
        }
        if (!$fill || empty($dish['region'])) {
            $out['region'] = $ai['region'] ?? ($dish['region'] ?? 'world');
        }
        if (!$fill || empty($dish['tone'])) {
            $out['tone'] = $ai['tone'] ?? ($dish['tone'] ?? 'amber');
        }
        return $out;
    }

    /** Sends one request and returns the parsed answer (HTTP-friendly errors). */
    private function ask(array $dish, bool $identify): array
    {
        $ch = $this->curlHandle($this->buildRequest($dish, $this->catalogue->listIngredients(), $identify));
        $body = (string) curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        if ($err !== '') {
            throw new HttpError(502, "Không gọi được AI: $err");
        }
        try {
            return $this->parse($body, $status);
        } catch (RuntimeException $e) {
            throw new HttpError(502, $e->getMessage());
        }
    }

    /** Applies a parsed answer to a stored dish and saves it. */
    public function apply(array $dish, array $ai, string $mode = 'rewrite'): array
    {
        $input = $this->merge($dish, $ai, $mode);
        $input['ingredients'] = array_map(
            fn ($i) => !empty($i['library']) ? ['id' => $i['id']] : $i,
            $input['ingredients'],
        );
        $input['ai'] = ['model' => $this->model, 'raw' => $ai['raw']];
        return $this->catalogue->saveDish($input, $dish['id'], $mode === 'fill' ? 'manual' : 'ai');
    }

    /** One stored dish: "Đọc lại bằng AI" (rewrite) or "AI điền chỗ trống" (fill). */
    public function enrichOne(string $id, string $mode = 'rewrite'): array
    {
        $dish = $this->catalogue->getDish($id) ?? throw new HttpError(404, 'Không tìm thấy món.');
        return $this->apply($dish, $this->ask($dish, $dish['name'] === ''), $mode);
    }

    /**
     * Photo only: stores the image, lets the model identify the dish and fills
     * every field the admin left empty. Nothing is saved yet (the form reviews it).
     */
    public function identifyUpload(array $file, array $typed): array
    {
        $urls = Images::storeDishPhoto($file, 'moi-' . bin2hex(random_bytes(3)));
        $draft = [
            'name' => trim((string) ($typed['name'] ?? '')),
            'subtitle' => trim((string) ($typed['subtitle'] ?? '')),
            'price' => (int) ($typed['price'] ?? 0),
            'vegetarian' => null,
            'story' => trim((string) ($typed['story'] ?? '')),
            'flavor' => [],
            'ingredients' => [],
            'region' => '',
            'tone' => '',
            'image' => $urls['image'],
            'thumbnail' => $urls['thumbnail'],
        ];
        $ai = $this->ask($draft, true);
        return ['proposal' => $this->merge($draft, $ai, 'fill'), 'model' => $this->model, 'raw' => $ai['raw']];
    }

    /** Photo in, finished dish out — used for bulk uploads with no typing at all. */
    public function quickCreate(array $file): array
    {
        $result = $this->identifyUpload($file, []);
        $p = $result['proposal'];
        $base = slugify($p['name'] ?: 'mon-moi') ?: 'mon-moi';
        $id = $base;
        for ($n = 2; $this->catalogue->getDish($id); $n++) {
            $id = "$base-$n";
        }
        $p['id'] = $id;
        $p['name'] = $p['name'] ?: 'Món mới';
        $p['ingredients'] = array_map(fn ($i) => !empty($i['library']) ? ['id' => $i['id']] : $i, $p['ingredients']);
        $p['ai'] = ['model' => $result['model'], 'raw' => $result['raw']];
        return $this->catalogue->saveDish($p, null, 'ai');
    }

    /** Maps a public URL (/images/…, /uploads/…) to its file on disk. */
    public static function localPath(string $url): string
    {
        if (str_starts_with($url, UPLOAD_URL . '/')) {
            return UPLOAD_DIR . substr($url, strlen(UPLOAD_URL));
        }
        return APP_ROOT . '/public' . $url;
    }
}

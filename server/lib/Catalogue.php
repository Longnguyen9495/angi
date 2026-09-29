<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/** Dish + ingredient persistence and the public catalogue shape. */
final class Catalogue
{
    public const REGIONS = ['north', 'central', 'south', 'world'];
    public const TONES = ['amber', 'copper', 'herb', 'crimson', 'ivory', 'ocean', 'gold'];
    public const CROPS = ['rice', 'herbs', 'chili', 'scallion', 'bean', 'tomato'];
    public const FLAVORS = ['spicy', 'sweet', 'rich', 'fresh', 'crunchy'];
    public const SOURCES = ['curated', 'ai', 'manual'];

    public function __construct(private readonly PDO $pdo)
    {
    }

    // ——— Reads ———

    /** @return array<int, array<string, mixed>> dishes in reel order, ingredients attached */
    public function listDishes(): array
    {
        $dishes = $this->pdo->query('SELECT * FROM dishes ORDER BY position, id')->fetchAll();
        $links = $this->pdo->query(
            'SELECT di.dish_id, di.position, i.id, i.name, i.description, i.crop
             FROM dish_ingredients di JOIN ingredients i ON i.id = di.ingredient_id
             ORDER BY di.dish_id, di.position',
        )->fetchAll();
        $byDish = [];
        foreach ($links as $l) {
            $byDish[$l['dish_id']][] = $l;
        }
        return array_map(fn ($d) => $this->shape($d, $byDish[$d['id']] ?? []), $dishes);
    }

    public function getDish(string $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM dishes WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        $stmt = $this->pdo->prepare(
            'SELECT di.position, i.id, i.name, i.description, i.crop
             FROM dish_ingredients di JOIN ingredients i ON i.id = di.ingredient_id
             WHERE di.dish_id = ? ORDER BY di.position',
        );
        $stmt->execute([$id]);
        return $this->shape($row, $stmt->fetchAll());
    }

    /** Public/admin JSON shape — mirrors the frontend ReelDish (minus computed fields). */
    private function shape(array $d, array $ingredients): array
    {
        return [
            'id' => $d['id'],
            'position' => (int) $d['position'],
            'sourceImageId' => $d['source_image_id'] !== null ? (int) $d['source_image_id'] : null,
            'name' => $d['name'],
            'subtitle' => $d['subtitle'],
            'price' => (int) $d['price'],
            'vegetarian' => (bool) $d['vegetarian'],
            'region' => $d['region'],
            'tone' => $d['tone'],
            'story' => $d['story'],
            'flavor' => [
                'spicy' => (int) $d['flavor_spicy'],
                'sweet' => (int) $d['flavor_sweet'],
                'rich' => (int) $d['flavor_rich'],
                'fresh' => (int) $d['flavor_fresh'],
                'crunchy' => (int) $d['flavor_crunchy'],
            ],
            'image' => $d['image'],
            'thumbnail' => $d['thumbnail'],
            'credit' => $d['credit'],
            'video' => $d['video_src']
                ? ['src' => $d['video_src'], 'poster' => $d['video_poster'] ?: $d['image'], 'credit' => $d['video_credit'] ?: null]
                : null,
            'ingredients' => array_map(fn ($i) => [
                'id' => $i['id'],
                'name' => $i['name'],
                'description' => $i['description'],
                'crop' => $i['crop'] ?: null,
            ], $ingredients),
            'contentSource' => $d['content_source'],
            'aiModel' => $d['ai_model'],
            'aiAt' => $d['ai_at'],
            'updatedAt' => $d['updated_at'],
        ];
    }

    /** Changes whenever any dish or ingredient changes; lets clients skip stale caches. */
    public function version(): string
    {
        $row = $this->pdo->query(
            'SELECT (SELECT COUNT(*) FROM dishes) c,
                    (SELECT MAX(updated_at) FROM dishes) d,
                    (SELECT MAX(updated_at) FROM ingredients) i,
                    (SELECT COUNT(*) FROM dish_ingredients) l',
        )->fetch();
        return substr(sha1(implode('|', $row)), 0, 12);
    }

    public function stats(): array
    {
        $q = fn (string $sql) => $this->pdo->query($sql)->fetchAll();
        return [
            'dishes' => (int) $this->pdo->query('SELECT COUNT(*) FROM dishes')->fetchColumn(),
            'ingredients' => (int) $this->pdo->query('SELECT COUNT(*) FROM ingredients')->fetchColumn(),
            'byRegion' => array_column($q('SELECT region, COUNT(*) n FROM dishes GROUP BY region'), 'n', 'region'),
            'bySource' => array_column($q('SELECT content_source, COUNT(*) n FROM dishes GROUP BY content_source'), 'n', 'content_source'),
            'vegetarian' => (int) $this->pdo->query('SELECT COUNT(*) FROM dishes WHERE vegetarian = 1')->fetchColumn(),
            'withVideo' => (int) $this->pdo->query('SELECT COUNT(*) FROM dishes WHERE video_src IS NOT NULL')->fetchColumn(),
            'unusedIngredients' => (int) $this->pdo->query(
                'SELECT COUNT(*) FROM ingredients i WHERE NOT EXISTS (SELECT 1 FROM dish_ingredients di WHERE di.ingredient_id = i.id)',
            )->fetchColumn(),
            'version' => $this->version(),
        ];
    }

    // ——— Writes ———

    /**
     * Creates or updates a dish. $input uses the public shape; ingredients may
     * reference existing ids or carry name/description/crop to create new ones.
     */
    public function saveDish(array $input, ?string $existingId, string $source = 'manual'): array
    {
        $d = $this->validateDish($input, $existingId === null);
        $id = $existingId ?? $d['id'];

        $this->pdo->beginTransaction();
        try {
            if ($existingId === null) {
                if ($this->getDish($id)) {
                    throw new HttpError(409, "Mã món “{$id}” đã tồn tại.");
                }
                $pos = (int) $this->pdo->query('SELECT COALESCE(MAX(position), -1) + 1 FROM dishes')->fetchColumn();
                $this->pdo->prepare(
                    'INSERT INTO dishes (id, position, name, image, thumbnail) VALUES (?, ?, ?, ?, ?)',
                )->execute([$id, $d['position'] ?? $pos, $d['name'], $d['image'] ?? '', $d['thumbnail'] ?? '']);
            } elseif (!$this->getDish($id)) {
                throw new HttpError(404, 'Không tìm thấy món.');
            }

            $fields = [
                'name' => $d['name'],
                'subtitle' => $d['subtitle'],
                'price' => $d['price'],
                'vegetarian' => $d['vegetarian'] ? 1 : 0,
                'region' => $d['region'],
                'tone' => $d['tone'],
                'story' => $d['story'],
                'flavor_spicy' => $d['flavor']['spicy'],
                'flavor_sweet' => $d['flavor']['sweet'],
                'flavor_rich' => $d['flavor']['rich'],
                'flavor_fresh' => $d['flavor']['fresh'],
                'flavor_crunchy' => $d['flavor']['crunchy'],
                'credit' => $d['credit'],
                'video_src' => $d['video']['src'] ?? null,
                'video_poster' => $d['video']['poster'] ?? null,
                'video_credit' => $d['video']['credit'] ?? null,
                'content_source' => $source,
            ];
            foreach (['image', 'thumbnail', 'position', 'source_image_id'] as $opt) {
                if (array_key_exists($opt, $d) && $d[$opt] !== null) {
                    $fields[$opt] = $d[$opt];
                }
            }
            if (isset($d['ai'])) {
                $fields['ai_model'] = $d['ai']['model'];
                $fields['ai_raw'] = $d['ai']['raw'];
                $fields['ai_at'] = date('Y-m-d H:i:s');
            }
            $set = implode(', ', array_map(fn ($k) => "$k = :$k", array_keys($fields)));
            $stmt = $this->pdo->prepare("UPDATE dishes SET $set WHERE id = :id");
            $stmt->execute($fields + ['id' => $id]);

            $this->replaceIngredients($id, $d['ingredients']);
            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
        return $this->getDish($id);
    }

    /** @param array<int, array{id?: string, name?: string, description?: string, crop?: ?string}> $list */
    private function replaceIngredients(string $dishId, array $list): void
    {
        $this->pdo->prepare('DELETE FROM dish_ingredients WHERE dish_id = ?')->execute([$dishId]);
        $link = $this->pdo->prepare('INSERT IGNORE INTO dish_ingredients (dish_id, ingredient_id, position) VALUES (?, ?, ?)');
        foreach (array_values($list) as $pos => $ing) {
            $id = $this->ensureIngredient($ing);
            $link->execute([$dishId, $id, $pos]);
        }
    }

    /** Reuses a library ingredient by id (or by the slug of its name); creates it otherwise. */
    public function ensureIngredient(array $ing, bool $overwrite = false): string
    {
        $name = trim((string) ($ing['name'] ?? ''));
        $id = trim((string) ($ing['id'] ?? '')) ?: slugify($name);
        if ($id === '') {
            throw new HttpError(422, 'Nguyên liệu cần có tên.');
        }
        $stmt = $this->pdo->prepare('SELECT id FROM ingredients WHERE id = ?');
        $stmt->execute([$id]);
        $exists = (bool) $stmt->fetchColumn();
        $crop = in_array($ing['crop'] ?? null, self::CROPS, true) ? $ing['crop'] : null;
        if (!$exists) {
            if ($name === '') {
                throw new HttpError(422, "Nguyên liệu “{$id}” chưa có trong thư viện và cần tên.");
            }
            $this->pdo->prepare('INSERT INTO ingredients (id, name, description, crop) VALUES (?, ?, ?, ?)')
                ->execute([$id, mb_substr($name, 0, 120), mb_substr(trim((string) ($ing['description'] ?? '')), 0, 400), $crop]);
        } elseif ($overwrite && $name !== '') {
            $this->pdo->prepare('UPDATE ingredients SET name = ?, description = ?, crop = ? WHERE id = ?')
                ->execute([mb_substr($name, 0, 120), mb_substr(trim((string) ($ing['description'] ?? '')), 0, 400), $crop, $id]);
        }
        return $id;
    }

    public function deleteDish(string $id): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM dishes WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            throw new HttpError(404, 'Không tìm thấy món.');
        }
    }

    public function setImages(string $id, string $image, string $thumbnail): array
    {
        $stmt = $this->pdo->prepare('UPDATE dishes SET image = ?, thumbnail = ? WHERE id = ?');
        $stmt->execute([$image, $thumbnail, $id]);
        return $this->getDish($id) ?? throw new HttpError(404, 'Không tìm thấy món.');
    }

    // ——— Ingredient library ———

    public function listIngredients(): array
    {
        $uses = [];
        foreach ($this->pdo->query(
            'SELECT di.ingredient_id, d.id, d.name FROM dish_ingredients di JOIN dishes d ON d.id = di.dish_id ORDER BY d.position',
        )->fetchAll() as $u) {
            $uses[$u['ingredient_id']][] = ['id' => $u['id'], 'name' => $u['name']];
        }
        return array_map(fn ($r) => [
            'id' => $r['id'],
            'name' => $r['name'],
            'description' => $r['description'],
            'crop' => $r['crop'] ?: null,
            'usedBy' => count($uses[$r['id']] ?? []),
            'dishes' => $uses[$r['id']] ?? [],
        ], $this->pdo->query('SELECT * FROM ingredients ORDER BY name')->fetchAll());
    }

    public function saveIngredient(string $id, array $input): void
    {
        $name = trim((string) ($input['name'] ?? ''));
        if ($name === '') {
            throw new HttpError(422, 'Tên nguyên liệu không được trống.');
        }
        $crop = $input['crop'] ?? null;
        if ($crop !== null && !in_array($crop, self::CROPS, true)) {
            throw new HttpError(422, 'Loại cây không hợp lệ.');
        }
        $stmt = $this->pdo->prepare('UPDATE ingredients SET name = ?, description = ?, crop = ? WHERE id = ?');
        $stmt->execute([mb_substr($name, 0, 120), mb_substr(trim((string) ($input['description'] ?? '')), 0, 400), $crop, $id]);
    }

    public function deleteIngredient(string $id): void
    {
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM dish_ingredients WHERE ingredient_id = ?');
        $stmt->execute([$id]);
        if ((int) $stmt->fetchColumn() > 0) {
            throw new HttpError(409, 'Nguyên liệu đang được món khác dùng, hãy gỡ khỏi các món trước.');
        }
        $this->pdo->prepare('DELETE FROM ingredients WHERE id = ?')->execute([$id]);
    }

    // ——— Validation ———

    private function validateDish(array $in, bool $creating): array
    {
        $name = trim((string) ($in['name'] ?? ''));
        if ($name === '') {
            throw new HttpError(422, 'Tên món không được trống.');
        }
        $id = $creating ? (trim((string) ($in['id'] ?? '')) ?: slugify($name)) : null;
        if ($creating && !preg_match('/^[a-z0-9-]{2,80}$/', (string) $id)) {
            throw new HttpError(422, 'Mã món chỉ gồm chữ thường không dấu, số và gạch ngang.');
        }
        $region = $in['region'] ?? 'world';
        if (!in_array($region, self::REGIONS, true)) {
            throw new HttpError(422, 'Vùng không hợp lệ.');
        }
        $tone = $in['tone'] ?? 'amber';
        if (!in_array($tone, self::TONES, true)) {
            throw new HttpError(422, 'Tông màu không hợp lệ.');
        }
        $flavor = [];
        foreach (self::FLAVORS as $f) {
            $flavor[$f] = max(0, min(5, (int) ($in['flavor'][$f] ?? 0)));
        }
        $ingredients = is_array($in['ingredients'] ?? null) ? $in['ingredients'] : [];
        if (count($ingredients) < 1) {
            throw new HttpError(422, 'Món cần ít nhất một nguyên liệu.');
        }
        $video = null;
        if (!empty($in['video']['src'])) {
            $video = [
                'src' => (string) $in['video']['src'],
                'poster' => (string) ($in['video']['poster'] ?? ''),
                'credit' => (string) ($in['video']['credit'] ?? ''),
            ];
        }
        // Image paths come from our own upload/storage only (never arbitrary URLs).
        foreach (['image', 'thumbnail'] as $k) {
            if (isset($in[$k]) && $in[$k] !== '' && !preg_match('#^/(uploads|images)/[A-Za-z0-9/_.-]+$#', (string) $in[$k])) {
                throw new HttpError(422, 'Đường dẫn ảnh không hợp lệ.');
            }
        }
        $out = [
            'id' => $id,
            'name' => mb_substr($name, 0, 160),
            'subtitle' => mb_substr(trim((string) ($in['subtitle'] ?? '')), 0, 200),
            'price' => max(0, (int) ($in['price'] ?? 0)),
            'vegetarian' => (bool) ($in['vegetarian'] ?? false),
            'region' => $region,
            'tone' => $tone,
            'story' => mb_substr(trim((string) ($in['story'] ?? '')), 0, 400),
            'flavor' => $flavor,
            'credit' => mb_substr(trim((string) ($in['credit'] ?? '')), 0, 255),
            'video' => $video,
            'ingredients' => $ingredients,
            'image' => isset($in['image']) ? (string) $in['image'] : null,
            'thumbnail' => isset($in['thumbnail']) ? (string) $in['thumbnail'] : null,
            'position' => isset($in['position']) ? (int) $in['position'] : null,
            'source_image_id' => isset($in['sourceImageId']) ? (int) $in['sourceImageId'] : null,
        ];
        if (isset($in['ai'])) {
            $out['ai'] = $in['ai'];
        }
        return $out;
    }
}

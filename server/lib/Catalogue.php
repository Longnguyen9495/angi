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
    /** Translatable text fields and their length limits (same as the Vietnamese columns). */
    public const DISH_TRANSLATABLE = ['name' => 160, 'subtitle' => 200, 'story' => 400];
    public const INGREDIENT_TRANSLATABLE = ['name' => 120, 'description' => 400];

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
        // One query per translation table, whatever the catalogue size.
        $dishT = $this->dishTranslations();
        $ingT = $this->ingredientTranslations();
        return array_map(fn ($d) => $this->shape($d, $byDish[$d['id']] ?? [], $dishT[$d['id']] ?? [], $ingT), $dishes);
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
        $ingredients = $stmt->fetchAll();
        return $this->shape($row, $ingredients, $this->dishTranslations($id)[$id] ?? [], $this->ingredientTranslations(array_column($ingredients, 'id')));
    }

    /** Public/admin JSON shape — mirrors the frontend ReelDish (minus computed fields). */
    private function shape(array $d, array $ingredients, array $translations, array $ingredientTranslations): array
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
            // { "<locale>": { name?, subtitle?, story? } }, always a JSON object.
            'translations' => (object) $translations,
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
            'youtubeVideos' => $this->youtubeVideos($d['id']),
            'ingredients' => array_map(fn ($i) => [
                'id' => $i['id'],
                'name' => $i['name'],
                'description' => $i['description'],
                'crop' => $i['crop'] ?: null,
                'translations' => (object) ($ingredientTranslations[$i['id']] ?? []),
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
                    (SELECT COUNT(*) FROM dish_ingredients) l,
                    (SELECT COUNT(*) FROM dish_translations) tc,
                    (SELECT MAX(updated_at) FROM dish_translations) td,
                    (SELECT SUM(LENGTH(name) + LENGTH(subtitle) + LENGTH(story)) FROM dish_translations) tl,
                    (SELECT COUNT(*) FROM ingredient_translations) ic,
                    (SELECT MAX(updated_at) FROM ingredient_translations) iu,
                    (SELECT SUM(LENGTH(name) + LENGTH(description)) FROM ingredient_translations) il',
        )->fetch();
        $videos = $this->pdo->query('SELECT dish_id, video_id, position, metadata FROM dish_youtube_videos ORDER BY dish_id, position, video_id')->fetchAll();
        return substr(hash('sha256', json_encode([$row, $videos], JSON_THROW_ON_ERROR)), 0, 12);
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

    private function youtubeVideos(string $id): array
    {
        $stmt = $this->pdo->prepare('SELECT metadata FROM dish_youtube_videos WHERE dish_id = ? ORDER BY position');
        $stmt->execute([$id]);
        return array_map(fn ($row) => self::validateYoutubeVideo(json_decode($row['metadata'], true, 512, JSON_THROW_ON_ERROR)), $stmt->fetchAll());
    }

    private static function validateYoutubeVideo(array $video): array
    {
        $out = [];
        foreach (['videoId', 'title', 'channelId', 'channelTitle', 'publishedAt', 'duration', 'thumbnail'] as $field) {
            if (!is_string($video[$field] ?? null) || trim($video[$field]) === '' || strlen($video[$field]) > 2000) {
                throw new HttpError(422, 'YouTube metadata không hợp lệ.');
            }
            $out[$field] = $video[$field];
        }
        if (!preg_match('/^[A-Za-z0-9_-]{11}$/D', $out['videoId']) || !preg_match('/^UC[A-Za-z0-9_-]{22}$/D', $out['channelId']) || !preg_match('/^P[0-9TDHMS.]+$/D', $out['duration']) || strtotime($out['publishedAt']) === false || $out['thumbnail'] !== 'https://i.ytimg.com/vi/' . $out['videoId'] . '/hqdefault.jpg') {
            throw new HttpError(422, 'YouTube metadata không hợp lệ.');
        }
        return $out;
    }

    /** Separate atomic replacement; never changes the original video or dish fields. */
    public function saveYoutubeVideos(string $dishId, array $videos): array
    {
        if (!in_array($dishId, ['com-tam', 'pho-bo'], true) || !array_is_list($videos) || count($videos) > 5) {
            throw new HttpError(422, 'YouTube pilot chỉ hỗ trợ whitelist, tối đa 5 video.');
        }
        $clean = [];
        foreach ($videos as $video) {
            if (!is_array($video)) {
                throw new HttpError(422, 'YouTube video không hợp lệ.');
            }
            $v = self::validateYoutubeVideo($video);
            if (isset($clean[$v['videoId']])) {
                throw new HttpError(422, 'YouTube ID trùng.');
            }
            $clean[$v['videoId']] = $v;
        }
        $this->pdo->beginTransaction();
        try {
            $query = $this->pdo->prepare('SELECT id FROM dishes WHERE id = ?' . ($this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : ''));
            $query->execute([$dishId]);
            if (!$query->fetchColumn()) {
                // Legacy local catalogue ID for the same pilot dish, not a third dish.
                if ($dishId !== 'com-tam') {
                    throw new HttpError(404, 'Không tìm thấy món.');
                }
                $dishId = 'com-tam-suon-bi-cha-trung';
                $query->execute([$dishId]);
                if (!$query->fetchColumn()) {
                    throw new HttpError(404, 'Không tìm thấy món.');
                }
            }
            $this->pdo->prepare('DELETE FROM dish_youtube_videos WHERE dish_id = ?')->execute([$dishId]);
            $insert = $this->pdo->prepare('INSERT INTO dish_youtube_videos (dish_id, video_id, position, metadata) VALUES (?, ?, ?, ?)');
            foreach (array_values($clean) as $position => $video) {
                $insert->execute([$dishId, $video['videoId'], $position, json_encode($video, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]);
            }
            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
        return $this->youtubeVideos($dishId);
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
            if ($d['translations'] !== null) {
                $this->writeTranslations('dish', $id, $d['translations']);
            }
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
        $ignore = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite' ? 'INSERT OR IGNORE' : 'INSERT IGNORE';
        $link = $this->pdo->prepare("$ignore INTO dish_ingredients (dish_id, ingredient_id, position) VALUES (?, ?, ?)");
        foreach (array_values($list) as $pos => $ing) {
            $id = $this->ensureIngredient($ing);
            $link->execute([$dishId, $id, $pos]);
        }
    }

    /**
     * Reuses a library ingredient by id (or by the slug of its name); creates it otherwise.
     * A `translations` key, when present, is stored for the ingredient either way.
     */
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
        if (array_key_exists('translations', $ing)) {
            $this->writeTranslations('ingredient', $id, self::cleanTranslations($ing['translations'], self::INGREDIENT_TRANSLATABLE));
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
        $translations = $this->ingredientTranslations();
        return array_map(fn ($r) => [
            'id' => $r['id'],
            'name' => $r['name'],
            'description' => $r['description'],
            'crop' => $r['crop'] ?: null,
            'translations' => (object) ($translations[$r['id']] ?? []),
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
        $translations = array_key_exists('translations', $input)
            ? self::cleanTranslations($input['translations'], self::INGREDIENT_TRANSLATABLE)
            : null;
        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare('UPDATE ingredients SET name = ?, description = ?, crop = ? WHERE id = ?');
            $stmt->execute([mb_substr($name, 0, 120), mb_substr(trim((string) ($input['description'] ?? '')), 0, 400), $crop, $id]);
            if ($translations !== null) {
                $this->writeTranslations('ingredient', $id, $translations);
            }
            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
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

    // ——— Translations ———
    // Vietnamese lives in dishes/ingredients; other languages in *_translations, one
    // row per (item, locale). Only locales with a server/lang/<code>.php file are accepted.

    /** @return array<string, array<string, array<string, string>>> dish id → locale → non-empty fields */
    private function dishTranslations(?string $dishId = null): array
    {
        $sql = 'SELECT dish_id AS item, locale, name, subtitle, story FROM dish_translations';
        $stmt = $this->pdo->prepare($dishId === null ? "$sql ORDER BY dish_id, locale" : "$sql WHERE dish_id = ? ORDER BY locale");
        $stmt->execute($dishId === null ? [] : [$dishId]);
        return self::groupTranslations($stmt->fetchAll(), self::DISH_TRANSLATABLE);
    }

    /** @param list<string>|null $ids null = every ingredient */
    private function ingredientTranslations(?array $ids = null): array
    {
        if ($ids === []) {
            return [];
        }
        $sql = 'SELECT ingredient_id AS item, locale, name, description FROM ingredient_translations';
        $where = $ids === null ? '' : ' WHERE ingredient_id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')';
        $stmt = $this->pdo->prepare($sql . $where . ' ORDER BY ingredient_id, locale');
        $stmt->execute($ids === null ? [] : array_values($ids));
        return self::groupTranslations($stmt->fetchAll(), self::INGREDIENT_TRANSLATABLE);
    }

    private static function groupTranslations(array $rows, array $fields): array
    {
        $out = [];
        foreach ($rows as $r) {
            $entry = [];
            foreach (array_keys($fields) as $f) {
                if (($r[$f] ?? '') !== '') {
                    $entry[$f] = $r[$f];
                }
            }
            if ($entry) {
                $out[$r['item']][$r['locale']] = $entry;
            }
        }
        return $out;
    }

    /**
     * Validates `translations` input ({ "<locale>": { field: text } }, array or object).
     * @param array<string, int> $fields allowed field → max length
     * @return array<string, array<string, string>> locale → every allowed field (trimmed, '' when absent)
     */
    public static function cleanTranslations(mixed $input, array $fields): array
    {
        if ($input === null) {
            return [];
        }
        if (is_object($input)) {
            $input = json_decode((string) json_encode($input), true);
        }
        if (!is_array($input) || (array_is_list($input) && $input !== [])) {
            throw new HttpError(422, 'Bản dịch phải có dạng { "en": { ... } }.');
        }
        $out = [];
        foreach ($input as $locale => $values) {
            $locale = (string) $locale;
            if (!in_array($locale, Lang::extra(), true)) {
                throw new HttpError(422, "Ngôn ngữ “{$locale}” không được hỗ trợ (có: " . implode(', ', Lang::extra()) . ').');
            }
            if (is_object($values)) {
                $values = (array) $values;
            }
            if ($values !== null && !is_array($values)) {
                throw new HttpError(422, "Bản dịch “{$locale}” không hợp lệ.");
            }
            foreach ($fields as $f => $max) {
                $v = $values[$f] ?? '';
                if (!is_string($v) && !is_int($v) && !is_float($v)) {
                    throw new HttpError(422, "Bản dịch “{$locale}.{$f}” phải là chữ.");
                }
                $out[$locale][$f] = mb_substr(trim((string) $v), 0, $max);
            }
        }
        return $out;
    }

    /**
     * Replaces the given locales' rows (other locales are left alone); a locale whose
     * fields are all empty is removed.
     * @param 'dish'|'ingredient' $kind
     * @param array<string, array<string, string>> $translations output of cleanTranslations()
     */
    private function writeTranslations(string $kind, string $id, array $translations): void
    {
        [$table, $key, $fields] = $kind === 'dish'
            ? ['dish_translations', 'dish_id', array_keys(self::DISH_TRANSLATABLE)]
            : ['ingredient_translations', 'ingredient_id', array_keys(self::INGREDIENT_TRANSLATABLE)];
        $delete = $this->pdo->prepare("DELETE FROM $table WHERE $key = ? AND locale = ?");
        $insert = $this->pdo->prepare(
            "INSERT INTO $table ($key, locale, " . implode(', ', $fields) . ') VALUES (?, ?' . str_repeat(', ?', count($fields)) . ')',
        );
        foreach ($translations as $locale => $values) {
            $delete->execute([$id, $locale]);
            $row = array_map(fn ($f) => (string) ($values[$f] ?? ''), $fields);
            if (implode('', $row) !== '') {
                $insert->execute([$id, $locale, ...$row]);
            }
        }
    }

    /**
     * Upserts a server/sql/i18n/<locale>.json document into existing items: fields
     * present in the file replace the stored translation, others are kept. Base
     * (Vietnamese) fields are never touched; ids not in the catalogue are skipped.
     * @return array{dishes: int, ingredients: int, skippedDishes: list<string>, skippedIngredients: list<string>}
     */
    public function importTranslations(string $locale, array $doc): array
    {
        if (!in_array($locale, Lang::extra(), true)) {
            throw new HttpError(422, "Ngôn ngữ “{$locale}” không được hỗ trợ.");
        }
        $result = ['dishes' => 0, 'ingredients' => 0, 'skippedDishes' => [], 'skippedIngredients' => []];
        // Joins a caller's transaction (e.g. a dry run that rolls back) instead of nesting one.
        $own = !$this->pdo->inTransaction();
        if ($own) {
            $this->pdo->beginTransaction();
        }
        try {
            foreach ([
                ['dishes', 'dish', self::DISH_TRANSLATABLE, 'skippedDishes'],
                ['ingredients', 'ingredient', self::INGREDIENT_TRANSLATABLE, 'skippedIngredients'],
            ] as [$section, $kind, $fields, $skipped]) {
                $entries = $doc[$section] ?? [];
                if (!is_array($entries)) {
                    throw new HttpError(422, "“{$section}” phải là một object.");
                }
                $exists = array_flip(array_column($this->pdo->query("SELECT id FROM $section")->fetchAll(), 'id'));
                $stored = $kind === 'dish' ? $this->dishTranslations() : $this->ingredientTranslations();
                foreach ($entries as $id => $values) {
                    $id = (string) $id;
                    if (!isset($exists[$id])) {
                        $result[$skipped][] = $id;
                        continue;
                    }
                    $clean = self::cleanTranslations([$locale => $values], $fields)[$locale];
                    $given = array_intersect_key($clean, is_array($values) ? $values : []);
                    $this->writeTranslations($kind, $id, [$locale => $given + ($stored[$id][$locale] ?? [])]);
                    $result[$section]++;
                }
            }
            if ($own) {
                $this->pdo->commit();
            }
        } catch (Throwable $e) {
            if ($own) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
        return $result;
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
            'translations' => array_key_exists('translations', $in) ? self::cleanTranslations($in['translations'], self::DISH_TRANSLATABLE) : null,
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

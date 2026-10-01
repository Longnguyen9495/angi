<?php

declare(strict_types=1);

// Exercises the catalogue repository end to end on a throwaway dish (and one
// throwaway ingredient); everything it creates is deleted again at the end.
// Usage: php server/bin/selftest.php   (needs the database running)

require_once __DIR__ . '/../lib/Catalogue.php';

$cat = new Catalogue(db());
$failures = 0;
$check = function (string $name, bool $ok) use (&$failures): void {
    echo ($ok ? 'PASS ' : 'FAIL ') . $name . "\n";
    if (!$ok) {
        $failures++;
    }
};
$expectError = function (callable $fn, int $status): bool {
    try {
        $fn();
    } catch (HttpError $e) {
        return $e->status === $status;
    }
    return false;
};

// Any ingredient already in the library (ids differ between the seed and a live catalogue).
$libId = $cat->listIngredients()[0]['id'] ?? null;
if ($libId === null) {
    echo "FAIL the ingredient library is empty — seed the database first\n";
    exit(1);
}
$id = 'selftest-' . bin2hex(random_bytes(3));
$newIngName = 'Nguyên liệu thử ' . $id;
$newIng = slugify($newIngName);
$input = [
    'id' => $id, 'name' => 'Món thử nghiệm', 'subtitle' => 'Kiểm tra', 'price' => 42, 'region' => 'south', 'tone' => 'herb',
    'story' => 'Một món chỉ tồn tại trong bài kiểm tra.', 'flavor' => ['spicy' => 9, 'fresh' => 3],
    'image' => '/images/food-reel/full/000-com-tam.webp', 'thumbnail' => '/images/food-reel/thumb/000-com-tam.webp',
    'ingredients' => [
        ['id' => $libId],
        ['name' => $newIngName, 'description' => 'Tạm', 'crop' => 'bean', 'translations' => ['en' => ['name' => 'Test ingredient']]],
    ],
];
try {
    $d = $cat->saveDish($input, null, 'manual');
    $check('create dish with library + new ingredient', $d['id'] === $id && count($d['ingredients']) === 2);
    $check('flavor clamped to 0–5', $d['flavor']['spicy'] === 5 && $d['flavor']['sweet'] === 0);
    $check('new ingredient gets its crop', $d['ingredients'][1]['crop'] === 'bean');
    $check('untranslated dish encodes translations as {}', str_contains(json_encode($d), '"translations":{}'));
    $check('new ingredient keeps its translation', (array) $d['ingredients'][1]['translations'] === ['en' => ['name' => 'Test ingredient']]);
    $check('duplicate id rejected (409)', $expectError(fn () => $cat->saveDish($input, null), 409));
    $check('empty name rejected (422)', $expectError(fn () => $cat->saveDish(['name' => ''] + $input, $id), 422));
    $check('bad region rejected (422)', $expectError(fn () => $cat->saveDish(['region' => 'mars'] + $input, $id), 422));

    // ——— Translations ———
    $before = $cat->version();
    $t = $cat->saveDish(['translations' => ['en' => ['name' => '  Test dish ', 'subtitle' => '', 'story' => 'Only exists in a test.']]] + $input, $id);
    $check('dish translation saved, empty fields omitted', (array) $t['translations'] === ['en' => ['name' => 'Test dish', 'story' => 'Only exists in a test.']]);
    $check('translation change busts the catalogue version', $cat->version() !== $before);
    $listed = array_values(array_filter($cat->listDishes(), fn ($x) => $x['id'] === $id))[0] ?? null;
    $check('listDishes carries dish + ingredient translations', $listed
        && (array) $listed['translations'] === (array) $t['translations']
        && ((array) $listed['ingredients'][1]['translations'])['en']['name'] === 'Test ingredient');
    $check('base fields untouched by translations', $t['name'] === 'Món thử nghiệm' && $t['subtitle'] === 'Kiểm tra');
    $check('unknown locale rejected (422)', $expectError(fn () => $cat->saveDish(['translations' => ['xx' => ['name' => 'X']]] + $input, $id), 422));
    $check('base locale rejected as a translation (422)', $expectError(fn () => $cat->saveDish(['translations' => ['vi' => ['name' => 'X']]] + $input, $id), 422));
    $check('list instead of object rejected (422)', $expectError(fn () => $cat->saveDish(['translations' => [['name' => 'X']]] + $input, $id), 422));
    $long = $cat->saveDish(['translations' => ['en' => ['name' => str_repeat('a', 300), 'story' => 'S']]] + $input, $id);
    $check('translation length limited like the base field', mb_strlen(((array) $long['translations'])['en']['name']) === 160);
    $kept = $cat->saveDish($input, $id);
    $check('saving without translations keeps them', isset(((array) $kept['translations'])['en']));

    $r = $cat->importTranslations('en', [
        'dishes' => [$id => ['subtitle' => 'Imported subtitle'], 'selftest-no-such-dish' => ['name' => 'Ghost']],
        'ingredients' => [$newIng => ['description' => 'Imported description']],
    ]);
    $imp = $cat->getDish($id);
    $en = ((array) $imp['translations'])['en'];
    $check('import counts and skips unknown ids', $r['dishes'] === 1 && $r['ingredients'] === 1 && $r['skippedDishes'] === ['selftest-no-such-dish']);
    $check('import merges over stored fields', $en['subtitle'] === 'Imported subtitle' && $en['story'] === 'S' && $imp['subtitle'] === 'Kiểm tra');
    $ingEn = ((array) $imp['ingredients'][1]['translations'])['en'];
    $check('ingredient import merges too', $ingEn === ['name' => 'Test ingredient', 'description' => 'Imported description']);

    $cat->saveIngredient($newIng, ['name' => $newIngName, 'description' => 'Tạm', 'crop' => 'bean', 'translations' => ['en' => ['name' => 'Renamed', 'description' => '']]]);
    $lib = array_values(array_filter($cat->listIngredients(), fn ($i) => $i['id'] === $newIng))[0];
    $check('saveIngredient replaces the locale', (array) $lib['translations'] === ['en' => ['name' => 'Renamed']]);
    $cleared = $cat->saveDish(['translations' => ['en' => ['name' => '', 'subtitle' => '', 'story' => '']]] + $input, $id);
    $check('all-empty locale removes the translation', (array) $cleared['translations'] === []);

    $u = $cat->saveDish(['name' => 'Món đã sửa', 'ingredients' => [['id' => $libId]]] + $input, $id, 'manual');
    $check('update replaces fields and ingredients', $u['name'] === 'Món đã sửa' && count($u['ingredients']) === 1);
    $cat->deleteIngredient($newIng);
    $check('unused ingredient can be deleted', !in_array($newIng, array_column($cat->listIngredients(), 'id'), true));
    $orphans = db()->prepare('SELECT COUNT(*) FROM ingredient_translations WHERE ingredient_id = ?');
    $orphans->execute([$newIng]);
    $check('ingredient translations cascade on delete', (int) $orphans->fetchColumn() === 0);
    $check('used ingredient cannot be deleted (409)', $expectError(fn () => $cat->deleteIngredient($libId), 409));
} finally {
    try {
        $cat->deleteDish($id);
    } catch (HttpError) {
    }
    try {
        $cat->deleteIngredient($newIng);
    } catch (Throwable) {
    }
}
$check('dish deleted', $cat->getDish($id) === null);
$orphans = db()->prepare('SELECT COUNT(*) FROM dish_translations WHERE dish_id = ?');
$orphans->execute([$id]);
$check('dish translations cascade on delete', (int) $orphans->fetchColumn() === 0);
$check('slugify handles Vietnamese', slugify('Bánh mì chảo Đà Nẵng') === 'banh-mi-chao-da-nang');

// ——— Server messages ———
$check('languages come from server/lang files, vi first', Lang::available()[0] === 'vi' && in_array('en', Lang::extra(), true));
$check('locale tags normalised', Lang::normalize('en-US') === 'en' && Lang::normalize('EN') === 'en' && Lang::normalize('xx') === null);
$check('Accept-Language honours q-values', Lang::fromAcceptLanguage('fr-FR,en;q=0.8,vi;q=0.9') === 'vi' && Lang::fromAcceptLanguage('de') === null);
$check('message in English with params', __t('friends.defaultName', ['code' => 'K7QM2P'], 'en') === 'Garden K7QM2P');
$check('English plural closure', __t('account.wrongCode', ['left' => 1], 'en') !== __t('account.wrongCode', ['left' => 2], 'en'));
$check('unknown locale falls back to Vietnamese', __t('api.notFound', [], 'fr') === __t('api.notFound', [], 'vi'));
$vi = require __DIR__ . '/../lang/vi.php';
$missing = [];
foreach (Lang::extra() as $code) {
    $other = require __DIR__ . "/../lang/$code.php";
    $missing = [...$missing, ...array_map(fn ($k) => "$code:$k", array_keys(array_diff_key($vi, $other)))];
}
$check('every language has every vi key' . ($missing ? ' (missing ' . implode(', ', $missing) . ')' : ''), !$missing);
echo $failures === 0 ? "All server checks passed.\n" : "$failures server check(s) failed.\n";
exit($failures === 0 ? 0 : 1);

<?php

declare(strict_types=1);

// Exercises the catalogue repository end to end on a throwaway dish.
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

$id = 'selftest-' . bin2hex(random_bytes(3));
$input = [
    'id' => $id, 'name' => 'Món thử nghiệm', 'subtitle' => 'Kiểm tra', 'price' => 42, 'region' => 'south', 'tone' => 'herb',
    'story' => 'Một món chỉ tồn tại trong bài kiểm tra.', 'flavor' => ['spicy' => 9, 'fresh' => 3],
    'image' => '/images/food-reel/full/000-com-tam.webp', 'thumbnail' => '/images/food-reel/thumb/000-com-tam.webp',
    'ingredients' => [['id' => 'gao-tam'], ['name' => 'Nguyên liệu thử ' . $id, 'description' => 'Tạm', 'crop' => 'bean']],
];
try {
    $d = $cat->saveDish($input, null, 'manual');
    $check('create dish with library + new ingredient', $d['id'] === $id && count($d['ingredients']) === 2);
    $check('flavor clamped to 0–5', $d['flavor']['spicy'] === 5 && $d['flavor']['sweet'] === 0);
    $check('new ingredient gets its crop', $d['ingredients'][1]['crop'] === 'bean');
    $check('duplicate id rejected (409)', $expectError(fn () => $cat->saveDish($input, null), 409));
    $check('empty name rejected (422)', $expectError(fn () => $cat->saveDish(['name' => ''] + $input, $id), 422));
    $check('bad region rejected (422)', $expectError(fn () => $cat->saveDish(['region' => 'mars'] + $input, $id), 422));
    $u = $cat->saveDish(['name' => 'Món đã sửa', 'ingredients' => [['id' => 'gao-tam']]] + $input, $id, 'manual');
    $check('update replaces fields and ingredients', $u['name'] === 'Món đã sửa' && count($u['ingredients']) === 1);
    $newIng = slugify('Nguyên liệu thử ' . $id);
    $cat->deleteIngredient($newIng);
    $check('unused ingredient can be deleted', !in_array($newIng, array_column($cat->listIngredients(), 'id'), true));
    $check('used ingredient cannot be deleted (409)', $expectError(fn () => $cat->deleteIngredient('gao-tam'), 409));
} finally {
    try {
        $cat->deleteDish($id);
    } catch (HttpError) {
    }
}
$check('dish deleted', $cat->getDish($id) === null);
$check('slugify handles Vietnamese', slugify('Bánh mì chảo Đà Nẵng') === 'banh-mi-chao-da-nang');
echo $failures === 0 ? "All server checks passed.\n" : "$failures server check(s) failed.\n";
exit($failures === 0 ? 0 : 1);

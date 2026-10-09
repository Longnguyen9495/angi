<?php

declare(strict_types=1);

require_once __DIR__ . '/SkyRules.php';

/*
 * Vườn Mây checks inside ProgressGuard (plans/vuon-may.md §0.2, hướng A). The sky branch is
 * saved with the garden; every sky ledger entry must follow a rule here, and the branch's state
 * (floors, slots, pots, plantings, machines) must be explained by those entries:
 *  - floors, slots, seeds and pots are bought at their price, floors only at their level;
 *  - a planting spends one seed on a pot that stands on a shelf; its recorded stats are at most
 *    what that pot can give; it ripens no sooner than its grow time allows (watering included);
 *  - a bug is the one the server's key rolls for that planting's check, caught after the check;
 *  - a harvest pays the seed's yield, the XP of its grow time (held to the pot's bonus and the
 *    daily sky cap) and at most the pot's coin bonus;
 *  - a machine pays its recipe's product once its time is up, for exactly the recipe's inputs;
 *  - stars, tiers and luck never change in a save (only Sky.php writes them).
 */
trait SkyGuard
{
    private static function isSkyKey(string $key): bool
    {
        return str_starts_with($key, 'sky:') || preg_match('/^xp:sky(job|box)?:/', $key) === 1;
    }

    // ——— Shape ———

    private function skyShape(mixed $sky): void
    {
        if ($sky === null) {
            return;
        }
        $S = SkyRules::R();
        $int = fn ($v, int $min, int $max) => is_int($v) && $v >= $min && $v <= $max;
        $time = fn ($v) => is_int($v) && $v > 0 && $v < 32_503_680_000_000;
        $bad = fn (string $what) => $this->reject('shape', "sky $what");
        is_array($sky) || $bad('branch');
        $int($sky['floors'] ?? null, 1, count($S['floors'])) || $bad('floors');
        $floors = (int) $sky['floors'];
        (is_array($sky['slots'] ?? null) && array_is_list($sky['slots']) && count($sky['slots']) === $floors) || $bad('slots');
        (is_array($sky['bought'] ?? null) && array_is_list($sky['bought']) && count($sky['bought']) === $floors) || $bad('bought');
        foreach ($sky['bought'] as $b) {
            $int($b, 0, 3) || $bad('bought value');
        }
        is_array($sky['pots'] ?? null) || $bad('pots');
        count($sky['pots']) <= 500 || $bad('pot count');
        foreach ($sky['pots'] as $uid => $p) {
            (is_string($uid) && preg_match('/^([a-z_]+)\.(\d{1,6})$/', $uid, $m) && is_array($p) && ($p['uid'] ?? null) === $uid
                && ($p['pot'] ?? null) === $m[1] && isset($S['pots'][$m[1]])) || $bad('pot');
            ($int($p['tier'] ?? null, 0, (int) $S['maxTier']) && $int($p['stars'] ?? null, 0, count($S['starSteps']))
                && $int($p['luck'] ?? null, 0, 10000) && $int($p['tries'] ?? null, 0, 1000) && $int($p['cycles'] ?? null, 0, 1_000_000)) || $bad('pot fields');
            $pl = $p['plant'] ?? null;
            if ($pl === null) {
                continue;
            }
            (is_array($pl) && is_array($pl['seed'] ?? null) && in_array($pl['seed']['kind'] ?? null, ['sky', 'farm'], true)
                && is_string($pl['seed']['id'] ?? null) && $int($pl['cycle'] ?? null, 0, 1_000_000)
                && $time($pl['plantedAt'] ?? null) && $time($pl['readyAt'] ?? null)
                && (($pl['wateredAt'] ?? null) === null || $time($pl['wateredAt']))) || $bad('plant');
            is_array($pl['stats'] ?? null) || $bad('plant stats');
            foreach (['time', 'xp', 'bug', 'coin'] as $k) {
                $int($pl['stats'][$k] ?? null, 0, (int) $S['statCap'][$k]) || $bad('plant stat');
            }
            (is_array($pl['bugs'] ?? []) && count($pl['bugs'] ?? []) <= 3) || $bad('plant bugs');
            foreach ($pl['bugs'] ?? [] as $b) {
                ($b === null || (is_string($b) && isset($S['bugs'][$b]))) || $bad('plant bug');
            }
            (is_array($pl['caught'] ?? []) && count($pl['caught'] ?? []) <= 3) || $bad('plant caught');
            foreach ($pl['caught'] ?? [] as $c) {
                $int($c, 0, 2) || $bad('plant caught value');
            }
        }
        $seen = [];
        foreach ($sky['slots'] as $f => $row) {
            (is_array($row) && array_is_list($row) && count($row) === 6) || $bad('slot row');
            foreach ($row as $u) {
                if ($u === null) {
                    continue;
                }
                (is_string($u) && isset($sky['pots'][$u]) && !isset($seen[$u])) || $bad('slot value');
                $seen[$u] = true;
            }
        }
        $known = [
            'seeds' => $S['crops'],
            'bugs' => $S['bugs'],
            'items' => array_flip($S['items']),
            'goods' => $S['goods'],
        ];
        foreach ($known as $field => $keys) {
            is_array($sky[$field] ?? []) || $bad($field);
            foreach ($sky[$field] ?? [] as $k => $n) {
                (isset($keys[$k]) && $int($n, 0, 1_000_000)) || $bad("$field.$k");
            }
        }
        is_array($sky['jobs'] ?? []) || $bad('jobs');
        foreach ($sky['jobs'] ?? [] as $m => $list) {
            (isset($S['machines'][$m]) && is_array($list) && array_is_list($list) && count($list) <= (int) $S['machines'][$m]['slots']) || $bad('jobs list');
            foreach ($list as $j) {
                (is_array($j) && isset($S['recipes'][$j['recipe'] ?? '']) && $time($j['startedAt'] ?? null) && $time($j['readyAt'] ?? null)) || $bad('job');
            }
        }
        foreach ($sky['events'] ?? [] as $x) {
            (is_string($x) && isset($S['eventPots'][$x])) || $bad('event');
        }
        foreach ($sky['sets'] ?? [] as $s) {
            (is_string($s) && isset($S['sets'][$s])) || $bad('set');
        }
        (($sky['firstPot'] ?? null) === null || isset($sky['pots'][$sky['firstPot']])) || $bad('firstPot');
        $int($sky['serial'] ?? 0, 0, 1_000_000) || $bad('serial');
    }

    // ——— Balances ———

    private static function skyBalance(array $p, string $kind, string $id): int
    {
        $sky = $p['sky'] ?? null;
        if (!is_array($sky)) {
            return 0;
        }
        return match ($kind) {
            'skyseed' => (int) ($sky['seeds'][$id] ?? 0),
            'bug' => (int) ($sky['bugs'][$id] ?? 0),
            'skyitem' => (int) ($sky['items'][$id] ?? 0),
            'skygood' => (int) ($sky['goods'][$id] ?? 0),
            'pot' => count(array_filter((array) ($sky['pots'] ?? []), fn ($x) => is_array($x) && ($x['pot'] ?? null) === $id)),
            default => 0,
        };
    }

    /** Every sky resource either copy holds, for the balance check. */
    private static function skyResources(array $old, array $new): array
    {
        $out = [];
        foreach ([$old['sky'] ?? null, $new['sky'] ?? null] as $sky) {
            if (!is_array($sky)) {
                continue;
            }
            foreach (['seeds' => 'skyseed', 'bugs' => 'bug', 'items' => 'skyitem', 'goods' => 'skygood'] as $field => $kind) {
                foreach (array_keys((array) ($sky[$field] ?? [])) as $id) {
                    $out[] = "$kind:$id";
                }
            }
            foreach ((array) ($sky['pots'] ?? []) as $p) {
                if (is_array($p) && isset($p['pot'])) {
                    $out[] = 'pot:' . $p['pot'];
                }
            }
        }
        return $out;
    }

    // ——— Entries ———

    /** A planting of a pot and cycle: from the new copy, the stored one, or this save's planting entry. */
    private function skyPlanting(array $ctx, string $uid, int $cycle): ?array
    {
        foreach (['new', 'old'] as $which) {
            $pl = $ctx[$which]['sky']['pots'][$uid]['plant'] ?? null;
            if (is_array($pl) && (int) ($pl['cycle'] ?? -1) === $cycle) {
                return $pl + ['pot' => $ctx[$which]['sky']['pots'][$uid]];
            }
        }
        return null;
    }

    /** A planting's yield, in the order the game posts it: goods, then items, then farm produce. */
    private function skyYield(array $seed): array
    {
        $S = SkyRules::R();
        if (($seed['kind'] ?? '') === 'farm') {
            $c = $this->r['crops'][$seed['id']] ?? null;
            return $c ? [['res' => "ingredient:{$seed['id']}", 'qty' => (int) $c['yield'], 'value' => (int) $c['yield'] * (int) ($this->r['sell'][$seed['id']] ?? 0)]] : [];
        }
        $def = $S['crops'][$seed['id']] ?? null;
        if (!$def) {
            return [];
        }
        $goods = $items = [];
        foreach ($def['yield'] as $y) {
            if (isset($y['good'])) {
                $goods[] = ['res' => "skygood:{$y['good']}", 'qty' => (int) $y['qty'], 'value' => (int) $S['goods'][$y['good']] * (int) $y['qty']];
            } else {
                $items[] = ['res' => "skyitem:{$y['item']}", 'qty' => (int) $y['qty'], 'value' => 0];
            }
        }
        return array_merge($goods, $items);
    }

    /** The seed a planting entry spent, as a seed ref, or null. */
    private function skySeedOf(string $res, int $level): ?array
    {
        $S = SkyRules::R();
        if (str_starts_with($res, 'skyseed:')) {
            $id = substr($res, 8);
            return isset($S['crops'][$id]) ? ['kind' => 'sky', 'id' => $id] : null;
        }
        if (str_starts_with($res, 'seed:')) {
            $id = substr($res, 5);
            $c = $this->r['crops'][$id] ?? null;
            return $c && $c['kind'] === 'veg' && $this->available($id, $level) ? ['kind' => 'farm', 'id' => $id] : null;
        }
        return null;
    }

    /**
     * Checks every sky entry of this save; returns the evidence the state check needs
     * (plantings, machine inputs, floors and slots opened, sets claimed, XP and harvest tallies).
     */
    private function skyEntries(array $ctx, array $fresh, array $byKey): array
    {
        $S = SkyRules::R();
        $old = $ctx['old'];
        $new = $ctx['new'];
        $level = $ctx['level'];
        $newSky = is_array($new['sky'] ?? null) ? $new['sky'] : null;
        $floorsNew = (int) ($newSky['floors'] ?? 0);
        $ev = ['plant' => [], 'jobIn' => [], 'jobOut' => [], 'floor' => [], 'slot' => [], 'set' => [], 'xp' => 0, 'harvests' => [], 'bugs' => [], 'dew' => 0, 'gold' => 0, 'firefly' => 0, 'event' => []];
        $any = false;

        // Evidence first: plantings and machine inputs.
        foreach ($fresh as $e) {
            $key = (string) $e['key'];
            if (!self::isSkyKey($key)) {
                continue;
            }
            $any = true;
            if (preg_match('/^sky:plant:([a-z_]+\.\d+):(\d+)$/', $key, $m)) {
                $seed = $this->skySeedOf((string) $e['resource'], $level);
                ($seed !== null && (int) $e['delta'] === -1) || $this->reject('rule', "$key: a planting spends one seed");
                $ev['plant']["{$m[1]}:{$m[2]}"] = ['seed' => $seed, 'at' => (int) $e['at']];
            } elseif (preg_match('/^sky:job:([a-z]+):(-?\d+):in:(\d+)$/', $key, $m)) {
                ((int) $e['delta'] < 0 && preg_match('/^(skygood|ingredient):[a-z_]+$/', (string) $e['resource'])) || $this->reject('rule', "$key: a machine takes goods");
                $ev['jobIn']["{$m[1]}:{$m[2]}"][(string) $e['resource']] = -(int) $e['delta'];
            }
        }
        if (!$any) {
            return $ev;
        }
        $level >= (int) $S['level'] || $this->reject('rule', 'Vườn Mây below its level');
        $newSky !== null || $this->reject('rule', 'sky entries without a sky branch');

        foreach ($fresh as $e) {
            $key = (string) $e['key'];
            if (!self::isSkyKey($key)) {
                continue;
            }
            $res = (string) $e['resource'];
            $d = (int) $e['delta'];
            $at = (int) $e['at'];
            $fail = fn (string $why) => $this->reject('rule', "$key: $why");

            if (preg_match('/^sky:floor:(\d+):(open|coin|cloudseed|dew)$/', $key, $m)) {
                $f = $S['floors'][(int) $m[1] - 1] ?? null;
                $f !== null || $fail('no such floor');
                $level >= (int) $f['level'] || $fail('floor above the level');
                $want = match ($m[2]) {
                    'open' => ['coin', 0],
                    'coin' => ['coin', -(int) $f['coins']],
                    'cloudseed' => ['skyitem:cloudseed', -(int) $f['cloudseed']],
                    'dew' => ['skyitem:dew', -(int) $f['dew']],
                };
                ($res === $want[0] && $d === $want[1]) || $fail('floor price');
                if ($m[2] === 'open') {
                    $ev['floor'][(int) $m[1]] = true;
                }
            } elseif (preg_match('/^sky:starter:([a-z_]+)$/', $key, $m)) {
                (in_array($m[1], $S['starters'], true) && $res === "pot:{$m[1]}" && $d === 1 && isset($byKey['sky:floor:1:open'])) || $fail('starter pot');
            } elseif (preg_match('/^sky:slot:(\d+):(\d)$/', $key, $m)) {
                $f = $S['floors'][(int) $m[1] - 1] ?? null;
                $k = (int) $m[2];
                ($f !== null && $k >= 4 && $k <= 6 && $res === 'coin' && $d === -(int) $f['slots'][$k - 4]) || $fail('slot price');
                $ev['slot'][((int) $m[1] - 1) . ':' . ($k - 3)] = true;
            } elseif (preg_match('/^sky:(potbuy|shardpot):([a-z_]+):(-?\d+)(:pay)?$/', $key, $m)) {
                $pot = $m[2];
                if ($m[1] === 'potbuy') {
                    $price = $S['potPrices'][$pot] ?? null;
                    $price !== null || $fail('pot not on sale');
                    $floorsNew >= (int) $price['floor'] || $fail('pot not on sale yet');
                    $pay = [$price['currency'] === 'coin' ? 'coin' : 'skyitem:gem', -(int) $price['price']];
                } else {
                    in_array($pot, $S['shardPots'], true) || $fail('no such shard pot');
                    $pay = ['skyitem:shard', -(int) $S['shardsPerPot']];
                }
                if (($m[4] ?? '') === ':pay') {
                    ($res === $pay[0] && $d === $pay[1]) || $fail('pot price');
                } else {
                    ($res === "pot:$pot" && $d === 1 && isset($byKey["$key:pay"])) || $fail('pot without its price');
                }
            } elseif (preg_match('/^sky:seed:([a-z]+):(-?\d+)(:pay)?$/', $key, $m)) {
                $c = $S['crops'][$m[1]] ?? null;
                ($c !== null && $floorsNew >= (int) $c['floor']) || $fail('seed not on sale');
                if (($m[3] ?? '') === ':pay') {
                    ($res === 'coin' && $d === -(int) $c['seed']) || $fail('seed price');
                } else {
                    ($res === "skyseed:{$m[1]}" && $d === 1 && isset($byKey["$key:pay"])) || $fail('seed without its price');
                }
            } elseif (preg_match('/^sky:plant:/', $key)) {
                // checked above
            } elseif (preg_match('/^sky:bug:([a-z_]+\.\d+):(\d+):([0-2])$/', $key, $m)) {
                $uid = $m[1];
                $cycle = (int) $m[2];
                $stage = (int) $m[3];
                $pl = $this->skyPlanting($ctx, $uid, $cycle);
                $pl !== null || $fail('no such planting');
                ($d === 1 && str_starts_with($res, 'bug:')) || $fail('one bug');
                $grow = SkyRules::growMs($pl['seed'], $this->r);
                $grow !== null || $fail('unknown seed');
                $pot = $pl['pot'];
                $max = SkyRules::potMax((string) $pot['pot'], (int) $pot['tier'], (int) $pot['stars']);
                (int) $pl['stats']['bug'] <= $max['bug'] || $fail('bug bonus above the pot');
                $checkAt = SkyRules::checkAt((int) $pl['plantedAt'], SkyRules::plantGrowMs($grow, (int) $pl['stats']['time']), $stage);
                $at + self::SLACK_MS >= $checkAt || $fail('caught before the check');
                $tutorial = ($newSky['firstPot'] ?? null) === $uid;
                $want = SkyRules::rollBug($this->user, $uid, $cycle, $stage, (int) $pl['stats']['bug'], $checkAt - $ctx['offset'], $tutorial);
                ($want !== null && $res === "bug:$want") || $fail('not the bug of this check');
                $ev['bugs']["$uid:$cycle:$stage"] = true;
                $ev['gold'] += $want === 'goldbeetle' ? 1 : 0;
                $ev['firefly'] += $want === 'firefly' ? 1 : 0;
            } elseif (preg_match('/^sky:harvest:([a-z_]+\.\d+):(\d+):(\d+|coin)$/', $key, $m)) {
                $uid = $m[1];
                $cycle = (int) $m[2];
                $pl = $this->skyPlanting($ctx, $uid, $cycle);
                $planted = $ev['plant']["$uid:$cycle"] ?? null;
                ($pl !== null || $planted !== null) || $fail('no such planting');
                $seed = $pl['seed'] ?? $planted['seed'];
                $plantedAt = (int) ($pl['plantedAt'] ?? $planted['at']);
                $stats = $pl['stats'] ?? ['time' => 0, 'xp' => 0, 'bug' => 0, 'coin' => 0];
                $grow = SkyRules::growMs($seed, $this->r);
                $grow !== null || $fail('unknown seed');
                $at + self::SLACK_MS >= $plantedAt + $this->minReady(SkyRules::plantGrowMs($grow, (int) $stats['time']), $this->skyFriendWaters($uid, $cycle)) || $fail('picked before it could ripen');
                $yield = $this->skyYield($seed);
                $pot = $pl['pot'] ?? ($new['sky']['pots'][$uid] ?? $old['sky']['pots'][$uid] ?? null);
                is_array($pot) || $fail('no such pot');
                $max = SkyRules::potMax((string) $pot['pot'], (int) $pot['tier'], (int) $pot['stars']);
                if ($m[3] === 'coin') {
                    $value = array_sum(array_column($yield, 'value'));
                    ($res === 'coin' && $d >= 1 && $d <= intdiv($value * $max['coin'], 10000)) || $fail('coin bonus');
                } else {
                    $y = $yield[(int) $m[3]] ?? null;
                    ($y !== null && $res === $y['res'] && $d === $y['qty']) || $fail('not this plant\'s yield');
                }
                $ev['harvests']["$uid:$cycle"] = $grow;
            } elseif (preg_match('/^xp:sky:([a-z_]+\.\d+):(\d+)$/', $key, $m)) {
                $grow = $ev['harvests']["{$m[1]}:{$m[2]}"] ?? null;
                $grow !== null || $fail('XP without its harvest');
                $pot = $new['sky']['pots'][$m[1]] ?? $old['sky']['pots'][$m[1]] ?? null;
                is_array($pot) || $fail('no such pot');
                $max = SkyRules::potMax((string) $pot['pot'], (int) $pot['tier'], (int) $pot['stars']);
                ($res === 'xp' && $d >= 1 && $d <= SkyRules::harvestXp($grow, $max['xp'])) || $fail('harvest XP');
                $ev['xp'] += $d;
            } elseif (preg_match('/^sky:job:([a-z]+):(-?\d+):in:\d+$/', $key)) {
                // checked with its output (or as the job's start in the state check)
            } elseif (preg_match('/^sky:job:([a-z]+):(-?\d+):out$/', $key, $m)) {
                $recipe = $this->skyJobRecipe($ctx, $ev, $m[1], (int) $m[2]);
                $recipe !== null || $fail('no such job');
                $r = $S['recipes'][$recipe];
                ($res === $r['out']['res'] && $d === (int) $r['out']['qty']) || $fail('not this recipe\'s product');
                $at + self::SLACK_MS >= (int) $m[2] + (int) $r['ms'] || $fail('taken out too early');
                $ev['jobOut']["{$m[1]}:{$m[2]}"] = $recipe;
            } elseif (preg_match('/^xp:skyjob:([a-z]+):(-?\d+)$/', $key, $m)) {
                $recipe = $ev['jobOut']["{$m[1]}:{$m[2]}"] ?? null;
                ($recipe !== null && $res === 'xp' && $d >= 1 && $d <= (int) $S['recipes'][$recipe]['xp']) || $fail('machine XP');
                $ev['xp'] += $d;
            } elseif (preg_match('/^sky:sell:([a-z_]+):(-?\d+):(out|coin)$/', $key, $m)) {
                $price = $S['goods'][$m[1]] ?? null;
                $price !== null || $fail('unknown good');
                if ($m[3] === 'out') {
                    ($res === "skygood:{$m[1]}" && $d === -1) || $fail('a sale takes one');
                } else {
                    ($res === 'coin' && $d === (int) $price && isset($byKey["sky:sell:{$m[1]}:{$m[2]}:out"])) || $fail('sale price');
                }
            } elseif (preg_match('/^sky:tut:([a-z0-9]+):(seed|item:([a-z]+)|pot|honey)$/', $key, $m)) {
                $t = $S['tutorial'][$m[1]] ?? null;
                $t !== null || $fail('no such tutorial step');
                $ok = match (true) {
                    $m[2] === 'seed' => $t['seeds'] !== null && $res === "skyseed:{$t['seeds']['crop']}" && $d === (int) $t['seeds']['qty'],
                    $m[2] === 'pot' => $t['pot'] !== null && $res === "pot:{$t['pot']}" && $d === 1,
                    $m[2] === 'honey' => $m[1] === 'dried' && $res === 'ingredient:honey' && $d === (int) $S['tutorialHoney'],
                    default => isset($t['items'][$m[3]]) && $res === "skyitem:{$m[3]}" && $d === (int) $t['items'][$m[3]],
                };
                $ok || $fail('not this step\'s reward');
                $this->skyStepDone($m[1], $ctx, $fresh) || $fail('step not done');
            } elseif (preg_match('/^sky:daily:(\d{4}-\d{2}-\d{2})$/', $key, $m)) {
                ($res === 'skyitem:cloudseed' && $d === (int) $S['daily']['cloudseed'] && $floorsNew >= (int) $S['daily']['fromFloor']) || $fail('daily cloud seed');
                $this->slotDate($m[1], $at) || $fail('not today');
                $n = $this->counted(self::dayKey('skyharvest', $ctx['serverMs'])) + count($ev['harvests']);
                $n >= (int) $S['daily']['harvests'] || $fail('not enough harvests today');
            } elseif (preg_match('/^sky:set:([a-z]+):(gem|coin)$/', $key, $m)) {
                $set = $S['sets'][$m[1]] ?? null;
                ($set !== null && $set['complete']) || $fail('no such set');
                foreach ($set['pots'] as $pot) {
                    self::skyBalance($new, 'pot', $pot) > 0 || $fail('set not owned');
                }
                $want = $m[2] === 'gem' ? ['skyitem:gem', (int) $S['setReward']['gem']] : ['coin', (int) $S['setReward']['coins']];
                ($res === $want[0] && $d === $want[1]) || $fail('set reward');
                $ev['set'][$m[1]] = true;
            } elseif (preg_match('/^sky:balloon:(\d{4}-\d{2}-\d{2}):(\d)$/', $key, $m)) {
                $box = SkyRules::balloonBoxes($m[1])[(int) $m[2]] ?? null;
                ($box !== null && $res === "skygood:{$box['good']}" && $d === -(int) $box['qty']) || $fail('not this box');
                $floorsNew >= (int) $S['balloon']['floor'] || $fail('no balloon yet');
                $this->slotDate($m[1], $at) || $fail('not today\'s balloon');
            } elseif (preg_match('/^xp:skybox:(\d{4}-\d{2}-\d{2}):(\d)$/', $key, $m)) {
                (isset($byKey["sky:balloon:{$m[1]}:{$m[2]}"]) && $res === 'xp' && $d >= 1 && $d <= (int) $S['balloon']['boxXp']) || $fail('box XP');
                $ev['xp'] += $d;
            } elseif (preg_match('/^sky:balloon:(\d{4}-\d{2}-\d{2}):(coin|cloudseed|shard|gem)$/', $key, $m)) {
                $B = $S['balloon'];
                $packed = 0;
                for ($i = 0; $i < (int) $B['boxes']; $i++) {
                    $packed += isset($byKey["sky:balloon:{$m[1]}:$i"]) || $this->countClaims("sky:balloon:{$m[1]}:$i") > 0 ? 1 : 0;
                }
                $packed === (int) $B['boxes'] || $fail('balloon not full');
                $want = match ($m[2]) {
                    'coin' => ['coin', (int) $B['coins']],
                    'cloudseed' => ['skyitem:cloudseed', (int) $B['cloudseed']],
                    'shard' => ['skyitem:shard', (int) $B['shards']],
                    'gem' => ['skyitem:gem', (int) $B['streakGem']],
                };
                ($res === $want[0] && $d === $want[1]) || $fail('balloon pay');
                if ($m[2] === 'gem') {
                    // Every 7th full trip in a row: the 6 days before were full too.
                    $day = SkyRules::dayNumber($m[1]);
                    for ($k = 1; $k < (int) $B['streakDays']; $k++) {
                        $prev = gmdate('Y-m-d', ($day - $k) * 86400);
                        $this->countClaims("sky:balloon:$prev:coin") > 0 || $fail('streak not reached');
                    }
                }
            } elseif (preg_match('/^sky:event:([a-z-]+):([a-z_]+)$/', $key, $m)) {
                // A festival pot: its event's last milestone was reached (its days served).
                $e = $this->r['events'][$m[1]] ?? null;
                ($e !== null && in_array($m[2], (array) ($S['eventPots'][$m[1]] ?? []), true)) || $fail('no such festival pot');
                ($res === "pot:{$m[2]}" && $d === 1) || $fail('one festival pot');
                $this->eventDaysServed($e, $fresh) >= (int) end($e['targets']) || $fail('event not finished');
                $ev['event'][$m[1]] = true;
            } elseif (preg_match('/^sky:(star|tier):/', $key)) {
                $fail('stars and tiers are the server\'s');
            } else {
                $fail('nothing in Vườn Mây pays this');
            }
        }
        // Sky XP: held to its daily cap over every save of the server day.
        if ($ev['xp'] > 0 && $this->counted(self::dayKey('skyxp', $ctx['serverMs'])) + $ev['xp'] > (int) $S['xpPerDay'] + 10) {
            $this->reject('rule', 'more sky XP than a day allows');
        }
        return $ev;
    }

    /** The recipe of a machine job: from its inputs in this save, or the stored copy's job list. */
    private function skyJobRecipe(array $ctx, array $ev, string $machine, int $t): ?string
    {
        $S = SkyRules::R();
        foreach ((array) ($ctx['old']['sky']['jobs'][$machine] ?? []) as $j) {
            if (is_array($j) && (int) ($j['startedAt'] ?? -1) === $t) {
                return (string) $j['recipe'];
            }
        }
        $in = $ev['jobIn']["$machine:$t"] ?? null;
        if ($in === null) {
            return null;
        }
        ksort($in);
        foreach ($S['recipes'] as $id => $r) {
            if ($r['machine'] !== $machine) {
                continue;
            }
            $want = [];
            foreach ($r['inputs'] as $i) {
                $want[$i['res']] = (int) $i['qty'];
            }
            ksort($want);
            if ($want === $in) {
                return (string) $id;
            }
        }
        return null;
    }

    /** Whether a tutorial step's action shows in this save or an earlier one. */
    private function skyStepDone(string $step, array $ctx, array $fresh): bool
    {
        $newSky = $ctx['new']['sky'] ?? [];
        $has = function (string $pattern, string $like) use ($fresh): bool {
            foreach ($fresh as $e) {
                if (preg_match($pattern, (string) $e['key'])) {
                    return true;
                }
            }
            return $this->countClaims($like) > 0;
        };
        return match ($step) {
            'place' => ($newSky['firstPot'] ?? null) !== null,
            'harvest' => $has('/^sky:harvest:/', 'sky:harvest:%'),
            'bug' => $has('/^sky:bug:/', 'sky:bug:%'),
            'dried', 'mix01' => $has('/^sky:job:tea:-?\d+:out$/', 'sky:job:tea:%:out'),
            'floor2' => (int) ($newSky['floors'] ?? 0) >= 2,
            default => false,
        };
    }

    // ——— State ———

    private function skyState(array $ctx, array $fresh, array $ev): void
    {
        $S = SkyRules::R();
        $old = $ctx['old']['sky'] ?? null;
        $new = $ctx['new']['sky'] ?? null;
        $old = is_array($old) ? $old : null;
        $new = is_array($new) ? $new : null;
        $byKey = [];
        foreach ($fresh as $e) {
            $byKey[(string) $e['key']] = $e;
        }
        if ($new === null) {
            $old === null || $this->reject('rule', 'sky branch disappeared');
            return;
        }
        $fail = fn (string $why) => $this->reject('rule', "sky: $why");
        $ctx['level'] >= (int) $S['level'] || $fail('below its level');
        $oldFloors = (int) ($old['floors'] ?? 0);
        $newFloors = (int) $new['floors'];
        $newFloors >= $oldFloors || $fail('floors went down');
        for ($n = $oldFloors + 1; $n <= $newFloors; $n++) {
            isset($ev['floor'][$n]) || $fail("floor $n opened without paying");
            $f = $S['floors'][$n - 1];
            foreach (['coin' => 'coins', 'cloudseed' => 'cloudseed', 'dew' => 'dew'] as $part => $field) {
                ((int) $f[$field] === 0 || isset($byKey["sky:floor:$n:$part"])) || $fail("floor $n price");
            }
        }
        foreach ($new['bought'] as $f => $b) {
            $was = (int) ($old['bought'][$f] ?? 0);
            (int) $b >= $was || $fail('slots went down');
            for ($k = $was + 1; $k <= (int) $b; $k++) {
                isset($ev['slot']["$f:$k"]) || $fail('slot opened without paying');
            }
            foreach ($new['slots'][$f] as $i => $u) {
                ($u === null || $i < (int) $S['freeSlots'] + (int) $b) || $fail('pot on a closed slot');
            }
        }
        if (($old['firstPot'] ?? null) !== null) {
            ($new['firstPot'] ?? null) === $old['firstPot'] || $fail('first pot changed');
        }

        $oldPots = (array) ($old['pots'] ?? []);
        foreach ($oldPots as $uid => $op) {
            $np = $new['pots'][$uid] ?? null;
            is_array($np) || $fail("pot $uid disappeared");
            ($np['pot'] === $op['pot'] && (int) $np['tier'] === (int) $op['tier'] && (int) $np['stars'] === (int) $op['stars']
                && (int) $np['luck'] === (int) $op['luck'] && (int) $np['tries'] === (int) $op['tries']) || $fail("pot $uid stars, tier or luck changed");
            (int) $np['cycles'] >= (int) $op['cycles'] || $fail("pot $uid cycles went down");
        }
        foreach ($new['pots'] as $uid => $np) {
            if (!isset($oldPots[$uid])) {
                ((int) $np['tier'] === (int) $S['pots'][$np['pot']]['tier'] && (int) $np['stars'] === 0 && (int) $np['luck'] === 0 && (int) $np['tries'] === 0)
                    || $fail("new pot $uid is not new");
            }
            $op = $oldPots[$uid] ?? null;
            $opl = is_array($op['plant'] ?? null) ? $op['plant'] : null;
            $npl = is_array($np['plant'] ?? null) ? $np['plant'] : null;
            // A planting that left (or was replaced) was picked.
            if ($opl !== null && ($npl === null || (int) $npl['cycle'] !== (int) $opl['cycle'])) {
                (isset($ev['harvests']["$uid:{$opl['cycle']}"]) || $this->countClaims("sky:harvest:$uid:{$opl['cycle']}:%") > 0)
                    || $fail("pot $uid emptied without a harvest");
            }
            if ($npl === null) {
                continue;
            }
            SkyRules::place($new, $uid) !== null || $fail("planted pot $uid is not on a shelf");
            $grow = SkyRules::growMs($npl['seed'], $this->r);
            $grow !== null || $fail('unknown seed');
            $same = $opl !== null && (int) $opl['cycle'] === (int) $npl['cycle'] && (int) $opl['plantedAt'] === (int) $npl['plantedAt'];
            if ($same) {
                ($opl['seed'] == $npl['seed'] && $opl['stats'] == $npl['stats']) || $fail("pot $uid planting rewritten");
                (int) $npl['readyAt'] <= (int) $opl['readyAt'] || $fail("pot $uid ripens later");
            } else {
                $p = $ev['plant']["$uid:{$npl['cycle']}"] ?? null;
                ($p !== null && $p['at'] === (int) $npl['plantedAt'] && $p['seed'] == $npl['seed']) || $fail("pot $uid planted without a seed");
                (int) $np['cycles'] >= (int) $npl['cycle'] + 1 || $fail("pot $uid cycle count");
                $max = SkyRules::potMax((string) $np['pot'], (int) $np['tier'], (int) $np['stars']);
                foreach (['time', 'xp', 'bug', 'coin'] as $k) {
                    (int) $npl['stats'][$k] <= $max[$k] || $fail("pot $uid stats above what it gives");
                }
            }
            $min = (int) $npl['plantedAt'] + $this->minReady(SkyRules::plantGrowMs($grow, (int) $npl['stats']['time']), $this->skyFriendWaters((string) $uid, (int) $npl['cycle']));
            (int) $npl['readyAt'] + self::SLACK_MS >= $min || $fail("pot $uid ripens too soon");
            $oldCaught = $same ? (array) ($opl['caught'] ?? []) : [];
            foreach ((array) ($npl['caught'] ?? []) as $c) {
                (in_array($c, $oldCaught, true) || isset($ev['bugs']["$uid:{$npl['cycle']}:$c"])) || $fail("pot $uid bug caught without its entry");
            }
        }

        // Machines: a job that started in this save spent its recipe's inputs; one that left paid out.
        $dew = 0;
        foreach ($S['machines'] as $m => $def) {
            $was = [];
            foreach ((array) ($old['jobs'][$m] ?? []) as $j) {
                $was[(int) $j['startedAt']] = $j;
            }
            $now = [];
            foreach ((array) ($new['jobs'][$m] ?? []) as $j) {
                $t = (int) $j['startedAt'];
                $now[$t] = true;
                $r = $S['recipes'][$j['recipe']];
                ($r['machine'] === $m && (int) $j['readyAt'] === $t + (int) $r['ms']) || $fail("machine $m timer");
                if (isset($was[$t])) {
                    $was[$t]['recipe'] === $j['recipe'] || $fail("machine $m job rewritten");
                    continue;
                }
                $newFloors >= (int) $def['floor'] && $newFloors >= (int) $r['floor'] || $fail("machine $m not open");
                $this->skyJobRecipe(['old' => []] + $ctx, $ev, $m, $t) === $j['recipe'] || $fail("machine $m started without its inputs");
                $dew += $r['perDay'] !== null ? 1 : 0;
            }
            foreach (array_keys($was) as $t) {
                if (!isset($now[$t])) {
                    (isset($ev['jobOut']["$m:$t"]) || $this->countClaims("sky:job:$m:$t:out") > 0) || $fail("machine $m job vanished");
                }
            }
        }
        if ($dew > 0 && $this->counted(self::dayKey('skydew', $ctx['serverMs'])) + $dew > (int) $S['dewPerDay']) {
            $fail('more dew than a day allows');
        }
        foreach ((array) ($new['events'] ?? []) as $x) {
            (in_array($x, (array) ($old['events'] ?? []), true) || isset($ev['event'][$x])) || $fail("event $x pots without their entries");
        }
        foreach ((array) ($new['sets'] ?? []) as $s) {
            (in_array($s, (array) ($old['sets'] ?? []), true) || isset($ev['set'][$s])) || $fail("set $s without its reward");
        }
        $this->skyDew = $dew;
    }

    /** Friends' waterings of one planting (Friends::skyWater allows one; counted, not assumed). */
    private function skyFriendWaters(string $uid, int $cycle): int
    {
        $st = $this->db->prepare("SELECT COUNT(*) FROM farm_events WHERE to_user = ? AND type = 'skywater' AND crop = ? AND cycle = ?");
        $st->execute([$this->user, $uid, $cycle]);
        return (int) $st->fetchColumn();
    }

    /** Dew started in this save (for the daily tally). */
    private int $skyDew = 0;

    /** Every time in the sky branch moves with the device clock (see shiftTimes). */
    private static function shiftSky(array $sky, int $delta): array
    {
        $move = fn ($v) => is_int($v) ? $v + $delta : $v;
        foreach ((array) ($sky['pots'] ?? []) as $uid => $p) {
            if (is_array($p['plant'] ?? null)) {
                foreach (['plantedAt', 'readyAt', 'wateredAt'] as $k) {
                    $sky['pots'][$uid]['plant'][$k] = $move($p['plant'][$k] ?? null);
                }
            }
        }
        foreach ((array) ($sky['jobs'] ?? []) as $m => $list) {
            foreach ((array) $list as $i => $j) {
                if (is_array($j)) {
                    $sky['jobs'][$m][$i]['startedAt'] = $move($j['startedAt'] ?? null);
                    $sky['jobs'][$m][$i]['readyAt'] = $move($j['readyAt'] ?? null);
                }
            }
        }
        return $sky;
    }
}

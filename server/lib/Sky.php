<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/Account.php';
require_once __DIR__ . '/FairPlay.php';
require_once __DIR__ . '/ProgressGuard.php';
require_once __DIR__ . '/RateLimit.php';
require_once __DIR__ . '/Settings.php';
require_once __DIR__ . '/SkyRules.php';

/*
 * Vườn Mây on the server (plans/vuon-may.md §0.2):
 *   GET  /account/sky            whether it is on (Settings → sky.enabled), for anyone
 *   GET  /account/sky/bugs       the bugs of checks already reached, for the stored plantings
 *   POST /account/sky/star-up    a pot's next star, rolled here
 *   POST /account/sky/tier-up    a ★5 pot up a tier (a gold beetle and a ★0 pot of its set)
 *
 * Star-up and tier-up change the stored garden themselves, like rebaseProgress: the request
 * names the version it saw (409 when it is stale) and an opId; the same opId again returns the
 * garden as it is, never a second roll. The new ledger entries are the server's own (sky:star,
 * sky:tier); a client save may never add such an entry (SkyGuard).
 */
final class Sky
{
    public function __construct(private PDO $db, private Account $account)
    {
    }

    public function status(): array
    {
        $s = Settings::get($this->db, 'sky');
        return ['enabled' => $s['enabled'], 'level' => (int) (SkyRules::R()['level'] ?? 12)];
    }

    private function requireOn(): void
    {
        if (!Settings::get($this->db, 'sky')['enabled']) {
            throw new HttpError(403, __t('sky.off'), ['code' => 'SKY_OFF']);
        }
    }

    private function row(int $uid, bool $lock = false): ?array
    {
        $st = $this->db->prepare('SELECT * FROM user_progress WHERE user_id = ?' . ($lock ? for_update($this->db) : ''));
        $st->execute([$uid]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /** The bugs of every check reached so far (server time) for the stored plantings. */
    public function bugs(): array
    {
        $this->requireOn();
        $u = $this->account->requireUser();
        $uid = (int) $u['id'];
        (new RateLimit($this->db))->hit(['skybugs:' . $uid => [240, 3600]], __t('sky.busy'));
        $row = $this->row($uid);
        $data = $row ? json_decode((string) $row['data'], true) : null;
        $sky = is_array($data['sky'] ?? null) ? $data['sky'] : null;
        $out = [];
        if ($sky === null) {
            return ['bugs' => $out, 'serverNow' => (int) floor(microtime(true) * 1000)];
        }
        $R = ProgressGuard::rules();
        $offset = (int) ($row['client_offset'] ?? 0);
        $serverNow = (int) floor(microtime(true) * 1000);
        foreach ((array) ($sky['pots'] ?? []) as $potUid => $pot) {
            $pl = is_array($pot['plant'] ?? null) ? $pot['plant'] : null;
            if ($pl === null) {
                continue;
            }
            $grow = SkyRules::growMs((array) $pl['seed'], $R);
            if ($grow === null) {
                continue;
            }
            $g = SkyRules::plantGrowMs($grow, (int) ($pl['stats']['time'] ?? 0));
            for ($i = 0; $i < 3; $i++) {
                $checkAt = SkyRules::checkAt((int) $pl['plantedAt'], $g, $i);
                if ($checkAt - $offset > $serverNow || $checkAt >= (int) $pl['readyAt']) {
                    continue;
                }
                $out[] = [
                    'uid' => (string) $potUid,
                    'cycle' => (int) $pl['cycle'],
                    'stage' => $i,
                    'bug' => SkyRules::rollBug($uid, (string) $potUid, (int) $pl['cycle'], $i, (int) ($pl['stats']['bug'] ?? 0), $checkAt - $offset, ($sky['firstPot'] ?? null) === $potUid),
                ];
            }
        }
        return ['bugs' => $out, 'serverNow' => $serverNow];
    }

    public function starUp(array $body): array
    {
        return $this->operate($body, function (array &$data, array &$sky, array &$pot, int $at, string $op) use ($body): array {
            $S = SkyRules::R();
            $stars = (int) $pot['stars'];
            $step = $S['starSteps'][$stars] ?? null;
            if ($step === null) {
                throw new HttpError(422, __t('sky.maxStars'), ['code' => 'INVALID_STATE']);
            }
            $clover = ($body['clover'] ?? false) === true;
            $classes = ['common' => [], 'rare' => [], 'firefly' => []];
            foreach ($S['bugOrder'] as $b) {
                $cls = $S['bugs'][$b]['cls'];
                if (isset($classes[$cls])) {
                    $classes[$cls][] = $b;
                }
            }
            $have = fn (string $cls) => array_sum(array_map(fn ($b) => (int) ($sky['bugs'][$b] ?? 0), $classes[$cls]));
            if ($have('common') < (int) $step['common'] || $have('rare') < (int) $step['rare'] || $have('firefly') < (int) $step['firefly']
                || (int) ($data['coins'] ?? 0) < (int) $step['coins'] || ($clover && (int) ($sky['items']['clover'] ?? 0) < 1)) {
                throw new HttpError(422, __t('sky.notEnough'), ['code' => 'INSUFFICIENT_RESOURCES']);
            }
            $L = $S['starLuck'];
            $tries = (int) $pot['tries'] + 1;
            $rate = min(10000, (int) $step['rateBp'] + (int) $pot['luck'] + ($clover ? (int) $L['cloverBp'] : 0));
            $ok = $tries >= (int) $L['sureTry'] || random_int(0, 9999) < $rate;
            $key = "sky:star:{$pot['uid']}:$stars:$op";
            // Bugs paid: all on success, half (rounded up) of each class on a failure.
            foreach (['common', 'rare', 'firefly'] as $cls) {
                $need = (int) $step[$cls];
                $pay = $ok ? $need : (int) ceil($need / 2);
                foreach ($classes[$cls] as $b) {
                    if ($pay <= 0) {
                        break;
                    }
                    $take = min($pay, (int) ($sky['bugs'][$b] ?? 0));
                    if ($take > 0) {
                        $sky['bugs'][$b] = (int) $sky['bugs'][$b] - $take;
                        self::book($data, "$key:$b", "bug:$b", -$take, $at, (int) $sky['bugs'][$b]);
                        $pay -= $take;
                    }
                }
            }
            if ($clover) {
                $sky['items']['clover'] = (int) $sky['items']['clover'] - 1;
                self::book($data, "$key:clover", 'skyitem:clover', -1, $at, (int) $sky['items']['clover']);
            }
            $jumped = false;
            if ($ok) {
                $data['coins'] = (int) $data['coins'] - (int) $step['coins'];
                self::book($data, "$key:coin", 'coin', -(int) $step['coins'], $at, (int) $data['coins']);
                $jumped = $stars + 2 <= count($S['starSteps']) && random_int(0, 9999) < (int) $L['jumpBp'];
                $pot['stars'] = $stars + ($jumped ? 2 : 1);
                $pot['luck'] = 0;
                $pot['tries'] = 0;
            } else {
                $pot['luck'] = min(10000, (int) $pot['luck'] + (int) $L['failBp']);
                $pot['tries'] = $tries;
            }
            return ['result' => $ok ? 'success' : 'fail', 'jumped' => $jumped, 'stars' => (int) $pot['stars']];
        });
    }

    public function tierUp(array $body): array
    {
        return $this->operate($body, function (array &$data, array &$sky, array &$pot, int $at, string $op) use ($body): array {
            $S = SkyRules::R();
            $feedUid = (string) ($body['feed'] ?? '');
            $feed = $sky['pots'][$feedUid] ?? null;
            $set = $S['pots'][$pot['pot']]['set'];
            if ((int) $pot['stars'] < count($S['starSteps']) || (int) $pot['tier'] >= (int) $S['maxTier']
                || !is_array($feed) || $feedUid === $pot['uid'] || $S['pots'][$feed['pot']]['set'] !== $set
                || (int) $feed['stars'] !== 0 || is_array($feed['plant'] ?? null)) {
                throw new HttpError(422, __t('sky.cannotTierUp'), ['code' => 'INVALID_STATE']);
            }
            if ((int) ($sky['bugs']['goldbeetle'] ?? 0) < (int) $S['tierUp']['goldbeetle']) {
                throw new HttpError(422, __t('sky.notEnough'), ['code' => 'INSUFFICIENT_RESOURCES']);
            }
            $key = "sky:tier:{$pot['uid']}:{$pot['tier']}:$op";
            $sky['bugs']['goldbeetle'] = (int) $sky['bugs']['goldbeetle'] - (int) $S['tierUp']['goldbeetle'];
            self::book($data, "$key:gold", 'bug:goldbeetle', -(int) $S['tierUp']['goldbeetle'], $at, (int) $sky['bugs']['goldbeetle']);
            unset($sky['pots'][$feedUid]);
            foreach ($sky['slots'] as $f => $row) {
                foreach ($row as $i => $u) {
                    if ($u === $feedUid) {
                        $sky['slots'][$f][$i] = null;
                    }
                }
            }
            $left = count(array_filter($sky['pots'], fn ($p) => $p['pot'] === $feed['pot']));
            self::book($data, "$key:pot", 'pot:' . $feed['pot'], -1, $at, $left);
            $pot['tier'] = (int) $pot['tier'] + 1;
            $pot['stars'] = 0;
            $pot['luck'] = 0;
            $pot['tries'] = 0;
            return ['result' => 'success', 'tier' => (int) $pot['tier']];
        });
    }

    /**
     * One star or tier operation on the stored garden, in a transaction: checks the version and
     * the opId, runs `$fn` on the pot, writes the garden back (version + 1).
     */
    private function operate(array $body, callable $fn): array
    {
        $this->requireOn();
        $u = $this->account->requireUser();
        $uid = (int) $u['id'];
        $potUid = (string) ($body['uid'] ?? '');
        $op = (string) ($body['opId'] ?? '');
        $base = (int) ($body['baseVersion'] ?? -1);
        $clientNow = is_numeric($body['clientNow'] ?? null) ? (int) $body['clientNow'] : null;
        if (!preg_match('/^[a-z_]+\.\d{1,6}$/', $potUid) || !preg_match('/^[A-Za-z0-9-]{8,40}$/', $op) || $clientNow === null) {
            throw new HttpError(400, __t('account.badRequest'), ['code' => 'INVALID_STATE']);
        }
        FairPlay::requireNotBanned($this->db, $uid);
        (new RateLimit($this->db))->hit(['skyop:' . $uid => [120, 3600]], __t('sky.busy'));
        $out = db_tx($this->db, function () use ($uid, $potUid, $op, $base, $clientNow, $fn) {
            $claim = $this->db->prepare('SELECT 1 FROM progress_claims WHERE user_id = ? AND claim_key = ?');
            $claim->execute([$uid, "skyop:$op"]);
            $row = $this->row($uid, true);
            if (!$row) {
                throw new HttpError(409, __t('account.progressConflict'), ['code' => 'STALE_VERSION', 'version' => 0]);
            }
            if ($claim->fetchColumn()) {
                // The same operation again (a retry after a lost answer): the garden as it is now.
                return ['result' => 'repeat', 'data' => json_decode((string) $row['data'], true), 'version' => (int) $row['version']];
            }
            if ((int) $row['version'] !== $base) {
                throw new HttpError(409, __t('account.progressConflict'), ['code' => 'STALE_VERSION', 'version' => (int) $row['version']]);
            }
            $data = json_decode((string) $row['data'], true);
            if (!is_array($data) || !is_array($data['sky']['pots'][$potUid] ?? null)) {
                throw new HttpError(422, __t('sky.noPot'), ['code' => 'INVALID_STATE']);
            }
            if (ProgressGuard::level((int) ($data['xp'] ?? 0)) < (int) SkyRules::R()['level']) {
                throw new HttpError(422, __t('sky.locked'), ['code' => 'INVALID_STATE']);
            }
            $sky = $data['sky'];
            $pot = $sky['pots'][$potUid];
            // Entries are dated on the device's clock, like the game's own.
            $at = max($clientNow, self::lastAt($data) + 1);
            $result = $fn($data, $sky, $pot, $at, $op);
            $sky['pots'][$potUid] = $pot;
            $data['sky'] = $sky;
            $json = json_encode($data, JSON_UNESCAPED_UNICODE);
            $this->db->prepare('UPDATE user_progress SET data = ?, version = version + 1, updated_at = ? WHERE user_id = ? AND version = ?')
                ->execute([$json, time(), $uid, $base]);
            $sqlite = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
            $this->db->prepare(($sqlite ? 'INSERT OR IGNORE' : 'INSERT IGNORE') . ' INTO progress_claims (user_id, claim_key, created_at) VALUES (?, ?, ?)')
                ->execute([$uid, "skyop:$op", time()]);
            return $result + ['data' => $data, 'version' => $base + 1];
        });
        return $out + ['serverNow' => (int) floor(microtime(true) * 1000)];
    }

    private static function lastAt(array $data): int
    {
        $ledger = (array) ($data['ledger'] ?? []);
        $last = end($ledger);
        return is_array($last) ? (int) ($last['at'] ?? 0) : 0;
    }

    /** Appends a server-made entry to the garden's ledger (kept to its length). */
    private static function book(array &$data, string $key, string $resource, int $delta, int $at, int $after): void
    {
        $data['ledger'][] = ['key' => $key, 'resource' => $resource, 'delta' => $delta, 'balanceAfter' => $after, 'reason' => 'sky:server', 'at' => $at];
        if (count($data['ledger']) > ProgressGuard::MAX_LEDGER) {
            $data['ledger'] = array_slice($data['ledger'], -ProgressGuard::MAX_LEDGER);
        }
    }
}

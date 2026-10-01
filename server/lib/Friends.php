<?php

declare(strict_types=1);

require_once __DIR__ . '/Account.php';

/*
 * Khu vườn bạn bè. Friends find each other by a 6-character garden code (no
 * emails are ever shown), visit each other's island read-only, water one
 * growing plot per friend per day, and get a small daily gift from Cô Ba.
 *
 * The server only records events; each guest's own client applies them to its
 * progress once (ledger key friend:<id>), so progress stays client-owned.
 */
final class Friends
{
    public const MAX_FRIENDS = 30;
    public const HELPS_PER_DAY = 5;
    private const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    /** Seeds Cô Ba may gift: the crops every garden has from day one. */
    private const GIFT_CROPS = ['rice', 'herbs', 'chili', 'scallion', 'bean', 'tomato'];
    private const EVENT_TYPES = ['water', 'gift', 'helped'];

    public function __construct(private PDO $db, private Account $account)
    {
    }

    /** Vietnam's calendar day — limits reset at local midnight. */
    public static function day(?int $now = null): string
    {
        return gmdate('Y-m-d', ($now ?? time()) + 7 * 3600);
    }

    // ——— My garden profile ———

    public function profile(): array
    {
        $u = $this->account->requireUser();
        return $this->publicProfile($this->ensureProfile((int) $u['id']));
    }

    public function rename(array $body): array
    {
        $u = $this->account->requireUser();
        $name = self::cleanName((string) ($body['name'] ?? ''));
        $this->ensureProfile((int) $u['id']);
        $this->db->prepare('UPDATE garden_profiles SET garden_name = ? WHERE user_id = ?')->execute([$name, $u['id']]);
        return $this->publicProfile($this->ensureProfile((int) $u['id']));
    }

    // ——— Friends ———

    public function list(): array
    {
        $u = $this->account->requireUser();
        $me = (int) $u['id'];
        $mine = $this->ensureProfile($me);
        $nowMs = time() * 1000;
        $day = self::day();
        $rows = $this->all(
            'SELECT g.user_id, g.friend_code, g.garden_name, p.data, p.updated_at
             FROM friendships f
             JOIN garden_profiles g ON g.user_id = f.friend_id
             LEFT JOIN user_progress p ON p.user_id = f.friend_id
             WHERE f.user_id = ?
             ORDER BY f.created_at',
            [$me],
        );
        $helped = array_map('intval', array_column($this->all(
            "SELECT to_user FROM farm_events WHERE from_user = ? AND type = 'water' AND day = ?",
            [$me, $day],
        ), 'to_user'));
        $friends = array_map(function (array $r) use ($helped, $nowMs) {
            $data = self::decode($r['data']);
            $plots = self::plots($data);
            return [
                'code' => $r['friend_code'],
                'name' => self::displayName($r['garden_name'], $r['friend_code']),
                'xp' => self::xp($data),
                'level' => self::level(self::xp($data)),
                'ready' => count(array_filter($plots, fn ($p) => $p['crop'] !== null && $p['readyAt'] !== null && $p['readyAt'] <= $nowMs)),
                'growing' => count(array_filter($plots, fn ($p) => self::canWater($p, $nowMs))),
                'helpedToday' => in_array((int) $r['user_id'], $helped, true),
                'updatedAt' => $r['updated_at'] !== null ? (int) $r['updated_at'] : null,
            ];
        }, $rows);
        $myData = self::decode($this->one('SELECT data FROM user_progress WHERE user_id = ?', [$me])['data'] ?? null);
        return [
            'me' => $this->publicProfile($mine) + ['xp' => self::xp($myData), 'level' => self::level(self::xp($myData))],
            'friends' => $friends,
            'helpsLeft' => max(0, self::HELPS_PER_DAY - count($helped)),
            'max' => self::MAX_FRIENDS,
        ];
    }

    /** Friendship is mutual: adding a code links both gardens at once. */
    public function add(array $body): array
    {
        $u = $this->account->requireUser();
        $me = (int) $u['id'];
        $this->ensureProfile($me);
        $code = self::normaliseCode((string) ($body['code'] ?? ''));
        $friend = $this->one('SELECT user_id FROM garden_profiles WHERE friend_code = ?', [$code]);
        if (!$friend) {
            throw new HttpError(404, __t('friends.notFound'));
        }
        $fid = (int) $friend['user_id'];
        if ($fid === $me) {
            throw new HttpError(422, __t('friends.ownCode'));
        }
        if ($this->one('SELECT 1 AS x FROM friendships WHERE user_id = ? AND friend_id = ?', [$me, $fid])) {
            return $this->list();
        }
        foreach ([$me, $fid] as $who) {
            if ($this->count('SELECT COUNT(*) FROM friendships WHERE user_id = ?', [$who]) >= self::MAX_FRIENDS) {
                throw new HttpError(422, $who === $me
                    ? __t('friends.tooManyFriends', ['max' => self::MAX_FRIENDS])
                    : __t('friends.friendFull'));
            }
        }
        $now = time();
        $ins = $this->db->prepare('INSERT INTO friendships (user_id, friend_id, created_at) VALUES (?, ?, ?)');
        $ins->execute([$me, $fid, $now]);
        $ins->execute([$fid, $me, $now]);
        return $this->list();
    }

    public function remove(string $code): array
    {
        $u = $this->account->requireUser();
        $me = (int) $u['id'];
        $friend = $this->one('SELECT user_id FROM garden_profiles WHERE friend_code = ?', [self::normaliseCode($code)]);
        if ($friend) {
            $del = $this->db->prepare('DELETE FROM friendships WHERE user_id = ? AND friend_id = ?');
            $del->execute([$me, $friend['user_id']]);
            $del->execute([$friend['user_id'], $me]);
        }
        return $this->list();
    }

    /** A friend's island, read-only: plots, decorations, animals — nothing personal. */
    public function visit(string $code): array
    {
        $u = $this->account->requireUser();
        $me = (int) $u['id'];
        $f = $this->friendByCode($me, $code);
        $data = self::decode($f['data']);
        $day = self::day();
        $helpedToday = (bool) $this->one(
            'SELECT 1 AS x FROM farm_events WHERE uniq = ?',
            ['water:' . $me . ':' . $f['user_id'] . ':' . $day],
        );
        $helpsUsed = $this->count("SELECT COUNT(*) FROM farm_events WHERE from_user = ? AND type = 'water' AND day = ?", [$me, $day]);
        return [
            'code' => $f['friend_code'],
            'name' => self::displayName($f['garden_name'], $f['friend_code']),
            'xp' => self::xp($data),
            'level' => self::level(self::xp($data)),
            'plots' => self::plots($data),
            'decor' => array_values(array_filter((array) ($data['decor'] ?? []), 'is_string')),
            'decorLayout' => is_array($data['decorLayout'] ?? null) ? $data['decorLayout'] : new stdClass(),
            'animals' => is_array($data['animals'] ?? null) ? $data['animals'] : new stdClass(),
            'updatedAt' => $f['updated_at'] !== null ? (int) $f['updated_at'] : null,
            'helpedToday' => $helpedToday,
            'helpsLeft' => max(0, self::HELPS_PER_DAY - $helpsUsed),
        ];
    }

    /** Water one growing plot in a friend's garden: once per friend per day, five friends a day. */
    public function water(string $code, array $body): array
    {
        $u = $this->account->requireUser();
        $me = (int) $u['id'];
        $f = $this->friendByCode($me, $code);
        $fid = (int) $f['user_id'];
        $plotId = (int) ($body['plotId'] ?? 0);
        $plot = null;
        foreach (self::plots(self::decode($f['data'])) as $p) {
            if ($p['id'] === $plotId) {
                $plot = $p;
            }
        }
        $now = time();
        if (!$plot || !self::canWater($plot, $now * 1000)) {
            throw new HttpError(422, __t('friends.noWaterNeeded'));
        }
        $day = self::day($now);
        if ($this->one('SELECT 1 AS x FROM farm_events WHERE uniq = ?', ["water:$me:$fid:$day"])) {
            throw new HttpError(429, __t('friends.alreadyWatered'));
        }
        if ($this->count("SELECT COUNT(*) FROM farm_events WHERE from_user = ? AND type = 'water' AND day = ?", [$me, $day]) >= self::HELPS_PER_DAY) {
            throw new HttpError(429, __t('friends.helpLimit', ['max' => self::HELPS_PER_DAY]));
        }
        $this->db->beginTransaction();
        try {
            $this->insertEvent($fid, $me, 'water', $plotId, $plot['crop'], $day, "water:$me:$fid:$day", $now);
            $this->insertEvent($me, $fid, 'helped', $plotId, $plot['crop'], $day, "helped:$me:$fid:$day", $now);
            $this->db->commit();
        } catch (PDOException $e) {
            $this->db->rollBack();
            // The unique key caught a double tap.
            throw new HttpError(429, __t('friends.alreadyWatered'));
        }
        return ['ok' => true, 'plotId' => $plotId] + $this->visit($code);
    }

    // ——— Events for me ———

    /** Undelivered events, plus today's gift from Cô Ba (created on first ask of the day). */
    public function events(): array
    {
        $u = $this->account->requireUser();
        $me = (int) $u['id'];
        $now = time();
        $day = self::day($now);
        $crop = self::GIFT_CROPS[crc32($day . ':' . $me) % count(self::GIFT_CROPS)];
        try {
            $this->insertEvent($me, null, 'gift', null, $crop, $day, "gift:$me:$day", $now);
        } catch (PDOException) {
            // Already gifted today.
        }
        $rows = $this->all(
            'SELECT e.id, e.type, e.plot_id, e.crop, e.created_at, g.friend_code, g.garden_name
             FROM farm_events e LEFT JOIN garden_profiles g ON g.user_id = e.from_user
             WHERE e.to_user = ? AND e.delivered_at IS NULL
             ORDER BY e.id LIMIT 50',
            [$me],
        );
        return ['events' => array_map(fn ($r) => [
            'id' => 'e' . $r['id'],
            'type' => $r['type'],
            'plotId' => $r['plot_id'] !== null ? (int) $r['plot_id'] : null,
            'crop' => $r['crop'],
            'from' => $r['friend_code'] !== null ? self::displayName($r['garden_name'], $r['friend_code']) : 'Cô Ba',
            'at' => (int) $r['created_at'],
        ], $rows)];
    }

    /** The client applied these (idempotently); stop sending them. */
    public function ack(array $body): array
    {
        $u = $this->account->requireUser();
        $ids = array_slice(array_values(array_filter(array_map(
            fn ($id) => (int) preg_replace('/^e/', '', (string) $id),
            (array) ($body['ids'] ?? []),
        ))), 0, 100);
        if ($ids) {
            $marks = implode(',', array_fill(0, count($ids), '?'));
            $this->db->prepare("UPDATE farm_events SET delivered_at = ? WHERE to_user = ? AND id IN ($marks)")
                ->execute([time(), $u['id'], ...$ids]);
        }
        return ['ok' => true, 'acked' => count($ids)];
    }

    // ——— Helpers ———

    private function insertEvent(int $to, ?int $from, string $type, ?int $plotId, ?string $crop, string $day, string $uniq, int $now): void
    {
        if (!in_array($type, self::EVENT_TYPES, true)) {
            throw new InvalidArgumentException($type);
        }
        $this->db->prepare(
            'INSERT INTO farm_events (to_user, from_user, type, plot_id, crop, day, uniq, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([$to, $from, $type, $plotId, $crop, $day, $uniq, $now]);
    }

    private function friendByCode(int $me, string $code): array
    {
        $f = $this->one(
            'SELECT g.user_id, g.friend_code, g.garden_name, p.data, p.updated_at
             FROM garden_profiles g
             JOIN friendships f ON f.friend_id = g.user_id AND f.user_id = ?
             LEFT JOIN user_progress p ON p.user_id = g.user_id
             WHERE g.friend_code = ?',
            [$me, self::normaliseCode($code)],
        );
        return $f ?? throw new HttpError(404, __t('friends.notFriend'));
    }

    private function ensureProfile(int $userId): array
    {
        $row = $this->one('SELECT * FROM garden_profiles WHERE user_id = ?', [$userId]);
        if ($row) {
            return $row;
        }
        for ($i = 0; $i < 8; $i++) {
            $code = '';
            for ($k = 0; $k < 6; $k++) {
                $code .= self::CODE_ALPHABET[random_int(0, strlen(self::CODE_ALPHABET) - 1)];
            }
            try {
                $this->db->prepare('INSERT INTO garden_profiles (user_id, friend_code, garden_name, created_at) VALUES (?, ?, ?, ?)')
                    ->execute([$userId, $code, '', time()]);
                break;
            } catch (PDOException) {
                // Code taken (or a parallel request created the profile): try again / re-read.
                if ($this->one('SELECT 1 AS x FROM garden_profiles WHERE user_id = ?', [$userId])) {
                    break;
                }
            }
        }
        return $this->one('SELECT * FROM garden_profiles WHERE user_id = ?', [$userId])
            ?? throw new HttpError(500, __t('friends.codeFailed'));
    }

    private function publicProfile(array $p): array
    {
        return ['code' => $p['friend_code'], 'name' => $p['garden_name'], 'displayName' => self::displayName($p['garden_name'], $p['friend_code'])];
    }

    public static function normaliseCode(string $code): string
    {
        $code = strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $code));
        if (!preg_match('/^[' . self::CODE_ALPHABET . ']{6}$/', $code)) {
            throw new HttpError(422, __t('friends.badCode'));
        }
        return $code;
    }

    public static function cleanName(string $name): string
    {
        $name = trim((string) preg_replace('/\s+/u', ' ', strip_tags($name)));
        if (mb_strlen($name, 'UTF-8') > 40) {
            throw new HttpError(422, __t('friends.nameTooLong'));
        }
        return $name;
    }

    private static function displayName(string $name, string $code): string
    {
        return $name !== '' ? $name : __t('friends.defaultName', ['code' => $code]);
    }

    private static function decode(?string $json): array
    {
        $d = $json ? json_decode($json, true) : null;
        return is_array($d) ? $d : [];
    }

    private static function xp(array $data): int
    {
        return max(0, (int) ($data['xp'] ?? 0));
    }

    private static function level(int $xp): int
    {
        return intdiv($xp, 100) + 1;
    }

    /** Plots as stored by the client (times in ms), cleaned to the fields a visitor needs. */
    private static function plots(array $data): array
    {
        $out = [];
        foreach ((array) ($data['plots'] ?? []) as $p) {
            if (!is_array($p) || !isset($p['id'])) {
                continue;
            }
            $num = fn ($v) => is_numeric($v) ? (int) $v : null;
            $out[] = [
                'id' => (int) $p['id'],
                'crop' => is_string($p['crop'] ?? null) ? $p['crop'] : null,
                'plantedAt' => $num($p['plantedAt'] ?? null),
                'readyAt' => $num($p['readyAt'] ?? null),
                'wateredAt' => $num($p['wateredAt'] ?? null),
            ];
        }
        return array_slice($out, 0, 12);
    }

    /** Growing and not watered within the last hour (same rule as the guest's own can). */
    private static function canWater(array $p, int $nowMs): bool
    {
        return $p['crop'] !== null && $p['readyAt'] !== null && $p['readyAt'] > $nowMs
            && ($p['wateredAt'] === null || $nowMs - $p['wateredAt'] >= 3600 * 1000);
    }

    private function one(string $sql, array $args): ?array
    {
        $st = $this->db->prepare($sql);
        $st->execute($args);
        $row = $st->fetch();
        return $row ?: null;
    }

    private function all(string $sql, array $args): array
    {
        $st = $this->db->prepare($sql);
        $st->execute($args);
        return $st->fetchAll();
    }

    private function count(string $sql, array $args): int
    {
        $st = $this->db->prepare($sql);
        $st->execute($args);
        return (int) $st->fetchColumn();
    }
}

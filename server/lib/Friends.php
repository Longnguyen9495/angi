<?php

declare(strict_types=1);

require_once __DIR__ . '/Account.php';

/*
 * Khu vườn bạn bè. Friends find each other by a 6-character garden code (no
 * emails are ever shown), visit each other's island read-only, water one
 * growing plot per friend per day, pick one from a friend's long-ripe plot,
 * send each other seeds, say thanks, and get a small daily gift from Cô Ba.
 *
 * The server only records events; each guest's own client applies them to its
 * progress once (ledger key friend:<id>), so progress stays client-owned.
 */
final class Friends
{
    public const MAX_FRIENDS = 30;
    public const HELPS_PER_DAY = 5;
    /** Picks from friends' gardens per day (one per friend), and how long a plot must be ripe first. */
    public const STEALS_PER_DAY = 3;
    public const STEAL_GRACE_MS = 30 * 60 * 1000;
    /** Seeds sent to friends per day (one per friend). */
    public const GIFTS_PER_DAY = 3;
    /** How far back the friends' news goes. */
    private const FEED_DAYS = 14;
    private const CROPS = ['rice', 'herbs', 'chili', 'scallion', 'bean', 'tomato', 'lemongrass', 'garlic', 'cucumber', 'lime'];
    private const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    /** Seeds Cô Ba may gift: the crops every garden has from day one. */
    private const GIFT_CROPS = ['rice', 'herbs', 'chili', 'scallion', 'bean', 'tomato'];
    private const EVENT_TYPES = ['water', 'gift', 'helped', 'stolen', 'stole', 'present', 'thanks'];

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
        $stole = $this->idsTo($me, 'stole', $day);
        $gifted = $this->idsFrom($me, 'present', $day);
        $friends = array_map(function (array $r) use ($helped, $nowMs, $stole, $gifted) {
            $data = self::decode($r['data']);
            $plots = self::plots($data);
            $fid = (int) $r['user_id'];
            $picked = $this->stolenPlots($fid);
            return [
                'code' => $r['friend_code'],
                'name' => self::displayName($r['garden_name'], $r['friend_code']),
                'xp' => self::xp($data),
                'level' => self::level(self::xp($data)),
                'ready' => count(array_filter($plots, fn ($p) => $p['crop'] !== null && $p['readyAt'] !== null && $p['readyAt'] <= $nowMs)),
                'growing' => count(array_filter($plots, fn ($p) => self::canWater($p, $nowMs))),
                'helpedToday' => in_array($fid, $helped, true),
                'stealable' => count(array_filter($plots, fn ($p) => self::canSteal($p, $nowMs, $picked))),
                'stoleToday' => in_array($fid, $stole, true),
                'giftedToday' => in_array($fid, $gifted, true),
                'updatedAt' => $r['updated_at'] !== null ? (int) $r['updated_at'] : null,
            ];
        }, $rows);
        $myData = self::decode($this->one('SELECT data FROM user_progress WHERE user_id = ?', [$me])['data'] ?? null);
        return [
            'me' => $this->publicProfile($mine) + ['xp' => self::xp($myData), 'level' => self::level(self::xp($myData))],
            'friends' => $friends,
            'helpsLeft' => max(0, self::HELPS_PER_DAY - count($helped)),
            'stealsLeft' => max(0, self::STEALS_PER_DAY - count($stole)),
            'giftsLeft' => max(0, self::GIFTS_PER_DAY - count($gifted)),
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
        $fid = (int) $f['user_id'];
        $picked = $this->stolenPlots($fid);
        $nowMs = time() * 1000;
        $stole = $this->idsTo($me, 'stole', $day);
        $gifted = $this->idsFrom($me, 'present', $day);
        $plots = array_map(fn ($p) => $p + [
            'stolen' => isset($picked[$p['id'] . ':' . $p['plantedAt']]),
            'stealable' => self::canSteal($p, $nowMs, $picked),
        ], self::plots($data));
        return [
            'code' => $f['friend_code'],
            'name' => self::displayName($f['garden_name'], $f['friend_code']),
            'xp' => self::xp($data),
            'level' => self::level(self::xp($data)),
            'plots' => $plots,
            'decor' => array_values(array_filter((array) ($data['decor'] ?? []), 'is_string')),
            'decorLayout' => is_array($data['decorLayout'] ?? null) ? $data['decorLayout'] : new stdClass(),
            'animals' => is_array($data['animals'] ?? null) ? $data['animals'] : new stdClass(),
            'updatedAt' => $f['updated_at'] !== null ? (int) $f['updated_at'] : null,
            'helpedToday' => $helpedToday,
            'helpsLeft' => max(0, self::HELPS_PER_DAY - $helpsUsed),
            'stoleToday' => in_array($fid, $stole, true),
            'stealsLeft' => max(0, self::STEALS_PER_DAY - count($stole)),
            'giftedToday' => in_array($fid, $gifted, true),
            'giftsLeft' => max(0, self::GIFTS_PER_DAY - count($gifted)),
            'stealGraceMin' => intdiv(self::STEAL_GRACE_MS, 60000),
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

    /**
     * Pick one from a friend's plot that has been ripe for a while. Each crop can be picked
     * once (by anyone); a picker gets one pick per friend and three a day. The owner keeps
     * the crop: their client only drops that plot's harvest XP when it sees the event.
     */
    public function steal(string $code, array $body): array
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
        $picked = $this->stolenPlots($fid);
        if (!$plot || !self::canSteal($plot, $now * 1000, [])) {
            throw new HttpError(422, __t('friends.notRipe', ['minutes' => intdiv(self::STEAL_GRACE_MS, 60000)]));
        }
        if (isset($picked[$plot['id'] . ':' . $plot['plantedAt']])) {
            throw new HttpError(429, __t('friends.alreadyPicked'));
        }
        $day = self::day($now);
        if ($this->one('SELECT 1 AS x FROM farm_events WHERE uniq = ?', ["stole:$me:$fid:$day"])) {
            throw new HttpError(429, __t('friends.pickedToday'));
        }
        if (count($this->idsTo($me, 'stole', $day)) >= self::STEALS_PER_DAY) {
            throw new HttpError(429, __t('friends.pickLimit', ['max' => self::STEALS_PER_DAY]));
        }
        $this->db->beginTransaction();
        try {
            $this->insertEvent($fid, $me, 'stolen', $plotId, $plot['crop'], $day, "stolen:$fid:$plotId:{$plot['plantedAt']}", $now);
            $this->insertEvent($me, $fid, 'stole', $plotId, $plot['crop'], $day, "stole:$me:$fid:$day", $now);
            $this->db->commit();
        } catch (PDOException) {
            $this->db->rollBack();
            throw new HttpError(429, __t('friends.alreadyPicked'));
        }
        return ['ok' => true, 'plotId' => $plotId, 'crop' => $plot['crop']] + $this->visit($code);
    }

    /**
     * Send a friend one seed: one gift per friend, three a day. The server records the gift;
     * the sender's client takes the seed from its tray under the returned event id.
     */
    public function gift(string $code, array $body): array
    {
        $u = $this->account->requireUser();
        $me = (int) $u['id'];
        $f = $this->friendByCode($me, $code);
        $fid = (int) $f['user_id'];
        $crop = (string) ($body['crop'] ?? '');
        if (!in_array($crop, self::CROPS, true)) {
            throw new HttpError(422, __t('friends.badSeed'));
        }
        $now = time();
        $day = self::day($now);
        if ($this->one('SELECT 1 AS x FROM farm_events WHERE uniq = ?', ["present:$me:$fid:$day"])) {
            throw new HttpError(429, __t('friends.giftedToday'));
        }
        if (count($this->idsFrom($me, 'present', $day)) >= self::GIFTS_PER_DAY) {
            throw new HttpError(429, __t('friends.giftLimit', ['max' => self::GIFTS_PER_DAY]));
        }
        try {
            $this->insertEvent($fid, $me, 'present', null, $crop, $day, "present:$me:$fid:$day", $now);
        } catch (PDOException) {
            throw new HttpError(429, __t('friends.giftedToday'));
        }
        return ['ok' => true, 'id' => 'e' . $this->db->lastInsertId(), 'crop' => $crop] + $this->list();
    }

    /** A thank-you note (no reward), once per friend per day. */
    public function thanks(string $code): array
    {
        $u = $this->account->requireUser();
        $me = (int) $u['id'];
        $fid = (int) $this->friendByCode($me, $code)['user_id'];
        $now = time();
        $day = self::day($now);
        try {
            $this->insertEvent($fid, $me, 'thanks', null, null, $day, "thanks:$me:$fid:$day", $now);
        } catch (PDOException) {
            // Already thanked today: saying it twice is fine.
        }
        return ['ok' => true];
    }

    /**
     * Friends' news: what friends did for (or to) my garden and what I did in theirs, newest
     * first, with whether I can still thank them today.
     */
    public function feed(): array
    {
        $u = $this->account->requireUser();
        $me = (int) $u['id'];
        $day = self::day();
        $since = time() - self::FEED_DAYS * 86400;
        $rows = $this->all(
            "SELECT e.id, e.type, e.plot_id, e.crop, e.created_at, e.to_user, e.from_user,
                    g.friend_code, g.garden_name
             FROM farm_events e
             LEFT JOIN garden_profiles g ON g.user_id = CASE WHEN e.to_user = ? THEN e.from_user ELSE e.to_user END
             WHERE e.created_at >= ? AND (e.to_user = ? OR (e.from_user = ? AND e.type = 'present'))
             ORDER BY e.id DESC LIMIT 40",
            [$me, $since, $me, $me],
        );
        $thanked = $this->idsFrom($me, 'thanks', $day);
        $friendIds = array_map('intval', array_column(
            $this->all('SELECT friend_id FROM friendships WHERE user_id = ?', [$me]),
            'friend_id',
        ));
        return ['items' => array_map(function (array $r) use ($me, $thanked, $friendIds) {
            $mine = (int) $r['to_user'] !== $me;
            $other = $mine ? (int) $r['to_user'] : ($r['from_user'] !== null ? (int) $r['from_user'] : null);
            return [
                'id' => 'e' . $r['id'],
                'type' => $mine ? 'sentPresent' : $r['type'],
                'plotId' => $r['plot_id'] !== null ? (int) $r['plot_id'] : null,
                'crop' => $r['crop'],
                'name' => $r['friend_code'] !== null ? self::displayName($r['garden_name'], $r['friend_code']) : 'Cô Ba',
                // Only current friends can be visited or thanked.
                'code' => $other !== null && in_array($other, $friendIds, true) ? $r['friend_code'] : null,
                'thanked' => $other !== null && in_array($other, $thanked, true),
                'at' => (int) $r['created_at'],
            ];
        }, $rows)];
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

    /** Users I received `$type` events from today… */
    private function idsTo(int $me, string $type, string $day): array
    {
        return array_map('intval', array_column($this->all(
            'SELECT from_user FROM farm_events WHERE to_user = ? AND type = ? AND day = ? AND from_user IS NOT NULL',
            [$me, $type, $day],
        ), 'from_user'));
    }

    /** …and users I sent `$type` events to today. */
    private function idsFrom(int $me, string $type, string $day): array
    {
        return array_map('intval', array_column($this->all(
            'SELECT to_user FROM farm_events WHERE from_user = ? AND type = ? AND day = ?',
            [$me, $type, $day],
        ), 'to_user'));
    }

    /** "plotId:plantedAt" of a garden's crops already picked by a friend (recent ones). */
    private function stolenPlots(int $owner): array
    {
        $out = [];
        foreach ($this->all(
            "SELECT uniq FROM farm_events WHERE to_user = ? AND type = 'stolen' AND created_at >= ?",
            [$owner, time() - 30 * 86400],
        ) as $r) {
            $parts = explode(':', (string) $r['uniq']);
            $out[($parts[2] ?? '') . ':' . ($parts[3] ?? '')] = true;
        }
        return $out;
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

    /** Ripe for longer than the grace period and not picked yet this crop. */
    private static function canSteal(array $p, int $nowMs, array $picked): bool
    {
        return $p['crop'] !== null && $p['readyAt'] !== null && $p['plantedAt'] !== null
            && $p['readyAt'] + self::STEAL_GRACE_MS <= $nowMs
            && !isset($picked[$p['id'] . ':' . $p['plantedAt']]);
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

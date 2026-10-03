<?php

declare(strict_types=1);

require_once __DIR__ . '/Account.php';
require_once __DIR__ . '/ProgressGuard.php';

/*
 * Khu vườn bạn bè. Friends find each other by a 6-character garden code (no
 * emails are ever shown), visit each other's island read-only, water one
 * growing plot per friend per day, pick one from a friend's long-ripe plot,
 * send each other seeds, say thanks, and get a small daily gift from Cô Ba.
 *
 * The server records events; each guest's own client applies them to its progress once
 * (ledger key friend:<id>), and ProgressGuard only accepts a save whose friend rewards are
 * events recorded here. What crosses between gardens is decided on the server's copy:
 * a seed can only be sent if the sender's saved tray has it (and it is owed back until the
 * sender's next save shows it gone), a pick reduces the owner's harvest whether or not the
 * owner's app applies it, and invite rewards follow activity the server verified itself.
 * Every limit is checked and written in one locked transaction.
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
    private const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    /** Seeds Cô Ba may gift: the crops every garden has from day one. */
    private const GIFT_CROPS = ['rice', 'herbs', 'chili', 'scallion', 'bean', 'tomato'];
    private const EVENT_TYPES = ['water', 'gift', 'helped', 'stolen', 'stole', 'present', 'thanks', 'referral'];
    /** Mời bạn mới: an account this young that makes its first friend counts as invited by them. */
    private const REFERRAL_WINDOW = 7 * 86400;
    /** Newcomers one garden can ever be paid for (counted for life, see referral_log). */
    public const MAX_REFERRALS = 10;
    /**
     * What the newcomer has to reach, counted by the server from the newcomer's verified saves
     * (verified_stats: harvests, cooking, XP earned since the account began — never numbers
     * the client wrote); each pays both gardens `coins` and `xp` once. Numbers are stored in
     * farm_events.plot_id — never renumber, only append.
     */
    public const MILESTONES = [
        1 => ['metric' => 'harvest', 'target' => 5, 'coins' => 20, 'xp' => 10],
        2 => ['metric' => 'cook', 'target' => 1, 'coins' => 30, 'xp' => 15],
        3 => ['metric' => 'level', 'target' => 3, 'coins' => 50, 'xp' => 25],
        4 => ['metric' => 'level', 'target' => 5, 'coins' => 100, 'xp' => 40],
    ];

    public function __construct(private PDO $db, private Account $account)
    {
        Schema::ensure($db);
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

    /**
     * A new garden code: whoever had the old one can no longer add this garden. Current
     * friends stay friends (remove one to end it).
     */
    public function newCode(): array
    {
        $u = $this->account->requireUser();
        $this->ensureProfile((int) $u['id']);
        for ($i = 0; $i < 8; $i++) {
            try {
                $this->db->prepare('UPDATE garden_profiles SET friend_code = ? WHERE user_id = ?')->execute([self::randomCode(), $u['id']]);
                break;
            } catch (PDOException) {
                // Code taken: try another.
            }
        }
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
            'referrals' => $this->referrals($me),
            'helpsLeft' => max(0, self::HELPS_PER_DAY - count($helped)),
            'stealsLeft' => max(0, self::STEALS_PER_DAY - count($stole)),
            'giftsLeft' => max(0, self::GIFTS_PER_DAY - count($gifted)),
            'max' => self::MAX_FRIENDS,
        ];
    }

    /** Friendship is mutual: adding a code links both gardens at once (or neither). */
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
        db_tx($this->db, function () use ($u, $me, $fid) {
            $this->lockUsers($me, $fid);
            if (!$this->one('SELECT 1 AS x FROM friendships WHERE user_id = ? AND friend_id = ?', [$me, $fid])) {
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
            }
            $this->recordReferral($u, $fid);
        });
        return $this->list();
    }

    // ——— Mời bạn mới ———

    /**
     * A fresh account's first friend is the garden that brought it in: recorded once, never
     * moved. Not when that garden already brought in its lifetime maximum, not for an email
     * that was invited before (a deleted and re-created account), and never both ways round.
     * Runs inside add()'s transaction.
     */
    private function recordReferral(array $user, int $inviter): void
    {
        $me = (int) $user['id'];
        $hash = secret_hash('email|' . $user['email']);
        if ((int) $user['created_at'] < time() - self::REFERRAL_WINDOW
            || $this->one('SELECT 1 AS x FROM referrals WHERE invitee_id = ?', [$me])
            || $this->one('SELECT 1 AS x FROM referral_log WHERE invitee_hash = ?', [$hash])
            || $this->one('SELECT 1 AS x FROM referrals WHERE invitee_id = ? AND inviter_id = ?', [$inviter, $me])
            || $this->count('SELECT COUNT(*) FROM referral_log WHERE inviter_id = ?', [$inviter]) >= self::MAX_REFERRALS) {
            return;
        }
        $now = time();
        $this->db->prepare('INSERT INTO referrals (invitee_id, inviter_id, created_at) VALUES (?, ?, ?)')->execute([$me, $inviter, $now]);
        $this->db->prepare('INSERT INTO referral_log (invitee_hash, inviter_id, created_at) VALUES (?, ?, ?)')->execute([$hash, $inviter, $now]);
    }

    /**
     * Pays every milestone reached by the newcomers I brought in and by me (if I was brought
     * in): one 'referral' event to each side. Progress is what the server verified from the
     * newcomer's saves, so a snapshot with made-up numbers pays nothing. The unique key makes
     * this safe to run on every sync.
     */
    private function payReferrals(int $me): void
    {
        $rows = $this->all('SELECT invitee_id, inviter_id FROM referrals WHERE invitee_id = ? OR inviter_id = ?', [$me, $me]);
        $now = time();
        $day = self::day($now);
        foreach ($rows as $r) {
            $invitee = (int) $r['invitee_id'];
            $inviter = (int) $r['inviter_id'];
            $verified = array_map('intval', array_column(
                $this->all("SELECT metric, value FROM verified_stats WHERE user_id = ? AND metric IN ('harvest', 'cook', 'xp')", [$invitee]),
                'value',
                'metric',
            ));
            foreach (self::MILESTONES as $n => $ms) {
                $value = $ms['metric'] === 'level' ? self::level($verified['xp'] ?? 0) : ($verified[$ms['metric']] ?? 0);
                if ($value < $ms['target']) {
                    continue;
                }
                foreach ([[$invitee, $inviter], [$inviter, $invitee]] as [$to, $from]) {
                    $this->tryEvent($to, $from, 'referral', $n, null, $day, "ref:$n:$invitee:$to", $now);
                }
            }
        }
    }

    /** Who brought me in and whom I brought in, with the milestones already paid. */
    private function referrals(int $me): array
    {
        $paid = [];
        foreach ($this->all("SELECT from_user, plot_id FROM farm_events WHERE to_user = ? AND type = 'referral'", [$me]) as $e) {
            $paid[(int) $e['from_user']][] = (int) $e['plot_id'];
        }
        $person = function (array $r) use ($paid): array {
            $id = (int) $r['user_id'];
            $done = $paid[$id] ?? [];
            sort($done);
            return [
                'name' => self::displayName((string) $r['garden_name'], (string) $r['friend_code']),
                'level' => self::level(self::xp(self::decode($r['data']))),
                'done' => $done,
            ];
        };
        $by = $this->one(
            'SELECT g.user_id, g.friend_code, g.garden_name, p.data
             FROM referrals r JOIN garden_profiles g ON g.user_id = r.inviter_id
             LEFT JOIN user_progress p ON p.user_id = r.invitee_id
             WHERE r.invitee_id = ?',
            [$me],
        );
        $invited = $this->all(
            'SELECT g.user_id, g.friend_code, g.garden_name, p.data
             FROM referrals r JOIN garden_profiles g ON g.user_id = r.invitee_id
             LEFT JOIN user_progress p ON p.user_id = r.invitee_id
             WHERE r.inviter_id = ?
             ORDER BY r.created_at',
            [$me],
        );
        return [
            // The level shown for my inviter is mine: it is my progress that pays us both.
            'invitedBy' => $by ? $person($by) : null,
            'invited' => array_map($person, $invited),
            'max' => self::MAX_REFERRALS,
            'counted' => $this->count('SELECT COUNT(*) FROM referral_log WHERE inviter_id = ?', [$me]),
            'milestones' => array_map(
                fn ($n, $ms) => ['id' => $n] + $ms,
                array_keys(self::MILESTONES),
                array_values(self::MILESTONES),
            ),
        ];
    }

    /** What one paid milestone gave each side. */
    private static function referralReward(int $milestone): array
    {
        $ms = self::MILESTONES[$milestone] ?? null;
        return ['coins' => $ms['coins'] ?? 0, 'xp' => $ms['xp'] ?? 0];
    }

    public function remove(string $code): array
    {
        $u = $this->account->requireUser();
        $me = (int) $u['id'];
        $friend = $this->one('SELECT user_id FROM garden_profiles WHERE friend_code = ?', [self::normaliseCode($code)]);
        if ($friend) {
            db_tx($this->db, function () use ($me, $friend) {
                $del = $this->db->prepare('DELETE FROM friendships WHERE user_id = ? AND friend_id = ?');
                $del->execute([$me, $friend['user_id']]);
                $del->execute([$friend['user_id'], $me]);
            });
        }
        return $this->list();
    }

    /** A friend's island, read-only: plots, decorations, animals — checked fields only. */
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
            ...self::scenery($data),
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
        $plotId = (int) ($body['plotId'] ?? 0);
        db_tx($this->db, function () use ($me, $code, $plotId) {
            $this->lockUsers($me);
            $f = $this->friendByCode($me, $code);
            $fid = (int) $f['user_id'];
            $plot = self::plotById(self::decode($f['data']), $plotId);
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
            $this->insertEvent($fid, $me, 'water', $plotId, $plot['crop'], $day, "water:$me:$fid:$day", $now, $plot['plantedAt']);
            $this->insertEvent($me, $fid, 'helped', $plotId, $plot['crop'], $day, "helped:$me:$fid:$day", $now, $plot['plantedAt']);
        });
        return ['ok' => true, 'plotId' => $plotId] + $this->visit($code);
    }

    /**
     * Pick one from a friend's plot that has been ripe for a while. Each crop can be picked
     * once (by anyone); a picker gets one pick per friend and three a day. The picker gets one
     * of the plot's crops; the owner's harvest of that crop gives one less (enforced when the
     * owner saves, by the event's plot and planting time).
     */
    public function steal(string $code, array $body): array
    {
        $u = $this->account->requireUser();
        $me = (int) $u['id'];
        $plotId = (int) ($body['plotId'] ?? 0);
        $crop = db_tx($this->db, function () use ($me, $code, $plotId) {
            $this->lockUsers($me);
            $f = $this->friendByCode($me, $code);
            $fid = (int) $f['user_id'];
            $plot = self::plotById(self::decode($f['data']), $plotId);
            $now = time();
            if (!$plot || !self::canSteal($plot, $now * 1000, [])) {
                throw new HttpError(422, __t('friends.notRipe', ['minutes' => intdiv(self::STEAL_GRACE_MS, 60000)]));
            }
            if (isset($this->stolenPlots($fid)[$plot['id'] . ':' . $plot['plantedAt']])) {
                throw new HttpError(429, __t('friends.alreadyPicked'));
            }
            $day = self::day($now);
            if ($this->one('SELECT 1 AS x FROM farm_events WHERE uniq = ?', ["stole:$me:$fid:$day"])) {
                throw new HttpError(429, __t('friends.pickedToday'));
            }
            if (count($this->idsTo($me, 'stole', $day)) >= self::STEALS_PER_DAY) {
                throw new HttpError(429, __t('friends.pickLimit', ['max' => self::STEALS_PER_DAY]));
            }
            $this->insertEvent($fid, $me, 'stolen', $plotId, $plot['crop'], $day, "stolen:$fid:$plotId:{$plot['plantedAt']}", $now, $plot['plantedAt']);
            $this->insertEvent($me, $fid, 'stole', $plotId, $plot['crop'], $day, "stole:$me:$fid:$day", $now, $plot['plantedAt']);
            return $plot['crop'];
        });
        return ['ok' => true, 'plotId' => $plotId, 'crop' => $crop] + $this->visit($code);
    }

    /**
     * Send a friend one seed: one gift per friend, three a day, and only a seed the sender's
     * saved tray holds (minus seeds already sent and not yet saved as gone). The sender's
     * client takes the seed from its tray under the returned event id; until a save shows
     * that, ProgressGuard counts it as owed.
     */
    public function gift(string $code, array $body): array
    {
        $u = $this->account->requireUser();
        $me = (int) $u['id'];
        $crop = (string) ($body['crop'] ?? '');
        if (!isset(ProgressGuard::rules()['crops'][$crop])) {
            throw new HttpError(422, __t('friends.badSeed'));
        }
        $id = db_tx($this->db, function () use ($me, $code, $crop) {
            $this->lockUsers($me);
            $fid = (int) $this->friendByCode($me, $code)['user_id'];
            $now = time();
            $day = self::day($now);
            if ($this->one('SELECT 1 AS x FROM farm_events WHERE uniq = ?', ["present:$me:$fid:$day"])) {
                throw new HttpError(429, __t('friends.giftedToday'));
            }
            if (count($this->idsFrom($me, 'present', $day)) >= self::GIFTS_PER_DAY) {
                throw new HttpError(429, __t('friends.giftLimit', ['max' => self::GIFTS_PER_DAY]));
            }
            $mine = self::decode($this->one('SELECT data FROM user_progress WHERE user_id = ?', [$me])['data'] ?? null);
            $owed = $this->count("SELECT COUNT(*) FROM farm_events WHERE from_user = ? AND type = 'present' AND crop = ? AND settled_at IS NULL", [$me, $crop]);
            $open = (int) ProgressGuard::rules()['crops'][$crop]['unlockLevel'] <= self::level(self::xp($mine));
            if (!$open || (int) ($mine['seeds'][$crop] ?? 0) - $owed < 1) {
                throw new HttpError(422, __t('friends.noSeed'));
            }
            $this->insertEvent($fid, $me, 'present', null, $crop, $day, "present:$me:$fid:$day", $now);
            return 'e' . $this->db->lastInsertId();
        });
        return ['ok' => true, 'id' => $id, 'crop' => $crop] + $this->list();
    }

    /** A thank-you note (no reward), once per friend per day. */
    public function thanks(string $code): array
    {
        $u = $this->account->requireUser();
        $me = (int) $u['id'];
        $fid = (int) $this->friendByCode($me, $code)['user_id'];
        $now = time();
        $day = self::day($now);
        // Already thanked today: saying it twice is fine.
        $this->tryEvent($fid, $me, 'thanks', null, null, $day, "thanks:$me:$fid:$day", $now);
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
                'name' => self::sender($r),
                // Only current friends can be visited or thanked.
                'code' => $other !== null && in_array($other, $friendIds, true) ? $r['friend_code'] : null,
                'thanked' => $other !== null && in_array($other, $thanked, true),
                'at' => (int) $r['created_at'],
            ] + ($r['type'] === 'referral' ? self::referralReward((int) $r['plot_id']) : []);
        }, $rows)];
    }

    // ——— Events for me ———

    /**
     * Today's gift from Cô Ba (created on the first sync of the day) and invite milestones
     * reached since the last sync, then the undelivered events (POST: it writes).
     */
    public function syncEvents(): array
    {
        $u = $this->account->requireUser();
        $me = (int) $u['id'];
        $now = time();
        $day = self::day($now);
        $crop = self::GIFT_CROPS[crc32($day . ':' . $me) % count(self::GIFT_CROPS)];
        $this->tryEvent($me, null, 'gift', null, $crop, $day, "gift:$me:$day", $now);
        $this->payReferrals($me);
        return $this->events();
    }

    /**
     * Undelivered events (read-only). An event stops coming once a saved garden shows its
     * effect (ProgressGuard marks it delivered). `pendingGifts` are seeds this garden sent
     * that no save has taken out of its tray yet.
     */
    public function events(): array
    {
        $u = $this->account->requireUser();
        $me = (int) $u['id'];
        $rows = $this->all(
            'SELECT e.id, e.type, e.plot_id, e.crop, e.cycle, e.created_at, e.from_user, g.friend_code, g.garden_name
             FROM farm_events e LEFT JOIN garden_profiles g ON g.user_id = e.from_user
             WHERE e.to_user = ? AND e.delivered_at IS NULL
             ORDER BY e.id LIMIT 50',
            [$me],
        );
        return [
            'events' => array_map(fn ($r) => [
                'id' => 'e' . $r['id'],
                'type' => $r['type'],
                'plotId' => $r['plot_id'] !== null ? (int) $r['plot_id'] : null,
                'crop' => $r['crop'],
                'cycle' => $r['cycle'] !== null ? (int) $r['cycle'] : null,
                'from' => self::sender($r),
                'at' => (int) $r['created_at'],
            ] + ($r['type'] === 'referral' ? self::referralReward((int) $r['plot_id']) : []), $rows),
            'pendingGifts' => array_map(fn ($r) => ['id' => 'e' . $r['id'], 'crop' => $r['crop']], $this->all(
                "SELECT id, crop FROM farm_events WHERE from_user = ? AND type = 'present' AND settled_at IS NULL ORDER BY id LIMIT 50",
                [$me],
            )),
        ];
    }

    /**
     * Older clients acknowledge events after applying them. Delivery now follows the saved
     * garden, so this only hides events that carry nothing (thanks, a pick from our plot,
     * whose effect the server enforces anyway).
     */
    public function ack(array $body): array
    {
        $u = $this->account->requireUser();
        $ids = array_slice(array_values(array_filter(array_map(
            fn ($id) => (int) preg_replace('/^e/', '', (string) $id),
            (array) ($body['ids'] ?? []),
        ))), 0, 100);
        if ($ids) {
            $marks = implode(',', array_fill(0, count($ids), '?'));
            $this->db->prepare("UPDATE farm_events SET delivered_at = ? WHERE to_user = ? AND type IN ('thanks', 'stolen') AND id IN ($marks)")
                ->execute([time(), $u['id'], ...$ids]);
        }
        return ['ok' => true, 'acked' => count($ids)];
    }

    // ——— Helpers ———

    private function insertEvent(int $to, ?int $from, string $type, ?int $plotId, ?string $crop, string $day, string $uniq, int $now, ?int $cycle = null): void
    {
        if (!in_array($type, self::EVENT_TYPES, true)) {
            throw new InvalidArgumentException($type);
        }
        $this->db->prepare(
            'INSERT INTO farm_events (to_user, from_user, type, plot_id, crop, day, uniq, created_at, cycle) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([$to, $from, $type, $plotId, $crop, $day, $uniq, $now, $cycle]);
    }

    /** insertEvent() where the unique key already existing is the expected outcome. */
    private function tryEvent(int $to, ?int $from, string $type, ?int $plotId, ?string $crop, string $day, string $uniq, int $now): void
    {
        if ($this->one('SELECT 1 AS x FROM farm_events WHERE uniq = ?', [$uniq])) {
            return;
        }
        try {
            $this->insertEvent($to, $from, $type, $plotId, $crop, $day, $uniq, $now);
        } catch (PDOException) {
            // A parallel request recorded it first.
        }
    }

    /**
     * Holds the acting gardens' rows for the rest of the transaction (MariaDB; SQLite's
     * BEGIN IMMEDIATE already holds the database), always in id order so two gardens acting
     * on each other cannot deadlock.
     */
    private function lockUsers(int ...$ids): void
    {
        sort($ids);
        if ($this->db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
            return;
        }
        foreach ($ids as $id) {
            $this->db->prepare('SELECT id FROM users WHERE id = ? FOR UPDATE')->execute([$id]);
        }
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
            try {
                $this->db->prepare('INSERT INTO garden_profiles (user_id, friend_code, garden_name, created_at) VALUES (?, ?, ?, ?)')
                    ->execute([$userId, self::randomCode(), '', time()]);
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

    private static function randomCode(): string
    {
        $code = '';
        for ($k = 0; $k < 6; $k++) {
            $code .= self::CODE_ALPHABET[random_int(0, strlen(self::CODE_ALPHABET) - 1)];
        }
        return $code;
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

    /** Who an event came from: the garden, Cô Ba for her gift, or a garden that no longer exists. */
    private static function sender(array $r): string
    {
        if ($r['friend_code'] !== null) {
            return self::displayName((string) $r['garden_name'], (string) $r['friend_code']);
        }
        return $r['type'] === 'gift' ? 'Cô Ba' : __t('friends.formerFriend');
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
        $crops = ProgressGuard::rules()['crops'];
        $out = [];
        foreach ((array) ($data['plots'] ?? []) as $p) {
            if (!is_array($p) || !is_int($p['id'] ?? null) || $p['id'] < 1 || $p['id'] > 64) {
                continue;
            }
            $num = fn ($v) => is_int($v) && $v >= 0 && $v < 32_503_680_000_000 ? $v : null;
            $crop = is_string($p['crop'] ?? null) && isset($crops[$p['crop']]) ? $p['crop'] : null;
            $out[] = [
                'id' => $p['id'],
                'crop' => $crop,
                'plantedAt' => $crop ? $num($p['plantedAt'] ?? null) : null,
                'readyAt' => $crop ? $num($p['readyAt'] ?? null) : null,
                'wateredAt' => $num($p['wateredAt'] ?? null),
                'harvests' => is_int($p['harvests'] ?? null) && $p['harvests'] >= 0 && $p['harvests'] < 100_000 ? $p['harvests'] : null,
            ];
        }
        return array_slice($out, 0, 12);
    }

    private static function plotById(array $data, int $id): ?array
    {
        foreach (self::plots($data) as $p) {
            if ($p['id'] === $id) {
                return $p;
            }
        }
        return null;
    }

    /** Decorations, their places and the animals' timers: known ids and in-range numbers only. */
    private static function scenery(array $data): array
    {
        $rules = ProgressGuard::rules();
        $time = fn ($v) => is_int($v) && $v >= 0 && $v < 32_503_680_000_000 ? $v : null;
        $decor = array_values(array_unique(array_filter((array) ($data['decor'] ?? []), fn ($d) => is_string($d) && isset($rules['decor'][$d]))));
        $layout = [];
        foreach ((array) ($data['decorLayout'] ?? []) as $id => $pos) {
            if (!isset($rules['decor'][$id])) {
                continue;
            }
            if ($pos === null) {
                $layout[$id] = null;
            } elseif (is_array($pos) && is_int($pos['x'] ?? null) && is_int($pos['z'] ?? null) && is_int($pos['rot'] ?? null)
                && abs($pos['x']) <= 64 && abs($pos['z']) <= 64) {
                $layout[$id] = ['x' => $pos['x'], 'z' => $pos['z'], 'rot' => (($pos['rot'] % 4) + 4) % 4];
            }
        }
        $animals = [];
        foreach ((array) ($data['animals'] ?? []) as $id => $a) {
            if (isset($rules['animals'][$id]) && is_array($a)) {
                $animals[$id] = ['fedAt' => $time($a['fedAt'] ?? null), 'readyAt' => $time($a['readyAt'] ?? null)];
            }
        }
        return [
            'decor' => $decor,
            'decorLayout' => $layout ?: new stdClass(),
            'animals' => $animals ?: new stdClass(),
        ];
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
        $row = $st->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    private function all(string $sql, array $args): array
    {
        $st = $this->db->prepare($sql);
        $st->execute($args);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    private function count(string $sql, array $args): int
    {
        $st = $this->db->prepare($sql);
        $st->execute($args);
        return (int) $st->fetchColumn();
    }
}

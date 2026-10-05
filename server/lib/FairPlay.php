<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/Schema.php';
require_once __DIR__ . '/Settings.php';
require_once __DIR__ . '/Mailer.php';

/*
 * What happens after ProgressGuard refuses a save. Every refusal is worth points by its code
 * (Settings fairPlay.weights: a moved clock is worth nothing, a forged balance a lot), the same
 * code and reason within one hour counting once (an app retrying one bad save is one offence).
 * Points are summed over a rolling window; reaching a new level alerts the admin and, when the
 * level carries hours, locks the farm that long. While locked the account cannot save its
 * garden or touch a friend's (Account::putProgress, Friends), and the app shows until when.
 * The admin sees the alerts, lifts a lock or sets one by hand (AdminUsers).
 */
final class FairPlay
{
    public function __construct(private PDO $db)
    {
        Schema::ensure($db);
    }

    /** The lock in force for this account, or null. */
    public static function activeBan(PDO $db, int $uid, ?int $now = null): ?array
    {
        Schema::ensure($db);
        $st = $db->prepare('SELECT * FROM farm_bans WHERE user_id = ? AND lifted_at IS NULL AND ends_at > ? ORDER BY ends_at DESC LIMIT 1');
        $st->execute([$uid, $now ?? time()]);
        $b = $st->fetch();
        return $b ? self::publicBan($b) : null;
    }

    /** 423 while the farm is locked; `ban` tells the app until when. */
    public static function requireNotBanned(PDO $db, int $uid): void
    {
        $ban = self::activeBan($db, $uid);
        if ($ban !== null) {
            throw new HttpError(423, __t('fairPlay.locked', ['until' => self::vnTime($ban['until'])]), ['code' => 'banned', 'ban' => $ban]);
        }
    }

    /** Points in the window, with the refusals behind them (one line per counted offence). */
    public function points(int $uid, ?int $now = null): array
    {
        $cfg = Settings::get($this->db, 'fairPlay');
        $now ??= time();
        $st = $this->db->prepare('SELECT code, detail, created_at FROM guard_rejections WHERE user_id = ? AND created_at >= ? ORDER BY created_at');
        $st->execute([$uid, $now - $cfg['windowDays'] * 86400]);
        $seen = [];
        $points = 0;
        $codes = [];
        foreach ($st->fetchAll() as $r) {
            $w = (int) ($cfg['weights'][$r['code']] ?? 1);
            // Same code and reason, numbers aside, within the hour: one offence.
            $key = $r['code'] . '|' . preg_replace('/\d+/', '#', (string) $r['detail']) . '|' . intdiv((int) $r['created_at'], 3600);
            if ($w <= 0 || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $points += $w;
            $codes[$r['code']] = ($codes[$r['code']] ?? 0) + 1;
        }
        $level = 0;
        foreach ($cfg['levels'] as $i => $l) {
            if ($points >= $l['points']) {
                $level = $i + 1;
            }
        }
        return ['points' => $points, 'level' => $level, 'codes' => $codes];
    }

    /**
     * Called after a refusal is logged: a new level since the last alert in the window alerts
     * the admin, and locks the farm when that level carries hours (and autoBan is on).
     */
    public function review(int $uid, ?int $now = null): ?array
    {
        $cfg = Settings::get($this->db, 'fairPlay');
        $now ??= time();
        $p = $this->points($uid, $now);
        if ($p['level'] === 0) {
            return null;
        }
        $st = $this->db->prepare('SELECT MAX(level) FROM fair_play_alerts WHERE user_id = ? AND created_at >= ?');
        $st->execute([$uid, $now - $cfg['windowDays'] * 86400]);
        if ($p['level'] <= (int) $st->fetchColumn()) {
            return null;
        }
        $level = $cfg['levels'][$p['level'] - 1];
        $detail = self::describe($p['codes']);
        $banId = null;
        if ($level['hours'] > 0 && $cfg['autoBan']) {
            $banId = $this->ban($uid, $level['hours'], "Tự động: mức {$p['level']} ({$p['points']} điểm) — $detail", 'auto', null, $p['level'], $p['points'], $now);
        }
        $this->db->prepare('INSERT INTO fair_play_alerts (user_id, level, points, detail, ban_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$uid, $p['level'], $p['points'], mb_substr($detail, 0, 255), $banId, $now]);
        $this->notify($uid, $p, $level, $banId !== null);
        return ['level' => $p['level'], 'points' => $p['points'], 'banned' => $banId !== null];
    }

    /** Locks the farm for `hours`; a longer lock already in force is kept. Returns the lock's id. */
    public function ban(int $uid, int $hours, string $reason, string $source, ?string $by = null, int $level = 0, int $points = 0, ?int $now = null): int
    {
        $now ??= time();
        $hours = max(1, min(Settings::MAX_BAN_HOURS, $hours));
        $ends = $now + $hours * 3600;
        $current = self::activeBan($this->db, $uid, $now);
        if ($current !== null && $current['until'] >= $ends && $source === 'auto') {
            return $current['id'];
        }
        $this->db->prepare('INSERT INTO farm_bans (user_id, level, points, reason, source, created_by, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute([$uid, $level, $points, mb_substr($reason, 0, 255), $source, $by, $now, $ends]);
        return (int) $this->db->lastInsertId();
    }

    /** Ends every lock in force for this account. */
    public function lift(int $uid, string $by): int
    {
        $st = $this->db->prepare('UPDATE farm_bans SET lifted_at = ?, lifted_by = ? WHERE user_id = ? AND lifted_at IS NULL AND ends_at > ?');
        $now = time();
        $st->execute([$now, mb_substr($by, 0, 60), $uid, $now]);
        return $st->rowCount();
    }

    // ——— Admin ———

    /** Alerts (newest first), locks in force, and how many alerts are unread. */
    public function overview(array $query): array
    {
        $now = time();
        $unseen = isset($query['unseen']) && $query['unseen'] !== '0';
        $alerts = $this->all(
            'SELECT a.*, u.email, g.garden_name, g.friend_code FROM fair_play_alerts a
             LEFT JOIN users u ON u.id = a.user_id
             LEFT JOIN garden_profiles g ON g.user_id = a.user_id'
            . ($unseen ? ' WHERE a.seen_at IS NULL' : '') . ' ORDER BY a.id DESC LIMIT 200',
            [],
        );
        $bans = $this->all(
            'SELECT b.*, u.email FROM farm_bans b LEFT JOIN users u ON u.id = b.user_id
             WHERE b.lifted_at IS NULL AND b.ends_at > ? ORDER BY b.ends_at DESC LIMIT 200',
            [$now],
        );
        $since = $now - 7 * 86400;
        return [
            'unseen' => self::unseen($this->db),
            'alerts' => array_map(fn ($a) => [
                'id' => (int) $a['id'],
                'userId' => (int) $a['user_id'],
                'email' => (string) ($a['email'] ?? '(đã xoá)'),
                'garden' => (string) ($a['garden_name'] ?? ''),
                'code' => (string) ($a['friend_code'] ?? ''),
                'level' => (int) $a['level'],
                'points' => (int) $a['points'],
                'detail' => (string) $a['detail'],
                'banned' => $a['ban_id'] !== null,
                'at' => (int) $a['created_at'],
                'seen' => $a['seen_at'] !== null,
                'activeBan' => self::activeBan($this->db, (int) $a['user_id'], $now),
            ], $alerts),
            'bans' => array_map(fn ($b) => self::publicBan($b) + ['userId' => (int) $b['user_id'], 'email' => (string) ($b['email'] ?? '')], $bans),
            'refusedWeek' => array_map(fn ($r) => ['code' => $r['code'], 'n' => (int) $r['n'], 'users' => (int) $r['users']], $this->all(
                'SELECT code, COUNT(*) AS n, COUNT(DISTINCT user_id) AS users FROM guard_rejections WHERE created_at >= ? GROUP BY code ORDER BY n DESC',
                [$since],
            )),
            'settings' => Settings::get($this->db, 'fairPlay'),
            'now' => $now,
        ];
    }

    public static function unseen(PDO $db): int
    {
        Schema::ensure($db);
        return (int) $db->query('SELECT COUNT(*) FROM fair_play_alerts WHERE seen_at IS NULL')->fetchColumn();
    }

    /** Marks alerts read: the ids given, or all of them. */
    public function markSeen(array $body): array
    {
        $now = time();
        if (($body['all'] ?? false) === true) {
            $this->db->prepare('UPDATE fair_play_alerts SET seen_at = ? WHERE seen_at IS NULL')->execute([$now]);
        } else {
            $ids = array_slice(array_values(array_filter(array_map('intval', (array) ($body['ids'] ?? [])), fn ($i) => $i > 0)), 0, 500);
            if ($ids) {
                $marks = implode(',', array_fill(0, count($ids), '?'));
                $this->db->prepare("UPDATE fair_play_alerts SET seen_at = ? WHERE seen_at IS NULL AND id IN ($marks)")->execute([$now, ...$ids]);
            }
        }
        return ['ok' => true, 'unseen' => self::unseen($this->db)];
    }

    /** One account: its points, locks (also past ones) and refusals in the window. */
    public function forUser(int $uid): array
    {
        $now = time();
        $cfg = Settings::get($this->db, 'fairPlay');
        return $this->points($uid, $now) + [
            'windowDays' => $cfg['windowDays'],
            'ban' => self::activeBan($this->db, $uid, $now),
            'bans' => array_map(fn ($b) => self::publicBan($b), $this->all('SELECT * FROM farm_bans WHERE user_id = ? ORDER BY id DESC LIMIT 20', [$uid])),
            'refusals' => array_map(fn ($r) => ['code' => $r['code'], 'detail' => $r['detail'], 'at' => (int) $r['created_at']], $this->all(
                'SELECT code, detail, created_at FROM guard_rejections WHERE user_id = ? AND created_at >= ? ORDER BY id DESC LIMIT 30',
                [$uid, $now - $cfg['windowDays'] * 86400],
            )),
        ];
    }

    // ——— Helpers ———

    public static function publicBan(array $b): array
    {
        return [
            'id' => (int) $b['id'],
            'level' => (int) $b['level'],
            'points' => (int) $b['points'],
            'reason' => (string) $b['reason'],
            'source' => (string) $b['source'],
            'by' => $b['created_by'] !== null ? (string) $b['created_by'] : null,
            'since' => (int) $b['starts_at'],
            'until' => (int) $b['ends_at'],
            'liftedAt' => $b['lifted_at'] !== null ? (int) $b['lifted_at'] : null,
            'liftedBy' => $b['lifted_by'] !== null ? (string) $b['lifted_by'] : null,
        ];
    }

    private static function describe(array $codes): string
    {
        $names = [
            'rule' => 'sai luật chơi', 'balance' => 'sửa số dư', 'replay' => 'nhận thưởng hai lần', 'shape' => 'dữ liệu méo',
            'gap' => 'mất lịch sử', 'import' => 'nhập vườn quá mức', 'gift_debit' => 'quà gửi bạn', 'clock' => 'đổi giờ máy', 'owned' => 'vườn của tài khoản khác',
        ];
        arsort($codes);
        return implode(', ', array_map(fn ($c, $n) => ($names[$c] ?? $c) . " ×$n", array_keys($codes), $codes));
    }

    /** Optional email to ADMIN_ALERT_EMAIL; a failing mailer never fails the save path. */
    private function notify(int $uid, array $p, array $level, bool $banned): void
    {
        $to = (string) env('ADMIN_ALERT_EMAIL', '');
        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return;
        }
        $st = $this->db->prepare('SELECT email FROM users WHERE id = ?');
        $st->execute([$uid]);
        $email = (string) $st->fetchColumn();
        $text = "Tài khoản #$uid ($email) lên mức {$p['level']} với {$p['points']} điểm vi phạm: " . self::describe($p['codes']) . ".\n"
            . ($banned ? "Nông trại đã bị khoá {$level['hours']} giờ.\n" : "Chưa khoá — mức này chỉ cảnh báo.\n")
            . 'Xem: ' . app_origin() . "/admin/#/fairplay\n";
        try {
            Mailer::send($to, "[Ăn gì?] Cảnh báo gian lận mức {$p['level']}", $text, nl2br(htmlspecialchars($text, ENT_QUOTES)));
        } catch (Throwable) {
            error_log('[angi fairplay] alert email failed');
        }
    }

    /** "dd/mm/yyyy HH:MM" in Vietnam time. */
    public static function vnTime(int $t): string
    {
        return gmdate('H:i d/m/Y', $t + 7 * 3600);
    }

    private function all(string $sql, array $args): array
    {
        $st = $this->db->prepare($sql);
        $st->execute($args);
        return $st->fetchAll();
    }
}

<?php

declare(strict_types=1);

/*
 * Admin view of guest accounts: who is using the site right now, recent
 * activity, a progress summary, and the two levers an admin needs — sign a
 * user out everywhere, or delete the account. Session tokens never leave the
 * server; only their timestamps do.
 *
 * "Online" = a session touched within ONLINE_WINDOW. Account::current() bumps
 * last_seen at most once a minute, and the client polls events every 5 min.
 */
final class AdminUsers
{
    public const ONLINE_WINDOW = 600;
    private const XP_PER_LEVEL = 100;
    /** Accounts per page of the admin list. */
    private const PAGE = 100;

    public function __construct(private PDO $db)
    {
    }

    /**
     * One page of accounts, most recently active first. Counting, filtering, searching and
     * paging all happen in SQL, and only the page's progress rows are decoded, so a large
     * user base (or large saves) cannot exhaust the admin request.
     */
    public function list(array $query): array
    {
        $now = time();
        $active = '(SELECT MAX(s.last_seen) FROM user_sessions s WHERE s.user_id = u.id)';
        $summary = $this->one(
            "SELECT COUNT(*) AS total,
                    SUM(CASE WHEN $active >= ? THEN 1 ELSE 0 END) AS online,
                    SUM(CASE WHEN $active >= ? THEN 1 ELSE 0 END) AS day,
                    SUM(CASE WHEN $active >= ? THEN 1 ELSE 0 END) AS week,
                    SUM(CASE WHEN u.created_at >= ? THEN 1 ELSE 0 END) AS new_week
             FROM users u",
            [$now - self::ONLINE_WINDOW, $now - 86400, $now - 7 * 86400, $now - 7 * 86400],
        ) ?? [];

        $where = [];
        $args = [$now];
        $since = match ((string) ($query['filter'] ?? 'all')) {
            'online' => $now - self::ONLINE_WINDOW,
            'day' => $now - 86400,
            'week' => $now - 7 * 86400,
            default => null,
        };
        if ($since !== null) {
            $where[] = "$active >= ?";
            $args[] = $since;
        }
        $q = mb_strtolower(trim(mb_substr((string) ($query['q'] ?? ''), 0, 100)));
        if ($q !== '') {
            $like = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $q) . '%';
            $where[] = "(LOWER(u.email) LIKE ? ESCAPE '!' OR LOWER(COALESCE(g.friend_code, '')) LIKE ? ESCAPE '!' OR LOWER(COALESCE(g.garden_name, '')) LIKE ? ESCAPE '!')";
            array_push($args, $like, $like, $like);
        }
        $page = max(1, min(1000, (int) ($query['page'] ?? 1)));
        $sql = "SELECT u.id, u.email, u.marketing, u.created_at,
                       $active AS last_seen,
                       (SELECT COUNT(*) FROM user_sessions s WHERE s.user_id = u.id AND s.expires_at > ?) AS sessions,
                       (SELECT COUNT(*) FROM friendships f WHERE f.user_id = u.id) AS friends,
                       g.friend_code, g.garden_name, p.updated_at AS progress_at
                FROM users u
                LEFT JOIN garden_profiles g ON g.user_id = u.id
                LEFT JOIN user_progress p ON p.user_id = u.id"
            . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
            . ' ORDER BY last_seen DESC, u.id DESC LIMIT ' . (self::PAGE + 1) . ' OFFSET ' . (($page - 1) * self::PAGE);
        $rows = $this->all($sql, $args);
        $more = count($rows) > self::PAGE;
        $rows = array_slice($rows, 0, self::PAGE);
        // Only this page's saves are read, and only up to a size worth summarising.
        $data = [];
        if ($rows) {
            $ids = array_map(fn ($r) => (int) $r['id'], $rows);
            $marks = implode(',', array_fill(0, count($ids), '?'));
            foreach ($this->all("SELECT user_id, data FROM user_progress WHERE user_id IN ($marks)", $ids) as $d) {
                $data[(int) $d['user_id']] = strlen((string) $d['data']) <= 600_000 ? $d['data'] : null;
            }
        }
        $items = array_map(fn (array $r) => $this->row($r + ['data' => $data[(int) $r['id']] ?? null], $now), $rows);
        usort($items, fn ($a, $b) => [$b['online'], $b['lastSeen'], $b['id']] <=> [$a['online'], $a['lastSeen'], $a['id']]);

        return [
            'summary' => [
                'total' => (int) ($summary['total'] ?? 0),
                'online' => (int) ($summary['online'] ?? 0),
                'day' => (int) ($summary['day'] ?? 0),
                'week' => (int) ($summary['week'] ?? 0),
                'newWeek' => (int) ($summary['new_week'] ?? 0),
                'onlineWindow' => self::ONLINE_WINDOW,
            ],
            'items' => $items,
            'page' => $page,
            'truncated' => $more,
            'now' => $now,
        ];
    }

    public function get(int $id): array
    {
        $now = time();
        $r = $this->one(
            'SELECT u.id, u.email, u.marketing, u.created_at, u.consent_version, u.consent_at,
                    (SELECT MAX(s.last_seen) FROM user_sessions s WHERE s.user_id = u.id) AS last_seen,
                    (SELECT COUNT(*) FROM user_sessions s WHERE s.user_id = u.id AND s.expires_at > ?) AS sessions,
                    (SELECT COUNT(*) FROM friendships f WHERE f.user_id = u.id) AS friends,
                    g.friend_code, g.garden_name, p.data, p.updated_at AS progress_at, p.version AS progress_version
             FROM users u
             LEFT JOIN garden_profiles g ON g.user_id = u.id
             LEFT JOIN user_progress p ON p.user_id = u.id
             WHERE u.id = ?',
            [$now, $id],
        ) ?? throw new HttpError(404, 'Không tìm thấy người dùng.');

        $user = $this->row($r, $now);
        $user['consentVersion'] = (string) $r['consent_version'];
        $user['consentAt'] = (int) $r['consent_at'];
        $user['progressVersion'] = (int) ($r['progress_version'] ?? 0);
        $user['progressBytes'] = strlen((string) ($r['data'] ?? ''));

        $user['sessionList'] = array_map(fn ($s) => [
            'createdAt' => (int) $s['created_at'],
            'lastSeen' => (int) $s['last_seen'],
            'expiresAt' => (int) $s['expires_at'],
            'online' => (int) $s['last_seen'] >= $now - self::ONLINE_WINDOW,
        ], $this->all(
            'SELECT created_at, last_seen, expires_at FROM user_sessions
             WHERE user_id = ? AND expires_at > ? ORDER BY last_seen DESC',
            [$id, $now],
        ));

        $user['friendList'] = array_map(fn ($f) => [
            'code' => (string) ($f['friend_code'] ?? ''),
            'name' => (string) ($f['garden_name'] ?? ''),
            'since' => (int) $f['created_at'],
        ], $this->all(
            'SELECT f.created_at, g.friend_code, g.garden_name FROM friendships f
             LEFT JOIN garden_profiles g ON g.user_id = f.friend_id
             WHERE f.user_id = ? ORDER BY f.created_at DESC',
            [$id],
        ));

        $user['events'] = [
            'received' => $this->count('SELECT COUNT(*) FROM farm_events WHERE to_user = ?', [$id]),
            'sent' => $this->count('SELECT COUNT(*) FROM farm_events WHERE from_user = ?', [$id]),
        ];
        return $user;
    }

    /** Ends every session: the user is signed out on all devices (progress stays). */
    public function signOut(int $id): array
    {
        $this->requireExists($id);
        $st = $this->db->prepare('DELETE FROM user_sessions WHERE user_id = ?');
        $st->execute([$id]);
        return ['ok' => true, 'ended' => $st->rowCount()];
    }

    /** Same cleanup as the guest's own "delete my account". */
    public function delete(int $id): array
    {
        $email = $this->requireExists($id);
        $this->db->beginTransaction();
        try {
            $this->exec('DELETE FROM farm_events WHERE to_user = ? OR from_user = ?', [$id, $id]);
            $this->exec('DELETE FROM friendships WHERE user_id = ? OR friend_id = ?', [$id, $id]);
            $this->exec('DELETE FROM garden_profiles WHERE user_id = ?', [$id]);
            $this->exec('DELETE FROM user_progress WHERE user_id = ?', [$id]);
            $this->exec('DELETE FROM user_sessions WHERE user_id = ?', [$id]);
            $this->exec('DELETE FROM login_codes WHERE email = ?', [$email]);
            $this->exec('DELETE FROM users WHERE id = ?', [$id]);
            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
        return ['ok' => true];
    }

    // ——— Helpers ———

    private function row(array $r, int $now): array
    {
        $lastSeen = (int) ($r['last_seen'] ?? 0);
        $p = $r['data'] ? json_decode((string) $r['data'], true) : null;
        $p = is_array($p) ? $p : [];
        $xp = (int) ($p['xp'] ?? 0);
        $plots = is_array($p['plots'] ?? null) ? $p['plots'] : [];
        return [
            'id' => (int) $r['id'],
            'email' => (string) $r['email'],
            'marketing' => (bool) $r['marketing'],
            'createdAt' => (int) $r['created_at'],
            'lastSeen' => $lastSeen,
            'online' => $lastSeen >= $now - self::ONLINE_WINDOW,
            'sessions' => (int) $r['sessions'],
            'friends' => (int) $r['friends'],
            'friendCode' => (string) ($r['friend_code'] ?? ''),
            'gardenName' => (string) ($r['garden_name'] ?? ''),
            'progressAt' => (int) ($r['progress_at'] ?? 0),
            'progress' => $p ? [
                'xp' => $xp,
                'level' => intdiv(max(0, $xp), self::XP_PER_LEVEL) + 1,
                'coins' => (int) ($p['coins'] ?? 0),
                'streak' => (int) ($p['streak']['count'] ?? 0),
                'eaten' => count((array) ($p['stamps']['eaten'] ?? [])),
                'cooked' => array_sum(array_map('intval', (array) ($p['cooked'] ?? []))),
                'checkIns' => count((array) ($p['history'] ?? [])),
                'plots' => count($plots),
                'growing' => count(array_filter($plots, fn ($pl) => is_array($pl) && !empty($pl['crop']))),
                'regions' => count((array) ($p['unlockedRegions'] ?? [])),
            ] : null,
        ];
    }

    private function requireExists(int $id): string
    {
        $row = $this->one('SELECT email FROM users WHERE id = ?', [$id]);
        return $row ? (string) $row['email'] : throw new HttpError(404, 'Không tìm thấy người dùng.');
    }

    private function exec(string $sql, array $args): void
    {
        $this->db->prepare($sql)->execute($args);
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

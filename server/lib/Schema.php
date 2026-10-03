<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/*
 * Additive schema changes on top of server/sql/schema*.sql, for databases created before
 * them. Every step is idempotent (new tables use IF NOT EXISTS, new columns are added only
 * when missing), so it runs from migrate.php and, once per process, from the API itself:
 * a deploy that forgot `php server/bin/migrate.php` still gets the tables it needs.
 */
final class Schema
{
    /** Bump with every change below; stored in app_meta so the API checks one row per request. */
    public const VERSION = 4;

    public static function ensure(PDO $pdo): void
    {
        static $done = false;
        if ($done) {
            return;
        }
        try {
            $st = $pdo->query("SELECT value FROM app_meta WHERE name = 'schema'");
            if ((int) $st->fetchColumn() >= self::VERSION) {
                $done = true;
                return;
            }
        } catch (PDOException) {
            // No app_meta yet: an older database.
        }
        self::upgrade($pdo);
        $done = true;
    }

    public static function upgrade(PDO $pdo): void
    {
        $sqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
        $engine = $sqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
        $int = $sqlite ? 'INTEGER' : 'INT UNSIGNED';
        $big = $sqlite ? 'INTEGER' : 'BIGINT';
        $text = fn (int $n) => $sqlite ? 'TEXT' : "VARCHAR($n)";

        $pdo->exec("CREATE TABLE IF NOT EXISTS app_meta (name {$text(40)} NOT NULL PRIMARY KEY, value {$text(200)} NOT NULL)$engine");

        // Fixed-window counters: login attempts, code requests (see RateLimit).
        $pdo->exec("CREATE TABLE IF NOT EXISTS rate_limits (
            bucket {$text(120)} NOT NULL PRIMARY KEY,
            hits $int NOT NULL DEFAULT 0,
            reset_at $int NOT NULL
        )$engine");

        // One-time rewards already paid to a garden (quest/badge/chest/photo/friend/…): the
        // client ledger keeps only its last entries, this keeps them all.
        $pdo->exec("CREATE TABLE IF NOT EXISTS progress_claims (
            user_id $int NOT NULL,
            claim_key {$text(160)} NOT NULL,
            created_at $int NOT NULL,
            PRIMARY KEY (user_id, claim_key)
        )$engine");

        // Activity the server has verified itself (harvests, cooking, XP earned since the
        // account's first save): what invite milestones are paid from.
        $pdo->exec("CREATE TABLE IF NOT EXISTS verified_stats (
            user_id $int NOT NULL,
            metric {$text(20)} NOT NULL,
            value $big NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, metric)
        )$engine");

        // Every invite ever counted for a garden, by a keyed hash of the newcomer's email:
        // survives the newcomer deleting their account, so neither the inviter's lifetime
        // cap nor a re-created account can be reset that way.
        $pdo->exec("CREATE TABLE IF NOT EXISTS referral_log (
            invitee_hash CHAR(64) NOT NULL PRIMARY KEY,
            inviter_id $int NOT NULL,
            created_at $int NOT NULL
        )$engine");
        self::index($pdo, 'referral_log', 'idx_referral_log_inviter', 'inviter_id');

        self::column($pdo, 'login_codes', 'browser_hash', $sqlite ? 'TEXT NULL' : 'CHAR(64) NULL');
        self::column($pdo, 'farm_events', 'cycle', "$big NULL");
        self::column($pdo, 'farm_events', 'settled_at', "$int NULL");
        self::column($pdo, 'user_progress', 'guest_id', $sqlite ? 'TEXT NULL' : 'VARCHAR(64) NULL');
        self::column($pdo, 'user_progress', 'client_at', "$big NULL");
        self::column($pdo, 'user_progress', 'client_offset', "$big NULL");
        self::column($pdo, 'user_progress', 'baseline_at', "$int NULL");
        self::index($pdo, 'user_progress', 'idx_progress_guest', 'guest_id');

        // v4: the achievement metrics added with 28 badges get their bases from each stored garden.
        require_once __DIR__ . '/ProgressGuard.php';
        ProgressGuard::backfillBases($pdo);

        $set = $sqlite
            ? 'INSERT INTO app_meta (name, value) VALUES (\'schema\', ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value'
            : 'INSERT INTO app_meta (name, value) VALUES (\'schema\', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)';
        $pdo->prepare($set)->execute([(string) self::VERSION]);
    }

    private static function columns(PDO $pdo, string $table): array
    {
        if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
            return array_column($pdo->query("PRAGMA table_info($table)")->fetchAll(PDO::FETCH_ASSOC), 'name');
        }
        $st = $pdo->prepare('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?');
        $st->execute([$table]);
        return $st->fetchAll(PDO::FETCH_COLUMN);
    }

    private static function column(PDO $pdo, string $table, string $name, string $type): void
    {
        if (!in_array($name, self::columns($pdo, $table), true)) {
            $pdo->exec("ALTER TABLE $table ADD COLUMN $name $type");
        }
    }

    private static function index(PDO $pdo, string $table, string $name, string $cols): void
    {
        if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
            $pdo->exec("CREATE INDEX IF NOT EXISTS $name ON $table ($cols)");
            return;
        }
        $st = $pdo->prepare('SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?');
        $st->execute([$table, $name]);
        if (!$st->fetchColumn()) {
            $pdo->exec("CREATE INDEX $name ON $table ($cols)");
        }
    }
}

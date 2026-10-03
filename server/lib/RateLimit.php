<?php

declare(strict_types=1);

require_once __DIR__ . '/Schema.php';

/**
 * Fixed-window counters kept in rate_limits, checked and counted in one locked transaction
 * so parallel requests cannot all slip under the limit. Buckets are named by the caller with
 * keyed hashes (never a raw email or IP).
 */
final class RateLimit
{
    public function __construct(private PDO $db)
    {
        Schema::ensure($db);
    }

    /** Counts one hit in each bucket; throws 429 (counting nothing) when any is already full. */
    public function hit(array $limits, string $message): void
    {
        db_tx($this->db, function () use ($limits, $message) {
            $now = time();
            $rows = [];
            foreach ($limits as $bucket => [$max, $window]) {
                $rows[$bucket] = $this->row($bucket, $now, (int) $window);
                if ($rows[$bucket]['hits'] >= $max) {
                    throw new HttpError(429, $message);
                }
            }
            foreach ($rows as $bucket => $r) {
                $this->db->prepare('UPDATE rate_limits SET hits = ?, reset_at = ? WHERE bucket = ?')
                    ->execute([$r['hits'] + 1, $r['reset_at'], $bucket]);
            }
        });
    }

    /** Whether a bucket is full, without counting. */
    public function full(string $bucket, int $max): bool
    {
        $st = $this->db->prepare('SELECT hits, reset_at FROM rate_limits WHERE bucket = ?');
        $st->execute([$bucket]);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        return $r && (int) $r['reset_at'] > time() && (int) $r['hits'] >= $max;
    }

    public function clear(string $bucket): void
    {
        $this->db->prepare('DELETE FROM rate_limits WHERE bucket = ?')->execute([$bucket]);
    }

    /** The bucket's live window, created or restarted when missing or over (inside db_tx). */
    private function row(string $bucket, int $now, int $window): array
    {
        $st = $this->db->prepare('SELECT hits, reset_at FROM rate_limits WHERE bucket = ?' . for_update($this->db));
        $st->execute([$bucket]);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            try {
                $this->db->prepare('INSERT INTO rate_limits (bucket, hits, reset_at) VALUES (?, 0, ?)')->execute([$bucket, $now + $window]);
                return ['hits' => 0, 'reset_at' => $now + $window];
            } catch (PDOException) {
                // A parallel request created it first (MariaDB): read and lock that row.
                $st->execute([$bucket]);
                $r = $st->fetch(PDO::FETCH_ASSOC) ?: ['hits' => 0, 'reset_at' => $now + $window];
            }
        }
        if ((int) $r['reset_at'] <= $now) {
            return ['hits' => 0, 'reset_at' => $now + $window];
        }
        return ['hits' => (int) $r['hits'], 'reset_at' => (int) $r['reset_at']];
    }
}

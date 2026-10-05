<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/Schema.php';
require_once __DIR__ . '/Settings.php';

/*
 * Spins of the dish reel: a free allowance per Vietnam day, then bought spins.
 *
 * Free spins are counted on the server, per account when signed in and per browser (an
 * httponly cookie) otherwise; a guest's spins also count against their network, so clearing
 * cookies does not reset the day. Bought spins belong to an account (a wallet, with every
 * change in spin_ledger) and are paid by bank transfer: the app shows a VietQR code whose memo
 * is the order's code, and the order is marked paid by the admin or by the bank's webhook
 * (SePay), which credits the wallet exactly once.
 */
final class Spins
{
    private const COOKIE = 'angi_spins';
    /** Unpaid orders lapse after a day (the admin can still confirm a late transfer). */
    private const ORDER_TTL = 86400;
    private const MAX_OPEN_ORDERS = 3;
    /** Order codes: no 0/O/1/I, so a code read off a bank statement is unambiguous. */
    private const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    private ?string $browserId = null;

    public function __construct(private PDO $db, private ?array $user = null, private ?int $now = null)
    {
        Schema::ensure($db);
    }

    /** Today in Vietnam (UTC+7) as a day number: free spins come back at local midnight. */
    public static function day(int $now): int
    {
        return intdiv($now + 7 * 3600, 86400);
    }

    public function status(): array
    {
        $cfg = Settings::get($this->db, 'spins');
        $now = $this->time();
        $used = $this->usedToday($now);
        $free = max(0, $cfg['freePerDay'] - $used);
        $networkFull = $this->user === null && $this->networkFull($cfg, $now);
        return [
            'freePerDay' => $cfg['freePerDay'],
            'freeLeft' => $networkFull ? 0 : $free,
            'credits' => $this->credits(),
            'price' => $cfg['price'],
            'packs' => $cfg['packs'],
            'signedIn' => $this->user !== null,
            // Only guests hit this: the network used its share of free spins, signing in gives
            // the account's own.
            'networkFull' => $networkFull,
            // Seconds until the free spins come back.
            'resetIn' => (self::day($now) + 1) * 86400 - 7 * 3600 - $now,
            'payments' => self::bankReady(Settings::get($this->db, 'bank')),
        ];
    }

    /**
     * One spin: a free one while any is left today, else a bought one. 402 when there is none;
     * `code` says whether buying (no_spins) or signing in (sign_in) is the way on.
     */
    public function use(): array
    {
        $cfg = Settings::get($this->db, 'spins');
        $now = $this->time();
        $paid = db_tx($this->db, function () use ($cfg, $now) {
            $day = self::day($now);
            $subjects = $this->subjects();
            $networkFull = $this->user === null && $this->networkFull($cfg, $now);
            if (!$networkFull && $this->usedToday($now, true) < $cfg['freePerDay']) {
                foreach ($subjects as $s) {
                    $this->bump($s, $day);
                }
                if ($this->user === null && $cfg['guestNetworkCap'] > 0) {
                    $this->bump($this->networkSubject(), $day);
                }
                return false;
            }
            if ($this->user === null) {
                throw new HttpError(402, __t('spins.signInForMore'), ['code' => 'sign_in']);
            }
            $st = $this->db->prepare('UPDATE spin_wallets SET credits = credits - 1, updated_at = ? WHERE user_id = ? AND credits > 0');
            $st->execute([$now, $this->user['id']]);
            if ($st->rowCount() !== 1) {
                throw new HttpError(402, __t('spins.noneLeft'), ['code' => 'no_spins']);
            }
            $this->ledger((int) $this->user['id'], -1, 'spin', null, $now);
            return true;
        });
        if (random_int(1, 200) === 1) {
            $this->db->prepare('DELETE FROM spin_usage WHERE day < ?')->execute([self::day($now) - 3]);
        }
        return ['used' => $paid ? 'credit' : 'free'] + $this->status();
    }

    // ——— Top-up orders ———

    /** A new order for `spins` (one of the offered packs), with how to pay it. */
    public function createOrder(array $body): array
    {
        $user = $this->requireUser();
        $cfg = Settings::get($this->db, 'spins');
        $bank = Settings::get($this->db, 'bank');
        if (!self::bankReady($bank)) {
            throw new HttpError(503, __t('spins.paymentsOff'));
        }
        $spins = (int) ($body['spins'] ?? 0);
        if (!in_array($spins, $cfg['packs'], true)) {
            throw new HttpError(422, __t('account.badRequest'));
        }
        $now = $this->time();
        $uid = (int) $user['id'];
        $this->expireOrders($now);
        $open = $this->all("SELECT * FROM spin_orders WHERE user_id = ? AND status = 'pending' ORDER BY id DESC", [$uid]);
        // The same pack asked for again: the order already waiting for it.
        foreach ($open as $o) {
            if ((int) $o['spins'] === $spins && (int) $o['amount'] === $spins * $cfg['price']) {
                return $this->orderOut($o, $bank);
            }
        }
        if (count($open) >= self::MAX_OPEN_ORDERS) {
            throw new HttpError(429, __t('spins.tooManyOrders'));
        }
        for ($try = 0; ; $try++) {
            $code = 'AG';
            for ($i = 0; $i < 6; $i++) {
                $code .= self::CODE_CHARS[random_int(0, strlen(self::CODE_CHARS) - 1)];
            }
            try {
                $this->db->prepare("INSERT INTO spin_orders (code, user_id, spins, amount, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)")
                    ->execute([$code, $uid, $spins, $spins * $cfg['price'], $now]);
                break;
            } catch (PDOException $e) {
                if ($try >= 4) {
                    throw $e;
                }
            }
        }
        return $this->orderOut($this->one('SELECT * FROM spin_orders WHERE code = ?', [$code]), $bank);
    }

    /** One of the signed-in guest's orders, by code (the app polls it while the QR is shown). */
    public function order(string $code): array
    {
        $user = $this->requireUser();
        $this->expireOrders($this->time());
        $o = $this->one('SELECT * FROM spin_orders WHERE code = ? AND user_id = ?', [strtoupper($code), (int) $user['id']])
            ?? throw new HttpError(404, __t('api.notFound'));
        return $this->orderOut($o, Settings::get($this->db, 'bank')) + ['credits' => $this->credits()];
    }

    /**
     * Marks an order paid and credits its spins, once: a second call (the webhook retrying, the
     * admin clicking twice) changes nothing. `via` is 'admin' or 'sepay'.
     */
    public static function markPaid(PDO $db, string $code, string $via, ?string $bankRef = null, ?string $note = null): array
    {
        Schema::ensure($db);
        return db_tx($db, function () use ($db, $code, $via, $bankRef, $note) {
            $st = $db->prepare('SELECT * FROM spin_orders WHERE code = ?' . for_update($db));
            $st->execute([$code]);
            $o = $st->fetch() ?: throw new HttpError(404, 'Không tìm thấy đơn.');
            if ($o['status'] === 'paid') {
                return ['order' => self::publicOrder($o), 'credited' => false];
            }
            if ($o['status'] === 'cancelled' && $via !== 'admin') {
                // A transfer for an order the admin cancelled: left for the admin to look at.
                return ['order' => self::publicOrder($o), 'credited' => false];
            }
            $now = time();
            $up = $db->prepare("UPDATE spin_orders SET status = 'paid', paid_at = ?, paid_via = ?, bank_ref = ?, note = ? WHERE id = ? AND status <> 'paid'");
            $up->execute([$now, $via, $bankRef !== null ? mb_substr($bankRef, 0, 64) : null, $note !== null ? mb_substr($note, 0, 255) : null, $o['id']]);
            if ($up->rowCount() !== 1) {
                return ['order' => self::publicOrder($o), 'credited' => false];
            }
            self::credit($db, (int) $o['user_id'], (int) $o['spins'], 'topup', (string) $o['code'], $now);
            $st = $db->prepare('SELECT * FROM spin_orders WHERE id = ?');
            $st->execute([$o['id']]);
            return ['order' => self::publicOrder($st->fetch()), 'credited' => true];
        });
    }

    public static function cancel(PDO $db, string $code): array
    {
        Schema::ensure($db);
        $st = $db->prepare("UPDATE spin_orders SET status = 'cancelled' WHERE code = ? AND status IN ('pending', 'expired')");
        $st->execute([$code]);
        if ($st->rowCount() !== 1) {
            throw new HttpError(409, 'Đơn này không huỷ được (đã thanh toán hoặc không tồn tại).');
        }
        return ['ok' => true];
    }

    /** Adds (or, negative, removes) bought spins: top-ups and the admin's gifts. */
    public static function credit(PDO $db, int $uid, int $delta, string $reason, ?string $ref = null, ?int $now = null): int
    {
        $now ??= time();
        $sqlite = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
        $db->prepare($sqlite
            ? 'INSERT INTO spin_wallets (user_id, credits, updated_at) VALUES (?, 0, ?) ON CONFLICT(user_id) DO NOTHING'
            : 'INSERT IGNORE INTO spin_wallets (user_id, credits, updated_at) VALUES (?, 0, ?)')->execute([$uid, $now]);
        $db->prepare('UPDATE spin_wallets SET credits = CASE WHEN credits + ? < 0 THEN 0 ELSE credits + ? END, updated_at = ? WHERE user_id = ?')
            ->execute([$delta, $delta, $now, $uid]);
        $db->prepare('INSERT INTO spin_ledger (user_id, delta, reason, ref, created_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([$uid, $delta, $reason, $ref, $now]);
        $st = $db->prepare('SELECT credits FROM spin_wallets WHERE user_id = ?');
        $st->execute([$uid]);
        return (int) $st->fetchColumn();
    }

    /**
     * SePay's webhook (POST /api/pay/sepay, "Authorization: Apikey <SEPAY_API_KEY>"): an
     * incoming transfer whose memo holds an order code pays that order when the amount covers
     * it. Anything else is acknowledged and ignored, so SePay does not retry it forever.
     */
    public static function sepayWebhook(PDO $db, array $body): array
    {
        $key = (string) env('SEPAY_API_KEY', '');
        $auth = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
        if ($key === '' || !hash_equals('Apikey ' . $key, trim($auth))) {
            throw new HttpError(401, 'Unauthorized.');
        }
        if (($body['transferType'] ?? '') !== 'in') {
            return ['success' => true, 'matched' => false];
        }
        $memo = strtoupper((string) ($body['content'] ?? '') . ' ' . (string) ($body['code'] ?? ''));
        if (!preg_match('/AG[' . self::CODE_CHARS . ']{6}/', $memo, $m)) {
            return ['success' => true, 'matched' => false];
        }
        Schema::ensure($db);
        $st = $db->prepare('SELECT amount FROM spin_orders WHERE code = ?');
        $st->execute([$m[0]]);
        $amount = $st->fetchColumn();
        if ($amount === false || (int) ($body['transferAmount'] ?? 0) < (int) $amount) {
            error_log('[angi pay] transfer for ' . $m[0] . ' does not match an order or is short');
            return ['success' => true, 'matched' => false];
        }
        $r = self::markPaid($db, $m[0], 'sepay', (string) ($body['id'] ?? $body['referenceCode'] ?? ''), mb_substr((string) ($body['content'] ?? ''), 0, 255));
        return ['success' => true, 'matched' => true, 'credited' => $r['credited']];
    }

    // ——— Admin ———

    public static function adminOrders(PDO $db, array $query): array
    {
        Schema::ensure($db);
        $status = (string) ($query['status'] ?? 'pending');
        $where = in_array($status, ['pending', 'paid', 'cancelled', 'expired'], true) ? 'WHERE o.status = ?' : '';
        $st = $db->prepare("SELECT o.*, u.email FROM spin_orders o LEFT JOIN users u ON u.id = o.user_id $where ORDER BY o.id DESC LIMIT 200");
        $st->execute($where ? [$status] : []);
        $sum = $db->query("SELECT status, COUNT(*) AS n, SUM(amount) AS amount FROM spin_orders GROUP BY status")->fetchAll();
        return [
            'items' => array_map(fn ($o) => self::publicOrder($o) + ['id' => (int) $o['id'], 'userId' => (int) $o['user_id'], 'email' => (string) ($o['email'] ?? ''), 'paidVia' => $o['paid_via'], 'bankRef' => $o['bank_ref'], 'note' => $o['note']], $st->fetchAll()),
            'summary' => array_column(array_map(fn ($r) => ['status' => $r['status'], 'n' => (int) $r['n'], 'amount' => (int) $r['amount']], $sum), null, 'status'),
            'webhook' => (string) env('SEPAY_API_KEY', '') !== '',
        ];
    }

    public static function userSummary(PDO $db, int $uid): array
    {
        Schema::ensure($db);
        $st = $db->prepare('SELECT credits FROM spin_wallets WHERE user_id = ?');
        $st->execute([$uid]);
        $credits = (int) $st->fetchColumn();
        $st = $db->prepare('SELECT used FROM spin_usage WHERE subject = ? AND day = ?');
        $st->execute(['u:' . $uid, self::day(time())]);
        $today = (int) $st->fetchColumn();
        $st = $db->prepare("SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS amount FROM spin_orders WHERE user_id = ? AND status = 'paid'");
        $st->execute([$uid]);
        $paid = $st->fetch() ?: ['n' => 0, 'amount' => 0];
        $st = $db->prepare('SELECT delta, reason, ref, created_at FROM spin_ledger WHERE user_id = ? ORDER BY id DESC LIMIT 20');
        $st->execute([$uid]);
        return [
            'credits' => $credits,
            'freeUsedToday' => $today,
            'ordersPaid' => (int) $paid['n'],
            'amountPaid' => (int) $paid['amount'],
            'ledger' => array_map(fn ($l) => ['delta' => (int) $l['delta'], 'reason' => $l['reason'], 'ref' => $l['ref'], 'at' => (int) $l['created_at']], $st->fetchAll()),
        ];
    }

    // ——— Helpers ———

    public static function bankReady(array $bank): bool
    {
        return $bank['bin'] !== '' && $bank['account'] !== '' && $bank['holder'] !== '';
    }

    /**
     * The VietQR (EMVCo, NAPAS 247) payload for a transfer of `amount` VND to the bank account
     * with `memo`: any Vietnamese banking app scans it with everything filled in.
     */
    public static function vietQr(array $bank, int $amount, string $memo): string
    {
        $f = fn (string $id, string $v) => $id . str_pad((string) strlen($v), 2, '0', STR_PAD_LEFT) . $v;
        $beneficiary = $f('00', $bank['bin']) . $f('01', $bank['account']);
        $merchant = $f('00', 'A000000727') . $f('01', $beneficiary) . $f('02', 'QRIBFTTA');
        $payload = $f('00', '01') . $f('01', '12') . $f('38', $merchant) . $f('53', '704')
            . $f('54', (string) $amount) . $f('58', 'VN') . $f('62', $f('08', $memo)) . '6304';
        return $payload . self::crc16($payload);
    }

    /** CRC-16/CCITT-FALSE, as EMVCo QR codes end with. */
    private static function crc16(string $s): string
    {
        $crc = 0xFFFF;
        for ($i = 0, $n = strlen($s); $i < $n; $i++) {
            $crc ^= ord($s[$i]) << 8;
            for ($b = 0; $b < 8; $b++) {
                $crc = ($crc & 0x8000) ? (($crc << 1) ^ 0x1021) & 0xFFFF : ($crc << 1) & 0xFFFF;
            }
        }
        return strtoupper(str_pad(dechex($crc), 4, '0', STR_PAD_LEFT));
    }

    private function orderOut(array $o, array $bank): array
    {
        return self::publicOrder($o) + [
            'bank' => ['bin' => $bank['bin'], 'name' => $bank['name'], 'account' => $bank['account'], 'holder' => $bank['holder']],
            'qr' => self::bankReady($bank) ? self::vietQr($bank, (int) $o['amount'], (string) $o['code']) : null,
        ];
    }

    private static function publicOrder(array $o): array
    {
        return [
            'code' => (string) $o['code'],
            'spins' => (int) $o['spins'],
            'amount' => (int) $o['amount'],
            'status' => (string) $o['status'],
            'createdAt' => (int) $o['created_at'],
            'paidAt' => $o['paid_at'] !== null ? (int) $o['paid_at'] : null,
            'expiresAt' => (int) $o['created_at'] + self::ORDER_TTL,
        ];
    }

    private function expireOrders(int $now): void
    {
        $this->db->prepare("UPDATE spin_orders SET status = 'expired' WHERE status = 'pending' AND created_at < ?")
            ->execute([$now - self::ORDER_TTL]);
    }

    /** Who this spin counts against: the account and the browser (both, once signed in). */
    private function subjects(): array
    {
        $out = [];
        if ($this->user !== null) {
            $out[] = 'u:' . (int) $this->user['id'];
        }
        $out[] = 'g:' . substr(hash('sha256', $this->browser()), 0, 32);
        return $out;
    }

    private function networkSubject(): string
    {
        return 'n:' . substr(secret_hash('spin-net|' . ip_bucket(client_ip())), 0, 32);
    }

    private function networkFull(array $cfg, int $now): bool
    {
        if ($cfg['guestNetworkCap'] <= 0) {
            return false;
        }
        $st = $this->db->prepare('SELECT used FROM spin_usage WHERE subject = ? AND day = ?');
        $st->execute([$this->networkSubject(), self::day($now)]);
        return (int) $st->fetchColumn() >= $cfg['guestNetworkCap'];
    }

    /** The most any of this caller's subjects used today (a sign-in does not refill the day). */
    private function usedToday(int $now, bool $lock = false): int
    {
        $subjects = $this->subjects();
        $marks = implode(',', array_fill(0, count($subjects), '?'));
        $st = $this->db->prepare("SELECT MAX(used) FROM spin_usage WHERE day = ? AND subject IN ($marks)" . ($lock ? for_update($this->db) : ''));
        $st->execute([self::day($now), ...$subjects]);
        return (int) $st->fetchColumn();
    }

    private function bump(string $subject, int $day): void
    {
        $sqlite = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
        $this->db->prepare($sqlite
            ? 'INSERT INTO spin_usage (subject, day, used) VALUES (?, ?, 1) ON CONFLICT(subject, day) DO UPDATE SET used = used + 1'
            : 'INSERT INTO spin_usage (subject, day, used) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE used = used + 1')
            ->execute([$subject, $day]);
    }

    private function credits(): int
    {
        if ($this->user === null) {
            return 0;
        }
        $st = $this->db->prepare('SELECT credits FROM spin_wallets WHERE user_id = ?');
        $st->execute([(int) $this->user['id']]);
        return (int) $st->fetchColumn();
    }

    private function ledger(int $uid, int $delta, string $reason, ?string $ref, int $now): void
    {
        $this->db->prepare('INSERT INTO spin_ledger (user_id, delta, reason, ref, created_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([$uid, $delta, $reason, $ref, $now]);
    }

    /** This browser's id (an httponly cookie, made on first use). */
    private function browser(): string
    {
        if ($this->browserId !== null) {
            return $this->browserId;
        }
        $id = (string) ($_COOKIE[self::COOKIE] ?? '');
        if (!preg_match('/^[a-f0-9]{32}$/', $id)) {
            $id = bin2hex(random_bytes(16));
            $_COOKIE[self::COOKIE] = $id;
            if (!headers_sent()) {
                setcookie(self::COOKIE, $id, [
                    'expires' => time() + 400 * 86400,
                    'path' => '/api/account',
                    'httponly' => true,
                    'samesite' => 'Lax',
                    'secure' => cookie_secure(),
                ]);
            }
        }
        return $this->browserId = $id;
    }

    private function requireUser(): array
    {
        return $this->user ?? throw new HttpError(401, __t('account.notSignedIn'));
    }

    private function time(): int
    {
        return $this->now ?? time();
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
}

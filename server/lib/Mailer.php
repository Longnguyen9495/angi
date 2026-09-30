<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/*
 * Outgoing mail for login codes. MAIL_DRIVER picks the transport:
 *   log  (default) — append to storage/logs/mail.log, for local development
 *   mail           — PHP mail() (needs a working sendmail on the server)
 *   smtp           — SMTP with AUTH LOGIN; SMTP_SECURE=ssl (465) or tls (587, STARTTLS)
 * Settings: MAIL_FROM, MAIL_FROM_NAME, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE.
 * Laravel-style names work too (MAIL_MAILER, MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD,
 * MAIL_SCHEME, MAIL_FROM_ADDRESS), so one .env serves both conventions.
 */
final class Mailer
{
    /** First non-empty value among the given keys. */
    private static function cfg(string ...$keys): string
    {
        foreach ($keys as $k) {
            $v = (string) env($k, '');
            if ($v !== '') {
                return $v;
            }
        }
        return '';
    }

    /** Sends plain text, or HTML with `$text` as its plain-text alternative. */
    public static function send(string $to, string $subject, string $text, ?string $html = null): void
    {
        $driver = self::cfg('MAIL_DRIVER', 'MAIL_MAILER') ?: 'log';
        match ($driver) {
            'mail' => self::viaMail($to, $subject, $text, $html),
            'smtp' => self::viaSmtp($to, $subject, $text, $html),
            default => self::viaLog($to, $subject, $text, $html),
        };
    }

    /**
     * MIME content headers and body: text/plain alone, or multipart/alternative
     * (plain text first, HTML last — clients show the last part they support).
     *
     * @return array{0: string[], 1: string}
     */
    private static function body(string $text, ?string $html): array
    {
        if ($html === null) {
            return [
                ['Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64'],
                chunk_split(base64_encode($text)),
            ];
        }
        $b = 'bv-' . bin2hex(random_bytes(12));
        $part = fn (string $type, string $content) => "--$b\r\n"
            . "Content-Type: $type; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
            . chunk_split(base64_encode($content));
        return [
            ["Content-Type: multipart/alternative; boundary=\"$b\""],
            $part('text/plain', $text) . $part('text/html', $html) . "--$b--\r\n",
        ];
    }

    private static function from(): array
    {
        return [
            self::cfg('MAIL_FROM', 'MAIL_FROM_ADDRESS') ?: 'no-reply@angi.local',
            self::cfg('MAIL_FROM_NAME') ?: 'Bếp Việt',
        ];
    }

    private static function encodeHeader(string $value): string
    {
        return '=?UTF-8?B?' . base64_encode($value) . '?=';
    }

    private static function message(string $to, string $subject, string $text, ?string $html): string
    {
        [$from, $name] = self::from();
        [$contentHeaders, $body] = self::body($text, $html);
        $headers = [
            'From: ' . self::encodeHeader($name) . " <$from>",
            "To: <$to>",
            'Subject: ' . self::encodeHeader($subject),
            'Date: ' . date(DATE_RFC2822),
            'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . (explode('@', $from)[1] ?? 'localhost') . '>',
            'MIME-Version: 1.0',
            ...$contentHeaders,
        ];
        return implode("\r\n", $headers) . "\r\n\r\n" . $body;
    }

    private static function viaLog(string $to, string $subject, string $text, ?string $html): void
    {
        $dir = APP_ROOT . '/storage/logs';
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $entry = sprintf("[%s] To: %s\nSubject: %s\n\n%s\n%s\n", date('c'), $to, $subject, $text, str_repeat('-', 60));
        file_put_contents($dir . '/mail.log', $entry, FILE_APPEND | LOCK_EX);
        if ($html !== null) {
            // Latest HTML version, handy to open in a browser while developing.
            file_put_contents($dir . '/mail-last.html', $html, LOCK_EX);
        }
    }

    private static function viaMail(string $to, string $subject, string $text, ?string $html): void
    {
        [$from, $name] = self::from();
        [$contentHeaders, $body] = self::body($text, $html);
        $headers = implode("\r\n", [
            'From: ' . self::encodeHeader($name) . " <$from>",
            'MIME-Version: 1.0',
            ...$contentHeaders,
        ]);
        if (!mail($to, self::encodeHeader($subject), $body, $headers)) {
            throw new HttpError(502, 'Chưa gửi được email, bạn thử lại sau ít phút nhé.');
        }
    }

    private static function viaSmtp(string $to, string $subject, string $text, ?string $html): void
    {
        $host = self::cfg('SMTP_HOST', 'MAIL_HOST');
        $port = (int) (self::cfg('SMTP_PORT', 'MAIL_PORT') ?: '587');
        // MAIL_SCHEME=smtps (Laravel) means implicit TLS; empty/null means STARTTLS on 587.
        $scheme = strtolower(self::cfg('SMTP_SECURE', 'MAIL_SCHEME'));
        $secure = match (true) {
            in_array($scheme, ['ssl', 'smtps'], true) => 'ssl',
            in_array($scheme, ['tls', 'smtp'], true) => 'tls',
            default => $port === 465 ? 'ssl' : 'tls',
        };
        if ($host === '') {
            throw new HttpError(500, 'Máy chủ chưa cấu hình gửi email.');
        }
        $remote = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
        $sock = @stream_socket_client($remote, $errno, $errstr, 15);
        if (!$sock) {
            error_log("[angi mail] connect $remote failed: $errstr");
            throw new HttpError(502, 'Chưa gửi được email, bạn thử lại sau ít phút nhé.');
        }
        stream_set_timeout($sock, 15);
        $read = function () use ($sock): string {
            $out = '';
            while (($line = fgets($sock, 515)) !== false) {
                $out .= $line;
                if (strlen($line) < 4 || $line[3] === ' ') {
                    break;
                }
            }
            return $out;
        };
        $cmd = function (string $line, array $ok) use ($sock, $read): string {
            if ($line !== '') {
                fwrite($sock, $line . "\r\n");
            }
            $resp = $read();
            if (!in_array((int) substr($resp, 0, 3), $ok, true)) {
                error_log('[angi mail] SMTP ' . strtok($line, ' ') . ' → ' . trim($resp));
                throw new HttpError(502, 'Chưa gửi được email, bạn thử lại sau ít phút nhé.');
            }
            return $resp;
        };
        try {
            $cmd('', [220]);
            $ehlo = 'EHLO ' . (gethostname() ?: 'localhost');
            $cmd($ehlo, [250]);
            if ($secure === 'tls') {
                $cmd('STARTTLS', [220]);
                if (!stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new HttpError(502, 'Chưa gửi được email, bạn thử lại sau ít phút nhé.');
                }
                $cmd($ehlo, [250]);
            }
            $user = self::cfg('SMTP_USER', 'MAIL_USERNAME');
            if ($user !== '') {
                $cmd('AUTH LOGIN', [334]);
                $cmd(base64_encode($user), [334]);
                $cmd(base64_encode(self::cfg('SMTP_PASS', 'MAIL_PASSWORD')), [235]);
            }
            [$from] = self::from();
            $cmd("MAIL FROM:<$from>", [250]);
            $cmd("RCPT TO:<$to>", [250, 251]);
            $cmd('DATA', [354]);
            // Dot-stuffing: a line starting with "." must be doubled.
            $body = preg_replace('/^\./m', '..', self::message($to, $subject, $text, $html));
            $cmd($body . "\r\n.", [250]);
            $cmd('QUIT', [221]);
        } finally {
            fclose($sock);
        }
    }
}

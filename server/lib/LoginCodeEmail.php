<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/*
 * The login-code email, in the Ăn gì? look. Email clients ignore <style> blocks
 * and modern CSS, so the HTML is table-based with inline styles only, a light
 * warm card (dark-mode clients recolour it cleanly) and a plain-text twin for
 * clients that don't show HTML. Every sentence comes from server/lang/<locale>.php,
 * in the language of the request that asked for the code.
 */
final class LoginCodeEmail
{
    /** @return array{subject: string, text: string, html: string} */
    public static function build(string $code, string $link, bool $marketing, ?string $locale = null): array
    {
        $loc = Lang::normalize($locale) ?? Lang::FALLBACK;
        $t = fn (string $key, array $params = []) => Lang::get($key, $params, $loc);
        $site = rtrim((string) env('APP_URL', 'https://angi.local'), '/');
        $privacy = $site . $t('privacy.path');
        $spaced = trim(chunk_split($code, 3, ' '));
        $purpose = $t($marketing ? 'email.purposeMarketing' : 'email.purpose');
        $why = $t('email.why', ['purpose' => $purpose]);

        $text = $t('email.textTitle') . "\n\n"
            . $t('email.yourCode', ['code' => $spaced]) . "\n"
            . $t('email.validity') . "\n\n"
            . $t('email.textEnter') . "\n$link\n\n"
            . $t('email.notYou') . ' ' . $t('email.notYouText') . "\n\n"
            . "—\n" . $t('email.tagline') . "\n$site\n"
            . $why . "\n"
            . $t('email.privacy') . ": $privacy\n";
        $e = fn (string $s) => htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $font = "'Be Vietnam Pro', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
        // Georgia lacks precomposed Vietnamese letters (ế, ệ…): fall back to Times New Roman.
        $serif = "Fraunces, 'Times New Roman', Times, serif";
        $logo = $e($site . '/icon-192.png');
        $digits = '';
        foreach (str_split($code) as $i => $d) {
            $gap = $i === 3 ? 'padding-left:14px;' : '';
            $digits .= '<td style="' . $gap . 'padding-right:6px;">'
                . '<div style="width:44px;height:56px;line-height:56px;border-radius:12px;background:#fbf7f0;border:1px solid #eadfcd;'
                . "font-family:$font;font-size:30px;font-weight:700;color:#1d1a16;text-align:center;\">" . $e($d) . '</div></td>';
        }

        // The validity span is bold inside an otherwise escaped sentence.
        $intro = str_replace('{validity}', '<strong style="color:#1d1a16;">' . $e($t('email.minutes')) . '</strong>', $e($t('email.intro')));

        $html = <<<HTML
<!doctype html>
<html lang="{$e($loc)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{$e($t('email.htmlTitle'))}</title>
</head>
<body style="margin:0;padding:0;background:#f3ede3;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{$e($t('email.preheader', ['code' => $spaced]))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3ede3;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

      <tr><td style="padding:0 4px 18px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="padding-right:12px;"><img src="{$logo}" width="40" height="40" alt="" style="display:block;border:0;border-radius:11px;"></td>
          <td style="font-family:$serif;font-size:22px;font-weight:600;color:#1d1a16;">Ăn gì?</td>
        </tr></table>
      </td></tr>

      <tr><td style="background:#ffffff;border-radius:20px;border:1px solid #eadfcd;padding:32px 28px;">
        <p style="margin:0 0 6px;font-family:$font;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#b8793a;">{$e($t('email.eyebrow'))}</p>
        <h1 style="margin:0 0 14px;font-family:$serif;font-size:28px;line-height:1.2;font-weight:600;color:#1d1a16;">{$e($t('email.heading'))}</h1>
        <p style="margin:0 0 22px;font-family:$font;font-size:15px;line-height:1.6;color:#4a443c;">{$intro}</p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;"><tr>{$digits}</tr></table>
        <p style="margin:0 0 26px;font-family:$font;font-size:12px;color:#8a8277;">{$e($t('email.codeLabel'))} <span style="font-family:Consolas,Menlo,monospace;letter-spacing:2px;color:#4a443c;">{$e($code)}</span></p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="border-radius:999px;background:#c9663d;">
            <a href="{$e($link)}" style="display:inline-block;padding:14px 28px;font-family:$font;font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:999px;">{$e($t('email.button'))}</a>
          </td>
        </tr></table>
        <p style="margin:14px 0 0;font-family:$font;font-size:12px;line-height:1.5;color:#8a8277;">{$e($t('email.buttonHint'))}</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;"><tr>
          <td style="border-top:1px solid #f0e8da;padding-top:18px;font-family:$font;font-size:13px;line-height:1.6;color:#6b645a;">
            <strong style="color:#1d1a16;">{$e($t('email.notYou'))}</strong> {$e($t('email.notYouText'))} {$e($t('email.neverAsk'))}
          </td>
        </tr></table>
      </td></tr>

      <tr><td style="padding:20px 8px 0;font-family:$font;font-size:12px;line-height:1.6;color:#8a8277;text-align:center;">
        {$e($why)}<br>
        <a href="{$e($site)}" style="color:#b8793a;text-decoration:none;">{$e($t('email.tagline'))}</a>
        &nbsp;·&nbsp;
        <a href="{$e($privacy)}" style="color:#b8793a;text-decoration:none;">{$e($t('email.privacy'))}</a>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>
HTML;

        return ['subject' => $t('email.subject', ['code' => $code]), 'text' => $text, 'html' => $html];
    }
}

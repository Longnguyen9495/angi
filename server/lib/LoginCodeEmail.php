<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/*
 * The login-code email, in Bếp Việt's look. Email clients ignore <style> blocks
 * and modern CSS, so the HTML is table-based with inline styles only, a light
 * warm card (dark-mode clients recolour it cleanly) and a plain-text twin for
 * clients that don't show HTML.
 */
final class LoginCodeEmail
{
    /** @return array{subject: string, text: string, html: string} */
    public static function build(string $code, string $link, bool $marketing): array
    {
        $site = rtrim((string) env('APP_URL', 'https://angi.local'), '/');
        $spaced = trim(chunk_split($code, 3, ' '));
        $purpose = $marketing
            ? 'lưu hành trình của bạn và gửi tin ưu đãi bạn đã đồng ý nhận'
            : 'lưu hành trình của bạn';

        $text = "Bếp Việt — Mã đăng nhập\n\n"
            . "Mã của bạn: $spaced\n"
            . "Mã có hiệu lực trong 10 phút và chỉ dùng được một lần.\n\n"
            . "Nhập mã trên trang Bếp Việt đang mở, hoặc bấm link để đăng nhập ngay:\n$link\n\n"
            . "Không phải bạn yêu cầu? Cứ bỏ qua email này — không ai đăng nhập được nếu không có mã.\n\n"
            . "—\nBếp Việt · Hôm nay ăn gì?\n$site\n"
            . "Bạn nhận email này vì vừa yêu cầu đăng nhập bằng địa chỉ này. Bếp Việt chỉ dùng email để $purpose.\n"
            . "Quyền riêng tư: $site/quyen-rieng-tu.html\n";

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

        $html = <<<HTML
<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Mã đăng nhập Bếp Việt</title>
</head>
<body style="margin:0;padding:0;background:#f3ede3;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Mã {$e($spaced)} — hiệu lực 10 phút. Nhập mã hoặc bấm “Đăng nhập ngay”.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3ede3;">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

      <tr><td style="padding:0 4px 18px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="padding-right:12px;"><img src="{$logo}" width="40" height="40" alt="" style="display:block;border:0;border-radius:11px;"></td>
          <td style="font-family:$serif;font-size:22px;font-weight:600;color:#1d1a16;">Bếp Việt</td>
        </tr></table>
      </td></tr>

      <tr><td style="background:#ffffff;border-radius:20px;border:1px solid #eadfcd;padding:32px 28px;">
        <p style="margin:0 0 6px;font-family:$font;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#b8793a;">Mã đăng nhập</p>
        <h1 style="margin:0 0 14px;font-family:$serif;font-size:28px;line-height:1.2;font-weight:600;color:#1d1a16;">Lưu hành trình của bạn</h1>
        <p style="margin:0 0 22px;font-family:$font;font-size:15px;line-height:1.6;color:#4a443c;">Nhập mã dưới đây trên trang Bếp Việt đang mở để đăng nhập. Mã có hiệu lực trong <strong style="color:#1d1a16;">10 phút</strong> và chỉ dùng được một lần.</p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;"><tr>{$digits}</tr></table>
        <p style="margin:0 0 26px;font-family:$font;font-size:12px;color:#8a8277;">Mã: <span style="font-family:Consolas,Menlo,monospace;letter-spacing:2px;color:#4a443c;">{$e($code)}</span></p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="border-radius:999px;background:#c9663d;">
            <a href="{$e($link)}" style="display:inline-block;padding:14px 28px;font-family:$font;font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:999px;">Đăng nhập ngay</a>
          </td>
        </tr></table>
        <p style="margin:14px 0 0;font-family:$font;font-size:12px;line-height:1.5;color:#8a8277;">Nút này mở Bếp Việt và đăng nhập luôn, không cần nhập mã.</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;"><tr>
          <td style="border-top:1px solid #f0e8da;padding-top:18px;font-family:$font;font-size:13px;line-height:1.6;color:#6b645a;">
            <strong style="color:#1d1a16;">Không phải bạn yêu cầu?</strong> Cứ bỏ qua email này — không ai đăng nhập được nếu không có mã. Bếp Việt không bao giờ hỏi mã này qua điện thoại hay tin nhắn.
          </td>
        </tr></table>
      </td></tr>

      <tr><td style="padding:20px 8px 0;font-family:$font;font-size:12px;line-height:1.6;color:#8a8277;text-align:center;">
        Bạn nhận email này vì vừa yêu cầu đăng nhập bằng địa chỉ này. Bếp Việt chỉ dùng email để {$e($purpose)}.<br>
        <a href="{$e($site)}" style="color:#b8793a;text-decoration:none;">Bếp Việt · Hôm nay ăn gì?</a>
        &nbsp;·&nbsp;
        <a href="{$e($site . '/quyen-rieng-tu.html')}" style="color:#b8793a;text-decoration:none;">Quyền riêng tư</a>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>
HTML;

        return ['subject' => "Mã đăng nhập Bếp Việt: $code", 'text' => $text, 'html' => $html];
    }
}

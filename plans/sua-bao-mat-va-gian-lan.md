# Đã sửa: bảo mật và chống gian lận game

Ghi ngày 03/10/2026. Đây là phần làm theo hai báo cáo [kiem-toan-bao-mat-project.md](kiem-toan-bao-mat-project.md) và [kiem-toan-gian-lan-game.md](kiem-toan-gian-lan-game.md). Mã lỗi (B01, A03, F07…) giữ nguyên theo hai báo cáo đó.

## 1. Cách chống gian lận đã chọn

Báo cáo gian lận để ngỏ hai hướng: chuyển hẳn mọi hành động sang server (8–15 ngày trở lên, phải chuyển đổi bản lưu cũ), hoặc chấp nhận game chỉ để vui. Đã chọn một hướng ở giữa. Game vẫn chạy trên máy, chơi được khi mất mạng, nhưng **server kiểm tra từng bản lưu** trước khi nhận:

- Mọi thay đổi về XP, xu, hạt và kho đều đi qua sổ cái (ledger) của game. Server bắt số dư mới phải bằng số dư đã lưu cộng các dòng mới, nên không sửa thẳng được.
- Dòng nào làm tăng tài nguyên phải theo đúng luật game, ví dụ:
  - thu hoạch phải có lần gieo đúng loại cây trên đúng ô, và đủ thời gian để chín;
  - bán phải đúng giá chợ, và món đó phải ra khỏi kho;
  - nhiệm vụ, huy hiệu, rương chỉ trả đúng phần thưởng của nó;
  - quà và tưới từ bạn phải là sự kiện có thật trên server;
  - cá phải đúng con cắn câu với lần quăng đó, và chỉ sau khi cá cắn.

  Tiêu tài nguyên thì luôn được phép.
- Phần thưởng một lần được server ghi nhớ mãi (`progress_claims`). Vì vậy dòng nào bị đẩy khỏi sổ cái trên máy cũng không nhận lại được.
- Thời gian theo đồng hồ server:
  - lần lưu đầu ghi lại độ lệch giữa đồng hồ máy và server; lần sau độ lệch không được nhảy quá 10 phút;
  - dòng mới phải nằm giữa lần lưu trước và bây giờ;
  - đồng hồ máy đổi thật thì có `POST /account/progress/rebase`, dịch mọi mốc thời gian trong bản lưu đúng bằng độ lệch, nên đổi giờ không lợi được gì.
- Luật lấy từ chính bảng số liệu của game: `npm run rules:export` ghi `server/data/game-rules.json` từ `src/data/game.ts`, và test sẽ báo nếu file JSON cũ hơn game.
- Những gì đi giữa các khu vườn do server quyết trên bản đã lưu:
  - chỉ tặng được hạt có trong khay đã lưu, và hạt đó bị tính nợ cho tới khi một bản lưu cho thấy nó đã ra khỏi khay;
  - bị hái trộm thì lần thu hoạch đó bớt một, dù app của chủ vườn có áp dụng sự kiện hay không;
  - thưởng mời bạn tính từ số lần thu hoạch, nấu ăn và XP mà server đã tự kiểm chứng (`verified_stats`).

Server từ chối thì app tải lại bản đã lưu và báo cho người chơi. Riêng trường hợp hành trình khách quá lớn để nhập thì app giữ nguyên nông trại trên máy.

**Đã kiểm chứng không chặn nhầm người chơi thật:** [progressGuard.test.ts](../src/domain/progressGuard.test.ts) cho một bot chơi 7 ngày theo đúng UI, lưu 2 giờ một lần. Bot làm đủ: chọn món (cả món catalogue, có đổi món), check-in, ảnh, gieo, tưới, thu hoạch (rau, cây ăn quả, nấm nhiều lần), nấu, đơn Cô Ba, chợ, câu cá, vật nuôi, tổ ong, thuyền, đồ trang trí, nhiệm vụ, huy hiệu, rương. Cả **85 bản lưu đều qua guard PHP**. Sau đó **16 bản lưu gian lận** đều bị từ chối đúng lý do, và gần 1.300 phép so sánh công thức cá, thuyền, thời gian cắn câu, XP giữa TS và PHP khớp tuyệt đối.

## 2. Trạng thái từng mã

| Mã | Đã làm |
|---|---|
| B01 | Đường dẫn ảnh chỉ nhận đoạn không bắt đầu bằng dấu chấm. `Images::safeLocalImage()` dùng `realpath`, chỉ cho phép file nằm trong `storage/uploads` và `public/images`, đúng loại ảnh, giới hạn byte và pixel, kiểm tra trước khi đọc file gửi AI |
| B02, B07 | Mọi `server/bin/*.php` trả 404 khi không chạy CLI; `save-detail.php` chỉ chạy dưới `php -S` từ loopback |
| B03 | Giới hạn 40 MP và video 60 MB; tên file ngẫu nhiên, không ghi đè; ghi hỏng giữa chừng thì xoá file dở |
| B04 | AI chỉ gọi https tới host công khai (có thể khoá bằng `AI_HOSTS`), không theo redirect, bắt buộc kiểm tra TLS |
| B05 | Lỗi thô của provider/cURL chỉ vào log (đã che key); admin nhận câu báo chung |
| B06 | Giới hạn dung lượng response: AI 2 MB, review 2 MB, pilot 4 MB |
| FE-01 | Video chỉ nhận file tải lên của mình hoặc https trên host trong `MEDIA_HOSTS`; frontend bỏ URL lạ |
| FE-02 | Canonical/OG luôn lấy `APP_URL`, không lấy Host của request; thay chuỗi bằng callback (giữ nguyên `$` và `\`) |
| A01 | Kiểm mã, đếm lần thử và tiêu mã trong một transaction có khoá; `UPDATE … WHERE used_at IS NULL` phải đổi đúng 1 dòng |
| A02 | Mã OTP băm HMAC với `APP_KEY`; thêm giới hạn 20 lần thử/giờ/email trên mọi mã |
| A03 | Link trong email mang token ở `#login=` (trình duyệt không gửi lên server, nên không vào log). App gửi lên bằng POST. Mở ở trình duyệt khác thì hỏi xác nhận kèm email đã che. Link cũ (GET) chỉ chuyển hướng, không tiêu token |
| A04 | Admin: 5 lần sai/15 phút/IP và 30 lần/giờ toàn site; phiên hết hạn sau 2 giờ không dùng hoặc 12 giờ tối đa; đổi mật khẩu hay secret thì mọi phiên bị đăng xuất; MFA TOTP tuỳ chọn (`ADMIN_TOTP_SECRET`) |
| A05 | Login/logout admin và mọi lệnh ghi phải có header `X-Bepviet`; trình duyệt gửi `Sec-Fetch-Site` khác same-origin thì bị chặn |
| A06 | Cookie luôn Secure ở production; header proxy chỉ được tin khi request đến từ `TRUSTED_PROXIES`; mẫu nginx mới có HTTPS, HSTS, chuyển http→https, chặn Host lạ |
| A07, F01 | ProgressGuard (mục 1) |
| A08 | Có nút "Đổi mã" vườn để thu hồi mã đã lộ; nhà bạn chỉ trả trường đã kiểm (cây, đồ trang trí, vật nuôi, số trong giới hạn) |
| A09, F17 | Xoá tài khoản trong một transaction. Quà và tưới đã gửi vẫn thuộc người nhận, người gửi được ẩn danh ("Một người bạn cũ") |
| A10 | Bản export thêm: sự kiện (gửi/nhận), mã đăng nhập (chỉ thời gian), số lời mời đã tính, thống kê đã kiểm chứng |
| A11 | `config_problems()`: production thiếu https `APP_URL`, `APP_KEY` dưới 32 ký tự hoặc placeholder, `ADMIN_PASSWORD` placeholder hoặc dưới 8 ký tự (dưới 12 chỉ cảnh báo), hoặc `MAIL_DRIVER=log` thì API trả 503. Có lệnh `php server/bin/check-config.php` |
| A12 | Body JSON đọc có giới hạn trước khi giải mã (64 KB mặc định, 576 KB cho bản lưu, 900 KB cho admin); danh sách người dùng admin lọc, tìm và phân trang trong SQL |
| A13, F09 | Ghi bản lưu kiểm tra số dòng đổi, thua thì trả 409; app không còn tự đoán bản mới hơn bằng XP hay độ dài ledger (dùng dòng mới nhất, khác số dư thì hỏi người chơi) |
| A14 | `.gitignore` chặn `.env.*`, khoá, file SQLite, `*.bak` |
| A15, F08 | `GET /account/events` chỉ đọc (quà Cô Ba và thưởng mời bạn tạo ở `POST`). Quota tưới, hái, tặng, thêm bạn, mời bạn đều kiểm và ghi trong transaction có khoá |
| F02 | Tặng hạt cần hạt trong khay đã lưu; hạt bị tính nợ tới khi lưu xong |
| F03 | Thưởng mời bạn chỉ tính hoạt động đã kiểm chứng; giới hạn 10 người tính trọn đời (`referral_log`); email đã từng được mời thì tạo lại tài khoản cũng không được tính lại |
| F04, F10 | Sự kiện tưới/hái có `cycle` (thời điểm gieo); thu hoạch ô bị hái được kiểm trên server; sự kiện chỉ thôi gửi khi bản lưu đã chứa tác dụng của nó, không cần ACK |
| F05, F06 | Thời gian và quota theo server (mục 1); cá phải đúng con cắn với lần quăng và chỉ sau khi cá cắn; tối đa 2×quota trong 24 giờ |
| F07 | Nấu trùng, gắn lại ảnh, thu hoạch ô đã thu không còn tăng số đếm; claim một lần được server nhớ |
| F11 | Kiểm tra dạng dữ liệu bản lưu (id, số, độ dài, trùng lặp) |
| F12 | Như A01–A03 |
| F15, F16 | Hành trình gắn với một tài khoản (`owner`); đăng xuất thì máy bắt đầu lại như khách; server từ chối hành trình (guestId) đã thuộc tài khoản khác; phản hồi cũ sau khi đổi phiên bị bỏ |

## 3. Rủi ro còn lại (có chủ ý)

- **Bot chơi đúng luật, nhiều tài khoản người thật, check-in tự khai:** không chặn được bằng kiểm tra luật (F13 vẫn là hệ thống tự giác, mỗi bữa một lần).
- **Lần lưu đầu của một tài khoản là "nhập":** chỉ kiểm dạng và giới hạn (20.000 XP, 100.000 xu, 20.000 món trong kho, 5.000 hạt), tối đa 3 lần/tuần/tài khoản. Phần nhập không được tính vào thưởng mời bạn, và chỉ góp một phần có giới hạn vào mốc huy hiệu.
- **Chọn thời điểm quăng câu để chọn cá:** server tính lại đúng con cá và giới hạn số lần, nhưng không bốc thăm thay máy. Giá trị chênh rất nhỏ (cua 10 xu so với cá 7 xu).
- **Thứ tự trên máy:** bị hái đúng lúc chủ vườn vừa thu hoạch (trước khi app kịp nhận sự kiện) thì bản lưu bị từ chối một lần. App tải lại bản đã lưu và nhận sự kiện, chơi tiếp bình thường.
- **Kết bạn bằng mã:** ai có mã đều thêm được vườn. Đã có nút đổi mã và nút xoá bạn, nhưng chưa có lời mời phải chấp nhận.
- **CSP cho site chính:** chưa bật, vì cần thử với PlayCanvas và YouTube (P5 trong báo cáo bảo mật). Trang admin đã có CSP trong mẫu nginx.

## 4. Kiểm thử

| Lệnh | Kết quả 03/10/2026 |
|---|---|
| `npm test` | 33 file, 279 test pass, 1 skip có sẵn |
| `npm test -- progressGuard` | 85 bản lưu thật qua, 16 bản gian lận bị chặn, parity TS↔PHP khớp (1.393 kiểm tra) (cần PHP: `PHP_BIN`, XAMPP hoặc PATH) |
| `php server/bin/selftest-account.php` | Pass |
| `php server/bin/selftest-friends.php` | Pass (tặng hạt, nợ hạt, sự kiện lưu xong mới thôi gửi, replay, ô bị hái, mời bạn đã kiểm chứng, tạo lại email) |
| `php server/bin/selftest-security.php` | 39/39 pass (trước đây 5 KNOWN-FAIL) |
| `php server/bin/selftest.php`, `selftest-reviews.php`, `selftest-youtube.php` | Pass |
| Gọi thật vào angi.local (curl) | Thiếu header hoặc cross-site → 403; mã OTP chỉ dùng một lần; link cũ chỉ chuyển hướng; sửa xu → 422 `balance`; ghi đè phiên bản cũ → 409; GET events chỉ đọc |

## 5. Triển khai lên production (chưa làm)

1. Trên VPS, kiểm `.env`: `sudo -u www-data php server/bin/check-config.php` phải báo "Configuration looks safe". Nếu chưa đạt, sửa trước khi pull bản mới, nếu không API sẽ trả 503. Những chỗ hay gặp:
   - `MAIL_DRIVER` phải là `smtp` hoặc `mail`;
   - `APP_KEY` cần ≥ 32 ký tự ngẫu nhiên. Đổi key chỉ làm mất hiệu lực mã OTP đang chờ (10 phút), không đăng xuất ai.
2. Sao lưu SQLite, pull, rồi chạy `php server/bin/migrate.php` (bảng và cột mới; API cũng tự thêm nếu quên).
3. Đối chiếu `/etc/nginx/sites-available/angi` với mẫu mới `deploy/nginx/angi.conf`:
   - giữ đường dẫn chứng chỉ certbot đang có;
   - `nginx -t` rồi reload.
4. Sau khi lên, kiểm từ ngoài:
   - `curl -I http://…` phải 301 sang https;
   - `/server/bin/migrate.php`, `/.env`, `/.git/config` phải 404;
   - cookie `bepviet_guest` có `Secure`.
5. Tài khoản cũ: lần lưu đầu sau khi deploy được kiểm như bình thường, chỉ nới cửa sổ thời gian 7 ngày cho lần đó. Số liệu đã có được dùng làm nền cho huy hiệu.

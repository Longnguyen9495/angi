# Việc còn lại

Ghi ngày 02/10/2026, sau đợt sửa nông trại trên điện thoại (commit `03b0e6d` → `51168e1`) và hai báo cáo kiểm toán. Đây là danh sách để quay lại làm tiếp; chi tiết, bằng chứng và tiêu chí nghiệm thu nằm trong các file được liên kết.

## 1. Bảo mật — đã sửa trong code (03/10/2026), đã deploy lên VPS cùng ngày

Chi tiết từng mã, rủi ro còn lại và kiểm thử: [sua-bao-mat-va-gian-lan.md](sua-bao-mat-va-gian-lan.md). Còn lại:

- **P0 trên VPS (đã làm khi deploy 03/10):** chạy `php server/bin/check-config.php` trên server (API trả 503 nếu `.env` chưa an toàn, ví dụ `MAIL_DRIVER=log`), đối chiếu nginx với mẫu mới `deploy/nginx/angi.conf` (HTTPS, HSTS, chặn Host lạ, body theo route), rồi kiểm từ ngoài `/.env`, `/server/bin/…` trả 404 và cookie có `Secure`.
- **Deploy:** sao lưu SQLite → pull → `migrate.php` → build (mục 5 của file trên).
- **P5 (chưa làm):** CSP cho site chính (thử với PlayCanvas, YouTube), quét secret và advisory định kỳ.

## 2. Chống gian lận game — đã chọn và làm

Server kiểm từng bản lưu theo luật game (`server/lib/ProgressGuard.php`, luật xuất từ `src/data/game.ts` bằng `npm run rules:export`); các thao tác giữa khu vườn (tặng, hái, mời bạn) do server quyết. Game vẫn chơi được khi mất mạng. Không chặn được: bot chơi đúng luật, nhiều tài khoản người thật, check-in tự khai.

## 3. Nông trại — phần code đã làm (03/10/2026)

Chi tiết: [nong-trai-va-nhiem-vu-03-10.md](nong-trai-va-nhiem-vu-03-10.md). Đã thử trên 3 cỡ màn điện thoại bằng kịch bản chạm thật, có checklist cho máy thật ([kiem-tra-dien-thoai.md](kiem-tra-dien-thoai.md)). Ghé vườn bạn đã sang cảnh 2D, ô trống có bong bóng hạt, toast không còn che thẻ ô đất hay khay hạt, sửa 6 lỗi tìm ra khi thử. Còn lại (cần tranh): bò đi lại, xác nhận đáy đảo trên màn rộng, hình vật phẩm (plan ở mục 3 của file trên).

## 4. Đang tạm dừng

- Cốt truyện bếp chung ba miền: chỉ có tài liệu, chưa viết đủ lời thoại, chưa đưa vào game. Không tự làm tiếp khi chưa có yêu cầu ([ghi-chu-tam-dung-cot-truyen.md](ghi-chu-tam-dung-cot-truyen.md)).

## 5. Nhiệm vụ và thành tựu — đã làm (03/10/2026)

5 nhiệm vụ ngày (pool 26), 4 nhiệm vụ tuần (pool 22), 28 thành tựu chia 4 kệ; server kiểm cả phần thưởng và mốc thành tựu. Chi tiết ở [nong-trai-va-nhiem-vu-03-10.md](nong-trai-va-nhiem-vu-03-10.md) mục 1.

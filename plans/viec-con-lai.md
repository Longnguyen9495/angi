# Việc còn lại

Ghi ngày 02/10/2026, sau đợt sửa nông trại trên điện thoại (commit `03b0e6d` → `51168e1`) và hai báo cáo kiểm toán. Đây là danh sách để quay lại làm tiếp; chi tiết, bằng chứng và tiêu chí nghiệm thu nằm trong các file được liên kết.

## 1. Bảo mật — đã sửa trong code (03/10/2026), chưa deploy

Chi tiết từng mã, rủi ro còn lại và kiểm thử: [sua-bao-mat-va-gian-lan.md](sua-bao-mat-va-gian-lan.md). Còn lại:

- **P0 trên VPS (cần người có quyền production):** chạy `php server/bin/check-config.php` trên server (API trả 503 nếu `.env` chưa an toàn, ví dụ `MAIL_DRIVER=log`), đối chiếu nginx với mẫu mới `deploy/nginx/angi.conf` (HTTPS, HSTS, chặn Host lạ, body theo route), rồi kiểm từ ngoài `/.env`, `/server/bin/…` trả 404 và cookie có `Secure`.
- **Deploy:** sao lưu SQLite → pull → `migrate.php` → build (mục 5 của file trên).
- **P5 (chưa làm):** CSP cho site chính (thử với PlayCanvas, YouTube), quét secret và advisory định kỳ.

## 2. Chống gian lận game — đã chọn và làm

Server kiểm từng bản lưu theo luật game (`server/lib/ProgressGuard.php`, luật xuất từ `src/data/game.ts` bằng `npm run rules:export`); các thao tác giữa khu vườn (tặng, hái, mời bạn) do server quyết. Game vẫn chơi được khi mất mạng. Không chặn được: bot chơi đúng luật, nhiều tài khoản người thật, check-in tự khai.

## 3. Nông trại

- **Kiểm tra trên điện thoại thật** các thay đổi đợt này (chưa thử): bong bóng ô chín/cần tưới, chạm giọt nước để tưới, chạm ô chín để thu hoạch, thông báo thu hoạch có nút Nấu, HUD và khay ở màn 440px, bong bóng trong Chuồng & ao.
- **Bò đi lại:** chưa làm; cần tranh chuồng không có bò hoặc lớp bò riêng ([nong-trai-v5-ban-giao.md](nong-trai-v5-ban-giao.md)).
- **Đáy đảo cắt thẳng:** xem lại; commit `c63d78f` đã thêm biển mây dưới đảo, có thể đã xong.
- **Ghé vườn bạn** vẫn dùng đảo 3D cũ (`garden3d/FriendIsland`), chưa chuyển sang cảnh 2D.
- **Vật phẩm nông trại:** khoảng 70/150 nguyên liệu, nhiều hình chưa chắc loài ([vat-pham-nong-trai.md](vat-pham-nong-trai.md), mục 6–7).
- Ý tưởng chưa làm: thêm bong bóng cho ô trống khi đang có hạt giống.

## 4. Đang tạm dừng

- Cốt truyện bếp chung ba miền: chỉ có tài liệu, chưa viết đủ lời thoại, chưa đưa vào game. Không tự làm tiếp khi chưa có yêu cầu ([ghi-chu-tam-dung-cot-truyen.md](ghi-chu-tam-dung-cot-truyen.md)).

## 5. Nhiệm vụ và thành tựu

- Thêm nhiệm vụ ngày (4 → 5, pool 15 → 26), tuần (3 → 4, pool 10 → 22) và thành tựu (9 → 29, chia nhóm trên màn hình). Kèm việc toast che thẻ ô đất trên điện thoại: [nhiem-vu-va-thanh-tuu-mo-rong.md](nhiem-vu-va-thanh-tuu-mo-rong.md).

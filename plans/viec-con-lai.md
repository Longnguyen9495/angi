# Việc còn lại

Ghi ngày 02/10/2026, sau đợt sửa nông trại trên điện thoại (commit `03b0e6d` → `51168e1`) và hai báo cáo kiểm toán. Đây là danh sách để quay lại làm tiếp; chi tiết, bằng chứng và tiêu chí nghiệm thu nằm trong các file được liên kết.

## 1. Bảo mật — chưa vá mục nào

Nguồn: [kiem-toan-bao-mat-project.md](kiem-toan-bao-mat-project.md) (mục 3 và kế hoạch mục 7), phụ lục [backend](audit-backend-evidence.md), [frontend](audit-frontend-evidence.md), [auth/deploy](audit-auth-deploy-evidence.md).

| Ưu tiên | Việc | Mã |
|---|---|---|
| P0 | Kiểm tra cấu hình production thật trên VPS: chặn web vào `server/bin`, script dev và dotfile; bắt buộc HTTPS và cookie Secure; cấu hình sai/placeholder thì từ chối chạy; rà `.gitignore` cho secret | B02, B07, A06, A11, A14 |
| P1 | Chặn đường dẫn ảnh có `../` trước khi đọc file gửi AI (mức Cao); giới hạn kích thước upload và response; ép HTTPS/host khi gọi provider; không trả lỗi thô về admin; Host lạ không đổi canonical/OG | B01, B03–B06, FE-01, FE-02 |
| P2 | Đăng nhập: OTP và mã dùng một lần an toàn khi có request đồng thời; link đăng nhập không bị tiêu chỉ vì mở (GET) và không ghi token vào log; admin có giới hạn số lần thử, MFA, thời hạn phiên; login/logout có CSRF | A01–A05 |
| P3 | Xóa tài khoản trọn vẹn hoặc không xóa gì, giữ quà và sự kiện của người khác; lưu tiến độ khi xung đột không báo thành công giả; phân trang danh sách admin; GET không ghi dữ liệu | A08–A10, A12, A13, A15 |

**Đề xuất bắt đầu:** B01 (sửa nhỏ, chỉ trong `server/lib/Catalogue.php` và `server/lib/AiEnricher.php`), sau đó A01 và A03.

## 2. Chống gian lận game — cần quyết định trước khi làm

Nguồn: [kiem-toan-gian-lan-game.md](kiem-toan-gian-lan-game.md) (F01–F17), là P4 trong báo cáo bảo mật.

- Client hiện tự sửa được tiền, XP, kho rồi lưu lên server; tặng hạt khi không có hạt; giả mốc mời bạn; chỉnh giờ máy cho cây lớn nhanh; chọn trước kết quả câu cá.
- Lỗi đã biết được giữ bằng 4 test `it.fails` trong [security-audit.test.ts](../src/domain/security-audit.test.ts) và 5 KNOWN-FAIL trong [selftest-security.php](../server/bin/selftest-security.php). Khi sửa xong một lỗi, test tương ứng sẽ báo để bỏ đánh dấu.
- **Cần chọn:** server nắm kho và phần thưởng (ước tính 8–15 ngày trở lên, phải chuyển đổi bản lưu cũ), hay chấp nhận game chỉ để vui và gian lận chỉ hại chính người chơi đó.

## 3. Nông trại

- **Kiểm tra trên điện thoại thật** các thay đổi đợt này (chưa thử): bong bóng ô chín/cần tưới, chạm giọt nước để tưới, chạm ô chín để thu hoạch, thông báo thu hoạch có nút Nấu, HUD và khay ở màn 440px, bong bóng trong Chuồng & ao.
- **Bò đi lại:** chưa làm; cần tranh chuồng không có bò hoặc lớp bò riêng ([nong-trai-v5-ban-giao.md](nong-trai-v5-ban-giao.md)).
- **Đáy đảo cắt thẳng:** xem lại; commit `c63d78f` đã thêm biển mây dưới đảo, có thể đã xong.
- **Ghé vườn bạn** vẫn dùng đảo 3D cũ (`garden3d/FriendIsland`), chưa chuyển sang cảnh 2D.
- **Vật phẩm nông trại:** khoảng 70/150 nguyên liệu, nhiều hình chưa chắc loài ([vat-pham-nong-trai.md](vat-pham-nong-trai.md), mục 6–7).
- Ý tưởng chưa làm: thêm bong bóng cho ô trống khi đang có hạt giống.

## 4. Đang tạm dừng

- Cốt truyện bếp chung ba miền: chỉ có tài liệu, chưa viết đủ lời thoại, chưa đưa vào game. Không tự làm tiếp khi chưa có yêu cầu ([ghi-chu-tam-dung-cot-truyen.md](ghi-chu-tam-dung-cot-truyen.md)).

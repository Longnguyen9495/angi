# Ảnh check-in & thông tin cá nhân — tổng hợp và triển khai

Ngày 2026-09-30. Nguyên tắc chung: **chỉ hỏi khi khách đang muốn nhận một thứ cụ thể, và chỉ hỏi đúng cái cần cho thứ đó.**
Không đăng nhập bắt buộc, không form đăng ký chung, không hỏi giữa lúc quay/chốt/check-in.

## 1. Ảnh check-in (làm ngay)

- Bước **tuỳ chọn** sau 3 bước check-in: "Chụp món vừa ăn · +5 XP". Bỏ qua được, không ảnh hưởng thưởng check-in.
- Chỉ bữa đã **ăn** hoặc **đổi món** mới có bước này (bỏ bữa thì không).
- Mỗi bữa 1 ảnh tính điểm, qua ledger (`photo:<slotKey>`) nên chụp lại/bấm đúp không cộng thêm.
- Ảnh **chỉ lưu trên máy** (IndexedDB), không upload:
  - nén còn cạnh dài 1080 px, JPEG ~0.8 (thường 100–250 KB);
  - vẽ lại qua canvas nên **mọi EXIF bị bỏ** (kể cả toạ độ GPS), hướng ảnh vẫn đúng;
  - "Album bữa ăn" trong Hành trình; xoá được từng ảnh; xoá tiến trình thì xoá luôn ảnh.
- Tài khoản (mục 2) **không** đồng bộ ảnh — nói rõ trên UI.

## 2. Thông tin cá nhân — theo nấc

| Nấc | Khi nào | Hỏi gì | Khách được gì | Trạng thái |
| --- | --- | --- | --- | --- |
| 0 · Khách | Mặc định | Không gì | Dùng đầy đủ, lưu trên máy | Có sẵn |
| 1 · Giữ hành trình | Khách bấm "Lưu hành trình", hoặc lời nhắc nhỏ khi đã có ≥ 3 dấu / nấu món đầu tiên | **Chỉ email** → mã 6 số | Không mất tiến trình, dùng trên máy khác | **Làm ngay** |
| 2 · Nhận quà | Khi có chương trình quà/voucher thật | SĐT (tên chỉ khi quán cần) | Quà cụ thể | Để sau — chưa có quà |
| 3 · Giao quà vật lý | Lúc xác nhận nhận quà | Địa chỉ, dùng một lần | Quà được giao | Để sau |

### Nấc 1 — chi tiết

- **Đăng nhập không mật khẩu**: nhập email → nhận **mã 6 số** (kèm link) → nhập mã ngay trong tab đang mở.
  Dùng mã thay vì chỉ link vì link trong app mail hay mở ở trình duyệt khác, nơi không có tiến trình trên máy.
- **Đồng ý**: 1 ô bắt buộc (không tick sẵn) cho mục đích lưu & đồng bộ, kèm link trang quyền riêng tư.
  Ô **"Nhận tin ưu đãi"** tách riêng, mặc định tắt. Lưu thời điểm và phiên bản điều khoản đã đồng ý.
- **Lời nhắc** (không phải popup): thẻ nhỏ trong Hành trình, có "Để sau". Bấm "Để sau" → 7 ngày không hiện;
  2 lần "Để sau" → chỉ còn nút trong Hồ sơ.
- **Đồng bộ**: toàn bộ tiến trình (JSON) lưu theo tài khoản, có `version` chống ghi đè.
  - Đăng nhập lần đầu trên máy đang chơi → đẩy tiến trình lên.
  - Máy mới gần như trống → tải tiến trình về.
  - Cả hai đều có dữ liệu khác nhau → **hỏi khách** giữ bản nào (hiện cấp, dấu, số món đã nấu của mỗi bản).
  - Sau đó tự đẩy lên sau mỗi thay đổi (gom 3 giây).
- **Hồ sơ**: email (che bớt), bật/tắt nhận ưu đãi, tải dữ liệu trên máy chủ (JSON), đăng xuất, **xoá tài khoản** (xoá hẳn email, tiến trình, phiên).
- **Bảo mật**: mã và phiên chỉ lưu dạng băm SHA-256; mã hết hạn 10 phút, tối đa 5 lần nhập sai;
  giới hạn 3 mã/15 phút mỗi email và 10 mã/giờ mỗi IP; cookie phiên `HttpOnly`, `SameSite=Lax`, 180 ngày;
  mọi request ghi phải có header `X-Bepviet: 1` (chặn CSRF từ trang khác).
- **Gửi mail**: `MAIL_DRIVER=log` (mặc định, ghi vào `storage/logs/mail.log` — dùng khi dev),
  `mail` (hàm `mail()` của PHP) hoặc `smtp` (cấu hình `SMTP_*`). Môi trường `APP_ENV=local` trả luôn mã trong
  response để test không cần hộp thư.
- **Pháp lý (NĐ 13/2023/NĐ-CP)**: trang `/quyen-rieng-tu.html` viết đúng những gì app làm; đồng ý rõ ràng; tách mục đích
  quảng cáo; quyền xem/tải/xoá dữ liệu ngay trong Hồ sơ; lưu tối thiểu (email + tiến trình, không ảnh, không vị trí).

## API

| Method | Path | Mô tả |
| --- | --- | --- |
| POST | `/api/account/code` | `{email, consent, marketing}` → gửi mã |
| POST | `/api/account/verify` | `{email, code}` → tạo/đăng nhập tài khoản, đặt cookie phiên |
| GET | `/api/account/me` | Tài khoản hiện tại (hoặc `null`) |
| GET/PUT | `/api/account/progress` | Tải / lưu tiến trình (`baseVersion` chống ghi đè → 409) |
| PUT | `/api/account/preferences` | `{marketing}` |
| GET | `/api/account/export` | Toàn bộ dữ liệu trên máy chủ (JSON) |
| POST | `/api/account/logout` | Đăng xuất phiên này |
| DELETE | `/api/account` | Xoá tài khoản và mọi dữ liệu |

Bảng mới: `users`, `login_codes`, `user_sessions`, `user_progress` (cả MariaDB và SQLite; `migrate.php` idempotent).

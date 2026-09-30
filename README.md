# Bếp Việt · Food Reel

Trải nghiệm chọn món motion-first (Vite + React 19 + TypeScript + Motion): reel 3D 128 món, quay có quán tính,
Food Story với shared-element transition, và Hành trình (nông trại, bản đồ, check-in) trong drawer `/journey`.

- `src/features/food-reel/` — trải nghiệm chính (state machine, engine vật lý, scene, styles).
- `src/components/journey/JourneyApp.tsx` — hub hành trình cũ (bộ lọc, nông trại, bản đồ), mở trong drawer.
- Video food story: khai báo trong `src/features/food-reel/data/videos.ts`, file đặt ở `public/videos/food-reel/` (hiện chưa có video nào).

## Lệnh

```bash
npm install
npm run dev            # dev server (http://localhost:5173)
npm run verify         # prettier check → eslint → tsc → vitest → kiểm tra không SVG animation → build
npm run build          # build production vào dist/ + nén sẵn .br/.gz (Apache phục vụ trực tiếp)
npm run reel:manifest  # tạo lại manifest gọn từ public/images/food-reel/manifest.json
```

Sprite khu vườn (10 loại cây × 4 giai đoạn, nông sản, đồ trang trí — WebP trong suốt ở `public/images/garden/`)
được vẽ lại bằng `npm run assets:garden`; prompt để thay bằng ảnh AI nằm ở `prompts/garden-sprite-prompts.md`.

Ảnh món (JPEG cục bộ) được sinh lại bằng:
`powershell -ExecutionPolicy Bypass -File scripts/generate-dish-images.ps1`

## Tài khoản khách (tuỳ chọn) & ảnh check-in

- Khách không cần đăng nhập. `Lưu hành trình` chỉ hỏi **email** → mã 6 số (không mật khẩu). Chi tiết: `plans/anh-check-in-va-tai-khoan.md`.
- Ảnh check-in lưu **trên máy khách** (IndexedDB), đã nén và xoá EXIF/GPS — không bao giờ tải lên.
- Sau khi pull bản này, chạy `php server/bin/migrate.php` (local và VPS) để tạo bảng `users`, `login_codes`, `user_sessions`, `user_progress`.
- `.env`: `APP_URL`, `APP_KEY` (chuỗi ngẫu nhiên dài), `MAIL_DRIVER` = `log` (dev, ghi `storage/logs/mail.log`) | `mail` | `smtp` (+ `SMTP_*`).
  `APP_ENV=local` trả mã trong response để test không cần hộp thư — **không** bật trên production.
- Kiểm tra: `npm run test:account` (chạy trên SQLite tạm, không đụng dữ liệu thật).
- Trang quyền riêng tư: `public/quyen-rieng-tu.html` — cần điền email liên hệ (chỗ đánh dấu `[điền email liên hệ]`).

## http://angi.local (XAMPP/Apache)

- VirtualHost: `deploy/apache/angi.local.conf` (DocumentRoot `dist/`, SPA fallback, cache asset).
- Được nạp từ `C:\xampp\apache\conf\extra\httpd-vhosts.conf` bằng `IncludeOptional` (bản sao lưu: `httpd-vhosts.conf.bak-angi-*`).
- hosts: `127.0.0.1 angi.local`.
- Sau `npm run build` không cần reload Apache. Chỉ khi sửa file `.conf`:
  1. `C:\xampp\apache\bin\httpd.exe -t` (phải ra `Syntax OK`)
  2. Restart Apache trong XAMPP Control Panel (Stop → Start), hoặc graceful restart:
     `powershell -Command "$p=(Get-Content C:\xampp\apache\logs\httpd.pid).Trim(); ([Threading.EventWaitHandle]::OpenExisting('ap'+$p+'_restart')).Set()"`

## Production: https://angi.221-121-1-68.sslip.io (VPS, nginx + php8.5-fpm + SQLite)

- Code: `/var/www/angi` (git clone của repo, owner `rexllm:www-data`), nginx: `deploy/nginx/angi.conf` → `/etc/nginx/sites-available/angi`, SSL bằng certbot.
- `.env` trên server dùng `DB_DRIVER=sqlite`; file DB ở `storage/database/angi.sqlite` (www-data ghi được, không nằm trong git).
- Cập nhật bản mới:
  ```bash
  cd /var/www/angi && git pull && npm ci && npm run build
  php server/bin/migrate.php   # chỉ khi schema đổi
  ```
- Chép catalogue local lên server: `npm run build` ở local (xuất snapshot), commit, rồi trên server
  `php server/bin/seed.php --force --from=src/features/food-reel/data/catalogue.snapshot.json`
  và `scp` các ảnh trong `storage/uploads/` mà món mới tham chiếu.

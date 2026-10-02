# Ăn gì?

Trải nghiệm chọn món motion-first (Vite + React 19 + TypeScript + Motion): reel 3D 128 món, quay có quán tính,
Food Story với shared-element transition, và Nông trại (khu vườn, bản đồ, check-in) trong drawer `/journey`.

- `src/features/food-reel/` — trải nghiệm chính (state machine, engine vật lý, scene, styles).
- `src/components/journey/JourneyApp.tsx` — hub nông trại cũ (bộ lọc, khu vườn, bản đồ), mở trong drawer.
- Video food story: khai báo trong `src/features/food-reel/data/videos.ts`, file đặt ở `public/videos/food-reel/` (hiện chưa có video nào).

## Lệnh

```bash
npm install
npm run dev            # dev server (http://localhost:5173)
npm run verify         # prettier check → eslint → tsc → vitest → kiểm tra không SVG animation → build
npm run build          # build production vào dist/ + nén sẵn .br/.gz (Apache phục vụ trực tiếp)
npm run reel:manifest  # tạo lại manifest gọn từ public/images/food-reel/manifest.json
```

Hình vật phẩm nông trại (cây trồng theo giai đoạn, cây ăn trái, nấm, vật nuôi, trứng/sữa/lông, mật ong, thuỷ sản)
ở `public/images/farm-items/`, cắt theo lưới từ `storage/item-pdf-v2-check/source.png` bằng `npm run assets:farm-items`
(`scripts/farm-items/`: `grid.json` = lưới, `catalog.json` = vật phẩm → hình, kèm độ chắc chắn và hình còn thiếu).
Đồ trang trí vẫn ở `public/images/garden/` (`npm run assets:garden`).

Logo & ảnh xem trước khi gửi link: `node scripts/generate-brand.mjs` tạo favicon/apple-touch-icon/icon 192–512;
`public/og-image.jpg` (1200×630) chụp từ `scripts/brand/og-image.html` (mở ở 1200×630, DPR 1). Link tuyệt đối
trong thẻ `og:*` lấy từ biến `SITE_URL` lúc build (mặc định domain production).
Link từng món (`/mon/<slug>`) có ảnh xem trước riêng: nginx gửi `/mon/*` và `/og/*` sang `server/web/share.php`
(chèn meta của món vào `dist/index.html`, ghép ảnh 1200×630 bằng GD từ `server/web/og-dish-base.png`, cache ở `storage/og/`).

Ảnh món (JPEG cục bộ) được sinh lại bằng:
`powershell -ExecutionPolicy Bypass -File scripts/generate-dish-images.ps1`

## Tài khoản khách (tuỳ chọn) & ảnh check-in

- Khách không cần đăng nhập. `Lưu nông trại` chỉ hỏi **email** → mã 6 số (không mật khẩu). Chi tiết: `plans/anh-check-in-va-tai-khoan.md`.
- Ảnh check-in lưu **trên máy khách** (IndexedDB), đã nén và xoá EXIF/GPS — không bao giờ tải lên.
- Sau khi pull bản này, chạy `php server/bin/migrate.php` (local và VPS) để tạo bảng `users`, `login_codes`, `user_sessions`, `user_progress`.
- `.env`: `APP_URL`, `APP_KEY` (chuỗi ngẫu nhiên dài), `MAIL_DRIVER` = `log` (dev, ghi `storage/logs/mail.log`) | `mail` | `smtp` (+ `SMTP_*`).
  `APP_ENV=local` trả mã trong response để test không cần hộp thư — **không** bật trên production.
- Kiểm tra: `npm run test:account` (chạy trên SQLite tạm, không đụng dữ liệu thật).
- Trang quyền riêng tư: `public/quyen-rieng-tu.html` (tiếng Anh: `public/privacy.html`, hai trang link qua lại)

## Khu vườn 3D & bạn vườn

- Vườn 3D (three.js + @react-three/fiber) ở `src/features/garden3d/`, có nút chuyển 2D. Chi tiết: `plans/khu-vuon-3d.md`.
- Bạn vườn cần tài khoản: mã khu vườn 6 ký tự, ghé đảo của bạn, tưới giúp 1 ô/bạn/ngày (tối đa 5 bạn), quà hạt của Cô Ba mỗi ngày.
  API `/api/account/garden|friends|events` (`server/lib/Friends.php`); sau khi pull chạy lại `php server/bin/migrate.php`.

## Ngôn ngữ / i18n

Tiếng Việt là ngôn ngữ gốc và là bản dự phòng ở mọi lớp; tên thương hiệu “Ăn gì?” không dịch. Thêm một ngôn ngữ (ví dụ `ja`):

1. **Giao diện (frontend):** khai báo trong `src/i18n/locales.ts`, rồi tạo `src/i18n/messages/ja/` với đủ namespace như
   `messages/vi/` (kiểu `Messages['<namespace>']` để `tsc` bắt thiếu key; `src/i18n/i18n.test.ts` kiểm tra khớp key).
2. **Máy chủ:** tạo `server/lang/ja.php` (chép từ `server/lang/vi.php` rồi dịch giá trị). Có file là ngôn ngữ được bật:
   lỗi API, email mã đăng nhập và trang chia sẻ `/mon/<slug>` tự theo `X-Locale` → `?lang=` → `Accept-Language` → `vi`
   (`server/lib/Lang.php`, dùng `__t('key', ['param' => …])`). Key thiếu sẽ hiện tiếng Việt; `npm run test:server` báo key thiếu.
3. **Nội dung món & nguyên liệu:** bảng `dish_translations` / `ingredient_translations` (chạy `php server/bin/migrate.php`).
   Trang admin tự hiện ô dịch cho mọi ngôn ngữ có file ở bước 2 (`GET /api/admin/locales`). Dịch hàng loạt bằng
   `server/sql/i18n/ja.json`:
   `{ "dishes": { "<dishId>": { "name", "subtitle", "story" } }, "ingredients": { "<ingredientId>": { "name", "description" } } }`
   (mọi trường đều tuỳ chọn), rồi `php server/bin/import-translations.php --locale=ja` (thêm `--dry-run` để chỉ đếm;
   bỏ `--locale` để nạp mọi file; `--file=…` cho file khác). Lệnh chỉ ghi bản dịch, không đụng trường tiếng Việt, bỏ qua id
   không có trong DB; `seed.php` cũng tự nạp các file này. API `/api/dishes` trả `translations: { "ja": { … } }` cho từng món
   và nguyên liệu, nên `npm run build` (export snapshot) mang luôn bản dịch.
4. **Trang tĩnh:** nếu cần, thêm bản dịch trang quyền riêng tư và đặt đường dẫn ở key `privacy.path` trong `server/lang/ja.php`.

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
- Cập nhật bản mới (repo thuộc `rexllm`, file SQLite thuộc `www-data` — chạy đúng user, không chạy git/npm bằng root):
  ```bash
  cd /var/www/angi
  cp -p storage/database/angi.sqlite storage/database/angi.sqlite.bak-$(date +%Y%m%d-%H%M%S)
  sudo -u rexllm git pull --ff-only
  sudo -u www-data php server/bin/migrate.php        # an toàn chạy mỗi lần (CREATE … IF NOT EXISTS)
  sudo -u www-data php server/bin/ai-cook.php        # món mới chưa có cách nấu (gọi AI, chỉ món thiếu)
  sudo -u rexllm npm ci && sudo -u rexllm npm run build
  ```
  Trên server bước xuất snapshot báo “keeping the existing snapshot” là đúng ý: `rexllm` không ghi được DB nên
  giữ snapshot đã commit, cây git không bị bẩn và lần `git pull` sau không vướng. Snapshot chỉ là dự phòng khi API
  không trả lời; trang luôn tải danh mục thật từ `/api/dishes`.
- Danh mục local và production được tạo riêng nên id 7 món khác nhau (production: `com-tam-suon-bi-cha`,
  `com-tempura`… ; local: `com-tam-suon-bi-cha-trung`, `tendon`…). Production là bản thật: muốn local giống hệt thì
  `curl -s https://angi.221-121-1-68.sslip.io/api/dishes > prod.json` rồi `php server/bin/seed.php --force --from=prod.json`
  (xoá danh mục local — sao lưu MySQL trước). Không chạy `seed.php --force` trên production nếu chưa chắc.
- Cách nấu trong game (bảng `dish_cook`): món nào có `cook` thì thành công thức trong Sổ bếp. AI tự viết khi
  tạo/đọc lại món; điền cho các món còn thiếu: `php server/bin/ai-cook.php` (`--all` để viết lại hết, `--only=…`).
  Mang sang server không cần gọi AI lại: `npm run build` ở local, commit snapshot, rồi trên server
  `php server/bin/ai-cook.php --import=src/features/food-reel/data/catalogue.snapshot.json`.
- Chép catalogue local lên server: `npm run build` ở local (xuất snapshot), commit, rồi trên server
  `php server/bin/seed.php --force --from=src/features/food-reel/data/catalogue.snapshot.json`
  và `scp` các ảnh trong `storage/uploads/` mà món mới tham chiếu.

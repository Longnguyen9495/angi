# Nhận xét video `public/videos/angi-quang-cao-60s.mp4`

Thông số: 1080×1920 (9:16), 60 fps, 59.15 s, H.264 CRF 14, **không có âm thanh**.
Nguồn tạo: `scripts/export-promo-video.mjs` (quay từng khung trên đồng hồ ảo timeweb).

## Đánh giá chung

Video có nền tảng rất tốt: chuyển động mượt (quay đúng 60 fps trên đồng hồ ảo),
caption tiếng Việt render chuẩn, intro/bridge/outro có identity thương hiệu rõ,
mạch kể hợp lý (Quay món → Chuyện món → Nông trại → Thực khách → Chợ/Bếp → CTA).
Tuy nhiên còn các lỗi vặt sau — xếp theo mức độ ưu tiên.

---

## 🔴 Lỗi phải sửa

### 1. Tag caption cam rỗng (≈ 32–34 s, cảnh thu hoạch)
Sau khi bấm **Thu hoạch**, góc trên trái hiện một **ô cam trống không có chữ**
(tag của caption cũ đang wipe-out nhưng caption mới chưa vào, hoặc caption bị gọi
với chuỗi rỗng mà tag vẫn render). Đây là lỗi dễ thấy nhất.

**Sửa:** trong `caption()` (dòng ~226), khi `html` rỗng phải wipe-out luôn cả
`.tag` (hiện chỉ fade scrim); và ở kịch bản (dòng ~535–537) đừng để khoảng trống
giữa 2 caption — gọi caption mới ngay, hàm đã tự xử lý out→in.

### 2. Caption đè lên tiêu đề panel (≈ 38–48 s, panel Đơn và Chợ)
Khi mở panel **Đơn** và **Chợ**, caption + scrim đè thẳng lên:
- Tiêu đề panel (chữ "Thực khách…", "Chợ quê" bị che mất một nửa — khung 40 s
  và 48 s thấy rõ chữ "Bán…ê" lòi ra sau caption).
- Dòng mô tả đầu panel bị scrim làm tối, khó đọc.
- Caption nằm sát **nút đóng ✕**, trông chồng chéo.

**Sửa:** một trong hai cách:
- Khi panel mở, đẩy nội dung panel xuống (thêm `padding-top` cho `.fj-*` qua CSS
  overlay khi có caption), hoặc
- Hạ caption xuống `top: 10%` → vẫn giữ nhưng **ẩn caption 400 ms trước khi mở
  panel rồi hiện lại sau khi panel đã vào**, và thu hẹp scrim còn ~26 % khi đang
  ở trong panel.

### 3. Caption lệch nội dung màn hình
- ≈ 38 s: panel **Đơn** đã mở nhưng caption vẫn là *"Chuồng & ao cá cho thịt,
  trứng, hải sản"* (nội dung của cảnh trước) trong ~1.8 s.
- ≈ 24–26 s: caption *"Nguyên liệu & cách thưởng thức"* hiện trong khi màn hình
  vẫn đang ở mục *"02 Dòng thời gian"* (scroll chưa tới mục 03).

**Sửa:** trong kịch bản, đổi caption **sau** khi `press(button(/^Đơn$/))` +
`film(500)` chứ không phải trước; và với mục story, gọi `promo.scroll` trước rồi
mới `promo.caption` (đảo dòng 512–513 giống kiểu 506–507 nhưng chờ scroll chạy
~400 ms).

### 4. Caption intro đè lên headline của chính trang (≈ 4–10 s)
Trên reel, caption *"95 món ngon…"* nằm đúng vị trí headline "Hôm nay ăn gì?"
của trang — chữ "ăn nay / gì?" thò ra quanh caption trông như lỗi layout.

**Sửa:** thêm vào CSS overlay rule ẩn headline hero khi có caption, ví dụ
`.promo-cap-on .fr-hero__title { visibility: hidden }` (bật class trên `body`
trong `caption()`), hoặc dời caption xuống dưới khối headline.

### 5. URL outro là địa chỉ dev (≈ 55–59 s)
Outro hiển thị `angi.221-121-1-68.sslip.io` — URL sslip.io theo IP trông không
chuyên nghiệp trong video quảng cáo chính thức.

**Sửa:** chạy lại với domain thật `node scripts/export-promo-video.mjs https://<domain-chinh-thuc>`
hoặc truyền host hiển thị riêng cho `OUTRO()` (dòng 382, 574).

---

## 🟡 Nên cải thiện

### 6. Không có nhạc nền
Video quảng cáo 60 s hoàn toàn im lặng (`-an`). Nên ghép một track nhạc nền
royalty-free (lofi/acoustic Việt) + fade-out 2 s cuối:

```
ffmpeg -i angi-quang-cao-60s.mp4 -i nhac-nen.mp3 -c:v copy \
  -filter_complex "[1:a]atrim=0:59.15,afade=t=in:d=1,afade=t=out:st=57:d=2[a]" \
  -map 0:v -map "[a]" -c:a aac -b:a 192k out.mp4
```

(Có thể thêm bước này vào cuối script nếu đặt file nhạc ở `storage/promo-tools/`.)

### 7. Caption "Quay một vòng!" ở lại hơi lâu (≈ 12–13 s)
Kết quả Kimbap đã hiện nhưng caption vẫn là *"Không biết ăn gì? Quay một
vòng!"* thêm ~1 s. Chuyển caption *"Ra món rồi!…"* sớm hơn — giảm `film(4300)`
(dòng 495) xuống ~3800 và tăng `film(1500)` sau đó tương ứng để giữ tổng thời lượng.

### 8. Cảnh nông trại là ban đêm
Toàn bộ phân cảnh nông trại quay lúc trời tối (bầu trời đêm). Không sai, nhưng
cảnh ban ngày sẽ tươi và "ngon mắt" hơn cho quảng cáo. Nếu game có chu kỳ
ngày/đêm theo giờ, cân nhắc ép thời gian trong `scripts/promo/promo-save.ts`
hoặc seed `Date` ban ngày trước khi vào `/journey`.

### 9. Thời lượng 59.15 s
Nếu muốn chẵn "60 s" như tên file, cộng thêm ~0.85 s cho outro
(`film(5300)` → `film(6150)`, dòng 575).

---

## ✅ Những điểm đã tốt (giữ nguyên)

- Intro/outro chữ Việt đẹp, animation chữ nhảy theo slot mượt, swash dưới chữ
  *gì?* / *khỏi nghĩ.* là điểm nhấn tốt.
- Hiệu ứng ngón tay chạm/vuốt đồng bộ với thao tác thật.
- Màn Kimbap → tìm quán (Google Maps/Grab/Shopee/beFood) truyền tải giá trị rõ.
- Nhịp cắt giữa các cảnh (card curtain) chuyên nghiệp, không giật.
- Chất lượng hình ảnh (CRF 14, lanczos downscale từ DPR 3) sắc nét.

## Cách chạy lại sau khi sửa

```bat
:: bản nháp nhanh 12 fps để duyệt
set PROMO_FPS=12 && node scripts/export-promo-video.mjs https://<domain>
:: bản chính 60 fps
node scripts/export-promo-video.mjs https://<domain>
```

Kiểm tra nhanh bằng contact sheet: `storage/promo-render/real/sheet.png`,
và khung chi tiết mỗi 2 s tại `storage/promo-review/t001–t030.jpg`.

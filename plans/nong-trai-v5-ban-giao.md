# Nông trại v5 (tranh màu mới) — bàn giao để làm tiếp

Ngày: 2026-10-01. Nhánh: `farm-v5-colourful-showcase`.

## Trạng thái

- Cảnh nông trại 2D (dùng chung cho `/farm-animation-test` và game ở `/journey`) đã chuyển sang **tranh màu mới** `assets/farm/pack-v4/15_NEW_REFERENCE_AND_SPRITE_SHEET/MASTER_REFERENCE_COLORFUL_FLOATING_FARM.png`, đảo có nền trong suốt thật: hết viền trời/mây quanh vách đá.
- `/farm-animation-test` là **trang showcase** theo spec "ANIMATION EFFECTS PACK":
  - 7 chế độ (Full Farm, Environment, Buildings, Animals, Crops, Water, Particles), mỗi chế độ có Bật/Tắt, Phát lại, tốc độ riêng.
  - 4 thanh trượt: Animation Speed, Wind, Particle Density, Parallax.
  - Bấm vào vật trong cảnh để xem tên file và các chuyển động của nó.
- Game `/journey` vẫn chạy như cũ trên tranh mới: ô ruộng, vùng bấm, bong bóng, camera, trời ngày/đêm.
- **Chưa** làm thêm cơ chế gameplay mới. Đợt này chỉ làm chuyển động và chuyển tranh.

## Production

- **Đã deploy ngày 2026-10-01**: commit `5c68678` (nhánh `farm-v5-colourful-showcase` đã gộp thẳng vào `main`).
  - Đã mở thử trên production: https://angi.221-121-1-68.sslip.io/farm-animation-test và `/journey`.
  - 60 fps, không lỗi console, mọi ảnh trả 200.
- Cách cập nhật lần sau:
  ```bash
  cd /var/www/angi
  sudo -u rexllm -H git pull --ff-only
  sudo -u rexllm -H npm ci
  sudo -u rexllm -H npm run build
  ```
  - Phải chạy dưới quyền `rexllm`, vì repo thuộc `rexllm:www-data`. Chạy git bằng root sẽ báo "dubious ownership".
  - Đừng thêm `safe.directory`: file build ra sẽ bị đổi chủ sang root.
  - Chỉ chạy `php server/bin/migrate.php` khi cấu trúc database đổi.
- Thông tin đăng nhập VPS **không** ghi ở đây (repo public): xem `docs/PAGESEED-SERVER-ACCESS.md` trên máy, file này không nằm trong git.
- Cảnh báo vô hại khi build trên server: `Database unavailable … readonly database`.
  - Bước xuất snapshot chạy dưới `rexllm` không ghi được vào SQLite, nên giữ nguyên snapshot đã commit.
  - Khi cần đưa dữ liệu món mới lên server, làm theo mục "Production" trong README.

## Chạy trên máy mới

```bash
npm install
npm run dev            # http://localhost:5173/farm-animation-test và /journey
npm run build          # angi.local (XAMPP) phục vụ dist/, phải build mới thấy thay đổi
```

## Quy trình tạo ảnh cảnh (public/farm-anim)

1. `node scripts/farm-anim/split-sprite-sheet.mjs`: tách sheet `assets/farm/pack-v4/15_NEW_REFERENCE_AND_SPRITE_SHEET/GENERATED_FARM_ASSET_SPRITE_SHEET.png` thành `assets/farm/pack-v4/16_EXTRACTED_SPRITES/` (PNG trong suốt, `index.json`, `_contact.png` có đánh số).
2. `node scripts/farm-anim/prepare.mjs`: dựng `public/farm-anim/` từ tranh màu và các món lấy từ sheet:
   - nền trời, mây, đảo;
   - layer cây, cỏ, hoa, lau sậy;
   - gà, cá, cánh cối xay, hạt hiệu ứng;
   - `layers.json`: vị trí, vùng bấm, bãi gà, bong bóng, điểm camera.
3. Toạ độ cũ đo trên tranh V4 được chuyển sang tranh mới bằng `scripts/farm-anim/warp.mjs`: phép biến đổi chung cộng độ lệch cục bộ lấy từ `v4-to-v5-flow.json`. Vật mới thì ghi thẳng toạ độ đo trên tranh mới.
4. Món trong sheet được chọn **theo vị trí trên sheet** (không theo số thứ tự), nên tách lại sheet vẫn khớp.

Ghi chú:
- Không dùng bộ `assets/farm/pack-v4-sprites`: bộ đó tách tự động nên thủng lõi trắng của mây và gà.
- Đã xoá `clean-edges.mjs` vì không còn cần, và nó sẽ làm hỏng bóng xanh của mây mới.

## File chính

- `src/features/farm-anim/engine/AnimationManager.ts`: vòng lặp chia 6 nhóm, mỗi nhóm có đồng hồ riêng; `replay()`, `setGroup()`, demo cây trồng, `inspect()` để chọn sprite.
- `src/features/farm-anim/engine/ParticleSystem.ts`: 13 loại hạt trong một bể cố định 240 hạt.
- `src/features/farm-anim/FarmAnimationTest.tsx` và `showcase.css`: bảng showcase.
- `src/features/farm-anim/systems/*`: mây, cây cỏ, nước, cá, thú, công trình, môi trường, ruộng, trời.
- Chữ của showcase: `src/i18n/messages/{vi,en}/farm.ts` → `anim.showcase`.

## Đã làm thêm (2026-10-02)

- **Cá**: dùng ảnh cá koi trong sheet (5 màu, `koi-1…5.webp`), thân uốn theo nhịp bơi, quay đầu, nhảy; đã xoá `koiPainter.ts`.
- **Chim xa**: dùng `fx-bird-1/2` của sheet, vỗ cánh từng đợt rồi lượn.
- **Ngỗng** cạnh giếng (`goose-body/head.webp`): thở, gật đầu, nhìn quanh, mổ. **Cây trong nhà kính** (`glass-plant-1…6.webp`, loại `indoor`): lắc nhẹ, không theo gió.
- **Chỗ vá**: `patchFill()` trong `prepare.mjs` lấy nguyên mảng tranh gần đó thay vì tô từng điểm: mặt ao chỗ cá cũ, cạnh cửa chuồng gà, tháp dưới cánh cối xay (vẽ lại thành tháp đá khi cánh quay).
- Mây dưới đảo đã bỏ hẳn (không còn "bank" trong `layers.json`).

## Việc còn lại / ý tưởng làm tiếp

- **Bò đi lại**: chưa làm. Bò ở chuồng đứng trước nền tối của chuồng, bò ở nhà bị mái chợ che một nửa; muốn bò đi được cần tranh chuồng không có bò (hoặc lớp bò riêng từ hoạ sĩ). /journey cũng gắn bong bóng và vùng bấm của bò vào chỗ cố định.
- **Gợn nước**: vẫn vẽ bằng code, vì gợn nước trong sheet còn dính caro.
- Còn 2 vệt nhỏ: mảng vàng nhỏ giữa cầu thang chuồng gà và cột, mảng cỏ tối nhỏ ở đầu cánh cối xay trên-trái.
- Đáy đảo bị cắt thẳng (lộ ra sau khi bỏ mây): chưa chọn cách xử lý (làm mờ dần hoặc vẽ thêm chóp đá).
- Ghé vườn bạn vẫn hiện đảo 3D cũ (`garden3d/FriendIsland`), chưa dùng cảnh 2D.

## Kiểm tra đã làm (2026-10-01)

- Chrome headless có GPU, chạy 70 giây: 60 fps, khoảng 2–3 ms mỗi khung hình. Không có lỗi console, không tải hỏng ảnh nào, bộ nhớ khoảng 66–78 MB.
- Đã chụp từng chế độ, bản điện thoại 390×844, và chế độ giảm chuyển động.
- `npm run typecheck` và eslint sạch.
- 4 test trong `Journey.test.tsx` hỏng **từ trước** đợt này ("Unable to find role=dialog" ở luồng gieo hạt và tìm quán). Đã sửa ngày 2026-10-02: `npm run verify` chạy qua hết (227/227 test).

Mẹo headless trên Windows:
- Chạy trong Git Bash thì thêm `MSYS_NO_PATHCONV=1`, nếu không thì `/farm-animation-test` bị đổi thành đường dẫn Windows.
- Dùng `withPage(..., { gpu: true })` trong `scripts/lib/headless.mjs` để đo fps thật. GPU giả mặc định chỉ chạy khoảng 4 fps.

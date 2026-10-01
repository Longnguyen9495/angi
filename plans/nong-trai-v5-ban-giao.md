# Nông trại v5 (tranh màu mới) — bàn giao để làm tiếp

Ngày: 2026-10-01. Nhánh: `farm-v5-colourful-showcase`.

## Trạng thái

- Cảnh nông trại 2D (dùng chung cho `/farm-animation-test` và game ở `/journey`) đã chuyển sang **tranh màu mới** `nongtraivuive.png`, đảo có nền trong suốt thật: hết viền trời/mây quanh vách đá.
- `/farm-animation-test` là **trang showcase** theo spec "ANIMATION EFFECTS PACK":
  - 7 chế độ (Full Farm, Environment, Buildings, Animals, Crops, Water, Particles), mỗi chế độ có Bật/Tắt, Phát lại, tốc độ riêng.
  - 4 thanh trượt: Animation Speed, Wind, Particle Density, Parallax.
  - Bấm vào vật trong cảnh để xem tên file và các chuyển động của nó.
- Game `/journey` vẫn chạy như cũ trên tranh mới: ô ruộng, vùng bấm, bong bóng, camera, trời ngày/đêm.
- **Chưa** làm thêm cơ chế gameplay mới. Đợt này chỉ làm chuyển động và chuyển tranh.

## Chạy trên máy mới

```bash
npm install
npm run dev            # http://localhost:5173/farm-animation-test và /journey
npm run build          # angi.local (XAMPP) phục vụ dist/, phải build mới thấy thay đổi
```

## Quy trình tạo ảnh cảnh (public/farm-anim)

1. `node scripts/farm-anim/split-sprite-sheet.mjs`: tách sheet `…_UPDATED/15_NEW_REFERENCE_AND_SPRITE_SHEET/GENERATED_FARM_ASSET_SPRITE_SHEET.png` thành `…_UPDATED/16_EXTRACTED_SPRITES/` (PNG trong suốt, `index.json`, `_contact.png` có đánh số).
2. `node scripts/farm-anim/prepare.mjs`: dựng `public/farm-anim/` từ tranh màu và các món lấy từ sheet:
   - nền trời, mây, đảo;
   - layer cây, cỏ, hoa, lau sậy;
   - gà, cá, cánh cối xay, hạt hiệu ứng;
   - `layers.json`: vị trí, vùng bấm, bãi gà, bong bóng, điểm camera.
3. Toạ độ cũ đo trên tranh V4 được chuyển sang tranh mới bằng `scripts/farm-anim/warp.mjs`: phép biến đổi chung cộng độ lệch cục bộ lấy từ `v4-to-v5-flow.json`. Vật mới thì ghi thẳng toạ độ đo trên tranh mới.
4. Món trong sheet được chọn **theo vị trí trên sheet** (không theo số thứ tự), nên tách lại sheet vẫn khớp.

Ghi chú:
- Không dùng bộ `FARM_GAME_ASSET_PACK_V4_INDIVIDUAL_SPRITES_V2`: bộ đó tách tự động nên thủng lõi trắng của mây và gà.
- Đã xoá `clean-edges.mjs` vì không còn cần, và nó sẽ làm hỏng bóng xanh của mây mới.

## File chính

- `src/features/farm-anim/engine/AnimationManager.ts`: vòng lặp chia 6 nhóm, mỗi nhóm có đồng hồ riêng; `replay()`, `setGroup()`, demo cây trồng, `inspect()` để chọn sprite.
- `src/features/farm-anim/engine/ParticleSystem.ts`: 13 loại hạt trong một bể cố định 240 hạt.
- `src/features/farm-anim/FarmAnimationTest.tsx` và `showcase.css`: bảng showcase.
- `src/features/farm-anim/systems/*`: mây, cây cỏ, nước, cá, thú, công trình, môi trường, ruộng, trời.
- Chữ của showcase: `src/i18n/messages/{vi,en}/farm.ts` → `anim.showcase`.

## Việc còn lại / ý tưởng làm tiếp

- **Bò** vẫn là bản sao mép mềm của chính con bò trong tranh (thở, cúi ăn, đuôi). Muốn bò đi lại được thì cần tách đầu, thân, đuôi thành lớp riêng, hoặc dùng bò trong sheet (số 89–93 trên `_contact.png`).
- **Cá** vẽ bằng code (`koiPainter`); ảnh cá trong sheet chưa dùng.
- Con ngỗng trắng cạnh giếng và cây trong nhà kính đang đứng yên, chưa có lớp riêng.
- Chỗ vá sau khi xoá vật còn vệt: dưới cánh cối xay (lộ khi cánh quay), cạnh cửa chuồng gà, mặt nước chỗ cá cũ.
- Gợn nước và nước trong mờ trong sheet còn dính caro (màu nước đã trộn với nền), nên vẫn vẽ bằng code.
- Chim xa vẫn là nét vẽ đơn giản; chim trong sheet (`fx-bird-*`) đã chép sang nhưng chưa dùng.

## Kiểm tra đã làm (2026-10-01)

- Chrome headless có GPU, chạy 70 giây: 60 fps, khoảng 2–3 ms mỗi khung hình. Không có lỗi console, không tải hỏng ảnh nào, bộ nhớ khoảng 66–78 MB.
- Đã chụp từng chế độ, bản điện thoại 390×844, và chế độ giảm chuyển động.
- `npm run typecheck` và eslint sạch.
- 4 test trong `Journey.test.tsx` hỏng **từ trước** đợt này ("Unable to find role=dialog" ở luồng gieo hạt và tìm quán), chưa sửa.

Mẹo headless trên Windows:
- Chạy trong Git Bash thì thêm `MSYS_NO_PATHCONV=1`, nếu không thì `/farm-animation-test` bị đổi thành đường dẫn Windows.
- Dùng `withPage(..., { gpu: true })` trong `scripts/lib/headless.mjs` để đo fps thật. GPU giả mặc định chỉ chạy khoảng 4 fps.

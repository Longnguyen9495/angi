# PlayCanvas — lát cắt 1 (góc vườn mẫu)

> Trạng thái: prototype kỹ thuật chạy được, **chưa nghiệm thu mỹ thuật**. Toàn bộ mô hình là placeholder dựng bằng code.
> Kế hoạch gốc: [nong-trai-stylized-realism-va-gameplay.md](nong-trai-stylized-realism-va-gameplay.md), mục 14–19.

## Phương án authoring đã chọn: Engine tích hợp trực tiếp

- `playcanvas@2.22.6` (MIT) chạy trong app React, bố cục cảnh là dữ liệu trong [sceneLayout.ts](../src/features/farm-pc/sceneLayout.ts).
- **Phương án này không có chỉnh cảnh trực quan.** Đổi vị trí/ánh sáng là sửa dữ liệu rồi reload (HMR của Vite). Lý do chính để chọn PlayCanvas — Editor — **chưa được kiểm chứng** ở lát cắt này.
- Để thử phương án Editor, cần làm ngoài môi trường code:
  1. Tạo tài khoản/project trên playcanvas.com; kiểm tra điều kiện project riêng tư, chi phí và quyền asset ở thời điểm đăng ký.
  2. Dựng lại góc mẫu trong Editor từ GLB (Blender), gắn tên entity trùng id trong `FarmView` (plot-N, barn).
  3. Export bản build/scene JSON, lưu phiên bản vào repo (không trỏ tới bản production có thể bị đổi ngầm).
  4. Viết loader thay cho các hàm `build*()` trong `engine/FarmEngine.ts`; hợp đồng `contract.ts` giữ nguyên.
  5. So workflow: sửa cảnh trong Editor + tái tạo build có thật sự nhanh hơn sửa `sceneLayout.ts` không.

## Kiến trúc

| Tệp | Vai trò |
|---|---|
| `src/features/farm-pc/contract.ts` | Kiểu dữ liệu duy nhất đi qua cầu nối: `FarmView`, `FarmEnv`, `FarmIntent`, `FarmEffect`, `FarmCommand` |
| `bridge.ts` | Hàm thuần: `buildFarmView` (domain → engine), `planCommand` (lệnh → action reducer, reducer có tiếng nói cuối), `CommandGate` (chống bấm đúp) |
| `engine/FarmEngine.ts` | Adapter PlayCanvas; chỉ giữ camera, selection, particle, tài nguyên GPU |
| `engine/geometry.ts` | Lưới mặt đất/vách đảo/lăng trụ mái sinh bằng code |
| `FarmPlayCanvas.tsx` | Host React: vòng đời engine, thanh hành động, trạng thái loading/lỗi/khoá/thành công |
| `renderer.ts` | Cờ thử nghiệm chọn renderer |
| `assets.ts` | Asset manifest (vai trò, nguồn, giấy phép, đường dẫn dự kiến, ngân sách) |

Luồng: engine gửi `select` → React hiện hành động → `planCommand` kiểm tra bằng selectors + `gameReducer` → handler sẵn có của `GardenSection` dispatch (lưu, announce, toast) → engine nhận `FarmView` mới và `FarmEffect` chỉ để minh hoạ. Animation không cấp thưởng, không trừ tài nguyên. Thu hoạch dùng luật hiện có: thu mọi ô chín một lần (`HARVEST_ALL`).

## Bật / tắt và rollback

- Bật trên một máy: mở `/journey?renderer=playcanvas` (ghi nhớ trong `localStorage` `bv.garden.renderer`).
- Tắt: `?renderer=three`, hoặc nút **Dùng 3D cũ** trên màn lỗi.
- Mặc định bản build: biến `VITE_GARDEN_RENDERER=playcanvas`; không đặt thì là `three`.
- Chỉ một renderer được mount; chunk engine (`FarmEngine-*.js`) chỉ tải khi chọn thử nghiệm.
- Rollback hoàn toàn: xoá `src/features/farm-pc/`, bỏ nhánh `renderer === 'playcanvas'` và 2 import trong `GardenSection.tsx`, gỡ `playcanvas` khỏi `package.json`. Không có thay đổi schema tiến độ, backend hay persistence.

## Kiểm tra đã chạy (2026-09-30)

- `tsc -b`, `eslint .`, `prettier --check`, `check:motion`: đạt. `vitest run`: 140/140 (baseline trước khi sửa 122/122; +18 test mới, gồm kiểm tra file asset tồn tại).
- `vite build` ra thư mục tạm: đạt. **Chưa chạy** `npm run build` đầy đủ vì bước `php server/bin/export-snapshot.php` ghi lại dữ liệu ngoài phạm vi.
- Trình duyệt thật (Edge headless, GPU GTX 1070 qua ANGLE D3D11, Vite dev): tải cảnh, chạm canvas chọn ô, thu hoạch (bấm đúp chỉ cộng 1), tải lại giữ tiến độ, tưới rồi bị chặn vì đất ẩm, reduced motion, đổi chất lượng không tạo canvas mới, đóng drawer gỡ canvas; không có lỗi runtime.
- Hiệu năng: chỉ đo được rAF 60/giây (giới hạn vsync) trên desktop trên; khung emulation điện thoại vẫn là GPU desktop nên **không phải số liệu điện thoại**. Chưa đo draw call, bộ nhớ, thiết bị thật.
- Kích thước: `FarmEngine` 1.23 MB min / 319 KB gzip sau bước PBR (trước đó 1.07 MB / 280 KB; chunk Three.js hiện có 1.01 MB / 274 KB). Asset tải sau lần vẽ đầu: texture 1.9 MB + HDR 1.4 MB + phông 28 KB.

Ảnh so sánh cùng trạng thái khởi đầu, giờ khác nhau theo đồng hồ máy: [playcanvas-lat-cat-1/](playcanvas-lat-cat-1/). Baseline là cả đảo, lát cắt mới chỉ là một góc — chưa phải so sánh cùng phạm vi.

## Bước 1b — vật liệu PBR và ánh sáng môi trường (CC0)

Theo quyết định: nâng độ thật trên góc PlayCanvas bằng texture + HDRI CC0, chưa đổi mô hình.

- 6 bộ texture Poly Haven (màu, normal GL, ARM) trong `public/textures/farm/`, 512–1024 px webp; HDR 1K trong `public/env/`. Nguồn, tác giả, giấy phép: `FARM_TEXTURES` trong `src/features/farm-pc/assets.ts`; `assets.test.ts` kiểm tra mọi file engine tải đều tồn tại.
- Màu ảnh chụp được nhuộm về bảng màu art direction (hệ số = màu đích ÷ màu trung bình đo được của texture), nên cỏ/gỗ/đá không theo màu gốc của ảnh.
- HDR chỉ dùng làm ánh sáng môi trường (env atlas). Phông trời là dải mây cắt sẵn từ bản tonemapped, đặt trên mặt phẳng gắn camera; nửa dưới ảnh (mặt phản chiếu) không dùng.
- Vừa/Đẹp: `CameraFrame` với SSAO, MSAA 4×, bloom rất nhẹ, grading, vignette. Nhẹ: không hậu kỳ, không normal/ARM, chỉ bóng giả.
- Tải dần: cảnh hiện ngay bằng màu phẳng; texture/HDR gắn khi xong; file lỗi chỉ mất chi tiết đó.
- Sửa lỗi phát hiện khi làm: đổi material qua `render.material` không có tác dụng với mesh instance tự tạo, nên đất ướt sau khi tưới trước đây không đổi màu. Nay đổi trực tiếp trên mesh instance; đã chụp xác nhận.

Ảnh: `pbr-dep-trua`, `pbr-dep-chieu`, `pbr-nhe-trua`, `pbr-tuoi-dat-uot` trong thư mục ảnh.

## Hạn chế và việc tiếp theo

- Mô hình vẫn là placeholder dựng bằng code (tán cây là cụm cầu, cây trồng, đá dẹt, bụi cỏ). Texture/HDRI đã làm bề mặt và ánh sáng thật hơn, nhưng hình khối là giới hạn chính còn lại. Đây không phải nghiệm thu mỹ thuật so với ảnh tham chiếu.
- Góc mẫu chưa có giếng, bếp, chuồng, trang trí, nông trại bạn bè; các khu này vẫn ở renderer cũ và chế độ 2D.
- Asset cần bổ sung (Blender → GLB, xem `assets.ts`): nhà kho, cây lá rộng, luống, 10 loài cây × 4 giai đoạn, đường đá, mặt đất góc, bóng tiếp xúc bake.
- Chưa có pinch-zoom; zoom bằng nút. Kéo ngang để xoay, kéo dọc vẫn cuộn trang.
- Chỉ đề xuất chuyển toàn bộ khi góc mẫu có asset thật đẹp hơn baseline, workflow Editor được chứng minh và mobile thật đạt ngân sách.

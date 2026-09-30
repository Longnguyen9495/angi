# Prompt giao việc: hoàn thiện góc vườn PlayCanvas

Hai bản: **A** cho phiên Claude Code hoặc lập trình viên làm tiếp; **B** cho designer thao tác tay trong Blender/Editor. Dán nguyên văn, sửa phần trong `[...]` nếu cần.

---

## A. Prompt cho Claude Code / lập trình viên

```text
Bạn là senior React/TypeScript + PlayCanvas engineer kiêm technical artist. Làm tiếp và hoàn thiện
góc vườn PlayCanvas của project "Hành trình Bếp Việt" (repo angi, nhánh playcanvas-corner).

ĐỌC TRƯỚC, KHÔNG BỎ QUA:
- plans/playcanvas-editor-pipeline.md (tiến độ từng giai đoạn, quy ước tên, cách làm trên máy mới)
- plans/playcanvas-lat-cat-1.md (những gì đã làm, số đo, hạn chế)
- plans/nong-trai-stylized-realism-va-gameplay.md mục 14–19 (định hướng, nghiệm thu)
- src/features/farm-pc/: contract.ts, bridge.ts, naming.ts, sceneLayout.ts, assets.ts,
  scripts/events.ts, scripts/motion.ts, engine/FarmEngine.ts và các file *.test.ts

HIỆN TRẠNG:
- App: góc vườn PlayCanvas chạy sau cờ ?renderer=playcanvas (mặc định vẫn là Three.js).
  Gameplay đi qua reducer thật; engine chỉ nhận FarmView và gửi FarmIntent.
- Editor: project "angi-farm-corner" (công khai, engine 2.22.6), scene "corner" đã dựng bằng MCP,
  đủ 34 tên bắt buộc, có checkpoint "corner v1", "corner v2".
- Nhà kho, cây, luống, cây trồng vẫn là khối cơ bản: đây là khoảng cách lớn nhất về mỹ thuật.

QUY TẮC BẮT BUỘC:
1. Domain/reducer là nguồn sự thật. Script PlayCanvas chỉ biểu diễn: không lưu tiến độ, không cấp
   thưởng, không trừ tài nguyên, không gọi mạng.
2. Giữ đúng tên entity theo src/features/farm-pc/naming.ts; chạy validateCorner sau mỗi đợt sửa cảnh.
3. Tạo checkpoint trong Editor trước mọi thay đổi hàng loạt qua MCP (MCP sửa thẳng project, xoá được).
4. Project Editor và repo đều công khai: chỉ dùng asset tự làm hoặc CC0/giấy phép cho phép phân phối
   web; ghi nguồn, tác giả, giấy phép vào assets.ts (và SOURCE.md của bản xuất). Không đưa bí mật lên.
5. Không tạo đường dẫn tới file không tồn tại; giữ test "mọi file engine tải đều tồn tại".
6. Làm trên nhánh playcanvas-corner. Không push main, không deploy production nếu tôi chưa đồng ý.
7. Không báo FPS, kết quả test/build hay "đạt mỹ thuật" nếu chưa đo/chạy thật.
8. Chỉ hỏi khi bị chặn bởi quyết định không tự kiểm tra được; việc kiểm tra được thì tự làm.

VIỆC CẦN LÀM (theo thứ tự, xong bước nào báo bước đó):
1. Kiểm tra môi trường: `npm ci`; MCP playcanvas đã kết nối (list_scenes); validateCorner trên scene
   "corner"; tạo checkpoint.
2. Mô hình thật cho góc mẫu, theo ngân sách trong assets.ts (nhà kho ≤ 6k tam giác, cây ≤ 4k,
   luống ≤ 2.5k, mỗi cây trồng ≤ 800; texture 512–1024):
   - Ưu tiên GLB designer gửi trong [thư mục/đường dẫn]. Nếu chưa có, tìm asset CC0 stylized cùng
     phong cách, đánh giá trước khi dùng.
   - Upload vào Editor, đặt vào đúng entity cùng tên (giữ barn-hit, barn-door, plot-N/soil, plot-N/crop),
     tắt khối cơ bản cũ thay vì xoá.
   - Cây trồng: 10 loài × 4 giai đoạn (sprout, young, flowering, ready), đặt tên crop-{loài}-{giai đoạn}.
3. Hiệu ứng: tạo particle fx-water, fx-dust, fx-sparkle (autoplay tắt) và gắn script farmFx; giữ
   farmSway / farmDoor / farmLamp. Sửa script thì sửa scripts/motion.ts rồi đóng gói lại theo hướng dẫn
   trong plans/playcanvas-editor-pipeline.md.
4. So sánh hình ảnh: chụp capture_viewport qua camera game, cùng giờ/trạng thái với
   plans/playcanvas-lat-cat-1/*.webp và baseline Three.js; nêu rõ chỗ đẹp hơn, chỗ còn kém.
5. Xuất bản: tải build từ Editor vào public/farm-scenes/corner-vN/ (không ghi đè bản cũ) + SOURCE.md
   (ngày, project/scene id, engine, danh sách asset + nguồn + giấy phép). Kiểm tra kích thước (mục tiêu
   ≤ 3 MB chưa tính HDR).
6. Tích hợp (giai đoạn 6): loader trong src/features/farm-pc/engine/ nạp bản xuất, bind gameplay theo
   tên (validateCorner), fallback về góc dựng bằng code khi lỗi/thiếu entity, bật bằng
   ?renderer=playcanvas&scene=corner-vN. Thêm test trên NullGraphicsDevice cho loader và binding.
7. Nghiệm thu (giai đoạn 7): gieo/tưới/thu hoạch, bấm đúp không cộng hai lần, tải lại giữ tiến độ,
   giảm chuyển động, đóng drawer gỡ canvas, không lỗi console; chạy typecheck, lint, prettier, test,
   vite build. Đo trên ít nhất một điện thoại thật nếu có (ghi model/trình duyệt).

BÁO CÁO CUỐI: thay đổi chính, asset mới + nguồn + giấy phép, kiểm tra đã chạy và chưa chạy (kèm lý do),
số đo hiệu năng thật (hoặc nói rõ chưa đo), ảnh trước/sau, cách bật/tắt và rollback, việc còn lại.
```

---

## B. Brief cho designer (làm tay trong Blender / Editor)

```text
Mục tiêu: thay các khối cơ bản trong scene "corner" (project PlayCanvas "angi-farm-corner") bằng mô hình
đẹp, cùng phong cách diorama ấm áp, bán hiện thực. Game đọc vật thể theo TÊN, nên giữ nguyên tên entity.

Cần làm (Blender → GLB):
- Nhà kho (≤ 6k tam giác): thân gỗ, mái ngói đất nung có độ dày, cánh cửa TÁCH RIÊNG
  (bản lề ở mép trái) để mở được, chân móng đá, bảng hiệu.
- Cây lá rộng (≤ 4k): thân + 4–6 cụm tán có khoảng rỗng, không đen.
- Luống (≤ 2.5k): khung ván dày, cọc góc; KHÔNG gồm cây trồng.
- Cây trồng (≤ 800 mỗi file): 10 loài × 4 giai đoạn, tên crop-{loài}-{giai đoạn}
  (loài: rice, herbs, chili, scallion, bean, tomato, lemongrass, garlic, cucumber, lime;
   giai đoạn: sprout, young, flowering, ready).
Quy chuẩn: mét, +Y lên, mặt trước nhìn +Z, apply scale/rotation, gốc ở chân vật, texture 512–1024.

Trong Editor:
- Tạo checkpoint trước khi sửa (Version Control).
- Kéo GLB vào Assets → đặt làm con của entity cùng tên (barn, tree, bed…); giữ nguyên barn-hit,
  barn-door, plot-1…plot-9 (mỗi ô có soil và crop).
- Chỉ dùng asset tự làm hoặc CC0; ghi lại nguồn/giấy phép từng file.
- Xem qua camera "Camera" nhưng đừng xoay/zoom khi đang nhìn qua nó (sẽ làm lệch camera game);
  điều hướng bằng camera "Perspective".
Xong thì báo lại để lập trình viên xuất bản và nối vào game.
```

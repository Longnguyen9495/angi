# Khu vườn 3D "trên mây" — plan chi tiết

Ngày 2026-09-30. Mục tiêu: khu vườn trong Hành trình thành một **hòn đảo nổi 3D** kiểu "Khu vườn trên mây",
chơi được trên cả mobile lẫn desktop, có vật nuôi, đặt đồ trang trí, và ghé thăm vườn bạn bè.

## Nguyên tắc giữ nguyên

- **Chọn món nhanh là chính.** Cảnh 3D chỉ tải khi mở Hành trình (chunk riêng), reel không nặng thêm byte nào.
- **Không cây héo, không phạt, không hái trộm.** Bạn bè chỉ *giúp* nhau (tưới giúp, tặng hạt).
- **Logic game dùng chung.** Gieo/tưới/thu hoạch/nấu vẫn là reducer hiện có; 3D chỉ là lớp hiển thị + điều khiển.
- **Luôn có bản 2D.** Máy không có WebGL, máy yếu, hoặc bật giảm chuyển động → khu vườn 2D hiện tại. Có nút chuyển 2D/3D.
- **Không animate SVG** (quy tắc dự án): cảnh 3D là WebGL, UI phủ lên là HTML.

## Hướng hình ảnh

- **Ban ngày**: trời xanh, mây trắng trôi, đảo cỏ xanh nổi giữa trời, mặt dưới đảo là đất đá.
- **Chiều tà**: trời cam hồng. **Ban đêm**: tông tối ấm của Bếp Việt, trăng, đèn lồng sáng, đom đóm.
- Low-poly kiểu hoạt hình, **dựng hoàn toàn bằng code** (không tải model ngoài): nhẹ, đồng bộ, không lo bản quyền.

## A. Cảnh 3D

| Thành phần | Chi tiết |
| --- | --- |
| Đảo | Mặt cỏ lượn sóng nhẹ, mép đất, đáy đá hình chóp; lối đi lát đá; vài cây xanh, bụi hoa |
| Ô đất | 6–9 luống (theo cấp) xếp lưới 3×3, luống sẫm khi ướt; ô sắp mở hiện khung mờ + biển "Cấp N" |
| Cây | 10 loại × 4 giai đoạn (mầm, non, ra hoa, chín) dựng bằng khối: lúa trổ bông vàng, hành ống, ớt quả đỏ, cà chua giàn, đậu leo cọc, sả bụi, tỏi củ, dưa leo giàn, chanh cây, rau thơm bụi hoa tím |
| Công trình | Nhà kho (mở Kho nguyên liệu), giếng nước (tưới), chuồng gà, chuồng bò, bếp Cô Ba (mở công thức) |
| Nhân vật | Cô Ba đi lại giữa bếp — ruộng — giếng; gà mổ thóc; bò nhai cỏ |
| Trời | Gradient theo giờ thật, mặt trời/trăng, mây trôi, sao đêm |
| Hiệu ứng | Cây đung đưa, nảy khi lên giai đoạn, lấp lánh khi chín, giọt nước khi tưới, hạt bay vào kho khi thu hoạch |
| Camera | Kéo để xoay quanh đảo, chụm/cuộn để zoom, giới hạn góc; chạm một ô → camera lướt tới ô đó |

**Tương tác**: chạm ô / công trình / vật nuôi → **thẻ HTML** nổi phía dưới (mobile) hoặc bên phải (desktop):
tên, trạng thái, thời gian còn lại, nút hành động (Gieo [chọn hạt] · Tưới · Thu hoạch · Cho ăn · Thu trứng…).
Mọi nút đều bấm được bằng bàn phím; có danh sách ô dạng văn bản cho trình đọc màn hình.

**Hiệu năng**:
- 3 mức đồ hoạ: *Nhẹ* (DPR 1, không bóng, ít mây), *Vừa*, *Đẹp* (bóng mềm, DPR ≤ 2). Tự chọn theo máy, đổi được.
- Instancing cho cỏ/hoa/đá; hình học dùng chung; không texture ảnh lớn.
- Dừng render khi tab ẩn hoặc khu vườn ra khỏi màn hình; giảm chuyển động → chỉ render khi có thay đổi.

## B. Lối chơi mới

- **Vật nuôi**:
  - Gà (mở cấp 2): cho ăn 1 **Gạo** → sau 3 giờ thu **Trứng**.
  - Bò (mở cấp 4): cho ăn 1 **Rau thơm** (cỏ) → sau 5 giờ thu **Sữa**.
  - Không cho ăn thì vật nuôi chỉ nghỉ, không bao giờ ốm/chết.
- **Nguyên liệu mới** trứng, sữa: vào kho, bán ở chợ, xuất hiện trong đơn Cô Ba; thêm 2 công thức: *Cơm chiên trứng* (Nam Bộ, mở sẵn)
  và *Bánh flan* (Nam Bộ).
- **Đặt đồ trang trí**: chế độ "Sắp xếp vườn" — kéo đồ đã mua đặt lên ô trống trên đảo, xoay 90°, cất vào kho.

## C. Bạn bè (cần tài khoản)

- Mỗi tài khoản có **mã vườn** 6 ký tự và **tên vườn** tuỳ đặt (mặc định "Vườn của bạn" — không phải tên thật).
- **Kết bạn** bằng mã; danh sách bạn; bỏ bạn.
- **Ghé vườn bạn**: xem đảo 3D của bạn (chỉ đọc, từ bản đồng bộ gần nhất).
- **Tưới giúp**: mỗi ngày tưới giúp tối đa 1 ô/bạn, 5 bạn/ngày. Chủ vườn nhận "mưa của bạn" (rút 25% thời gian, không tốn lượt tưới của mình)
  khi mở app; người giúp nhận +3 XP.
- **Quà mỗi ngày**: tặng bạn 1 hạt từ "giỏ quà Cô Ba" (miễn phí, 1 lần/ngày/bạn) — không trừ kho người tặng nên không gian lận được.
- **Bảng xếp hạng bạn bè** theo cấp và số món đã nấu.
- **Máy chủ quyết định** mọi thứ giữa hai người: kiểm tra đăng nhập, quan hệ bạn bè, giới hạn trong ngày, trạng thái ô
  trong bản đồng bộ. Sự kiện lưu ở bảng `farm_events`; client chủ vườn nhận và áp qua reducer (idempotent theo id sự kiện).

## Thứ tự làm

1. Domain: vật nuôi, trứng/sữa, công thức mới, vị trí đồ trang trí, sự kiện bạn bè — kèm test.
2. Cảnh 3D (A) + thẻ tương tác + chuyển 2D/3D + mức đồ hoạ.
3. Vật nuôi & sắp xếp vườn trong 3D (B).
4. Máy chủ bạn bè + API + UI (C).
5. Kiểm tra trên mobile/desktop (ảnh chụp, đo khung hình), sửa, rồi bàn giao để test.

## Trạng thái (2026-09-30): đã làm đủ A + B + C, chờ test

- Code 3D: `src/features/garden3d/` (tải lười, chỉ khi mở Khu vườn ở chế độ 3D; ~260 KB gzip cho three + r3f).
  `Garden3D.tsx` (vườn của mình), `FriendIsland.tsx` (đảo của bạn, chỉ xem), `scene/*` (đảo, ô đất, cây, công trình, vật nuôi,
  Cô Ba, trang trí, trời/mây/sao/đom đóm, hiệu ứng, camera).
- Nút 3D/2D cạnh "Tưới cây" (nhớ theo máy). Mặc định 3D nếu có WebGL và không bật giảm chuyển động. Mất WebGL/lỗi → tự về 2D.
- Mức đồ hoạ Nhẹ/Vừa/Đẹp (nhớ theo máy); ngoài màn hình thì dừng vẽ.
- Điều khiển: kéo ngang xoay đảo, kéo dọc cuộn trang, chụm 2 ngón / Ctrl+cuộn để zoom, nút + − ↺.
- Máy chủ: `server/lib/Friends.php`, bảng `garden_profiles`, `friendships`, `farm_events`; kiểm tra `npm run test:account`.
- Cần chạy `php server/bin/migrate.php` trên VPS khi deploy (chỉ tạo bảng mới, không đụng bảng cũ).

Việc để tối ưu sau khi test: tách chunk three nhỏ hơn, mô hình trên máy yếu, cảm giác chạm trên iOS/Android thật.

## Nâng cấp "cozy floating-island diorama" (2026-09-30)

Toàn bộ vẫn dựng bằng code (không có asset ngoài, không thêm dependency). Cách làm:
- `scene/kit.ts`: ghép nhiều khối thành 1 geometry có màu theo mặt (biến thiên màu, tối dần ở chân = AO giả),
  vật liệu PBR nhám `MeshStandardMaterial` (flat shading), gió cho lá/cỏ bằng shader dùng chung 1 uniform.
- `scene/nature.ts`: thông nhiều tầng, cây tán rộng phân nhánh, bụi, đá vách, đá lát, cụm cỏ, cụm hoa, rễ/dây leo.
- `scene/architecture.ts`: nhà kho, quầy Bếp Cô Ba (+ mái vải), giếng, chuồng gà, chuồng bò, ngói âm dương, chum.
- `scene/Island.tsx`: viền đảo hữu cơ (`edgeRadius`), mặt cỏ loang olive/rêu, vệt đất mòn dọc lối, mép cỏ, dải đất,
  vách đá nhiều tầng, đảo xa. `groundAt` phẳng tuyệt đối ở luống/công trình/lối đi (có test).
- `scene/Instances.tsx`: instancing + bóng tiếp xúc giả (`Blobs`) cho mọi mức.
- Ánh sáng: nắng ấm trên-trái, hemisphere trời/đất lạnh; bóng mềm (PCFSoft) ở Vừa 1024 / Đẹp 2048; Nhẹ không bóng động.

Đo trên máy dev (Edge headless, không phải điện thoại thật): ~60 FPS cả 3 mức;
Nhẹ ~125 draw calls / 81k tam giác, Vừa ~205 / 139k, Đẹp ~200 / 143k (đã gồm lượt vẽ bóng). Xem số liệu với `?g3d-debug`.

Asset nên có từ artist để tiến gần ảnh tham chiếu (chưa có trong repo):
- Công trình (nhà kho, quầy Cô Ba, giếng, chuồng gà/bò): glTF/GLB low-poly có bevel, ≤ 3–5k tam giác mỗi cái,
  1 atlas 1024² (gỗ mật ong, ngói đất nung phai, đá ấm, vải sọc), bake AO; gốc toạ độ ở chân, mặt trước +z.
- Cây: 2–3 thông + 2–3 cây tán rộng dạng card lá alpha-cutout (atlas lá 512²), ≤ 1.5k tam giác, vertex color cho gió.
- Texture dùng chung (tileable 512², có normal + roughness): cỏ, đất luống, đá lát, gỗ ván.
- Nhân vật Cô Ba và gà/bò có rig đơn giản (đi, mổ, nhai) nếu muốn chuyển động tự nhiên hơn.

### Lượt 2 (2026-09-30)
- Vân bề mặt procedural trong shader (`kit.ts`, thuộc tính `surf`): thớ gỗ theo chiều dài thanh, đá vân + nứt,
  ngói loang, đất vụn, lá lốm đốm, cỏ sợi; tự mờ theo khoảng cách (không nhấp nháy).
- Đổ bóng mượt cho khối tròn/lá, đá giữ mặt cắt; ván/cột/dầm bo cạnh (`box()` = RoundedBoxGeometry).
- Tán cây tán rộng + bụi: lõi tối + thẻ lá alpha-cutout (texture vẽ bằng canvas lúc chạy), pháp tuyến hướng theo tán.
- Quầng sáng đèn lồng ban đêm (sprite cộng sáng), đêm sáng hơn một chút.
- Đo lại (Edge headless): ~60 FPS; Nhẹ ~130 calls / 105k tam giác, Vừa ~210 / 186k, Đẹp ~205 / 190k.

### Lượt 3 (2026-09-30): texture ảnh CC0
- 8 texture Poly Haven (CC0): gỗ, đá, đất, cỏ, đất nung, vỏ thông, lá, vải thô — bản xám 256 px đã chuẩn hoá
  tương phản trong `public/images/garden3d/detail/` (~300 KB, chỉ tải khi mở vườn 3D; nguồn: `CREDITS.md`).
- `scene/detail.ts` ghép 8 ảnh thành 2 texture RGBA lúc chạy; shader (`kit.ts`) chiếu triplanar theo toạ độ vật thể
  (không cần UV), thớ gỗ/vỏ cây theo chiều dài, cường độ vừa phải để giữ bảng màu vẽ tay; kèm bump suy từ ảnh.
- Tải lỗi thì tự quay về vân procedural. Gói lại: `scripts/garden3d/pack-detail.html`.

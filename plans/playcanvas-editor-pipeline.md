# Kế hoạch: dựng góc vườn bằng Blender + PlayCanvas Editor

> Trạng thái (2026-09-30): **giai đoạn 3 và 4 đã làm xong trong code**, cùng 6 đồ vật CC0 thay placeholder. Giai đoạn 0, 1 (cây/nhà kho/luống), 2 và 5 cần bạn thao tác ngoài code; giai đoạn 6 làm khi có bản xuất đầu tiên. Làm tiếp từ lát cắt đã có: [playcanvas-lat-cat-1.md](playcanvas-lat-cat-1.md).

## Tiến độ

| Giai đoạn | Trạng thái | Ghi chú |
|---|---|---|
| 0 — Chuẩn bị | ✅ Xong | Project `angi-farm-corner` (công khai), engine 2.22.6 |
| 1 — Mô hình | 🟡 Một phần | Đã có 6 đồ vật CC0 (Poly Haven) trong `public/models/farm/props/`. **Cây, nhà kho, luống, cây trồng vẫn cần Blender**: mô hình CC0 có sẵn của cây đều nặng hàng triệu tam giác |
| 2 — Lắp cảnh Editor | ✅ Bản đầu | Claude dựng qua PlayCanvas MCP (xem mục dưới); bạn chỉnh tay tiếp tuỳ ý |
| 3 — Quy ước tên | ✅ Xong | `src/features/farm-pc/naming.ts` (`CORNER`, `validateCorner`); góc dựng bằng code đã đặt tên theo quy ước và có test |
| 4 — Script chuyển động | ✅ Xong | `src/features/farm-pc/scripts/`: `Sway`, `Pop`, `DoorOnSelect`, `Lamp`, `PlayFx` + sự kiện `farm:*`; đang chạy trong góc hiện tại (cây/lá lắc, cây trồng nảy khi đổi giai đoạn, cửa kho mở khi chọn, đèn theo buổi) |
| 5 — Xuất bản | ⏳ Bạn làm | |
| 6 — Tích hợp bản xuất | ⏸ Chờ bản xuất | Đã sẵn: `startFarmEngine`, `validateCorner`, test engine thật trên `NullGraphicsDevice` |
| 7 — Nghiệm thu | ⏸ | |

**Script trong Editor:** đã upload `farm/scripts/farm-motion.mjs` (đóng gói từ `src/features/farm-pc/scripts/motion.ts`). Sửa script thì sửa file TS, đóng gói lại bằng `npx esbuild src/features/farm-pc/scripts/motion.ts --bundle --format=esm --external:playcanvas --target=es2022 --outfile=farm-motion.mjs`, đổi `var X = class extends Script` thành `export class X extends Script` (parser của Editor chỉ nhận dạng này), rồi upload lại. Ghi chú cũ: các file trong `scripts/` là TypeScript. Để upload lên Editor cần bản JS; đây là việc của giai đoạn 6 (thêm bước build `scripts/*.ts` → `.mjs`, hoặc đồng bộ bằng `playcanvas-sync`).
> Mục tiêu: thay các khối dựng bằng code trong góc mẫu bằng mô hình thật và hiệu ứng chuyển động do bạn chỉnh trực quan, **không đổi luật chơi, tiến độ hay backend**.

## Làm tiếp trên máy khác

1. `git fetch && git switch playcanvas-corner`, rồi `npm ci`.
2. Node ≥ 22.18. Đăng ký MCP cho Claude Code (cấu hình theo từng máy):
   `claude mcp add playcanvas -- npx -y @playcanvas/editor-mcp-server`
3. Mở phiên Claude Code mới, mở project `angi-farm-corner` trong Editor → nút **MCP** (thanh dưới) → port `52000` → **Connect**. Cho phép popup với playcanvas.com nếu muốn Claude tự Launch thử.
4. Nhắn Claude: "đọc plans/playcanvas-editor-pipeline.md rồi làm tiếp góc vườn trong Editor".

`docs/PAGESEED-SERVER-ACCESS.md` (hướng dẫn truy cập VPS) không nằm trong repo; cần deploy từ máy mới thì chép file đó sang bằng tay.

## Cảnh `corner` trong Editor (dựng qua MCP, 2026-09-30)

- 172 entity dưới `corner-root`, đủ 34 tên bắt buộc (`barn`, `barn-hit`, `barn-door`, `bed`, `plot-1…9` với `soil` + `crop`, `tree`, `sun`). Toạ độ sinh từ `sceneLayout.ts`, nên khớp với góc trong app.
- Mặt đảo và mái hồi là GLB xuất từ chính `engine/geometry.ts` (`island`, `gable`). Nhà kho, cây, luống, đường đá, bụi cỏ dựng bằng khối cơ bản. 6 đồ vật CC0 là template.
- 27 vật liệu PBR (texture Poly Haven, nhuộm theo bảng màu; Editor giới hạn diffuse ≤ 1 nên vài màu tối hơn một chút so với app), skybox từ HDR (prefilter, cường độ 0.7), tone mapping Neutral, fog linear, nắng có bóng 2048.
- Camera = góc nhìn game (FOV 34), có phông mây gắn theo camera.
- Script: `farmSway` trên 6 cụm tán cây, `farmDoor` trên `barn-door`, `farmLamp` trên `lamp`. Đã Launch thử: không có lỗi, chỉ 2 cảnh báo vô hại từ vật liệu GLB.
- Checkpoint: "Before Claude builds…" (trạng thái trống), "corner v1", "corner v2". Khôi phục được trong Version Control của Editor.
- Lưu ý: khi viewport Editor nhìn qua entity `Camera`, xoay/zoom sẽ di chuyển chính camera game. Chọn lại camera `Perspective` trước khi điều hướng.
- Ảnh: `plans/playcanvas-lat-cat-1/editor-corner-camera.webp`, `editor-launch.webp`.

## Nguyên tắc (đọc trước khi bắt đầu)

- **Blender** làm hình khối và hoạt ảnh (khung xương, keyframe). **Editor** lắp cảnh: vị trí, vật liệu, ánh sáng, camera, particle, gắn script. **React/domain** vẫn quyết định luật: gieo, tưới, thu hoạch, thưởng, lưu.
- Bản xuất từ Editor chỉ chứa **thế giới 3D và hiệu ứng**. Không viết tiến độ, kinh tế hay lưu trữ trong script PlayCanvas.
- Game nhận ra vật thể **qua tên entity**; đặt sai tên thì mất tương tác. Xem mục 3.
- Mỗi bản xuất được **ghim phiên bản** trong repo; production không đọc trực tiếp từ playcanvas.com.
- Làm **một góc mẫu** trước (nhà kho + 1 cây + luống + đường đá). Chỉ nhân rộng khi góc mẫu đạt nghiệm thu ở mục 7.

## Phân công

| Việc | Ai |
|---|---|
| Tạo tài khoản/project, chọn gói, dựng mô hình, lắp cảnh, xuất bản | Bạn (hoặc artist) |
| Script chuyển động dùng trong Editor, loader nạp bản xuất, nối gameplay, test | Claude (dùng prompt ở mục 8) |

---

## Giai đoạn 0 — Chuẩn bị (≈ 1 buổi)

- [ ] Kiểm tra trên trang giá PlayCanvas: project **riêng tư** có mất phí không, giới hạn dung lượng, quyền tải bản build về. Ghi lại ngày kiểm tra và kết quả vào mục "Ghi chú quyết định" cuối file.
- [ ] Tạo tài khoản và project `angi-farm-corner`.
- [ ] Trong Project Settings: chọn **engine 2.22.x**, cùng phiên bản với `playcanvas` trong `package.json`. Lệch phiên bản thì scene JSON có thể không đọc được.
- [ ] Cài **Blender 4.x**. Cài glTF Transform (`npm i -g @gltf-transform/cli`) để tối ưu GLB.
- [ ] Nếu dùng mô hình tải ngoài: chỉ lấy **CC0** hoặc giấy phép cho phép dùng thương mại và phân phối trên web. Ghi nguồn ngay khi tải.

## Giai đoạn 1 — Mô hình trong Blender

### Danh sách cho góc mẫu

| File | Nội dung | Tam giác (mục tiêu) | Texture |
|---|---|---|---|
| `barn.glb` | Thân gỗ, mái ngói có độ dày, cửa (tách riêng để mở), chân móng đá, bảng hiệu, thùng/bao | ≤ 6 000 | atlas 1024² dùng chung |
| `tree-broadleaf.glb` | Thân, cành, 4–6 cụm tán dạng lá thẻ (alpha) | ≤ 4 000 | 512² lá + vỏ |
| `bed.glb` | Khung ván dày, cọc góc, đất gợn; **không** chứa cây trồng | ≤ 2 500 | 512² |
| `crops/{crop}-{stage}.glb` | Mỗi loài 4 giai đoạn: `sprout`, `young`, `flowering`, `ready`. Bắt đầu với 2 loài: `herbs`, `scallion` | ≤ 800 / file | atlas cây trồng 1024² |
| `path-stones.glb` | 7–8 phiến đá xám ấm, khác kích thước | ≤ 1 200 | 512² |
| `props.glb` | Chum, giỏ, bao, hoa, cỏ cụm | ≤ 2 000 | dùng atlas chung |

Texture CC0 đang có sẵn trong `public/textures/farm/` có thể dùng lại để vẽ/bake.

### Quy chuẩn xuất

- [ ] Đơn vị **mét**, trục **+Y lên**, mặt trước nhìn về **+Z**. Apply scale/rotation (Ctrl+A) trước khi xuất.
- [ ] Gốc (origin) đặt ở **chân vật**, chạm mặt đất.
- [ ] Đặt tên node trong Blender có nghĩa (`door`, `roof`, `canopy_1`…), vì script sẽ tìm theo tên.
- [ ] Hoạt ảnh là **Action** riêng, đặt tên rõ: `idle`, `door_open`, `sway`, `pop`. Bật "Export animations".
- [ ] Xuất **glTF Binary (.glb)**, vật liệu Principled BSDF (base color, roughness, normal).
- [ ] Tối ưu: `gltf-transform optimize in.glb out.glb --texture-compress webp`. Kiểm tra lại trong Editor sau khi nén.
- [ ] Xem mô hình **ở góc camera gameplay** (nhìn chéo từ trên, xa khoảng 13 m) trước khi thêm chi tiết nhỏ.

### Hoạt ảnh: làm ở đâu

| Chuyển động | Làm trong | Ghi chú |
|---|---|---|
| Cửa kho mở khi chọn nhà kho | Blender (`door_open`) | Editor phát theo sự kiện |
| Gà mổ, đổi hướng (giai đoạn sau) | Blender (khung xương) | State graph trong Editor |
| Cây, cỏ, lá lắc theo gió | Script `sway` (mục 4) | Nhẹ, lệch pha; tắt khi giảm chuyển động |
| Cây trồng "nảy" khi lên giai đoạn / thu hoạch | Script `pop` | |
| Nước tưới, bụi đất khi gieo, lấp lánh khi chín | Particle trong Editor | Chỉ minh hoạ, không cộng thưởng |
| Khói bếp, đèn lồng về đêm | Particle + script `lamp` | |

## Giai đoạn 2 — Lắp cảnh trong Editor

- [ ] Upload các GLB. Kéo vào scene tên `corner`.
- [ ] Bố cục bám theo layout đang chạy (`src/features/farm-pc/sceneLayout.ts`): kho sau-trái, cây sau-phải, luống giữa-trước, đường đá từ mép trước tới cửa kho.
- [ ] Ánh sáng khớp bản code:
  - 1 directional (nắng ấm), bật shadow;
  - Skybox/env dùng HDR `kloofendal_48d_partly_cloudy_puresky_1k.hdr` (có trong `public/env/`);
  - Tone mapping **Neutral**, gamma sRGB.
- [ ] Camera: FOV 34, nhìn chéo khoảng 34° từ trên. Camera chỉ để xem trước; game dùng camera riêng.
- [ ] Chạy **Launch** trong Editor để xem có chuyển động và không lỗi console.

## Giai đoạn 3 — Quy ước tên entity (bắt buộc)

Game tìm entity theo tên chính xác. Viết thường, không dấu.

| Tên entity | Vai trò | Yêu cầu |
|---|---|---|
| `corner-root` | Gốc toàn cảnh | Mọi thứ nằm bên dưới |
| `barn` | Nhà kho, chạm để chọn | Con `barn-hit`: hộp va chạm đơn giản bao ngoài |
| `barn-door` | Cánh cửa | Có anim `door_open` |
| `bed` | Khung luống | |
| `plot-1` … `plot-9` | Vị trí từng ô | Entity rỗng đặt tại tâm ô, mặt trên đất. Tạo đủ 9; game ẩn ô chưa mở |
| `plot-N/crop` | Chỗ gắn cây trồng | Entity rỗng; game tự gắn GLB theo loài và giai đoạn |
| `plot-N/soil` | Mặt đất ô | Game đổi vật liệu khô/ướt |
| `tree` | Cây | Gắn script `sway` |
| `fx-water`, `fx-dust`, `fx-sparkle` | Particle mẫu | **Tắt autoplay**; game bật khi domain đã chấp nhận thao tác |
| `sun` | Nắng chính | Game chỉnh màu và cường độ theo buổi |

- Không đặt gameplay vào tên khác; vật thể trang trí thì đặt tên tự do.
- Vùng chạm dùng hình đơn giản (hộp), không dựa vào từng chiếc lá.

## Giai đoạn 4 — Script chuyển động (Claude viết, bạn gắn trong Editor)

Script chỉ biểu diễn, nhận lệnh qua sự kiện của app. Tên sự kiện dự kiến:

| Sự kiện | Hướng | Nội dung |
|---|---|---|
| `farm:view` | game → cảnh | Trạng thái ô (loài, giai đoạn, ướt, được chọn) |
| `farm:effect` | game → cảnh | `plant` / `water` / `harvest` + danh sách ô, **sau khi domain đã chấp nhận** |
| `farm:env` | game → cảnh | Buổi trong ngày, chất lượng, giảm chuyển động |

Script dự kiến: `sway`, `pop`, `playFx`, `doorOnSelect`, `lamp`. Mỗi script **phải tự tắt khi bật giảm chuyển động** và không gọi mạng, không lưu gì.

Đồng bộ script giữa repo và Editor bằng công cụ `playcanvas-sync` (cần API token của bạn, đặt trong biến môi trường, **không** commit).

## Giai đoạn 5 — Xuất bản và ghim phiên bản

- [ ] Editor → **Publish → Download .zip** (bản build tự chứa).
- [ ] Giải nén vào `public/farm-scenes/corner-v1/`. Mỗi lần xuất mới thì tăng số `v2`, `v3`…; không ghi đè.
- [ ] Ghi vào `public/farm-scenes/corner-v1/SOURCE.md`: ngày xuất, ID project, ID scene, phiên bản engine, danh sách asset kèm nguồn và giấy phép.
- [ ] Kiểm tra kích thước thư mục. Mục tiêu góc mẫu: **≤ 3 MB** chưa tính HDR.

## Giai đoạn 6 — Tích hợp vào app (Claude làm)

- Thêm loader trong `src/features/farm-pc/engine/`: nạp `config.json` và scene của `corner-vN`, tìm entity theo bảng ở mục 3.
- Hành vi giữ nguyên:
  - chọn ô/kho;
  - gieo, tưới, thu hoạch qua `planCommand`;
  - đất ướt, marker cần tưới/đã chín;
  - xử lý tab ẩn, resize, mất context, thử lại, fallback 2D.
- Nếu bản xuất lỗi hoặc thiếu entity bắt buộc: tự quay về góc dựng bằng code hiện tại và báo trong console dev.
- Bật bằng cờ riêng, ví dụ `?renderer=playcanvas&scene=corner-v1`. Mặc định vẫn là renderer cũ cho tới khi nghiệm thu.
- Test:
  - loader tìm đủ entity và báo lỗi khi thiếu;
  - mọi file trong bản xuất tồn tại;
  - bấm lặp không phát hiệu ứng hai lần;
  - tiến độ còn sau khi tải lại.

## Giai đoạn 7 — Nghiệm thu góc mẫu

- [ ] Ảnh cùng giờ, cùng trạng thái: đẹp hơn rõ so với `pbr-dep-trua.webp` và baseline Three.js.
- [ ] Sửa một chi tiết trong Editor → xuất lại → thấy trong app, **dưới 10 phút** và không phải sửa code. Đây là bằng chứng workflow Editor đáng giá.
- [ ] Gieo, tưới, thu hoạch, tải lại đúng; bấm đúp không cộng hai lần.
- [ ] Giảm chuyển động tắt hết lắc lư và particle.
- [ ] Đo trên **một điện thoại thật** (ghi model và trình duyệt): mức Nhẹ khoảng ≥ 30 FPS khi chơi, thời gian tải góc mẫu chấp nhận được.
- [ ] Mọi asset có nguồn và giấy phép trong `SOURCE.md`.

Không đạt mục 2 hoặc mục điện thoại thì dừng lại đánh giá trước khi làm tiếp. Có thể quay về dựng bằng code + GLB mà không cần Editor.

## Giai đoạn 8 — Mở rộng (sau nghiệm thu)

Thứ tự đề xuất:
1. Đủ 10 loài × 4 giai đoạn cây trồng.
2. Giếng.
3. Bếp Cô Ba.
4. Chuồng gà có hoạt ảnh.
5. Trang trí.
6. Nông trại bạn bè (dùng lại cùng cảnh, chế độ chỉ xem).

Mỗi khu là một scene hoặc template riêng, cùng quy ước tên.

---

## Prompt để giao cho Claude khi quay lại

Giai đoạn 4 — đã xong (script trong `src/features/farm-pc/scripts/`).

Giai đoạn 6 (sau khi có `public/farm-scenes/corner-v1/`):
> Đọc `plans/playcanvas-editor-pipeline.md` và `public/farm-scenes/corner-v1/SOURCE.md`. Làm giai đoạn 6: loader nạp bản xuất, nối gameplay theo quy ước tên, fallback về góc dựng bằng code, test, chạy kiểm tra và chụp so sánh.

## Ghi chú quyết định

- 2026-09-30: đã tạo project `angi-farm-corner` (Blank Project, tài khoản LONGNGUYEN9495) ở chế độ **công khai (PUBLIC)**; project riêng tư là tính năng Premium. Chấp nhận được vì repo code cũng công khai và asset đều CC0; không upload bí mật hay asset không có quyền chia sẻ. Có thể nâng gói và chuyển riêng tư sau.
- Phiên bản engine của project: **2.22.6 (Current)**, trùng với `playcanvas` 2.22.6 trong `package.json`; không cần đổi gì. Nếu sau này đổi engine trong Editor thì nâng gói npm cùng số.

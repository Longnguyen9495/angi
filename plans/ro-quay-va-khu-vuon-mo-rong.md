# Plan mở rộng — Rổ quay món, Khu vườn sống động, Vòng lặp sau thu hoạch

Khảo sát ngày 2026-09-30. Plan gồm ba phần, làm theo thứ tự P1 → P2 → P3; mỗi phần ship được độc lập.

**Trạng thái (2026-09-30): đã làm hết.** ✅ P1 · ✅ P2a · ✅ P2b · ✅ P2c · ✅ P2d · ✅ P3.1–P3.5.
Quyết định đã chốt: reel chỉ hiện món trong rổ; tưới 3 lượt/ngày rút ngắn 25%; cây thật bằng ảnh raster.

Khác với plan ban đầu:

- **P2b:** API AI trong `.env` không sinh được ảnh (qwen/wan: "Model not available on this account", gemini-image:
  reset kết nối), nên sprite được vẽ bằng `scripts/generate-crop-sprites.mjs` (sharp → WebP trong suốt, 54 file,
  ~430 KB). Prompt AI cho đúng từng file ở `prompts/garden-sprite-prompts.md` — sinh xong chỉ cần thay file cùng tên.
  Giai đoạn cây: mầm → cây non → ra hoa → chín (4 giai đoạn, không có "hạt" riêng).
- **P2d:** 4 cây mới mở theo cấp (sả 2, tỏi 3, dưa leo 4, chanh 5, tặng 1 hạt khi mở); ô đất 6 → 9 ở cấp 3/5/7.
  Cây mới không đến từ món ăn (catalogue chỉ gắn 6 cây gốc) — hạt có ở đơn Cô Ba và chợ.
- **P3.4:** 12 công thức, 4 mỗi miền; 3 công thức cũ vẫn mở sẵn, 9 công thức mới mở cùng vùng trên bản đồ.
- **P3.5:** xu là tài nguyên trong ledger; trang trí chỉ để ngắm (không cộng chỉ số).
- Mọi field mới đều là bổ sung, `SCHEMA_VERSION` giữ nguyên 1 — bản lưu cũ đọc được với giá trị mặc định.

## Hiện trạng (tóm tắt)

- **Quay món**: `planSpin(from, seed, count)` ở `src/features/food-reel/engine/spin.ts` luôn bốc ngẫu nhiên trên toàn bộ catalogue
  (`reelCount()`), reel hiển thị `dishAt(vi)` = toàn bộ 128 món. Không có cách giới hạn vài món.
- **Khu vườn** (`journey/GardenSection.tsx`): 6 ô, 4 trạng thái `empty | sprout | young | ready` tính từ thời gian.
  Cây vẽ bằng DOM/CSS (`CropVisual`: 1 thân + 2 lá + 1 quả tròn) — cùng một dáng cho cả 6 loại cây.
  Chỉ có hiệu ứng khi gieo (`is-fresh`); không có chuyển động lúc đứng yên, lúc lớn, lúc thu hoạch.
  "Tưới" hiện chỉ là check-in sau bữa → cây của bữa đó chín ngay (ẩn, người dùng không thấy).
- **Sau thu hoạch**: nông sản vào "Kho nguyên liệu" rồi… dừng. Việc nấu nằm ở mục Công thức (section 03, phải cuộn
  xuống), chỉ có 3 công thức, nấu xong chỉ được XP. Không có gợi ý "làm gì tiếp", kho không có chỗ tiêu.
- Ràng buộc giữ nguyên: không SVG animation (`npm run check:motion`), tôn trọng reduced-motion, cây không héo,
  mọi phần thưởng đi qua ledger idempotent trong `domain/reducer.ts`.

---

## P1 — Rổ quay: chỉ quay giữa vài món mình chọn

### Trải nghiệm

- Người dùng gom từ 2 món trở lên vào **Rổ quay**. Chỗ thêm món:
  1. Nút `Rổ quay` trong Food Story (cạnh "Lưu món").
  2. Sheet **"Chọn món để quay"**: lưới ảnh nhỏ có tìm kiếm + lọc nhanh (vùng, giá, chay), chạm để tick.
  3. Trong sheet có nút "Thêm N món đã lưu".
- Dock có công tắc 2 chế độ: `Tất cả · 128` / `Rổ của tôi · 3`. Nút Quay giữ nguyên vị trí.
- Ở chế độ Rổ, reel **chỉ hiển thị các món trong rổ**, lặp lại kiểu máy slot (A B C A B C…) — quay vẫn đã mắt,
  và người dùng thấy rõ chỉ các món mình chọn đang chạy.
- Sau khi ra kết quả có thêm lựa chọn **"Loại món này & quay tiếp"** (bỏ dần đến món cuối) — hợp khi cả nhóm đang cãi nhau ăn gì.
- Danh sách rổ lưu theo thiết bị, còn *chế độ* Rổ thì không — mỗi lần mở app luôn bắt đầu ở reel đầy đủ.
  Món bị xoá khỏi catalogue tự rơi khỏi rổ; còn < 2 món thì reel tự về toàn bộ catalogue.

### Kỹ thuật

- `useReelPrefs`: thêm `pool: string[]` (đọc bản cũ không có field vẫn ra mặc định).
- Lớp "reel view" thay cho việc gọi thẳng `dishAt/reelCount` toàn cục: `createReelView(ids | null)` trả về
  `{ count, pooled, dishAt(vi) }`. `ReelScene`, `FoodReelExperience`, `SceneCounter`, reducer (`count`,
  `dishAt(spin.target)`) nhận view qua prop/tham số. `planSpin` thêm `avoidCurrent` (tắt khi quay trong rổ — nếu không rổ 2 món luôn ra món còn lại).
- Đổi chế độ giữ nguyên vị trí ảo của engine; chỉ món ở mỗi ô đổi theo view mới.
- "Loại & quay tiếp": danh sách món bị loại chỉ sống trong phiên, `RESET` rồi quay lại sau khi reducer nhận view mới.
- Test: planSpin trên view 3 món luôn ra món trong rổ; reducer với view nhỏ; parse prefs cũ/hỏng; pool < 2.

---

## P2 — Khu vườn sống động

### 2a. Chuyển động (làm trước, không cần asset mới)

| Lúc | Hiệu ứng (CSS transform/opacity + `motion/effects.ts` sẵn có) |
| --- | --- |
| Đứng yên | Cây đung đưa theo gió (`rotate` quanh gốc, lệch pha ngẫu nhiên mỗi ô); lá rung nhẹ |
| Đang lớn | Vòng tiến độ quanh ô; khi qua mốc giai đoạn thì "nảy" lên (scale 0.9 → 1.05 → 1) |
| Sẵn sàng | Quả lắc + lấp lánh; thỉnh thoảng một con bướm/ong (DOM + ảnh raster) bay qua ô chín |
| Gieo | Tái dùng storyboard của `PlantingStage` (hạt rơi → đất lún → vụn đất → mầm) ngay trong ô |
| Thu hoạch | Cây nhổ lên, nông sản bay vào giỏ (`flyTo`), số trong kho nhảy (+1) |
| Nền | Ánh sáng theo giờ thật (sáng / chiều vàng / tối có đom đóm), đất ẩm sẫm màu sau khi tưới |

Reduced-motion: tắt đung đưa/bướm, giữ đổi trạng thái tức thì.

### 2b. Cây trông thật hơn

- Thay cây CSS chung bằng **sprite raster WebP nền trong suốt** cho từng loại × từng giai đoạn:
  6 cây × 5 giai đoạn (hạt, mầm, cây non, ra hoa, chín) = 30 ảnh + 6 ảnh nông sản + 6 gói hạt.
  Sinh bằng prompt ảnh như `prompts/food-reel-image-prompts.md`, cùng phong cách, ~256 px, tổng < 400 KB.
- Chuyển động vẫn làm bằng CSS trên thẻ `<img>` (không phải SVG → qua được `check:motion`).
- Mỗi loại có dáng riêng: lúa trổ bông vàng cúi đầu, hành lá ống thẳng, ớt treo quả đỏ, cà chua chùm có giàn,
  đậu leo cọc, rau thơm bụi xòe.
- Thêm giai đoạn `flowering` vào `plotStage` (mốc 35% / 70% / 100%).

### 2c. Tưới cây

- **Bình tưới**: 3 lượt/ngày, hồi đầy mỗi sáng; check-in sau bữa +1 lượt.
- Bật **chế độ tưới** (nút bình tưới trên khu vườn) → con trỏ thành bình, chạm/kéo qua các ô đang lớn.
  Hiệu ứng: bình nghiêng, giọt nước rơi, đất sẫm lại, cây "vươn" lên.
- Mỗi lần tưới rút ngắn **25% thời gian còn lại**; một ô tưới tối đa 1 lần/giờ. Không tưới thì cây vẫn lớn
  bình thường và không bao giờ héo — tưới là thêm, không phải bắt buộc.
- Check-in sau bữa hiển thị thành **"mưa rào"** trên ô của bữa đó (hiện đang ẩn), để người dùng hiểu vì sao cây chín ngay.
- Dữ liệu: `Plot.wateredAt`, `GuestProgress.water = { date, used, bonus }`; action `WATER { plotId, now }`
  (không qua ledger vì không phát thưởng; cooldown 1 giờ chống bấm đúp). Field mới là bổ sung nên **không** tăng
  `SCHEMA_VERSION` — tăng sẽ xoá tiến trình của khách cũ; bản lưu cũ được điền mặc định khi đọc.

### 2d. Mở rộng vườn (sau)

- 6 → 9 ô theo cấp độ; thêm cây mới gắn với công thức mới (sả, chanh, giá đỗ, tỏi, dưa leo, nấm).

---

## P3 — Sau khi thu hoạch thì làm gì

Mục tiêu: nông sản luôn có chỗ để dùng, và luôn có đúng **một bước tiếp theo** hiện ra ngay.

1. **Thẻ "Tiếp theo" ngay sau khi thu hoạch** (hiện tại chỗ, không bắt cuộn xuống):
   - Đủ nguyên liệu → `Nấu Bún bò Huế ngay`.
   - Thiếu → "Còn thiếu 1 Ớt" + `Quay món có ớt` → mở reel ở **chế độ Rổ, lọc sẵn các món có ớt**
     (nối thẳng với P1: chốt món đó sẽ nhận hạt ớt).
   - Ô vừa trống + khay còn hạt → `Gieo lại`.
2. **Cảnh nấu ăn**: nồi, nguyên liệu bay vào, hơi nước bốc, rồi ra thẻ món kèm fact. Món đã nấu vào **Sổ bếp**
   (album) và mở khoá câu chuyện/ảnh riêng của món trong reel.
3. **Đơn hàng của Cô Ba** (NPC đã có): mỗi ngày 1–2 đơn nhỏ như "2 Hành + 1 Rau thơm" → thưởng hạt hiếm,
   lượt tưới hoặc đồ trang trí. Đây là chỗ tiêu nông sản dư.
4. **Nhiều công thức hơn**: 3 → 12 (4 mỗi miền), mở theo vùng trên bản đồ; mỗi công thức liên kết món thật trong reel.
5. **Chợ & trang trí** (tuỳ chọn, làm sau cùng): bán nông sản dư lấy xu → mua hạt bất kỳ, ô đất thêm, đồ trang trí
   (bù nhìn, hàng rào tre, đèn lồng, chum nước). Chỉ cần nếu muốn giữ người chơi lâu dài.

Vòng lặp sau P3:

```
Quay món → chốt → nhận hạt → gieo → tưới / chờ → thu hoạch
      ↑                                              ↓
      └── "Quay món có ớt" (thiếu nguyên liệu) ← Tiếp theo: nấu / đơn Cô Ba / gieo lại
```

---

## Thứ tự & ước lượng

| Bước | Nội dung | Cỡ |
| --- | --- | --- |
| P1 | Rổ quay + sheet chọn món + loại dần | M |
| P2a | Chuyển động khu vườn (không asset) | M |
| P2c | Tưới cây + migrate dữ liệu v2 | M |
| P3.1 | Thẻ "Tiếp theo" + quay món theo nguyên liệu | S (dựa trên P1) |
| P2b | Sprite cây thật (sinh ảnh + tích hợp) | M, phụ thuộc sinh ảnh |
| P3.2–3.3 | Cảnh nấu + Sổ bếp + đơn Cô Ba | L |
| P3.4–3.5, P2d | Thêm công thức, cây, ô đất, chợ | L |

Mỗi bước kết thúc bằng `npm run verify` và bổ sung test reducer/selector tương ứng.

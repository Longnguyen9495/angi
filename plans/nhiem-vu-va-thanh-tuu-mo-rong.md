# Mở rộng nhiệm vụ ngày, tuần và thành tựu

Ghi ngày 02/10/2026. Người chơi thấy nhiệm vụ ngày/tuần hơi ít và muốn nhiều thành tựu hơn. Plan này nói hiện có gì, thêm gì, cần sửa file nào và kiểm tra ra sao. Chưa làm dòng code nào.

## 1. Hiện trạng

Toàn bộ nằm trong [src/domain/quests.ts](../src/domain/quests.ts), chữ ở `t.data.quests` ([vi/data.ts](../src/i18n/messages/vi/data.ts), [en/data.ts](../src/i18n/messages/en/data.ts)), màn hình là [MissionsSection.tsx](../src/features/food-reel/journey/MissionsSection.tsx).

- **Ngày:** 4 nhiệm vụ = `d-choose` cố định + 3 cái bốc từ 15 (`DAILY_COUNT = 4`). Mỗi chỉ số chỉ có đúng một mức (ví dụ chỉ có "Gieo 2 hạt"), nên ngày nào cũng na ná nhau.
- **Tuần:** 3 nhiệm vụ bốc từ 10 (`WEEKLY_COUNT = 3`).
- **Thành tựu:** 9 cái (farmer, cook, recipes, angler, supplier, neighbour, sneaky, generous, explorer), 3–4 bậc, thưởng theo `badgeReward(tier)`.
- Mọi hành động đếm qua `track(s, metric, now, n)` trong [reducer.ts:182](../src/domain/reducer.ts#L182). Có 16 chỉ số: choose, checkin, plant, water, harvest, cook, catch, sell, buy, feed, collect, order, photo, help, steal, gift.
- Bốc nhiệm vụ theo seed `ngày + guestId`. Danh sách đã bốc được lưu trong `quests.daily/weekly`, nên đổi pool giữa ngày **không** đổi nhiệm vụ đang có; ngày/tuần sau mới bốc theo pool mới.
- Lưu trữ: `tally()` trong [persistence.ts](../src/domain/persistence.ts) nhận mọi key số, `badges` nhận mọi id. Thêm chỉ số/thành tựu mới **không cần** đổi phiên bản bản lưu.

Đang có sai sót nhỏ: `COLLECT_HIVE` cũng đếm `collect`, nhưng chữ là "Thu trứng hoặc sữa".

## 2. Chỉ số mới cần đếm

Thêm vào `QuestMetric`, gọi `track` ở reducer:

| Chỉ số | Đếm ở | n |
|---|---|---|
| `honey` | `COLLECT_HIVE` (vẫn giữ `collect` hay tách hẳn: chọn tách, đổi chữ `collect` thành "Thu trứng, sữa…") | 1 |
| `boat` | `SEND_BOAT` | 1 |
| `fruit` | `HARVEST_*`, ô có `kind === 'tree'` | số ô |
| `mushroom` | `HARVEST_*`, ô có `kind === 'mushroom'` | số ô |
| `earn` | `SELL` và `FULFILL_ORDER` | số xu nhận |
| `rate` | `CHECK_IN` có `rating` | 1 |
| `newRecipe` | `COOK` khi `cooked[id]` trước đó là 0 | 1 |
| `allDaily` | `CLAIM_QUEST` khi vừa nhận xong nhiệm vụ ngày cuối cùng của hôm nay | 1 |
| `decor` | `BUY_DECOR` | 1 |

Thêm một trường lưu: `grown: CropId[]` trong `GuestProgress` (những loại cây đã từng thu hoạch), parse trong `persistence.ts` (lọc theo `CROPS`), mặc định `[]`.

## 3. Nhiệm vụ ngày

- Tăng `DAILY_COUNT` 4 → **5** (`d-choose` + 4 cái bốc).
- Mỗi chỉ số có thể có **2 mức** (dễ/khó). Trong `draw` thêm luật: không bốc 2 nhiệm vụ cùng `metric` trong một ngày.
- Pool mới (giữ nguyên 15 id cũ, chỉ thêm):

| id | Việc | Thưởng `R(xp, xu, hạt, nước)` | Điều kiện bốc |
|---|---|---|---|
| `d-plant-5` | Gieo 5 hạt | 14, 6 | |
| `d-water-5` | Tưới 5 lần | 14, 6 | |
| `d-harvest-6` | Thu hoạch 6 ô | 18, 8 | |
| `d-cook-2` | Nấu 2 món | 25, 0, 2 | |
| `d-catch-4` | Câu 4 lần | 14, 6 | |
| `d-earn-30` | Kiếm 30 xu ở chợ/đơn | 12, 0, 1 | |
| `d-honey` | Lấy mật 1 lần | 12, 5 | tổ ong đã mở |
| `d-boat` | Cho thuyền ra khơi | 10, 4 | thuyền đã mở |
| `d-fruit` | Hái 1 ô cây ăn quả | 12, 5 | đang có cây ăn quả trồng |
| `d-mushroom` | Hái 1 khối nấm | 12, 5 | đang có khối nấm trồng |
| `d-rate` | Chấm điểm một bữa | 10, 0, 0, 1 | |

`doable()` cần thêm các điều kiện ở cột cuối (dùng `hiveUnlocked` / `boatUnlocked` trong selectors và `plots`). Không bốc nhiệm vụ người chơi không làm được hôm nay.

## 4. Nhiệm vụ tuần

- Tăng `WEEKLY_COUNT` 3 → **4**.
- Thêm vào pool:

| id | Việc | Thưởng | Điều kiện |
|---|---|---|---|
| `w-all-daily` | Xong hết nhiệm vụ ngày 3 hôm | 80, 40, 3, 2 | |
| `w-choose` | Chốt món 6 bữa | 60, 20, 2 | |
| `w-earn` | Kiếm 200 xu | 50, 0, 3 | |
| `w-feed` | Cho vật nuôi ăn 10 lần | 50, 25, 2 | có vật nuôi |
| `w-collect` | Thu sản phẩm vật nuôi 8 lần | 50, 30 | có vật nuôi |
| `w-buy` | Mua 8 gói hạt | 40, 20, 2 | |
| `w-photo` | Chụp 3 ảnh bữa ăn | 40, 20 | |
| `w-gift` | Tặng 5 hạt cho bạn | 50, 0, 3 | có bạn |
| `w-new-recipe` | Nấu 1 công thức mới | 70, 30, 2 | còn công thức chưa nấu |
| `w-fruit` | Hái 6 ô cây ăn quả | 50, 25 | có cây ăn quả |
| `w-mushroom` | Hái 5 khối nấm | 50, 25 | có khối nấm |
| `w-boat` | Cho thuyền ra khơi 3 lần | 50, 30 | thuyền đã mở |

## 5. Thành tựu: 9 → 29

Giữ 9 cái cũ, thêm 20. Cái nào tính từ trạng thái có sẵn thì người chơi cũ nhận được ngay (cố ý, coi như quà ra mắt). Cái nào dựa trên chỉ số mới thì bắt đầu từ 0.

| id | Tên (vi) | Giá trị | Bậc | Nguồn |
|---|---|---|---|---|
| `level` | Lên đời | cấp hiện tại | 5, 10, 20, 30 | `level(p.xp)` |
| `streak` | Đều như vắt tranh | chuỗi ngày hiện tại | 3, 7, 14, 30, 60 | `p.streak.count` |
| `regular` | Khách quen | tổng check-in | 5, 30, 100, 365 | `total.checkin` |
| `critic` | Nhà phê bình | bữa có chấm điểm | 5, 30, 100 | `history` có `rating` |
| `photographer` | Thợ ảnh bữa ăn | tổng ảnh | 1, 10, 50 | `total.photo` |
| `discoverer` | Sổ tem dày | món đã thấy | 10, 30, 60 | `stamps.discovered` |
| `regions` | Ba miền | vùng đã mở | 2, 3 | `unlockedRegions` |
| `planter` | Tay gieo | tổng gieo | 20, 100, 400, 1000 | `total.plant` |
| `waterer` | Bình tưới vàng | tổng tưới | 20, 100, 400 | `total.water` |
| `variety` | Vườn trăm thứ | loại cây đã thu | 5, 15, 25, tất cả | `grown` (mới) |
| `orchard` | Chủ vườn quả | ô quả đã hái | 5, 30, 100 | `total.fruit` (mới) |
| `mycologist` | Người trồng nấm | khối nấm đã hái | 5, 30, 100 | `total.mushroom` (mới) |
| `landowner` | Đất rộng | ô đất đã mở | 6, 8, 10, 12 | `plots.length` |
| `rancher` | Chủ trại | tổng thu vật nuôi | 10, 50, 200 | `total.collect` |
| `beekeeper` | Người nuôi ong | lần lấy mật | 1, 10, 50 | `total.honey` (mới) |
| `sailor` | Thuyền trưởng | lần ra khơi | 1, 10, 50 | `total.boat` (mới) |
| `merchant` | Tiểu thương | tổng bán | 20, 100, 500 | `total.sell` |
| `tycoon` | Đại gia | tổng xu kiếm | 200, 1000, 5000 | `total.earn` (mới) |
| `decorator` | Khéo bày | đồ trang trí có | 1, 2, tất cả | `decor.length` |
| `diligent` | Chăm chỉ | ngày xong hết nhiệm vụ ngày | 3, 15, 50 | `total.allDaily` (mới) |

(Nếu thấy `critic` trùng `regular` thì bỏ, còn 28.)

**Cân bằng thưởng:** `badgeReward` hiện cho 20 XP × bậc, `XP_PER_LEVEL = 100`. Một thành tựu 4 bậc = 200 XP = 2 cấp; 29 thành tựu nếu nhận hết ≈ 50 cấp. Đề xuất:
- giữ công thức cho bậc 1–2, bậc 3+ thưởng xu và hạt nhiều hơn thay vì XP (ví dụ `R(15 * tier, 15 * tier, tier >= 3 ? 3 : 1)`);
- riêng `level` không thưởng XP (tránh vòng lặp lên cấp → nhận XP → lên cấp).

## 6. Màn hình thành tựu

29 thẻ một cột là quá dài. Trong `MissionsSection`:
- Nhóm theo 4 mục: **Bữa ăn** (cook, recipes, explorer, discoverer, regular, critic, photographer, regions, streak), **Vườn** (farmer, planter, waterer, variety, orchard, mycologist, landowner), **Trại & chợ** (angler, rancher, beekeeper, sailor, supplier, merchant, tycoon, decorator), **Bạn bè & chung** (neighbour, sneaky, generous, level, diligent).
- Thứ tự trong mỗi nhóm: sẵn nhận trước, rồi đang làm (gần xong trước), cuối cùng là đã xong hết bậc.
- Mỗi nhóm thu gọn được; mặc định chỉ mở nhóm có thẻ sẵn nhận. Đầu khu ghi "x/29 đã xong".
- Thẻ hiển thị bậc dạng chấm (●●○○) thay vì chữ.
- Thêm trường `group` vào `AchievementDef` để UI không phải tự liệt kê.

## 7. Chữ (i18n)

Mỗi id/metric mới cần chữ ở **cả** `vi/data.ts` và `en/data.ts` (`quests.metric.*`, `quests.badges.*`), cùng tên nhóm và "x/29 đã xong" ở `vi|en/journey.ts`. Sửa `collect` thành "Thu sản phẩm vật nuôi {n} lần".

`badgeTitle` đang ép kiểu `id as keyof …`, nên thiếu chữ sẽ không báo lỗi khi build. Thêm test ở mục 8.

## 8. Kiểm tra

Trong [quests.test.ts](../src/domain/quests.test.ts) và [reducer.test.ts](../src/domain/reducer.test.ts):
- mọi `QUEST_DEFS` và `ACHIEVEMENTS` có chữ ở vi và en;
- `draw` không bao giờ cho 2 nhiệm vụ cùng metric, tối đa 1 nhiệm vụ bạn bè, đủ `DAILY_COUNT`/`WEEKLY_COUNT` khi pool đủ;
- người chơi cấp 1, chưa có bạn/vật nuôi/tổ ong/thuyền không bị bốc nhiệm vụ không làm được;
- mỗi chỉ số mới tăng đúng chỗ: `SELL` cộng `earn` đúng số xu, `COOK` công thức lần đầu cộng `newRecipe` một lần, nhận nhiệm vụ ngày cuối cộng `allDaily` một lần (nhận lại không cộng);
- `grown` thêm loại cây khi thu hoạch, không trùng; bản lưu cũ không có `grown` vẫn đọc được;
- bản lưu cũ đang có danh sách 4 nhiệm vụ ngày: hôm đó vẫn giữ 4, hôm sau thành 5;
- `claimableCount` đúng với thành tựu nhận ngay (level, streak, landowner…).

Sau đó chạy `npm test`, `npm run build`, mở màn nhiệm vụ trên khung 390px xem 29 thẻ và các nhóm.

## 9. Thứ tự làm (ước tính 1 buổi tối)

1. Chỉ số mới + `grown` + `track` trong reducer, kèm test (≈ 1 giờ).
2. Pool ngày/tuần, `doable`, luật không trùng metric, tăng số lượng (≈ 45 phút).
3. 20 thành tựu + chỉnh `badgeReward` (≈ 45 phút).
4. Chữ vi/en (≈ 30 phút).
5. Nhóm và sắp xếp ở `MissionsSection` (≈ 1 giờ).

## 10. Việc nhỏ đi kèm (từ lần kiểm tra ảnh nông trại cùng ngày)

Không thuộc nhiệm vụ nhưng tiện làm cùng tối nay, vì toast thu hoạch có nhắc tới món nấu:
- Trên điện thoại toast nằm ở đáy + 154px, luôn nổi trên cùng (z-index 99) ([farm-game.css:1198](../src/features/food-reel/journey/farm-game.css#L1198)). Nó che **thẻ ô đất đang mở** sau khi bấm "Thu hoạch" trong thẻ ([FarmGame.tsx:527](../src/features/food-reel/journey/FarmGame.tsx#L527)), che **nút "Chuồng & ao"** và **dòng hướng dẫn tưới**. Hướng sửa: trên điện thoại đưa toast lên dưới thanh xu/nước, như bản màn rộng ([farm-game.css:1218](../src/features/food-reel/journey/farm-game.css#L1218)); hoặc khi thẻ đang mở thì không hiện toast thu hoạch.
- Mưa trên trời chỉ là trang trí, đất không ướt. Người chơi dễ tưởng cây đã được tưới.
- Khối phôi nấm lúc mới trồng (`*-sprout.webp`) trông như hộp lỗi và không có ụ đất; cân nhắc vẽ lại.

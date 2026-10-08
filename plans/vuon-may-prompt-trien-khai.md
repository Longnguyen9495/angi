# Prompt giao việc: triển khai Vườn Mây

Đặc tả gốc: [vuon-may.md](vuon-may.md). Code theo **§0 "Đặc tả chốt"**; §1–§17 chỉ là phụ lục.

File này có hai prompt, dán nguyên văn vào một phiên Claude Code mới (hoặc giao cho lập trình viên):

| Prompt | Phạm vi | Dùng được khi |
|---|---|---|
| **A** | G0 (chuẩn bị ảnh, dữ liệu) + G1 (demo chuyển động `/sky-garden-test`) | **Ngay bây giờ.** Không đụng bản lưu hay kinh tế |
| **B** | G2 (lát cắt chơi thật: lên mây, trồng, bọ, thu, Bếp trà, MIX01) | Sau khi người dùng duyệt demo G1 **và** đã chốt Q1–Q7 ở §0.1 |

G3–G6 chưa viết prompt. Viết sau khi G2 chạy thật và có số liệu thật.

**Ảnh nguồn đã nằm trong repo** (lượt 5): `assets/sky-garden/pots/<id>.png` (20 chậu theo ID),
`assets/sky-garden/source/` (bộ 20 nguyên bản), `assets/sky-garden/reference/` (ảnh tham chiếu, không phát hành).
Xem `assets/sky-garden/README.md`. Câu trả lời Q1–Q7 của người dùng ở §0.1 của plan.

---

## A. Prompt G0 + G1

```text
Bạn là senior React/TypeScript engineer kiêm technical artist cho game 2D Canvas. Repo: angi
(C:\xampp\htdocs\angi), app "Ăn gì?". Nhiệm vụ: làm giai đoạn G0 và G1 của tính năng "Vườn Mây",
tức chuẩn bị ảnh chậu và làm một trang demo CHUYỂN ĐỘNG, KHÔNG CÓ LỐI CHƠI.

ĐỌC TRƯỚC, KHÔNG BỎ QUA:
- plans/vuon-may.md: §0.1 (quyết định), §0.3 (lộ trình, cổng G0/G1), §0.7 (hình ảnh, bố cục, lớp art),
  §0.11 (tiêu chí ảnh), §0.13 (điều kiện hoàn thành), §0.14 (bộ 20 chậu: lỗi tên file, lỗ trong đất,
  bảng ID mới), §0.15.3–§0.15.5 (tiêu chí ảnh, mobile, hiệu năng, điều kiện hoàn thành G0/G1),
  §18 (tách lớp ảnh, điểm neo, thứ tự vẽ, hai chế độ camera). Đọc thêm §7.1, §7.2, §7.5.
- src/features/farm-anim/: FarmAnimationTest.tsx, FarmScene.tsx, engine/ (AnimationManager, ParticleSystem,
  WindSystem, world.ts, assets.ts), systems/SkySystem.ts, systems/CloudAnimation.ts, systems/FarmGameLayer.ts.
  Đây là engine Canvas 2D đang chạy nông trại. Vườn Mây phải dùng lại engine này, không viết engine mới.
- src/main.tsx: cách route /farm-animation-test được đăng ký (import động, StrictMode).
- scripts/farm-anim/prepare.mjs: cách dùng sharp để xuất webp và file json mô tả.
- src/data/sprites.ts: cropSprite(crop, stage) và ảnh cây trong public/images/farm-items/.

NGUỒN ẢNH (đã có trong repo, đọc assets/sky-garden/README.md):
- assets/sky-garden/pots/<id>.png: 20 chậu đã đặt tên theo ID. 4 chậu Nông Sản là bản 1254 px; 16 chậu
  còn lại 282–390 px, phần đất có lỗ trong suốt.
- assets/sky-garden/source/vuon_may_20_chau_fixed/: bộ 20 nguyên bản, tên file 01–09 SAI so với hình,
  chỉ để đối chiếu, không đọc trong pipeline.
- assets/sky-garden/reference/: ảnh tham chiếu bố cục, KHÔNG đưa vào game (Q6).
- Quyền ảnh (Q6): chỉ dùng thử nghiệm. Bộ chưa đủ 6 chậu để trạng thái chưa hoàn thiện, không tự vẽ
  hay tạo asset giả để lấp chỗ trống (Q7).

QUY TẮC BẮT BUỘC:
1. G1 là demo: dữ liệu giả, KHÔNG import và KHÔNG ghi GuestProgress, reducer, persistence, sync hay gọi API.
   Không sửa src/domain, server/, game-rules.json.
2. Không dùng animation SVG (npm run check:motion phải qua). Chỉ dùng Canvas và CSS transform/opacity.
3. Tôn trọng prefers-reduced-motion: tắt bay, nảy, parallax và hạt; chuyển cảnh chỉ mờ dần.
4. Mọi chữ hiện trên màn hình đi qua i18n (src/i18n, có cả vi và en; test i18n bắt hai bên đủ khóa).
   Thêm namespace "sky". Thương hiệu là "Ăn gì?".
5. Không sao chép giao diện, tên hay vật phẩm của game Khu Vườn Trên Mây (VNG). Không có tiền tệ tim, không
   có kim cương. Xem bảng "Đổi so với ảnh mẫu" ở §0.7.
6. Ảnh không được phóng to quá kích thước gốc (§0.11). Bộ 20 chậu chỉ xuất @1x 256 px; 4 chậu bản lớn xuất
   cả @1x 256 và @2x 512.
7. Làm và commit thẳng trên nhánh main, mỗi bước một commit nhỏ, message tiếng Anh ngắn gọn. Chưa push và
   không deploy nếu tôi chưa bảo.
8. Không báo FPS, kết quả test hay "đạt" khi chưa chạy hoặc đo thật. Ghi rõ máy đo.
9. Chỉ hỏi khi bị chặn bởi quyết định không tự kiểm tra được.

VIỆC CẦN LÀM (theo thứ tự, xong bước nào báo bước đó):

1. (ĐÃ LÀM ở lượt 5, chỉ kiểm tra lại: đủ 20 file, đúng ID, README đúng.) Chép ảnh gốc vào
   assets/sky-garden/pots/<id>.png, đặt tên theo ID mới ở §0.14:
   - 4 chậu Nông Sản (pumpkin, corn, cabbage, eggplant) lấy từ thư mục bản lớn vuon_may_hd.
   - Bỏ 4 file trùng chủ đề trong bộ 20: 02_bap, 03_bap_cai, 05_hoa_sen, 07_bat_pho_ga. Theo §0.14, đây
     chính là bí ngô, bắp, bắp cải, cà tím bản nhỏ.
   - 16 file còn lại đổi tên theo cột "ID đề xuất". Ví dụ: 04_ca_tim.png → pho_bowl.png,
     09_am_tra.png → lotus.png, 01_bi_ngo.png → redfruit.png.
   - Thêm assets/sky-garden/SOURCE.md ghi: file gốc, ID, nguồn, ngày nhận, kích thước,
     "quyền: người dùng cung cấp, chờ xác nhận (Q6)".

2. Viết scripts/sky-garden/prepare-pots.mjs (sharp, chạy lại được nhiều lần):
   a. Vá lỗ trong đất: tìm điểm ảnh alpha < 128 không thông ra mép (flood fill từ mép), tô bằng màu trung
      bình của các điểm đục lân cận, lan dần từ ngoài vào, alpha 255. Báo số điểm đã vá mỗi file; sau vá
      số lỗ phải bằng 0.
   b. trim rồi đệm về khung vuông có lề 6%.
   c. Xuất public/images/sky-garden/pots/<id>@1x.webp (256 px) và, chỉ khi ảnh gốc ≥ 512 px, <id>@2x.webp.
      Chất lượng 88.
   d. Tự dò elip miệng đất (vùng nâu sẫm ở nửa trên chậu), ghi public/images/sky-garden/pots.json gồm
      { id, w, h, has2x, anchor: { cx, cy, rx } } theo tọa độ chuẩn hóa 0..1. Cho phép file
      assets/sky-garden/pots.anchors.json đè tay từng chậu.
   e. Xuất <id>-silhouette.webp (bóng đen) cho bộ sưu tập sau này.
   f. In bảng báo cáo: id, kích thước gốc, số lỗ đã vá, có @2x không, anchor.
   Thêm "sky:pots": "node scripts/sky-garden/prepare-pots.mjs" vào package.json.

3. Viết scripts/sky-garden/contact-sheet.mjs xuất storage/sky-garden-qa/contact-<nền>.png cho ba nền
   (sáng #f4f1e8, tối #1b1b24, trời #8fc8f0): mỗi ô gồm chậu, ID, và một cây (cropSprite giai đoạn 0..3)
   cắm vào miệng chậu theo anchor. Mục đích: soát anchor, viền tối, lỗ còn sót. Mở ảnh xem và sửa
   anchors.json cho tới khi cây cắm đúng. Gửi tôi đường dẫn ảnh.

4. Tạo src/data/skyGarden.ts CHỈ PHẦN DỮ LIỆU TĨNH cho demo: danh sách POT_IDS, bộ (set) của từng chậu
   theo bảng xếp bộ ở §0.14, bậc gốc của bộ, đường dẫn ảnh. Kiểu dữ liệu đặt tên theo §0.9 (PotId, PotSetId,
   PotTier...). Chưa có giá, tỉ lệ, công thức.

5. Làm demo src/features/sky-garden/ (route /sky-garden-test, đăng ký trong src/main.tsx giống
   /farm-animation-test):
   - SkyGardenTest.tsx: trang demo, lazy, không đụng catalogue hay bản lưu.
   - SkyScene.tsx + systems/: ShelfLayer (dải tầng mây, mỗi tầng một màu, mép tre/gỗ), PotLayer (chậu +
     cây theo anchor, cây lắc theo WindSystem, chậu đứng yên), BugSystem (bọ bay tới theo đường cong, đậu,
     đập cánh 2 khung, chạm thì vợt quét và bọ bay vào túi), BubbleLayer (bong bóng chín / có bọ / máy
     xong), Beanstalk (thân đậu lặp dọc bên trái), BeanstalkIntro (lần đầu: đậu vươn lên, mây tách, lộ
     tầng 1, 2–3 giây; các lần sau 0,6 giây).
   - Dùng lại SkySystem, CloudAnimation, ParticleSystem, WindSystem của farm-anim. Nếu phải sửa chúng thì
     sửa tương thích ngược, không làm đổi nông trại đang chạy.
   - 3 tầng, đủ 6 chậu mỗi tầng. Tầng 1 dùng bộ Nông Sản (6 chậu), tầng 2 Biển + Lễ Tết, tầng 3 trộn.
     Có cây ở nhiều giai đoạn, ít nhất 2 bọ đang đậu, 1 cây chín có bong bóng.
   - Mỗi tầng có một máy ở đầu (placeholder vẽ bằng Canvas, ghi rõ là tạm) chạy 3 trạng thái idle/run/done.
   - Ngày/đêm: nút chuyển 4 mốc dawn/day/dusk/night; ban đêm có đom đóm phát sáng.
   - Bố cục theo Q4 ở §0.1 và §18.4 (hai chế độ camera):
     · Toàn cảnh: mọi bề ngang đều xếp 1 hàng 6 chậu mỗi tầng như ảnh mẫu, cuộn dọc nhiều tầng. Chế độ này
       chỉ để xem và chọn tầng, không thao tác với chậu nhỏ.
     · Tương tác: chạm một tầng thì phóng to tầng đó. Vùng chạm chậu, bọ, nút đều ≥ 44 px. Có nút quay lại
       toàn cảnh, giữ nguyên vị trí cuộn.
     · Trong chế độ tương tác, làm cả hai kiểu 1×6 (kéo ngang) và 2×3 (đậu thần 40 px sát mép trái, dải đầu
       tầng 56 px, theo §0.7), có nút chuyển để người dùng so sánh và chốt Q4.
     · Đổi chế độ không làm đổi slotId hay trạng thái demo.
     · Chụp màn hình cả hai chế độ ở 360, 390, 430, 768 và 1366 px.
   - Bảng điều khiển demo (góc màn hình, có thể ẩn): chạy lại cảnh leo đậu, thêm bọ, làm chín cây, đổi
     ngày/đêm, bật tắt giảm chuyển động, hiện FPS.
   - Chỉ vẽ tầng gần viewport; dừng vòng lặp khi tab ẩn; tải ảnh chậu theo tầng cần xem.
   - Tài nguyên còn thiếu (kệ mây, thân đậu, máy, bọ, cây mây riêng) vẽ placeholder bằng Canvas hoặc dùng
     ảnh cây có sẵn trong public/images/farm-items/. Ghi danh sách placeholder vào cuối báo cáo, đối chiếu
     bảng lớp art ở §0.7.

6. Test và kiểm tra:
   - Vitest cho: dữ liệu skyGarden.ts (mọi POT_ID có ảnh và anchor trong pots.json, không trùng ID, mỗi bộ
     không quá 6), hàm tính bố cục theo bề ngang (360/390/430/768/1280 px cho ra số cột, kích thước ô ≥ 44).
   - Chạy: npm run sky:pots, npm run typecheck, npm run lint, npm test, npm run check:motion, npm run build.
   - Mở http://localhost:5173/sky-garden-test, đo FPS trên một máy Android tầm trung và một iPhone nếu có;
     không có máy thì ghi "chưa đo trên máy thật".

7. Báo cáo cuối (tiếng Việt): commit đã tạo; bảng QA ảnh (id, lỗ đã vá, @2x, anchor đạt/không);
   đường dẫn contact sheet; ảnh chụp màn hình demo ở 390 px và 1280 px; FPS đo được kèm tên máy;
   danh sách placeholder; những gì chưa làm hoặc nghi ngờ.

NGOÀI PHẠM VI (KHÔNG LÀM): GuestProgress, reducer, guard, API, giá, tỉ lệ bọ, nâng sao, máy thật,
đơn hàng, bạn bè, nút "Lên mây" trong FarmGame. Đó là G2 trở đi.
```

---

## B. Prompt G2 (chỉ dùng sau khi duyệt G1 và chốt Q1–Q7)

Trước khi dán, sửa bảng **"Quyết định đã chốt"** trong prompt cho khớp câu trả lời của người dùng. Nếu người
dùng bảo "dùng mặc định" thì giữ nguyên.

```text
Bạn là senior full-stack engineer (React/TypeScript + PHP 8/MariaDB) của repo angi (C:\xampp\htdocs\angi),
app "Ăn gì?". Nhiệm vụ: giai đoạn G2 của "Vườn Mây", tức lát cắt CHƠI THẬT đầu tiên. Demo G1
(/sky-garden-test, src/features/sky-garden/) đã được duyệt và là phần hình để dùng lại.

ĐỌC TRƯỚC, KHÔNG BỎ QUA:
- plans/vuon-may.md: toàn bộ §0 (bắt buộc), §12.1, §13.2, §14, §16.2. Khi mâu thuẫn, §0 thắng.
- Domain: src/domain/progress.ts, reducer.ts, persistence.ts (parseProgress, SCHEMA_VERSION giữ nguyên 2),
  gameRules.ts (GAME_RULES_VERSION 1 → 2), sync.ts (reconcile), quests.ts, orders.ts, các file *.test.ts,
  đặc biệt progressGuard.test.ts và security-audit.test.ts.
- Dữ liệu: src/data/game.ts (WATERING, harvestXp, HIVE, MARKET, LEVEL_CURVE, PLOT_UNLOCK_LEVELS).
- Server: server/lib/ProgressGuard.php (shape, diff, entries, dayKey, claim), Account.php (PUT progress,
  version, 409), Friends.php (đọc vườn bạn), Schema.php, bootstrap.php (HttpError), server/lang/{vi,en}.php,
  server/api/index.php (router), scripts/export-game-rules.mjs.
- plans/kiem-toan-gian-lan-game.md, plans/sua-bao-mat-va-gian-lan.md.
- Giao diện: src/features/food-reel/journey/FarmGame.tsx, StoragePanel.tsx, SeedTray.tsx, seedDrag,
  FriendFarm.tsx, farm-anim/decorSpots.ts.

QUYẾT ĐỊNH ĐÃ CHỐT (sửa theo câu trả lời của người dùng):
- Q1 tên khu: "Vườn Mây" (đã chốt).  Q2 cấp mở: 12, mầm đậu từ cấp 10 (đã chốt).
- Q3 bộ Nông Sản: bậc Ngọc (đã chốt).
- Q4 điện thoại: toàn cảnh 1×6, chạm tầng phóng to để thao tác, kéo ngang khi cần; 2×3 dự phòng.
  [Sửa theo kết quả duyệt demo G1.]
- Q5 khách đăng nhập: giữ chậu, cây, bọ thường; sao, luck, bọ hiếm, Mây Ngọc về 0; màn xác nhận chi tiết
  có nút hủy. CHƯA BẬT nhập dữ liệu thật: làm sau cờ riêng, mặc định tắt. [Sửa khi chính sách được duyệt.]
- Q6 quyền ảnh: chỉ dùng thử nghiệm; trước khi phát hành phải có xác nhận quyền thương mại từng file.
- Q7: file 01 là Chậu Quả Đỏ (redfruit, dự phòng); xếp bộ theo §0.14; bộ chưa đủ 6 có cờ chưa hoàn thiện.
- Bộ Đất nung: cần ít nhất 3 chậu thiết kế mới trước G2. [Đã có chưa?]

PHẠM VI G2 (§0.3): mầm đậu cấp 10, mở cấp 12; tầng 1–3 và mua ô (§0.4); 5 cây mây (§0.4) + cây rau dưới
đất trồng được trong chậu; tưới theo luật WATERING chung (§0.5); bọ (§0.2 bước 5, §0.5); thu, thu cả
tầng; chậu Đất nung (hoặc chậu thay thế theo §0.14 bước 6) + 4 chậu Nông Sản; máy Bếp trà với nhài sấy,
MIX01, MIX02 (§0.4); chuỗi hướng dẫn cấp đủ Hạt Mây, Sương Mai cho tầng 2–3 (§0.4), có bọ đầu tiên cố
định và mật ong dự phòng; trần 150 XP/ngày (§0.5); hiệu ứng chậu chỉ time/xp/bug, CHƯA có coin (D5);
tab "Trên mây" trong kho; tab Vườn Mây chỉ xem khi thăm bạn; cờ skyGarden trong app_settings, mặc định tắt.
KHÔNG làm ở G2: nâng sao, thăng bậc, hiệu ứng xếp chậu, máy khác ngoài Bếp trà, khinh khí cầu, bắt bọ
giúp bạn, tiền nạp.

QUY TẮC BẮT BUỘC:
1. Hướng A (§0.2, D1): Vườn Mây nằm trong GuestProgress.sky, lưu chung qua PUT /account/progress, guard
   soát. Không tạo nguồn số dư thứ hai cho xu, XP hay kho. Không làm hàng đợi replay riêng; xung đột dùng
   reconcile() có sẵn.
2. Thêm field bằng giá trị mặc định trong parseProgress; KHÔNG tăng SCHEMA_VERSION. Bản lưu cũ thiếu sky
   phải mở được và không tự nhận quà.
3. Mọi luật kinh tế (giá, thời gian, sản lượng, XP, trần, công thức) chỉ khai báo ở src/data/skyGarden.ts,
   xuất qua buildGameRules().sky → server/data/game-rules.json (chạy scripts/export-game-rules.mjs), và
   ProgressGuard dùng đúng bảng đó. Không chép số liệu sang PHP bằng tay.
4. Bọ: HMAC_SHA256(SKY_SECRET, userId·potUid·cycleNo·stageIndex), SKY_SECRET đọc từ .env (thêm vào
   .env.example, không commit giá trị thật). GET /account/sky/bugs chỉ trả mốc đã qua theo giờ server, có
   giới hạn tần suất. Không đưa secret hay seed nào vào bản lưu của tài khoản. Khách dùng guestSkyKey tại máy.
5. Guard (§0.2 bảng "Thay đổi / Guard đòi"): shape cho nhánh sky (allowlist ID, giới hạn số, UID duy nhất,
   một chậu một ô); diff cho trồng, thu, bọ, máy, mở tầng, mua ô, mua chậu, thưởng hướng dẫn (claim một
   lần), trần XP theo dayKey. Client không được đổi stars/tier/luck (G2 chưa có nâng sao nên phải giữ 0 và
   bậc gốc).
6. Sản phẩm mây và thành phẩm máy nằm trong ingredients, phải có giá trong bảng sell của luật (guard chỉ
   nhận nguyên liệu có giá bán). Hạt mây dùng khóa skyseed:<id>, khác Hạt Mây (skyitem:cloudseed).
7. Luật chống vòng lời: giá bán thành phẩm ≤ 1,35 × tổng giá bán nguyên liệu; viết test duyệt mọi công thức.
8. Mọi chữ qua i18n vi + en; lỗi server qua __t() và HttpError kèm trường code (§0.10).
9. Không SVG animation; tôn trọng giảm chuyển động; vùng chạm ≥ 44 px; luôn có cách chạm-chọn thay kéo thả.
10. Commit thẳng trên main theo từng bước nhỏ, chưa push và không deploy nếu tôi chưa bảo. Sao lưu DB trước
    mọi migration (theo quy trình deploy). Không báo test/FPS khi chưa chạy thật.

VIỆC CẦN LÀM (theo thứ tự, xong bước nào báo bước đó):
1. Dữ liệu: hoàn thiện src/data/skyGarden.ts theo §0.4–§0.6 và §0.9 (tầng 1–3, ô, cây, hạt, bọ, máy Bếp
   trà, hướng dẫn, trần XP, TIER_MUL, công thức tính bp). Test: luật 1,35×, mọi ID có tên vi/en, mọi cây
   có ảnh, tổng thưởng hướng dẫn đủ mở tầng 2–3.
2. Domain thuần: src/domain/sky.ts (tính chỉ số bp theo §0.5, giai đoạn cây theo thời gian, mốc bọ, kiểm
   tra mở tầng/mua ô/trồng/thu/máy). Test đơn vị cho từng hàm, có ví dụ chậu Bí Ngô ở §0.5.
3. Progress + reducer: nhánh sky mặc định rỗng; action SKY_* cần cho G2 (§6.2, trừ nâng sao/thăng bậc/khinh
   khí cầu/set); ghi ledger skyseed:/bug:/skyitem:/pot:/ingredient:. Test reducer và test mở bản lưu cũ.
4. Luật + guard: buildGameRules().sky, GAME_RULES_VERSION = 2, xuất game-rules.json; ProgressGuard shape +
   diff + trần XP + claim hướng dẫn. Test PHP (server/bin/selftest*.php) và progressGuard.test.ts cho các ca
   gian lận ở §16.2: sửa readyAt, nhân bản potUid, thêm bọ không có trong kết quả HMAC, thu hai lần, vượt
   trần XP, sửa stars.
5. Server: SKY_SECRET, GET /account/sky/bugs (đăng nhập, rate limit, chỉ mốc đã qua), Friends.php đọc
   data.sky theo §0.2 bước 7. Cờ skyGarden trong app_settings.
6. Giao diện: nối demo G1 với state thật. Nút "Lên mây" trong FarmGame (chỉ hiện khi cờ bật và đủ cấp),
   mầm đậu trong decorSpots, khay chậu, khay hạt, chi tiết chậu, Bếp trà, thanh "XP trên mây hôm nay",
   tab "Trên mây" trong StoragePanel, tab Vườn Mây trong FriendFarm (chỉ xem), luồng nhập bản lưu khách
   có hỏi trước. Chuỗi hướng dẫn §0.4.
7. Kiểm tra: npm run verify, npm run test:server, npm run test:account, npm run test:audit,
   npm run test:audit:server. Chạy kịch bản tay: tài khoản mới cấp 12, không bạn, không sự kiện, đi
   đất → mây → thu → bắt bọ → nhài sấy → MIX01 → mở tầng 2 → mở tầng 3 không bị kẹt. Thử hai thiết bị cùng
   tài khoản (409 → reconcile). Thử 360/390/430 px và giảm chuyển động.
8. Báo cáo cuối (tiếng Việt): commit; bảng §16.2 đã chạy dòng nào, kết quả; lệnh test và kết quả thật;
   việc chưa làm; rủi ro còn lại; các bước deploy cần làm (env SKY_SECRET, export rules, bật cờ).
```

---

## Sau mỗi giai đoạn

- Cập nhật mục "Trạng thái" ở đầu `vuon-may.md` (ngày, giai đoạn xong, commit, việc còn lại).
- Số liệu nào đổi khi code thì sửa ở `src/data/skyGarden.ts` **và** bảng tương ứng trong §0, để plan và code
  không lệch nhau.

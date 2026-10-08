# Vườn Mây: chậu cây trên tầng mây, nối với nông trại — plan chi tiết

Khảo sát ngày 2026-10-08. Ý tưởng: thêm một khu "trên mây" kiểu **Khu Vườn Trên Mây** (ZingPlay/VNG) vào
nông trại "Ăn gì?". Nông trại dưới đất giữ nguyên lối chơi kiểu **Nông Trại Vui Vẻ** (ô đất, tưới, trộm,
chợ). Vườn Mây là tầng chơi thứ hai, xếp **chậu sưu tầm** lên từng tầng mây. Hai khu dùng chung kinh tế
(xu, XP, cấp, kho) và đổ sản phẩm vào nhau.

**Cách đọc file (cập nhật 2026-10-08, lượt 3):** **§0 "Đặc tả chốt" là bản chuẩn để code theo.** Khi §0 khác
bất kỳ mục nào phía sau, làm theo §0. §1–§18 giữ lại làm phụ lục: lý do, phương án đã cân nhắc, quy tắc chi
tiết. Chỗ nào bị §0 thay thế đều có ghi chú "→ §0.x" ngay tại chỗ. §12–§16 (quy tắc vận hành, mobile, offline,
nghiệm thu) và §17 (định hướng V2) và §18 (kiến trúc asset/scene) vẫn còn hiệu lực ở những điểm §0 không nói tới.

Art gốc của người dùng (đã kiểm tra file thật ngày 2026-10-08: 4 chậu là PNG 1254×1254 RGBA, nền trong suốt;
moodboard là PNG 941×1672 RGB không có kênh alpha; quyền sử dụng: người dùng tự vẽ hoặc đặt vẽ, cần họ xác nhận
bằng văn bản trước khi phát hành):

| File | Chậu | Ghi chú |
|---|---|---|
| `1.png` | Chậu Bí Ngô | cam, dây lá xanh ngọc, hoa trắng, quai vàng |
| `2.png` | Chậu Bắp | hạt bắp vàng, bẹ lá xanh |
| `3.png` | Chậu Bắp Cải | lá cải ngọc bích, ngọc trai, đế lá |
| `4.png` | Chậu Cà Tím | tím, hoa tím viền vàng, đế tầng |
| `5.png` (941×1672) | Moodboard "kệ chậu" | khoảng 60 chậu theo món Việt: phở gà trống, bánh mì, bánh chưng, cà phê phin, dừa, thanh long, cua, bánh trung thu, ấm trà, dưa hấu, chè, nón lá, cá sứ, mái đình, giỏ tre… |
| `6.png` (1024×1536) | Ảnh mẫu bố cục màn Vườn Mây | tháp 6 tầng mây nhiều màu, đậu thần dọc bên trái, mỗi tầng một máy ở đầu trái, 6 chậu/tầng, bong bóng trên cây, cờ từng tầng, làng và chợ ở chân tháp. **Chỉ dùng làm mẫu bố cục**, xem chỗ cần đổi ở §0.7 |

Cả 4 chậu đều có miệng đất lộ ra (chỗ trồng cây), cùng phối cảnh 3/4 và cùng ánh vàng lấp lánh, nên ghép
thành một bộ được ngay.

---

## 0. Đặc tả chốt (bản để code theo)

Mục này gộp các quyết định từ §1–§17, sửa các chỗ mâu thuẫn và điền số liệu còn thiếu. Mọi số liệu đã đối
chiếu với code ngày 2026-10-08. Số nào ghi "mô phỏng chỉnh" là số khởi điểm, chạy `scripts/sim/sky-economy.mjs`
ở G3 xong mới chốt hẳn.

### 0.1 Bảng quyết định

**Đã chốt** (theo đề xuất trong plan; người dùng muốn đổi thì sửa ở bảng này trước):

| # | Chủ đề | Chốt | Thay cho |
|---|---|---|---|
| D1 | Cách lưu dữ liệu | **Hướng A:** Vườn Mây nằm trong bản lưu chung, lưu qua `PUT /account/progress` như nông trại, guard soát. Server chỉ tự ghi ở 2 thao tác: nâng sao và thăng bậc (§0.2) | §15.1 (server nắm mọi thao tác) |
| D2 | Số ô mỗi tầng | 6 (khớp ảnh mẫu `6.png` và 6 chậu/bộ) | §10 câu 4 |
| D3 | Tưới | Dùng đúng luật nông trại hiện có (§0.5) | §12.1 (10%/chu kỳ) |
| D4 | Hiệu ứng xếp chậu | Một bảng 4 hiệu ứng, mỗi tầng áp **một** hiệu ứng theo thứ tự ưu tiên cố định (§0.6). Cộng hưởng 2/4/6 của §17.3 hoãn đến G6 | §5.4, §17.3 |
| D5 | Bonus xu của chậu | Tắt đến G4 (kho chung không biết món nào trồng ở chậu nào). Từ G2 chỉ áp `time`, `xp`, `bug` | §4.2 cột `coin` |
| D6 | XP từ Vườn Mây | Trần **150 XP/ngày** (§0.5) | chưa có |
| D7 | Lộ trình | Một lộ trình duy nhất G0–G6 (§0.3) | §9, §16.1, §17.7 |
| D8 | Tiền nạp | Không có ở v1. Mây Ngọc chỉ kiếm bằng chơi | §8, §10 câu 3 |
| D9 | Mua bán giữa người chơi, trộm trên mây | Không làm | §5.7, §17.6 |
| D10 | Phong cách hình | Chậu men bóng viền vàng (theo 4 chậu đã có) là trung tâm. Bố cục theo `6.png`, không theo phong cách chibi của `6.png` (§0.7) | chưa có |

**Quyết định triển khai đề xuất (2026-10-08):** Q1–Q4 được **chốt làm mặc định kỹ thuật** để G0/G1 có thể triển khai, **không phải xác nhận cá nhân của người dùng**. Q5 chỉ là chính sách đề xuất, phải duyệt trước G2; Q6 **chưa xác minh quyền sử dụng**, không được tự suy đoán.

| # | Câu hỏi | Quyết định / trạng thái | Điều kiện nghiệm thu |
|---|---|---|---|
| Q1 | Tên khu | **Mặc định kỹ thuật: Vườn Mây** | Hiển thị đúng ở vi/en, route và điều hướng; tên có thể đổi trước phát hành |
| Q2 | Cấp mở | **Mặc định kỹ thuật: cấp 12**, mầm đậu xuất hiện cấp 10 | Cấp 10–11 thấy teaser nhưng không vào gameplay; cấp 12 mở đúng một lần |
| Q3 | Bậc của bộ Nông Sản (4 chậu đã có) | **Mặc định kỹ thuật: Ngọc** | Registry, shop và giao diện hiển thị nhất quán; không tự cấp chậu hiếm khi tạo tài khoản |
| Q4 | Bố cục trên điện thoại | **Chờ kiểm chứng G1:** toàn cảnh 1×6 chậu/tầng như ảnh tham chiếu, chạm tầng để phóng to tương tác; 2×3 là phương án dự phòng khi không đủ kích thước chạm | Thử 360/390/430 px trên thiết bị thật: toàn cảnh không tràn, 6 chậu nhìn rõ; khi tương tác hitbox ≥44 px, bọ không đè hitbox cây; chọn phương án dựa trên test, không khóa cứng trước G1 |
| Q5 | Khách chưa đăng nhập rồi đăng nhập | **CHỜ DUYỆT CHÍNH SÁCH:** đề xuất giữ chậu/cây/bọ thường, reset sao/luck và loại vật phẩm hiếm theo §0.2 | Trước G2 phải có xác nhận người dùng, thông báo trước import, kiểm thử không mất tài sản ngoài phạm vi thông báo; nếu chưa duyệt thì chặn nhập Vườn Mây thay vì âm thầm xóa |
| Q6 | Quyền dùng 4 chậu, `5.png`, `6.png` | **CHƯA XÁC MINH**. 4 chậu dùng nội bộ để dựng thử; `5.png` và `6.png` chỉ là tham khảo bố cục, không đưa nguyên ảnh vào sản phẩm | Trước phát hành cần xác nhận quyền sở hữu/giấy phép từng asset bằng văn bản; asset không rõ quyền phải thay bằng bản gốc có quyền dùng |

**Chi tiết Q4 (thay thế quyết định 2×3 cũ):** Giữ **6 ô logic/tầng** ở mọi màn hình. Chế độ **toàn cảnh** ưu tiên 1 hàng 6 chậu giống ảnh tham chiếu để thấy nhiều tầng, nhưng đây là chế độ quan sát, không bắt người dùng chạm vào chậu ~50 px để thao tác chính. Chạm vào một tầng mở **chế độ tương tác phóng to tầng** (camera zoom hoặc panel chi tiết), bảo đảm vùng chạm mỗi chậu/bọ/nút ≥44×44 CSS px, có nút quay lại toàn cảnh và giữ vị trí cuộn. Nếu test 360/390/430 px không đạt khả năng đọc hoặc hiệu năng, dùng **2×3** trong chế độ tương tác hoặc toàn cảnh theo quyết định G1. Trên desktop ưu tiên 1×6 nếu đủ chỗ. Không thay đổi số chậu, bộ 6, trạng thái cây hay logic game khi đổi chế độ. G1 phải lưu screenshot/video ở 360, 390, 430, 768, 1366 px và có người duyệt kết quả trước khi chốt layout.

**Cổng quyết định:** G0/G1 có thể dùng Q1–Q4 ở trạng thái mặc định kỹ thuật. **Không đánh dấu hoàn thành điều kiện “người dùng chốt Q1–Q6” ở §0.3/§0.10.5** cho tới khi Q5 được duyệt và Q6 có chứng cứ. G2 không được chạy import tài sản Vườn Mây thật nếu Q5 chưa duyệt; không phát hành asset nếu Q6 chưa xác minh.

### 0.2 Lưu dữ liệu và chống gian lận (hướng A)

**Vì sao không làm như §15:** nông trại đang lưu cả bản lưu một lần (`PUT /account/progress`, khóa theo
`version`, ghi chồng trả 409, `server/lib/Account.php:281-338`), rồi `ProgressGuard` soát phần thay đổi. Nếu
Vườn Mây cho server nắm từng thao tác mà xu, XP, kho vẫn nằm trong bản lưu chung, thì xu có hai nơi giữ số dư.
Đó là chỗ dễ nhân đôi tiền nhất. Muốn làm §15 thì phải chuyển cả ví sang server trước, việc đó tách thành dự án
riêng.

**Cách làm:**

1. Nhánh `sky` nằm trong `GuestProgress` và đi cùng bản lưu. Thêm field bằng giá trị mặc định trong
   `parseProgress`, **không** tăng `SCHEMA_VERSION` (đang là 2).
2. `ProgressGuard::shape()` thêm kiểm tra nhánh `sky`:
   - Chỉ nhận ID có trong danh sách luật.
   - Tối đa 10 tầng; mỗi tầng mua thêm 0–3 ô; bậc chậu 0–4; sao 0–5.
   - Mỗi `uid` chậu là duy nhất và chỉ nằm ở một ô.
   - Mọi số là số nguyên không âm.
3. `ProgressGuard::diff()` thêm luật cho từng thay đổi:

   | Thay đổi | Guard đòi |
   |---|---|
   | Thêm chậu | Có dòng ledger `pot:<potId>` +1 và nguồn hợp lệ: mua (trừ xu đúng giá), quà mở tầng, thưởng đã nhận |
   | Trồng | Trừ đúng 1 hạt `skyseed:<id>` hoặc `seed:<veg>`. `readyAt − plantedAt` ≥ thời gian gốc × (1 − `timeBp` đã chụp lúc trồng) × hệ số tưới hợp lệ |
   | Thu | Đã đến `readyAt` theo giờ server (dùng độ lệch giờ hiện có). Sản lượng đúng bảng. XP đúng `harvestXp` × hệ số XP, không vượt trần ngày |
   | Bọ | Mỗi con bọ mới vào túi phải khớp kết quả tung của đúng chu kỳ (công thức dưới) và chưa ai bắt |
   | Sao, bậc, `luck` | **Client không được đổi.** Chỉ server ghi (bước 4). Guard so với bản trước: khác là từ chối |
   | Máy | Trừ nguyên liệu lúc bắt đầu. Nhận sản phẩm sau đủ thời gian. Mỗi `jobId` nhận một lần |
   | Mở tầng, mua ô | Đủ cấp, trừ đúng xu và vật phẩm, theo thứ tự |

4. **Nâng sao và thăng bậc do server làm.**
   - Client gọi `POST /account/sky/star-up` với body `{ potUid, useClover, opId, baseVersion }`.
   - Trước khi gọi, client đẩy hết thay đổi đang chờ lưu, để `baseVersion` đúng bằng bản trên server.
   - Server mở giao dịch:
     - Khóa dòng `user_progress`, kiểm tra `version`, kiểm tra nguyên liệu trong bản đã xác minh.
     - Tung bằng `random_int`, áp kết quả, ghi dòng ledger `sky:starup`, tăng `version`.
     - Lưu `opId` vào `progress_claims` (khóa `starup:<opId>`).
   - Server trả về `{ result, version, patch }`; client áp `patch`.
   - Gửi lại cùng `opId` thì nhận đúng kết quả cũ, không tung lại.
   - `POST /account/sky/tier-up` làm y hệt nhưng không ngẫu nhiên.
   - Đây là hai chỗ duy nhất server tự ghi vào bản lưu; endpoint `rebase` hiện có là tiền lệ.
5. **Tung bọ tất định, không phụ thuộc thời gian.**
   - Công thức: `roll = hash(skySeed, potUid, cycleNo, stageIndex)`.
   - `skySeed` do server cấp lúc mở tầng 1, ghi một lần và không đổi được (guard chặn). `cycleNo` là số thứ tự
     lần trồng của chậu đó, tăng 1 mỗi lần trồng.
   - Người chơi không "quay lại" kết quả được bằng cách đổi giờ trồng hay đổi cây. Đoán trước chỉ biết lần trồng
     thứ _n_ có bọ gì, mà không đổi được.
   - Đom đóm: nếu ra đom đóm nhưng mốc lớn rơi vào ban ngày (6h–18h, giờ UTC+7) thì đổi thành bọ thường có trọng
     số cao nhất. Canh giờ trồng để mốc rơi vào ban đêm là lối chơi hợp lệ.
6. **Khách chưa đăng nhập** chơi đầy đủ:
   - Nâng sao tung tại máy, có pity, `skySeed` sinh tại máy.
   - Khi đăng nhập và nhập bản lưu khách (đường `import()` hiện có): giữ chậu, cây đang trồng và bọ thường;
     sao về ★0, `luck` về 0, bọ hiếm, đom đóm, bọ hung vàng và Mây Ngọc về 0; cấp lại `skySeed` từ server.
     Hiện thông báo trước khi nhập (Q5).
7. **Trang thăm vườn bạn:** `Friends.php` (đoạn đọc vườn bạn, khoảng dòng 320) đọc thêm `data.sky` và chỉ xuất
   các field đã kiểm tra: tầng, chậu đang đặt (potId, bậc, sao), giai đoạn cây, bọ đang đậu. **Không** thêm cột
   `sky_summary` như §6.4. Không xuất `skySeed`, ledger hay `luck`.
8. Tăng `GAME_RULES_VERSION` từ 1 lên 2 (đã kiểm tra giá trị hiện tại là 1). Tách luật mới thành
   `buildGameRules().sky`, rồi chạy lại `scripts/export-game-rules.mjs`.

### 0.3 Lộ trình duy nhất

Thay cho §9, §16.1 và §17.7. Mỗi giai đoạn bật bằng cờ `skyGarden` trong `app_settings` (bảng đã có), tắt mặc
định trên production đến khi qua cổng.

| GĐ | Phạm vi | Cổng hoàn thành |
|---|---|---|
| **G0. Chuẩn bị** | Người dùng chốt Q1–Q6 · `scripts/sky-garden/prepare-pots.mjs` xử lý 4 chậu (§0.7) · danh sách ID và số liệu G2 (§0.4) đưa vào `src/data/skyGarden.ts` · `prompts/sky-garden-prompts.md` · phác bố cục điện thoại 360/390/430 px | 4 chậu webp có điểm neo đúng khi xem thử · bảng §0.4 không còn ô trống |
| **G1. Demo chuyển động** | Route `/sky-garden-test` (như `/farm-animation-test`): 3 tầng, 4 chậu thật + chậu tạm, cây lắc, bọ bay tới, đậu, bị bắt, bong bóng chín, máy chạy, ngày/đêm, cảnh leo đậu thần lần đầu. Dữ liệu giả, **không đụng bản lưu** | Người dùng duyệt trên điện thoại thật · ≥ 30 fps trên Android tầm trung (ghi rõ máy) |
| **G2. Lát cắt chơi thật** | Mầm đậu ở cấp 10, mở cấp 12 · tầng 1–3, mua ô · 5 cây (§0.4), trồng cây rau dưới đất trong chậu · tưới chung · bọ · thu, thu cả tầng · bộ Đất nung (3 chậu tặng + shop) và 4 chậu Nông Sản · máy **Bếp trà** với nhài sấy và **MIX01** (cần mật ong từ tổ ong dưới đất) · chuỗi hướng dẫn cho đủ Hạt Mây, Sương Mai để mở tầng 2–3 · trần XP · guard, i18n vi/en, test | Ma trận §16.2, các dòng: hướng dẫn, vòng cây, kinh tế (phần G2), offline, đồng bộ, gian lận (không gồm nâng sao), dữ liệu cũ, mobile/i18n · tài khoản mới chơi đất → mây → thu → nấu MIX01 không bị kẹt |
| **G3. Chậu có chiều sâu** | Nâng sao, thăng bậc qua server · hiệu ứng xếp chậu · gợi ý xếp · sổ tay chậu, bộ sưu tập · máy **Nồi chè** (MIX04, mứt dâu), máy chưng sương · mô phỏng kinh tế 90 ngày · mở tầng 4–5 | Dòng "Chậu/bộ" và "Nâng cấp" của §16.2 · mô phỏng: không kẹt, không vòng lời vô hạn, tầng 5 rơi vào ngày 20–30 với hồ sơ 3 lần/ngày |
| **G4. Chế biến và đơn** | Phin cà phê (MIX07 cà phê sữa, nước tắc), cây T3–T5 · cú đưa thư nhận hàng mây · khinh khí cầu (từ tầng 5) · bật bonus xu (D5) bằng cách ghi lô hàng · mở tầng 6–10 khi mô phỏng xác nhận đủ nguồn | Chuỗi trồng → máy → đơn → Hạt Mây → mở tầng chạy trong mô phỏng |
| **G5. Bạn bè** | Thăm Vườn Mây của bạn · bắt bọ giúp (chỉ bọ thường, quota hai phía §13.2) · tưới giúp · bảng Điểm vườn · `farm_events` loại `sky_catch` | Thử 2 tài khoản trên 2 máy · dòng "Xã hội" của §16.2 |
| **G6. Nội dung** | Đủ 36 chậu, 15 cây, nhiệm vụ và thành tựu mây, sự kiện Tết/Trung Thu, trang trí mây, xem xét cộng hưởng 2/4/6 (§17.3) và trợ thủ (§17.4) | Mỗi đợt nội dung qua lại mô phỏng |

Mỗi giai đoạn chạy `npm test`, `npm run check:motion`, test i18n, xuất lại `game-rules.json` và thử trên điện
thoại thật. Phải sao lưu DB trước mỗi lần deploy (theo quy trình deploy hiện có).

### 0.4 Số liệu cho G2

**Tầng và ô** (tầng 4–10 giữ bảng §4.1, mô phỏng chỉnh):

| Tầng | Cấp | Xu | Hạt Mây | Sương Mai | Ô có sẵn | Giá ô 4/5/6 |
|---|---|---|---|---|---|---|
| 1 | 12 | 0 | 0 | 0 | 3 | 60 / 100 / 160 |
| 2 | 15 | 400 | 2 | 0 | 3 | 90 / 150 / 240 |
| 3 | 19 | 900 | 4 | 1 | 3 | 130 / 220 / 350 |

**Nguồn vật phẩm mở tầng chắc chắn ở G2:**

| Mốc hướng dẫn (nhận một lần) | Thưởng |
|---|---|
| Đặt chậu đầu tiên | 3 hạt nhài |
| Thu cây mây đầu tiên | 1 Hạt Mây |
| Bắt con bọ đầu tiên | 1 Hạt Mây |
| Làm xong nhài sấy đầu tiên | 1 Sương Mai |
| Mở tầng 2 | 2 Hạt Mây + 1 chậu Đất nung |
| Nấu xong MIX01 đầu tiên | 2 Hạt Mây |

Tổng là 6 Hạt Mây và 1 Sương Mai, vừa đủ mở tầng 2 (2 Hạt Mây) và tầng 3 (4 Hạt Mây + 1 Sương Mai), không cần
bạn bè, sự kiện hay bọ hiếm. Thứ tự: thu cây và bắt bọ lần đầu cho 2 Hạt Mây, mở tầng 2; mở tầng 2 trả 2 Hạt
Mây, nấu MIX01 trả thêm 2, cộng Sương Mai từ nhài sấy là đủ tầng 3.

Hai chỗ có thể kẹt và cách xử lý:
- **Bọ đầu tiên là ngẫu nhiên:** lần trồng đầu tiên (`cycleNo = 0` của chậu đầu tiên) luôn có một bọ rùa ở mốc
  giai đoạn 1, đặt cố định, không qua tung.
- **MIX01 cần mật ong:** tổ ong mở từ cấp 6 nên đa số người chơi đã có mật. Nếu lúc làm xong nhài sấy đầu tiên
  mà kho không có mật ong, mốc đó tặng thêm 1 mật ong. Từ tầng 4 trở đi nguồn đến từ nhiệm vụ ngày (1 Hạt Mây/ngày) và máy chưng sương
(G3).

**Hạt trồng** dùng khóa `skyseed:<id>`. Đây là loại riêng, không phải "Hạt Mây" `skyitem:cloudseed` (tránh
nhầm như §15.3 đã cảnh báo).

**5 cây G2.** XP tính bằng `harvestXp(giờ)` hiện có ([game.ts:241](../src/data/game.ts)). Giá đặt cao hơn rau
cùng cấp một chút (rau cấp 12 bán 5 xu/cái):

| Cây | Mở | Giá hạt | Thời gian | Sản lượng | Giá bán/cái | XP |
|---|---|---|---|---|---|---|
| Hoa nhài `jasmine` | T1 | 15 | 45 ph | 3 nụ nhài | 6 | 3 |
| Bạc hà `mint` | T1 | 12 | 30 ph | 3 lá bạc hà | 5 | 3 |
| Tắc `kumquat` | T1 | 22 | 2 g | 4 trái tắc | 7 | 5 |
| Sen `lotus` | T2 | 24 | 3 g | 2 hạt sen + 1 hoa sen | 9 / 10 | 7 |
| Dâu tây `strawberry` | T2 | 26 | 2 g 30 | 4 dâu | 8 | 6 |

Lãi mỗi lần trồng chỉ khoảng 3–6 xu. Giá trị thật nằm ở công thức và Hạt Mây, giống ý "trồng để làm XP, công
thức và đơn" của rau dưới đất.

**Máy G2–G3.** Mỗi máy mới mở phải có ít nhất một công thức làm được ngay bằng nguồn sẵn có (§12.3):

| Máy | Mở | Công thức | Thời gian | Giá bán | XP |
|---|---|---|---|---|---|
| Bếp trà | T1 | 3 nụ nhài → 1 nhài sấy | 20 ph | 22 | 2 |
| Bếp trà | T1 | **MIX01:** 2 nhài sấy + 1 mật ong → 1 trà nhài mật ong | 40 ph | 70 | 5 |
| Bếp trà | T1 | **MIX02:** 2 trái tắc + 2 lá bạc hà + 1 mật ong → 1 nước tắc bạc hà mật ong | 30 ph | 48 | 4 |
| Nồi chè | T2 | **MIX04:** 3 hạt sen + 1 mật ong → 1 chè sen mật ong | 1 g | 52 | 5 |
| Nồi chè | T2 | 4 dâu → 1 mứt dâu | 1 g | 42 | 4 |
| Máy chưng sương | T3 | 3 hoa bất kỳ (nụ nhài, hoa sen) → 1 Sương Mai | 8 g | không bán | 0 |

- **Luật chống vòng lời:** giá bán thành phẩm ≤ 1,35 × tổng giá bán nguyên liệu. Mật ong không mua được ở chợ
  (`MARKET.buy` chỉ bán thịt), nên không có vòng mua → nấu → bán. Test `skyGarden.test.ts` duyệt mọi công thức
  để giữ luật này.
- **MIX07** (cà phê sữa) dùng được `milk` có sẵn trong code. Để ở G4 vì cây cà phê mở tầng 3.

**Chậu G2:**
- 3 chậu Đất nung tặng khi mở tầng 1.
- Shop Đất nung 80–150 xu, 6 mẫu.
- 4 chậu Nông Sản giá 400 / 450 / 500 / 550 xu, mở ở tầng 2. Chưa có Mây Ngọc ở G2 nên tạm bán bằng xu. Từ G3,
  chậu Nông Sản thứ 5, 6 mới cần Mây Ngọc.

### 0.5 Luật chốt cho vòng cây

- **Tưới (D3):** dùng y luật `WATERING` của nông trại ([game.ts:849](../src/data/game.ts)):
  - Ngân sách chung: 3 lượt/ngày, cộng 1 lượt sau mỗi lần check-in bữa ăn thật. Tưới dưới đất hay trên mây
    đều trừ chung.
  - Mỗi lượt giảm 25% thời gian **còn lại**.
  - Mỗi chậu cách nhau tối thiểu 1 giờ giữa hai lần tưới.
  - Không tưới cây đã chín.
- **Bọ:**
  - Tung ở 3 mốc chuyển giai đoạn, chỉ khi chưa có bọ đang đậu.
  - Xác suất có bọ: 25% + chỉ số `bug`, tối đa 85%.
  - Loại bọ theo trọng số trong bảng §4.4 (là trọng số, không phải xác suất).
  - Bọ còn đậu đến mốc tiếp theo làm chậm cây 10% thời gian còn lại, tối đa một lần mỗi chu kỳ.
  - Thu hoạch thì bọ chưa bắt bay mất, có thông báo.
- **Chỉ số hiệu lực của một chậu** tính bằng điểm cơ bản (bp, 1% = 100 bp), toàn số nguyên:
  ```
  base     = chỉ số của mẫu chậu ở bậc gốc của bộ (bảng §4.2)
  tierMul  = TIER_MUL[bậc hiện tại] / TIER_MUL[bậc gốc của bộ]  với TIER_MUL = [100, 130, 170, 220, 300]
  starMul  = 100 + 20 × sao
  floorMul = 100 + 3 × (tầng − 1)
  stat     = floor(base × tierMul × starMul × floorMul / 1 000 000) + combo của tầng (§0.6)
  stat     = min(stat, trần)          trần: time 5000, xp 10000, bug 6000
  ```
  - Ví dụ: chậu Bí Ngô (Nông Sản, bậc gốc Ngọc, `time` 600 bp) ★0 ở tầng 1 cho 600 bp = 6%. Lên ★5, thăng
    Hoàng kim, đặt ở tầng 3 thì được 600 × 220/170 × 200/100 × 106/100 ≈ 1646 bp = 16,5%.
  - Cây rau dưới đất trồng trong chậu Nông Sản: nhân đôi phần `time` của **chính chậu** trước khi cộng combo.
  - Chỉ số được chụp lại lúc trồng (`statsAtPlant`); đổi chậu hay xếp lại tầng không làm đổi cây đang lớn.
- **Trần XP từ mây (D6):** tổng XP từ thu cây mây, máy, nhiệm vụ mây và khinh khí cầu tối đa 150 XP/ngày (UTC+7).
  - Quá trần thì vẫn nhận vật phẩm nhưng XP = 0. UI hiện "XP trên mây hôm nay: 120/150".
  - Lý do: người chơi đều đặn kiếm khoảng 450 XP/ngày ở dưới đất. Ước tính 18 chậu × 4 vòng/ngày × 5 XP = 360 XP
    từ mây sẽ đẩy nhanh mọi mốc cấp (`PLOT_UNLOCK_LEVELS`) lên gần gấp đôi.
  - Guard đếm theo `dayKey('skyxp', …)` có sẵn.
- **XP của cây rau trồng trên mây** cũng tính vào trần 150.

### 0.10 Tiêu chí nghiệm thu và hợp đồng trạng thái

**Mục tiêu:** các cổng G0–G6 ở §0.3 là điều kiện phát hành, không chỉ là danh sách tính năng. Chỉ đánh dấu hoàn thành khi có bằng chứng kiểm thử (test/log/video, commit, thiết bị). Không thay thế các quy tắc đã chốt ở §0.1–§0.9.

**State machine chuẩn**

| Đối tượng | Trạng thái hợp lệ | Quy tắc chuyển và từ chối |
|---|---|---|
| Ô tầng | `locked → empty → occupied` | chỉ mở khi đủ tầng, cấp, xu và vật phẩm; chậu không thể ở hai ô |
| Chậu | `inventory ↔ placed`, kèm `plant=null/active/ready` | không di chuyển/cất nếu cây chưa thu hoặc chưa hủy theo luật; thao tác thất bại không thay đổi bản lưu |
| Cây | `empty → growing → ready → harvested(empty)` | snapshot chỉ số lúc trồng; tưới và bọ chỉ tác động khi growing; thu đúng một lần, dựa trên giờ server |
| Bọ | `absent → perched → caught/expired` | chỉ bắt khi đang đậu; không bắt lặp; bọ chưa bắt hết hạn khi thu hoặc theo mốc được chốt |
| Máy | `idle → running → ready → claimed(idle)` | trừ nguyên liệu một lần khi start; nhận đầu ra một lần khi claim; `jobId` duy nhất |
| Nâng sao/bậc | `idle → pending → success/failure → idle` | chỉ server chốt; retry cùng `opId` trả lại kết quả cũ; lỗi mạng không được tung lại |

**Hợp đồng API và đồng bộ tối thiểu**

- `PUT /account/progress` vẫn là đường lưu bản chung theo §0.2; mỗi lần ghi có `baseVersion` và kiểm tra `ProgressGuard`. Phản hồi 409 phải tải bản mới, replay **chỉ** các thao tác hợp lệ chưa xác nhận, kiểm tra lại nguồn lực và hiển thị xung đột nếu không thể replay; tuyệt đối không ghi đè mù.
- `POST /account/sky/star-up` và `/tier-up`: request chứa `potUid`, `opId`, `baseVersion` (và `useClover` khi phù hợp); server kiểm tra đăng nhập, quyền sở hữu, version, điều kiện, chi phí; transaction khóa bản lưu, ghi kết quả và idempotency key trong cùng giao dịch. Cùng `opId` + cùng payload trả cùng kết quả; cùng `opId` + payload khác trả lỗi.
- Mã lỗi có thể phân biệt: `UNAUTHORIZED`, `STALE_VERSION`, `INVALID_STATE`, `INSUFFICIENT_RESOURCES`, `RATE_LIMITED`, `OP_ID_CONFLICT`; UI dịch vi/en và không làm mất trạng thái đã xác nhận.
- Giới hạn tần suất nâng sao và bắt bọ; không tin `readyAt`, `statsAtPlant`, `cycleNo`, số dư, `skySeed` hay kết quả RNG do client gửi. Guard phải đối chiếu với tiến trình trước và các nguồn tài nguyên hợp lệ.
- **Điểm cần giải quyết trước G2:** §0.2 đang lưu `skySeed` trong bản progress trả về client, vì vậy hash tất định có thể bị đoán. Chốt một trong hai phương án: (A) server giữ secret riêng và xác minh HMAC qua endpoint, hoặc (B) chấp nhận RNG công khai cho bọ thường nhưng **không** dùng RNG đó để phát thưởng hiếm/có giá trị; thưởng hiếm phải do server xác nhận. Không tuyên bố chống đoán seed khi seed được trả cho client.
- Với khách, xác nhận trước khi import về việc reset sao, bọ hiếm và Mây Ngọc (§0.2/Q5); không reset im lặng. Mọi migration phải có backup và test mở bản lưu cũ.

### 0.11 Tiêu chí nghiệm thu asset chậu và cảnh

- **Nguồn:** asset có `assetId`, tên, phiên bản, quyền sử dụng được xác nhận, file gốc; không dùng ảnh moodboard/tổng hợp làm asset runtime. Bộ 20 chậu tách từ ảnh tổng hợp phải được kiểm tra **từng file**, không mặc định đã đạt chất lượng.
- **Alpha:** PNG nguồn RGBA nền trong suốt thật; không có mảng đen/trắng nền, viền răng cưa/halo đen, phần thừa từ chậu cạnh bên hoặc vật thể bị cắt. Kiểm tra trên nền sáng, tối và nền mây game.
- **Hình:** toàn bộ thân, quai, đế và miệng đất nằm trong khung, có lề an toàn; không biến dạng, không ghép chồng từ chậu khác. Tất cả cùng góc nhìn 3/4, ánh sáng, tỷ lệ thị giác và điểm neo miệng đất nhất quán.
- **Kích thước:** giữ file gốc độ phân giải cao; xuất WebP 256px (@1x) và 512px (@2x) như §7.1, không upscale ảnh nguồn nhỏ để giả tăng chi tiết. Asset không đủ nét phải render lại riêng.
- **Điểm neo:** `pots.json` có `cx,cy,rx` theo hệ tọa độ xác định; preview cây giai đoạn 0–3 đặt đúng trong đất, không xuyên mép chậu. Tối thiểu kiểm tra thủ công trên 4 chậu gốc và toàn bộ chậu mới trước khi bật.
- **Tối ưu:** ảnh lazy-load, có kích thước khai báo tránh nhảy layout; ghi tổng byte tải ban đầu và thời gian mở cảnh trên thiết bị kiểm thử. Không duyệt chỉ dựa vào screenshot desktop.
- **Bằng chứng:** contact sheet từng chậu có ID, preview cây và ảnh chụp trong cảnh thật; bảng pass/fail cho alpha, crop, anchor, độ nét, quyền sử dụng. Asset fail không được đưa vào registry sản phẩm.

### 0.12 Kiểm thử kinh tế, bảo mật và khả năng phục hồi

**Bộ hồ sơ mô phỏng tối thiểu:** (1) mới chơi, (2) 1 lần/ngày, (3) 3 lần/ngày, (4) bỏ game 7–14 ngày rồi quay lại, (5) chỉ chơi dưới đất, (6) không bạn bè/không sự kiện, (7) người chơi nhiều tài nguyên, (8) hai thiết bị cùng tài khoản. Chạy ít nhất 90 ngày mô phỏng với nhiều seed; lưu cấu hình và kết quả để tái lập.

**Các bất biến phải luôn đúng:**

1. Xu, XP, kho, hạt, bọ, chậu, sản phẩm máy không âm; chậu UID không trùng và không nằm nhiều ô; không có vật phẩm tự sinh không có nguồn.
2. Không nhận thưởng hai lần khi bấm liên tiếp, retry, mất mạng, tải lại trang, 409 hoặc hai thiết bị.
3. Người chơi không cần bọ ngẫu nhiên, sự kiện hoặc bạn bè để nhận đủ Hạt Mây/Sương Mai mở tầng 2–3. Test ledger tuần tự: sau 2 mốc đầu có 2 Hạt Mây; trả 2 để mở tầng 2; thưởng mở tầng 2 nhận 2; hoàn thành MIX01 nhận 2; có 4 để mở tầng 3. Sương Mai có từ nhài sấy trước tầng 3.
4. Không có chu trình mua/trồng/chế biến/bán cho lợi nhuận không giới hạn; kiểm tra quy tắc 1,35× §0.4 và mọi đường nhận thưởng đơn.
5. Không vượt trần 150 XP/ngày từ Vườn Mây kể cả nhiều thao tác cùng lúc; trần reset theo ngày chuẩn được xác định và test qua ranh giới ngày.
6. Mọi mốc tầng và máy đều có ít nhất một đường đạt được từ tài nguyên đã mở; không có phụ thuộc vòng hoặc soft-lock do kho đầy/hàng chờ đầy.
7. Không tin thời gian thiết bị; test chỉnh đồng hồ, timezone, offline, refresh, reconnect, xung đột phiên bản và dữ liệu lỗi.
8. Phép nâng sao/thăng bậc và thưởng hiếm không thể được client tự sửa; có test gửi lại `opId`, đổi payload, race và rollback.

**Chỉ tiêu cân bằng cần xác nhận qua mô phỏng, không phải cam kết sẵn:** hồ sơ 3 lần/ngày mở tầng 5 trong khoảng ngày 20–30 như §0.3; đường đến tầng 10 không phụ thuộc sự kiện; xu có đủ nguồn và sink, không ép người chơi chờ vô lý. Nếu không đạt, sửa dữ liệu và chạy lại trước khi triển khai tiếp.

### 0.13 Definition of Done theo giai đoạn

| Giai đoạn | Bắt buộc có | Bằng chứng |
|---|---|---|
| G0 | Q1–Q6 được chốt; quyền asset; registry ID, nguồn nguyên liệu MIX01, bảng số liệu và dependency graph; 4 chậu gốc qua §0.11 | checklist ký duyệt + preview asset + test registry |
| G1 | demo 3 tầng, cây/bọ/máy và chuyển cảnh, mobile 360/390/430, giảm chuyển động; **không ghi tiến trình thật** | video mobile, log FPS (≥30 trên máy Android tầm trung ghi model), không lỗi console |
| G2 | vòng đất → mây → kho → MIX01; nguồn mở T2/T3; guard, đồng bộ, guest import, XP cap, i18n; không nhân thưởng | test unit/integration + E2E hai thiết bị + mô phỏng đường mở tầng |
| G3 | nâng sao/bậc server idempotent, hiệu ứng xếp, máy mới, bộ sưu tập, mô phỏng ≥90 ngày | báo cáo RNG/retry/race, số liệu cân bằng, test chỉ số bp |
| G4 | đơn và chế biến liên khu, nguồn hàng có truy vết để tính bonus xu, tầng 6–10 không kẹt | test nguồn/sink, đơn quá hạn, không thưởng lặp |
| G5 | thăm bạn, giúp bắt bọ/tưới có quota hai phía, dữ liệu công khai tối thiểu | test hai tài khoản, giới hạn giúp, bảo mật dữ liệu |
| G6 | bộ chậu/cây đủ số lượng, sự kiện, trợ thủ nếu được duyệt, tối ưu hiệu năng | kiểm định từng asset + test cân bằng + duyệt release |

**Điều kiện chung trước khi bật production:** `npm test`, `npm run check:motion`, i18n, kiểm thử bảo mật/guard, backup và phương án rollback đều đạt; feature flag `skyGarden` mặc định tắt cho tới khi được duyệt. Có người chịu trách nhiệm ghi nhận lỗi, theo dõi telemetry và rollback khi xuất hiện nhân tài nguyên hoặc mất tiến trình.

---

### 0.6 Hiệu ứng xếp chậu (D4)

Một tầng cần đủ 6 ô mở và 6 chậu. Hệ thống xét lần lượt từ trên xuống và áp **hiệu ứng đầu tiên thỏa**:

| Ưu tiên | Tên | Điều kiện | Hiệu ứng (G3) |
|---|---|---|---|
| 1 | Đủ bộ | 6 mẫu chậu **khác nhau** của cùng một bộ | +1500 bp chỉ số chính của bộ |
| 2 | Bách hóa | 6 chậu thuộc 6 bộ khác nhau | +800 bp `time`, `xp`, `bug` |
| 3 | Dát vàng | 6 chậu bậc Hoàng kim trở lên | +1000 bp `time` |
| 4 | Ba đôi | đúng 3 bộ, mỗi bộ 2 chậu | +600 bp `xp` (phần +6% xu bật ở G4) |

- "Chỉ số chính của bộ" ghi trong dữ liệu: Đất nung `time`, Nông Sản `time`, Bàn Ăn Việt `xp`, Chợ Quê `xp`
  (đổi sang `coin` ở G4), Biển `bug`, Lễ Tết `xp`.
- Tầng đang có hiệu ứng hiện cờ hiệu ứng ở đầu tầng.
- Màn "Gợi ý xếp" chỉ ra hiệu ứng gần đạt nhất với số chậu đang có.

### 0.7 Hình ảnh theo ảnh mẫu `6.png`

**Giữ từ ảnh mẫu:**
- Tháp tầng cuộn dọc, chân tháp là làng và chợ nối xuống nông trại.
- Đậu thần dọc bên trái.
- Mỗi tầng một máy ở đầu trái.
- Mỗi tầng một màu mây: tầng thấp xanh và trắng, cao dần sang tím, hồng, vàng.
- Bong bóng trên cây.
- Cờ ở từng tầng.

**Đổi so với ảnh mẫu:**

| Ảnh mẫu | Vườn Mây | Lý do |
|---|---|---|
| Phong cách chibi, cây có mặt, mèo, quái vật nhỏ | Chậu men bóng viền vàng là trung tâm, cây vẽ thật như sprite nông trại, không có mặt | Ăn khớp với 4 chậu đã có và tranh nông trại |
| Thanh trên cùng: vàng + kim cương + tim | Xu + cấp/XP. Mây Ngọc chỉ hiện khi đã có. **Không có tim** | Game chỉ có xu và XP (D8). Tim là loại tiền riêng của Khu Vườn Trên Mây |
| Tầng chỉ là dải mây | Dải mây có **mép tre hoặc gỗ** và họa tiết Việt (đèn lồng, men lam) | Khác nhận diện của game VNG (§11) |
| Máy là sinh vật lạ | Máy là đồ bếp Việt: bếp trà, nồi chè, phin, máy chưng sương | Hợp thương hiệu "Ăn gì?" |
| Chữ in sẵn trên hình | Mọi chữ là giao diện thật, có tiếng Việt và tiếng Anh qua `t` | i18n |
| Thanh nút riêng (Bản đồ, Tưới, Hạt giống, Thu hoạch, Khám phá) | Dùng ngăn có sẵn của `FarmGame` (kho, đơn, nhiệm vụ, bạn bè). Trên mây thêm 4 nút: Khay hạt · Tưới (hiện số lượt còn lại) · Thu cả tầng · Xuống đất | Không làm bộ nút thứ hai |
| 6 tầng trong một màn hình | Mặc định 3–4 tầng, có nút "Xem cả tháp" (thu nhỏ, chạm tầng để phóng to lại) | Chậu đủ to để chạm |

**Bố cục theo bề ngang màn hình (Q4):**

- **Dưới 600 px (điện thoại):**
  - Đậu thần là dải 40 px sát mép trái.
  - Mỗi tầng gồm dải đầu tầng cao 56 px (máy nhỏ + biển số tầng + cờ hiệu ứng), bên dưới là 2 hàng × 3 chậu.
  - Ô chậu khoảng 100 px trên máy 390 px: (390 − 2×16 lề − 40 đậu) / 3 ≈ 106 px.
- **Từ 600 px trở lên (máy tính bảng, máy tính):** như `6.png`, gồm cột trái khoảng 24% (đậu thần + máy) và
  6 chậu một hàng, ô chậu ≥ 72 px.
- Mọi vùng chạm ≥ 44 × 44 px.
- Bọ có vùng chạm riêng, nằm trên cây; chạm bọ không kích hoạt thao tác với cây.

**Lớp art cần vẽ** (tách lớp, không cắt từ `6.png`):

| Tên file (`public/images/sky-garden/`) | Kích thước nguồn | Ghi chú |
|---|---|---|
| `sky/{dawn,day,dusk,night}.webp` | 1080×1920 | nền trời, đổi theo giờ và độ cao |
| `shelf/floor-{1..10}.webp` | 1200×240, giãn ngang được (9-slice) | dải mây + mép tre/gỗ, mỗi tầng một màu |
| `beanstalk/{tile,base,top}.webp` | 160×512 lặp dọc | thân đậu, gốc mọc từ đảo, ngọn |
| `ui/floor-sign.webp`, `ui/combo-flag-{1..4}.webp` | 128×128 | biển số tầng, cờ 4 hiệu ứng |
| `machine/{tea,pot,phin,dew}-{idle,run,done}.webp` | 384×384 | 3 trạng thái mỗi máy |
| `bubble/{ready,bug,done}.webp` | 128×128 | bong bóng chín, có bọ, máy xong |
| `pots/<potId>@{1x,2x}.webp` + `pots.json` | 256 / 512 | điểm neo miệng chậu `{cx, cy, rx}` |
| `plants/<id>-{0..3}.webp` | 384×384, gốc cây ở đáy ảnh | 4 giai đoạn |
| `bugs/<id>-{a,b}.webp` | 96×96 | 2 khung đập cánh |

### 0.8 Gắn vào app

- **Lối vào:**
  - Nút "Lên mây" trong `journey/FarmGame.tsx`. `SkyScene` tải lazy trong một chunk riêng, không làm nặng ngăn
    Nông trại.
  - Mầm đậu thần là một điểm trên tranh đảo (thêm vào `decorSpots.ts`).
  - Chuyển cảnh: camera kéo lên 0,6 giây. Khi bật giảm chuyển động thì chỉ mờ dần.
- **Thư mục và file mới:**
  - Cảnh: `src/features/sky-garden/` (dùng lại `farm-anim/engine` và các system `Sky`, `Cloud`, `Particle`,
    `Wind`).
  - Giao diện: `journey/SkyGarden.tsx`, `PotTray.tsx`, `PotSheet.tsx`, `MachinesSection.tsx`.
  - Demo: `/sky-garden-test` đăng ký ở `src/main.tsx` như `/farm-animation-test`.
- **Kho:** `StoragePanel` thêm tab "Trên mây" cho hạt mây, bọ, vật phẩm mở tầng. Sản phẩm mây và thành phẩm máy
  nằm chung `ingredients`, thêm giá vào bảng `sell` của luật (guard chỉ nhận nguyên liệu có giá bán).
- **Thăm bạn:** `FriendFarm.tsx` thêm tab "Vườn Mây" chỉ xem; G5 mới có bắt bọ giúp.
- **i18n:**
  - Namespace mới `src/i18n/messages/{vi,en}/sky.ts` cho giao diện.
  - Tên chậu, cây, bọ, máy vào `t.data`.
  - Lỗi server vào `server/lang/{vi,en}.php`.
- **Theo dõi** (tối thiểu, không dữ liệu cá nhân): tỉ lệ người cấp 12 lên mây, ngày mở từng tầng, số MIX đã
  nấu, tỉ lệ quay lại nông trại sau khi lên mây, số lần guard từ chối thao tác `sky`.

### 0.9 Mô hình dữ liệu chốt

Thay cho §6.1, gộp các field mà §15.3 yêu cầu:

```ts
interface SkyGarden {
  skySeed: string | null;                 // server cấp lúc mở tầng 1; client không đổi được
  floors: number;                         // 0 = chưa mở
  slotsBought: number[];                  // [tầng] -> 0..3
  slots: (string | null)[][];             // [tầng][ô 0..5] -> potUid
  pots: Record<string, SkyPot>;
  seeds: Partial<Record<SkyCropId, number>>;
  bugs: Partial<Record<BugId, number>>;
  items: Partial<Record<SkyItemId, number>>;    // cloudseed, dew, gem, clover
  machines: Partial<Record<MachineId, { slots: number; jobs: MachineJob[] }>>;
  tutorialClaimed: SkyTutorialStep[];
  setsClaimed: PotSetId[];
  xpDay: { day: string; xp: number };     // trần D6
  introSeen: boolean;
}
interface SkyPot {
  uid: string;          // `${potId}-${n}`, n tăng dần theo từng mẫu
  potId: PotId;
  tier: 0 | 1 | 2 | 3 | 4;
  stars: 0 | 1 | 2 | 3 | 4 | 5;  // chỉ server đổi (tài khoản)
  luck: number;                   // pity, chỉ server đổi (tài khoản)
  tries: number;                  // số lần thử ở mốc sao hiện tại
  cycles: number;                 // số lần đã trồng = cycleNo kế tiếp
  plant: SkyPlant | null;
}
interface SkyPlant {
  crop: SkyCropId | VegId;
  cycleNo: number;
  plantedAt: number; readyAt: number; wateredAt: number | null;
  statsAtPlant: { timeBp: number; xpBp: number; bugBp: number };
  stagesRolled: number;           // 0..3
  bug: BugId | null;
  slowed: boolean;                // đã bị bọ làm chậm trong chu kỳ này
}
interface MachineJob { jobId: string; recipe: RecipeId; startedAt: number; readyAt: number }
```

Tài nguyên ledger mới: `skyseed:<id>`, `bug:<id>`, `skyitem:<id>`, `pot:<potId>`. Sản phẩm dùng `ingredient:<id>`
có sẵn.

---

### 0.10 Tiêu chí nghiệm thu bổ sung (bắt buộc trước khi triển khai G2+)

**Phạm vi:** Các mục dưới đây là *cổng kiểm thử*, không khẳng định hệ thống hiện đã đạt. Áp dụng cùng §0.2–§0.9 và §16; khi xung đột, ưu tiên quy tắc bảo toàn tài sản/đồng bộ ở mục này. Mỗi ca kiểm thử lưu: mã ca, dữ liệu đầu vào, thao tác, kết quả mong đợi, kết quả thực tế, thiết bị/phiên bản, bằng chứng và người duyệt. Không tự đánh dấu PASS nếu chưa chạy.

#### 0.10.1 Tiến trình và kinh tế không kẹt (P0)

- **Tuyến hướng dẫn:** 1 Hạt Mây (thu đầu) + 1 (bắt bọ đầu) = 2; trả 2 để mở tầng 2 → số dư 0; thưởng mở tầng 2 +2 → số dư 2; hoàn thành MIX01 +2 → số dư 4; trả 4 mở tầng 3 → số dư 0. Sương Mai +1 từ nhài sấy đầu tiên và trả 1 khi mở tầng 3. Mỗi thưởng chỉ nhận một lần, dù bấm nhanh/reload/gửi lặp.
- Người chơi mới ở cấp mở khu, kho không có mật ong, vẫn hoàn thành MIX01 bằng đường hỗ trợ 1 mật ong quy định tại §0.4. Không yêu cầu bọ hiếm, bạn bè, quảng cáo, nạp tiền hoặc sự kiện.
- Viết test tự động cho thứ tự nhiệm vụ khác nhau, người chơi thu hoạch nhưng chưa bắt bọ, nhận thưởng rồi thoát, trồng lại, mua ô sớm và kho gần đầy. Nếu thiếu điều kiện, UI phải báo chính xác vật phẩm và nguồn kiếm.
- Không có công thức mở ở tầng T nhưng toàn bộ đầu vào chỉ xuất hiện từ tầng lớn hơn T; mọi máy mới mở có ít nhất một công thức làm được ngay.
- Mỗi giao dịch có bảng nguồn/đích tài nguyên, mức trần và đường kiếm lại. Mô phỏng 90 ngày với tối thiểu 3 kiểu chơi: 1 lần/ngày, 3 lần/ngày, 6 lần/ngày; chạy nhiều seed cố định, xuất báo cáo ngày mở tầng, tồn kho, số dư xu/XP và số lần kẹt. **PASS:** không âm kho/tiền, không nhân thưởng, không vòng chế biến mua-bán tạo lời vô hạn; các mốc tiến trình mục tiêu §0.3 phải được đo và nếu lệch phải điều chỉnh hoặc duyệt lại, không tự coi là đạt.

#### 0.10.2 State machine, đồng bộ và chống gian lận (P0)

- **Cây:** EMPTY → GROWING → READY → HARVESTED/EMPTY; BUG_PRESENT là trạng thái phụ, không được xuất hiện nếu không có cây hợp lệ. **Máy:** IDLE → RUNNING → READY → CLAIMED/IDLE. **Nâng sao:** IDLE → PENDING → RESOLVED hoặc REJECTED; client không tự quyết kết quả tài khoản đã đăng nhập.
- Mỗi thao tác ghi rõ precondition, thay đổi kho/xu/XP, thời điểm server, revision, idempotency key và lỗi có thể trả về. Gửi lại cùng `opId` phải nhận cùng kết quả; gửi cùng `opId` với payload khác phải bị từ chối.
- Với `PUT /account/progress` và endpoint nâng sao/thăng bậc: mô phỏng hai tab/hai thiết bị, thao tác đồng thời, phản hồi 409, mất mạng sau khi server đã commit nhưng trước khi client nhận, reload khi còn pending. **PASS:** không mất chậu/cây đã xác nhận, không nhân đôi vật phẩm, không ghi đè kết quả server bằng snapshot cũ; giao diện có thể tải lại bản chuẩn và thử lại thao tác hợp lệ.
- **RNG bọ:** không coi `skySeed` nằm trong bản lưu client là bí mật. Trước G2 phải chọn một trong hai cơ chế và ghi rõ vào §0.2: (A) server xác minh roll bằng HMAC với secret chỉ server giữ, không xuất secret; hoặc (B) server chốt/ghi nhận roll theo từng chu kỳ. Nếu vẫn dùng hash với seed client đọc được, phải chứng minh bằng test rằng người chơi không thể chọn/đổi kết quả có lợi qua reset, import, rollback, clone UID, chỉnh cycle hoặc gửi bản lưu giả; nếu không chứng minh được thì **BLOCK G2**.
- Kiểm thử sửa trực tiếp `stars`, `luck`, `readyAt`, `cycleNo`, `statsAtPlant`, `xpDay`, `items`, `jobs`, số lượt tưới và UID; thay đổi trái luật phải bị từ chối. Thời gian chín, trần XP/ngày, bọ và quota dùng mốc giờ server.
- Tài khoản khách → đăng nhập phải có màn xác nhận rõ tài sản nào giữ/mất theo Q5; test import lặp, hủy import, mất mạng và trùng UID. Không xóa tài sản khách trước khi server xác nhận nhập thành công.
- Mỗi API mới có bảng contract gồm endpoint, auth, request/response ví dụ, mã lỗi 400/401/403/409/422/429/500, rate limit, idempotency và rollback; test contract ở cả client và server. Không log secret, seed server hoặc dữ liệu nhạy cảm.

#### 0.10.3 Tiêu chí asset chậu và hình ảnh (P1; bắt buộc từ G0/G1)

- **Nguồn chuẩn:** một file riêng cho mỗi chậu; PNG RGBA thật, nền ngoài chậu alpha = 0; không có ô đen/trắng giả nền, chữ, watermark, vật thể lạ hoặc chi tiết chậu bên cạnh. Không dùng crop ô từ ảnh kệ tổng hợp làm asset chính nếu bị mất viền/quai/hoa.
- **Không cắt:** toàn bộ chậu, quai, lá, hoa và đế nằm trong khung, cách biên ít nhất 5% cạnh ngắn (trừ trường hợp được duyệt riêng). Vật thể chính chỉ gồm đúng một chậu; vùng đất trống nhìn thấy và không bị cây/trang trí che hết.
- **Độ phân giải:** nguồn ưu tiên ≥1024×1024 px, xuất WebP 256/512 px từ nguồn; file nguồn nhỏ hơn chuẩn phải được đánh dấu cần render lại, không upscale rồi ghi là ảnh gốc độ phân giải cao. Alpha không viền đen/trắng, không halo màu lạ trên nền sáng/tối.
- **Đồng nhất:** góc nhìn 3/4, tỷ lệ miệng/chiều cao, hướng ánh sáng, độ bóng men và độ dày viền vàng tương thích 4 chậu gốc; thử ghép ít nhất 6 chậu cạnh nhau trên nền mây thật.
- **Điểm neo:** `pots.json` có `potId`, `source`, `anchor {cx,cy,rx}`, `bounds`, `scale`, `assetVersion`; kiểm thử cây giai đoạn 0–3 cắm đúng giữa đất, không lơ lửng hoặc che quá mức miệng chậu.
- **Bằng chứng duyệt:** xuất contact sheet 20 chậu trên nền caro, nền trắng, nền tối và một preview 6 chậu/tầng mobile. Người duyệt xác nhận từng chậu PASS/REWORK; chỉ ảnh PASS mới đưa vào registry sản xuất. Xác minh giấy phép/quyền dùng trước phát hành.

#### 0.10.4 UX, mobile, accessibility và hiệu năng (P1)

- Test thực tế ít nhất các viewport 360×800, 390×844, 430×932 và desktop 1366×768; không tràn ngang, không che nút Xuống đất, kho, máy hoặc popup; 3 ô khóa và 3 ô mở ở tầng 1 hiển thị phân biệt rõ.
- Mỗi ô tương tác chính có vùng chạm ≥44×44 CSS px; bọ có hitbox riêng, chạm bọ không thu hoạch cây; có thao tác chạm để đặt/đổi chậu thay cho chỉ drag-and-drop.
- UI thể hiện trạng thái đang lưu/đã lưu/lỗi, thời gian còn lại, thiếu nguyên liệu, số lượt tưới, giới hạn XP, tỷ lệ nâng sao và hiệu ứng chậu. Không chỉ dùng màu để báo trạng thái; thông báo hỗ trợ vi/en.
- Tôn trọng `prefers-reduced-motion`, âm thanh mặc định không tự phát trái chính sách trình duyệt; dừng animation khi tab ẩn. Lỗi tải sprite có fallback và không làm mất quyền thao tác.
- **Ngân sách khởi điểm cần đo ở G1:** ≥30 FPS khi cuộn 3 tầng trên một thiết bị Android tầm trung ghi rõ model; thời gian từ chạm chuyển khu đến có thể thao tác ≤3 giây trên mạng 4G ổn định; ảnh không tải ngoài viewport nếu không cần. Ghi kết quả đo thực tế (thiết bị, mạng, thời gian, fps, dung lượng JS/asset) và điều chỉnh ngân sách nếu có lý do; không tuyên bố PASS bằng giả định.

#### 0.10.5 Cổng hoàn thành từng giai đoạn (Definition of Done)

| Giai đoạn | Bắt buộc để PASS | Bằng chứng |
|---|---|---|
| G0 | Q1–Q6 đã có quyết định; registry ID hợp lệ; nguồn/giấy phép ảnh rõ; 4 chậu gốc đạt tiêu chí; mockup 360/390/430 px; luồng Hạt Mây/Sương Mai đã kiểm thử | checklist ký duyệt, contact sheet, test tiến trình |
| G1 | Demo 3 tầng chạy không đụng bản lưu; chuyển cảnh, chậu, cây, bọ, máy và ngày/đêm xem được; fallback và reduced motion; đạt đo mobile §0.10.4 | video/ảnh chụp trên thiết bị thật, log FPS |
| G2 | Có ít nhất một vòng đất → mây → thu → MIX01 → sử dụng thành phẩm; guard chống sửa dữ liệu; xử lý 409/2 thiết bị; RNG đạt §0.10.2; không kẹt tầng 2–3 | test tự động client/server, video luồng, log từ chối gian lận |
| G3 | Nâng sao/thăng bậc idempotent, pity và trần chỉ số đúng; mô phỏng 90 ngày; cộng hưởng chọn đúng ưu tiên; bộ sưu tập và máy không nhân tài nguyên | test xác suất/biên, báo cáo mô phỏng |
| G4 | Máy/đơn có ledger truy vết, hoàn thành chỉ nhận một lần, bonus xu không cộng lặp; tầng 6–10 có nguồn tài nguyên hợp lệ | test giao dịch, báo cáo cân bằng |
| G5 | Hai tài khoản trên hai thiết bị thăm/tưới/bắt bọ đúng quota; dữ liệu công khai không lộ seed, ledger hay dữ liệu riêng | test API/quyền, video kiểm thử |
| G6 | Nội dung 36 chậu/15 cây qua kiểm tra asset và registry; nhiệm vụ/sự kiện có nguồn thưởng thay thế; không phá kinh tế cũ | contact sheet, kiểm thử hồi quy, mô phỏng |

**Điều kiện chung trước khi bật production:** `npm test`, `npm run check:motion`, kiểm tra i18n và xuất `game-rules.json` đều PASS; không có lỗi P0/P1 chưa xử lý; có kế hoạch sao lưu, rollback, feature flag tắt khẩn cấp, kiểm tra dữ liệu cũ và người duyệt ghi nhận. Nếu thiếu bằng chứng, trạng thái là **CHƯA KIỂM THỬ**, không phải PASS.

---

## 1. Khu Vườn Trên Mây (game gốc) chơi thế nào

Bảng dưới là tổng hợp tham khảo đã có trong tài liệu, kèm danh sách liên kết ở cuối file; **lượt bổ sung này không truy cập hoặc xác minh các nguồn web đó**. Không coi bảng là đặc tả chính thức cho mọi phiên bản ZingMe/ZingPlay/mobile. **Không** chép tên riêng, hình hay số liệu của họ (xem §11).

- **Mẫu hình tham khảo ở mức khái quát:** khu vườn trên tầng mây, trồng cây trong chậu, sưu tầm/nâng cấp chậu. Đây là định hướng tham khảo, không phải cam kết tương thích với game gốc.
- **Cần xác minh trước khi dẫn như sự thật:** số ô, tên/bậc chậu, công thức hiệu ứng, tỉ lệ nâng cấp/nhảy cấp, vai trò từng loại bọ, trộm/tưới, máy, phương tiện giao đơn và khác biệt phiên bản trong bảng. Khi xác minh, ghi nguồn, phiên bản, ngày truy cập và đoạn bằng chứng; liên kết đơn thuần chưa đủ.
- **Đề xuất riêng của dự án:** toàn bộ bảng cân bằng, tên vật phẩm, chậu món Việt, pity, quy tắc không trộm, kinh tế chung và lộ trình ở §3–§10, được làm rõ tại §12–§16. Không gán các con số này cho Zing/VNG.

| Hệ thống | Game gốc |
|---|---|
| Cốt truyện | Jack và cây đậu thần: hạt đậu dẫn lên các tầng mây đầy hoa và máy móc lạ |
| Tầng mây | Mở thêm khi đạt cấp, tốn vật phẩm riêng (lọ mây, bình nước thánh, ngọc) và vàng. Tầng càng cao càng tốn. Mỗi tầng có một hàng ô chậu (tài liệu ghi 6 hoặc 9 ô tùy phiên bản) |
| Chậu | Mở đầu bằng chậu đất nung. Lên cấp có chậu đồng, bạc, vàng, kim cương, hồng ngọc, saphia, lục bảo, thạch anh, chậu sự kiện (8/3, 14/2, mùa hè…). Mỗi chậu cộng **% thời gian chín, % vàng, % kinh nghiệm, % ra bọ** |
| Nâng cấp chậu | Tốn **sâu bọ** và vàng, có **tỉ lệ thành công**. Thất bại thì mất nguyên liệu. Đôi khi "nhảy vượt cấp" (đất lên thẳng kim cương). Có vật phẩm may mắn (cỏ may mắn) tăng tỉ lệ |
| Xếp chậu | Cộng thêm khi một tầng đủ **6 chậu giống nhau** hoặc **6 chậu khác nhau**. Người chơi bàn nhau "công thức xếp chậu" (3+3+3, 4 kim cương + 5 sự kiện…). Tầng cao cộng nhiều hơn |
| Cây | Trồng vào chậu, lớn theo thời gian thực, chín cho vàng và nông sản. Có cây hiếm (cây vàng, cây kim cương). Cây mới mở theo cấp hoặc mua ở shop |
| Sâu bọ | Bám ngẫu nhiên lên cây đang lớn. Chạm để bắt (có vợt vàng). Bọ vừa là phiền toái vừa là **nguyên liệu nâng chậu** |
| Máy móc | Mở theo cấp, biến nông sản thành hàng (máy sấy…). Máy nâng cấp thì giảm % thời gian, cộng % vàng/XP đơn |
| Đơn hàng | Đơn nhỏ do **cú** giao. Đơn lớn đi **khinh khí cầu**/xe chở hàng, có giới hạn giờ, thưởng lớn |
| Trang trí | Vật trang trí và **bộ chủ đề vườn** cộng chỉ số (vd. +20% vàng đơn, +20% XP đơn, giảm thời gian) |
| Buôn bán | Quầy hàng riêng: đặt món, số lượng, giá. **Bảng tin rao vặt** để mua của người khác. Có shop hệ thống |
| Bạn bè | Thăm vườn, giúp bắt bọ/tưới, trộm, nhiệm vụ của "mẹ Jack" |
| Sự kiện | Cây/chậu theo mùa, quà hằng ngày, giftcode |

**Điểm đáng học:** (1) chậu là món sưu tầm có chỉ số, nên người chơi muốn gom và xếp; (2) bọ biến việc
"canh vườn" thành nguyên liệu; (3) bài toán xếp chậu theo tầng; (4) chuỗi nông sản → máy → đơn hàng.

**Điểm không nên học:** nâng cấp thất bại mất trắng (gây ức chế, đẩy người chơi nạp tiền), và bảng tin buôn
bán giữa người chơi (dễ gian lận, cần kiểm duyệt). Xem cách xử lý ở §5.3 và §8.

---

## 2. Hiện trạng code liên quan

- Nông trại đang chạy: tranh 2D vẽ tay `src/features/farm-anim/` (Canvas 2D). `FarmScene` được
  `journey/FarmGame.tsx:91` mở lazy, và `journey/FriendFarm.tsx:20` dùng lại khi thăm vườn bạn. Lớp vẽ ô đất
  và cây nằm ở `farm-anim/systems/FarmGameLayer.ts` (`PlotView` :27-74). Bầu trời, mây, hạt bụi có sẵn:
  `SkySystem`, `CloudSystem`, `engine/ParticleSystem`, `engine/WindSystem`.
- Kinh tế: `GuestProgress` (`src/domain/progress.ts:75`), reducer (`src/domain/reducer.ts:327`), ledger tài
  nguyên `seed:*`, `ingredient:*`, `xp`, `stamp`, `coin`. Chỉ có **xu + XP**, chưa có tiền nạp cho nông trại.
- Số liệu: `src/data/game.ts`. Khoảng 56 cây, `PLOT_UNLOCK_LEVELS` (2 → 58), `LAND_PRICES` (30 → 6 200 xu),
  `LEVEL_CURVE` (100 + 20/cấp). Người chơi đều đặn kiếm khoảng 450 XP/ngày, lên cấp 22 sau khoảng 2 tuần.
  Trang trí `DECOR` 25-220 xu (chỉ để ngắm). `UPGRADES` cho giếng, kho, tổ ong, thuyền.
- Hệ thống có thể dùng lại: đơn hàng `domain/orders.ts`, nhiệm vụ `domain/quests.ts`, bộ sưu tập
  (`game.ts:986`), sự kiện mùa (`EVENTS` :1169), bạn bè (`FriendEvent`, `/account/friends/CODE/...`).
- Chống gian lận: `server/lib/ProgressGuard.php` chạy lại ledger theo `server/data/game-rules.json`. File JSON
  này xuất từ `src/domain/gameRules.ts` bằng `scripts/export-game-rules.mjs`. **Mọi luật kinh tế mới phải
  vào gameRules, rồi xuất lại JSON, rồi sửa guard.**
- Lưu trữ: `parseProgress` (`domain/persistence.ts:219`). Quy ước của dự án: **thêm field bằng giá trị mặc
  định, không tăng `SCHEMA_VERSION`** (đang là 2).
- Sprite vật phẩm: `public/images/farm-items/*.webp`, tra qua `src/data/sprites.ts`.
- i18n: `t.data.*` cho tên vật phẩm, `t.journey.*` cho UI. File `vi` là gốc; `i18n.test.ts` bắt `en` phải đủ
  khóa như `vi`.
- Đã có `plans/khu-vuon-3d.md` (đảo 3D "trên mây", bản `garden3d` đã bỏ). Plan này **không** quay lại 3D. Vườn
  Mây là 2D, cùng phong cách tranh vẽ tay.

---

## 3. Ý tưởng cốt lõi

> **Dưới đất trồng để nấu. Trên mây trồng để sưu tầm và chế biến.**

- **Nông trại (dưới đất):** giữ nguyên. Lúa, rau, cây ăn trái, nấm, tưới, trộm, chợ, nấu món.
- **Vườn Mây (trên trời):** leo **cây đậu thần** mọc từ đảo lên. Mỗi **tầng mây** là một kệ mây có **6 ô
  chậu**. Đặt chậu sưu tầm vào ô, trồng **cây trên mây** (hoa, trà, cà phê, cây cảnh, cây gia vị quý) vào
  chậu. Chậu cộng chỉ số. Cây đang lớn thì **bọ** bay tới đậu. Bắt bọ để **nâng sao chậu**. Sản phẩm trên mây
  đi qua **máy** thành đồ uống, mứt, chè, rồi giao **đơn khinh khí cầu** hoặc dùng làm nguyên liệu quý cho
  công thức nấu dưới đất.
- **Chậu là "món ăn Việt" bằng sứ và ngọc** (theo moodboard `5.png`), hợp thương hiệu "Ăn gì?". Mỗi chậu
  thuộc một **Bộ**. Sưu tầm đủ bộ thì có thưởng, xếp đủ bộ trên một tầng thì có hiệu ứng.

Vòng lặp:

```
Nông trại ──nông sản──▶ chợ / nấu món ──xu, XP──▶ mua chậu, hạt mây, mở tầng
    ▲                                                     │
    │ nguyên liệu quý (trà, hạt sen, mật hoa…)            ▼
    └──────────── Máy ◀── sản phẩm ── Vườn Mây (chậu + cây + bọ)
                    │
                    └──▶ Đơn khinh khí cầu ──▶ xu, XP, Mây Ngọc (mở tầng)
```

---

## 4. Nội dung (vật phẩm)

### 4.1 Tầng mây

- 10 tầng. Mở theo cấp người chơi, và mỗi tầng tốn xu cùng **vật phẩm mở tầng**.
- Mỗi tầng có 6 ô. Ô 1-3 mở ngay khi có tầng, ô 4-6 mở bằng xu (rẻ). Bằng cách này người chơi luôn có việc
  tiêu xu giữa hai lần mở tầng.
- **Hệ số tầng:** chỉ số chậu đặt ở tầng _n_ được nhân (1 + 0,03 × (n − 1)), tức tầng 10 là ×1,27. Ý này giữ từ
  game gốc ("tầng cao thì % cao hơn"), cho người chơi lý do sắp xếp lại chậu.

| Tầng | Cấp mở | Xu | Hạt Mây | Sương Mai | Ghi chú |
|---|---|---|---|---|---|
| 1 | 12 | 0 | 0 | 0 | Tặng 3 chậu đất nung + 3 hạt nhài |
| 2 | 15 | 400 | 2 | 0 | |
| 3 | 19 | 900 | 4 | 1 | Mở máy thứ 2 |
| 4 | 24 | 1 600 | 6 | 2 | |
| 5 | 29 | 2 500 | 8 | 3 | Mở khinh khí cầu |
| 6 | 35 | 3 600 | 10 | 4 | |
| 7 | 41 | 5 000 | 12 | 6 | |
| 8 | 47 | 6 500 | 15 | 8 | |
| 9 | 54 | 8 500 | 18 | 10 | |
| 10 | 60 | 11 000 | 22 | 12 | Cổng "Cung Mây" (trang trí đỉnh) |

Cấp 12 (khoảng ngày 4-5 với người chơi đều) là lúc ô đất dưới nông trại đã mở được nửa, đúng lúc cần mục
tiêu mới. Bảng trên là số khởi điểm. Chạy mô phỏng ở P3 rồi chỉnh lại. **→ §0.4:** giá ô, nguồn Hạt Mây và
Sương Mai cho tầng 1–3 đã chốt ở đó.

**Vật phẩm mở tầng** (tên riêng của mình, không dùng "lọ mây"/"nước thánh"):

| Id | Tên | Lấy từ đâu |
|---|---|---|
| `sky:seed` | Hạt Mây | Đơn khinh khí cầu, rương chuỗi ngày, bọ hiếm đổi |
| `sky:dew` | Bình Sương Mai | Máy chưng sương (từ tầng 3), nhiệm vụ tuần |
| `sky:gem` | Mây Ngọc | Thưởng sự kiện, đủ bộ sưu tập. Dùng mở ô đặc biệt và đổi chậu hiếm |

### 4.2 Chậu

**Độ hiếm** quyết định chỉ số gốc và hiệu ứng vẽ. Không cần art riêng cho từng bậc: viền sáng và hạt lấp lánh
do `ParticleSystem` vẽ.

| Bậc | Màu khung | Ô chỉ số | Hiệu ứng vẽ |
|---|---|---|---|
| Đất nung | nâu | 1 | không |
| Sứ | xanh lam | 1 | bóng sứ |
| Ngọc | xanh ngọc | 2 | lấp lánh nhẹ |
| Hoàng kim | vàng | 2 | lấp lánh + quầng |
| Huyền thoại | cầu vồng | 3 | quầng + hạt bay + đổi màu chậm |

**Chỉ số** có 4 loại, gộp theo tầng và có trần:

| Chỉ số | Ý nghĩa | Trần tổng |
|---|---|---|
| `time` | Giảm % thời gian chín của cây trong chậu | 50% |
| `coin` | Cộng % xu khi bán hoặc giao sản phẩm của cây đó (**→ §0.1 D5:** tắt đến G4) | 100% |
| `xp` | Cộng % XP khi thu hoạch | 100% |
| `bug` | Cộng % tỉ lệ bọ xuất hiện | 60% |

**Danh mục chậu**, 6 bộ × 6 chậu = 36 chậu ở bản đầu. 6 chậu một bộ khớp với 6 ô một tầng.

| Bộ | Chậu | Bậc gốc | Nguồn art |
|---|---|---|---|
| **Đất nung** (khởi đầu) | trơn, sọc, hoa văn trống đồng, men rạn, quai mây, chân cao | Đất nung | vẽ mới, đơn giản |
| **Nông Sản** | **Bí Ngô**, **Bắp**, **Bắp Cải**, **Cà Tím**, Dưa Hấu, Thanh Long | Ngọc | **4 file đã có** + 2 vẽ thêm |
| **Bàn Ăn Việt** | Bát Phở Gà Trống, Ổ Bánh Mì, Bánh Chưng, Phin Cà Phê, Ấm Trà Sen, Chén Chè | Hoàng kim | theo `5.png` |
| **Chợ Quê** | Giỏ Tre, Nón Lá, Gánh Hàng, Thúng Gạo, Chum Tương, Mẹt Bánh | Sứ | theo `5.png` |
| **Biển Miền Trung** | Trái Dừa, Cua Đỏ, Cá Sứ Xanh, Vỏ Sò, Mực Nang, Thuyền Thúng | Ngọc | theo `5.png` + vẽ thêm |
| **Lễ Tết** (sự kiện) | Bánh Trung Thu, Đèn Ông Sao, Đèn Lồng, Lì Xì, Mái Đình, Mèo Thần Tài | Huyền thoại | theo `5.png`, phát theo `EVENTS` |

Chỉ số gốc theo bộ (trước sao và hệ số tầng):

- **Đất nung:** `time` 2%.
- **Nông Sản:** `time` 6%, `xp` 6%. Cây đất (rau, củ) trồng trong chậu Nông Sản thì `time` ×2. Đây là chỗ nối
  hai khu (§4.3).
- **Bàn Ăn Việt:** `coin` 10%, `xp` 6%.
- **Chợ Quê:** `coin` 8%.
- **Biển Miền Trung:** `bug` 12%, `time` 4%.
- **Lễ Tết:** `coin` 10%, `xp` 10%, `time` 8%.

Mỗi chậu trong bộ lệch nhẹ (±2%) để chậu nào cũng có cá tính. Bảng đủ 36 chậu sẽ nằm trong
`src/data/skyGarden.ts`.

### 4.3 Cây trên mây

Cây riêng của Vườn Mây, mở dần theo tầng. Chu kỳ dài hơn rau dưới đất và sản phẩm có giá trị cao hơn.

| Id | Cây | Mở | Thời gian | Sản phẩm | Dùng cho |
|---|---|---|---|---|---|
| `jasmine` | Hoa nhài | T1 | 45 ph | Nụ nhài | Trà nhài, đơn |
| `mint` | Bạc hà | T1 | 30 ph | Lá bạc hà | Nước tắc bạc hà, công thức dưới đất |
| `kumquat` | Cây tắc | T1 | 2 g | Trái tắc | Nước tắc, mứt |
| `lotus` | Sen | T2 | 3 g | Hạt sen + hoa sen | Chè hạt sen, trà sen |
| `strawberry` | Dâu tây Đà Lạt | T2 | 2 g 30 | Dâu | Mứt dâu |
| `tea` | Cây trà | T3 | 4 g | Lá trà | Trà sen, trà nhài |
| `coffee` | Cà phê | T3 | 6 g | Hạt cà phê | Cà phê phin |
| `chrysanthemum` | Cúc vàng | T4 | 3 g | Hoa cúc | Trà cúc, trang trí Tết |
| `pepper` | Tiêu | T4 | 5 g | Hạt tiêu | Gia vị quý cho công thức dưới đất |
| `orchid` | Lan hồ điệp | T5 | 8 g | Cành lan | Đơn khinh khí cầu (giá cao) |
| `peach` | Đào Nhật Tân | T6 | 10 g | Cành đào | Đơn Tết |
| `apricot` | Mai vàng | T6 | 10 g | Cành mai | Đơn Tết |
| `vanilla` | Va-ni | T7 | 12 g | Quả va-ni | Bánh flan, kem (công thức mới) |
| `saffron` | Nghệ tây | T8 | 16 g | Nhụy | Gia vị huyền thoại |
| `beanstalk` | Đậu thần | T10 | 24 g | Hạt Mây ×1 | Mở tầng / đổi chậu |

Cây có **4 giai đoạn** giống dưới đất (mầm → non → ra hoa → chín). Sprite cắm vào miệng chậu theo điểm neo
(§7.2).

**Trồng cây đất trong chậu:** cho phép trồng rau dưới đất (`veg`) vào chậu. Thời gian theo cây gốc, có cộng
chỉ số chậu. Người chơi mới lên mây vẫn trồng được thứ quen thuộc, và chậu Nông Sản có lý do để tồn tại.

### 4.4 Bọ

Bọ đậu ngẫu nhiên lên cây **đang lớn**, mỗi chậu tối đa 1 con. Không bắt thì bọ **chỉ làm chậm** cây đó
(+10% thời gian còn lại, tối đa 1 lần), **không bao giờ làm chết cây** (quy ước nông trại: cây không héo).
Chạm để bắt. Bạn bè cũng bắt giúp được.

| Id | Bọ | Độ hiếm | Tỉ lệ gốc mỗi lần lớn | Dùng |
|---|---|---|---|---|
| `ladybug` | Bọ rùa | thường | 30% | nâng sao 1-2 |
| `bee` | Ong mật | thường | 25% | nâng sao 1-3. Ngoài ra +1 mật cho tổ ong dưới đất |
| `caterpillar` | Sâu xanh | thường | 25% | nâng sao 1-2 |
| `butterfly` | Bướm vàng | hiếm | 12% | nâng sao 3-4 |
| `dragonfly` | Chuồn chuồn ngô | hiếm | 8% | nâng sao 3-5 |
| `firefly` | Đom đóm | quý (chỉ 18h-6h) | 4% | nâng sao 5, đổi Hạt Mây |
| `goldbeetle` | Bọ hung vàng | huyền thoại | 1% | thăng bậc chậu |

"Mỗi lần lớn" nghĩa là mỗi khi cây sang giai đoạn mới, tung một lần có bọ hay không (cộng `bug` của chậu),
rồi tung tiếp loại bọ theo trọng số. Một cây có tối đa 3 lần. Đom đóm chỉ ra ban đêm theo giờ máy, tạo lý do
ghé vườn buổi tối.

### 4.5 Máy (chế biến)

Tái dùng mẫu "bắt đầu → chờ → thu" của tổ ong và thuyền (`START/COLLECT_HIVE`). Mỗi máy có 1 hàng chờ, nâng
cấp thêm 1-2 ô.

**→ §0.4:** bảng dưới là bản đầu. Lò sao trà ở đây cần lá trà (tầng 3) nên tầng 1 không làm được gì. §0.4 đổi
thành "Bếp trà" với nhài sấy, MIX01, MIX02, và chốt giá, thời gian, XP.

| Máy | Mở | Công thức (ví dụ) |
|---|---|---|
| Lò sao trà | T1 | 3 nụ nhài + 1 lá trà → Trà nhài (40 ph). 2 hoa sen + 2 lá trà → Trà sen (1 g) |
| Nồi chè | T2 | 4 hạt sen + 1 mật ong (tổ ong dưới đất) → Chè hạt sen. 4 dâu → Mứt dâu |
| Phin cà phê | T3 | 3 hạt cà phê → Cà phê phin. 2 trái tắc + 2 bạc hà → Nước tắc bạc hà |
| Máy chưng sương | T3 | 3 hoa (bất kỳ) → 1 Bình Sương Mai (8 g, 2 lần/ngày) |
| Hộp quà Tết | T6 | 1 đào + 1 mai + 2 mứt → Giỏ Tết (đơn giá cao, chỉ mùa Tết) |

Sản phẩm máy vào kho chung `ingredients` với khóa `sky:*`. Một số công thức nấu dưới đất (`RecipesSection`)
được thêm **nguyên liệu tùy chọn** từ mây (vd. phở + hạt tiêu = "Phở thượng hạng", +XP). Nhờ vậy hai khu ăn
vào nhau mà không bắt người chơi phải lên mây mới nấu được.

### 4.6 Đơn hàng

- **Cú đưa thư (đơn nhỏ):** dùng lại `domain/orders.ts`, thêm nguồn hàng `sky:*` khi người chơi đã có Vườn
  Mây. 2-3 đơn/ngày.
- **Khinh khí cầu (đơn lớn, từ tầng 5):** mỗi chuyến cần 6-9 thùng hàng, hạn 24 giờ. Đóng đủ thì thưởng xu,
  XP, Hạt Mây (và Mây Ngọc khi đóng đủ 7 ngày liên tiếp). Mỗi thùng đóng xong cộng XP ngay. Không đóng kịp
  thì khinh khí cầu bay đi, không phạt, chỉ mất thưởng chuyến.

### 4.7 Trang trí mây

Thêm vào `DECOR` một nhóm `sky` (cầu vồng, cột mây, xích đu, đèn lồng mây, chim hạc giấy…). Đặt ở **hai bên
mép tầng**, không chiếm ô chậu. Giữ quy ước hiện tại: **trang trí chỉ để ngắm**. Chỉ số chỉ đến từ chậu, máy
và bộ, để bài toán cân bằng gọn.

---

## 5. Lối chơi chi tiết

### 5.1 Vào Vườn Mây

- Từ cấp 10, một **mầm đậu thần** mọc ở góc đảo (sprite mới, cạnh giếng). Chạm vào thì có hội thoại ngắn
  "đậu đang lớn, cấp 12 leo được".
- Lên cấp 12: cây đậu vươn lên mây (hoạt cảnh 2-3 giây). Màn hình cuộn lên, mây tách ra, lộ tầng 1. Cảnh này
  chỉ chạy lần đầu. Các lần sau có nút **"Lên mây ☁"** trong `FarmGame` và chuyển cảnh nhanh (0,6 giây). Tôn
  trọng `prefers-reduced-motion`: chỉ đổi cảnh mờ dần.
- Trong Vườn Mây, các tầng xếp **dọc**, cuộn lên xuống (hợp màn hình điện thoại dọc, giống bố cục `5.png`). Có
  nút "Xuống đất". Thanh trên cùng giữ xu, XP, cấp như nông trại.

### 5.2 Vòng chơi một tầng

1. **Đặt chậu:** kéo chậu từ khay "Chậu của tôi" vào ô trống. Chạm chậu đang đặt để xem chỉ số, đổi chỗ (kéo
   sang ô khác hoặc tầng khác), hoặc cất về kho (cây đang trồng phải thu hoặc bỏ trước).
2. **Trồng:** kéo hạt mây (hoặc hạt rau) vào chậu. Dùng lại `seedDrag` / `SeedTray`.
3. **Tưới:** dùng chung 3 lượt tưới/ngày của giếng (`WATERING`). Không thêm lượt riêng, để người chơi phải
   chọn tưới dưới đất hay trên mây. (Luật đầy đủ: **→ §0.5**.)
4. **Bọ:** bọ bay tới (hoạt cảnh), đậu trên cây, có chấm "!" nhẹ. Chạm thì bọ vào túi bọ, có hiệu ứng vợt.
5. **Thu hoạch:** chạm cây chín, hoặc "Thu cả tầng". Sản phẩm bay vào kho, cộng xu (nếu là hoa cảnh bán ngay)
   hoặc vào `ingredients`.

### 5.3 Nâng sao và thăng bậc chậu

Mỗi chậu có **0-5 sao**. Mỗi sao cộng +20% chỉ số gốc, nên 5 sao là ×2.

| Lên sao | Bọ cần | Xu | Tỉ lệ gốc |
|---|---|---|---|
| ☆ → ★1 | 3 bọ thường | 50 | 100% |
| ★1 → ★2 | 5 bọ thường | 120 | 85% |
| ★2 → ★3 | 6 thường + 1 hiếm | 300 | 70% |
| ★3 → ★4 | 8 thường + 2 hiếm | 700 | 55% |
| ★4 → ★5 | 10 thường + 3 hiếm + 1 đom đóm | 1 500 | 40% |

**Thất bại nhẹ tay hơn game gốc:**

- Thất bại **chỉ mất một nửa số bọ, xu được hoàn lại**.
- Mỗi lần thất bại cộng **+10% "may mắn"** cho lần sau với chậu đó (dồn tới khi thành công). Đảm bảo lên sao
  bằng pity cứng: lần thử thứ 5 ở cùng mốc sao chắc chắn thành công, bất kể tổng tỉ lệ trước đó. Cộng +10 điểm phần trăm đơn thuần chưa bảo đảm mốc này.
- **Cỏ bốn lá** (vật phẩm, lấy từ nhiệm vụ/bạn tặng) cộng +15%.
- **Nhảy sao may mắn:** khi thành công có 5% được +2 sao.

**Thăng bậc** (bản sắc của game gốc): chậu ★5 cộng 1 **bọ hung vàng** cộng một chậu ★0 cùng bộ thì lên bậc
kế tiếp (Đất nung → Sứ → …), về ★0 với chỉ số gốc cao hơn. Luôn thành công, đổi lấy chi phí cao. Người chơi
không mất hết công sức vì xui.

### 5.4 Xếp chậu theo tầng (hiệu ứng bộ)

Tính theo **từng tầng**, cộng thêm vào mọi chậu của tầng đó:

| Điều kiện trên một tầng | Hiệu ứng | Tên gọi |
|---|---|---|
| 6 chậu cùng **bộ** | +15% chỉ số chính của bộ | "Đủ bộ" |
| 6 chậu thuộc 6 **bộ khác nhau** | +8% cả 4 chỉ số | "Bách hóa" |
| 3 cặp, mỗi cặp 2 chậu cùng bộ | +6% xu, +6% XP | "Ba đôi" |
| 6 chậu cùng **bậc** Hoàng kim trở lên | +10% `time` | "Dát vàng" |

Một tầng chỉ áp hiệu ứng mạnh nhất (**→ §0.6:** đổi thành thứ tự ưu tiên cố định, tính bằng bp). Tầng nào đang có hiệu ứng thì hiện dải ruy băng trên mép tầng. Thêm màn
"Gợi ý xếp" chỉ cách đạt hiệu ứng từ số chậu đang có (người chơi game gốc phải tự lập "công thức", ở đây
game gợi ý luôn).

### 5.5 Sưu tầm

- Trang **Bộ sưu tập chậu** (dùng lại `Collections`): bóng đen chỉ chậu chưa có, kèm gợi ý nguồn.
- Đủ một bộ (6 chậu, bất kể sao) thì thưởng 1 lần: Mây Ngọc + danh hiệu + khung ảnh đại diện. Đủ bộ ★5 thì
  có thêm chậu "Ánh Kim" (bản huyền thoại của một chậu trong bộ).

### 5.6 Kiếm chậu từ đâu

| Nguồn | Chậu |
|---|---|
| Cửa hàng Vườn Mây (xu) | Đất nung, Sứ (Chợ Quê). Mở theo tầng |
| Cửa hàng (Mây Ngọc) | Nông Sản, Biển Miền Trung |
| Khinh khí cầu | Mảnh chậu ngẫu nhiên: 10 mảnh thành 1 chậu Bàn Ăn Việt |
| Sự kiện mùa (`EVENTS`) | Bộ Lễ Tết, mỗi sự kiện 1-2 chậu |
| Mốc cấp, chuỗi ngày, thành tựu | Chậu tặng cố định |
| Bạn bè | Không trao đổi chậu (tránh tài khoản phụ nuôi tài khoản chính) |

### 5.7 Bạn bè trên mây

- Nút "Vườn Mây" khi thăm bạn. Dùng lại `/account/friends/CODE/garden`, thêm trường `sky` vào bản tóm tắt
  vườn công khai.
- **Bắt bọ giúp:** bạn bắt bọ trên vườn mình thì **cả hai** cùng được 1 con (bạn nhận bản sao). Tối đa 5
  lần/ngày cho mỗi người đi giúp.
- **Tưới giúp:** như dưới đất (đã có `water`).
- **Không trộm trên mây.** Vườn mây là chỗ khoe chậu. Trộm đã có ở nông trại.
- **Bảng xếp hạng bạn bè** theo "Điểm vườn" = tổng (bậc × sao) của các chậu đang đặt.

**→ §0.3 G5:** bắt bọ giúp chỉ cho bọ thường, có quota hai phía theo §13.2. Điểm vườn dùng công thức của §12.2,
vì `bậc × sao` cho mọi chậu ★0 điểm 0.

### 5.8 Nhiệm vụ và thành tựu mới

Thêm vào `quests.ts`, tách từng mục để ship độc lập:

- Ngày: bắt 5 bọ, thu 3 cây mây, chạy máy 2 lần, đóng 1 thùng khinh khí cầu.
- Tuần: nâng sao 3 lần, đóng xong 2 chuyến khinh khí cầu, giúp bạn bắt 10 bọ.
- Thành tựu: mở tầng 3/5/10, có chậu ★5 đầu tiên, đủ bộ đầu tiên, bắt bọ hung vàng, 100 đom đóm.

---

## 6. Dữ liệu và luật

### 6.1 `GuestProgress`: thêm nhánh `sky` (mặc định rỗng, không tăng `SCHEMA_VERSION`)

**→ §0.9:** bản chốt có thêm `skySeed`, `cycles`/`cycleNo`, `statsAtPlant`, `slowed`, `items`, `xpDay`, job máy.

```ts
interface SkyGarden {
  floors: number;                              // 0 = chưa mở
  slotsBought: number[];                       // số ô đã mua thêm ở mỗi tầng (0..3)
  slots: (string | null)[][];                  // [tầng][ô] -> potUid
  pots: Record<string, SkyPot>;                // uid -> chậu
  bugs: Partial<Record<BugId, number>>;
  machines: Partial<Record<MachineId, MachineState>>;
  balloon: BalloonState | null;
  collectionsClaimed: PotSetId[];
  introSeen: boolean;
}
interface SkyPot {
  uid: string;          // sinh tất định: `${potId}-${n}`
  potId: PotId;         // 'pumpkin' | 'corn' | ...
  tier: PotTier;        // 0..4
  stars: number;        // 0..5
  luck: number;         // % may mắn dồn từ thất bại
  plant: SkyPlant | null;
}
interface SkyPlant {
  crop: SkyCropId | VegId;
  plantedAt: number; readyAt: number; wateredAt?: number;
  rolls: number;        // số lần đã tung bọ (0..3)
  bug: BugId | null;    // bọ đang đậu
}
```

Bọ, vật phẩm mở tầng, sản phẩm mây đi qua **ledger**. Tiền tố tài nguyên mới: `bug:*`, `sky:*` (Hạt Mây,
Sương Mai, Mây Ngọc, sản phẩm mây), `pot:*` (mua/nhận chậu). Kho hiển thị chung trong `StoragePanel` với tab
"Trên mây".

### 6.2 Action mới cho reducer

`SKY_UNLOCK_FLOOR`, `SKY_BUY_SLOT`, `SKY_BUY_POT`, `SKY_PLACE_POT`, `SKY_MOVE_POT`, `SKY_STORE_POT`,
`SKY_PLANT`, `SKY_WATER`, `SKY_BUG_ROLL` (lúc cây sang giai đoạn), `SKY_CATCH_BUG`, `SKY_HARVEST`,
`SKY_HARVEST_FLOOR`, `SKY_STAR_UP`, `SKY_TIER_UP`, `SKY_MACHINE_START`, `SKY_MACHINE_COLLECT`,
`SKY_BALLOON_PACK`, `SKY_BALLOON_CLAIM`, `SKY_CLAIM_SET`.

### 6.3 Ngẫu nhiên và chống gian lận (quan trọng nhất)

Game gốc có hai chỗ may rủi: **bọ xuất hiện** và **nâng sao**. Nếu client tự tung xúc xắc thì sửa
localStorage là có chậu ★5. Cách xử lý (**→ §0.2:** công thức bọ đổi `plantedAt` thành `cycleNo` để không quay
lại được kết quả bằng cách đổi giờ trồng; nâng sao có `opId` chống gửi lặp):

- **Bọ:** tung **tất định** bằng `hash(userSeed, potUid, plantedAt, rollIndex)`. `ProgressGuard` tính lại được
  y hệt khi replay ledger nên không cần gọi server. Người chơi đoán trước được thì cũng chỉ biết "cây này sẽ có
  bọ", vô hại.
- **Nâng sao:** gọi **server tung** (`POST /account/sky/star-up`). Server kiểm tra nguyên liệu trong bản lưu
  đã xác minh, tung bằng `random_int`, ghi `progress_events`, trả kết quả. Client chỉ phát hoạt cảnh. Nếu
  tung tất định thì người chơi đoán được lần nào thành công rồi chỉ bấm lúc đó, làm hỏng tỉ lệ.
  - **Khách chưa đăng nhập:** vẫn được nâng sao nhưng bằng tung tất định có pity. Chậu ★3 trở lên của tài
    khoản khách bị đánh dấu "chưa xác minh" và không lên bảng xếp hạng, như cách xử lý khách hiện tại.
- Mọi giá, tỉ lệ, trần chỉ số nằm trong `src/data/skyGarden.ts`. `gameRules.ts` xuất chúng sang
  `game-rules.json`, và `ProgressGuard.php` thêm luật cho từng action ở §6.2 (thời gian chín tối thiểu sau khi
  trừ % chậu, trần tổng, số bọ, nguyên liệu máy). Tăng `GAME_RULES_VERSION` lên 2.
- Viết thêm test vào `kiem-toan-gian-lan-game.md`: sửa `stars`, sửa `readyAt`, nhân bản `potUid`, bắt bọ
  không tồn tại, bắt giúp bạn quá 5 lần.

### 6.4 Server

- `POST /account/sky/star-up`, `POST /account/sky/tier-up` (tier-up không ngẫu nhiên nhưng nên khóa server
  cho chắc).
- (**→ §0.2 bước 7:** bỏ cột mới; `Friends.php` đọc thẳng `user_progress.data.sky` như cách đang đọc ô đất.)
  Tóm tắt vườn công khai (`garden_profiles`): thêm `sky_summary` JSON (tầng, chậu đang đặt, sao, bọ đang
  đậu) để bạn bè xem và bắt bọ giúp. Thêm route `/account/friends/CODE/catch`.
- `farm_events` thêm loại `sky_catch` để báo "X đã bắt giúp bạn 1 bọ rùa".
- Chuỗi server mới vào `server/lang/{vi,en}.php`.

---

## 7. Art và hoạt cảnh

### 7.1 Xử lý 4 chậu đã có

Script mới `scripts/sky-garden/prepare-pots.mjs` (sharp, chạy được nhiều lần):

1. Cắt khoảng trong suốt thừa (`trim`), đệm đều về khung vuông.
2. Xuất `public/images/sky-garden/pots/<potId>@1x.webp` (256 px) và `@2x.webp` (512 px), chất lượng 88. Mỗi
   chậu khoảng 30-60 KB.
3. Tự dò **elip miệng chậu** (vùng đất nâu sẫm ở nửa trên) để ghi điểm neo `{ cx, cy, rx }` vào
   `public/images/sky-garden/pots.json`. Có thể chỉnh tay đè lên.
4. Xuất thêm bóng đen `<potId>-silhouette.webp` cho bộ sưu tập.

Ảnh gốc giữ ở `assets/sky-garden/pots/` (cùng chỗ với `assets/farm/pack-v4`).

### 7.2 Cây trong chậu

- Sprite cây mây 4 giai đoạn, nền trong suốt, **gốc cây nằm ở đáy ảnh**. Khi vẽ, đặt đáy ảnh vào `(cx, cy)`
  của chậu, co theo `rx`. Phần đất trong chậu luôn nằm dưới gốc cây nên không lộ khe.
- Cây đất trồng trong chậu dùng lại `cropSprite(crop, stage)` từ `src/data/sprites.ts`.
- Lắc theo gió: dùng `WindSystem` như cây dưới đất. Chậu đứng yên, chỉ lá và hoa lắc.

### 7.3 Cảnh tầng mây

- Nền: dùng lại `SkySystem` + `CloudSystem`, thêm lớp **kệ mây** cho mỗi tầng (một dải mây dày có mép gỗ
  hoặc dây leo, cảm hứng từ kệ gỗ trong `5.png`). Cần 1 sprite kệ dùng lặp, 2 sprite mép trái/phải, 1 sprite
  thân đậu thần chạy dọc.
- Mỗi tầng cao khoảng 38% chiều cao màn hình điện thoại, nên thấy được gần 3 tầng một lúc. (**→ §0.7:** bố cục
  theo ảnh mẫu `6.png`, kích thước theo bề ngang màn hình và danh sách lớp art đã chốt ở đó.)
- Bầu trời đổi theo độ cao: tầng thấp xanh nhạt, tầng cao ửng hồng và vàng, tầng 10 có sao.
- Đêm (18h-6h): bầu trời tối, đom đóm phát sáng, đèn lồng mây sáng.

### 7.4 Danh sách art cần vẽ (ưu tiên)

| Ưu tiên | Hạng mục | Số lượng |
|---|---|---|
| P1 | Kệ mây (giữa + 2 mép), thân đậu thần, mầm đậu trên đảo | 4-5 |
| P1 | Cây mây 4 giai đoạn × 5 cây đầu (nhài, bạc hà, tắc, sen, dâu) | 20 |
| P1 | Bọ: 7 loại, mỗi loại 2 khung (đập cánh) | 14 |
| P2 | Bộ Đất nung (6 chậu đơn giản) | 6 |
| P2 | 2 chậu thiếu của bộ Nông Sản (Dưa Hấu, Thanh Long) | 2 |
| P3 | Máy: lò sao trà, nồi chè, phin, máy chưng sương | 4 |
| P3 | Khinh khí cầu, thùng hàng, cú | 3 |
| P4 | Bộ Bàn Ăn Việt, Chợ Quê, Biển Miền Trung (cắt từ phong cách `5.png`) | 18 |
| P5 | Bộ Lễ Tết, trang trí mây | 6 + 6 |
| P5 | 10 cây mây còn lại × 4 giai đoạn | 40 |

Prompt AI cho từng file sẽ viết ở `prompts/sky-garden-prompts.md`, theo cách đã làm với
`prompts/garden-sprite-prompts.md`. Phong cách chung: chậu men bóng, viền vàng, hoa trắng, lấp lánh, phối cảnh
3/4 từ trên xuống khoảng 20°, nền trong suốt, miệng đất lộ rõ (khớp 4 chậu đã có).

### 7.5 Hiệu ứng

Theo quy ước hiện có: không dùng SVG animation (`npm run check:motion`), chỉ Canvas và CSS transform/opacity.

- Đặt chậu: chậu rơi nhẹ, nảy, bụi mây tỏa.
- Bọ bay tới theo đường cong, đậu, đập cánh. Bắt: vợt quét, bọ thu nhỏ bay vào túi.
- Nâng sao: chậu rung, ánh sáng dồn, sao bay vào (thành công) hoặc khói nhẹ và thanh "may mắn +10%" (thất
  bại). Không dùng màn hình đỏ hay âm thanh buồn.
- Hiệu ứng bộ: ruy băng chạy dọc mép tầng, hạt sáng theo màu bộ.

---

## 8. Kinh tế: cân bằng và kiếm tiền

- **Nguồn xu mới:** hoa cảnh, sản phẩm máy, khinh khí cầu. **Chỗ tiêu xu mới:** mở tầng (tổng khoảng 40 000
  xu), ô chậu, chậu ở shop, nâng sao (khoảng 2 700 xu cho một chậu lên ★5, nhân 60 chậu đặt được). Phần tiêu
  nhiều hơn phần thu nhiều lần, đúng mục tiêu "có chỗ tiêu xu" mà `LAND_PRICES` đang đảm nhận.
- **Mô phỏng trước khi chốt:** viết `scripts/sim/sky-economy.mjs` giả lập người chơi 3 lần/ngày trong 60 ngày.
  Kiểm tra (a) tầng 5 rơi vào khoảng ngày 20-25, (b) tầng 10 khoảng ngày 70-90, (c) xu không dồn quá 10 000
  mà không có gì để mua.
- **Tiền nạp (cần quyết):** hiện app chỉ thu tiền lượt quay (VietQR + SePay, `server/lib/Spins.php`). Có thể
  mở rộng thành bán **Mây Ngọc**, nhưng plan đề xuất **chưa làm ở v1**. Mây Ngọc chỉ kiếm bằng chơi. Lý do:
  thêm tiền nạp vào game có may rủi (nâng sao) thì cần rà soát pháp lý và gian lận kỹ hơn. Nếu sau này làm:
  chỉ bán đồ trang trí hoặc chậu ngoại hình, **không bán lượt nâng sao hay tỉ lệ**.

---

## 9. Lộ trình

> **→ §0.3:** đã thay bằng lộ trình duy nhất G0–G6. Bảng dưới giữ để đối chiếu. P0 ≈ G0, P1 ≈ G1, P2 ≈ G2
> (thêm máy đầu và MIX01), P3 ≈ G3, P4 ≈ G4, P5 ≈ G5, P6 ≈ G6.

Làm theo thứ tự. Mỗi phần ship được riêng. Theo cách đã làm với nông trại: **demo chuyển động trước, chưa có
lối chơi**, người dùng duyệt rồi mới làm tiếp.

| Phần | Nội dung | Xong khi |
|---|---|---|
| **P0. Chuẩn bị** | `prepare-pots.mjs` cho 4 chậu, `pots.json` có điểm neo, `prompts/sky-garden-prompts.md`, chốt các câu hỏi ở §10 | 4 chậu webp + neo đúng khi xem thử |
| **P1. Demo chuyển động** | Route `/sky-garden-test`: 3 tầng cuộn dọc, 4 chậu thật + chậu tạm, cây lắc, bọ bay đậu, bắt bọ, hạt lấp lánh, ngày/đêm, cảnh leo đậu thần. **Không có kinh tế** | Người dùng duyệt chuyển động trên điện thoại |
| **P2. Lối chơi lõi** | `skyGarden.ts` (dữ liệu), nhánh `sky` trong progress + `parseProgress`, action đặt/trồng/tưới/thu/bọ, mở tầng 1-3, shop chậu bằng xu, i18n vi/en, gameRules + guard, test reducer | Người chơi cấp 12 lên mây, trồng, bắt bọ, thu được. Guard chặn bản lưu bị sửa |
| **P3. Chậu có chiều sâu** | Nâng sao (endpoint server), thăng bậc, hiệu ứng bộ theo tầng, gợi ý xếp, bộ sưu tập chậu, mở tầng 4-10, mô phỏng kinh tế | Mô phỏng đạt mốc §8. Test gian lận §6.3 pass |
| **P4. Chế biến và đơn** | 4 máy, sản phẩm mây trong kho, nguyên liệu tùy chọn cho công thức dưới đất, cú đưa thư dùng hàng mây, khinh khí cầu | Có chuỗi đầy đủ: trồng → máy → đơn → Hạt Mây → mở tầng |
| **P5. Bạn bè** | `sky_summary`, thăm Vườn Mây của bạn, bắt bọ giúp, bảng xếp hạng Điểm vườn, thông báo `farm_events` | Thử 2 tài khoản trên 2 máy theo `kiem-tra-dien-thoai.md` |
| **P6. Nội dung và sự kiện** | Bộ Bàn Ăn Việt, Chợ Quê, Biển, Lễ Tết, cây mây còn lại, nhiệm vụ và thành tựu mây, sự kiện Tết hoặc Trung Thu có chậu riêng | Đủ 36 chậu, 15 cây |

Mỗi phần: `npm test`, `npm run check:motion`, test i18n, xuất lại `game-rules.json`, thử trên điện thoại.

### File dự kiến

```
src/data/skyGarden.ts                    chậu, bộ, cây mây, bọ, máy, tầng, giá, tỉ lệ
src/domain/sky.ts                        tính chỉ số (sao × tầng × bộ, trần), tung bọ tất định
src/domain/sky.test.ts
src/domain/progress.ts / reducer.ts / persistence.ts / gameRules.ts   (bổ sung)
src/features/sky-garden/
  SkyScene.tsx                           canvas, dùng lại farm-anim/engine
  systems/ShelfLayer.ts, PotLayer.ts, BugSystem.ts, BeanstalkIntro.ts
  SkyGardenTest.tsx                      demo P1
src/features/food-reel/journey/
  SkyGarden.tsx, PotTray.tsx, PotSheet.tsx (chi tiết + nâng sao), MachinesSection.tsx, BalloonSection.tsx
src/i18n/messages/{vi,en}/sky.ts         namespace mới
server/lib/Sky.php                       star-up, tier-up, catch giúp
server/lib/ProgressGuard.php             luật sky
scripts/sky-garden/prepare-pots.mjs
scripts/sim/sky-economy.mjs
assets/sky-garden/pots/*.png             ảnh gốc
public/images/sky-garden/**              webp xuất ra
prompts/sky-garden-prompts.md
```

---

## 10. Câu hỏi cần chốt trước P2

> **→ §0.1:** câu 4 đã chốt (6 ô). Câu 2, 3 chốt theo đề xuất (D3/D8, pity §5.3). Câu 1, 5, 6 chuyển thành
> Q1–Q3, kèm Q4–Q6 mới.

1. **Tên khu:** "Vườn Mây" (đề xuất), "Khu vườn trên mây" (dễ nhầm với game của VNG), hay tên khác?
2. **Thất bại khi nâng sao:** dùng cách nhẹ tay ở §5.3 (đề xuất), hay khắt khe như game gốc (mất hết)?
3. **Tiền nạp Mây Ngọc:** để sau v1 (đề xuất), hay làm ngay theo đường VietQR của lượt quay?
4. **Số ô một tầng:** 6 (đề xuất, khớp 6 chậu/bộ) hay 9?
5. **Cấp mở Vườn Mây:** 12 (đề xuất) hay sớm hơn để người mới thấy sớm?
6. **Bộ Nông Sản là bậc Ngọc:** 4 chậu đã vẽ trông rất "sang" (viền vàng). Có muốn đẩy lên Hoàng kim, và vẽ
   thêm bộ Đất nung thật đơn giản cho người mới không?

---

## 11. Lưu ý bản quyền

- "Khu Vườn Trên Mây" là game và thương hiệu của VNG. Chỉ học **cơ chế** (tầng, chậu có chỉ số, bọ nâng cấp,
  xếp chậu, máy, đơn). Không dùng tên game, tên vật phẩm đặc trưng (lọ mây, nước thánh, mẹ Jack), hình, âm
  thanh hay giao diện của họ. Truyện Jack và cây đậu thần là truyện dân gian, dùng được.
- Art chậu là của người dùng. Art sinh thêm bằng AI phải theo phong cách 4 chậu gốc và lưu prompt để làm lại
  được.

---

## 12. Quy tắc vận hành bổ sung và xử lý khoảng trống

Các quy tắc dưới đây là **đề xuất riêng để triển khai**, không mô tả game gốc. Khi khác với mô tả rút gọn phía trên, dùng phần này làm quy tắc chi tiết; các quyết định chưa duyệt giữ trạng thái dự thảo.

### 12.1 Trạng thái chậu và một chu kỳ cây

- Ô khóa → ô mở trống → chậu rỗng → cây đang lớn → cây chín → chậu rỗng. Bọ là trạng thái phụ, không phải bước bắt buộc. Một lần trồng tiêu đúng 1 hạt; cây mây mặc định thu một lần rồi trồng lại, không tự tái sinh. Cây đất chỉ nhận nhóm rau được cho phép, không tự mang cơ chế cây lâu năm lên mây.
- Mỗi chu kỳ có định danh duy nhất, thời điểm bắt đầu, thời lượng hiệu lực, mốc chuyển giai đoạn, sản lượng và XP cố định theo bảng luật. Trồng thất bại không mất hạt; thu thành công đồng thời trả sản phẩm/XP, tăng thống kê và xóa cây. Không vừa cộng xu vừa nhập cùng sản phẩm vào kho: hoa bán ngay phải có chế độ riêng và xác nhận rõ trong dữ liệu; MVP đưa mọi sản phẩm vào kho.
- (**→ §0.5 D3:** bỏ phương án 10% dưới đây, dùng y luật `WATERING` của nông trại: 25% thời gian còn lại, ngân
  sách chung 3 lượt/ngày + 1 sau bữa thật, mỗi chậu cách 1 giờ.) Tưới là tùy chọn, cây vẫn chín và không héo nếu không chăm. Đề xuất giảm 10% thời gian **còn lại** tại lúc tưới, tối đa một lần/chu kỳ, không tưới cây đã chín. Dùng chung ngân sách nước thật của giếng, không hard-code thêm 3 lượt nếu luật hiện hành khác. Tưới giúp không tạo ngân sách nước thứ hai hoặc giảm thời gian lần nữa.
- Bọ được xét tại ba mốc chuyển giai đoạn, chỉ khi chưa có bọ. Bảng §4.4 là **trọng số loại**, không phải các xác suất độc lập vì tổng vượt 100%. Xác suất có bọ gốc đề xuất 25%/mốc; chỉ số bọ cộng điểm phần trăm, chặn ở 85%. Sau đó chuẩn hóa trọng số loại đủ điều kiện; đom đóm xét giờ game UTC+7, không xét giờ thiết bị.
- Bọ còn ở mốc tiếp theo làm chậm đúng một lần/chu kỳ: cộng 10% thời gian còn lại tại mốc đó, ghi dấu đã áp dụng. Bắt ngay trước mốc tránh chậm. Bọ còn trên cây chín vẫn bắt được nhưng không tự phát sinh thêm; thu hoạch bỏ bọ chưa bắt, có thông báo ngắn. Không có tác vụ chạy nền liên tục để tích lũy bọ vô hạn.
- Khi đổi vị trí, mang theo cây và bọ nhưng không tính lại thời lượng/sản lượng chu kỳ đang chạy. Không cất, thăng bậc hay nâng sao chậu có cây; bỏ cây cần xác nhận, không hoàn hạt, không trả thưởng. Hai ô có chậu đổi chỗ nguyên tử, không nhân bản chậu khi kéo thả lỗi.
- Thu cả tầng xử lý từng chu kỳ hợp lệ một lần, báo số đã thu và lý do bỏ qua ô chưa chín. Retry sau mất mạng phải trả kết quả cũ, không tạo đợt thu mới.

### 12.2 Công thức chỉ số và nâng cấp rõ nghĩa

- Chỉ số hiệu lực mỗi chậu = chỉ số gốc theo bậc × hệ số sao × hệ số tầng, cộng bonus bộ và bonus tương thích cây, rồi chặn theo trần §4.2. **Không cộng chỉ số của cả sáu chậu vào từng cây.** Bonus bộ ghi bằng điểm phần trăm; tăng tương thích Nông Sản chỉ nhân phần thời gian gốc của chính chậu trước cộng bộ.
- Thời lượng lúc trồng = làm tròn lên thời lượng gốc × phần còn lại sau giảm thời gian. XP thu hoạch = làm tròn xuống XP gốc × hệ số XP. Mọi giá trị lưu bằng số nguyên; không làm tròn nhiều lần ở từng bước.
- MVP chỉ áp thời gian, XP và bọ; **hoãn bonus xu** vì kho chung không lưu nguồn gốc lô sản phẩm. Giai đoạn sau phải chọn lưu lô với bonus chốt lúc trồng hoặc một cơ chế thưởng riêng được mô phỏng; không lấy bonus chậu hiện tại để nhân xu của hàng mua/chế biến hoặc bán đi bán lại.
- Một tầng dùng một hiệu ứng: ưu tiên cố định Đủ bộ → Bách hóa → Dát vàng → Ba đôi, không chọn theo khái niệm mạnh nhất chưa định nghĩa. Đủ bộ yêu cầu sáu mẫu chậu khác nhau của cùng bộ; Ba đôi yêu cầu đúng ba bộ, mỗi bộ hai chậu. Cần đủ sáu ô mở và có chậu; chỉ số chính của mỗi bộ phải có trong dữ liệu.
- Nâng sao: tỉ lệ = min 100%, tỉ lệ gốc + pity + cỏ; dùng cỏ khi người chơi chủ động chọn và tiêu đúng 1/lần thử. Mất bọ khi thất bại làm tròn lên theo từng loại, hoàn toàn bộ xu, không giảm sao; pity và số lần thử reset khi thành công. Nhảy +2 không vượt ★5; chỉ thử nhảy sau thành công, không trả thưởng lần nữa.
- Bậc và sao là hai trục khác nhau; cần bảng chỉ số/giá của từng bậc, không suy đoán từ màu khung. Thăng bậc tiêu một chậu phụ cùng bộ, rỗng, ★0, không phải chính chậu mục tiêu; bỏ tham chiếu vị trí của chậu phụ nguyên tử. Chậu huyền thoại không thăng tiếp. Xác nhận UI phải hiện chỉ số trước/sau vì reset sao có thể làm chỉ số giảm.
- Điểm vườn đề xuất = tổng [10 × (bậc + 1) + sao] của chậu đang đặt đã xác minh; tránh công thức bậc × sao làm mọi chậu ★0 có điểm 0. Chỉ dùng khoe vườn, không trả xu/XP theo thứ hạng ở v1.

### 12.3 Mở khóa không tự chặn đường tiến bộ

- Mở tầng tuần tự, đủ cấp chưa đồng nghĩa đã mua; cấp mở dùng chung với nông trại nhưng chỉ thao tác mua mới trừ tài nguyên. Ô thêm đề xuất lần lượt 60/100/160 xu ở mỗi tầng, là số thử nghiệm; một ô chỉ mua một lần.
- §4.1 đang yêu cầu Hạt Mây từ tầng 2 nhưng khinh khí cầu chỉ mở tầng 5; tầng 3 cần Sương Mai trong khi máy chưng sương mở tại tầng 3. **Bổ sung đường chắc chắn:** nhiệm vụ hướng dẫn tầng 1 cho đủ 2 Hạt Mây mở tầng 2; chuỗi hướng dẫn tầng 2 cho đủ 4 Hạt Mây + 1 Sương Mai mở tầng 3. Điều kiện chỉ dùng cây, chậu và thao tác đã mở, thưởng một lần, không cần bọ hiếm/bạn bè/sự kiện.
- Trước tầng 5, đơn nhỏ có nguồn Hạt Mây bảo đảm qua mốc hoàn thành, không chỉ rương ngẫu nhiên; tầng 3 trở đi máy cung cấp Sương Mai. Trước khi ship phải chứng minh đường kiếm đủ chi phí tầng 4–5 bằng nội dung thường trực. Đậu thần tầng 10 là nguồn bổ sung, không là điều kiện để mở chính tầng đó.
- Lò sao trà mở ở tầng 1 nhưng cần trà tầng 3: thêm công thức khởi đầu 3 nụ nhài → gói nhài sấy, hoặc hoãn công thức trà tới tầng 3. Mỗi máy vừa mở phải có ít nhất một công thức làm được bằng nguồn hiện có; không buộc mua hàng bạn bè.
- Giá hạt, sản lượng, XP, giá bán và nguồn hạt của từng cây ở §4.3 phải được điền trước P2. Cây có hai sản phẩm như sen phải ghi số lượng từng loại, không dùng tên ghép mơ hồ. Cây sự kiện không được chặn tiến trình thường trực.

## 13. Kinh tế, nhiệm vụ và nội dung dài hạn

### 13.1 Bảng cân bằng bắt buộc và kiểm tra mô phỏng

- Với từng cây/máy/đơn, điền chi phí xu và nguyên liệu, sản lượng, XP, thời gian, nguồn mở khóa, giá bán, giới hạn ngày và vai trò tiêu/cấp tài nguyên. Sản phẩm chỉ bán được nếu có giá khai báo. Máy trừ nguyên liệu khi bắt đầu, hàng chờ chạy tuần tự; công việc hoàn tất chờ nhận không tự trừ thêm nguyên liệu. MVP chưa hỗ trợ hủy; nâng máy không thay đổi thời lượng công việc đã bắt đầu.
- Chi phí mở tầng theo bảng hiện tại là **40 500 xu**. Chi phí nâng sao không được lấy tổng các lần thành công làm kỳ vọng: phải tính thất bại, số bọ mất, pity cứng, cỏ và nhảy sao. Mọi mốc ngày/XP ở §2, §4, §8 là giả định kế hoạch, chưa là số đo xác nhận.
- Mô phỏng cả nông trại và mây dùng chung ví, XP, nước, kho; tối thiểu ba hồ sơ 1/3/6 lần ghé mỗi ngày, có và không có bạn, có chuỗi nghỉ 1/3/7 ngày. Chạy đủ ít nhất 90 ngày để đánh giá mục tiêu tầng 10; chạy 60 ngày ở §8 không chứng minh mốc ngày 70–90.
- Báo cáo theo nhiều seed: phân vị mốc mở tầng, số dư và tài nguyên thiếu, lợi nhuận/giờ, XP/ngày, số lần nâng sao và thời gian thiếu bọ. Mục tiêu §8 là giả thuyết hiệu chỉnh, không cam kết tiến độ người chơi. Chưa chốt kinh tế nếu có điểm kẹt bắt buộc, vòng mua–bán lời vô hạn hoặc thiếu nguồn thường trực.
- Nguồn hiếm có đường đổi chắc chắn với hạn mức; không yêu cầu đăng nhập ban đêm để mở tầng. Không bán tiền nạp hoặc dùng sự kiện giới hạn làm nguồn duy nhất của vật phẩm cốt lõi. Cửa hàng phải hiển thị cả giá và nguồn kiếm tài nguyên.

### 13.2 Đơn, nhiệm vụ, bạn bè và sự kiện

- Đơn chỉ sinh từ cây/máy đã mở và khả năng cung ứng trong hạn; không yêu cầu sản phẩm mùa ngoài mùa. Mỗi đơn có định danh, phiên bản luật, hạn theo server và thưởng chốt lúc tạo. Đơn hướng dẫn không hết hạn; đổi đơn thường có cooldown được ghi trong bảng luật, không refresh vô hạn để chọn phần thưởng.
- Thùng khinh khí cầu trừ hàng và trả XP nguyên tử; XP thùng không lặp trong thưởng chuyến. Hết hạn không hoàn hàng đã giao vì đã nhận thưởng thùng, nhưng không phạt thêm; UI thông báo điều này trước khi đóng thùng. Thưởng chuyến chỉ nhận một lần, streak dùng ngày server, bỏ lỡ không xóa phần thưởng đã nhận.
- MVP thêm chuỗi hướng dẫn: vào mây → đặt chậu → trồng → tưới tùy chọn → thu → mở tầng 2. Nhiệm vụ ngày/tuần chỉ chọn việc thực hiện được; chưa có máy/khinh khí cầu/bạn thì không bốc nhiệm vụ tương ứng. Giữ danh sách đã bốc trong ngày/tuần, tối đa một nhiệm vụ xã hội, đếm hành động thành công chứ không đếm số lần bấm. Theo nguyên tắc của [kế hoạch nhiệm vụ](nhiem-vu-va-thanh-tuu-mo-rong.md) và [bản cập nhật nông trại](nong-trai-va-nhiem-vu-03-10.md).
- Bắt bọ giúp phải có quan hệ bạn bè hợp lệ, bọ thuộc đúng chu kỳ và chưa ai bắt. Trần người giúp là 5 thưởng/ngày tổng mọi vườn; thêm trần chủ vườn nhận 5 bản sao/ngày. Không phát bản sao bọ quý/huyền thoại ở MVP xã hội; dùng thưởng bọ thường cố định để hạn chế tài khoản phụ. Quy tắc bản sao §5.7 chỉ áp sau khi có quota nguyên tử.
- Sự kiện giai đoạn sau có thời điểm bắt đầu/kết thúc UTC+7, điều kiện tham gia, nhiệm vụ, cửa hàng, hạn nhận thưởng và xử lý tiền sự kiện dư công bố trước. Chậu sở hữu giữ lại sau mùa; trồng/công thức mùa khóa mới nhưng chu kỳ đã bắt đầu được hoàn tất. Có đường quay lại hoặc vật phẩm thay thế hợp lý, không khóa bộ cốt lõi vĩnh viễn. Không bổ sung bảng tin mua bán hoặc trao đổi chậu vào v1.

## 14. Trải nghiệm mobile và khả năng tiếp cận

- Sáu ô là bố cục logic, không ép sáu chậu nhỏ vào một hàng trên điện thoại. Đề xuất tầng hiển thị 2 hàng × 3 ô ở màn hẹp, vẫn cuộn dọc giữa các tầng; chiều cao tầng co theo nội dung, thay mục tiêu cố định 38% ở §7.3 khi không đủ vùng chạm.
- Nút/vùng tương tác tối thiểu 44 × 44 CSS px, hitbox bọ riêng không chặn thao tác cây. Kéo chỉ bắt đầu sau ngưỡng di chuyển và giữ ngắn; cuộn dọc ưu tiên khi chưa kéo. Luôn có cách thay thế: chạm ô → chọn chậu/hạt → xác nhận; đổi chỗ qua chọn ô đích, không bắt buộc kéo thả.
- Thanh xu/XP và nút xuống đất giữ thấy được; khay hạt, sheet chi tiết và toast không che ô đang thao tác hay nút xác nhận. Tôn trọng vùng an toàn màn hình, bàn phím và thay đổi chiều cao trình duyệt. Khi thiếu tài nguyên, dẫn đến nguồn kiếm; khi mạng lỗi, giữ lựa chọn và cho retry cùng thao tác.
- Chi tiết chậu hiện tên, bộ, bậc/sao, chỉ số gốc/hiệu lực, trạng thái cây, thời gian còn lại, bọ, chi phí nâng và pity. Dùng chữ/icon kèm màu; không chỉ dùng lấp lánh để báo hiếm. Canvas có danh sách ô tương đương bằng phần tử giao diện truy cập được và thông báo kết quả cho trình đọc màn hình.
- Chế độ giảm chuyển động bỏ bay/nảy/parallax, không chặn chơi; tùy chọn giảm hiệu ứng và tắt âm thanh. Chỉ vẽ tầng gần viewport, dừng hoạt cảnh khi tab ẩn, tải art theo tầng cần xem. Mục tiêu thử nghiệm: thao tác không rơi mất, cuộn/nhấn đạt ít nhất 30 fps ổn định trên máy Android tầm trung được chọn và ghi rõ thiết bị; không tự tuyên bố đã đạt.
- Kiểm thử 360/390/430 px, landscape, desktop, chữ phóng 200%, mạng chậm/mất mạng; tối thiểu một Android và một iPhone thật trước phát hành. Bản demo phải tách khỏi ví và bản lưu thật.

## 15. Lưu trạng thái, offline và tính toàn vẹn

### 15.1 Ranh giới tin cậy

> **→ §0.2 (D1):** chọn hướng A. Mọi thao tác vẫn đi qua bản lưu chung + `ProgressGuard`, chỉ nâng sao và thăng
> bậc do server ghi (có `opId`, khóa `version`). Yêu cầu "server nắm mọi thao tác" dưới đây chỉ làm khi đã
> chuyển cả ví xu sang server, tách thành dự án riêng. Các yêu cầu khác của §15 (giờ server, UTC+7, khách là
> sandbox, parser chặt, không lộ seed) vẫn áp dụng.

Thiết kế replay ledger ở §6.3 là hướng tích hợp ban đầu, **không đủ chứng minh chống gian lận**. Hash dùng thời điểm trồng/UID do client chọn có thể bị thử nhiều seed hoặc rollback; sửa thời gian, cắt ledger và snapshot giả vẫn là rủi ro. Đối chiếu [kiểm toán gian lận](kiem-toan-gian-lan-game.md) và [kế hoạch sửa bảo mật](sua-bao-mat-va-gian-lan.md); các tài liệu có mốc khảo sát khác nhau, lượt này không kiểm chứng lại mã hay xác nhận mọi lỗi đã sửa.

- Tài khoản online: server giữ trạng thái mây chuẩn hoặc xác minh chuyển trạng thái đầy đủ từ bản chuẩn, không nhận số dư/chậu/thời gian do client tự khai làm sự thật. Mọi thao tác kinh tế dùng giờ server, định danh chu kỳ do server cấp, revision và khóa chống lặp bền vững độc lập ledger hiển thị.
- Bọ/nâng sao được server chốt kết quả một lần và lưu theo chu kỳ/lần thử. Nếu vẫn dùng hash để replay, seed do server cấp và ràng buộc chu kỳ, không cho client chọn lại; không coi việc đoán kết quả là vô hại khi bọ đổi ra tài nguyên.
- Mua/mở ô/trồng/thu/nâng cấp/đơn/thưởng thực hiện kiểm tra → trừ và cộng tài nguyên → cập nhật trạng thái/thống kê/claim → tăng revision trong một giao dịch. Retry cùng định danh thao tác trả kết quả đã lưu, không tung lại; hai tab dùng revision cũ nhận xung đột và tải lại, không merge cộng số dư.
- Endpoint nâng sao phải đồng bộ các thao tác chờ hợp lệ trước khi xét nguyên liệu. Mất response sau commit không hoàn tài nguyên phía client; truy vấn lại kết quả. Không đưa secret chống gian lận vào frontend. Kiểm soát quyền sở hữu, CSRF theo cơ chế dự án, body, tốc độ và quota; không lấy mã bạn bè làm quyền ghi.
- Khách/offline là sandbox riêng; được trải nghiệm trồng và nâng nhưng không gửi hàng/nhận thưởng xã hội hoặc xếp hạng. Khi đăng nhập, không nhập thẳng tài nguyên/chậu ★ cao tự khai; cần chính sách chuyển đổi được duyệt (gói khởi đầu một lần hoặc giữ sandbox riêng). Nhãn chưa xác minh một mình không đủ ngăn tài khoản phụ chuyển giá trị.

### 15.2 Thời gian và nối lại phiên

- Cây và máy tiếp tục chín theo thời gian thực khi đóng app, không tự thu, không tự trồng, không tự nhận đơn. Khi trở lại, server tính các mốc còn thiếu theo chu kỳ, tối đa ba lượt bọ; không thưởng theo số lần tải màn hình. Không có hao hụt cây sau kỳ nghỉ.
- Client nội suy từ giờ server đã nhận và đồng hồ đơn điệu cho hiển thị; đồng hồ thiết bị/đổi múi giờ không quyết định thưởng hoặc ngày quota. Ngày game thống nhất UTC+7 cho bọ đêm, đơn, quota và streak. Tưới offline của tài khoản online chỉ là ý định chờ, không backdate để làm chín sớm.
- MVP online mất mạng: xem bản cache và bộ đếm dự kiến, khóa thao tác thay đổi kinh tế với thông báo rõ; không giả vờ đã nhận thưởng. Nếu giai đoạn sau hỗ trợ hàng đợi offline, giới hạn thao tác, gắn tài khoản/revision, replay theo thứ tự và xử lý lỗi từng thao tác bằng server, không tự cộng thời gian từ client.
- Cache tách theo tài khoản; đăng xuất/đổi tài khoản hủy hàng đợi và response cũ. Lưu layout và tùy chọn xem riêng với trạng thái kinh tế. Không ghi đè bản server theo XP hoặc độ dài ledger.

### 15.3 Hợp đồng dữ liệu tối thiểu

- Mô hình §6.1 cần bổ sung ở thiết kế: revision, phiên bản luật, định danh chu kỳ, mốc giai đoạn đã xử lý, dấu chậm bởi bọ, snapshot chỉ số lúc trồng, số lần thử sao tại mốc hiện tại, claim hướng dẫn/bộ, định danh job máy và đơn/thùng. Quota và kết quả thao tác/claim chuẩn lưu phía server, không chỉ trong nhánh local.
- Hạt trồng cây mây phải có khóa riêng, **không dùng Hạt Mây mở tầng làm hạt hoa nhài**. Lập registry phân biệt hạt trồng, sản phẩm, vật phẩm mở tầng, tiền hiếm và bọ; mỗi tài nguyên có đúng một nguồn số dư chuẩn. Tránh vừa lưu bọ trong nhánh sky vừa trong kho mà hai nơi cập nhật độc lập.
- Parser kiểm tra allowlist ID, số nguyên an toàn không âm, tối đa 10 tầng/6 ô/ô mua 0–3, bậc 0–4/sao 0–5, UID duy nhất và một chậu chỉ ở một ô. Tham chiếu thiếu hoặc cây sai nhóm phải được xử lý có kiểm soát, không âm thầm cấp lại vật phẩm.
- Bản lưu cũ thiếu nhánh sky nhận mặc định rỗng và không tự nhận quà; claim mở đầu trả một lần khi đủ điều kiện. Giữ quy ước không tăng phiên bản bản lưu local nếu chỉ thêm trường tùy chọn, nhưng migration DB/revision luật là việc riêng; **không chốt cứng phiên bản luật là 2** trước khi kiểm tra giá trị thực tế tại thời điểm triển khai.
- Tóm tắt bạn bè chỉ chứa tên hiển thị và thông tin vườn cần xem đã xác minh; không xuất seed RNG, ledger, email, token hoặc trạng thái bí mật. Theo dõi lỗi đồng bộ, thao tác bị từ chối, nguồn/đích xu và mốc mở tầng bằng nhật ký tối thiểu, tránh thu dữ liệu cá nhân không cần thiết.

## 16. Phạm vi MVP, nghiệm thu và cổng phát hành

### 16.1 Điều chỉnh thứ tự để mỗi giai đoạn chơi được

> **→ §0.3:** đã gộp vào lộ trình G0–G6. Ma trận §16.2 bên dưới vẫn là cổng nghiệm thu bắt buộc.

Giữ P0–P6 làm tên giai đoạn, nhưng chỉnh phụ thuộc thay vì mở hết tầng trước khi có nguồn tài nguyên:

1. **P0:** xác minh quyền art, quyết định §10, chốt registry/giá/sản lượng, nguồn mở tầng 2–3, cơ chế thời gian và chính sách khách. Kiểm tra các tham chiếu mã/phiên bản hiện tại trước triển khai.
2. **P1:** demo chuyển động và tương tác mobile bằng dữ liệu giả, không ghi kinh tế; duyệt bố cục sáu ô ở màn hẹp, điểm neo và khả năng chạm thay kéo.
3. **P2 = MVP phát hành lõi:** tầng 1–3, năm cây đầu, chậu khởi đầu và bốn mẫu Nông Sản đã mô tả nếu có quyền art, trồng/tưới/thu/bọ, mua ô/chậu, kho, hướng dẫn bảo đảm Hạt Mây/Sương Mai, nhiệm vụ khả thi, lưu và bảo vệ online/offline theo §15. Nếu chưa có đường xác minh server, chỉ phát hành sandbox/demo, không bật kinh tế chung online. Chưa yêu cầu hoàn thiện 36 chậu.
4. **P3:** nâng sao/thăng bậc, bộ sưu tập/bonus, mô phỏng cân bằng; bổ sung đủ sáu mẫu của bộ dùng thử trước nghiệm thu hiệu ứng Đủ bộ. Chỉ mở tầng 4–5 khi nguồn vật phẩm chắc chắn hoạt động; tầng 6–10 chờ chuỗi P4 đã hoàn tất và mô phỏng không kẹt.
5. **P4:** máy/công thức khả thi, đơn nhỏ và khinh khí cầu, mở rộng tầng 6–10 theo nguồn cấp thực tế. Chốt bonus xu có nguồn gốc trước bật, không tự nhân vào kho chung.
6. **P5–P6:** bạn bè với quota chống nhân bản và xếp hạng đã xác minh; sau đó thêm 36 chậu/15 cây, nội dung mùa và sự kiện có chính sách kết thúc. Thương mại tiền thật, mua bán người chơi, tự động hóa và 3D nằm ngoài v1.

### 16.2 Ma trận nghiệm thu bắt buộc

| Nhóm | Kịch bản | Kết quả cần đạt |
|---|---|---|
| Hướng dẫn/tiến trình | Tài khoản cấp 12 mới, không bạn/không sự kiện, chỉ dùng nội dung thường trực | Mở tầng 1 rồi kiếm đủ vật phẩm tầng 2–3; không cần máy/cây chưa mở |
| Vòng cây | Trồng, tưới hai lần, đổi tầng, bọ, thu và retry thu cả tầng | Một hạt bị trừ; tưới hiệu lực một lần; không đổi bonus giữa chu kỳ; một thưởng mỗi chu kỳ |
| Chậu/bộ | Đổi hai ô, cất chậu đang có cây, đủ sáu mẫu, nhiều hiệu ứng cùng hợp lệ | Không chậu trùng UID, chặn cất; bonus theo ưu tiên và trần rõ ràng |
| Nâng cấp | Chuỗi thất bại, cỏ, lần thứ 5, nhảy sao ở ★4, thiếu chậu phụ | Pity cứng đúng; không vượt ★5; chi phí/hoàn xu nguyên tử; không tiêu chính chậu mục tiêu |
| Kinh tế | Mọi cây/máy/đơn và luồng mua–bán–chế biến | Registry đầy đủ, không thưởng xu hai lần, không vòng lời vô hạn, báo cáo mô phỏng đủ 90 ngày |
| Offline/thời gian | Đóng app 7 ngày, đổi đồng hồ/múi giờ, mở nhiều lần | Cây/máy chín đúng, không tự thu, tối đa ba lượt bọ, không reset quota bằng giờ client |
| Đồng bộ | Hai thiết bị, timeout sau commit, replay sau hơn 400 dòng ledger, đổi tài khoản khi request chờ | Không nhân thưởng, không ghi đè revision mới, không áp dữ liệu sai chủ |
| Gian lận | Sửa sao/số dư/readyAt/UID, chọn seed, bắt bọ không tồn tại, race thu/bắt giúp | Server từ chối hoặc dùng trạng thái chuẩn; quota và số dư không vượt luật |
| Dữ liệu cũ | Thiếu sky, ID lạ, tham chiếu hỏng, số âm/quá lớn | Default an toàn, lỗi kiểm soát, không tự tặng lại quà, không mất nông trại cũ |
| Mobile/i18n | Cỡ màn §14, thao tác chạm/kéo, giảm chuyển động, vi/en, thông báo lỗi | Không che nút, không cần kéo bắt buộc, chữ đầy đủ, có cách tương tác ngoài Canvas |
| Xã hội/sự kiện | Hai bạn bắt cùng bọ, hết hạn đơn/mùa, nhận lại claim | Một bọ bị tiêu, quota nguyên tử, thưởng không lặp, sở hữu chậu cũ không mất |

- Cổng phát hành: test luật/reducer/parser và tích hợp guard/API, thử retry/race trên SQLite và MariaDB nếu cả hai được hỗ trợ, kiểm tra i18n/build/chuyển động và mobile thực tế. Đây là **kiểm tra cần thực hiện khi triển khai**, chưa có kết quả chạy trong lượt hoàn thiện tài liệu.
- Bật tính năng theo cờ, sao lưu trước migration; rollback giao diện không được hoàn tài nguyên hoặc phát lại claims. Theo dõi lỗi đồng bộ và số dư bất thường trước mở rộng nội dung.
- Chỉ sửa tài liệu này trong lượt bổ sung. Các đường dẫn mã, art và nguồn web từ bản gốc là đầu mối cần kiểm tra; không chứng nhận file/ảnh gốc đã tồn tại, quyền sở hữu đã hợp lệ hoặc tình trạng triển khai thực tế. Truyện dân gian không đồng nghĩa mọi hình tượng/bản dịch/art Jack đều tự do sử dụng; cần kiểm tra giấy phép từng tài nguyên, tên thương mại và tránh mô phỏng nhận diện/giao diện độc quyền.

---

Nguồn tham khảo lối chơi (liên kết giữ từ bản gốc, chưa được truy cập lại trong lượt bổ sung):
[download.vn: thêm tầng và nâng cấp chậu](https://download.vn/cach-them-tang-may-va-nang-cap-chau-trong-khu-vuon-tren-may-18853) ·
[BlueStacks: tầng, nâng chậu, cây mới](https://www.bluestacks.com/vi/blog/game-guides/khu-vuon-tren-may/skygarden-upgrade-pots-plants-guide-vn.html) ·
[download.vn: mua bán vật phẩm](https://download.vn/cach-mua-va-giao-ban-cac-vat-pham-trong-khu-vuon-tren-may-18902) ·
[trumthe: các hiệu ứng](http://trumthe.com/detail-news/nhung-hieu-ung-can-biet-khi-choi-khu-vuon-tren-may) ·
[Công thức xếp chậu (diễn đàn)](https://autoit.forumvi.com/t639-topic) ·
[Nâng cấp chậu nhanh](https://ilovekhuvuontrenmay.wordpress.com/2016/06/24/lam-the-nao-nang-cap-chau-khu-vuon-tren-may-mobile-nhanh-chong/) ·
[Vietnamnet: giới thiệu KVTM](https://vietnamnet.vn/gioi-thieu-game-khu-vuon-tren-may-tren-zingme-i346005.html) ·
[Google Play: Khu Vườn Trên Mây](https://play.google.com/store/apps/details?id=vn.kvtm.js&hl=en_US) ·
[khuvuontrenmay.wordpress.com](https://khuvuontrenmay.wordpress.com/2014/09/18/sky-garden/)


---

## 17. Định hướng V2 — hiện đại hóa gameplay và kết nối sâu với Ăn gì? (2026-10-08)

**Trạng thái:** đặc tả đề xuất để triển khai theo giai đoạn, chưa xác nhận đã có trong code. Mục này bổ sung §1–§16; quy tắc bảo mật, thời gian, tính nguyên tử và nghiệm thu ở §12–§16 vẫn là bắt buộc. Khi có xung đột về phạm vi/phụ thuộc, dùng lộ trình §17.7; khi có xung đột về an toàn dữ liệu, dùng §15. Không coi các đề xuất mới là cơ chế đã được xác minh từ game Zing.

### 17.1 Tầm nhìn và nguyên tắc sản phẩm

- **Dưới đất trồng để nấu, trên mây trồng để sưu tầm và làm nguyên liệu đặc biệt.** Hai khu chia sẻ tài khoản, cấp, xu, XP và kho chuẩn, nhưng có mục tiêu chơi riêng.
- Giữ tinh thần hoài niệm: tầng mây, cây đậu thần, chậu quý, bọ, nâng chậu, phối chậu, thăm bạn. Không sao chép asset, UI, tên thương mại hay số liệu độc quyền của Zing.
- Người chơi có lý do qua lại hai khu nhờ công thức hỗn hợp và đơn hàng; không bắt người chơi lên mây để hoàn thành các công thức/nhiệm vụ lõi dưới đất.
- Ưu tiên thao tác chạm trên mobile, phản hồi rõ, thời gian thực không làm cây chết; không khóa tiến trình bằng sự kiện, bạn bè hoặc giờ đăng nhập.
- Thiết kế dữ liệu mở rộng theo registry, không hardcode giới hạn nội dung vào hệ thống ngoài giới hạn phiên bản/lưu trữ được khai báo.

### 17.2 Vòng lặp kết nối hai chiều và hợp đồng công thức

1. Thu nông sản đất và nguyên liệu mây → nhập kho chung qua ledger/server chuẩn.
2. Chọn công thức trong máy/chế biến; kiểm tra đã mở, đủ nguyên liệu, hàng chờ, chi phí và thời gian.
3. Trừ nguyên liệu **một lần** khi bắt đầu; hoàn thành theo giờ server; nhận sản phẩm **một lần**.
4. Dùng thành phẩm cho nấu món, bán NPC hoặc đơn cú/khinh khí cầu; thưởng chốt theo phiên bản luật và không nhân đôi XP/xu.
5. Thành quả giúp mua hạt/chậu, nâng cấp và mở tầng; luôn có đường kiếm vật phẩm thường trực không cần bạn bè/sự kiện.

**Bảng công thức hỗn hợp khởi tạo để cân bằng, không phải giá trị đã duyệt** (định danh và tên đầu vào phải ánh xạ registry thật trước khi code):

| Mã dự thảo | Đầu vào từ đất | Đầu vào từ mây | Đầu ra | Điều kiện |
|---|---|---|---|---|
| MIX01 | mật ong | nụ nhài | trà nhài mật ong | T1; không cần cây trà T3 |
| MIX02 | mật ong | bạc hà, tắc | nước tắc bạc hà mật ong | T1 |
| MIX03 | nguyên liệu bánh có sẵn, cần xác minh | dâu | bánh dâu | T2 |
| MIX04 | mật ong | hạt sen | chè sen mật ong | T2 |
| MIX05 | nguyên liệu bánh có sẵn, cần xác minh | hoa sen | bánh hương sen | T2 |
| MIX06 | nguyên liệu nước uống có sẵn, cần xác minh | lá trà, nhài | trà nhài | T3 |
| MIX07 | sữa hoặc nguyên liệu thay thế, cần xác minh | cà phê | cà phê sữa | T3 |
| MIX08 | nguyên liệu món mặn có sẵn, cần xác minh | tiêu | phiên bản món có tiêu | T4 |
| MIX09 | nguyên liệu món tráng miệng có sẵn, cần xác minh | cúc vàng | món hương cúc | T4 |
| MIX10 | nguyên liệu bánh có sẵn, cần xác minh | vani | bánh vani | T7 |

**Đã đối chiếu code (2026-10-08):** `honey` (tổ ong, 2 mật mỗi 5 giờ, bán 12 xu) và `milk` đều có sẵn, nên MIX01,
MIX02, MIX04 và MIX07 đủ nguyên liệu dưới đất. Mật ong không mua được ở chợ. **→ §0.4:** MIX01 và MIX02 ở Bếp
trà (T1), MIX04 ở Nồi chè (T2), MIX07 để G4.

**Chưa đưa MIX03, MIX05–MIX10 vào runtime** cho tới khi có nguyên liệu hợp lệ, sản lượng, thời gian, chi phí, giá bán, XP, nguồn hạt và đường mở khóa; không tự tạo nguyên liệu đất chưa tồn tại. Mỗi công thức có `recipeId`, `rulesVersion`, `requiredUnlocks`, `inputs[]`, `outputs[]`, `durationSeconds`, `coinCost`, `xpReward`, `sellPrice`, `dailyLimit` (nếu có), `source/sink` và test chống vòng lặp lợi nhuận vô hạn. Bản MVP ưu tiên MIX01, MIX02, MIX04 sau khi xác minh mật ong và sản phẩm tương ứng.

**Sửa phụ thuộc mở khóa:** Lò sao trà T1 phải có công thức T1 không cần lá trà T3; nguồn Hạt Mây mở T2 và Sương Mai mở T3 phải đến từ chuỗi hướng dẫn/nhiệm vụ thường trực trước khi yêu cầu tiêu; Máy chưng sương T3 chỉ là nguồn bổ sung sau khi mở. Hạt Mây từ cây đậu thần T10 dùng đổi chậu/vật phẩm cuối game, không được coi là nguồn mở tầng trước T10.

### 17.3 Chậu, cộng hưởng và preset

> **→ §0.6 (D4):** G2–G5 dùng một bảng 4 hiệu ứng, theo thứ tự ưu tiên. Cộng hưởng 2/4/6 và preset để G6.

- Giữ 36 mẫu ban đầu, 5 bậc và ★0–★5; các mẫu và chỉ số khai báo bằng registry có phiên bản. Chậu có UID server, bộ, bậc, sao, trạng thái đặt, khóa thao tác và lịch sử nâng cấp tối thiểu.
- **Cộng hưởng bậc thang:** 2/4/6 chậu cùng bộ trên một tầng có thể kích hoạt hiệu ứng tăng dần; bảng số % là dữ liệu cân bằng, chưa chốt. Hiệu ứng 6 chậu không cộng trùng hiệu ứng 2 và 4 trừ khi registry ghi rõ.
- **Cộng hưởng hỗn hợp:** phối Nông Sản + Bàn Ăn Việt hoặc bộ khác để ưu tiên XP/đơn/chế biến; bonus chỉ áp lên hoạt động có nguồn gốc xác minh được. Không nhân đôi thưởng khi chuyển qua kho chung.
- **Quy tắc giải hiệu ứng:** xét chậu hợp lệ đang đặt, chọn một hiệu ứng theo thứ tự ưu tiên định nghĩa trong registry (hoặc hiệu ứng có điểm ưu tiên cao nhất), sau đó áp trần chỉ số ở §4.2; UI hiển thị hiệu ứng đang hoạt động, lý do và dự báo khi đổi chậu. Không cộng đồng thời công thức §5.4 và công thức V2 nếu không có quy tắc kết hợp tường minh.
- **Preset:** lưu tối đa 3 bố cục tham khảo mỗi tài khoản, áp dụng bằng thao tác giao dịch nguyên tử; kiểm tra UID, quyền sở hữu, ô mở, cây đang trồng và revision. Nếu có cây đang trồng ở vị trí cần chuyển mà luật không cho phép, từ chối toàn bộ preset, không chuyển nửa chừng.
- Sổ tay chậu hiển thị nguồn nhận, số mẫu đã sở hữu, chỉ số gốc/hiệu lực, xác suất nâng, pity, giá và vật liệu; không lộ seed RNG.

### 17.4 Trợ thủ Vườn Mây — mở sau MVP

| Trợ thủ dự kiến | Vai trò | Rào chắn kinh tế |
|---|---|---|
| Chim Sẻ Mây | báo bọ xuất hiện | không tạo thêm bọ |
| Ong Thợ | hỗ trợ thu hoa/mật | quota ngày, không nhân tài nguyên |
| Sóc Nhỏ | tự nhận sản phẩm đã chín khi người chơi cho phép | một claim server/chu kỳ, cooldown |
| Hạc Giấy | giảm thời gian giao một số đơn | có trần, không sửa thưởng đã chốt |

- MVP chỉ có nhân vật hướng dẫn mang tính hình ảnh; **không có tự động hóa kinh tế**.
- Sau MVP, trợ thủ có `helperId`, cấp, kỹ năng, cooldown, quota, trạng thái kích hoạt, và lịch sử claim; hành động phải kiểm tra quyền, revision, giờ server và idempotency như §15.
- Trợ thủ không thay thế hoàn toàn tương tác trồng/thu, không tạo thêm nguồn bọ hiếm hay vật phẩm mở tầng bắt buộc. Không mở thương mại tiền thật trong V2.

### 17.5 Visual Specification & UX

**Hướng mỹ thuật:** 2D vẽ tay đồng nhất với `farm-anim`, phối cảnh 3/4, chậu là tâm điểm; tầng mây có chiều sâu bằng nhiều lớp nhưng không quay lại 3D. Màu và chất liệu lấy cảm hứng Việt Nam, không sao chép giao diện game gốc.

- **Cấu trúc cảnh:** nền trời/parallax nhẹ, mây xa, cây đậu thần, nền từng tầng, 6 vị trí logic, chậu, cây, bọ, hiệu ứng, lớp UI. Mỗi tầng có điểm neo ô và thứ tự vẽ/hit-test khai báo rõ, không tính hitbox từ viền sáng.
- **Tỉ lệ và responsive:** desktop có thể xếp 6 ô theo một hàng nếu đủ vùng chạm; mobile dùng 2×3 như §14. Không chốt kích thước pixel sprite trước khi thử trên 360/390/430 px và máy thật. Luôn giữ ô chạm ≥44 CSS px.
- **Các trạng thái hình ảnh bắt buộc:** ô khóa/mở, chậu rỗng/đang trồng/chín, 4 giai đoạn cây, có bọ, được tưới, thiếu nguyên liệu, máy đang chạy/chờ nhận, hiệu ứng bộ hoạt động.
- **Hoạt ảnh:** lên mây lần đầu, chuyển cảnh nhanh, đặt/đổi chậu, cây lớn, bọ tới/bắt bọ, thu hoạch, nâng sao thành công/thất bại, mở tầng, giao đơn. Mỗi hoạt ảnh có điều kiện bắt đầu/kết thúc, cách hủy khi chuyển cảnh, giới hạn hạt và phản hồi tĩnh khi bật giảm chuyển động.
- **Âm thanh:** tùy chọn bật/tắt nhạc/SFX độc lập, không tự phát âm thanh trước tương tác cho phép; trạng thái mute lưu riêng khỏi kinh tế.
- **Khả năng truy cập/hiệu năng:** phần tử DOM tương đương cho ô Canvas, không phụ thuộc chỉ vào màu, chỉ vẽ tầng gần viewport, lazy-load art, dừng animation khi tab ẩn; kiểm thử máy Android tầm trung và iPhone thật, ghi fps/thời gian tương tác thay vì giả định đạt.

**Art pipeline:** mỗi asset có mã, phiên bản, chủ sở hữu/giấy phép, kích thước, nền trong suốt, điểm neo, vùng chạm, các trạng thái, quy tắc bóng/ánh sáng, và kiểm tra không cắt chậu/cây ở mọi tỉ lệ. Bốn chậu mẫu và moodboard ở đầu file phải được kiểm tra file thực và quyền sử dụng trước khi đưa vào build.

### 17.6 Xã hội, nội dung dài hạn và chống lạm dụng

- Thăm vườn, tưới/bắt bọ giúp và xem bộ sưu tập là trọng tâm xã hội; không thêm trộm trên mây, giao dịch trực tiếp hay bảng tin mua bán ở V2.
- Mọi thưởng giúp bạn có quota hai phía và thao tác nguyên tử theo §13/§15; không cho tài khoản phụ nhân bọ hiếm. Bảng xếp hạng chỉ dùng dữ liệu server xác minh, công khai tối thiểu.
- Sự kiện, bộ chậu theo mùa và thành tựu không được là nguồn duy nhất của tài nguyên mở tầng. Chậu sự kiện đã sở hữu không biến mất sau mùa; nội dung giới hạn có đường thay thế hợp lý.
- Theo dõi retention theo cohort (D1/D7/D30), tỉ lệ vào mây, tỉ lệ quay lại đất sau mây, số công thức hỗn hợp đã chế biến, mốc kẹt tầng, tỉ lệ nâng sao, độ trễ và lỗi thao tác. Chỉ thu telemetry tối thiểu, không ghi bí mật hoặc dữ liệu cá nhân không cần thiết.

### 17.7 Lộ trình triển khai và cổng nghiệm thu V2

> **→ §0.3:** đã gộp vào G0–G6. V0 ≈ G0, V1 ≈ G1 + G2, V2 ≈ G2 + phần đầu G3, V3 ≈ G3–G4, V4 ≈ G5–G6.

| Giai đoạn | Phạm vi bắt buộc | Cổng hoàn thành |
|---|---|---|
| V0 — Chốt đặc tả | audit code/asset, registry hạt–vật phẩm–chậu, công thức đầu game, đường mở T2/T3, wireframe mobile, chính sách khách | không còn phụ thuộc vòng, có nguồn thường trực và bảng cân bằng đầy đủ cho nội dung định triển khai |
| V1 — Vertical slice | 1 tầng, 3 chậu, 3 cây, trồng/tưới/bọ/thu, chuyển cảnh, kho chung, **ít nhất một công thức hỗn hợp khả dụng** | người chơi đi đất → mây → thu → chế biến/dùng sản phẩm dưới đất; mobile thật thao tác được; server xác minh kinh tế hoặc chạy sandbox cách ly |
| V2 — MVP | tầng 1–3, mua ô/chậu, tutorial, máy đầu game, nhiệm vụ, nguồn Hạt Mây/Sương Mai chắc chắn, đồng bộ online | qua ma trận §16, retry/race không nhân thưởng, bản lưu cũ không mất dữ liệu |
| V3 — Chiều sâu | nâng sao/thăng bậc, công thức xếp, bộ sưu tập, preset, máy/đơn lớn; mở tầng 4–5 khi đủ nguồn | mô phỏng nhiều seed/hồ sơ ≥90 ngày, không kẹt và không vòng lời vô hạn |
| V4 — Mở rộng | trợ thủ, bạn bè/quota, sự kiện, mở tầng 6–10, bổ sung 36 chậu/15 cây | kiểm thử chống lạm dụng, art/mobile/performance và vận hành đạt cổng §16 |

**Không triển khai đồng thời tất cả hệ thống.** V1 phải là lát cắt chơi thật, không chỉ mockup. Mỗi giai đoạn có feature flag, test reducer/parser/guard/API, kiểm thử lỗi mạng/đổi tài khoản/hai thiết bị, dữ liệu demo tách khỏi tài khoản thật. Không đổi schema/version luật chỉ vì tài liệu ghi con số; xác minh mã hiện tại trước khi migration.

### 17.8 Danh sách quyết định cần chốt trước khi code

Cập nhật 2026-10-08 theo §0:

- [~] Xác minh file art 1–6 và quyền sử dụng; chốt style guide, kích thước/anchor. File và kích thước đã kiểm
  tra. Style và lớp art chốt ở §0.7. **Còn thiếu:** người dùng xác nhận quyền (Q6).
- [x] Đối chiếu registry nguyên liệu đất hiện tại; chọn công thức hỗn hợp đầu tiên có đủ nguyên liệu thật:
  MIX01 (mật ong), §0.4.
- [x] Chốt nguồn Hạt Mây/Sương Mai trước T2/T3 và quà hướng dẫn chỉ nhận một lần: §0.4.
- [~] Chốt kinh tế hạt, sản lượng, giá, XP, thời gian, giới hạn ngày: xong cho G2 (§0.4, §0.5). Tầng 4–10 chờ mô
  phỏng ở G3.
- [x] Chốt thứ tự hiệu ứng chậu và trần: §0.6. Cộng hưởng 2/4/6 và preset hoãn đến G6.
- [x] Chốt cách xác minh online/server, khách và RNG bọ/nâng sao: §0.2. Chính sách khách khi đăng nhập chờ Q5.
- [ ] Duyệt wireframe desktop/mobile (bố cục §0.7, chờ Q4), tương tác thay kéo thả, giảm chuyển động và âm thanh.
- [ ] Chạy mô phỏng ≥90 ngày và kiểm thử ma trận §16 trước khi bật kinh tế chung (G3).



## 18. Asset Decomposition & Scene Architecture — dựng game từ ảnh tham chiếu (2026-10-08)

> **Trạng thái:** đặc tả triển khai cho G0–G1, không khẳng định đã tách asset hoặc đã có code. Ảnh chụp màn hình người dùng cung cấp là **visual reference** để phân tích bố cục, không phải sprite sheet có thể dùng ngay. §0 vẫn ưu tiên về luật gameplay và lưu dữ liệu; quyết định Q4 cập nhật tại §0.1 là cổng chốt responsive.

### 18.1 Nguyên tắc tách và dựng lại

- **Không crop cả vùng màn hình rồi dùng như asset game:** vật thể đang chồng lên nhau; ảnh cắt có thể dính cây/chậu khác, mất viền, bóng hoặc chi tiết bị che. Chỉ cắt trực tiếp các phần thật sự nguyên vẹn, còn lại phải **vẽ/render lại độc lập** theo style guide, không bịa ra phần bị che rồi coi là ảnh gốc.
- Giữ **đồ họa nguyên bản có quyền sử dụng**; ảnh tham chiếu lấy cảm hứng bố cục/game feel, không sao chép trực tiếp nhân vật, icon, UI thương hiệu, số liệu hay tài sản có bản quyền của Zing để phát hành. Q6 và bằng chứng quyền asset là cổng bắt buộc.
- Mỗi đối tượng tương tác là sprite/instance độc lập, dữ liệu logic tách khỏi ảnh. Không bake tên, số xu/XP, số tầng hoặc trạng thái cây vào background.

### 18.2 Danh mục asset và độ ưu tiên

| Nhóm | Asset độc lập cần có | Cách dựng | Ưu tiên |
|---|---|---|---|
| Background | trời, mây xa, núi, làng/chợ chân tháp | lớp parallax, không có UI hay chậu dính vào nền | G1 |
| Tầng mây | platform màu xanh/tím/trắng/hồng, biến thể khóa/mở, cờ tầng | 1 platform có vùng đặt 6 ô, skin theo tầng | G1 |
| Cây đậu thần | thân, nhánh/lá, đỉnh, trang trí | chia đoạn để lặp chiều cao không lộ mối nối | G1 |
| Chậu | 4 chậu nguồn + chậu tạm; sau đó bộ sưu tập | PNG RGBA/WebP alpha, đất và miệng chậu rõ | G0–G1 |
| Cây trồng | 4 giai đoạn cho cây thử, trạng thái chín | sprite độc lập đặt tại điểm neo đất | G1 |
| Bọ và hiệu ứng | bọ bay/đậu/bắt, lấp lánh, bong bóng chín, thu hoạch | sprite/animation riêng, không làm thay đổi dữ liệu khi chỉ chạy hiệu ứng | G1 |
| Máy và trợ thủ | máy ở đầu tầng, nhân vật/đồ trang trí | asset riêng, có z-index và hitbox | G1 demo, gameplay sau |
| HUD | avatar, XP, xu, kho, cửa hàng, nhiệm vụ, tưới, hạt, thu hoạch | icon riêng; chữ/số render động bằng code và i18n | G1 |

**Cấu trúc file gợi ý** (xác minh convention repo trước khi tạo): `public/images/sky-garden/{backgrounds,platforms,beanstalk,pots,plants,bugs,machines,effects,ui}/`; registry ở `src/data/skyGardenAssets.ts` hoặc module tương ứng. Không đổi đường dẫn hiện có nếu đã có asset chuẩn.

### 18.3 Hợp đồng sprite, điểm neo và phân lớp

- Registry mỗi asset có: `assetId`, `sourcePath`, `displaySize`, `bounds`, `pivot`, `zLayer`, `variants`, `licenseStatus`, `assetVersion`. Chậu thêm `soilAnchor {x,y,rx,ry}` theo tọa độ chuẩn hóa [0..1], `potHitbox`; cây có `rootAnchor`, `growthStage` và `plantHitbox`.
- Thứ tự vẽ đề xuất: **sky far → landscape → beanstalk behind → cloud platform → pot back/soil → plant → pot front (nếu asset tách được) → bug/effect → HUD**. Nếu chậu chỉ có một sprite, phải test occlusion để cây mọc từ đất thay vì nổi phía trước thành chậu.
- World scene có **6 slot ID cố định mỗi tầng**, tọa độ world độc lập viewport. Camera/viewport quyết định vị trí hiển thị; đổi zoom/layout không sửa `slotId`, UID chậu, tiến trình cây hoặc logic bộ chậu.
- Hitbox dùng tọa độ world được biến đổi qua camera, không dựa trên pixel sáng hay vùng alpha; chạm bọ phải ưu tiên hitbox bọ, không kích hoạt thu hoạch chậu bên dưới. Các nút thao tác chính cần vùng chạm ≥44 CSS px trong chế độ tương tác.
- Tải ảnh theo vùng nhìn thấy; giữ nguồn art chất lượng cao, xuất phiên bản WebP phù hợp DPI. Nếu thiếu sprite thì hiển thị placeholder, không crash scene.

### 18.4 Hai chế độ camera / mobile (liên kết Q4)

1. **Toàn cảnh (overview):** giữ cảm giác tháp mây nhiều tầng và 1×6 chậu/tầng như ảnh người dùng. Có cuộn dọc, zoom/pan hợp lý; chỉ thao tác chọn tầng hoặc điều hướng, không yêu cầu bắt bọ/chạm chậu nhỏ.
2. **Tương tác tầng (focus):** chạm tầng → phóng to tầng hoặc mở panel chi tiết, đủ 6 slot và các nút trồng/tưới/thu; giữ thứ tự slot, cho phép 1×6 có pan ngang hoặc 2×3 nếu test khả dụng tốt hơn. Có nút trở về overview và bảo toàn vị trí cuộn.
3. **Desktop/tablet:** ưu tiên 1×6 nếu ô đủ lớn; điều khiển chuột và chạm có cùng kết quả. Không gắn cố định chiều cao tầng theo pixel của ảnh mẫu.
4. **Quyết định cuối Q4 ở G1:** đo 360×800, 390×844, 430×932, 768 px và 1366 px; chụp overview/focus, ghi kích thước hitbox, tỷ lệ chậu nhìn thấy, FPS, lỗi che khuất; người dùng duyệt 1×6 focus hay 2×3 focus. Không thay đổi Q4 từ trạng thái chờ kiểm chứng thành “đã duyệt” nếu chưa có test.

### 18.5 Quy trình triển khai theo lát cắt

- **G0 – Asset audit:** đánh dấu trên ảnh tham chiếu từng nhóm đối tượng, lập manifest (asset ID, có sẵn/cần dựng lại, bản quyền, độ phân giải, alpha, anchor). Duyệt 4 chậu thật theo §0.10.3; không dùng các crop lỗi của ảnh kệ làm nguồn chính.
- **G1a – Scene không gameplay:** dựng background + đậu thần + 3 tầng + 6 slot/tầng + 4 chậu thật/chậu placeholder; hỗ trợ cuộn và chuyển overview/focus trên mobile.
- **G1b – Motion:** cây 4 giai đoạn, bọ, bong bóng chín, máy và hiệu ứng; HUD bằng dữ liệu demo, không ghi vào `/account/progress`.
- **G1c – Chốt layout:** test máy thật và đo hiệu năng, duyệt Q4, sửa z-index/hitbox/anchor, ghi video/ảnh và bảng PASS/REWORK. Chỉ sau đó mới nối gameplay thật G2.

### 18.6 Tiêu chí nghiệm thu riêng cho scene

- [ ] Có asset manifest và danh sách rõ **crop được / phải dựng lại / chưa có quyền**; không đưa nguyên ảnh màn hình vào làm scene sản xuất.
- [ ] 3 tầng demo có đủ 6 vị trí logic/tầng; ít nhất 4 chậu nguồn render đúng, không mất viền/quai, không dính chậu khác, nền alpha thật.
- [ ] Cây đứng đúng vùng đất ở cả 4 giai đoạn; không lơ lửng, không xuyên viền trước; bọ đậu đúng cây và bắt bọ không thu hoạch nhầm.
- [ ] Đổi overview ↔ focus và cuộn không làm thay đổi UID/slot/trạng thái demo; trở về đúng tầng đang xem.
- [ ] HUD động không chứa số tiền/XP cố định trong ảnh; chữ vi/en không bị cắt, nút không che chậu ở viewport đã chốt.
- [ ] Chế độ focus đạt vùng chạm ≥44 px, overview không tràn ngang; thử thiết bị thật và đạt cổng FPS G1 ở §0.10.4.
- [ ] Không ghi dữ liệu demo vào tài khoản; thiếu asset có fallback; có reduced motion; quyền sử dụng asset được xác minh trước phát hành.


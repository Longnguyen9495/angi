# Nông trại (mục 3) và nhiệm vụ, thành tựu (mục 5): đã làm và plan còn lại

Ghi ngày 03/10/2026, theo [viec-con-lai.md](viec-con-lai.md) mục 3 và mục 5. Checklist thử trên máy thật: [kiem-tra-dien-thoai.md](kiem-tra-dien-thoai.md).

## 1. Mục 5: nhiệm vụ và thành tựu (đã làm theo [plan](nhiem-vu-va-thanh-tuu-mo-rong.md))

- **Nhiệm vụ ngày:** 4 → 5 (`d-choose` + 4 cái bốc). Pool 15 → 26, thêm mức khó (gieo 5, tưới 5, thu 6, nấu 2, câu 4, kiếm 30 xu) và việc mới (mật ong, thuyền, cây ăn quả, nấm, chấm điểm bữa).
- **Nhiệm vụ tuần:** 3 → 4. Pool 10 → 22.
- **Bốc nhiệm vụ:**
  - không bao giờ có hai nhiệm vụ cùng loại trong một ngày hay một tuần;
  - tối đa một nhiệm vụ bạn bè;
  - không bốc việc người chơi chưa làm được (chưa có tổ ong, thuyền, cây ăn quả, khối nấm, vật nuôi, bạn bè, hay đã nấu hết công thức).
- **Chỉ số mới:** `honey` (tách khỏi `collect`), `boat`, `fruit`, `mushroom`, `earn`, `rate`, `newRecipe`, `allDaily`, `decor`, cùng trường lưu `grown` (các loại cây đã từng thu hoạch). Bản lưu cũ đọc được mà không cần đổi phiên bản.
- **Thành tựu:** 9 → **28**. Bỏ `critic` so với plan, vì lịch sử bữa chỉ giữ 30 bữa nên bậc 100 không bao giờ đạt được.
  - Chia 4 kệ: Bữa ăn, Vườn, Trại & chợ, Bạn bè & chung.
  - Kệ có thành tựu sẵn nhận tự mở và gắn nhãn "n sẵn nhận".
  - Thẻ xếp theo thứ tự: sẵn nhận, gần xong, đã xong hết.
  - Bậc hiện bằng chấm ●●○○; đầu khu có dòng "x/28 đã xong hết bậc".
- **Phần thưởng thành tựu:** bậc 1–2 như cũ. Từ bậc 3 trở đi thưởng nhiều xu và hạt hơn thay vì XP. Thành tựu "Lên đời" không thưởng XP.
- **Thuyền** tính lúc đón thuyền về (server kiểm được), không tính lúc ra khơi.
- **Phía server** (đã có chống gian lận nên bắt buộc phải làm):
  - Luật xuất cho server giờ có phần thưởng từng bậc và chỉ số của mỗi thành tựu.
  - ProgressGuard tự đếm thêm 11 chỉ số: gieo, check-in, ảnh, thu sản phẩm vật nuôi, mật ong, thuyền, bán, xu kiếm, quả, nấm, loại cây.
  - Tưới (không có trong ledger) được giới hạn 15 lần mỗi ngày tuổi tài khoản.
  - Tài khoản cũ được lấy số đã có làm nền, nên không bị từ chối khi nhận thành tựu.
  - Thưởng mời bạn chỉ tính XP tự làm ra, không tính XP từ nhiệm vụ, thành tựu, rương hay bạn bè.
- **Test:**
  - `quests.test.ts` có thêm 7 ca: chữ vi/en đủ cho mọi nhiệm vụ và thành tựu, bốc không trùng loại, cấp 1 không bị bốc việc không làm được, từng chỉ số mới tăng đúng chỗ, `allDaily` chỉ đếm một lần, bản lưu 4 nhiệm vụ hôm nay giữ 4 và mai thành 5, "Lên đời" không cộng XP.
  - Bot chơi 7 ngày (`progressGuard.test.ts`) giờ nhận cả nhiệm vụ và thành tựu mới, và cả 85 bản lưu đều qua server.

## 2. Mục 3: nông trại

| Việc | Trạng thái |
|---|---|
| Thử trên điện thoại các thay đổi đợt trước | **Đã làm** bằng kịch bản chạm thật trên 3 cỡ màn (mục 4). Có checklist cho máy thật |
| Toast che thẻ ô đất, khay hạt (từ plan nhiệm vụ mục 10) | **Đã sửa.** Toast luôn nằm ngay trên phần cao nhất ở đáy (khay hạt, hoặc thẻ ô đất khi đang mở); đo lại khi thẻ đổi cỡ hoặc khi toast mới hiện |
| Ghé vườn bạn còn dùng đảo 3D | **Đã chuyển sang cảnh 2D** (mẫu thử, `FriendFarm.tsx`): cùng cảnh vẽ với nông trại mình, phóng vào khu ruộng; bong bóng giọt nước để tưới giúp, bong bóng giỏ để hái; danh sách ô bên dưới vẫn còn. Đảo 3D vẫn mở được bằng `?visit=3d` |
| Bong bóng cho ô trống khi có hạt | **Đã làm.** Ô trống có bong bóng hạt đang chọn (viền xanh lá); chạm bong bóng là gieo ngay, chạm thân ô thì mở thẻ như cũ |
| Bò đi lại | **Plan** ở mục 3.1 (cần tranh mới) |
| Đáy đảo cắt thẳng | **Plan** ở mục 3.2 (cần chụp màn rộng để xác nhận) |
| Vật phẩm 70/150, hình chưa chắc loài | **Plan** ở mục 3.3 (cần hoạ sĩ hoặc sinh ảnh) |

### Lỗi tìm ra khi thử trên điện thoại (đã sửa)

1. **Gợi ý "Kéo để xem cả nông trại" đè nút "Chuồng & ao" / "Ruộng".** Trên điện thoại gợi ý nằm ở đáy +84px, nút ở +90px. Đã đưa gợi ý lên trên nút (+138px).
2. **Nút × thu gọn thẻ gợi ý chỉ 26×26px.** Đã nâng lên 36×36px.
3. **Toast che thẻ ô đất sau khi bấm "Thu hoạch" trong thẻ.** Thẻ cao thêm (gợi ý món nấu) nhưng vị trí toast không tính lại. Đã sửa bằng ResizeObserver và MutationObserver.
4. **Thẻ ô đất đang mở không chuyển sang "Thu hoạch" khi cây vừa chín.** Đồng hồ game chỉ cập nhật mỗi phút. Thẻ đang mở giờ cập nhật mỗi 5 giây.
5. **Màn nhỏ (360px): chạm khối nấm đã chín lại tưới nhầm ô phía trước.** Bong bóng của ô phía trước, với phần đệm ngón tay 14px, phủ lên thân ô phía sau. Giờ phần đệm chỉ có tác dụng khi ngón tay không nằm trên một ô khác; nếu đang trên ô khác thì phải chạm đúng hình bong bóng.
6. **Cảnh nhà bạn trong bảng bị co nhỏ, khó chạm.** Thêm tuỳ chọn `zoom` cho cảnh (phần ghé vườn dùng 1,7).

## 3. Plan cho các việc cần vẽ

### 3.1 Bò đi lại
- **Vì sao chưa làm được:** tranh chuồng đang có sẵn con bò vẽ dính, đứng trước nền tối. Bò ở nhà thì bị mái chợ che một nửa ([nong-trai-v5-ban-giao.md](nong-trai-v5-ban-giao.md)).
- **Cần từ hoạ sĩ:**
  1. Chuồng bò không có bò, cùng góc nhìn và ánh sáng.
  2. Bò tách lớp (thân, đầu, chân trước, chân sau, đuôi), hoặc dải 6–8 khung đi bộ cho 2 hướng.
  3. Bò đứng ăn cỏ (2–3 khung).
- **Code khi có hình:**
  - thêm lớp bò vào `systems/` của `farm-anim`, như gà và ngỗng đang có;
  - bò đi trên một đường ray trong sân, dừng ở máng khi đói;
  - bong bóng và vùng bấm đi theo con bò (hiện đang cố định trong `layout.places.cowSpots`).
- **Kiểm tra:** thêm bước vào `phone-check.mjs`: chạm bò khi đói hoặc khi có sữa, ở cả 3 cỡ màn.

### 3.2 Đáy đảo cắt thẳng
- Trên điện thoại, đáy đảo nằm dưới khay hạt và dock nên không thấy. Commit `c63d78f` đã thêm biển mây dưới đảo.
- **Cần làm:** chụp màn rộng (1280×800, 1920×1080) và màn ngang điện thoại (844×390) bằng `node scripts/screenshot-page.mjs "journey" storage/x.png .fg 6000`.
  - Nếu vẫn thấy đường cắt thẳng: kéo dài lớp vách đá trong tranh, hoặc vẽ thêm chân đảo nhỏ dần.
  - Nếu không thấy: đóng việc.

### 3.3 Vật phẩm nông trại (khoảng 70/150)
Theo [vat-pham-nong-trai.md](vat-pham-nong-trai.md) mục 6, ưu tiên theo mức người chơi thấy nhiều:
1. Hình nông sản riêng (không có đất hay cây) cho các rau và cây ăn quả đang mượn hình giai đoạn chín. Thấy ở Kho, Chợ, thông báo, bong bóng.
2. Giai đoạn còn thiếu (cà rốt, khoai lang, khoai môn; mầm của 7 cây ăn quả khối B).
3. Xác nhận loài cho các hình mức "medium" hoặc "low"; hình nào sai loài thì vẽ lại.
4. Tổ ong không có ong vẽ dính, và con ong nét hơn.

Cách làm như đợt pack-v4: sinh hoặc vẽ ra sheet, chạy `npm run assets:farm-items` để cắt và gắn, rồi `src/domain/farmItems.test.ts` kiểm. Cây mới thì chạy thêm `npm run rules:export`; server không còn danh sách cây riêng, ghi chú cũ trong `vat-pham-nong-trai.md` mục 7 đã hết đúng.

## 4. Kết quả kiểm tra điện thoại

Chạy ngày 03/10/2026 trên `http://angi.local`, dùng bản build mới nhất:

| Kịch bản | android-360 | iphone-390 | iphone-440 |
|---|---|---|---|
| `phone-check.mjs` (nông trại, bảng, nhiệm vụ, câu cá, chợ, bếp) | 104/104 | 104/104 | 104/104 |
| `phone-check-account.mjs` (đăng nhập, bạn bè, link mời, ghé vườn 2D, đăng xuất) | 18/18 | 18/18 | — |

Unit test (vitest): 288/288. Typecheck sạch. Eslint: 0 lỗi, còn 2 cảnh báo cũ. Các PHP selftest đều qua.

### Lỗi tìm thêm trong đợt chạy cuối (đã sửa)
7. **Bấm "Thu hoạch" trong thẻ ô đất ngay khi cây vừa chín thì không thu được gì.**
   - Nguyên nhân: danh sách ô chín tính theo đồng hồ phút, còn thẻ chuyển sang "Thu hoạch" theo nhịp 5 giây. Thẻ vẫn báo "Đã thu" nhưng không có toast.
   - Đã sửa: `harvestAll` trong `FarmGame.tsx` giờ tính ô chín theo giờ hiện tại, và thẻ chỉ báo "Đã thu" khi thật sự thu được.
8. **Thư đăng nhập gửi tới địa chỉ test.**
   - `Mailer.php` không gửi thư tới tên miền dành riêng (`.invalid`, `.test`, `example.com`…) nữa, mà chỉ ghi vào log.
   - Trước đây kịch bản test gửi thư thật qua Gmail tới địa chỉ giả, và hỏng luôn khi máy không kết nối được Gmail.

### Bộ kiểm tra giờ nhẹ cho máy
- Cảnh nông trại được vẽ bằng card đồ hoạ. Trước đây vẽ bằng CPU, chỉ khoảng 4 fps nên làm treo máy.
- Trình duyệt test chạy ở mức ưu tiên thấp, độ nét DPR 1, và chỉ chụp ảnh ở các bước quan trọng hoặc khi có lỗi.
- Thời gian cho một máy giảm từ khoảng 15–20 phút xuống khoảng 2 phút. Tải CPU trung bình khoảng 46%; máy vẫn dùng bình thường.
- Cách chạy xem [kiem-tra-dien-thoai.md](kiem-tra-dien-thoai.md).

### Còn lại
- Thử trên máy thật theo checklist A–H trong [kiem-tra-dien-thoai.md](kiem-tra-dien-thoai.md).
- Mục 3.1–3.3 cần tranh vẽ.
- Code mục 3 và 5 chưa commit và chưa deploy.

## 5. Rà soát lại bảo mật, chống gian lận và lỗi (03/10/2026)

4 agent rà song song: chống gian lận, bảo mật API, bảo mật trình duyệt, lỗi logic. Mọi phát hiện đều được kiểm chứng lại trước khi sửa. Phần lớn lỗ chống gian lận đã có từ đợt deploy trước, nên **bản đang chạy trên VPS cũng bị**, cho tới khi deploy đợt này.

### Chống gian lận (`server/lib/ProgressGuard.php`): đã sửa, kiểm bằng kịch bản tấn công thật

| Lỗ | Cách chặn |
|---|---|
| Hạt giống "đơn hàng" vô hạn (`order:…:seed:`) không cần đơn | Chỉ trả kèm mục XP của chính đơn đó, đúng loại cây, không quá số hạt tối đa |
| Nhận phần xu/hạt của rương, thành tựu, nhiệm vụ mà không nhận phần chính | Phần phụ phải đi cùng mục chính trong cùng lần lưu |
| Viết số kiểu `e05`, `01`, `-0` để nhận lại cùng một phần thưởng | Mọi số trong khoá phải viết một kiểu duy nhất |
| Trồng không tốn hạt, cho ăn không tốn thức ăn | Trồng phải trừ đúng 1 hạt, cho ăn phải trừ đúng 1 thức ăn của con đó |
| Trồng chồng lên ô đang có cây; nhiều tổ ong, nhiều chuyến thuyền, nhiều lần cho ăn cùng lúc | Mỗi ô một vụ, mỗi con một lượt, tổ ong và thuyền lần lượt từng chuyến (dọn ô bằng tay được 1 lần mỗi lượt lưu) |
| Tua đồng hồ 10 phút mỗi lần lưu, nhiều lần liền | Tổng mức lệch trong một ngày không quá 10 phút; có giới hạn số lần lưu mỗi giờ |
| Chỉnh lại đồng hồ (rebase) để mở ngày mới sớm | Chỉnh về gần giờ thật thì không giới hạn, chỉnh xa giờ thật thì 1 lần mỗi tuần; không quá 400 ngày |
| Hoàn lại hạt giống bữa ăn không mất gì (`:reverse` = 0) | Hoàn lại phải trừ đúng 1 hạt |
| Chuỗi ngày tăng 2 mỗi lần lưu | Chuỗi ngày được neo vào một ngày của server, mỗi ngày tăng tối đa 1 |
| Nhiệm vụ ngày của nhiều ngày khác nhau; nhiệm vụ tuần với ngày bất kỳ | Nhiệm vụ ngày phải là hôm nay (xét múi giờ), nhiệm vụ tuần phải là thứ Hai của tuần đó |
| Giới hạn 2000 XP chỉ tính trên một lần lưu | Thêm hạn mức 20.000 XP mỗi ngày của server |
| Tem món ăn bịa ra; công thức bịa ra | Món phải có trong bảng `dishes`; tem "đã ăn" phải đi kèm một lần check-in "đã ăn" |
| Giới hạn câu cá chỉ đếm những gì client gửi | Đếm thêm các lượt câu server đã ghi nhận, theo thời điểm thả câu |
| Số liệu nền của thành tựu đọc lười từ bản lưu mà client tự sửa được | Bỏ đọc lười. Khi deploy, schema v4 tự điền số liệu nền một lần từ bản lưu lúc đó (`backfillBases`) |
| Thay nông trại đè lên tài khoản đang có: lấy lại số liệu nền và thành tựu | Không ghi đè số liệu nền cũ; thay đè tối đa 2 lần, nhập nông trại tối đa 3 lần mỗi tuần |

Server **từ chối nhầm người chơi thật**, đã sửa:
- "Vườn trăm thứ" của tài khoản cũ;
- "Bình tưới", "Chăm chỉ" của người chơi khách vừa đăng ký;
- thứ tự bậc thành tựu sau khi nhập nông trại;
- giới hạn câu cá sau khi nhập nông trại.

Kiểm chứng:
- Cho đăng ký ở cả 84 thời điểm trong tuần chơi của bot: mọi bản lưu sau đó đều được chấp nhận.
- Người chơi dùng bản app cũ (bảng thưởng thành tựu cũ) vẫn nhận thưởng được, nhờ `legacyRewards` trong luật xuất cho server.

Kết quả:
- Bot chơi trung thực 7 ngày: 85/85 bản lưu được chấp nhận.
- `progressGuard.test.ts`: 22 kiểu gian lận đều bị chặn đúng lý do (thêm 6 kiểu mới).
- 28 kịch bản tấn công của agent: tất cả bị chặn, trừ 3 trường hợp có chủ ý ở mục "Còn để ngỏ".

### Bảo mật API: đã sửa
- Giới hạn tần suất theo dải IPv6 /64 (`ip_bucket`), không theo từng địa chỉ.
- Thử mã đăng nhập: giới hạn 60 lần mỗi giờ mỗi mạng.
- Email có phần trong ngoặc kép hoặc địa chỉ dạng `[IP]` bị từ chối.
- Đăng nhập lại trên cùng trình duyệt thì huỷ phiên cũ.
- Kết bạn: tối đa 20 lần mỗi giờ mỗi người, 40 lần mỗi giờ mỗi mạng (chặn dò mã).
- Admin:
  - mỗi lần đăng nhập được đếm trước trong một giao dịch, nên gửi song song không lách được;
  - khi bộ đếm toàn site đầy, admin có TOTP vẫn vào được, nên không bị khoá vĩnh viễn.
- Admin xoá người dùng giờ dùng chung `Account::deleteUser`, nên dọn cả claims, số liệu và referral.
- `/api/reverse`: kiểm hạn mức trước, khoá không xếp hàng nên không giữ chặt PHP worker.
- Regex đường dẫn ảnh/video: dùng `\z`, không còn nhận ký tự xuống dòng ở cuối.
- Mailer: không gửi thư tới tên miền dành riêng.
- Mẫu nginx: chưa có cookie admin thì không nhận file tải lên 64 MB (`deploy/nginx/angi.conf`).

### Trình duyệt: đã sửa
- **Link đăng nhập bị chuyển tiếp:**
  - Hộp xác nhận giờ hiện đủ email, không che bớt.
  - Đăng nhập qua link từ trình duyệt khác thì không tự đẩy nông trại khách lên tài khoản mà hỏi trước.
- **Link mời `?ban=MÃ`:** không tự kết bạn nữa; hiện thông báo có nút "Kết bạn".
- **Đăng xuất, xoá tài khoản hay đổi tài khoản:** xoá luôn ảnh bữa ăn trên máy.
- `Object.hasOwn` thay cho `x in CROPS` (trước đây `constructor` cũng bị coi là một loại cây).

### Lỗi logic: đã sửa
- Danh sách nhiệm vụ không xáo lại sau khi đã hiện:
  - chốt khi mở app (`ROLL_QUESTS`);
  - xáo cả pool trước rồi mới lọc.
- Không bốc nhiệm vụ không làm được:
  - "món mới" chỉ khi còn món nấu được;
  - "hái quả" hay "hái nấm" trong ngày chỉ khi có cây chín trước nửa đêm.
- Kệ thành tựu không tự đóng sau khi nhận.
- Toast được đặt lại vị trí cho từng thẻ ô đất.
- Sửa lỗi chính tả "vắt chanh".

### Còn để ngỏ (cần quyết định hoặc làm sau)
- **Thay nông trại đè lên tài khoản đang có** vẫn được nhập tới 20.000 XP và 100.000 xu, tối đa 2 lần mỗi tuần.
  - Lý do giữ: đây là đường người dùng thật đi khi chọn "giữ bản trên máy này".
  - Cách này không còn lấy thêm được thành tựu hay thưởng mời bạn.
  - Nếu muốn chặt hơn: chỉ cho thay bằng nông trại không lớn hơn bản đang có.
- **Số lần tưới** vẫn tin theo client, có trần 15 lần mỗi ngày tính theo tuổi tài khoản (ledger không ghi việc tưới).
- **Mục tiêu nhiệm vụ** (ví dụ "thu hoạch 6 lần") server chưa đếm theo từng ngày. Hiện chỉ bị giới hạn bởi:
  - ngày của nhiệm vụ phải là hôm nay hoặc tuần này;
  - tối đa 5 nhiệm vụ ngày và 4 nhiệm vụ tuần;
  - hạn mức XP mỗi ngày.
- **Chưa có CSP cho trang chính.** Cần thử với YouTube, font chữ và WebGL trước khi bật.
- **Giới hạn gửi mã đăng nhập** vẫn có trần toàn site 300 lần mỗi giờ. Kẻ xấu có nhiều IP có thể làm đầy nó, khiến không ai đăng nhập được trong 1 giờ.
- **Deploy:**
  - Lần gọi API đầu tiên sau deploy sẽ chạy migration schema v4 (điền số liệu nền).
  - Mẫu nginx mới phải chép tay sang file cấu hình đang chạy trên VPS.

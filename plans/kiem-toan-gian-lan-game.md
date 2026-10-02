# Kiểm toán gian lận game và kế hoạch khắc phục

Ngày rà soát: 02/10/2026. Phạm vi: logic game, lưu/đồng bộ tiến độ, API tài khoản, bạn bè, referral, xác thực và cấu hình triển khai liên quan. Lượt đầu chỉ đọc mã nguồn và lập kế hoạch. Lượt kiểm thử bổ sung cùng ngày đã chạy regression/đối kháng trên dữ liệu cách ly, không sửa logic game/backend và không gửi yêu cầu tới server thật; kết quả và giới hạn xem mục 7. Các kết luận không phải chứng nhận an toàn toàn hệ thống. Phần catalogue, AI, upload và review được kiểm tra ở ranh giới truy cập liên quan; chưa phải kiểm toán chuyên sâu toàn bộ các dịch vụ đó.

Bổ sung cùng ngày: [kiểm toán bảo mật toàn project](kiem-toan-bao-mat-project.md) mở rộng source–sink XSS, injection, media/upload, AI/review outbound, auth/privacy và deployment; có phân loại proven/suspected/no-evidence, actual isolated tests và kế hoạch triển khai. Báo cáo bổ sung không vá implementation và không thay thế các findings gian lận dưới đây.

## 1. Kết luận chính

Game hiện có kiến trúc **trình duyệt làm chủ trạng thái**. Người chơi tự tính phần thưởng, số dư, thời gian và lịch sử; máy chủ lưu bản chụp này và dùng nó để xét tương tác giữa tài khoản. Vì vậy không thể sửa hết gian lận chỉ bằng khóa giao diện, làm rối mã hoặc thêm checksum trong trình duyệt.

Nguồn: [`GameProvider`](../src/state/GameProvider.tsx:8), [`gameReducer()`](../src/domain/reducer.ts:278), [`saveProgress()`](../src/domain/persistence.ts:300), [`Account::putProgress()`](../server/lib/Account.php:192), [`Friends`](../server/lib/Friends.php:13).

Phân loại:
- **P0:** sửa dữ liệu trực tiếp; tạo quà không mất tài nguyên; giả tiến độ để trả thưởng referral; vô hiệu hóa hậu quả bị hái trộm.
- **P1:** giả thời gian, chọn kết quả câu cá/thuyền, replay, lỗi nguyên tử, race quota và OTP, đồng bộ mất dữ liệu.
- **P2:** siết schema, chốt quy tắc check-in/ảnh, bảo vệ tài khoản/admin và vận hành.

P0 ở đây là ưu tiên tính toàn vẹn kinh tế game, không ngụ ý đã chứng minh chiếm máy chủ hoặc chiếm tài khoản người khác.

## 2. Các phát hiện

### F01 — P0: Tự sửa tiền, XP, kho và quyền mở khóa rồi lưu lên tài khoản

**Xác nhận trong mã.** [`Account::putProgress()`](../server/lib/Account.php:192) chỉ yêu cầu dữ liệu dạng mảng có định danh khách, giới hạn 512 KB và phiên bản khớp; không xác minh số dư, nguồn tài nguyên, ledger, thời gian hay hành động hợp lệ. [`parseProgress()`](../src/domain/persistence.ts:161) chỉ kiểm tra một phần cấu trúc phía trình duyệt.

Chuỗi gian lận: sửa bản lưu trình duyệt hoặc gửi bản chụp tự tạo của chính tài khoản → máy chủ lưu → tải lại và tiếp tục chơi với dữ liệu giả. Có thể tự cộng tiền/XP/hạt/nguyên liệu, thêm decor, dấu món, vùng và cây mở khóa, nhiệm vụ hoàn thành, cây/vật nuôi đã đến hạn. Giới hạn phiên bản chỉ chống xung đột, không chống gian lận. Header ứng dụng tại [`Account::requireAppHeader()`](../server/lib/Account.php:276) là lớp bảo vệ yêu cầu cross-site, không phải bằng chứng hành động hợp lệ.

**Fix:** máy chủ giữ trạng thái chuẩn, chỉ nhận ý định hành động; tự tính giá, sản lượng, thưởng, điều kiện mở khóa và thời gian. Ngừng chấp nhận bản chụp kinh tế do client ghi tùy ý. Bản lưu cũ không thể xác minh lại toàn bộ vì lịch sử không đầy đủ.

### F02 — P0: Tặng hạt không có hạt; bỏ qua trừ kho

**Xác nhận trong mã.** [`Friends::gift()`](../server/lib/Friends.php:472) kiểm tra loại cây và quota nhưng không kiểm tra kho người gửi, không trừ hạt. Trừ hạt nằm ở [`GIFT_SENT`](../src/domain/reducer.ts:630), chỉ được giao diện gọi sau khi API thành công.

Chuỗi: gọi API tặng loại hạt hợp lệ dù kho bằng 0 hoặc cây chưa mở → bạn nhận hạt → người gửi không chạy bước trừ kho. Dùng nhiều tài khoản có thể bơm hạt quý cho tài khoản chính. Quota ngày hiện hạn chế tốc độ, không bảo đảm bảo toàn tài nguyên.

**Fix:** khóa trạng thái người gửi, kiểm tra sở hữu/mở khóa, trừ kho và ghi nhận quà trong cùng giao dịch; retry cùng định danh thao tác không tạo quà thứ hai. Kiểm tra hai yêu cầu tặng/tiêu cùng hạt cuối cùng.

### F03 — P0: Giả mốc mời bạn và tái tạo tài khoản để vượt tổng giới hạn

**Xác nhận trong mã.** [`Friends::milestoneValue()`](../server/lib/Friends.php:314) đọc XP và tally do client lưu; [`Friends::payReferrals()`](../server/lib/Friends.php:239) trả thưởng dựa trên dữ liệu đó.

Chuỗi: tài khoản mới kết bạn với người mời → lưu XP/tổng thu hoạch/nấu giả → đọc danh sách/sự kiện → cả hai nhận thưởng. Tổng đủ bốn mốc là **200 xu + 90 XP cho mỗi bên, mỗi tài khoản mới**.

Ngoài ra giới hạn 10 referral đếm các hàng hiện còn tồn tại tại [`Friends::recordReferral()`](../server/lib/Friends.php:218). [`Account::delete()`](../server/lib/Account.php:253) xóa referral và sự kiện liên quan; tạo lại tài khoản có thể giải phóng quota mà tiền đã cộng ở tài khoản người mời không bị thu hồi. Chuỗi tái tạo cần kiểm thử tích hợp, nhưng cơ chế xóa/quota đã rõ trong mã.

**Fix:** chỉ tính mốc từ hành động máy chủ đã ghi nhận; hạn mức lifetime độc lập với quan hệ đang tồn tại; thiết kế dữ liệu tổng hợp/tombstone chống tái nhận tương thích quyền xóa và chính sách lưu giữ. Không coi email hay IP là định danh một người tuyệt đối. Thêm tiêu chí đủ điều kiện và giám sát cụm tài khoản, tránh chặn nhầm gia đình dùng chung mạng.

### F04 — P0/P1: Bỏ qua bị hái trộm, tạo vườn giả và khai thác trạng thái cũ

**Xác nhận kiến trúc; race cần kiểm thử.** [`Friends::steal()`](../server/lib/Friends.php:428) tạo sự kiện, không trừ sản lượng trên trạng thái chủ vườn. [`FRIEND_EVENT`](../src/domain/reducer.ts:581) mới đánh dấu cây bị hái.

Chủ vườn có thể bỏ qua sự kiện, ACK mà không áp dụng hoặc ghi bản chụp bỏ cờ mất sản lượng; vẫn thu đầy đủ. Tài khoản phối hợp có thể lưu cây quý đã chín giả để tài khoản khác hái. Máy chủ cũng xét cây từ bản lưu có thể chậm hơn trạng thái đã thu hoạch; cần kiểm thử hái đồng thời với thu hoạch/trồng lại.

**Fix:** xác thực cây chuẩn và thực hiện giảm sản lượng ở máy chủ ngay trong giao dịch hái. Mỗi lần trồng/tái sinh có định danh chu kỳ không do client lựa chọn; khóa chu kỳ cùng thao tác thu hoạch/hái, rồi phát thông báo.

### F05 — P1: Đổi giờ/múi giờ để tăng trưởng nhanh và tái cấp quota

**Xác nhận trong mã.** Mọi hành động kinh tế dùng thời gian từ client tại [`Action`](../src/domain/reducer.ts:58). Ngày/bữa tính theo múi giờ thiết bị tại [`dateKey()`](../src/domain/time.ts:13), [`slotKey()`](../src/domain/time.ts:27), trong khi ngày xã hội theo UTC+7 tại [`Friends::day()`](../server/lib/Friends.php:101).

Đổi giờ tới tương lai cho thu hoạch, vật nuôi, ong, thuyền; nhảy ngày cho quota câu/tưới, đơn hàng, nhiệm vụ và streak. Chuyển ngày qua lại đặt lại quota cục bộ; chuyển khung bữa lấy phần thưởng ở thời điểm giả. Không phải mọi loại thưởng đều trả lại ngay vì còn khóa ledger, nhưng quota có thể bị reset khi ngày khác.

**Fix:** thời gian máy chủ là chuẩn, thống nhất lịch game UTC+7 hoặc chính sách đã chốt; từ chối timestamp client dùng quyết định kinh tế. UI chỉ nội suy đồng hồ máy chủ để hiển thị. Offline không được tự ghi tài nguyên có thể chuyển cho người khác.

### F06 — P1: Chọn trước cá/thuyền; bắt cá không cần chờ cá cắn

**Xác nhận trong mã.** Kết quả phụ thuộc timestamp tại [`catchFor()`](../src/domain/selectors.ts:116), [`boatCatch()`](../src/domain/selectors.ts:121). [`CATCH`](../src/domain/reducer.ts:411) chỉ kiểm tra tuổi lượt trong khoảng 0 đến tối đa; không có phiên thả câu chuẩn, không kiểm tra thời điểm bắt đầu cá cắn. Tuổi bằng 0 được chấp nhận. UI mới kiểm soát pha cắn tại [`Garden3D`](../src/features/garden3d/Garden3D.tsx:240).

Người chơi có thể chọn timestamp mang kết quả mong muốn, bỏ hoạt ảnh/chờ và tự báo bắt thành công. Thuyền cũng bị chọn kết quả bằng thời điểm gửi nếu sửa client.

**Fix:** máy chủ cấp định danh lượt, giờ bắt đầu, cửa sổ hợp lệ, kết quả ngẫu nhiên phía máy chủ và trạng thái đã nhận; không nhận timestamp làm seed do người chơi chọn. Nếu không cần minigame chặt, vẫn phải quyết định loot và quota trên máy chủ.

### F07 — P1: Replay sau khi ledger bị cắt; lỗi hạch toán khi một phần thao tác thất bại

**Xác nhận trong mã; chuỗi cụ thể cần test.** [`post()`](../src/domain/reducer.ts:139) chỉ chống lặp bằng ledger cục bộ bị cắt còn 400 hàng tại dòng 167. Ledger hiển thị không phải bộ nhớ idempotency bền vững.

- Sự kiện bạn bè chưa ACK có thể được đọc lại sau khi khóa cũ bị đẩy khỏi ledger và cộng thưởng lại.
- Xóa ảnh rồi thêm lại có thể trả XP lần nữa nếu khóa thưởng ảnh đã bị cắt; nguồn [`REMOVE_PHOTO`](../src/domain/reducer.ts:524), [`ATTACH_PHOTO`](../src/domain/reducer.ts:511).
- [`COOK`](../src/domain/reducer.ts:476) không kiểm tra kết quả từng bước hạch toán. Hai thao tác cùng công thức/cùng timestamp khi còn đủ nguyên liệu khiến khóa trừ/thưởng bị từ chối nhưng số món và tally vẫn tăng.
- [`CHOOSE_DISH`](../src/domain/reducer.ts:289) vẫn cộng hạt mới nếu bước thu hồi hạt cũ thất bại. Có thể tiêu hạt đang chờ qua tặng trước khi đổi món; sau F02 được sửa vẫn phải chốt hạt thưởng bữa có được phép tiêu/tặng trước khi hoàn tất không.

**Fix:** idempotency và reward claims lưu ở máy chủ, tồn tại độc lập ledger 400 dòng; toàn bộ thay đổi tài nguyên và tally nguyên tử. Với reducer local, không cập nhật thống kê nếu hạch toán thất bại; tách định danh thao tác khỏi timestamp.

### F08 — P1: Vượt quota ngày và giới hạn bạn bè/referral bằng yêu cầu đồng thời

**Rủi ro race có bằng chứng tĩnh; chưa chạy song song.** [`Friends::water()`](../server/lib/Friends.php:386), [`Friends::steal()`](../server/lib/Friends.php:428), [`Friends::gift()`](../server/lib/Friends.php:472) đọc tổng quota trước ghi, không khóa bộ đếm chung theo người/ngày. Khóa duy nhất theo cặp bạn/ngày không bảo vệ tổng khi gửi đến nhiều bạn khác nhau. [`Friends::add()`](../server/lib/Friends.php:179) và [`Friends::recordReferral()`](../server/lib/Friends.php:218) tương tự với tổng 30 bạn/10 referral. Quan hệ hai chiều thêm/xóa không nằm trong một giao dịch.

**Fix:** quota dùng cập nhật điều kiện nguyên tử hoặc khóa theo tài khoản/ngày; kiểm tra và ghi trong cùng giao dịch. Quan hệ hai chiều nguyên tử. Triển khai khóa phù hợp SQLite và MariaDB, thứ tự khóa ổn định cho thao tác hai tài khoản. Kiểm thử thật trên cả hai driver.

### F09 — P1: Ghi tiến độ xung đột báo thành công giả; đồng bộ có thể rollback

**Xác nhận trong mã.** [`Account::putProgress()`](../server/lib/Account.php:204) đọc phiên bản rồi cập nhật có điều kiện, nhưng không kiểm tra số hàng cập nhật. Hai yêu cầu cùng phiên bản có thể một yêu cầu không ghi gì nhưng vẫn nhận thông báo thành công; lần lưu đầu song song có thể gây lỗi unique thay vì xung đột rõ ràng.

[`reconcile()`](../src/domain/sync.ts:36) dùng chiều dài ledger đã bị cắt và XP để xác định bản mới. Cùng XP/chiều dài có thể coi hai kho khác nhau là giống; bản ít tiến bộ nhưng nhiều hàng hơn có thể ghi đè. Nhánh retry của [`AccountProvider`](../src/state/AccountProvider.tsx:85) có thể ghi đè ngay khi không chọn pull, kể cả trường hợp cần hỏi.

**Fix:** bản chuẩn và revision máy chủ, kiểm tra số hàng cập nhật, conflict đúng nghĩa; hàng đợi ghi một luồng và ràng buộc phiên tài khoản cho response. Không tự quyết mới/cũ bằng XP/chiều dài. Không dùng merge cộng tài nguyên vì nhân đôi chi tiêu.

### F10 — P1: ACK trước khi trạng thái áp dụng được lưu bền vững; sự kiện thiếu chu kỳ cây

**Xác nhận trong mã.** [`pullEvents()`](../src/state/AccountProvider.tsx:121) dispatch rồi ACK ngay; việc đẩy tiến độ bị trì hoãn 3 giây. Đóng tab hoặc đổi thiết bị sau ACK trước lưu khiến thưởng/hậu quả bị mất. ACK không chứng minh đã áp dụng, tại [`Friends::ack()`](../server/lib/Friends.php:589).

Sự kiện gửi plot và crop nhưng không gửi định danh chu kỳ trồng tại [`Friends::events()`](../server/lib/Friends.php:578). [`FRIEND_EVENT`](../src/domain/reducer.ts:587) đối chiếu crop/plot, nên sự kiện cũ có thể ảnh hưởng cây mới cùng loại, trái với ý định trong comment. Đây là lỗi tính đúng đắn và cũng cho phép chọn bỏ hậu quả.

**Fix:** hiệu ứng tài nguyên đã áp dụng trên máy chủ cùng giao dịch, ACK chỉ xác nhận thông báo; gửi cycle ID và đối chiếu chính xác. Retry/đóng tab không làm mất hoặc nhân thưởng.

### F11 — P2: Schema không đủ; bản lưu lạ có thể phá game hoặc hiển thị vườn bạn

**Xác nhận trong mã.** [`parseProgress()`](../src/domain/persistence.ts:161) không siết đầy đủ XP, ledger entries, ID plot duy nhất, thời gian theo chu kỳ, streak, lịch sử và quyền sở hữu. Kho chỉ yêu cầu hữu hạn không âm, chưa có giới hạn số nguyên an toàn. Nước nhận số âm nếu hữu hạn. Dấu món trùng được đếm bằng chiều dài tại [`stampCount()`](../src/domain/selectors.ts:282).

[`Friends::visit()`](../server/lib/Friends.php:344) lọc một phần plot nhưng trả animals/layout từ dữ liệu client khá trực tiếp. Payload sai kiểu, số lớn hoặc tọa độ bất thường có thể làm lỗi trình duyệt bạn bè; chưa chứng minh XSS hay chiếm tài khoản.

**Fix:** schema allowlist nghiêm ngặt ở API và parser, giới hạn số nguyên/độ dài/độ sâu, ID duy nhất và tham chiếu hợp lệ; DTO vườn bạn chỉ trả trường đã kiểm tra. Schema giúp chống dữ liệu lỗi, không thay thế xác minh chuyển trạng thái.

### F12 — P1/P2: Giới hạn OTP và dùng mã một lần chưa nguyên tử

**Race có bằng chứng tĩnh; chưa kiểm thử runtime.** [`Account::requestCode()`](../server/lib/Account.php:33) đếm rồi insert; [`Account::verifyCode()`](../server/lib/Account.php:65) đọc số lần thử trước tăng. Yêu cầu song song có thể vượt số lần cấp/thử. [`Account::signIn()`](../server/lib/Account.php:103) đánh dấu đã dùng bằng cập nhật vô điều kiện sau truy vấn; hai yêu cầu mã đúng/link hợp lệ có thể cùng tạo session. Đây không chứng minh người không biết mã có thể đăng nhập.

**Fix:** rate limiter nguyên tử theo IP/email và toàn hệ thống; tiêu mã bằng cập nhật điều kiện chưa dùng/chưa hết hạn/số lần phù hợp trong giao dịch; một mã chỉ có một lần tiêu thành công. Dọn mã/session hết hạn; giới hạn phiên. Kiểm tra production không bật trả mã phát triển.

### F13 — P2: Check-in và ảnh là tự khai, không xác minh bữa ăn thật

**Quy tắc sản phẩm cần chốt, không mặc định là lỗ hổng.** [`CHECK_IN`](../src/domain/reducer.ts:785) cho chín cây ngay, XP, nước và dấu món; không yêu cầu thời gian tối thiểu hay bằng chứng ăn thật. [`PhotoCapture`](../src/components/checkin/PhotoCapture.tsx:9) lưu ảnh ở thiết bị; thưởng ảnh không phải chứng thực của máy chủ. [`COOK`](../src/domain/reducer.ts:476) cũng thiếu kiểm tra công thức đã mở vùng dù có [`recipeAvailable()`](../src/domain/selectors.ts:229); trồng từ khay không kiểm tra cây mở khóa.

**Fix:** chốt tự khai là tính năng hay cần kiểm soát. Khuyến nghị giữ riêng tư, tự khai có thưởng nhỏ và giới hạn server theo bữa; không bắt upload ảnh để chống gian lận. Nếu muốn xác minh ảnh cần thiết kế quyền riêng tư riêng, vẫn không chứng minh chắc chắn đã ăn. Đưa điều kiện công thức/cây mở khóa vào lớp luật chuẩn, không chỉ UI.

### F14 — P2: Rate limit, kích thước body và hardening còn thiếu

**Xác nhận ở cấu hình/mã mẫu; trạng thái production chưa biết.** [`read_json_body()`](../server/lib/bootstrap.php:125) đọc toàn body trước giới hạn; giới hạn bản lưu thực hiện sau decode/encode. [`angi.conf`](../deploy/nginx/angi.conf:15) cho body 64 MB chung, không thấy quota ứng dụng cho lưu game/thăm vườn. Admin login chỉ delay tại [`Auth::login()`](../server/lib/Auth.php:26), không có bộ đếm khóa/rate limit bền vững. Cookie admin Secure phụ thuộc HTTPS trực tiếp; mô hình proxy cần xác minh. Cấu hình Nginx trong repo chỉ có khối HTTP; TLS được hướng dẫn thêm ngoài file.

**Fix:** giới hạn body nhỏ theo route, đọc giới hạn trước decode, giới hạn độ sâu và tốc độ theo tài khoản/IP; admin login limiter, thời hạn phiên và logging; HTTPS, Secure cookie, cấu hình proxy tin cậy, kiểm tra Origin/Fetch Metadata cho ghi cùng origin, không mở CORS credential tùy tiện. CSRF header hiện tại có giá trị bảo vệ trong mô hình same-origin; không kết luận bị bypass chỉ vì header cố định.

### F15 — P0/P1: Mang cùng tiến độ sang nhiều tài khoản mà không cần sửa bản lưu

**Đường đi được xác nhận trong mã; chưa chạy trình duyệt để tái hiện.** Đăng xuất và xóa tài khoản tại [`AccountProvider`](../src/state/AccountProvider.tsx:309) không xóa hoặc tách trạng thái game đang dùng. Khi đăng nhập tài khoản mới chưa có tiến độ, [`reconcile()`](../src/domain/sync.ts:36) chọn đẩy bản local; [`attach()`](../src/state/AccountProvider.tsx:191) thực hiện đẩy lên. Khi tài khoản đích đã có hành trình khác, lựa chọn giữ local tại [`resolveConflict`](../src/state/AccountProvider.tsx:292) cũng ghi bản local sang tài khoản đó.

Chuỗi: chơi/nhận thưởng ở A → đăng xuất → đăng nhập B mới → cùng kho/XP/tiến độ được lưu ở B, trong khi bản A vẫn tồn tại. Không nhất thiết cần DevTools. Điều này nhân bản tài nguyên giữa các tài khoản; kết hợp F02/F03 có thể dùng làm nguồn quà hoặc mốc referral. Giữ hành trình khi đăng nhập có thể là chủ ý UX, nhưng không an toàn khi hành trình đó chuyển giá trị giữa người chơi.

**Fix:** trạng thái tài khoản gắn với chủ sở hữu do máy chủ xác định; phân vùng cache theo tài khoản và sandbox khách. Chuyển tài khoản phải dừng hàng đợi, tải trạng thái đúng chủ và không nhập lại kinh tế của tài khoản trước. Mọi cơ chế nhập tiến độ khách phải có chính sách cấp một lần, không nhận số dư tự khai.

### F16 — P1: Response và retry cũ chưa được cô lập khi đổi phiên tài khoản

**Rủi ro bất đồng bộ có bằng chứng tĩnh; chưa xác nhận lịch thực thi runtime.** [`push()`](../src/state/AccountProvider.tsx:76), [`pullEvents()`](../src/state/AccountProvider.tsx:122), [`refreshFriends()`](../src/state/AccountProvider.tsx:170) và [`attach()`](../src/state/AccountProvider.tsx:191) không gắn kết quả với thế hệ phiên/chủ tài khoản trước khi cập nhật state. Kiểm tra sẵn sàng ở đầu đọc sự kiện không kiểm tra lại sau khi chờ mạng. Retry sau xung đột có thể phát yêu cầu tiếp theo dưới cookie phiên mới.

Response của A về sau khi đã đăng nhập B có thể áp sự kiện/dữ liệu bạn bè hoặc revision của A vào màn hình B; retry có nguy cơ mang bản local không đúng chủ sang phiên hiện tại. Không kết luận đây là IDOR phía máy chủ: mỗi yêu cầu vẫn được xác thực theo cookie tại thời điểm xử lý. Lỗi nằm ở ranh giới phiên phía client và cần kiểm thử response đảo thứ tự.

**Fix:** gắn toàn bộ request với tài khoản và thế hệ phiên; hủy yêu cầu có thể hủy, bỏ response cũ, kiểm tra lại chủ trước retry/dispatch/ACK; serialize ghi và dừng hàng đợi khi logout. Đăng xuất thất bại không được chỉ hiển thị guest trong khi cookie server còn hiệu lực; phải xử lý trạng thái thất bại rõ ràng.

### F17 — P1/P2: Xóa tài khoản xóa cả sự kiện của người khác và không nguyên tử

**Xác nhận thao tác xóa; tác động từng chuỗi cần kiểm thử.** [`Account::delete()`](../server/lib/Account.php:253) xóa sự kiện khi người dùng là người gửi **hoặc** người nhận, rồi xóa các bảng liên quan qua nhiều câu lệnh không có giao dịch. Quà/referral đã phát nhưng chưa được bên kia nhận có thể biến mất khi người gửi xóa tài khoản; sự kiện hái đã mất có thể làm người nhận không còn thông báo/hậu quả. Thưởng đã áp ở client không được thu hồi đồng bộ. Lỗi giữa chuỗi xóa có thể để tài khoản và quan hệ ở trạng thái xóa dở.

**Fix:** tài nguyên được commit độc lập với thông báo và vòng đời người gửi; khi xóa, ẩn danh thông tin người gửi theo chính sách thay vì xóa hiệu ứng đã thuộc người nhận. Xóa tài khoản trong giao dịch, xử lý cạnh tranh với gửi quà/hái/referral và chốt quy tắc thưởng đang chờ. Phân biệt dữ liệu bắt buộc xóa với sổ hạch toán tối thiểu được phép lưu theo chính sách.

### Bổ sung lượt hai cho F07 và F11

- [`ATTACH_PHOTO`](../src/domain/reducer.ts:513) tăng tally ảnh dù bước trả XP bị từ chối do khóa đã tồn tại. Xóa/thêm lại ảnh có thể làm tăng tiến độ nhiệm vụ ảnh ngay cả **trước** khi ledger bị cắt. Đây là biến thể lỗi thống kê chưa được nêu rõ trong lượt đầu; không cần đợi hơn 400 hàng để tăng tally.
- [`HARVEST_ALL`](../src/domain/reducer.ts:427) cũng không kiểm tra kết quả từng bước trả nguyên liệu/XP trước chuyển chu kỳ và tăng tally. Cần kiểm thử khóa trùng và trạng thái khôi phục, không chỉ trường hợp nấu.
- [`AdminUsers::list()`](../server/lib/AdminUsers.php:24) đọc toàn bộ tiến độ trước lọc/phân trang; bản lưu lớn do người chơi kiểm soát có thể khuếch đại bộ nhớ và chi phí trang admin. Cần phân trang SQL, projection có giới hạn và kiểm thử kiểu dữ liệu sai. Chưa chứng minh payload cụ thể làm sập admin hoặc XSS.
- Kiểm tra lại reducer hiện tại: đã có kiểm tra công thức tồn tại tại [`COOK`](../src/domain/reducer.ts:477), nhưng chưa thấy kiểm tra công thức đã mở khóa; phân biệt hai điều kiện này khi sửa F13.

## 3. Những lớp bảo vệ đang có và giới hạn kết luận

- Các API dữ liệu cá nhân lấy người dùng từ session tại [`Account::requireUser()`](../server/lib/Account.php:270), không lấy ID chủ tài khoản do người gọi cung cấp. Chưa thấy IDOR trực tiếp ở các route đã rà soát.
- Thăm/tác động vườn cần quan hệ bạn bè qua [`Friends::friendByCode()`](../server/lib/Friends.php:648).
- Khóa unique sự kiện tại [`schema.sqlite.sql`](../server/sql/schema.sqlite.sql:164) chống lặp cùng cặp/cùng chu kỳ theo key, nhưng không giải quyết tổng quota, dữ liệu nguồn giả và client bỏ hiệu ứng.
- Session/code được hash; cookie khách HttpOnly/SameSite tại [`Account::cookie()`](../server/lib/Account.php:128). Admin route có kiểm tra session/CSRF tại [`Auth::require()`](../server/lib/Auth.php:56).
- Root triển khai chỉ trỏ build; mã và storage không làm web root. Upload không thực thi script theo [`angi.local.conf`](../deploy/apache/angi.local.conf:80), [`angi.conf`](../deploy/nginx/angi.conf:88). Chưa xác minh cấu hình này thực sự được cài trên máy chủ.
- Review có limiter có khóa và ngân sách tại [`ReviewService::rate()`](../server/lib/ReviewService.php:50), [`ReviewService::reserve()`](../server/lib/ReviewService.php:62); không phải nguồn thưởng game. Không gán giả GPS ở review thành gian lận tiền game khi chưa có liên kết thưởng.
- Unit tests có chống double tap và happy path, nhưng không chứng minh tính chống giả client. [`selftest-account.php`](../server/bin/selftest-account.php:61) còn chấp nhận bản lưu cực tối giản; [`selftest-friends.php`](../server/bin/selftest-friends.php:109) tặng hạt mà chưa thiết lập kho người gửi. Các kỳ vọng này phải đổi khi sửa kiến trúc.

## 4. Kiến trúc mục tiêu và quyết định cần duyệt

**Đề xuất:** game tài khoản/online có trạng thái chuẩn trên máy chủ; game khách/offline là sandbox riêng. Không nhập tiền/kho/XP sandbox thẳng vào kinh tế xã hội. Có thể giữ tùy chọn trải nghiệm cá nhân/hình thức khi chuyển tài khoản, hoặc có gói khởi đầu giới hạn được máy chủ cấp một lần.

Client gửi ý định như trồng, thu hoạch, mua, tặng, nhận thưởng. Máy chủ thực hiện: xác thực → validate payload → khóa trạng thái/quota → kiểm tra luật bằng thời gian máy chủ → cập nhật tài nguyên và reward claims nguyên tử → lưu revision và kết quả thao tác → trả snapshot/delta chuẩn. Client hiển thị/hoạt ảnh; dự đoán UI phải rollback khi bị từ chối.

Bảng/trường mục tiêu ở mức thiết kế: trạng thái game có schema/revision; định danh thao tác và kết quả retry; claims thưởng; quota ngày; chu kỳ cây/vật nuôi/ong/thuyền/câu; thống kê mốc đã xác minh; nhật ký kinh tế. Không bắt buộc tách mọi tài nguyên thành bảng ngay nếu bản JSON chuẩn được khóa và cập nhật nguyên tử trên máy chủ.

Không đặt secret ký trong frontend. Ký bản lưu có thể giúp xác minh nguồn máy chủ nhưng không tự ngăn replay/rollback, nên vẫn cần revision và trạng thái server. Không sử dụng ledger cắt 400 hàng làm cơ sở khôi phục/xác minh.

Dữ liệu cũ: chọn một chính sách được duyệt trước migration — reset phần kinh tế với bù hợp lý, hoặc giữ ở vùng legacy không chuyển/tính referral cho tới chuyển đổi. Không thể tự khẳng định dữ liệu cũ sạch bằng clamp hay đối chiếu ledger bị cắt.

## 5. Kế hoạch thực thi theo thứ tự

1. Chốt ranh giới online/offline, chính sách dữ liệu cũ, tự khai check-in/ảnh và quy tắc mở khóa.
2. Tạm chặn đường chuyển giá trị dễ lạm dụng: khóa referral chưa xác minh và quà không có debit; cô lập bản lưu legacy khỏi quyết định thưởng xã hội. Biện pháp này giảm thiệt hại, chưa làm game sạch.
3. Thêm schema chuẩn, revision, operation idempotency, reward claims, quota và migration cho SQLite/MariaDB.
4. Xây lớp luật máy chủ dùng bảng cân bằng thống nhất; tự lấy thời gian chuẩn, xác minh số dư, điều kiện mở khóa và chu kỳ.
5. Chuyển mua/bán/trồng/tưới/thu hoạch/vật nuôi/ong/thuyền/nấu/đơn hàng sang API hành động nguyên tử.
6. Chuyển thưởng bữa/nhiệm vụ/huy hiệu/streak sang claims và thống kê máy chủ; chốt giới hạn ảnh/check-in mà không phá cam kết riêng tư.
7. Chuyển câu cá sang phiên server với loot/quota/cửa sổ chuẩn, chống retry chọn lại kết quả.
8. Chuyển tặng/tưới/hái sang giao dịch trạng thái chuẩn hai tài khoản, định danh chu kỳ và thông báo hậu giao dịch.
9. Tính referral từ mốc chuẩn; hạn mức lifetime không mất khi xóa quan hệ/tài khoản, chính sách lưu giữ được duyệt.
10. Thay đồng bộ snapshot client bằng đọc revision/đồng bộ hành động; serialize request, xử lý conflict và đổi tài khoản rõ ràng; ACK chỉ quản lý thông báo.
11. Siết parser/DTO/body/rate limit, OTP nguyên tử, cookie/TLS/proxy và hardening admin; bổ sung nhật ký quan sát.
12. Viết và chạy bộ kiểm thử đối kháng, race đa kết nối trên cả hai driver và trình duyệt; triển khai theo feature flag với backup/rollback migration.

## 6. Tiêu chí nghiệm thu và bộ kiểm thử bắt buộc

| Nhóm | Tình huống cần kiểm | Kết quả bắt buộc |
|---|---|---|
| Nguồn dữ liệu | Sửa tiền/XP/kho/ledger/plot rồi gửi snapshot; tải bản cũ; sửa storage | Không thay đổi kinh tế chuẩn và không được trả referral |
| Schema | ID lạ/trùng, số âm/lẻ/quá lớn, timestamp sai, payload sâu/lớn, layout lỗi | Từ chối sớm có lỗi kiểm soát, không làm lỗi vườn bạn |
| Thời gian | Đổi giờ/múi giờ, nhảy ngày tới/lùi, sát nửa đêm/đầu tuần | Quota và thời gian theo lịch server, không phát lại thưởng |
| Kinh tế | Hai thao tác tiêu hạt/xu cuối cùng; nấu lặp cùng định danh; lỗi giữa debit/credit | Chỉ một thao tác hợp lệ, không âm kho, không tăng tally khi thất bại |
| Quà | Không có hạt, hạt chưa mở, gửi lặp, ngắt kết nối sau commit | Không tạo hạt miễn phí; retry nhận cùng kết quả |
| Câu/thuyền | Báo bắt trước cắn, không có phiên, seed/timestamp tự chọn, nhận lặp | Server quyết định loot và một lần nhận |
| Chu kỳ | Thu hoạch cạnh tranh hái; trồng lại cùng crop trước nhận thông báo | Tổng sản lượng đúng; sự kiện cũ không tác động cây mới |
| Idempotency | Hơn 400 ledger entries rồi replay thưởng/ảnh/event | Không nhận lại bất kỳ claim đã trả |
| Quota | Gửi song song đến nhiều bạn; thêm bạn/referral ở sát giới hạn | Tổng không vượt hạn mức, quan hệ không một chiều |
| Đồng bộ | Hai tab/thiết bị, response đảo thứ tự, mất mạng, đổi tài khoản | Không rollback, không báo lưu thành công khi không ghi |
| Chủ sở hữu | A đăng xuất rồi vào B mới; chọn giữ local; response A về sau khi vào B | Không nhân bản kinh tế, không áp dữ liệu/sự kiện/revision sai chủ |
| Ảnh và tally | Xóa/thêm ảnh nhiều lần khi khóa XP vẫn còn | Không tăng lại tally hoặc claim thưởng nhiệm vụ |
| Xóa tài khoản | Xóa người gửi khi quà/referral/hái đang chờ; lỗi giữa các bước xóa | Hiệu ứng đã commit không mất; xóa nguyên tử theo chính sách |
| Admin dữ liệu | Nhiều bản lưu lớn, dữ liệu nested sai kiểu, mở danh sách tài khoản | Bộ nhớ và thời gian bị giới hạn; lỗi dữ liệu không phá trang admin |
| Sự kiện | Đóng tab giữa xử lý/ACK; hai thiết bị kéo cùng event | Tài nguyên đúng một lần, không mất thưởng/hậu quả |
| Referral | Giả mốc, tài khoản phụ, xóa/tạo lại, song song sát lifetime cap | Không trả mốc giả; lifetime quota không được giải phóng trái chính sách |
| OTP/admin | Nhiều yêu cầu verify/cấp mã song song, dùng lại link/code, brute force | Tiêu mã một lần; limiter nguyên tử; không phát dev code production |
| Phân quyền | Chưa login, tài khoản khác, không phải bạn, request cross-site | Đúng 401/403/404; không lộ email hoặc trạng thái riêng |

### Giới hạn và rủi ro còn lại

Server-authoritative chặn giả tài nguyên và bước không hợp lệ, **không loại bỏ hoàn toàn bot thực hiện các hành động hợp lệ**, nhiều tài khoản người thật/ảo hoặc tự khai bữa ăn không đúng. Cần quota hợp lý, dấu hiệu bất thường và quy trình xử lý thay vì hứa chống gian lận tuyệt đối. Đã chạy một phần runtime/regression cách ly tại mục 7; chưa xác minh cấu hình triển khai, dữ liệu production hay race đa kết nối. Không thử trên người chơi thật.

## 7. Kiểm thử tự động cách ly — kết quả thực chạy 02/10/2026

### Cách đọc kết quả

**Characterization PASS nghĩa là hành vi không an toàn đã được tái hiện, không nghĩa hệ thống an toàn hoặc lỗi đã sửa.** Kiểm thử yêu cầu an toàn được tách tên/nhóm riêng. Frontend có 4 expected failures chạy assertion thật; nếu assertion bất ngờ thành công, runner báo lỗi để yêu cầu xem lại characterization. Backend mặc định ghi 5 KNOWN-FAIL; chế độ nghiêm ngặt biến chúng thành FAIL và trả exit code 1. Không bỏ qua các assertion này, không sửa implementation để làm xanh test.

Files bổ sung:
- [`security-audit.test.ts`](../src/domain/security-audit.test.ts): reducer và quyết định sync thực, dữ liệu mới mỗi bài, đồng hồ cố định; 11 characterization, 1 control và 4 expected failures.
- [`selftest-security.php`](../server/bin/selftest-security.php): PDO SQLite trong bộ nhớ truyền trực tiếp vào lớp tài khoản/bạn bè; schema thật, tài khoản/session fixture với email miền không gửi được. Không gọi hàm kết nối production, không yêu cầu OTP, không gọi mail, không HTTP/network, không sửa cấu hình môi trường. Fault injection bằng trigger SQLite chỉ tồn tại trong bộ nhớ.
- [`package.json`](../package.json): chỉ thêm ba script audit, không thay dependencies/lockfile.

Hai selftest hiện có [`selftest-account.php`](../server/bin/selftest-account.php) và [`selftest-friends.php`](../server/bin/selftest-friends.php) tự đặt đường dẫn SQLite tạm trước bootstrap và ép mail log; chúng không gửi mail/network thật nhưng ghi log email cục bộ trong storage. Bộ mới không ghi mail log. Không xóa/revert dữ liệu hay thay đổi bên ngoài nhiệm vụ.

### Lệnh và số liệu

Windows cmd, Node 24.18.1, npm 11.16.0, PHP 8.3.33, PDO sqlite/mysql có sẵn; Vitest 5.0.2/jsdom/TypeScript đã cài. Không cài thêm dependency. Các lệnh frontend dùng runner hiện có [`run-vitest.mjs`](../scripts/run-vitest.mjs).

| Lệnh đã chạy | Kết quả thực tế |
|---|---|
| npm test | Exit 0; 31 files pass, 1 file skipped; **273 passed, 4 expected fail, 1 skipped**, tổng 278; 36.22 giây |
| npm run test:audit | Exit 0; **12 passed, 4 expected fail**, tổng 16; sau định dạng 2.41 giây |
| c:\\xampp\\php\\php.exe server/bin/selftest-security.php | Exit 0; **22 passed, 0 failed, 5 known security failures** |
| c:\\xampp\\php\\php.exe server/bin/selftest-security.php --security | Chạy riêng xác nhận **exit 1; 22 passed, 5 failed** (5 invariant an toàn chưa đạt) |
| c:\\xampp\\php\\php.exe server/bin/selftest-account.php | **17 PASS, 0 FAIL** |
| c:\\xampp\\php\\php.exe server/bin/selftest-friends.php | **58 PASS, 0 FAIL** |
| npm run typecheck | Exit 2; lỗi kiểu sẵn có tại [`FarmGame.tsx`](../src/features/food-reel/journey/FarmGame.tsx:180), giá trị có thể null; file này đã bị sửa bên ngoài trước nhiệm vụ, không chỉnh sửa |
| ESLint chỉ file test frontend mới | Exit 0 |
| PHP lint file test backend mới | Exit 0, không lỗi cú pháp |
| git diff --check | Exit 0; Git có cảnh báo LF/CRLF ở file ngoài nhiệm vụ |

Ba script mới: npm run test:audit; npm run test:audit:server; npm run test:audit:security. Script PHP cần PHP trên PATH; nếu chưa có, dùng đường dẫn XAMPP ở bảng. Không dùng chuỗi nhiều lệnh không điều kiện để suy ra exit code từng bộ: lượt backend đầu chạy nối bằng dấu & chỉ phản ánh mã của lệnh cuối; chế độ nghiêm ngặt đã được chạy riêng để xác nhận exit 1.

Frontend toàn bộ có cảnh báo canvas chưa được jsdom hỗ trợ và React cập nhật chưa bọc act; không có test failure ngoài các expected failures đã khai báo. Bài skipped nằm tại [`farmItems.report.test.ts`](../src/data/farmItems.report.test.ts), không được tính là covered. Không chạy build/verify vì build có bước export catalogue có thể gọi database ứng dụng. Selftest catalogue mặc định dùng database ứng dụng nên không chạy trực tiếp; các selftest review/YouTube và script browser chưa được chạy trong lượt này.

### Ma trận 17 phát hiện: covered không đồng nghĩa phủ toàn nhóm

| Nhóm | Runtime covered trong lượt này | Unverified / giới hạn |
|---|---|---|
| F01 | Snapshot tiền/XP/kho/tally tự tạo được lưu và đọc nguyên vẹn; missing guestId/body quá lớn bị chặn | Không exhaustive mọi tài nguyên/schema, rollback snapshot và sửa browser storage |
| F02 | Kho durian bằng 0/chưa mở vẫn tạo quà và người nhận có event; gửi lặp tuần tự bị chặn | Không kiểm tra cạnh tranh tiêu hạt cuối, mất kết nối sau commit |
| F03 | Tally/XP giả trả đủ 200 xu + 90 XP mỗi bên; không duplicate tuần tự; xóa/tạo lại cùng email nhận tiếp | Chưa chứng minh chuỗi đủ 10 rồi vượt lifetime cap, multi-account policy hoặc race quota |
| F04 | Hái cây chín giả không sửa snapshot chủ vườn | Chưa chạy thu hoạch/hái đồng thời hoặc bỏ cờ rồi thu hoạch xuyên frontend/backend |
| F05 | Đồng hồ tương lai thu cây đang lớn; quota câu reset khi tới ngày mai rồi quay lại | Múi giờ thật, sát nửa đêm/đầu tuần, ong/vật nuôi/thuyền/streak chưa phủ đầy đủ |
| F06 | Bắt cá tuổi 0 không cần phiên; chọn timestamp có nhiều loot; thuyền cùng seed trả cùng kết quả | Chưa tái hiện chọn loot thuyền xuyên hành động/phiên server hoặc browser minigame |
| F07 | Nấu trùng tăng tally không debit/XP; ảnh thêm lại tăng tally; 401 event thật đẩy claim rồi replay ảnh/quà; khôi phục plot đã thu tăng tally | Đổi món sau tiêu hạt và mọi nhánh kinh tế chưa phủ |
| F08 | Chỉ control lặp tuần tự cùng cặp | **Race đa kết nối SQLite/MariaDB chưa chạy** |
| F09 | Cùng XP/độ dài ledger nhưng khác tiền bị coi là same | Concurrent update row count, insert đầu tiên, rollback/retry provider chưa chạy |
| F10 | Event thiếu cycle; event cũ đánh dấu cây mới cùng loại; ACK không cần persist; không ACK được event người khác | Đóng tab giữa dispatch/ACK/lưu, hai thiết bị và crash recovery chưa chạy |
| F11 | Animals/layout sai kiểu/cực lớn được DTO trả nguyên | Parser frontend, ID trùng, số an toàn, nested payload, admin memory/XSS chưa phủ |
| F12 | Selftest cũ kiểm code single-use và limiter tuần tự | OTP/link race, cấp/thử song song, production dev code chưa xác minh |
| F13 | Selftest/frontend hiện có có happy path check-in/ảnh | Quy tắc tự khai, công thức/cây chưa mở và bằng chứng bữa ăn chưa có bài đối kháng riêng |
| F14 | Control header vắng 403 và snapshot quá lớn 413 | Body trước decode, route rate limit, TLS/proxy/cookie/admin/cấu hình production chưa kiểm |
| F15 | Sync chọn push cùng local có thưởng vào mọi remote rỗng; backend nhận cùng snapshot dưới chủ khác | Đây là semantics/unit, **chưa phải chuỗi logout/login/keep-local trên browser thật** |
| F16 | Không có bài runtime chuyên biệt | Response đảo thứ tự, generation session và retry sau đổi tài khoản **chưa xác minh** |
| F17 | Xóa người gửi làm mất pending gift/referral; trigger lỗi bước xóa friendship chứng minh event đã mất nhưng user còn | Chưa test pending stolen tại lúc xóa (bài hiện tại ACK stolen trước xóa), MariaDB và concurrent deletion chưa chạy |

### Giới hạn vận hành và diff

Edge headless có sẵn trên máy; Playwright/Puppeteer chưa cài. Không chạy E2E trong lượt này: harness hiện có khởi động Vite/app, cần chặn toàn bộ API/proxy và remote assets trước khi dùng an toàn. Không dùng server thật, không mở browser với profile người dùng, không cài bộ E2E lớn. Các bài jsdom hiện có không thay thế browser thật.

Git baseline có nhiều file implementation và asset untracked/modified trước nhiệm vụ. Diff được kiểm tra: thay đổi do lượt này chỉ gồm hai file test mới, ba script trong manifest và phần báo cáo này; không sửa thư mục implementation backend hay reducer/provider, không revert thay đổi external. Báo cáo vốn đã untracked ở baseline nên Git không có bản gốc tracked để hiện riêng phần bổ sung. Không chứng nhận mọi thao tác game đã được phủ hoặc mọi phát hiện đã có exploit end-to-end.

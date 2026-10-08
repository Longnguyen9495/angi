# Backlog triển khai tuần tự — nguồn theo dõi tác vụ cha

Ngày lập: 08/10/2026. Phạm vi lượt này: chỉ khảo sát và lập kế hoạch; chưa chạy test/mô phỏng, chưa sửa implementation.

## 1. Baseline và rào chắn

- Theo thông tin tác vụ cha: main đồng bộ origin/main tại 07ff96c; giữ nguyên stash catalogue ngày 30/09. Lượt này không có công cụ terminal để kiểm chứng Git độc lập. Khi triển khai, kiểm trạng thái/commit bằng thao tác chỉ đọc trước khi sửa; không apply/pop/drop stash, không reset hay ghi đè thay đổi ngoài phạm vi.
- Không push, deploy hoặc bật Vườn Mây production. Không đọc/in nội dung secrets, token, database thật hay log đăng nhập. Dùng tài khoản và DB kiểm thử cách ly; không gửi thư thật.
- Thứ tự ưu tiên: kỹ thuật không bị chặn trước; mục bị chặn được ghi rõ rồi bỏ qua để tiếp tục mục độc lập. Hoàn thành code không đồng nghĩa qua cổng G0–G6.
- Mỗi mục chỉ đóng khi có bằng chứng mới: commit, test/lệnh và exit code, cấu hình không nhạy cảm, đầu vào/kỳ vọng/thực tế; ảnh/video nếu là UX. Test headless không thay thế thiết bị thật.
- Không biến ghi chú lịch sử thành bug hiện tại. Lỗi chỉ được sửa sau tái hiện ở baseline mới. Không chạy format toàn repo hoặc tự nâng dependency hàng loạt.

## 2. Nguồn chuẩn và đối chiếu hiện tại

| Chủ đề | Bằng chứng đã đọc | Kết luận lập backlog |
|---|---|---|
| Ưu tiên đặc tả | [Vườn Mây §0 và trạng thái đầu file](vuon-may.md:8) | §0 ưu tiên phụ lục; G2–G5 có code, chưa cổng nào được chứng nhận đạt máy thật |
| Mô phỏng | [script hiện có](../scripts/sky-garden/sim.mjs:5), [test và xuất bảng](../src/domain/skySim.test.ts:258), [lệnh project](../package.json:22) | Đã ghi bảng theo số ngày; không cần viết simulator mới trước khi chạy lại. Mặc định báo cáo 90 ngày, test thường 21 ngày; seed 20261008, 3 phiên/ngày, nguồn đất cố định 260 XP/220 xu |
| Giới hạn mô phỏng | [bot và dữ liệu đầu](../src/domain/skySim.test.ts:36), [assertions](../src/domain/skySim.test.ts:279) | Chỉ kiểm tầng 5 trong mùa, không kiểm ngày 20–30; chưa đủ nhiều hồ sơ/seed, server HMAC, hai thiết bị, bất biến toàn kho. Báo cáo chỉ lấy một số ngày, không phải đủ 90 dòng |
| Xã hội mây | [route bắt bọ](../server/api/index.php:132), [selftest](../server/bin/selftest-sky-friends.php:143), [event reducer](../src/domain/reducer.ts:678) | Bắt bọ giúp đã có. Tìm trong server chưa thấy route tưới mây; tưới đất có đường xác minh riêng qua [guard](../server/lib/ProgressGuard.php:1529). Không viết lại bắt bọ như tính năng thiếu |
| G6 nhiệm vụ | [metric hiện có](../src/domain/quests.ts:14), [đặc tả](vuon-may.md:1034) | Chưa có metric mây riêng trong danh sách đã đọc; cần kiểm tally/reward/guard trước thêm, không tính thao tác bấm như hành động thành công |
| CSP | [nginx admin](../deploy/nginx/angi.conf:139), [upload Apache](../deploy/apache/angi.local.conf:134), [P5](sua-bao-mat-va-gian-lan.md:76) | Có CSP ở phạm vi admin/upload; không coi site chính đã có CSP phù hợp YouTube/PlayCanvas |
| Nông trại hình | [backlog hình](nong-trai-va-nhiem-vu-03-10.md:52), [hitbox bò hiện tại](../src/features/farm-anim/engine/AnimationManager.ts:557) | Bò còn hitbox từ vị trí layout; đáy đảo cần chụp lại trước kết luận. Con số 70/150 và test 03/10 chỉ là lịch sử |
| Cốt truyện | [ghi chú tạm dừng](ghi-chu-tam-dung-cot-truyen.md:19) | Có thiết kế, không phải duyệt sản xuất/tích hợp; tách giai đoạn xin duyệt |
| Backlog cũ | [việc còn lại](viec-con-lai.md:5), [ghi chú deploy cũ](nong-trai-va-nhiem-vu-03-10.md:109) | Các trạng thái chưa commit/deploy trong tài liệu cũ không dùng để suy diễn workspace hiện tại; không mở lại lỗi đã sửa nếu không tái hiện |

## 3. Quyết định sản phẩm và chặn

| Mã | Chưa chốt hoặc cần xác nhận | Phần vẫn làm an toàn | Chặn phần nào |
|---|---|---|---|
| D01 | Q4: duyệt cuối 1×6 focus hay 2×3 dự phòng | Đo viewport, sửa hitbox/che nút, giữ 6 slot logic | Chứng nhận layout/máy thật khi chưa có thiết bị và người duyệt |
| D02 | Q5: import khách, gameplay bắt buộc tài khoản hiện khác §0 | Test tài khoản và kiểm cờ nhập mặc định tắt | Không triển khai import tài sản thật hoặc guest gameplay như quyết định đã duyệt |
| D03 | Q6: quyền thương mại từng asset | Audit nguồn/alpha/anchor, thử nghiệm theo quyền hiện có | Phát hành, coi ảnh tham chiếu là sprite, sản xuất asset ngoài quyền cho phép |
| D04 | Sai khác ở đầu plan: kho riêng, hoa hồng thay dâu, xu lúc thu, bọ không làm chậm, phin tầng 4, mầm chỉ là nút | Lập bảng code–§0, đo cân bằng theo code hiện tại | Không tự đổi cả kinh tế/schema để ép khớp hoặc âm thầm coi sai khác đã được duyệt |
| D05 | Reward G6, mùa/lịch Tết và Trung Thu, cộng hưởng 2/4/6, preset, trợ thủ | Test/contract, audit, mô hình dữ liệu thử không thay luật hiện hành | Bật reward mới chưa chốt; % cộng hưởng; tự động thu/claim kinh tế |
| D06 | Nhập/thay đè nông trại và giới hạn có chủ ý ở tài liệu bảo mật | Tái xác minh, ghi risk và regression | Siết chính sách làm mất tương thích khi chưa duyệt |
| D07 | Cốt truyện còn tạm dừng, cần người duyệt nội dung | Chuẩn bị danh sách câu hỏi/phạm vi duyệt | Viết toàn bộ thoại, sản xuất cảnh hoặc tích hợp |

Không hỏi thêm trong lượt lập kế hoạch vì đã đủ phạm vi; các câu cần duyệt được ghi thành điều kiện chặn để tác vụ cha xử lý riêng.

## 4. Các mục nguyên tử theo thứ tự

Trạng thái: **Sẵn sàng** = chưa làm nhưng không có chặn sản phẩm; **Có điều kiện** = kỹ thuật làm được sau phụ thuộc; **Bị chặn** = thiếu duyệt/asset/thiết bị. B01 đã thu baseline và qua 4 test mô phỏng; các mục khác chưa được đánh dấu đã test trong lượt triển khai này.

| ID / trạng thái | Phạm vi duy nhất | Phụ thuộc | Nghiệm thu | Kiểm thử / bằng chứng | Điều kiện chặn |
|---|---|---|---|---|---|
| B01 — PASS baseline (08/10/2026) | Đã chạy mô phỏng 90 ngày hiện có, không sửa kinh tế/code | Commit 07ff96c; chỉ backlog untracked trước chạy; stash giữ nguyên | Exit 0, 4/4 test PASS; T1–T9 ngày 1/4/9/18/27/40/55/72/90, T10 chưa đạt; cuối kỳ cấp 58, 48 chậu, 1 xu | [Báo cáo và bảng được lưu trong plans](sky-sim-90-bao-cao.md); log/baseline/exit tại storage/sky-garden-qa | Không chứng nhận cân bằng: cursor ledger làm thiếu skyCoins/skyXp khi ledger đầy; xử lý ở B02; chưa test máy thật/server |
| B02 — PASS đo lường (08/10/2026) | Sửa thống kê theo entry mới mỗi transition, regression 3300 entry và xuất 90 dòng/JSON nguồn–sink | B01 giữ nguyên | 101502 xu gross, 122101 sink, 12754 XP mây; max 150/ngày; T10 chưa đạt; failedFloorAttempts không phải chứng minh kẹt | 12 test mục tiêu PASS, typecheck exit 0, hai mô phỏng 4/4 PASS exit 0; 90 dòng tái lập giống hệt; [bằng chứng B02](sky-sim-90-bao-cao.md) | Chưa chứng nhận cân bằng/toàn kho; B03+ chưa làm; không đổi luật hoặc assertion |
| B03 — Có điều kiện | Tham số hóa hồ sơ 1/3/6 lần và nhiều seed cố định | B02 | Mỗi cấu hình tái lập được; có phân vị ngày tầng 5–10 và tồn kho | Unit lịch phiên; lưu report từng seed/hồ sơ | Không có nguồn lực chạy thì ghi chưa chạy, không giảm tiêu chí |
| B04 — Có điều kiện | Thêm hồ sơ nghỉ 7–14 ngày, không bạn/sự kiện, chỉ đất, giàu tài nguyên | B03 | Không soft-lock; tài nguyên không âm; XP mây không quá 150/ngày | Test bất biến mỗi thao tác/ngày, bảng đường mở tầng; hai thiết bị dành B10 | Simulator không chứng minh server/race |
| B05 — Có điều kiện | Đánh giá cân bằng và đề xuất thay đổi dữ liệu tối thiểu | B01–B04 | So mục tiêu tầng 5 ngày 20–30; tầng 10 có đường thường trực, không vòng lời; lệch được ghi rõ | Báo cáo trước/sau nếu sửa; export luật và parity guard | D04 hoặc mục tiêu cần đổi: xin duyệt, không nới assertion để PASS |
| B06 — Sẵn sàng | Lập contract tưới giúp theo đường tưới đất hiện hành | Đọc luật tưới, event/quota/guard hiện tại | Chốt UID+cycle, giờ server, auth/bạn bè, quota hai phía, budget, cooldown và lỗi; không tạo lượt nước thứ hai | Test contract dự kiến và bảng race | Nếu luật đất/§0 chưa rõ quota tưới: chỉ dừng contract, không tự lấy quota bắt bọ 5 |
| B07 — Có điều kiện | Thêm server tưới mây và guard thời gian chín | B06 | Giao dịch nguyên tử, idempotency cùng chu kỳ, từ chối cây chín/sai chủ/sai chu kỳ, có event hợp lệ để guard xác minh | PHP tự kiểm trên DB tạm: replay/race/rollback/quota/giờ giả | Không dùng DB production; thiếu contract chốt |
| B08 — Có điều kiện | Áp event tưới trong reducer/parser và đồng bộ | B07 | Áp đúng một lần, không áp sau thu/trồng lại, không mất event khi reload; bản cũ đọc được | Unit reducer/parser, guard parity, 409/mất response | Không thay schema chỉ vì tài liệu cũ ghi số version |
| B09 — Có điều kiện | UI tưới khi thăm mây và vi/en | B08 | Nút/hitbox riêng ≥44 px, báo quota/thành công/lỗi, không bắt bọ/thu nhầm | Integration UI; ảnh headless nhiều viewport | Không chứng nhận máy thật bằng headless |
| B10 — Có điều kiện | Test cách ly 2 tài khoản và đổi phiên khi request chờ | B09; bắt bọ hiện có | A/B chỉ sửa đúng vườn; không lộ ledger/secret; logout/đổi chủ bỏ response cũ; quota không nhân khi race | DB tạm, 2 browser context; stale version, timeout sau commit, 2 tab cùng account; test bắt bọ và tưới | Không dùng mail/thông tin thật; không thay thế test hai máy |
| B11 — Bị chặn thiết bị | Nghiệm thu G5 hai tài khoản trên hai máy | B10 | Video và checklist thăm/tưới/bắt bọ, quota, reload và đồng bộ đạt | Ghi model/OS/browser, ca thực tế | Cần 2 máy/tài khoản thử và người thực hiện; chưa có thì CHƯA KIỂM THỬ |
| B12 — Sẵn sàng | Tái hiện đường nối kệ desktop bằng game sandbox | Không | Có ảnh trước ở 1366×768, overview/focus, 5 tầng và ghi tọa độ seam | Dùng [script ảnh game](../scripts/sky-garden/game-shots.mjs); so với [ghi chú](vuon-may.md:52) | Nếu không tái hiện: đóng dưới dạng không tái hiện, không sửa mò |
| B13 — Có điều kiện | Sửa seam kệ đúng nguyên nhân | B12 có lỗi | Không lộ nối/crop khi zoom/DPR; không đổi slot/gameplay | Ảnh trước/sau 360/390/430/768/1366, ngày/đêm | Asset thay thế phải đúng quyền thử nghiệm |
| B14 — Sẵn sàng | Audit UX/mobile/a11y của mây | Không | Danh sách lỗi tái hiện riêng: hitbox, cuộn/focus, safe area, sheet, 200% chữ, fallback, reduced motion, tab ẩn, trạng thái lưu | Sandbox và unit layout/i18n; mỗi lỗi phát sinh tạo mục sửa độc lập | D01 không chặn sửa lỗi khách quan, chỉ chặn chốt layout |
| B15 — Có điều kiện | Sửa từng lỗi UX đã tái hiện, một lỗi một commit | B14 | Ca lỗi có test hồi quy, không đổi tài sản/UID khi đổi camera | UI/unit/screenshot; chạy lại ca liên quan | Không gom refactor ngoài phạm vi |
| B16 — Sẵn sàng | Tái xác minh lỗi lint/format/test lịch sử và chạy regression nền | Không | Phân biệt lỗi baseline, regression mới, chưa chạy; không dùng số test cũ | Các lệnh §6, lưu output đã lọc nhạy cảm | Build export snapshot có thể cần DB: chỉ dùng fixture/local được phép |
| B17 — Bị chặn thiết bị | Đo Android/iPhone thật và duyệt Q4 | B13/B15 | Hitbox ≥44, FPS ≥30 Android ghi model, thời gian thao tác ≤3 giây theo mạng ghi rõ; quyết định focus có người duyệt | 360/390/430 và desktop; video, JS/asset bytes, mạng, phiên bản | Thiếu thiết bị/quyền duyệt: không PASS G1/mobile |
| B18 — Sẵn sàng | Audit G6 registry và sự khác biệt code–§0 | B01 để có baseline kinh tế | Đếm cây/chậu thật/placeholder, complete bộ, ID; lập bảng D04 và metric/reward còn thiếu | Test registry hiện có và danh sách gap có file/line | Không tự công nhận placeholder là nội dung phát hành |
| B19 — Có điều kiện | Thêm metric thành công mây và xác minh server, chưa thưởng mới | B18 | Đếm thu/bắt bọ/máy/thùng/chuyến/nâng sao/giúp đúng một lần; parser cũ an toàn | Reducer, export luật, guard chống sửa tally/retry | Chính sách đếm thử nâng sao hay thành công phải ghi rõ theo đặc tả |
| B20 — Có điều kiện | Thêm eligibility và chọn nhiệm vụ mây ngày/tuần | B19 | Chỉ bốc việc làm được, tối đa 1 xã hội, danh sách cố định ngày/tuần UTC+7 | Unit không máy/khinh khí cầu/bạn; reload, qua ngày | Reward chưa duyệt có thể giữ thử nghiệm tắt, không phát tài nguyên mới |
| B21 — Có điều kiện | Claim nhiệm vụ mây, XP cap và UI vi/en | B20 + duyệt bảng reward | Nhận một lần; XP mây trong 150/ngày; không tạo nguồn bắt buộc từ xã hội | Guard/claim/replay/biên ngày; chạy lại mô phỏng | D05 reward chưa chốt |
| B22 — Có điều kiện | Thành tựu mây theo §5.8 | B19 + duyệt reward | Mốc T3/T5/T10, ★5, đủ bộ, bọ vàng/100 đom đóm được server chứng minh; claim bền vững | Parser cũ, claims/retry, registry complete, i18n; mô phỏng | Không dùng số đếm tự khai để thưởng |
| B23 — Sẵn sàng | Thiết kế contract sự kiện Tết/Trung Thu | B18 | Lịch UTC+7, điều kiện, reward/tiền dư, kết thúc, đường thay thế; chu kỳ cũ hoàn tất | Ma trận trước/trong/sau mùa và dependency graph | Chưa duyệt lịch/reward thì không bật event |
| B24 — Có điều kiện | Engine sự kiện sau cờ tắt và kiểm thử thời gian | B23 được duyệt | Claims không lặp, chậu giữ sau mùa, không khóa tiến trình thường trực | Test clock/guard/parser, mô phỏng event và no-event | Chặn nội dung công khai bởi D03/D05 |
| B25 — Có điều kiện | Trang trí mây chỉ thẩm mỹ | Danh mục/giá được duyệt; B18 | Không chiếm ô, không bonus kinh tế; vị trí lưu an toàn và toggle tắt | Test mua/đặt, guard nếu trừ xu, layout và reduced motion | Asset mới thiếu quyền/giá thì chỉ contract/placeholder thử |
| B26 — Bị chặn sản phẩm | Cộng hưởng 2/4/6 và preset tối đa 3 | D05 + B05/B18 | Bảng %/ưu tiên/trần duyệt; không chồng combo cũ; preset nguyên tử, UID/cây/revision hợp lệ | Unit biên/guard/race, mô phỏng trước/sau | Không thay 4 hiệu ứng §0.6 hiện hành trước duyệt |
| B27 — Bị chặn sản phẩm | Trợ thủ: chọn lát cắt thông báo trước tự động hóa | D05 | Duyệt vai trò/quota/cooldown, notification không tạo bọ; tự thu phải server claim idempotent | Test replay/ownership/quota rồi mô phỏng | MVP không tự động hóa kinh tế; chưa duyệt không triển khai auto-claim |
| B28 — Sẵn sàng | Manifest asset mây và backlog nguồn lớn/chậu thiếu | B18 | Từng asset có nguồn/quyền/kích thước/alpha/anchor, placeholder; không upscale giả | Contact sheet sáng/tối/mây; đối chiếu [quyền asset](../assets/sky-garden/README.md) | Quyền thử nghiệm không phải quyền thương mại |
| B29 — Bị chặn asset | Hoàn thiện art mây theo từng lô nhỏ | B28 + quyền/nguồn được duyệt | Ưu tiên nguồn ≥1024, Đất nung, kệ/đậu/máy, cây 4 giai đoạn, bọ, bộ thiếu; từng lô PASS mới gắn | Registry/alpha/anchor/byte tải/contact sheet; mô phỏng nếu đổi luật | Không crop tham chiếu hoặc làm đủ 36 chậu giả |
| B30 — Sẵn sàng | Inventory origin và tính năng cho CSP site chính | Không | Ghi đúng origin của YouTube embed/API, PlayCanvas/WebGL/worker/WASM nếu dùng, ảnh/font/media; phân biệt admin/upload | Network local không token, đọc config/frontend, ma trận chức năng | Không mở wildcard hoặc unsafe-eval chỉ theo phỏng đoán |
| B31 — Có điều kiện | CSP Report-Only trên môi trường cách ly | B30 | Chính sách tối thiểu, report lọc query/token/PII, test YouTube/phát video/WebGL/login/upload | Test header và chức năng trên build production local | Không sửa config VPS; header report-only cần môi trường hỗ trợ |
| B32 — Có điều kiện | Chuẩn bị CSP enforce và rollback, chỉ local | B31 | Không vi phạm hợp lệ; nguồn không cho phép bị chặn; admin/upload không suy giảm | Browser regression, header tests, report review | Bật production cần duyệt vận hành riêng, ngoài backlog thực thi này |
| B33 — Sẵn sàng | Quét secret an toàn không tiết lộ giá trị | Không | Scanner redacted, phạm vi file tracked và history được phép; output chỉ rule/path/line/fingerprint; không quét stash hay mở secrets | Test bằng secret giả; xác nhận redact trước scan; báo finding không chép đoạn khớp | Không có scanner an toàn thì dừng; secret thật cần chủ quản rotate riêng |
| B34 — Sẵn sàng | Advisory dependency và đề xuất remediation riêng | Lockfile hiện có | Phân loại runtime/dev, reachable, version fix; không auto-fix-force hoặc gửi mã/secrets lên dịch vụ | Audit dependency chỉ metadata, output sanitised, test patch từng dependency nếu được duyệt | Network chưa được phép thì ghi chưa chạy; breaking change cần duyệt |
| B35 — Sẵn sàng | Tái chụp đáy đảo màn rộng/ngang | Không | Kết luận tái hiện hay đóng không lỗi ở 1280×800, 1920×1080, 844×390 | Script screenshot theo [plan](nong-trai-va-nhiem-vu-03-10.md:66), kiểm tham số viewport trước chạy | Không tự coi đường cắt còn tồn tại |
| B36 — Bị chặn asset nếu có lỗi | Sửa chân đảo bằng lô asset độc lập | B35 tái hiện + quyền art | Không seam/cắt, không đổi camera/hitbox ngoài yêu cầu | So ảnh trước/sau desktop/mobile | Thiếu hình hợp lệ |
| B37 — Sẵn sàng | Audit vật phẩm/cây nông trại theo registry hiện tại | Không | Đếm có/thiếu/mượn hình/sai loài và confidence mới; ưu tiên nông sản riêng, giai đoạn thiếu, ong | [test vật phẩm](../src/domain/farmItems.test.ts), manifest/contact sheet | Không coi 70/150 lịch sử là số hiện tại |
| B38 — Bị chặn asset | Thêm từng lô vật phẩm đã duyệt | B37 + nguồn/quyền | Cắt/publish đúng ID, không đổi luật nếu chỉ hình, sprite đúng loài/alpha | Test vật phẩm, kho/chợ/bong bóng; export rules chỉ khi đổi cây/luật | Thiếu duyệt hình/loài/quyền |
| B39 — Sẵn sàng | Contract asset bò động/chuồng sạch và hitbox | Không | Yêu cầu layer hoặc walk frames, đường đi, bubble/hitbox đi theo bò; không còn bò bake trùng | Đối chiếu layout và [yêu cầu tranh](nong-trai-va-nhiem-vu-03-10.md:54) | Không dựng chuyển động từ chuồng có bò dính |
| B40 — Bị chặn asset | Bò động, hitbox và regression chạm | B39 + art hợp lệ | Chạm đói/sữa đúng bò ở 3 viewport, không nhầm ruộng; reduced motion | Phone-check và unit hit-test, máy thật ghi riêng | Thiếu chuồng không bò/bò tách hoặc dải frame |
| B41 — Bị chặn duyệt nội dung | Giai đoạn riêng: xin mở lại cốt truyện và duyệt một cung mẫu | D07 | Có người duyệt giọng thoại/nhân vật/xưng hô/bản nhẹ, phạm vi một cung và cảnh tiếp nối, cơ chế random | Checklist đọc diễn/văn hóa/phương ngữ, không viết toàn truyện | Không có yêu cầu mở lại thì giữ tạm dừng; chưa tích hợp |
| B42 — Có điều kiện | Regression tổng và tổng hợp cổng G0–G6 | Các mục kỹ thuật đã làm; bỏ qua mục blocked và liệt kê | Mỗi cổng có PASS/FAIL/CHƯA KIỂM THỬ/BỊ CHẶN cùng bằng chứng; không bật production | Unit/PHP/i18n/rules/motion/build, UX và ma trận §16 | Q4/Q5/Q6, asset, thiết bị, balance hoặc P0/P1 chưa đạt vẫn chặn phát hành |

Quy tắc khi một mục phát hiện nhiều bug: tạo ID con với cùng cấu trúc phạm vi/phụ thuộc/nghiệm thu/test/chặn; làm lần lượt, không biến mục audit thành refactor lớn. Sau mỗi mục cập nhật bảng này và bàn giao kết quả cho tác vụ cha.

## 5. Tác vụ code đầu tiên: B01 — mô phỏng 90 ngày, lưu số liệu

Không sửa kinh tế trước khi có baseline. Không dựng lại simulator. Chạy tại workspace root bằng Windows CMD; Node và dependency phải sẵn có. Nếu thiếu dependency, kiểm package/lock và xin quyền cài trước; không cập nhật lockfile vô cớ.

Lệnh thực thi (khối lệnh là hướng dẫn cho tác vụ sau, chưa được chạy trong lượt này):

```bat
if not exist storage\sky-garden-qa mkdir storage\sky-garden-qa
set SIM_DAYS=90
set TZ=Asia/Ho_Chi_Minh
npm run sky:sim > storage\sky-garden-qa\sim-90-run.log 2>&1
set SIM_EXIT=%ERRORLEVEL%
echo %SIM_EXIT% > storage\sky-garden-qa\sim-90-exit.txt
set SIM_DAYS=
set TZ=
```

Cần lưu/khôi phục biến môi trường cũ nếu đã được đặt; không dump toàn bộ environment. Script [mô phỏng](../scripts/sky-garden/sim.mjs:5) truyền cờ báo cáo xuống runner; [test](../src/domain/skySim.test.ts:274) tự tạo [bảng dự kiến](../storage/sky-garden-qa/sim-90.txt). Ghi log không chứa thông tin tài khoản thật; simulator dùng progress giả.

B01 nghiệm thu:
1. Xác nhận exit code 0 và số test thực chạy; không chỉ nhìn file bảng vì bảng được ghi trước assertions.
2. Đọc bảng mới; ghi seed 20261008, 8h/13h/21h, timezone, cấp đầu 12, xu đầu 800, nguồn đất 260 XP/220 xu mỗi ngày, mật/sữa giả định. Ghi commit/runtime và phạm vi giả lập RNG, không tuyên bố đã test HMAC PHP.
3. Tạo [báo cáo mô phỏng dự kiến](sky-sim-90-bao-cao.md) bằng dữ liệu thực: ngày mở T1–T10 hoặc chưa đạt, số dư, XP mây, mục tiêu T5 ngày 20–30, đường đến T10, hạn chế thống kê và assertion.
4. Lưu bảng vào báo cáo hoặc artefact được quản lý rõ; không dựa chỉ vào storage có thể bị ignore. Không viết số đo khi chưa có output. B01 PASS nghĩa là thu baseline thành công, không mặc định kinh tế PASS.
5. Nếu runner hết hạn: giữ log, ghi chưa hoàn tất; chạy lại bằng runner có đủ thời gian, không hạ 90 ngày xuống 21 để kết luận. File cũ không được dùng như kết quả lượt mới.

### Kết quả B01 thực thi 08/10/2026

- Đã chạy `npm run sky:sim` trên Windows/CMD, Node v24.18.0, npm 11.16.0, Vitest 5.0.2; SIM_DAYS=90, TZ=Asia/Ho_Chi_Minh; seed 20261008, 3 phiên 08h/13h/21h, cấp đầu 12/xu 800, đất 260 XP/220 xu mỗi ngày. Biến môi trường đặt trong tiến trình con, không thay môi trường cha.
- Commit nền 07ff96c0e1c5f3b56bdcd730f1274c55c1a54d7c; trước chạy chỉ tài liệu backlog untracked. Không apply/pop/drop stash; định danh stash@{0} e16c54f642be2647381b67e404b3a5e93bea8cf6 giữ nguyên.
- Exit 0; 1 file/4 test PASS; Vitest 544.99 giây. [Báo cáo](sky-sim-90-bao-cao.md) giữ bản bảng 19 dòng lấy mẫu, metadata, mốc tầng, giới hạn và đường dẫn log/exit/baseline. Không mất báo cáo nên không sửa runner/test.
- T5 ngày 27 nằm trong mục tiêu 20–30 cho hồ sơ này; T9 ngày 90, T10 chưa đạt; cấp 58, 48 chậu, 1 xu, 2030 bọ, 0 gem cuối kỳ. B01 PASS không phải kinh tế PASS hoặc cổng G0–G6 PASS.
- B02 tiếp theo: sửa phép đếm delta bị mất khi ledger đạt giới hạn 1000 trước khi kết luận skyCoins/skyXp; thêm 90 dòng và nguồn–sink/tài nguyên còn thiếu, test exporter và tái lập cùng seed. Chưa triển khai B02, không đổi gameplay. Không chạy PHP/DB/production/máy thật/full regression, không push/deploy/bật sky.

## 6. Kiểm thử và báo cáo từng lát cắt

Lệnh project được xác minh trong [manifest](../package.json:6):

```bat
npm run typecheck
npm test -- src/domain/sky.test.ts src/domain/skyGuard.test.ts src/domain/skySim.test.ts
npm run test:server
npm run test:account
npm run test:audit
npm run test:audit:server
npm run check:motion
npm run format:check
npm run lint
npm test
npm run build
```

- Chỉ chạy PHP selftest sau khi đọc setup và xác minh DB tạm; các lệnh trên không phải quyền dùng DB thật. PHP phải nằm trong PATH hoặc cấu hình đường thực thi mà runner hỗ trợ; không in cấu hình secrets khi kiểm.
- i18n: chọn test đang tồn tại bằng inventory code trước chạy; full test bao phủ phần hiện có, không giả tên file test mới.
- Nếu đổi luật: chạy lệnh export đã có ở [manifest](../package.json:18), review diff [luật server](../server/data/game-rules.json) và kiểm parity; không chạy export chỉ để tạo churn.
- Build gọi snapshot exporter theo [manifest](../package.json:8): có thể thay dữ liệu catalogue local. Kiểm tác dụng, dùng DB fixture hoặc chặn bước build, không áp stash catalogue để chữa build.
- Lint/format/test lịch sử chỉ ghi baseline fail khi tái hiện. Không khẳng định lỗi truyện món hoặc các file ghi trong plan vẫn tồn tại.
- Test UI tự động cần kiểm target local, dữ liệu giả, mail reserved và cleanup trước chạy script. Thiết bị thật là việc riêng B11/B17, không ghi model từ tên profile browser.

Mẫu cập nhật sau mỗi ID: trạng thái; commit; phạm vi đã sửa; lệnh/exit code; artefact; kết quả tiêu chí; rủi ro/chặn; ID tiếp theo. Nếu kết quả thiếu bằng chứng: CHƯA KIỂM THỬ, không PASS.

## 7. Bàn giao tác vụ cha

- Chỉ tài liệu này được tạo trong lượt lập kế hoạch; implementation, stash và production không bị tác động.
- Tiếp theo: B01, rồi B02–B05 để lấy số liệu/đánh giá; nhánh tưới B06–B10; kệ/UX/regression B12–B16; G6 kỹ thuật B18–B25 theo duyệt; CSP/scan B30–B34; audit art nông trại B35/B37/B39; tổng hợp B42.
- Không đợi asset hoặc máy thật để làm toàn bộ phần kỹ thuật độc lập. B11/B17/B29/B36/B38/B40 và B26/B27 được giữ trạng thái chặn theo điều kiện thực tế, không loại khỏi backlog.
- Cốt truyện B41 chỉ là giai đoạn duyệt riêng, giữ tạm dừng. Không tự sản xuất lời thoại hoặc tích hợp.
- Khi hoàn tất phần không bị chặn, báo cáo phần còn chặn và dừng đúng ranh giới; mọi deploy/push/bật production cần tác vụ được ủy quyền riêng.

### B02 — cập nhật kết quả thực tế

Đã hoàn tất sửa đo lường và bằng chứng trong [báo cáo B02](sky-sim-90-bao-cao.md). Baseline B01 và các ghi chú “chưa triển khai” phía trên là lịch sử tại cuối B01. Hai chạy 90 ngày cùng seed cho 90 dòng giống nhau; coin/XP đối chiếu từng transition/ngày; xuất nguồn–sink tài nguyên. Có một lượt regression timeout (exit 1), đã tối ưu fixture và chạy lại 12/12 PASS exit 0; không nới assertion/timeout. B03 và các mục sau vẫn chưa hoàn tất.

# Kiểm toán evidence: auth, session, OTP, CSRF/CORS, access/privacy và deployment

Ngày kiểm toán: 02/10/2026 (UTC+7). Phương pháp: đọc mã nguồn/cấu hình mẫu, kiểm tra metadata dependency và self-test hiện hữu trong SQLite bộ nhớ. **Không thay đổi ứng dụng, không truy cập DB thật, không gửi email, không gọi API ứng dụng, không build/export, không đọc secrets hoặc môi trường thật.** Chỉ tạo báo cáo này. Không xác nhận cấu hình đang chạy trên VPS/XAMPP, lịch sử Git, quyền filesystem, proxy/CDN hay nội dung artifact production.

## 1. Quy ước và tổng hợp

- **proven**: đường mã chứng minh hành vi hoặc self-test thực sự quan sát được; không đồng nghĩa đã khai thác production.
- **suspected**: có đường mã đáng lo nhưng còn phụ thuộc concurrency, browser hoặc deployment chưa kiểm chứng.
- **no evidence**: chưa có bằng chứng cho lỗ hổng trong boundary đã đọc; không phải chứng nhận an toàn tuyệt đối.
- Severity mô tả tác động nếu prerequisites thỏa mãn. Likelihood là đánh giá định tính có điều kiện, không phải xác suất đo được.
- Reproduction bên dưới là kế hoạch an toàn cho fixture/môi trường cô lập, **không được thực hiện trên dịch vụ thật**. Chỉ self-test ở mục 5 đã chạy.

Ưu tiên:

| ID | Finding | Trạng thái | Severity | Likelihood |
|---|---|---|---|---|
| A01 | OTP dùng một lần/giới hạn thử không atomic | suspected | High | Trung bình khi có concurrency |
| A02 | OTP 6 số lưu SHA-256 không keyed | proven | Medium | Thấp; cần đọc DB |
| A03 | Magic link đăng nhập bằng GET, không bind browser; URL vào access log | proven / exploit suspected | Medium | Trung bình |
| A04 | Admin thiếu limiter, MFA và thời hạn session do ứng dụng kiểm soát | proven | High | Trung bình nếu public |
| A05 | Admin login/logout nằm ngoài CSRF guard | proven / exploit suspected | Medium | Thấp–trung bình |
| A06 | Secure cookie và TLS phụ thuộc topology; mẫu Nginx chỉ HTTP | suspected | High | Phụ thuộc deployment |
| A07 | Tiến trình client vượt trust boundary sang reward bạn bè | proven bằng test | Medium | Cao với account hợp lệ |
| A08 | Friendship hai chiều không cần chấp nhận; nested dữ liệu vườn passthrough | proven | Medium | Trung bình |
| A09 | Xóa account không atomic; mất effects đã gửi cho người khác | proven bằng test | Medium | Trung bình |
| A10 | Export không bao quát toàn bộ dữ liệu giữ ở server; thiếu retention evidence | proven / no evidence | Medium | Cao về sai lệch mô tả |
| A11 | Default cấu hình không fail-closed cho admin/mail/OTP local | proven / deployment suspected | High có điều kiện | Trung bình nếu copy mẫu |
| A12 | Body đọc không bounded, danh sách admin lấy toàn bộ trước giới hạn | proven | Medium | Trung bình |
| A13 | Optimistic concurrency trả success dù UPDATE không thắng | suspected | Medium | Trung bình khi nhiều device |
| A14 | Git ignore không bao phủ mọi biến thể môi trường/backups | proven / leakage no evidence | Medium | Thấp–trung bình |
| A15 | Daily quota/social writes có check-before-write | suspected | Low–Medium | Trung bình khi concurrency |

Không phát hiện bypass trực tiếp owner progress, visit không phải friend, ACK của recipient khác hay admin users không cần auth. Không thấy CORS allow-origin/allow-credentials trong PHP đã tìm kiếm. Metadata npm audit trả **0 advisory**, không chứng minh dependency/supply chain tuyệt đối an toàn.

## 2. Bản đồ boundary và kiểm soát tích cực

### Guest

Router guest kiểm header ứng dụng cho mọi method không phải GET: [router](../server/api/index.php:74). [Account::requireAppHeader()](../server/lib/Account.php:275) yêu cầu giá trị cố định; đây là **custom-header CSRF defense**, không phải bearer secret. [Client](../src/services/account.ts:34) dùng request cùng origin và thêm header cho write. Khi server không mở CORS cho origin không tin cậy, browser không thể gửi cross-origin custom header sau preflight thất bại. GET magic-link và GET có side effects không được bảo vệ bởi guard này.

[Session guest](../server/lib/Account.php:119) dùng 32 byte ngẫu nhiên, DB chỉ giữ hash; cookie HttpOnly, SameSite=Lax và path hẹp [cookie](../server/lib/Account.php:128). Query kiểm expiry và owner [current](../server/lib/Account.php:144). Logout xóa token hiện tại [logout](../server/lib/Account.php:171), admin có thể revoke tất cả token [AdminUsers::signOut()](../server/lib/AdminUsers.php:128). Thời hạn guest cố định 180 ngày, không có idle timeout/rotation trong đoạn đã đọc; token bị đánh cắp có thể sống đến hết hạn hoặc revoke.

[Progress](../server/lib/Account.php:182), [preferences](../server/lib/Account.php:220), [export](../server/lib/Account.php:228), [delete](../server/lib/Account.php:253) lấy owner từ session, không nhận user ID từ caller. [Friend lookup](../server/lib/Friends.php:648) join friendship theo caller; [ACK](../server/lib/Friends.php:589) UPDATE ràng buộc recipient. Các giá trị SQL sử dụng prepared statements; placeholder ACK sinh từ số lượng ID, không nối ID thô vào SQL.

### Admin

[Auth::login()](../server/lib/Auth.php:26) so sánh constant-time, regenerate session ID và sinh CSRF ngẫu nhiên. [Auth::require()](../server/lib/Auth.php:56) kiểm session rồi CSRF cho write; [admin router](../server/api/index.php:135) đặt gate trước users/catalogue/AI/upload. [AdminUsers](../server/lib/AdminUsers.php:77) trả timestamps, không trả bearer token. [Admin UI](../server/admin/admin.js:1194) escape email/name/consent và nhận numeric summary được ép kiểu [row](../server/lib/AdminUsers.php:160); chưa có evidence guest-to-admin stored XSS ở các trường này. XSS từ toàn bộ catalogue/upload không phải phạm vi kiểm toán sâu của báo cáo này.

### Deployment và secrets

[Root deny](../.htaccess:1) từ chối direct project root; [Apache](../deploy/apache/angi.local.conf:5) và [Nginx](../deploy/nginx/angi.conf:6) dùng thư mục build làm webroot, chỉ expose các alias hẹp. Không có alias cho library, CLI, database hay log. Upload Apache cấm một số executable extensions [uploads](../deploy/apache/angi.local.conf:80); Nginx không có generic PHP executor, chỉ FastCGI cố định cho API/share [API](../deploy/nginx/angi.conf:64). Vì vậy **không có evidence upload arbitrary PHP execution từ cấu hình mẫu**, cũng không khẳng định mọi extension/server module thực tế đã an toàn.

[Bootstrap](../server/lib/bootstrap.php:16) định nghĩa loader môi trường lazy: chỉ gọi khi hàm môi trường thực sự được dùng. Môi trường process ưu tiên hơn giá trị file, nhưng lần gọi đầu vẫn nạp file trước khi kiểm process override. Không in ra secrets trong API errors [catch](../server/api/index.php:219). [Vite config](../vite.config.ts:4) chỉ đưa URL công khai vào HTML; không có cấu hình define gom toàn bộ process environment, sourcemap tắt. Không đọc artifact build hoặc môi trường thật nên **không có evidence bundle có/không có secret ngoài đường config đã kiểm**.

## 3. Findings chi tiết

### A01 — OTP consumption, attempts và quota không atomic

**suspected · High · likelihood trung bình.** Evidence: [verifyCode](../server/lib/Account.php:65) SELECT attempts trước khi UPDATE; [verifyLink](../server/lib/Account.php:88) SELECT unused trước khi sign-in; [signIn](../server/lib/Account.php:103) UPDATE used không điều kiện unused và không kiểm affected rows; [requestCode](../server/lib/Account.php:33) COUNT quota rồi INSERT riêng.

Prerequisites: nhiều request đồng thời vào cùng challenge; thành công replay cần biết OTP/token hợp lệ. Attack không đồng nghĩa đoán thành công: chỉ một triệu khả năng và cửa sổ 600 giây vẫn còn là điều kiện.

Reproduction an toàn: fixture có một challenge tổng hợp, barrier cho hai worker đọc trước khi consume; đếm session tạo và attempts. Không gọi OTP request thật. **Chưa chạy test concurrent OTP**; self-test hiện hữu không bao phủ finding này.

Safe fix: transaction/row lock hoặc compare-and-swap consume với điều kiện unused, expiry và attempts; chỉ tạo session khi consume thắng. Increment attempts/limit và reservation quota atomic; áp dụng limiter verify theo IP/challenge/email. Acceptance: hai consume đồng thời chỉ một success/session; không quá 5 lần thử/challenge; quota không vượt khi race; lỗi không để lại challenge đã consume nhưng session chưa tạo.

### A02 — OTP hash có entropy thấp

**proven cấu trúc · Medium · likelihood thấp.** [Generation và hash](../server/lib/Account.php:45), [hash helper](../server/lib/Account.php:297) cho thấy OTP 6 số được SHA-256 trực tiếp. Magic token 24 byte và session 32 byte không có cùng vấn đề entropy.

Prerequisites: attacker đọc DB/backup chứa challenge còn hiệu lực. Reproduction an toàn: dùng hash của OTP tổng hợp trong bộ nhớ, tìm trong không gian 000000–999999; không dùng dữ liệu thật, chưa chạy. Safe fix: HMAC challenge-specific dùng key server tách DB, thời hạn ngắn và consume atomic; không coi hash thuần là bảo vệ mạnh OTP. Acceptance: DB dump đơn độc không xác minh offline được OTP; xoay key có chính sách rõ ràng.

### A03 — Magic link GET, login CSRF và URL log

**proven GET side effect/log format · exploit suspected · Medium.** [Link](../server/lib/Account.php:55) đặt bearer token trong query; [GET route](../server/api/index.php:104) sign-in trực tiếp; [verifyLink](../server/lib/Account.php:88) không bind browser, không yêu cầu confirmation và không phát Cache-Control no-store riêng. [Apache CustomLog common](../deploy/apache/angi.local.conf:118) ghi request line gồm query; Nginx effective logging chưa kiểm chứng.

Prerequisites: nạn nhân mở link hợp lệ của account attacker, hoặc mail scanner mở link trước người dùng; log exposure cần quyền đọc log và token chưa hết hạn/consume. Safe reproduction: fixture link cho account tổng hợp trong browser cô lập, không email/API thật; xác nhận account đổi sau navigation. Chưa chạy. Safe fix: GET chỉ landing không consume, POST confirm có origin/CSRF, challenge bind browser nếu phù hợp; no-store và no-referrer cho flow; redact query token ở log. Acceptance: scanner GET không consume, link của attacker không silently đổi account nạn nhân, access log không giữ bearer token, replay thất bại.

### A04 — Admin authentication hardening thiếu

**proven trong lớp/route · High · likelihood trung bình nếu public.** [Auth](../server/lib/Auth.php:26) chỉ delay 600 ms khi sai; không thấy persistent/IP/account limiter, MFA, absolute/idle timeout hay session credential-version check. [require](../server/lib/Auth.php:56) chỉ kiểm session có admin. Thay mật khẩu cấu hình không tự revoke session cũ trong đường này. Không biết PHP session GC, strict-mode hoặc limiter edge thực tế.

Prerequisites: public admin login, mật khẩu yếu hoặc token admin bị lộ. Safe reproduction: review hoặc fixture fake clock/credential version; không brute-force endpoint thật. Safe fix: limiter có backoff bounded không giữ worker lâu, MFA, TTL/idle timestamp, revoke/version khi rotate mật khẩu, PHP strict session mode; secret hashing phù hợp. Acceptance: burst bị giới hạn, hết TTL bị 401, credential rotation revoke sessions, session fixation fixture thất bại. Không khẳng định plaintext admin env tự nó là remote exploit; việc quản lý secret/process/filesystem là prerequisite.

### A05 — Admin login/logout bypass CSRF gate

**proven đường route · browser exploitation suspected · Medium.** [Login/logout](../server/api/index.php:126) được xử lý trước [Auth::require()](../server/api/index.php:135). [read_json_body](../server/lib/bootstrap.php:125) không bắt content type JSON. SameSite=Strict giảm cross-site cookie risk nhưng không ngăn mọi login CSRF hoặc same-site khác origin.

Prerequisites: navigation/form có body parseable JSON theo browser, hoặc same-site origin không tin cậy; login account attacker có credentials hợp lệ. Reproduction an toàn: browser harness offline/fixture kiểm Origin và text/plain form, không gọi admin thật. Chưa thực hiện, không tuyên bố cross-site JSON fetch đọc được response. Safe fix: bảo vệ logout bằng session CSRF; login kiểm Origin/Fetch Metadata, exact content type, pre-auth CSRF khi cần. Acceptance: logout thiếu token 403; foreign-origin login bị chặn; legitimate login/logout hoạt động.

### A06 — TLS, proxy trust và Secure cookie chưa bảo đảm

**suspected deployment · High.** [Nginx mẫu](../deploy/nginx/angi.conf:6) chỉ listen HTTP; comment hướng dẫn certbot không phải chứng cứ TLS đang active. [Apache local](../deploy/apache/angi.local.conf:5) HTTP là chủ đích local. [Admin cookie](../server/lib/Auth.php:16) dựa HTTPS không rỗng; [guest cookie](../server/lib/Account.php:133) còn tin forwarded-proto không kiểm proxy. Giá trị HTTPS='off' vẫn không rỗng; guest header client-supplied có thể làm Secure trên HTTP khiến session không dùng được, không tự chứng minh bypass auth.

Prerequisites: production không redirect TLS hoặc TLS termination không truyền HTTPS đúng/trust proxy không giới hạn. Reproduction an toàn: fixture server variables và isolated config lint; không gửi credentials qua HTTP thật. Safe fix: production HTTPS-only, HSTS sau xác nhận TLS, truyền trusted HTTPS canonical, không tin forwarded header trực tiếp, Secure bắt buộc production. Acceptance: HTTP redirect trước auth; cả cookie Secure/HttpOnly đúng; reverse proxy giả header bị bỏ qua; không downgrade.

### A07 — Client snapshot trở thành authority cho social reward

**proven bằng self-test · Medium · likelihood cao với account hợp lệ.** [putProgress](../server/lib/Account.php:192) chỉ kiểm array, guestId và 512 KiB; [payReferrals](../server/lib/Friends.php:239) tin milestone từ snapshot; [gift](../server/lib/Friends.php:472) không debit/check stock server. [Provider](../src/state/AccountProvider.tsx:76) gửi cả state; validation client không tạo server authority.

Prerequisites: đăng nhập và friendship; dữ liệu kinh tế hiện là game, chưa có evidence đổi tiền thật. Reproduction đã chạy trong self-test: forged XP/coins lưu nguyên, gift durian stock=0 vẫn tạo event, milestones trả 200 coins/90 XP cho mỗi bên; xóa/tạo lại account có thể nhận milestones lại. Safe fix: giữ snapshot client-owned nếu chỉ cosmetic nhưng không dùng cho transferable reward; server-owned command/ledger/inventory cho social effects. Acceptance: forged progress không mint social rewards; gift thiếu stock bị reject atomic; milestone trả đúng một lần theo identity/challenge policy rõ ràng.

### A08 — Friendship unilateral và privacy nested passthrough

**proven · Medium.** [add](../server/lib/Friends.php:178) biết code là liên kết hai chiều không cần accept; [visit](../server/lib/Friends.php:343) trả toàn bộ nested animals/decorLayout nếu array. Progress API chấp nhận arbitrary keys; vậy caller có thể vô tình lưu dữ liệu nhạy cảm trong nested fields và nó được chia sẻ với friend. Không có evidence ứng dụng bình thường đặt GPS/photo blob ở đó.

Prerequisites: account hợp lệ, biết code vườn; hoặc owner đưa extra fields vào snapshot. Reproduction an toàn: existing fixture đã chứng minh malformed nested pass-through; fixture thêm marker giả email trong nested field để kiểm projection, chưa chạy marker privacy. Safe fix: consent rõ code là capability hoặc invitation/accept, block/revoke/rotate code; allowlist schema sâu và chỉ public projection. Acceptance: không tự tạo mutual friendship nếu policy cần accept; nested private marker không xuất hiện trong visit; field/size bounds áp dụng sâu.

### A09 — Xóa guest không atomic và xóa effects người nhận

**proven bằng test · Medium.** [Account::delete()](../server/lib/Account.php:253) deletes tuần tự không transaction; xóa cả events from_user cho recipient khác. [AdminUsers::delete()](../server/lib/AdminUsers.php:138) có transaction nhưng cũng xóa events hai chiều; không explicit delete referrals, phụ thuộc cascade [SQLite](../server/sql/schema.sqlite.sql:179), [MySQL](../server/sql/schema.sql:194).

Prerequisites: DB failure giữa các statements hoặc sender xóa account khi recipient chưa persist effects. Reproduction đã chạy: trigger fail delete friendship khiến user còn nhưng events đã mất; xóa sender làm pending gift/referral biến mất. Safe fix: transaction toàn bộ deletion, anonymize actor cho committed recipient effects thay vì xóa effect, tách dữ liệu cá nhân khỏi ledger. Acceptance: mọi injected failure rollback; recipient balance/events không mất khi sender xóa; cả driver cascade bật và được kiểm thử. Không coi khác biệt explicit referrals của admin là orphan đã proven khi schema cascade hoạt động.

### A10 — Export/retention và lời hứa privacy chưa đầy đủ

**proven export omission · Medium; retention no evidence.** [Export](../server/lib/Account.php:227) mô tả mọi dữ liệu nhưng không trả login-code metadata/IP hash, farm-event history/delivery metadata, thời điểm friendships/referrals đầy đủ. [Schema challenge](../server/sql/schema.sqlite.sql:114) giữ email/IP hash/timestamps. Trong PHP tìm kiếm không thấy purge challenge/session theo expiry; chưa kiểm scheduler ngoài repo.

Prerequisites: dữ liệu này còn lưu sau hoạt động. Safe reproduction: fixture tạo metadata/events tổng hợp rồi so field export với schema; chưa chạy. Safe fix: data inventory, export metadata phù hợp không xuất bearer/code hashes, retention/purge có policy và minimization. Acceptance: owner nhận đầy đủ dữ liệu cá nhân theo policy, không secrets; expired challenges/session được purge theo SLA; deletion bao gồm backups/log retention hoặc giải thích giới hạn.

Photo boundary tích cực: [photoStore](../src/services/photoStore.ts:1) lưu blob ở IndexedDB và re-encode canvas; snapshot sync chứa photo slot keys chứ không có chứng cứ gửi blob. **Không có evidence upload ảnh check-in/GPS tự động qua account**. Tuy vậy server không enforce “không ảnh/không location” trên arbitrary JSON [putProgress](../server/lib/Account.php:195); privacy promise nên phân biệt hành vi client bình thường với server schema.

### A11 — Production copy mẫu có thể giữ placeholder hoặc log OTP

**proven cấu hình default · deployment suspected · High có điều kiện.** [Mẫu admin](../.env.example:17) chứa mật khẩu placeholder không rỗng mà [Auth::login()](../server/lib/Auth.php:29) chấp nhận nếu deploy nguyên; [APP_ENV local response](../server/lib/Account.php:59) trả devCode; mẫu production vẫn chọn [mail log](../.env.example:20). [Mailer](../server/lib/Mailer.php:31) default/driver lạ fallback log; [viaLog](../server/lib/Mailer.php:94) giữ recipient, OTP, magic link và latest HTML trên disk. APP_KEY fallback chỉ dùng IP hashing, không được nhầm là session signing key.

Prerequisites: deploy copy mẫu không đổi admin/password/mail hoặc để local; đọc OTP log cần quyền filesystem/backup exposure. Không biết giá trị thực tế và **không đọc để xác minh**. Safe reproduction: pure config-validation fixture, không gọi mail/requestCode thật. Safe fix: production startup/config check reject placeholder, local, log/unknown driver, thiếu URL HTTPS/key/mail config; private log permissions/rotation/redaction, no sensitive subject logging. Acceptance: unsafe config fail closed trước nhận request; không devCode production; không OTP/token log production; không âm thầm “sent=true” khi transport thực tế chỉ log.

### A12 — Resource bounds đặt sau đọc body; admin list không giới hạn DB

**proven · Medium.** [Body](../server/lib/bootstrap.php:125) đọc toàn bộ input và decode trước [512 KiB check](../server/lib/Account.php:200); guest account route đã [khởi tạo DB/catalogue](../server/api/index.php:54) trước CSRF/auth. [Nginx](../deploy/nginx/angi.conf:14) cho 64 MiB chung. [AdminUsers::list()](../server/lib/AdminUsers.php:24) lấy mọi user/full progress rồi map/sort trước slice 500.

Prerequisites: endpoint public nhận large requests hoặc nhiều accounts/snapshots; admin list DoS cần admin request hoặc dashboard tự poll. Safe reproduction: bounded synthetic payload/load trong isolated harness, không stress live service. Safe fix: route-specific transport/body byte limits, bounded stream, JSON depth/schema limits, auth gate trước DB khi có thể, SQL pagination/project summaries. Acceptance: request vượt giới hạn rejected trước allocation lớn; account limit không dùng 64 MiB upload cap; admin query bounded và không decode toàn bộ users.

### A13 — Progress compare-and-swap không kiểm affected rows

**suspected concurrency · Medium.** [putProgress](../server/lib/Account.php:204) đọc version rồi UPDATE có version predicate nhưng không kiểm rowCount; cuối hàm vẫn trả version current+1. Hai writes cùng base có thể một write không apply nhưng nhận success; initial INSERT race có thể 500.

Prerequisites: hai device/requests đồng thời cùng owner/baseVersion. Safe reproduction: fixture barrier giữa SELECT/UPDATE; chưa chạy. Safe fix: affected-row check và 409 khi thua CAS, atomic insert conflict handling. Acceptance: đúng một success, request thua 409/current version, không false saved hay generic 500 cho conflict.

### A14 — Ignore policy không phải secrets prevention toàn diện

**proven pattern gap · leakage no evidence · Medium.** [.gitignore](../.gitignore:7) ignore exact environment thật và một số storage/logs; pattern local chỉ phủ phần tên kết thúc local. Không có blanket pattern cho mọi môi trường production/staging, dump, key hoặc archive. [access note](../.gitignore:23) chỉ chặn một tên riêng. Không kiểm Git history/tracked content nên không tuyên bố đã leak secret hay ignore bảo đảm file chưa tracked.

Prerequisites: developer tạo biến thể secret và commit, hoặc backup publish. Safe reproduction: kiểm ignore với tên giả nếu được phép; chưa chạy. Safe fix: policy allowlist sample, secret scanner pre-commit/CI, artifact packaging denylist, review historical exposure riêng; rotate nếu phát hiện thực tế. Acceptance: fixture filename bí mật bị reject; sample vẫn commit được; CI scan redacted, không in secrets; package deploy không mang DB/log/credentials.

### A15 — Social quota race và GET side effects

**suspected quota race; proven GET side effects · Low–Medium.** [add](../server/lib/Friends.php:197) check count rồi insert hai chiều không transaction; [water](../server/lib/Friends.php:403), [steal](../server/lib/Friends.php:449), [gift](../server/lib/Friends.php:484) kiểm daily total trước write. Unique keys bảo vệ duplicate cùng cặp/ngày, không khóa tổng quota across different friends. [GET events](../server/api/index.php:99) tạo gift/pay referrals [events](../server/lib/Friends.php:558); GET friends trả referrals cũng có writes [referrals](../server/lib/Friends.php:269); GET profile có ensureProfile insert.

Prerequisites: requests đồng thời đến nhiều friend, hoặc navigation GET kèm cookie. Safe reproduction: barrier fixture nhiều friends/ngày; chưa chạy. Safe fix: transaction/counter atomic cho aggregate limits và friendship, chuyển mutations sang POST/header-protected, GET chỉ đọc. Acceptance: quota không vượt khi concurrent; friendship luôn hai chiều hoặc rollback; GET không tạo profiles/events/rewards. Không suy rộng GET side effect thành CSRF đọc được dữ liệu cross-origin.

## 4. No evidence và giới hạn cần xác minh riêng

| Boundary | Kết luận có giới hạn | Acceptance cho lần kiểm chứng tiếp |
|---|---|---|
| CORS | Tìm toàn bộ PHP server không thấy allow-origin, origin check hoặc Fetch Metadata. Không có evidence CORS wildcard credential bypass. | Browser harness kiểm foreign-origin preflight bị deny; kiểm edge/CDN không thêm permissive CORS. |
| Admin users IDOR | [Gate](../server/api/index.php:135) nằm trước [users](../server/api/index.php:189), write cần CSRF. | Isolated HTTP harness: guest/anonymous 401, admin thiếu token 403, token đúng thao tác fixture. |
| Guest owner IDOR | Query owner từ [session](../server/lib/Account.php:150); stranger visit và recipient ACK đã pass test. | Thêm progress/export/delete/preferences owner-cross tests không live API. |
| Secrets web exposure | Narrow webroot/alias, root deny; chưa thấy route đọc secrets. | Deploy validation chỉ kiểm status/marker giả, không fetch secrets thật; deny project-root/dotfile/database/log paths. |
| Vite secrets | [Config](../vite.config.ts:4) không bulk expose env, sourcemap false; chưa kiểm public files/artifact. | Packaging scan allowlisted synthetic marker, kiểm prefix public env, không build trong audit này. |
| Security headers | Có nosniff; admin frame deny mẫu; không thấy CSP/HSTS trong mẫu. Nginx child add_header không tự kế thừa mọi parent header. | Kiểm effective headers theo route trong isolated deployment; CSP report-only rồi enforce, HSTS sau TLS readiness. |
| Supply chain | Registry metadata không có advisory hiện tại; không xác minh installed tree, integrity thực thi, package maintainer hoặc PHP runtime patches. | Pin/reproducible install, provenance review, cập nhật advisory CI; không đưa dev server lên Internet. |

## 5. Safety review và actual outputs

### 5.1 Self-test hiện hữu

Đã đọc [self-test toàn bộ](../server/bin/selftest-security.php:1), [schema SQLite](../server/sql/schema.sqlite.sql:1), include graph qua [Friends](../server/lib/Friends.php:5), [Account](../server/lib/Account.php:5), [Mailer](../server/lib/Mailer.php:5), [LoginCodeEmail](../server/lib/LoginCodeEmail.php:5), [bootstrap](../server/lib/bootstrap.php:14), [Lang](../server/lib/Lang.php:1). Test dùng SQLite memory, schema local và emails tổng hợp; không gọi requestCode/verify/signIn/Auth/Mailer, không gọi loader môi trường, không network hay DB production. Translation chỉ đọc các file ngôn ngữ mã nguồn. Test có fault injection trigger nhưng chỉ trong bộ nhớ. Không chạy các account/friends self-test khác.

Đã gọi PHP XAMPP trực tiếp hai lần bằng shell chaining không điều kiện để chế độ strict vẫn được chạy. Lệnh tương ứng script [characterization](../package.json:25) và [security](../package.json:26), không thông qua build/export. Combined terminal exit **1**, là strict security expectation thất bại, không phải lỗi thiết lập test. Chế độ characterization theo [exit logic](../server/bin/selftest-security.php:119) có failed=0 nên exit 0.

Actual stdout (nguyên văn; dòng PASS/KNOWN-FAIL/FAIL là output, không phải tuyên bố đã sửa):

```text
PASS control signed-out progress is 401
PASS control missing application header is 403
PASS control stranger visit is 404
PASS F01 characterization forged economics saved exactly
KNOWN-FAIL security expectation: F01 forged economics must be rejected
PASS control missing guestId is 422
PASS control oversized snapshot is 413
PASS F02 characterization locked seed with zero stock creates gift
KNOWN-FAIL security expectation: F02 gift without stock must not commit
PASS control sequential duplicate gift is 429
PASS F02 recipient receives unsupported-stock seed
PASS F03 characterization forged milestones pay 200 coins and 90 XP
KNOWN-FAIL security expectation: F03 forged milestones must not pay
PASS control referral events are not duplicated sequentially
PASS F03 inviter also receives 200 coins and 90 XP
PASS F11 characterization malformed animals/layout are passed through
PASS F04 characterization stealing does not debit owner snapshot
PASS F10 characterization event omits planting cycle
PASS F10 characterization ACK needs no persisted application
PASS control cannot ACK another recipient event
PASS F17 characterization deleting sender loses pending gift/referral
KNOWN-FAIL security expectation: F17 committed recipient effects must survive sender deletion
PASS F03 deletion removes referral count
PASS F03 recreated same email can earn four milestones again
PASS F15 identical snapshot can be stored under second owner
PASS F17 characterization injected failure leaves user but deletes events
KNOWN-FAIL security expectation: F17 failed deletion must roll back prior deletes
SUMMARY passed=22 failed=0 known_security_failures=5 mode=characterization
PASS control signed-out progress is 401
PASS control missing application header is 403
PASS control stranger visit is 404
PASS F01 characterization forged economics saved exactly
FAIL security expectation: F01 forged economics must be rejected
PASS control missing guestId is 422
PASS control oversized snapshot is 413
PASS F02 characterization locked seed with zero stock creates gift
FAIL security expectation: F02 gift without stock must not commit
PASS control sequential duplicate gift is 429
PASS F02 recipient receives unsupported-stock seed
PASS F03 characterization forged milestones pay 200 coins and 90 XP
FAIL security expectation: F03 forged milestones must not pay
PASS control referral events are not duplicated sequentially
PASS F03 inviter also receives 200 coins and 90 XP
PASS F11 characterization malformed animals/layout are passed through
PASS F04 characterization stealing does not debit owner snapshot
PASS F10 characterization event omits planting cycle
PASS F10 characterization ACK needs no persisted application
PASS control cannot ACK another recipient event
PASS F17 characterization deleting sender loses pending gift/referral
FAIL security expectation: F17 committed recipient effects must survive sender deletion
PASS F03 deletion removes referral count
PASS F03 recreated same email can earn four milestones again
PASS F15 identical snapshot can be stored under second owner
PASS F17 characterization injected failure leaves user but deletes events
FAIL security expectation: F17 failed deletion must roll back prior deletes
SUMMARY passed=22 failed=5 known_security_failures=0 mode=security
```

Không dùng kết quả này để chứng minh OTP, admin CSRF, TLS hay concurrency: test không exercise các boundary đó.

### 5.2 Dependency metadata

Đã chạy npm audit với các cờ ignore-scripts, package-lock-only, json và registry public npm HTTPS. Không install/update/audit fix, không lifecycle script. Chỉ gửi metadata dependency cho registry (network ngoại lệ được cho phép), không API ứng dụng. npm có thể ghi cache/log công cụ ngoài source workspace; không tạo output file trong project.

Nguồn inventory: [manifest](../package.json:28), [lock root](../package-lock.json:1). Vite locked 8.3.1 [lock](../package-lock.json:4553), Vitest 5.0.2 [lock](../package-lock.json:4631), React 19.3.0 [lock](../package-lock.json:4072), PlayCanvas 2.22.6 [lock](../package-lock.json:3959). Lock chứa install-script metadata [entry](../package-lock.json:3078), nhưng audit đã ignore scripts. Không tìm thấy resolved dạng Git/plain HTTP/file bằng regex đã chạy; đây không phải provenance validation đầy đủ.

Exit **0**. Actual stdout:

```text
{
  "auditReportVersion": 2,
  "vulnerabilities": {},
  "metadata": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 0,
      "high": 0,
      "critical": 0,
      "total": 0
    },
    "dependencies": {
      "prod": 30,
      "dev": 290,
      "optional": 54,
      "peer": 0,
      "peerOptional": 0,
      "total": 319
    }
  }
}
```

Audit snapshot chỉ phản ánh advisory registry tại thời điểm chạy và lockfile, không installed modules hay custom application vulnerabilities. Không chạy build/verify: [build](../package.json:8) và [verify](../package.json:19) kéo theo export-snapshot nên nằm ngoài quyền audit này.

## 6. Thứ tự xử lý và release acceptance đề xuất

1. **Trước public deployment:** fail-closed cấu hình production (A11), TLS/proxy/cookie validation (A06), admin limiter/TTL/MFA (A04), bảo vệ login/logout (A05).
2. **Auth correctness:** atomic OTP/attempt/quota (A01), keyed OTP verifier (A02), magic-link landing/confirmation và redacted logging (A03).
3. **Data/privacy correctness:** transaction deletion và preservation recipient effects (A09), server schema/public projection và friendship consent (A08), inventory/export/retention (A10).
4. **Trust/resource/concurrency:** server-owned social effects (A07), bounded bodies/pagination (A12), CAS affected rows (A13), quota transactions và read-only GET (A15), secrets CI/packaging policy (A14).
5. **Acceptance suite cô lập:** thêm auth/OTP concurrency và browser CSRF/CORS tests bằng credentials/markers tổng hợp; strict security suite phải không còn 5 FAIL. Chạy effective deployment checks trong môi trường không chứa secrets. Metadata dependency CI vẫn cần định kỳ dù snapshot hôm nay là 0 advisory.

**Kết luận:** có controls tốt cho session token entropy, owner binding, admin CSRF sau đăng nhập, friend visit/ACK và narrow webroot. Tuy nhiên test hiện hữu chứng minh client-to-social trust và deletion effects chưa an toàn; OTP concurrency, admin hardening và production fail-closed/TLS còn là điều kiện chặn release nên xác minh riêng. Báo cáo là evidence source-level và isolated-test, không phải xác nhận hệ thống production đã bị xâm nhập hoặc đã an toàn.

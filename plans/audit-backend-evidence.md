# Audit backend: injection, outbound và file — bằng chứng tĩnh

Ngày kiểm tra: 02/10/2026. Phương pháp: inventory → tìm sink → đọc mã → truy vết source/validation/sink/caller và cấu hình triển khai. **Không sửa application; chỉ tạo tài liệu này. Không đọc secrets thật, không thực thi bootstrap, không kết nối DB/API, không chạy tests hoặc request production.**

## 1. Quy ước và giới hạn kết luận

- **Proven (tĩnh):** source, biến đổi và sink được chứng minh trực tiếp bằng mã. Không có nghĩa đã khai thác runtime hay production.
- **Suspected/conditional:** thiếu validation hoặc rào chắn được chứng minh, nhưng tác động phụ thuộc cấu hình, quyền ghi, DNS, provider hoặc routing chưa xác minh.
- **No-evidence:** không thấy chuỗi khai thác trong phạm vi đã đọc; không phải bảo đảm an toàn tuyệt đối.
- Severity đánh giá tác động khi prerequisites thỏa; likelihood tách riêng khả năng tiếp cận. Không gán CVSS giả định deployment.
- Chỉ đọc cấu hình triển khai trong repository; chưa xác minh chúng đang được nạp, handler PHP thực tế, quyền filesystem, quota ngoài ứng dụng, egress firewall hay cấu hình transport thật.
- Kịch bản reproduction dưới đây là **đề xuất cho sandbox cách ly**, chưa chạy. Dùng marker tự tạo, cấu hình giả, provider stub không gửi mạng; không sử dụng secret, dữ liệu người dùng hoặc production. Mọi thay đổi fixture chỉ ở bản sao dùng một lần, ngoài workspace ứng dụng.

## 2. Inventory và surface

| Surface | Source / gate | Sink và phạm vi |
|---|---|---|
| Catalogue CRUD | JSON admin, gate chung tại [server/api/index.php](../server/api/index.php:135); create/PUT tại [server/api/index.php](../server/api/index.php:145) và [server/api/index.php](../server/api/index.php:169) | SQL và media paths: [Catalogue::saveDish()](../server/lib/Catalogue.php:371), [Catalogue::validateDish()](../server/lib/Catalogue.php:716) |
| Upload ảnh/video | Multipart admin; ID từ regex route tại [server/api/index.php](../server/api/index.php:163) | GD tái mã hóa tại [Images::storeDishPhoto()](../server/lib/Images.php:13); move upload tại [Images::storeVideo()](../server/lib/Images.php:65) |
| AI identify/quick/enrich | Admin + CSRF; ảnh tải lên hoặc đường dẫn ảnh đã lưu: [server/api/index.php](../server/api/index.php:154), [server/api/index.php](../server/api/index.php:183) | Local read → base64 → AI: [AiEnricher::buildRequest()](../server/lib/AiEnricher.php:62), [AiEnricher::curlHandle()](../server/lib/AiEnricher.php:123) |
| Review và reverse công khai | GET /api/reviews; POST /api/reverse; rate theo remote address, body reverse ≤1.024 byte: [server/api/index.php](../server/api/index.php:31) | Fixed YouTube/Nominatim + AI cấu hình; storage private, SQL bind: [ReviewService](../server/lib/ReviewService.php:6) |
| YouTube pilot | CLI, whitelist hai món: [server/bin/youtube-pilot.php](../server/bin/youtube-pilot.php:6) | Fixed YouTube endpoint, AI cấu hình, cache: [YoutubePilot::run()](../server/lib/YoutubePilot.php:124) |
| Login mail | Email khách qua validation; code/link do server tạo: [Account::requestCode()](../server/lib/Account.php:33) | Mail, SMTP socket hoặc log file: [Mailer::send()](../server/lib/Mailer.php:31) |
| Share/OG | Public /mon và /og trên nginx: [deploy/nginx/angi.conf](../deploy/nginx/angi.conf:25) | DB lookup, local GD read, cache write/unlink: [server/web/share.php](../server/web/share.php:156) |
| PHP hỗ trợ/dev | Một PHP trong scripts: [scripts/garden3d/save-detail.php](../scripts/garden3d/save-detail.php:1); 17 PHP trong server/bin qua inventory | Ghi JPG không auth; migration, AI batch, seed/export và selftest phải được coi là CLI, không phải API |

### Routing và boundary triển khai

- Apache có web root build, chỉ alias API/admin/uploads: [deploy/apache/angi.local.conf](../deploy/apache/angi.local.conf:7), [deploy/apache/angi.local.conf](../deploy/apache/angi.local.conf:58), [deploy/apache/angi.local.conf](../deploy/apache/angi.local.conf:81). Root project deny trực tiếp tại [.htaccess](../.htaccess:1), **phụ thuộc Apache thực sự cho phép/nạp override trên parent**.
- Nginx web root build, chỉ chuyển PHP đến controller API và share cố định: [deploy/nginx/angi.conf](../deploy/nginx/angi.conf:11), [deploy/nginx/angi.conf](../deploy/nginx/angi.conf:64). Không có general PHP location trong mẫu đã đọc; scripts và server/bin không được expose bởi mẫu này.
- Upload Apache deny một số đuôi executable và tắt ExecCGI: [deploy/apache/angi.local.conf](../deploy/apache/angi.local.conf:80); nginx upload alias không chuyển FastCGI và deny đuôi tại [deploy/nginx/angi.conf](../deploy/nginx/angi.conf:88). Không khẳng định mọi handler ở cấp global đã bị vô hiệu hóa.
- Admin gate yêu cầu session và CSRF cho non-GET tại [Auth::require()](../server/lib/Auth.php:56). Không có bypass admin được chứng minh trong audit này.

### Search đã thực hiện

Inventory recursive server/scripts; tìm SQL prepare/query/exec, cURL/file/socket, include/require, upload/write/rename/unlink, shell execution, eval/unserialize và Location. Sau search đọc toàn bộ sáu lớp trọng tâm, controller API, bootstrap/Auth, share, Mailer caller/validation/email builder, AdminUsers, Lang và các CLI AI/migration/pilot. Không search/read nội dung storage private, DB, log mail hoặc secret thật. Các match tên exec trong PDO/AdminUsers là SQL, **không phải shell**.

## 3. Tổng hợp ưu tiên

| ID | Kết luận | Severity | Likelihood / điều kiện |
|---|---|---|---|
| B01 | **Proven:** image path traversal → đọc tệp → đưa vào request AI | Cao | Trung bình khi admin bị chiếm/quyền biên tập không đáng tin; không phải anonymous |
| B02 | **Proven sink, exposure conditional:** dev PHP ghi/ghi đè bytes tùy ý vào JPG | Trung bình; cao hơn nếu làm đầy đĩa | Thấp theo hai mẫu deploy; cao nếu project root/scripts bị publish |
| B03 | **Proven thiếu guard:** decode ảnh không giới hạn pixel; video không cap bytes tại lớp | Trung bình | Thấp–trung bình, cần admin; tác động phụ thuộc PHP/webserver/resource |
| B04 | **Conditional:** provider URL/SMTP thiếu boundary host/IP; AI enricher không ép HTTPS | Trung bình; cao nếu config bị đổi và có dữ liệu nhạy cảm | Thấp; cấu hình trusted, không chứng minh URL do khách chọn |
| B05 | **Proven:** lỗi AI raw/cURL đi vào JSON admin | Thấp | Trung bình khi provider/network lỗi; chưa chứng minh secret thực tế bị lộ |
| B06 | **Proven giới hạn còn thiếu:** outbound body không cap; AI admin không quota; cache miss chiếm worker | Trung bình | Thấp–trung bình; review anonymous có rate/quota nên không mô tả là unbounded provider spend |
| B07 | **Conditional:** CLI không chặn web trước side effects | Cao nếu expose batch AI/migration | Thấp theo mẫu deploy; không phải mọi CLI đều chạy thành công qua web |

**Không có bằng chứng SQL injection qua HTTP, command injection/shell execution, open redirect khách tự chọn đích, SSRF qua URL khách gửi trực tiếp hoặc upload → PHP RCE trong cấu hình mẫu.** Có SQL identifier cấu hình chưa escape ở migration, nhưng phải kiểm soát cấu hình và chạy CLI; không nâng thành HTTP SQLi.

## 4. Findings chi tiết

### B01 — Path traversal trong ảnh lưu dẫn tới local-file disclosure cho provider AI

**Proven tĩnh; severity Cao; likelihood Trung bình có admin.**

1. Admin gửi create/PUT JSON qua [server/api/index.php](../server/api/index.php:149) hoặc [server/api/index.php](../server/api/index.php:169), sau gate [Auth::require()](../server/lib/Auth.php:56).
2. [Catalogue::validateDish()](../server/lib/Catalogue.php:750) cho phép dấu chấm và slash trong ảnh, không loại các segment cha. Path bắt đầu /uploads hoặc /images vẫn hợp lệ khi chứa traversal. Giá trị được đưa vào fields SQL tại [Catalogue::saveDish()](../server/lib/Catalogue.php:409), với bind an toàn về SQL nhưng không an toàn về path.
3. Admin POST AI tại [server/api/index.php](../server/api/index.php:183) → [AiEnricher::enrichOne()](../server/lib/AiEnricher.php:337) lấy món từ DB → [AiEnricher::buildRequest()](../server/lib/AiEnricher.php:64) ưu tiên thumbnail nếu nonempty.
4. [AiEnricher::localPath()](../server/lib/AiEnricher.php:385) nối chuỗi không canonicalize; /uploads/../… có thể thoát uploads. Với /images, nối dưới public cũng cho phép traversal.
5. Chỉ kiểm tra tồn tại tệp tại [AiEnricher::buildRequest()](../server/lib/AiEnricher.php:65); nội dung bất kỳ được đọc/base64 tại [AiEnricher::buildRequest()](../server/lib/AiEnricher.php:73). Extension không được allowlist: trường hợp khác tự nhận là image/webp.
6. Request chứa data URI tại [AiEnricher::buildRequest()](../server/lib/AiEnricher.php:117), truyền cURL payload tại [AiEnricher::curlHandle()](../server/lib/AiEnricher.php:134) và execute tại [AiEnricher::ask()](../server/lib/AiEnricher.php:311).

**Prerequisites:** session admin và CSRF hợp lệ hoặc catalogue bị thay đổi bởi nguồn tin cậy bị chiếm; tệp mục tiêu tồn tại và PHP đọc được; trigger AI và provider được cấu hình. Thumbnail ưu tiên nên cần đổi thumbnail hoặc để trống, không chỉ image. Provider có thể từ chối ảnh không hợp lệ, nhưng bytes đã nằm trong payload gửi trước validation của provider. Không chứng minh phản hồi AI trả nguyên bytes cho admin; tác động chính là lộ tới provider. Đây là local-file disclosure/exfiltration, **không phải SSRF**, vì image không được fetch qua HTTP.

**Reproduction không phá hoại:** ở bản sao sandbox, tạo marker văn bản trong storage/audit-marker.txt và sử dụng path ảnh /uploads/../audit-marker.txt, cùng fixture món hợp lệ. Truy vết validation rồi request builder; giải mã data URI trong bộ nhớ và so marker. Không thực thi transport, không gọi bootstrap env thật hoặc DB thật. Stub catalogue/provider hoặc kiểm tra biểu thức/path thuần để giữ audit offline.

**Fix đề xuất:** cấm dot-segments; chỉ nhận namespace ảnh định trước; canonicalize file và base bằng realpath, kiểm tra containment với separator và xử lý case theo OS, từ chối symlink thoát root; chỉ đọc regular file MIME ảnh hợp lệ, cap bytes/pixel trước gửi. Builder phải kiểm tra lại, không tin DB. **Acceptance:** marker ngoài root bị từ chối trước read/request; /uploads/../ và traversal nhiều cấp, encoded variants khi có decoding, symlink escape, non-image đều fail; ảnh nội bộ hợp lệ vẫn hoạt động; không payload/network ở ca reject.

### B02 — Script dev ghi bytes tùy ý, không auth/method/size guard

**Proven source-sink; exposure suspected/conditional. Severity Trung bình.**

Source query name tại [scripts/garden3d/save-detail.php](../scripts/garden3d/save-detail.php:2) được lọc chỉ chữ thường/số/gạch ngang. Body đọc toàn bộ tại [scripts/garden3d/save-detail.php](../scripts/garden3d/save-detail.php:3), base64 decode không strict và ghi tệp cùng thư mục với đuôi JPG tại [scripts/garden3d/save-detail.php](../scripts/garden3d/save-detail.php:5). Không authentication, CSRF, limit, kiểm tra ảnh, exclusive create hay kiểm tra kết quả ghi; luôn echo thành công.

**Tác động đã chứng minh:** request nếu đến được PHP và thư mục writable có thể ghi/ghi đè tên JPG đã biết, với bytes không cần là JPEG. Không arbitrary absolute-path write vì name được lọc; không chứng minh traversal hoặc RCE vì đuôi cố định và không có handler thực thi JPG được xác minh. Body lớn/lặp lại có thể gây tài nguyên nhưng chưa đo.

**Prerequisites/likelihood:** phải expose script qua PHP handler và cho quyền ghi. Hai mẫu deploy không map script, root [.htaccess](../.htaccess:3) deny trực tiếp nếu active; do đó không báo anonymous production write là proven.

**Reproduction:** chỉ trong sandbox có map cố ý, gửi marker base64 vài byte với tên ngẫu nhiên audit-marker, xác nhận bytes/ghi đè marker thứ hai rồi hủy sandbox; không ghi file application. Có thể thay sink bằng recorder để không tạo tệp. **Fix/acceptance:** không ship script dev; CLI-only hoặc endpoint riêng có auth, method, cap, decode strict, MIME và tên server random, no-overwrite; direct HTTP bị 403/404 trước sink, body lỗi/oversize không ghi.

### B03 — Upload thiếu giới hạn tài nguyên và tên video có collision

**Proven thiếu guard; severity Trung bình; cần admin.**

- Ảnh có cap 15 MB tại [Images::storeDishPhoto()](../server/lib/Images.php:18), nhưng sau [getimagesize()](../server/lib/Images.php:21) gọi decoder ngay tại [Images::storeDishPhoto()](../server/lib/Images.php:22), không kiểm tra dimensions/pixel/memory. File nén nhỏ có raster rất lớn; chưa chứng minh crash runtime.
- Video [Images::storeVideo()](../server/lib/Images.php:65) chỉ upload error + MIME, không kiểm tra size/duration. PHP/webserver có thể cap: nginx 64 MB body và PHP upload 60 MB tại [deploy/nginx/angi.conf](../deploy/nginx/angi.conf:70); đây là giới hạn request, không tổng storage.
- Video filename ID + timestamp độ phân giải giây tại [Images::storeVideo()](../server/lib/Images.php:79). Hai upload cùng món/cùng đuôi/cùng giây có thể trùng destination và ghi đè; cần concurrency/timing. Ảnh đã có random suffix tại [Images::storeDishPhoto()](../server/lib/Images.php:37).
- Không kiểm tra món tồn tại trước lưu ảnh/video tại [server/api/index.php](../server/api/index.php:176). Với ảnh, lỗi DB/getDish sau write có thể để orphan; identify cũng lưu trước hỏi AI tại [AiEnricher::identifyUpload()](../server/lib/AiEnricher.php:349).

**Reproduction:** không tạo ảnh bomb. Dùng metadata/decoder stub xác nhận dimensions vượt cap vẫn đi tới decode; upload video fixture nhỏ trong temp sink với clock cố định cho hai lần ghi để chứng minh cùng tên; kiểm tra orphan bằng recorder và catalogue stub không tồn tại. **Fix/acceptance:** cap dimensions/pixel trước decode, resource budget, video bytes/duration/total quota, random immutable filename, existence check trước write, cleanup thất bại; invalid ID không ghi, collision không overwrite, oversize không decode/move.

**Không chứng minh upload traversal/RCE:** HTTP dishId regex chỉ lower ASCII/số/gạch ngang tại [server/api/index.php](../server/api/index.php:163); identify tự tạo ID tại [AiEnricher::identifyUpload()](../server/lib/AiEnricher.php:349). Ảnh được re-encode WebP, video đuôi cố định từ MIME; tên gốc file không dùng làm destination. Lớp Images tự nó không validate dishId, nên caller mới phải giữ invariant hoặc harden trong lớp.

### B04 — URL provider và SMTP là boundary cấu hình, chưa có user-controlled SSRF

**Suspected/conditional; severity Trung bình, likelihood Thấp.**

- AI base từ cấu hình tại [AiEnricher::__construct()](../server/lib/AiEnricher.php:46), chỉ kiểm tra nonempty. Sink nối /chat/completions và thêm Bearer tại [AiEnricher::curlHandle()](../server/lib/AiEnricher.php:123). Không ép HTTPS, host allowlist, private-IP deny hay protocol restriction. HTTP cấu hình sai có thể gửi token và ảnh cleartext; host cấu hình sai có thể nhận payload. Không khẳng định mọi protocol cURL hỗ trợ đều exploitable với POST/header/path nối.
- Review AI kiểm tra HTTPS, user/query/fragment tại [ReviewService::reviews()](../server/lib/ReviewService.php:113); request ép HTTPS và không follow redirect tại [ReviewService::request()](../server/lib/ReviewService.php:73). Không host/IP allowlist.
- YouTube pilot kiểm tra HTTPS/host/user/query tại [YoutubePilot::__construct()](../server/lib/YoutubePilot.php:33), chưa reject fragment; request không follow redirect tại [YoutubePilot::request()](../server/lib/YoutubePilot.php:45). Fragment có thể làm endpoint nối không mang nghĩa dự kiến; config correctness, không proven SSRF exploit.
- SMTP host/port từ config tại [Mailer::viaSmtp()](../server/lib/Mailer.php:124), nối socket tại [Mailer::viaSmtp()](../server/lib/Mailer.php:136). Không lấy host từ email khách. TLS/STARTTLS có mã tại [Mailer::viaSmtp()](../server/lib/Mailer.php:168); không kết luận TLS peer verification bị tắt, vì không thấy mã disable và runtime chưa kiểm tra.

**Prerequisites:** quyền đổi môi trường/config, cấu hình sai hoặc DNS provider bị chiếm, egress cho phép; đây thường là defense-in-depth thay vì remote attacker primitive. Không đọc giá trị thật nên không biết hiện cấu hình an toàn hay không.

**Redirect:** Review/pilot explicit false; AI enricher không bật follow (mặc định cURL là không follow với handle mới). Không có bằng chứng redirect-to-internal chain hoặc forward Bearer qua redirect trong mã đã đọc. Reverse và YouTube gọi host cố định tại [ReviewService::locate()](../server/lib/ReviewService.php:140), [YoutubePilot::youtube()](../server/lib/YoutubePilot.php:82); lat/lon bị ép float/range rồi query encode.

**Reproduction:** kiểm tra validator/builder offline với URL giả HTTP, loopback HTTPS, userinfo/query/fragment, và DNS resolver stub trả private/IPv6 loopback; không kết nối. **Fix/acceptance:** validator provider dùng chung ép HTTPS, host/port/path allowlist, reject userinfo/query/fragment; egress policy và resolver/IP protections nếu hỗ trợ provider linh hoạt; protocol HTTPS only và redirect false explicit. SMTP host/port allowlist, CRLF reject trên config. Các URL không được phép bị reject trước handle/socket/payload; provider hợp lệ vẫn được chấp nhận.

### B05 — Raw provider diagnostics xuất hiện trong phản hồi admin

**Proven; severity Thấp; chưa chứng minh lộ secret thật.**

Non-200 body lấy 200 ký tự tại [AiEnricher::parse()](../server/lib/AiEnricher.php:143), cURL error đưa vào HttpError tại [AiEnricher::ask()](../server/lib/AiEnricher.php:314), RuntimeException message cũng chuyển HttpError tại [AiEnricher::ask()](../server/lib/AiEnricher.php:319). Controller trả nguyên message tại [server/api/index.php](../server/api/index.php:219). Provider có thể đưa URLs, request fragments hoặc chi tiết hạ tầng trong lỗi; admin thấy phần đó. Không có chứng cứ API key cụ thể đi vào lỗi.

CLI AI cũng in lỗi tại [server/bin/ai-enrich.php](../server/bin/ai-enrich.php:76), [server/bin/ai-cook.php](../server/bin/ai-cook.php:100). Ngược lại pilot chỉ xuất reason codes whitelist tại [YoutubePilot::request()](../server/lib/YoutubePilot.php:65), Review báo HTTP status tại [ReviewService::request()](../server/lib/ReviewService.php:80).

**Reproduction:** gọi parser với synthetic error body chứa marker riêng tư giả, stub cURL lỗi chứa URL marker, quan sát message đi qua serializer offline. **Fix/acceptance:** client chỉ nhận error code chung + correlation ID; log nội bộ redact URL/token/body và access control. Marker giả không xuất hiện trong JSON/log public/CLI output chia sẻ; log nội bộ có thông tin tối thiểu chẩn đoán, không full payload.

### B06 — Outbound response và execution budget chưa đầy đủ

**Proven thiếu cap; exploit tài nguyên suspected. Severity Trung bình.**

cURL giữ toàn response trong RAM tại [AiEnricher::curlHandle()](../server/lib/AiEnricher.php:128), [ReviewService::request()](../server/lib/ReviewService.php:76), [YoutubePilot::request()](../server/lib/YoutubePilot.php:45), sau đó JSON decode. Timeout có, nhưng không write callback cap byte; provider lỗi/compromised có thể đẩy response lớn. AI builder đọc toàn file trước base64, tăng footprint tại [AiEnricher::buildRequest()](../server/lib/AiEnricher.php:73). Admin AI routes tăng timeout nhưng không local daily quota/concurrency guard tại [server/api/index.php](../server/api/index.php:154).

Review có guard thực: 6/client/phút, 60 tổng/phút tại [ReviewService::rate()](../server/lib/ReviewService.php:50), budget YouTube 404/AI 4/reverse 10 mỗi ngày tại [ReviewService::reserve()](../server/lib/ReviewService.php:62), pair lock + cache tại [ReviewService::reviews()](../server/lib/ReviewService.php:96). Vì thế **không kết luận anonymous gọi provider vô hạn**. Tuy nhiên GET review cache miss anonymous có thể tiêu budget hữu hạn và giữ worker khi đợi pair lock; khóa chặn tại [ReviewService::locked()](../server/lib/ReviewService.php:36), nhiều client trong limit vẫn có thể chờ. POST reverse sleep + provider trong lock tại [ReviewService::reverse()](../server/lib/ReviewService.php:160). Tác động worker exhaustion chưa đo; global rate/quota có thể khiến khách hợp lệ 429.

**Reproduction:** transport stub phát response nhỏ vượt cap giả định và lock recorder; không gửi file khổng lồ, không concurrent load production. Mô phỏng quota/cold cache bằng store in-memory, xem số requests và trạng thái từ chối. **Fix/acceptance:** response byte cap, connect/total timeout thống nhất, outbound concurrency/circuit breaker, admin AI quota, worker/lock wait timeout và public cache policy; oversized response ngừng nhận trước decode, không vượt budget dưới concurrency, cache hit không gọi provider, chờ lock có timeout hữu hạn.

### B07 — CLI scripts thiếu early web guard; deployment là lớp bảo vệ chính

**Conditional exposure; severity Cao nếu executable batch/migration bị public; likelihood Thấp theo mẫu cấu hình.**

[server/bin/ai-enrich.php](../server/bin/ai-enrich.php:14) không kiểm tra SAPI trước bootstrap/DB; mặc định lấy các món chưa AI tại [server/bin/ai-enrich.php](../server/bin/ai-enrich.php:20), gọi provider và lưu tại [server/bin/ai-enrich.php](../server/bin/ai-enrich.php:48), [server/bin/ai-enrich.php](../server/bin/ai-enrich.php:72). [server/bin/ai-cook.php](../server/bin/ai-cook.php:17) tương tự. [server/bin/migrate.php](../server/bin/migrate.php:7) chạy DDL từ file schema/config trực tiếp. Không gate session/CSRF trong các file này. Không có PHP_SAPI guard trong search server/bin.

Không suy diễn query string thành argv/getopt. Một số script có thể fail do argv/STDERR không có trong web SAPI, extension hoặc config; vì vậy không tuyên bố mọi CLI callable HTTP đều thành công. Đặc biệt dry-run YouTube **vẫn gọi provider/cache**, chỉ bỏ ghi DB tại [server/bin/youtube-pilot.php](../server/bin/youtube-pilot.php:20); không dùng nó như thao tác audit offline.

**Reproduction:** ở sandbox không secrets/DB/network, source inspection hoặc web-SAPI harness với early dependency recorder xác nhận bootstrap/DB có thể được chạm trước rejection. Không request trực tiếp các CLI trên hệ thật. **Fix/acceptance:** CLI guard trước mọi require có side effect, deny server/bin/scripts ở webserver và chỉ publish build; HTTP nhận 403/404 trước env/DB/network/filesystem. CLI hợp lệ vẫn chạy trong môi trường fixture được phê duyệt.

## 5. SQL dynamic, shell và paths: findings âm có bằng chứng

### SQL HTTP — No-evidence injection

- Dynamic UPDATE tại [Catalogue::saveDish()](../server/lib/Catalogue.php:390) → [Catalogue::saveDish()](../server/lib/Catalogue.php:419): keys do code định nghĩa; optional keys từ list cố định, không ghép keys JSON tùy ý; values và ID bind.
- Dynamic IN tại [Catalogue::ingredientTranslations()](../server/lib/Catalogue.php:575): chỉ số lượng placeholders thay đổi, IDs bind tại [Catalogue::ingredientTranslations()](../server/lib/Catalogue.php:578).
- Translation table/column tại [Catalogue::writeTranslations()](../server/lib/Catalogue.php:646) chọn từ hai tuples literal. Import SELECT section tại [Catalogue::importTranslations()](../server/lib/Catalogue.php:680) cũng từ list literal; không lấy table name trực tiếp từ document.
- Driver branches INSERT IGNORE/FOR UPDATE chỉ do driver quyết định tại [Catalogue::replaceIngredients()](../server/lib/Catalogue.php:442) và [Catalogue::saveYoutubeVideos()](../server/lib/Catalogue.php:335).
- Review SQL bind tại [ReviewService::reviews()](../server/lib/ReviewService.php:123) và [ReviewService::stored()](../server/lib/ReviewService.php:133); DDL type chỉ LONGTEXT/TEXT do driver tại [ReviewService::migrate()](../server/lib/ReviewService.php:27).
- Query admin users q/filter chỉ filter PHP, không ghép vào SQL tại [AdminUsers::list()](../server/lib/AdminUsers.php:49); IDs bind. PDO native prepare được cấu hình tại [db()](../server/lib/bootstrap.php:55).

**Caveat config-only:** database name được đặt vào backtick chưa escape tại [server/bin/migrate.php](../server/bin/migrate.php:26), [server/bin/migrate.php](../server/bin/migrate.php:27), rồi tách/exec tại [server/bin/migrate.php](../server/bin/migrate.php:28). Control cấu hình có thể làm biến đổi SQL, nhưng không có HTTP source cho giá trị này; người đổi config thường đã vượt trust boundary. Đề xuất identifier allowlist và schema migration không replace text thô; acceptance validator reject backtick/semicolon trước PDO. Có thể kiểm tra generated SQL bằng string fixture hoàn toàn offline, không execute DB.

### Shell/code execution — No-evidence

Search các primitive shell, eval và unserialize trong PHP server không tìm thấy primitive thực thi tương ứng. PDO exec và helper AdminUsers exec không phải OS command. Include/require chính đều đường dẫn literal; locale require tại [Lang::load()](../server/lib/Lang.php:133) bị constrain bởi available/normalize tại [Lang::available()](../server/lib/Lang.php:22), [Lang::normalize()](../server/lib/Lang.php:52). Không chứng minh LFI/code execution qua lang.

CLI import path là trust của operator: [server/bin/ai-cook.php](../server/bin/ai-cook.php:33) đọc path từ getopt, không có HTTP binding được chứng minh. PHP stream wrapper có thể áp dụng theo runtime nếu operator nhập URL; không gọi nhầm đó là request-driven SSRF. Cần local regular-file restriction nếu importer nhận đầu vào automation không đáng tin.

### Mail/SMTP injection — No-evidence từ route hiện tại

Email JSON → [Account::normaliseEmail()](../server/lib/Account.php:288) length/filter validation → [Account::requestCode()](../server/lib/Account.php:57) → [Mailer::send()](../server/lib/Mailer.php:31). Subject/code do server/translation tạo, header encode base64 tại [Mailer::encodeHeader()](../server/lib/Mailer.php:73); body base64 và SMTP dot-stuff tại [Mailer::body()](../server/lib/Mailer.php:47), [Mailer::viaSmtp()](../server/lib/Mailer.php:185). Không thấy CRLF từ khách vượt validator vào RCPT TO.

Mailer không tự validate recipient và from cấu hình được ghép thẳng vào SMTP/header tại [Mailer::message()](../server/lib/Mailer.php:82), [Mailer::viaSmtp()](../server/lib/Mailer.php:181). Đây là invariant caller/config, nên validate CRLF/email tại transport cho defense-in-depth. Không nâng thành proven anonymous header injection. Mail log chứa OTP/link plaintext tại [Mailer::viaLog()](../server/lib/Mailer.php:100), với driver default log tại [Mailer::send()](../server/lib/Mailer.php:33): rủi ro phụ thuộc chọn driver, quyền đọc và exposure storage; mẫu deploy không publish logs. Không đọc log để xác minh.

### Redirect và URL metadata — No-evidence open redirect/SSRF trực tiếp

Login link token chỉ hash lookup, redirects fixed /journey tại [Account::verifyLink()](../server/lib/Account.php:88). Nginx admin redirect fixed tại [deploy/nginx/angi.conf](../deploy/nginx/angi.conf:84). APP_URL trong email từ cấu hình, không từ Host khách tại [Account::requestCode()](../server/lib/Account.php:55).

Video src/poster nhận chuỗi không URL allowlist tại [Catalogue::validateDish()](../server/lib/Catalogue.php:742) và xuất public shape tại [Catalogue::shape()](../server/lib/Catalogue.php:167), nhưng không có backend fetch những URL đó trong mã đã đọc; vấn đề trình duyệt là scope khác, không chứng minh SSRF backend. YouTube thumbnail dựng từ ID regex tại [YoutubePilot::candidates()](../server/lib/YoutubePilot.php:97), [YoutubePilot::candidates()](../server/lib/YoutubePilot.php:103), catalogue kiểm tra exact URL tại [Catalogue::validateYoutubeVideo()](../server/lib/Catalogue.php:310).

### File cache/share — No-evidence traversal từ khách

Review pair filenames từ dish/province whitelist tại [ReviewService::reviews()](../server/lib/ReviewService.php:94); rate/quota names literal, lock names hash tại [ReviewService::locked()](../server/lib/ReviewService.php:36). Pilot filenames whitelist + digest tại [YoutubePilot::run()](../server/lib/YoutubePilot.php:126), [YoutubePilot::run()](../server/lib/YoutubePilot.php:147); random temp + rename tại [YoutubePilot::cached()](../server/lib/YoutubePilot.php:175). Không user path ghi trực tiếp. Review write dùng temp cố định nhưng cùng-key lock bao quanh các public writes đã truy vết; không báo race arbitrary write chỉ vì tên temp cố định.

Share route slug regex ≤80 ký tự tại [server/web/share.php](../server/web/share.php:29), locale whitelist như trên; cache basename và glob cleanup được constrain tại [serve_og_image()](../server/web/share.php:165). Ảnh local ở share reject path chứa hai dấu chấm tại [image_file()](../server/web/share.php:188), khác AI đang thiếu guard. Share GD chỉ decode ảnh theo extension tại [load_image()](../server/web/share.php:200), không đọc/fetch URL remote. Symlink containment chưa có nên defense-in-depth vẫn nên dùng canonical path.

**Suspected phụ, severity Thấp:** nếu APP_URL trống, [site_url()](../server/web/share.php:68) dùng Host/X-Forwarded-Proto chưa allowlist, rồi dựng canonical/OG tại [serve_page()](../server/web/share.php:115). Có thể poison URL metadata trong response nếu vhost/proxy cho Host tùy ý; không server outbound và không HTTP redirect. Acceptance: sandbox Host lạ không ảnh hưởng URL canonical; cấu hình origin cố định hoặc trusted proxy/host whitelist. Không khẳng định cache poisoning cross-user vì HTML no-cache và CDN thực tế chưa kiểm tra.

## 6. Prompt injection: ranh giới dữ liệu không phải SQL/shell

AI nhận text/name/ingredient và ảnh không đáng tin tại [AiEnricher::buildRequest()](../server/lib/AiEnricher.php:74), [AiEnricher::buildRequest()](../server/lib/AiEnricher.php:104); thư viện ingredient được nội suy vào system prompt. Có khả năng prompt steering/content contamination nếu admin hoặc ảnh adversarial, nhưng **chưa chứng minh model làm theo hay thực thi tool**. AI parser giới hạn fields/count/range tại [AiEnricher::parse()](../server/lib/AiEnricher.php:158), [Catalogue::cleanCook()](../server/lib/Catalogue.php:256); save bind SQL, không model-generated SQL/shell.

Review/pilot system cảnh báo metadata untrusted tại [ReviewService::reviews()](../server/lib/ReviewService.php:116), [YoutubePilot::run()](../server/lib/YoutubePilot.php:150), output chỉ IDs thuộc candidate map, tối đa năm và không trùng tại [YoutubePilot::select()](../server/lib/YoutubePilot.php:108). Steering vẫn có thể làm chọn candidate không phù hợp; impact chất lượng nội dung, không arbitrary URL/network/SQL. Đề xuất system rules bất biến, dữ liệu thư viện để user/data channel và kiểm duyệt nội dung AI. Acceptance offline synthetic output: unknown/duplicate/>5 IDs bị reject; không dựa prompt warning để bảo đảm semantic relevance.

## 7. Kế hoạch fix và acceptance ưu tiên (không thực hiện trong audit)

1. **P1 B01:** shared media resolver canonical containment + MIME/bytes/pixel validation trước read và trước outbound; negative fixtures traversal/symlink không chạm reader/transport.
2. **P1 boundary deploy B02/B07:** chỉ publish build/API cần thiết; deny dev/CLI routes; early CLI guard; xác minh effective config ở môi trường test, không chạy seed/migration/pilot trên production để thử exposure.
3. **P2 B03/B06:** upload quota và unique filenames, cleanup orphan, bounded response/worker/lock wait, provider quota/circuit breaker.
4. **P2 B04:** provider validator thống nhất + egress policy; URL/SMTP config invalid reject trước secret-bearing request.
5. **P3 B05:** diagnostics sanitized; marker fake-private không xuất ra response/log không kiểm soát.
6. **P3 defense-in-depth:** identifier validation migration, recipient/from validation trong Mailer, origin cố định share, regular-file imports và prompt data separation.

**Đóng audit:** nguồn–sink quan trọng nhất là B01; exposure script/CLI và SSRF cấu hình vẫn là điều kiện, không có bằng chứng runtime production. Không tests đã chạy, không DB/API đã gọi, không secret thật được đọc. Tài liệu này là artifact duy nhất được tạo; application giữ nguyên.

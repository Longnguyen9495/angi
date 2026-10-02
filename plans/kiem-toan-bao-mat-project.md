# Kiểm toán bảo mật toàn project — báo cáo và kế hoạch triển khai

Ngày: 02/10/2026. Yêu cầu «XXS» được hiểu là XSS. **Chỉ audit và tài liệu; không vá implementation.** Kết luận dựa trên inventory/search, đọc source–transformation–sink và kiểm thử cách ly được ghi bên dưới; không chứng nhận an toàn tuyệt đối hoặc xác nhận production đã bị khai thác.

## 1. Kết luận điều hành

- **Ưu tiên cao:** đường dẫn ảnh có dot-segments được writer chấp nhận, resolver AI nối trực tiếp, sau đó đọc bytes và đưa vào payload gửi provider. Cần quyền admin/khả năng sửa catalogue và trigger AI; không phải anonymous SSRF hay guest XSS. Đã kiểm chứng biểu thức/path bằng fixture thuần, chưa gửi bytes qua mạng.
- **Auth và release gates:** OTP consumption/attempt/quota chưa atomic; admin thiếu limiter/MFA/TTL ứng dụng; login/logout ngoài CSRF gate; TLS/proxy/Secure cookie và cấu hình fail-closed phải xác minh trước public deployment. Race được phân loại suspected, không giả nhận đã chạy concurrency.
- **Actual security failures:** self-test SQLite memory chứng minh forged snapshot, gift không stock, referral từ milestone giả, mất pending recipient effects khi sender xóa và deletion không atomic khi DB lỗi.
- **Không tìm thấy XSS proven** trong các đường đã truy. React text được render như text; admin escape text/quoted attributes và producer ép kiểu summary số. Không nâng mock markup vào numeric API response thành guest-to-admin stored XSS.
- **Không tìm thấy chuỗi HTTP SQL injection hoặc shell injection** trong mã đã đọc. Dynamic SQL dùng bind/identifier tuples cố định; config-only migration identifier là hardening riêng. Không thấy redirect-based SSRF hoặc upload-to-PHP RCE trong hai mẫu deployment.
- Dependency metadata: **0 advisory / 319 dependency** tại thời điểm chạy; không đồng nghĩa supply-chain hay installed tree tuyệt đối an toàn.

## 2. Phạm vi, inventory và trust boundaries

| Runtime surface | Evidence và boundary đã đọc |
|---|---|
| React, storage, account/photo, social rendering | [frontend evidence](audit-frontend-evidence.md:109), [services evidence](audit-frontend-evidence.md:156), [account service](../src/services/account.ts:34): API/snapshot/local storage không đáng tin; text, media, iframe và scene URLs là context khác nhau |
| Admin vanilla DOM | [admin evidence](audit-frontend-evidence.md:69), [HTML escape](../server/admin/admin.js:34), [numeric producer](../server/lib/AdminUsers.php:160): dữ liệu guest/catalogue/AI đi qua producer và escape trước HTML |
| API PHP và auth | [router](../server/api/index.php:31), [auth boundary](audit-auth-deploy-evidence.md:35): guest owner từ session; admin gate trước CRUD/upload/AI/users; custom header cho guest write không phải secret |
| Catalogue/SQL/lib | [SQL traces](audit-backend-evidence.md:141), [writer](../server/lib/Catalogue.php:371): prepared values; dynamic identifiers phải code-owned |
| Upload/media/share/OG | [upload inventory](audit-backend-evidence.md:14), [image handling](../server/lib/Images.php:13), [share](../server/web/share.php:29): admin multipart, local reads/GD/cache writes, uploads served qua alias |
| AI/review/reverse/YouTube/mail outbound | [outbound traces](audit-backend-evidence.md:96): provider config trusted nhưng cần validation; public review có rate/quota/cache/lock, không phải spend vô hạn |
| CLI/dev/automation | [CLI boundary](audit-backend-evidence.md:131), [dev writer](../scripts/garden3d/save-detail.php:1), [headless process](../scripts/lib/headless.mjs:36), [operator MCP command](../scripts/playcanvas-mcp-session.mjs:8): không chứng minh HTTP input tới shell args |
| Deployment/secrets/dependencies | [deployment evidence](audit-auth-deploy-evidence.md:49), [Apache](../deploy/apache/angi.local.conf:5), [Nginx](../deploy/nginx/angi.conf:6), [root deny](../.htaccess:1), [manifest](../package.json:28), [lock](../package-lock.json:1): mẫu không phải effective production config |
| Generated/public exports | [JSON embedding generator](../scripts/build-image-prompts.mjs:62), [public page](../public/fake/index.html:348), [scene URL guards](../src/features/farm-pc/engine/sceneLoader.ts:8): generated engine/minified exports chỉ search, không audit từng dòng thư viện |

Inventory recursive đã thực hiện trên server/frontend/scripts và runtime liên quan; searches tập trung HTML/URL/iframe/message, SQL, cURL/socket, file read/write/upload/include, shell/code execution và JSON embedding. Các match PDO execution hoặc particle spawning không phải shell. Không cố kiểm tra từng binary asset, log/storage private hay minified third-party engine. Phần anti-cheat chi tiết tiếp tục nằm ở [báo cáo game](kiem-toan-gian-lan-game.md).

### Artifact bằng chứng (là phần của báo cáo này)

1. [Frontend source–sink, threat và acceptance](audit-frontend-evidence.md).
2. [Backend injection/outbound/file source–sink](audit-backend-evidence.md).
3. [Auth/privacy/deployment và actual test outputs](audit-auth-deploy-evidence.md).

Các ID bên dưới giữ nguyên ID trong phụ lục để tránh mất truy vết. Mỗi phụ lục có exact source refs, prerequisites, reproduction sandbox không phá hoại, impacts và fix acceptance chi tiết. «Proven tĩnh» chỉ chứng minh đường mã; «proven test» là quan sát fixture thực; «suspected» cần kiểm chứng điều kiện; «reviewed-no-evidence» không phải bảo đảm không tồn tại lỗ hổng.

## 3. Findings và mức rủi ro

Severity đánh giá tác động khi prerequisites thỏa; likelihood riêng theo khả năng tiếp cận, không dùng CVSS với topology giả định.

| ID / chi tiết | Severity; likelihood | Trạng thái, prerequisites và impact |
|---|---|---|
| [B01: traversal ảnh → AI payload](audit-backend-evidence.md:54) | Cao; trung bình có admin | Proven tĩnh + path fixture. [Writer](../server/lib/Catalogue.php:750) nhận traversal → [resolver](../server/lib/AiEnricher.php:385) → [read/base64](../server/lib/AiEnricher.php:73) → [transport](../server/lib/AiEnricher.php:123). PHP phải đọc được file và provider/trigger hoạt động. Disclosure tới provider, không chứng minh AI trả file về attacker. Thumbnail có ưu tiên. |
| [B02: dev writer](audit-backend-evidence.md:71) | Trung bình; thấp theo mẫu deploy | Source–sink proven, exposure conditional. Script writable/exposed có thể ghi/ghi đè bytes vào JPG; tên đã lọc, không arbitrary path/RCE proven. |
| [B03: upload resources/collision](audit-backend-evidence.md:83) | Trung bình; thấp–trung bình có admin | Proven thiếu pixel cap/video class cap; collision cùng giây và orphan cần fixture runtime. PHP/edge cap có thể giảm tác động; không gọi upload unlimited anonymous. |
| [B04: provider/SMTP boundary](audit-backend-evidence.md:96) | Trung bình, cao có dữ liệu nhạy cảm; thấp | Config-only conditional; AI enricher chưa ép HTTPS/host/IP. Không có evidence user chọn outbound URL. Review/pilot không follow redirects; không khẳng định forward Bearer qua redirect. |
| [B05: diagnostics raw](audit-backend-evidence.md:111) | Thấp; trung bình khi lỗi | Proven lỗi provider/cURL đi tới admin JSON; secret leakage thực tế chưa chứng minh. |
| [B06: response/worker budget](audit-backend-evidence.md:121) | Trung bình; thấp–trung bình | Proven missing caps; exhaustion suspected. Anonymous review có quota/rate/locks nhưng có thể tiêu finite budget/đợi worker. |
| [B07: CLI web guard](audit-backend-evidence.md:131) | Cao nếu expose; thấp theo mẫu | Thiếu early guard proven, HTTP side effects conditional; không suy query thành operator args, không khẳng định mọi CLI chạy được trên web SAPI. |
| [FE-01: media URL](audit-frontend-evidence.md:27) | Trung bình; cần editor/admin | Proven missing allowlist từ [writer](../server/lib/Catalogue.php:742) đến [media sink](../src/features/food-reel/components/FoodVideo.tsx:415). Tracking/integrity/mixed-content; JavaScript execution và backend SSRF no-evidence. |
| [FE-02: host metadata](audit-frontend-evidence.md:55) | Thấp–trung bình; conditional | Site config rỗng và vhost/proxy nhận Host lạ; [fallback](../server/web/share.php:68) ảnh hưởng canonical/OG. HTML encode chặn breakout; cross-user cache poisoning chưa proven. |
| [A01: OTP atomicity](audit-auth-deploy-evidence.md:57) | Cao; trung bình có concurrency | Suspected race từ [verify](../server/lib/Account.php:65) và [consume](../server/lib/Account.php:103). Replay success cần biết valid token/OTP; chưa chạy concurrent test. |
| [A02: OTP entropy/hash](audit-auth-deploy-evidence.md:67) | Trung bình; thấp cần DB read | Proven six-digit unkeyed verifier; offline search khi dump challenge còn hiệu lực. Không áp cùng kết luận cho high-entropy magic/session tokens. |
| [A03: GET magic-link/log](audit-auth-deploy-evidence.md:73) | Trung bình; trung bình | GET side effect và request-line logging proven; browser login-CSRF/scanner/token theft conditional. Cần valid link hoặc log access. |
| [A04: admin hardening](audit-auth-deploy-evidence.md:79) | Cao; trung bình nếu public | Proven thiếu limiter/MFA/application TTL/version revoke trong [auth](../server/lib/Auth.php:26); edge/PHP policy thật chưa checked. |
| [A05: login/logout CSRF](audit-auth-deploy-evidence.md:85) | Trung bình; thấp–trung bình | Gate ordering proven tại [routes](../server/api/index.php:126); browser exploit suspected. SameSite Strict giảm risk, không khẳng định fetch đọc cross-origin response. |
| [A06: TLS/proxy cookies](audit-auth-deploy-evidence.md:91) | Cao; deployment-dependent | Suspected effective production. Mẫu HTTP, header trust và secure detection cần topology verification. Local HTTP không tự thành production vulnerability. |
| [A07: client → social rewards](audit-auth-deploy-evidence.md:97) | Trung bình; cao có account | Proven isolated tests: snapshot giả, gift thiếu stock, referral giả. Impact game integrity, không evidence tiền thật hoặc account takeover. |
| [A08: unilateral friends/projection](audit-auth-deploy-evidence.md:103) | Trung bình; trung bình | Proven capability-code add và nested passthrough. Cần biết code/owner lưu private nested fields; không evidence normal client đưa GPS/photo vào đó. |
| [A09: deletion/effects](audit-auth-deploy-evidence.md:109) | Trung bình; trung bình | Proven fixture fault và sender deletion; partial delete/data loss và mất effects recipient. |
| [A10: export/retention](audit-auth-deploy-evidence.md:115) | Trung bình; cao về omission | Export omission proven; purge ngoài repo no-evidence. Không export secrets chỉ để «đầy đủ». |
| [A11: fail-closed config](audit-auth-deploy-evidence.md:123) | Cao conditional; trung bình nếu copy mẫu | Defaults/placeholder/log mail proven, production values chưa đọc. Deployment sai mới tạo exposure/devCode/log risk. |
| [A12: body/list resources](audit-auth-deploy-evidence.md:129) | Trung bình; trung bình | Proven full body read trước size check, admin fetch-all trước slice; impact phụ thuộc body/population/edge budget. |
| [A13: progress CAS](audit-auth-deploy-evidence.md:135) | Trung bình; trung bình concurrent devices | Suspected false-success khi conditional UPDATE thua nhưng không check affected rows; chưa barrier test. |
| [A14: ignore/secrets policy](audit-auth-deploy-evidence.md:141) | Trung bình; thấp–trung bình | Pattern gap proven; actual secret leakage no-evidence. Không audit history/real secrets. |
| [A15: social quota/GET mutations](audit-auth-deploy-evidence.md:147) | Thấp–trung bình; trung bình concurrent | GET effects proven; aggregate check-before-write race suspected. Duplicate unique keys không bảo đảm tổng quota giữa nhiều friends. |

## 4. XSS và injection: phân biệt context, tránh false positives

### XSS

- **Reflected:** share slug có regex; host fallback ảnh hưởng metadata nhưng title/quoted attributes được HTML encode. [Share traces](audit-frontend-evidence.md:139) không chứng minh tag/quote breakout.
- **Stored:** catalogue/AI/guest names có thể mang text không tin cậy, nhưng React text và admin escaped rendering không trở thành HTML execution. [Numeric producer](../server/lib/AdminUsers.php:163) ép XP/coins/streak và tính counts; payload guest markup không sống sót dưới dạng markup ở các numeric consumers. [Chi tiết privileged threat](audit-frontend-evidence.md:94): nếu tương lai có guest field tới raw admin HTML, mã cùng origin có thể thực hiện quyền admin; HttpOnly/CSRF không chữa XSS. Hiện tiền đề chưa proven.
- **DOM:** đã truy storage, router, scene, object URLs, media, iframe messages và raw HTML admin. [Iframe](../src/features/food-reel/components/FoodVideo.tsx:276) kiểm exact origin và source. Không thấy React raw HTML sink trong search; không kết luận toàn third-party engine sạch.
- **URL schemes:** quote escaping không thay URL allowlist; media URLs chưa constrain là FE-01 nhưng media source không tự chứng minh scheme JavaScript thực thi. Order/YouTube links dùng fixed HTTPS origins, ID/query normalization, opener protection theo [URL traces](audit-frontend-evidence.md:115).
- **JSON/script closing:** API JSON là response JSON, không inline HTML script nên không báo closing-script payload trong JSON API là XSS. Generator [escapes less-than](../scripts/build-image-prompts.mjs:62) trước inline embedding; pure test round-trip đã pass. Nếu thêm bootstrap JSON inline, phải dùng serializer phù hợp script context, không chỉ HTML escape hoặc JSON serialization đơn độc.
- **Context escaping:** text, quoted attributes, URL, CSS, JavaScript và replacement-string khác context; không dùng một sanitizer chung chữa mọi sink. [Share replacement](audit-frontend-evidence.md:144) có caveat dollar/backslash làm lệch nội dung, chưa XSS; đề xuất callback để giữ dữ liệu literal.

### SQL, shell, SSRF và file

- [SQL traces](audit-backend-evidence.md:143): value binds, placeholder counts và identifier tuples code-owned; driver branches không user-defined identifiers. Migration database name config-only chưa escape không phải HTTP SQLi.
- [Shell traces](audit-backend-evidence.md:154): PHP không có primitive shell proven. Node export/test dùng executable và argument arrays; [browser spawn](../scripts/lib/headless.mjs:36) nhận operator environment/path và options, không HTTP args. [MCP command](../scripts/playcanvas-mcp-session.mjs:8) là operator-only command cố định; package tải động là supply-chain review item, không request injection proven. Không chạy các tooling này.
- [SSRF traces](audit-backend-evidence.md:96): reverse/YouTube hosts cố định, input coordinates/IDs constrain. Provider URL là config boundary, redirect disabled/không bật, chưa DNS/egress runtime verification. B01 là local-file disclosure qua AI payload, không HTTP image fetch SSRF.
- [Upload traces](audit-backend-evidence.md:83): route ID constrained, image re-encoded, video extension từ MIME và tên server; filename người dùng không chọn destination. Mẫu alias không generic PHP handler, nhưng effective handler/symlink/quota cần deploy tests. Không khẳng định served polyglot/RCE đã an toàn toàn diện.
- [Prompt injection](audit-backend-evidence.md:180): dữ liệu ảnh/text/library có thể steering nội dung; không model tools/generated SQL/shell proven. Candidate ID output được constrain, semantic relevance vẫn cần kiểm duyệt.

## 5. Reproduction an toàn và acceptance chung

Mọi reproduction chi tiết trong phụ lục trừ actual tests mục 6 **chưa thực hiện**. Dùng sandbox dùng một lần ngoài application workspace, fake config/identities/clock/DB memory, stub transport/readers và deny mạng toàn bộ. Không dùng secrets/email thật, không include entrypoints có DB/cache side effects, không request CLI/seed/migration/pilot trên hệ đang chạy.

1. **B01:** marker giả ngoài synthetic uploads root; validator nhận path traversal, request builder phải reject trước read/transport sau khi triển khai fix. Có thêm symlink, non-image, byte/pixel cap, Windows separator/case và prefix-neighbor tests. Hiện chỉ pure path biểu thức được chạy, không marker file thật.
2. **XSS:** offline producer→renderer harness với marker tag inert trong tên/story/consent/numeric progress; giữ text đúng, không thêm node/event/script. Kiểm numeric backend output trước sink. Nếu thử execution chỉ toggle biến fixture, không đọc cookies hoặc làm admin action.
3. **Auth:** fake OTP challenge + worker barrier, đúng một consume/session; attempts/quota atomic. Browser offline login/logout foreign-origin, magic-link scanner GET và explicit confirmation; no-store/no-referrer/query log redaction.
4. **Access/privacy:** owner cross-tests cho progress/preferences/export/delete, stranger visit, recipient ACK; deep public projection bỏ private markers, invitation/block/revoke policy rõ ràng.
5. **Resources/deploy:** stub oversized responses/dimensions và immutable filename; không ảnh bomb hay load live. Isolated edge config kiểm deny root/dev/CLI/dotfiles, no executable upload handler, route-specific body limits, TLS redirect/cookies/headers.
6. **Concurrency/data:** hai progress writes cùng version chỉ một success, request thua conflict; deletion fault rollback và recipient effects tồn tại; aggregate quota không vượt khi nhiều cặp/ngày, GET read-only.

## 6. Actual tools/tests và bảo toàn workspace

- Git status đầu lượt trả exit 0, output rỗng: working tree sạch trước các báo cáo. Inventory/read/search và delegation chỉ tạo ba phụ lục đã liên kết; parent tự đọc chúng và đối chiếu trực tiếp writer/path/read AI, numeric admin producer, generator JSON và tooling process spawn.
- Self-test hiện hữu được safety-review include graph/lazy environment; chạy bằng PHP XAMPP với SQLite memory, synthetic identities và trigger fault memory. **Characterization: 22 PASS, 0 FAIL, 5 KNOWN-FAIL; strict: 22 PASS, 5 FAIL, exit 1.** [Full actual stdout và safety](audit-auth-deploy-evidence.md:165). Không gọi OTP request/Mailer/real DB hoặc network.
- Dependency metadata audit dùng ignore-scripts, package-lock-only, JSON, registry HTTPS; exit 0, **0 advisory, total 319**. Không install/update/audit fix hoặc lifecycle scripts. [Actual metadata](audit-auth-deploy-evidence.md:236).
- Parent chạy Node inline pure assertions trong bộ nhớ, exit 0, không đọc/ghi fixture hoặc import application: **PASS image allowlist accepts dot-segment and resolver escapes synthetic root (no file read)**; **PASS generated inline JSON escapes script-closing less-than and round-trips**. Đây là kiểm chứng biểu thức/path và escaping, không full PHP builder exploit hoặc browser XSS proof.
- Không chạy frontend security-audit suite lần này; [existing suite](../src/domain/security-audit.test.ts) và [anti-cheat actual tests](kiem-toan-gian-lan-game.md:185) là evidence riêng, không cộng kết quả cũ thành test mới.
- Không build/verify/export vì [build chain](../package.json:8) gọi export snapshot và có thể DB production. Không browser/live API/email/load/concurrency production. Không đọc/ghi môi trường thật hoặc secrets.
- Kiểm tra trạng thái/diff cuối được thực hiện sau khi ghi tài liệu; chỉ thay đổi được phép là báo cáo chính, ba phụ lục evidence và link bổ sung báo cáo anti-cheat. Không application/dependency/test logic được sửa. Nếu phát sinh external changes, không revert chúng.

## 7. Kế hoạch triển khai có thứ tự — chưa thực hiện

Effort là ngày kỹ thuật ước tính cho một engineer, chưa gồm thời gian review/deploy; phụ thuộc data migration/product policy có thể tăng. Không nên vá frontend đơn độc để chữa authority backend.

| Phase | Mục tiêu/IDs | File targets | Effort và dependencies | Acceptance/release gate |
|---|---|---|---|---|
| P0: xác minh exposure và production policy | B02/B07/A06/A11/A14 | [Apache](../deploy/apache/angi.local.conf), [Nginx](../deploy/nginx/angi.conf), [bootstrap](../server/lib/bootstrap.php), [Auth](../server/lib/Auth.php), [Mailer](../server/lib/Mailer.php), [CLI](../server/bin/), [dev writer](../scripts/garden3d/save-detail.php), [ignore](../.gitignore), [sample](../.env.example) | 2–4 ngày; cần infra owner, host/proxy/egress và secret provisioning | Effective config trong sandbox deny root/dev/CLI/log/DB; HTTPS-only/Secure; placeholders/local/log transport bị reject production; không đọc secrets để kiểm exposure |
| P1: media/file/outbound boundary | B01/B03/B04/B05/B06/FE-01/FE-02 | [Images](../server/lib/Images.php), [AI](../server/lib/AiEnricher.php), [Catalogue](../server/lib/Catalogue.php), [Review](../server/lib/ReviewService.php), [Pilot](../server/lib/YoutubePilot.php), [share](../server/web/share.php), [FoodVideo](../src/features/food-reel/components/FoodVideo.tsx) | 3–6 ngày; chốt local-only/CDN/provider policy; sau P0 deploy boundary | Traversal/symlink/non-image reject trước read; capped uploads/responses, no overwrite/orphans; HTTPS/host/redirect policy; không raw diagnostics; Host lạ không đổi canonical |
| P2: auth correctness | A01/A02/A03/A04/A05 | [Account](../server/lib/Account.php), [Auth](../server/lib/Auth.php), [router](../server/api/index.php), [email builder](../server/lib/LoginCodeEmail.php), [client](../src/services/account.ts), [admin](../server/admin/admin.js), [schemas](../server/sql/) | 4–7 ngày; DB driver strategy, key rotation, MFA/product UX; P0 TLS/logging | Atomic one-time/attempt/quota; browser-bound/confirmed flow phù hợp; limiter/TTL/revoke/MFA; login/logout CSRF tests; scanner GET không consume |
| P3: resource/access/privacy/concurrency | A08/A09/A10/A12/A13/A15 | [Account](../server/lib/Account.php), [Friends](../server/lib/Friends.php), [AdminUsers](../server/lib/AdminUsers.php), [bootstrap](../server/lib/bootstrap.php), [API](../server/api/index.php), [privacy](../public/quyen-rieng-tu.html), [schema](../server/sql/) | 4–8 ngày; consent/retention policy, migration compatibility; P2 fixtures | Deep projection/owner tests; transaction rollback, effects preservation; bounded read/pagination; CAS conflict correct; read-only GET; purge/export policy tests |
| P4: server authority social/game | A07 và anti-cheat F-series | [game plan](kiem-toan-gian-lan-game.md), [Friends](../server/lib/Friends.php), [Account](../server/lib/Account.php), [reducer](../src/domain/reducer.ts), [sync](../src/domain/sync.ts), [schema](../server/sql/) | 8–15+ ngày; product decision cosmetic vs server ledger, old-save migration; P3 transactions | Server-owned inventory/rewards/idempotent commands; forged snapshot không mint effects; strict existing suite không còn 5 FAIL; preservation và replay/concurrency acceptance |
| P5: browser/deployment regression và continuous assurance | FE-03/04/05; headers/secrets/dependencies | [admin renderers](../server/admin/admin.js), [React components](../src/features/food-reel/components/), [generator](../scripts/build-image-prompts.mjs), [deployment](../deploy/), [manifest](../package.json), [audit tests](../server/bin/selftest-security.php) | 3–5 ngày + định kỳ; sau functional fixes, third-party CSP compatibility | Producer–sink XSS harness, script-closing round-trip, iframe origin/source; CSP report-only→enforce, frame/referrer/permissions/nosniff route matrix; secret scan/provenance/advisory CI |

CSP triển khai cần inventory media/font/frame/connect/script sources và thử compatibility PlayCanvas/YouTube; không bật policy rộng tùy tiện chỉ để hết lỗi. HSTS chỉ enforce sau readiness TLS; header inheritance Nginx và mọi error/alias response phải kiểm actual. Không coi CSP thay escaping, CSRF thay auth, client validation thay server schema, hoặc prepared values thay identifier allowlist.

## 8. Chưa checked và giới hạn bắt buộc giữ

Chưa xác minh effective production Apache/Nginx/PHP handlers, TLS certificate/HSTS/CDN/proxy trust/CORS additions, DNS/egress/SMTP peer behavior, filesystem permissions/symlinks/quotas, real environment values, secrets Git history/backup/artifact exposure, installed dependency provenance/runtime patches, browser execution/CSP và login-CSRF exploit, OTP/progress/social concurrent races hoặc worker load. Không đọc DB/log/photo/private storage để «chứng minh» bằng dữ liệu thật. Binary/minified exported engines không được audit toàn dòng; metadata advisories không bao phủ application code.

Báo cáo này hoàn tất lượt audit source-level và isolated checks theo quyền cho phép, **không** hoàn tất remediations. Findings suspected cần fixture/deployment verification đã nêu; findings no-evidence vẫn cần regression và review khi writer/contracts thay đổi.

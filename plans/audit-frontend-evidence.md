# Audit frontend: XSS, URL và embedding

## Phạm vi và phương pháp

Audit tĩnh, chỉ đọc; không sửa implementation, không đọc cấu hình bí mật, không truy cập DB, không gọi mạng, không chạy ứng dụng hoặc test. Tài liệu này là file duy nhất được tạo. Đã inventory thư mục React, admin vanilla và public; search sink HTML, URL, iframe, thông điệp liên cửa sổ, mã thực thi động; sau đó đọc source → transformation → sink. Đọc bổ sung producer backend chỉ để xác minh kiểu dữ liệu và ranh giới tin cậy, không thực thi truy vấn.

Phạm vi chính: [frontend React](../src/), [admin vanilla](../server/admin/), [share](../server/web/share.php), [public/fake](../public/fake/index.html), [frontend services](../src/services/). Không phải audit đầy đủ thư viện bên thứ ba, upload server, reverse proxy hoặc cấu hình triển khai.

### Quy ước kết luận

- **Proven:** hành vi hoặc đường dữ liệu xác định được trực tiếp từ mã; không đồng nghĩa đã exploit động.
- **Suspected:** có dấu hiệu nhưng còn điều kiện triển khai, quyền ghi hoặc hành vi browser chưa xác minh.
- **No-evidence:** không thấy chuỗi khai thác trong nguồn đã đọc; không phải cam kết toàn hệ thống an toàn.

## Tổng hợp cho parent

| ID | Kết luận | Mức ưu tiên | Nội dung |
| --- | --- | --- | --- |
| FE-01 | Proven thiếu kiểm tra URL; no-evidence XSS | Trung bình / hardening | Video tự lưu cho phép URL tùy ý đi từ editor tới media sink của khách. Không được gọi đây là JavaScript execution. |
| FE-02 | Suspected | Thấp–trung bình, phụ thuộc triển khai | Share fallback lấy host request làm gốc URL canonical/OG khi không có URL site cấu hình. Có khả năng metadata poisoning; chưa chứng minh cache poisoning hoặc XSS. |
| FE-03 | No-evidence | Không báo vulnerability XSS | Các sink HTML admin có escape đúng cho text/attribute; những nội suy số cần truy producer, hiện producer ép kiểu hoặc tính count. Không chứng minh guest → privileged stored XSS. |
| FE-04 | No-evidence | Không báo vulnerability XSS | React text, liên kết đặt món, metadata YouTube và thông điệp iframe có rào chắn phù hợp trong đường đã đọc. |
| FE-05 | No-evidence | Hardening tùy chọn | Share encode HTML đúng; public/fake có nội suy mã số static, không có source khách điều khiển tới HTML. |

**Không tìm thấy XSS proven trong phạm vi đã truy source-sink.** Quan trọng: không nâng các nội suy số admin thành privileged stored XSS chỉ vì chúng không escape; producer thực tế phải cho guest giữ được chuỗi markup trước khi kết luận.

## FE-01 — URL video lưu không có allowlist

### Bằng chứng source → sink

1. Admin nhập URL vào [ô video, dòng 481](../server/admin/admin.js:481); giá trị hiện hữu được [escape khi render ô nhập, dòng 481–482](../server/admin/admin.js:481).
2. [Thu thập form, dòng 604](../server/admin/admin.js:604) lấy chuỗi đã trim; [payload video, dòng 616–620](../server/admin/admin.js:616) giữ nguyên URL. [Gửi tạo/sửa, dòng 754–759](../server/admin/admin.js:754) chuyển payload tới API admin.
3. Backend [chuyển video sang chuỗi, dòng 742–748](../server/lib/Catalogue.php:742) không giới hạn scheme, hostname, credential hoặc path. Ngược lại, [ảnh và thumbnail có allowlist path, dòng 750–754](../server/lib/Catalogue.php:750).
4. [Lưu video, dòng 404–406](../server/lib/Catalogue.php:404), rồi [public/admin shape, dòng 167–169](../server/lib/Catalogue.php:167) trả URL ra catalogue.
5. Frontend [đọc catalogue trực tiếp, dòng 162–169](../src/features/food-reel/data/reelCatalogue.ts:162); [adapter, dòng 98–100](../src/features/food-reel/data/reelCatalogue.ts:98) giữ URL và poster nguyên trạng. [Guard payload, dòng 111–122](../src/features/food-reel/data/reelCatalogue.ts:111) không kiểm tra URL video.
6. Sink cuối: [poster, dòng 405](../src/features/food-reel/components/FoodVideo.tsx:405) và [nguồn media, dòng 414–415](../src/features/food-reel/components/FoodVideo.tsx:414).

### Threat và kết luận

**Proven:** không có allowlist URL video trong đường ghi/read/render này. Người có quyền sửa catalogue có thể cấu hình media từ origin ngoài, khiến browser khách có thể liên hệ origin đó khi load/phát. Đây là rủi ro tracking, mixed content, URL ngoài kỳ vọng và tính toàn vẹn nội dung; khả năng gửi request còn tùy preload, autoplay, browser và policy triển khai.

**No-evidence XSS:** URL đi vào nguồn media/poster, không phải HTML raw hoặc điều hướng có khả năng chạy mã. React không biến dấu nháy trong giá trị thành event attribute. Không khẳng định scheme JavaScript sẽ execute trong media source. Không thấy guest có quyền ghi catalogue ở audit này; không được mô tả thành guest → admin stored XSS hay SSRF server.

### Reproduction an toàn, chưa thực hiện

Dùng harness hoàn toàn offline, mock API catalogue với video trỏ origin reserved invalid; chặn toàn bộ request trước render. Kiểm tra attribute nguồn media vẫn giữ URL ngoài và ghi nhận attempted request bằng mock, không cho resolve mạng. Có thể kiểm tra đường validator bằng unit test thuần với URL ngoài mà không khởi tạo DB; không submit form admin thật, không sửa catalogue thật.

### Fix và tests đề xuất

- Nếu chỉ hỗ trợ media local, allowlist tuyệt đối đường upload video và poster ảnh; reject network-path, credential, scheme lạ, dấu gạch chéo ngược, encoded traversal và control characters.
- Nếu cho CDN ngoài, parse URL rồi allowlist HTTPS + hostname chính xác, không so khớp suffix tùy tiện. Validate server ở mọi writer, frontend phòng thủ bổ sung.
- Test URL local hợp lệ; URL ngoài, network-path, scheme JavaScript/data, credential và traversal bị reject. Mock payload độc hại phải không tạo source media hoặc request ngoài.
- Không thêm HTML sanitizer để xử lý vấn đề URL; đây là validation theo context, không phải rich-text rendering.

## FE-02 — Share host fallback và metadata URL

### Source → sink

- [Nguồn URL site và host fallback, dòng 68–76](../server/web/share.php:68): ưu tiên URL cấu hình; nếu rỗng dùng HTTPS/forwarded-proto và host request.
- [Tạo canonical URL, dòng 115–116](../server/web/share.php:115), [tạo OG image URL, dòng 124](../server/web/share.php:124).
- [Canonical replacement, dòng 128](../server/web/share.php:128); [OG URL/image mapping, dòng 132–140](../server/web/share.php:132); [meta encoding và replacement, dòng 91–99](../server/web/share.php:91).

**Suspected metadata poisoning:** nếu site URL chưa cấu hình và host không bị reverse proxy/server allowlist, host của request ảnh hưởng canonical/OG origin. Chưa đọc giá trị cấu hình, chưa gửi request, chưa kiểm tra cache/proxy nên không chứng minh tính khai thác trong deployment. [Cache-Control no-cache, dòng 146](../server/web/share.php:146) không đủ để tự kết luận poisoning persist qua cache.

**No-evidence XSS:** host đi vào attribute đã encode quote/angle bracket, không thấy thoát attribute. URL site có thể không phải HTTPS nếu operator cấu hình sai, nhưng operator-controlled configuration không phải guest-controlled XSS.

Reproduction offline: unit harness tách logic site URL với site cấu hình rỗng, host reserved invalid; kiểm tra canonical/OG đổi origin nhưng không có node/event mới sau parse HTML. Không include entrypoint share thật vì [entrypoint gọi catalogue, dòng 34–35](../server/web/share.php:34) có thể truy DB. Fix: bắt buộc trusted site origin hoặc host allowlist tại edge; test host lạ bị từ chối/bỏ qua, URL site cấu hình luôn thắng, protocol forwarded chỉ tin proxy hợp lệ.

## FE-03 — Admin vanilla: truy đủ producer, không báo sai privileged stored XSS

### Các source không tin cậy nhưng đã escape

- [API response, dòng 99–116](../server/admin/admin.js:99) và [load dishes/ingredients, dòng 120–123](../server/admin/admin.js:120) là nguồn dữ liệu, không tự bảo đảm an toàn.
- [Hàm escape, dòng 34–38](../server/admin/admin.js:34) encode ampersand, angle brackets và cả hai loại quote.
- [Bảng món, dòng 263–272](../server/admin/admin.js:263): thumbnail/name/id/region/source/date/name trong attribute được escape; ID trong URL được encode và gắn prefix cố định. Sink [shell HTML, dòng 149–167](../server/admin/admin.js:149) hoặc [redraw bảng, dòng 313](../server/admin/admin.js:313).
- [Editor text/input/textarea, dòng 421–444](../server/admin/admin.js:421) escape tên, subtitle, story và translations. [Ingredient rows, dòng 530–550](../server/admin/admin.js:530) escape tên, mô tả và input values.
- [AI đề xuất vào input value, dòng 639–659](../server/admin/admin.js:639) không parse HTML; [AI status, dòng 708–730](../server/admin/admin.js:708) escape tên/file/error. [AI image preview, dòng 681–683](../server/admin/admin.js:681) escape URL.
- [Library ingredient table, dòng 908–935](../server/admin/admin.js:908) escape input/text/ID và prefix URL cố định.
- [User rows, dòng 1044–1045](../server/admin/admin.js:1044) escape email, garden name, friend code trước [list HTML, dòng 1112–1115](../server/admin/admin.js:1112).
- [User detail, dòng 1200–1231](../server/admin/admin.js:1200) escape email, tên vườn, friend names/codes, consent và date.
- [Toast, dòng 71–72](../server/admin/admin.js:71), [login error, dòng 185](../server/admin/admin.js:185), [confirm dialog, dòng 1021–1028](../server/admin/admin.js:1021) escape thông điệp.

### Những nội suy chưa escape: vì sao chưa phải XSS

| Consumer admin | Producer đã xác minh | Kết luận |
| --- | --- | --- |
| [price/position/flavor, dòng 264–267](../server/admin/admin.js:264), [ô giá, dòng 426](../server/admin/admin.js:426), [slider, dòng 454](../server/admin/admin.js:454) | [Shape ép position/price, dòng 146–150](../server/lib/Catalogue.php:146), [flavor ép int, dòng 157–163](../server/lib/Catalogue.php:157), [write flavor/price/position, dòng 734–776](../server/lib/Catalogue.php:734) | Không có chuỗi markup sống sót qua producer thông thường. |
| [overview counts, dòng 227–230](../server/admin/admin.js:227), [sidebar counts, dòng 155–158](../server/admin/admin.js:155) | [stats count và grouped COUNT, dòng 213–222](../server/lib/Catalogue.php:213) | Count là số hoặc numeric DB string, không phải nội dung guest. |
| [user ID/progress, dòng 1041–1051](../server/admin/admin.js:1041) | [ID/sessions/friends, dòng 168–175](../server/lib/AdminUsers.php:168), [progress summary, dòng 180–189](../server/lib/AdminUsers.php:180) | ID int; XP/coins/streak int; trường khác count hoặc tổng intval. |
| [detail HTML helper và progress, dòng 1196–1215](../server/admin/admin.js:1196) | [summary, dòng 180–189](../server/lib/AdminUsers.php:180), [version/bytes, dòng 96–97](../server/lib/AdminUsers.php:96), [events count, dòng 121–124](../server/lib/AdminUsers.php:121) | Helper nhận HTML có chủ đích, nhưng dữ liệu động hiện là số hoặc string đã escape ở caller. |

Đặc biệt, guest có thể đưa nội dung vào tiến trình thông qua [client putProgress, dòng 68–69](../src/services/account.ts:68), nhưng admin không render blob raw: [decode và summary, dòng 163–189](../server/lib/AdminUsers.php:163) ép XP/coins/streak và tính count. Chỉ mock API trả markup vào trường vốn là số sẽ chứng minh sink thiếu phòng thủ trước API sai contract, **không** chứng minh guest có thể lưu payload đó để producer thực tế trả ra.

### Threat privileged stored XSS đúng

Nếu tìm được guest-controlled field giữ markup qua persistence và producer rồi đến HTML raw admin, hậu quả sẽ là mã thực thi dưới origin của admin khi admin xem trang/drawer. [API admin dùng cookie same-origin và CSRF token, dòng 99–107](../server/admin/admin.js:99); [token phiên nằm trong closure, dòng 1298–1302](../server/admin/admin.js:1298). XSS cùng origin có thể hành động với phiên admin; cookie HttpOnly hoặc CSRF không tự ngăn mã cùng origin thực hiện thao tác được quyền. Tuy nhiên audit hiện tại **không chứng minh tiền đề XSS đó**. Không suy ra token có thể trực tiếp đọc qua biến global hoặc guest có quyền admin.

### Preview blob

[File chọn, dòng 590–595](../server/admin/admin.js:590) tạo object URL bằng browser rồi nội suy vào HTML preview. Không dùng tên file hay nội dung file làm chuỗi URL; quote breakout không được chứng minh. Có thể revoke object URL khi thay ảnh/đóng editor để tránh giữ resource; đó là quản lý bộ nhớ, không phải finding XSS.

### Tests/fix phòng thủ

- Offline mock guest name/email/consent chứa dấu quote và tag inert; assert node không xuất hiện, chỉ text/input value đúng.
- Test producer summary bằng dữ liệu tiến trình có chuỗi markup trong XP/coins/streak: output phải luôn là số. Đây là test chống regression của ranh giới guest → admin.
- Test mọi HTML renderer với dữ liệu API sai contract; thêm validation số hữu hạn và escape ở sink để giảm phụ thuộc contract, nhưng không coi failing mock-only test là exploit stored XSS thực tế.
- Dùng marker DOM vô hại để tái hiện HTML parsing; nếu cần kiểm tra execution, chỉ toggle biến local trong harness cách ly, không request, cookie đọc hoặc hành động admin.

## FE-04 — React, liên kết và embedding

### Text catalogue

[API catalogue, dòng 162–169](../src/features/food-reel/data/reelCatalogue.ts:162) → [localization/adapter, dòng 70–104](../src/features/food-reel/data/reelCatalogue.ts:70) → [story React child, dòng 268–275](../src/features/food-reel/components/FoodStory.tsx:268), [dish name React child, dòng 90](../src/features/food-reel/components/ReelItem.tsx:90). Search không thấy sink HTML raw trong React. Text markup trở thành text node, không phải rich HTML. [Thumbnail/image adapter, dòng 96–97](../src/features/food-reel/data/reelCatalogue.ts:96) không kiểm tra URL frontend nhưng server writer [allowlist ảnh, dòng 750–754](../server/lib/Catalogue.php:750) giới hạn path. API/snapshot bị sửa ngoài writer là trust assumption khác; không tự suy thành stored XSS.

### Liên kết đặt món

Tên món → [query serialization, dòng 43–70](../src/features/food-reel/data/orderLinks.ts:43) với HTTPS host cố định → [anchor, dòng 50–54](../src/features/food-reel/components/OrderLinks.tsx:50), có noopener/noreferrer. [City từ storage, dòng 34–48](../src/features/food-reel/hooks/useReelPrefs.ts:34) được kiểm tra bằng [allowlist, dòng 29–30](../src/features/food-reel/data/orderLinks.ts:29). [Select options, dòng 38–43](../src/features/food-reel/components/OrderLinks.tsx:38) chỉ chứa city static. Tên chứa ampersand/quote không thay đổi scheme/host. Hàm xây URL không tự validate city ở runtime; hardening hợp lý là validate lại ở helper, nhưng không thấy source từ người khác tạo redirect/XSS.

### YouTube và thông điệp iframe

- [Review API đọc JSON, dòng 48–67](../src/features/food-reel/data/reviews.ts:48) → [check identity/basis, dòng 79–89](../src/features/food-reel/data/reviews.ts:79) → [normalize metadata, dòng 4–43](../src/features/food-reel/data/youtubeVideos.ts:4).
- [ID video/channel regex, dòng 24–25](../src/features/food-reel/data/youtubeVideos.ts:24) chặn injection path/query; [thumbnail tái tạo từ host cố định, dòng 39](../src/features/food-reel/data/youtubeVideos.ts:39), bỏ supplied URL.
- [Render thumbnail và title, dòng 119–139](../src/features/food-reel/components/FoodVideo.tsx:119); [iframe HTTPS host cố định, dòng 302–308](../src/features/food-reel/components/FoodVideo.tsx:302); [fallback HTTPS và noopener/noreferrer, dòng 339–343](../src/features/food-reel/components/FoodVideo.tsx:339).
- [Receive message kiểm tra source và exact origin, dòng 276–291](../src/features/food-reel/components/FoodVideo.tsx:276); nội dung chỉ chuyển trạng thái error, không HTML/code sink. [Send message target origin chính xác, dòng 311–317](../src/features/food-reel/components/FoodVideo.tsx:311), không wildcard.
- Iframe không có sandbox tại [dòng 302–321](../src/features/food-reel/components/FoodVideo.tsx:302). Đây là tích hợp third-party trusted trên origin khác; không tự gọi thiếu sandbox là XSS. Có thể thử sandbox/permission tối thiểu sau khi kiểm tra tương thích player. Chưa xác minh frame-ancestors hoặc policy chống clickjacking của toàn site.

Tests đề xuất: reject ID có slash/quote/query; bỏ URL thumbnail supplied; title markup chỉ text; message đúng origin nhưng sai source và đúng source nhưng sai origin đều bị bỏ qua; message malformed không crash; fallback không có opener; chuyển selection chỉ còn một iframe. Không mở player thật để test.

### Scene loader

[Query scene, dòng 58–62](../src/features/farm-pc/engine/sceneLoader.ts:58) giới hạn version thành tên package; [base origin/scheme, dòng 111–118](../src/features/farm-pc/engine/sceneLoader.ts:111); [nested URL guard, dòng 8–34](../src/features/farm-pc/engine/sceneLoader.ts:8) giới hạn cùng origin, directory, credential và encoding traversal. [External libraries bị reject, dòng 136–138](../src/features/farm-pc/engine/sceneLoader.ts:136); [script assets validate nhưng không register/load, dòng 165–176](../src/features/farm-pc/engine/sceneLoader.ts:165). Không thấy query cho phép inject remote executable asset trong đường này. Không audit toàn bộ engine hoặc public export standalone.

### Router

[Path parse whitelist, dòng 5–9](../src/features/food-reel/hooks/useRoute.ts:5) → [path prefix cố định, dòng 12–15](../src/features/food-reel/hooks/useRoute.ts:12) → [history navigation, dòng 31–36](../src/features/food-reel/hooks/useRoute.ts:31). Không phải external navigation hoặc HTML sink. Helper không encode slug từ caller; hardening encode/validate slug nếu contract mở rộng. Không có bằng chứng open redirect trong đường đã đọc.

## FE-05 — Share HTML và public/fake

### Share encoding

- [Slug request regex, dòng 29–35](../server/web/share.php:29) chặn quote/path arbitrary trước lookup.
- [DB catalogue source, dòng 44–48](../server/web/share.php:44) và [translations, dòng 58–63](../server/web/share.php:58) cung cấp tên/story/subtitle.
- [Title và mô tả, dòng 117–125](../server/web/share.php:117) → [HTML title encode, dòng 127](../server/web/share.php:127); [meta encode, dòng 93–99](../server/web/share.php:93) → [output HTML, dòng 150](../server/web/share.php:150).
- Replacement meta còn escape dấu dollar và backslash tại [dòng 96](../server/web/share.php:96), tránh coi dữ liệu là backreference. Title/canonical [dòng 127–128](../server/web/share.php:127) không có lớp escaping replacement tương đương: có khả năng lệch nội dung với chuỗi dollar/backslash đặc biệt, nhưng encoding HTML vẫn chặn tag/quote breakout; chưa chứng minh XSS. Fix có thể dùng callback replacement để dữ liệu không mang ngữ nghĩa replacement; test round-trip dollar/backslash.
- [HTML language insertion, dòng 112](../server/web/share.php:112) không encode trực tiếp, nhưng [locale normalize allowlist, dòng 52–65](../server/lib/Lang.php:52) và [available code regex, dòng 27–34](../server/lib/Lang.php:27) không cho request đưa quote/tag vào locale.
- [OG text drawing, dòng 270–292](../server/web/share.php:270) là raster text, không HTML. [Image path resolver, dòng 188–207](../server/web/share.php:188) đọc local, không fetch remote; không báo SSRF từ đoạn này. Không kết luận đầy đủ về symlink/path filesystem trong audit frontend.

Tests offline: names/translations chứa quote/angle bracket, closing-title text, dollar và backslash; parse kết quả phải giữ số node/script như template và title/meta biểu diễn text đúng. Mock catalogue và template, tuyệt đối không thực thi entrypoint có DB/cache writes.

### Public/fake

[Static ITEMS, dòng 277](../public/fake/index.html:277) → [HTML template, dòng 348–353](../public/fake/index.html:348): chỉ mã số static được nội suy raw. Tên/sub/file/prompt dùng [textContent, dòng 354–357](../public/fake/index.html:354); [toast, dòng 294](../public/fake/index.html:294) cũng text. [Storage copied state, dòng 278–285](../public/fake/index.html:278) chỉ làm membership/count/class; [search input, dòng 388–396](../public/fake/index.html:388) chỉ filter visibility. Không thấy source URL/storage/network tác động raw mã số.

Dòng static dữ liệu rất dài bị tool cắt preview; audit không tuyên bố đã đọc từng mục trong deck. Kết luận dựa trên provenance static và renderer, không trên việc kiểm chứng toàn bộ generator. Nếu deck sau này lấy từ API/generated content không tin cậy, chuyển mã số sang text node và encode dữ liệu nhúng script theo context; hiện chưa có bằng chứng người dùng kiểm soát source này.

## Frontend services và dữ liệu local

- [Account service, dòng 34–55](../src/services/account.ts:34) dùng API prefix cố định, JSON và cookie same-origin; trả dữ liệu cast kiểu, không render HTML. [Friend endpoints, dòng 203–225](../src/services/account.ts:203) encode code trong path. Validation kiểu chỉ bằng TypeScript không đủ bảo vệ runtime, nhưng service bản thân không phải XSS sink.
- [Mock service, dòng 43–60](../src/services/mockApi.ts:43) chỉ timer/recommendation, không request thật, không HTML/URL execution.
- [Photo compression, dòng 62–79](../src/services/photoStore.ts:62) decode ảnh và re-encode JPEG; [photo persistence, dòng 83–89](../src/services/photoStore.ts:83) local. [PhotoCapture, dòng 33–37](../src/components/checkin/PhotoCapture.tsx:33) → [image preview, dòng 51](../src/components/checkin/PhotoCapture.tsx:51) là object URL. [Album object URL, dòng 33–43](../src/features/food-reel/journey/MealAlbum.tsx:33) → [image, dòng 61–67](../src/features/food-reel/journey/MealAlbum.tsx:61), revoke khi cleanup. Không đọc DB ảnh trong audit.
- [Account export, dòng 43–50](../src/components/account/AccountBlock.tsx:43) và [progress export, dòng 45–52](../src/components/profile/ProfileSheet.tsx:45) tạo JSON blob với tên tải cố định, không parse HTML hoặc điều hướng URL từ nội dung API. Không thấy XSS source-sink.

## Giới hạn và hành động parent

1. Ưu tiên xác nhận policy video: local-only hay CDN allowlist; FE-01 là thiếu validation proven, không phải proven XSS.
2. Xác nhận site URL được bắt buộc và host được giới hạn ở deployment để đóng FE-02; không cần đọc secret trong audit này.
3. Giữ threat model privileged stored XSS nhưng không báo false positive trên progress admin đã ép kiểu. Chỉ nâng severity khi có field guest-controlled sống sót qua producer đến sink raw.
4. Các reproduction/test ở trên là đề xuất, **chưa chạy**. Chưa có bằng chứng động về execution, request ngoài, browser policy hoặc exploit deployed.
5. Không sửa implementation; không tạo test hoặc harness trong workspace. Ngoài tài liệu audit này, không có file nào được ghi.

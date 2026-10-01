# Frontend review theo tỉnh — kết quả 2026-10-01

## Phạm vi và thay đổi

Audit implementation đã có trong [`reviews.ts`](../src/features/food-reel/data/reviews.ts:1), [`ReviewBrowser.tsx`](../src/features/food-reel/components/ReviewBrowser.tsx:1), [`FoodVideo.tsx`](../src/features/food-reel/components/FoodVideo.tsx:1), [`FoodVideo.test.tsx`](../src/features/food-reel/components/FoodVideo.test.tsx:1).

Thay đổi bổ sung trong task này:

- [`ReviewBrowser.tsx`](../src/features/food-reel/components/ReviewBrowser.tsx:65): không xóa thông báo GPS thành công khi tỉnh mới kích hoạt tải review. Chọn thủ công vẫn xóa thông báo GPS; generation/abort bảo vệ callback muộn.
- [`FoodVideo.test.tsx`](../src/features/food-reel/components/FoodVideo.test.tsx:145): regression cho thông báo GPS thành công khi đổi từ chưa chọn tỉnh sang HN mock.
- [`reel.detail.css`](../src/features/food-reel/styles/reel.detail.css:241): bộ chọn tỉnh nền tối, focus rõ, kích thước chạm 44px, xuống dòng và khoảng cách cho privacy prose/nút.
- [`inspect-review-ui.mjs`](../scripts/inspect-review-ui.mjs:1): script browser evidence theo mẫu [`inspect-youtube-ui.mjs`](../scripts/inspect-youtube-ui.mjs:1), dùng [`headless.mjs`](../scripts/lib/headless.mjs:1). Helper nhận cổng DevTools tùy chọn để từng phiên không đụng cổng cố định.
- [`catalogue.snapshot.json`](../src/features/food-reel/data/catalogue.snapshot.json): build đã xuất lại generated frontend snapshot gồm 95 món. Không sửa backend source, schema, quota, cấu hình secrets; không sửa project khác.

## Tests và so sánh baseline chính xác

Baseline **đã được assistant chạy trước mọi thay đổi frontend trong task chính**: 197 pass / 5 fail / 202 tests, 4 files fail, artifact cmd-1790849762697.txt. Subtask nhận kết quả baseline từ task chính, không chạy lại baseline. Gồm **4 fixture failures**: translations Cơm tấm so với Broken rice tại dòng 178; catalogue assets; reducer recipe/region progress; Bún mọc thiếu giò sống viên tại dòng 170; và **1 timeout riêng** Rổ quay tại dòng 264. Đây là baseline frontend, không phải baseline backend.

| Lần thực thi | Kết quả | Evidence |
| --- | --- | --- |
| Full suite đầu task, trước bổ sung CSS/GPS regression | 208 pass / 3 fail / 211; 22 files pass / 3 fail | [`review-full-tests.txt`](../storage/review-full-tests.txt:472) |
| Full suite cuối sau build xuất snapshot và bổ sung regression | **212 pass / 0 fail; 25 files pass** | [`review-full-tests-final.txt`](../storage/review-full-tests-final.txt:211) |
| Targeted review UI cuối | **19 pass / 0 fail** | [`review-targeted.txt`](../storage/review-targeted.txt:8) |
| Typecheck cuối | **pass** | [`review-typecheck-final.txt`](../storage/review-typecheck-final.txt:1) |
| Production build cuối | **pass**, 95 món, 5138 modules, 56 precompressed files | [`review-build-final.txt`](../storage/review-build-final.txt:1) |

Ba lỗi full suite đầu task là catalogue assets, reducer recipe/region progress và Bún mọc; translations và timeout Rổ quay không tái hiện ở lần này. Full suite cuối không còn năm lỗi baseline. Không chỉnh các test fixture đó hoặc backend để ép pass. Snapshot thay đổi giữa hai lần full suite; không kết luận riêng CSS/GPS fix đã sửa fixture catalogue. Số test không bằng baseline: implementation mới có coverage review; task này thêm một test từ targeted 18 thành 19. Không cần chạy lại timeout riêng vì full suite cuối pass. Build còn cảnh báo chunk FriendIsland trên 500 kB, không chặn build và ngoài phạm vi review.

## Browser thực thi và screenshots

**8/8 scenarios pass**: cơm tấm và phở bò, viewport 1440×900 và 390×900, localhost Vite secure và HTTP angi.local không secure. Mobile là viewport responsive trong headless desktop engine; helper không mô phỏng đầy đủ thiết bị cảm ứng thật.

Evidence tổng: [`results.json`](../storage/review-ui/results.json), log [`review-browser.txt`](../storage/review-browser.txt:1). Script chạy bằng Node với [`inspect-review-ui.mjs`](../scripts/inspect-review-ui.mjs:1); dữ liệu đầu vào [`review-cached-public.json`](../storage/review-cached-public.json) chỉ metadata public đã lưu.

Screenshots manual:

- Localhost cơm tấm: [desktop](../storage/review-ui/localhost-com-tam-1440-manual.png), [mobile](../storage/review-ui/localhost-com-tam-390-manual.png).
- Localhost phở: [desktop](../storage/review-ui/localhost-pho-bo-1440-manual.png), [mobile](../storage/review-ui/localhost-pho-bo-390-manual.png).
- HTTP cơm tấm: [desktop](../storage/review-ui/http-com-tam-1440-manual.png), [mobile](../storage/review-ui/http-com-tam-390-manual.png).
- HTTP phở: [desktop](../storage/review-ui/http-pho-bo-1440-manual.png), [mobile](../storage/review-ui/http-pho-bo-390-manual.png).

Screenshots GPS/fallback:

- Localhost cơm tấm: [desktop](../storage/review-ui/localhost-com-tam-1440-gps.png), [mobile](../storage/review-ui/localhost-com-tam-390-gps.png).
- Localhost phở: [desktop](../storage/review-ui/localhost-pho-bo-1440-gps.png), [mobile](../storage/review-ui/localhost-pho-bo-390-gps.png).
- HTTP cơm tấm: [desktop](../storage/review-ui/http-com-tam-1440-gps.png), [mobile](../storage/review-ui/http-com-tam-390-gps.png).
- HTTP phở: [desktop](../storage/review-ui/http-pho-bo-1440-gps.png), [mobile](../storage/review-ui/http-pho-bo-390-gps.png).

Đã kiểm tra: không GPS tự động; không iframe trước chọn video; đúng 5 thẻ cơm tấm/4 thẻ phở; một iframe khi chọn; đổi HN mock rỗng tháo iframe và không fallback công thức; body và story scroll bị khóa, story inert; Shift+Tab thực sự wrap trong dialog; Escape thực sự đóng riêng popup, giữ story cha, tháo iframe, bỏ inert, restore opener; overflow styles được phục hồi (trường hợp khác rỗng/auto/clip có unit coverage). Localhost mock GPS chọn HCMC qua reverse mock POST, body chỉ hai trường tọa độ, không query; mock từ chối quyền vẫn chọn thủ công được. HTTP angi.local không gọi GPS/reverse và hiển thị giải thích HTTPS/localhost.

Visual audit: desktop 3 cột, mobile 2 cột, privacy đọc được, popup cuộn dọc, không tràn ngang. Ảnh mobile chụp sớm có thumbnail chưa tải/ẩn khi mạng lỗi; fallback card và tiêu đề vẫn hiện. Tiêu đề/Close kế thừa locale trình duyệt tiếng Anh trong phiên này; prose review hiện tiếng Việt, chưa làm localization toàn bộ review.

## Privacy, quota, provider coverage

Chỉ lưu mã tỉnh canonical trên thiết bị, không tọa độ. GPS chỉ theo thao tác rõ ràng, tọa độ gửi POST body tới backend trong sản phẩm; backend dùng Nominatim. Không thể cam kết provider không lưu/log; deployment cần kiểm soát proxy/APM/body logging. Abort/generation chặn GPS/reverse/review muộn ghi đè chọn thủ công, đóng/unmount hoặc đổi món. Unit coverage có 422/429/503, denied/unavailable/timeout, watchdog và request timeout.

Trong evidence này, HCMC được đọc trực tiếp từ stored reviews với fetch=false: **5 cơm tấm / 4 phở**. Không gọi route có khả năng refresh cache hết TTL. Trình duyệt intercept review HCMC trả bản metadata đó, HN trả mock rỗng, reverse trả mock. Vì vậy **không gọi YouTube search/videos, AI hay reverse provider thật và không backend spend mới**; không đọc/in secrets hoặc private quota files. Con số lịch sử 202 YouTube units / AI 2 / reverse 1 và policy 404 units / AI 4 / reverse 10 mỗi ngày là từ [`backend-reviews.md`](backend-reviews.md:29), không phải đo billing lại trong task này.

Chỉ title-description-only, không xác minh hình/âm thanh hay tuyên bố AI đã xem video. Không đảm bảo đủ 5. Thumbnail i.ytimg.com là tài nguyên provider; iframe chỉ được tạo sau chọn và dùng youtube-nocookie, không có nghĩa không gửi dữ liệu mạng cho YouTube khi xem.

## Blockers và giới hạn evidence

Không còn blocker test/typecheck/build hoặc tám UI scenarios cuối. Các lần browser thử đầu gặp selector đọc select trang nền, DevTools cổng cố định/phiên tồn đọng và opener chưa ready; script đã sửa scoping, chờ opener và cổng riêng từng phiên. Một lần treo sau tạo player được dừng đúng tiến trình script; không dùng security bypass.

Playback thật **chưa xác minh**: lần cuối chặn mạng iframe YouTube để kiểm tra lifecycle ổn định; iframe presence/src không chứng minh phát được. Không thử quyền GPS hệ điều hành thật, reverse Nominatim thật, HN live review, backend API integration refresh, concurrency backend hay stress quota trong task này. HTTP manual và localhost GPS là browser thật với dịch vụ có mock, không gọi provider thật. Evidence cuối không được dùng để tuyên bố bao phủ GPS/provider toàn Việt Nam hoặc production playback.

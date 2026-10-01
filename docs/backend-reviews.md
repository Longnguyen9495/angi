# Backend review theo món và tỉnh — evidence 2026-10-01

## Phạm vi và đường dẫn

Chỉ backend và tài liệu; không thay frontend, không truy cập project ngoài angi, không đọc/in nội dung cấu hình bí mật bằng công cụ. Secrets được bootstrap nạp tại PHP runtime.

- Service riêng: [`server/lib/ReviewService.php`](../server/lib/ReviewService.php:1).
- API: [`server/api/index.php`](../server/api/index.php:29).
- Migration chuẩn tích hợp service: [`server/bin/migrate.php`](../server/bin/migrate.php:7).
- CLI migration/reverse verification/live pilot: [`server/bin/review-pilot.php`](../server/bin/review-pilot.php:1), tùy chọn **--migrate**, **--verify-reverse**, **--live**. Live giới hạn HCMC và đúng hai món.
- Tests SQLite độc lập: [`server/bin/selftest-reviews.php`](../server/bin/selftest-reviews.php:1).
- Probe API chỉ status/count: [`server/bin/probe-review-api.php`](../server/bin/probe-review-api.php:1).
- Bỏ trường translations bị chèn nhầm vào UPDATE dishes tại [`server/lib/Catalogue.php`](../server/lib/Catalogue.php:234); translations vẫn dùng bảng riêng như trước.

## Contract

**GET /api/provinces**: count=2, items gồm id/name cho HN và HCMC. Đây là whitelist pilot, không phải danh mục toàn bộ tỉnh Việt Nam.

**GET /api/reviews?dish=com-tam&province=HCMC**: dishId, provinceId, count, items, basis=title-description-only. Hai dish hợp lệ: com-tam, pho-bo. Alias tỉnh gồm Hà Nội/Hanoi/HN và Hồ Chí Minh/TP HCM/HCMC/Sài Gòn. Tối đa 5 item; mỗi item gồm videoId, title, description, channelId, channelTitle, publishedAt, duration, thumbnail lấy từ provider. Không trả prompt/AI response/model/key. Không dùng bảng video công thức hay thay video gốc.

**POST /api/reverse**: JSON chỉ latitude và longitude, không query, declared body tối đa 1024 bytes. Response chỉ provinceId/provinceName. Sai kiểu/bounds hoặc tỉnh ngoài whitelist: 422. Chưa verify hoặc verification quá 24h: 503. GET reverse: 405. Rate/quota hết: 429. Provider lỗi: 503, message sanitized chỉ HTTP status. Không cache response reverse theo GPS, không ghi payload/provider reverse raw vào file hay DB.

Các route review/reverse có rate 6 request/client/phút và 60 tổng/phút. Identity lưu dạng hash cửa sổ một phút, không raw IP. Provinces là static và không gọi provider. JSON response no-store.

## Persistence, cache và budget

Migration idempotent tạo **review_provinces** và **province_dish_reviews** riêng, hỗ trợ PDO SQLite/MySQL. DDL nằm trong service migration, được migration chuẩn gọi; không sửa hai schema catalogue SQL gốc. Position constraint 0..4 và unique theo pair/position. Replacement dùng transaction. Dish key canonical whitelist độc lập ID catalogue legacy.

Cache/locks/counters ở storage/review-private, được ignore tại [`.gitignore`](../.gitignore:15), không public route phục vụ. Pair lock tránh đồng thời fetch/replace. Atomic rename; TTL một giờ kể cả selection rỗng. Cache hit chỉ đọc bảng review. Daily budget UTC: YouTube 404 units, AI 4 requests, reverse 10 requests. Search reserve 100, videos reserve 1 trước gọi mạng; lỗi cũng tiêu reservation. Không retry nên không che giấu quota phát sinh. Counters là local reservations, không phải dashboard billing Google. Locks/counters chỉ đảm bảo trong cùng filesystem của một máy; multi-host cần shared quota/locks.

YouTube search tối đa 25; videos revalidate public, processed, embeddable, age restrictions và VN. Description tối đa 5000 ký tự. Bộ lọc title+description yêu cầu đúng món, địa phương và dấu hiệu quán/review; loại recipe/cách làm/cách nấu/công thức/tại nhà/mukbang và metadata chứa địa phương đối nghịch. AI chỉ chọn tối đa 5 IDs từ tập candidate đã lọc; unknown/duplicate/over-limit bị từ chối. Không tuyên bố đã xem video. Metadata ambiguity có thể làm giảm recall; đây không phải xác minh nội dung hình/âm thanh.

## Evidence thực thi

Baseline đầu tiên: cả selftest tổng và YouTube bị fatal do UPDATE nhầm cột translations không tồn tại (MySQL và SQLite); YouTube đã pass 13 checks trước fatal. Không ghi thành 4 fixture failures vì lần chạy thực tế không có kết quả đó. Sau sửa chính xác lỗi này: selftest tổng **36 checks pass**, YouTube **26 checks pass**. Test review ban đầu **24 checks pass**, sau bổ sung thêm accounting/exhaustion/privacy có **27 checks** (kết quả cuối ghi trong báo cáo task). Lint service, API, migration và Catalogue pass.

Migration local MySQL review chạy thành công hai lần. SQLite in-memory migration chạy hai lần, không cần dữ liệu catalogue. Live pilot thật HCMC:

| Món | Review lưu | Search | Videos | AI |
| --- | ---: | ---: | ---: | ---: |
| com-tam | 5 | 1 | 1 | 1 |
| pho-bo | 4 | 1 | 1 | 1 |

Tổng YouTube **202 units**, searchCalls=2, videoCalls=2, AI=2. Chạy lại live từ cache vẫn 5/4 và counters không đổi. API thật: provinces HTTP 200/count 2, hai review HTTP 200/count 5 và 4, GET reverse HTTP 405; cả bốn probe pass.

Reverse verification thật: một request bounded tới Nominatim dùng landmark Hồ Hoàn Kiếm cố định công cộng, HTTP **200**, province **HN**. Evidence fields: city, ISO3166-2-lvl4, country, country_code. Không evidence URLs/GPS/provider raw. Sau verify: reverse counter **1**, YouTube vẫn **202**, AI vẫn **2**. Verification artifact chỉ timestamp/status/province/field names; gate 24h. Không gửi tọa độ cá nhân để thử live reverse.

## Blockers và hạn chế vận hành

Không có blocker config/network cho pilot đã chạy. Chưa thử HN review live, playback, MySQL constraint rejection trực tiếp, concurrent stress hay global 60-request exhaustion. Không thay quota policy Google Cloud. Không chạy frontend/build/snapshot.

Reverse provider nhận tọa độ để xử lý mạng; ứng dụng không log/store raw GPS nhưng không thể cam kết logging bên provider. Deployment cần tắt body logging/tracing ở proxy/APM, giữ GPS ngoài URL và không expose storage. POST không thể ngăn client cố tình đưa GPS vào URL trước khi webserver access log; API từ chối query. API đọc tối đa 1025 bytes và reject trên 1024 ngay cả thiếu CONTENT_LENGTH; webserver vẫn nên giới hạn body đầu vào. Public landmark verification không chứng minh bao phủ mọi tọa độ VN. Nominatim public policy/rate nên đánh giá trước production scale; reverse hiện serialize và delay 1.1s, tổng 10 reservations/ngày.

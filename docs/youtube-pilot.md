# YouTube pilot

Chỉ hỗ trợ **com-tam** và **pho-bo**, tối đa 5 video mỗi món. Giữ nguyên video gốc. Frontend hiển thị thumbnail, tiêu đề, kênh và liên kết YouTube; chỉ tạo một player sau khi người dùng bấm, dừng player khi chuyển video hoặc đóng câu chuyện món.

## Cấu hình và vận hành

Bootstrap hiện có ở [`server/lib/bootstrap.php`](../server/lib/bootstrap.php:14) đọc môi trường hệ thống và cấu hình tại root angi. Thêm khóa YouTube server-only theo [`.env.example`](../.env.example). AI dùng endpoint chat completions với model mặc định gpt-5.6-sol. Ngày 2026-10-01, người dùng cho phép sao chép riêng khóa YouTube từ cấu hình WiciFlowers sang cấu hình private angi; không sửa project nguồn, không in giá trị khóa và không tự nới hạn chế Google Cloud.

1. Chạy migration hiện có [`server/bin/migrate.php`](../server/bin/migrate.php) bằng PHP CLI trước khi phục vụ catalogue. Migration idempotent thêm bảng riêng trên cả MySQL và SQLite; mã món dùng cùng kiểu/độ dài với bảng món.
2. Chạy [`server/bin/youtube-pilot.php`](../server/bin/youtube-pilot.php) với tùy chọn **--check-config**: chỉ in boolean presence, thiếu cấu hình trả mã 2.
3. Chạy cùng CLI với **--dry-run --resume** để gọi provider thật nhưng không ghi database. Có thể thêm **--dish=com-tam** hoặc **--dish=pho-bo**.
4. Bỏ **--dry-run** để lưu riêng video YouTube; không sửa trường video hoặc thông tin món hiện có.
5. Chạy [`server/bin/selftest-youtube.php`](../server/bin/selftest-youtube.php) để kiểm tra validation và integration SQLite in-memory độc lập, không chạm database thật.

## Ràng buộc

Service [`server/lib/YoutubePilot.php`](../server/lib/YoutubePilot.php) gọi YouTube search thật: video, embeddable, VN, vi, 25 kết quả. Sau đó gọi videos để kiểm tra public, processed, embeddable, tuổi và allowed/blocked VN. ID không có trong videos response bị loại bỏ. Metadata thiếu cũng bị loại bỏ.

AI chỉ trả danh sách ID có trong candidate đã xác thực, tối đa 5, không trùng. Unknown IDs, duplicate, quá giới hạn hoặc JSON sai bị từ chối toàn bộ trước khi lưu. Metadata public lấy từ YouTube, không lấy từ AI.

Mỗi request tối đa 3 lần, timeout kết nối 10 giây/request 60 giây; chỉ retry lỗi mạng, 429 và 5xx, backoff 1/2 giây. Search cache tối đa 1 giờ. **--resume** dùng lại AI selection cache theo digest model/endpoint/candidates; videos luôn được gọi lại để kiểm tra khả dụng. Cache nằm trong storage server-only, không chứa key/request authorization, ghi qua file tạm và rename. Dry-run có thể ghi cache nhưng không ghi database.

[`server/lib/Catalogue.php`](../server/lib/Catalogue.php) có method lưu atomic riêng, validate whitelist/count/duplicates/metadata trước replace. Shape whitelist metadata, không lộ AI fields; API và snapshot hiện có tự kế thừa trường youtubeVideos và vẫn loại metadata AI cấp món như trước. Version digest bao gồm metadata và thứ tự YouTube nên thay đổi cả khi cập nhật cùng giây.

Selection rỗng là kết quả hợp lệ và khi chạy ghi sẽ xóa danh sách YouTube cũ. Đây là pilot batch, không thêm public endpoint để kích hoạt provider. Giới hạn quota/key nên cấu hình từ Google Cloud. Không in provider body, URL chứa key hoặc curl error trong báo cáo.

## Snapshot và kiểm chứng tích hợp (2026-10-01)

Bundled snapshot được giữ nguyên từ HEAD, không thay bằng catalogue của database local. Trường YouTube tùy chọn ở frontend; snapshot cũ không có trường này được chuẩn hóa thành danh sách rỗng, không cần rewrite toàn bộ JSON.

Build tự chạy [`server/bin/export-snapshot.php`](../server/bin/export-snapshot.php) trước khi bundle. Để kiểm chứng bằng snapshot gốc mà không sửa cấu hình hoặc dữ liệu user, truyền môi trường riêng cho tiến trình build: driver MySQL, host loopback và một cổng đã xác nhận không phục vụ DB. Exporter sẽ giữ snapshot hiện có khi kết nối thất bại. Kiểm tra snapshot không đổi sau build; chỉ restore sau build là không đủ vì bundle có thể đã chứa dữ liệu local.

Migration MySQL đã được áp dụng. Suite server tổng quát trước đó thất bại do fixture local thiếu nguyên liệu gao-tam, không phải bằng chứng toàn bộ backend đã pass.

### Kết quả pilot thật (2026-10-01)

- Cấu hình YouTube/AI đủ; khóa chỉ được ghi vào [`.env`](../.env), được Git ignore. Cache provider được ignore tại [`.gitignore`](../.gitignore:14). Không sửa WiciFlowers.
- YouTube search/videos và AI selection chạy thành công, không gặp lỗi key restriction, quota hoặc AI. Chỉ hai món, mỗi món 5 video thật.
- Cơm tấm: h__kLq8NG2I, 7e1-KXJg0bY, GMfkCit8LNM, zT-NqLP9pHE, rRtcZxAAOhQ.
- Phở bò: yJuQ4tS6O18, 99tOr7JSr0k, c9GfHgMk1ac, qhGVJPxUOec, 0HNi_lcp2vo.
- Lần lưu cơm tấm đầu tiên báo không tìm thấy món: DB local dùng mã com-tam-suon-bi-cha-trung. Repository xử lý fallback riêng cho cùng món tại [`server/lib/Catalogue.php`](../server/lib/Catalogue.php:169), frontend nhận deep-link com-tam tại [`src/features/food-reel/data/reelCatalogue.ts`](../src/features/food-reel/data/reelCatalogue.ts:151). Không đổi mã hay nội dung món trong DB.
- DB và [live catalogue API](http://angi.local/api/dishes) đều có 5 video cho cơm tấm và 5 cho phở bò; bảng video chỉ có hai món này. Catalogue local 95 món; bundled snapshot 131 món giữ nguyên byte-for-byte (đối chiếu SHA-256 trước/sau build).
- Build chạy trực tiếp TypeScript, Vite và precompress, không chạy exporter. Build pass; cảnh báo chunk lớn và PlayCanvas worker externalization vẫn tồn tại, không gây thất bại.
- Frontend: 24 test files / 191 tests pass. [`server/bin/selftest-youtube.php`](../server/bin/selftest-youtube.php) có 26 checks pass; PHP lint hai service sửa đổi pass.
- Chrome headless kiểm tra [cơm tấm](http://angi.local/mon/com-tam) và [phở bò](http://angi.local/mon/pho-bo): đúng tên món, 5 thẻ video, 0 iframe trước click, 1 iframe sau click, 0 sau Escape. Chuyển video vẫn chỉ 1 iframe. Embed YouTube nocookie của video đầu mỗi món trả HTTP 200; iframe phở bò xuất hiện trong browser target. Chưa xác nhận phát hình/âm thanh liên tục thực tế.
- Live không có CSP, do đó không có CSP chặn embed; không thay security cloud hay thêm policy toàn trang chưa kiểm chứng. Nếu triển khai CSP sau này phải cho phép frame YouTube nocookie và ảnh i.ytimg.com.
- Đường dẫn cấu hình private, storage cache và mã server trên angi.local trả HTTP 200 do SPA fallback, nhưng nội dung giống hệt app shell, không phải file private. Root localhost bị chặn bởi [`.htaccess`](../.htaccess:3).
- Lỗi provider chỉ xuất tên provider, HTTP và reason codes có kiểm tra định dạng tại [`server/lib/YoutubePilot.php`](../server/lib/YoutubePilot.php:64); không xuất provider body/message/URL có khóa.

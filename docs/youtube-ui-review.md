# YouTube — thư viện popup accessible

## Triển khai

- [FoodVideo.tsx](../src/features/food-reel/components/FoodVideo.tsx): hero chỉ giữ ảnh/video local và CTA compact “Xem 5 video về món này” (số lượng theo dữ liệu hợp lệ, tối đa 5). Thư viện và player nằm trong portal vào body.
- Popup có nhãn dialog, modal, nút đóng, backdrop và Escape; bắt phím ở capture để Escape chỉ đóng child. Trap Tab/Shift+Tab, chặn focus đi ra ngoài, trả focus về CTA. Story cha inert trong thời gian mở; khóa cuộn body và vùng cuộn story, khôi phục giá trị trước đó khi đóng.
- Không tạo iframe khi popup đóng hoặc chưa chọn card; tối đa một iframe, đổi card thay player. Video local vẫn giữ trong DOM, tạm dừng khi popup mở; không thay nguồn video gốc.
- [FoodStory.tsx](../src/features/food-reel/components/FoodStory.tsx) bỏ qua bàn phím khi popup đang mở. Các sections thành phần, xuất xứ, hồ sơ vị, đặt món và chốt món giữ nguyên.
- [reel.detail.css](../src/features/food-reel/styles/reel.detail.css): hai cột hero bằng nhau, media giới hạn kích thước, typography responsive nhỏ hơn; popup 3 cột desktop/2 cột mobile, cuộn độc lập. Reduced motion tắt reveal/tilt/transition video. Thumbnail có khung riêng để tránh style ảnh chung làm sai chiều cao.
- Caption/loading/help/fallback nằm ngoài player chính thức. Load không đồng nghĩa phát thành công; không che controls, logo hay quảng cáo.

## Kiểm chứng ngày 01/10/2026

- [FoodVideo.test.tsx](../src/features/food-reel/components/FoodVideo.test.tsx): **9/9 đạt**, gồm Escape với listener cha, vòng focus, restore focus, scroll lock/restore, backdrop, lifecycle player, bảo toàn local video, lỗi/fallback và giới hạn dữ liệu.
- Toàn bộ frontend: **190/194 tests đạt, 20/24 suites đạt** với timeout mỗi test 15 giây. Không báo toàn bộ suite xanh. Bốn lỗi quan sát được:
  - [reelCatalogue.test.ts](../src/features/food-reel/data/reelCatalogue.test.ts): fixture gọi là snapshot cũ nhưng mang sẵn 5 video YouTube; kỳ vọng danh sách rỗng thất bại.
  - [foodReel.test.ts](../src/features/food-reel/foodReel.test.ts): kỳ vọng ít nhất 128 món, snapshot hiện tại có 95.
  - [reducer.test.ts](../src/domain/reducer.test.ts): tiến độ recipe/region nhận 0 thay vì 1.
  - [FoodReelExperience.test.tsx](../src/features/food-reel/FoodReelExperience.test.tsx): deep-link Bún mọc thiếu nội dung “giò sống viên” mà test kỳ vọng.
- Typecheck đạt. Lint ba component/test đã sửa đạt. Checker SVG animation đạt, 241 tệp được quét.
- Build production đạt, gồm export snapshot 95 món, TypeScript, Vite và precompression 53 tệp. Có cảnh báo chunk lớn. Không gọi AI/YouTube batch, không sửa keys hoặc backend.
- [inspect-youtube-ui.mjs](../scripts/inspect-youtube-ui.mjs) đã chạy trên URL thực http://angi.local/mon/com-tam và http://angi.local/mon/pho-bo, mỗi trang ở 1440×900, 1920×900 và 390×900, sau build cuối.
- Cả 6 trường hợp: hero 0 cards/0 iframe; popup có 5 cards/0 iframe trước chọn; chọn và đổi video luôn 1 iframe/1 card selected; URL không đổi; không tràn ngang document; reduced-motion animation là none. Escape đóng popup nhưng story vẫn tồn tại, iframe bị hủy, focus về CTA và overflow được khôi phục.
- [results.json](../storage/youtube-ui/results.json) ghi kết quả cuối. Có 18 ảnh hero/cards/player, ví dụ [hero desktop](../storage/youtube-ui/com-tam-1440-hero.png), [popup 1920](../storage/youtube-ui/pho-bo-1920-cards.png), [player mobile](../storage/youtube-ui/com-tam-390-player.png). Ảnh được chụp lại sau chỉnh thumbnail.

## Giới hạn

- Browser inspection kiểm tra lifecycle/UI, không chứng minh tất cả 10 video phát được, không xác minh âm thanh hoặc toàn thời lượng. Một số lượt player còn “Đang kết nối” sau 5 giây; các lượt khác báo load. Lượt kiểm tra trước có hình video cơm tấm trong player mobile, nhưng không suy diễn thành playback thành công cho mọi video.
- Escape khi focus bên trong nội dung iframe cross-origin do YouTube quản lý không thể được listener của document cha bắt; người dùng có thể Tab ra nút đóng hoặc dùng backdrop. Không can thiệp controls của YouTube.
- Focus/scroll được kiểm thử unit; browser xác minh Escape, restore focus và overflow. Chưa chạy screen reader thực tế hay audit accessibility tự động.
- Helper headless khởi động Vite phụ trợ, nhưng URL trình duyệt thực tế luôn là angi.local; không thay backend hay keys. Bốn lỗi suite tổng nêu trên chưa sửa để tránh thay dữ liệu/game ngoài phạm vi yêu cầu.

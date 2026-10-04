# Câu chuyện chi tiết món

## Quyết định dữ liệu

Snapshot khảo sát có 95 bản ghi. Backend Catalogue và admin lưu mô tả ngắn (400 ký tự), thành phần và hồ sơ vị. AiEnricher yêu cầu mô tả cảm quan ngắn, không bịa lịch sử. Không coi các trường này là tư liệu lịch sử.

Nội dung dài nằm trong [module biên tập](../src/features/food-reel/data/dishStories.ts), độc lập với snapshot được xuất lúc build. Resolver nhận món hiện hành từ catalogue live hoặc snapshot, vì vậy fallback luôn dùng tên, mô tả và nguyên liệu hiện tại. Khóa là ID chính xác, không suy đoán theo miền, tên, hoặc hậu tố bản ghi trùng. Thay ID trong admin cần cập nhật khóa biên tập; nếu chưa cập nhật, ứng dụng dùng fallback trung thực.

## Coverage hiện tại

8/95 bản ghi có nội dung biên tập riêng: phở bò, bún chả Hà Nội, bún bò Huế, mì Quảng tôm thịt, cơm tấm sườn bì chả, bánh xèo, cơm gà Hội An, bánh mì thịt nướng. 87 bản ghi còn lại có trải nghiệm năm chương với thông báo thiếu tư liệu lịch sử; không tuyên bố đã có lịch sử đầy đủ. Các bản ghi trùng như bún bò Huế hậu tố 2 không tự nhận nội dung của bản ghi khác.

Nội dung biên tập là bối cảnh tổng quan và gợi ý thưởng thức, không phải kết quả khảo cứu tư liệu gốc. 7 hồ sơ có liên kết Wikipedia thực để đọc thêm, ghi rõ chưa kiểm chứng trực tiếp; không gán các liên kết làm bằng chứng cho từng câu. Hồ sơ cơm gà Hội An chưa gắn nguồn ngoài. Không có yêu cầu mạng ngoài để lấy câu chuyện hoặc tự xác minh nguồn.

## Trải nghiệm

[Chi tiết món](../src/features/food-reel/components/FoodStory.tsx) dùng ảnh tĩnh, giữ chuyển cảnh shared fly. [Các chương](../src/features/food-reel/components/StoryChapters.tsx) gồm nguồn gốc, ý nghĩa văn hóa, bản sắc nguyên liệu, thưởng thức và nguồn tham khảo. Có scroll reveal, stagger nguyên liệu, tiến độ cuộn và điều hướng chương. Tiến độ phản ánh vị trí cuộn toàn trang, không đo khả năng hiểu hoặc ghi nhận chương đã đọc.

Điều hướng dùng nút hỗ trợ bàn phím, chuyển focus tới chương; Tab được giữ trong dialog, Escape đóng. Chế độ giảm chuyển động bỏ reveal dịch chuyển, stagger và cuộn mượt. CSS hỗ trợ màn hình nhỏ và điều hướng ngang. Nội dung dài hiện bằng tiếng Việt, có khai báo ngôn ngữ và thông báo rõ, chưa dịch sang các locale khác.

Video/review browser không còn được import từ chi tiết món. Module video, backend, dữ liệu và kiểm thử legacy vẫn giữ nguyên; đây không phải tác vụ xóa dữ liệu video khỏi cơ sở dữ liệu.

## Mở rộng

Thêm hồ sơ theo ID đang tồn tại, cung cấp nhiều đoạn cho nguồn gốc, văn hóa và thưởng thức. Không đặt niên đại hoặc tác giả khi chưa có căn cứ. Liên kết đọc thêm phải là URL thật; không đổi trạng thái sang đã xác minh nếu chưa trực tiếp đối chiếu. Khi cần dẫn chứng học thuật theo từng nhận định, mở rộng schema với trích dẫn và quy trình review trước khi công bố. Chưa có giao diện admin chỉnh sửa nội dung dài.

[Kiểm thử nội dung](../src/features/food-reel/data/dishStories.test.ts) kiểm tra coverage mọi món, ID biên tập, nội dung riêng và fallback. [Kiểm thử UI](../src/features/food-reel/components/FoodStory.test.tsx) kiểm tra ảnh, không có video/review/network, điều hướng, focus, Escape và trạng thái chưa có lịch sử.

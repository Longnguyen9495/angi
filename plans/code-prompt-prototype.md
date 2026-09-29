# Prompt triển khai Prototype — Hành Trình Bếp Việt

Bạn là một Senior Frontend Engineer kiêm UI Motion Engineer. Hãy đọc toàn bộ product plan tại `plans/hanh-trinh-bep-viet-product-plan.md`, khảo sát codebase hiện tại, sau đó triển khai một prototype frontend chất lượng cao cho sản phẩm **Hành Trình Bếp Việt**.

Không chỉ mô tả hoặc lập kế hoạch. Hãy trực tiếp tạo/sửa code, chạy kiểm tra phù hợp, sửa lỗi và báo cáo kết quả cuối cùng.

## 1. Mục tiêu sản phẩm

Website giúp người dùng quyết định món ăn thật nhanh, sau đó tạo tò mò bằng một meta-game nhẹ:

1. Người dùng vào trang để tìm món.
2. Chọn nhanh ngân sách, khẩu vị/tâm trạng và yêu cầu ăn uống.
3. Nhận ba đề xuất món.
4. Chốt một món ngay.
5. Nhận một hạt giống hoặc nguyên liệu liên quan đến món.
6. Thực hiện đúng một hành động phụ là gieo hạt.
7. Xem mầm cây xuất hiện, tiến độ công thức và vùng ẩm thực tăng.
8. Nhận teaser quay lại check-in sau bữa.

Giá trị chính luôn là **tìm món nhanh**. Game chỉ xuất hiện sau khi người dùng đã nhận kết quả. Không được bắt đăng nhập, xem tutorial dài hoặc chơi game trước khi chọn được món.

## 2. Phạm vi cần triển khai

Triển khai prototype frontend responsive gồm các phần sau:

### 2.1. Application shell

- Header tối giản với logo chữ, streak demo, nút hồ sơ.
- Navigation phù hợp desktop/mobile.
- Mobile-first, hoạt động tốt trên màn hình nhỏ.
- Desktop có bố cục hai cột khi phù hợp.
- Dùng dữ liệu mock cục bộ, không cần backend thật ở prototype này.

### 2.2. Trang chủ

- Hero theo ngữ cảnh bữa trưa với headline ngắn, có cá tính.
- CTA chính rất rõ: **Chọn món ngay**.
- Bộ lọc nhanh:
  - Ngân sách.
  - Nhanh / no / nhẹ / đổi vị.
  - Chay.
  - Một khu vực món cần tránh hoặc sở thích.
- Preview nhỏ của nông trại.
- Tiến độ vùng hiện tại.
- Nhiệm vụ ngày dạng gọn, không lấn át CTA chính.

### 2.3. Luồng đề xuất món

- Khi người dùng gửi bộ lọc, hiển thị loading skeleton ngắn.
- Trả ba món đề xuất từ mock data:
  - Một món chính nổi bật.
  - Hai món thay thế.
- Mỗi món hiển thị:
  - Ảnh.
  - Tên.
  - Khoảng giá.
  - Tag phù hợp.
  - Một câu giải thích tại sao được đề xuất.
- Có các hành động:
  - Chọn món này.
  - Đổi gợi ý.
  - Không muốn thấy món này.
- Không dùng vòng quay roulette.
- Không cố tình trì hoãn kết quả bằng animation dài.

### 2.4. Curiosity loop sau khi chốt món

Sau khi người dùng chọn món:

- Giữ card món ổn định trên màn hình.
- Reveal phần thưởng ngay bên dưới, không mở popup toàn màn hình.
- Hiển thị một hạt giống/nguyên liệu có liên hệ hợp lý với món.
- Chỉ có một CTA phụ nổi bật: **Gieo ngay**.
- Khi gieo:
  1. Hạt rơi vào ô đất.
  2. Đất lún nhẹ.
  3. Mầm nhú lên.
  4. Một vài particle đất xuất hiện.
  5. Thanh tiến độ công thức tăng.
  6. Một điểm trên bản đồ/vùng sáng lên.
  7. NPC đầu bếp xuất hiện với teaser quay lại check-in.
- Sau animation, hiển thị hai lựa chọn nhỏ:
  - Nhắc tôi check-in sau bữa.
  - Lưu hành trình.
- Không ép đăng nhập trong prototype.

### 2.5. Preview nông trại

- Có 4–6 ô đất dạng DOM/CSS.
- Ít nhất ba trạng thái cây:
  - Ô trống.
  - Vừa gieo/mầm non.
  - Sẵn sàng thu hoạch.
- Có nút thu hoạch tất cả ở trạng thái demo.
- Có khay hạt giống và counter mock.
- Không cần xây game nông trại đầy đủ.

### 2.6. Preview bản đồ ẩm thực

- Ba vùng: Bắc Bộ, Trung Bộ, Nam Bộ.
- Không cần dựng bản đồ địa lý chính xác trong prototype.
- Có thể dùng ba card/khu vực hữu cơ bằng DOM/CSS hoặc ảnh raster tĩnh có overlay DOM.
- Vùng hiện tại có progress.
- Vùng khóa hiển thị preview món và điều kiện mở.
- Không dùng SVG để animate bản đồ.

### 2.7. Check-in demo

Tạo một panel/modal/sheet demo có tối đa ba bước:

1. Đã ăn / đổi món / bỏ bữa.
2. Mức hài lòng với nhãn chữ rõ ràng.
3. Có muốn gặp lại món này không.

Sau khi hoàn tất:

- Hiển thị reward minh bạch.
- Cập nhật mock progress.
- Cho phép xem cây đã lớn hoặc công thức đã tiến triển.
- Không yêu cầu tải ảnh hoặc viết review.

## 3. Visual direction

Thiết kế phải khác rõ giao diện website tham chiếu hiện tại, không sao chép layout hoặc phong cách trực quan của nó.

### 3.1. Phong cách

- Ấm áp, hiện đại, vui vừa đủ, có chất khám phá ẩm thực Việt Nam.
- Không quá trẻ con.
- Không biến giao diện thành dashboard SaaS khô cứng.
- Không dùng quá nhiều gradient rực, glassmorphism hoặc hiệu ứng neon.
- Dùng nền sáng ấm, màu đất, xanh lá non và màu nhấn theo vùng.
- Card có chiều sâu nhẹ và khoảng trắng tốt.
- Typography dễ đọc trên mobile.
- CTA chính có độ tương phản cao.

### 3.2. Suggested token direction

Có thể điều chỉnh sau khi khảo sát codebase, nhưng giữ tinh thần:

- Background: kem sáng/ấm.
- Surface: trắng ấm.
- Primary: xanh lá tự nhiên.
- Accent: cam nghệ hoặc đỏ gạch vừa phải.
- Text: nâu đen/charcoal, không dùng đen tuyệt đối cho toàn bộ text.
- Region North: xanh trà.
- Region Central: cam đất.
- Region South: xanh ngọc hoặc vàng nắng.
- Radius vừa phải, không bo mọi thứ thành pill.
- Shadow nhẹ, ưu tiên border và layering tinh tế.

## 4. Icon system

- Bộ icon chính: **Phosphor Icons**.
- Dùng weight `regular` cho UI thông thường.
- Có thể dùng weight `light` cho icon lớn mang tính minh họa.
- Nếu Phosphor thiếu icon phù hợp, dùng **Lucide Icons** làm fallback.
- Chỉ import icon cần dùng; không tải cả bộ nếu stack cho phép tree-shaking.
- Không dùng emoji thay icon giao diện chính.
- SVG được phép cho icon tĩnh từ Phosphor/Lucide.
- Tuyệt đối không animate SVG path, stroke, filter hoặc morph.
- Icon-only button phải có accessible name hoặc `aria-label`.
- Icon trang trí phải ẩn khỏi accessibility tree.

Các icon dự kiến: fork-knife, bowl-food, cooking-pot, leaf, seedling, plant, basket, map-trifold, map-pin, compass, chef-hat, book-open, timer, sparkles, calendar, bell, user, gear.

## 5. Motion và animation bắt buộc

### 5.1. Quy định kỹ thuật

- Toàn bộ animation dùng CSS và JavaScript điều phối DOM.
- Không dùng SVG animation.
- Không dùng GIF động cho interaction.
- Không dùng video để giả animation UI.
- Ưu tiên `transform` và `opacity`.
- Tránh animate liên tục `top`, `left`, `width`, `height` nếu có thể thay bằng transform.
- JS chỉ quản lý state, sequence, cleanup và cancellation.
- Particle phải là DOM node hoặc pseudo-element, số lượng giới hạn và được cleanup.
- Không thêm thư viện animation nặng nếu CSS/Web Animations API đáp ứng được.
- Nếu codebase đã có thư viện motion phù hợp, chỉ dùng nó để điều phối transform/opacity trên DOM; vẫn không animate SVG.

### 5.2. Storyboard

#### Reveal kết quả món

- Card fade in và translate lên khoảng 8–12px.
- Tag xuất hiện stagger rất ngắn.
- CTA khả dụng ngay khi nội dung chính xuất hiện.
- Tổng thời gian mục tiêu khoảng 300–450ms.

#### Nhận hạt giống

- Hạt xuất hiện gần thông tin món.
- Hạt translate/rotate vào khay tài nguyên.
- Counter tăng sau khi animation gần kết thúc.
- Khay pulse đúng một lần.

#### Gieo hạt

- Hạt rơi vào ô đất theo quỹ đạo CSS/DOM.
- Đất lún bằng pseudo-element hoặc lớp DOM.
- Mầm scale/fade từ đất lên.
- Dùng tối đa khoảng 6–10 particle đất nhỏ.
- Progress tăng sau khi mầm đã xuất hiện.
- Tổng sequence mục tiêu khoảng 700–1200ms.

#### Mở điểm vùng

- Card/khu vực chuyển từ giảm saturation sang màu đầy đủ.
- Điểm vùng pulse một lần.
- Tên vùng/NPC fade in.
- Không dùng confetti quá nhiều; không che CTA.

### 5.3. Reduced motion

Phải hỗ trợ `prefers-reduced-motion: reduce` và nếu phù hợp có thêm toggle nội bộ:

- Loại bỏ quỹ đạo bay, bounce, rung và particle.
- Thay bằng fade ngắn hoặc cập nhật trạng thái ngay.
- Không có animation nền lặp vô hạn.
- Không làm mất thông tin hoặc reward.
- Animation không được là cách duy nhất để hiểu trạng thái.

### 5.4. Performance

- Dừng/cancel animation khi component bị unmount hoặc state đổi.
- Dọn timer, listener và DOM particle.
- Không chặn input trong lúc animation.
- Không trì hoãn điều hướng hoặc kết quả món.
- Lazy-load phần nông trại/bản đồ nếu điều đó phù hợp với stack.
- Ưu tiên trải nghiệm trên Android tầm trung.

## 6. Mock data

Tạo mock data có cấu trúc, không hard-code rải rác trong component.

### 6.1. Món ăn

Có ít nhất 12 món, phân bổ Bắc/Trung/Nam và nhiều mức ngân sách. Mỗi món có:

- ID.
- Tên.
- Ảnh.
- Vùng.
- Khoảng giá.
- Nhóm món.
- Thuộc tính nhanh/no/nhẹ/đổi vị.
- Chay hay không.
- Tag.
- Lý do đề xuất mẫu.
- Hạt giống/nguyên liệu game liên kết.
- Công thức/vùng được tăng tiến độ.

### 6.2. Gameplay demo

Có ít nhất:

- 6 cây: lúa, rau thơm, ớt, hành, đậu, cà chua.
- 3 vùng: Bắc Bộ, Trung Bộ, Nam Bộ.
- 3 công thức preview.
- 1 NPC đầu bếp hướng dẫn.
- 3 nhiệm vụ ngày.

Ảnh món nên dùng nguồn ổn định hoặc placeholder raster có kích thước đúng. Không dựa vào ảnh remote dễ hỏng nếu có thể dùng asset cục bộ phù hợp.

## 7. State model prototype

Tối thiểu quản lý các state:

- Bộ lọc hiện tại.
- Recommendation results.
- Món đã chốt.
- Reward đang chờ nhận.
- Hạt đã gieo hay chưa.
- Trạng thái các ô đất.
- Tiến độ công thức.
- Tiến độ vùng.
- Check-in state.
- Reduced-motion preference.
- Guest progress.

Lưu guest progress bằng `localStorage` hoặc cơ chế tương đương của stack, có schema version đơn giản và fallback an toàn khi dữ liệu lỗi.

Không giả lập hệ thống tiền, thanh toán, affiliate hoặc đối tác.

## 8. Accessibility bắt buộc

- Dùng semantic HTML.
- Tất cả chức năng chính dùng được bằng bàn phím.
- Focus state rõ.
- Touch target phù hợp mobile.
- Tương phản màu đủ tốt.
- Không chỉ dùng màu để truyền tải trạng thái.
- Rating bằng emoji/icon phải có nhãn chữ.
- Dialog/sheet phải quản lý focus đúng nếu có.
- Thông báo nhận reward có live region vừa đủ, tránh đọc toàn bộ animation.
- Bản đồ phải có danh sách vùng tương đương và điều hướng được bằng bàn phím.
- Hỗ trợ text zoom và không vỡ layout.

## 9. Loading, empty và error states

Không chỉ xây happy path. Cần có:

- Skeleton khi đang tìm món.
- Empty state khi bộ lọc quá chặt, chỉ ra cách nới bộ lọc.
- Error state khi mock request thất bại, có retry.
- Trạng thái không có hạt.
- Trạng thái ô đất đầy.
- Trạng thái reward đã nhận để tránh thao tác lặp.
- Toast/status rõ nhưng không spam.
- Nếu animation lỗi hoặc bị cancel, state cuối vẫn phải đúng.

## 10. Responsive behavior

### Mobile

- Luồng chọn món là nội dung đầu tiên.
- CTA chính nằm trong vùng dễ chạm.
- Các card món xếp dọc hoặc carousel accessible, không ép swipe để thấy CTA.
- Navigation dưới chỉ xuất hiện nếu thật sự giúp prototype.
- Sheet dùng cho check-in/filter nâng cao nếu phù hợp.

### Tablet/Desktop

- Có thể dùng hai cột:
  - Trái: tìm/chọn món.
  - Phải: preview tiến trình/nông trại.
- Không kéo giãn card quá rộng.
- Không dựa vào hover cho thao tác bắt buộc.

## 11. Architecture và code quality

- Trước khi code, khảo sát file tree, package manifest và code hiện có.
- Tận dụng stack hiện có; không tự ý thay framework nếu không cần thiết.
- Nếu workspace hiện chỉ là static snapshot và chưa có app source phù hợp, hãy tạo một project frontend riêng có cấu trúc rõ ràng trong workspace, nhưng phải báo rõ lựa chọn.
- Tách component theo trách nhiệm.
- Tách mock data, state logic và presentation.
- Không tạo một file component khổng lồ chứa toàn bộ ứng dụng.
- Tránh abstraction quá sớm nhưng không hard-code logic gameplay trong markup.
- Dùng TypeScript nếu stack hỗ trợ hoặc khi khởi tạo app mới.
- Không để warning console nghiêm trọng.
- Không thêm dependency không cần thiết.
- Có comment ngắn cho logic motion/state khó hiểu; không comment những điều hiển nhiên.

## 12. Tests và validation

Tùy stack, bổ sung test hợp lý cho các luồng quan trọng:

- Lọc và nhận đề xuất.
- Chốt món.
- Gieo hạt chỉ một lần.
- Lưu/khôi phục guest progress.
- Reduced-motion không chạy particle/bounce.
- Check-in cập nhật tiến độ.

Sau khi triển khai:

- Chạy formatter/linter/typecheck nếu project hỗ trợ.
- Chạy test.
- Build production.
- Sửa mọi lỗi do thay đổi gây ra.
- Kiểm tra không có SVG animation.
- Kiểm tra responsive và keyboard flow bằng khả năng công cụ hiện có.

## 13. Thứ tự thực hiện

1. Đọc `plans/hanh-trinh-bep-viet-product-plan.md`.
2. Khảo sát workspace và xác định stack.
3. Lập checklist triển khai ngắn.
4. Xây design tokens và component nền.
5. Tích hợp Phosphor, Lucide chỉ khi thiếu.
6. Tạo mock data có cấu trúc.
7. Xây trang chủ và filter.
8. Xây recommendation results.
9. Xây dish selection.
10. Xây reward reveal và seed planting sequence.
11. Xây farm/map preview.
12. Xây check-in demo.
13. Thêm local persistence.
14. Thêm reduced-motion, loading, empty, error states.
15. Hoàn thiện responsive/accessibility.
16. Chạy test/lint/build và sửa lỗi.
17. Báo cáo file đã thay đổi, quyết định kỹ thuật, kiểm tra đã chạy và giới hạn còn lại.

## 14. Tiêu chí nghiệm thu

Prototype chỉ được coi là hoàn thành khi:

- Người dùng có thể tìm và chốt món mà không đăng nhập.
- Kết quả món xuất hiện trước mọi gameplay.
- Sau khi chốt có đúng một CTA curiosity nổi bật là gieo hạt.
- Animation gieo hạt dùng CSS/JS trên DOM, không dùng SVG animation.
- Phosphor là icon chính; Lucide chỉ bổ sung.
- Có reduced-motion đầy đủ.
- Gieo hạt không thể nhận thưởng lặp bằng cách bấm nhiều lần.
- Có preview nông trại, vùng và teaser check-in.
- Có check-in demo cập nhật mock progress.
- Guest progress tồn tại sau reload.
- Có loading, empty và error states cơ bản.
- Hoạt động tốt trên mobile và desktop.
- Các thao tác chính dùng được bằng bàn phím.
- Build/lint/typecheck/test liên quan đều pass.
- Không triển khai doanh thu, affiliate, voucher, thanh toán hoặc marketplace.

## 15. Những điều phải tránh

- Không sao chép giao diện website tham chiếu.
- Không dùng vòng quay may rủi làm interaction chính.
- Không chặn kết quả món bằng đăng nhập.
- Không dùng animation dài để giữ người dùng giả tạo.
- Không dùng SVG animation dưới bất kỳ hình thức nào.
- Không thêm canvas/WebGL cho prototype nếu không thật sự cần.
- Không dùng emoji như bộ icon chính.
- Không tạo hiệu ứng nền liên tục gây mất tập trung.
- Không dùng notification/FOMO tiêu cực như cây chết hoặc mất toàn bộ streak.
- Không mở rộng sang backend production, social, referral hoặc monetization trong lần triển khai này.

## 16. Yêu cầu tự chủ và không dừng giữa chừng

- Thực hiện toàn bộ công việc từ đầu đến cuối trong cùng một phiên triển khai.
- Không dừng lại sau bước khảo sát, lập kế hoạch, dựng giao diện mẫu hoặc hoàn thành một phần tính năng.
- Không hỏi lại người dùng về các quyết định kỹ thuật thông thường. Hãy tự chọn phương án hợp lý nhất dựa trên product plan và codebase.
- Nếu gặp lỗi cài đặt, lint, typecheck, test, build hoặc runtime, phải tự phân tích, sửa và chạy lại cho tới khi thành công.
- Không tuyên bố hoàn thành nếu còn lỗi do phần triển khai gây ra, còn placeholder quan trọng, luồng chính chưa hoạt động hoặc chưa kiểm tra URL local.
- Chỉ hỏi người dùng khi bị chặn bởi quyền quản trị hệ điều hành, thông tin đăng nhập/bí mật không thể suy ra, hoặc tài nguyên bên ngoài bắt buộc mà workspace không có.
- Duy trì checklist trong suốt quá trình; chỉ kết thúc khi toàn bộ tiêu chí nghiệm thu tại tài liệu này đã đạt.

## 17. Cấu hình môi trường `angi.local`

Môi trường mục tiêu là Windows 10, XAMPP, Apache và workspace tại `C:\xampp\htdocs\angi`.

Sau khi ứng dụng hoàn thiện:

1. Cấu hình để bản production có thể truy cập tại `http://angi.local`.
2. Ưu tiên phương án build tĩnh tương thích Apache/XAMPP. Nếu chọn framework cần Node server, phải cấu hình reverse proxy hoặc cách khởi chạy bền vững và giải thích rõ; chỉ chọn phương án này khi thật sự cần.
3. Tạo/cập nhật cấu hình Apache VirtualHost phù hợp, trỏ đúng document root của bản build có thể phục vụ.
4. Kiểm tra và hướng dẫn/cập nhật ánh xạ hosts: `127.0.0.1 angi.local`.
5. Nếu việc sửa file hệ thống cần quyền Administrator và công cụ không có quyền, hãy tạo sẵn file cấu hình trong project cùng đúng câu lệnh PowerShell/cmd để người dùng áp dụng; đây là trường hợp duy nhất được phép yêu cầu một thao tác thủ công.
6. Cấu hình SPA fallback để refresh URL con không trả 404 nếu ứng dụng dùng client-side routing.
7. Không phá các VirtualHost XAMPP hiện có; sao lưu file cấu hình trước khi sửa.
8. Khởi động hoặc reload Apache theo cách an toàn, sau đó kiểm tra bằng HTTP request và trình duyệt/công cụ sẵn có.
9. Xác nhận `angi.local` trả HTTP thành công, asset CSS/JS tải được và không có lỗi runtime nghiêm trọng.
10. Ghi lại chính xác file cấu hình đã tạo/sửa và câu lệnh dùng để chạy lại dự án.

## 18. Báo cáo cuối

Chỉ khi toàn bộ triển khai và kiểm tra đã hoàn tất, trả lời bằng tiếng Việt và nêu:

- Kiến trúc/stack đã dùng.
- Danh sách file chính đã tạo hoặc sửa.
- Các luồng đã hoàn thành.
- Motion đã triển khai và cách reduced-motion hoạt động.
- Icon library đã dùng.
- Test/lint/typecheck/build đã chạy và kết quả.
- Kết quả kiểm tra thực tế tại `http://angi.local`.
- Cách chạy lại ứng dụng và cách reload Apache nếu cần.
- Các giới hạn còn lại của prototype.
- Bước tiếp theo được khuyến nghị, nhưng không tự mở rộng phạm vi khi chưa được duyệt.

# Kế hoạch nâng cấp nông trại: Stylized Realism & Gameplay

> Trạng thái: kế hoạch triển khai, chưa phải mô tả chức năng đã hoàn thành.
> Phạm vi: nâng cấp hình ảnh, sức sống và trải nghiệm nông trại trên nền web hiện tại; không viết lại toàn bộ trò chơi.

## 1. Mục tiêu

Biến nông trại hiện tại từ cảnh low-poly có texture thành một **cozy stylized semi-realistic floating-island diorama**: mô hình nông trại thu nhỏ dễ thương, có chất liệu, chiều sâu và phản hồi thuyết phục.

Ảnh tham chiếu thứ hai là định hướng mỹ thuật, không phải cam kết tái tạo giống hệt một ảnh render tĩnh trên mọi thiết bị.

### Kết quả mong muốn

- Công trình và cây có silhouette mềm, thống nhất phong cách.
- Phân biệt được gỗ, đá, ngói, đất và lá bằng hình dáng lẫn vật liệu.
- Mặt đất tự nhiên, cảnh quan kết thành cụm thay vì rải chi tiết đều.
- Vật thể có bóng tiếp xúc, cảm giác đứng chắc trên mặt đất.
- Đảo có vách đá, lớp đất và thực vật ở mép.
- Gameplay rõ ràng, phản hồi nhanh, có chuyển động và âm thanh nhẹ.
- Giữ tiến độ, quy tắc trò chơi và khả năng chạy trên điện thoại.

### Không thuộc mục tiêu ban đầu

- Photorealism hoàn toàn.
- Chuyển sang Unity hoặc Unreal.
- Vật lý toàn cảnh, thế giới mở hoặc multiplayer thời gian thực.
- Dùng một ảnh nền để giả lập nông trại 3D.
- Thêm hàng nghìn chi tiết để che chất lượng mô hình hoặc ánh sáng chưa tốt.

## 2. Đánh giá hiện trạng

Dựa trên ảnh sau nâng cấp:

### Điểm đã tốt hơn

- Nhà kho, mái, giếng và luống đã có chi tiết vật liệu.
- Có bóng đổ và chiều dày đảo.
- Bố cục trung tâm và vùng trồng dễ nhận diện.
- Cây lá rộng phong phú hơn bản hình khối đơn giản ban đầu.

### Điểm cần ưu tiên

1. Mặt cỏ còn giống tấm thảm xanh; nửa trước đảo khá trống.
2. Cây thông còn dạng nón xếp tầng; tán cây lá rộng có vùng vụn và tối mạnh.
3. Ánh sáng chưa đủ mềm, trong và ấm; cần kiểm tra màu sắc và vùng bóng.
4. Công trình thiếu cụm đồ dùng và cảnh quan liên kết xung quanh.
5. Mép đảo sắc, mây đặc và nền trời còn ít chiều sâu.

Nhận xét này dựa trên ảnh chụp, chưa thay thế việc kiểm tra render thực tế, chuyển động và hiệu năng.

## 3. Quyết định kỹ thuật

**Quyết định cập nhật: thử nghiệm chuyển khu trải nghiệm game sang PlayCanvas, giữ React cho UI và logic nghiệp vụ; dùng pipeline hybrid asset + code.**

Quyết định này thay thế đề xuất giữ nguyên renderer ở bản kế hoạch đầu. React Three Fiber + Three.js vẫn được giữ làm baseline và phương án quay lại cho đến khi prototype PlayCanvas đạt nghiệm thu. Không chuyển toàn bộ chỉ vì engine mới; lợi ích cần chứng minh bằng chất lượng hình ảnh, quy trình chỉnh cảnh và hiệu năng.

- Asset thiết kế bằng Blender cho cây, công trình, vật nuôi và vật thể chủ đạo.
- Code điều khiển trạng thái cây, tương tác, bố trí, camera và hiệu ứng.
- Địa hình và cảnh quan kết hợp hình dáng được thiết kế với chi tiết phân bố bằng code.
- Tái sử dụng hình học, vật liệu và texture; tránh mỗi vật thể một bộ tài nguyên riêng.

### Điểm bắt đầu kiểm tra code

- [Garden3D.tsx](../src/features/garden3d/Garden3D.tsx)
- [quality.ts](../src/features/garden3d/quality.ts)
- [layout.ts](../src/features/garden3d/layout.ts)
- [sky.ts](../src/features/garden3d/sky.ts)
- [FriendIsland.tsx](../src/features/garden3d/FriendIsland.tsx)
- [package.json](../package.json)
- [Kế hoạch khu vườn 3D hiện có](khu-vuon-3d.md)

Đọc lại code thực tế trước khi sửa; không giả định các thiết lập trước đây vẫn giữ nguyên. Kiểm tra các thành phần cảnh được dùng chung với nông trại bạn bè.

## 4. Công cụ và vai trò

| Công cụ | Vai trò | Quyết định |
|---|---|---|
| Blender | Modeling, UV, bake, animation, xuất GLB/glTF | Công cụ asset chính |
| Krita hoặc GIMP | Vẽ/chỉnh texture | Phương án chi phí thấp |
| Substance 3D Painter | Vẽ vật liệu trực tiếp trên mô hình | Tùy ngân sách, không bắt buộc |
| PlayCanvas Engine + Editor | Render, camera, tương tác và authoring cảnh trực quan | Nền thử nghiệm mới cho khu game |
| React + CSS + motion hiện có | UI, panel, điều hướng, phản hồi giao diện | Giữ và nâng cấp design system |
| React Three Fiber + Three.js | Baseline và renderer cũ | Giữ trong giai đoạn chuyển đổi, gỡ sau nghiệm thu |
| Drei | Tiện ích cho renderer cũ | Không bổ sung cho hướng PlayCanvas |
| glTF Transform | Tối ưu mô hình và texture | Đưa vào pipeline asset |
| Spector.js + Performance trình duyệt | Phân tích render và điểm nghẽn | Dùng để đo, không tối ưu theo cảm giác |
| Vitest | Kiểm tra logic | Tận dụng hệ thống hiện có |
| Playwright | Kiểm tra luồng chơi trên trình duyệt | Bổ sung theo phạm vi test |
| Audacity | Chỉnh âm thanh | Dùng ở giai đoạn polish |

Không thêm dependency chỉ vì có tên trong kế hoạch. Mỗi bổ sung cần có lợi ích, chi phí tải và phương án tương thích cụ thể.

## 5. Art direction

### Phong cách

- Handcrafted miniature diorama, cozy, organic, stylized realism.
- Giữ bản sắc Bếp Việt: mái ngói, chum đất, giỏ tre, bảng hiệu và nông sản phù hợp.
- Hình khối dễ đọc ở camera gameplay; không phụ thuộc chi tiết chỉ thấy khi zoom sát.
- Tránh trộn cây bán hiện thực với nhà hoạt hình hoặc asset low-poly khác phong cách.

### Bảng màu

- Cỏ: olive, xanh non, xanh rêu; tránh xanh neon đồng nhất.
- Gỗ: nâu mật ong, nâu ấm, biến thiên nhẹ.
- Mái: đỏ đất nung, hơi phai màu.
- Đá: xám ấm, beige; có khác biệt giữa các khối.
- Hoa: trắng, vàng, hồng; dùng làm điểm nhấn.
- Nắng ấm kết hợp ánh sáng môi trường hơi lạnh; không phủ vàng toàn cảnh.

### Bố cục

- Giữ kho phía sau bên trái, Bếp Cô Ba phía sau gần trung tâm, giếng bên phải.
- Luống trồng là trọng tâm; chuồng gà bên trái; khu mở khóa/chăn nuôi bên phải.
- Đường đá kết nối các khu.
- Tạo 2–3 cụm tiền cảnh thấp để bớt trống, không che trung tâm.
- Điều chỉnh vị trí phải đồng bộ hiển thị, vùng bấm và điểm camera hướng tới.

### Hồ sơ cần chốt trước khi làm hàng loạt

- Moodboard và bảng màu.
- Camera chuẩn, hướng nắng chuẩn.
- Tỉ lệ công trình/cây/vật nuôi.
- Mức chi tiết vật liệu và độ mềm cạnh.
- Một góc mẫu được duyệt làm chuẩn cho toàn bộ asset.

## 6. Pipeline asset

### Quy trình

1. Thiết kế silhouette trong Blender và xem ở góc camera gameplay.
2. Modeling, làm mềm cạnh phù hợp, UV và vật liệu.
3. Bake chi tiết cần thiết; không dựng mọi lá/ngói bằng hình học thật.
4. Tạo animation hoặc biến thể khi cần.
5. Xuất GLB/glTF, kiểm tra scale, hướng và điểm gốc.
6. Tối ưu bằng glTF Transform; lựa chọn nén theo hỗ trợ và chi phí giải mã thực tế.
7. Tích hợp, đo tải và render trên thiết bị mục tiêu.
8. Lưu thông tin nguồn, giấy phép và phiên bản asset.

### Quy chuẩn

- Thống nhất đơn vị, hướng trục, scale và pivot giữa các asset.
- Ưu tiên vật liệu dùng chung/atlas khi hợp lý.
- Texture 512–1024 là điểm khởi đầu cho vật nhỏ và vừa; chỉ tăng khi thấy lợi ích ở camera thật.
- Chọn mức hình học theo silhouette và đo hiệu năng; không đặt cùng ngân sách cho mọi vật thể.
- Có phiên bản đơn giản hơn cho asset đắt khi đo đạc chứng minh cần thiết.
- Cây dùng lá dạng thẻ phải kiểm tra viền, alpha, bóng và độ chồng lớp.
- Vùng bấm dùng hình dạng đơn giản, không phụ thuộc vào từng chiếc lá.
- Không tạo đường dẫn tới asset chưa tồn tại.

### Danh sách ưu tiên

| Nhóm | Nội dung | Ưu tiên |
|---|---|---|
| Cây | Một cây lá rộng, một cây thông; biến thể tán/kích thước | P0 |
| Kho | Mái, cửa, khung, chân móng, bảng hiệu | P0 |
| Luống | Khung, cọc, đất, cây mẫu qua các giai đoạn | P0 |
| Giếng | Thành đá, trụ, mái, gầu, mặt nước | P1 |
| Bếp Cô Ba | Quầy, mái vải, giỏ, chum, nông sản | P1 |
| Chuồng/vật nuôi | Chuồng, máng, rơm, gà và animation | P1 |
| Cảnh quan | Đá, hoa, cỏ, hàng rào, ghế, dây leo | P1 |
| Cây trồng còn lại | Các loài và giai đoạn theo dữ liệu hiện có | P1 |
| Nền | Mây, đảo xa, chi tiết phụ | P2 |

Nếu dùng asset mua hoặc tải ngoài, kiểm tra giấy phép thương mại, quyền phân phối trên web và độ đồng nhất mỹ thuật. Công cụ AI tạo 3D chỉ nên hỗ trợ thử ý tưởng; asset vẫn cần kiểm tra topology, UV, vật liệu và tối ưu.

## 7. Thiết kế môi trường

### Mặt đất và đảo

- Chia mặt đất thành vùng cỏ, đất mòn và đường đi có chuyển tiếp.
- Tạo mảng màu lớn có chủ đích, không chỉ thêm nhiễu texture.
- Biến thiên độ cao nhẹ, giữ mặt luống và vùng tương tác ổn định.
- Vách đá có khối lớn/nhỏ, lớp đất mặt và mép không đều.
- Rễ, rêu, dây leo xuất hiện chọn lọc ở mép.

### Cây và thực vật

- Cây thông có tầng cành rủ, đường viền bất quy tắc.
- Cây lá rộng có cụm tán rõ và khoảng rỗng; giảm mảng tối gần đen.
- Biến thiên góc xoay, tỉ lệ và màu trong giới hạn.
- Cỏ/hoa mọc thành cụm theo chân đá, hàng rào, mép đường.
- Không che luống, nhãn chọn hoặc công trình cần thao tác.

### Công trình và cảnh kể chuyện

- Kho: thùng, bao nông sản, dụng cụ, hoa thấp.
- Bếp: giỏ rau, chum, bảng gỗ, bàn phụ.
- Giếng: lối đá, gầu, vài cây thấp, vùng đất mòn.
- Chuồng: rơm, máng, hàng rào, vật nuôi nhìn rõ.
- Luống: đất gợn nhẹ, khung có độ dày, cây có thể tích.

### Ánh sáng và camera

- Một nguồn nắng chính, bóng mềm, ánh sáng môi trường vừa đủ.
- Kiểm tra không gian màu, tone mapping và exposure trước hậu kỳ.
- Tạo bóng tiếp xúc bằng bóng thật hoặc giải pháp giả phù hợp từng mức.
- Bloom rất nhẹ cho đèn; không dùng glow để che vật liệu yếu.
- Nếu có depth of field, vùng gameplay vẫn rõ.
- Camera ba phần tư, thấy mặt đứng công trình và chiều dày đảo.
- Giữ thời gian trong ngày; kiểm tra nắng đẹp, chiều và đêm.
- Mây xa và mềm, đảo nền giảm tương phản so với đảo chính.

## 8. Gameplay và phản hồi

### Giữ nguyên chức năng

- Gieo, chọn giống, tưới và giới hạn tưới.
- Tăng trưởng theo thời gian, thu hoạch.
- Cho vật nuôi ăn, thu sản phẩm.
- Mở khóa theo cấp.
- Đặt, xoay, cất đồ trang trí.
- Lưu tiến độ, đồng bộ và xem nông trại bạn bè.
- Chế độ 2D và fallback khi WebGL không hoạt động.

### Phản hồi thao tác

| Hành động | Biểu diễn mong muốn |
|---|---|
| Chọn | Dấu chọn rõ, camera chuyển nhẹ khi cần |
| Gieo | Đất xới/hạt/mầm, âm thanh ngắn |
| Tưới | Nước chạm đúng luống, đất tối nhẹ, trạng thái rõ |
| Thu hoạch | Phản hồi sản phẩm và phần thưởng dễ đọc |
| Cho ăn | Gà hướng về máng, mổ, trạng thái ăn |
| Thu sản phẩm | Phản hồi lấy trứng/sữa, cập nhật kho rõ |
| Mở khóa | Khu đất đổi trạng thái, hướng dẫn ngắn |

Logic phải độc lập với animation. Không chờ hiệu ứng kết thúc mới bảo đảm lưu hoặc nhận thưởng; không cho phép animation lặp gây nhận thưởng hai lần.

### Sức sống

- Gà: đi → dừng → mổ → đổi hướng trong giới hạn chuồng.
- Cây/cỏ: gió nhẹ, khác pha; không uốn cả thân như cao su.
- Mây: chuyển chậm, ở xa.
- Đèn: bật theo thời gian.
- Âm thanh: nhẹ, có tắt/bật, xử lý hạn chế autoplay của trình duyệt.
- Tôn trọng tùy chọn giảm chuyển động và dừng cập nhật khi không cần.

### Vòng lặp chơi

**Trồng → chăm → thu hoạch → nấu/giao đơn → thưởng → mở khóa cây/khu vực/trang trí.**

Rà soát vòng lặp và cân bằng hiện có trước khi thêm hệ thống mới. Mỗi phiên chơi cần mục tiêu ngắn hạn rõ và phản hồi tiến độ. Thời tiết hoặc vật nuôi mới là mở rộng sau, không phải điều kiện để hoàn thành đợt nâng cấp này.

## 9. Hiệu năng và độ tin cậy

### Mức chất lượng

| Mức | Định hướng |
|---|---|
| Nhẹ | Giữ silhouette/bảng màu; giảm cỏ, texture và bóng động; có thể dùng bóng giả |
| Vừa | Chiều sâu ánh sáng rõ; mật độ vừa; bóng giới hạn phù hợp |
| Đẹp | Tăng chi tiết và chất lượng bóng; hậu kỳ chọn lọc sau đo đạc |

- Instancing cho vật thể lặp lại.
- Chia sẻ geometry/material; tránh tạo tài nguyên mỗi khung hình.
- Không cập nhật trạng thái giao diện liên tục chỉ để chạy animation.
- Giới hạn vật thể nhận sự kiện con trỏ.
- Dừng render khi ngoài màn hình; xử lý tải, lỗi tải và giải phóng tài nguyên.
- Kiểm tra WebGL context loss và fallback.

### Mục tiêu đo ban đầu

- Chọn ít nhất một desktop và một điện thoại mục tiêu, ghi rõ thiết bị/trình duyệt.
- Desktop mức Vừa: hướng đến 60 FPS ổn định; điện thoại mục tiêu mức Nhẹ: tối thiểu khoảng 30 FPS khi chơi bình thường.
- Đây là mục tiêu để kiểm chứng, không phải kết quả đã đạt.
- Ghi thời gian tải, thời gian khung hình, draw call, bộ nhớ nếu đo được và kích thước asset.
- Chốt ngân sách asset sau góc mẫu, không đoán khả năng thiết bị.

### Kiểm tra tính đúng đắn

- Bấm liên tục không nhận thưởng hai lần.
- Tải lại không mất tiến độ.
- Rời trang/quay lại tính tăng trưởng đúng.
- Mạng chậm/lỗi có thông báo và phục hồi.
- Máy chủ xác thực thao tác quan trọng nếu có kinh tế/phần thưởng đồng bộ; không chỉ tin thời gian phía client.
- Không đưa dữ liệu bí mật vào log, asset hoặc báo cáo.

## 10. Lộ trình triển khai và điểm nghiệm thu

### Giai đoạn 0 — Audit và baseline

- [ ] Đọc code cảnh, logic và các kế hoạch liên quan.
- [ ] Ghi nhận các chức năng phải bảo toàn và vùng dùng chung.
- [ ] Chụp baseline cùng camera, giờ và trạng thái nông trại.
- [ ] Đo baseline trên thiết bị mục tiêu.
- [ ] Chốt art direction và cách quản lý asset/giấy phép.

**Đầu ra:** baseline hình ảnh/hiệu năng, danh sách rủi ro, hồ sơ mỹ thuật ngắn.

### Giai đoạn 1 — Góc mẫu chất lượng cao

Phạm vi: nhà kho + một cây + một luống có cây + đoạn đường đá + mặt đất quanh đó.

- [ ] Làm asset mẫu trong Blender.
- [ ] Tích hợp mô hình, vật liệu và vùng bấm.
- [ ] Chỉnh ánh sáng, bóng và mặt đất.
- [ ] Đánh giá ở camera mặc định và kích thước điện thoại.
- [ ] Đo tải/render, xác định ngân sách tài nguyên.

**Điểm chốt:** góc mẫu phải đẹp hơn rõ rệt, thống nhất phong cách và chạy được trên thiết bị mục tiêu trước khi nhân rộng.

### Giai đoạn 2 — Hoàn thiện toàn đảo

- [ ] Thay cây và công trình theo chuẩn góc mẫu.
- [ ] Hoàn thiện các loài cây và giai đoạn phát triển.
- [ ] Chỉnh vách đảo, mép cỏ, đường đá.
- [ ] Tạo cụm cảnh quanh công trình và 2–3 cụm tiền cảnh thấp.
- [ ] Chỉnh mây, đảo xa và camera mặc định.
- [ ] Kiểm tra bố trí trang trí, mở khóa và nông trại bạn bè.

**Điểm chốt:** toàn cảnh đồng bộ, trung tâm dễ đọc, không có asset giả hoặc thiếu.

### Giai đoạn 3 — Gameplay feel

- [ ] Bổ sung phản hồi chọn/gieo/tưới/thu hoạch.
- [ ] Bổ sung hành vi gà và phản hồi cho ăn/thu sản phẩm.
- [ ] Thêm chuyển động môi trường nhẹ.
- [ ] Làm rõ hướng dẫn, trạng thái, mục tiêu và phần thưởng.
- [ ] Kiểm tra reduced motion và thao tác cảm ứng.

**Điểm chốt:** thao tác có phản hồi rõ, không thay đổi luật hoặc phụ thuộc animation.

### Giai đoạn 4 — Tối ưu và kiểm thử

- [ ] Tối ưu asset, vật liệu, draw call và mức chất lượng.
- [ ] Kiểm tra desktop/mobile, tải chậm và lỗi tải.
- [ ] Test lưu/đồng bộ, bấm lặp, tăng trưởng theo thời gian.
- [ ] Test chế độ 2D, mất WebGL và nông trại bạn bè.
- [ ] Chạy kiểm tra kiểu dữ liệu, lint, test và build theo cấu hình project.
- [ ] Ghi rõ kiểm tra đã chạy, chưa chạy và lỗi còn lại.

**Điểm chốt:** không có lỗi gameplay nghiêm trọng, có báo cáo hiệu năng thực tế.

### Giai đoạn 5 — Polish và phát hành

- [ ] Thêm âm thanh có giấy phép, điều khiển âm lượng/tắt tiếng.
- [ ] Kiểm tra chiều/đêm và hiệu ứng đèn.
- [ ] So sánh trước/sau cùng camera, thời gian và trạng thái cây.
- [ ] Rà soát giao diện, nhãn và chi tiết kể chuyện.
- [ ] Phát hành từng phần, giữ khả năng quay về phiên bản ổn định.

## 11. Tiêu chí nghiệm thu tổng thể

- [ ] Vách đảo và lớp đất nhìn rõ; mép không giống một đĩa phẳng.
- [ ] Cây/công trình không còn chủ yếu là khối trơn đơn sắc.
- [ ] Tán cây rõ, không quá vụn hoặc đen; phong cách đồng nhất.
- [ ] Mặt đất có vùng chuyển tiếp và khoảng trống có chủ đích.
- [ ] Công trình có bóng tiếp xúc và cụm cảnh hợp lý.
- [ ] Mức Vừa đẹp hơn đáng kể so với baseline.
- [ ] Các khu tương tác không bị cây hoặc nhãn che.
- [ ] Gieo/tưới/thu hoạch có phản hồi; lưu và phần thưởng chính xác.
- [ ] Thiết bị mục tiêu đạt ngân sách đã chốt hoặc có hạn chế được ghi rõ.
- [ ] Giảm chuyển động, tắt tiếng và fallback hoạt động.
- [ ] Asset có nguồn/giấy phép rõ, không tham chiếu tài nguyên không tồn tại.
- [ ] Báo cáo kỹ thuật không tuyên bố kiểm tra hay kết quả chưa thực hiện.

## 12. Rủi ro và cách xử lý

| Rủi ro | Cách xử lý |
|---|---|
| Asset đẹp riêng nhưng lệch phong cách | Duyệt góc mẫu và art direction trước khi làm hàng loạt |
| Cảnh đẹp trên desktop nhưng nặng trên điện thoại | Đo từ giai đoạn 1; giảm tầng chi tiết, bóng và alpha overdraw |
| Tán lá vụn/đen | Kiểm tra silhouette, vật liệu, alpha, ánh sáng và anti-aliasing ở camera thật |
| Sửa bố cục làm lệch tương tác | Đồng bộ vị trí cảnh, hit area và camera target |
| Animation gây lỗi logic | Tách logic khỏi hiệu ứng, kiểm tra bấm lặp và tải lại |
| Mất tiến độ khi đổi hiển thị | Không đổi schema tùy tiện; test persistence và migration nếu cần |
| Thêm dependency/hậu kỳ quá sớm | Chỉ thêm khi có vấn đề cụ thể và lợi ích đo được |
| AI tạo asset/code chưa hoàn thiện | Review, kiểm chứng asset, test và đo thực tế trước nghiệm thu |

## 13. Thứ tự hành động đầu tiên

1. Audit và lưu baseline.
2. Chốt góc mẫu nhà kho + cây + luống + đường đá.
3. Làm bộ asset mẫu bằng Blender, tích hợp trên nền hiện tại.
4. Chỉnh mặt đất và ánh sáng đến khi góc mẫu đạt yêu cầu.
5. Đo hiệu năng rồi mới mở rộng toàn đảo.

**Nguyên tắc xuyên suốt:** ưu tiên silhouette, vật liệu, ánh sáng và bố cục trước mật độ chi tiết; ưu tiên gameplay ổn định trước hệ thống mở rộng.

## 14. Phạm vi chuyển sang PlayCanvas và quyết định kiến trúc

### Lý do chọn

Project còn ở giai đoạn thử nghiệm. PlayCanvas được chọn để thử vì Editor trực quan hỗ trợ bố trí cảnh, ánh sáng, vật liệu và phối hợp với artist. Không tuyên bố engine này mặc nhiên đẹp hơn Babylon.js hoặc Three.js.

- PlayCanvas phụ trách thế giới 3D và phản hồi hình ảnh.
- React phụ trách shell, điều hướng, panel, nội dung, accessibility và logic ứng dụng.
- Blender cung cấp bộ asset đồng bộ.
- Logic domain, lưu tiến độ, tài khoản và đồng bộ tiếp tục độc lập với renderer.

### Hai phương án authoring cần chốt trong audit

1. **Engine tích hợp trực tiếp trong app React:** quản lý mã và manifest asset trong repository; triển khai cùng ứng dụng. Không mặc nhiên có đầy đủ quy trình kéo thả của Editor.
2. **Editor authoring + bản build tích hợp:** dùng Editor để tạo cảnh, quản lý bản xuất và cầu nối tới React. Phải chứng minh việc xuất bản, ghim phiên bản và tái tạo build hoạt động.

Ưu tiên kiểm chứng phương án Editor vì đó là lý do chuyển engine. Nếu không dùng Editor, đánh giá lại lợi ích so với nền hiện tại. Không tự động chuyển toàn bộ chỉ bằng cách cài engine.

Trước khi chọn Editor, kiểm tra điều kiện hiện hành về project riêng tư, chi phí, quyền sử dụng asset, xuất bản và quản lý phiên bản. Không ghi thông tin chưa xác minh như một cam kết. Không phụ thuộc vào bản production bị thay đổi ngầm khi chỉnh scene trên dịch vụ.

### Baseline và rollback

- Giữ renderer cũ hoạt động sau một lựa chọn cấu hình rõ ràng.
- Không chạy hai engine đồng thời chỉ để ẩn một engine bằng CSS.
- Cho phép chuyển thử renderer mà không đổi schema tiến độ.
- Chỉ gỡ dependency và cảnh cũ sau khi toàn bộ luồng game tương đương, kiểm thử đạt và có snapshot baseline.
- Fallback 2D vẫn tồn tại; người dùng được thông báo khi 3D không hoạt động.

## 15. Các khu vực nhúng và đồng bộ ngoài nông trại

### 15.1. Bếp Cô Ba — ưu tiên P1 sau nông trại

**Vai trò:** nối nguyên liệu thu hoạch với công thức và món hoàn thành.

**Luồng:** chọn Bếp Cô Ba → mở góc bếp → React hiển thị công thức/nguyên liệu → gửi yêu cầu nấu → logic xác thực → cảnh chạy phản hồi → UI cập nhật kết quả.

- Bối cảnh: bàn gỗ, chum, giỏ rau, dụng cụ, đèn và hơi nước nhẹ.
- Có thể chuyển camera trong cùng thế giới hoặc tải một góc bếp riêng.
- Không mô phỏng cắt, đảo, va chạm và vật lý nấu ăn trong đợt đầu.
- Nếu thiếu mô hình món, dùng ảnh món trong panel; không tạo asset giả hoặc cam kết món 3D chưa tồn tại.
- Animation không tự trừ nguyên liệu hoặc cấp thưởng.

**Nghiệm thu:** nấu đúng điều kiện hiện có, không trừ hai lần, thiếu nguyên liệu được giải thích, kết quả còn đúng sau tải lại.

### 15.2. Chợ quê / giao đơn — ưu tiên P1

**Vai trò:** tạo bối cảnh cho việc giao hàng và nhận thưởng.

- Một quầy nông sản đẹp đủ cho phiên bản đầu; chưa dựng khu chợ lớn.
- React hiển thị đơn, giá trị, điều kiện và trạng thái.
- Cảnh phản hồi chọn đơn, giỏ hàng và giao sản phẩm.
- Chỉ thay trải nghiệm hiển thị, không tự thay cân bằng kinh tế hay thêm cơ chế mua bán mới.

**Nghiệm thu:** giao đúng sản phẩm/số lượng, chống lặp, lỗi mạng có phục hồi, phần thưởng khớp domain/server hiện có.

### 15.3. Kho và trang trí — ưu tiên P1/P2

- Danh sách kho và số lượng vẫn là UI React.
- Chọn đồ trang trí có xem trước xoay vật thể khi asset phù hợp.
- Ưu tiên dùng viewport hiện tại cho preview, tránh canvas/engine riêng trong từng thẻ.
- Có thao tác đặt, xoay, xác nhận, hủy và cất lại.
- Preview không ghi vào tiến độ cho tới khi hành động được xác nhận hợp lệ.
- Điện thoại có nút thao tác rõ, không phụ thuộc hover hoặc kéo chính xác.

**Nghiệm thu:** số lượng và bố trí đúng sau tải lại, không xuyên vùng cấm, hủy không làm thay đổi trạng thái.

### 15.4. Nông trại bạn bè — tái sử dụng P1

- Tái sử dụng asset, layout và renderer; cấp dữ liệu hiển thị tương ứng.
- Phân biệt chế độ chủ sở hữu và xem khách bằng quyền rõ ràng.
- Không cho thao tác thay đổi nông trại khách nếu nghiệp vụ hiện có không cho phép.
- Không tạo bộ renderer khác chỉ để đổi nguồn dữ liệu.

### 15.5. Nhận thưởng, mở khóa và hồ sơ — P2

- Mở khóa có thay đổi cảnh và thông báo ngắn.
- Nhận thưởng có thể dùng vật phẩm 3D trong viewport đang có; không cần canvas riêng cho mỗi popup.
- Hồ sơ ưu tiên ảnh chụp/thumbnail nông trại và huy hiệu đồng bộ phong cách.
- Chụp ảnh là tính năng riêng cần xử lý kích thước, quyền truy cập và lưu trữ; không mặc nhiên đã có.

### 15.6. Food Reel và chi tiết món — giữ nền nội dung

Ứng dụng hiện đặt Food Reel ở landing và Journey trong drawer: [App.tsx](src/App.tsx:20).

- Giữ ảnh món, route, nội dung và thao tác hiện có.
- Đồng bộ màu, chữ, icon, motion với khu game.
- CTA mở Bếp Cô Ba, nguyên liệu hoặc hành trình phù hợp.
- Không thêm canvas vào mỗi thẻ món; không thay toàn bộ ảnh bằng mô hình 3D.
- Chỉ thử món 3D chọn lọc khi có asset tốt và lợi ích đo được.
- Giữ fallback ảnh và nội dung truy cập được khi engine không tải.

### 15.7. Khu vực không dùng engine

Đăng nhập, tài khoản, quyền riêng tư, quản trị, nội dung công thức dài và các biểu mẫu tiếp tục dùng giao diện web thông thường. Đồng bộ qua design system, không qua việc ép thành 3D.

## 16. Cầu nối React ↔ PlayCanvas

### Nguồn dữ liệu duy nhất

Domain/state của ứng dụng là nguồn sự thật. Engine chỉ giữ trạng thái biểu diễn như camera, selection, animation và tài nguyên render. Không tạo hệ lưu tiến độ hoặc kinh tế thứ hai trong PlayCanvas.

### Chiều dữ liệu

- React/domain → engine: snapshot hiển thị, layout, thời gian, quyền thao tác, chất lượng, giảm chuyển động và trạng thái âm thanh.
- Engine → React/domain: intent chọn luống, gieo, tưới, thu hoạch, chọn công trình, đặt/xoay/cất trang trí.
- Domain → engine/UI: kết quả thao tác thành công/thất bại và dữ liệu mới.

Ưu tiên các kiểu dữ liệu rõ ràng; không truyền tùy ý toàn bộ store hoặc dùng biến toàn cục. Chuyển dữ liệu theo thay đổi cần thiết, không đẩy snapshot mỗi frame.

### Quy tắc lệnh và phản hồi

- Mọi intent đi qua API domain hiện có.
- Lệnh nhận thưởng/trừ tài nguyên phải chống lặp theo cơ chế phù hợp hiện tại.
- Phản hồi animation chỉ biểu diễn kết quả, không thực hiện giao dịch.
- Không phát lại hiệu ứng thưởng chỉ vì nhận lại snapshot khi reconnect.
- Lỗi hiển thị bằng React; scene không tự sửa dữ liệu để che lỗi.

### Vòng đời

- Ưu tiên một engine/canvas hoạt động trong khu Journey.
- Chuyển nông trại/bếp/chợ bằng trạng thái cảnh hoặc tải khu theo nhu cầu.
- Mount/unmount phải idempotent, xử lý vòng đời React trong môi trường phát triển.
- Khi drawer đóng hoặc tài liệu bị ẩn: dừng cập nhật phù hợp; không để game chạy ngầm vô ích.
- Khi mở lại: lấy dữ liệu/thời gian mới; không tính tăng trưởng từ số frame đã chạy.
- Resize, DPR, orientation và panel che viewport đều được xử lý.
- Cleanup listener, timer, audio, tài nguyên GPU và tác vụ tải đang dở.
- Có loading, timeout/lỗi tải, retry và fallback 2D; fallback renderer cũ trong thử nghiệm là tùy chọn riêng.

### Gợi ý cấu trúc, không phải tệp đã tồn tại

Tạo một feature PlayCanvas độc lập gồm: host React, adapter engine, hợp đồng dữ liệu/sự kiện, registry asset, bộ điều khiển cảnh và theme UI dùng chung. Chốt tên/đường dẫn sau audit để tránh trùng cấu trúc hiện có.

## 17. Design system cho khu trải nghiệm game

### Visual tokens

- Màu kem/nâu gỗ/xanh lá/đỏ đất nung, màu trạng thái có tương phản đủ.
- Typography kế thừa thương hiệu hiện có; không thêm nhiều font chỉ để trang trí.
- Bộ icon thống nhất; không trộn phong cách tùy tiện.
- Khoảng cách, bo góc, bóng panel, kích thước nút và z-index nhất quán.

### Thành phần

- HUD gọn cho tài nguyên và mục tiêu gần nhất.
- Thanh hành động theo ngữ cảnh thay vì luôn hiện mọi nút.
- Panel kho/công thức/đơn hàng rõ ràng.
- Sheet trên mobile, panel bên cạnh trên desktop khi phù hợp.
- Loading, empty, error, locked và success được thiết kế đủ.
- Toast/phần thưởng không chặn thao tác hoặc che luống.

### Accessibility và input

- Vùng chạm khoảng 44 CSS px trở lên cho nút chính.
- Có nhãn cho icon-only button và focus rõ.
- Các hành động chính có cách thực hiện qua UI ngoài canvas.
- Không chỉ dùng màu để báo trạng thái.
- Escape/back đóng đúng lớp; trả focus về vị trí phù hợp.
- Reduced motion, tắt âm và safe area điện thoại.
- Không chiếm gesture cuộn toàn trang khi người dùng chưa tương tác với cảnh.

## 18. Lát cắt triển khai đầu tiên theo hướng mới

Phần này cụ thể hóa Giai đoạn 0–1 và được ưu tiên khi triển khai PlayCanvas.

### Phạm vi bắt buộc

- Audit route/state/domain/cảnh hiện có và lưu baseline.
- Chọn authoring Engine trực tiếp hay Editor export, ghi lý do và hạn chế.
- Host PlayCanvas trong khu Journey, tải lười, không ảnh hưởng landing.
- Một góc nhà kho + cây + luống + đường đá với ánh sáng/camera đẹp.
- Chọn luống, gieo, tưới, thu hoạch qua domain thật.
- Thanh hành động React theo theme mới.
- Cấu hình thử renderer, cleanup và fallback.
- Test cầu nối, gameplay cơ bản, mobile và hiệu năng.

### Không làm trong lát cắt đầu

- Chuyển toàn bộ bếp/chợ/kho sang 3D.
- Xóa renderer cũ hoặc viết lại persistence/backend.
- Mua/tải asset không rõ giấy phép.
- Thêm hệ kinh tế, thời tiết hoặc vật lý mới.
- Tuyên bố đạt ảnh tham chiếu bằng placeholder.

### Nếu chưa có asset

Dựng prototype chạy được với placeholder được ghi rõ, xác minh cầu nối và workflow. Đồng thời lập asset manifest gồm vai trò, nguồn, giấy phép, đường dẫn dự kiến, trạng thái và ngân sách. Kết quả này chỉ nghiệm thu kỹ thuật, chưa nghiệm thu mỹ thuật. Không coi khối cơ bản là bộ asset hoàn chỉnh.

### Điều kiện chuyển toàn bộ

- Góc mẫu đẹp hơn baseline với cùng camera/giờ/trạng thái.
- Workflow chỉnh scene thực sự thuận tiện hơn.
- Gameplay và tiến độ tương đương.
- Mobile đạt ngân sách, không tăng thời gian tải vô lý.
- Build có thể tái tạo, tài nguyên và giấy phép rõ.

## 19. Prompt triển khai code

Dùng prompt dưới đây cùng ảnh hiện tại và ảnh tham chiếu. Yêu cầu triển khai lát cắt đầu trước, không chuyển toàn bộ trong một lượt.

> Bạn là senior React/TypeScript engineer, PlayCanvas engineer và technical artist. Hãy đọc toàn bộ [kế hoạch nâng cấp](plans/nong-trai-stylized-realism-va-gameplay.md), đặc biệt các mục 14–18, rồi triển khai lát cắt PlayCanvas đầu tiên trong project này.
>
> Mục tiêu: kiểm chứng PlayCanvas cho khu trải nghiệm game, có góc nông trại đẹp, giữ React cho UI và domain hiện có làm nguồn dữ liệu duy nhất. Không chỉ trả lời bằng kế hoạch; hãy sửa code, chạy kiểm tra và báo cáo kết quả thực tế.
>
> 1. Audit ứng dụng từ [App.tsx](src/App.tsx), [Garden3D.tsx](src/features/garden3d/Garden3D.tsx), domain/state, Journey drawer, layout, chất lượng, fallback và cảnh bạn bè. Kiểm tra trạng thái repository trước khi sửa, không ghi đè thay đổi của người dùng. Không đọc hoặc in bí mật môi trường.
> 2. Lưu baseline và xác định các chức năng phải bảo toàn. Chốt phương án Engine tích hợp trực tiếp hoặc Editor export. Nếu Editor chưa có project/build/asset, không giả vờ đã kết nối; dựng host và adapter tự chứa để kiểm chứng kỹ thuật, ghi rõ bước authoring còn thiếu.
> 3. Thêm dependency tối thiểu đúng nhu cầu, xác minh API theo phiên bản dùng. Tạo feature độc lập và tải lười trong Journey. Giữ renderer cũ qua cấu hình thử nghiệm; chỉ mount một renderer tại một thời điểm. Không gỡ Three.js hoặc cảnh cũ trong lượt này.
> 4. Xây cầu nối có kiểu dữ liệu rõ: snapshot biểu diễn từ domain tới engine; intent từ engine tới domain; kết quả hợp lệ quay lại scene/UI. Không tạo store tiến độ, cơ chế phần thưởng hoặc persistence riêng trong engine. Không cấp thưởng/trừ tài nguyên trong animation.
> 5. Dựng lát cắt nhà kho + một cây + một luống + đường đá, mặt đất và camera ba phần tư. Ưu tiên silhouette, chất liệu, ánh sáng và bóng tiếp xúc. Dùng asset có thật và giấy phép phù hợp; nếu chưa có, placeholder phải được ghi rõ và không tuyên bố đạt nghiệm thu mỹ thuật. Không tạo đường dẫn asset chết hoặc dùng ảnh nền giả cảnh 3D.
> 6. Kết nối chọn luống, gieo, tưới và thu hoạch với luật game hiện có. Trạng thái cây hiển thị phải xuất phát từ dữ liệu thật. Không thay luật, cân bằng kinh tế, schema tiến độ hoặc backend chỉ để demo chạy.
> 7. Làm thanh thao tác React gọn, thống nhất bảng màu kem/nâu/xanh/đỏ đất; trạng thái loading/error/locked/success rõ. Giữ landing Food Reel, route, tài khoản, check-in và nội dung ngoài game. Hỗ trợ chạm, bàn phím qua UI, focus và reduced motion.
> 8. Xử lý mount/unmount, resize/DPR, drawer đóng, tab ẩn, lỗi tải, retry, mất context và fallback 2D. Dọn listener, timer, audio và tài nguyên render; không tạo engine trùng hoặc cập nhật React mỗi frame.
> 9. Thêm test cho cầu nối và chống lặp thao tác; chạy typecheck, lint, test và build thích hợp theo [package.json](package.json). Không dùng toàn bộ lệnh verify nếu nó gây thay đổi ngoài phạm vi mà chưa đánh giá. Nếu thiếu công cụ, asset, PHP hoặc quyền dịch vụ, ghi rõ phần bị chặn, không báo kiểm tra thành công giả.
> 10. So sánh ảnh trước/sau cùng trạng thái nếu có công cụ chụp; đo desktop/mobile nếu thiết bị có sẵn. Không suy đoán FPS. Báo cáo tệp sửa, dependency mới, asset/giấy phép, kiểm tra đã chạy, hạn chế, cách bật/tắt renderer thử và cách rollback.
>
> Chỉ hoàn thành lát cắt này trước. Bếp Cô Ba, chợ quê và preview trang trí là giai đoạn tiếp theo, dùng lại kiến trúc và asset đã kiểm chứng. Nếu thiếu quyết định bắt buộc không thể suy ra, chỉ hỏi câu hỏi chặn triển khai; các việc có thể tự kiểm tra thì chủ động làm.

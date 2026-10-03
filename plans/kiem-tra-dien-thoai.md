# Kiểm tra trên điện thoại: nông trại, nhiệm vụ, bạn vườn

Ghi ngày 03/10/2026. Có hai phần:
1. **Kiểm tra tự động.** Script chạm thật vào app trên ba cỡ màn điện thoại giả lập và chụp ảnh từng bước. Chạy được mỗi khi sửa giao diện.
2. **Checklist cho máy thật.** Những thứ giả lập không thay được: cảm giác chạm, cuộn, bàn phím ảo, xoay máy, mạng yếu, máy chậm.

## 1. Kiểm tra tự động

```bash
# angi.local phục vụ dist/. Nếu DB local cũ, build kiểu này để không ghi đè catalogue.snapshot.json:
npx tsc -b && npx vite build && node scripts/precompress.mjs
node scripts/phone-check.mjs                   # cả 3 máy, khoảng 7 phút
node scripts/phone-check.mjs --light iphone-390   # chỉ các thao tác nông trại, khoảng 1–2 phút
node scripts/phone-check-account.mjs iphone-390
```

- Script lái Chrome/Edge headless ở chế độ điện thoại: màn 360×740, 390×844 hoặc 440×956, cảm ứng, user agent iPhone/Android, tiếng Việt, giờ Việt Nam.
- Mặc định nhẹ cho máy: vẽ bằng card đồ hoạ, ưu tiên thấp, DPR 1, chỉ chụp ảnh bước quan trọng và khi lỗi. Có thể đổi bằng biến môi trường:
  - `PHONE_DPR=2`: ảnh nét;
  - `PHONE_SHOTS=all`: chụp mọi bước;
  - `PHONE_GPU=0`: vẽ bằng CPU, rất nặng;
  - `PHONE_PRIORITY=normal`: chạy ở mức ưu tiên bình thường.
- Chạy từng lệnh một, không chạy song song. Nếu log có "took longer than 30 s" thì máy đang quá tải, nên chạy lại.
- App chạy là bản build và API local thật ở `http://angi.local`.
- Ảnh từng bước lưu ở `storage/phone-check/<máy>/`, báo cáo ở `storage/phone-check/report.md`.

Mỗi màn được tự kiểm tra:
- không có thanh cuộn ngang;
- mọi nút nằm trong màn hình và vùng chạm tối thiểu 32 px;
- thông báo (toast) không che thẻ ô đất, khay hạt, thanh dock hay HUD (đo khi toast đã đứng yên);
- không có lỗi JavaScript.

| Kịch bản | Những gì được chạm và kiểm tra |
|---|---|
| Khách mới mở nông trại | HUD, gợi ý, gợi ý "kéo để xem" không đè nút "Chuồng & ao", ô 1 chạm được (không bị thẻ gợi ý che) |
| Chạm ô chín | Thu hoạch ngay, rau vào kho, có thông báo kèm món nấu được |
| Chạm giọt nước | Tưới đúng ô, số lượt tưới trên HUD giảm; chạm vào thân ô đang lớn thì mở thẻ |
| Ô trống | Thẻ mở, nằm trong màn hình, không chìm dưới dock, đóng bằng × |
| Năm nút dock | Bữa này, Kho, Bếp, Đơn, Chợ: mở, vừa màn hình, đóng được |
| Nhiệm vụ | 5 nhiệm vụ ngày, 4 kệ thành tựu, chạm mở kệ |
| Ao | Sang "Chuồng & ao", chạm mặt nước, cá cắn sau 2–5 giây, có thông báo |
| Nông trại cấp 8 | Cây ăn quả, khối nấm, vật nuôi, tổ ong, thuyền |
| Gieo | Chạm ô trống → chạm hạt; kéo hạt thả vào ô; chạm bong bóng hạt trên ô trống |
| Thu hoạch trong thẻ | Thẻ ô đang lớn mở → cây chín → "Thu hoạch" trong thẻ → thông báo nằm **trên** thẻ |
| Chế độ tưới | Dòng hướng dẫn hiện, chạm ô thì tưới |
| Chuồng & ao | Thu trứng, mật ong |
| Thành tựu | Kệ có thành tựu sẵn nhận tự mở, bấm Nhận được thưởng |
| Bếp | Nấu một món trọn các bước |
| Chợ | Bán, mua hạt (cuộn tới nút) |
| Tài khoản | Đăng nhập bằng email, nông trại được lưu, thêm bạn bằng mã, ghé vườn bạn (cảnh 2D), chạm giọt nước để tưới giúp, chạm giỏ để hái, sự kiện được giao khi lưu xong, đăng xuất thì máy bắt đầu lại, đăng nhập lại thì nông trại về |

## 2. Checklist cho máy thật

Dùng ít nhất một iPhone (Safari) và một Android (Chrome), một máy màn nhỏ (~360 px). Mở `https://angi.221-121-1-68.sslip.io/journey`. Đánh dấu ✓ hoặc ghi lại lỗi kèm ảnh màn hình.

### A. Mở nông trại lần đầu (khách mới)
- [ ] Nông trại hiện trong 3 giây trên 4G; dòng "Đang dựng nông trại…" không đứng mãi.
- [ ] HUD (cấp, xu, lượt tưới, nút ⋯) không bị tai thỏ hoặc Dynamic Island che; dock không bị thanh home che.
- [ ] Thẻ gợi ý: chữ đọc được, nút × dễ bấm bằng ngón cái, bấm × thì thu gọn, bấm bóng đèn thì mở lại.
- [ ] Dòng "Kéo để xem cả nông trại" mờ dần và không đè nút "Chuồng & ao".
- [ ] Kéo ngang thì camera trượt mượt, không giật trang, không kéo cả trang web (iOS bounce).

### B. Ô đất
- [ ] Chạm ô chín (bong bóng rau) thì thu hoạch ngay, rau bay vào nút Kho, có thông báo.
- [ ] Chạm giọt nước trên ô đang lớn thì tưới (đất sẫm lại, số giọt trên HUD giảm 1).
- [ ] Chạm vào thân ô đang lớn thì mở thẻ: thời gian còn lại, nút Tưới nước.
- [ ] Chạm ô trống thì mở thẻ có các hạt; chạm một hạt thì gieo vào ô đó.
- [ ] Có hạt trong khay thì ô trống có bong bóng hạt; chạm bong bóng thì gieo ngay.
- [ ] Kéo một hạt từ khay thả vào ô trống: hạt theo ngón tay, thả đúng ô thì gieo, thả ra ngoài thì không gieo.
- [ ] Để thẻ một ô sắp chín đang mở: trong vòng vài giây sau khi chín, nút chuyển sang "Thu hoạch".
- [ ] Bấm "Thu hoạch" trong thẻ: thông báo nằm **trên** thẻ, thẻ hiện món nấu được với nguyên liệu đó.
- [ ] Ô khoá: chạm thì báo cấp mở.
- [ ] Cây ăn quả: thẻ hiện số lần đã hái và lần ra quả sau. Khối nấm: hiện số đợt còn lại. Nút nhổ có hỏi lại.

### C. Khay hạt, công cụ, thông báo
- [ ] Khay hạt: nút ^ mở lưới mọi hạt, chọn hạt khác, đóng lưới.
- [ ] "Tưới cây": bật chế độ tưới, dòng hướng dẫn hiện; chạm ô thì tưới; hết lượt thì tự tắt.
- [ ] "Thu hoạch" (khi có ô chín): thu hết, số trên nút về 0.
- [ ] Thông báo: không che khay hạt hay dock; vuốt ngang để tắt; nút Nấu trong thông báo mở đúng món.

### D. Các bảng
- [ ] Bữa này, Kho, Bếp, Đơn, Chợ, và trong ⋯: Nhiệm vụ, Bạn vườn, Chuồng & ao, Bản đồ, Thống kê đều mở được.
- [ ] Kéo thanh ngang trên đầu bảng xuống thì đóng; nút × đóng; nền mờ phía sau chạm thì đóng.
- [ ] Bảng cuộn dọc mượt; chip lọc trong Kho/Chợ cuộn ngang được; không có thanh cuộn ngang của cả trang.
- [ ] Ô tìm kiếm trong Kho/Chợ: bàn phím ảo không che ô đang gõ; gõ có dấu tiếng Việt lọc đúng.

### E. Nhiệm vụ và thành tựu (mục 5)
- [ ] Hôm nay có 5 nhiệm vụ, tuần có 4; không có hai nhiệm vụ cùng loại (ví dụ hai nhiệm vụ "tưới").
- [ ] Chưa có bạn: không có nhiệm vụ tưới giúp, hái trộm, tặng hạt. Chưa mở tổ ong/thuyền/cây ăn quả: không có nhiệm vụ tương ứng.
- [ ] Xong nhiệm vụ thì nút Nhận hiện; bấm nhận thì có thông báo phần thưởng; số trên nút ⋯ và Nhiệm vụ giảm.
- [ ] Thành tựu chia 4 kệ (Bữa ăn, Vườn, Trại & chợ, Bạn bè & chung), dòng "x/28 đã xong hết bậc".
- [ ] Kệ có thành tựu sẵn nhận tự mở và có nhãn "n sẵn nhận"; các kệ khác thu gọn, chạm thì mở.
- [ ] Bậc hiện bằng chấm ●●○○; thanh tiến độ đúng.
- [ ] "Lên đời" (cấp) không cộng XP khi nhận, chỉ xu và hạt.
- [ ] Đăng nhập rồi nhận thành tựu: tải lại trang, thành tựu vẫn đã nhận (server chấp nhận bản lưu).

### F. Ao, chuồng, tổ ong, thuyền
- [ ] Bấm "Chuồng & ao" để sang; bấm "Ruộng" để về.
- [ ] Chạm mặt ao: phao rơi, 2–5 giây sau cá cắn, có thông báo; hết lượt thì báo hết lượt.
- [ ] Bảng Chuồng & ao: cho ăn, thu sản phẩm, lấy mật, cho thuyền ra khơi, đón thuyền về.

### G. Tài khoản và bạn vườn
- [ ] Hồ sơ → "Lưu nông trại bằng email": nhập email, tick đồng ý, gửi; email tới trong 1 phút.
- [ ] Gõ mã 6 số: tự gửi khi đủ 6 số. Sai mã thì báo còn mấy lần thử.
- [ ] Bấm link trong email **trên cùng máy**: vào thẳng, không hỏi lại.
- [ ] Bấm link trong email **trên máy khác**: hỏi "Đăng nhập bằng link…?" kèm email đã che, bấm "Đăng nhập" thì vào.
- [ ] Sau khi đăng nhập, chơi một lúc rồi mở trên máy thứ hai: thấy cùng nông trại.
- [ ] Bạn vườn: chép mã, chia sẻ link mời, thêm bạn bằng mã, "Đổi mã" có hỏi lại và đổi được.
- [ ] Ghé vườn bạn: cảnh 2D giống nông trại mình, phóng vào khu ruộng, kéo xem được phần còn lại.
- [ ] Ô của bạn đang khô có giọt nước: chạm thì tưới giúp, có thông báo, hết lượt thì báo.
- [ ] Ô của bạn chín lâu có bong bóng giỏ: chạm thì hái 1, có thông báo.
- [ ] Danh sách ô bên dưới cảnh: nút "Tưới giúp" và "Hái trộm" cho cùng kết quả.
- [ ] Người bị tưới/hái nhận thông báo lần mở app sau. Ô bị hái thì thu hoạch được ít hơn 1.
- [ ] Tặng hạt: chỉ tặng được hạt đang có; hạt rời khay ngay.
- [ ] Đăng xuất: máy bắt đầu lại như khách (thông báo có nói rõ); đăng nhập lại thì nông trại về.

### H. Điều kiện khó
- [ ] Xoay ngang: HUD, khay, dock và thông báo không chồng nhau (màn thấp 480 px).
- [ ] Bật "Giảm chuyển động" (iOS/Android): không có rung, bay, nảy; mọi thao tác vẫn làm được.
- [ ] Chữ hệ thống cỡ lớn: chữ không tràn khỏi nút, thẻ, dock.
- [ ] Mạng yếu hoặc tắt mạng giữa chừng: chơi tiếp được; bật mạng lại thì tự lưu ("đã lưu" trong Hồ sơ).
- [ ] Đổi giờ máy sau khi đã lưu: app báo giờ đã đổi, nông trại khôi phục theo giờ mới, không mất gì và không được lợi.
- [ ] Mở app ở hai tab hoặc hai máy cùng lúc: không mất tiến độ; khi hai bản khác nhau thì app hỏi giữ bản nào.
- [ ] Máy cũ hoặc máy yếu: Hồ sơ → Hiệu ứng "Thấp" làm cảnh nhẹ hơn, không giật khi kéo.

## 3. Kết quả lần chạy tự động 03/10/2026

Xem bảng ở mục 4 của [nong-trai-va-nhiem-vu-03-10.md](nong-trai-va-nhiem-vu-03-10.md).

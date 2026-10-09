# Vườn Mây: bộ asset mới qua Google Playground

Prompt để làm **một bộ hình mới, đồng bộ** cho Vườn Mây trên [playground.google](https://playground.google/create)
(chọn **2D game**, **Single player**). Phong cách giữ theo kiểu "Khu Vườn Trên Mây": chậu men bóng, viền vàng,
kệ mây pastel, cây đậu thần. Bộ này thay 20 chậu cũ, sprite sheet thử nghiệm và phần đang vẽ bằng Canvas, giữ nguyên
ID trong code. Prompt từng hình (cho công cụ sinh ảnh khác) vẫn ở [sky-garden-prompts.md](sky-garden-prompts.md).

## Bộ mới sửa gì so với bộ hiện tại

| Vấn đề của bộ hiện tại | Bộ mới |
|---|---|
| 16/20 chậu chỉ khoảng 310 px, đất bị lỗ trong suốt | Mỗi hình 1024 px, đất đục, miệng chậu là elip rõ |
| Sheet có quầng sáng, các món dính nhau, kệ phải vá đường nối | Lấp lánh chỉ nằm trên vật, không quầng quanh viền; kệ chia 3 mảnh lặp liền |
| Cây mây mượn sprite rau, bọ và máy vẽ bằng Canvas, chưa có trang trí | Có đủ: 15 cây × 4 giai đoạn, 4 máy, 7 bọ, trang trí §4.7, icon |
| Bộ chậu thiếu (đất nung 0/6, Bàn Ăn 3/6, Chợ Quê 2/6, Biển 4/6, Lễ Tết 4/6) | Vẽ đủ 6 chậu mỗi bộ, cùng một lượt để đồng bộ |
| Bậc chậu (tier) không thấy trên hình | **Viền miệng, cổ và chân chậu là bậc**; dáng và màu thân là chủ đề |

Năm bậc (`POT_TIERS`):

| Bậc | Viền / cổ / chân | Bộ lấy bậc này làm gốc |
|---|---|---|
| 0 `clay` | đất nung men nâu cam, viền vàng mảnh | Đất nung |
| 1 `porcelain` | sứ men lam Bát Tràng (trắng, hoa văn xanh cobalt) | Chợ Quê |
| 2 `jade` | men ngọc (celadon) xanh ngọc | Nông Sản, Biển Miền Trung |
| 3 `gold` | đỏ son thếp vàng | Bàn Ăn Việt |
| 4 `legend` | sơn mài đen-đỏ khảm xà cừ | Lễ Tết |

**Quyền hình (Q6):** ảnh mẫu 1, 2 và 4 là ảnh tham khảo chưa rõ nguồn; ảnh 3 thuộc bộ "chỉ thử nghiệm". Hình sinh
ra dựa trên chúng vẫn tính là **chỉ dùng thử nghiệm** cho tới khi chốt Q6. Prompt yêu cầu thiết kế mới, không chép
nguyên món nào, nhưng vẫn phải soát lại từng hình trước khi phát hành.

---

## Bước 1. Prompt chính: khóa phong cách (dán vào ô "Describe a game")

Playground không nhận file `.md`. Dán chữ từ
[prompt-buoc-1.txt](../storage/sky-garden-qa/playground-refs/prompt-buoc-1.txt), rồi bấm **+** để đính kèm 4 ảnh
(JPG đã nén, cùng thư mục), **đúng thứ tự** vì prompt gọi "Image 1…4":

1. `1-bo-cuc-vuon-may.jpg`: bố cục tháp kệ mây (`reference/layout-reference.png`)
2. `2-chau-mon-viet.jpg`: kệ chậu món Việt (`reference/pot-shelf-moodboard.png`)
3. `3-chau-mau-bi-ngo.jpg`: một chậu hoàn chỉnh làm chuẩn chất lượng (`pots/pumpkin.png`)
4. `4-sprite-ke-may-than-dau.jpg`: kệ mây, thân đậu, trang trí (`source/sprite-sheet-v1.png`)

Lượt đầu chỉ làm **một tầng mẫu** để duyệt phong cách trước khi sinh hơn 150 hình.

**Duyệt lượt 1 trước khi đi tiếp:**
- Chậu đất nung có cùng độ bóng và viền vàng với ảnh 3 không.
- Miệng đất có đục và rõ elip không.
- Kệ ghép 3 mảnh có lộ đường nối không.
- Gốc cây có nằm đúng đáy giữa không.
- Bọ có đọc rõ ở 32 px không.
- Có món nào giống hệt ảnh mẫu không.

Chưa đạt thì sửa ngay trong cùng cuộc trò chuyện, ví dụ: `Remove the glow around the pot edges, keep everything else.`

---

## Bước 2. Các lượt tiếp theo

Danh mục đầy đủ (102 chậu trong 17 bộ, 15 cây × 4 giai đoạn, bọ, máy, cảnh, trang trí, trợ thủ, icon, hiệu ứng),
chia thành 23 lượt dán sẵn: [sky-garden-playground-100.md](sky-garden-playground-100.md).

---

## Bước 3. Nếu Playground không xuất được PNG rời

Playground đang ở bản thử nghiệm và có thể không cho tải từng sprite. Khi đó dùng Gemini (hoặc công cụ sinh ảnh
khác) với khối phong cách dưới đây. Mỗi lần một hình. Gắn vào trước mô tả của hình trong Bước 2.

```text
Single game sprite, one object only, centered with 4% margin, 1024x1024. Bright glossy casual mobile-game art like a cozy cloud-garden game: rich saturated colours, smooth rounded shapes, glazed surfaces with gold trim, soft highlights, a few small sparkles only on the object. 3/4 view from about 20 degrees above, light from the upper left. Vietnamese theme. No glow or halo around the outline, no faces, no text, no cast shadow. Background: perfectly flat solid #FF00FF with no gradient (use flat #00FF00 instead if the object is pink or magenta).
```

Nếu được, đính kèm `3-chau-mau-bi-ngo.jpg` và một hình đã duyệt ở Bước 1 làm ảnh tham chiếu phong cách.

---

## Sau khi có hình

1. **Lưu bản gốc** vào `assets/sky-garden/source/playground-v2/`, giữ tên file như trong ngoặc vuông.
2. **Quyền sử dụng (Q6):** ghi vào `assets/sky-garden/README.md` công cụ (Google Playground, bản thử nghiệm), tài
   khoản, ngày, và điều khoản thương mại của Playground lúc tạo. Chưa rõ quyền thương mại thì vẫn chỉ dùng thử nghiệm.
3. **Chậu:** chép `pot-<id>.png` thành `assets/sky-garden/pots/<id>.png`, rồi chạy `npm run sky:pots`. Chậu mới
   (đất nung, `non_la`, `lighthouse`…) phải thêm ID vào `PotId` và `POT_SETS` trong `src/data/skyGarden.ts`, giá
   trong `skyEconomy.ts`, và tên ở `t.sky.pots`. Bộ nào đủ 6 hình mới tính `complete`.
4. **Kệ, thân đậu, cây, máy, bọ, trang trí, icon:** cần sửa `prepare-sheet.mjs` (hoặc viết script mới) để đọc file
   rời thay cho việc cắt sheet. Đổi xong mới bỏ phần vá đường nối kệ và phần bọ vẽ bằng Canvas.
5. **Chậu Quả Đỏ** (`redfruit`): không có trong bộ mới, giữ hình cũ làm chậu dự phòng như quyết định Q6.
6. **Kiểm tra từng hình** trước khi nhận:
   - Nền trong suốt thật, không quầng sáng quanh viền.
   - Đất trong chậu đục hoàn toàn. `prepare-pots.mjs` phải tìm được elip miệng chậu.
   - Gốc cây nằm ở đáy giữa. Cả 4 giai đoạn cùng tỉ lệ.
   - Kệ và thân đậu ghép lặp không lộ đường nối.
   - Bọ và icon đọc rõ ở 32 px. Chậu cùng bộ cùng màu viền bậc.
   - Không chữ, không mặt, không giống nhân vật hay UI của game khác.
7. Chụp lại ảnh QA bằng `node scripts/sky-garden/game-shots.mjs` để so với `storage/sky-garden-qa/`.

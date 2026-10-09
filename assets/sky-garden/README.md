# Vườn Mây: ảnh nguồn

Ảnh gốc của Vườn Mây. Thư mục này không được phục vụ trực tiếp: `scripts/sky-garden/prepare-pots.mjs` (làm ở G0)
đọc `pots/` rồi ghi WebP, `pots.json` và điểm neo vào `public/images/sky-garden/`. Đặc tả ở
[plans/vuon-may.md](../../plans/vuon-may.md) §0.14.

**Quyền sử dụng (Q6, 2026-10-08):** người dùng cung cấp để phát triển thử nghiệm. **Chưa** phải xác nhận quyền
thương mại. Trước khi phát hành phải có xác nhận quyền cho từng file.

## `pots/`: một file cho mỗi chậu, tên theo ID

| ID | Tên hiển thị | Bộ | Nguồn | Kích thước | Ghi chú |
|---|---|---|---|---|---|
| `pumpkin` | Chậu Bí Ngô | Nông Sản | ảnh 1 gửi trong chat | 1254×1254 | bản lớn |
| `corn` | Chậu Bắp | Nông Sản | ảnh 2 gửi trong chat | 1254×1254 | bản lớn |
| `cabbage` | Chậu Bắp Cải | Nông Sản | ảnh 3 gửi trong chat | 1254×1254 | bản lớn |
| `eggplant` | Chậu Cà Tím | Nông Sản | ảnh 4 gửi trong chat | 1254×1254 | bản lớn |
| `watermelon` | Chậu Dưa Hấu | Nông Sản | `10_dua_hau.png` | 318×318 | cần bản ≥1024 |
| `red_apple` | Chậu Táo Đỏ | Nông Sản | `19_tao_do.png` | 314×314 | cần bản ≥1024 |
| `pho_bowl` | Bát Phở Gà | Bàn Ăn Việt | `04_ca_tim.png` (tên file sai) | 315×315 | cần bản ≥1024 |
| `teapot` | Ấm Trà | Bàn Ăn Việt | `08_gio_tre.png` (tên file sai) | 355×355 | cần bản ≥1024 |
| `banh_chung` | Chậu Bánh Chưng | Bàn Ăn Việt | `12_banh_chung.png` | 311×311 | cần bản ≥1024 |
| `bamboo_basket` | Giỏ Tre | Chợ Quê | `06_dau_tay.png` (tên file sai) | 308×308 | cần bản ≥1024 |
| `bamboo` | Chậu Tre Xanh | Chợ Quê | `17_tre_xanh.png` | 323×323 | cần bản ≥1024 |
| `coconut` | Chậu Dừa Tươi | Biển Miền Trung | `14_dua_tuoi.png` | 330×330 | cần bản ≥1024 |
| `crab` | Chậu Cua Đỏ | Biển Miền Trung | `11_cua_do.png` | 327×327 | cần bản ≥1024 |
| `porcelain_fish` | Chậu Cá Sứ | Biển Miền Trung | `16_ca_su.png` | 327×327 | cần bản ≥1024 |
| `seashell` | Chậu Vỏ Sò | Biển Miền Trung | `18_vo_so.png` | 318×318 | cần bản ≥1024 |
| `mooncake` | Chậu Bánh Trung Thu | Lễ Tết | `13_banh_trung_thu.png` | 299×299 | cần bản ≥1024 |
| `golden_dragon` | Chậu Rồng Vàng | Lễ Tết | `15_rong_vang.png` | 317×317 | cần bản ≥1024 |
| `peach_blossom` | Chậu Hoa Đào | Lễ Tết | `20_hoa_dao.png` | 344×344 | cần bản ≥1024 |
| `lotus` | Chậu Hoa Sen | Lễ Tết | `09_am_tra.png` (tên file sai) | 390×390 | cần bản ≥1024 |
| `redfruit` | Chậu Quả Đỏ | dự phòng | `01_bi_ngo.png` (tên file sai) | 313×313 | chưa rõ quả gì; giữ ID, đổi tên hiển thị sau |

16 file từ bộ 20 đều có lỗ trong suốt ở phần đất (vá tạm trong `prepare-pots.mjs`). Bản phát hành cần render lại.

## `art/`: cây, bọ, máy vẽ riêng từng hình

Hình sinh theo [prompts/sky-garden-playground-100.md](../../prompts/sky-garden-playground-100.md) hoặc
`prompts/sky-garden-chatgpt.txt`, đặt phẳng trong thư mục này, đúng tên file:

- Cây: `<cây>-sprout.png`, `-young`, `-flowering`, `-ready` (cây: `jasmine mint kumquat lotus rose tea coffee
  chrysanthemum pepper orchid peach apricot vanilla saffron beanstalk`).
- Bọ: `bug-<bọ>-a.png` (cánh lên), `bug-<bọ>-b.png` (cánh xuống).
- Máy: `machine-tea.png`, `machine-pot.png`, `machine-still.png`, `machine-phin.png`.
- Trang trí: `decor-bird.png`, `decor-rainbow.png`, `decor-cloud_pillar.png`, `decor-swing.png`,
  `decor-cloud_lantern.png`, `decor-paper_cranes.png`.
- Mầm đậu trên nông trại: `bean-sprout-farm.png`.

Chậu mới (102 chậu, ID trong `ALL_POT_IDS` của `src/data/skyGarden.ts`) đặt vào `pots/<id>.png` rồi chạy `npm run sky:pots`.

Chạy `npm run sky:art`. Script cắt mọi giai đoạn của một cây (hai khung của một bọ) bằng cùng một khung, nên giữ
nguyên tỉ lệ và đường đáy như lúc vẽ, rồi ghi WebP vào `public/images/sky-garden/{plants,bugs,machines}/` và danh
sách vào `src/data/skyGardenArt.json`. Cây chỉ được dùng khi đủ 4 giai đoạn, bọ khi đủ 2 khung. Ảnh không trong suốt
thật (nền ô caro vẽ giả, nền phẳng) bị từ chối. Thiếu hình thì cảnh vẫn dùng sprite rau và hình vẽ canvas như cũ.

Mỗi file nhập vào phải ghi nguồn (công cụ, tài khoản, ngày, ảnh mẫu đã dùng) ở đây trước khi phát hành (Q6).

## `source/vuon_may_20_chau_fixed/`

Bộ 20 chậu y như người dùng gửi ngày 2026-10-08, giữ nguyên tên để đối chiếu. **Tên file 01–09 không khớp hình**
(bảng ở §0.14). Bốn file `02_bap`, `03_bap_cai`, `05_hoa_sen`, `07_bat_pho_ga` là bản nhỏ của bí ngô, bắp, bắp
cải, cà tím; không dùng vì đã có bản lớn.

## `source/sprite-sheet-v1.png`: bảng sprite thử nghiệm

Người dùng gửi ngày 2026-10-08 (1536×1024). Cùng các món với ảnh mẫu bố cục, nên **chỉ dùng thử nghiệm**, phải
xác nhận nguồn hoặc vẽ lại trước khi phát hành (Q6). `npm run sky:sheet` (`scripts/sky-garden/prepare-sheet.mjs`)
cắt ra `public/images/sky-garden/sheet/`: 5 kệ mây, thân đậu (ngọn, đoạn lặp, gốc), 7 bong bóng hoa, bướm, chim,
cầu vồng, hoa, lá, sao, mây.

Lỗi của file gốc và cách xử lý trong script:

- Vật không đục hẳn (alpha tối đa khoảng 251) và quầng màu mờ quanh vật: alpha dưới 80 bỏ, trên 200 thành đục.
- Các món dính nhau qua quầng sáng: cắt theo khung khai báo tay, chỉ giữ thân chính của mỗi món.
- Hoa của kệ dưới vẽ đè lên đáy kệ trên: tô lại bằng màu mây hai bên.
- Hoa trên mặt kệ bị che bởi kệ trên: phủ một bông hoa nguyên vẹn lên chỗ đó.
- Thân đậu có cờ in cố định: dùng đoạn không cờ để lặp, hòa trộn chỗ nối.
- Ảnh nhỏ (kệ khoảng 600 px, bong bóng khoảng 60 px): đủ cho demo, bản phát hành cần ảnh lớn hơn.

Không dùng: 20 chậu nhỏ (đã có bản nét hơn), cây có mặt giống Plants vs. Zombies, tim và kim cương, mèo, 6 máy
kiểu chibi (chờ người dùng quyết định).

## `reference/`: chỉ để tham khảo, KHÔNG đưa vào game

- `pot-shelf-moodboard.png`: kệ khoảng 60 chậu món Việt, ý tưởng cho các bộ chậu.
- `layout-reference.png`: ảnh mẫu bố cục màn Vườn Mây.

Không cắt nhân vật, chậu hay giao diện từ hai ảnh này để phát hành.

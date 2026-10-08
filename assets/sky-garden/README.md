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

## `source/vuon_may_20_chau_fixed/`

Bộ 20 chậu y như người dùng gửi ngày 2026-10-08, giữ nguyên tên để đối chiếu. **Tên file 01–09 không khớp hình**
(bảng ở §0.14). Bốn file `02_bap`, `03_bap_cai`, `05_hoa_sen`, `07_bat_pho_ga` là bản nhỏ của bí ngô, bắp, bắp
cải, cà tím; không dùng vì đã có bản lớn.

## `reference/`: chỉ để tham khảo, KHÔNG đưa vào game

- `pot-shelf-moodboard.png`: kệ khoảng 60 chậu món Việt, ý tưởng cho các bộ chậu.
- `layout-reference.png`: ảnh mẫu bố cục màn Vườn Mây.

Không cắt nhân vật, chậu hay giao diện từ hai ảnh này để phát hành.

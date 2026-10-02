# Bảng vật phẩm nông trại (sinh tự động)

> Sinh bằng `FARM_REPORT=1 node scripts/run-vitest.mjs run src/data/farmItems.report` từ `src/data/game.ts`
> và `scripts/farm-items/catalog.json`. Đừng sửa tay — sửa dữ liệu rồi sinh lại.

## Tổng quan

- Nguyên liệu thô hợp lệ: **67** (có sẵn 14, bổ sung 53).
- Nguồn sản xuất: **46** loại cây trồng trong ô (26 rau, 15 cây lâu năm, 5 nấm), **8** vật nuôi, 1 trại ong, 1 ao, 1 thuyền đánh cá.
- Hình đã xuất: **263** tệp trong `public/images/farm-items/`.
- Món chế biến mới: **0** (ảnh nguồn không có hình món chế biến; 14 công thức bếp hiện có giữ nguyên).

| Nhóm | Số nguyên liệu |
|---|---|
| Ngũ cốc & đậu | 4 |
| Gia vị & rau thơm | 7 |
| Rau ăn quả | 6 |
| Trái cây | 15 |
| Rau ăn lá | 3 |
| Củ | 6 |
| Nấm | 5 |
| Trứng | 4 |
| Sữa | 2 |
| Lông | 2 |
| Mật ong | 2 |
| Cá & tôm đồng | 4 |
| Hải sản | 7 |

## Nguyên liệu

| Mã | Tên | Nhóm | Nguồn | Chu kỳ | Sản lượng | Giá hạt/giống | Giá bán | Mở ở cấp | Trạng thái | Hình nông sản | Nhận dạng |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `rice` | Gạo | Ngũ cốc & đậu | Ô trồng · Rau (thu 1 lần) | 5 h | 3 | 6 | 2 | 1 | thay hình | tạm: hình giai đoạn chín | high |
| `herbs` | Rau thơm | Gia vị & rau thơm | Ô trồng · Rau (thu 1 lần) | 3 h | 3 | 6 | 2 | 1 | thay hình | tạm: hình giai đoạn chín | medium |
| `chili` | Ớt | Gia vị & rau thơm | Ô trồng · Rau (thu 1 lần) | 4 h | 3 | 6 | 2 | 1 | thay hình | tạm: hình giai đoạn chín | high |
| `scallion` | Hành | Gia vị & rau thơm | Ô trồng · Rau (thu 1 lần) | 3 h | 3 | 6 | 2 | 1 | thay hình | tạm: hình giai đoạn chín | high |
| `bean` | Đậu | Ngũ cốc & đậu | Ô trồng · Rau (thu 1 lần) | 4 h | 3 | 6 | 2 | 1 | thay hình | tạm: hình giai đoạn chín | medium |
| `tomato` | Cà chua | Rau ăn quả | Ô trồng · Rau (thu 1 lần) | 5 h | 3 | 6 | 2 | 1 | thay hình | tạm: hình giai đoạn chín | high |
| `lemongrass` | Sả | Gia vị & rau thơm | Ô trồng · Rau (thu 1 lần) | 4 h | 3 | 10 | 3 | 2 | thay hình | tạm: hình giai đoạn chín | medium |
| `garlic` | Tỏi | Gia vị & rau thơm | Ô trồng · Rau (thu 1 lần) | 5 h | 3 | 10 | 3 | 3 | thay hình | tạm: hình giai đoạn chín | high |
| `cucumber` | Dưa leo | Rau ăn quả | Ô trồng · Rau (thu 1 lần) | 4 h | 3 | 10 | 3 | 4 | thay hình | tạm: hình giai đoạn chín | high |
| `lime` | Chanh | Trái cây | Ô trồng · Cây lâu năm | 6 h đầu, rồi 6 h/lần | 3 | 10 | 3 | 5 | thay hình | tạm: hình giai đoạn chín | medium |
| `napa` | Cải thảo | Rau ăn lá | Ô trồng · Rau (thu 1 lần) | 3 h | 3 | 6 | 2 | 2 | mới | tạm: hình giai đoạn chín | high |
| `radish` | Củ cải trắng | Củ | Ô trồng · Rau (thu 1 lần) | 4 h | 3 | 6 | 2 | 2 | mới | tạm: hình giai đoạn chín | high |
| `cabbage` | Bắp cải | Rau ăn lá | Ô trồng · Rau (thu 1 lần) | 4 h | 3 | 6 | 2 | 3 | mới | tạm: hình giai đoạn chín | high |
| `eggplant` | Cà tím | Rau ăn quả | Ô trồng · Rau (thu 1 lần) | 5 h | 3 | 6 | 2 | 3 | mới | tạm: hình giai đoạn chín | high |
| `carrot` | Cà rốt | Củ | Ô trồng · Rau (thu 1 lần) | 5 h | 3 | 6 | 2 | 3 | mới | riêng | high |
| `bittermelon` | Khổ qua | Rau ăn quả | Ô trồng · Rau (thu 1 lần) | 5 h | 3 | 9 | 3 | 4 | mới | tạm: hình giai đoạn chín | high |
| `potato` | Khoai tây | Củ | Ô trồng · Rau (thu 1 lần) | 5 h | 3 | 9 | 3 | 4 | mới | tạm: hình giai đoạn chín | high |
| `shallot` | Hành tím | Gia vị & rau thơm | Ô trồng · Rau (thu 1 lần) | 5 h | 3 | 9 | 3 | 4 | mới | tạm: hình giai đoạn chín | medium |
| `cauliflower` | Súp lơ | Rau ăn lá | Ô trồng · Rau (thu 1 lần) | 5 h | 3 | 9 | 3 | 5 | mới | tạm: hình giai đoạn chín | high |
| `sweetpotato` | Khoai lang | Củ | Ô trồng · Rau (thu 1 lần) | 6 h | 3 | 9 | 3 | 5 | mới | riêng | high |
| `peanut` | Đậu phộng | Ngũ cốc & đậu | Ô trồng · Rau (thu 1 lần) | 7 h | 3 | 9 | 3 | 5 | mới | tạm: hình giai đoạn chín | medium |
| `pumpkin` | Bí đỏ | Rau ăn quả | Ô trồng · Rau (thu 1 lần) | 6 h | 3 | 9 | 3 | 6 | mới | tạm: hình giai đoạn chín | high |
| `beet` | Củ dền | Củ | Ô trồng · Rau (thu 1 lần) | 6 h | 3 | 9 | 3 | 6 | mới | tạm: hình giai đoạn chín | medium |
| `corn` | Ngô | Ngũ cốc & đậu | Ô trồng · Rau (thu 1 lần) | 7 h | 3 | 9 | 3 | 6 | mới | tạm: hình giai đoạn chín | high |
| `wintermelon` | Bí xanh | Rau ăn quả | Ô trồng · Rau (thu 1 lần) | 7 h | 3 | 9 | 3 | 7 | mới | tạm: hình giai đoạn chín | medium |
| `ginger` | Gừng | Gia vị & rau thơm | Ô trồng · Rau (thu 1 lần) | 7 h | 3 | 9 | 3 | 7 | mới | tạm: hình giai đoạn chín | medium |
| `taro` | Khoai môn | Củ | Ô trồng · Rau (thu 1 lần) | 7 h | 3 | 12 | 4 | 8 | mới | riêng | medium |
| `strawberry` | Dâu tây | Trái cây | Ô trồng · Cây lâu năm | 10 h đầu, rồi 6 h/lần | 2 | 35 | 4 | 5 | mới | tạm: hình giai đoạn chín | high |
| `pineapple` | Dứa | Trái cây | Ô trồng · Cây lâu năm | 11 h đầu, rồi 7 h/lần | 2 | 40 | 5 | 6 | mới | tạm: hình giai đoạn chín | high |
| `banana` | Chuối | Trái cây | Ô trồng · Cây lâu năm | 13 h đầu, rồi 8 h/lần | 2 | 45 | 5 | 7 | mới | tạm: hình giai đoạn chín | high |
| `papaya` | Đu đủ | Trái cây | Ô trồng · Cây lâu năm | 13 h đầu, rồi 8 h/lần | 2 | 45 | 5 | 7 | mới | tạm: hình giai đoạn chín | high |
| `guava` | Ổi | Trái cây | Ô trồng · Cây lâu năm | 14 h đầu, rồi 8 h/lần | 2 | 50 | 5 | 8 | mới | tạm: hình giai đoạn chín | medium |
| `orange` | Cam | Trái cây | Ô trồng · Cây lâu năm | 16 h đầu, rồi 10 h/lần | 2 | 55 | 6 | 9 | mới | tạm: hình giai đoạn chín | high |
| `mandarin` | Quýt | Trái cây | Ô trồng · Cây lâu năm | 16 h đầu, rồi 10 h/lần | 2 | 55 | 6 | 9 | mới | tạm: hình giai đoạn chín | medium |
| `mango` | Xoài | Trái cây | Ô trồng · Cây lâu năm | 17 h đầu, rồi 10 h/lần | 2 | 60 | 6 | 10 | mới | tạm: hình giai đoạn chín | high |
| `dragonfruit` | Thanh long | Trái cây | Ô trồng · Cây lâu năm | 17 h đầu, rồi 10 h/lần | 2 | 60 | 6 | 10 | mới | tạm: hình giai đoạn chín | high |
| `coconut` | Dừa | Trái cây | Ô trồng · Cây lâu năm | 19 h đầu, rồi 11 h/lần | 2 | 65 | 6 | 11 | mới | tạm: hình giai đoạn chín | high |
| `lychee` | Vải | Trái cây | Ô trồng · Cây lâu năm | 20 h đầu, rồi 12 h/lần | 2 | 70 | 7 | 12 | mới | tạm: hình giai đoạn chín | medium |
| `rambutan` | Chôm chôm | Trái cây | Ô trồng · Cây lâu năm | 20 h đầu, rồi 12 h/lần | 2 | 70 | 7 | 12 | mới | tạm: hình giai đoạn chín | high |
| `jackfruit` | Mít | Trái cây | Ô trồng · Cây lâu năm | 22 h đầu, rồi 13 h/lần | 2 | 75 | 7 | 13 | mới | tạm: hình giai đoạn chín | high |
| `durian` | Sầu riêng | Trái cây | Ô trồng · Cây lâu năm | 23 h đầu, rồi 14 h/lần | 2 | 80 | 7 | 14 | mới | tạm: hình giai đoạn chín | high |
| `button` | Nấm mỡ | Nấm | Ô trồng · Nấm (3 đợt) | 3 h đầu, rồi 3 h × 3 đợt | 2 | 17 | 3 | 3 | mới | tạm: hình giai đoạn chín | high |
| `oyster` | Nấm sò | Nấm | Ô trồng · Nấm (3 đợt) | 4 h đầu, rồi 3 h × 3 đợt | 2 | 20 | 4 | 4 | mới | tạm: hình giai đoạn chín | high |
| `shiitake` | Nấm hương | Nấm | Ô trồng · Nấm (3 đợt) | 6 h đầu, rồi 3 h × 3 đợt | 2 | 26 | 4 | 6 | mới | tạm: hình giai đoạn chín | medium |
| `enoki` | Nấm kim châm | Nấm | Ô trồng · Nấm (3 đợt) | 7 h đầu, rồi 3 h × 3 đợt | 2 | 32 | 5 | 8 | mới | tạm: hình giai đoạn chín | medium |
| `woodear` | Mộc nhĩ | Nấm | Ô trồng · Nấm (3 đợt) | 8 h đầu, rồi 3 h × 3 đợt | 2 | 35 | 5 | 9 | mới | tạm: hình giai đoạn chín | medium |
| `egg` | Trứng gà | Trứng | Chuồng · Gà mái | 3 h (ăn 1 gạo) | 2 | — | 7 | 2 | thay hình | riêng | high |
| `duckegg` | Trứng vịt | Trứng | Chuồng · Vịt | 4 h (ăn 1 gạo) | 2 | — | 7 | 3 | mới | riêng | high |
| `quailegg` | Trứng cút | Trứng | Chuồng · Chim cút | 3 h (ăn 1 gạo) | 3 | — | 6 | 5 | mới | riêng | high |
| `gooseegg` | Trứng ngỗng | Trứng | Chuồng · Ngỗng | 6 h (ăn 1 rau thơm) | 1 | — | 10 | 7 | mới | riêng | medium |
| `milk` | Sữa bò | Sữa | Chuồng · Bò sữa | 5 h (ăn 1 rau thơm) | 1 | — | 7 | 4 | thay hình | riêng | high |
| `goatmilk` | Sữa dê | Sữa | Chuồng · Dê | 5 h (ăn 1 cải thảo) | 1 | — | 8 | 6 | mới | riêng | medium |
| `wool` | Lông cừu | Lông | Chuồng · Cừu | 8 h (ăn 1 bắp cải) | 1 | — | 10 | 8 | mới | riêng | high |
| `rabbitwool` | Lông thỏ | Lông | Chuồng · Thỏ | 8 h (ăn 1 cà rốt) | 1 | — | 12 | 9 | mới | riêng | medium |
| `honey` | Mật ong | Mật ong | Trại ong | 8 h | 2 | — | 12 | 6 | mới | riêng | high |
| `honeycomb` | Bánh sáp ong | Mật ong | Trại ong | 8 h | 1 | — | 9 | 6 | mới | riêng | high |
| `fish` | Cá rô đồng | Cá & tôm đồng | Ao (câu cá) | câu tại ao | 1/lần câu | — | 7 | 1 | thay hình | riêng | medium |
| `shrimp` | Tôm càng | Cá & tôm đồng | Ao (câu cá) | câu tại ao | 1/lần câu | — | 9 | 1 | thay hình | riêng | high |
| `carp` | Cá chép | Cá & tôm đồng | Ao (câu cá) | câu tại ao | 1/lần câu | — | 8 | 3 | mới | riêng | medium |
| `crab` | Cua đồng | Cá & tôm đồng | Ao (câu cá) | câu tại ao | 1/lần câu | — | 10 | 5 | mới | riêng | high |
| `mackerel` | Cá thu | Hải sản | Thuyền đánh cá | 4 h/chuyến | 2/chuyến (ngẫu nhiên) | — | 10 | 5 | mới | riêng | medium |
| `scad` | Cá nục | Hải sản | Thuyền đánh cá | 4 h/chuyến | 2/chuyến (ngẫu nhiên) | — | 8 | 5 | mới | riêng | low |
| `clam` | Nghêu | Hải sản | Thuyền đánh cá | 4 h/chuyến | 2/chuyến (ngẫu nhiên) | — | 8 | 5 | mới | riêng | high |
| `squid` | Mực ống | Hải sản | Thuyền đánh cá | 4 h/chuyến | 2/chuyến (ngẫu nhiên) | — | 10 | 6 | mới | riêng | high |
| `bloodcockle` | Sò huyết | Hải sản | Thuyền đánh cá | 4 h/chuyến | 2/chuyến (ngẫu nhiên) | — | 9 | 7 | mới | riêng | medium |
| `scallop` | Sò điệp | Hải sản | Thuyền đánh cá | 4 h/chuyến | 2/chuyến (ngẫu nhiên) | — | 11 | 8 | mới | riêng | medium |
| `octopus` | Bạch tuộc | Hải sản | Thuyền đánh cá | 4 h/chuyến | 2/chuyến (ngẫu nhiên) | — | 12 | 9 | mới | riêng | high |

## Nguồn sản xuất, trạng thái và hình

### Cây trồng trong ô (giai đoạn: mầm → non → ra hoa → chín)

| Mã | Loại | Mầm | Non | Ra hoa | Chín | Ghi chú |
|---|---|---|---|---|---|---|
| `rice` | Rau (thu 1 lần) | `rice-sprout` (69×53) | `rice-young` (71×54) | `rice-flowering` (76×51) | `rice-ready` (76×53) |  |
| `herbs` | Rau (thu 1 lần) | `herbs-sprout` (74×59) | `herbs-young` (75×57) | `herbs-flowering` (76×55) | `herbs-ready` (78×57) |  |
| `chili` | Rau (thu 1 lần) | `chili-sprout` (69×46) | `chili-young` (72×50) | `chili-flowering` (75×50) | `chili-ready` (77×49) |  |
| `scallion` | Rau (thu 1 lần) | `scallion-sprout` (66×57) | `scallion-young` (69×57) | `scallion-flowering` (72×57) | `scallion-ready` (73×59) |  |
| `bean` | Rau (thu 1 lần) | `bean-sprout` (70×51) | `bean-young` (72×53) | `bean-flowering` (76×51) | `bean-ready` (83×54) |  |
| `tomato` | Rau (thu 1 lần) | `tomato-sprout` (69×54) | `tomato-young` (71×50) | `tomato-flowering` (70×47) | `tomato-ready` (74×48) |  |
| `lemongrass` | Rau (thu 1 lần) | `lemongrass-sprout` (65×52) | `lemongrass-young` (69×48) | `lemongrass-flowering` (71×48) | `lemongrass-ready` (70×49) |  |
| `garlic` | Rau (thu 1 lần) | `garlic-sprout` (65×50) | `garlic-young` (69×53) | `garlic-flowering` (75×51) | `garlic-ready` (73×53) |  |
| `cucumber` | Rau (thu 1 lần) | `cucumber-sprout` (70×49) | `cucumber-young` (72×48) | `cucumber-flowering` (77×52) | `cucumber-ready` (84×53) |  |
| `lime` | Cây lâu năm | `lime-sprout` (78×78) | `lime-young` (78×78) | `lime-flowering` (80×77) | `lime-ready` (82×78) | sprout (uses young) |
| `napa` | Rau (thu 1 lần) | `napa-sprout` (66×56) | `napa-young` (68×51) | `napa-flowering` (74×53) | `napa-ready` (70×50) |  |
| `radish` | Rau (thu 1 lần) | `radish-sprout` (67×48) | `radish-young` (68×56) | `radish-flowering` (72×52) | `radish-ready` (78×54) |  |
| `cabbage` | Rau (thu 1 lần) | `cabbage-sprout` (67×49) | `cabbage-young` (67×54) | `cabbage-flowering` (72×51) | `cabbage-ready` (73×47) |  |
| `eggplant` | Rau (thu 1 lần) | `eggplant-sprout` (68×46) | `eggplant-young` (70×53) | `eggplant-flowering` (70×52) | `eggplant-ready` (81×50) |  |
| `carrot` | Rau (thu 1 lần) | `carrot-sprout` (66×50) | = mầm | = mầm | = mầm | young, flowering, ready (in soil) |
| `bittermelon` | Rau (thu 1 lần) | `bittermelon-sprout` (70×52) | `bittermelon-young` (71×53) | `bittermelon-flowering` (76×53) | `bittermelon-ready` (80×52) |  |
| `potato` | Rau (thu 1 lần) | `potato-sprout` (66×52) | `potato-young` (68×52) | `potato-flowering` (78×48) | `potato-ready` (75×50) |  |
| `shallot` | Rau (thu 1 lần) | `shallot-sprout` (65×50) | `shallot-young` (68×51) | `shallot-flowering` (72×52) | `shallot-ready` (74×49) |  |
| `cauliflower` | Rau (thu 1 lần) | `cauliflower-sprout` (67×49) | `cauliflower-young` (68×50) | `cauliflower-flowering` (73×49) | `cauliflower-ready` (73×50) |  |
| `sweetpotato` | Rau (thu 1 lần) | `sweetpotato-sprout` (66×50) | = mầm | = mầm | = mầm | young, flowering, ready (in soil) |
| `peanut` | Rau (thu 1 lần) | `peanut-sprout` (69×50) | `peanut-young` (73×48) | `peanut-flowering` (74×51) | `peanut-ready` (83×51) |  |
| `pumpkin` | Rau (thu 1 lần) | `pumpkin-sprout` (70×54) | `pumpkin-young` (72×53) | `pumpkin-flowering` (79×52) | `pumpkin-ready` (84×47) |  |
| `beet` | Rau (thu 1 lần) | `beet-sprout` (66×48) | `beet-young` (68×50) | `beet-flowering` (75×55) | `beet-ready` (75×51) |  |
| `corn` | Rau (thu 1 lần) | `corn-sprout` (71×53) | `corn-young` (73×55) | `corn-flowering` (75×56) | `corn-ready` (82×54) |  |
| `wintermelon` | Rau (thu 1 lần) | `wintermelon-sprout` (70×51) | `wintermelon-young` (71×48) | `wintermelon-flowering` (79×49) | `wintermelon-ready` (83×52) |  |
| `ginger` | Rau (thu 1 lần) | `ginger-sprout` (70×49) | `ginger-young` (75×50) | `ginger-flowering` (76×51) | `ginger-ready` (79×52) |  |
| `taro` | Rau (thu 1 lần) | `taro-sprout` (66×50) | = mầm | = mầm | = mầm | young, flowering, ready (in soil) |
| `strawberry` | Cây lâu năm | `strawberry-sprout` (74×69) | `strawberry-young` (72×69) | `strawberry-flowering` (79×66) | `strawberry-ready` (68×62) |  |
| `pineapple` | Cây lâu năm | `pineapple-sprout` (70×80) | `pineapple-young` (72×81) | `pineapple-flowering` (70×81) | `pineapple-ready` (67×81) |  |
| `banana` | Cây lâu năm | `banana-sprout` (79×83) | `banana-young` (83×83) | `banana-flowering` (72×83) | `banana-ready` (73×81) |  |
| `papaya` | Cây lâu năm | `papaya-sprout` (77×85) | `papaya-young` (77×85) | `papaya-flowering` (81×87) | `papaya-ready` (81×85) | sprout (uses young) |
| `guava` | Cây lâu năm | `guava-sprout` (70×88) | `guava-young` (79×89) | `guava-flowering` (79×89) | `guava-ready` (74×88) |  |
| `orange` | Cây lâu năm | `orange-sprout` (70×80) | `orange-young` (77×82) | `orange-flowering` (77×82) | `orange-ready` (74×81) |  |
| `mandarin` | Cây lâu năm | `mandarin-sprout` (75×84) | `mandarin-young` (76×83) | `mandarin-flowering` (76×84) | `mandarin-ready` (73×84) |  |
| `mango` | Cây lâu năm | `mango-sprout` (73×78) | `mango-young` (76×77) | `mango-flowering` (76×77) | `mango-ready` (71×78) |  |
| `dragonfruit` | Cây lâu năm | `dragonfruit-sprout` (76×86) | `dragonfruit-young` (75×85) | `dragonfruit-flowering` (77×86) | `dragonfruit-ready` (72×86) |  |
| `coconut` | Cây lâu năm | `coconut-sprout` (78×86) | `coconut-young` (78×86) | `coconut-flowering` (78×86) | `coconut-ready` (82×86) | sprout (uses young) |
| `lychee` | Cây lâu năm | `lychee-sprout` (81×86) | `lychee-young` (81×86) | `lychee-flowering` (82×86) | `lychee-ready` (82×85) | sprout (uses young) |
| `rambutan` | Cây lâu năm | `rambutan-sprout` (80×79) | `rambutan-young` (80×79) | `rambutan-flowering` (82×79) | `rambutan-ready` (84×82) | sprout (uses young) |
| `jackfruit` | Cây lâu năm | `jackfruit-sprout` (79×83) | `jackfruit-young` (79×83) | `jackfruit-flowering` (81×82) | `jackfruit-ready` (84×81) | sprout (uses young) |
| `durian` | Cây lâu năm | `durian-sprout` (80×83) | `durian-young` (80×83) | `durian-flowering` (82×82) | `durian-ready` (83×81) | sprout (uses young) |
| `button` | Nấm (3 đợt) | `button-sprout` (65×72) | `button-young` (70×73) | `button-flowering` (71×73) | `button-ready` (70×70) |  |
| `oyster` | Nấm (3 đợt) | `oyster-sprout` (64×60) | `oyster-young` (67×59) | `oyster-flowering` (65×58) | `oyster-ready` (68×59) |  |
| `shiitake` | Nấm (3 đợt) | `shiitake-sprout` (66×62) | `shiitake-young` (68×58) | `shiitake-flowering` (71×58) | `shiitake-ready` (73×59) |  |
| `enoki` | Nấm (3 đợt) | `enoki-sprout` (64×60) | `enoki-young` (67×60) | `enoki-flowering` (67×58) | `enoki-ready` (69×62) |  |
| `woodear` | Nấm (3 đợt) | `woodear-sprout` (65×65) | `woodear-young` (68×63) | `woodear-flowering` (67×66) | `woodear-ready` (69×65) |  |

### Vật nuôi

| Mã | Tên | Ăn | Sản phẩm | Hình non | Hình trưởng thành |
|---|---|---|---|---|---|
| `chicken` | Gà mái | Gạo | Trứng gà | `animal-chicken-young` (61×49) | `animal-chicken` (68×51) |
| `duck` | Vịt | Gạo | Trứng vịt | `animal-duck-young` (60×47) | `animal-duck` (80×36) |
| `cow` | Bò sữa | Rau thơm | Sữa bò | `animal-cow-young` (71×49) | `animal-cow` (93×53) |
| `quail` | Chim cút | Gạo | Trứng cút | `animal-quail-young` (69×44) | `animal-quail` (76×50) |
| `goat` | Dê | Cải thảo | Sữa dê | `animal-goat-young` (69×51) | `animal-goat` (83×52) |
| `goose` | Ngỗng | Rau thơm | Trứng ngỗng | `animal-goose-young` (77×46) | `animal-goose` (85×42) |
| `sheep` | Cừu | Bắp cải | Lông cừu | `animal-sheep-young` (70×46) | `animal-sheep` (75×47) |
| `rabbit` | Thỏ | Cà rốt | Lông thỏ | `animal-rabbit-young` (69×60) | `animal-rabbit` (85×58) |

### Trại ong, ao, thuyền

| Nguồn | Trạng thái → hình |
|---|---|
| Trại ong | chưa bắt đầu / đầy 1/2 → `hive-1` (115×97); đầy 2/2 → `hive-2` (125×101); sẵn sàng → `hive-3` (104×105); ong bay → `bee` (29×30) |
| Thuyền đánh cá | ở bến / đi biển / đã về → `boat-scene` (363×151) |
| Ao | cá, tôm, cá chép, cua (theo cấp) → hình nông sản từng loài |

## Hình chưa có, cần tạo thêm hoặc tạo lại

- **Hình nông sản riêng (không có đất/cây)** cho 43 loại đang tạm dùng hình giai đoạn chín: `napa`, `cauliflower`, `cabbage`, `radish`, `beet`, `potato`, `lemongrass`, `garlic`, `shallot`, `scallion`, `tomato`, `eggplant`, `cucumber`, `pumpkin`, `wintermelon`, `bittermelon`, `bean`, `peanut`, `corn`, `rice`, `ginger`, `chili`, `herbs`, `banana`, `pineapple`, `strawberry`, `dragonfruit`, `mango`, `orange`, `mandarin`, `guava`, `coconut`, `papaya`, `lime`, `jackfruit`, `durian`, `rambutan`, `lychee`, `shiitake`, `oyster`, `enoki`, `woodear`, `button`.
- `sweetpotato`: thiếu giai đoạn young, flowering, ready (in soil).
- `carrot`: thiếu giai đoạn young, flowering, ready (in soil).
- `taro`: thiếu giai đoạn young, flowering, ready (in soil).
- `coconut`: thiếu giai đoạn sprout (uses young).
- `papaya`: thiếu giai đoạn sprout (uses young).
- `lime`: thiếu giai đoạn sprout (uses young).
- `jackfruit`: thiếu giai đoạn sprout (uses young).
- `durian`: thiếu giai đoạn sprout (uses young).
- `rambutan`: thiếu giai đoạn sprout (uses young).
- `lychee`: thiếu giai đoạn sprout (uses young).
- Tổ ong **không có ong** vẽ dính (3 giai đoạn) — ong trong ảnh nguồn chạm vào tổ, cắt ra sẽ làm hỏng hình; và một con ong rõ nét hơn (bản hiện có ~20 px).
- Lợn: có hình vật nuôi (3 giai đoạn) nhưng không có sản phẩm → chưa thành nguồn sản xuất.
- Hình món chế biến (nếu muốn thêm cơ sở chế biến): chưa có trong ảnh nguồn.
- Khung hình chuyển động (đi, vỗ cánh, bơi) hoặc tài sản tách lớp (đầu/thân/chân/cánh) cho vật nuôi, ong, cá: ảnh nguồn chỉ có hình tĩnh một khung.
- Bản vẽ độ phân giải cao hơn: hình gốc chỉ ~60–120 px mỗi vật phẩm; phóng to không thêm chi tiết.

### Hình trong ảnh nguồn chưa nhận dạng chắc chắn (không dùng)

- `veg-r02 (cols 1-4)`: second leafy head, near-identical to napa cabbage (lettuce?)
- `veg-r05 (cols 1-4)`: orange round root on soil — not identified
- `veg-r11 (cols 1-4)`: green grass tuft — chives/rice seedling? not identified
- `veg-r09 (cols 5-9)`: pale tubers (cassava? jicama?) — not identified
- `treeB-r04`: tree with small red fruit (apple? jujube?) — not identified
- `mush-r02`: second brown capped mushroom, close to shiitake — not identified
- `anim-r05-c2`: brown adult cow (beef?) — the dairy cow (c3) is used
- `anim-r07 (pig)`: pig: no product drawn on the sheet, so no production source
- `prod-r03-b`: brown spotted bowl/shell — not identified
- `prod-r07-c1`: fleece shaped like a lying sheep — wool uses prod-r08
- `fish-* variants`: about 18 fish differ only in colour; only distinct, nameable ones are used
- `sea-squidflat`: second squid drawing (flat) — squid uses sea-squid
- `sea-cockle`: round tiled shell — not identified


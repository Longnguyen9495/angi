# Farm source art

Ảnh gốc của nông trại, không được phục vụ trực tiếp. Các script trong `scripts/` cắt, ghép rồi ghi kết quả vào `public/`.

- `pack-v4/`: bộ đang dùng. Tranh màu (`15_NEW_REFERENCE_AND_SPRITE_SHEET/MASTER_REFERENCE_COLORFUL_FLOATING_FARM.png`) là nền của cảnh 2D. Đọc bởi `scripts/farm-anim/prepare.mjs`, `scripts/farm-anim/split-sprite-sheet.mjs` (ghi `16_EXTRACTED_SPRITES/`) và `scripts/farm2d/prepare.mjs`.
- `pack-v4-sprites/`: các sprite tách tự động từ bộ v4. Không dùng (lõi trắng của mây và gà bị thủng), chỉ giữ để tham khảo.

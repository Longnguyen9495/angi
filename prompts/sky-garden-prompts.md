# Prompt ảnh cho Vườn Mây

Prompt AI cho phần hình còn thiếu của Vườn Mây (plans/vuon-may.md §7.4, §0.7, §0.14), viết theo cách của
[garden-sprite-prompts.md](garden-sprite-prompts.md). Sinh xong: tách nền, đặt file gốc vào
`assets/sky-garden/source/` kèm ghi chú nguồn, rồi chạy `npm run sky:pots` (chậu) hoặc chuyển về WebP
trong suốt cho cây/máy/bọ.

**Quyền sử dụng (Q6):** hình sinh từ các prompt này là hình mới, phải ghi rõ công cụ, tài khoản và điều khoản
dùng thương mại của công cụ trong `assets/sky-garden/README.md` trước khi đưa vào bản phát hành. Không đưa
`5.png`/`6.png` (ảnh tham chiếu) vào làm ảnh đầu vào, không cắt nhân vật/UI từ đó. Bộ chưa đủ 6 chậu thì để
trạng thái chưa hoàn thiện; không ghép tạm hình khác vào cho đủ.

**Phong cách chung:** chậu men bóng viền vàng là trung tâm (theo 4 chậu gốc); cây vẽ như sprite nông trại,
không mặt, không chibi; nền trong suốt; phối cảnh 3/4 từ trên xuống khoảng 20°; miệng đất lộ rõ để
`prepare-pots.mjs` tìm được miệng chậu.

## 1. Chậu theo bộ

ID chậu mới đặt khi hình được duyệt (thêm vào `src/data/skyGarden.ts` và `npm run sky:pots`); prompt dưới
chỉ mô tả hình. "Chậu Quả Đỏ" (`redfruit`) giữ nguyên, không gán lại là quả gì.

### Bộ Đất nung (`clay`) — còn thiếu 6

Six starter pots, each a different classic Vietnamese terracotta shape: 1) a round-bellied jar (chum) 2) a wide shallow basin 3) a lotus-petal rim pot 4) a tall cylinder with incised rings 5) a pot with two small loop handles 6) a square pot with a pressed tile pattern.

```text
{POT SHAPE FROM THE LIST ABOVE}. Unglazed terracotta flower pot (đất nung) for a cozy farming game: warm orange-brown fired clay, slightly rough matte surface, simple hand-pressed pattern, NO gold, a thin band of darker clay at the rim, open top showing dark moist soil filling the mouth (soil surface clearly visible as an ellipse), 3/4 view from about 20 degrees above, centered, the pot bottom touching the lower edge at 4% margin, whole pot visible. Painterly semi-realistic game asset matching the glossy pot set in scale and lighting (soft studio light from the upper left) but humbler, the starter tier. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text, no characters, no faces. Square 1024x1024.
```

### Bộ Bàn Ăn Việt (`table`) — còn thiếu 3

The set has a phở bowl, a teapot and a bánh chưng pot. Three more in the same spirit: 1) a nón lá (conical hat) shaped pot 2) a rice-cooker / clay cooking pot (nồi đất) pot 3) a pot shaped like a bowl of bánh xèo / spring rolls on a tray.

```text
{POT SHAPE FROM THE LIST ABOVE}. Glossy glazed ceramic flower pot for a cozy farming game, gold rim and gold trim, small white flowers and a few green leaves tucked at the base, soft sparkle highlights, open top showing dark moist soil filling the mouth (the soil surface clearly visible as an ellipse), 3/4 view from about 20 degrees above, centered, the pot bottom touching the lower edge at 4% margin, whole pot visible. Painterly semi-realistic game asset, soft studio light from the upper left, same scale and style as the existing set (pumpkin, corn, cabbage, eggplant pots). Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text, no characters, no faces. Square 1024x1024.
```

### Bộ Chợ Quê (`market`) — còn thiếu 4

The set has the bamboo basket and the bamboo pot. Four more: 1) a woven rattan market basket pot 2) a shoulder-pole (đòn gánh) twin basket pot 3) a fish-sauce clay jar pot 4) a wooden rice-measure box pot.

```text
{POT SHAPE FROM THE LIST ABOVE}. Glossy glazed ceramic flower pot for a cozy farming game, gold rim and gold trim, small white flowers and a few green leaves tucked at the base, soft sparkle highlights, open top showing dark moist soil filling the mouth (the soil surface clearly visible as an ellipse), 3/4 view from about 20 degrees above, centered, the pot bottom touching the lower edge at 4% margin, whole pot visible. Painterly semi-realistic game asset, soft studio light from the upper left, same scale and style as the existing set (pumpkin, corn, cabbage, eggplant pots). Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text, no characters, no faces. Square 1024x1024.
```

### Bộ Biển Miền Trung (`sea`) — còn thiếu 2

The set has coconut, crab, porcelain fish and seashell pots. Two more: 1) a round basket boat (thúng chai) pot 2) a lighthouse-and-wave pot.

```text
{POT SHAPE FROM THE LIST ABOVE}. Glossy glazed ceramic flower pot for a cozy farming game, gold rim and gold trim, small white flowers and a few green leaves tucked at the base, soft sparkle highlights, open top showing dark moist soil filling the mouth (the soil surface clearly visible as an ellipse), 3/4 view from about 20 degrees above, centered, the pot bottom touching the lower edge at 4% margin, whole pot visible. Painterly semi-realistic game asset, soft studio light from the upper left, same scale and style as the existing set (pumpkin, corn, cabbage, eggplant pots). Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text, no characters, no faces. Square 1024x1024.
```

### Bộ Lễ Tết (`festival`) — còn thiếu 2

The set has mooncake, golden dragon, peach blossom and lotus pots. Two more: 1) a red lantern (đèn lồng) pot 2) a lucky red envelope (lì xì) and firecracker pot.

```text
{POT SHAPE FROM THE LIST ABOVE}. Glossy glazed ceramic flower pot for a cozy farming game, gold rim and gold trim, small white flowers and a few green leaves tucked at the base, soft sparkle highlights, open top showing dark moist soil filling the mouth (the soil surface clearly visible as an ellipse), 3/4 view from about 20 degrees above, centered, the pot bottom touching the lower edge at 4% margin, whole pot visible. Painterly semi-realistic game asset, soft studio light from the upper left, same scale and style as the existing set (pumpkin, corn, cabbage, eggplant pots). Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text, no characters, no faces. Square 1024x1024.
```

## 2. Cây mây (15 cây × 4 giai đoạn)

Tên file: `public/images/sky-garden/plants/<cây>-<giai đoạn>.webp` (sprout, young, flowering, ready), 256×256.
Hiện cây mây đang mượn sprite rau nông trại (`SKY_CROPS[...].sprite`), nên đây là phần thay thế.

### jasmine-sprout.webp

```text
An Arabian jasmine shrub (hoa nhài, Jasminum sambac): a tiny seedling just emerged, two first leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### jasmine-young.webp

```text
An Arabian jasmine shrub (hoa nhài, Jasminum sambac): a young plant, only leaves, no flowers or fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### jasmine-flowering.webp

```text
An Arabian jasmine shrub (hoa nhài, Jasminum sambac): a mature plant in bloom, flowers visible, no ripe fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### jasmine-ready.webp

```text
An Arabian jasmine shrub (hoa nhài, Jasminum sambac): fully grown and ready to harvest: covered in fragrant white star-shaped jasmine buds and open flowers. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### mint-sprout.webp

```text
A Vietnamese mint plant (bạc hà): a tiny seedling just emerged, two first leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### mint-young.webp

```text
A Vietnamese mint plant (bạc hà): a young plant, only leaves, no flowers or fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### mint-flowering.webp

```text
A Vietnamese mint plant (bạc hà): a mature plant in bloom, flowers visible, no ripe fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### mint-ready.webp

```text
A Vietnamese mint plant (bạc hà): fully grown and ready to harvest: a lush bushy clump of bright green serrated mint leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### kumquat-sprout.webp

```text
A small kumquat tree (cây tắc / quất): a tiny seedling just emerged, two first leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### kumquat-young.webp

```text
A small kumquat tree (cây tắc / quất): a young plant, only leaves, no flowers or fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### kumquat-flowering.webp

```text
A small kumquat tree (cây tắc / quất): a mature plant in bloom, flowers visible, no ripe fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### kumquat-ready.webp

```text
A small kumquat tree (cây tắc / quất): fully grown and ready to harvest: many small round glossy orange kumquats among dark green leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### lotus-sprout.webp

```text
A pink lotus (sen) in a shallow water bowl effect: a tiny seedling just emerged, two first leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### lotus-young.webp

```text
A pink lotus (sen) in a shallow water bowl effect: a young plant, only leaves, no flowers or fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### lotus-flowering.webp

```text
A pink lotus (sen) in a shallow water bowl effect: a mature plant in bloom, flowers visible, no ripe fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### lotus-ready.webp

```text
A pink lotus (sen) in a shallow water bowl effect: fully grown and ready to harvest: a large pink lotus flower and a green lotus seed pod above round leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### rose-sprout.webp

```text
A small rose bush (hoa hồng): a tiny seedling just emerged, two first leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### rose-young.webp

```text
A small rose bush (hoa hồng): a young plant, only leaves, no flowers or fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### rose-flowering.webp

```text
A small rose bush (hoa hồng): a mature plant in bloom, flowers visible, no ripe fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### rose-ready.webp

```text
A small rose bush (hoa hồng): fully grown and ready to harvest: several deep red rose blooms and buds. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### tea-sprout.webp

```text
A young tea bush (cây chè, Camellia sinensis): a tiny seedling just emerged, two first leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### tea-young.webp

```text
A young tea bush (cây chè, Camellia sinensis): a young plant, only leaves, no flowers or fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### tea-flowering.webp

```text
A young tea bush (cây chè, Camellia sinensis): a mature plant in bloom, flowers visible, no ripe fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### tea-ready.webp

```text
A young tea bush (cây chè, Camellia sinensis): fully grown and ready to harvest: fresh light-green tender tea shoots, two leaves and a bud, ready to pick. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### coffee-sprout.webp

```text
A young coffee shrub (cây cà phê, robusta): a tiny seedling just emerged, two first leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### coffee-young.webp

```text
A young coffee shrub (cây cà phê, robusta): a young plant, only leaves, no flowers or fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### coffee-flowering.webp

```text
A young coffee shrub (cây cà phê, robusta): a mature plant in bloom, flowers visible, no ripe fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### coffee-ready.webp

```text
A young coffee shrub (cây cà phê, robusta): fully grown and ready to harvest: clusters of ripe red coffee cherries along the branches. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### chrysanthemum-sprout.webp

```text
A yellow chrysanthemum plant (cúc vàng): a tiny seedling just emerged, two first leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### chrysanthemum-young.webp

```text
A yellow chrysanthemum plant (cúc vàng): a young plant, only leaves, no flowers or fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### chrysanthemum-flowering.webp

```text
A yellow chrysanthemum plant (cúc vàng): a mature plant in bloom, flowers visible, no ripe fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### chrysanthemum-ready.webp

```text
A yellow chrysanthemum plant (cúc vàng): fully grown and ready to harvest: many round golden-yellow chrysanthemum flowers. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### pepper-sprout.webp

```text
A black pepper vine (hồ tiêu) on a small stake: a tiny seedling just emerged, two first leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### pepper-young.webp

```text
A black pepper vine (hồ tiêu) on a small stake: a young plant, only leaves, no flowers or fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### pepper-flowering.webp

```text
A black pepper vine (hồ tiêu) on a small stake: a mature plant in bloom, flowers visible, no ripe fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### pepper-ready.webp

```text
A black pepper vine (hồ tiêu) on a small stake: fully grown and ready to harvest: hanging spikes of green and red peppercorns. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### orchid-sprout.webp

```text
A phalaenopsis orchid (lan hồ điệp) with a support stick: a tiny seedling just emerged, two first leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### orchid-young.webp

```text
A phalaenopsis orchid (lan hồ điệp) with a support stick: a young plant, only leaves, no flowers or fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### orchid-flowering.webp

```text
A phalaenopsis orchid (lan hồ điệp) with a support stick: a mature plant in bloom, flowers visible, no ripe fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### orchid-ready.webp

```text
A phalaenopsis orchid (lan hồ điệp) with a support stick: fully grown and ready to harvest: an arching spray of white-and-pink orchid flowers. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### peach-sprout.webp

```text
A small Vietnamese peach blossom tree (hoa đào, bonsai size): a tiny seedling just emerged, two first leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### peach-young.webp

```text
A small Vietnamese peach blossom tree (hoa đào, bonsai size): a young plant, only leaves, no flowers or fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### peach-flowering.webp

```text
A small Vietnamese peach blossom tree (hoa đào, bonsai size): a mature plant in bloom, flowers visible, no ripe fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### peach-ready.webp

```text
A small Vietnamese peach blossom tree (hoa đào, bonsai size): fully grown and ready to harvest: branches covered in soft pink peach blossoms for Tết. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### apricot-sprout.webp

```text
A small yellow apricot blossom tree (hoa mai, bonsai size): a tiny seedling just emerged, two first leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### apricot-young.webp

```text
A small yellow apricot blossom tree (hoa mai, bonsai size): a young plant, only leaves, no flowers or fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### apricot-flowering.webp

```text
A small yellow apricot blossom tree (hoa mai, bonsai size): a mature plant in bloom, flowers visible, no ripe fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### apricot-ready.webp

```text
A small yellow apricot blossom tree (hoa mai, bonsai size): fully grown and ready to harvest: branches covered in bright yellow five-petal mai flowers for Tết. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### vanilla-sprout.webp

```text
A vanilla orchid vine on a small stake: a tiny seedling just emerged, two first leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### vanilla-young.webp

```text
A vanilla orchid vine on a small stake: a young plant, only leaves, no flowers or fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### vanilla-flowering.webp

```text
A vanilla orchid vine on a small stake: a mature plant in bloom, flowers visible, no ripe fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### vanilla-ready.webp

```text
A vanilla orchid vine on a small stake: fully grown and ready to harvest: pale green-yellow vanilla flowers and long green vanilla pods. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### saffron-sprout.webp

```text
A small clump of saffron crocus: a tiny seedling just emerged, two first leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### saffron-young.webp

```text
A small clump of saffron crocus: a young plant, only leaves, no flowers or fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### saffron-flowering.webp

```text
A small clump of saffron crocus: a mature plant in bloom, flowers visible, no ripe fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### saffron-ready.webp

```text
A small clump of saffron crocus: fully grown and ready to harvest: purple crocus flowers with three bright red saffron threads each. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### beanstalk-sprout.webp

```text
A magic beanstalk sprout (cây đậu thần) curling upward: a tiny seedling just emerged, two first leaves. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### beanstalk-young.webp

```text
A magic beanstalk sprout (cây đậu thần) curling upward: a young plant, only leaves, no flowers or fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### beanstalk-flowering.webp

```text
A magic beanstalk sprout (cây đậu thần) curling upward: a mature plant in bloom, flowers visible, no ripe fruit yet. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

### beanstalk-ready.webp

```text
A magic beanstalk sprout (cây đậu thần) curling upward: fully grown and ready to harvest: a tall spiralling green beanstalk with heart-shaped leaves and one glowing cloud-white bean pod. Semi-realistic painterly game asset sprite, soft studio light from the upper left, side view, centered horizontally, the plant base sits on the bottom edge at 4% margin (no soil, no pot, no ground: it will stand in a pot), whole plant fully visible, no face, no characters. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024, consistent scale across the series (a mature plant fills about 70% of the height).
```

## 3. Máy (4)

Tên file: `public/images/sky-garden/machines/<máy>.webp`, 256×256. Không theo phong cách chibi của `6.png`
(D10); nếu muốn máy chibi thì chốt riêng trước khi vẽ.

### tea.webp

```text
Bếp trà: a small charcoal tea stove with a clay kettle and a bamboo drying tray of jasmine. A small workshop machine standing at the left end of a cloud shelf in a cozy farming game, semi-realistic painterly style matching glossy gold-trimmed ceramic pots, warm wood and brass, NOT chibi, no face, no characters, 3/4 view from about 20 degrees above, centered, standing on the lower edge at 4% margin, whole object visible. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024.
```

### pot.webp

```text
Nồi chè: a copper sweet-soup pot on a little brick stove, a wooden ladle resting on the rim. A small workshop machine standing at the left end of a cloud shelf in a cozy farming game, semi-realistic painterly style matching glossy gold-trimmed ceramic pots, warm wood and brass, NOT chibi, no face, no characters, 3/4 view from about 20 degrees above, centered, standing on the lower edge at 4% margin, whole object visible. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024.
```

### still.webp

```text
Máy chưng sương: a glass and brass dew still with a coiled copper tube and a small bottle collecting clear drops. A small workshop machine standing at the left end of a cloud shelf in a cozy farming game, semi-realistic painterly style matching glossy gold-trimmed ceramic pots, warm wood and brass, NOT chibi, no face, no characters, 3/4 view from about 20 degrees above, centered, standing on the lower edge at 4% margin, whole object visible. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024.
```

### phin.webp

```text
Bàn phin: a small wooden stand with three Vietnamese phin coffee filters dripping into glass cups. A small workshop machine standing at the left end of a cloud shelf in a cozy farming game, semi-realistic painterly style matching glossy gold-trimmed ceramic pots, warm wood and brass, NOT chibi, no face, no characters, 3/4 view from about 20 degrees above, centered, standing on the lower edge at 4% margin, whole object visible. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow on the background, no text. Square 1024x1024.
```

## 4. Bọ (7)

Tên file: `public/images/sky-garden/bugs/<bọ>.webp`, 128×128. Hiện bọ vẽ bằng Canvas (`src/features/sky-garden/art.ts`);
hình thay thế phải đọc rõ ở 28–40 px.

### ladybug.webp

```text
a red ladybug with black spots. Cute but natural-looking insect sprite for a cozy farming game (no face drawn on it, no cartoon eyes beyond natural ones), semi-realistic painterly style, top-down 3/4 view, wings slightly open, centered with 12% margin, soft light from the upper left. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow, no text. Square 512x512.
```

### bee.webp

```text
a fuzzy honeybee. Cute but natural-looking insect sprite for a cozy farming game (no face drawn on it, no cartoon eyes beyond natural ones), semi-realistic painterly style, top-down 3/4 view, wings slightly open, centered with 12% margin, soft light from the upper left. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow, no text. Square 512x512.
```

### caterpillar.webp

```text
a plump green caterpillar curled on a leaf edge. Cute but natural-looking insect sprite for a cozy farming game (no face drawn on it, no cartoon eyes beyond natural ones), semi-realistic painterly style, top-down 3/4 view, wings slightly open, centered with 12% margin, soft light from the upper left. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow, no text. Square 512x512.
```

### butterfly.webp

```text
a blue-and-white butterfly. Cute but natural-looking insect sprite for a cozy farming game (no face drawn on it, no cartoon eyes beyond natural ones), semi-realistic painterly style, top-down 3/4 view, wings slightly open, centered with 12% margin, soft light from the upper left. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow, no text. Square 512x512.
```

### dragonfly.webp

```text
a slim teal dragonfly with clear wings. Cute but natural-looking insect sprite for a cozy farming game (no face drawn on it, no cartoon eyes beyond natural ones), semi-realistic painterly style, top-down 3/4 view, wings slightly open, centered with 12% margin, soft light from the upper left. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow, no text. Square 512x512.
```

### firefly.webp

```text
a firefly with a softly glowing yellow tail (night bug). Cute but natural-looking insect sprite for a cozy farming game (no face drawn on it, no cartoon eyes beyond natural ones), semi-realistic painterly style, top-down 3/4 view, wings slightly open, centered with 12% margin, soft light from the upper left. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow, no text. Square 512x512.
```

### goldbeetle.webp

```text
a rare shiny golden scarab beetle. Cute but natural-looking insect sprite for a cozy farming game (no face drawn on it, no cartoon eyes beyond natural ones), semi-realistic painterly style, top-down 3/4 view, wings slightly open, centered with 12% margin, soft light from the upper left. Transparent background (or perfectly flat #FF00FF if transparency is unsupported), no shadow, no text. Square 512x512.
```


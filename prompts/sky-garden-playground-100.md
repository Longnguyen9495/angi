# Vườn Mây: 102 chậu và toàn bộ vật phẩm, chia lượt cho Playground

Tiếp theo [sky-garden-playground.md](sky-garden-playground.md) (Bước 1 đã làm tầng mẫu và 6 chậu đất nung). Danh
mục dựa trên plans/vuon-may.md: §4.2 (chậu, 6 chậu một bộ khớp 6 ô một tầng), §4.3 (cây), §4.4 (bọ), §4.5 (máy),
§4.6 (đơn, khinh khí cầu), §4.7 (trang trí), §7.4 (art cần vẽ), §17.4 (trợ thủ), §18.2 (cảnh, HUD).

## Cách dán

- Dán vào khung chat của game "Vuon May" trên Playground, **mỗi lần một lượt**, khoảng 12–18 hình. Gộp nhiều lượt
  thì hình dễ lệch phong cách và dễ hết lượt dùng (nút "Usage").
- Mỗi lượt đã tự chứa câu nhắc luật, nên không cần dán thêm gì.
- Hình nào lệch thì sửa riêng hình đó, ví dụ: `Regenerate [pot-mango]: thinner gold rim, soil fully opaque.`
- Hết lượt dùng trong ngày thì dừng ở lượt đang làm, hôm sau làm tiếp. Danh sách có đánh số để biết đang ở đâu.

## Tổng quan

| Nhóm | Số hình | Lượt |
|---|---|---|
| Chậu: 17 bộ × 6 (bộ Đất nung đã xong ở Bước 1) | 96 còn lại | L01–L08 |
| Cây mây: 14 cây × 4 giai đoạn (nhài đã xong) | 56 | L09–L13 |
| Bọ: 7 loài × 2 khung đập cánh | 13 (bọ rùa đã có khung a) | L14 |
| Máy, khinh khí cầu, thùng hàng, cú đưa thư | 10 | L15 |
| Cảnh: kệ 4 màu, khóa ô, cờ tầng, Cung Mây, nền, mầm đậu | 22 | L16–L17 |
| Trang trí mây và đồ treo dưới kệ | 13 | L18 |
| Trợ thủ (sau MVP, chỉ để ngắm) | 4 | L19 |
| Icon: vật phẩm, nông sản mây, thành phẩm | 28 | L20 |
| Icon: bậc chậu, huy hiệu 17 bộ, HUD, sao | 42 | L21–L22 |
| Hiệu ứng | 8 | L23 |
| **Tổng** | **khoảng 290** | 23 lượt |

### 17 bộ chậu

Bậc gốc của bộ quyết định **vật liệu viền, cổ và chân chậu**. Dáng và màu thân chậu thể hiện chủ đề.

| # | Bộ (ID gợi ý) | Bậc | Viền / cổ / chân | 6 chậu |
|---|---|---|---|---|
| 1 | Đất nung `clay` | 0 | đất nung men nâu cam, viền vàng mảnh | đã xong ở Bước 1 |
| 2 | Nông Sản `produce` | 2 | men ngọc celadon | bí ngô, bắp, bắp cải, cà tím, dưa hấu, táo đỏ |
| 3 | Chợ Quê `market` | 1 | sứ men lam Bát Tràng | giỏ tre, chậu tre, nón lá, gánh hàng, thúng gạo, chum tương |
| 4 | Biển Miền Trung `sea` | 2 | men ngọc celadon | dừa, cua, cá sứ, vỏ sò, mực nang, thúng chai |
| 5 | Bàn Ăn Việt `table` | 3 | đỏ son thếp vàng | phở, ấm trà, bánh chưng, bánh xèo, chả giò, canh chua |
| 6 | Lễ Tết `festival` | 4 | sơn mài đen-đỏ khảm xà cừ | bánh trung thu, rồng vàng, hoa đào, hoa sen, đèn lồng, lì xì |
| 7 | Trái Cây Miệt Vườn `orchard` | 2 | men ngọc celadon | thanh long, xoài, sầu riêng, chôm chôm, măng cụt, bưởi |
| 8 | Cà Phê & Nước `drinks` | 1 | sứ men lam | phin, cà phê trứng, nước mía, trà đá, sữa đậu nành, sinh tố bơ |
| 9 | Quà Vặt Phố `street` | 1 | sứ men lam | bánh mì, bánh tráng nướng, xôi lá chuối, bánh bao, gỏi cuốn, khoai lang nướng |
| 10 | Bún Phở Ba Miền `noodle` | 3 | đỏ son thếp vàng | bún bò Huế, bún chả, mì Quảng, hủ tiếu, cao lầu, bánh canh |
| 11 | Cơm & Xôi `rice` | 2 | men ngọc celadon | cơm tấm, xôi gấc, cơm lam, cơm niêu, bánh cuốn, cơm hến |
| 12 | Chè & Bánh Ngọt `sweets` | 3 | đỏ son thếp vàng | chè ba màu, bánh flan, bánh bò, bánh da lợn, chè trôi nước, kem dừa |
| 13 | Bếp Nhà `kitchen` | 1 | sứ men lam | nồi cơm điện cổ, bếp lò, cối đá, mâm đồng, rổ rá, chai nước mắm |
| 14 | Hoa Đà Lạt `dalat` | 2 | men ngọc celadon | cẩm tú cầu, dã quỳ, mimosa, oải hương, giỏ dâu tây, quả thông |
| 15 | Làng Quê `village` | 1 | sứ men lam | cổng làng, nhà tranh, guồng nước, đống rơm, giếng làng, cây đa |
| 16 | Đồ Chơi Tuổi Thơ `toys` | 3 | đỏ son thếp vàng | đèn ông sao, trống bỏi, chong chóng, diều, con quay, lọ bi ve |
| 17 | Cung Mây `palace` | 4 | sơn mài đen-đỏ khảm xà cừ | lâu đài mây, cầu vồng, trăng khuyết, sao băng, hạc giấy, Mây Ngọc |

Chậu `redfruit` (Chậu Quả Đỏ) giữ hình cũ làm chậu dự phòng, không vẽ lại.

ID chậu cũ giữ nguyên: `pumpkin corn cabbage eggplant watermelon red_apple pho_bowl teapot banh_chung bamboo_basket
bamboo coconut crab porcelain_fish seashell mooncake golden_dragon peach_blossom lotus`. Các ID khác là ID mới, phải
thêm vào `src/data/skyGarden.ts` khi nhập hình.

---

## Chậu (L01–L08)

### L01. Nông Sản + Chợ Quê

```text
Add these new pot assets. Same rules as the approved round: match the reference images and the approved clay pots in rendering quality; transparent PNG, no glow or sparkles outside the outline, 3/4 view from 20 degrees above, light from the upper left, the soil in the mouth is an opaque dark-brown ellipse with no holes, small white flowers and leaves tucked at the base, no faces, no text, one pot per image, 1024x1024, 4% margin. Within a set, the rim, neck and foot use the same tier material.

SET "Produce" (tier jade): body sculpted and glazed like the produce in its natural colours; rim, leaf collar and foot in pale celadon jade glaze with thin gold edges.
[pot-pumpkin] orange pumpkin. [pot-corn] ear of corn standing in its husk. [pot-cabbage] round green cabbage. [pot-eggplant] purple eggplant lying on its side. [pot-watermelon] striped watermelon. [pot-red_apple] shiny red apple.

SET "Village Market" (tier porcelain): rim, collar and foot in white Bát Tràng porcelain with cobalt-blue patterns.
[pot-bamboo_basket] woven bamboo basket. [pot-bamboo] pot built from green bamboo segments. [pot-non_la] upside-down conical palm-leaf hat (nón lá). [pot-shoulder_pole] two small round baskets hanging from a shoulder pole (đòn gánh), drawn as one pot, soil in both baskets. [pot-rice_basket] woven basket (thúng) brimming with rice grains around the soil. [pot-sauce_jar] round brown glazed soybean-sauce jar (chum tương).
```

### L02. Biển Miền Trung + Bàn Ăn Việt

```text
Add these new pot assets. Same rules as the approved round: match the reference images and the approved clay pots in rendering quality; transparent PNG, no glow or sparkles outside the outline, 3/4 view from 20 degrees above, light from the upper left, the soil in the mouth is an opaque dark-brown ellipse with no holes, small white flowers and leaves tucked at the base, no faces, no text, one pot per image, 1024x1024, 4% margin. Within a set, the rim, neck and foot use the same tier material.

SET "Central Coast" (tier jade): rim, collar and foot in pale celadon jade glaze with thin gold edges.
[pot-coconut] half green coconut. [pot-crab] red crab hugging the pot with its claws (stylised shell, no eyes or face). [pot-porcelain_fish] blue-and-white porcelain fish curled around the pot. [pot-seashell] large cream scallop shell. [pot-cuttlefish] smooth cuttlefish-shaped body with wavy fins (no eyes or face). [pot-basket_boat] round woven basket boat (thúng chai).

SET "Vietnamese Table" (tier gold): rim, collar and foot in red lacquer with gold-leaf trim (sơn son thếp vàng).
[pot-pho_bowl] phở bowl with a rooster painted on it and chopsticks resting on the rim. [pot-teapot] round lotus teapot. [pot-banh_chung] square bánh chưng wrapped in green dong leaves and bamboo string. [pot-banh_xeo] round tray with a folded golden bánh xèo around the soil. [pot-spring_rolls] platter of crispy chả giò rolls with herbs around the soil. [pot-canh_chua] small clay pot of sour soup decorated with pineapple, tomato and herbs.
```

### L03. Lễ Tết + Trái Cây Miệt Vườn

```text
Add these new pot assets. Same rules as the approved round: match the reference images and the approved clay pots in rendering quality; transparent PNG, no glow or sparkles outside the outline, 3/4 view from 20 degrees above, light from the upper left, the soil in the mouth is an opaque dark-brown ellipse with no holes, small white flowers and leaves tucked at the base, no faces, no text, one pot per image, 1024x1024, 4% margin. Within a set, the rim, neck and foot use the same tier material.

SET "Festival" (tier legendary): rim, collar and foot in black-and-red lacquer inlaid with mother-of-pearl (sơn mài khảm xà cừ), the richest set.
[pot-mooncake] mid-autumn mooncake with a pressed flower pattern. [pot-golden_dragon] pot wrapped by a gentle golden dragon (friendly, not scary). [pot-peach_blossom] pot painted with pink peach blossom branches. [pot-lotus] pink lotus petals forming the pot. [pot-lantern] round red silk lantern with gold tassels. [pot-li_xi] red lucky envelopes and a string of red firecrackers around the pot.

SET "Mekong Orchard" (tier jade): body shaped and coloured like the fruit; rim, collar and foot in pale celadon jade with thin gold edges.
[pot-dragon_fruit] pink dragon fruit with green-tipped scales. [pot-mango] ripe yellow mango. [pot-durian] spiky green durian. [pot-rambutan] red hairy rambutan. [pot-mangosteen] dark purple mangosteen with its green crown as the rim. [pot-pomelo] big green pomelo.
```

### L04. Cà Phê & Nước + Quà Vặt Phố

```text
Add these new pot assets. Same rules as the approved round: match the reference images and the approved clay pots in rendering quality; transparent PNG, no glow or sparkles outside the outline, 3/4 view from 20 degrees above, light from the upper left, the soil in the mouth is an opaque dark-brown ellipse with no holes, small white flowers and leaves tucked at the base, no faces, no text, one pot per image, 1024x1024, 4% margin. Within a set, the rim, neck and foot use the same tier material.

SET "Coffee & Drinks" (tier porcelain): the drink's cup or glass forms the pot; rim and foot in white Bát Tràng porcelain with cobalt-blue patterns.
[pot-phin] metal phin coffee filter sitting on a porcelain cup. [pot-egg_coffee] cup of egg coffee with a creamy top. [pot-sugarcane] tall glass of sugarcane juice with cane sticks. [pot-iced_tea] glass of trà đá. [pot-soy_milk] glass bottle of soy milk. [pot-avocado_smoothie] glass of green avocado smoothie.

SET "Street Snacks" (tier porcelain): rim, collar and foot in white Bát Tràng porcelain with cobalt-blue patterns.
[pot-banh_mi] crusty bánh mì loaf split open along the top. [pot-banh_trang] folded grilled rice paper on a tiny charcoal grill. [pot-xoi_la] sticky rice wrapped in a banana leaf. [pot-banh_bao] white steamed bun opened at the top. [pot-goi_cuon] small plate of fresh spring rolls. [pot-sweet_potato] roasted sweet potato half-wrapped in paper.
```

### L05. Bún Phở Ba Miền + Cơm & Xôi

```text
Add these new pot assets. Same rules as the approved round: match the reference images and the approved clay pots in rendering quality; transparent PNG, no glow or sparkles outside the outline, 3/4 view from 20 degrees above, light from the upper left, the soil in the mouth is an opaque dark-brown ellipse with no holes, small white flowers and leaves tucked at the base, no faces, no text, one pot per image, 1024x1024, 4% margin. Within a set, the rim, neck and foot use the same tier material.

SET "Noodles of Three Regions" (tier gold): each pot is a different bowl shape; rim, collar and foot in red lacquer with gold-leaf trim.
[pot-bun_bo_hue] deep bowl with red chili-oil patterns and lemongrass. [pot-bun_cha] bowl with grilled pork patties on a small grill rack. [pot-mi_quang] wide shallow turmeric-yellow bowl with a sesame rice cracker. [pot-hu_tieu] Southern-style bowl with shrimp. [pot-cao_lau] Hội An bowl painted with lanterns. [pot-banh_canh] bowl of thick noodles with a crab claw on the rim.

SET "Rice & Sticky Rice" (tier jade): rim, collar and foot in pale celadon jade with thin gold edges.
[pot-com_tam] plate of broken rice with a grilled pork chop. [pot-xoi_gac] red gấc sticky rice in a banana-leaf cup. [pot-com_lam] rice cooked in a bamboo tube standing upright. [pot-com_nieu] small black clay rice pot (cơm niêu). [pot-banh_cuon] steamer pot covered with a cloth for bánh cuốn. [pot-com_hen] Huế bowl of clam rice with herbs.
```

### L06. Chè & Bánh Ngọt + Bếp Nhà

```text
Add these new pot assets. Same rules as the approved round: match the reference images and the approved clay pots in rendering quality; transparent PNG, no glow or sparkles outside the outline, 3/4 view from 20 degrees above, light from the upper left, the soil in the mouth is an opaque dark-brown ellipse with no holes, small white flowers and leaves tucked at the base, no faces, no text, one pot per image, 1024x1024, 4% margin. Within a set, the rim, neck and foot use the same tier material.

SET "Sweets" (tier gold): rim, collar and foot in red lacquer with gold-leaf trim.
[pot-che_ba_mau] tall glass of three-colour sweet soup in layers. [pot-banh_flan] caramel flan cup. [pot-banh_bo] honeycomb rice cake. [pot-banh_da_lon] layered green-and-yellow pandan cake. [pot-che_troi_nuoc] bowl of glutinous rice balls in ginger syrup. [pot-kem_dua] coconut ice cream served in a coconut-shell bowl.

SET "Home Kitchen" (tier porcelain): rim, collar and foot in white Bát Tràng porcelain with cobalt-blue patterns.
[pot-rice_cooker] retro flower-patterned rice cooker with the lid off. [pot-clay_stove] small clay charcoal stove (bếp lò). [pot-mortar] stone mortar with a wooden pestle leaning on it. [pot-copper_tray] round brass serving tray (mâm đồng) with a raised rim. [pot-rice_sieve] stack of woven bamboo baskets (rổ rá). [pot-fish_sauce] wide fish-sauce jar with a wooden lid leaning on it.
```

### L07. Hoa Đà Lạt + Làng Quê

```text
Add these new pot assets. Same rules as the approved round: match the reference images and the approved clay pots in rendering quality; transparent PNG, no glow or sparkles outside the outline, 3/4 view from 20 degrees above, light from the upper left, the soil in the mouth is an opaque dark-brown ellipse with no holes, small white flowers and leaves tucked at the base, no faces, no text, one pot per image, 1024x1024, 4% margin. Within a set, the rim, neck and foot use the same tier material.

SET "Đà Lạt Flowers" (tier jade): pots sculpted as the flower or fruit; rim, collar and foot in pale celadon jade with thin gold edges.
[pot-hydrangea] blue-violet hydrangea blooms forming the pot. [pot-wild_sunflower] yellow wild sunflowers (dã quỳ) around the pot. [pot-mimosa] fluffy yellow mimosa clusters. [pot-lavender] purple lavender stalks woven into the pot. [pot-strawberry] basket of Đà Lạt strawberries. [pot-pine_cone] large brown pine cone.

SET "Countryside Village" (tier porcelain): pots shaped like village landmarks; rim, collar and foot in white Bát Tràng porcelain with cobalt-blue patterns.
[pot-village_gate] old village gate with a tiled roof, the soil behind it. [pot-thatched_house] small thatched-roof cottage with the roof open as the pot mouth. [pot-water_wheel] bamboo water wheel. [pot-straw_stack] golden straw stack. [pot-village_well] round stone village well. [pot-banyan] hollow banyan trunk with aerial roots.
```

### L08. Đồ Chơi Tuổi Thơ + Cung Mây

```text
Add these new pot assets. Same rules as the approved round: match the reference images and the approved clay pots in rendering quality; transparent PNG, no glow or sparkles outside the outline, 3/4 view from 20 degrees above, light from the upper left, the soil in the mouth is an opaque dark-brown ellipse with no holes, small white flowers and leaves tucked at the base, no faces, no text, one pot per image, 1024x1024, 4% margin. Within a set, the rim, neck and foot use the same tier material.

SET "Childhood Toys" (tier gold): rim, collar and foot in red lacquer with gold-leaf trim.
[pot-star_lantern] five-point paper star lantern (đèn ông sao). [pot-rattle_drum] small rattle drum (trống bỏi) with beads on strings. [pot-pinwheel] colourful paper pinwheels around the pot. [pot-kite] diamond kite wrapped around the pot with a ribbon tail. [pot-spinning_top] wooden spinning top. [pot-marbles] glass jar of coloured marbles.

SET "Cloud Palace" (tier legendary, top floor): rim, collar and foot in black-and-red lacquer inlaid with mother-of-pearl, soft pastel cloud accents.
[pot-cloud_palace] tiny palace of clouds with golden roofs. [pot-rainbow] rainbow arching over a cloud pot. [pot-crescent_moon] pale golden crescent moon cradling the soil. [pot-shooting_star] shooting star with a pastel trail curling round. [pot-paper_crane] large folded paper crane. [pot-sky_gem] jade-green cloud-shaped gem (Mây Ngọc).
```

---

## Cây mây (L09–L13)

Mỗi cây 4 hình: `<cây>-sprout`, `<cây>-young`, `<cây>-flowering`, `<cây>-ready`.

### L09

```text
Add these plant assets. Same rules as the approved jasmine: no pot, no soil, the stem base exactly at the bottom-center of the image, all 4 stages of a plant at the same scale and baseline, transparent PNG, no glow outside the outline, light from the upper left, no faces, no text, 1024x1024. Stages: sprout = two first leaves; young = small leafy plant; flowering = in bloom, no ripe produce; ready = full harvest look described below.
[mint-*] Vietnamese mint (bạc hà): ready = lush clump of bright serrated leaves.
[kumquat-*] kumquat tree (cây quất): ready = small tree with many glossy orange kumquats.
[lotus-*] pink lotus rising from a small ring of water: ready = big pink flower and a green seed pod above round leaves.
```

### L10

```text
Add these plant assets. Same rules as the approved jasmine: no pot, no soil, the stem base exactly at the bottom-center of the image, all 4 stages of a plant at the same scale and baseline, transparent PNG, no glow outside the outline, light from the upper left, no faces, no text, 1024x1024. Stages: sprout = two first leaves; young = small leafy plant; flowering = in bloom, no ripe produce; ready = full harvest look described below.
[rose-*] rose bush: ready = several deep red roses and buds.
[tea-*] tea bush (cây chè): ready = fresh light-green shoots, two leaves and a bud.
[coffee-*] robusta coffee shrub: ready = clusters of ripe red coffee cherries along the branches.
```

### L11

```text
Add these plant assets. Same rules as the approved jasmine: no pot, no soil, the stem base exactly at the bottom-center of the image, all 4 stages of a plant at the same scale and baseline, transparent PNG, no glow outside the outline, light from the upper left, no faces, no text, 1024x1024. Stages: sprout = two first leaves; young = small leafy plant; flowering = in bloom, no ripe produce; ready = full harvest look described below.
[chrysanthemum-*] yellow chrysanthemum (cúc vàng): ready = many round golden flowers.
[pepper-*] black pepper vine on a small wooden stake: ready = hanging spikes of green and red peppercorns.
[orchid-*] phalaenopsis orchid with a support stick: ready = arching spray of white-and-pink flowers.
```

### L12

```text
Add these plant assets. Same rules as the approved jasmine: no pot, no soil, the stem base exactly at the bottom-center of the image, all 4 stages of a plant at the same scale and baseline, transparent PNG, no glow outside the outline, light from the upper left, no faces, no text, 1024x1024. Stages: sprout = two first leaves; young = small leafy plant; flowering = in bloom, no ripe produce; ready = full harvest look described below.
[peach-*] bonsai-size Nhật Tân peach tree: ready = branches covered in soft pink blossoms.
[apricot-*] bonsai-size yellow apricot tree (mai vàng): ready = branches covered in bright yellow five-petal flowers.
[vanilla-*] vanilla vine on a small stake: ready = pale green-yellow flowers and long green pods.
```

### L13

```text
Add these plant assets. Same rules as the approved jasmine: no pot, no soil, the stem base exactly at the bottom-center of the image, all 4 stages of a plant at the same scale and baseline, transparent PNG, no glow outside the outline, light from the upper left, no faces, no text, 1024x1024. Stages: sprout = two first leaves; young = small leafy plant; flowering = in bloom, no ripe produce; ready = full harvest look described below.
[saffron-*] saffron crocus clump: ready = purple flowers, each with three red threads.
[beanstalk-*] magic bean sapling with the same leaves as the giant beanstalk: ready = curling sapling holding one pale-blue cloud-shaped seed pod (a soft light inside the pod is fine).
```

---

## Bọ, máy, đơn hàng (L14–L15)

### L14. Bọ, 2 khung mỗi loài

```text
Add these bug assets, 512x512, transparent PNG, readable at 32 px, glossy cute style matching the approved ladybug, natural insect shapes with no cartoon faces, no glow outside the outline except where stated. Each bug has two frames for a wing-flap loop: frame a = wings up, frame b = wings down; same size and position in both frames.
[bug-ladybug-b] (frame b for the approved ladybug). [bug-bee-a] [bug-bee-b] fuzzy honeybee. [bug-caterpillar-a] [bug-caterpillar-b] plump green caterpillar, frame b slightly arched. [bug-butterfly-a] [bug-butterfly-b] yellow butterfly. [bug-dragonfly-a] [bug-dragonfly-b] slim teal dragonfly with clear wings. [bug-firefly-a] [bug-firefly-b] firefly with a softly lit yellow tail (a small glow on the tail is allowed). [bug-goldbeetle-a] [bug-goldbeetle-b] rare shiny golden scarab beetle.
```

### L15. Máy và đơn hàng

```text
Add these assets, 1024x1024, transparent PNG, same style as the approved tea stove, each sitting on a small cloud base so it fits the left end of a shelf, gold trim, no faces, no text, no glow outside the outline.
[machine-pot] "Nồi chè": copper sweet-soup pot on a little brick stove, wooden ladle on the rim.
[machine-still] "Máy chưng sương": glass and brass dew still with a coiled copper tube and a small bottle collecting clear drops.
[machine-phin] "Bàn phin": wooden stand with three Vietnamese phin coffee filters dripping into glass cups.
[machine-tet_box] "Hộp quà Tết": red-and-gold lacquer gift box workshop with a ribbon and a basket being packed.
[balloon] hot-air balloon with a woven basket and Vietnamese silk patterns on the envelope.
[crate-empty] [crate-filled] [crate-packed] small wooden cargo crate for the balloon: empty with the lid off; filled with produce; closed and tied with rope and a gold seal.
[owl-mail] natural-looking brown owl carrying a small letter bag (gentle, no cartoon face).
[bean-sprout-farm] the magic bean sprout as it first appears on the ground farm, small, beside a stone.
```

---

## Cảnh (L16–L17)

### L16. Kệ mây theo tầng

```text
Add these scene assets, transparent PNG, matching the approved cloud shelf exactly in size, shape and the seamless joins, only the colour changes. Each shelf has 3 pieces: left end, mid piece that tiles seamlessly left-right, right end.
[shelf-purple-left] [shelf-purple-mid] [shelf-purple-right] lavender cloud with small pink flowers.
[shelf-mint-left] [shelf-mint-mid] [shelf-mint-right] mint-green cloud with small white flowers.
[shelf-pink-left] [shelf-pink-mid] [shelf-pink-right] pink cloud with small red flowers.
[shelf-gold-left] [shelf-gold-mid] [shelf-gold-right] warm cream-gold cloud with small yellow flowers (for the top floors).
```

### L17. Phụ kiện tầng và nền

```text
Add these scene assets, transparent PNG unless stated, same style as the approved shelf and beanstalk, no text or numbers anywhere (numbers are drawn by code).
[slot-locked] small grey cloud cushion with a little gold padlock, sized to fill one pot slot, 512x512.
[slot-empty] faint dashed cloud ring marking an empty pot slot, 512x512.
[floor-banner] small blank sky-blue pennant on a short pole with a cloud emblem, to hang on the beanstalk at each floor, 512x512.
[palace-gate] "Cung Mây": an ornate gate of clouds and golden roofs that crowns the top floor, 1024x1024.
[sky-dusk] the approved sky background at sunset (warm peach and lilac), not transparent.
[sky-night] the approved sky background at night with soft stars, not transparent, no moon face.
[far-clouds] wide strip of soft distant clouds that tiles seamlessly left-right.
[far-hills] wide strip of misty green hills and a small village with a market, the view far below the tower, tiles left-right.
```

---

## Trang trí, trợ thủ (L18–L19)

### L18. Trang trí mây (§4.7, chỉ để ngắm, đặt ở hai mép tầng)

```text
Add these decoration assets, transparent PNG, same style, no faces, no text, no glow outside the outline.
1024x1024: [decor-rainbow] small rainbow arching out of a cloud puff. [decor-cloud_pillar] short cloud column with a carved stone cap. [decor-swing] wooden swing hanging from a beanstalk leaf. [decor-cloud_lantern] paper lantern shaped like a cloud on a bamboo post. [decor-paper_cranes] three folded paper cranes on strings. [decor-bird] small blue sky bird perched on a twig, natural look.
512x512, hanging under a shelf, each with a short vine string at the top: [hang-1] pink, [hang-2] white, [hang-3] yellow, [hang-4] blue, [hang-5] purple, [hang-6] red, [hang-7] orange round flower bunch.
```

### L19. Trợ thủ (§17.4, sau MVP, hiện chỉ để ngắm)

```text
Add these helper character assets, 1024x1024, transparent PNG, same glossy cute style, natural animal faces are allowed here (gentle, not chibi), no text.
[helper-sparrow] "Chim Sẻ Mây": a little sparrow with cloud-white wing tips, perched. [helper-bee] "Ong Thợ": a worker bee holding a tiny honey pot. [helper-squirrel] "Sóc Nhỏ": a small squirrel holding a bamboo basket. [helper-crane] "Hạc Giấy": a folded paper crane that looks alive, wings spread.
```

---

## Icon (L20–L22)

### L20. Vật phẩm, nông sản mây, thành phẩm

```text
Add these inventory icons, 512x512, transparent PNG, one object each, centered, no frame, no text, readable at 32 px, same style as the approved cloud seed icon.
Items: [icon-dew] small glass bottle of morning dew. [icon-gem] "Mây Ngọc": jade-green cloud-shaped gem. [icon-clover] four-leaf clover. [icon-shard] shard of celadon pottery.
Sky goods: [good-jasmine_bud] [good-mint_leaf] [good-kumquat] [good-lotus_seed] [good-lotus_flower] [good-rose] [good-tea_leaf] [good-coffee_bean] [good-chrysanthemum] [good-pepper] [good-orchid] [good-peach_branch] [good-apricot_branch] [good-vanilla] [good-saffron].
Workshop products: [good-dried_jasmine] dried jasmine in a paper bag. [good-jasmine_honey_tea] glass of jasmine honey tea. [good-kumquat_mint_honey] glass of kumquat-mint honey drink. [good-lotus_sweet_soup] bowl of lotus-seed sweet soup. [good-rose_jam] jar of rose jam. [good-lotus_tea] lotus tea in a small cup. [good-chrysanthemum_tea] chrysanthemum tea in a glass teapot. [good-coffee_milk] glass of cà phê sữa đá. [good-tet_basket] Tết gift basket.
```

### L21. Bậc chậu và huy hiệu bộ

```text
Add these UI icons, 512x512, transparent PNG, no text, readable at 32 px.
Tier rings (thin round frames to sit behind a pot icon): [tier-0] terracotta, [tier-1] blue-and-white porcelain, [tier-2] celadon jade, [tier-3] red lacquer and gold, [tier-4] black lacquer with mother-of-pearl.
Set badges (round medallions, each with a tiny emblem of its set): [set-clay] clay jar, [set-produce] pumpkin, [set-market] conical hat, [set-sea] seashell, [set-table] phở bowl, [set-festival] red lantern, [set-orchard] dragon fruit, [set-drinks] phin, [set-street] bánh mì, [set-noodle] noodle bowl with chopsticks, [set-rice] bamboo-tube rice, [set-sweets] flan, [set-kitchen] rice cooker, [set-dalat] hydrangea, [set-village] village gate, [set-toys] star lantern, [set-palace] cloud palace.
```

### L22. HUD

```text
Add these HUD icons, 512x512, transparent PNG, chunky readable shapes, same glossy style, no text.
[hud-tower] view the whole tower (stacked clouds). [hud-harvest-all] harvest the whole floor (basket with a sweep arrow). [hud-store] storage (wooden chest with a cloud). [hud-shop] shop (striped awning stall). [hud-collection] pot collection book. [hud-balloon] balloon orders. [hud-down] go down to the farm (beanstalk with a down arrow). [hud-water] watering can. [hud-seed] seed packet. [hud-net] bug net. [hud-quest] quest scroll. [hud-friends] two friends' balloons. [hud-star-full] gold star. [hud-star-empty] empty star outline. [hud-coin] gold coin with a cloud emblem. [hud-xp] cloud-blue XP gem.
```

### L23. Hiệu ứng

```text
Add these effect sprites, 512x512, transparent PNG, soft and light, no text.
[fx-poof] puff of cloud dust (for placing a pot). [fx-sparkle] small burst of gold sparkles. [fx-star] single glowing star (star-up). [fx-ripe] round bubble showing a ripe plant is ready. [fx-net] bug-net swish arc. [fx-smoke] small soft grey smoke puff (failed star-up). [fx-ribbon] set-complete ribbon segment that tiles left-right. [fx-leaf] single falling leaf.
```

---

## Sau khi xong

- Tải hết về `assets/sky-garden/source/playground-v2/`, giữ tên file trong ngoặc vuông.
- Ghi nguồn (Playground, tài khoản, ngày, ảnh mẫu đã dùng) vào `assets/sky-garden/README.md`. Vì có dùng ảnh tham
  khảo chưa rõ nguồn, toàn bộ vẫn **chỉ dùng thử nghiệm** cho tới khi chốt Q6.
- Nhập vào game: thêm 11 bộ mới và ID chậu mới vào `src/data/skyGarden.ts`, đặt giá và tầng mở trong
  `src/data/skyEconomy.ts`, thêm tên ở `t.sky.pots` / `t.sky.sets`, chạy `npm run sky:pots`. Bộ nào thiếu hình thì
  để `complete: false`, không độn hình khác vào.
- 17 bộ thì vượt số tầng (10 tầng × 6 ô): người chơi phải chọn bộ nào đặt lên tầng. Cần chốt lại nguồn nhận chậu và
  cân bằng (`npm run sky:sim`) trước khi bật.

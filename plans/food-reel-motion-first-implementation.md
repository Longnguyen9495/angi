# Food Reel Motion-First — Implementation Plan

## 1. Mục tiêu sản phẩm

Thay toàn bộ trải nghiệm chọn món hiện tại bằng một website tương tác toàn màn hình, lấy cảm hứng từ cách GetLayers tổ chức scene, chuyển động và hierarchy — không sao chép branding hoặc layout cụ thể.

Website phải tạo cảm giác như một sản phẩm digital studio cao cấp, không phải dashboard, form lọc hay catalogue card.

### Hành vi trung tâm

1. Người dùng mở trang và thấy một “vũ trụ món ăn” đang chuyển động nhẹ.
2. Nhấn **Quay món**.
3. Tất cả món chạy thành reel/constellation 3D có quán tính.
4. Reel tăng tốc, chạy nhanh, giảm tốc và khóa vào một món.
5. Món thắng tiến ra chính giữa, các món khác lùi vào chiều sâu.
6. Hover/focus món hiển thị thành phần theo từng lớp quanh món ăn.
7. Click món mở cinematic transition sang Food Story.
8. Food Story phát video liên quan, hiển thị nguyên liệu, nguồn gốc, hương vị và hành động chọn món.
9. Back đưa người dùng trở lại đúng vị trí reel trước đó.

Không hiển thị bộ lọc ở màn hình chính. Không dùng layout dashboard hai cột. Không render toàn bộ game panel ngay khi tải trang.

---

## 2. Art direction

### Từ khóa

- Cinematic culinary experience
- Editorial typography
- Gallery / exhibition
- Spatial depth
- Tactile motion
- Vietnamese warmth
- Dark premium canvas
- Minimal chrome

### Màu sắc

- Canvas: `#0B0B0A` hoặc `#10110F`
- Ivory: `#F4EDE1`
- Warm muted text: `#A9A095`
- Copper accent: `#C9663D`
- Gold highlight: `#D7A85D`
- Deep herb green: `#23382C`

Không dùng gradient pastel, card trắng xếp chồng, border dày hoặc shadow kiểu dashboard.

### Typography

- Display: Fraunces Variable, cỡ rất lớn, weight 420–560.
- UI/body: Be Vietnam Pro, cỡ nhỏ, letter spacing rộng.
- Heading desktop có thể đạt 8–12vw.
- Chữ phải tham gia animation: split-line reveal, clip reveal, opacity/translate stagger.

### Visual hierarchy

- 70% viewport dành cho ảnh và chuyển động.
- 20% typography.
- 10% UI chrome.
- Mỗi scene chỉ có một CTA chính.

---

## 3. Information architecture

### Scene A — Landing / Idle Reel

Full viewport, không scroll ở lần đầu.

Thành phần:

- Logo nhỏ góc trái.
- `Âm thanh`, `Về dự án`, `Đã lưu` ở góc phải.
- Editorial headline ở lớp sau hoặc đè lên reel.
- Food reel chiếm trung tâm.
- CTA **Quay món** cố định gần đáy.
- Chỉ dẫn nhỏ: “Kéo để khám phá · Nhấn để xem câu chuyện”.
- Counter dạng `001 / 128`.

Reel luôn có idle drift rất nhẹ để trang không bao giờ đứng yên.

### Scene B — Spinning

- Khóa drag/click để tránh race condition.
- CTA biến thành trạng thái đang quay.
- Camera lùi nhẹ.
- Các item tăng tốc theo spline/cylinder.
- Motion blur giả bằng opacity, scale, CSS filter có kiểm soát hoặc WebGL shader nếu dùng Three.js.
- Âm thanh tick/air whoosh tùy chọn; mặc định tôn trọng mute preference.
- Tốc độ giảm theo easing vật lý, không random giật cục.

### Scene C — Selected Dish

- Winner ở chính giữa, scale 1.15–1.3.
- Neighbor items giảm opacity còn 0.15–0.3 và blur nhẹ.
- Tên món reveal theo từng dòng.
- Region, giá tham khảo và mô tả xuất hiện stagger.
- CTA: `Khám phá món này` và secondary `Quay lại`.
- Sau 600–900 ms mới cho tương tác tiếp để tránh click nhầm.

### Scene D — Ingredient Hover

Desktop:

- Pointer di chuyển trên món tạo parallax/tilt tối đa 4–6 độ.
- Các ingredient node xuất hiện quanh món theo quỹ đạo.
- Hover ingredient làm nổi node, nối một đường mảnh đến vị trí trên món và hiện mô tả.
- Ảnh chính phản ứng bằng scale/lighting nhẹ.

Mobile:

- Không phụ thuộc hover.
- Ingredient chips nằm quanh hoặc dưới ảnh.
- Tap từng chip để mở ingredient detail.

### Scene E — Food Story / Video Detail

Chuyển scene bằng shared-element transition:

- Ảnh món đang chọn scale và dịch chuyển thành poster video.
- Background reel tan dần nhưng vẫn giữ snapshot để transition liền mạch.
- Video autoplay muted chỉ khi đã đủ điều kiện trình duyệt; luôn có poster.
- Nội dung gồm:
  - Tên món.
  - Một câu mô tả giàu cảm xúc.
  - Video chính.
  - Thành phần.
  - Vùng miền/xuất xứ.
  - Hồ sơ vị: cay, ngọt, béo, thanh, giòn.
  - CTA `Chốt món này`.
  - CTA `Quay món khác`.
- Scroll trong detail phải dùng section transition nhẹ, không biến thành trang blog dài đơn điệu.

### Scene F — Chosen / Reward

Sau khi chốt món mới đưa game/progression vào:

- Check-in và seed reward xuất hiện như epilogue.
- Không đặt Daily Mission, Farm, Map cạnh reel.
- Các tính năng game chuyển vào một “Journey” drawer hoặc route riêng.

---

## 4. Reel geometry

### Phương án đề xuất: CSS 3D + DOM virtualization ở phase đầu

Dùng DOM/CSS 3D để dễ accessibility và triển khai nhanh:

- Một cylinder ngang hoặc đường spline cong.
- Chỉ mount 11–15 item gần camera.
- Mỗi item ánh xạ từ virtual index sang dish index bằng modulo.
- Transform mỗi item dựa trên khoảng cách đến center:
  - `translateX`
  - `translateZ`
  - `rotateY`
  - `scale`
  - `opacity`
  - `filter: blur()` giới hạn nhỏ.
- Không render 128 ảnh full-resolution cùng lúc.
- Thumbnail 384 px cho reel; chỉ load ảnh 768 px cho winner/detail.

### Khi nào nâng lên WebGL

Chỉ dùng React Three Fiber/Three.js nếu cần:

- True curved plane.
- Shader displacement.
- Motion blur thật.
- Lighting động.
- Hàng chục item đồng thời mà CSS không giữ 60 fps.

Không đưa Three.js vào chỉ để tạo hiệu ứng có thể làm tốt bằng CSS transform.

---

## 5. Animation choreography

### Idle

- Item drift: 8–14 giây, chuyển động rất nhỏ.
- Background grain/parallax: pointer response 1–2% viewport.
- Headline reveal: 700–900 ms khi mount.
- CTA reveal sau headline 120 ms.

### Start spin

| Mốc | Hành vi |
|---|---|
| 0 ms | Button press scale 0.96, label clip-out |
| 80 ms | Camera/reel scale xuống 0.94 |
| 150 ms | Neighbor item tăng tốc |
| 300 ms | Đạt vận tốc chính |
| 900–1600 ms | Chạy tốc độ cao, duration có seed |
| 1700 ms | Bắt đầu giảm tốc |
| 2400–3000 ms | Snap winner vào center |
| +160 ms | Winner overshoot 1.04 rồi settle |
| +280 ms | Tên món clip-reveal |
| +420 ms | Metadata stagger |
| +600 ms | Enable interaction |

Tổng thời gian lý tưởng 2.6–3.3 giây.

### Hover item

- Scale 1.025.
- Rotate theo pointer tối đa 4 độ.
- Caption dịch 6–10 px.
- Neighbor dim 10–15%.
- Ingredient hints xuất hiện sau dwell 180 ms.

### Open detail

- 0–250 ms: UI chrome fade/slide out.
- 0–700 ms: shared image scale/crop sang video poster.
- 220–650 ms: background chuyển màu theo món.
- 480–850 ms: title và metadata reveal.
- Sau 700 ms: video có thể bắt đầu.

### Back

Đảo shared transition và khôi phục:

- reel index,
- spin result,
- scroll/detail state,
- mute state.

### Reduced motion

Khi `prefers-reduced-motion`:

- Không chạy reel vật lý.
- Crossfade danh sách trong 150 ms.
- Chọn winner ngay sau 300–500 ms.
- Không parallax, tilt, orbit hoặc autoplay video.

---

## 6. State machine

Không quản lý animation bằng nhiều boolean rời rạc.

```ts
type ReelPhase =
  | 'booting'
  | 'idle'
  | 'dragging'
  | 'spinning'
  | 'settling'
  | 'selected'
  | 'opening-detail'
  | 'detail'
  | 'closing-detail'
  | 'confirming'
  | 'chosen';
```

### Event chính

```ts
type ReelEvent =
  | { type: 'ASSETS_READY' }
  | { type: 'DRAG_START' }
  | { type: 'DRAG_MOVE'; delta: number }
  | { type: 'DRAG_END'; velocity: number }
  | { type: 'SPIN'; seed?: number }
  | { type: 'SETTLE'; dishId: string }
  | { type: 'OPEN_DETAIL' }
  | { type: 'DETAIL_OPENED' }
  | { type: 'CLOSE_DETAIL' }
  | { type: 'DETAIL_CLOSED' }
  | { type: 'CONFIRM_DISH' }
  | { type: 'RESET' };
```

Mỗi transition phải có guard để double-click không phá scene.

---

## 7. Data model

Tạo catalogue riêng cho reel, không buộc UI mới phụ thuộc trực tiếp catalogue 17 món cũ.

```ts
interface ReelDish {
  id: string;
  sourceImageId: number;
  slug: string;
  name: string;
  subtitle: string;
  region?: 'north' | 'central' | 'south' | 'world';
  image: string;
  thumbnail: string;
  video?: {
    src: string;
    poster: string;
    duration?: number;
    credit?: string;
  };
  ingredients: Ingredient[];
  flavor: {
    spicy: number;
    sweet: number;
    rich: number;
    fresh: number;
    crunchy: number;
  };
  story: string;
  palette?: [string, string, string];
}

interface Ingredient {
  id: string;
  name: string;
  description?: string;
  image?: string;
  anchor?: { x: number; y: number };
}
```

### Dữ liệu hiện có

- Dùng `public/images/food-reel/manifest.json` làm nguồn 128 món.
- Thumbnail 384 px dùng cho reel.
- Full image 768 px dùng cho selected/detail.
- Thiếu dữ liệu ingredient/video: phải bổ sung theo từng batch.
- Không giả video bằng việc zoom một ảnh và gọi đó là video.

### Video strategy

Phase 1:

- Chọn 8–12 món featured có video thật, tối ưu WebM/MP4.
- Món chưa có video dùng cinematic poster với text “Food story đang được hoàn thiện”, không autoplay giả.

Phase 2:

- Bổ sung video cho 30 món ưu tiên.
- Video 6–15 giây, loop hợp lý, 720p/1080p, muted.
- Mỗi video nên dưới 3–5 MB nếu dùng ở web.

---

## 8. Component architecture

```text
src/features/food-reel/
  FoodReelExperience.tsx
  foodReelMachine.ts
  foodReelReducer.ts
  foodReel.types.ts
  data/
    reelCatalogue.ts
    ingredients.ts
  hooks/
    useReelPhysics.ts
    usePointerParallax.ts
    useAssetPreloader.ts
    useReducedMotion.ts
    useSound.ts
  components/
    ExperienceHeader.tsx
    ReelScene.tsx
    ReelTrack.tsx
    ReelItem.tsx
    SpinControl.tsx
    SceneCounter.tsx
    SelectedDishOverlay.tsx
    IngredientOrbit.tsx
    IngredientNode.tsx
    FoodStory.tsx
    FoodVideo.tsx
    FlavorProfile.tsx
    JourneyDrawer.tsx
  styles/
    reel.tokens.css
    reel.scene.css
    reel.motion.css
    reel.detail.css
    reel.responsive.css
```

### Route/app composition

```tsx
<AppShell>
  <FoodReelExperience />
  <JourneyDrawer />
  <ProfileSheet />
</AppShell>
```

Không render `DecisionFlow`, `FilterPanel`, `DailyMissions`, `FarmPreview`, `CheckInCard`, `RegionMap` trong landing viewport.

Có thể giữ component cũ để tái sử dụng bên trong `JourneyDrawer` hoặc route `/journey`.

---

## 9. Motion technology

### Khuyến nghị

Cài:

```text
motion
```

Dùng Motion for React cho:

- layout/shared-element transition,
- presence,
- spring,
- drag,
- animation controls,
- reduced-motion integration.

Tự viết requestAnimationFrame cho reel physics nếu Motion drag không đủ kiểm soát.

Không dùng cả GSAP, Motion và Three.js cùng lúc ở phase đầu.

### Physics cơ bản

```ts
velocity *= friction;
position += velocity * delta;
if (settling) position = spring(position, target, stiffness, damping);
```

Random phải chọn target trước khi animation bắt đầu. Animation chỉ trình diễn đường đi đến target, không quyết định kết quả theo frame cuối.

---

## 10. Performance budget

### Desktop

- Mục tiêu 60 fps.
- Main thread frame dưới 12 ms trong spin.
- Mount tối đa 15 reel item.
- Chỉ 3–5 item dùng ảnh 768 px.
- Các item còn lại dùng thumbnail.
- Preload winner full image ngay khi spin target được chọn.

### Mobile

- Mục tiêu ít nhất 45–60 fps trên thiết bị tầm trung.
- Mount 7–9 item.
- Tắt blur nếu GPU yếu.
- Giảm số orbit/particle.
- Không preload video trước khi user chọn món.

### Asset loading

1. App shell + font.
2. 7–9 thumbnail đầu tiên.
3. Thumbnail lân cận.
4. Winner full image.
5. Video poster.
6. Video khi detail mở hoặc khi browser idle.

Dùng `srcset`, `decoding="async"`, cache dài hạn và poster.

---

## 11. Accessibility

- Reel phải có bản DOM semantic, không chỉ canvas.
- Mỗi reel item là `button` có accessible name.
- Arrow Left/Right di chuyển món.
- Enter/Space mở món.
- Nút Quay món luôn dùng được bằng keyboard.
- Live region thông báo “Đã chọn Bún mọc”.
- Focus chuyển sang heading detail khi mở.
- Focus quay lại selected item khi đóng.
- Video có control, mute và pause.
- Ingredient hover phải có tương đương focus/tap.
- Tôn trọng reduced motion và save-data.
- Contrast tối thiểu WCAG AA.

---

## 12. Responsive behavior

### Desktop ≥ 1024 px

- Reel dạng horizontal 3D/cylinder.
- Item trung tâm lớn 38–46vw.
- Ingredient orbit hai bên.
- Cursor/parallax có hiệu lực.

### Tablet 768–1023 px

- Reel ngang nhưng giảm depth.
- Item trung tâm 55–65vw.
- Ingredient rail ở đáy thay orbit phức tạp.

### Mobile < 768 px

- Reel giống deck dọc/ngang với 3 item thấy được.
- Swipe là tương tác chính.
- CTA nằm trong safe area.
- Detail mở full-screen.
- Ingredient dạng carousel/chips.
- Không hover-only interaction.

---

## 13. Phân kỳ triển khai

### Phase 0 — Dọn kiến trúc

- Tạo branch/backup trước khi thay shell.
- Giữ logic domain hiện tại.
- Tách game UI khỏi landing.
- Thêm route hoặc drawer cho Journey.

### Phase 1 — Static scene

- Xây shell full viewport.
- Header tối giản.
- Render virtual reel từ manifest 128 món.
- Hoàn thiện responsive static.

**Acceptance:** Không còn dấu vết dashboard/filter trong first viewport.

### Phase 2 — Reel physics

- Drag/swipe.
- Spin/random seeded.
- Acceleration/deceleration/snap.
- Winner state.
- Keyboard interaction.

**Acceptance:** 20 lần spin liên tục không race condition; target chính xác.

### Phase 3 — Motion polish

- Typography reveal.
- Neighbor choreography.
- Pointer parallax.
- Ingredient orbit.
- Reduced-motion fallback.

**Acceptance:** animation không giật trên Chrome desktop và mobile tầm trung.

### Phase 4 — Food Story

- Shared-element transition.
- Video player/poster.
- Ingredient and flavor sections.
- Back transition và state restoration.

**Acceptance:** mở/đóng detail không flash nền, không mất selected index.

### Phase 5 — Journey integration

- Chốt món.
- Reward/check-in.
- Journey drawer hoặc route.
- Persistence/history.

### Phase 6 — QA

- Visual QA tại 375, 768, 1024, 1440, 1920 px.
- Keyboard-only QA.
- Reduced motion.
- Save Data.
- Lighthouse.
- Memory leak sau 30 lượt mở detail.

---

## 14. Acceptance criteria tổng thể

1. First viewport không có form lọc hoặc dashboard card.
2. Food imagery là trọng tâm thị giác rõ ràng.
3. Trang luôn có chuyển động tinh tế nhưng không gây chóng mặt.
4. Quay random có tăng tốc, chạy, giảm tốc và snap tự nhiên.
5. Tất cả item trong reel có motion riêng dựa trên vị trí/depth.
6. Hover/focus selected dish hiển thị thành phần.
7. Click dish mở detail/video bằng shared transition.
8. Mobile có tap/swipe equivalent, không phụ thuộc hover.
9. Reduced motion có trải nghiệm hoàn chỉnh.
10. Không mount 128 ảnh full-resolution cùng lúc.
11. Reel giữ gần 60 fps trong thiết bị mục tiêu.
12. Logic random không phụ thuộc kết quả animation.
13. User có thể quay lại reel mà không mất trạng thái.
14. Game/reward chỉ xuất hiện sau lựa chọn hoặc trong Journey riêng.

---

## 15. Prompt giao cho Claude Code

```text
Bạn đang làm việc trong project React 19 + TypeScript + Vite tại c:/xampp/htdocs/angi.

Hãy thay trải nghiệm landing hiện tại bằng Food Reel motion-first toàn màn hình theo đặc tả trong plans/food-reel-motion-first-implementation.md.

Mục tiêu không phải restyle dashboard hiện tại. Không hiển thị FilterPanel, DailyMissions, FarmPreview, CheckInCard hoặc RegionMap trong first viewport. Trải nghiệm chính phải là một reel món ăn không gian 3D: idle motion, drag/swipe, nút Quay món, tăng tốc, giảm tốc, snap winner, hover/focus ingredient reveal và click mở Food Story/video bằng shared-element transition.

Dùng public/images/food-reel/manifest.json và ảnh trong public/images/food-reel. Virtualize reel; không mount 128 ảnh full-size. Thumbnail dùng trong reel, ảnh 768 px dùng cho winner/detail.

Cài Motion for React nếu cần. Không cài đồng thời GSAP/Three.js nếu CSS 3D + Motion đã đủ. Dùng reducer/state machine rõ ràng, không quản lý scene bằng nhiều boolean rời rạc.

Bắt buộc:
- TypeScript strict.
- Keyboard controls.
- Focus management.
- prefers-reduced-motion fallback.
- Mobile swipe/tap equivalent.
- Video có poster/control/mute.
- Không autoplay video khi reduced motion hoặc save-data.
- Giữ logic domain/game hiện tại nhưng chuyển game UI vào Journey drawer/route.
- Không xóa test cũ; bổ sung test state machine và random determinism.
- Chạy format, lint, typecheck, tests, motion check và production build.

Triển khai tuần tự theo phase trong plan. Trước khi code, đọc App.tsx, DecisionFlow.tsx, manifest.json, state/context và CSS hiện tại. Sau mỗi phase, kiểm tra build và ghi lại file đã thay đổi.
```

---

## 16. Quyết định quan trọng

- Không tiếp tục chỉnh `premium.css` để cứu layout cũ.
- Không đặt reel như một section bên trên bộ lọc.
- Không dùng 128 card trong grid.
- Không để hover là cách duy nhất xem ingredient.
- Không yêu cầu video cho cả 128 món ngay ở MVP.
- Không dùng animation ngẫu nhiên thiếu state machine.
- Không hy sinh performance để có WebGL nếu CSS 3D đáp ứng được.

Kết quả mong muốn là một interactive culinary experience, không phải một ứng dụng form chọn món được trang trí đẹp hơn.

# BÀN GIAO DỰ ÁN ĂN GÌ? (angi) — chuyển tài khoản ChatGPT & kết nối GitLab

> **Cập nhật:** 31/10/2026 (giờ Việt Nam). **Mục đích:** một tài liệu độc lập trong repo để tài khoản ChatGPT mới, cộng tác viên hoặc AI mới có thể tiếp quản đúng dự án, đọc lịch sử sửa đổi, kết nối hệ quản lý mã nguồn và tiếp tục công việc không cần nhớ hội thoại cũ.
>
> **Nguồn được kiểm tra:** repository GitHub hiện tại (nhánh `main`, README, `package.json`, `plans/vuon-may.md`, `plans/sua-bao-mat-va-gian-lan.md`, `public/fake/index.html` và 100 commit gần nhất). Các yêu cầu tạo ảnh trong hội thoại được ghi riêng là **yêu cầu/chủ đề đã thảo luận**, không tự coi là mã đã merge hoặc asset đã có trong repo.
>
> **Quy tắc:** Nội dung tài liệu không phải là token, thông tin đăng nhập hay bản sao database. Đặc biệt vì repo GitHub được ghi nhận là **public** khi kiểm tra ngày 31/10/2026, TUYỆT ĐỐI không commit secrets hoặc dữ liệu người dùng.

## 0. Đọc trước khi thao tác (cực quan trọng)

1. **Repo nguồn đã xác minh:** https://github.com/Longnguyen9495/angi ; clone: `https://github.com/Longnguyen9495/angi.git`; nhánh `main`.
2. **Commit đầu `main` tại thời điểm đối chiếu:** `122c9eef398b6d6ca7de69f372104211c50c51a1` (09/10/2026 UTC); [xem commit](https://github.com/Longnguyen9495/angi/commit/122c9eef398b6d6ca7de69f372104211c50c51a1). Sau ngày tạo tài liệu, **luôn lấy `main` mới nhất**, không mặc định hash cũ là hiện hành.
3. **Nhánh khác được tìm thấy:** `wip/sky-sim-b03`. Không mặc định merge nhánh này vào `main`; phải kiểm tra diff và test.
4. **GitLab:** chưa tìm thấy project tên `angi` trong **các project GitLab thuộc sở hữu/thành viên của tài khoản kết nối tại thời điểm kiểm tra**. Chưa có bằng chứng một remote GitLab chính thức. Tuyệt đối không đoán URL/namespace, không tự push sang GitLab chưa được chọn.
5. **Dự án hiện sử dụng GitHub làm nguồn sự thật.** Kết nối GitLab là **bước thiết lập thêm** theo mục 4; không phải bằng chứng đã migrate.
6. Website từng được dùng để test/production: https://angi.221-121-1-68.sslip.io ; trang prompt thử: https://angi.221-121-1-68.sslip.io/fake/ . Không coi tình trạng deploy/uptime lúc đọc tài liệu là đã kiểm chứng.

## 1. Mục tiêu sản phẩm và phạm vi

**Tên:** Ăn gì? — trải nghiệm chọn món có chuyển động, reel 3D, Food Story, danh mục món và một nông trại/game mở rộng. Định hướng cải thiện chất lượng hình món ăn và nuôi dưỡng trải nghiệm chơi game thay vì chỉ là công cụ chọn món.

Các phần chính (xác nhận từ README/code và kế hoạch):

- **Food Reel:** trải nghiệm chọn món kiểu 3D, state machine/vật lý quán tính, ảnh món, chuyển cảnh Food Story, đường chia sẻ từng món `/mon/<slug>`.
- **Catalogue/Sổ bếp:** dữ liệu món, công thức/các bước nấu, câu chuyện món, ảnh, snapshot dự phòng.
- **Nông trại/Journey:** ô đất, giống/cây trồng, tưới, thu hoạch, vật nuôi, câu cá, đơn khách, nhiệm vụ, thành tựu, kho, chợ, kết bạn và chơi theo tiến độ.
- **Vườn Mây:** tầng vườn mây nối với nông trại, chậu theo bộ, bọ, máy chế biến, khinh khí cầu, nhiệm vụ, trợ thủ; có route thử nghiệm.
- **Admin/backend:** PHP API, danh mục, tài khoản email+OTP, kiểm tra ledger chống gian lận, lượt quay/trả phí, cấu hình/tính năng qua công tắc.
- **`/fake/`:** trang `public/fake/index.html` để xem/kiểm tra prompt ảnh món. Đừng nhầm trang này với hệ thống sinh ảnh hoặc với bằng chứng đủ 30 ảnh PNG đã nhập vào code.

Nguyên tắc sản phẩm: ảnh là phần trọng tâm; ưu tiên chất lượng hình, nhất quán, nhìn ngon và rõ nội dung hơn là chỉ thêm số lượng tính năng.

## 2. Công nghệ và sơ đồ tìm code

| Hạng mục | Công nghệ/vị trí hiện thấy |
| --- | --- |
| Web frontend | Vite, React 19, TypeScript, Motion |
| Đồ họa | Three.js, @react-three/fiber, PlayCanvas (có mã/asset liên quan), canvas/sprite |
| Backend | PHP, API server-side, quy tắc kinh tế và chống gian lận |
| Database production | SQLite, `storage/database/angi.sqlite` **không ở git** |
| VPS | nginx + php8.5-fpm; nguồn triển khai theo README ở `/var/www/angi` |
| Food reel | `src/features/food-reel/` |
| Vườn/nông trại | `src/components/journey/JourneyApp.tsx` và `src/features/food-reel/journey/` |
| Vườn 3D | `src/features/garden3d/` |
| Vườn Mây | `src/features/sky-garden/`, `src/data/skyGarden.ts`, `src/data/skyEconomy.ts`, `src/domain/sky*.ts` |
| Guard Vườn Mây | `server/lib/SkyGuard.php`, `server/lib/Sky.php`, luật xuất `server/data/game-rules.json` |
| Prompt Vườn Mây | `prompts/sky-garden-chatgpt.txt`, `prompts/sky-garden-playground-100.md`, `prompts/sky-garden-prompts.md` |
| Xử lý art Vườn Mây | `assets/sky-garden/` → `scripts/sky-garden/` → `public/images/sky-garden/` |
| Bộ ảnh món | `public/images/food-reel/`, manifest, script tạo/chuyển đổi ảnh theo README |
| Admin/server | `server/`, `server/bin/`, `deploy/` |
| Kế hoạch quan trọng | `plans/vuon-may.md`, `plans/anh-check-in-va-tai-khoan.md`, `plans/khu-vuon-3d.md`, `plans/sua-bao-mat-va-gian-lan.md` |

**Thứ tự đọc:** `README.md` → `package.json` → `plans/vuon-may.md` (đọc các cập nhật mới nhất ở đầu) → thư mục chức năng cần sửa → commit/PR liên quan → test. Với Vườn Mây, `§0` trong kế hoạch là đặc tả ưu tiên khi mâu thuẫn với các phần cũ, nhưng phải xét cả những cập nhật thực thi mới hơn ở đầu file.

## 3. Thiết lập & cách kiểm chứng tại máy mới

Cần quyền GitHub đọc/ghi phù hợp và môi trường Node/npm, PHP tương thích. Không sao chép token hoặc `.env` qua ChatGPT.

```bash
git clone https://github.com/Longnguyen9495/angi.git
cd angi
git checkout main
git pull --ff-only origin main
npm ci
npm run dev
```

Các lệnh ở `package.json` (đã đối chiếu):

```bash
npm run verify           # prettier check -> eslint -> tsc -> vitest -> check motion -> build
npm run typecheck
npm run test
npm run test:server      # các selftest PHP gồm spins, sky và sky-friends
npm run test:account
npm run test:audit:security
npm run sky:pots         # chuẩn bị chậu từ file art riêng
npm run sky:art          # nhập cây/bọ/máy vườn mây
npm run sky:qa           # xuất contact sheet để QA
npm run sky:sim          # mô phỏng kinh tế Vườn Mây
npm run rules:export     # xuất luật game TS sang JSON để guard PHP kiểm tra
npm run build
```

- **Lưu ý PHP:** `npm run build` gọi `php server/bin/export-snapshot.php` trước TypeScript/Vite, nên máy phải có PHP và cấu hình phù hợp.
- **Local XAMPP:** README mô tả `http://angi.local` với `deploy/apache/angi.local.conf`. Khi thay file vhost, test config rồi mới restart Apache.
- **Data:** ảnh check-in cá nhân lưu IndexedDB client, không được coi là đã nằm trong Git. DB production, ảnh upload trong `storage/uploads`, secrets và dữ liệu runtime không tự đi theo source code.
- **Test baseline:** kế hoạch Vườn Mây từng ghi nhận 63 test lỗi sẵn có ở `dishStories.test.ts`. Không khẳng định hiện tại các lỗi còn tồn tại hay đã hết nếu chưa chạy mới. Đừng tuyên bố toàn bộ suite xanh chỉ từ ghi chú cũ.
- **Không tự chạy** `seed.php --force` trên production; đó là thao tác có thể thay đổi/xóa catalogue. Phải sao lưu và xác nhận mục tiêu trước.

## 4. Kết nối GitLab / chuyển quyền cho tài khoản khác

### 4.1. Phân biệt 3 thứ cần chuyển

1. **Quyền Git provider:** tài khoản GitHub/GitLab mới phải được chủ repo cấp quyền phù hợp; file này KHÔNG tự cấp quyền.
2. **Kết nối app trong ChatGPT:** trong tài khoản ChatGPT mới, kết nối ứng dụng GitHub và/hoặc GitLab, chấp thuận cấp quyền truy cập đúng repo/project; tài khoản ChatGPT cũ không tự chuyển token, quyền hoặc lịch sử chat.
3. **Context làm việc của AI:** gửi link tài liệu này, link repo và prompt bàn giao ở mục 9. Lịch sử commit là nguồn xác thực cho công việc đã làm; hội thoại cũ chỉ bổ sung bối cảnh.

### 4.2. Nếu vẫn tiếp tục làm trên GitHub (mặc định khuyến nghị)

- Giữ `Longnguyen9495/angi` / `main` làm nguồn sự thật.
- Tài khoản GitHub mới: chủ repo cấp quyền cộng tác viên cần thiết qua giao diện repository; người nhận chấp nhận lời mời.
- Tài khoản ChatGPT mới: kết nối GitHub, cho phép repo `Longnguyen9495/angi`, rồi yêu cầu AI đọc `PROJECT_HANDOVER.md` và `README.md`.
- Mỗi lần làm: pull `main` mới nhất, phân tích, sửa trên nhánh phù hợp, chạy test, review diff, commit, push/merge theo yêu cầu. Chỉ nói “đã deploy” khi có bằng chứng deploy thực tế.

### 4.3. Nếu muốn có GitLab (CHƯA THỰC HIỆN)

**Bước chuẩn bị:** tạo/chọn đúng GitLab project thuộc namespace do chủ dự án quyết định; xác nhận quyền Maintainer/Developer của tài khoản mới. Không suy diễn rằng đã có GitLab `angi`. Có thể dùng chức năng **Import project từ GitHub** trong GitLab và kiểm tra branch/tag/LFS sau import.

**Phương án dùng 2 remote từ máy cá nhân** (CHỈ sau khi đã tạo GitLab project trống và biết đúng URL):

```bash
git clone https://github.com/Longnguyen9495/angi.git
cd angi
git fetch --all --tags
git remote rename origin github
git remote add gitlab git@gitlab.com:<NAMESPACE_DA_XAC_NHAN>/angi.git
git remote -v
git push gitlab --all
git push gitlab --tags
# Nếu repo dùng Git LFS: kiểm tra git lfs ls-files; cân nhắc git lfs push gitlab --all
```

- `<NAMESPACE_DA_XAC_NHAN>` là placeholder, **không phải GitLab URL đã được xác minh**.
- Không chạy `git push --mirror` hoặc `--force` vào một project đã có lịch sử khi chưa review hậu quả; không tự xóa GitHub.
- Chọn **một nguồn sự thật** cho quy trình sau này, tránh diverge GitHub/GitLab; nếu bật sync hai chiều, phải thiết kế quyền push và giải quyết conflict.
- Nếu chuyển sang GitLab làm chính, cập nhật tài liệu này với **URL GitLab thật, default branch, chính sách merge, CI/CD và trạng thái deploy đã kiểm chứng**, rồi cập nhật các hướng dẫn liên quan.
- Kiểm tra project GitLab có đủ commit history, branches, tags, LFS objects, submodules và quyền truy cập; file Git không chuyển .env, SQLite runtime, uploads hoặc deployment secrets.
- Kết nối GitLab trong ChatGPT mới phải thực hiện qua quyền tài khoản mới; **tuyệt đối không dán PAT/SSH private key vào file này hoặc hội thoại.**

### 4.4. Checklist bàn giao quyền & dữ liệu

- [ ] Tài khoản mới đọc được `Longnguyen9495/angi` và `PROJECT_HANDOVER.md`.
- [ ] Đã xác nhận quyền push/merge thích hợp trên đúng repo.
- [ ] Đã kết nối GitHub/GitLab trong ChatGPT mới và thử đọc một file thực tế.
- [ ] Đã xác định GitHub hay GitLab là nơi chính; nếu có GitLab, ghi rõ remote đã xác minh.
- [ ] Đã kiểm tra `main` mới nhất, danh sách branch, PR, CI/CD và tình trạng website.
- [ ] Secrets production, .env, SSH, SMTP, SePay, tài khoản quản trị được chuyển qua **secret manager/kênh an toàn khác**, không qua repo hoặc file MD.
- [ ] DB SQLite, uploads và dữ liệu khách được backup/restore riêng nếu thực sự chuyển hạ tầng.
- [ ] Chạy test trên môi trường mới, đối chiếu kết quả với nhật ký tại ngày bàn giao.

## 5. Dòng thời gian sửa đổi (có bằng chứng Git)

Những mục sau được đối chiếu qua **commit GitHub trên repo `angi`** và nội dung README/kế hoạch. Tên commit là mô tả của tác giả, chưa đồng nghĩa một tính năng đã được kiểm thử đầy đủ trên production.

### 01–02/10/2026 — nông trại, game loop, QA
- Làm mới nông trại V5, sprite sheet và hoạt ảnh; quy tắc mỗi ô/giống/vật nuôi có đồng hồ riêng; các thao tác chạm để gieo/tưới/thu hoạch; thêm khu chăn nuôi, kho, bộ lọc, vườn bạn, nhiệm vụ/thành tựu và nhóm vật phẩm. Các mốc có thể xem trong bảng 100 commit ở mục 7.
- Bổ sung review chống gian lận, security audit, cách triển khai và đồng bộ catalogue production/local.
- Chứng cứ tiêu biểu: [`5c686782`](https://github.com/Longnguyen9495/angi/commit/5c68678250bb130e0b66f02f0ddd9279c92708e5), [`bcb3ad91`](https://github.com/Longnguyen9495/angi/commit/bcb3ad91), [`80b7482d`](https://github.com/Longnguyen9495/angi/commit/80b7482d7aa8b8f6adc831573949d71c7b57c479).

### 03/10/2026 — security & hình món
- Sửa các điểm yếu trên API/admin/auth, ProgressGuard xác minh sổ cái và hành động trong game; có ghi chép ở `plans/sua-bao-mat-va-gian-lan.md`. Đây là phương án game client chạy được, server kiểm khi lưu, **không phải server-authoritative cho toàn bộ gameplay**.
- Sửa ảnh món để bỏ nền hình vuông đen trong ngữ cảnh hiển thị, thay bằng nền trong suốt; bổ sung farm/quest/achievement.
- Chứng cứ: [`dd3ebcbcd`](https://github.com/Longnguyen9495/angi/commit/dd3ebcbcd91fff12f337a1c5764c3e0e9b547e5), [`f7d678b04`](https://github.com/Longnguyen9495/angi/commit/f7d678b04d009f0c7c3cf1df64ead3c6067c0b94).

### 04/10/2026 — Food Story, bếp, nông trại và chia sẻ
- Food Story/câu chuyện từng món, danh mục/snapshot, chế biến từng bước, bộ sưu tập món, khách gọi món, XP/sao, các nguồn nguyên liệu nuôi trồng/đánh bắt và trang trí theo mùa.
- SEO/OG/favicons/share từng món, chỉnh phần nền của ảnh bay qua reel.
- Chứng cứ: [`bd4982f3`](https://github.com/Longnguyen9495/angi/commit/bd4982f3a4ecaf2d337a4fe2339ffedefd7886ee), [`c38cfe29`](https://github.com/Longnguyen9495/angi/commit/c38cfe29ea9ee9e972cdb7b7a5a63e9386ff40a0), [`d2667ad0`](https://github.com/Longnguyen9495/angi/commit/d2667ad05968ce147850f6db11f10e2856f4509d).

### 05/10/2026 — lượt quay, giao diện, demo marketing
- Các commit chỉnh quota lượt quay, mua lượt, trạng thái chống gian lận, tiêu đề mobile, thêm ô nông trại và nội dung story còn thiếu; có video promo/demo/export.
- **Chú ý mốc xung đột:** README mô tả `freePerDay` mặc định 5, trong khi commit `e088d4805` có tiêu đề “30 free spins a day”. Phải **đọc cấu hình thực tế mới nhất trên `main`/admin/server**, không lấy bất kỳ con số cũ nào làm chân lý.
- Chứng cứ: [`2817ce034`](https://github.com/Longnguyen9495/angi/commit/2817ce034be8581d7c30128d2c5911d7702f7ce1), [`e088d4805`](https://github.com/Longnguyen9495/angi/commit/e088d48050aa6fb546144cdbc48d03f0454be9e9), [`046900d2d`](https://github.com/Longnguyen9495/angi/commit/046900d2d181628911cae0906fe49fe696daadd2).

### 08/10/2026 — quy hoạch và hiện thực Vườn Mây G0–G5
- Tài liệu `plans/vuon-may.md` qua nhiều lượt: kiến trúc scene/asset, tiêu chí nghiệm thu, Q1–Q7, gameplay nâng cấp, kinh tế dùng chung/hành động nông trại. Các commit **docs** không được tính là đã viết code gameplay.
- Sau đó triển khai pipeline chậu, demo chuyển động `/sky-garden-test`, các reducer/ledger/guard, máy, bọ, khinh khí cầu, game real/sandbox, công tắc `sky.enabled` phía admin, thăm vườn mây của bạn, mô phỏng 90 ngày.
- Các cột mốc: [`ff5283e94`](https://github.com/Longnguyen9495/angi/commit/ff5283e949fe236bb266eb056c531f3574cef429) (plan), [`269dbecba`](https://github.com/Longnguyen9495/angi/commit/269dbecba41dabf6af76e354fad46648256ae04b) (acceptance), [`09a35b993`](https://github.com/Longnguyen9495/angi/commit/09a35b993b3045199cbfeed48745b615cd7c6af9) (demo), [`6396cf2dd`](https://github.com/Longnguyen9495/angi/commit/6396cf2dd309addfc90d4e5ece6b15adeabbeeb3) (G2–G5).

### 09/10/2026 — nhiệm vụ, thử kinh tế, art pipeline, 102 chậu trong dữ liệu
- Nhiệm vụ/thành tựu Vườn Mây, giúp bạn, chậu mùa lễ, kệ mây; Mây Ngọc thưởng khi mở tầng, nhiệm vụ tháng/quý và cộng hưởng theo bộ; script `sky:art` đòi ảnh có alpha thật.
- Commit cuối bổ sung **102 ID chậu chia 17 bộ trong dữ liệu/kế hoạch**; **không có nghĩa đã có 102 PNG/WebP được duyệt**. Tính năng chỉ mở chậu khi manifest đã có ảnh. Thời điểm ghi trong kế hoạch chỉ có 20 chậu trong game.
- Các cột mốc: [`3e7ebd8a3`](https://github.com/Longnguyen9495/angi/commit/3e7ebd8a35f355536ec80b46ac2d985da8018945), [`3e179a340`](https://github.com/Longnguyen9495/angi/commit/3e179a3402ab7f136118d360591102785f06ecd7), [`122c9eef3`](https://github.com/Longnguyen9495/angi/commit/122c9eef398b6d6ca7de69f372104211c50c51a1).

## 6. Lịch sử trao đổi & tiêu chí hình ảnh — KHÔNG đánh đồng với commit

### 6.1. Food Reel / `/fake/`

Người dùng từng yêu cầu tạo ảnh món theo danh sách prompt `/fake/` (khoảng 30 món), so sánh ảnh với prompt, tách nền, gom PNG vào một ZIP. Đây là **lịch sử yêu cầu tạo nội dung**, không chứng minh 30 file đã được chèn vào git hoặc CDN. Trước khi tuyên bố hoàn thành phải kiểm kê **đúng file**, manifest, kích thước, alpha và nội dung từng ảnh trong repo.

Tiêu chuẩn ảnh đã trao đổi:
- Ảnh món chân thực, phần ăn phong phú, nhìn ngon; góc máy khoảng 35–45° từ phía trên (3/4 overhead).
- Ảnh vuông 1:1, món và dụng cụ đựng nằm trọn khung, trung tâm; khoảng trống biên xấp xỉ 10%, kích thước bát/đĩa thống nhất, thường chiếm khoảng 65–70% bề ngang.
- Khi tạo trên nền đen để tách, nền đen thuần `#000000`, ánh sáng studio, không props thừa. **Ảnh giao sản phẩm cuối** nếu dùng nền trong suốt phải là PNG alpha thật, không chỉ render nền đen/trắng hoặc giả trong suốt.
- Kiểm tra viền alpha/các lỗ/hơi nước, không cắt mất bát/đĩa, tên món phải đúng prompt; đồng bộ góc máy/scale giữa 30 ảnh.
- Luồng review: tạo từng món → kiểm ảnh so với prompt → xử lý nền alpha → QA → ghi tên/manifest đúng → chỉ nhập vào sản phẩm khi được duyệt.

### 6.2. Vườn Mây / asset game

**Yêu cầu nhất quán của người dùng:** tạo từng asset độc lập ngay từ đầu; không tạo sprite sheet lớn rồi crop ra các vật thể vì các lần cắt trước bị sai. Mỗi lượt **1 hình = 1 asset**, không nền, PNG alpha; sau kiểm duyệt có thể xử lý thành các định dạng tối ưu của game, đóng ZIP ở bước bàn giao nếu cần.

Art direction: game casual 2D/2.5D tươi sáng, chất liệu tròn bóng, màu phong phú, chậu đồng bộ tỉ lệ và điểm cắm cây; cây có giai đoạn tăng trưởng riêng; một chậu/máy/bọ/cây độc lập. Với hình game, prompt trong `prompts/sky-garden-chatgpt.txt` quy định góc cao khoảng 20°, khác với góc ảnh món ăn — **không áp dụng sai bộ tiêu chuẩn ảnh Food Reel sang asset Vườn Mây**.

Trạng thái được nêu ở `plans/vuon-may.md` tại đợt cập nhật 09/10:
- Đã có code pipeline 20 chậu và 102 chậu/17 bộ **trong dữ liệu** (mở hiển thị theo ảnh có trong manifest).
- Hình cây/bọ/máy, trang trí mây, mầm đậu thần, trợ thủ và phần lớn số chậu còn thiếu/chờ art đúng chuẩn.
- `sky:art` đã thử ảnh giả rồi xóa, các đầu vào hình mới của nhánh này vẫn cần cung cấp, chuẩn bị và QA.
- Chưa có xác nhận thử nghiệm 2 tài khoản trên 2 máy, hoặc FPS ≥30 trên iPhone/Android thật.
- Chưa có bằng chứng đạt đầy đủ cổng nghiệm thu, bản `sky.enabled` production phải giữ ở trạng thái an toàn cho tới khi test và cấu hình đủ.

### 6.3. Những điểm còn mở cần quyết định

- Q6 về **quyền hình/sở hữu asset**: phải xác nhận quyền dùng hình trước khi đưa vào sản phẩm. Không sao chép ảnh reference của game khác.
- Cần đọc lại các quyết định Q1–Q7 và điều kiện ưu tiên `§0` trong `plans/vuon-may.md`; một số quyết định đã chọn tạm trong quá trình code.
- Layout, hiệu năng, phản hồi thao tác và test trên máy thật phải được nghiệm thu; không lấy ảnh chụp headless thay cho test FPS thực tế.
- Kiểm tra lại cân bằng game bằng mô phỏng mới; số liệu mô phỏng 90 ngày là scenario, không phải hành vi người chơi thật.
- Luồng xuất ảnh, asset licensing, ngân sách tải trang và cache trên mobile cần soát trước release.

## 7. Nhật ký 100 commit gần nhất, để truy vết chính xác

**Nguồn:** kết quả lịch sử commit GitHub repository `Longnguyen9495/angi` tại 31/10/2026, từ 01/10 đến 09/10/2026. Bảng ghi **tiêu đề commit**, không thay thế review diff. Xem lịch sử đầy đủ tại https://github.com/Longnguyen9495/angi/commits/main hoặc chạy `git log --all --date=iso --stat`.

| # | Ngày (UTC) | Commit | Tiêu đề |
| ---: | --- | --- | --- |
| 1 | 2026-10-09 | [`122c9eef39`](https://github.com/Longnguyen9495/angi/commit/122c9eef398b6d6ca7de69f372104211c50c51a1) | Cloud garden: all 102 pots in the data, cloud decor, bean sprout, helpers |
| 2 | 2026-10-09 | [`3e179a3402`](https://github.com/Longnguyen9495/angi/commit/3e179a3402ab7f136118d360591102785f06ecd7) | Cloud garden: Mây Ngọc from floors, monthly and quarterly quests, resonance, art import |
| 3 | 2026-10-09 | [`3e7ebd8a35`](https://github.com/Longnguyen9495/angi/commit/3e7ebd8a35f355536ec80b46ac2d985da8018945) | Cloud garden G5/G6: water-help, sky quests and achievements, festival pots, seamless shelf, floors 8-10 retuned |
| 4 | 2026-10-08 | [`07ff96c0e1`](https://github.com/Longnguyen9495/angi/commit/07ff96c0e1c5f3b56bdcd730f1274c55c1a54d7c) | AI import retry, longer AI timeouts, catalogue snapshot, cooking sheet and reel styles, OCR audits |
| 5 | 2026-10-08 | [`e1ca34b5cc`](https://github.com/Longnguyen9495/angi/commit/e1ca34b5cccc90063d63ed328229d3f49c983d1c) | Cloud garden plan: the 90-day simulation passed, the table still to record |
| 6 | 2026-10-08 | [`530e676531`](https://github.com/Longnguyen9495/angi/commit/530e676531307f0a94a3f7c58ab105deeba5dcfd) | Cloud garden sim: write the report to storage/sky-garden-qa, note the 90-day run |
| 7 | 2026-10-08 | [`6396cf2dd3`](https://github.com/Longnguyen9495/angi/commit/6396cf2dd309addfc90d4e5ece6b15adeabbeeb3) | Cloud garden G2–G5: the game, friends' cloud gardens, admin switch, simulation |
| 8 | 2026-10-08 | [`ef54b1fa9b`](https://github.com/Longnguyen9495/angi/commit/ef54b1fa9bacd55757aaeb1be3afd30ddfc5b4cb) | Cloud garden G2/G3: sky endpoints for bug reveals, star-up and tier-up behind a switch |
| 9 | 2026-10-08 | [`529fa7e55a`](https://github.com/Longnguyen9495/angi/commit/529fa7e55a5dd36b4f8a7dc535f59b5e9b88c7b6) | Cloud garden G2: server rules and save guard for the sky branch |
| 10 | 2026-10-08 | [`0c7137bf20`](https://github.com/Longnguyen9495/angi/commit/0c7137bf20a79c57a5c4f7dfe56d44b69823e71a) | Cloud garden G2: economy tables, sky state, reducer actions and ledger resources |
| 11 | 2026-10-08 | [`1a15f4870c`](https://github.com/Longnguyen9495/angi/commit/1a15f4870c5cd38b7ea8cd9fb205c855eb3dc6eb) | Cloud garden demo: cleaned shelves, beanstalk and sky life from the test sprite sheet |
| 12 | 2026-10-08 | [`819b3758fa`](https://github.com/Longnguyen9495/angi/commit/819b3758fa22754394b3513be2636294545b1958) | Farm menu links the cloud garden demo on dev and local copies |
| 13 | 2026-10-08 | [`09a35b993b`](https://github.com/Longnguyen9495/angi/commit/09a35b993b3045199cbfeed48745b615cd7c6af9) | Cloud garden G1: motion demo at /sky-garden-test |
| 14 | 2026-10-08 | [`2a36d97f1e`](https://github.com/Longnguyen9495/angi/commit/2a36d97f1e0e46f6a7ee2343639e633e266dfa31) | Cloud garden G0: pot pipeline, soil anchors, static pot data |
| 15 | 2026-10-08 | [`afcd51902f`](https://github.com/Longnguyen9495/angi/commit/afcd51902f71e08880eff032441e9f627c983783) | Cloud garden: pot source art, user decisions Q1-Q7 |
| 16 | 2026-10-08 | [`5b2b870bc2`](https://github.com/Longnguyen9495/angi/commit/5b2b870bc25baf37d7e22355bb145bd165a4060e) | Cloud garden plan: 20 sample pots, server-held bug key, implementation prompts |
| 17 | 2026-10-08 | [`85227347cc`](https://github.com/Longnguyen9495/angi/commit/85227347cc3ee65cf74e81c8b7ad1ff95c2fdb76) | docs: add reference-image asset decomposition and sky garden scene architecture |
| 18 | 2026-10-08 | [`f965e7e068`](https://github.com/Longnguyen9495/angi/commit/f965e7e0683574329ef76f71c72771ab2fc40748) | docs: resolve sky garden mobile layout and track Q1-Q6 decisions |
| 19 | 2026-10-08 | [`269dbecba4`](https://github.com/Longnguyen9495/angi/commit/269dbecba41dabf6af76e354fad46648256ae04b) | docs: add measurable sky garden acceptance criteria and release gates |
| 20 | 2026-10-08 | [`2b54e3adc9`](https://github.com/Longnguyen9495/angi/commit/2b54e3adc91cff049a93ef1013361a7e23b84df6) | docs: add acceptance criteria, asset QA, sync contracts and stage gates for sky garden |
| 21 | 2026-10-08 | [`02e868a6ec`](https://github.com/Longnguyen9495/angi/commit/02e868a6ec89692833cace42c922f4c4671bf317) | Cloud garden plan: one settled spec to build from |
| 22 | 2026-10-08 | [`ff5283e949`](https://github.com/Longnguyen9495/angi/commit/ff5283e949fe236bb266eb056c531f3574cef429) | docs: extend vuon-may plan with modern gameplay and farm integration V2 |
| 23 | 2026-10-08 | [`bcd7a614f9`](https://github.com/Longnguyen9495/angi/commit/bcd7a614f94075b08219e5ba6259ff8d242d5fa7) | Plan for the cloud garden: pots on cloud floors above the farm |
| 24 | 2026-10-05 | [`6013cb971e`](https://github.com/Longnguyen9495/angi/commit/6013cb971e237a0538181a1d41942c9d6ffe6254) | Eight more plots on the grass by the pond |
| 25 | 2026-10-05 | [`e088d48050`](https://github.com/Longnguyen9495/angi/commit/e088d48050aa6fb546144cdbc48d03f0454be9e9) | 30 free spins a day |
| 26 | 2026-10-05 | [`dee530dda2`](https://github.com/Longnguyen9495/angi/commit/dee530dda2c078abeefd018537a607771e20eb67) | Stop the headline mask clipping accents and descenders |
| 27 | 2026-10-05 | [`c0d3daf6e0`](https://github.com/Longnguyen9495/angi/commit/c0d3daf6e0acb4e122b9395baa320c7d9a6f1557) | Headline on one line on phones |
| 28 | 2026-10-05 | [`2817ce034b`](https://github.com/Longnguyen9495/angi/commit/2817ce034be8581d7c30128d2c5911d7702f7ce1) | Spin allowance with paid top-ups, fair-play locks, rename to "Ăn gì?" |
| 29 | 2026-10-05 | [`783865311c`](https://github.com/Longnguyen9495/angi/commit/783865311c2a06de7ac40234d5756317d4ea3059) | Full stories for the 67 dishes still waiting on one |
| 30 | 2026-10-05 | [`046900d2d1`](https://github.com/Longnguyen9495/angi/commit/046900d2d181628911cae0906fe49fe696daadd2) | Promo videos (20s and 60s), the promo demo page and its export script |
| 31 | 2026-10-05 | [`e2e3aa95ee`](https://github.com/Longnguyen9495/angi/commit/e2e3aa95eea0aad6e6434865f02a6d9774b04105) | Catalogue snapshot: dish photos with the transparent background |
| 32 | 2026-10-04 | [`c53288d275`](https://github.com/Longnguyen9495/angi/commit/c53288d27589d9ec7775eeca45e475b1a0fd01d2) | Arrange decorations on the farm, a name board, and a fair-play log |
| 33 | 2026-10-04 | [`d65afdda8a`](https://github.com/Longnguyen9495/angi/commit/d65afdda8ae87d735b0bf7ecff30b2bd1fd4e5cb) | Decorations on the painted farm, chef reputation, a stats report |
| 34 | 2026-10-04 | [`531561ac03`](https://github.com/Longnguyen9495/angi/commit/531561ac0384a7326618d5918cbed41eb2fa5553) | Seasonal events on the Vietnamese calendar |
| 35 | 2026-10-04 | [`e948bc18d4`](https://github.com/Longnguyen9495/angi/commit/e948bc18d48f2d31b5adeaa5f090547486c1a10d) | Farm upgrades: well, barn, hive and boat, bought with xu |
| 36 | 2026-10-04 | [`3991dceb3f`](https://github.com/Longnguyen9495/angi/commit/3991dceb3f686e8478bdb43d1189da0a79cb3728) | Dish collections: eleven sets to cook through, each with a reward |
| 37 | 2026-10-04 | [`8e4b5c8a7b`](https://github.com/Longnguyen9495/angi/commit/8e4b5c8a7bc996106b3cbcdc9458df22ef48276a) | Guests order cooked dishes; recipes earn mastery stars |
| 38 | 2026-10-04 | [`a060fb5a82`](https://github.com/Longnguyen9495/angi/commit/a060fb5a8294d1aac2fdba46b0f2bd5af0cd9a77) | Longer farm progression: levels on a curve and plots cleared for xu |
| 39 | 2026-10-04 | [`d2667ad059`](https://github.com/Longnguyen9495/angi/commit/d2667ad05968ce147850f6db11f10e2856f4509d) | Meat on the farm and full recipes: livestock, bees and catches go into cooking |
| 40 | 2026-10-04 | [`c38cfe29ea`](https://github.com/Longnguyen9495/angi/commit/c38cfe29ea9ee9e972cdb7b7a5a63e9386ff40a0) | SEO and link previews: new share images, favicons, sitemap, per-dish meta |
| 41 | 2026-10-04 | [`6d83e1996d`](https://github.com/Longnguyen9495/angi/commit/6d83e1996d418748ec4f3dc6a1274ea2ef0933f7) | Dish flight: no backdrop behind the flying photo |
| 42 | 2026-10-04 | [`d6a43e991f`](https://github.com/Longnguyen9495/angi/commit/d6a43e991f17bfcc8f9719cca7cc9e1dea59609d) | Order links under the dish name, no disc or square behind dishes, farm sign on the next plot |
| 43 | 2026-10-04 | [`37c61de3a9`](https://github.com/Longnguyen9495/angi/commit/37c61de3a93286cf3f9bee85b90e5c159697b13b) | Story bar: keep the unprefixed backdrop-filter after minification |
| 44 | 2026-10-04 | [`bd4982f3a4`](https://github.com/Longnguyen9495/angi/commit/bd4982f3a4ecaf2d337a4fe2339ffedefd7886ee) | Dish stories for every dish, replacing the video/review panel |
| 45 | 2026-10-04 | [`60ee88e25d`](https://github.com/Longnguyen9495/angi/commit/60ee88e25d841e1c90df56f2cb6f7fde3813875d) | feat(food-reel): add dish story chapters and catalogue fallbacks |
| 46 | 2026-10-03 | [`893e85bada`](https://github.com/Longnguyen9495/angi/commit/893e85bada13edf6c7dbb279ed0e61d1310ef564) | Farm: sharper painting on phones |
| 47 | 2026-10-03 | [`f7d678b04d`](https://github.com/Longnguyen9495/angi/commit/f7d678b04d009f0c7c3cf1df64ead3c6067c0b94) | Dish photos: transparent background instead of a black square |
| 48 | 2026-10-03 | [`6abdfc6ac9`](https://github.com/Longnguyen9495/angi/commit/6abdfc6ac9b3a611b0db4832384fc926101375ae) | Farm, quests and achievements; anti-cheat and security review fixes |
| 49 | 2026-10-03 | [`f1f8947559`](https://github.com/Longnguyen9495/angi/commit/f1f89475592d7a2c12d725d1bbb44e0ea8b63cef) | nginx template: match the certbot-managed live config, no default_server on the shared VPS |
| 50 | 2026-10-03 | [`96498ad9b5`](https://github.com/Longnguyen9495/angi/commit/96498ad9b56b64f27b1baa49d8716ee518e1991d) | Config check: a short admin password is a warning, not a refusal |
| 51 | 2026-10-03 | [`dd3ebcbcde`](https://github.com/Longnguyen9495/angi/commit/dd3ebcbcde15dfe2ebdaece5f13dea0481f60b84) | Security fixes and server-checked saves against game cheating |
| 52 | 2026-10-02 | [`3b04a7cde7`](https://github.com/Longnguyen9495/angi/commit/3b04a7cde79c293b035b557ecf71221b22089e1e) | Plans: more daily and weekly quests, achievements from 9 to 29 |
| 53 | 2026-10-02 | [`3877b15567`](https://github.com/Longnguyen9495/angi/commit/3877b155677b464a7cad07126b6e27105e60ffdf) | Plans: what is left after the farm fixes and the two audits |
| 54 | 2026-10-02 | [`907c125365`](https://github.com/Longnguyen9495/angi/commit/907c12536587ec74ac82b3080b5175176089d994) | Plans: project security audit with backend, frontend and auth/deploy evidence |
| 55 | 2026-10-02 | [`51168e1d2c`](https://github.com/Longnguyen9495/angi/commit/51168e1d2cf475df1e3b3479db8a804303b7e167) | Farm: water from the drop bubble; a tapped harvest suggests a dish |
| 56 | 2026-10-02 | [`30fe4c3dde`](https://github.com/Longnguyen9495/angi/commit/30fe4c3dde13725b61c904fa03d28f07ae960f29) | Farm: a tap on a ripe plot picks it, on a dry one waters it |
| 57 | 2026-10-02 | [`6e654b4298`](https://github.com/Longnguyen9495/angi/commit/6e654b42981bc80ac67965036756c217e2ac5647) | Farm: plots answer a tap and show what they need |
| 58 | 2026-10-02 | [`88d9e4bad4`](https://github.com/Longnguyen9495/angi/commit/88d9e4bad45644c1cbe5e12217f1dfbb44867d27) | Farm art: the v4 packs move to assets/farm (pack-v4, pack-v4-sprites) |
| 59 | 2026-10-02 | [`80b7482d7a`](https://github.com/Longnguyen9495/angi/commit/80b7482d7aa8b8f6adc831573949d71c7b57c479) | Audit: game cheating review and plan, with regression tests for known gaps |
| 60 | 2026-10-02 | [`229719eada`](https://github.com/Longnguyen9495/angi/commit/229719eada64880d0aac3ae10b11b9aa71ced097) | PlayCanvas: keep the corner v3 editor export next to v2 |
| 61 | 2026-10-02 | [`b7bd8af76d`](https://github.com/Longnguyen9495/angi/commit/b7bd8af76d4e15f2ed9a9ebfd938d59b7fdf1f50) | Clean up: pages saved from other sites, stale review shots, trial PDF crops |
| 62 | 2026-10-02 | [`ae7f5bd293`](https://github.com/Longnguyen9495/angi/commit/ae7f5bd293cd7629a4d01c267bc6b181004b3692) | Privacy: no personal email; data requests go through Profile → Account |
| 63 | 2026-10-02 | [`14c2e96d56`](https://github.com/Longnguyen9495/angi/commit/14c2e96d565d85ff40581eab927f0cdce6265551) | README: local now mirrors production's catalogue; how to re-sync it |
| 64 | 2026-10-02 | [`8a7ee417fe`](https://github.com/Longnguyen9495/angi/commit/8a7ee417fea09f88ffcb66b829a0355025fa3b0f) | Catalogue: the bundled snapshot is production's catalogue again |
| 65 | 2026-10-02 | [`9cdd0a348e`](https://github.com/Longnguyen9495/angi/commit/9cdd0a348e839a98becb0c5d9c20cd59c42a9c3b) | README: production deploy steps with the right users, and the local/production catalogue split |
| 66 | 2026-10-02 | [`c63d78fa73`](https://github.com/Longnguyen9495/angi/commit/c63d78fa735163176539d4dd915bcfae428e8d2c) | Farm: a sea of cloud under the island; on phones the tray is one sheet with the dock |
| 67 | 2026-10-02 | [`dd43aac333`](https://github.com/Longnguyen9495/angi/commit/dd43aac333a9dd7eb29be45da87d277f73f8fbec) | Cookbook: each dish photo is an eight-piece puzzle, one piece per cook |
| 68 | 2026-10-02 | [`03b0e6d43b`](https://github.com/Longnguyen9495/angi/commit/03b0e6d43bfc32ee641ae3269e6490a5822cfe9d) | Farm: keep the HUD, tray tools and watering note inside phone screens |
| 69 | 2026-10-02 | [`4c99f3dae5`](https://github.com/Longnguyen9495/angi/commit/4c99f3dae500ce11ffcf76d050323daa911440d7) | Kitchen: built-in recipes follow their dish to an older catalogue id |
| 70 | 2026-10-02 | [`1960dcd9bc`](https://github.com/Longnguyen9495/angi/commit/1960dcd9bc3a88c27f7a8036f20968c6eff6a4cb) | Kitchen: every catalogue dish is a recipe, cooked the way the AI wrote it |
| 71 | 2026-10-02 | [`609cb98f2d`](https://github.com/Longnguyen9495/angi/commit/609cb98f2d1d3b34724216efed60c95cee74573a) | Plans: story outline for the shared kitchen, its pause note and the three-region scene bank |
| 72 | 2026-10-02 | [`cec396b8ff`](https://github.com/Longnguyen9495/angi/commit/cec396b8ff7c53713110ebf6608506c37b1eeee7) | Farm: keep the island above the seed tray and dock |
| 73 | 2026-10-02 | [`542f664e5a`](https://github.com/Longnguyen9495/angi/commit/542f664e5a6c427185037496daf50d16363c97ca) | Cooking: every recipe runs through its own steps, not its dish family's |
| 74 | 2026-10-02 | [`ca725a40ce`](https://github.com/Longnguyen9495/angi/commit/ca725a40cebff75106a678f42dbcb6e8b976248b) | Farm plots: start on four, then one at a time at widening levels |
| 75 | 2026-10-02 | [`d2a8c10d0e`](https://github.com/Longnguyen9495/angi/commit/d2a8c10d0e924f793eab5140a4377d6da3fb3db8) | Friends: invite milestones pay XP as well as coins |
| 76 | 2026-10-02 | [`7be48858f5`](https://github.com/Longnguyen9495/angi/commit/7be48858f55e545710da97093e37e858ee404828) | Farm plots: grow the two tilled columns to the front fence first, then the sign column |
| 77 | 2026-10-02 | [`d4c0190b7b`](https://github.com/Longnguyen9495/angi/commit/d4c0190b7bf06090328a2986073f4cbf6636ea74) | Farm plots: every locked plot shows its level, so the whole field reads as one |
| 78 | 2026-10-02 | [`be148e0842`](https://github.com/Longnguyen9495/angi/commit/be148e084211a32d5708b41fa86854d33d2c7a25) | Friends: invite reward — a newcomer's milestones pay both gardens coins |
| 79 | 2026-10-02 | [`86a5e3efed`](https://github.com/Longnguyen9495/angi/commit/86a5e3efed480c0f52867a4803cf8c04fd3daa08) | Farm plots: the front grass row opens too (12 plots), sign shows just the level |
| 80 | 2026-10-02 | [`f3e550511f`](https://github.com/Longnguyen9495/angi/commit/f3e550511fc0d5ca5d51280ced023772b22e720a) | Farm plots: the signpost tile opens last and its board shows the unlock level |
| 81 | 2026-10-02 | [`0155634f22`](https://github.com/Longnguyen9495/angi/commit/0155634f22333bb5ccafeb2a1464156a6ed2d366) | Farm seed tray: chosen seed named, a few quick picks, all seeds in a grouped grid |
| 82 | 2026-10-02 | [`f7778e5695`](https://github.com/Longnguyen9495/angi/commit/f7778e569518e25f4aaac25e5cdc08059593d8af) | Farm plots: open 7-9 down the grass column beside the field, closing a 3x3 |
| 83 | 2026-10-02 | [`789da2e285`](https://github.com/Longnguyen9495/angi/commit/789da2e285a287ac206da24013e24991d046423d) | Farm: sit the island on the bottom edge instead of floating mid-screen |
| 84 | 2026-10-02 | [`60c9b43d1d`](https://github.com/Longnguyen9495/angi/commit/60c9b43d1d7e61685ba1f894e93498ccb681932f) | Farm: every crop, animal, hive and boat on its own clock, with its own germination time |
| 85 | 2026-10-02 | [`6398bc756a`](https://github.com/Longnguyen9495/angi/commit/6398bc756ab2fd900d99943ab9787a1d713c052b) | Farm item pack: hand-off, before/after and motion strips; unlocks on load; filter fixes |
| 86 | 2026-10-02 | [`20801d9f7c`](https://github.com/Longnguyen9495/angi/commit/20801d9f7c977dd46e9e116b5146292860f65ace) | Farm plots: state-driven sow, grow, water, ready and harvest animations; ranch in the menu |
| 87 | 2026-10-02 | [`6415a7937f`](https://github.com/Longnguyen9495/angi/commit/6415a7937f4433a241c9bcbe7c6303990b9b56dd) | Ranch panel: pens for all eight animals, beehive, pond and fishing boat, animated |
| 88 | 2026-10-02 | [`d8a6ca7afc`](https://github.com/Longnguyen9495/angi/commit/d8a6ca7afc7c1774a24b4dab2d7793aa0c8156fd) | Friends' 3D island: every crop drawn from its new per-stage sprite as a billboard |
| 89 | 2026-10-02 | [`5831778349`](https://github.com/Longnguyen9495/angi/commit/58317783499d8bdcdf36915524ec9fe24fe88da5) | Farm item pack: pantry and market search + groups, kind-aware seeds, generated item tables |
| 90 | 2026-10-02 | [`248dfb80a6`](https://github.com/Longnguyen9495/angi/commit/248dfb80a6c95bb2d5f060bcba9ba8767c9067b4) | Effects quality setting (auto/low/medium/high) in the profile, shared via useGame |
| 91 | 2026-10-02 | [`801ded9be4`](https://github.com/Longnguyen9495/angi/commit/801ded9be4b7cfa59bc14a12e13c677127de03a4) | Farm item pack, phase 1: re-cut sheet, central image map, 58 new items wired into the game rules |
| 92 | 2026-10-02 | [`19f74838f7`](https://github.com/Longnguyen9495/angi/commit/19f74838f76ddae26bf595fd739a2866ea39e8c0) | Farm v5: sheet koi, sheet birds, a pecking goose, swaying greenhouse plants, cleaner patches |
| 93 | 2026-10-02 | [`bcb3ad91eb`](https://github.com/Longnguyen9495/angi/commit/bcb3ad91eb653bfef4f1538e3e1184ec7c415028) | Farm: three crops a plot (a pick takes one), friends E2E fixes, all tests and verify green |
| 94 | 2026-10-02 | [`bbb97578a2`](https://github.com/Longnguyen9495/angi/commit/bbb97578a2f6d26e17c1da9aa4d42d222ab72aef) | Toasts: shorter on screen (rewards 3 s, plain notes 2.5 s, problems 4-4.5 s) |
| 95 | 2026-10-02 | [`eb5c928f57`](https://github.com/Longnguyen9495/angi/commit/eb5c928f57226ec846043c9a324669c156c69aa7) | Farm: daily/weekly quests, achievements, streak chests and more to do with friends |
| 96 | 2026-10-02 | [`c5f9e22ed5`](https://github.com/Longnguyen9495/angi/commit/c5f9e22ed5e239ed337f50e23f5e81eb5b4e4880) | Journey: opening the cookbook after cooking no longer lifts the panel |
| 97 | 2026-10-02 | [`e6ad8b5bdf`](https://github.com/Longnguyen9495/angi/commit/e6ad8b5bdf3913cccac310b1798fe2587629f783) | Farm scene: never pair a cached layout with new pictures |
| 98 | 2026-10-02 | [`80e56b0ace`](https://github.com/Longnguyen9495/angi/commit/80e56b0ace7427714bc19ced28994e436aa4b09a) | Farm: remove the cloud banks below the island |
| 99 | 2026-10-01 | [`7dc4035db3`](https://github.com/Longnguyen9495/angi/commit/7dc4035db33e9330f260f3f6e3b8ee6b73d19d79) | Plan: v5 farm hand-off notes — production deploy and how to update it |
| 100 | 2026-10-01 | [`5c68678250`](https://github.com/Longnguyen9495/angi/commit/5c68678250bb130e0b66f02f0ddd9279c92708e5) | Farm v5: colourful repaint, sheet sprites and the animation showcase |

## 8. Hướng dẫn production/deploy & kiểm soát rủi ro

Theo `README.md` hiện tại:
- VPS source: `/var/www/angi`; nginx config mẫu `deploy/nginx/angi.conf`; runtime dùng `php8.5-fpm` và SQLite.
- Khi deploy, repository/code thuộc user `rexllm`; DB SQLite runtime thuộc `www-data`. Tránh git/npm bằng root. **Không mặc định tài khoản ChatGPT có SSH vào VPS**.
- Trước thao tác có thể thay đổi schema phải sao lưu `storage/database/angi.sqlite`; gọi `server/bin/check-config.php`, `server/bin/migrate.php` theo đúng user/quy trình đang áp dụng; build bằng nguồn đã kiểm tra. Đọc toàn bộ README trước khi thao tác.
- Không ghi `APP_KEY`, `ADMIN_PASSWORD`, `SMTP_*`, `SEPAY_API_KEY`, `SKY_SECRET`, private SSH key, PAT vào tài liệu/repo.
- Vườn Mây dùng admin `sky.enabled`, tài liệu ghi mặc định **TẮT** ở giai đoạn triển khai đầu; cần `SKY_SECRET` ở môi trường triển khai trước khi bật, và test `npm run test:server`.
- Sau pull có migrations cho tài khoản/friends/spins/garden; migration và seed là việc **trên môi trường cụ thể**, không làm mù quáng.
- Các dữ liệu ảnh upload, file DB, secrets thuộc runtime/backups **không được chuyển chỉ bằng `git clone`**.
- Với tính năng thanh toán VietQR/SePay, xem cấu hình ở admin và README, kiểm thử quyền xác nhận thanh toán và webhook trong môi trường an toàn trước production.
- Khi báo cáo hoàn thành cho chủ dự án, phải có: SHA commit, branch, danh sách file sửa, kết quả test, bằng chứng deploy/URL và việc chưa kiểm chứng.

## 9. Prompt khởi động cho tài khoản ChatGPT mới

> Tôi đang tiếp quản dự án **Ăn gì?**. Repo chính: **https://github.com/Longnguyen9495/angi**, nhánh `main`. Hãy sử dụng GitHub làm nguồn sự thật, chưa được tự suy đoán có GitLab remote. Đầu tiên hãy đọc file `PROJECT_HANDOVER.md`, `README.md`, `package.json` và `plans/vuon-may.md` ngay trên `main` mới nhất, rồi đối chiếu code thực tế với các ghi chú. Nếu tôi cung cấp URL GitLab chính thức, mới thêm/kết nối GitLab theo hướng dẫn trong hồ sơ; không tự tạo remote hoặc di chuyển source. Khi sửa phải phân biệt (1) đã có code, (2) đã chạy test, (3) đã commit/merge, (4) đã deploy, (5) mới là yêu cầu hoặc chờ asset. Không khẳng định hoàn thành nếu không có bằng chứng. Ưu tiên chất lượng ảnh món, `/fake/`, PNG alpha thật, và tài sản Vườn Mây từng vật thể độc lập, không crop từ sheet. Trước khi làm hãy tóm tắt head SHA, trạng thái app/test, hạng mục còn mở và kế hoạch triển khai. Không tự thao tác seed/secret/production nguy hiểm.

## 10. Quy tắc cập nhật tài liệu sau các lần sửa

Mỗi lần hoàn thành một hạng mục quan trọng, ghi vào cuối mục này hoặc cập nhật phần liên quan:
- **Ngày/giờ** và link commit/PR, branch, ai/tiện ích thực hiện.
- **Vấn đề** người dùng yêu cầu; **phương án**; **file/route/api** đã sửa.
- **Bằng chứng:** kết quả `npm run verify` hoặc phần test liên quan; ảnh chụp/device QA nếu có.
- **Trạng thái:** mới đề xuất / đã code / đã commit / đã merge / đã deploy / đã xác minh production / còn blocker.
- **Rủi ro & rollback:** SHA trước khi sửa, migration và thay đổi dữ liệu, nếu có.
- **Asset:** file gốc, mã/tên, kiểm tra quyền sử dụng, alpha, kích thước, manifest và nguồn phát hành.
- **GitLab:** khi đã kết nối, thêm đúng URL đã xác minh, người chịu trách nhiệm, branch, mirroring và quyền/CI. Không lưu khóa.

### Nhật ký từ 31/10/2026
- **31/10/2026:** tạo tài liệu bàn giao này; tổng hợp từ repo GitHub và lịch sử dự án; ghi trạng thái GitLab **chưa xác minh project chính thức**. Đây là **commit tài liệu**, không phải thay đổi gameplay, bản build hay deploy.

---

**Tài liệu hữu ích:** [README.md](README.md) · [Kế hoạch Vườn Mây](plans/vuon-may.md) · [An toàn/chống gian lận](plans/sua-bao-mat-va-gian-lan.md) · [Prompt ảnh Vườn Mây](prompts/sky-garden-chatgpt.txt) · [GitHub history](https://github.com/Longnguyen9495/angi/commits/main).

**Điều tối quan trọng với tài khoản mới:** Git lưu code và commit; tài liệu này lưu context; còn quyền app ChatGPT, các cuộc hội thoại, secret deploy và dữ liệu runtime phải được kết nối/chuyển riêng theo quy trình phù hợp.

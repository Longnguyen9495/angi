# B03 — tiến độ ma trận (08/10/2026)

Ma trận đang chạy, chưa hoàn tất B03/B04. Không thay luật kinh tế hoặc nới assertion. Baseline B01/B02 được giữ nguyên.

## Kết quả đã thu lúc 23:03 UTC+7

| Hồ sơ | Seed đã chạy | T1–T10 (ngày mở; — chưa đạt 90 ngày) | Gross xu/ngày, trung bình 14 ngày cuối | XP mây tối đa/ngày |
|---|---|---|---:|---:|
| 1 phiên | 20261008/09/10 | 1/4/11/23/37/59/87/—/—/— | 413.142857 | 150 |
| 3 phiên | 20261008/09/10 | 1/4/9/18/27/40/55/72/90/— | 1952.214286 | 150 |
| 6 phiên | 20261008 | 1/4/8/14/21/31/43/57/76/— | 3998.357143 | 150 |

Nguồn: báo cáo JSON từng case trong [thư mục artefact](../storage/sky-garden-qa/b03/). Đây là kết quả trung gian, không đại diện các case chưa hoàn tất.

- Các lượt 3 phiên và lặp đã exit 0.
- Các lượt 1 phiên và lặp exit 1: tầng 3 ngày 11 vượt assertion ngày 10. Tầng 4 ngày 23 cũng chậm hơn mục tiêu ngày 21, nhưng assertion đầu dừng test trước khi kiểm tra tiếp.
- Lượt 6 phiên seed 20261008 exit 1: gross xu trung bình vượt ngưỡng 2200. Không che lỗi bằng cách loại báo cáo này khỏi đánh giá cân bằng.
- Không hồ sơ đã quan sát nào mở T10 trong 90 ngày. Điều này chưa chứng minh soft-lock; cần B04/B05 phân tích nguồn tài nguyên, thời gian và chính sách chi tiêu bot.
- Các seed 1/3 phiên cho mốc tầng giống nhau; không kết luận toàn bộ RNG/report giống nhau nếu chưa đối chiếu đầy đủ.

## Tiếp tục

1. Chờ tiến trình ma trận hiện tại; không khởi chạy bản trùng hoặc sửa code được tiến trình đang dùng.
2. Tổng hợp cả case exit 1, kiểm tra lặp độc lập và lưu trạng thái test riêng với trạng thái thu dữ liệu.
3. Không dùng summary chỉ lọc exit 0 để đại diện mọi hồ sơ; sửa exporter sau khi tiến trình hoàn tất để giữ cả báo cáo thất bại và lý do.
4. Hoàn thiện B04 rồi đánh giá B05 trước khi cân chỉnh dữ liệu.

Chưa deploy/push, chưa bật Vườn Mây, chưa nghiệm thu thiết bị thật, chưa triển khai xong toàn bộ backlog.

## Bàn giao cuối ngày 08/10/2026 (23:30) — làm tiếp từ đây

Toàn bộ code và artefact đã đẩy lên nhánh `wip/sky-sim-b03` (chưa merge main, chưa deploy).

**Trạng thái ma trận** ([matrix-run.log](../storage/sky-garden-qa/b03/matrix-run.log), [summary.json](../storage/sky-garden-qa/b03/summary.json)):
- 3 phiên × 3 seed × 2 lần: 6/6 exit 0.
- 1 phiên × 3 seed × 2 lần: 6/6 exit 1 (assertion tầng 3 ngày 11 > 10; tầng 4 ngày 23 > 21) — đúng là lệch cân bằng, không phải lỗi runner.
- 6 phiên seed 20261008 × 2 lần: exit 1 (gross xu trung bình > 2200).
- 6 phiên seed 20261009/20261010 × 2 lần: **exit 3221225794 (0xC0000142, tiến trình con không khởi động được — log rỗng)**. Đây là lỗi môi trường, không phải kết quả test.
- Lúc 23:22 đã mở lượt chạy bù riêng cho 4 case trên (lệnh `node -e` inline, ghi `b03/recovery-matrix.json`; bản sao artefact cũ ở `b03/history-1791476574374/`). Lúc đẩy code lượt này **còn đang chạy**; mỗi case 6 phiên ~11 phút.

**Mai làm tiếp theo thứ tự:**
1. Đọc `storage/sky-garden-qa/b03/recovery-matrix.json` và `six-20261009*/six-20261010*-exit.txt`. Nếu vẫn 0xC0000142 hoặc thiếu: chạy lại từng case một (máy yếu — một lượt mỗi lần):
   `set TZ=Asia/Ho_Chi_Minh& set SIM_B03=1& set SIM_DAYS=90& set SIM_PROFILE=six& set SIM_SEED=20261009& set SIM_REPEAT=0& node scripts/run-vitest.mjs run src/domain/skySimB03.test.ts`
2. Sửa [sim-b03.mjs](../scripts/sky-garden/sim-b03.mjs): summary hiện **lọc bỏ case exit≠0** → hồ sơ 1 phiên và 6 phiên không có trong summary. Phải giữ cả case thất bại (kèm lý do assertion) và tách "test PASS/FAIL" khỏi "thu dữ liệu OK"; ghi `signal`/`error` của spawn; thêm chế độ chạy bù 1 case thay cho lệnh inline.
3. Đối chiếu case lặp (repeat) với case gốc: JSON phải giống hệt (đã đúng với three/one/six-20261008 theo kích thước file, cần so nội dung).
4. Cập nhật bảng kết quả ở đầu file này, rồi B04 (nghỉ 7–14 ngày, không bạn/sự kiện, chỉ đất, giàu tài nguyên) và B05 (đánh giá, đề xuất chỉnh dữ liệu tối thiểu) theo [backlog](backlog-trien-khai-tuan-tu.md).
5. Chưa đụng luật kinh tế/assertion; chưa bật Vườn Mây; chưa test máy thật.

**Code mới trong lượt này** (chưa review kỹ, typecheck exit 0, unit B03/measurement 5/5 PASS):
[skySimHarness.ts](../src/domain/skySimHarness.ts) (bot tách ra khỏi skySim.test.ts), [skySimConfig.ts](../src/domain/skySimConfig.ts) (hồ sơ/seed qua env),
[skySimMeasurement.ts](../src/domain/skySimMeasurement.ts) (đếm delta ledger theo transition, sửa lỗi cắt 1000 entry),
[skySimB03.test.ts](../src/domain/skySimB03.test.ts), [skySimMeasurement.test.ts](../src/domain/skySimMeasurement.test.ts), [sim-b03.mjs](../scripts/sky-garden/sim-b03.mjs).

# B01 — baseline mô phỏng Vườn Mây 90 ngày

## Kết luận (08/10/2026)

**B01 PASS: thu baseline thành công; chưa chứng nhận cân bằng hay cổng G0–G6.** Không sửa implementation, kinh tế, dependency hoặc công tắc sky. Không gọi production, đọc secrets, dùng DB, push/deploy hay áp dụng stash.

- Commit nền: 07ff96c0e1c5f3b56bdcd730f1274c55c1a54d7c. Git trước chạy chỉ có [backlog](backlog-trien-khai-tuan-tu.md) untracked; giữ nguyên nội dung ngoài phần cập nhật B01. Stash trước chạy: stash@{0}, e16c54f642be2647381b67e404b3a5e93bea8cf6.
- Windows 10/CMD; Node v24.18.0, npm 11.16.0, Vitest 5.0.2; dependency hiện có hoạt động, không cài mới.
- Lệnh thật: `npm run sky:sim`, được chạy qua tiến trình CMD con với SIM_DAYS=90 và TZ=Asia/Ho_Chi_Minh. Tiến trình cha không thay biến môi trường. Wrapper sao lưu artefact cũ nếu có, ghi log và exit code sau khi tiến trình kết thúc.
- Bắt đầu 2026-10-08T13:44:58.350Z; kết thúc 2026-10-08T13:54:13.371Z (555.021 giây toàn lệnh). Vitest báo 544.99 giây; 20 ms ở dòng test không phải thời gian mô phỏng, vì mô phỏng chạy khi thu thập suite.
- **Exit code 0; 1 file test PASS, 4/4 test PASS, không test thất bại/bỏ qua.** Bảng được ghi trước assertions, nên kết luận dựa cả bảng lẫn log/exit code.
- Artefact: [baseline metadata](../storage/sky-garden-qa/sim-90-baseline.json), [log](../storage/sky-garden-qa/sim-90-run.log), [exit code](../storage/sky-garden-qa/sim-90-exit.txt), [bảng gốc](../storage/sky-garden-qa/sim-90.txt). Bảng được chép nguyên dưới đây để không phụ thuộc storage bị ignore.

## Đầu vào và phạm vi

Theo [simulator](../src/domain/skySim.test.ts:36): seed 20261008; ngày bắt đầu 01/10/2026 theo timezone Việt Nam; phiên 08h/13h/21h, 3 phiên/ngày; cấp đầu 12, xu đầu 800; đất cộng cố định 260 XP và 220 xu/ngày. Mật đầu 3, sữa đầu 2; thêm 1 mật vào ngày có chỉ số d chia hết cho 2 và 1 sữa vào ngày d chia hết cho 3 (d bắt đầu 0). Bot thu/bắt bọ/nấu/đóng thùng/bán/mua ô và chậu/trồng qua reducer thật; RNG bọ giả lập cùng xác suất, không phải HMAC server. Không có bạn giúp, không mô phỏng nghỉ dài hay nhiều seed/hồ sơ.

## Ngày mở tầng và số dư

| Tầng | Ngày mở |
|---|---:|
| T1 | 1 |
| T2 | 4 |
| T3 | 9 |
| T4 | 18 |
| T5 | 27 |
| T6 | 40 |
| T7 | 55 |
| T8 | 72 |
| T9 | 90 |
| T10 | Chưa đạt trong 90 ngày |

T5 ngày 27 nằm trong mục tiêu ngày 20–30 **cho đúng hồ sơ/seed này**, không phải assertion về cửa sổ mục tiêu. Cuối ngày 90: cấp 58, 9 tầng, 48 chậu, **1 xu**, 2030 bọ tồn kho và 0 gem. Chưa có bằng chứng ngày đến T10/đường thường trực đến T10; không suy diễn soft-lock hay khả năng đạt sau ngày 90. Số dư 1 xu cần khảo sát nguồn–sink tiếp, không tự đổi giá.

## Bảng nguyên bản (19 dòng lấy mẫu, không phải 90 dòng)

```text
day	level	floors	pots	coins	skyCoins	skyXp	bugs	gems
1	12	1	6	259	39	27	5	0
2	13	1	6	581	249	45	9	0
3	14	1	6	882	228	43	12	0
4	15	2	9	61	166	69	22	0
5	16	2	9	25	281	93	33	0
6	17	2	10	251	423	90	41	0
7	18	2	12	349	308	63	56	0
14	23	3	18	486	0	0	155	0
21	28	4	24	147	0	0	282	0
28	32	5	24	151	0	0	436	0
35	36	5	30	1442	0	0	593	0
42	39	6	32	1	0	0	738	0
49	43	6	36	2339	0	0	906	0
56	46	7	38	5	0	0	1073	0
63	48	7	42	2199	0	0	1237	0
70	51	7	42	5896	0	0	1465	0
77	54	8	48	695	0	0	1629	0
84	56	8	48	4887	0	0	1834	0
90	58	9	48	1	0	0	2030	0

floors opened on day: 1 / 4 / 9 / 18 / 27 / 40 / 55 / 72 / 90 / —
pots: 48
```

## Kiểm tra qua và giới hạn số đo

[4 assertions hiện có](../src/domain/skySim.test.ts:279) đều PASS: T1 ngày đầu/T3 ≤10 ngày; T5 trong mùa 90 ngày; T4 ≤21 ngày; XP mây báo cáo ≤150/ngày và thu xu mây trung bình 14 ngày cuối <2200/ngày. Không chạy full regression, typecheck, PHP guard, browser hoặc máy thật trong B01; không gọi đây là nghiệm thu HMAC, race, hai tài khoản/hai thiết bị hay bất biến toàn kho.

**Cảnh báo thống kê xác định bằng đọc code:** [ledger giới hạn 1000](../src/domain/ledger.ts:17) và [mỗi lần post cắt đuôi](../src/domain/ledger.ts:94), nhưng [simulator lấy slice theo ledgerSeen](../src/domain/skySim.test.ts:100) rồi chỉ xử lý cắt khi >4000. Khi ledger đầy, cursor bằng độ dài 1000 nên các entry mới bị bỏ khỏi phép đếm. Vì vậy skyCoins/skyXp bằng 0 ở dòng ngày 14 trở đi **không chứng minh thu nhập/XP thật bằng 0**; assertion cap/thu nhập cuối mùa có thể PASS do thiếu thống kê. Không dùng các cột này để chứng nhận cân bằng hoặc suy ra tổng XP. Ngày tầng/số dư/chậu/cấp/bọ/gem đọc trực tiếp state, không phụ thuộc phép cộng ledger đó.

Exporter hiện có không xuất XP tổng, Hạt Mây/Sương Mai, tổng giao đơn, nguồn–sink, số lần kẹt hoặc tất cả 90 ngày. B01 không bổ sung số liệu bằng suy đoán. Bảng/log không mất nên không cần sửa runner hoặc thêm test exporter ở lượt này.

## Kiểm tra bàn giao

Git cuối lượt chỉ có [plan Vườn Mây](vuon-may.md) modified, [backlog](backlog-trien-khai-tuan-tu.md) và báo cáo này untracked cùng thư mục artefact QA mới; không có implementation thay đổi. Commit và định danh stash vẫn đúng baseline. Lệnh kiểm tra diff whitespace trả exit 0. Đối chiếu chuỗi bảng lần đầu FAIL do CRLF tài liệu khác LF bảng; chạy lại chỉ chuẩn hóa xuống dòng trả exit 0/PASS, không sửa số liệu. [Biên bản kiểm tra cuối](../storage/sky-garden-qa/b01-final-verification.txt) lưu kết quả thật. Log bị Git ignore; bảng/baseline/exit không bị ignore trong kiểm tra này. Không force-add hay tạo commit; báo cáo này giữ bản bảng độc lập để tác vụ cha quản lý artefact.

## Bàn giao B02 (chưa triển khai)

Ưu tiên sửa thống kê để thu delta theo từng thao tác trước khi ledger cắt đuôi, không thay gameplay; kiểm thử vượt 1000 entry và đối chiếu tổng với state/nguồn–sink. Sau đó xuất đủ 90 dòng, XP/xu, Hạt Mây/Sương Mai, giao đơn, số lần kẹt và metadata; chạy lặp seed 20261008 để xác nhận tái lập. Giữ baseline này làm đối chứng; B03–B05 mới mở rộng hồ sơ và đánh giá kinh tế. Không nới assertion hoặc chỉnh kinh tế để tạo PASS.

## B02 — hoàn tất phép đo (08/10/2026)

Chỉ sửa simulator; giữ nguyên baseline B01 phía trên và artefact lịch sử. Không đổi luật, ledger production (1000), giá, RNG, lịch phiên hay assertion kinh tế. B03+ chưa triển khai.

### Implementation và bằng chứng

- [Đo từng transition](../src/domain/skySimMeasurement.ts): so khóa trước/sau, không dùng chiều dài hay identity entry đã clone; fail closed khi toàn bộ đuôi bị thay, đối chiếu coin/XP và tài nguyên được tác động (trừ pot/stamp có semantics riêng).
- [Simulator](../src/domain/skySim.test.ts): đối chiếu coin/XP mỗi ngày với nguồn đất; xuất đủ 90 dòng và nguồn/sink từng tài nguyên trong JSON; metadata ghi TZ yêu cầu Asia/Ho_Chi_Minh, runtime chuẩn hóa thành Asia/Saigon.
- [Regression](../src/domain/skySimMeasurement.test.ts): 3300 entry qua nhiều rollover, transition 3 entry, clone/no-op/retry; nguồn 3300 xu, sink 1100 xu, XP 2200, không bỏ sót/đếm đôi.
- Test mục tiêu qua runner với skySimMeasurement.test.ts và sky.test.ts: 12/12 PASS, exit 0 cuối cùng; [log](../storage/sky-garden-qa/b02-targeted-optimized.log), [exit](../storage/sky-garden-qa/b02-targeted-optimized-exit.txt). Lần trung gian exit 1 do timeout 5000ms, giữ [log lỗi](../storage/sky-garden-qa/b02-targeted-final.log); tối ưu fixture clone chỉ ledger, không nới timeout/assertion.
- Typecheck qua node node_modules/typescript/bin/tsc -b: exit 0; [log](../storage/sky-garden-qa/b02-typecheck-optimized.log), [exit](../storage/sky-garden-qa/b02-typecheck-optimized-exit.txt).
- Mô phỏng qua node scripts/sky-garden/sim.mjs (entry point sky:sim), SIM_DAYS=90, TZ=Asia/Ho_Chi_Minh, seed 20261008: hai lần exit 0, 4/4 PASS; [log đầu](../storage/sky-garden-qa/b02-sim90.log), [log lặp](../storage/sky-garden-qa/b02-sim90-repeat.log), [exit lặp](../storage/sky-garden-qa/b02-sim90-repeat-exit.txt).
- [Đối chiếu lặp](../storage/sky-garden-qa/b02-repeat-verification.txt): 90 dòng giống hệt; [JSON đầy đủ](../storage/sky-garden-qa/sim-90-b02.json), [bảng đầy đủ](../storage/sky-garden-qa/sim-90-b02.txt).

### Số liệu đã sửa

- Tổng xu mây gross: 101502; sink xu: 122101; đất: 19800. Đối chiếu: 800 + 19800 + 101502 - 122101 = 1 xu.
- XP mây: 12754; đất: 23400; đầu 2200. Đối chiếu: 2200 + 23400 + 12754 = 38354 XP. Max 150/ngày, không ngày nào vượt cap.
- Xu mây trung bình 14 ngày cuối: 1952.214286 < 2200/ngày. Ngày 14: 589 xu gross/150 XP, không phải 0/0; ngày 90: 1969 xu gross/150 XP.
- Mốc T1–T9 giữ nguyên 1/4/9/18/27/40/55/72/90; T10 chưa đạt. Cuối: cấp 58, 48 chậu, 1 xu, Hạt Mây 31, Sương Mai 123.
- Tổng thùng đóng: 280; đơn hoàn tất: 9; lần mở tầng trả unchanged: 262. Chỉ số cuối là thao tác không thành công, KHÔNG kết luận soft-lock.

| Tài nguyên | Nguồn ledger | Sink ledger |
|---|---:|---:|
| skyitem:cloudseed | 106 | 75 |
| skyitem:dew | 157 | 34 |

### Giới hạn và bước kế tiếp

Một seed/hồ sơ 3 phiên; chưa chứng nhận cân bằng/G0–G6, server HMAC, race, nhiều thiết bị hoặc bất biến toàn kho. Pot/stamp không đối chiếu bằng balance transition; tài nguyên không có entry không được kiểm độc lập ngoài coin/XP. Không mô phỏng nghỉ dài/bạn/sự kiện. Chưa có metric chứng minh kẹt hoặc phân loại nguyên nhân thiếu nguyên liệu. B03 tiếp theo tham số hóa hồ sơ/seed; đánh giá kinh tế sau dữ liệu đúng, không tự điều chỉnh giá/cap. Giữ stash và thay đổi trước tác vụ, không DB/PHP/production/secrets/push/deploy/bật sky.

### Bảng B02 đủ 90 ngày

```text
day	level	floors	pots	coins	skyCoins	skyXp	bugs	gems	coinSink	cloudseed	dew	boxes	orders	failedFloorAttempts	ledgerEntries
1	12	1	6	259	39	27	5	0	800	2	1	0	0	3	119
2	13	1	6	581	249	45	9	0	147	2	1	0	0	3	107
3	14	1	6	882	228	43	12	0	147	2	1	0	0	3	110
4	15	2	9	61	166	69	22	0	1207	2	1	0	0	2	161
5	16	2	9	25	281	93	33	0	537	4	1	0	0	3	182
6	17	2	10	251	423	90	41	0	417	4	1	0	0	3	190
7	18	2	12	349	445	93	56	0	567	4	1	0	0	3	202
8	18	2	12	695	423	90	69	0	297	4	1	0	0	3	193
9	19	3	12	5	349	89	75	0	1259	1	1	0	0	2	161
10	20	3	12	80	496	132	96	0	641	2	3	0	0	3	224
11	21	3	12	130	591	150	109	0	761	3	4	0	0	3	255
12	22	3	14	258	589	150	122	0	681	4	6	0	0	3	261
13	22	3	17	238	591	150	137	0	831	5	8	0	0	3	263
14	23	3	18	486	589	150	155	0	561	6	10	0	0	3	264
15	24	3	18	856	591	150	175	0	441	7	12	0	0	3	262
16	25	3	18	1224	589	150	187	0	441	8	14	0	0	3	256
17	25	3	18	1594	591	150	203	0	441	9	16	0	0	3	258
18	26	4	18	2	662	150	227	0	2474	4	16	0	0	2	282
19	27	4	18	6	676	133	241	0	892	5	18	0	0	3	224
20	27	4	20	137	790	150	264	0	879	6	20	0	0	3	306
21	28	4	24	147	939	150	282	0	1149	7	22	0	0	3	329
22	29	4	24	579	851	150	302	0	639	8	24	0	0	3	325
23	29	4	24	984	824	150	329	0	639	9	26	0	0	3	329
24	30	4	24	1397	832	150	347	0	639	10	28	0	0	3	323
25	31	4	24	1821	843	150	372	0	639	11	30	0	0	3	326
26	31	4	24	2234	832	150	399	0	639	12	32	0	0	3	332
27	32	5	24	1	774	150	416	0	3227	5	31	5	0	2	279
28	32	5	24	151	1025	150	436	0	1095	8	32	6	1	3	304
29	33	5	24	1	508	150	451	0	878	9	34	5	0	3	209
30	33	5	25	107	789	150	470	0	903	10	35	5	0	3	297
31	34	5	30	90	1218	150	498	0	1455	13	36	6	1	3	353
32	34	5	30	435	920	150	521	0	795	14	38	5	0	3	330
33	35	5	30	845	985	150	540	0	795	15	40	5	0	3	341
34	35	5	30	1116	846	150	563	0	795	16	42	4	0	3	334
35	36	5	30	1442	901	150	593	0	795	17	44	5	0	3	346
36	37	5	30	2065	1198	150	612	0	795	20	46	6	1	3	342
37	37	5	30	2402	912	150	629	0	795	21	48	5	0	3	330
38	38	5	30	2784	957	150	650	0	795	22	50	5	0	3	346
39	38	5	30	3489	1280	150	673	0	795	25	52	6	1	3	341
40	38	6	30	2	907	150	694	0	4614	16	50	3	0	2	334
41	39	6	30	7	952	150	711	0	1167	17	52	4	0	3	308
42	39	6	32	1	1362	150	738	0	1588	18	54	4	0	3	371
43	40	6	34	108	1012	150	756	0	1125	19	56	2	0	3	310
44	40	6	36	76	934	150	780	0	1186	20	58	5	0	3	369
45	41	6	36	540	1243	150	811	0	999	21	60	4	0	3	382
46	41	6	36	842	1081	150	836	0	999	22	62	4	0	3	381
47	42	6	36	1481	1418	150	866	0	999	23	64	3	0	3	395
48	42	6	36	1984	1282	150	890	0	999	24	66	4	0	3	385
49	43	6	36	2339	1134	150	906	0	999	25	68	3	0	3	376
50	43	6	36	2806	1246	150	931	0	999	26	70	5	0	3	377
51	44	6	36	3367	1340	150	955	0	999	27	72	5	0	3	375
52	44	6	36	3899	1311	150	969	0	999	28	74	3	0	3	375
53	44	6	36	4209	1089	150	995	0	999	29	76	4	0	3	384
54	45	6	36	4656	1226	150	1026	0	999	30	78	5	0	3	373
55	45	7	36	50	1283	150	1052	0	6109	19	74	4	0	2	354
56	46	7	38	5	1181	150	1073	0	1446	20	76	4	0	3	319
57	46	7	39	3	1112	150	1091	0	1334	21	78	4	0	3	284
58	46	7	40	9	622	150	1104	0	836	22	80	5	0	3	216
59	47	7	41	61	877	150	1128	0	1045	23	82	3	0	3	309
60	47	7	42	193	1277	150	1157	0	1365	26	84	6	1	3	389
61	48	7	42	769	1601	150	1181	0	1245	27	86	4	0	3	389
62	48	7	42	1668	1924	150	1215	0	1245	30	88	6	1	3	424
63	48	7	42	2199	1556	150	1237	0	1245	31	90	4	0	3	400
64	49	7	42	2746	1572	150	1272	0	1245	32	92	4	0	3	411
65	49	7	42	3118	1397	150	1306	0	1245	33	94	5	0	3	419
66	50	7	42	3603	1510	150	1335	0	1245	34	96	5	0	3	397
67	50	7	42	4267	1689	150	1370	0	1245	35	98	3	0	3	425
68	50	7	42	4791	1549	150	1402	0	1245	36	100	5	0	3	416
69	51	7	42	5316	1550	150	1433	0	1245	37	102	3	0	3	412
70	51	7	42	5896	1605	150	1465	0	1245	38	104	5	0	3	419
71	51	7	42	6479	1608	150	1491	0	1245	39	106	2	0	3	414
72	52	8	43	9	993	150	1509	0	7683	25	100	3	0	2	231
73	52	8	45	6	1200	150	1519	0	1423	28	101	6	1	3	278
74	53	8	45	9	1174	150	1540	0	1391	29	102	5	0	3	264
75	53	8	47	11	1059	150	1559	0	1277	30	103	5	0	3	307
76	53	8	48	57	1503	150	1591	0	1677	31	105	4	0	3	401
77	54	8	48	695	1975	150	1629	0	1557	32	107	3	0	3	443
78	54	8	48	1296	1938	150	1659	0	1557	33	109	5	0	3	434
79	54	8	48	1804	1845	150	1683	0	1557	34	111	4	0	3	435
80	55	8	48	2318	1851	150	1706	0	1557	35	113	4	0	3	428
81	55	8	48	2940	1959	150	1738	0	1557	36	115	4	0	3	440
82	55	8	48	3806	2203	150	1770	0	1557	39	117	6	1	3	427
83	56	8	48	4302	1833	150	1803	0	1557	40	119	3	0	3	448
84	56	8	48	4887	1922	150	1834	0	1557	41	121	5	0	3	435
85	56	8	48	5603	2053	150	1862	0	1557	42	123	3	0	3	440
86	57	8	48	6001	1735	150	1893	0	1557	43	125	4	0	3	432
87	57	8	48	6658	1994	150	1928	0	1557	44	127	5	0	3	438
88	57	8	48	7537	2216	150	1962	0	1557	47	129	6	1	3	434
89	58	8	48	8038	1838	150	1996	0	1557	48	131	4	0	3	442
90	58	9	48	1	1969	150	2030	0	10226	31	123	3	0	2	408

floors opened on day: 1 / 4 / 9 / 18 / 27 / 40 / 55 / 72 / 90 / —
pots: 48
```

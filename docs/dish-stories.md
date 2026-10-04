# Câu chuyện món ăn

Chi tiết món không còn video/review theo tỉnh. Thay vào đó là một bài đọc dài về nguồn gốc và ý nghĩa của món.

## Dữ liệu

Nội dung biên tập nằm trong [stories/](../src/features/food-reel/data/stories/), chia theo nhóm: `north-central.ts`, `south.ts`, `east-asia.ts`, `world.ts`. Schema ở [types.ts](../src/features/food-reel/data/stories/types.ts):

| Trường | Nội dung |
| --- | --- |
| `homeland`, `era` | Quê hương và thời kỳ hình thành |
| `tagline` | Một câu tóm ý nghĩa món |
| `origin` | 3 đoạn về nguồn gốc |
| `timeline` | 3–5 mốc lịch sử |
| `meaning` | Ý nghĩa văn hóa, vị trí trong đời sống |
| `symbols` | Nguyên liệu/chi tiết và ý nghĩa của chúng |
| `tasting` | Cách thưởng thức như người bản địa |
| `facts` | 3 điều thú vị |
| `saying` | Ca dao, câu nói nổi tiếng (chỉ khi có thật) |
| `reference` | Bài tổng quan để đọc thêm |

Nguyên tắc: lịch sử đã được ghi nhận rộng rãi thì viết thẳng; truyền thuyết và nguồn gốc còn tranh luận phải ghi rõ ("tương truyền", "có nhiều giả thuyết"). Không bịa năm, tên người, tên quán hay trích dẫn.

[dishStories.ts](../src/features/food-reel/data/dishStories.ts) gộp các nhóm, khóa theo ID catalogue chính xác. Bản ghi trùng (`bun-bo-hue-2`, `pizza-hai-san-2`, …) dùng chung câu chuyện qua `STORY_ALIASES` khai báo tường minh. Món mới thêm trong admin mà chưa có câu chuyện sẽ chỉ hiện mô tả catalogue, không mượn lịch sử của món khác. Kiểm thử `dishStories.test.ts` sẽ fail cho tới khi món đó có câu chuyện, nhắc người biên tập bổ sung.

## Trải nghiệm

[StoryChapters](../src/features/food-reel/components/StoryChapters.tsx) gồm: bìa (quê hương, thời kỳ, câu ý nghĩa hiện từng chữ), rồi bảy chương: Nguồn gốc, Dòng thời gian, Ý nghĩa văn hóa, Nguyên liệu & biểu tượng, Thưởng thức, Có thể bạn chưa biết, Đọc thêm.

Hiệu ứng (motion, `domAnimation`):

- Tiêu đề chương quét vào bằng clip-path; đoạn văn hiện dần từ mờ sang rõ, so le.
- Số chương cỡ lớn trôi parallax phía sau theo cuộn.
- Dòng thời gian: thanh dọc tự lấp đầy theo vị trí cuộn, điểm mốc bật lò xo, mốc trượt vào xen kẽ trái/phải.
- Thẻ nguyên liệu lật 3D vào khung, nhấc lên khi hover; thẻ "điều thú vị" bật lò xo.
- Câu nói/ca dao hiện từng chữ; thanh tiến độ đọc có lò xo; thanh chương tự cuộn theo chương đang đọc.

Chế độ giảm chuyển động tắt toàn bộ hiệu ứng (nội dung hiện ngay, không parallax). Không có SVG animation (`npm run check:motion`).

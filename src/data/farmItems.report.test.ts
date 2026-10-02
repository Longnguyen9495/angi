/**
 * Writes plans/vat-pham-nong-trai-bang.md: every farm item, source, state and image, straight
 * from the game data and scripts/farm-items/catalog.json (so the tables never drift from code).
 * Skipped in normal runs:  FARM_REPORT=1 node scripts/run-vitest.mjs run src/data/farmItems.report
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { t } from '../i18n';
import {
  ANIMALS,
  BOAT,
  CATCHES,
  CROPS,
  HIVE,
  MARKET,
  PRODUCE_IDS,
  isCrop,
  produceCategory,
  produceName,
  produceUnlockLevel,
  sellPrice,
} from './game';
import type { ProduceId } from './types';

const ROOT = process.cwd();
const CATALOG = JSON.parse(readFileSync(join(ROOT, 'scripts/farm-items/catalog.json'), 'utf8')) as {
  images: Record<string, string>;
  items: Record<
    string,
    {
      confidence: string;
      produceIsStage?: boolean;
      stagesMissing?: string[];
      source: string;
    }
  >;
  unconfirmed: Record<string, string>;
};
const RECTS = JSON.parse(
  readFileSync(join(ROOT, 'public/images/farm-items/rects.json'), 'utf8'),
) as Record<string, { width: number; height: number }>;

/** The items that existed before the pack (their ids and numbers are kept). */
const ORIGINAL = new Set<ProduceId>([
  'rice',
  'herbs',
  'chili',
  'scallion',
  'bean',
  'tomato',
  'lemongrass',
  'garlic',
  'cucumber',
  'lime',
  'egg',
  'milk',
  'fish',
  'shrimp',
]);

const KIND = { veg: 'Rau (thu 1 lần)', tree: 'Cây lâu năm', mushroom: 'Nấm (3 đợt)' } as const;

function sourceOf(id: ProduceId): string {
  if (isCrop(id)) return `Ô trồng · ${KIND[CROPS[id].kind]}`;
  const animal = Object.values(ANIMALS).find((a) => a.product === id);
  if (animal) return `Chuồng · ${animal.name}`;
  if (id === 'honey' || id === 'honeycomb') return 'Trại ong';
  return CATCHES[id as keyof typeof CATCHES]?.source === 'boat' ? 'Thuyền đánh cá' : 'Ao (câu cá)';
}

function cycle(id: ProduceId): string {
  if (isCrop(id)) {
    const c = CROPS[id];
    if (c.kind === 'tree') return `${c.growHours} h đầu, rồi ${c.regrowHours} h/lần`;
    if (c.kind === 'mushroom')
      return `${c.growHours} h đầu, rồi ${c.regrowHours} h × ${c.flushes} đợt`;
    return `${c.growHours} h`;
  }
  const animal = Object.values(ANIMALS).find((a) => a.product === id);
  if (animal) return `${animal.hours} h (ăn 1 ${CROPS[animal.feed].produceName.toLowerCase()})`;
  if (id === 'honey' || id === 'honeycomb') return `${HIVE.hours} h`;
  return CATCHES[id as keyof typeof CATCHES]?.source === 'boat'
    ? `${BOAT.hours} h/chuyến`
    : 'câu tại ao';
}

function yieldOf(id: ProduceId): string {
  if (isCrop(id)) return String(CROPS[id].yield);
  const animal = Object.values(ANIMALS).find((a) => a.product === id);
  if (animal) return String(animal.yield);
  if (id === 'honey' || id === 'honeycomb') return String(HIVE.yield[id]);
  return CATCHES[id as keyof typeof CATCHES]?.source === 'boat'
    ? `${BOAT.catches}/chuyến (ngẫu nhiên)`
    : '1/lần câu';
}

const img = (key: string) => {
  const r = RECTS[key];
  return r ? `\`${key}\` (${r.width}×${r.height})` : `—`;
};

describe.runIf(process.env.FARM_REPORT)('farm item report', () => {
  it('writes the tables', () => {
    const cat = t.data.categories;
    const lines: string[] = [];
    const push = (...l: string[]) => lines.push(...l);
    const counts = new Map<string, number>();
    for (const id of PRODUCE_IDS)
      counts.set(produceCategory(id), (counts.get(produceCategory(id)) ?? 0) + 1);

    push(
      '# Bảng vật phẩm nông trại (sinh tự động)',
      '',
      '> Sinh bằng `FARM_REPORT=1 node scripts/run-vitest.mjs run src/data/farmItems.report` từ `src/data/game.ts`',
      '> và `scripts/farm-items/catalog.json`. Đừng sửa tay — sửa dữ liệu rồi sinh lại.',
      '',
      '## Tổng quan',
      '',
      `- Nguyên liệu thô hợp lệ: **${PRODUCE_IDS.length}** (có sẵn ${ORIGINAL.size}, bổ sung ${PRODUCE_IDS.length - ORIGINAL.size}).`,
      `- Nguồn sản xuất: **${Object.keys(CROPS).length}** loại cây trồng trong ô (${Object.values(CROPS).filter((c) => c.kind === 'veg').length} rau, ${Object.values(CROPS).filter((c) => c.kind === 'tree').length} cây lâu năm, ${Object.values(CROPS).filter((c) => c.kind === 'mushroom').length} nấm), **${Object.keys(ANIMALS).length}** vật nuôi, 1 trại ong, 1 ao, 1 thuyền đánh cá.`,
      `- Hình đã xuất: **${Object.keys(CATALOG.images).length}** tệp trong \`public/images/farm-items/\`.`,
      '- Món chế biến mới: **0** (ảnh nguồn không có hình món chế biến; 14 công thức bếp hiện có giữ nguyên).',
      '',
      '| Nhóm | Số nguyên liệu |',
      '|---|---|',
      ...[...counts].map(([k, n]) => `| ${cat[k as keyof typeof cat]} | ${n} |`),
      '',
      '## Nguyên liệu',
      '',
      '| Mã | Tên | Nhóm | Nguồn | Chu kỳ | Sản lượng | Giá hạt/giống | Giá bán | Mở ở cấp | Trạng thái | Hình nông sản | Nhận dạng |',
      '|---|---|---|---|---|---|---|---|---|---|---|---|',
    );
    for (const id of PRODUCE_IDS) {
      const item = CATALOG.items[id];
      expect(item, id).toBeTruthy();
      const seed = isCrop(id) ? `${MARKET.seed(id)}` : '—';
      const note = item?.produceIsStage ? 'tạm: hình giai đoạn chín' : 'riêng';
      push(
        `| \`${id}\` | ${produceName(id)} | ${cat[produceCategory(id)]} | ${sourceOf(id)} | ${cycle(id)} | ${yieldOf(id)} | ${seed} | ${sellPrice(id)} | ${produceUnlockLevel(id)} | ${ORIGINAL.has(id) ? 'thay hình' : 'mới'} | ${note} | ${item?.confidence ?? '?'} |`,
      );
    }

    push(
      '',
      '## Nguồn sản xuất, trạng thái và hình',
      '',
      '### Cây trồng trong ô (giai đoạn: mầm → non → ra hoa → chín)',
      '',
      '| Mã | Loại | Mầm | Non | Ra hoa | Chín | Ghi chú |',
      '|---|---|---|---|---|---|---|',
    );
    for (const c of Object.values(CROPS)) {
      const item = CATALOG.items[c.id];
      const stages = ['sprout', 'young', 'flowering', 'ready'].map((s) => {
        const key = `${c.id}-${s}`;
        return CATALOG.images[key] ? img(key) : `= ${item?.stagesMissing ? 'mầm' : '?'}`;
      });
      push(
        `| \`${c.id}\` | ${KIND[c.kind]} | ${stages.join(' | ')} | ${item?.stagesMissing?.join(', ') ?? ''} |`,
      );
    }
    push(
      '',
      '### Vật nuôi',
      '',
      '| Mã | Tên | Ăn | Sản phẩm | Hình non | Hình trưởng thành |',
      '|---|---|---|---|---|---|',
    );
    for (const a of Object.values(ANIMALS))
      push(
        `| \`${a.id}\` | ${a.name} | ${CROPS[a.feed].produceName} | ${produceName(a.product)} | ${img(`animal-${a.id}-young`)} | ${img(`animal-${a.id}`)} |`,
      );
    push(
      '',
      '### Trại ong, ao, thuyền',
      '',
      '| Nguồn | Trạng thái → hình |',
      '|---|---|',
      `| Trại ong | chưa bắt đầu / đầy 1/2 → ${img('hive-1')}; đầy 2/2 → ${img('hive-2')}; sẵn sàng → ${img('hive-3')}; ong bay → ${img('bee')} |`,
      `| Thuyền đánh cá | ở bến / đi biển / đã về → ${img('boat-scene')} |`,
      `| Ao | cá, tôm, cá chép, cua (theo cấp) → hình nông sản từng loài |`,
      '',
      '## Hình chưa có, cần tạo thêm hoặc tạo lại',
      '',
    );
    const stageAsProduce = Object.entries(CATALOG.items)
      .filter(([, v]) => v.produceIsStage)
      .map(([k]) => `\`${k}\``);
    push(
      `- **Hình nông sản riêng (không có đất/cây)** cho ${stageAsProduce.length} loại đang tạm dùng hình giai đoạn chín: ${stageAsProduce.join(', ')}.`,
    );
    for (const [k, v] of Object.entries(CATALOG.items))
      if (v.stagesMissing) push(`- \`${k}\`: thiếu giai đoạn ${v.stagesMissing.join(', ')}.`);
    push(
      '- Tổ ong **không có ong** vẽ dính (3 giai đoạn) — ong trong ảnh nguồn chạm vào tổ, cắt ra sẽ làm hỏng hình; và một con ong rõ nét hơn (bản hiện có ~20 px).',
      '- Lợn: có hình vật nuôi (3 giai đoạn) nhưng không có sản phẩm → chưa thành nguồn sản xuất.',
      '- Hình món chế biến (nếu muốn thêm cơ sở chế biến): chưa có trong ảnh nguồn.',
      '- Khung hình chuyển động (đi, vỗ cánh, bơi) hoặc tài sản tách lớp (đầu/thân/chân/cánh) cho vật nuôi, ong, cá: ảnh nguồn chỉ có hình tĩnh một khung.',
      '- Bản vẽ độ phân giải cao hơn: hình gốc chỉ ~60–120 px mỗi vật phẩm; phóng to không thêm chi tiết.',
      '',
      '### Hình trong ảnh nguồn chưa nhận dạng chắc chắn (không dùng)',
      '',
      ...Object.entries(CATALOG.unconfirmed).map(([k, v]) => `- \`${k}\`: ${v}`),
      '',
    );
    const out = join(ROOT, 'plans/vat-pham-nong-trai-bang.md');
    writeFileSync(out, lines.join('\n') + '\n');
    expect(existsSync(out)).toBe(true);
  });
});

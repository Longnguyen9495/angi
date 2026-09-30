/*
 * Asset manifest for the PlayCanvas corner. Every MODEL is still a PROCEDURAL
 * PLACEHOLDER built in code from engine primitives. Surfaces use the CC0
 * photo textures and sky listed in FARM_TEXTURES (files checked into public/). `plannedPath` is where the
 * Blender export is expected to land later — nothing reads it until `status`
 * becomes 'ready' and the file exists in public/.
 *
 * Placeholders prove the bridge, layout, lighting and workflow only. They are
 * not an art sign-off against the reference image.
 */

export type AssetStatus = 'placeholder' | 'in-progress' | 'ready';

export interface FarmAsset {
  id: string;
  role: string;
  status: AssetStatus;
  /** Who made it / where it came from. */
  source: string;
  license: string;
  /** Expected GLB location once modelled (not loaded while status !== 'ready'). */
  plannedPath: string;
  /** Starting budget to check at the gameplay camera, not a measured value. */
  budget: { triangles: number; texture: string };
}

export const FARM_ASSETS: FarmAsset[] = [
  {
    id: 'barn',
    role: 'Nhà kho: thân gỗ, mái ngói đất nung, cửa, khung, chân móng đá, bảng hiệu',
    status: 'placeholder',
    source: 'Dựng bằng code (engine/scene.ts) từ khối hộp/lăng trụ PlayCanvas',
    license: 'Mã nguồn của dự án',
    plannedPath: 'models/farm/barn.glb',
    budget: { triangles: 6000, texture: '1024² atlas dùng chung gỗ/ngói' },
  },
  {
    id: 'tree-broadleaf',
    role: 'Cây lá rộng: thân thuôn, 4–5 cụm tán có khoảng rỗng',
    status: 'placeholder',
    source: 'Dựng bằng code từ hình nón cụt + cầu dẹt',
    license: 'Mã nguồn của dự án',
    plannedPath: 'models/farm/tree-broadleaf.glb',
    budget: { triangles: 4000, texture: '512² lá dạng thẻ + vỏ cây' },
  },
  {
    id: 'bed',
    role: 'Luống: khung ván dày, cọc góc, đất gợn, ô trồng theo số ô thật',
    status: 'placeholder',
    source: 'Dựng bằng code từ khối hộp',
    license: 'Mã nguồn của dự án',
    plannedPath: 'models/farm/bed.glb',
    budget: { triangles: 2500, texture: '512² gỗ + đất' },
  },
  {
    id: 'crop-stages',
    role: 'Cây trồng 4 giai đoạn (mầm, đang lớn, ra hoa, chín) cho 10 loài',
    status: 'placeholder',
    source: 'Dựng bằng code: lá cầu dẹt, quả theo màu CROPS[].color',
    license: 'Mã nguồn của dự án',
    plannedPath: 'models/farm/crops/{crop}-{stage}.glb',
    budget: { triangles: 800, texture: 'atlas cây trồng 1024² dùng chung' },
  },
  {
    id: 'path-stones',
    role: 'Đường đá: 8 phiến dẹt, xám ấm/beige, xoay và kích thước khác nhau',
    status: 'placeholder',
    source: 'Dựng bằng code từ trụ dẹt',
    license: 'Mã nguồn của dự án',
    plannedPath: 'models/farm/path-stones.glb',
    budget: { triangles: 1200, texture: '512² đá' },
  },
  {
    id: 'ground',
    role: 'Mặt đất: cỏ olive/xanh non, vùng đất mòn quanh lối đi, vách đảo có lớp đất',
    status: 'placeholder',
    source: 'Lưới đĩa sinh bằng code, màu theo đỉnh',
    license: 'Mã nguồn của dự án',
    plannedPath: 'models/farm/ground-corner.glb',
    budget: { triangles: 5000, texture: 'màu đỉnh + 1 texture chi tiết 512²' },
  },
  {
    id: 'contact-shadow',
    role: 'Bóng tiếp xúc giả (mức Nhẹ) dưới công trình, cây, luống, đá',
    status: 'placeholder',
    source: 'Gradient tròn vẽ lúc chạy bằng canvas 2D',
    license: 'Mã nguồn của dự án',
    plannedPath: '(bake trong Blender cùng asset)',
    budget: { triangles: 2, texture: '64² tạo lúc chạy' },
  },
];

export interface FarmTexture {
  id: string;
  use: string;
  author: string;
  /** Poly Haven: CC0 1.0 — public domain, commercial use and web redistribution allowed. */
  license: 'CC0';
  source: string;
  files: string[];
}

const PH = (id: string) => `https://polyhaven.com/a/${id}`;
const maps = (id: string) =>
  ['diff', 'nor', 'arm'].map((m) => `public/textures/farm/${id}_${m}.webp`);

export const FARM_TEXTURES: FarmTexture[] = [
  {
    id: 'leafy_grass',
    use: 'Cỏ mặt đảo, tán cây, bụi cỏ',
    author: 'Charlotte Baglioni',
    license: 'CC0',
    source: PH('leafy_grass'),
    files: maps('leafy_grass'),
  },
  {
    id: 'brown_mud_02',
    use: 'Đất luống (khô/ướt), luống đất',
    author: 'Rob Tuytel',
    license: 'CC0',
    source: PH('brown_mud_02'),
    files: maps('brown_mud_02'),
  },
  {
    id: 'brown_planks_05',
    use: 'Ván nhà kho, cửa, khung luống, thùng',
    author: 'Rob Tuytel',
    license: 'CC0',
    source: PH('brown_planks_05'),
    files: maps('brown_planks_05'),
  },
  {
    id: 'clay_roof_tiles_02',
    use: 'Mái ngói đất nung, bờ nóc',
    author: 'Amal Kumar',
    license: 'CC0',
    source: PH('clay_roof_tiles_02'),
    files: maps('clay_roof_tiles_02'),
  },
  {
    id: 'bark_brown_02',
    use: 'Thân và cành cây',
    author: 'Rob Tuytel',
    license: 'CC0',
    source: PH('bark_brown_02'),
    files: maps('bark_brown_02'),
  },
  {
    id: 'rock_boulder_dry',
    use: 'Đường đá, đá mép đảo, vách đảo, chân móng',
    author: 'Dimitrios Savva & Rico Cilliers',
    license: 'CC0',
    source: PH('rock_boulder_dry'),
    files: maps('rock_boulder_dry'),
  },
  {
    id: 'kloofendal_48d_partly_cloudy_puresky',
    use: 'HDR 1K cho ánh sáng môi trường; bản tonemapped cắt dải mây làm phông trời',
    author: 'Greg Zaal & Jarod Guest',
    license: 'CC0',
    source: PH('kloofendal_48d_partly_cloudy_puresky'),
    files: [
      'public/env/kloofendal_48d_partly_cloudy_puresky_1k.hdr',
      'public/env/kloofendal_48d_partly_cloudy_puresky_bg.webp',
    ],
  },
];

export interface FarmModel {
  id: string;
  use: string;
  /** Poly Haven: CC0 1.0. */
  license: 'CC0';
  source: string;
  file: string;
}

const model = (id: string, use: string): FarmModel => ({
  id,
  use,
  license: 'CC0',
  source: PH(id),
  // Repacked from the 1K glTF: textures 256 px webp, welded and pruned (glTF Transform).
  file: `public/models/farm/props/${id}.glb`,
});

export const FARM_MODELS: FarmModel[] = [
  model('wooden_crate_02', 'Hòm gỗ cạnh nhà kho'),
  model('planter_pot_clay', 'Chum đất nung'),
  model('ceramic_pot', 'Nồi đất'),
  model('chinese_stool', 'Ghế đẩu gỗ'),
  model('wooden_axe_02', 'Rìu nằm cạnh hòm'),
  model('wooden_bucket_01', 'Xô gỗ cạnh luống'),
];

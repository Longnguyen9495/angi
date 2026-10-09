// Builds the replacement prompt deck for missing regional Vietnamese dishes.
// Output: prompts/food-reel-image-prompts.md (readable), .txt (one prompt per line)
// and public/fake/index.html — the copy-friendly page served at http://angi.local/fake.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const manifest = JSON.parse(readFileSync(join(root, 'prompts/regional-dishes.json'), 'utf8'));
if (new Set(manifest.items.map((d) => d.slug)).size !== manifest.items.length) {
  throw new Error('Duplicate regional dish slug');
}

// Serving vessels rotate per dish so the reel doesn't look like one plate repeated.
// Picked by a hash of the slug, so re-running the script keeps each dish's vessel stable.
const vessels = [
  'a rustic round wooden board',
  'a white glossy porcelain plate',
  'a deep matte black stoneware bowl',
  'a speckled beige handmade ceramic bowl',
  'a hammered copper pan',
  'a cast-iron skillet',
  'a woven bamboo basket lined with banana leaf',
  'a fresh green banana leaf laid flat',
  'a blue-and-white patterned porcelain bowl',
  'a rectangular slate stone platter',
  'a glazed brown clay pot',
  'an enamel tin plate with a blue rim',
  'a pastel-glazed ceramic plate',
  'a shallow terracotta dish',
  'a dark wooden bowl',
  'a brushed stainless steel tray',
  'a textured sage-green ceramic plate',
  'a glossy red lacquer tray',
];
const hash = (str) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const vesselFor = (slug) => vessels[hash(slug) % vessels.length];

const prompt = (name, vessel) =>
  `Generate ONE completely original photorealistic image of ${name}. Create the dish from scratch — do not use, search for, copy, or reproduce any existing/reference image. Composition: 3/4 overhead view (35–45°), centered, the food served in/on ${vessel} (if that vessel cannot realistically hold this dish, e.g. a soup or broth, use a bowl in the same material/style instead). The ENTIRE vessel and all food must be fully visible inside the frame — nothing cropped or cut off at any edge; leave a clear empty black margin of at least 10% on every side (top, bottom, left, right), with the dish taking about 65–70% of the frame width, perfectly centered. The food is abundant, full, colorful and highly appetizing, with ingredients clearly visible. Pure solid black background (#000000), no table, no props, no environment. Professional studio food lighting, ultra-sharp details, realistic textures, natural shadows, vivid realistic colors. Square 1:1 aspect ratio (e.g. 1024x1024), high resolution. Keep the same camera angle, framing, lighting and visual scale as the rest of the series; only the dish (${name}) and its serving vessel change.`;

const pad = (n) => String(n).padStart(3, '0');
const fence = '```';

let md = `# ${manifest.items.length} prompt ảnh món ăn — Food Reel\n\n`;
md +=
  'Danh sách thay thế: 10 đặc sản mỗi miền Bắc, Trung, Nam. Nguồn: prompts/regional-dishes.json. Chỉ thay prompt; không thay danh mục và ảnh món đã nhập.\n\n';
let txt = '';
const pageItems = [];

manifest.items.forEach((d, i) => {
  const p = prompt(`${d.name} (${d.subtitle})`, vesselFor(d.slug));
  const file = `${pad(i + 1)}-${d.slug}.webp`;
  md += `## ${pad(i + 1)} · ${d.name}\n\nFile gợi ý: \`${file}\`\n\n${fence}text\n${p}\n${fence}\n\n`;
  txt += `${pad(i + 1)} | ${d.name} | ${p}\n`;
  pageItems.push({ no: pad(i + 1), name: d.name, sub: d.subtitle, file, prompt: p });
});

mkdirSync(join(root, 'prompts'), { recursive: true });
writeFileSync(join(root, 'prompts/food-reel-image-prompts.md'), md);
writeFileSync(join(root, 'prompts/food-reel-image-prompts.txt'), txt);
const template = readFileSync(join(root, 'scripts/prompt-page.template.html'), 'utf8');
// Escape "<" so dish text can never close the inline <script> early.
const data = JSON.stringify(pageItems).replace(/</g, '\\u003c');
mkdirSync(join(root, 'public/fake'), { recursive: true });
writeFileSync(
  join(root, 'public/fake/index.html'),
  template.replace('__DATA__', data).replaceAll('__COUNT__', String(pageItems.length)),
);
console.log(`Wrote ${manifest.items.length} prompts.`);

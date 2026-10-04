import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

/*
 * The signpost is painted into the island. The runtime moves it onto the next plot to open, so
 * this cuts a patch that paints it out of its home plot: above the plot the fence and grass strip
 * one plot further along the fence (+R), inside the plot the grass just left of the post. Cut
 * from the 2x island and drawn at 1x size. Run after prepare.mjs (it rewrites layers.json):
 *   node scripts/farm-anim/sign-clear.mjs
 */

const DIR = 'public/farm-anim';
const layout = JSON.parse(readFileSync(`${DIR}/layers.json`, 'utf8'));
const { field } = layout;
const sign = field.sign;
const foot = [(sign.board[0] + sign.board[2]) / 2, sign.y + sign.h];
const home = field.plots.reduce((a, b) =>
  Math.hypot(a.centre[0] - foot[0], a.centre[1] - foot[1]) <=
  Math.hypot(b.centre[0] - foot[0], b.centre[1] - foot[1])
    ? a
    : b,
);
const R = field.R;

const inside = ([x, y], poly) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

// Patch box in picture px: the sign with a small margin.
const box = { x: sign.x - 4, y: sign.y - 4, w: sign.w + 8, h: sign.h + 6 };
const POST = [sign.x + 16, sign.x + 37]; // post column, picture px
const S = 2;
const { data, info } = await sharp(`${DIR}/island-2x.webp`)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const W2 = info.width;
const pw = box.w * S;
const ph = box.h * S;
const out = Buffer.alloc(pw * ph * 4);
for (let py = 0; py < ph; py++)
  for (let px = 0; px < pw; px++) {
    const x = box.x + px / S;
    const y = box.y + py / S;
    let src = null;
    if (!inside([x, y], home.quad)) src = [x + R[0], y + R[1]];
    else if (x >= POST[0] && x <= POST[1]) src = [x - 26, y];
    if (!src) continue;
    const sx = Math.round(src[0] * S);
    const sy = Math.round(src[1] * S);
    for (let c = 0; c < 4; c++) out[(py * pw + px) * 4 + c] = data[(sy * W2 + sx) * 4 + c];
  }
await sharp(out, { raw: { width: pw, height: ph, channels: 4 } })
  .webp({ quality: 92, alphaQuality: 100 })
  .toFile(`${DIR}/sign-clear.webp`);
field.signClear = { file: 'sign-clear.webp', ...box };
writeFileSync(`${DIR}/layers.json`, JSON.stringify(layout));
console.log(`sign-clear.webp ${pw}x${ph} over plot ${home.id}`, box);

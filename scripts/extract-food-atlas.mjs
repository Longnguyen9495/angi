import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const ROOT = process.cwd();
const DEFAULT_SOURCE_ROOT = path.join(ROOT, '.tmp-truanayangi-repo');
const DEFAULT_OUTPUT_ROOT = path.join(ROOT, 'public', 'images', 'food-reel');
const SOURCE_SIZE = 768;
const THUMB_SIZE = 384;

function parseArgs(argv) {
  const options = {
    sourceRoot: DEFAULT_SOURCE_ROOT,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    clean: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--source') options.sourceRoot = path.resolve(argv[++index]);
    else if (arg === '--output') options.outputRoot = path.resolve(argv[++index]);
    else if (arg === '--no-clean') options.clean = false;
    else if (arg === '--help') {
      console.log(
        'Usage: node scripts/extract-food-atlas.mjs [--source <repo>] [--output <dir>] [--no-clean]',
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function slugifyVietnamese(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/&/g, ' va ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseFoods(source) {
  const rows = [];
  const objectPattern = /\{([\s\S]*?)\}/g;

  for (const match of source.matchAll(objectPattern)) {
    const body = match[1];
    const name = body.match(/["']?name["']?\s*:\s*["']([^"']+)["']/)?.[1];
    const imageText = body.match(/["']?image["']?\s*:\s*(-?\d+)/)?.[1];
    if (!name || imageText === undefined) continue;

    const image = Number(imageText);
    if (!Number.isInteger(image) || image < 0) continue;

    const priceText = body.match(/["']?price["']?\s*:\s*(\d+)/)?.[1];
    const subtitle = body.match(/["']?sub["']?\s*:\s*["']([^"']*)["']/)?.[1] ?? '';
    const vegetarian = /["']?veg["']?\s*:\s*true/.test(body);
    rows.push({ image, name, subtitle, price: Number(priceText ?? 0), vegetarian });
  }

  return rows.sort((a, b) => a.image - b.image);
}

function atlasPlacement(image) {
  if (image >= 120) {
    const localIndex = (image - 120) % 12;
    return {
      atlas: `food-common-${Math.floor((image - 120) / 12)}.webp`,
      columns: 4,
      rows: 3,
      column: localIndex % 4,
      row: Math.floor(localIndex / 4),
      visualBottomCrop: 0.04,
    };
  }

  if (image >= 72) {
    const localIndex = (image - 72) % 12;
    return {
      atlas: `food-lunch-${Math.floor((image - 72) / 12)}.webp`,
      columns: 4,
      rows: 3,
      column: localIndex % 4,
      row: Math.floor(localIndex / 4),
      visualBottomCrop: 0.07,
    };
  }

  if (image >= 36) {
    const localIndex = (image - 36) % 12;
    return {
      atlas: `food-expanded-${Math.floor((image - 36) / 12)}.webp`,
      columns: 4,
      rows: 3,
      column: localIndex % 4,
      row: Math.floor(localIndex / 4),
      visualBottomCrop: 0,
    };
  }

  const localIndex = image % 4;
  return {
    atlas: `food-hd-${Math.floor(image / 4)}.webp`,
    columns: 2,
    rows: 2,
    column: localIndex % 2,
    row: Math.floor(localIndex / 2),
    visualBottomCrop: 0,
  };
}

async function ensureUniqueSlugs(foods) {
  const used = new Set();
  return foods.map((food) => {
    const base = slugifyVietnamese(food.name) || `mon-${food.image}`;
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) slug = `${base}-${suffix++}`;
    used.add(slug);
    return { ...food, slug };
  });
}

async function measureSharpness(input, extract) {
  const stats = await sharp(input)
    .extract(extract)
    .resize(256, 256, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .greyscale()
    .stats();
  return { sharpness: stats.sharpness, entropy: stats.entropy };
}

function enhancementProfile(metrics, sourceWidth) {
  if (sourceWidth <= 400 || metrics.sharpness < 0.95) {
    return {
      name: 'soft',
      sharpen: { sigma: 1.05, m1: 1.15, m2: 2.4, x1: 2.2, y2: 4.5, y3: 8 },
    };
  }
  return {
    name: 'standard',
    sharpen: { sigma: 0.72, m1: 0.75, m2: 1.6, x1: 2, y2: 4, y3: 7 },
  };
}

async function renderVariant(input, extract, size, output, quality, profile) {
  await sharp(input)
    .extract(extract)
    .resize(size, size, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .modulate({ saturation: 1.035, brightness: 1.01 })
    .sharpen(profile.sharpen)
    .webp({ quality, effort: 5, smartSubsample: true })
    .toFile(output);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const cataloguePath = path.join(options.sourceRoot, 'src', 'lib', 'foods.ts');
  const atlasRoot = path.join(options.sourceRoot, 'public');
  const fullRoot = path.join(options.outputRoot, 'full');
  const thumbRoot = path.join(options.outputRoot, 'thumb');

  // The source repo is a throwaway clone; the extracted images live in public/.
  const hasSource = await fs
    .access(cataloguePath)
    .then(() => true)
    .catch(() => false);
  if (!hasSource) {
    console.error(
      `Source repo not found at ${options.sourceRoot}.\n` +
        'Clone it first, then rerun:\n' +
        '  git clone --depth 1 https://github.com/truanayangi-com/truanayangi.git .tmp-truanayangi-repo',
    );
    process.exit(1);
  }

  const catalogueSource = await fs.readFile(cataloguePath, 'utf8');
  const foods = await ensureUniqueSlugs(parseFoods(catalogueSource));
  if (foods.length !== 128) {
    throw new Error(`Expected 128 foods, parsed ${foods.length} from ${cataloguePath}`);
  }

  const ids = new Set(foods.map((food) => food.image));
  if (ids.size !== foods.length) throw new Error('Catalogue contains duplicate image ids');
  const expectedUnusedIds = [37, 38, 40, 41];
  const unusedIds = Array.from({ length: 132 }, (_, image) => image).filter(
    (image) => !ids.has(image),
  );
  if (unusedIds.join(',') !== expectedUnusedIds.join(',')) {
    throw new Error(`Unexpected unused atlas ids: ${unusedIds.join(', ')}`);
  }

  if (options.clean) await fs.rm(options.outputRoot, { recursive: true, force: true });
  await Promise.all([
    fs.mkdir(fullRoot, { recursive: true }),
    fs.mkdir(thumbRoot, { recursive: true }),
  ]);

  const atlasMetadata = new Map();
  const manifest = [];
  const sharpnessReport = [];

  for (const food of foods) {
    const placement = atlasPlacement(food.image);
    const atlasPath = path.join(atlasRoot, placement.atlas);
    let metadata = atlasMetadata.get(atlasPath);
    if (!metadata) {
      metadata = await sharp(atlasPath).metadata();
      atlasMetadata.set(atlasPath, metadata);
    }

    if (!metadata.width || !metadata.height) {
      throw new Error(`Could not read dimensions for ${atlasPath}`);
    }

    const cellWidth = Math.floor(metadata.width / placement.columns);
    const cellHeight = Math.floor(metadata.height / placement.rows);
    const left = placement.column * cellWidth;
    const top = placement.row * cellHeight;
    const width = placement.column === placement.columns - 1 ? metadata.width - left : cellWidth;
    const rawHeight = placement.row === placement.rows - 1 ? metadata.height - top : cellHeight;
    const height = Math.max(1, Math.round(rawHeight * (1 - placement.visualBottomCrop)));
    const extract = { left, top, width, height };
    const fileName = `${String(food.image).padStart(3, '0')}-${food.slug}.webp`;
    const fullPath = path.join(fullRoot, fileName);
    const thumbPath = path.join(thumbRoot, fileName);
    const sourceMetrics = await measureSharpness(atlasPath, extract);
    const profile = enhancementProfile(sourceMetrics, width);

    await Promise.all([
      renderVariant(atlasPath, extract, SOURCE_SIZE, fullPath, 90, profile),
      renderVariant(atlasPath, extract, THUMB_SIZE, thumbPath, 85, profile),
    ]);

    const outputStats = await sharp(fullPath).greyscale().stats();
    sharpnessReport.push({
      sourceImageId: food.image,
      name: food.name,
      file: fileName,
      profile: profile.name,
      sourceSharpness: Number(sourceMetrics.sharpness.toFixed(4)),
      outputSharpness: Number(outputStats.sharpness.toFixed(4)),
      outputEntropy: Number(outputStats.entropy.toFixed(4)),
    });

    manifest.push({
      id: food.slug,
      sourceImageId: food.image,
      slug: food.slug,
      name: food.name,
      subtitle: food.subtitle,
      price: food.price,
      vegetarian: food.vegetarian,
      image: `/images/food-reel/full/${fileName}`,
      thumbnail: `/images/food-reel/thumb/${fileName}`,
      width: SOURCE_SIZE,
      height: SOURCE_SIZE,
      enhancement: {
        profile: profile.name,
        sourceSharpness: Number(sourceMetrics.sharpness.toFixed(4)),
        sourceEntropy: Number(sourceMetrics.entropy.toFixed(4)),
      },
      source: {
        repository: 'https://github.com/truanayangi-com/truanayangi',
        atlas: placement.atlas,
        column: placement.column,
        row: placement.row,
        columns: placement.columns,
        rows: placement.rows,
        crop: extract,
      },
    });
  }

  await fs.writeFile(
    path.join(options.outputRoot, 'manifest.json'),
    `${JSON.stringify(
      {
        version: 1,
        count: manifest.length,
        unusedSourceImageIds: expectedUnusedIds,
        items: manifest,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  sharpnessReport.sort((a, b) => a.outputSharpness - b.outputSharpness);
  await fs.writeFile(
    path.join(options.outputRoot, 'sharpness-report.json'),
    `${JSON.stringify(sharpnessReport, null, 2)}\n`,
    'utf8',
  );

  const contactCellSize = 160;
  const contactColumns = 8;
  const contactRows = Math.ceil(manifest.length / contactColumns);
  const contactSheet = sharp({
    create: {
      width: contactColumns * contactCellSize,
      height: contactRows * contactCellSize,
      channels: 3,
      background: '#17120f',
    },
  });
  const composites = await Promise.all(
    manifest.map(async (item, index) => ({
      input: await sharp(path.join(thumbRoot, path.basename(item.thumbnail)))
        .resize(contactCellSize, contactCellSize, { fit: 'cover' })
        .toBuffer(),
      left: (index % contactColumns) * contactCellSize,
      top: Math.floor(index / contactColumns) * contactCellSize,
    })),
  );
  await contactSheet
    .composite(composites)
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
    .toFile(path.join(options.outputRoot, 'contact-sheet.jpg'));

  const totalBytes = (
    await Promise.all(
      [fullRoot, thumbRoot].flatMap((directory) =>
        manifest.map(async ({ image }) => {
          const fileName = path.basename(image);
          return (await fs.stat(path.join(directory, fileName))).size;
        }),
      ),
    )
  ).reduce((sum, size) => sum + size, 0);

  console.log(`Extracted ${manifest.length} dishes to ${path.relative(ROOT, options.outputRoot)}`);
  console.log(
    `Full: ${SOURCE_SIZE}px, thumbs: ${THUMB_SIZE}px, total: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

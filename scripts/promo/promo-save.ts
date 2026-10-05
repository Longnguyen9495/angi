import { mkdirSync, writeFileSync } from 'node:fs';
import { CROPS, DECOR, xpForLevel } from '../../src/data/game';
import type { CropId, DecorId } from '../../src/data/types';
import { SCHEMA_VERSION, STORAGE_KEY } from '../../src/domain/persistence';
import { EMPTY_PRODUCE, createInitialProgress } from '../../src/domain/progress';
import { HOUR_MS, dateKey } from '../../src/domain/time';

/*
 * A farm worth filming for the promo video (scripts/export-promo-video.mjs): level 8, plots
 * ripe and growing, every decoration, animals ready, guests' ingredients in the pantry and a
 * few recipes mastered. Written to storage/promo-render/save.json just before recording, so
 * its timers are fresh. Run: npx vite-node scripts/promo/promo-save.ts
 */
{
  const now = Date.now();
  const base = createInitialProgress(now);
  const lv = 8;
  const plot = (id: number, crop: CropId | null, readyIn: number | null) => ({
    ...base.plots[0]!,
    id,
    crop,
    plantedAt: crop ? now - 2 * HOUR_MS : null,
    readyAt: crop && readyIn !== null ? now + readyIn : null,
    wateredAt: null,
    sourceDishId: null,
  });
  const p = {
    ...base,
    xp: xpForLevel(lv) + 120,
    coins: 760,
    plots: [
      plot(1, 'rice', -60_000),
      plot(2, 'tomato', 40 * 60_000),
      plot(3, 'herbs', -60_000),
      plot(4, 'chili', 25 * 60_000),
      plot(5, 'scallion', -60_000),
      plot(6, 'bean', 90 * 60_000),
      plot(7, 'lemongrass', 50 * 60_000),
      plot(8, null, null),
    ],
    unlockedCrops: (Object.keys(CROPS) as CropId[]).filter(
      (c) => CROPS[c].unlock && CROPS[c].unlock!.level <= lv,
    ),
    unlockedRegions: ['south', 'central', 'north'] as GuestProgressRegions,
    seeds: { ...base.seeds, rice: 2, tomato: 2, garlic: 1, cucumber: 1, carrot: 1 },
    ingredients: {
      ...EMPTY_PRODUCE,
      pork: 8,
      beef: 6,
      chickenmeat: 6,
      duckmeat: 2,
      rice: 16,
      herbs: 10,
      scallion: 8,
      tomato: 8,
      bean: 8,
      chili: 6,
      shallot: 5,
      garlic: 5,
      ginger: 3,
      egg: 6,
      shrimp: 6,
      fish: 5,
      lemongrass: 4,
      cucumber: 4,
      carrot: 4,
      peanut: 3,
      lime: 3,
      milk: 2,
      honey: 2,
    },
    cooked: {
      'com-tam': 16,
      'pho-bo': 6,
      'bun-cha': 5,
      'banh-xeo': 3,
      'goi-cuon': 2,
      'bun-bo-hue': 1,
      'mi-quang': 1,
      'com-ga-hoi-an': 1,
      'nem-nuong': 1,
      'mien-luon-nuoc': 1,
    },
    decor: Object.keys(DECOR) as DecorId[],
    upgrades: { well: 1, barn: 1 },
    events: { 'thu-ha-noi': { days: ['2026-10-02', '2026-10-03'], claimed: [] } },
    animals: {
      ...base.animals,
      pig: { fedAt: now - 2 * HOUR_MS, readyAt: now - HOUR_MS },
      chicken: { fedAt: now - 2 * HOUR_MS, readyAt: now - HOUR_MS },
      cow: { fedAt: now - HOUR_MS, readyAt: now + 3 * HOUR_MS },
    },
    stamps: {
      discovered: ['pho-bo', 'bun-cha-ha-noi', 'banh-xeo', 'com-tam-suon-bi-cha', 'bun-bo-hue', 'mi-quang-tom-thit'],
      eaten: ['pho-bo', 'com-tam-suon-bi-cha'],
    },
    water: { date: dateKey(now), used: 0, bonus: 0 },
  };
  mkdirSync('storage/promo-render', { recursive: true });
  writeFileSync(
    'storage/promo-render/save.json',
    JSON.stringify({
      key: STORAGE_KEY,
      value: JSON.stringify({ version: SCHEMA_VERSION, savedAt: now, data: p }),
    }),
  );
  console.log("promo save written");
}

type GuestProgressRegions = ('south' | 'central' | 'north')[];

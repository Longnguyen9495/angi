import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { t } from '../i18n';
import { DEMO_CROPS, STAGES } from '../features/sky-garden/demo';
import { cropSprite } from './sprites';
import {
  ALL_POT_IDS,
  POT_IDS,
  POT_SETS,
  POTS,
  SET_SIZE,
  manifestHas,
  type PotSetId,
} from './skyGarden';

const PUBLIC = join(process.cwd(), 'public');

describe('Vườn Mây pots', () => {
  it('lists every pot once, in exactly one set', () => {
    expect(new Set(POT_IDS).size).toBe(POT_IDS.length);
    expect(POT_IDS).toHaveLength(20);
  });

  it('plans 17 sets of six (102 pots) plus the spare, each pot once, every one named', () => {
    const planned = POT_SETS.flatMap((s) => s.planned);
    expect(new Set(planned).size).toBe(planned.length);
    expect([...planned].sort()).toEqual([...ALL_POT_IDS].sort());
    expect(POT_SETS.filter((s) => s.id !== 'spare')).toHaveLength(17);
    for (const s of POT_SETS) {
      if (s.id !== 'spare') expect(s.planned, s.id).toHaveLength(SET_SIZE);
      // Only drawn pots are in the game.
      expect(s.pots.every((p) => s.planned.includes(p) && manifestHas(p)), s.id).toBe(true);
    }
    for (const id of ALL_POT_IDS) expect(t.sky.pots[id], id).toBeTruthy();
  });

  it('has the processed picture, a soil anchor and a name for every pot', () => {
    for (const id of POT_IDS) {
      const pot = POTS[id];
      expect(manifestHas(id), id).toBe(true);
      expect(existsSync(join(PUBLIC, pot.src)), pot.src).toBe(true);
      expect(existsSync(join(PUBLIC, pot.silhouette)), pot.silhouette).toBe(true);
      if (pot.src2x) expect(existsSync(join(PUBLIC, pot.src2x)), pot.src2x).toBe(true);
      const a = pot.anchor;
      // The soil opening sits in the upper half of the picture and inside it.
      expect(a.cy, id).toBeGreaterThan(0.15);
      expect(a.cy, id).toBeLessThan(0.55);
      expect(a.cx - a.rx, id).toBeGreaterThan(0);
      expect(a.cx + a.rx, id).toBeLessThan(1);
      expect(t.sky.pots[id], id).toBeTruthy();
    }
  });

  it('keeps sets at six pots and calls only full sets complete (Q7)', () => {
    for (const s of POT_SETS) {
      expect(s.pots.length, s.id).toBeLessThanOrEqual(SET_SIZE);
      expect(s.complete, s.id).toBe(s.id !== 'spare' && s.pots.length === SET_SIZE);
      expect(t.sky.sets[s.id], s.id).toBeTruthy();
    }
    const complete = POT_SETS.filter((s) => s.complete).map((s) => s.id);
    expect(complete).toEqual<PotSetId[]>(['produce']);
  });

  it('puts the produce set at jade (Q3) and keeps the red-fruit pot as the spare (Q7)', () => {
    expect(POT_SETS.find((s) => s.id === 'produce')?.baseTier).toBe(2);
    expect(POTS.redfruit.set).toBe('spare');
    expect(POTS.pumpkin.src2x).not.toBeNull();
    expect(POTS.watermelon.src2x).toBeNull();
  });

  it('only plants demo crops that have a picture for every stage', () => {
    for (const crop of DEMO_CROPS) {
      for (const stage of [...STAGES, 'produce'] as const) {
        expect(existsSync(join(PUBLIC, cropSprite(crop, stage))), `${crop}-${stage}`).toBe(true);
      }
    }
  });
});

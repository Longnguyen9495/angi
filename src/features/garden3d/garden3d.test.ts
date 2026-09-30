import { describe, expect, it } from 'vitest';
import {
  BUILDINGS,
  DEFAULT_DECOR_CELLS,
  ISLAND_RADIUS,
  CHEF_PATH,
  cellIsFree,
  edgeRadius,
  groundAt,
  decorSpots,
  freeCells,
  plotBounds,
  plotPosition,
} from './layout';
import { suggestQuality } from './quality';
import { skyAt } from './sky';

describe('island layout', () => {
  it('lays plots on a 3-wide grid that stays on the island', () => {
    expect(plotPosition(0)).toEqual([-1.95, plotPosition(0)[1]]);
    expect(plotPosition(4)[0]).toBe(0);
    for (let i = 0; i < 9; i++) {
      const [x, z] = plotPosition(i);
      expect(Math.hypot(x, z)).toBeLessThan(ISLAND_RADIUS - 2);
    }
  });

  it('keeps buildings, plots and free decoration cells apart', () => {
    const b = plotBounds(9);
    for (const p of Object.values(BUILDINGS)) {
      const insideX = p.x > b.minX && p.x < b.maxX;
      const insideZ = p.z > b.minZ && p.z < b.maxZ;
      expect(insideX && insideZ).toBe(false);
      expect(cellIsFree(Math.round(p.x), Math.round(p.z), 9)).toBe(false);
    }
    expect(cellIsFree(0, 0, 6)).toBe(false); // on the plots
    expect(cellIsFree(12, 0, 6)).toBe(false); // off the island
    for (const c of Object.values(DEFAULT_DECOR_CELLS)) expect(cellIsFree(c.x, c.z, 9)).toBe(true);
  });
});

describe('sky by the clock', () => {
  it('is bright at noon, copper at sunset and dark at night', () => {
    expect(skyAt(12).night).toBe(false);
    expect(skyAt(12).sunIntensity).toBeGreaterThan(1.4);
    expect(skyAt(18).bottom).toMatch(/^#[0-9a-f]{6}$/);
    expect(skyAt(23).night).toBe(true);
    expect(skyAt(2).sunIntensity).toBeLessThan(0.5);
    // Continuous across midnight.
    expect(skyAt(24)).toEqual(skyAt(0));
  });
});

describe('graphics tier', () => {
  it('starts phones low, strong desktops high, and honours Save-Data', () => {
    expect(suggestQuality({ touch: true, cores: 4, memory: 3, width: 390 })).toBe('low');
    expect(suggestQuality({ touch: true, cores: 8, memory: 8, width: 430 })).toBe('medium');
    expect(suggestQuality({ touch: false, cores: 12, memory: 16, width: 1920 })).toBe('high');
    expect(
      suggestQuality({ touch: false, cores: 12, memory: 16, width: 1920, saveData: true }),
    ).toBe('low');
  });
});

describe('decor placement', () => {
  it('uses the saved cell, else the default, and hides stored pieces', () => {
    const spots = decorSpots(['scarecrow', 'lantern', 'jar', 'fence'], {
      lantern: { x: 3, z: -3, rot: 2 },
      jar: null,
    });
    expect(spots.scarecrow).toEqual({ ...DEFAULT_DECOR_CELLS.scarecrow });
    expect(spots.lantern).toEqual({ x: 3, z: -3, rot: 2 });
    expect(spots.jar).toBeUndefined();
    expect('fence' in spots).toBe(false);
  });

  it('offers free cells that skip taken ones and include the defaults', () => {
    const all = freeCells(9, []);
    expect(all.length).toBeGreaterThan(20);
    for (const d of Object.values(DEFAULT_DECOR_CELLS)) {
      expect(all).toContainEqual({ x: d.x, z: d.z });
    }
    const some = freeCells(9, [{ x: all[0]!.x, z: all[0]!.z, rot: 0 }]);
    expect(some).toHaveLength(all.length - 1);
  });
});

describe('terrain', () => {
  it('stays flat wherever the game happens (plots, buildings, path)', () => {
    for (let i = 0; i < 9; i++) {
      const [x, z] = plotPosition(i);
      expect(groundAt(x, z)).toBe(0);
    }
    for (const b of Object.values(BUILDINGS)) expect(groundAt(b.x, b.z)).toBe(0);
    for (const [x, z] of CHEF_PATH) expect(groundAt(x, z)).toBe(0);
  });

  it('has an organic edge that still holds every free decor cell', () => {
    const radii = Array.from({ length: 36 }, (_, i) => edgeRadius((i / 36) * Math.PI * 2));
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(0.5);
    for (let x = -8; x <= 8; x++)
      for (let z = -8; z <= 8; z++)
        if (cellIsFree(x, z, 9))
          expect(Math.hypot(x, z)).toBeLessThan(edgeRadius(Math.atan2(z, x)));
  });
});

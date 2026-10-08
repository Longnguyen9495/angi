import { describe, expect, it } from 'vitest';
import {
  FOCUS_CELL,
  MIN_TAP,
  WIDE,
  floorAt,
  layoutFocus,
  layoutOverview,
  lerpLayout,
  slotAt,
  type Rect,
} from './layout';

/** Phones of §0.15.4 / §18.4, a tablet and a laptop. */
const SCREENS: [number, number][] = [
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1366, 768],
];

const right = (r: Rect) => r.x + r.w;

describe('Vườn Mây layout', () => {
  it('fits the whole tower across the screen, one row of six per floor', () => {
    for (const [w, h] of SCREENS) {
      const l = layoutOverview(w, h, 3);
      expect(l.floors).toHaveLength(3);
      for (const f of l.floors) {
        expect(f.slots).toHaveLength(6);
        // One row: same top edge, left to right, nothing past the screen.
        expect(new Set(f.slots.map((s) => Math.round(s.y))).size).toBe(1);
        expect(f.slots[0]!.x).toBeGreaterThanOrEqual(0);
        expect(right(f.slots[5]!)).toBeLessThanOrEqual(w);
      }
      // Floor 1 is the lowest; floors never overlap.
      for (let i = 1; i < l.floors.length; i++) {
        expect(l.floors[i]!.platform.y).toBeLessThan(l.floors[i - 1]!.slots[0]!.y);
      }
      expect(l.width).toBe(w);
    }
  });

  it('gives every pot at least the minimum tap size when a floor is zoomed in, both shapes', () => {
    for (const [w, h] of SCREENS) {
      for (const shape of ['row', 'grid'] as const) {
        const l = layoutFocus(w, h, 3, 1, shape);
        expect(l.cell, `${w}x${h} ${shape}`).toBeGreaterThanOrEqual(MIN_TAP);
        expect(l.floors[1]!.slots).toHaveLength(6);
      }
    }
  });

  it('zooms one row to at least FOCUS_CELL on a phone and lets it pan sideways', () => {
    const l = layoutFocus(390, 844, 3, 0, 'row');
    expect(l.cell).toBeGreaterThanOrEqual(FOCUS_CELL);
    expect(l.pan).toBe('x');
    expect(l.width).toBeGreaterThan(390);
    // The grid never pans and stays on screen.
    const g = layoutFocus(390, 844, 3, 0, 'grid');
    expect(g.pan).toBe('none');
    for (const s of g.floors[0]!.slots) expect(right(s)).toBeLessThanOrEqual(390);
    expect(new Set(g.floors[0]!.slots.map((s) => Math.round(s.y))).size).toBe(2);
  });

  it('fits all six without panning on a wide screen', () => {
    const l = layoutFocus(1366, 768, 3, 2, 'row');
    expect(1366).toBeGreaterThanOrEqual(WIDE);
    expect(l.pan).toBe('none');
    expect(right(l.floors[2]!.slots[5]!)).toBeLessThanOrEqual(1366);
  });

  it('keeps the other floors where they were, so a zoom only moves the floor in focus', () => {
    const a = layoutOverview(390, 844, 3);
    const b = layoutFocus(390, 844, 3, 1, 'row');
    expect(b.floors[0]).toEqual(a.floors[0]);
    expect(b.floors[2]).toEqual(a.floors[2]);
    const mid = lerpLayout(a, b, 0.5);
    expect(mid.floors[1]!.slots[0]!.x).toBeCloseTo(
      (a.floors[1]!.slots[0]!.x + b.floors[1]!.slots[0]!.x) / 2,
    );
    expect(lerpLayout(a, b, 0)).toBe(a);
    expect(lerpLayout(a, b, 1)).toBe(b);
  });

  it('finds the floor and the slot under a point', () => {
    const l = layoutOverview(390, 844, 3);
    const s = l.floors[2]!.slots[4]!;
    expect(floorAt(l, s.x + s.w / 2, s.y + s.h / 2)).toBe(2);
    expect(slotAt(l, 2, s.x + s.w / 2, s.y + s.h / 2)).toBe(4);
    expect(slotAt(l, 2, -50, s.y)).toBeNull();
  });
});

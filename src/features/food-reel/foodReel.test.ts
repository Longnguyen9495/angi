import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { CROPS, RECIPES, RECIPE_LIST, getRecipe, isBuiltinRecipe } from '../../data/game';
import { getDish } from '../../data/dishes';
import snapshot from './data/catalogue.snapshot.json';
import {
  applyCatalogue,
  dishAt,
  getReelDish,
  recipeFromCook,
  reelCount,
  reelDishes,
  toGameDish,
} from './data/reelCatalogue';
import { ReelEngine } from './engine/ReelEngine';
import { itemVisual, layoutFor, overshoot } from './engine/layout';
import {
  DECELERATE_AT,
  mod,
  planSpin,
  spinProgress,
  SPIN_MAX_MS,
  SPIN_MIN_MS,
} from './engine/spin';
import type { CatalogueItem, CataloguePayload, ReelState } from './foodReel.types';
import { foodReelReducer, initialReelState } from './foodReelReducer';

const PUBLIC = join(process.cwd(), 'public');
const item = (id: string): CatalogueItem =>
  (snapshot as CataloguePayload).items.find((i) => i.id === id)!;
const localFile = (url: string) =>
  url.startsWith('/uploads/') ? join(process.cwd(), 'storage', url) : join(PUBLIC, url);

describe('reel catalogue', () => {
  it('has every catalogue dish with local thumbnail and full image files', () => {
    expect(reelCount()).toBeGreaterThan(0);
    for (const d of reelDishes()) {
      // Admin uploads live in storage/uploads (served at /uploads), the rest in public/.
      expect(existsSync(localFile(d.thumbnail)), d.thumbnail).toBe(true);
      expect(existsSync(localFile(d.image)), d.image).toBe(true);
    }
  });

  it('gives every dish ingredients, a 0–5 flavour profile, a region and a story', () => {
    for (const d of reelDishes()) {
      expect(d.ingredients.length, d.id).toBeGreaterThanOrEqual(3);
      for (const v of Object.values(d.flavor)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(5);
      }
      expect(['north', 'central', 'south', 'world']).toContain(d.region);
      expect(d.story.length).toBeGreaterThan(20);
      for (const i of d.ingredients) {
        expect(i.anchor!.x).toBeGreaterThan(0);
        expect(i.anchor!.x).toBeLessThan(1);
      }
    }
  });

  it('never invents videos: dishes without footage have no video entry', () => {
    for (const d of reelDishes()) {
      if (d.video) expect(existsSync(join(PUBLIC, d.video.src))).toBe(true);
    }
  });

  it('maps every reel dish into the game with a seed that feeds its recipe', () => {
    for (const d of reelDishes()) {
      const g = toGameDish(d);
      expect(CROPS[g.seed]).toBeDefined();
      expect(getRecipe(g.recipe).ingredients.some((i) => i.crop === g.seed)).toBe(true);
      expect(getDish(d.id)).toBeDefined();
    }
  });

  it('turns a dish with a cook into its own recipe, built-in recipes keep their dishes', () => {
    const own = RECIPE_LIST.filter((r) => !isBuiltinRecipe(r.id));
    expect(own.length).toBeGreaterThan(0);
    for (const r of own) {
      expect(getReelDish(r.dishId)).toBeDefined();
      expect(r.steps!.length).toBeGreaterThanOrEqual(3);
      expect(r.ingredients.length).toBeGreaterThan(0);
      expect(toGameDish(getReelDish(r.dishId)!).recipe).toBe(r.id);
    }
    // A dish a built-in recipe already cooks never gets a second recipe.
    const builtinDishes = new Set(
      RECIPE_LIST.filter((r) => isBuiltinRecipe(r.id)).map((r) => r.dishId),
    );
    expect(own.some((r) => builtinDishes.has(r.dishId))).toBe(false);
    expect(RECIPES['pho-bo']?.steps).toBeUndefined();
  });

  it('a built-in recipe follows its dish to an older catalogue id', () => {
    const d = reelDishes().find((x) => x.id === getRecipe('com-tam').dishId)!;
    applyCatalogue({
      version: 'old-ids',
      count: 1,
      items: [{ ...item(d.id), id: 'com-tam-suon-bi-cha' }],
    });
    expect(getRecipe('com-tam').dishId).toBe('com-tam-suon-bi-cha');
    expect(
      RECIPE_LIST.some((r) => !isBuiltinRecipe(r.id) && r.dishId === 'com-tam-suon-bi-cha'),
    ).toBe(false);
    applyCatalogue(snapshot as CataloguePayload);
    expect(getRecipe('com-tam').dishId).toBe(d.id);
  });

  it('only keeps pantry items the game knows and needs three steps', () => {
    const d = reelDishes()[0]!;
    const steps = [
      { label: 'Một', heat: 'high', weight: 2 },
      { label: 'Hai', heat: 'nope', weight: 9 },
      { label: 'Ba', heat: 'low', weight: 1, translations: { en: 'Three' } },
    ];
    const r = recipeFromCook(d, {
      steps,
      produce: [
        { id: 'rice', qty: 7 },
        { id: 'pork', qty: 1 },
      ],
    });
    expect(r?.ingredients).toEqual([{ crop: 'rice', qty: 3 }]);
    expect(r?.steps?.[1]).toEqual({ label: 'Hai', heat: 'mid', weight: 5 });
    expect(
      recipeFromCook(d, { steps: steps.slice(0, 2), produce: [{ id: 'rice', qty: 1 }] }),
    ).toBeNull();
    expect(recipeFromCook(d, { steps, produce: [{ id: 'pork', qty: 1 }] })).toBeNull();
  });

  it('wraps virtual indices in both directions', () => {
    expect(dishAt(0).id).toBe(reelDishes()[0]!.id);
    expect(dishAt(reelCount()).id).toBe(reelDishes()[0]!.id);
    expect(dishAt(-1).id).toBe(reelDishes()[reelCount() - 1]!.id);
    expect(getReelDish('bun-moc')?.name).toBe('Bún mọc');
  });
});

describe('seeded spin plan', () => {
  it('is deterministic for a seed and lands exactly on the chosen winner', () => {
    const a = planSpin(10, 424242, 128);
    const b = planSpin(10, 424242, 128);
    expect(a).toEqual(b);
    expect(mod(a.target, 128)).toBe(a.winnerIndex);
    expect(a.target - a.from).toBeGreaterThanOrEqual(24);
    expect(a.durationMs).toBeGreaterThanOrEqual(SPIN_MIN_MS);
    expect(a.durationMs).toBeLessThanOrEqual(SPIN_MAX_MS);
  });

  it('never "wins" the dish already at the centre and spreads winners widely', () => {
    const winners = new Set<number>();
    for (let seed = 1; seed <= 400; seed++) {
      const p = planSpin(0, seed, 128);
      expect(p.winnerIndex).not.toBe(0);
      winners.add(p.winnerIndex);
    }
    expect(winners.size).toBeGreaterThan(90);
  });

  it('uses a monotonic accelerate → cruise → decelerate curve', () => {
    let prev = 0;
    for (let i = 0; i <= 100; i++) {
      const v = spinProgress(i / 100);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(spinProgress(0)).toBe(0);
    expect(spinProgress(1)).toBe(1);
    // Slow start and slow finish: little distance in the first and last 5%.
    expect(spinProgress(0.05)).toBeLessThan(0.02);
    expect(1 - spinProgress(0.95)).toBeLessThan(0.01);
    expect(DECELERATE_AT).toBeGreaterThan(0.5);
  });
});

function drive(state: ReelState, ...events: Parameters<typeof foodReelReducer>[1][]) {
  return events.reduce((s, e) => foodReelReducer(s, e), state);
}

describe('scene state machine', () => {
  const idle = drive(initialReelState(0), { type: 'ASSETS_READY' });

  it('runs 20 spins in a row without races and always settles on the planned target', () => {
    let s = idle;
    for (let i = 0; i < 20; i++) {
      s = foodReelReducer(s, { type: 'SPIN', seed: 1000 + i });
      const plan = s.spin!;
      // A second tap mid-spin is ignored.
      expect(foodReelReducer(s, { type: 'SPIN', seed: 9 })).toBe(s);
      s = drive(s, { type: 'DECELERATE' }, { type: 'SETTLE', dishId: s.winnerId! });
      expect(s.phase).toBe('selected');
      expect(s.index).toBe(plan.target);
      expect(dishAt(s.index).id).toBe(s.winnerId);
      s = foodReelReducer(s, { type: 'UNLOCK' });
    }
    expect(s.spinCount).toBe(20);
  });

  it('ignores a settle for the wrong dish and early clicks on the winner', () => {
    const spinning = foodReelReducer(idle, { type: 'SPIN', seed: 5 });
    expect(foodReelReducer(spinning, { type: 'SETTLE', dishId: 'not-the-winner' })).toBe(spinning);
    expect(foodReelReducer(spinning, { type: 'OPEN_DETAIL' })).toBe(spinning);
    const selected = foodReelReducer(spinning, { type: 'SETTLE', dishId: spinning.winnerId! });
    expect(foodReelReducer(selected, { type: 'OPEN_DETAIL' })).toBe(selected);
    const ready = foodReelReducer(selected, { type: 'UNLOCK' });
    expect(foodReelReducer(ready, { type: 'OPEN_DETAIL' }).detailId).toBe(spinning.winnerId);
  });

  it('restores the reel position and scene after closing the story', () => {
    let s = drive(idle, { type: 'SPIN', seed: 77 }, { type: 'DECELERATE' });
    s = drive(s, { type: 'SETTLE', dishId: s.winnerId! }, { type: 'UNLOCK' });
    const before = s.index;
    s = drive(s, { type: 'OPEN_DETAIL' }, { type: 'DETAIL_OPENED' });
    expect(s.phase).toBe('detail');
    expect(foodReelReducer(s, { type: 'SPIN', seed: 1 })).toBe(s);
    s = drive(s, { type: 'CLOSE_DETAIL' }, { type: 'DETAIL_CLOSED' });
    expect(s.phase).toBe('selected');
    expect(s.ready).toBe(true);
    expect(s.index).toBe(before);
    expect(s.detailId).toBeNull();
  });

  it('queues "spin another" from the story and confirms a dish into the chosen scene', () => {
    let s = drive(idle, { type: 'OPEN_DETAIL' }, { type: 'DETAIL_OPENED' });
    s = drive(s, { type: 'CLOSE_DETAIL', then: 'spin' }, { type: 'DETAIL_CLOSED' });
    expect(s.pendingSpin).toBe(true);
    expect(s.phase).toBe('idle');

    // Confirming works even while the open transition is still running.
    const early = drive(idle, { type: 'OPEN_DETAIL', dishId: 'bun-moc' }, { type: 'CONFIRM_DISH' });
    expect(early.phase).toBe('confirming');
    expect(foodReelReducer(early, { type: 'DETAIL_OPENED' })).toBe(early);

    let c = drive(idle, { type: 'OPEN_DETAIL', dishId: 'bun-moc' }, { type: 'DETAIL_OPENED' });
    c = drive(c, { type: 'CONFIRM_DISH' });
    expect(foodReelReducer(c, { type: 'CONFIRM_DISH' })).toBe(c);
    c = foodReelReducer(c, { type: 'CONFIRMED' });
    expect(c.phase).toBe('chosen');
    expect(c.chosenId).toBe('bun-moc');
    expect(foodReelReducer(c, { type: 'RESET' }).phase).toBe('idle');
  });

  it('only accepts drag input while browsing', () => {
    const dragging = foodReelReducer(idle, { type: 'DRAG_START' });
    expect(dragging.phase).toBe('dragging');
    expect(foodReelReducer(dragging, { type: 'SPIN', seed: 3 })).toBe(dragging);
    const done = foodReelReducer(dragging, { type: 'DRAG_END', velocity: 4, index: 6.2 });
    expect(done.phase).toBe('idle');
    expect(done.index).toBe(6);
  });
});

describe('reel physics engine', () => {
  it('performs a planned spin, fires callbacks once and stops exactly on target', () => {
    const onSettle = vi.fn();
    const onDecelerate = vi.fn();
    const e = new ReelEngine(0, false, { onSettle, onDecelerate });
    const plan = planSpin(0, 99, 128);
    e.spinTo(plan, 0);
    let maxSpeed = 0;
    for (let t = 0; t <= plan.durationMs + 32; t += 16) {
      maxSpeed = Math.max(maxSpeed, e.step(t).speed);
    }
    expect(onDecelerate).toHaveBeenCalledTimes(1);
    expect(onSettle).toHaveBeenCalledTimes(1);
    expect(onSettle).toHaveBeenCalledWith(plan.target);
    expect(e.position).toBe(plan.target);
    expect(maxSpeed).toBeGreaterThan(10);
  });

  it('turns a flick into inertia that snaps onto a whole item', () => {
    const onRest = vi.fn();
    const e = new ReelEngine(0, false, { onRest });
    e.startDrag(0);
    for (let t = 16; t <= 80; t += 16) e.dragBy(0.4, t);
    e.endDrag(80);
    expect(e.mode).toBe('inertia');
    for (let t = 96; t < 5000 && e.isMoving; t += 16) e.step(t);
    expect(onRest).toHaveBeenCalledTimes(1);
    expect(Number.isInteger(e.position)).toBe(true);
    expect(e.position).toBeGreaterThan(2);
  });

  it('in reduced motion jumps instead of animating, with the same winner', () => {
    const onSettle = vi.fn();
    const e = new ReelEngine(0, true, { onSettle });
    const plan = planSpin(0, 99, 128);
    e.spinTo(plan, 0);
    e.step(200);
    expect(onSettle).not.toHaveBeenCalled();
    e.step(420);
    expect(onSettle).toHaveBeenCalledWith(plan.target);
    e.goTo(plan.target + 1);
    expect(e.position).toBe(plan.target + 1);
    expect(e.step(500).position).toBe(plan.target + 1); // no idle sway
  });
});

describe('reel layout', () => {
  it('mounts at most 15 items on desktop and 9 on mobile', () => {
    expect(layoutFor(1440, 900).half * 2 + 1).toBeLessThanOrEqual(15);
    expect(layoutFor(375, 812).half * 2 + 1).toBeLessThanOrEqual(9);
    expect(layoutFor(375, 812).blur).toBe(false);
  });

  it('keeps the centre dominant and pushes neighbours back in the spotlight', () => {
    const l = layoutFor(1440, 900);
    const scene = { focus: 1, speed: 0, hover: 0, settleAge: Infinity, camera: 1 };
    const centre = itemVisual(0, l, scene);
    const side = itemVisual(1, l, scene);
    expect(centre.opacity).toBe(1);
    expect(side.opacity).toBeLessThanOrEqual(0.3);
    expect(side.opacity).toBeGreaterThanOrEqual(0.1);
    expect(centre.zIndex).toBeGreaterThan(side.zIndex);
    expect(overshoot(160)).toBeCloseTo(1.04);
    expect(overshoot(500)).toBe(1);
  });
});

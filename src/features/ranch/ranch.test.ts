import { describe, expect, it } from 'vitest';
import { ANIMALS, xpForLevel } from '../../data/game';
import { createInitialProgress } from '../../domain/progress';
import { ranchBadge } from './badge';
import { beeCount, hiveStep } from './hive';
import {
  angleDiff,
  ellipseNorm,
  intoEllipse,
  keepInBounds,
  orbitAt,
  rng,
  separate,
  turnToward,
  type Body,
} from './math';
import { PARTICLE_CAP, ParticlePool } from './particles';

const box = { left: 0, top: 50, right: 300, bottom: 150 };

describe('ranch math', () => {
  it('keeps a body inside the pen, its radius clear of the sides', () => {
    const b: Body = { x: -40, y: 400, r: 10 };
    keepInBounds(b, box);
    expect(b).toMatchObject({ x: 10, y: 150 });
    const c: Body = { x: 500, y: 0, r: 12 };
    keepInBounds(c, box);
    expect(c).toMatchObject({ x: 288, y: 50 });
  });

  it('pushes overlapping animals apart and never out of the pen', () => {
    const rand = rng(3);
    const bodies: Body[] = Array.from({ length: 8 }, () => ({
      x: 140 + rand() * 20,
      y: 100 + rand() * 10,
      r: 14,
    }));
    expect(separate(bodies, box, 1)).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++) separate(bodies, box);
    for (const b of bodies) {
      expect(b.x).toBeGreaterThanOrEqual(box.left + b.r - 1e-9);
      expect(b.x).toBeLessThanOrEqual(box.right - b.r + 1e-9);
      expect(b.y).toBeGreaterThanOrEqual(box.top);
      expect(b.y).toBeLessThanOrEqual(box.bottom);
    }
    // Packed bodies may end exactly in contact; none sinks into another.
    for (let i = 0; i < bodies.length; i++)
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i]!;
        const b = bodies[j]!;
        expect(Math.hypot(b.x - a.x, (b.y - a.y) * 2)).toBeGreaterThan(a.r + b.r - 0.5);
      }
  });

  it('splits two bodies sitting exactly on top of each other', () => {
    const a: Body = { x: 100, y: 100, r: 10 };
    const b: Body = { x: 100, y: 100, r: 10 };
    separate([a, b], box, 1);
    expect(b.x - a.x).toBeCloseTo(20);
  });

  it('turns by the short way round, at a capped rate', () => {
    expect(angleDiff(Math.PI * 0.9, -Math.PI * 0.9)).toBeCloseTo(Math.PI * 0.2);
    expect(turnToward(0, Math.PI / 2, 0.1)).toBeCloseTo(0.1);
    expect(turnToward(0, 0.05, 0.1)).toBeCloseTo(0.05);
    expect(turnToward(0.2, -0.3, 0.1)).toBeCloseTo(0.1);
  });

  it('pulls a swimmer back inside the water ellipse', () => {
    const p = { x: 400, y: 100 };
    intoEllipse(p, 100, 100, 80, 40, 0.9);
    expect(ellipseNorm(p, 100, 100, 80, 40)).toBeCloseTo(0.9);
    expect(p.y).toBeCloseTo(100);
    const q = { x: 110, y: 105 };
    intoEllipse(q, 100, 100, 80, 40, 0.9);
    expect(q).toEqual({ x: 110, y: 105 });
  });

  it('keeps bee orbits around the hive with a depth in [-1, 1]', () => {
    const o = { cx: 50, cy: 50, ax: 30, ay: 10, fx: 0.8, fy: 1.4, phase: 1 };
    for (let t = 0; t < 20; t += 0.37) {
      const p = orbitAt(o, t);
      expect(Math.abs(p.x - 50)).toBeLessThanOrEqual(30 + 1e-9);
      expect(Math.abs(p.y - 50)).toBeLessThanOrEqual(10 + 1e-9);
      expect(Math.abs(p.depth)).toBeLessThanOrEqual(1);
    }
  });

  it('gives each seed its own repeatable rhythm', () => {
    const a = rng(1);
    const b = rng(1);
    const c = rng(2);
    const first = a();
    expect(first).toBe(b());
    expect(first).not.toBe(c());
  });
});

describe('particle pool', () => {
  it('reuses a fixed set of objects and respects the quality cap', () => {
    const pool = new ParticlePool(PARTICLE_CAP.high);
    pool.setCap(PARTICLE_CAP.low);
    const objects = new Set(pool.items);
    for (let i = 0; i < 100; i++) pool.spawn({ layer: 0, kind: 'dot', x: i, y: 0 });
    expect(pool.alive).toBe(PARTICLE_CAP.low);
    expect(pool.items.length).toBe(PARTICLE_CAP.high);
    pool.items.forEach((p) => expect(objects.has(p)).toBe(true));
    // The newest particles won the slots.
    const xs = pool.items.filter((p) => p.alive).map((p) => p.x);
    expect(Math.min(...xs)).toBe(100 - PARTICLE_CAP.low);
  });

  it('retires particles at the end of their life and spawns nothing at cap 0', () => {
    const pool = new ParticlePool(10);
    pool.spawn({ layer: 1, kind: 'bubble', x: 0, y: 0, life: 0.5, vy: -10 });
    pool.update(0.3);
    expect(pool.alive).toBe(1);
    pool.update(0.3);
    expect(pool.alive).toBe(0);
    pool.setCap(0);
    expect(pool.spawn({ layer: 0, kind: 'dot', x: 0, y: 0 })).toBeNull();
  });
});

describe('beehive', () => {
  it('flies more bees with quality and while filling, none when reduced or locked', () => {
    expect(beeCount('low', 'ready', false)).toBe(2);
    expect(beeCount('medium', 'ready', false)).toBe(4);
    expect(beeCount('high', 'filling-2', false)).toBe(7);
    expect(beeCount('high', 'idle', false)).toBeLessThan(beeCount('high', 'filling-1', false));
    expect(beeCount('high', 'ready', true)).toBe(0);
    expect(beeCount('high', 'locked', false)).toBe(0);
  });

  it('maps hive states to the three hive pictures', () => {
    expect(hiveStep('idle')).toBe(1);
    expect(hiveStep('filling-1')).toBe(1);
    expect(hiveStep('filling-2')).toBe(2);
    expect(hiveStep('ready')).toBe(3);
  });
});

describe('ranch badge', () => {
  it('counts ready products, feedable hungry animals, a full hive and a returned boat', () => {
    const now = 1_000_000_000;
    const p = createInitialProgress(now);
    expect(ranchBadge(p, now)).toBe(0);
    const lv9 = { ...p, xp: xpForLevel(9) };
    const feed = { ...lv9.ingredients };
    Object.keys(feed).forEach((k) => (feed[k as keyof typeof feed] = 0));
    const none = { ...lv9, ingredients: feed };
    expect(ranchBadge(none, now)).toBe(0);
    const ready = {
      ...none,
      animals: { ...none.animals, chicken: { fedAt: now - 10, readyAt: now - 1 } },
      hive: { startedAt: now - 10, readyAt: now - 1 },
      boat: { sentAt: now - 10, returnAt: now - 1 },
      ingredients: { ...feed, [ANIMALS.cow.feed]: 2 },
    };
    // Chicken ready, cow and goose hungry with herbs to eat, the hive, the boat.
    const herbEaters = Object.values(ANIMALS).filter((a) => a.feed === ANIMALS.cow.feed).length;
    expect(ranchBadge(ready, now)).toBe(1 + herbEaters + 2);
  });
});

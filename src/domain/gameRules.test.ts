import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildGameRules } from './gameRules';

const FILE = resolve(__dirname, '../../server/data/game-rules.json');

describe('server game rules', () => {
  it('server/data/game-rules.json matches the game (npm run rules:export rewrites it)', () => {
    const rules = `${JSON.stringify(buildGameRules(), null, 2)}\n`;
    if (process.env.EXPORT_RULES === '1') writeFileSync(FILE, rules);
    expect(readFileSync(FILE, 'utf8')).toBe(rules);
  });
});

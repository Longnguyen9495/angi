import { describe, expect, it } from 'vitest';
import { showSkyDemoEntry } from './entry';

describe('Vườn Mây demo entry', () => {
  it('shows on the dev server and local copies only, never on the live site', () => {
    expect(showSkyDemoEntry('angi.local', false)).toBe(true);
    expect(showSkyDemoEntry('localhost', false)).toBe(true);
    expect(showSkyDemoEntry('example.com', true)).toBe(true);
    expect(showSkyDemoEntry('angi.vn', false)).toBe(false);
    expect(showSkyDemoEntry('www.angi.vn', false)).toBe(false);
  });
});

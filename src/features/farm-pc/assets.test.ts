import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FARM_MODELS, FARM_TEXTURES } from './assets';
import { PROPS } from './sceneLayout';
import { ENV_BACKDROP, ENV_HDR, TEX_SETS, texUrl, type TexSetId } from './engine/textures';

const root = resolve(__dirname, '../../..');
/** URL the engine requests → file Vite serves from public/. */
const onDisk = (url: string) => resolve(root, 'public', url.replace(/^\//, ''));

describe('farm asset files', () => {
  it('ships every texture and sky the engine will request', () => {
    const urls = (Object.keys(TEX_SETS) as TexSetId[]).flatMap((id) =>
      (['diff', 'nor', 'arm'] as const).map((m) => texUrl(id, m)),
    );
    urls.push(ENV_HDR(), ENV_BACKDROP());
    for (const url of urls) expect(existsSync(onDisk(url)), url).toBe(true);
  });

  it('records source and CC0 licence for every shipped file', () => {
    for (const t of FARM_TEXTURES) {
      expect(t.license).toBe('CC0');
      expect(t.source).toMatch(/^https:\/\/polyhaven\.com\/a\//);
      for (const f of t.files) expect(existsSync(resolve(root, f)), f).toBe(true);
    }
    const credited = new Set(FARM_TEXTURES.map((t) => t.id));
    for (const id of Object.keys(TEX_SETS)) expect(credited.has(id), id).toBe(true);
  });

  it('ships and credits every prop model the scene places', () => {
    const credited = new Map(FARM_MODELS.map((m) => [m.id, m]));
    for (const spot of PROPS) {
      const m = credited.get(spot.id);
      expect(m, spot.id).toBeTruthy();
      expect(m!.license).toBe('CC0');
      expect(existsSync(resolve(root, m!.file)), m!.file).toBe(true);
    }
  });
});

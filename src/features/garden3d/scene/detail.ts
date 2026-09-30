import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  RGBAFormat,
  type Texture,
} from 'three';

/*
 * Real-world surface detail from CC0 photo textures (Poly Haven, see
 * public/images/garden3d/detail/CREDITS.md). Eight small greyscale JPGs are
 * packed at runtime into two RGBA textures — one material per channel — so
 * the shader samples just two textures whatever the surface is.
 *
 *   A: r wood · g stone · b soil · a lawn
 *   B: r fired clay · g bark · b leaves · a linen
 *
 * Until they arrive (or if they fail), a neutral 1×1 texture keeps the
 * procedural detail in charge: uDetOn stays 0.
 */

const FILES_A = ['fine-grained-wood', 'rock-face', 'farm-soil', 'leafy-grass'];
const FILES_B = ['clay-plaster', 'pine-bark', 'forest-leaves-02', 'rough-linen'];

function neutral(): DataTexture {
  const t = new DataTexture(new Uint8Array([128, 128, 128, 128]), 1, 1, RGBAFormat);
  t.needsUpdate = true;
  return t;
}

export const detailUniforms: {
  uDetA: { value: Texture };
  uDetB: { value: Texture };
  uDetOn: { value: number };
} = {
  uDetA: { value: neutral() },
  uDetB: { value: neutral() },
  uDetOn: { value: 0 },
};

function loadGrey(src: string): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject(new Error('no 2d context'));
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, c.width, c.height).data);
    };
    img.onerror = () => reject(new Error(`detail texture failed: ${src}`));
    img.src = src;
  });
}

async function pack(files: string[]): Promise<DataTexture> {
  const base = `${import.meta.env.BASE_URL}images/garden3d/detail/`;
  const chans = await Promise.all(files.map((f) => loadGrey(`${base}${f}.jpg`)));
  const n = chans[0]!.length / 4;
  const size = Math.round(Math.sqrt(n));
  const data = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) data[i * 4 + k] = chans[k]![i * 4]!;
  const t = new DataTexture(data, size, size, RGBAFormat);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

let started = false;

/** Start loading once (idempotent). Materials pick the textures up through shared uniforms. */
export function loadDetail(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  Promise.all([pack(FILES_A), pack(FILES_B)])
    .then(([a, b]) => {
      detailUniforms.uDetA.value = a;
      detailUniforms.uDetB.value = b;
      detailUniforms.uDetOn.value = 1;
    })
    .catch(() => {
      // Keep the procedural look; nothing else depends on these.
      started = false;
    });
}

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** Absolute site URL for canonical + link-preview tags (crawlers need absolute URLs). */
const SITE_URL = (process.env.SITE_URL ?? 'https://angi.221-121-1-68.sslip.io').replace(/\/$/, '');

/** Bundled catalogue (php server/bin/export-snapshot.php): the dishes the build ships with. */
const SNAPSHOT = 'src/features/food-reel/data/catalogue.snapshot.json';
/** Static files copied from public/ that carry %SITE_URL% too. */
const PUBLIC_WITH_SITE_URL = ['robots.txt', 'privacy.html', 'quyen-rieng-tu.html'];

interface SnapshotDish {
  id: string;
  name: string;
  subtitle: string;
}

function snapshotDishes(): SnapshotDish[] {
  try {
    const doc = JSON.parse(readFileSync(SNAPSHOT, 'utf8')) as { items?: SnapshotDish[] };
    return (doc.items ?? []).filter((d) => /^[a-z0-9-]{1,80}$/.test(d.id));
  } catch {
    return [];
  }
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/*
 * Search/link-preview plumbing: absolute URLs in the shell, a crawlable dish list in
 * <noscript>, and sitemap.xml. server/web/share.php serves a live sitemap and per-dish
 * heads when nginx routes to it; these static versions are the fallback.
 */
function seo(): Plugin {
  let outDir = 'dist';
  return {
    name: 'angi-seo',
    configResolved: (c) => {
      outDir = c.build.outDir;
    },
    transformIndexHtml: (html) => {
      const links = snapshotDishes()
        .map(
          (d) =>
            `<li><a href="/mon/${d.id}">${esc(d.name)}</a>${d.subtitle ? ` — ${esc(d.subtitle)}` : ''}</li>`,
        )
        .join('');
      return html
        .replaceAll('%SITE_URL%', SITE_URL)
        .replace('<!--seo:dishes-->', links ? `<ul>${links}</ul>` : '');
    },
    generateBundle() {
      const urls = [
        '/',
        ...snapshotDishes().map((d) => `/mon/${d.id}`),
        '/quyen-rieng-tu.html',
        '/privacy.html',
      ];
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          urls.map((u) => `  <url><loc>${esc(SITE_URL + u)}</loc></url>\n`).join('') +
          '</urlset>\n',
      });
    },
    writeBundle() {
      for (const name of PUBLIC_WITH_SITE_URL) {
        const file = join(outDir, name);
        try {
          writeFileSync(file, readFileSync(file, 'utf8').replaceAll('%SITE_URL%', SITE_URL));
        } catch {
          /* not in this build */
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), seo()],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['.tmp-*/**', 'node_modules/**', 'dist/**'],
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});

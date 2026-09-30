import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** Absolute site URL for canonical + link-preview tags (crawlers need absolute URLs). */
const SITE_URL = (process.env.SITE_URL ?? 'https://angi.221-121-1-68.sslip.io').replace(/\/$/, '');

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'site-url',
      transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', SITE_URL),
    },
  ],
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

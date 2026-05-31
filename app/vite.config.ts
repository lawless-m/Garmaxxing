import { defineConfig } from 'vite';

// Kiosk Chromium serves this build locally on the Orin. No external CDNs:
// styles, glyphs, sprites and the PMTiles map are all bundled/served locally.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});

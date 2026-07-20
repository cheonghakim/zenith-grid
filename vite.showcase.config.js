import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(__dirname, 'examples/showcase'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist-pages'),
    emptyOutDir: true,
  },
  server: {
    open: '/examples/showcase/',
    fs: {
      allow: [__dirname],
    },
  },
});

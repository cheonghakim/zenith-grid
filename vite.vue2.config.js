import { defineConfig } from 'vite';
import vue2 from '@vitejs/plugin-vue2';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [vue2()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/adapters/vue2/index.js'),
      name: 'ZenithGridVue2',
      fileName: 'zenith-grid-vue2',
      formats: ['es', 'umd'],
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: { vue: 'Vue' },
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});

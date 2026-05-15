import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/adapters/vue3/index.js'),
      name: 'HighGridVue',
      fileName: 'highgrid-vue',
      formats: ['es'],
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

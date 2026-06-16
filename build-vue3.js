import { build } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFileSync } from 'node:fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

await build({
  configFile: false,
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

copyFileSync(
  resolve(__dirname, 'src/adapters/vue3/index.d.ts'),
  resolve(__dirname, 'dist/highgrid-vue.d.ts')
);

console.log('✓ Vue3 adapter built successfully');

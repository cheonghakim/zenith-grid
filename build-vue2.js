import { build } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFileSync } from 'node:fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

await build({
  configFile: false,
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

copyFileSync(
  resolve(__dirname, 'src/adapters/vue2/index.d.ts'),
  resolve(__dirname, 'dist/zenith-grid-vue2.d.ts')
);

console.log('✓ Vue2 adapter built successfully');

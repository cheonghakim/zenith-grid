import { build } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFileSync } from 'node:fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

await build({
  configFile: false,
  build: {
    lib: {
      entry: resolve(__dirname, 'src/adapters/react/index.js'),
      name: 'HighGridReact',
      fileName: 'highgrid-react',
      formats: ['es', 'cjs'],
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});

copyFileSync(
  resolve(__dirname, 'src/adapters/react/index.d.ts'),
  resolve(__dirname, 'dist/highgrid-react.d.ts')
);

console.log('✓ React adapter built successfully');

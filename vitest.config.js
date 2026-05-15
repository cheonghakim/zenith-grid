import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.js'],
    exclude: ['tests/e2e/**/*.spec.js'],
  },
});

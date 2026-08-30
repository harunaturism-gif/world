import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    'import.meta.env.DEV': 'true',
    'import.meta.env.VITE_ENABLE_DEV_ADMIN': JSON.stringify('true'),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

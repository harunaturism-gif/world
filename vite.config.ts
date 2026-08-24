import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(moduleId) {
          const normalizedId = moduleId.replaceAll('\\', '/');
          if (normalizedId.includes('/node_modules/pixi.js/')) return 'pixi';
          return undefined;
        },
      },
    },
  },
});

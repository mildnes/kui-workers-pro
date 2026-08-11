import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  root: resolve(import.meta.dirname, 'frontend'),
  plugins: [vue()],
  build: {
    outDir: resolve(import.meta.dirname, 'static'),
    emptyOutDir: false,
    assetsDir: 'ui-assets',
    rollupOptions: {
      output: {
        entryFileNames: 'ui-assets/app.js',
        assetFileNames: 'ui-assets/[name][extname]',
      },
    },
  },
});

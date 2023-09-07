import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    fs: {
      // Allow serving files from one level up to the project root for monaco editor assets
      allow: ['..','../..','../../..']
    },
  },
  // https://vitejs.dev/guide/build.html#multi-page-app
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        share: resolve(__dirname, 'share.html'),
      },
    },
  },
});

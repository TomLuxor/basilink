import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // MapLibre GL alone is ~1 MB minified (~300 KB gzipped). That is expected for a WebGL map
    // library, so the default 500 kB warning would only be noise.
    chunkSizeWarningLimit: 1300,
  },
})

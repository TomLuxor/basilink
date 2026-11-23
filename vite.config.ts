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
    // MapLibre GL is ~1 MB minified, proj4 and the Turf modules add ~0.2 MB (together ~390 KB
    // gzipped). That is expected for a WebGL map app, so the default 500 kB warning is only noise.
    chunkSizeWarningLimit: 1500,
  },
})

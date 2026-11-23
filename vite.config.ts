import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves a project site under "/<repo>/". The deploy workflow passes that path
  // as BASE_PATH (e.g. "/basilink", or "" with a custom domain). Locally the app runs at "/".
  base: `${process.env.BASE_PATH ?? ''}/`,
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

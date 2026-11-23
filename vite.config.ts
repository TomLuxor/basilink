import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

/**
 * Serves the Vercel Function api/drive-times.ts during `npm run dev`, so the traffic times also
 * work locally. MAPBOX_TOKEN comes from .env.local and stays in this Node process: Vite only
 * passes variables with the VITE_ prefix to the browser.
 */
function driveTimesInDev(): Plugin {
  return {
    name: 'basilink:drive-times-in-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/drive-times', async (req, res) => {
        const token = loadEnv(server.config.mode, process.cwd(), '').MAPBOX_TOKEN
        if (token) process.env.MAPBOX_TOKEN = token
        const { GET } = await server.ssrLoadModule('/api/drive-times.ts')
        const url = new URL(req.originalUrl ?? '/', 'http://localhost')
        const response = (await GET(new Request(url))) as Response
        res.statusCode = response.status
        response.headers.forEach((value, key) => res.setHeader(key, value))
        res.end(await response.text())
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), driveTimesInDev()],
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

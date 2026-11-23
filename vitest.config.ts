import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // The tested code is plain logic (geometry, data transforms), so no browser DOM is needed.
      environment: 'node',
      include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    },
  }),
)

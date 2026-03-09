import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import cljsHmrGuard from './src/dev/cljs-hmr-guard.js'

export default defineConfig(({ command }) => ({
  preview: {
    port: 5174,
    strictPort: false,
  },
  plugins: [tailwindcss(), cljsHmrGuard()],
  resolve: {
    alias: [
      { find: /^@\//, replacement: resolve(import.meta.dirname, 'src/js') + '/' },
      ...(command === 'build'
        ? [{ find: /.*\/target\/dev(\/|$)/, replacement: resolve(import.meta.dirname, 'target/release') + '/' }]
        : []),
    ],
  },
}))
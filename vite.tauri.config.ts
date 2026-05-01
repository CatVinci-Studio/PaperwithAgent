import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { resolve } from 'path'

// Vite config used by Tauri in dev (`tauri dev` runs this via beforeDevCommand)
// and prod (`tauri build` runs the build variant). Mirrors `vite.renderer.config.ts`
// but emits `__TAURI_BUILD__=true` instead of `__WEB_BUILD__` so the renderer's
// IPC picker can route to the Tauri adapter.
const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  root: 'src/renderer',
  define: {
    __WEB_BUILD__: 'false',
    __TAURI_BUILD__: 'true',
  },
  plugins: [
    react(),
    nodePolyfills({ include: ['buffer', 'process', 'util'] }),
  ],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@': resolve(__dirname, 'src/renderer/src'),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  build: {
    outDir: '../../dist-tauri',
    emptyOutDir: true,
    target:
      process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_ENV_DEBUG,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})

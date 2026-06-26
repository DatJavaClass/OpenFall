/// <reference types="node" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// BUILD_TARGET=singlefile produces a fully self-contained index.html (true
// double-click portability — all JS/CSS/fonts inlined, runs from file://).
const singlefile = process.env.BUILD_TARGET === 'singlefile'

export default defineConfig({
  // Relative base so the build runs under the Electron app:// protocol and
  // when opened directly as a portable file.
  base: './',
  plugins: [react(), ...(singlefile ? [viteSingleFile()] : [])],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: singlefile ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 4000,
    target: 'es2021',
  },
  server: { port: 5173, strictPort: true },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    css: false,
    include: ['test/**/*.test.{ts,tsx}'],
  },
})

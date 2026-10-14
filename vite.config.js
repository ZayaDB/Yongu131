import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: path.join(root, 'client'),
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
    fs: {
      allow: [root],
    },
  },
  build: {
    outDir: path.join(root, 'dist'),
    emptyOutDir: true,
  },
})

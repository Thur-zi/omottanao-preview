import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `npm run build:pages` gera a prévia para o GitHub Pages (servida em /omottanao-preview/).
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/omottanao-preview/' : '/',
  plugins: [react()],
  server: { port: 5174 },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: { manualChunks: { three: ['three'] } },
    },
  },
}))

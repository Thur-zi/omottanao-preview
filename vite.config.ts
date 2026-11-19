import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Cloudflare Pages: site em / e painel em /admin/.  `npm run build:pages` = prévia estática do GitHub Pages.
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/omottanao-preview/' : '/',
  plugins: [react()],
  server: { port: 5174 },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      input: mode === 'pages' ? { site: resolve(__dirname, 'index.html') } : { site: resolve(__dirname, 'index.html'), admin: resolve(__dirname, 'admin/index.html') },
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/three')) return 'three'
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory')) return 'graficos'
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react'
        },
      },
    },
  },
}))

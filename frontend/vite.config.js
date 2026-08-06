import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const assetVersion = '363'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'version-production-entry-assets',
      enforce: 'post',
      transformIndexHtml(html) {
        return html
          .replace('/assets/index.js"', `/assets/index.js?v=${assetVersion}"`)
          .replace('/assets/index.css"', `/assets/index.css?v=${assetVersion}"`)
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  },
  server: {
    proxy: {
      '/uploads': {
        target: 'https://worship.pmstudio.am',
        changeOrigin: true,
      },
      '^/.*\\.php(?:\\?.*)?$': {
        target: 'https://worship.pmstudio.am',
        changeOrigin: true,
      },
    },
  },
})

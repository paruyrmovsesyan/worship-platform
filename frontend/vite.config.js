import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash][extname]`,
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@capacitor')) {
            return 'vendor-capacitor';
          }
          if (id.includes('node_modules/glisse')) {
            return 'vendor-glisse';
          }
          return undefined;
        },
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

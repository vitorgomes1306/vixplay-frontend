import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      strategies: 'generateSW', // ← CRÍTICO

      workbox: {
        navigateFallback: '/',
      },

      manifest: {
        name: 'VixPlay',
        short_name: 'VixPlay',
        description: 'Gestão completa de mídia indoor',
        theme_color: '#0A58CA',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/vix_icon.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/vix_icon.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})


  server: {
    port: 7000,
    host: true,
    proxy: {
      '/api': {
        target: 'https://vixplay.altersoft.dev.br/api',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/public': {
        target: 'https://vixplay.altersoft.dev.br/api',
        changeOrigin: true,
        secure: false,
      },
      '/private': {
        target: 'https://vixplay.altersoft.dev.br/api',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

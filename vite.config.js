import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 7000, // Porta padrao para desenvolvimento
    host: true, // Habilita o acesso externo
    proxy: {
      '/api': {
        // target: 'http://10.0.10.17:4000',
        target: 'https://vixplay.altersoft.dev.br/api',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/public': {
        //target: 'http://10.0.10.17:4000',
         target: 'https://vixplay.altersoft.dev.br/api',
        changeOrigin: true,
        secure: false
      },
      '/private': {
        //target: 'http://10.0.10.17:4000',
        target: 'https://vixplay.altersoft.dev.br/api',
        changeOrigin: true,
        secure: false
      },

    }
  }
})

import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // tudo que o Vue pedir em /api/... é repassado para o PHP do XAMPP (evita problema de CORS)
      '/api': {
        target: 'http://localhost',                                  // Apache do XAMPP (se o seu usa outra porta, ex.: 8080, troque aqui)
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/arquibooks-api'), // /api/livros.php -> /arquibooks-api/livros.php
      },
    },
  },
})

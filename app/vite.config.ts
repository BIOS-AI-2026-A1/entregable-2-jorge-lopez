import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// La configuración de los tests vive aparte, en `vitest.config.ts`.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // En desarrollo, /api se redirige al backend FastAPI.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})

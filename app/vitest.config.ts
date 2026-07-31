import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Configuración propia de los tests, separada de `vite.config.ts` a propósito.
 *
 * No carga los plugins de React ni de Tailwind: solo se prueba lógica pura en
 * `.ts`, sin JSX ni CSS. Además, Vitest trae anidada su propia copia de Vite
 * (basada en rollup) y el proyecto usa Vite 8 (rolldown); mezclar ambos en el
 * mismo archivo hace que los tipos de `Plugin` dejen de encajar.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Sin DOM: lo que necesita `localStorage` o `fetch` los sustituye por
    // dobles en el propio test.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

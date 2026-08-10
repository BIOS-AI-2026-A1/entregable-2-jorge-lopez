# Centro de Ayuda — Frontend (Next.js)

Aplicación web del Centro de Ayuda: **Next.js 16 (App Router) + React 19 + TypeScript**, bilingüe
(español y portugués) y accesible (WCAG 2.2 AA). Migrada desde el prototipo SPA (React + Vite +
react-router) en el cambio OpenSpec `migrar-frontend-nextjs`.

## Arquitectura en dos frases

- **Contenido público en servidor** (Server Components): inicio y artículo llegan en el HTML inicial; solo
  son islas de cliente los componentes con estado.
- **Sesión de administrador en cookies `httpOnly` (patrón BFF)**: el token JWT nunca llega al navegador; lo
  custodian los Route Handlers de `app/api/*`, que reenvían al backend con `Authorization: Bearer` y renuevan
  con un refresh token opaco y rotatorio. Las guardias del panel se resuelven en servidor.

## Comandos

```bash
npm install        # una sola vez
npm run dev        # servidor de desarrollo en http://localhost:3000
npm run build      # comprueba tipos y compila (next build)
npm start          # sirve la compilación de producción (next start)
npm test           # tests con Vitest (una pasada)
npm run test:watch # tests en modo continuo
```

En desarrollo hacen falta los tres procesos: `docker compose up -d` (Postgres, en la raíz), `uvicorn` en
`api/` y `npm run dev` aquí. Next reescribe `/api/(es|pt)/*` al backend (`127.0.0.1:8000`); el panel usa el
BFF. El origen del backend se configura con `BACKEND_ORIGIN`.

## Estructura

```
app/[idioma]/       Rutas por idioma: inicio, artículo, login, panel, usuarios, error y 404
app/api/            Route Handlers del BFF (auth + proxy de /api/admin/* con la cookie)
app/_componentes/   Componentes de servidor y cliente de las pantallas
proxy.ts            Guardia del panel en el borde + CSP con nonce
src/components/     Componentes reutilizados (Tabs, Modal, formularios, chips, iconos, acordeón)
src/bff/            Cookies httpOnly y cliente del panel (apiFetch)
src/seguridad/      Construcción de la Content-Security-Policy
src/data/{es,pt}/   Contenido tipado por idioma (alimenta el seed y los tests de paridad)
src/i18n/           i18next: traductor isomórfico (getFixedT), traducciones y rutas
src/types.ts        Contrato de datos compartido con la API
```

## Tests

Vitest en entorno `node`, **solo lógica pura** (`src/**/*.test.ts`): `src/data/`, `src/i18n/`,
`src/types.ts`, `src/auth/nivel.ts`, `src/bff/cookies.ts`, `src/seguridad/csp.ts` y
`src/panel/panelPestanas.ts`. Los componentes y los Route Handlers no se prueban con Vitest.

## Seguridad

CSP estricta con nonce por petición (`src/seguridad/csp.ts`, emitida desde `proxy.ts`; `script-src` con
nonce + `strict-dynamic`, sin `unsafe-inline`) y cabeceras estáticas en `next.config.mjs` (HSTS —solo en
producción—, `nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`). Las cookies de sesión
son `httpOnly`, `SameSite=Lax` y `Secure` en producción.

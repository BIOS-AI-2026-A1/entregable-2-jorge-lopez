// Configuración de Next.js (App Router). Convive con la SPA de Vite durante la
// migración `migrar-frontend-nextjs`: Next enruta desde `app/` (raíz del
// frontend) e ignora `src/` para el enrutado, así que `src/pages/*` de la SPA
// no se interpreta como Pages Router.

/**
 * Origen del backend FastAPI. En desarrollo, `next dev` reescribe `/api/*` a
 * este origen, sustituyendo al proxy de Vite. En despliegue se fija por entorno.
 */
const BACKEND = process.env.BACKEND_ORIGIN ?? 'http://127.0.0.1:8000'
const ES_PROD = process.env.NODE_ENV === 'production'

/**
 * Cabeceras de seguridad estáticas (iguales en cada respuesta), aplicadas a
 * todas las rutas para cubrir también los recursos. La CSP no está aquí: lleva
 * un nonce por petición y se emite desde `middleware.ts`.
 *
 * - `X-Content-Type-Options: nosniff` — el navegador no adivina tipos MIME.
 * - `Referrer-Policy` — no filtra la ruta completa a orígenes ajenos.
 * - `X-Frame-Options: DENY` — respaldo heredado de `frame-ancestors 'none'`.
 * - `Permissions-Policy` — desactiva APIs de dispositivo que la app no usa.
 * - `Strict-Transport-Security` — solo en producción (en local se sirve http).
 */
const CABECERAS_SEGURIDAD = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  ...(ES_PROD
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: CABECERAS_SEGURIDAD }]
  },
  async rewrites() {
    // El contenido público (por idioma) y el logotipo de marca se reenvían directo
    // al backend. Las rutas `/api/admin/*` y `/api/auth/*` las sirven los Route
    // Handlers del BFF (adjuntan la cookie de sesión); nunca deben pasar por aquí.
    return [
      {
        source: '/api/:idioma(es|pt)/:path*',
        destination: `${BACKEND}/api/:idioma/:path*`,
      },
      {
        // Logotipo público (cabecera + favicon): binario servido por la API, sin
        // cookie. Sin este rewrite, `/api/marca/logo` cae en Next (404) y la
        // imagen aparece rota en desarrollo.
        source: '/api/marca/:path*',
        destination: `${BACKEND}/api/marca/:path*`,
      },
    ]
  },
}

export default nextConfig

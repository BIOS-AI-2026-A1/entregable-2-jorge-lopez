import type { ContenidoIdioma, Idioma } from '@/types'

/**
 * Origen del backend FastAPI para las llamadas desde el servidor de Next. En
 * los Server Components no existe base para una URL relativa (`/api/...`), así
 * que se llama al backend directamente en vez de pasar por el `rewrite` de Next.
 */
// `127.0.0.1` en vez de `localhost`: el fetch de Node (undici) resuelve
// `localhost` a IPv6 `::1` primero, pero uvicorn suele escuchar solo en IPv4,
// y la conexión se rechazaría aunque el backend esté arriba.
const BACKEND = process.env.BACKEND_ORIGIN ?? 'http://127.0.0.1:8000'

/**
 * Carga el contenido de un solo idioma desde el servidor. Sustituye a
 * `cargarContenidoLoader` (que traía ambos idiomas): cada pantalla obtiene solo
 * el idioma activo. El selector de idioma resuelve el otro bajo demanda.
 */
export async function cargarContenidoServidor(idioma: Idioma): Promise<ContenidoIdioma> {
  const resp = await fetch(`${BACKEND}/api/${idioma}/contenido`, { cache: 'no-store' })
  if (!resp.ok) {
    throw new Error(`No se pudo cargar el contenido (${resp.status})`)
  }
  return (await resp.json()) as ContenidoIdioma
}

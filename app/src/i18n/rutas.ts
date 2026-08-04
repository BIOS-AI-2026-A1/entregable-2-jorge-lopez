import type { Idioma } from '@/types'

/**
 * Constructores de direcciones. Cada dirección lleva el idioma en el primer
 * segmento, de modo que un artículo citado por el asistente resuelve siempre
 * al mismo contenido y en el mismo idioma.
 */
export const rutas = {
  inicio: (idioma: Idioma) => `/${idioma}`,
  articulo: (idioma: Idioma, slug: string) => `/${idioma}/articulo/${slug}`,
  panel: (idioma: Idioma) => `/${idioma}/panel`,
  usuarios: (idioma: Idioma) => `/${idioma}/panel/usuarios`,
  login: (idioma: Idioma) => `/${idioma}/login`,
}

/**
 * Punto único de acceso a la API de administración (`/api/admin/*`).
 *
 * Espeja lo que `index.ts` hace con el contenido público: las direcciones, los
 * métodos y la forma del cuerpo viven aquí y no repartidos entre el panel y el
 * formulario de artículos. Las funciones devuelven la `Response` sin
 * interpretar, porque cada pantalla reacciona distinto a cada código: el panel
 * lleva al login ante un 401 y el formulario distingue el 409 del identificador
 * duplicado.
 */

import { authFetch } from '@/auth/sesion'
import type { EstadoKcs, Idioma } from '@/types'

/** Forma del artículo con sus dos idiomas que devuelve/acepta la API admin. */
export interface TraduccionAdmin {
  slug: string
  titulo: string
  parrafos: string[]
  howTo: { titulo: string; pasos: { titulo: string; descripcion: string }[] }
  nota: string | null
  faq: { pregunta: string; respuesta: string }[]
}
export interface ArticuloAdmin {
  id: string
  categoria: string
  actualizado: string
  minutosLectura: number
  destacado: boolean
  relacionados: string[]
  es: TraduccionAdmin
  pt: TraduccionAdmin
}

/** Fila de la tabla de preguntas sin resolver del panel interno. */
export interface PreguntaAdmin {
  id: number
  idioma: string
  pregunta: string
  veces: number
  similitud: number
  fecha: string
  estado: EstadoKcs
}

export function listarPreguntas(idioma: Idioma): Promise<Response> {
  return authFetch(`/api/admin/preguntas-sin-resolver?idioma=${idioma}`)
}

export function obtenerArticulo(id: string): Promise<Response> {
  return authFetch(`/api/admin/articulos/${id}`)
}

export function eliminarArticulo(id: string): Promise<Response> {
  return authFetch(`/api/admin/articulos/${id}`, { method: 'DELETE' })
}

/** A dónde va un guardado: artículo nuevo, edición o alta desde una pregunta. */
export type DestinoArticulo =
  | { tipo: 'crear' }
  | { tipo: 'editar'; articuloId: string }
  | { tipo: 'desdePregunta'; preguntaId: number }

/**
 * Dirección, método y cuerpo de un guardado. Función pura: no toca la red, así
 * que la decisión se puede comprobar por separado del componente.
 */
export function peticionGuardado(
  payload: ArticuloAdmin,
  destino: DestinoArticulo,
): { url: string; metodo: string; cuerpo: unknown } {
  if (destino.tipo === 'desdePregunta') {
    return {
      url: `/api/admin/preguntas-sin-resolver/${destino.preguntaId}/crear-articulo`,
      metodo: 'POST',
      cuerpo: payload,
    }
  }
  if (destino.tipo === 'crear') {
    return { url: '/api/admin/articulos', metodo: 'POST', cuerpo: payload }
  }
  // El id va en la dirección; la API de actualización lo rechaza en el cuerpo.
  const { id: _id, ...sinId } = payload
  return { url: `/api/admin/articulos/${destino.articuloId}`, metodo: 'PUT', cuerpo: sinId }
}

export function guardarArticulo(payload: ArticuloAdmin, destino: DestinoArticulo): Promise<Response> {
  const { url, metodo, cuerpo } = peticionGuardado(payload, destino)
  return authFetch(url, { method: metodo, body: JSON.stringify(cuerpo) })
}

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

// ── Sesión: identidad y nivel de acceso ─────────────────────────────────────

/** Identidad de la sesión actual, que devuelve `GET /api/auth/me`. */
export interface SesionAdmin {
  email: string
  nivel: number
}

export function obtenerSesion(): Promise<Response> {
  return authFetch('/api/auth/me')
}

// ── Gestión de usuarios (solo Root) ─────────────────────────────────────────

/** Usuario administrable que devuelve `/api/admin/usuarios`. Sin el hash. */
export interface UsuarioAdmin {
  id: number
  email: string
  nivel: number
  activo: boolean
  creado: string
}

/** Datos de un usuario que se crean o editan desde el formulario. */
export interface UsuarioPayload {
  email: string
  nivel: number
  /** Obligatoria al crear; opcional al editar (vacía = no cambiar). */
  password?: string
}

export function listarUsuarios(): Promise<Response> {
  return authFetch('/api/admin/usuarios')
}

/** A dónde va un guardado de usuario: alta o edición. */
export type DestinoUsuario = { tipo: 'crear' } | { tipo: 'editar'; usuarioId: number }

/**
 * Dirección, método y cuerpo de un guardado de usuario. Función pura (no toca la
 * red): al crear, la contraseña es obligatoria; al editar, solo viaja si se
 * escribió una nueva. Espeja `peticionGuardado` para artículos.
 */
export function peticionUsuario(
  payload: UsuarioPayload,
  destino: DestinoUsuario,
): { url: string; metodo: string; cuerpo: unknown } {
  if (destino.tipo === 'crear') {
    return {
      url: '/api/admin/usuarios',
      metodo: 'POST',
      cuerpo: { email: payload.email, nivel: payload.nivel, password: payload.password },
    }
  }
  // Al editar, una contraseña vacía no viaja: significa "no cambiarla".
  const cuerpo: Record<string, unknown> = { email: payload.email, nivel: payload.nivel }
  if (payload.password) cuerpo.password = payload.password
  return { url: `/api/admin/usuarios/${destino.usuarioId}`, metodo: 'PUT', cuerpo }
}

export function guardarUsuario(payload: UsuarioPayload, destino: DestinoUsuario): Promise<Response> {
  const { url, metodo, cuerpo } = peticionUsuario(payload, destino)
  return authFetch(url, { method: metodo, body: JSON.stringify(cuerpo) })
}

export function activarUsuario(id: number): Promise<Response> {
  return authFetch(`/api/admin/usuarios/${id}/activar`, { method: 'POST' })
}

export function desactivarUsuario(id: number): Promise<Response> {
  return authFetch(`/api/admin/usuarios/${id}/desactivar`, { method: 'POST' })
}

// ── Campo [Empresa] (solo Root) ─────────────────────────────────────────────

export function guardarEmpresa(empresa: string): Promise<Response> {
  return authFetch('/api/admin/ajustes/empresa', {
    method: 'PUT',
    body: JSON.stringify({ empresa }),
  })
}

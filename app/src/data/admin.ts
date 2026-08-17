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

import { apiFetch } from '@/bff/apiFetch'
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
  return apiFetch(`/api/admin/preguntas-sin-resolver?idioma=${idioma}`)
}

export function obtenerArticulo(id: string): Promise<Response> {
  return apiFetch(`/api/admin/articulos/${id}`)
}

export function eliminarArticulo(id: string): Promise<Response> {
  return apiFetch(`/api/admin/articulos/${id}`, { method: 'DELETE' })
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
  return apiFetch(url, { method: metodo, body: JSON.stringify(cuerpo) })
}

// ── Gestión de categorías (Editor + Administrador) ──────────────────────────

/** Traducción de una categoría (nombre + slug por idioma). */
export interface TraduccionCategoriaAdmin {
  slug: string
  nombre: string
}

/** Categoría con sus dos idiomas que devuelve/acepta la API admin. */
export interface CategoriaAdmin {
  id: string
  icono: string
  fondo: string
  texto: string
  orden: number
  es: TraduccionCategoriaAdmin
  pt: TraduccionCategoriaAdmin
}

export function listarCategorias(): Promise<Response> {
  return apiFetch('/api/admin/categorias')
}

/** A dónde va un guardado de categoría: alta o edición. */
export type DestinoCategoria = { tipo: 'crear' } | { tipo: 'editar'; categoriaId: string }

/**
 * Dirección, método y cuerpo de un guardado de categoría. Función pura (no toca
 * la red): al crear va el payload completo; al editar, el id viaja en la
 * dirección y la API lo rechaza en el cuerpo. Espeja `peticionGuardado`.
 */
export function peticionCategoria(
  payload: CategoriaAdmin,
  destino: DestinoCategoria,
): { url: string; metodo: string; cuerpo: unknown } {
  if (destino.tipo === 'crear') {
    return { url: '/api/admin/categorias', metodo: 'POST', cuerpo: payload }
  }
  const { id: _id, ...sinId } = payload
  return { url: `/api/admin/categorias/${destino.categoriaId}`, metodo: 'PUT', cuerpo: sinId }
}

export function guardarCategoria(payload: CategoriaAdmin, destino: DestinoCategoria): Promise<Response> {
  const { url, metodo, cuerpo } = peticionCategoria(payload, destino)
  return apiFetch(url, { method: metodo, body: JSON.stringify(cuerpo) })
}

export function eliminarCategoria(id: string): Promise<Response> {
  return apiFetch(`/api/admin/categorias/${id}`, { method: 'DELETE' })
}

// ── Sesión: identidad y nivel de acceso ─────────────────────────────────────

/** Identidad de la sesión actual, que devuelve `GET /api/auth/me`. */
export interface SesionAdmin {
  email: string
  nivel: number
}

export function obtenerSesion(): Promise<Response> {
  return apiFetch('/api/auth/me')
}

// ── Gestión de usuarios (solo Administrador) ────────────────────────────────

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
  return apiFetch('/api/admin/usuarios')
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
  return apiFetch(url, { method: metodo, body: JSON.stringify(cuerpo) })
}

export function activarUsuario(id: number): Promise<Response> {
  return apiFetch(`/api/admin/usuarios/${id}/activar`, { method: 'POST' })
}

export function desactivarUsuario(id: number): Promise<Response> {
  return apiFetch(`/api/admin/usuarios/${id}/desactivar`, { method: 'POST' })
}

// ── Gestión de portales (solo SuperAdmin) ───────────────────────────────────

/** Portal que devuelve `/api/admin/portales`, para el listado del SuperAdmin. */
export interface PortalAdmin {
  id: string
  slug: string
  nombreEmpresa: string
  estado: string
  /** Host principal (subdominio) del portal, o null si aún no lo tiene. */
  host: string | null
  creado: string
}

/** Datos de alta de un portal: sus atributos y su Administrador inicial. */
export interface PortalPayload {
  slug: string
  nombreEmpresa: string
  adminEmail: string
  adminPassword: string
}

export function listarPortales(): Promise<Response> {
  return apiFetch('/api/admin/portales')
}

export function crearPortal(payload: PortalPayload): Promise<Response> {
  return apiFetch('/api/admin/portales', { method: 'POST', body: JSON.stringify(payload) })
}

export function suspenderPortal(id: string): Promise<Response> {
  return apiFetch(`/api/admin/portales/${encodeURIComponent(id)}/suspender`, { method: 'POST' })
}

export function reactivarPortal(id: string): Promise<Response> {
  return apiFetch(`/api/admin/portales/${encodeURIComponent(id)}/reactivar`, { method: 'POST' })
}

// ── Campo [Empresa] (solo Administrador) ────────────────────────────────────

export function guardarEmpresa(empresa: string): Promise<Response> {
  return apiFetch('/api/admin/ajustes/empresa', {
    method: 'PUT',
    body: JSON.stringify({ empresa }),
  })
}

// ── Marca visual: paleta y logotipo (solo Administrador) ────────────────────

/**
 * Paleta editable: solo el acento. El degradado del banner ya no se elige a mano; lo
 * deriva el servidor del acento (`derivar_degradado_banner`), accesible por construcción.
 */
export interface MarcaPayload {
  acento: string
}

/**
 * Guarda la paleta (solo el acento). El servidor deriva el banner y valida el contraste
 * WCAG; responde 422 con el par que falla si no cumple, y la pantalla distingue ese
 * código para avisar sin persistir.
 */
export function guardarMarca(payload: MarcaPayload): Promise<Response> {
  return apiFetch('/api/admin/ajustes/marca', { method: 'PUT', body: JSON.stringify(payload) })
}

/**
 * Sube el logotipo como cuerpo binario crudo (PNG/ICO/JPEG). Se fija el `Content-Type`
 * explícito para que `apiFetch` no lo trate como JSON; el servidor decide el tipo
 * real por magic bytes, no por esta cabecera.
 */
export function subirLogo(archivo: File): Promise<Response> {
  return apiFetch('/api/admin/ajustes/logo', {
    method: 'POST',
    body: archivo,
    headers: { 'Content-Type': archivo.type || 'application/octet-stream' },
  })
}

// ── Traducción asistida por IA ──────────────────────────────────────────────

/**
 * Pide al backend traducir el contenido de un idioma al otro. Devuelve la
 * `Response` sin interpretar: el formulario distingue el 409 (proveedor sin
 * configurar) del resto de errores. No persiste nada; el resultado es un borrador.
 */
export function traducirArticulo(origen: Idioma, contenido: TraduccionAdmin): Promise<Response> {
  return apiFetch('/api/admin/articulos/traducir', {
    method: 'POST',
    body: JSON.stringify({ origen, contenido }),
  })
}

// ── Configuración de proveedor de IA (solo Administrador) ───────────────────

/**
 * Estado de un proveedor: si tiene clave configurada y una pista (los últimos
 * caracteres) para identificarla. Nunca incluye la clave completa.
 */
export interface ProveedorEstado {
  id: string
  configurada: boolean
  /** Últimos caracteres de la clave (p. ej. "s7xq"), o null si no hay/es corta. */
  pista?: string | null
}

/** Configuración de IA que devuelve `GET /api/admin/config-ia`. Sin claves. */
export interface ConfigIAAdmin {
  proveedorActivo: string
  proveedores: ProveedorEstado[]
}

/**
 * Datos que se envían al guardar la configuración. `clave` vacía/ausente =
 * «no cambiar»; `proveedor` indica a qué proveedor aplica la clave (por defecto,
 * el activo). La clave es de solo escritura: nunca vuelve del servidor.
 */
export interface ConfigIAPayload {
  proveedorActivo: string
  proveedor?: string
  clave?: string
}

export function obtenerConfigIA(): Promise<Response> {
  return apiFetch('/api/admin/config-ia')
}

export function guardarConfigIA(payload: ConfigIAPayload): Promise<Response> {
  return apiFetch('/api/admin/config-ia', { method: 'PUT', body: JSON.stringify(payload) })
}

/**
 * Sesión del administrador. El token JWT se guarda en el cliente y se envía en
 * la cabecera `Authorization`. Cerrar sesión = descartar el token.
 */

const CLAVE = 'centro-ayuda-token'

export function guardarToken(token: string): void {
  localStorage.setItem(CLAVE, token)
}

export function leerToken(): string | null {
  return localStorage.getItem(CLAVE)
}

export function borrarToken(): void {
  localStorage.removeItem(CLAVE)
}

export function haySesion(): boolean {
  return leerToken() !== null
}

/** `fetch` que añade la cabecera de autorización si hay sesión. */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = leerToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const resp = await fetch(input, { ...init, headers })
  // Un token expirado o inválido cierra la sesión local.
  if (resp.status === 401) borrarToken()
  return resp
}

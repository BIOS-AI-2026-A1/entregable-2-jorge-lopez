/**
 * Llamadas del BFF al backend FastAPI. Solo se ejecutan en el servidor de Next
 * (Route Handlers): el navegador nunca ve estas URLs ni los tokens que viajan.
 */

// `127.0.0.1` y no `localhost`: el fetch de Node resuelve `localhost` a IPv6
// primero y uvicorn escucha en IPv4 (ver `src/data/servidor.ts`).
export const BACKEND = process.env.BACKEND_ORIGIN ?? 'http://127.0.0.1:8000'

const JSON_HEADERS = { 'content-type': 'application/json' }

export function backendLogin(email: string, password: string): Promise<Response> {
  return fetch(`${BACKEND}/api/auth/login`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })
}

export function backendRefresh(refreshToken: string): Promise<Response> {
  return fetch(`${BACKEND}/api/auth/refresh`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: 'no-store',
  })
}

export function backendLogout(refreshToken: string): Promise<Response> {
  return fetch(`${BACKEND}/api/auth/logout`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: 'no-store',
  })
}

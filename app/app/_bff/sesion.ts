import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import {
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  MAX_AGE_ACCESS,
  MAX_AGE_REFRESH,
  opcionesBorrado,
  opcionesCookie,
} from '@/bff/cookies'
import { CABECERA_PORTAL, hostEntrante } from '@/bff/portal'
import { BACKEND, backendRefresh } from './backend'

interface Sesion {
  access: string
  refresh: string
}

/** Escribe el par de cookies httpOnly de la sesión en la respuesta. */
export function fijarSesion(resp: NextResponse, sesion: Sesion): void {
  resp.cookies.set(COOKIE_ACCESS, sesion.access, opcionesCookie(MAX_AGE_ACCESS))
  resp.cookies.set(COOKIE_REFRESH, sesion.refresh, opcionesCookie(MAX_AGE_REFRESH))
}

/** Borra ambas cookies de sesión (cierre de sesión o 401 irrecuperable). */
export function limpiarSesion(resp: NextResponse): void {
  resp.cookies.set(COOKIE_ACCESS, '', opcionesBorrado())
  resp.cookies.set(COOKIE_REFRESH, '', opcionesBorrado())
}

function respuestaDesde(backendResp: Response, texto: string): NextResponse {
  return new NextResponse(texto, {
    status: backendResp.status,
    headers: { 'content-type': backendResp.headers.get('content-type') ?? 'application/json' },
  })
}

/**
 * Reenvía una petición del navegador al backend adjuntando el access token de la
 * cookie como `Authorization: Bearer`. Si el access falta o el backend responde
 * 401, intenta renovar con el refresh token (rotatorio) y reintenta una vez.
 *
 * Reglas: el BFF **no decide permisos** (propaga el 403 del backend tal cual);
 * ante un 401 irrecuperable borra las cookies; el token nunca vuelve al cliente.
 */
export async function reenviarConSesion(request: NextRequest, rutaBackend: string): Promise<NextResponse> {
  const jar = await cookies()
  const access = jar.get(COOKIE_ACCESS)?.value
  const refresh = jar.get(COOKIE_REFRESH)?.value

  const url = `${BACKEND}${rutaBackend}${request.nextUrl.search}`
  const metodo = request.method
  // El backend resuelve el portal por el host: se reenvía el host del navegador en
  // `X-Forwarded-Host` (el `Host` de la URL interna del backend no vale). Del host
  // entrante de confianza, no de un valor del cliente.
  const host = hostEntrante(request.headers)
  // Se reenvía como bytes (ArrayBuffer), no como texto: `request.text()` decodifica
  // en UTF-8 y corrompería un binario (p. ej. la subida del logotipo PNG/ICO). Para
  // los cuerpos JSON es indistinto (los mismos bytes con su `content-type`).
  const cuerpo = metodo === 'GET' || metodo === 'HEAD' ? undefined : await request.arrayBuffer()
  const tipo = request.headers.get('content-type') ?? undefined

  const llamar = (token?: string): Promise<Response> => {
    const headers: Record<string, string> = {}
    if (tipo) headers['content-type'] = tipo
    if (host) headers[CABECERA_PORTAL] = host
    if (token) headers.authorization = `Bearer ${token}`
    return fetch(url, { method: metodo, headers, body: cuerpo, cache: 'no-store' })
  }

  let sesionNueva: Sesion | null = null
  let backendResp: Response | null = access ? await llamar(access) : null

  // Renueva si no había access token o si el backend lo rechazó (401).
  if ((backendResp === null || backendResp.status === 401) && refresh) {
    const renov = await backendRefresh(refresh, host)
    if (renov.ok) {
      const { access_token, refresh_token } = (await renov.json()) as {
        access_token: string
        refresh_token: string
      }
      sesionNueva = { access: access_token, refresh: refresh_token }
      backendResp = await llamar(access_token)
    } else {
      const fuera = NextResponse.json({ detail: 'No autenticado' }, { status: 401 })
      limpiarSesion(fuera)
      return fuera
    }
  }

  if (backendResp === null) {
    // Sin access token y sin refresh: nunca hubo sesión.
    return NextResponse.json({ detail: 'No autenticado' }, { status: 401 })
  }

  const out = respuestaDesde(backendResp, await backendResp.text())
  if (backendResp.status === 401) {
    limpiarSesion(out)
  } else if (sesionNueva) {
    fijarSesion(out, sesionNueva)
  }
  return out
}

import { cookies } from 'next/headers'
import { COOKIE_ACCESS } from '@/bff/cookies'
import { BACKEND } from './backend'

export interface SesionServidor {
  email: string
  nivel: number
}

/**
 * Identidad de la sesión resuelta en el servidor, para las guardias del panel
 * (antes de emitir HTML). Lee el access token de la cookie y consulta la
 * autoridad —el backend (`/api/auth/me`)— en vez de descodificar el JWT en el
 * borde: así un usuario desactivado o de nivel insuficiente se detecta al
 * instante. La renovación con el refresh token la hace el `middleware` antes de
 * llegar aquí; si no hay access válido, no hay sesión.
 */
export async function sesionActual(): Promise<SesionServidor | null> {
  const jar = await cookies()
  const access = jar.get(COOKIE_ACCESS)?.value
  if (!access) return null

  const resp = await fetch(`${BACKEND}/api/auth/me`, {
    headers: { authorization: `Bearer ${access}` },
    cache: 'no-store',
  })
  if (!resp.ok) return null
  return (await resp.json()) as SesionServidor
}

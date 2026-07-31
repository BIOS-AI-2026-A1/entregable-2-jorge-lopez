import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authFetch, borrarToken, guardarToken, haySesion, leerToken } from './sesion'

/**
 * `localStorage` en memoria: los tests corren en entorno `node`, sin DOM, y la
 * sesión solo necesita el contrato de `Storage`.
 */
function crearAlmacen(): Storage {
  const datos = new Map<string, string>()
  return {
    get length() {
      return datos.size
    },
    clear: () => datos.clear(),
    getItem: (clave: string) => datos.get(clave) ?? null,
    key: (indice: number) => [...datos.keys()][indice] ?? null,
    removeItem: (clave: string) => {
      datos.delete(clave)
    },
    setItem: (clave: string, valor: string) => {
      datos.set(clave, valor)
    },
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', crearAlmacen())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('token de sesión', () => {
  it('no hay sesión antes de guardar nada', () => {
    expect(leerToken()).toBeNull()
    expect(haySesion()).toBe(false)
  })

  it('guarda y lee el token', () => {
    guardarToken('abc.def.ghi')
    expect(leerToken()).toBe('abc.def.ghi')
    expect(haySesion()).toBe(true)
  })

  it('sobrescribe el token anterior', () => {
    guardarToken('primero')
    guardarToken('segundo')
    expect(leerToken()).toBe('segundo')
  })

  it('borrar el token cierra la sesión', () => {
    guardarToken('abc')
    borrarToken()
    expect(leerToken()).toBeNull()
    expect(haySesion()).toBe(false)
  })

  it('borrar sin sesión previa no falla', () => {
    expect(() => borrarToken()).not.toThrow()
    expect(haySesion()).toBe(false)
  })
})

describe('authFetch', () => {
  function stubFetch(status = 200) {
    // Cuerpo nulo: 204 y 304 no admiten cuerpo, y aquí nadie lo lee.
    const doble = vi.fn(async (_input: string, _init?: RequestInit) => new Response(null, { status }))
    vi.stubGlobal('fetch', doble)
    return doble
  }

  function cabeceras(doble: ReturnType<typeof stubFetch>): Headers {
    return doble.mock.calls[0][1]!.headers as Headers
  }

  it('añade la cabecera de autorización cuando hay sesión', async () => {
    guardarToken('mi-token')
    const doble = stubFetch()

    await authFetch('/api/admin/articulos')

    expect(cabeceras(doble).get('Authorization')).toBe('Bearer mi-token')
  })

  it('no añade autorización cuando no hay sesión', async () => {
    const doble = stubFetch()

    await authFetch('/api/admin/articulos')

    expect(cabeceras(doble).has('Authorization')).toBe(false)
  })

  it('pone Content-Type JSON cuando la petición lleva cuerpo', async () => {
    const doble = stubFetch()

    await authFetch('/api/admin/articulos', { method: 'POST', body: '{"id":"x"}' })

    expect(cabeceras(doble).get('Content-Type')).toBe('application/json')
  })

  it('no pisa un Content-Type declarado por quien llama', async () => {
    const doble = stubFetch()

    await authFetch('/api/admin/articulos', {
      method: 'POST',
      body: 'campo=valor',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    expect(cabeceras(doble).get('Content-Type')).toBe('application/x-www-form-urlencoded')
  })

  it('no pone Content-Type si no hay cuerpo', async () => {
    const doble = stubFetch()

    await authFetch('/api/admin/articulos')

    expect(cabeceras(doble).has('Content-Type')).toBe(false)
  })

  it('conserva el método y el cuerpo originales', async () => {
    const doble = stubFetch()

    await authFetch('/api/admin/articulos/x', { method: 'DELETE' })

    expect(doble.mock.calls[0][0]).toBe('/api/admin/articulos/x')
    expect(doble.mock.calls[0][1]!.method).toBe('DELETE')
  })

  it('un 401 descarta el token local', async () => {
    guardarToken('caducado')
    stubFetch(401)

    const resp = await authFetch('/api/admin/articulos')

    expect(resp.status).toBe(401)
    expect(haySesion()).toBe(false)
  })

  it('una respuesta correcta conserva la sesión', async () => {
    guardarToken('vigente')
    stubFetch(200)

    await authFetch('/api/admin/articulos')

    expect(leerToken()).toBe('vigente')
  })

  it('otros errores no cierran la sesión', async () => {
    guardarToken('vigente')
    stubFetch(500)

    await authFetch('/api/admin/articulos')

    // Solo el 401 significa sesión inválida; un 500 es un fallo del servidor.
    expect(leerToken()).toBe('vigente')
  })

  it('devuelve la respuesta tal cual', async () => {
    stubFetch(204)

    const resp = await authFetch('/api/admin/articulos/x', { method: 'DELETE' })

    expect(resp).toBeInstanceOf(Response)
    expect(resp.status).toBe(204)
  })
})

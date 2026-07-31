import { describe, expect, it } from 'vitest'
import { peticionGuardado, type ArticuloAdmin } from './admin'

function payload(): ArticuloAdmin {
  const trad = {
    slug: 'nuevo-articulo',
    titulo: 'Nuevo artículo',
    parrafos: ['Uno.'],
    howTo: { titulo: 'Cómo', pasos: [{ titulo: 'Paso', descripcion: 'Hazlo.' }] },
    nota: null,
    faq: [{ pregunta: '¿Sí?', respuesta: 'Sí.' }],
  }
  return {
    id: 'nuevo-articulo',
    categoria: 'cuenta',
    actualizado: '2026-07-25',
    minutosLectura: 2,
    destacado: false,
    relacionados: [],
    es: { ...trad },
    pt: { ...trad, slug: 'novo-artigo', titulo: 'Novo artigo' },
  }
}

describe('peticionGuardado', () => {
  it('crea con POST contra la colección', () => {
    const p = peticionGuardado(payload(), { tipo: 'crear' })
    expect(p.metodo).toBe('POST')
    expect(p.url).toBe('/api/admin/articulos')
  })

  it('al crear manda el id en el cuerpo, porque no va en la dirección', () => {
    const p = peticionGuardado(payload(), { tipo: 'crear' })
    expect(p.cuerpo).toHaveProperty('id', 'nuevo-articulo')
  })

  it('edita con PUT contra el artículo y sin el id en el cuerpo', () => {
    // La API de actualización rechaza el id en el cuerpo: va solo en la ruta.
    const p = peticionGuardado(payload(), { tipo: 'editar', articuloId: 'plazos' })
    expect(p.metodo).toBe('PUT')
    expect(p.url).toBe('/api/admin/articulos/plazos')
    expect(p.cuerpo).not.toHaveProperty('id')
  })

  it('al editar usa el id del destino, no el del borrador', () => {
    // El campo id está deshabilitado en modo editar; si el borrador quedara
    // desincronizado, mandar el suyo escribiría sobre otro artículo.
    const p = peticionGuardado(payload(), { tipo: 'editar', articuloId: 'otro-distinto' })
    expect(p.url).toBe('/api/admin/articulos/otro-distinto')
  })

  it('al editar no arranca el id del objeto que recibe', () => {
    // Quitar el id se hace sobre una copia: el borrador del formulario sigue
    // sirviendo si el guardado falla y se reintenta.
    const original = payload()
    peticionGuardado(original, { tipo: 'editar', articuloId: 'plazos' })
    expect(original.id).toBe('nuevo-articulo')
  })

  it('al editar conserva todo lo demás del artículo', () => {
    const p = peticionGuardado(payload(), { tipo: 'editar', articuloId: 'plazos' }).cuerpo as Omit<
      ArticuloAdmin,
      'id'
    >
    expect(Object.keys(p).sort()).toEqual(
      ['actualizado', 'categoria', 'destacado', 'es', 'minutosLectura', 'pt', 'relacionados'].sort(),
    )
    expect(p.es.titulo).toBe('Nuevo artículo')
    expect(p.pt.titulo).toBe('Novo artigo')
  })

  it('desde una pregunta va al endpoint que además la marca como cubierta', () => {
    const p = peticionGuardado(payload(), { tipo: 'desdePregunta', preguntaId: 7 })
    expect(p.metodo).toBe('POST')
    expect(p.url).toBe('/api/admin/preguntas-sin-resolver/7/crear-articulo')
    // Es un alta: el id sí viaja en el cuerpo.
    expect(p.cuerpo).toHaveProperty('id', 'nuevo-articulo')
  })

  it('el destino manda sobre el modo: una pregunta nunca acaba en PUT', () => {
    const desde = peticionGuardado(payload(), { tipo: 'desdePregunta', preguntaId: 1 })
    const crear = peticionGuardado(payload(), { tipo: 'crear' })
    expect(desde.url).not.toBe(crear.url)
    expect(desde.metodo).toBe('POST')
  })

  it('todas las direcciones cuelgan de /api/admin', () => {
    // Es el prefijo que el backend protege con Depends(admin_actual) y el que
    // el proxy de Vite reenvía a la API.
    const destinos = [
      { tipo: 'crear' } as const,
      { tipo: 'editar', articuloId: 'x' } as const,
      { tipo: 'desdePregunta', preguntaId: 1 } as const,
    ]
    for (const destino of destinos) {
      expect(peticionGuardado(payload(), destino).url.startsWith('/api/admin/')).toBe(true)
    }
  })
})

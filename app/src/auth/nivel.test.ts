import { describe, expect, it } from 'vitest'
import { NivelAcceso, esRoot, tieneNivel } from './nivel'

describe('tieneNivel', () => {
  it('sin sesión (null/undefined) no alcanza ningún recurso de administración', () => {
    expect(tieneNivel(null, NivelAcceso.ESTANDAR)).toBe(false)
    expect(tieneNivel(undefined, NivelAcceso.ESTANDAR)).toBe(false)
    expect(tieneNivel(null, NivelAcceso.ROOT)).toBe(false)
  })

  it('el nivel exacto alcanza su propio requisito', () => {
    expect(tieneNivel(NivelAcceso.ESTANDAR, NivelAcceso.ESTANDAR)).toBe(true)
    expect(tieneNivel(NivelAcceso.ROOT, NivelAcceso.ROOT)).toBe(true)
  })

  it('la jerarquía es estricta: Root hereda lo de Standard, no al revés', () => {
    // Root (3) satisface un requisito de Standard (2).
    expect(tieneNivel(NivelAcceso.ROOT, NivelAcceso.ESTANDAR)).toBe(true)
    // Standard (2) no llega a un recurso de Root (3).
    expect(tieneNivel(NivelAcceso.ESTANDAR, NivelAcceso.ROOT)).toBe(false)
  })
})

describe('esRoot', () => {
  it('solo es verdadero para el nivel Root', () => {
    expect(esRoot(NivelAcceso.ROOT)).toBe(true)
    expect(esRoot(NivelAcceso.ESTANDAR)).toBe(false)
    expect(esRoot(null)).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { NivelAcceso, esAdministrador, tieneNivel } from './nivel'

describe('tieneNivel', () => {
  it('sin sesión (null/undefined) no alcanza ningún recurso de administración', () => {
    expect(tieneNivel(null, NivelAcceso.EDITOR)).toBe(false)
    expect(tieneNivel(undefined, NivelAcceso.EDITOR)).toBe(false)
    expect(tieneNivel(null, NivelAcceso.ADMINISTRADOR)).toBe(false)
  })

  it('el nivel exacto alcanza su propio requisito', () => {
    expect(tieneNivel(NivelAcceso.EDITOR, NivelAcceso.EDITOR)).toBe(true)
    expect(tieneNivel(NivelAcceso.ADMINISTRADOR, NivelAcceso.ADMINISTRADOR)).toBe(true)
  })

  it('la jerarquía es estricta: Administrador hereda lo de Editor, no al revés', () => {
    // Administrador (3) satisface un requisito de Editor (2).
    expect(tieneNivel(NivelAcceso.ADMINISTRADOR, NivelAcceso.EDITOR)).toBe(true)
    // Editor (2) no llega a un recurso de Administrador (3).
    expect(tieneNivel(NivelAcceso.EDITOR, NivelAcceso.ADMINISTRADOR)).toBe(false)
  })
})

describe('esAdministrador', () => {
  it('solo es verdadero para el nivel Administrador', () => {
    expect(esAdministrador(NivelAcceso.ADMINISTRADOR)).toBe(true)
    expect(esAdministrador(NivelAcceso.EDITOR)).toBe(false)
    expect(esAdministrador(null)).toBe(false)
  })
})

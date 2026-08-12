import { describe, expect, it } from 'vitest'
import {
  AA_NORMAL,
  derivarTokensAcento,
  hexARgb,
  luminanciaRelativa,
  ratioContraste,
  validarPaleta,
} from './contraste'

const ACENTO_DEFECTO = '#4338ca'
const BANNER_DEFECTO: [string, string, string] = ['#3730a3', '#4338ca', '#4f46e5']

describe('fórmulas de contraste', () => {
  it('expande el hex de tres dígitos', () => {
    expect(hexARgb('#fff')).toEqual([255, 255, 255])
    expect(hexARgb('#000')).toEqual([0, 0, 0])
  })

  it('rechaza hex inválidos', () => {
    for (const malo of ['blanco', '#12', '#1234', 'rgb(0,0,0)', '#ggghhh']) {
      expect(() => hexARgb(malo)).toThrow()
    }
  })

  it('luminancia en los extremos', () => {
    expect(luminanciaRelativa('#000000')).toBeCloseTo(0, 6)
    expect(luminanciaRelativa('#ffffff')).toBeCloseTo(1, 6)
  })

  it('blanco vs negro da 21:1', () => {
    expect(ratioContraste('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  it('el ratio es simétrico', () => {
    expect(ratioContraste('#4338ca', '#ffffff')).toBeCloseTo(ratioContraste('#ffffff', '#4338ca'), 6)
  })

  it('gris límite AA', () => {
    expect(ratioContraste('#767676', '#ffffff')).toBeGreaterThanOrEqual(AA_NORMAL)
    expect(ratioContraste('#787878', '#ffffff')).toBeLessThan(AA_NORMAL)
  })
})

describe('derivación de tokens', () => {
  it('devuelve hex válidos y hover más oscuro / claro más luminoso', () => {
    const tokens = derivarTokensAcento(ACENTO_DEFECTO)
    expect(() => hexARgb(tokens.hover)).not.toThrow()
    expect(() => hexARgb(tokens.claro)).not.toThrow()
    expect(() => hexARgb(tokens.foco)).not.toThrow()
    const base = luminanciaRelativa(ACENTO_DEFECTO)
    expect(luminanciaRelativa(tokens.hover)).toBeLessThan(base)
    expect(luminanciaRelativa(tokens.claro)).toBeGreaterThan(base)
  })
})

describe('validación de paleta', () => {
  it('la paleta por defecto cumple', () => {
    expect(validarPaleta(ACENTO_DEFECTO, ...BANNER_DEFECTO)).toBeNull()
  })

  it('un acento demasiado claro falla el botón', () => {
    const fallo = validarPaleta('#cccccc', ...BANNER_DEFECTO)
    expect(fallo).not.toBeNull()
    expect(fallo!.par.toLowerCase()).toContain('botón')
    expect(fallo!.ratio).toBeLessThan(fallo!.minimo)
  })

  it('un banner demasiado claro falla', () => {
    const fallo = validarPaleta(ACENTO_DEFECTO, '#3730a3', '#4338ca', '#fffbe6')
    expect(fallo).not.toBeNull()
    expect(fallo!.par.toLowerCase()).toContain('banner')
  })

  it('un color inválido lanza', () => {
    expect(() => validarPaleta('no-es-hex', ...BANNER_DEFECTO)).toThrow()
  })
})

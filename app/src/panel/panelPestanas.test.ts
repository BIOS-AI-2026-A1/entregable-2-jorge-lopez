import { describe, expect, it } from 'vitest'
import { PESTANAS, resolverPestana } from './panelPestanas'

describe('PESTANAS', () => {
  it('incluye categorias entre gestion y admin, en ese orden', () => {
    expect(PESTANAS).toEqual(['sinResolver', 'gestion', 'categorias', 'admin'])
  })
})

describe('resolverPestana', () => {
  it('sin parámetro cae a la pestaña por defecto', () => {
    expect(resolverPestana(null, false)).toBe('sinResolver')
    expect(resolverPestana(null, true)).toBe('sinResolver')
  })

  it('un valor desconocido cae a la pestaña por defecto', () => {
    expect(resolverPestana('otra', true)).toBe('sinResolver')
    expect(resolverPestana('', true)).toBe('sinResolver')
  })

  it('devuelve una pestaña válida no restringida tal cual', () => {
    expect(resolverPestana('sinResolver', false)).toBe('sinResolver')
    expect(resolverPestana('gestion', false)).toBe('gestion')
  })

  it('categorias está disponible para Standard (sin Root)', () => {
    expect(resolverPestana('categorias', false)).toBe('categorias')
    expect(resolverPestana('categorias', true)).toBe('categorias')
  })

  it('admin solo se resuelve cuando la sesión es Root', () => {
    expect(resolverPestana('admin', true)).toBe('admin')
  })

  it('admin sin Root cae a la pestaña por defecto (no se expone por URL)', () => {
    expect(resolverPestana('admin', false)).toBe('sinResolver')
  })
})

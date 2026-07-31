import { createContext, useContext, type ReactNode } from 'react'
import type { ContenidoIdioma, Idioma } from '@/types'
import type { ContenidoPorIdioma } from './index'

/**
 * Contenido de ambos idiomas, cargado por el loader de ruta y provisto al árbol.
 * Permite que las pantallas y componentes lean el contenido de forma síncrona,
 * sin `useEffect` ni estados de carga propios: cuando renderizan, ya está aquí.
 */
const ContenidoContext = createContext<ContenidoPorIdioma | null>(null)

export function ContenidoProvider({ valor, children }: { valor: ContenidoPorIdioma; children: ReactNode }) {
  return <ContenidoContext.Provider value={valor}>{children}</ContenidoContext.Provider>
}

export function useContenidos(): ContenidoPorIdioma {
  const ctx = useContext(ContenidoContext)
  if (ctx === null) throw new Error('useContenidos debe usarse dentro de ContenidoProvider')
  return ctx
}

export function useContenido(idioma: Idioma): ContenidoIdioma {
  return useContenidos()[idioma]
}

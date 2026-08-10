import { esIdioma } from '@/types'
import { redirect } from 'next/navigation'
import { traducir } from '@/i18n/traducir'
import { cargarContenidoServidor } from '@/data/servidor'
import { BuscadorAyuda } from '../_componentes/BuscadorAyuda'
import { EscalacionBloque } from '../_componentes/EscalacionBloque'

/**
 * Inicio del Centro de Ayuda. Server Component: el contenido (categorías y
 * populares) llega renderizado en el HTML inicial. La búsqueda es una isla de
 * cliente que se prerenderiza igualmente.
 */
export default async function PaginaInicio({ params }: { params: Promise<{ idioma: string }> }) {
  const { idioma } = await params
  if (!esIdioma(idioma)) redirect('/es')

  const t = traducir(idioma)
  const contenido = await cargarContenidoServidor(idioma)

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="focus:outline-none"
      aria-label={t('inicio.titulo', { empresa: contenido.empresa })}
    >
      <BuscadorAyuda idioma={idioma} contenido={contenido} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 pt-4">
        <EscalacionBloque idioma={idioma} />
      </div>
    </main>
  )
}

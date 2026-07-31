import { useTranslation } from 'react-i18next'
import { Link, useLocation, useParams } from 'react-router-dom'
import { IDIOMAS, type Idioma } from '@/types'
import { articuloPorId, articuloPorSlug, type ContenidoPorIdioma } from '@/data'
import { useContenidos } from '@/data/contexto'
import { rutas } from '@/i18n/rutas'
import { Ic } from './iconos'

/**
 * Cambia de idioma conservando la pantalla actual. Como los identificadores de
 * artículo son estables entre idiomas pero los segmentos de dirección no, se
 * traduce el segmento pasando por el identificador.
 */
function equivalenteEn(
  contenidos: ContenidoPorIdioma,
  destino: Idioma,
  actual: Idioma,
  ruta: string,
  slug?: string,
): string {
  if (!slug) {
    return ruta.endsWith('/panel') ? rutas.panel(destino) : rutas.inicio(destino)
  }

  const articuloActual = articuloPorSlug(contenidos[actual], slug)
  if (!articuloActual) return rutas.inicio(destino)

  const equivalente = articuloPorId(contenidos[destino], articuloActual.id)
  return equivalente ? rutas.articulo(destino, equivalente.slug) : rutas.inicio(destino)
}

export function SelectorIdioma({ idioma }: { idioma: Idioma }) {
  const { t } = useTranslation()
  const location = useLocation()
  const { slug } = useParams()
  const contenidos = useContenidos()

  return (
    <div className="flex items-center gap-1.5">
      <span id="etiqueta-idioma" className="flex items-center gap-1 text-xs font-medium text-slate-500">
        <Ic.Globe size={13} className="text-slate-400" />
        {t('idioma.etiqueta')}
      </span>
      <ul className="flex items-center gap-0.5 list-none p-0 m-0" aria-labelledby="etiqueta-idioma">
        {IDIOMAS.map(codigo => {
          const activo = codigo === idioma
          return (
            <li key={codigo}>
              <Link
                to={equivalenteEn(contenidos, codigo, idioma, location.pathname, slug)}
                hrefLang={codigo}
                aria-current={activo ? 'true' : undefined}
                aria-label={
                  activo
                    ? t('idioma.actual', { idioma: t(`idioma.${codigo}`) })
                    : t('idioma.cambiarA', { idioma: t(`idioma.${codigo}`) })
                }
                className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 ${
                  activo
                    ? 'bg-indigo-50 text-indigo-800 font-bold underline underline-offset-4 decoration-2'
                    : 'text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {codigo.toUpperCase()}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

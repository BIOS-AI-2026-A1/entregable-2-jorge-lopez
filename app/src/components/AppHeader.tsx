import { useTranslation } from 'react-i18next'
import { NavLink, Link } from 'react-router-dom'
import type { Idioma } from '@/types'
import { rutas } from '@/i18n/rutas'
import { useContenido } from '@/data/contexto'
import { Logo } from './Logo'
import { SelectorIdioma } from './SelectorIdioma'

export function AppHeader({ idioma }: { idioma: Idioma }) {
  const { t } = useTranslation()
  const contenido = useContenido(idioma)

  const clasesEnlace = (activo: boolean) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 inline-flex items-center min-h-[44px] ${
      activo ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-16 py-2 flex items-center justify-between gap-4 flex-wrap">
        <Link
          to={rutas.inicio(idioma)}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2 rounded-lg"
          aria-label={t('general.irAlInicio')}
        >
          <Logo empresa={contenido.empresa} />
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <nav aria-label={t('nav.etiqueta')}>
            <ul className="flex items-center gap-0.5 list-none p-0 m-0">
              <li>
                <NavLink to={rutas.inicio(idioma)} end className={({ isActive }) => clasesEnlace(isActive)}>
                  {t('nav.inicio')}
                </NavLink>
              </li>
              <li>
                <NavLink to={rutas.panel(idioma)} className={({ isActive }) => clasesEnlace(isActive)}>
                  {t('nav.panel')}
                </NavLink>
              </li>
            </ul>
          </nav>

          <SelectorIdioma idioma={idioma} />
        </div>
      </div>
    </header>
  )
}

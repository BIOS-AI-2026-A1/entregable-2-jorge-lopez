import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Idioma } from '@/types'
import { rutas } from '@/i18n/rutas'
import { Ic } from '@/components/iconos'

export function NoEncontrado({ idioma }: { idioma: Idioma }) {
  const { t } = useTranslation()

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 mb-5">
          <Ic.AlertCircle size={26} className="text-amber-700" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
          {t('articulo.noEncontrado')}
        </h1>
        <p className="text-slate-600 text-[15px] max-w-md mx-auto">{t('articulo.noEncontradoAyuda')}</p>
        <Link
          to={rutas.inicio(idioma)}
          className="mt-6 inline-flex items-center gap-2 px-5 rounded-lg text-white text-sm font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4338ca] min-h-[44px]"
          style={{ background: 'var(--acento)' }}
        >
          {t('articulo.volverInicio')}
        </Link>
      </div>
    </main>
  )
}

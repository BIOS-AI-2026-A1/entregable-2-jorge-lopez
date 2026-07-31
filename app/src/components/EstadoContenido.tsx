import { useTranslation } from 'react-i18next'
import { Ic } from './iconos'

/** Estado de carga accesible mientras el loader trae el contenido. */
export function CargandoContenido() {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-700"
    >
      <Ic.Loader size={28} className="animate-spin text-indigo-700 motion-reduce:animate-none" />
      <p className="text-sm font-medium">{t('estado.cargando')}</p>
    </div>
  )
}

/** Estado de error accesible cuando falla la carga del contenido (texto + icono). */
export function ErrorContenido() {
  const { t } = useTranslation()
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen flex items-center justify-center bg-slate-50 px-4 focus:outline-none"
    >
      <div role="alert" className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
          <Ic.AlertCircle size={24} className="text-red-700" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 mb-1">{t('estado.errorTitulo')}</h1>
        <p className="text-sm text-slate-600 mb-5">{t('estado.errorAyuda')}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4338ca] min-h-[44px]"
          style={{ background: 'var(--acento)' }}
        >
          <Ic.RefreshCw size={16} />
          {t('estado.reintentar')}
        </button>
      </div>
    </main>
  )
}

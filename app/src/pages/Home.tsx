import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Idioma } from '@/types'
import { articulosDestacados, buscarArticulos, contarPorCategoria } from '@/data'
import { useContenido } from '@/data/contexto'
import { rutas } from '@/i18n/rutas'
import { Icono, Ic } from '@/components/iconos'
import { EscalationBlock } from '@/components/EscalationBlock'

export function Home({ idioma }: { idioma: Idioma }) {
  const { t } = useTranslation()
  const [consulta, setConsulta] = useState('')

  const contenido = useContenido(idioma)
  const conteos = useMemo(() => contarPorCategoria(contenido.articulos), [contenido])
  const destacados = useMemo(() => articulosDestacados(contenido), [contenido])

  const termino = consulta.trim()
  const buscando = termino !== ''
  const resultados = useMemo(
    () => (buscando ? buscarArticulos(contenido, termino) : []),
    [buscando, contenido, termino],
  )

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none" aria-label={t('inicio.titulo')}>
      <section
        className="py-16 px-4 text-center"
        style={{ background: 'linear-gradient(160deg, #3730a3 0%, #4338ca 60%, #4f46e5 100%)' }}
        aria-labelledby="home-h1"
      >
        <h1
          id="home-h1"
          className="text-3xl sm:text-4xl font-bold text-white mb-2 leading-tight"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          {t('inicio.titulo')}
        </h1>
        <p className="text-indigo-100 text-lg mb-8">{t('inicio.subtitulo')}</p>

        <div className="max-w-xl mx-auto">
          <label htmlFor="buscar-ayuda" className="block text-white text-sm font-medium mb-2 text-left">
            {t('inicio.buscarEtiqueta')}
          </label>
          <div role="search" className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Ic.Search size={20} className="text-slate-500" />
            </div>
            <input
              id="buscar-ayuda"
              type="search"
              value={consulta}
              onChange={e => setConsulta(e.target.value)}
              placeholder={t('inicio.buscarMarcador')}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl text-slate-900 bg-white text-base shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-700"
            />
          </div>
          <p className="mt-2 text-indigo-100 text-xs text-left">{t('inicio.buscarPista')}</p>
        </div>
      </section>

      {/* ── Resultados de búsqueda ─────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6" aria-live="polite" aria-label={t('busqueda.regionEtiqueta')}>
        {buscando && (
          <section className="pt-10" aria-labelledby="resultados-h2">
            {resultados.length > 0 ? (
              <>
                <h2 id="resultados-h2" className="text-xl font-semibold text-slate-900 mb-4">
                  {t('busqueda.resultados', { count: resultados.length, termino })}
                </h2>
                <ul className="space-y-1 list-none p-0 m-0">
                  {resultados.map(articulo => {
                    const categoria = contenido.categorias.find(c => c.id === articulo.categoria)
                    return (
                      <li key={articulo.id}>
                        <Link
                          to={rutas.articulo(idioma, articulo.slug)}
                          className="w-full flex items-center gap-2.5 px-3 py-3 rounded-lg text-left text-slate-700 hover:text-indigo-800 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 transition-colors min-h-[44px]"
                        >
                          <Ic.ChevronRight size={15} className="shrink-0 text-indigo-400" />
                          <span className="text-sm font-medium">{articulo.titulo}</span>
                          {categoria && (
                            <span className="ml-auto shrink-0 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {categoria.nombre}
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 id="resultados-h2" className="font-semibold text-slate-900 text-[15px] flex items-center gap-2">
                  <Ic.AlertCircle size={16} className="text-amber-600 shrink-0" />
                  {t('busqueda.sinResultados', { termino })}
                </h2>
                <p className="text-slate-600 text-sm mt-2">{t('busqueda.sinResultadosAyuda')}</p>
                <a
                  href="mailto:soporte@empresa.example"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4338ca] min-h-[44px]"
                  style={{ background: 'var(--acento)' }}
                >
                  <Ic.Mail size={16} />
                  {t('escalamiento.boton')}
                </a>
              </div>
            )}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setConsulta('')}
                className="inline-flex items-center gap-2 px-3 rounded-lg border border-slate-500 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 min-h-[44px]"
              >
                <Ic.X size={15} />
                {t('busqueda.limpiar')}
              </button>
            </div>
          </section>
        )}
      </div>

      {/* ── Vista por defecto ──────────────────────── */}
      {!buscando && (
        <>
          <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12" aria-labelledby="cat-h2">
            <h2 id="cat-h2" className="text-xl font-semibold text-slate-900 mb-6">
              {t('inicio.categorias')}
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 list-none p-0 m-0">
              {contenido.categorias.map(categoria => {
                const total = conteos[categoria.id] ?? 0
                return (
                  <li key={categoria.id}>
                    <button
                      type="button"
                      onClick={() => setConsulta(categoria.nombre)}
                      className="w-full group flex flex-col items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2 transition-all cursor-pointer min-h-[120px] justify-center"
                      aria-label={t('inicio.categoriaAria', { nombre: categoria.nombre, count: total })}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${categoria.fondo} ${categoria.texto} transition-transform group-hover:scale-110`}>
                        <Icono nombre={categoria.icono} size={22} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-slate-900 text-sm leading-snug">{categoria.nombre}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t('general.articulos', { count: total })}</p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-10">
            <section aria-labelledby="pop-h2">
              <h2 id="pop-h2" className="text-xl font-semibold text-slate-900 mb-4">
                {t('inicio.populares')}
              </h2>
              <ul className="space-y-1 list-none p-0 m-0">
                {destacados.map(articulo => (
                  <li key={articulo.id}>
                    <Link
                      to={rutas.articulo(idioma, articulo.slug)}
                      className="w-full flex items-center gap-2.5 px-3 py-3 rounded-lg text-left text-slate-700 hover:text-indigo-800 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 transition-colors group min-h-[44px]"
                    >
                      <Ic.ChevronRight size={15} className="shrink-0 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm font-medium">{articulo.titulo}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 pt-4">
        <EscalationBlock />
      </div>
    </main>
  )
}

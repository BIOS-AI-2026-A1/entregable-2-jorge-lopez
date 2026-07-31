import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import type { Idioma } from '@/types'
import { articuloPorId, articuloPorSlug } from '@/data'
import { useContenido } from '@/data/contexto'
import { FECHA_LARGA, fechaLegible } from '@/i18n/fechas'
import { rutas } from '@/i18n/rutas'
import { Ic } from '@/components/iconos'
import { Accordion } from '@/components/Accordion'
import { EscalationBlock } from '@/components/EscalationBlock'
import { NoEncontrado } from './NoEncontrado'

export function Article({ idioma }: { idioma: Idioma }) {
  const { t, i18n } = useTranslation()
  const { slug } = useParams()
  const [valoracion, setValoracion] = useState<'si' | 'no' | null>(null)

  const contenido = useContenido(idioma)
  const articulo = slug ? articuloPorSlug(contenido, slug) : undefined

  if (!articulo) return <NoEncontrado idioma={idioma} />

  const categoria = contenido.categorias.find(c => c.id === articulo.categoria)
  const relacionados = articulo.relacionados
    .map(id => articuloPorId(contenido, id))
    .filter((a): a is NonNullable<typeof a> => a !== undefined)

  const fechaActualizado = fechaLegible(articulo.actualizado, i18n.language, FECHA_LARGA)

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <div className="border-b border-slate-100 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          <nav aria-label={t('articulo.rutaNavegacion')}>
            <ol className="flex items-center gap-1.5 text-sm text-slate-600 list-none p-0 m-0 flex-wrap">
              <li>
                <Link
                  to={rutas.inicio(idioma)}
                  className="text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 rounded"
                >
                  {t('articulo.raiz')}
                </Link>
              </li>
              <li aria-hidden="true" className="text-slate-400">›</li>
              {categoria && (
                <>
                  <li>
                    <Link
                      to={`${rutas.inicio(idioma)}?categoria=${categoria.slug}`}
                      className="text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 rounded"
                    >
                      {categoria.nombre}
                    </Link>
                  </li>
                  <li aria-hidden="true" className="text-slate-400">›</li>
                </>
              )}
              <li aria-current="page" className="text-slate-700 font-medium truncate max-w-[200px]">
                {articulo.titulo}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <h1
            className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-3"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {articulo.titulo}
          </h1>
          <div className="flex items-center gap-3 text-slate-600 text-sm flex-wrap">
            <div className="flex items-center gap-1.5">
              <Ic.Clock size={13} />
              <span>
                {t('articulo.actualizado')} <time dateTime={articulo.actualizado}>{fechaActualizado}</time>
              </span>
            </div>
            <span aria-hidden="true">·</span>
            <span>{t('articulo.lectura', { minutos: articulo.minutosLectura })}</span>
          </div>
        </header>

        <article className="space-y-6 text-slate-700 text-[16px] leading-relaxed">
          {articulo.parrafos.map((parrafo, i) => (
            <p key={i}>{parrafo}</p>
          ))}

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-indigo-700 flex items-center justify-center shrink-0">
                <Ic.FileText size={14} className="text-white" />
              </div>
              <h2 className="font-bold text-slate-900 text-base">{articulo.howTo.titulo}</h2>
            </div>
            <ol className="space-y-4 list-none p-0 m-0" aria-label={t('articulo.pasosAria', { titulo: articulo.howTo.titulo })}>
              {articulo.howTo.pasos.map((paso, i) => (
                <li key={i} className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="shrink-0 w-8 h-8 rounded-full bg-indigo-700 text-white text-sm font-bold flex items-center justify-center mt-0.5"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 text-[15px] leading-snug">{paso.titulo}</p>
                    <p className="text-slate-600 text-sm mt-1 leading-relaxed">{paso.descripcion}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {articulo.nota && (
            <div role="note" className="flex items-start gap-3 p-4 rounded-xl border border-sky-200 bg-sky-50">
              <Ic.Info size={17} className="shrink-0 text-sky-800 mt-0.5" />
              <p className="text-sm text-sky-900">
                <strong>{t('articulo.informacion')}</strong> {articulo.nota}
              </p>
            </div>
          )}

          <div>
            <h2 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
              <Ic.HelpCircle size={18} className="text-indigo-700" />
              {t('articulo.faq')}
            </h2>
            <div className="space-y-3">
              {articulo.faq.map((item, i) => (
                <Accordion key={i} pregunta={item.pregunta} respuesta={item.respuesta} />
              ))}
            </div>
          </div>
        </article>

        <div className="mt-10 pt-8 border-t border-slate-100">
          <h2 className="font-semibold text-slate-900 text-base mb-4">{t('articulo.util')}</h2>
          {valoracion === null ? (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setValoracion('si')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-500 bg-white text-slate-700 text-sm font-medium hover:border-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 transition-colors min-h-[44px]"
              >
                <Ic.ThumbsUp size={16} />
                {t('articulo.utilSi')}
              </button>
              <button
                type="button"
                onClick={() => setValoracion('no')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-500 bg-white text-slate-700 text-sm font-medium hover:border-red-600 hover:text-red-800 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 transition-colors min-h-[44px]"
              >
                <Ic.ThumbsDown size={16} />
                {t('articulo.utilNo')}
              </button>
            </div>
          ) : valoracion === 'si' ? (
            <div role="status" className="inline-flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-lg text-sm font-medium">
              <Ic.CheckCircle size={16} className="text-emerald-700" />
              <span>{t('articulo.graciasSi')}</span>
            </div>
          ) : (
            <div role="status" className="inline-flex items-center gap-2 text-amber-900 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-lg text-sm font-medium">
              <Ic.Info size={16} className="text-amber-700" />
              <span>{t('articulo.graciasNo')}</span>
            </div>
          )}
        </div>

        {relacionados.length > 0 && (
          <div className="mt-8 pt-8 border-t border-slate-100">
            <h2 className="font-semibold text-slate-900 text-base mb-4">{t('articulo.relacionados')}</h2>
            <ul className="space-y-2 list-none p-0 m-0">
              {relacionados.map(rel => (
                <li key={rel.id}>
                  <Link
                    to={rutas.articulo(idioma, rel.slug)}
                    className="inline-flex items-center gap-2.5 text-sm text-indigo-700 hover:text-indigo-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 rounded min-h-[44px]"
                  >
                    <Ic.ChevronRight size={14} className="text-indigo-500 shrink-0" />
                    {rel.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10">
          <EscalationBlock />
        </div>
      </div>
    </main>
  )
}

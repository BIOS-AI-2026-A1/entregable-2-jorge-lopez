import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { IDIOMAS, type Categoria, type Idioma } from '@/types'
import { guardarArticulo, type ArticuloAdmin, type DestinoArticulo } from '@/data/admin'
import { aPayload, draftInicial, type Draft, type TradDraft } from '@/data/articuloBorrador'
import { Ic } from './iconos'

type Props = {
  categorias: Categoria[]
  modo: 'crear' | 'editar'
  inicial?: ArticuloAdmin
  preguntaId?: number
  onCerrar: () => void
  onGuardado: () => void
}

const CAMPO =
  'w-full px-3 py-2 rounded-lg border border-slate-500 bg-white text-slate-900 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:border-transparent'
const BOTON_SEC =
  'inline-flex items-center gap-1.5 px-3 rounded-lg border border-slate-500 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 min-h-[44px]'

export function ArticuloForm({ categorias, modo, inicial, preguntaId, onCerrar, onGuardado }: Props) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<Draft>(() => draftInicial(inicial, categorias[0]?.id ?? ''))
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const tituloRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    tituloRef.current?.focus()
  }, [])

  const patchTrad = (idioma: Idioma, patch: Partial<TradDraft>) =>
    setDraft(d => ({ ...d, [idioma]: { ...d[idioma], ...patch } }))

  async function alEnviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const destino: DestinoArticulo =
        preguntaId !== undefined
          ? { tipo: 'desdePregunta', preguntaId }
          : modo === 'crear'
            ? { tipo: 'crear' }
            : { tipo: 'editar', articuloId: inicial!.id }

      const resp = await guardarArticulo(aPayload(draft), destino)
      if (!resp.ok) {
        setError(resp.status === 409 ? t('panelGestion.errorIdDuplicado') : t('panelGestion.errorGuardar'))
        return
      }
      onGuardado()
    } catch {
      setError(t('panelGestion.errorRed'))
    } finally {
      setEnviando(false)
    }
  }

  const titulo =
    preguntaId !== undefined
      ? t('panelGestion.crearDesdePregunta')
      : modo === 'crear'
        ? t('panelGestion.nuevo')
        : t('panelGestion.editar')

  return (
    <section aria-labelledby="form-articulo-h" className="rounded-2xl border border-indigo-200 bg-white p-5 sm:p-6">
      <h2 id="form-articulo-h" tabIndex={-1} className="text-lg font-bold text-slate-900 mb-4 focus:outline-none">
        {titulo}
      </h2>

      <form onSubmit={alEnviar} noValidate className="space-y-5">
        <div role="alert" aria-live="assertive" className="min-h-[1.25rem]">
          {error && (
            <p className="flex items-center gap-2 text-sm text-red-800 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              <Ic.AlertCircle size={15} className="text-red-700 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="af-id" className="block text-sm font-medium text-slate-700 mb-1">
              {t('panelGestion.id')}
            </label>
            <input
              id="af-id"
              className={CAMPO}
              value={draft.id}
              onChange={e => setDraft(d => ({ ...d, id: e.target.value }))}
              disabled={modo === 'editar'}
              required
              aria-describedby="af-id-ayuda"
            />
            <p id="af-id-ayuda" className="text-xs text-slate-500 mt-1">
              {t('panelGestion.idAyuda')}
            </p>
          </div>
          <div>
            <label htmlFor="af-categoria" className="block text-sm font-medium text-slate-700 mb-1">
              {t('panelGestion.categoria')}
            </label>
            <select
              id="af-categoria"
              className={CAMPO}
              value={draft.categoria}
              onChange={e => setDraft(d => ({ ...d, categoria: e.target.value }))}
            >
              {categorias.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="af-fecha" className="block text-sm font-medium text-slate-700 mb-1">
              {t('panelGestion.actualizado')}
            </label>
            <input
              id="af-fecha"
              type="date"
              className={CAMPO}
              value={draft.actualizado}
              onChange={e => setDraft(d => ({ ...d, actualizado: e.target.value }))}
              required
            />
          </div>
          <div>
            <label htmlFor="af-minutos" className="block text-sm font-medium text-slate-700 mb-1">
              {t('panelGestion.minutos')}
            </label>
            <input
              id="af-minutos"
              type="number"
              min={0}
              className={CAMPO}
              value={draft.minutosLectura}
              onChange={e => setDraft(d => ({ ...d, minutosLectura: Number(e.target.value) }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="af-relacionados" className="block text-sm font-medium text-slate-700 mb-1">
              {t('panelGestion.relacionados')}
            </label>
            <input
              id="af-relacionados"
              className={CAMPO}
              value={draft.relacionados}
              onChange={e => setDraft(d => ({ ...d, relacionados: e.target.value }))}
              aria-describedby="af-rel-ayuda"
            />
            <p id="af-rel-ayuda" className="text-xs text-slate-500 mt-1">
              {t('panelGestion.relacionadosAyuda')}
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-slate-500 text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]"
                checked={draft.destacado}
                onChange={e => setDraft(d => ({ ...d, destacado: e.target.checked }))}
              />
              {t('panelGestion.destacado')}
            </label>
          </div>
        </div>

        {IDIOMAS.map(idioma => (
          <SeccionIdioma key={idioma} idioma={idioma} trad={draft[idioma]} onPatch={patch => patchTrad(idioma, patch)} />
        ))}

        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-200">
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex items-center gap-2 px-4 rounded-lg text-white text-sm font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4338ca] disabled:opacity-60 min-h-[44px]"
            style={{ background: 'var(--acento)' }}
          >
            {enviando ? <Ic.Loader size={16} className="animate-spin motion-reduce:animate-none" /> : <Ic.Save size={16} />}
            {t('panelGestion.guardar')}
          </button>
          <button type="button" onClick={onCerrar} className={BOTON_SEC}>
            <Ic.X size={15} />
            {t('panelGestion.cancelar')}
          </button>
        </div>
      </form>
    </section>
  )
}

function SeccionIdioma({
  idioma,
  trad,
  onPatch,
}: {
  idioma: Idioma
  trad: TradDraft
  onPatch: (patch: Partial<TradDraft>) => void
}) {
  const { t } = useTranslation()
  const p = (s: string) => `${idioma}-${s}`

  const setPaso = (i: number, campo: 'titulo' | 'descripcion', valor: string) =>
    onPatch({ pasos: trad.pasos.map((paso, j) => (j === i ? { ...paso, [campo]: valor } : paso)) })
  const setFaq = (i: number, campo: 'pregunta' | 'respuesta', valor: string) =>
    onPatch({ faq: trad.faq.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)) })

  return (
    <fieldset className="rounded-xl border border-slate-200 p-4">
      <legend className="px-2 text-sm font-bold text-indigo-800 uppercase tracking-wide">{t(`idioma.${idioma}`)}</legend>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={p('slug')} className="block text-sm font-medium text-slate-700 mb-1">
              {t('panelGestion.slug')}
            </label>
            <input id={p('slug')} className={CAMPO} value={trad.slug} onChange={e => onPatch({ slug: e.target.value })} required />
          </div>
          <div>
            <label htmlFor={p('titulo')} className="block text-sm font-medium text-slate-700 mb-1">
              {t('panelGestion.tituloArticulo')}
            </label>
            <input id={p('titulo')} className={CAMPO} value={trad.titulo} onChange={e => onPatch({ titulo: e.target.value })} required />
          </div>
        </div>
        <div>
          <label htmlFor={p('parrafos')} className="block text-sm font-medium text-slate-700 mb-1">
            {t('panelGestion.parrafos')}
          </label>
          <textarea
            id={p('parrafos')}
            rows={4}
            className={CAMPO}
            value={trad.parrafos}
            onChange={e => onPatch({ parrafos: e.target.value })}
            aria-describedby={p('parrafos-ayuda')}
          />
          <p id={p('parrafos-ayuda')} className="text-xs text-slate-500 mt-1">
            {t('panelGestion.parrafosAyuda')}
          </p>
        </div>
        <div>
          <label htmlFor={p('nota')} className="block text-sm font-medium text-slate-700 mb-1">
            {t('panelGestion.nota')}
          </label>
          <input id={p('nota')} className={CAMPO} value={trad.nota} onChange={e => onPatch({ nota: e.target.value })} />
        </div>
        <div>
          <label htmlFor={p('howto')} className="block text-sm font-medium text-slate-700 mb-1">
            {t('panelGestion.howToTitulo')}
          </label>
          <input id={p('howto')} className={CAMPO} value={trad.howToTitulo} onChange={e => onPatch({ howToTitulo: e.target.value })} />
        </div>

        <FilasDinamicas
          etiqueta={t('panelGestion.pasos')}
          items={trad.pasos}
          onAgregar={() => onPatch({ pasos: [...trad.pasos, { titulo: '', descripcion: '' }] })}
          onQuitar={i => onPatch({ pasos: trad.pasos.filter((_, j) => j !== i) })}
          textoAgregar={t('panelGestion.agregarPaso')}
          render={(paso, i) => (
            <div className="grid sm:grid-cols-2 gap-2 flex-1">
              <input
                aria-label={t('panelGestion.pasoTitulo', { n: i + 1 })}
                className={CAMPO}
                value={paso.titulo}
                onChange={e => setPaso(i, 'titulo', e.target.value)}
                placeholder={t('panelGestion.pasoTituloMarcador')}
              />
              <input
                aria-label={t('panelGestion.pasoDescripcion', { n: i + 1 })}
                className={CAMPO}
                value={paso.descripcion}
                onChange={e => setPaso(i, 'descripcion', e.target.value)}
                placeholder={t('panelGestion.pasoDescripcionMarcador')}
              />
            </div>
          )}
        />

        <FilasDinamicas
          etiqueta={t('panelGestion.faq')}
          items={trad.faq}
          onAgregar={() => onPatch({ faq: [...trad.faq, { pregunta: '', respuesta: '' }] })}
          onQuitar={i => onPatch({ faq: trad.faq.filter((_, j) => j !== i) })}
          textoAgregar={t('panelGestion.agregarFaq')}
          render={(f, i) => (
            <div className="grid sm:grid-cols-2 gap-2 flex-1">
              <input
                aria-label={t('panelGestion.faqPregunta', { n: i + 1 })}
                className={CAMPO}
                value={f.pregunta}
                onChange={e => setFaq(i, 'pregunta', e.target.value)}
                placeholder={t('panelGestion.faqPreguntaMarcador')}
              />
              <input
                aria-label={t('panelGestion.faqRespuesta', { n: i + 1 })}
                className={CAMPO}
                value={f.respuesta}
                onChange={e => setFaq(i, 'respuesta', e.target.value)}
                placeholder={t('panelGestion.faqRespuestaMarcador')}
              />
            </div>
          )}
        />
      </div>
    </fieldset>
  )
}

function FilasDinamicas<T>({
  etiqueta,
  items,
  onAgregar,
  onQuitar,
  textoAgregar,
  render,
}: {
  etiqueta: string
  items: T[]
  onAgregar: () => void
  onQuitar: (i: number) => void
  textoAgregar: string
  render: (item: T, i: number) => ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div>
      <p className="block text-sm font-medium text-slate-700 mb-2">{etiqueta}</p>
      <ul className="space-y-2 list-none p-0 m-0">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            {render(item, i)}
            <button
              type="button"
              onClick={() => onQuitar(i)}
              aria-label={t('panelGestion.quitarFila', { n: i + 1 })}
              className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-lg border border-slate-500 bg-white text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1"
            >
              <Ic.Trash size={15} />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onAgregar} className={`${BOTON_SEC} mt-2`}>
        <Ic.Plus size={14} />
        {textoAgregar}
      </button>
    </div>
  )
}

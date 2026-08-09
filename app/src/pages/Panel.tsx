import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useRevalidator, useSearchParams } from 'react-router-dom'
import type { Idioma } from '@/types'
import {
  eliminarArticulo,
  guardarConfigIA,
  guardarEmpresa,
  listarPreguntas,
  obtenerArticulo,
  obtenerConfigIA,
  obtenerSesion,
  type ArticuloAdmin,
  type ConfigIAAdmin,
  type PreguntaAdmin,
  type SesionAdmin,
} from '@/data/admin'
import { useContenido } from '@/data/contexto'
import { borrarToken } from '@/auth/sesion'
import { esRoot } from '@/auth/nivel'
import { fechaLegible } from '@/i18n/fechas'
import { rutas } from '@/i18n/rutas'
import { Ic } from '@/components/iconos'
import { KcsChip } from '@/components/KcsChip'
import { ArticuloForm } from '@/components/ArticuloForm'
import { Modal } from '@/components/Modal'
import { Tabs, type Pestana } from '@/components/Tabs'
import { resolverPestana, type PestanaId } from './panelPestanas'

const ICONO_METRICA = {
  sinResolver: { icono: <Ic.HelpCircle size={22} className="text-indigo-700" />, fondo: 'bg-indigo-50' },
  conCita: { icono: <Ic.CheckCircle size={22} className="text-emerald-700" />, fondo: 'bg-emerald-50' },
  creados: { icono: <Ic.FileText size={22} className="text-purple-700" />, fondo: 'bg-purple-50' },
} as const

const FILTROS = ['todas', 'nueva', 'revision', 'cubierta'] as const

type FormState = { modo: 'crear' | 'editar'; inicial?: ArticuloAdmin; preguntaId?: number }

export function Panel({ idioma }: { idioma: Idioma }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const contenido = useContenido(idioma)
  const [searchParams, setSearchParams] = useSearchParams()

  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>('todas')
  const [preguntas, setPreguntas] = useState<PreguntaAdmin[]>([])
  const [formulario, setFormulario] = useState<FormState | null>(null)
  // El aviso lleva su tono: un error nunca debe mostrarse con la señal de éxito.
  const [aviso, setAviso] = useState<{ texto: string; tono: 'exito' | 'error' } | null>(null)
  const avisoExito = (texto: string) => setAviso({ texto, tono: 'exito' })
  const avisoError = (texto: string) => setAviso({ texto, tono: 'error' })
  const [nivel, setNivel] = useState<number | null>(null)
  const [empresaInput, setEmpresaInput] = useState(contenido.empresa)
  const [configIA, setConfigIA] = useState<ConfigIAAdmin | null>(null)
  const [proveedorInput, setProveedorInput] = useState('anthropic')
  const [claveInput, setClaveInput] = useState('')

  async function cargarPreguntas() {
    const resp = await listarPreguntas(idioma)
    if (resp.ok) setPreguntas((await resp.json()) as PreguntaAdmin[])
    else if (resp.status === 401) navigate(rutas.login(idioma))
  }

  async function cargarSesion() {
    const resp = await obtenerSesion()
    if (resp.ok) setNivel(((await resp.json()) as SesionAdmin).nivel)
    else if (resp.status === 401) navigate(rutas.login(idioma))
  }

  async function cargarConfigIA() {
    const resp = await obtenerConfigIA()
    if (resp.ok) {
      const cfg = (await resp.json()) as ConfigIAAdmin
      setConfigIA(cfg)
      setProveedorInput(cfg.proveedorActivo)
    } else if (resp.status === 401) {
      navigate(rutas.login(idioma))
    }
  }

  useEffect(() => {
    void cargarPreguntas()
    void cargarSesion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idioma])

  // La configuración de IA solo la ve (y pide) Root; se carga al conocer el nivel.
  useEffect(() => {
    if (esRoot(nivel)) void cargarConfigIA()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel])

  // El input del campo [Empresa] sigue al valor servido si cambia (p. ej. tras revalidar).
  useEffect(() => {
    setEmpresaInput(contenido.empresa)
  }, [contenido.empresa])

  const puedeRoot = esRoot(nivel)

  // La pestaña activa vive en la dirección (?seccion=…); el helper impide llegar
  // a la de administración por URL sin ser Root y cae al valor por defecto si el
  // parámetro es desconocido.
  const pestanaActiva = resolverPestana(searchParams.get('seccion'), puedeRoot)
  function cambiarPestana(id: PestanaId) {
    const proximo = new URLSearchParams(searchParams)
    proximo.set('seccion', id)
    setSearchParams(proximo, { replace: true }) // no ensucia el historial
  }

  async function guardarEmpresaHandler(evento: FormEvent) {
    evento.preventDefault()
    const nombre = empresaInput.trim()
    const resp = await guardarEmpresa(nombre)
    if (resp.ok) {
      avisoExito(t('ajustesEmpresa.guardado', { empresa: nombre }))
      revalidator.revalidate() // refresca el título y la marca con el nuevo valor
    } else if (resp.status === 401) {
      navigate(rutas.login(idioma))
    } else {
      avisoError(t('ajustesEmpresa.error', { empresa: nombre }))
    }
  }

  async function guardarConfigIAHandler(evento: FormEvent) {
    evento.preventDefault()
    const clave = claveInput.trim()
    const resp = await guardarConfigIA({
      proveedorActivo: proveedorInput,
      // Clave vacía = «no cambiar»: solo viaja si se escribió una nueva.
      ...(clave ? { clave } : {}),
    })
    if (resp.ok) {
      setConfigIA((await resp.json()) as ConfigIAAdmin)
      setClaveInput('') // la clave nunca se conserva en el cliente
      avisoExito(t('configIA.guardado'))
    } else if (resp.status === 401) {
      navigate(rutas.login(idioma))
    } else if (resp.status === 409) {
      avisoError(t('configIA.errorCifrado'))
    } else {
      avisoError(t('configIA.error'))
    }
  }

  async function recargarTodo() {
    await cargarPreguntas()
    revalidator.revalidate() // refresca el contenido (métricas, artículos) desde la API
  }

  function cerrarSesion() {
    borrarToken()
    navigate(rutas.login(idioma))
  }

  async function abrirEditar(id: string) {
    const resp = await obtenerArticulo(id)
    if (resp.ok) {
      setFormulario({ modo: 'editar', inicial: (await resp.json()) as ArticuloAdmin })
      setAviso(null)
    } else {
      avisoError(t('panelGestion.errorCargar'))
    }
  }

  async function eliminar(id: string, titulo: string) {
    if (!window.confirm(t('panelGestion.confirmarEliminar', { titulo }))) return
    const resp = await eliminarArticulo(id)
    if (resp.ok) {
      avisoExito(t('panelGestion.eliminado'))
      await recargarTodo()
    } else {
      avisoError(t('panelGestion.errorGuardar'))
    }
  }

  function alGuardado() {
    setFormulario(null)
    avisoExito(t('panelGestion.guardado'))
    void recargarTodo()
  }

  const filas = filtro === 'todas' ? preguntas : preguntas.filter(p => p.estado === filtro)

  const columnas = ['pregunta', 'veces', 'similitud', 'fecha', 'estado', 'accion'] as const
  const alineacion: Record<(typeof columnas)[number], string> = {
    pregunta: 'text-left', veces: 'text-right', similitud: 'text-right', fecha: 'text-left', estado: 'text-left', accion: 'text-left',
  }

  // ── Contenido de la pestaña «Preguntas sin resolver» ─────────────────────────
  const contenidoSinResolver = (
    <div className="space-y-8">
      <p className="text-slate-600 text-sm">{t('panel.subtitulo')}</p>

      <section aria-labelledby="metrics-h2">
        <h2 id="metrics-h2" className="sr-only">
          {t('panel.metricasAria')}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {contenido.metricas.map(metrica => {
            const { icono, fondo } = ICONO_METRICA[metrica.clave]
            const termino = t(`panel.metricas.${metrica.clave}`)
            return (
              <div key={metrica.clave} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
                <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${fondo}`}>{icono}</div>
                <div>
                  <dt className="text-xs font-semibold text-slate-600 uppercase tracking-wide leading-snug">{termino}</dt>
                  <dd className="text-3xl font-bold text-slate-900 mt-1 leading-none">
                    <span className="sr-only">{`${metrica.valor} — ${termino}`}</span>
                    <span aria-hidden="true">{metrica.valor}</span>
                  </dd>
                  <p className="text-xs text-slate-500 mt-1">{t(`panel.metricas.${metrica.clave}Sub`)}</p>
                </div>
              </div>
            )
          })}
        </dl>
      </section>

      <div className="flex items-center gap-3 flex-wrap">
        <span id="filtro-etiqueta" className="text-sm font-medium text-slate-700">
          {t('panel.filtrar')}
        </span>
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-labelledby="filtro-etiqueta">
          {FILTROS.map(valor => {
            const activo = filtro === valor
            return (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltro(valor)}
                aria-pressed={activo}
                className={`px-3 rounded-full text-xs font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 min-h-[44px] ${
                  activo
                    ? 'bg-indigo-700 text-white border-indigo-700'
                    : 'bg-white text-slate-700 border-slate-500 hover:border-indigo-600 hover:text-indigo-800'
                }`}
              >
                {valor === 'todas' ? t('panel.filtroTodas') : t(`kcs.${valor}`)}
              </button>
            )
          })}
        </div>
      </div>

      <section aria-labelledby="table-h2">
        <h2 id="table-h2" className="sr-only">
          {t('panel.tablaTitulo')}
        </h2>
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label={t('panel.tablaAria')}>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {columnas.map(columna => (
                    <th
                      key={columna}
                      scope="col"
                      className={`px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap ${alineacion[columna]}`}
                    >
                      {t(`panel.columnas.${columna}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filas.map(fila => {
                  const porcentaje = Math.round(fila.similitud * 100)
                  const fecha = fechaLegible(fila.fecha, i18n.language)
                  return (
                    <tr key={fila.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 text-slate-800 font-medium max-w-[280px]">
                        <span className="leading-snug">{fila.pregunta}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        <span className="font-semibold text-slate-900">{fila.veces}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        <span
                          className={`font-semibold ${
                            fila.similitud >= 0.8 ? 'text-emerald-800' : fila.similitud >= 0.6 ? 'text-amber-800' : 'text-slate-600'
                          }`}
                        >
                          <span className="sr-only">{t('panel.similitudAria', { porcentaje })}</span>
                          <span aria-hidden="true">{porcentaje} %</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap text-xs">
                        <time dateTime={fila.fecha}>{fecha}</time>
                      </td>
                      <td className="px-4 py-3.5">
                        <KcsChip estado={fila.estado} />
                      </td>
                      <td className="px-4 py-3.5">
                        {fila.estado !== 'cubierta' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFormulario({ modo: 'crear', preguntaId: fila.id })
                              setAviso(null)
                            }}
                            aria-label={t('panel.crearArticuloAria', { pregunta: fila.pregunta })}
                            className="inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold border border-indigo-200 text-indigo-800 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 transition-colors min-h-[44px] whitespace-nowrap"
                          >
                            <Ic.Plus size={13} />
                            {t('panel.crearArticulo')}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600 italic">{t('panel.articuloExistente')}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-slate-200 text-xs text-slate-600 bg-slate-50/50">
            {t('panel.mostrando', { visibles: filas.length, total: preguntas.length })}
          </div>
        </div>
      </section>
    </div>
  )

  // ── Contenido de la pestaña «Gestión de artículos» ───────────────────────────
  const contenidoGestion = (
    <section aria-labelledby="gestion-h2" className="space-y-4">
      <h2 id="gestion-h2" className="sr-only">
        {t('panelGestion.titulo')}
      </h2>
      <div className="flex items-center justify-end gap-4 flex-wrap">
        <button
          type="button"
          onClick={() => {
            setFormulario({ modo: 'crear' })
            setAviso(null)
          }}
          className="inline-flex items-center gap-2 px-4 rounded-lg text-white text-sm font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4338ca] min-h-[44px]"
          style={{ background: 'var(--acento)' }}
        >
          <Ic.Plus size={15} />
          {t('panelGestion.nuevo')}
        </button>
      </div>

      <ul className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-200 list-none p-0 m-0">
        {contenido.articulos.map(articulo => (
          <li key={articulo.id} className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
            <span className="text-sm font-medium text-slate-800">{articulo.titulo}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => abrirEditar(articulo.id)}
                aria-label={t('panelGestion.editarAria', { titulo: articulo.titulo })}
                className="inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold border border-slate-500 text-slate-700 bg-white hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 min-h-[44px]"
              >
                <Ic.Edit size={14} />
                {t('panelGestion.editar')}
              </button>
              <button
                type="button"
                onClick={() => eliminar(articulo.id, articulo.titulo)}
                aria-label={t('panelGestion.eliminarAria', { titulo: articulo.titulo })}
                className="inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold border border-red-200 text-red-800 bg-red-50 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 min-h-[44px]"
              >
                <Ic.Trash size={14} />
                {t('panelGestion.eliminar')}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {formulario && (
        <Modal
          labelledBy="form-articulo-h"
          onCerrar={() => setFormulario(null)}
          cerrarAlClicarFondo={false}
        >
          <ArticuloForm
            categorias={contenido.categorias}
            modo={formulario.modo}
            inicial={formulario.inicial}
            preguntaId={formulario.preguntaId}
            onCerrar={() => setFormulario(null)}
            onGuardado={alGuardado}
          />
        </Modal>
      )}
    </section>
  )

  // ── Contenido de la pestaña «Administración» (solo Root) ─────────────────────
  const contenidoAdmin = (
    <section aria-labelledby="root-h2" className="space-y-4">
      <h2 id="root-h2" className="sr-only">
        {t('panel.seccionRoot')}
      </h2>

      <form
        onSubmit={guardarEmpresaHandler}
        className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3"
        aria-labelledby="empresa-h3"
      >
        <h3 id="empresa-h3" className="text-sm font-semibold text-slate-900">
          {t('ajustesEmpresa.titulo')}
        </h3>
        <div className="flex items-end gap-2 flex-wrap">
          <input
            id="campo-empresa"
            type="text"
            required
            value={empresaInput}
            onChange={e => setEmpresaInput(e.target.value)}
            aria-labelledby="empresa-h3"
            aria-describedby="empresa-ayuda"
            className="flex-1 min-w-[16rem] px-3 py-2.5 rounded-lg border border-slate-400 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 min-h-[44px]"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 rounded-lg text-white text-sm font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4338ca] min-h-[44px]"
            style={{ background: 'var(--acento)' }}
          >
            <Ic.Save size={15} />
            {t('ajustesEmpresa.guardar')}
          </button>
        </div>
        <p id="empresa-ayuda" className="text-xs text-slate-500">
          {t('ajustesEmpresa.ayuda')}
        </p>
      </form>

      <form
        onSubmit={guardarConfigIAHandler}
        className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3"
        aria-labelledby="config-ia-h3"
      >
        <h3 id="config-ia-h3" className="text-sm font-semibold text-slate-900">
          {t('configIA.titulo')}
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="config-ia-proveedor" className="block text-sm font-medium text-slate-700 mb-1">
              {t('configIA.proveedor')}
            </label>
            <select
              id="config-ia-proveedor"
              value={proveedorInput}
              onChange={e => setProveedorInput(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-400 text-slate-900 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 min-h-[44px]"
            >
              <option value="anthropic">{t('configIA.proveedores.anthropic')}</option>
              <option value="google">{t('configIA.proveedores.google')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="config-ia-clave" className="block text-sm font-medium text-slate-700 mb-1">
              {t('configIA.clave')}
            </label>
            <input
              id="config-ia-clave"
              type="password"
              value={claveInput}
              onChange={e => setClaveInput(e.target.value)}
              autoComplete="off"
              placeholder={t('configIA.clavePlaceholder')}
              aria-describedby="config-ia-estado"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-400 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 min-h-[44px]"
            />
          </div>
        </div>
        <p id="config-ia-estado" className="text-xs text-slate-600">
          {configIA
            ? configIA.proveedores.map(pr => (
                <span key={pr.id} className="inline-flex items-center gap-1 mr-3">
                  {pr.configurada ? (
                    <Ic.CheckCircle size={13} className="text-emerald-700" />
                  ) : (
                    <Ic.AlertCircle size={13} className="text-slate-500" />
                  )}
                  {t(`configIA.proveedores.${pr.id}`)}:{' '}
                  {pr.configurada ? t('configIA.claveConfigurada') : t('configIA.claveSinConfigurar')}
                </span>
              ))
            : t('configIA.cargando')}
        </p>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-4 rounded-lg text-white text-sm font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4338ca] min-h-[44px]"
          style={{ background: 'var(--acento)' }}
        >
          <Ic.Save size={15} />
          {t('configIA.guardar')}
        </button>
        <p className="text-xs text-slate-500">{t('configIA.ayuda')}</p>
      </form>

      <Link
        to={rutas.usuarios(idioma)}
        className="inline-flex items-center gap-2 px-4 rounded-lg border border-slate-500 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 min-h-[44px]"
      >
        <Ic.User size={15} />
        {t('gestionUsuarios.enlace')}
      </Link>
    </section>
  )

  // La pestaña «Administración» solo se ofrece a Root; los demás niveles ven dos.
  const pestanas: Pestana<PestanaId>[] = [
    { id: 'sinResolver', etiqueta: t('panel.titulo'), contenido: contenidoSinResolver },
    { id: 'gestion', etiqueta: t('panelGestion.titulo'), contenido: contenidoGestion },
  ]
  if (puedeRoot) {
    pestanas.push({ id: 'admin', etiqueta: t('panel.seccionRoot'), contenido: contenidoAdmin })
  }

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 uppercase tracking-widest mb-1">
              <Ic.BarChart size={14} />
              {t('panel.seccion')}
            </div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'DM Serif Display', serif" }}>
              {t('panel.tituloGeneral')}
            </h1>
          </div>
          <button
            type="button"
            onClick={cerrarSesion}
            className="inline-flex items-center gap-2 px-3 rounded-lg border border-slate-500 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-1 min-h-[44px] self-start"
          >
            <Ic.LogOut size={15} />
            {t('panel.cerrarSesion')}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Región de aviso compartida: vive fuera de las pestañas para anunciar
            el resultado de cualquier sección sea cual sea la pestaña activa. */}
        <div
          role={aviso?.tono === 'error' ? 'alert' : 'status'}
          aria-live={aviso?.tono === 'error' ? 'assertive' : 'polite'}
          className="min-h-[1.5rem] mb-6"
        >
          {aviso && (
            <p
              className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${
                aviso.tono === 'error'
                  ? 'text-red-800 bg-red-50 border-red-200'
                  : 'text-emerald-800 bg-emerald-50 border-emerald-200'
              }`}
            >
              {aviso.tono === 'error' ? (
                <Ic.AlertCircle size={15} className="text-red-700 shrink-0" />
              ) : (
                <Ic.CheckCircle size={15} className="text-emerald-700 shrink-0" />
              )}
              {aviso.texto}
            </p>
          )}
        </div>

        <Tabs
          pestanas={pestanas}
          activa={pestanaActiva}
          onCambio={cambiarPestana}
          etiquetaLista={t('panel.tabsAria')}
        />
      </div>
    </main>
  )
}

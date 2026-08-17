'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Idioma } from '@/types'
import {
  crearPortal,
  listarPortales,
  reactivarPortal,
  suspenderPortal,
  type PortalAdmin,
} from '@/data/admin'
import { rutas } from '@/i18n/rutas'
import { Ic } from '@/components/iconos'

const FORM_VACIO = { slug: '', nombreEmpresa: '', adminEmail: '', adminPassword: '' }

/**
 * Gestión de portales (solo SuperAdmin). La ruta ya está protegida por el Server Component
 * (nivel SuperAdmin); aun así, cada operación la vuelve a autorizar el backend. Lista los
 * portales, da de alta uno nuevo con su Administrador y los suspende/reactiva (reversible,
 * sin borrar datos). El portal de plataforma no aparece: no es gestionable.
 */
export function GestionPortales({ idioma }: { idioma: Idioma }) {
  const { t } = useTranslation()
  const router = useRouter()

  const [portales, setPortales] = useState<PortalAdmin[]>([])
  const [form, setForm] = useState<typeof FORM_VACIO | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    const resp = await listarPortales()
    if (resp.ok) {
      setPortales((await resp.json()) as PortalAdmin[])
      setError(null)
    } else if (resp.status === 401) {
      router.replace(rutas.login(idioma))
    } else {
      setError(t('gestionPortales.errorCargar'))
    }
  }

  useEffect(() => {
    void cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idioma])

  async function crear(evento: FormEvent) {
    evento.preventDefault()
    if (!form) return
    setEnviando(true)
    setError(null)
    try {
      const resp = await crearPortal({
        slug: form.slug.trim(),
        nombreEmpresa: form.nombreEmpresa.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
      })
      if (resp.ok) {
        setForm(null)
        setAviso(t('gestionPortales.creado', { empresa: form.nombreEmpresa.trim() }))
        await cargar()
      } else if (resp.status === 401) {
        router.replace(rutas.login(idioma))
      } else if (resp.status === 409) {
        setError(t('gestionPortales.errorConflicto'))
      } else if (resp.status === 422) {
        setError(t('gestionPortales.errorValidacion'))
      } else {
        setError(t('gestionPortales.errorGuardar'))
      }
    } catch {
      setError(t('gestionPortales.errorRed'))
    } finally {
      setEnviando(false)
    }
  }

  async function cambiarEstado(portal: PortalAdmin) {
    setError(null)
    const suspendido = portal.estado === 'suspendido'
    if (!suspendido && !window.confirm(t('gestionPortales.confirmarSuspender', { empresa: portal.nombreEmpresa }))) {
      return
    }
    const resp = suspendido ? await reactivarPortal(portal.id) : await suspenderPortal(portal.id)
    if (resp.ok) {
      setAviso(t(suspendido ? 'gestionPortales.reactivado' : 'gestionPortales.suspendido'))
      await cargar()
    } else if (resp.status === 401) {
      router.replace(rutas.login(idioma))
    } else {
      setError(t('gestionPortales.errorGuardar'))
    }
  }

  const columnas = ['portal', 'host', 'estado', 'accion'] as const

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Link
            href={rutas.panel(idioma)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--acento)] hover:text-[var(--acento-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acento-foco)] focus-visible:ring-offset-1 rounded min-h-[44px]"
          >
            <Ic.ArrowLeft size={15} />
            {t('gestionPortales.volver')}
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--acento)] uppercase tracking-widest mt-2 mb-1">
            <Ic.Shield size={14} />
            {t('gestionPortales.seccion')}
          </div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'var(--font-serif), serif' }}>
            {t('gestionPortales.titulo')}
          </h1>
          <p className="text-slate-600 text-sm mt-1">{t('gestionPortales.subtitulo')}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div role="status" aria-live="polite" className="min-h-[1.5rem]">
          {aviso && (
            <p className="inline-flex items-center gap-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
              <Ic.CheckCircle size={15} className="text-emerald-700 shrink-0" />
              {aviso}
            </p>
          )}
        </div>
        <div role="alert" aria-live="assertive" className="min-h-[1.25rem]">
          {error && (
            <p className="inline-flex items-center gap-2 text-sm text-red-800 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              <Ic.AlertCircle size={15} className="text-red-700 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-xl font-semibold text-slate-900">{t('gestionPortales.lista')}</h2>
          {!form && (
            <button
              type="button"
              onClick={() => {
                setForm(FORM_VACIO)
                setAviso(null)
              }}
              className="inline-flex items-center gap-2 px-4 rounded-lg text-white text-sm font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--acento-foco)] min-h-[44px]"
              style={{ background: 'var(--acento)' }}
            >
              <Ic.Plus size={15} />
              {t('gestionPortales.nuevo')}
            </button>
          )}
        </div>

        {form ? (
          <form
            onSubmit={crear}
            className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
            aria-labelledby="portal-form-h"
          >
            <h3 id="portal-form-h" className="text-sm font-semibold text-slate-900">
              {t('gestionPortales.nuevo')}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="portal-slug" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('gestionPortales.form.slug')}
                </label>
                <input
                  id="portal-slug"
                  type="text"
                  required
                  value={form.slug}
                  onChange={e => setForm({ ...form, slug: e.target.value })}
                  aria-describedby="portal-slug-ayuda"
                  autoComplete="off"
                  pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-400 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acento-foco)] focus-visible:ring-offset-1 min-h-[44px]"
                />
                <p id="portal-slug-ayuda" className="mt-1 text-xs text-slate-500">
                  {t('gestionPortales.form.slugAyuda')}
                </p>
              </div>
              <div>
                <label htmlFor="portal-empresa" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('gestionPortales.form.nombreEmpresa')}
                </label>
                <input
                  id="portal-empresa"
                  type="text"
                  required
                  value={form.nombreEmpresa}
                  onChange={e => setForm({ ...form, nombreEmpresa: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-400 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acento-foco)] focus-visible:ring-offset-1 min-h-[44px]"
                />
              </div>
              <div>
                <label htmlFor="portal-admin-email" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('gestionPortales.form.adminEmail')}
                </label>
                <input
                  id="portal-admin-email"
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={e => setForm({ ...form, adminEmail: e.target.value })}
                  autoComplete="off"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-400 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acento-foco)] focus-visible:ring-offset-1 min-h-[44px]"
                />
              </div>
              <div>
                <label htmlFor="portal-admin-pass" className="block text-sm font-medium text-slate-700 mb-1">
                  {t('gestionPortales.form.adminPassword')}
                </label>
                <input
                  id="portal-admin-pass"
                  type="password"
                  required
                  minLength={12}
                  value={form.adminPassword}
                  onChange={e => setForm({ ...form, adminPassword: e.target.value })}
                  autoComplete="new-password"
                  aria-describedby="portal-admin-pass-ayuda"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-400 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acento-foco)] focus-visible:ring-offset-1 min-h-[44px]"
                />
                <p id="portal-admin-pass-ayuda" className="mt-1 text-xs text-slate-500">
                  {t('gestionPortales.form.adminPasswordAyuda')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setForm(null)
                  setError(null)
                }}
                className="inline-flex items-center gap-2 px-4 rounded-lg border border-slate-400 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--acento-foco)] min-h-[44px]"
              >
                <Ic.X size={15} />
                {t('gestionPortales.cancelar')}
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="inline-flex items-center gap-2 px-4 rounded-lg text-white text-sm font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--acento-foco)] min-h-[44px] disabled:opacity-60"
                style={{ background: 'var(--acento)' }}
              >
                <Ic.Save size={15} />
                {enviando ? t('gestionPortales.creando') : t('gestionPortales.crear')}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label={t('gestionPortales.tablaAria')}>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {columnas.map(columna => (
                      <th
                        key={columna}
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                      >
                        {t(`gestionPortales.columnas.${columna}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {portales.map(portal => {
                    const suspendido = portal.estado === 'suspendido'
                    return (
                      <tr key={portal.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5 text-slate-800 font-medium">
                          {portal.nombreEmpresa}
                          <span className="text-slate-400 font-normal"> · {portal.slug}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">{portal.host ?? '—'}</td>
                        <td className="px-4 py-3.5">
                          {suspendido ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-amber-300 text-amber-800 bg-amber-50">
                              <Ic.AlertCircle size={12} className="text-amber-700" />
                              {t('gestionPortales.estadoSuspendido')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-emerald-200 text-emerald-800 bg-emerald-50">
                              <Ic.CheckCircle size={12} className="text-emerald-700" />
                              {t('gestionPortales.estadoActivo')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => cambiarEstado(portal)}
                            aria-label={t(
                              suspendido ? 'gestionPortales.reactivarAria' : 'gestionPortales.suspenderAria',
                              { empresa: portal.nombreEmpresa },
                            )}
                            className={`inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acento-foco)] focus-visible:ring-offset-1 min-h-[44px] ${
                              suspendido
                                ? 'border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                                : 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100'
                            }`}
                          >
                            {suspendido ? <Ic.CheckCircle size={14} /> : <Ic.X size={14} />}
                            {t(suspendido ? 'gestionPortales.reactivar' : 'gestionPortales.suspender')}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {portales.length === 0 && (
              <p className="px-4 py-6 text-sm text-slate-600">{t('gestionPortales.vacio')}</p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

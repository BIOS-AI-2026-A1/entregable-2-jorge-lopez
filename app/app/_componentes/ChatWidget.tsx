'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Cita, ContenidoIdioma, Fragmento, Idioma, MensajeChat } from '@/types'
import { articuloPorId } from '@/data'
import { traducir } from '@/i18n/traducir'
import { rutas } from '@/i18n/rutas'
import { Ic } from '@/components/iconos'

const SELECTOR_FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function Fragmentos({
  fragmentos,
  idioma,
  contenido,
  citas,
}: {
  fragmentos: Fragmento[]
  idioma: Idioma
  contenido: ContenidoIdioma
  citas: Cita[]
}) {
  const t = traducir(idioma)

  return (
    <>
      {fragmentos.map((fragmento, i) => {
        if (fragmento.tipo === 'cita') {
          const cita = citas.find(c => c.n === fragmento.n)
          const articulo = cita ? articuloPorId(contenido, cita.articuloId) : undefined
          if (!articulo) return null
          return (
            <sup key={i}>
              <Link
                href={rutas.articulo(idioma, articulo.slug)}
                aria-label={t('chat.fuenteAria', { n: fragmento.n })}
                className="text-[var(--acento)] hover:text-[var(--acento-hover)] font-bold ml-0.5 text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--acento-foco)] rounded"
              >
                [{fragmento.n}]
              </Link>
            </sup>
          )
        }
        if (fragmento.enfasis === 'fuerte') return <strong key={i}>{fragmento.texto}</strong>
        if (fragmento.enfasis === 'cursiva') return <em key={i}>{fragmento.texto}</em>
        return <span key={i}>{fragmento.texto}</span>
      })}
    </>
  )
}

function BloqueFuentes({ citas, idioma, contenido }: { citas: Cita[]; idioma: Idioma; contenido: ContenidoIdioma }) {
  const t = traducir(idioma)

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 space-y-1.5">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('chat.fuentes')}</p>
      {citas.map(cita => {
        const articulo = articuloPorId(contenido, cita.articuloId)
        if (!articulo) return null
        return (
          <Link
            key={cita.n}
            href={rutas.articulo(idioma, articulo.slug)}
            className="flex items-start gap-1.5 text-[12px] text-[var(--acento)] hover:text-[var(--acento-hover)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--acento-foco)] rounded leading-snug"
          >
            <Ic.ExternalLink size={11} className="shrink-0 mt-0.5" />
            <span>
              <strong>[{cita.n}]</strong> {cita.titulo}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

function Mensaje({ mensaje, idioma, contenido }: { mensaje: MensajeChat; idioma: Idioma; contenido: ContenidoIdioma }) {
  const t = traducir(idioma)

  if (mensaje.autor === 'usuario') {
    return (
      <div className="flex justify-end">
        <div className="rounded-2xl rounded-tr-none px-3.5 py-2.5 max-w-[85%] text-white text-sm" style={{ background: 'var(--acento)' }}>
          {mensaje.texto}
        </div>
      </div>
    )
  }

  const avatar = (
    <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--acento-claro)] flex items-center justify-center mt-0.5">
      <Ic.Sparkles size={13} className="text-[var(--acento)]" />
    </div>
  )

  if (mensaje.clase === 'saludo') {
    return (
      <div className="flex items-start gap-2.5">
        {avatar}
        <div className="bg-slate-50 rounded-2xl rounded-tl-none px-3.5 py-2.5 max-w-[85%]">
          <p className="text-slate-700 text-sm leading-relaxed">{mensaje.texto}</p>
        </div>
      </div>
    )
  }

  if (mensaje.clase === 'citado') {
    return (
      <div className="flex items-start gap-2.5">
        {avatar}
        <div className="space-y-2 max-w-[85%]">
          <div className="bg-slate-50 rounded-2xl rounded-tl-none px-3.5 py-2.5">
            <p className="text-slate-700 text-sm leading-relaxed">
              <Fragmentos fragmentos={mensaje.fragmentos} citas={mensaje.citas} idioma={idioma} contenido={contenido} />
            </p>
          </div>
          <BloqueFuentes citas={mensaje.citas} idioma={idioma} contenido={contenido} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5">
      {avatar}
      <div className="space-y-2 max-w-[85%]">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl rounded-tl-none px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Ic.Warning size={13} className="text-amber-700 shrink-0" />
            <p className="text-amber-800 text-[11px] font-semibold">{mensaje.aviso}</p>
          </div>
          <p className="text-slate-700 text-sm leading-relaxed">{mensaje.texto}</p>
        </div>
        <a
          href="mailto:soporte@empresa.example"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-500 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acento-foco)] focus-visible:ring-offset-1 transition-colors min-h-[44px]"
        >
          <Ic.Mail size={15} />
          {t('escalamiento.boton')}
        </a>
      </div>
    </div>
  )
}

export function ChatWidget({
  idioma,
  contenido,
  onClose,
}: {
  idioma: Idioma
  contenido: ContenidoIdioma
  onClose: () => void
}) {
  const t = traducir(idioma)
  const dialogoRef = useRef<HTMLDivElement>(null)
  const cerrarRef = useRef<HTMLButtonElement>(null)
  const conversacion = contenido.conversacion

  useEffect(() => {
    cerrarRef.current?.focus()

    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      // Retención de foco: el tabulador cicla dentro del diálogo.
      const dialogo = dialogoRef.current
      if (!dialogo) return
      const focusables = Array.from(dialogo.querySelectorAll<HTMLElement>(SELECTOR_FOCUSABLE))
      if (focusables.length === 0) return

      const primero = focusables[0]
      const ultimo = focusables[focusables.length - 1]
      const activo = document.activeElement

      if (e.shiftKey && (activo === primero || !dialogo.contains(activo))) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />

      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-titulo"
        className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        style={{ maxHeight: 'min(600px, calc(100vh - 3rem))' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100" style={{ background: 'var(--acento)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Ic.Sparkles size={15} className="text-white" />
            </div>
            <div>
              <h2 id="chat-titulo" className="text-white font-semibold text-sm leading-none">
                {t('chat.titulo')}
              </h2>
              <p className="text-indigo-100 text-[11px] mt-0.5">{t('chat.subtitulo')}</p>
            </div>
          </div>
          <button
            ref={cerrarRef}
            type="button"
            onClick={onClose}
            aria-label={t('chat.cerrar')}
            className="w-11 h-11 rounded-lg flex items-center justify-center text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
          >
            <Ic.X size={18} />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0"
          aria-live="polite"
          aria-atomic="false"
          aria-label={t('chat.conversacionAria')}
        >
          {conversacion.map((mensaje, i) => (
            <Mensaje key={i} mensaje={mensaje} idioma={idioma} contenido={contenido} />
          ))}
        </div>

        <div className="border-t border-slate-100 px-4 py-3 bg-white">
          <label htmlFor="chat-entrada" className="block text-[11px] font-medium text-slate-600 mb-1.5">
            {t('chat.entradaEtiqueta')}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="chat-entrada"
              type="text"
              placeholder={t('chat.entradaMarcador')}
              aria-describedby="chat-nota"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-500 bg-white text-slate-700 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acento-foco)] focus-visible:border-transparent"
            />
            <button
              type="button"
              aria-label={t('chat.enviar')}
              className="w-11 h-11 shrink-0 rounded-lg flex items-center justify-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acento-foco)] focus-visible:ring-offset-1 transition-opacity hover:opacity-90"
              style={{ background: 'var(--acento)' }}
            >
              <Ic.Send size={16} />
            </button>
          </div>
          <p id="chat-nota" className="text-[10px] text-slate-500 mt-1.5 leading-snug">
            {t('chat.nota')} {t('chat.prototipoAviso')}
          </p>
        </div>
      </div>
    </>
  )
}

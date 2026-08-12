'use client'

import { useRef, useState } from 'react'
import type { ContenidoIdioma, Idioma } from '@/types'
import { traducir } from '@/i18n/traducir'
import { Ic } from '@/components/iconos'
import { ChatWidget } from './ChatWidget'

/**
 * Botón flotante + diálogo del asistente. Mantiene el estado de apertura y
 * devuelve el foco al botón al cerrar (antes vivía en el `Layout` de la SPA).
 */
export function ChatLanzador({ idioma, contenido }: { idioma: Idioma; contenido: ContenidoIdioma }) {
  const t = traducir(idioma)
  const [abierto, setAbierto] = useState(false)
  const botonRef = useRef<HTMLButtonElement>(null)

  const cerrar = () => {
    setAbierto(false)
    requestAnimationFrame(() => botonRef.current?.focus())
  }

  return (
    <>
      {abierto && <ChatWidget idioma={idioma} contenido={contenido} onClose={cerrar} />}

      {!abierto && (
        <button
          ref={botonRef}
          type="button"
          onClick={() => setAbierto(true)}
          aria-label={t('chat.abrir')}
          aria-haspopup="dialog"
          className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-2xl text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--acento)] transition-all active:scale-95"
          style={{ background: 'var(--acento)' }}
        >
          <Ic.MessageCircle size={24} />
        </button>
      )}
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLoaderData, useLocation, useParams } from 'react-router-dom'
import { esIdioma } from '@/types'
import { detectarIdioma } from '@/i18n/config'
import { AppHeader } from '@/components/AppHeader'
import { ChatWidget } from '@/components/ChatWidget'
import { SkipLink } from '@/components/SkipLink'
import { Ic } from '@/components/iconos'
import { ContenidoProvider } from '@/data/contexto'
import type { ContenidoPorIdioma } from '@/data'

/** Redirección desde la raíz al idioma detectado. */
export function RedirigirAIdioma() {
  return <Navigate to={`/${detectarIdioma()}`} replace />
}

/**
 * Marco de la aplicación. El idioma sale del primer segmento de la dirección:
 * la dirección manda sobre la preferencia del navegador.
 */
export function Layout() {
  const { idioma } = useParams()
  const { i18n } = useTranslation()
  const location = useLocation()
  const contenidos = useLoaderData() as ContenidoPorIdioma
  const [chatAbierto, setChatAbierto] = useState(false)
  const botonChatRef = useRef<HTMLButtonElement>(null)
  const idiomaValido = esIdioma(idioma)

  // El idioma activo y el atributo lang del documento siguen a la dirección.
  useEffect(() => {
    if (!idiomaValido) return
    void i18n.changeLanguage(idioma)
    document.documentElement.lang = idioma
  }, [i18n, idioma, idiomaValido])

  // Al cambiar de pantalla el foco vuelve al contenido principal.
  useEffect(() => {
    document.getElementById('main-content')?.focus()
    setChatAbierto(false)
  }, [location.pathname])

  if (!idiomaValido) return <Navigate to={`/${detectarIdioma()}`} replace />

  const cerrarChat = () => {
    setChatAbierto(false)
    // El foco vuelve al control que abrió el diálogo.
    requestAnimationFrame(() => botonChatRef.current?.focus())
  }

  return (
    <ContenidoProvider valor={contenidos}>
      <div className="min-h-screen bg-slate-50">
        <SkipLink />
        <AppHeader idioma={idioma} />

        <Outlet />

        {chatAbierto && <ChatWidget idioma={idioma} onClose={cerrarChat} />}

        {!chatAbierto && (
          <ChatButton ref={botonChatRef} onClick={() => setChatAbierto(true)} />
        )}
      </div>
    </ContenidoProvider>
  )
}

function ChatButton({ ref, onClick }: { ref: React.Ref<HTMLButtonElement>; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={t('chat.abrir')}
      aria-haspopup="dialog"
      className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-2xl text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#4338ca] transition-all active:scale-95"
      style={{ background: 'var(--acento)' }}
    >
      <Ic.MessageCircle size={24} />
    </button>
  )
}

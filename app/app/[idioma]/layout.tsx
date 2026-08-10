import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
import { redirect } from 'next/navigation'
import { esIdioma, type ContenidoIdioma } from '@/types'
import { cargarContenidoServidor } from '@/data/servidor'
import '../globals.css'
import { SkipLink } from '../_componentes/SkipLink'
import { AppHeader } from '../_componentes/AppHeader'
import { ChatLanzador } from '../_componentes/ChatLanzador'

// Fuentes de marca autoalojadas por Next (`next/font`): se descargan en la
// compilación y se sirven desde el mismo origen, así la CSP estricta
// (`font-src 'self'`) las permite sin abrir a Google Fonts. Cada una expone una
// variable CSS que consume el CSS base (`--font-sans`) y los títulos (`--font-serif`).
const fuenteSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const fuenteSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Centro de Ayuda',
}

/** Prerenderiza los idiomas soportados en la compilación. */
export function generateStaticParams() {
  return [{ idioma: 'es' }, { idioma: 'pt' }]
}

/**
 * Layout raíz por idioma. Es el layout más externo (no hay `app/layout.tsx`):
 * fija `<html lang>` con el idioma del primer segmento, resuelto en servidor.
 * Un idioma no soportado se redirige a `es` antes de emitir HTML.
 */
export default async function LayoutIdioma({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ idioma: string }>
}) {
  const { idioma } = await params
  if (!esIdioma(idioma)) redirect('/es')

  // Solo el idioma activo. La cabecera necesita el nombre de empresa y el chat
  // la conversación de ejemplo; ambos salen de este único contenido. Si la
  // fuente falla, la cabecera cae en su texto de reserva y deja que el error
  // real lo muestre `error.tsx` desde la página (estado accesible, task 3.5).
  let contenido: ContenidoIdioma | null = null
  try {
    contenido = await cargarContenidoServidor(idioma)
  } catch {
    contenido = null
  }

  return (
    <html lang={idioma} className={`${fuenteSans.variable} ${fuenteSerif.variable}`}>
      <body>
        {/* id="root": el `Modal` del panel marca este contenedor como inert
            mientras está abierto (el diálogo vive fuera, en un portal a body). */}
        <div id="root" className="min-h-screen bg-slate-50">
          <SkipLink idioma={idioma} />
          <AppHeader idioma={idioma} empresa={contenido?.empresa} />
          {children}
          {contenido && <ChatLanzador idioma={idioma} contenido={contenido} />}
        </div>
      </body>
    </html>
  )
}

import { redirect, type LoaderFunctionArgs } from 'react-router-dom'
import { esIdioma } from '@/types'
import { Layout, RedirigirAIdioma } from './App'
import { PantallaConIdioma } from './pages/PantallaConIdioma'
import { cargarContenidoLoader } from './data'
import { CargandoContenido, ErrorContenido } from './components/EstadoContenido'
import { haySesion } from './auth/sesion'
import { detectarIdioma } from './i18n/config'

/** Guardia del panel: sin sesión válida se redirige al inicio de sesión. */
function guardiaPanel({ params }: LoaderFunctionArgs) {
  if (!haySesion()) {
    const idioma = esIdioma(params.idioma) ? params.idioma : detectarIdioma()
    throw redirect(`/${idioma}/login`)
  }
  return null
}

/**
 * El idioma es el primer segmento de toda dirección. El loader carga el
 * contenido de ambos idiomas antes de renderizar, de modo que las pantallas lo
 * leen de forma síncrona y conservan su estructura y su accesibilidad.
 */
export const rutasApp = [
  { path: '/', element: <RedirigirAIdioma /> },
  {
    path: '/:idioma',
    element: <Layout />,
    loader: cargarContenidoLoader,
    HydrateFallback: CargandoContenido,
    errorElement: <ErrorContenido />,
    children: [
      { index: true, element: <PantallaConIdioma pantalla="inicio" /> },
      { path: 'articulo/:slug', element: <PantallaConIdioma pantalla="articulo" /> },
      { path: 'login', element: <PantallaConIdioma pantalla="login" /> },
      { path: 'panel', element: <PantallaConIdioma pantalla="panel" />, loader: guardiaPanel },
      { path: '*', element: <PantallaConIdioma pantalla="noEncontrado" /> },
    ],
  },
  { path: '*', element: <RedirigirAIdioma /> },
]

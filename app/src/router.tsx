import { redirect, type LoaderFunctionArgs } from 'react-router-dom'
import { esIdioma } from '@/types'
import { Layout, RedirigirAIdioma } from './App'
import { PantallaConIdioma } from './pages/PantallaConIdioma'
import { cargarContenidoLoader } from './data'
import { obtenerSesion, type SesionAdmin } from './data/admin'
import { CargandoContenido, ErrorContenido } from './components/EstadoContenido'
import { haySesion } from './auth/sesion'
import { NivelAcceso, tieneNivel } from './auth/nivel'
import { detectarIdioma } from './i18n/config'

function idiomaDe(params: LoaderFunctionArgs['params']): string {
  return esIdioma(params.idioma) ? params.idioma : detectarIdioma()
}

/** Guardia del panel: sin sesión válida (Nivel 2+) se redirige al inicio de sesión. */
function guardiaPanel({ params }: LoaderFunctionArgs) {
  if (!haySesion()) throw redirect(`/${idiomaDe(params)}/login`)
  return null
}

/**
 * Guardia de la gestión de usuarios: exige Nivel 3 (Root). Sin sesión va a login;
 * con sesión de nivel insuficiente vuelve al panel. El backend igual lo aplica:
 * esta guardia solo evita mostrar una pantalla que el servidor rechazaría.
 */
async function guardiaRoot({ params }: LoaderFunctionArgs) {
  const idioma = idiomaDe(params)
  if (!haySesion()) throw redirect(`/${idioma}/login`)
  const resp = await obtenerSesion()
  if (!resp.ok) throw redirect(`/${idioma}/login`)
  const sesion = (await resp.json()) as SesionAdmin
  if (!tieneNivel(sesion.nivel, NivelAcceso.ROOT)) throw redirect(`/${idioma}/panel`)
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
      { path: 'panel/usuarios', element: <PantallaConIdioma pantalla="usuarios" />, loader: guardiaRoot },
      { path: '*', element: <PantallaConIdioma pantalla="noEncontrado" /> },
    ],
  },
  { path: '*', element: <RedirigirAIdioma /> },
]

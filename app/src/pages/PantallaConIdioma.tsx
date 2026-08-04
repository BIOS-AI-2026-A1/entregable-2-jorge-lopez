import { useParams } from 'react-router-dom'
import { esIdioma } from '@/types'
import { Home } from './Home'
import { Article } from './Article'
import { Panel } from './Panel'
import { Usuarios } from './Usuarios'
import { Login } from './Login'
import { NoEncontrado } from './NoEncontrado'

type Pantalla = 'inicio' | 'articulo' | 'panel' | 'usuarios' | 'login' | 'noEncontrado'

/**
 * Resuelve el idioma del parámetro de ruta una sola vez y se lo entrega ya
 * validado a la pantalla, para que ninguna tenga que volver a comprobarlo.
 */
export function PantallaConIdioma({ pantalla }: { pantalla: Pantalla }) {
  const { idioma } = useParams()
  if (!esIdioma(idioma)) return null

  switch (pantalla) {
    case 'inicio':
      return <Home idioma={idioma} />
    case 'articulo':
      return <Article idioma={idioma} />
    case 'panel':
      return <Panel idioma={idioma} />
    case 'usuarios':
      return <Usuarios idioma={idioma} />
    case 'login':
      return <Login idioma={idioma} />
    default:
      return <NoEncontrado idioma={idioma} />
  }
}

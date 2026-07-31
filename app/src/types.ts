/**
 * Contrato de datos del centro de ayuda.
 *
 * Hoy lo satisfacen los módulos de `src/data/<idioma>/`. Cuando exista la API,
 * estos mismos tipos describen sus respuestas y los componentes no cambian.
 */

export const IDIOMAS = ['es', 'pt'] as const
export type Idioma = (typeof IDIOMAS)[number]

export function esIdioma(valor: string | undefined): valor is Idioma {
  return valor === 'es' || valor === 'pt'
}

/** Estados del ciclo KCS para una pregunta sin resolver. */
export type EstadoKcs = 'nueva' | 'revision' | 'cubierta'

/** Claves del conjunto de iconos. Los datos referencian el icono por nombre. */
export type NombreIcono =
  | 'usuario'
  | 'tarjeta'
  | 'paquete'
  | 'devolver'
  | 'escudo'
  | 'documento'

export type IdCategoria =
  | 'cuenta'
  | 'pagos'
  | 'envios'
  | 'devoluciones'
  | 'seguridad'
  | 'facturacion'

export interface Categoria {
  id: IdCategoria
  /** Segmento de dirección, propio de cada idioma. */
  slug: string
  nombre: string
  icono: NombreIcono
  /** Clases de color de la tarjeta; el color nunca es el único canal. */
  fondo: string
  texto: string
}

export interface PasoHowTo {
  titulo: string
  descripcion: string
}

export interface PreguntaFrecuente {
  pregunta: string
  respuesta: string
}

export interface BloqueHowTo {
  titulo: string
  pasos: PasoHowTo[]
}

export interface Articulo {
  /** Identificador estable entre idiomas: permite cambiar de idioma sin perder el artículo. */
  id: string
  /** Segmento de dirección, propio de cada idioma. */
  slug: string
  titulo: string
  categoria: IdCategoria
  /** Fecha ISO (AAAA-MM-DD), para el atributo `datetime` de `<time>`. */
  actualizado: string
  minutosLectura: number
  destacado: boolean
  parrafos: string[]
  howTo: BloqueHowTo
  nota?: string
  faq: PreguntaFrecuente[]
  /** Identificadores de artículos relacionados. */
  relacionados: string[]
}

export interface Cita {
  n: number
  titulo: string
  /**
   * Artículo citado. Se guarda el identificador, no la dirección: la dirección
   * depende del idioma activo y la construye el componente. Así la cita siempre
   * resuelve a un artículo que existe.
   */
  articuloId: string
}

/** Fragmento de una respuesta del asistente: texto o marca de cita. */
export type Fragmento =
  | { tipo: 'texto'; texto: string; enfasis?: 'fuerte' | 'cursiva' }
  | { tipo: 'cita'; n: number }

export type MensajeChat =
  | { autor: 'usuario'; texto: string }
  | { autor: 'asistente'; clase: 'saludo'; texto: string }
  | { autor: 'asistente'; clase: 'citado'; fragmentos: Fragmento[]; citas: Cita[] }
  | { autor: 'asistente'; clase: 'sin-resultado'; aviso: string; texto: string }

/**
 * Pregunta sin resolver del ciclo KCS.
 *
 * No forma parte de `ContenidoIdioma`: es texto escrito por las personas usuarias
 * y puede contener datos personales, así que solo se sirve por el endpoint
 * autenticado `/api/admin/preguntas-sin-resolver`. Este tipo sigue describiendo
 * los módulos de `src/data/{es,pt}` que alimentan el seed del backend.
 */
export interface PreguntaSinResolver {
  pregunta: string
  veces: number
  /** Similitud máxima con la base de conocimiento, entre 0 y 1. */
  similitud: number
  /** Fecha ISO (AAAA-MM-DD). */
  fecha: string
  estado: EstadoKcs
}

export interface Metrica {
  clave: 'sinResolver' | 'conCita' | 'creados'
  valor: string
}

/** Contenido público de un idioma. Es lo que sirve `GET /api/{idioma}/contenido`. */
export interface ContenidoIdioma {
  categorias: Categoria[]
  articulos: Articulo[]
  conversacion: MensajeChat[]
  metricas: Metrica[]
}

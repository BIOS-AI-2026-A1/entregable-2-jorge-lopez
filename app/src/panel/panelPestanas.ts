/**
 * Resolución de la pestaña activa del Panel interno a partir del parámetro de la
 * dirección (`?seccion=…`). Es lógica pura —sin red ni componentes— para poder
 * probarla y para concentrar aquí el gating por URL: la pestaña Root nunca se
 * alcanza pidiéndola directamente si la sesión no es Root.
 */

export type PestanaId = 'sinResolver' | 'gestion' | 'categorias' | 'admin'

/** Orden en que se muestran las pestañas; la primera es el valor por defecto. */
export const PESTANAS: readonly PestanaId[] = ['sinResolver', 'gestion', 'categorias', 'admin']

const POR_DEFECTO: PestanaId = 'sinResolver'

function esPestanaId(valor: string | null): valor is PestanaId {
  return (
    valor === 'sinResolver' ||
    valor === 'gestion' ||
    valor === 'categorias' ||
    valor === 'admin'
  )
}

/**
 * Devuelve un `PestanaId` válido:
 * - valor desconocido o ausente → `'sinResolver'`;
 * - `'admin'` sin permiso Root → `'sinResolver'` (no se expone por URL directa);
 * - en el resto, el id solicitado.
 */
export function resolverPestana(param: string | null, puedeRoot: boolean): PestanaId {
  if (!esPestanaId(param)) return POR_DEFECTO
  if (param === 'admin' && !puedeRoot) return POR_DEFECTO
  return param
}

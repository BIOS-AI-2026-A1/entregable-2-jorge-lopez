/**
 * Niveles de acceso jerárquicos (espejo de `NivelAcceso` en el backend).
 *
 * El valor entero ordena la herencia de permisos: autorizar es comparar
 * `nivel_actual >= nivel_requerido`. La interfaz usa esto para ocultar los
 * controles Root, pero la autoridad siempre es el backend.
 */

export const NivelAcceso = {
  ANONIMO: 1,
  ESTANDAR: 2,
  ROOT: 3,
} as const

export type NivelAcceso = (typeof NivelAcceso)[keyof typeof NivelAcceso]

/**
 * ¿La sesión de nivel `actual` alcanza el nivel `requerido`? Sin sesión
 * (`null`/`undefined`) es Anonymous y no alcanza ningún recurso de administración.
 * Función pura: se comprueba sin red ni componentes.
 */
export function tieneNivel(actual: number | null | undefined, requerido: NivelAcceso): boolean {
  return actual != null && actual >= requerido
}

export function esRoot(nivel: number | null | undefined): boolean {
  return tieneNivel(nivel, NivelAcceso.ROOT)
}

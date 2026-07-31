import type { Categoria } from '@/types'

export const categorias: Categoria[] = [
  { id: 'cuenta', slug: 'cuenta', nombre: 'Cuenta', icono: 'usuario', fondo: 'bg-indigo-50', texto: 'text-indigo-700' },
  { id: 'pagos', slug: 'pagos', nombre: 'Pagos', icono: 'tarjeta', fondo: 'bg-purple-50', texto: 'text-purple-700' },
  { id: 'envios', slug: 'envios', nombre: 'Envíos', icono: 'paquete', fondo: 'bg-emerald-50', texto: 'text-emerald-700' },
  { id: 'devoluciones', slug: 'devoluciones', nombre: 'Devoluciones', icono: 'devolver', fondo: 'bg-orange-50', texto: 'text-orange-700' },
  { id: 'seguridad', slug: 'seguridad', nombre: 'Seguridad', icono: 'escudo', fondo: 'bg-red-50', texto: 'text-red-700' },
  { id: 'facturacion', slug: 'facturacion', nombre: 'Facturación', icono: 'documento', fondo: 'bg-amber-50', texto: 'text-amber-700' },
]

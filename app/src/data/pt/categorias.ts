import type { Categoria } from '@/types'

export const categorias: Categoria[] = [
  { id: 'cuenta', slug: 'conta', nombre: 'Conta', icono: 'usuario', fondo: 'bg-indigo-50', texto: 'text-indigo-700' },
  { id: 'pagos', slug: 'pagamentos', nombre: 'Pagamentos', icono: 'tarjeta', fondo: 'bg-purple-50', texto: 'text-purple-700' },
  { id: 'envios', slug: 'envios', nombre: 'Envios', icono: 'paquete', fondo: 'bg-emerald-50', texto: 'text-emerald-700' },
  { id: 'devoluciones', slug: 'devolucoes', nombre: 'Devoluções', icono: 'devolver', fondo: 'bg-orange-50', texto: 'text-orange-700' },
  { id: 'seguridad', slug: 'seguranca', nombre: 'Segurança', icono: 'escudo', fondo: 'bg-red-50', texto: 'text-red-700' },
  { id: 'facturacion', slug: 'faturamento', nombre: 'Faturamento', icono: 'documento', fondo: 'bg-amber-50', texto: 'text-amber-700' },
]

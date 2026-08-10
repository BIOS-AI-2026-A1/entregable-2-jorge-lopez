import type { Idioma } from '@/types'
import { traducir } from '@/i18n/traducir'

/**
 * Marca del centro de ayuda. El nombre es el campo [Empresa]: se recibe por
 * `empresa` e interpola `marca.nombre`. Server Component.
 */
export function LogoMarca({ idioma, empresa }: { idioma: Idioma; empresa?: string }) {
  const t = traducir(idioma)
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold tracking-wide select-none"
        style={{ background: 'var(--acento)' }}
        aria-hidden="true"
      >
        {t('marca.iniciales')}
      </div>
      <div className="leading-none">
        <span className="font-bold text-[17px] text-slate-900">
          {t('marca.nombre', { empresa: empresa || t('marca.reserva') })}
        </span>
        <span className="text-slate-600 font-normal ml-2 text-[15px]">{t('marca.sufijo')}</span>
      </div>
    </div>
  )
}

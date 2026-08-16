import type { Idioma } from '@/types'
import { traducir } from '@/i18n/traducir'

/**
 * Marca del centro de ayuda. El nombre es el campo [Empresa]: se recibe por
 * `empresa` e interpola `marca.nombre`. Si hay logotipo subido (`logo`), se muestra
 * la imagen servida por `/api/marca/logo` (mismo origen, alt = nombre de marca); si
 * no, cae al recuadro de iniciales. El nombre textual sigue visible en ambos casos,
 * así que el logotipo nunca es el único medio para reconocer la marca. Server Component.
 */
export function LogoMarca({
  idioma,
  empresa,
  logo = false,
}: {
  idioma: Idioma
  empresa?: string
  logo?: boolean
}) {
  const t = traducir(idioma)
  const nombre = t('marca.nombre', { empresa: empresa || t('marca.reserva') })
  return (
    <div className="flex items-center gap-4">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- binario servido por la API, no un asset estático
        <img
          src="/api/marca/logo"
          alt={nombre}
          className="w-20 h-20 rounded-xl object-contain select-none"
        />
      ) : (
        <div
          className="w-20 h-20 rounded-xl flex items-center justify-center text-white text-lg font-bold tracking-wide select-none"
          style={{ background: 'var(--acento)' }}
          aria-hidden="true"
        >
          {t('marca.iniciales')}
        </div>
      )}
      <div className="leading-tight">
        <span className="font-bold text-[20px] text-slate-900">{nombre}</span>
        <span className="text-slate-600 font-normal ml-2 text-[16px]">{t('marca.sufijo')}</span>
      </div>
    </div>
  )
}

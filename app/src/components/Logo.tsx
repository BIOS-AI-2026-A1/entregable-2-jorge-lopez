import { useTranslation } from 'react-i18next'

export function Logo() {
  const { t } = useTranslation()
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
        <span className="font-bold text-[17px] text-slate-900">{t('marca.nombre')}</span>
        <span className="text-slate-600 font-normal ml-2 text-[15px]">{t('marca.sufijo')}</span>
      </div>
    </div>
  )
}

import { partido } from '../data/partidos'

const BASE = import.meta.env.BASE_URL

/** Logo do partido (ou selo com a sigla na cor dele, quando não há logo). */
export function SeloPartido({ sigla, className = 'h-7' }: { sigla: string; className?: string }) {
  const p = partido(sigla)
  if (p.logo)
    return (
      <span className={`inline-flex items-center rounded-md bg-white px-1.5 py-1 ring-1 ring-black/5 ${className}`}>
        <img src={`${BASE}partidos/${p.logo}.webp`} alt={sigla} title={p.nome} loading="lazy" className="h-full w-auto object-contain" />
      </span>
    )
  return (
    <span
      title={p.nome}
      className={`inline-flex items-center rounded-md px-2 font-titulo text-[13px] font-black uppercase leading-none [font-stretch:80%] ${className}`}
      style={{ background: p.cor, color: p.texto ?? '#fff' }}
    >
      {sigla}
    </span>
  )
}

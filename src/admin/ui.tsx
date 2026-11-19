/** Peças visuais do painel (no espírito do painel do Muda Nordeste, com a marca do O Motta Não). */
import type { ReactNode } from 'react'
import { fmt } from './api'

export const CORES = { s1: '#1F4FE0', s2: '#C61F1F', s3: '#E2A100', s4: '#00A28C', s5: '#E0761B', s6: '#6B4FB3', grade: '#E3E6EE', eixo: '#6B7489' }
export const PALETA = [CORES.s1, CORES.s2, CORES.s3, CORES.s4, CORES.s5, CORES.s6]

export function Cartao({ titulo, sub, children, className = '', acao }: { titulo?: string; sub?: string; children: ReactNode; className?: string; acao?: ReactNode }) {
  return (
    <section className={`rounded-[22px] border border-azul-tinta/[0.07] bg-white p-5 shadow-[0_10px_30px_-24px_rgba(4,11,38,0.5)] sm:p-6 ${className}`}>
      {(titulo || acao) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {titulo && <h3 className="font-titulo text-[1.35rem] font-black uppercase leading-none tracking-[-0.01em] [font-stretch:78%]">{titulo}</h3>}
            {sub && <p className="mt-1 text-[13px] text-azul-tinta/55">{sub}</p>}
          </div>
          {acao}
        </header>
      )}
      {children}
    </section>
  )
}

export function Kpi({ rotulo, valor, detalhe, destaque }: { rotulo: string; valor: number | string; detalhe?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-[22px] border p-5 ${destaque ? 'border-transparent bg-azul text-white shadow-azul' : 'border-azul-tinta/[0.07] bg-white'}`}>
      <p className={`text-[11.5px] font-extrabold uppercase tracking-[0.12em] ${destaque ? 'text-white/75' : 'text-azul-tinta/50'}`}>{rotulo}</p>
      <p className="num mt-2 text-[2.4rem] leading-none">{typeof valor === 'number' ? fmt.format(valor) : valor}</p>
      {detalhe && <p className={`mt-2 text-[12.5px] ${destaque ? 'text-white/75' : 'text-azul-tinta/50'}`}>{detalhe}</p>}
    </div>
  )
}

export function Vazio({ texto = 'Ainda sem dados neste período.' }: { texto?: string }) {
  return <p className="rounded-2xl bg-papel px-4 py-8 text-center text-[14px] text-azul-tinta/45">{texto}</p>
}

/** Barras horizontais: rótulo à esquerda, valor à direita. */
export function BarrasH({ itens, cor = CORES.s1, formatar }: { itens: { r: string | number | null; n: number }[]; cor?: string; formatar?: (r: string) => string }) {
  if (!itens.length) return <Vazio />
  const max = Math.max(...itens.map((i) => i.n), 1)
  return (
    <ul className="space-y-2.5">
      {itens.map((i, k) => (
        <li key={k}>
          <div className="mb-1 flex justify-between gap-3 text-[13px]">
            <span className="truncate font-semibold">{formatar ? formatar(String(i.r ?? '—')) : String(i.r ?? '—')}</span>
            <span className="font-bold tabular-nums text-azul-tinta/70">{fmt.format(i.n)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-azul-tinta/[0.06]">
            <div className="h-full rounded-full" style={{ width: `${(i.n / max) * 100}%`, background: cor }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function Funil({ etapas }: { etapas: { etapa: string; n: number }[] }) {
  const topo = etapas[0]?.n || 0
  if (!topo) return <Vazio />
  return (
    <ol className="space-y-3">
      {etapas.map((e, i) => {
        const ant = i ? etapas[i - 1].n : e.n
        const saem = ant ? Math.round(((ant - e.n) / ant) * 100) : 0
        return (
          <li key={e.etapa}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className="font-bold">{e.etapa}</span>
              <span className="tabular-nums">
                <b>{fmt.format(e.n)}</b> <span className="text-azul-tinta/45">· {Math.round((e.n / topo) * 100)}% do topo</span>
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-azul-tinta/[0.06]">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#1F4FE0,#3D7BFF)]" style={{ width: `${(e.n / topo) * 100}%` }} />
            </div>
            {i > 0 && saem > 0 && <p className="mt-1 text-[12px] font-semibold text-[#E0761B]">↓ {saem}% saem nesta etapa</p>}
          </li>
        )
      })}
    </ol>
  )
}

export function Botao({ children, variante = 'azul', className = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'azul' | 'linha' | 'perigo' | 'fantasma' }) {
  const v = {
    azul: 'bg-azul text-white hover:bg-azul-vivo',
    linha: 'border border-azul-tinta/15 bg-white text-azul-tinta hover:border-azul hover:text-azul',
    perigo: 'bg-vermelho text-white hover:bg-vermelho-vivo',
    fantasma: 'text-azul-tinta/60 hover:bg-azul-tinta/5 hover:text-azul-tinta',
  }[variante]
  return (
    <button
      type="button"
      {...p}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[13.5px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`}
    >
      {children}
    </button>
  )
}

export function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-extrabold uppercase tracking-[0.1em] text-azul-tinta/55">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-[12px] text-azul-tinta/45">{dica}</span>}
    </label>
  )
}

export const entrada =
  'h-11 w-full rounded-xl border border-azul-tinta/12 bg-white px-3.5 text-[15px] font-medium text-azul-tinta outline-none transition placeholder:text-azul-tinta/30 focus:border-azul focus:ring-4 focus:ring-azul/15'

export function Aviso({ tipo = 'erro', children }: { tipo?: 'erro' | 'ok' | 'info'; children: ReactNode }) {
  const c = { erro: 'bg-vermelho/10 text-vermelho', ok: 'bg-[#00A28C]/10 text-[#007a69]', info: 'bg-azul-gelo text-azul-profundo' }[tipo]
  return <p className={`rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold ${c}`}>{children}</p>
}

export function Janela({ titulo, fechar, children }: { titulo: string; fechar: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-azul-fundo/60 p-4" onClick={fechar}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-white p-6 shadow-flutua" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-titulo text-2xl font-black uppercase [font-stretch:78%]">{titulo}</h3>
          <button type="button" onClick={fechar} className="grid h-9 w-9 place-items-center rounded-full hover:bg-azul-tinta/5" aria-label="Fechar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/**
 * Por que não — carrossel horizontal: arrasta com o mouse, desliza no dedo,
 * setas e barra de progresso. Título em cima para os cards aparecerem inteiros.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { m } from 'motion/react'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { CONFIG } from '../config'
import { MOTIVOS, type Motivo } from '../data/conteudo'
import { EASE, Surge, TituloRevela } from '../lib/movimento'

function Cartao({ mtv, i }: { mtv: Motivo; i: number }) {
  return (
    <m.article
      data-cartao
      className="group relative flex min-h-[460px] w-[82vw] max-w-[420px] shrink-0 snap-start flex-col overflow-hidden rounded-[28px] border border-azul-tinta/10 bg-white p-7 shadow-suave transition-shadow duration-500 hover:shadow-flutua sm:w-[420px] sm:p-9"
      initial={{ opacity: 0, x: 60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '0px -5% 0px 0px' }}
      transition={{ duration: 0.8, ease: EASE, delay: i * 0.08 }}
    >
      <span aria-hidden className="display contorno absolute -right-3 -top-7 select-none text-[10rem] leading-none text-azul-tinta/[0.08] transition-colors duration-500 group-hover:text-azul/25">
        {String(i + 1).padStart(2, '0')}
      </span>
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-azul transition-transform duration-500 group-hover:scale-x-100" />
      <div className="relative flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-azul-tinta px-3 py-1.5 font-sans text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-white">{mtv.tag}</span>
        {CONFIG.previa && mtv.exemplo && <span className="selo-exemplo border-azul-tinta/25 text-azul-tinta/50">Dado de exemplo</span>}
      </div>
      <h3 className="relative mt-auto pt-16 font-titulo text-[2.4rem] font-black uppercase leading-[0.9] tracking-[-0.02em] text-azul-tinta [font-stretch:68%] sm:text-[2.7rem]">{mtv.titulo}</h3>
      <p className="relative mt-4 text-[16px] leading-relaxed text-azul-tinta/70">{mtv.texto}</p>
      <p className="relative mt-6 flex items-center gap-2 border-t border-azul-tinta/10 pt-4 text-[13px] font-semibold text-azul-tinta/55">
        Fonte:{' '}
        {mtv.url ? (
          <a href={mtv.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-azul hover:underline" draggable={false}>
            {mtv.fonte} <ArrowUpRight size={14} />
          </a>
        ) : (
          mtv.fonte
        )}
      </p>
    </m.article>
  )
}

export function PorQueNao() {
  const trilho = useRef<HTMLDivElement>(null)
  const [progresso, setProgresso] = useState(0)
  const [atual, setAtual] = useState(0)
  const [pontas, setPontas] = useState({ inicio: true, fim: false })
  const arraste = useRef({ ativo: false, moveu: false, x: 0, scroll: 0 })

  const medir = useCallback(() => {
    const el = trilho.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setProgresso(max > 0 ? el.scrollLeft / max : 0)
    setPontas({ inicio: el.scrollLeft < 8, fim: el.scrollLeft > max - 8 })
    const cartoes = [...el.querySelectorAll<HTMLElement>('[data-cartao]')]
    const esq = el.getBoundingClientRect().left
    let melhor = 0
    cartoes.forEach((c, i) => {
      if (Math.abs(c.getBoundingClientRect().left - esq) < Math.abs(cartoes[melhor].getBoundingClientRect().left - esq)) melhor = i
    })
    setAtual(melhor)
  }, [])

  useEffect(() => {
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [medir])

  const passo = (dir: 1 | -1) => {
    const el = trilho.current
    const c = el?.querySelector<HTMLElement>('[data-cartao]')
    if (!el || !c) return
    el.scrollBy({ left: dir * (c.offsetWidth + 20), behavior: 'smooth' })
  }

  /* arrastar com o mouse (no toque, a rolagem nativa já resolve) */
  const baixo = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !trilho.current) return
    arraste.current = { ativo: true, moveu: false, x: e.clientX, scroll: trilho.current.scrollLeft }
    trilho.current.style.scrollSnapType = 'none'
    trilho.current.style.cursor = 'grabbing'
  }
  const mover = (e: React.PointerEvent) => {
    const a = arraste.current
    if (!a.ativo || !trilho.current) return
    const dx = e.clientX - a.x
    if (Math.abs(dx) > 4) a.moveu = true
    trilho.current.scrollLeft = a.scroll - dx
  }
  const soltar = () => {
    const el = trilho.current
    if (!arraste.current.ativo || !el) return
    arraste.current.ativo = false
    el.style.cursor = ''
    // encaixa no card mais próximo
    const c = el.querySelector<HTMLElement>('[data-cartao]')
    if (c) {
      const w = c.offsetWidth + 20
      el.scrollTo({ left: Math.round(el.scrollLeft / w) * w, behavior: 'smooth' })
    }
    setTimeout(() => el && (el.style.scrollSnapType = ''), 450)
  }

  return (
    <section id="por-que-nao" className="arco relative z-30 overflow-hidden bg-papel py-24 sm:py-32">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <Surge>
              <span className="rotulo text-azul">Por que não</span>
            </Surge>
            <h2 className="titulo mt-5 max-w-[16ch] text-azul-tinta">
              <TituloRevela texto="O que o Motta fez com a pauta da direita" destaque={['direita']} classeDestaque="text-azul" />
            </h2>
            <Surge atraso={0.2}>
              <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-azul-tinta/60">Decisões dele, uma por uma. Cada uma com a fonte.</p>
            </Surge>
          </div>
          <Surge atraso={0.25} className="flex items-center gap-4">
            <span className="font-sans text-[14px] font-bold tabular-nums text-azul-tinta/50">
              <span className="text-azul-tinta">{String(atual + 1).padStart(2, '0')}</span> / {String(MOTIVOS.length).padStart(2, '0')}
            </span>
            <button type="button" onClick={() => passo(-1)} disabled={pontas.inicio} aria-label="Anterior" className="grid h-14 w-14 place-items-center rounded-full border border-azul-tinta/15 text-azul-tinta transition hover:border-azul hover:bg-azul hover:text-white disabled:pointer-events-none disabled:opacity-30">
              <ArrowLeft size={20} />
            </button>
            <button type="button" onClick={() => passo(1)} disabled={pontas.fim} aria-label="Próximo" className="grid h-14 w-14 place-items-center rounded-full bg-azul-tinta text-white transition hover:bg-azul disabled:pointer-events-none disabled:opacity-30">
              <ArrowRight size={20} />
            </button>
          </Surge>
        </div>
      </div>

      <div
        ref={trilho}
        onScroll={medir}
        onPointerDown={baixo}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerLeave={soltar}
        onClickCapture={(e) => {
          if (arraste.current.moveu) {
            e.preventDefault()
            e.stopPropagation()
            arraste.current.moveu = false
          }
        }}
        className="sem-barra mt-12 flex cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 pt-2 [scroll-padding-inline:1.25rem] select-none sm:px-7 sm:[scroll-padding-inline:1.75rem] lg:px-[max(2.5rem,calc((100vw-1280px)/2+2.5rem))] lg:[scroll-padding-inline:max(2.5rem,calc((100vw-1280px)/2+2.5rem))]"
        role="region"
        aria-label="Decisões do Motta"
        tabIndex={0}
      >
        {MOTIVOS.map((mtv, i) => (
          <Cartao key={i} mtv={mtv} i={i} />
        ))}
        <span className="w-px shrink-0" aria-hidden />
      </div>

      <div className="container mt-6">
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-azul-tinta/10">
          <m.div className="h-full origin-left rounded-full bg-azul" animate={{ scaleX: Math.max(0.08, progresso) }} transition={{ duration: 0.3 }} />
        </div>
        <p className="mt-4 text-[13px] font-semibold text-azul-tinta/45">Arraste para o lado ou use as setas →</p>
      </div>
    </section>
  )
}

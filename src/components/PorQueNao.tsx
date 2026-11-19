/**
 * Por que não — dossiê que anda sozinho: recortes de jornal passando em loop.
 * Pausa no mouse/toque, dá para arrastar, setas para avançar. Só roda quando visível.
 */
import { useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { CONFIG } from '../config'
import { MOTIVOS, type Motivo } from '../data/conteudo'
import { Surge, TituloRevela } from '../lib/movimento'

const GIROS = [-2.2, 1.6, -1.2, 2.4, -1.8, 1.1]

function Recorte({ mtv, i }: { mtv: Motivo; i: number }) {
  return (
    <article
      data-cartao
      className="group relative w-[78vw] max-w-[380px] shrink-0 pt-5 transition-transform duration-500 hover:z-10 hover:!rotate-0 hover:scale-[1.03] sm:w-[380px]"
      style={{ transform: `rotate(${GIROS[i % GIROS.length]}deg)` }}
    >
      {/* fita adesiva */}
      <span aria-hidden className="absolute left-1/2 top-1 z-10 h-7 w-28 -translate-x-1/2 rotate-[-3deg] bg-[#e9e2c9]/80 shadow-sm" />
      <div className="relative flex min-h-[430px] flex-col overflow-hidden bg-[#F4F1E8] p-7 text-[#15110d] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]">
        {/* textura de papel de jornal */}
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-50 [background-image:repeating-linear-gradient(0deg,rgba(0,0,0,0.025)_0_1px,transparent_1px_3px)]" />
        <div className="relative flex items-center justify-between gap-3 border-b-2 border-[#15110d] pb-2.5 font-sans text-[10.5px] font-extrabold uppercase tracking-[0.18em]">
          <span>{mtv.tag}</span>
          <span className="text-[#15110d]/50">{String(i + 1).padStart(2, '0')} / {String(MOTIVOS.length).padStart(2, '0')}</span>
        </div>
        <h3 className="relative mt-6 font-titulo text-[2.35rem] font-black uppercase leading-[0.9] tracking-[-0.02em] [font-stretch:66%]">{mtv.titulo}</h3>
        <p className="relative mt-4 font-serif text-[16.5px] leading-[1.5] text-[#15110d]/80">{mtv.texto}</p>
        <div className="relative mt-auto flex items-end justify-between gap-3 pt-6">
          <p className="text-[12px] font-bold text-[#15110d]/55">
            Fonte:{' '}
            {mtv.url ? (
              <a href={mtv.url} target="_blank" rel="noopener" draggable={false} className="inline-flex items-center gap-0.5 text-[#15110d] underline">
                {mtv.fonte} <ArrowUpRight size={12} />
              </a>
            ) : (
              mtv.fonte
            )}
          </p>
          {CONFIG.previa && mtv.exemplo && <span className="shrink-0 rounded border border-dashed border-[#15110d]/30 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[#15110d]/45">exemplo</span>}
        </div>
        {/* carimbo vermelho */}
        <span
          aria-hidden
          className="absolute -right-3 bottom-16 rotate-[-14deg] rounded-md border-[3px] border-vermelho px-2.5 pb-0.5 pt-1 font-titulo text-[22px] font-black uppercase leading-none text-vermelho opacity-80 mix-blend-multiply [font-stretch:70%]"
        >
          Lembre disso
        </span>
      </div>
    </article>
  )
}

export function PorQueNao() {
  const trilho = useRef<HTMLDivElement>(null)
  const estado = useRef({ pausado: false, visivel: false, arrastando: false, moveu: false, x: 0, scroll: 0, retomar: 0 })

  /* rolagem automática contínua, em loop (o conteúdo é duplicado) */
  useEffect(() => {
    const el = trilho.current
    if (!el) return
    const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const io = new IntersectionObserver(([e]) => (estado.current.visivel = e.isIntersecting), { threshold: 0.1 })
    io.observe(el)
    let raf = 0
    let ultimo = performance.now()
    const passo = (agora: number) => {
      const dt = Math.min(50, agora - ultimo)
      ultimo = agora
      const s = estado.current
      if (!reduz && s.visivel && !s.pausado && !s.arrastando && performance.now() > s.retomar) {
        el.scrollLeft += dt * 0.045
      }
      const metade = el.scrollWidth / 2
      if (el.scrollLeft >= metade) el.scrollLeft -= metade
      raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [])

  const largura = () => (trilho.current?.querySelector<HTMLElement>('[data-cartao]')?.offsetWidth ?? 380) + 28
  const pular = (dir: 1 | -1) => {
    const el = trilho.current
    if (!el) return
    estado.current.retomar = performance.now() + 4000
    if (dir < 0 && el.scrollLeft < largura()) el.scrollLeft += el.scrollWidth / 2
    el.scrollBy({ left: dir * largura(), behavior: 'smooth' })
  }

  const baixo = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !trilho.current) return
    Object.assign(estado.current, { arrastando: true, moveu: false, x: e.clientX, scroll: trilho.current.scrollLeft })
    trilho.current.style.cursor = 'grabbing'
  }
  const mover = (e: React.PointerEvent) => {
    const s = estado.current
    if (!s.arrastando || !trilho.current) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) > 4) s.moveu = true
    trilho.current.scrollLeft = s.scroll - dx
  }
  const soltar = () => {
    if (!estado.current.arrastando || !trilho.current) return
    estado.current.arrastando = false
    estado.current.retomar = performance.now() + 2500
    trilho.current.style.cursor = ''
  }

  const lista = [...MOTIVOS, ...MOTIVOS]

  return (
    <section id="por-que-nao" className="arco relative z-30 overflow-hidden bg-[#0B0507] py-24 text-white sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_80%_0%,rgba(198,31,31,0.35),transparent_70%),radial-gradient(50%_50%_at_0%_100%,rgba(198,31,31,0.18),transparent_70%)]" />
      <div className="container relative">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <Surge>
              <span className="rotulo text-[#ff5a5a]">Por que não</span>
            </Surge>
            <h2 className="titulo mt-5 max-w-[15ch]">
              <TituloRevela texto="O que o Motta fez com a pauta da direita" destaque={['Motta', 'fez']} classeDestaque="text-[#ff4a4a]" />
            </h2>
            <Surge atraso={0.2}>
              <p className="mt-6 max-w-[40ch] text-xl leading-relaxed text-white/70">
                Está tudo registrado. <b className="text-white">E ele quer mais dois anos no comando da Câmara.</b>
              </p>
            </Surge>
          </div>
          <Surge atraso={0.25} className="flex items-center gap-3">
            <button type="button" onClick={() => pular(-1)} aria-label="Anterior" className="grid h-14 w-14 place-items-center rounded-full border border-white/20 transition hover:border-white hover:bg-white hover:text-[#0B0507]">
              <ArrowLeft size={20} />
            </button>
            <button type="button" onClick={() => pular(1)} aria-label="Próximo" className="grid h-14 w-14 place-items-center rounded-full bg-vermelho transition hover:bg-vermelho-vivo">
              <ArrowRight size={20} />
            </button>
          </Surge>
        </div>
      </div>

      <div
        ref={trilho}
        onPointerEnter={(e) => e.pointerType === 'mouse' && (estado.current.pausado = true)}
        onPointerLeave={() => {
          estado.current.pausado = false
          soltar()
        }}
        onPointerDown={baixo}
        onPointerMove={mover}
        onPointerUp={soltar}
        onTouchStart={() => (estado.current.retomar = performance.now() + 3500)}
        onFocusCapture={() => (estado.current.pausado = true)}
        onBlurCapture={() => (estado.current.pausado = false)}
        onClickCapture={(e) => {
          if (estado.current.moveu) {
            e.preventDefault()
            e.stopPropagation()
            estado.current.moveu = false
          }
        }}
        className="sem-barra relative mt-14 flex cursor-grab select-none gap-7 overflow-x-auto px-6 pb-10 pt-4"
        role="region"
        aria-label="Decisões do Motta (passam sozinhas; passe o mouse para pausar)"
        tabIndex={0}
      >
        {lista.map((mtv, i) => (
          <div key={i} aria-hidden={i >= MOTIVOS.length}>
            <Recorte mtv={mtv} i={i % MOTIVOS.length} />
          </div>
        ))}
      </div>
      <p className="container relative text-[13px] font-semibold text-white/40">Passa sozinho. Pare com o mouse ou arraste para o lado.</p>
    </section>
  )
}

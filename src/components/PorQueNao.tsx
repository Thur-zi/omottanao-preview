/**
 * Por que não — dossiê que anda sozinho: recortes de jornal passando em loop.
 * Pausa no mouse/toque, dá para arrastar, setas para avançar. Só roda quando visível.
 */
import { useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { CONFIG } from '../config'
import { MOTIVOS, type Motivo } from '../data/conteudo'
import { Surge, TituloRevela } from '../lib/movimento'
import { useConteudo } from '../lib/conteudo'

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
      <div className="relative flex min-h-[430px] flex-col overflow-hidden bg-[#F4F1E8] p-7 text-[#15110d] shadow-[0_24px_40px_-24px_rgba(0,0,0,0.9)]">
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
          className="absolute -right-3 bottom-16 rotate-[-14deg] rounded-md border-[3px] border-vermelho/85 px-2.5 pb-0.5 pt-1 font-titulo text-[22px] font-black uppercase leading-none text-vermelho/85 [font-stretch:70%]"
        >
          Lembre disso
        </span>
      </div>
    </article>
  )
}

export function PorQueNao() {
  useConteudo()
  const janela = useRef<HTMLDivElement>(null)
  const trilho = useRef<HTMLDivElement>(null)
  /*
   * O trilho anda por transform (GPU), não por scrollLeft: scrollLeft arredonda para pixel
   * inteiro e, a ~0,7 px por quadro, ficava parado e dava saltos (o "quadro a quadro").
   */
  const s = useRef({ x: 0, alvo: null as number | null, metade: 1, visivel: false, pausado: false, arrastando: false, moveu: false, px: 0, py: 0, x0: 0, eixo: '' as '' | 'x' | 'y', retomar: 0, ultimo: 0, raf: 0 })

  const aplicarRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    const el = trilho.current
    const jan = janela.current
    if (!el || !jan) return
    const st = s.current
    const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    /*
     * Cada recorte anda sozinho (transform próprio) e os que saem da tela ficam ocultos.
     * Antes o trilho inteiro (~6.000 px) virava uma camada única: pesado demais para o celular.
     */
    let filhos: HTMLElement[] = []
    let lefts: number[] = []
    let largs: number[] = []
    let base = 0
    let vw = 0
    const medir = () => {
      filhos = Array.from(el.children) as HTMLElement[]
      filhos.forEach((f) => (f.style.transform = ''))
      lefts = filhos.map((f) => f.offsetLeft)
      largs = filhos.map((f) => f.offsetWidth)
      base = lefts[0] ?? 0
      const ult = filhos.length - 1
      st.metade = ult >= 0 ? Math.max(1, lefts[ult] + largs[ult] + 28 - base) : 1
      vw = jan.clientWidth
      aplicarRef.current()
    }
    const aplicar = () => {
      if (st.x >= st.metade) st.x -= st.metade
      if (st.x < 0) st.x += st.metade
      for (let i = 0; i < filhos.length; i++) {
        let pos = (((lefts[i] - base - st.x) % st.metade) + st.metade) % st.metade
        if (pos > st.metade - largs[i]) pos -= st.metade // entrando pela esquerda
        const visivel = pos < vw && pos + largs[i] > 0
        const f = filhos[i]
        f.style.visibility = visivel ? 'visible' : 'hidden'
        if (visivel) f.style.transform = `translate3d(${base + pos - lefts[i]}px,0,0)`
      }
    }
    aplicarRef.current = aplicar
    const ro = new ResizeObserver(medir)
    ro.observe(jan)
    medir()
    const passo = (agora: number) => {
      const dt = Math.min(50, agora - (st.ultimo || agora))
      st.ultimo = agora
      if (st.alvo !== null) {
        const d = st.alvo - st.x
        st.x += d * Math.min(1, dt * 0.012)
        if (Math.abs(d) < 0.5) {
          st.x = st.alvo
          st.alvo = null
        }
        aplicar()
      } else if (!reduz && !st.pausado && !st.arrastando && agora > st.retomar) {
        st.x += dt * 0.05
        aplicar()
      }
      st.raf = st.visivel ? requestAnimationFrame(passo) : 0
    }
    // só anima enquanto a seção está na tela (fora dela: zero custo)
    const io = new IntersectionObserver(([e]) => {
      st.visivel = e.isIntersecting
      if (st.visivel && !st.raf) {
        st.ultimo = 0
        st.raf = requestAnimationFrame(passo)
      }
    })
    io.observe(jan)
    return () => {
      cancelAnimationFrame(st.raf)
      st.raf = 0
      io.disconnect()
      ro.disconnect()
    }
  }, [])

  const largura = () => (trilho.current?.querySelector<HTMLElement>('[data-cartao]')?.offsetWidth ?? 380) + 28
  const pular = (dir: 1 | -1) => {
    const st = s.current
    st.retomar = performance.now() + 4000
    const base = st.alvo ?? st.x
    if (dir < 0 && base < largura()) {
      st.x += st.metade
      st.alvo = base + st.metade - largura()
    } else st.alvo = base + dir * largura()
  }

  // arrastar com mouse e com o dedo; no toque, gesto vertical continua rolando a página
  const baixo = (e: React.PointerEvent) => {
    Object.assign(s.current, { arrastando: true, moveu: false, px: e.clientX, py: e.clientY, x0: s.current.x, eixo: '', alvo: null })
    if (e.pointerType === 'mouse' && janela.current) janela.current.style.cursor = 'grabbing'
  }
  const mover = (e: React.PointerEvent) => {
    const st = s.current
    if (!st.arrastando) return
    const dx = e.clientX - st.px
    const dy = e.clientY - st.py
    if (!st.eixo && Math.abs(dx) + Math.abs(dy) > 6) st.eixo = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (st.eixo === 'y') return soltar()
    if (st.eixo !== 'x') return
    st.moveu = true
    st.x = st.x0 - dx
    aplicarRef.current()
  }
  const soltar = () => {
    const st = s.current
    if (!st.arrastando) return
    st.arrastando = false
    st.retomar = performance.now() + 2500
    if (janela.current) janela.current.style.cursor = ''
  }

  // repete só o necessário para o laço não abrir buraco em telas largas
  const reps = Math.max(1, Math.ceil(6 / Math.max(1, MOTIVOS.length)))
  const lista = Array.from({ length: reps }, () => MOTIVOS).flat()

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
        ref={janela}
        onPointerEnter={(e) => e.pointerType === 'mouse' && (s.current.pausado = true)}
        onPointerLeave={() => {
          s.current.pausado = false
          soltar()
        }}
        onPointerDown={baixo}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onFocusCapture={() => (s.current.pausado = true)}
        onBlurCapture={() => (s.current.pausado = false)}
        onClickCapture={(e) => {
          if (s.current.moveu) {
            e.preventDefault()
            e.stopPropagation()
            s.current.moveu = false
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') pular(1)
          if (e.key === 'ArrowLeft') pular(-1)
        }}
        className="relative mt-14 cursor-grab touch-pan-y select-none overflow-hidden pb-10 pt-4"
        role="region"
        aria-label="Decisões do Motta (passam sozinhas; passe o mouse para pausar ou use as setas)"
        tabIndex={0}
      >
        <div ref={trilho} className="flex w-max gap-7 px-6">
          {lista.map((mtv, i) => (
            <div key={i} aria-hidden={i >= MOTIVOS.length} className="will-change-transform">
              <Recorte mtv={mtv} i={i % MOTIVOS.length} />
            </div>
          ))}
        </div>
      </div>
      <p className="container relative text-[13px] font-semibold text-white/40">Passa sozinho. Pare com o mouse ou arraste para o lado.</p>
    </section>
  )
}

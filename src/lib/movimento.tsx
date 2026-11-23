/**
 * Primitivas de movimento — mesmo padrão do Fiscal da Luz (Lenis + motion/react),
 * com trava de rolagem para a abertura cinematográfica.
 */
import { Fragment, useEffect, useRef, type ReactNode } from 'react'
import Lenis from 'lenis'
import { animate, m, motionValue, useInView, useReducedMotion, useTransform, type MotionValue } from 'motion/react'

export const EASE = [0.22, 1, 0.36, 1] as const
export const EASE_CINEMA = [0.76, 0, 0.24, 1] as const

let lenis: Lenis | null = null

export function RolagemSuave() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(pointer: coarse)').matches) return
    lenis = new Lenis({ autoRaf: true, lerp: 0.09, smoothWheel: true })
    if (document.documentElement.classList.contains('travado')) lenis.stop()
    if (import.meta.env.DEV) (window as unknown as { __lenis: Lenis }).__lenis = lenis
    return () => {
      lenis?.destroy()
      lenis = null
    }
  }, [])
  return null
}

export function travarRolagem(travar: boolean) {
  document.documentElement.classList.toggle('travado', travar)
  if (travar) {
    window.scrollTo(0, 0)
    lenis?.stop()
  } else lenis?.start()
}

export function rolarPara(id: string, offset = -72) {
  const el = document.getElementById(id)
  if (!el) return
  // seções com content-visibility ainda não calculadas têm altura estimada: calcula tudo antes de mirar,
  // senão o destino muda no meio do caminho
  const raiz = document.documentElement
  raiz.classList.add('calcular-tudo')
  requestAnimationFrame(() => {
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.4 })
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: 'smooth' })
    setTimeout(() => raiz.classList.remove('calcular-tudo'), 2200)
  })
}

type Tag = 'div' | 'li' | 'p' | 'span' | 'h2' | 'h3' | 'figure' | 'article' | 'section'

export function Surge({ children, className, atraso = 0, y = 40, as = 'div' }: { children: ReactNode; className?: string; atraso?: number; y?: number; as?: Tag }) {
  const reduz = useReducedMotion()
  const M = m[as]
  return (
    <M
      className={className}
      initial={reduz ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.9, ease: EASE, delay: atraso }}
    >
      {children}
    </M>
  )
}

/** Título que sobe palavra por palavra por trás de uma máscara. */
export function TituloRevela({
  texto,
  className,
  atraso = 0,
  destaque = [],
  classeDestaque = 'text-azul-vivo',
  ativo: ativoExterno,
}: {
  texto: string
  className?: string
  atraso?: number
  destaque?: string[]
  classeDestaque?: string
  /** Controle externo (ex.: só depois da abertura). */
  ativo?: boolean
}) {
  const reduz = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const visto = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const ativo = ativoExterno ?? (visto || !!reduz)
  const palavras = texto.split(' ')
  return (
    <span ref={ref} className={className} aria-label={texto}>
      {palavras.map((p, i) => (
        <Fragment key={i}>
          <span aria-hidden className="-mb-[0.12em] -mt-[0.22em] inline-block overflow-hidden pb-[0.12em] pr-[0.04em] pt-[0.22em] align-bottom">
            <m.span
              className={`inline-block ${destaque.includes(p) ? classeDestaque : ''}`}
              initial={reduz ? false : { y: '115%', rotate: 5 }}
              animate={ativo ? { y: '0%', rotate: 0 } : undefined}
              transition={{ duration: 1.05, ease: EASE, delay: atraso + i * 0.07 }}
            >
              {p}
            </m.span>
          </span>
          {i < palavras.length - 1 && ' '}
        </Fragment>
      ))}
    </span>
  )
}

function Palavra({ p, i, total, progresso, forte }: { p: string; i: number; total: number; progresso: MotionValue<number>; forte: boolean }) {
  const ini = i / total
  const opacity = useTransform(progresso, [ini, ini + 1.5 / total], [0.12, 1])
  return (
    <m.span style={{ opacity }} className={forte ? 'text-azul-vivo' : undefined}>
      {p}{' '}
    </m.span>
  )
}


/* ------------------------------------------------------------------ */
/* Rolagem leve                                                        */
/* O useScroll do Motion mede o layout a cada quadro, para sempre      */
/* (scrollHeight/clientHeight): força recálculo da página e engasga o  */
/* celular. Aqui: um único ouvinte passivo de rolagem; as medidas das  */
/* seções só são refeitas quando a tela ou o conteúdo muda de tamanho. */
/* ------------------------------------------------------------------ */
const rolagemY = motionValue(0)
const progressoPagina = motionValue(0)
let alturaRolavel = 1
const remedidas = new Set<() => void>()
let rolagemIniciada = false

function iniciarRolagem() {
  if (rolagemIniciada || typeof window === 'undefined') return
  rolagemIniciada = true
  const medirPagina = () => {
    alturaRolavel = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    remedidas.forEach((f) => f())
    atualizar()
  }
  const atualizar = () => {
    const y = window.scrollY
    rolagemY.set(y)
    progressoPagina.set(Math.min(1, Math.max(0, y / alturaRolavel)))
  }
  window.addEventListener('scroll', atualizar, { passive: true })
  window.addEventListener('resize', medirPagina, { passive: true })
  // o conteúdo muda de altura (seções que carregam depois, imagens): remede sem custo por quadro
  new ResizeObserver(() => requestAnimationFrame(medirPagina)).observe(document.body)
  medirPagina()
}

/** Posição de rolagem da janela (px), sem medir layout a cada quadro. */
export function useRolagemY() {
  iniciarRolagem()
  return rolagemY
}

/** Progresso 0..1 da rolagem da página inteira. */
export function useProgressoPagina() {
  iniciarRolagem()
  return progressoPagina
}

type Borda = 'start' | 'end'
const lerBorda = (b: string) => (b === 'start' ? 0 : b === 'end' ? 1 : b === 'center' ? 0.5 : Number(b))

/**
 * Progresso 0..1 de um elemento atravessando a tela, no formato de offset do Motion
 * (ex.: ['start end', 'end start']). Mede posição e altura só quando algo muda de tamanho.
 */
export function useProgressoSecao(ref: React.RefObject<HTMLElement | null>, offset: [`${Borda} ${string}`, `${Borda} ${string}`]) {
  iniciarRolagem()
  const faixa = useRef({ ini: 0, fim: 1 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const [a, b] = offset.map((o) => o.split(' ')) as [string[], string[]]
    const medir = () => {
      const r = el.getBoundingClientRect()
      const topo = r.top + window.scrollY
      const vh = window.innerHeight
      const ini = topo + lerBorda(a[0]) * r.height - lerBorda(a[1]) * vh
      const fim = topo + lerBorda(b[0]) * r.height - lerBorda(b[1]) * vh
      faixa.current = { ini, fim: fim === ini ? ini + 1 : fim }
      rolagemY.set(window.scrollY + 0.0001) // reaplica as transformações com a medida nova
      rolagemY.set(window.scrollY)
    }
    remedidas.add(medir)
    medir()
    return () => {
      remedidas.delete(medir)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return useTransform(rolagemY, (y) => Math.min(1, Math.max(0, (y - faixa.current.ini) / (faixa.current.fim - faixa.current.ini))))
}

/** Texto que acende palavra por palavra conforme a rolagem. *palavra* = destaque. */
export function PalavrasAcendem({ texto, className }: { texto: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const scrollYProgress = useProgressoSecao(ref, ['start 0.85', 'end 0.45'])
  const palavras = texto.split(' ')
  return (
    <p ref={ref} className={className} aria-label={texto.replace(/\*/g, '')}>
      <span aria-hidden>
        {palavras.map((p, i) => (
          <Palavra key={i} p={p.replace(/\*/g, '')} forte={p.includes('*')} i={i} total={palavras.length} progresso={scrollYProgress} />
        ))}
      </span>
    </p>
  )
}

export function NumeroAnimado({ valor, className, duracao = 1.8, sufixo = '' }: { valor: number; className?: string; duracao?: number; sufixo?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const visto = useInView(ref, { once: true, margin: '-10% 0px' })
  useEffect(() => {
    if (!visto || !ref.current) return
    const fmt = new Intl.NumberFormat('pt-BR')
    const ctrl = animate(0, valor, {
      duration: duracao,
      ease: EASE,
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = fmt.format(Math.round(v)) + sufixo
      },
    })
    return () => ctrl.stop()
  }, [visto, valor, duracao, sufixo])
  return (
    <span ref={ref} className={`tabular-nums ${className ?? ''}`}>
      0{sufixo}
    </span>
  )
}

export function Paralaxe({ children, className, intensidade = 80 }: { children: ReactNode; className?: string; intensidade?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduz = useReducedMotion()
  const scrollYProgress = useProgressoSecao(ref, ['start end', 'end start'])
  const y = useTransform(scrollYProgress, [0, 1], reduz ? [0, 0] : [intensidade, -intensidade])
  return (
    <m.div ref={ref} style={{ y }} className={className}>
      {children}
    </m.div>
  )
}

/** Botão que puxa levemente o cursor (desktop). */
export function useMagnetico<T extends HTMLElement>(forca = 0.25) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(pointer: coarse)').matches) return
    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const x = e.clientX - (r.left + r.width / 2)
      const y = e.clientY - (r.top + r.height / 2)
      el.style.transform = `translate(${x * forca}px, ${y * forca}px)`
    }
    const sair = () => (el.style.transform = '')
    el.addEventListener('pointermove', mover)
    el.addEventListener('pointerleave', sair)
    return () => {
      el.removeEventListener('pointermove', mover)
      el.removeEventListener('pointerleave', sair)
    }
  }, [forca])
  return ref
}

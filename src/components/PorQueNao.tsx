import { useEffect, useRef, useState } from 'react'
import { m, useScroll, useSpring, useTransform } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { CONFIG } from '../config'
import { MOTIVOS, type Motivo } from '../data/conteudo'
import { Surge, TituloRevela } from '../lib/movimento'

function useLargo() {
  const q = '(min-width: 1024px)'
  const [v, setV] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const f = () => setV(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  return v
}

function Cartao({ mtv, i }: { mtv: Motivo; i: number }) {
  return (
    <article className="group relative flex h-full w-[82vw] max-w-[440px] shrink-0 snap-start flex-col overflow-hidden rounded-[28px] border border-azul-tinta/10 bg-white p-7 shadow-suave transition-[transform,box-shadow] duration-500 hover:-translate-y-1.5 hover:shadow-flutua sm:p-9 lg:w-[34vw] lg:max-w-[520px]">
      <span aria-hidden className="display contorno absolute -right-3 -top-6 text-[11rem] leading-none text-azul-tinta/[0.07] transition-colors duration-500 group-hover:text-azul/20">
        {String(i + 1).padStart(2, '0')}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-azul-tinta px-3 py-1.5 font-sans text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-white">{mtv.tag}</span>
        {CONFIG.previa && mtv.exemplo && <span className="selo-exemplo border-azul-tinta/25 text-azul-tinta/50">Exemplo</span>}
      </div>
      <h3 className="mt-auto pt-24 font-titulo text-[2.5rem] font-black uppercase leading-[0.9] tracking-[-0.02em] text-azul-tinta [font-stretch:68%] sm:text-[3rem]">{mtv.titulo}</h3>
      <p className="mt-4 text-[16px] leading-relaxed text-azul-tinta/70">{mtv.texto}</p>
      <p className="mt-6 flex items-center gap-2 border-t border-azul-tinta/10 pt-4 text-[13px] font-semibold text-azul-tinta/55">
        Fonte:{' '}
        {mtv.url ? (
          <a href={mtv.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-azul hover:underline">
            {mtv.fonte} <ArrowUpRight size={14} />
          </a>
        ) : (
          mtv.fonte
        )}
      </p>
    </article>
  )
}

function Cabecalho() {
  return (
    <div className="w-[82vw] max-w-[440px] shrink-0 snap-start lg:w-[30vw] lg:max-w-none lg:pr-10">
      <Surge>
        <span className="rotulo text-azul">Por que não</span>
      </Surge>
      <h2 className="titulo mt-5 text-azul-tinta">
        <TituloRevela texto="O que o Motta fez com a pauta da direita" destaque={['direita']} classeDestaque="text-azul" />
      </h2>
      <Surge atraso={0.2}>
        <p className="mt-6 max-w-[38ch] text-lg leading-relaxed text-azul-tinta/65">Decisões dele, uma por uma. Cada uma com a fonte.</p>
      </Surge>
    </div>
  )
}

export function PorQueNao() {
  const largo = useLargo()
  const secao = useRef<HTMLElement>(null)
  const trilho = useRef<HTMLDivElement>(null)
  const [distancia, setDistancia] = useState(0)
  const { scrollYProgress } = useScroll({ target: secao, offset: ['start start', 'end end'] })
  const suave = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })
  const x = useTransform(suave, [0, 1], [0, -distancia])
  const barra = useTransform(suave, [0, 1], [0, 1])

  useEffect(() => {
    if (!largo) return
    const medir = () => setDistancia(Math.max(0, (trilho.current?.scrollWidth ?? 0) - window.innerWidth + 80))
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [largo])

  if (!largo) {
    return (
      <section id="por-que-nao" className="arco z-30 bg-papel py-24">
        <div className="sem-barra flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 [scroll-padding:1.25rem]">
          <Cabecalho />
          {MOTIVOS.map((mtv, i) => (
            <Cartao key={i} mtv={mtv} i={i} />
          ))}
          <span className="w-1 shrink-0" />
        </div>
        <p className="mt-4 px-5 text-[13px] font-semibold text-azul-tinta/45">Arraste para o lado →</p>
      </section>
    )
  }

  return (
    <section id="por-que-nao" ref={secao} className="arco z-30 bg-papel" style={{ height: `calc(100vh + ${distancia}px)` }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <m.div ref={trilho} style={{ x }} className="flex items-stretch gap-6 pl-[max(2.5rem,calc((100vw-1280px)/2+2.5rem))] pr-20">
          <Cabecalho />
          {MOTIVOS.map((mtv, i) => (
            <div key={i} className="h-[62vh] max-h-[600px]">
              <Cartao mtv={mtv} i={i} />
            </div>
          ))}
        </m.div>
        <div className="container mt-10">
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-azul-tinta/10">
            <m.div className="h-full origin-left bg-azul" style={{ scaleX: barra }} />
          </div>
        </div>
      </div>
    </section>
  )
}

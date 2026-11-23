import { useRef } from 'react'
import { m, useScroll, useTransform } from 'motion/react'
import { CONFIG } from '../config'
import { CANDIDATO, PAUTAS } from '../data/conteudo'
import { EASE, Surge, TituloRevela } from '../lib/movimento'
import { linkWhatsapp } from '../lib/rastreio'
import { useConteudo } from '../lib/conteudo'
import { IconeWhatsapp } from './Icones'

const BASE = import.meta.env.BASE_URL

export function Alternativa() {
  useConteudo()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const yFoto = useTransform(scrollYProgress, [0, 1], [60, -60])
  const yPalavra = useTransform(scrollYProgress, [0, 1], ['10%', '-30%'])

  return (
    <section id="alternativa" ref={ref} className="arco z-40 overflow-hidden bg-[linear-gradient(160deg,#0E2E9A_0%,#081A52_55%,#040B26_100%)] py-24 text-white sm:py-36">
      <m.div aria-hidden style={{ y: yPalavra }} className="display pointer-events-none absolute -right-[4vw] top-0 select-none text-[34vw] leading-none text-white/[0.04]">
        22
      </m.div>
      <div className="container relative grid grid-cols-[minmax(0,1fr)] items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <m.figure style={{ y: yFoto }} className="relative mx-auto w-[min(100%,420px)] lg:w-full lg:max-w-[460px]">
          <m.div
            className="relative aspect-[4/5] overflow-hidden rounded-[32px] bg-azul-noite shadow-flutua"
            initial={{ clipPath: 'inset(100% 0 0 0 round 32px)' }}
            whileInView={{ clipPath: 'inset(0% 0 0 0 round 32px)' }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 1.4, ease: EASE }}
          >
            {CONFIG.candidatoFoto ? (
              <img src={CONFIG.candidatoFoto} alt={CANDIDATO.nome} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            ) : CANDIDATO.foto ? (
              <>
                <img
                  src={`${BASE}luiz-960.webp`}
                  srcSet={`${BASE}luiz-600.webp 600w, ${BASE}luiz-960.webp 960w`}
                  sizes="(min-width: 1024px) 460px, 90vw"
                  width={960}
                  height={1200}
                  alt={`${CANDIDATO.nome} discursa no plenário da Câmara`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(4,11,38,0.75)_100%)]" />
                <span className="absolute bottom-2.5 left-4 text-[8px] font-medium tracking-wide text-white/45">Foto: Câmara dos Deputados · CC BY 3.0</span>
              </>
            ) : (
              <div className="grid h-full w-full place-items-center bg-[radial-gradient(80%_60%_at_50%_30%,#1F4FE0_0%,#081A52_70%)]">
                <svg viewBox="0 0 200 250" className="h-[78%] w-[78%] text-white/15" aria-hidden>
                  <circle cx="100" cy="82" r="46" fill="currentColor" />
                  <path d="M18 250c0-58 37-96 82-96s82 38 82 96z" fill="currentColor" />
                </svg>
                <span className="absolute bottom-5 left-5 right-5 rounded-xl border border-dashed border-white/30 p-3 text-center text-[12px] font-semibold text-white/70">
                  Foto oficial do {CANDIDATO.curto} (4:5)
                </span>
              </div>
            )}
          </m.div>
          <figcaption
            className="absolute -bottom-6 right-3 flex rotate-[-4deg] items-center gap-2.5 rounded-2xl bg-white px-2.5 py-2 font-titulo text-xl font-black uppercase leading-none text-azul-tinta shadow-flutua [font-stretch:80%] sm:-right-6"
            aria-label={`Partido e estado: ${CANDIDATO.partido}`}
          >
            <span className="flex items-center gap-2">
              <img src={`${BASE}partidos/PL.webp`} alt="PL" width={36} height={36} className="h-9 w-9 object-contain" loading="lazy" />
            </span>
            <i aria-hidden className="h-6 w-px bg-azul-tinta/15" />
            <span className="flex items-center gap-2">
              <img src={`${BASE}bandeiras/SP.webp`} alt="São Paulo" width={36} height={24} className="h-6 w-9 rounded-[3px] object-cover shadow-[0_0_0_1px_rgba(10,20,51,0.15)]" loading="lazy" />
            </span>
          </figcaption>
        </m.figure>

        <div className="min-w-0">
          <Surge>
            <span className="rotulo text-azul-claro">A alternativa</span>
          </Surge>
          <h2 className="titulo mt-5">
            <TituloRevela texto="Direita com candidato próprio" destaque={['próprio']} classeDestaque="text-azul-claro" />
          </h2>
          <Surge atraso={0.15}>
            <p className="mt-7 max-w-[44ch] text-xl leading-relaxed text-white/75">
              <b className="text-white">{CANDIDATO.nome}</b> está na disputa pela Presidência da Câmara. Para a direita não entregar a Casa ao candidato que o PT apoia.
            </p>
          </Surge>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 sm:[&>*:last-child:nth-child(odd)]:col-span-2">
            {PAUTAS.map((p, i) => {
              const [titulo, detalhe] = p.titulo.split(' · ')
              return (
                <Surge as="li" key={p.titulo} atraso={0.2 + i * 0.07} className="group relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-azul-vivo transition-transform duration-500 group-hover:scale-x-100" />
                  <span className="font-sans text-[11px] font-extrabold text-azul-claro">0{i + 1}</span>
                  <p className="mt-2 font-titulo text-2xl font-black uppercase leading-[0.95] [font-stretch:75%]">{titulo}</p>
                  {detalhe && <p className="mt-2.5 text-[14.5px] leading-snug text-white/65">{detalhe}</p>}
                  {CONFIG.previa && p.exemplo && <span className="selo-exemplo mt-3 border-white/25 text-white/45">A definir</span>}
                </Surge>
              )
            })}
          </ul>
          <Surge atraso={0.4} className="mt-10">
            <a data-sem-barra className="btn-zap w-full whitespace-normal px-5 text-center text-[15px] leading-tight sm:w-auto sm:px-8 sm:text-[17px]" href={linkWhatsapp('alternativa')} target="_blank" rel="noopener" data-rastreio="whatsapp_click:alternativa">
              <IconeWhatsapp /> Fale com o Luiz no WhatsApp
            </a>
          </Surge>
        </div>
      </div>
    </section>
  )
}

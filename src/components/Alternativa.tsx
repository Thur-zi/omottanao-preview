import { useRef } from 'react'
import { m, useScroll, useTransform } from 'motion/react'
import { CONFIG } from '../config'
import { CANDIDATO, PAUTAS } from '../data/conteudo'
import { EASE, Surge, TituloRevela } from '../lib/movimento'
import { linkWhatsapp } from '../lib/rastreio'
import { IconeWhatsapp } from './Icones'

const BASE = import.meta.env.BASE_URL

export function Alternativa() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const yFoto = useTransform(scrollYProgress, [0, 1], [60, -60])
  const yPalavra = useTransform(scrollYProgress, [0, 1], ['10%', '-30%'])

  return (
    <section id="alternativa" ref={ref} className="arco z-40 overflow-hidden bg-[linear-gradient(160deg,#0E2E9A_0%,#081A52_55%,#040B26_100%)] py-24 text-white sm:py-36">
      <m.div aria-hidden style={{ y: yPalavra }} className="display pointer-events-none absolute -right-[4vw] top-0 select-none text-[34vw] leading-none text-white/[0.04]">
        22
      </m.div>
      <div className="container relative grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <m.figure style={{ y: yFoto }} className="relative mx-auto w-full max-w-[460px]">
          <m.div
            className="relative aspect-[4/5] overflow-hidden rounded-[32px] bg-azul-noite shadow-flutua"
            initial={{ clipPath: 'inset(100% 0 0 0 round 32px)' }}
            whileInView={{ clipPath: 'inset(0% 0 0 0 round 32px)' }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 1.4, ease: EASE }}
          >
            {CANDIDATO.foto ? (
              <img src={`${BASE}${CANDIDATO.foto}`} alt={CANDIDATO.nome} className="h-full w-full object-cover" loading="lazy" />
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
          <figcaption className="absolute -bottom-5 -right-3 rotate-[-4deg] rounded-xl bg-white px-4 py-2.5 font-titulo text-lg font-black uppercase text-azul-tinta shadow-flutua [font-stretch:80%] sm:-right-6">
            {CANDIDATO.partido}
          </figcaption>
        </m.figure>

        <div>
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
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {PAUTAS.map((p, i) => (
              <Surge as="li" key={p.titulo} atraso={0.2 + i * 0.07} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-azul-vivo transition-transform duration-500 group-hover:scale-x-100" />
                <span className="font-sans text-[11px] font-extrabold text-azul-claro">0{i + 1}</span>
                <p className="mt-2 font-titulo text-2xl font-black uppercase leading-[0.95] [font-stretch:75%]">{p.titulo}</p>
                {CONFIG.previa && p.exemplo && <span className="selo-exemplo mt-3 border-white/25 text-white/45">A definir</span>}
              </Surge>
            ))}
          </ul>
          <Surge atraso={0.4} className="mt-10">
            <a className="btn-zap" href={linkWhatsapp('alternativa')} target="_blank" rel="noopener" data-rastreio="whatsapp_click:alternativa">
              <IconeWhatsapp /> Fale com o Luiz no WhatsApp
            </a>
          </Surge>
        </div>
      </div>
    </section>
  )
}

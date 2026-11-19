/* Fora da página por enquanto (pedido do mandato). Para voltar: importar e montar <Contexto /> no App, depois do <Assine />. */
import { useRef } from 'react'
import { m, useScroll, useSpring, useTransform } from 'motion/react'
import { LETREIRO } from '../data/conteudo'
import { EASE, NumeroAnimado, Surge, TituloRevela } from '../lib/movimento'

export function Letreiro({ escuro = true }: { escuro?: boolean }) {
  const itens = [...LETREIRO, ...LETREIRO]
  return (
    <div className={`overflow-hidden py-4 ${escuro ? 'bg-azul-fundo text-white' : 'bg-azul text-white'}`} aria-hidden>
      <div className="flex w-max animate-letreiro">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-center">
            {itens.map((t, i) => (
              <span key={`${k}-${i}`} className="display flex items-center whitespace-nowrap px-6 text-[34px] sm:text-[44px]">
                {t}
                <span className="ml-12 inline-block h-3 w-3 rotate-45 bg-azul-vivo" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Fatos do briefing, em ordem cronológica. */
const PASSOS = [
  { quando: 'Agora', numero: 121, sufixo: '', unidade: 'deputados do PL', titulo: 'O PL decide', texto: 'Uma consulta interna define, nos próximos dias, se o partido apoia Motta ou lança candidato próprio.', agora: true },
  { quando: 'Até fevereiro', numero: 15, sufixo: '', unidade: 'partidos com Motta', titulo: 'A pressão da base', texto: 'Motta tem o apoio formal de 15 partidos, incluindo o PT. Cada deputado precisa ouvir quem votou nele.' },
  { quando: '1º de fevereiro', numero: 513, sufixo: '', unidade: 'deputados votam', titulo: 'Voto secreto', texto: 'Cada um vota sozinho. Apoio de partido não garante o voto de ninguém.' },
  { quando: 'Para vencer', numero: 257, sufixo: '', unidade: 'votos no 1º turno', titulo: 'A maioria', texto: 'É o número que Motta precisa alcançar. Cada NÃO afasta ele dessa conta.' },
]

export function Contexto() {
  const trilho = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: trilho, offset: ['start 0.8', 'end 0.6'] })
  const linha = useSpring(useTransform(scrollYProgress, [0, 1], [0, 1]), { stiffness: 90, damping: 24 })

  return (
    <section id="contexto" className="arco relative z-20 overflow-hidden bg-papel pb-24 pt-24 sm:pb-32 sm:pt-32">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <Surge>
              <span className="rotulo text-azul">Como funciona</span>
            </Surge>
            <h2 className="titulo mt-5 max-w-[13ch] text-azul-tinta">
              <TituloRevela texto="O caminho até 1º de fevereiro" destaque={['fevereiro']} classeDestaque="text-azul" />
            </h2>
          </div>
          <Surge atraso={0.2}>
            <p className="max-w-[34ch] text-lg leading-relaxed text-azul-tinta/60">A eleição para presidente da Câmara em quatro momentos. O primeiro está acontecendo agora.</p>
          </Surge>
        </div>

        <ol ref={trilho} className="relative mt-16 grid gap-0 lg:mt-24 lg:grid-cols-4 lg:gap-6">
          {/* linha que se desenha com a rolagem: vertical no celular, horizontal no desktop */}
          <span aria-hidden className="absolute bottom-0 left-[19px] top-0 w-[3px] rounded-full bg-azul-tinta/[0.08] lg:bottom-auto lg:left-0 lg:right-0 lg:top-[19px] lg:h-[3px] lg:w-auto" />
          <m.span aria-hidden style={{ scaleY: linha }} className="absolute bottom-0 left-[19px] top-0 w-[3px] origin-top rounded-full bg-azul lg:hidden" />
          <m.span aria-hidden style={{ scaleX: linha }} className="absolute left-0 right-0 top-[19px] hidden h-[3px] origin-left rounded-full bg-azul lg:block" />

          {PASSOS.map((p, i) => (
            <Surge as="li" key={p.titulo} atraso={i * 0.08} className="relative pb-14 pl-16 lg:pb-0 lg:pl-0 lg:pt-16">
              <span className="absolute left-0 top-0 grid h-10 w-10 place-items-center rounded-full border-[3px] border-papel bg-azul-tinta font-sans text-[13px] font-extrabold text-white shadow-suave">
                {p.agora && <span className="absolute inset-0 animate-ping rounded-full bg-azul opacity-50" />}
                <span className="relative">{i + 1}</span>
              </span>
              <p className={`font-sans text-[11px] font-extrabold uppercase tracking-[0.2em] ${p.agora ? 'text-azul' : 'text-azul-tinta/45'}`}>
                {p.agora && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-azul align-middle" />}
                {p.quando}
              </p>
              <div className="mt-4 flex items-baseline gap-3">
                <span className="num text-[4.8rem] leading-[0.8] text-azul-tinta sm:text-[5.6rem]">
                  <NumeroAnimado valor={p.numero} sufixo={p.sufixo} />
                </span>
                <span className="max-w-[9ch] text-[13px] font-bold leading-tight text-azul-tinta/50">{p.unidade}</span>
              </div>
              <m.h3
                className="mt-5 font-titulo text-[1.9rem] font-black uppercase leading-[0.92] text-azul-tinta [font-stretch:72%]"
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.2 + i * 0.08 }}
              >
                {p.titulo}
              </m.h3>
              <p className="mt-3 max-w-[34ch] text-[15.5px] leading-relaxed text-azul-tinta/65">{p.texto}</p>
            </Surge>
          ))}
        </ol>
      </div>
    </section>
  )
}

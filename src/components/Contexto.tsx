import { m } from 'motion/react'
import { CONTEXTO, LETREIRO, NUMEROS } from '../data/conteudo'
import { EASE, NumeroAnimado, PalavrasAcendem, Surge } from '../lib/movimento'

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

export function Contexto() {
  return (
    <section id="contexto" className="arco z-10 bg-papel pb-24 pt-24 sm:pb-32 sm:pt-32">
      <div className="container">
        <Surge>
          <span className="rotulo text-azul">A eleição</span>
        </Surge>
        <PalavrasAcendem
          texto={CONTEXTO}
          className="equilibra mt-8 max-w-[22ch] font-titulo text-[2.15rem] font-extrabold leading-[1.02] tracking-[-0.02em] text-azul-tinta sm:text-6xl lg:max-w-[24ch] lg:text-[5.1rem] [font-stretch:82%]"
        />

        <ul className="mt-20 grid grid-cols-2 gap-x-5 gap-y-12 lg:mt-28 lg:grid-cols-4">
          {NUMEROS.map((n, i) => (
            <Surge as="li" key={n.rotulo} atraso={i * 0.08} className="relative pt-6">
              <m.span
                aria-hidden
                className="absolute left-0 top-0 h-[3px] w-full origin-left bg-azul-tinta"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: EASE, delay: 0.2 + i * 0.1 }}
              />
              <div className="num text-[4.6rem] leading-[0.85] text-azul sm:text-[6.5rem]">
                <NumeroAnimado valor={n.valor} sufixo={'sufixo' in n ? n.sufixo : ''} />
              </div>
              <p className="mt-3 font-titulo text-xl font-extrabold uppercase leading-none [font-stretch:80%] sm:text-2xl">{n.rotulo}</p>
              <p className="mt-2 max-w-[22ch] text-[15px] leading-snug text-azul-tinta/60">{n.detalhe}</p>
            </Surge>
          ))}
        </ul>
      </div>
    </section>
  )
}

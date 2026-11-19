import { useEffect, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { Share2, Stamp } from 'lucide-react'
import { CONFIG } from '../config'
import { TituloRevela, rolarPara } from '../lib/movimento'
import { Impressao, Logo } from './Marca'

const BASE = import.meta.env.BASE_URL

export function Rodape() {
  return (
    <footer className="arco relative z-[70] overflow-hidden bg-vermelho text-white">
      {/* fechamento: volta ao vermelho do começo, com o carimbo já dado */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_30%,rgba(255,96,72,0.35),transparent_70%),radial-gradient(120%_90%_at_50%_40%,transparent_55%,rgba(28,3,3,0.6))]" />
      <div className="container relative grid items-center gap-10 pb-16 pt-24 lg:grid-cols-[1fr_auto] lg:gap-16 lg:pt-28">
        <div>
          <p className="rotulo text-white/80">Até 1º de fevereiro</p>
          <h2 className="titulo mt-5 max-w-[12ch]">
            <TituloRevela texto="Todo NÃO conta." destaque={['NÃO']} classeDestaque="bg-azul px-[0.1em] text-white" />
          </h2>
          <p className="mt-6 max-w-[40ch] text-lg leading-relaxed text-white/80">
            O voto é secreto, mas o seu deputado vai saber o que a base pensa. Assine e espalhe.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => rolarPara('assine')} className="btn-azul h-16 px-9 text-[19px]" data-rastreio="cta:fechamento">
              <Stamp size={21} /> Assine o NÃO
            </button>
            <a
              className="btn h-16 border-2 border-white/80 px-8 text-[17px] text-white hover:bg-white hover:text-vermelho"
              href={`https://wa.me/?text=${encodeURIComponent(`O Motta não. Veja quem já disse NÃO e cobre o seu deputado: https://${CONFIG.site}`)}`}
              target="_blank"
              rel="noopener"
              data-rastreio="compartilhar:fechamento"
            >
              <Share2 size={19} /> Mandar no WhatsApp
            </a>
          </div>
        </div>
        <div className="relative mx-auto aspect-square w-[min(78vw,400px)]">
          <img src={`${BASE}motta-760.webp`} alt="" aria-hidden loading="lazy" className="h-full w-full object-cover [mask-image:radial-gradient(closest-side,#000_70%,transparent)]" />
          <Impressao className="absolute left-[30%] top-[15.7%] w-[57%] rotate-[16deg]" id="tinta-rodape" />
        </div>
      </div>

      <div className="relative bg-azul-fundo pb-28 pt-10 text-[13px] leading-relaxed text-white/55 sm:pb-10">
        <div className="container grid gap-8 sm:grid-cols-[auto_1fr_auto] sm:items-start">
          <Logo className="text-[26px] text-white" />
          <div className="space-y-2 sm:px-6">
            <p>
              Iniciativa de apoiadores da candidatura de Luiz Philippe de Orleans e Bragança à Presidência da Câmara dos Deputados. Responsável:{' '}
              <b className="text-white">{CONFIG.responsavel}</b>.
            </p>
            <p>Ilustração produzida a partir de foto pública, com tratamento gráfico em estêncil. Informações com fonte jornalística indicada. Mapa e municípios: IBGE. Deputados: Câmara dos Deputados (dados abertos).</p>
          </div>
          <div className="space-y-1.5 sm:text-right">
            <a href={`${BASE}privacidade.html`} className="block font-bold text-white hover:underline">
              Política de Privacidade
            </a>
            <p>
              Encarregado (LGPD): {CONFIG.encarregado.nome}
              <br />
              <a href={`mailto:${CONFIG.encarregado.email}`} className="text-white hover:underline">
                {CONFIG.encarregado.email}
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

/** CTA fixo no celular: some na abertura e onde já há CTA próprio. */
export function BarraFixa({ ativa }: { ativa: boolean }) {
  const [visivel, setVisivel] = useState(false)
  useEffect(() => {
    const ocultas = new Set<string>()
    const ids = ['inicio', 'recado', 'assine']
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => (e.isIntersecting ? ocultas.add(e.target.id) : ocultas.delete(e.target.id)))
        setVisivel(ocultas.size === 0)
      },
      { threshold: 0.08 },
    )
    const t = setTimeout(() => ids.forEach((id) => document.getElementById(id) && io.observe(document.getElementById(id)!)), 1200)
    return () => {
      clearTimeout(t)
      io.disconnect()
    }
  }, [])
  return (
    <AnimatePresence>
      {ativa && visivel && (
        <m.div
          className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[calc(12px+env(safe-area-inset-bottom))] lg:hidden"
          initial={{ y: '120%' }}
          animate={{ y: 0 }}
          exit={{ y: '120%' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <button type="button" onClick={() => rolarPara('assine')} className="btn-azul h-[60px] w-full shadow-flutua" data-rastreio="cta:barra_fixa">
            <Stamp size={20} /> Assine o NÃO
          </button>
        </m.div>
      )}
    </AnimatePresence>
  )
}

import { useEffect, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { Stamp } from 'lucide-react'
import { CONFIG } from '../config'
import { rolarPara } from '../lib/movimento'

const BASE = import.meta.env.BASE_URL

export function Rodape() {
  return (
    <footer className="arco z-[70] overflow-hidden bg-azul-fundo pb-32 pt-20 text-white/60 sm:pb-12">
      <div className="container">
        <p className="display select-none text-[22vw] leading-[0.78] text-white lg:text-[16rem]" aria-hidden>
          O MOTTA <span className="text-azul-vivo">NÃO.</span>
        </p>
        <div className="mt-14 grid gap-8 border-t border-white/10 pt-8 text-[13.5px] leading-relaxed sm:grid-cols-[2fr_1fr]">
          <div className="space-y-3">
            <p>
              Iniciativa de apoiadores da candidatura de Luiz Philippe de Orleans e Bragança à Presidência da Câmara dos Deputados. Responsável:{' '}
              <b className="text-white">{CONFIG.responsavel}</b>.
            </p>
            <p>Ilustração produzida a partir de foto pública, com tratamento gráfico em estêncil. Informações com fonte jornalística indicada. Mapa: malha territorial do IBGE.</p>
          </div>
          <div className="space-y-2 sm:text-right">
            <a href={`${BASE}privacidade.html`} className="block font-bold text-white hover:underline">
              Política de Privacidade
            </a>
            <p>
              Encarregado de dados (LGPD): {CONFIG.encarregado.nome} · <a href={`mailto:${CONFIG.encarregado.email}`} className="text-white hover:underline">{CONFIG.encarregado.email}</a>
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

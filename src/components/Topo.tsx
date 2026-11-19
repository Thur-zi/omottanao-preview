import { useEffect, useState } from 'react'
import { AnimatePresence, m, useMotionValueEvent, useScroll } from 'motion/react'
import { EASE, EASE_CINEMA, rolarPara } from '../lib/movimento'
import { Logo } from './Marca'
import { CONFIG } from '../config'
import { useConteudo } from '../lib/conteudo'

const LINKS = [
  ['recado', 'Cobre seu deputado'],
  ['votometro', 'Votômetro'],
  ['por-que-nao', 'Por que não'],
  ['alternativa', 'A alternativa'],
] as const

export function Topo({ visivel }: { visivel: boolean }) {
  useConteudo()
  const links = LINKS.filter(([id]) => id !== 'votometro' || CONFIG.mostrarVotometro)
  const [solido, setSolido] = useState(false)
  const [menu, setMenu] = useState(false)
  const { scrollY, scrollYProgress } = useScroll()
  useMotionValueEvent(scrollY, 'change', (v) => setSolido(v > window.innerHeight * 0.7))

  useEffect(() => {
    document.documentElement.style.overflow = menu ? 'hidden' : ''
  }, [menu])

  const ir = (id: string) => {
    setMenu(false)
    setTimeout(() => rolarPara(id), menu ? 350 : 0)
  }

  return (
    <>
      <m.header
        className="fixed inset-x-0 top-0 z-50"
        initial={false}
        animate={{ y: visivel ? 0 : '-110%' }}
        transition={{ duration: 0.9, ease: EASE, delay: visivel ? 0.6 : 0 }}
      >
        <div
          className={`transition-[background-color,backdrop-filter,box-shadow] duration-500 ${
            solido ? 'bg-azul-fundo/95 shadow-[0_1px_0_rgba(255,255,255,0.06)]' : 'bg-transparent'
          }`}
        >
          <div className="container flex h-[68px] items-center justify-between gap-6 text-white">
            <a href="#inicio" onClick={(e) => (e.preventDefault(), window.scrollTo({ top: 0, behavior: 'smooth' }))} aria-label="Início">
              <Logo className="text-[24px] sm:text-[27px]" />
            </a>
            <nav className="hidden items-center gap-8 lg:flex" aria-label="Principal">
              {links.map(([id, txt]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(e) => (e.preventDefault(), ir(id))}
                  className="group relative py-2 font-sans text-[13px] font-bold tracking-wide text-white/80 transition-colors hover:text-white"
                >
                  {txt}
                  <span className="absolute -bottom-0.5 left-0 h-[2px] w-full origin-right scale-x-0 bg-azul-vivo transition-transform duration-300 group-hover:origin-left group-hover:scale-x-100" />
                </a>
              ))}
              <a href="#assine" onClick={(e) => (e.preventDefault(), ir('assine'))} className="btn-branco h-11 px-6 text-[15px]" data-rastreio="cta:topo">
                Assine o NÃO
              </a>
            </nav>
            <button
              type="button"
              className="relative -mr-2 grid h-12 w-12 place-items-center lg:hidden"
              aria-expanded={menu}
              aria-controls="menu-movel"
              aria-label={menu ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMenu((v) => !v)}
            >
              <span className={`absolute h-[2.5px] w-6 bg-white transition-transform duration-300 ${menu ? 'rotate-45' : '-translate-y-[5px]'}`} />
              <span className={`absolute h-[2.5px] w-6 bg-white transition-transform duration-300 ${menu ? '-rotate-45' : 'translate-y-[5px]'}`} />
            </button>
          </div>
          <m.div className="h-[2px] origin-left bg-azul-vivo" style={{ scaleX: scrollYProgress }} />
        </div>
      </m.header>

      <AnimatePresence>
        {menu && (
          <m.div
            id="menu-movel"
            className="fixed inset-0 z-40 flex flex-col justify-between bg-azul-fundo px-6 pb-10 pt-28 text-white lg:hidden"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.6, ease: EASE_CINEMA }}
          >
            <nav className="flex flex-col gap-1" aria-label="Menu">
              {links.map(([id, txt], i) => (
                <m.a
                  key={id}
                  href={`#${id}`}
                  onClick={(e) => (e.preventDefault(), ir(id))}
                  className="titulo-md flex items-center justify-between border-b border-white/10 py-4 text-[2.4rem]"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.15 + i * 0.06 }}
                >
                  {txt}
                  <span className="font-sans text-sm text-white/40">0{i + 1}</span>
                </m.a>
              ))}
            </nav>
            <m.a
              href="#assine"
              onClick={(e) => (e.preventDefault(), ir('assine'))}
              className="btn-azul w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.4 }}
              data-rastreio="cta:menu"
            >
              Assine o NÃO
            </m.a>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}

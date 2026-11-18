/**
 * Abertura cinematográfica: a tela abre como cinema, o carimbo 3D paira sobre a testa,
 * o CTA dispara o golpe e só então o site "abre" (barras recolhem, título sobe, rolagem libera).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, m, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { EASE, EASE_CINEMA, rolarPara, travarRolagem, useMagnetico } from '../lib/movimento'
import { rastrear } from '../lib/rastreio'
import { Stamp } from 'lucide-react'
import { Impressao, SetaBaixo } from './Marca'
import type { CenaCarimbo } from '../three/carimbo'

type Fase = 'espera' | 'golpe' | 'aberto'

/** Testa do Motta, em fração da foto (x, y do centro), largura da marca e giro horário. */
const ALVO = { x: 0.52, y: 0.235, largura: 0.56, giro: 12 }
const PROPORCAO_MARCA = 142 / 460

const BASE = import.meta.env.BASE_URL

type Particula = { x: number; y: number; vx: number; vy: number; r: number; vida: number; cor: string }

export function Abertura({ aberto, aoAbrir }: { aberto: boolean; aoAbrir: () => void }) {
  const reduz = useReducedMotion()
  const [fase, setFase] = useState<Fase>(aberto ? 'aberto' : 'espera')
  const [marcado, setMarcado] = useState(aberto)
  const secao = useRef<HTMLElement>(null)
  const palco = useRef<HTMLDivElement>(null)
  const foto = useRef<HTMLDivElement>(null)
  const tela3d = useRef<HTMLCanvasElement>(null)
  const telaParticulas = useRef<HTMLCanvasElement>(null)
  const sombra = useRef<HTMLDivElement>(null)
  const onda = useRef<HTMLDivElement>(null)
  const flash = useRef<HTMLDivElement>(null)
  const cena = useRef<CenaCarimbo | null>(null)
  const faseRef = useRef(fase)
  faseRef.current = fase
  const cta = useMagnetico<HTMLButtonElement>(0.3)

  /* ---------- posição da testa em pixels da seção ---------- */
  const pontoAlvo = useCallback(() => {
    const s = secao.current?.getBoundingClientRect()
    const f = foto.current?.getBoundingClientRect()
    if (!s || !f) return null
    return { x: f.left - s.left + ALVO.x * f.width, y: f.top - s.top + ALVO.y * f.height, largura: ALVO.largura * f.width }
  }, [])

  const posicionar = useCallback(() => {
    const p = pontoAlvo()
    if (p && cena.current) cena.current.definirAlvo(p.x, p.y, p.largura / 0.98, ALVO.giro)
  }, [pontoAlvo])

  /* ---------- trava a rolagem enquanto espera o golpe ---------- */
  useEffect(() => {
    if (fase !== 'espera') return
    travarRolagem(true)
    return () => travarRolagem(false)
  }, [fase])

  /* ---------- carrega o three.js e o carimbo (só na abertura) ---------- */
  useEffect(() => {
    if (aberto || !tela3d.current) return
    let vivo = true
    let ro: ResizeObserver | null = null
    import('../three/carimbo')
      .then(({ CenaCarimbo }) => {
        if (!vivo || !tela3d.current) return
        const c = new CenaCarimbo(tela3d.current)
        cena.current = c
        c.aoAproximar = (prox, x, y) => {
          const el = sombra.current
          if (!el) return
          el.style.opacity = String(prox * 0.75)
          el.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%) scale(${0.55 + prox * 0.6}) rotate(${ALVO.giro}deg)`
        }
        posicionar()
        ro = new ResizeObserver(posicionar)
        if (secao.current) ro.observe(secao.current)
        // espera a abertura das barras para o carimbo entrar
        setTimeout(() => vivo && faseRef.current === 'espera' && c.entrar(), reduz ? 0 : 1300)
      })
      .catch(() => {
        /* sem WebGL: segue com o carimbo 2D */
      })
    return () => {
      vivo = false
      ro?.disconnect()
      cena.current?.dispose()
      cena.current = null
    }
  }, [aberto, posicionar, reduz])

  /* ---------- efeitos do impacto ---------- */
  const explodir = useCallback((x: number, y: number) => {
    const c = telaParticulas.current
    if (!c) return
    const dpr = Math.min(window.devicePixelRatio, 2)
    c.width = c.clientWidth * dpr
    c.height = c.clientHeight * dpr
    const g = c.getContext('2d')!
    g.scale(dpr, dpr)
    const cores = ['#ffffff', '#ffffff', '#0B1E5E', '#1F4FE0', '#3A0707']
    const ps: Particula[] = Array.from({ length: 64 }, () => {
      const a = Math.random() * Math.PI * 2
      const v = 2 + Math.random() * 9
      return { x, y, vx: Math.cos(a) * v * 1.4, vy: Math.sin(a) * v - 3, r: 1 + Math.random() * 3.6, vida: 1, cor: cores[(Math.random() * cores.length) | 0] }
    })
    const passo = () => {
      g.clearRect(0, 0, c.clientWidth, c.clientHeight)
      let algum = false
      for (const p of ps) {
        if (p.vida <= 0) continue
        algum = true
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.42
        p.vx *= 0.97
        p.vida -= 0.022
        g.globalAlpha = Math.max(0, p.vida)
        g.fillStyle = p.cor
        g.beginPath()
        g.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        g.fill()
      }
      if (algum) requestAnimationFrame(passo)
      else g.clearRect(0, 0, c.clientWidth, c.clientHeight)
    }
    requestAnimationFrame(passo)
  }, [])

  const impacto = useCallback(() => {
    setMarcado(true)
    navigator.vibrate?.(40)
    const p = pontoAlvo()
    if (palco.current)
      animate(palco.current, { x: [0, -14, 11, -7, 4, -2, 0], y: [0, 9, -7, 4, -2, 1, 0] }, { duration: 0.42, ease: 'easeOut' })
    if (flash.current) animate(flash.current, { opacity: [0.55, 0] }, { duration: 0.35, ease: 'easeOut' })
    if (p && onda.current) {
      onda.current.style.left = `${p.x}px`
      onda.current.style.top = `${p.y}px`
      animate(onda.current, { scale: [0.2, 3.4], opacity: [0.9, 0] }, { duration: 0.85, ease: [0.16, 1, 0.3, 1] })
    }
    if (p) explodir(p.x, p.y)
  }, [explodir, pontoAlvo])

  const abrir = useCallback(() => {
    setFase('aberto')
    travarRolagem(false)
    try {
      sessionStorage.setItem('omn:carimbado', '1')
    } catch {
      /* sem storage */
    }
    aoAbrir()
  }, [aoAbrir])

  const golpe = useCallback(async () => {
    if (faseRef.current !== 'espera') return
    setFase('golpe')
    rastrear('carimbo', { local: 'abertura' })
    if (cena.current) {
      await cena.current.bater(impacto)
    } else {
      await new Promise((r) => setTimeout(r, 380))
      impacto()
      await new Promise((r) => setTimeout(r, 900))
    }
    abrir()
  }, [abrir, impacto])

  /* tentar rolar durante a espera também dispara o golpe */
  useEffect(() => {
    if (fase !== 'espera') return
    const dispara = () => golpe()
    const tecla = (e: KeyboardEvent) => ['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key) && golpe()
    window.addEventListener('wheel', dispara, { passive: true })
    window.addEventListener('touchmove', dispara, { passive: true })
    window.addEventListener('keydown', tecla)
    return () => {
      window.removeEventListener('wheel', dispara)
      window.removeEventListener('touchmove', dispara)
      window.removeEventListener('keydown', tecla)
    }
  }, [fase, golpe])

  const apontar = (e: React.PointerEvent) => {
    if (!cena.current || e.pointerType === 'touch') return
    const r = e.currentTarget.getBoundingClientRect()
    cena.current.apontar(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1)
  }

  /* ---------- paralaxe depois de aberto ---------- */
  const { scrollY } = useScroll()
  const yFoto = useTransform(scrollY, [0, 900], [0, reduz ? 0 : 160])
  const escalaFoto = useTransform(scrollY, [0, 900], [1, reduz ? 1 : 1.12])
  const yTitulo = useTransform(scrollY, [0, 700], [0, reduz ? 0 : -110])
  const opTitulo = useTransform(scrollY, [0, 520], [1, 0])

  const abertoAgora = fase === 'aberto'
  const barra = abertoAgora ? '0svh' : fase === 'golpe' ? '12svh' : '8svh'

  return (
    <section
      ref={secao}
      id="inicio"
      aria-label="O Motta não"
      onPointerMove={apontar}
      className="grao relative isolate h-[100svh] min-h-[600px] overflow-hidden bg-vermelho text-white"
    >
      {/* luz e vinheta */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_50%_at_50%_38%,rgba(255,96,72,0.38),transparent_70%),radial-gradient(130%_95%_at_50%_45%,transparent_52%,rgba(28,3,3,0.72))]" />

      {/* palavra gigante ao fundo */}
      <m.div
        aria-hidden
        className="display pointer-events-none absolute inset-x-0 top-1/2 -translate-y-[54%] select-none text-center text-[58vw] md:text-[44vw]"
        initial={false}
        animate={{ opacity: abertoAgora ? 1 : 0.55, scale: abertoAgora ? 1 : 1.06 }}
        transition={{ duration: 1.6, ease: EASE }}
        style={{ WebkitTextStroke: '2px rgba(58,7,7,0.38)', color: abertoAgora ? 'rgba(120,12,12,0.35)' : 'transparent' }}
      >
        NÃO
      </m.div>

      <div ref={palco} className="absolute inset-0">
        <m.div style={{ y: yFoto, scale: escalaFoto }} className="absolute inset-0">
          {/* centralizado por posição absoluta: em telas estreitas a foto é mais larga que a tela e precisa vazar igual dos dois lados */}
          <div ref={foto} className="absolute left-1/2 top-[45%] aspect-square w-[min(112vw,78svh)] -translate-x-1/2 -translate-y-1/2 md:top-[48%]">
            <m.img
              src={`${BASE}motta-760.webp`}
              srcSet={`${BASE}motta-760.webp 760w, ${BASE}motta-1400.webp 1400w`}
              sizes="(min-width: 900px) 78vh, 112vw"
              width={1400}
              height={1400}
              alt="Ilustração em estêncil de Hugo Motta"
              {...{ fetchpriority: 'high' }}
              draggable={false}
              className="h-full w-full select-none object-cover [mask-image:radial-gradient(closest-side,#000_72%,transparent_100%)]"
              initial={reduz || aberto ? false : { opacity: 0, scale: 1.14, filter: 'brightness(0.25) blur(12px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'brightness(1) blur(0px)' }}
              transition={{ duration: 2.4, ease: EASE, delay: 0.2 }}
            />
            <AnimatePresence>
              {marcado && (
                <m.div
                  className="pointer-events-none absolute"
                  style={{
                    left: `${(ALVO.x - ALVO.largura / 2) * 100}%`,
                    top: `${(ALVO.y - (ALVO.largura * PROPORCAO_MARCA) / 2) * 100}%`,
                    width: `${ALVO.largura * 100}%`,
                    rotate: ALVO.giro,
                  }}
                  initial={aberto ? false : { opacity: 0, scale: 1.3 }}
                  animate={{ opacity: 0.97, scale: 1 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  <Impressao className="w-full drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]" id="tinta-abertura" />
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </m.div>
      </div>

      {/* efeitos do golpe */}
      <div ref={sombra} aria-hidden className="pointer-events-none absolute left-0 top-0 h-28 w-56 rounded-[50%] bg-black opacity-0 blur-2xl" />
      <canvas ref={tela3d} aria-hidden className="pointer-events-none absolute inset-0 z-[25] h-full w-full" />
      <canvas ref={telaParticulas} aria-hidden className="pointer-events-none absolute inset-0 z-10 h-full w-full" />
      <div ref={onda} aria-hidden className="pointer-events-none absolute z-10 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white opacity-0" />
      <div ref={flash} aria-hidden className="pointer-events-none absolute inset-0 z-10 bg-white opacity-0 mix-blend-overlay" />

      {/* barras de cinema */}
      {(['top', 'bottom'] as const).map((lado) => (
        <m.div
          key={lado}
          aria-hidden
          className={`absolute inset-x-0 z-20 overflow-hidden bg-black ${lado === 'top' ? 'top-0' : 'bottom-0'}`}
          initial={aberto ? false : { height: '50.5svh' }}
          animate={{ height: barra }}
          transition={{ duration: abertoAgora ? 1.1 : 1.5, ease: EASE_CINEMA, delay: fase === 'espera' ? 0.15 : 0 }}
        >
          <m.div
            className={`absolute inset-x-0 flex items-center justify-between px-5 font-sans text-[10px] font-bold uppercase tracking-rotulo text-white/55 sm:px-8 sm:text-[11px] ${lado === 'top' ? 'bottom-3' : 'top-3'}`}
            animate={{ opacity: fase === 'espera' ? 1 : 0 }}
            transition={{ duration: 0.4 }}
          >
            {lado === 'top' ? (
              <>
                <span>Presidência da Câmara</span>
                <span>01 · 02 · 2027</span>
              </>
            ) : (
              <>
                <span>Voto secreto</span>
                <span>257 votos</span>
              </>
            )}
          </m.div>
        </m.div>
      ))}

      {/* CTA cinematográfico */}
      <AnimatePresence>
        {fase === 'espera' && (
          <m.div
            className="absolute inset-x-0 bottom-[calc(8svh+26px)] z-30 flex justify-center"
            initial={reduz ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(6px)', transition: { duration: 0.35 } }}
            transition={{ duration: 1, ease: EASE, delay: 1.9 }}
          >
            <button ref={cta} type="button" onClick={golpe} className="group relative grid place-items-center rounded-full transition-transform duration-300 ease-out">
              <span aria-hidden className="absolute inset-0 animate-respira rounded-full border-2 border-white/80" />
              <span aria-hidden className="absolute inset-0 animate-respira rounded-full border border-white/60 [animation-delay:1.2s]" />
              <span className="btn-azul h-[66px] px-10 text-[20px] shadow-[0_24px_60px_-18px_rgba(4,11,38,0.9)] sm:h-[72px] sm:px-12 sm:text-[22px]">
                Diga não ao Motta
                <Stamp size={22} strokeWidth={2.4} aria-hidden className="transition-transform duration-300 group-hover:translate-y-1" />
              </span>
            </button>
          </m.div>
        )}
      </AnimatePresence>

      {/* depois do golpe: título, legendas e "explorar" */}
      <m.div style={{ y: yTitulo, opacity: opTitulo }} className="pointer-events-none absolute inset-x-0 bottom-[12svh] z-20 px-4 text-center md:bottom-[10svh]">
        <h1 className="display whitespace-nowrap text-[15.5vw] leading-[0.8] drop-shadow-[0_10px_40px_rgba(28,3,3,0.55)] md:text-[min(10vw,10.5rem)]">
          {['O', 'MOTTA', 'NÃO.'].map((p, i) => (
            <span key={p} className="inline-block overflow-hidden pb-[0.06em] align-bottom">
              <m.span
                className={`inline-block ${p === 'NÃO.' ? 'bg-azul px-[0.12em] pt-[0.04em] text-white' : ''}`}
                initial={aberto || reduz ? false : { y: '115%' }}
                animate={abertoAgora ? { y: '0%' } : undefined}
                transition={{ duration: 1.05, ease: EASE, delay: 0.35 + i * 0.09 }}
              >
                {p}
              </m.span>
              {i < 2 && <span>&nbsp;</span>}
            </span>
          ))}
        </h1>
      </m.div>

      <m.div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden items-end justify-between px-8 pb-7 font-sans text-[11px] font-bold uppercase tracking-rotulo text-white/70 md:flex"
        initial={false}
        animate={{ opacity: abertoAgora ? 1 : 0 }}
        transition={{ duration: 0.8, delay: abertoAgora ? 1 : 0 }}
      >
        <span>
          Presidência da Câmara
          <br />
          <b className="text-white">1º de fevereiro de 2027</b>
        </span>
        <span className="text-right">
          Voto secreto
          <br />
          <b className="text-white">257 votos para vencer</b>
        </span>
      </m.div>

      <AnimatePresence>
        {abertoAgora && (
          <m.button
            type="button"
            onClick={() => rolarPara('contexto', 0)}
            className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-1.5 px-6 py-2 font-sans text-[11px] font-extrabold uppercase tracking-rotulo text-white"
            initial={aberto ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: aberto ? 0 : 1.1 }}
            data-rastreio="explorar:abertura"
          >
            Explorar
            <span className="relative block h-10 w-6 overflow-hidden">
              <SetaBaixo className="absolute inset-0 h-10 w-6 animate-desce" />
            </span>
          </m.button>
        )}
      </AnimatePresence>
    </section>
  )
}

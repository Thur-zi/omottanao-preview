import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, m, useInView } from 'motion/react'
import { MapPin, MessageCircle, Send, X } from 'lucide-react'
import { CONFIG } from '../config'
import { CADEIRAS, NOMES_UF, UFS, intensidade, resumo, totais, type Registro, type UF } from '../data/votometro'
import { carregarConteudo, useConteudo } from '../lib/conteudo'
import { definirUF, useUF } from '../lib/estado'
import { EASE, NumeroAnimado, Surge, TituloRevela, rolarPara } from '../lib/movimento'
import { linkWhatsapp, rastrear, temWhatsapp } from '../lib/rastreio'
import type { CenaMapa, DadosMapa } from '../three/mapa'

const BASE = import.meta.env.BASE_URL

/* ---------------- hemiciclo: as 513 cadeiras ---------------- */
function useCadeiras() {
  return useMemo(() => {
    const fileiras = 13
    const pts: { x: number; y: number; a: number }[] = []
    const raios = Array.from({ length: fileiras }, (_, i) => 0.44 + (i / (fileiras - 1)) * 0.56)
    const soma = raios.reduce((s, r) => s + r, 0)
    let resto = 513
    raios.forEach((r, i) => {
      const n = i === fileiras - 1 ? resto : Math.round((513 * r) / soma)
      resto -= n
      for (let j = 0; j < n; j++) {
        const a = Math.PI - (j / (n - 1)) * Math.PI
        pts.push({ x: 100 + Math.cos(a) * r * 96, y: 100 - Math.sin(a) * r * 96, a })
      }
    })
    return pts.sort((p, q) => q.a - p.a) // da esquerda para a direita
  }, [])
}

function Hemiciclo() {
  const cadeiras = useCadeiras()
  const ref = useRef<SVGSVGElement>(null)
  const visto = useInView(ref, { once: true, margin: '-15% 0px' })
  const { motta, nao } = totais()
  const marco = cadeiras[256]
  return (
    <svg ref={ref} viewBox="0 0 200 108" className="w-full" role="img" aria-label={`${nao} de 513 deputados já disseram não; ${motta} declararam apoio ao Motta. Maioria: 257.`}>
      {/* uma transição só para o conjunto (513 transições separadas travavam o celular) */}
      <g style={{ opacity: visto ? 1 : 0, transform: visto ? 'none' : 'translateY(6px)', transition: 'opacity .8s ease-out, transform .9s cubic-bezier(.22,1,.36,1)' }}>
        {cadeiras.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.05} fill={i < motta ? '#E02A2A' : i >= 513 - nao ? '#3D7BFF' : '#2A3a64'} />
        ))}
      </g>
      {marco && (
        <g style={{ opacity: visto ? 1 : 0, transition: 'opacity .6s 1s' }}>
          <line x1={100 + (marco.x - 100) * (36 / Math.hypot(marco.x - 100, marco.y - 100))} y1={100 + (marco.y - 100) * (36 / Math.hypot(marco.x - 100, marco.y - 100))} x2={100 + (marco.x - 100) * 1.06} y2={100 + (marco.y - 100) * 1.06} stroke="#FFFFFF" strokeWidth={0.5} strokeDasharray="1.4 1.4" />
        </g>
      )}
      <text x={100} y={92} textAnchor="middle" className="fill-white font-titulo" style={{ fontSize: 18, fontWeight: 900, fontStretch: '75%' }}>
        257
      </text>
      <text x={100} y={102} textAnchor="middle" className="fill-white/60" style={{ fontSize: 4, fontWeight: 700, letterSpacing: 0.7 }}>
        VOTOS PARA VENCER
      </text>
    </svg>
  )
}

/* ---------------- painel triplo ---------------- */
const iniciais = (n: string) =>
  n
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

function Deputado({ r, i }: { r: Registro; i: number }) {
  return (
    <m.li
      className="flex h-10 min-w-0 items-center gap-2.5 rounded-xl bg-white/[0.05] pl-1 pr-3"
      title={`${r.nome} (${r.partido}) · Fonte: ${r.fonte}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE, delay: 0.25 + Math.min(i, 8) * 0.04 }}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 font-sans text-[10px] font-extrabold ring-[1.5px] ring-current">
        {r.foto ? <img src={r.foto} alt="" className="h-full w-full object-cover" loading="lazy" /> : iniciais(r.nome) || '?'}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-white">{r.nome}</span>
      {r.partido && <span className="shrink-0 text-[11px] font-bold text-white/45">{r.partido}</span>}
    </m.li>
  )
}

type Tipo = 'motta' | 'convencer' | 'nao'
const TIPOS = {
  motta: { titulo: 'Querem o Motta', curto: 'Com Motta', cor: 'text-[#FF6B6B]', barra: 'bg-vermelho-vivo', ponto: 'bg-vermelho-vivo', vazio: 'Ninguém daqui declarou apoio em público, com fonte.' },
  convencer: { titulo: 'A convencer', curto: 'A convencer', cor: 'text-white/85', barra: 'bg-aco', ponto: 'bg-aco/60', vazio: '' },
  nao: { titulo: 'Dizem NÃO', curto: 'Dizem NÃO', cor: 'text-azul-claro', barra: 'bg-azul-vivo', ponto: 'bg-azul-vivo', vazio: 'Ninguém daqui disse NÃO em público ainda.' },
} as const

/** Placar de uma coluna: título, número e as cadeiras. */
function Placar({ tipo, n }: { tipo: Tipo; n: number }) {
  const cfg = TIPOS[tipo]
  return (
    <div className="flex min-w-0 flex-col rounded-2xl bg-white/[0.04] px-3 pb-3 pt-2.5 sm:px-4 sm:pb-4 sm:pt-3">
      <span className={`mb-2 block h-1 w-full shrink-0 rounded-full ${cfg.barra}`} />
      <p className="min-h-[2.5em] font-sans text-[10px] font-extrabold uppercase leading-tight tracking-[0.12em] text-white/70 sm:min-h-0 sm:text-[10.5px]">
        <span className="sm:hidden">{cfg.curto}</span>
        <span className="hidden sm:inline">{cfg.titulo}</span>
      </p>
      <p className={`num mt-1 text-[2.4rem] leading-none sm:text-[3.2rem] ${cfg.cor}`}>
        <NumeroAnimado valor={n} duracao={1.1} />
      </p>
      <div className="mt-2 flex flex-wrap gap-[2.5px]" aria-hidden>
        {Array.from({ length: Math.min(n, 60) }, (_, i) => (
          <span key={i} className={`h-[6px] w-[6px] rounded-t-full rounded-b-[1.5px] ${cfg.ponto}`} />
        ))}
      </div>
    </div>
  )
}

/** Lista de nomes com fonte (inteira, com rolagem própria quando é grande). */
function Lista({ tipo, registros }: { tipo: Exclude<Tipo, 'convencer'>; registros: Registro[] }) {
  const cfg = TIPOS[tipo]
  return (
    <div className="min-w-0">
      <p className={`mb-2 flex items-center gap-2 font-sans text-[10.5px] font-extrabold uppercase tracking-[0.14em] ${cfg.cor}`}>
        <i className={`h-2 w-2 rounded-full ${cfg.barra}`} /> {cfg.titulo} · {registros.length}
      </p>
      {registros.length ? (
        <ul className={`space-y-1.5 ${cfg.cor}`}>
          {registros.map((r, i) => (
            <Deputado key={r.nome + i} r={r} i={i} />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-[12.5px] leading-snug text-white/50">{cfg.vazio}</p>
      )}
    </div>
  )
}

function PainelTriplo({ uf, fechar }: { uf: UF; fechar: () => void }) {
  const r = resumo(uf)
  const nao = r.registros.filter((x) => x.posicao === 'nao')
  const motta = r.registros.filter((x) => x.posicao === 'motta')
  return (
    <m.div
      className="absolute inset-x-0 bottom-0 z-20 flex max-h-[74%] flex-col rounded-t-[28px] border-t border-white/10 bg-azul-fundo shadow-flutua lg:inset-y-4 lg:left-auto lg:right-4 lg:max-h-none lg:w-[min(600px,52%)] lg:rounded-[28px] lg:border"
      initial={{ y: '105%' }}
      animate={{ y: 0 }}
      exit={{ y: '105%', transition: { duration: 0.45, ease: EASE } }}
      transition={{ duration: 0.75, ease: EASE }}
      role="dialog"
      aria-label={`Deputados de ${NOMES_UF[uf]}`}
    >
      {/* cabeçalho */}
      <div className="flex shrink-0 items-center gap-3 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
        <img src={`${BASE}bandeiras/${uf}.webp`} alt="" className="h-7 w-10 shrink-0 rounded-[4px] object-cover shadow-[0_0_0_1px_rgba(255,255,255,0.2)]" />
        <div className="min-w-0 flex-1">
          <h3 className={`font-titulo font-black uppercase leading-[0.95] text-white [font-stretch:72%] ${NOMES_UF[uf].length > 12 ? 'text-[1.45rem] sm:text-[2rem]' : 'text-[1.9rem] sm:text-[2.3rem]'}`}>{NOMES_UF[uf]}</h3>
          <p className="mt-1 font-sans text-[10.5px] font-bold uppercase tracking-[0.16em] text-azul-claro">{r.cadeiras} cadeiras na Câmara</p>
        </div>
        <button type="button" onClick={fechar} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10" aria-label="Voltar ao mapa">
          <X size={20} />
        </button>
      </div>

      {/* corpo rolável: placar triplo + nomes */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 sm:px-6" data-lenis-prevent>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Placar tipo="motta" n={r.motta} />
          <Placar tipo="convencer" n={r.convencer} />
          <Placar tipo="nao" n={r.nao} />
        </div>
        <p className="mt-3 text-[13px] leading-snug text-white/60">
          <b className="text-white">{r.convencer} sem posição pública.</b> São esses que precisam ouvir você.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 sm:gap-4">
          <Lista tipo="nao" registros={nao} />
          <Lista tipo="motta" registros={motta} />
        </div>
      </div>

      {/* ações */}
      <div className="flex shrink-0 items-center gap-2.5 border-t border-white/10 px-5 py-4 sm:px-6">
        <button
          type="button"
          className="btn-azul h-12 min-w-0 flex-1 px-4 text-[15px]"
          onClick={() => {
            definirUF(uf)
            rolarPara('recado')
          }}
          data-rastreio={`cta:recado_${uf}`}
        >
          <Send size={17} className="shrink-0" /> Mandar meu recado
        </button>
        {temWhatsapp() && <a
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
          href={linkWhatsapp('fonte', uf)}
          target="_blank"
          rel="noopener"
          data-rastreio="whatsapp_click:fonte"
          aria-label="Enviar a fonte de um posicionamento pelo WhatsApp"
          title="Enviar a fonte de um posicionamento"
        >
          <MessageCircle size={19} />
        </a>}
      </div>
    </m.div>
  )
}

/* ---------------- seção ---------------- */
export function Votometro() {
  useConteudo()
  const TOTAIS_ = totais()
  const ufPessoa = useUF()
  const palco = useRef<HTMLDivElement>(null)
  const tela = useRef<HTMLCanvasElement>(null)
  const camada = useRef<HTMLDivElement>(null)
  const dica = useRef<HTMLDivElement>(null)
  const cena = useRef<CenaMapa | null>(null)
  const [aberto, setAberto] = useState<UF | null>(null)
  // no celular o palco cresce antes do voo, para caber o estado e o painel
  const [expandido, setExpandido] = useState(false)
  const [semWebgl, setSemWebgl] = useState(false)
  const [carregado, setCarregado] = useState(false)
  const perto = useInView(palco, { margin: '1400px 0px', once: true })

  // baixa o three.js e o mapa no tempo ocioso, bem antes da seção (o clique não espera)
  useEffect(() => {
    const ocioso = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    const pre = () => {
      void import('../three/mapa')
      void fetch(`${BASE}brmap.json`)
    }
    if (ocioso) ocioso(pre, { timeout: 4000 })
    else setTimeout(pre, 2000)
  }, [])

  useEffect(() => {
    if (!perto || !tela.current) return
    let vivo = true
    let io: IntersectionObserver | null = null
    Promise.all([import('../three/mapa'), fetch(`${BASE}brmap.json`).then((r) => r.json() as Promise<DadosMapa>), carregarConteudo()])
      .then(([m, dados]) => new Promise<[typeof m, DadosMapa]>((ok) => {
        // monta a cena num momento ocioso, fora do quadro de rolagem
        const ric = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback
        if (ric) ric(() => ok([m, dados]), { timeout: 800 })
        else setTimeout(() => ok([m, dados]), 60)
      }))
      .then(([{ CenaMapa }, dados]) => {
        if (!vivo || !tela.current) return
        const c = new CenaMapa(
          tela.current,
          dados,
          (uf) => {
            const r = resumo(uf as UF)
            return { intensidade: intensidade(uf as UF), nao: r.nao, motta: r.motta, cadeiras: r.cadeiras }
          },
          camada.current ?? undefined,
          ufPessoa,
        )
        c.aoClicar = (uf) => selecionar(uf as UF)
        c.aoPassar = (uf, x, y) => {
          const el = dica.current
          if (!el) return
          if (!uf) {
            el.style.opacity = '0'
            return
          }
          const r = resumo(uf as UF)
          el.innerHTML = `<b>${NOMES_UF[uf as UF]}</b><span>${r.nao} NÃO · ${r.motta} com Motta · ${r.cadeiras} cadeiras</span>`
          el.style.opacity = '1'
          el.style.transform = `translate(${x}px, ${y}px) translate(-50%, calc(-100% - 18px))`
        }
        cena.current = c
        if (import.meta.env.DEV) (window as unknown as { __mapa: CenaMapa }).__mapa = c
        setCarregado(true)
        io = new IntersectionObserver(([e]) => c.definirVisivel(e.isIntersecting), { threshold: 0 })
        if (palco.current) io.observe(palco.current)
      })
      .catch(() => setSemWebgl(true))
    return () => {
      vivo = false
      io?.disconnect()
      cena.current?.dispose()
      cena.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perto])

  async function selecionar(uf: UF) {
    if (aberto) return
    rastrear('estado_visto', { uf })
    const r = palco.current?.getBoundingClientRect()
    if (r && (r.top < 0 || r.bottom > window.innerHeight)) {
      rolarPara('palco-mapa', -80)
      await new Promise((ok) => setTimeout(ok, 700))
    }
    if (window.innerWidth < 640) {
      setExpandido(true)
      await new Promise((ok) => setTimeout(ok, 480))
    }
    if (cena.current) await cena.current.voarPara(uf)
    setAberto(uf)
  }

  async function fechar() {
    setAberto(null)
    await cena.current?.voltar()
    setExpandido(false)
  }

  return (
    <section id="votometro" className="arco z-20 bg-azul-fundo pb-24 pt-24 text-white sm:pb-32 sm:pt-32">
      <div className="container">
        <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <Surge className="flex flex-wrap items-center gap-3">
              <span className="rotulo text-azul-claro">Votômetro</span>
              {CONFIG.previa && TOTAIS_.temExemplo && <span className="selo-exemplo border-white/30 text-white/60">Prévia · dados fictícios</span>}
            </Surge>
            <h2 className="titulo mt-5">
              <TituloRevela texto="Quem já disse não" destaque={['não']} />
            </h2>
            <Surge atraso={0.15}>
              <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-white/70">
                Deputados que se posicionaram em público contra a reeleição de Hugo Motta. <b className="text-white">Só entra quem tem fonte.</b> Quem não falou ainda está a convencer.
              </p>
            </Surge>
            <Surge atraso={0.2} className="mt-10 flex items-end gap-4">
              <span className="num text-[7rem] leading-[0.78] text-azul-vivo sm:text-[9rem]">
                <NumeroAnimado valor={TOTAIS_.nao} />
              </span>
              <span className="pb-2 text-[15px] font-semibold leading-tight text-white/70">
                deputados já
                <br />
                disseram <b className="text-white">NÃO</b>
              </span>
            </Surge>
          </div>
          <Surge atraso={0.1}>
            <Hemiciclo />
            <div className="mt-3 flex justify-between gap-4 text-[12px] font-semibold text-white/60">
              <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-vermelho-vivo" /> Com Motta · {TOTAIS_.motta}</span>
              <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#2A3a64]" /> A convencer · {TOTAIS_.convencer}</span>
              <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-azul-vivo" /> NÃO · {TOTAIS_.nao}</span>
            </div>
            <p className="mt-5 text-[15px] text-white/70">
              Se 257 deputados disserem NÃO, Motta não chega lá. <b className="text-white">Faltam {257 - TOTAIS_.nao}.</b>
            </p>
          </Surge>
        </div>

        {ufPessoa && !aberto && (
          <Surge className="mt-14">
            <button type="button" onClick={() => selecionar(ufPessoa)} className="inline-flex min-h-[52px] items-center gap-3 rounded-full border border-azul-vivo/50 bg-azul/15 px-5 text-[15px] font-semibold text-white transition hover:bg-azul/30">
              <MapPin size={18} className="text-azul-claro" /> Você está em <b>{NOMES_UF[ufPessoa]}</b>. Ver os deputados de {ufPessoa} →
            </button>
          </Surge>
        )}

        {/* palco 3D */}
        <div
          id="palco-mapa"
          data-sem-barra
          ref={palco}
          className={`relative -mx-5 mt-8 overflow-hidden transition-[height,max-height] duration-500 ease-out ${expandido ? 'h-[84svh] max-h-[760px]' : 'h-[62svh] max-h-[560px]'} min-h-[470px] rounded-[22px] sm:mx-0 sm:h-[82svh] sm:max-h-[820px] sm:min-h-[540px] bg-[radial-gradient(90%_70%_at_50%_35%,#11286b_0%,#081a52_45%,#040B26_100%)] sm:mt-10 sm:rounded-[36px]`}
        >
          <canvas ref={tela} className="absolute inset-0 h-full w-full" aria-label="Mapa 3D do Brasil por estado" />
          <div ref={camada} className="pointer-events-none absolute inset-0" aria-hidden />
          <div
            ref={dica}
            className="pointer-events-none absolute left-0 top-0 z-10 flex flex-col rounded-xl bg-white px-3.5 py-2.5 text-azul-tinta opacity-0 shadow-flutua transition-opacity duration-150 [&_b]:font-titulo [&_b]:text-xl [&_b]:font-black [&_b]:uppercase [&_b]:leading-none [&_span]:mt-1 [&_span]:text-[12px] [&_span]:font-semibold"
          />
          <AnimatePresence>
            {!aberto && (
              <m.p
                className="pointer-events-none absolute inset-x-0 top-5 z-10 text-center font-sans text-[12px] font-bold uppercase tracking-rotulo text-white/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: carregado ? 1 : 0 }}
                exit={{ opacity: 0 }}
              >
                Escolha um estado
              </m.p>
            )}
          </AnimatePresence>
          {!carregado && !semWebgl && (
            <div className="absolute inset-0 grid place-items-center">
              <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-azul-vivo" />
            </div>
          )}
          {semWebgl && (
            <p className="absolute inset-0 grid place-items-center p-8 text-center text-white/70">Seu aparelho não abriu o mapa 3D. Escolha o estado na lista abaixo.</p>
          )}
          <div className="pointer-events-none absolute bottom-5 left-5 z-10 hidden flex-col gap-1.5 text-[11px] font-semibold text-white/60 sm:flex">
            <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[#8fb0ff]" /> Mais NÃOs = mais alto</span>
            <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[#b0252b]" /> Mais apoio ao Motta</span>
          </div>
          <AnimatePresence>{aberto && <PainelTriplo key={aberto} uf={aberto} fechar={fechar} />}</AnimatePresence>
        </div>

        {/* lista de estados: alternativa acessível e alvo grande (Fitts) */}
        <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2" role="list" aria-label="Estados">
          {UFS.map((uf) => {
            const r = resumo(uf)
            return (
              <button
                key={uf}
                role="listitem"
                type="button"
                onClick={() => selecionar(uf)}
                className={`group flex h-14 items-center gap-2.5 rounded-xl border px-3 text-left transition hover:border-azul-vivo hover:bg-azul/20 ${
                  uf === ufPessoa ? 'border-azul-vivo bg-azul/25' : 'border-white/10 bg-white/[0.03]'
                }`}
                aria-label={`${NOMES_UF[uf]}: ${r.nao} não, ${r.motta} com Motta, ${CADEIRAS[uf]} cadeiras`}
              >
                <img
                  src={`${BASE}bandeiras/${uf}.webp`}
                  alt=""
                  width={30}
                  height={21}
                  loading="lazy"
                  className="h-[21px] w-[30px] shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_rgba(255,255,255,0.18)] transition-transform group-hover:scale-110"
                />
                <span className="font-titulo text-[19px] font-black leading-none [font-stretch:80%]">{uf}</span>
                <span
                  className={`ml-auto inline-flex h-6 min-w-[26px] items-center justify-center rounded-full px-2 font-sans text-[11px] font-extrabold leading-none tabular-nums ${
                    r.nao > 0 ? 'bg-azul-vivo text-white' : 'bg-white/[0.06] text-white/35'
                  }`}
                  title="disseram NÃO"
                >
                  {r.nao}
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-8 max-w-[70ch] text-[14px] leading-relaxed text-white/50">
          {temWhatsapp() && (
            <>
              Viu um deputado eleito se posicionar?{' '}
              <a href={linkWhatsapp('fonte')} target="_blank" rel="noopener" className="font-bold text-white underline underline-offset-4" data-rastreio="whatsapp_click:fonte">
                Mande a fonte pra gente.
              </a>{' '}
            </>
          )}
          Contamos posições individuais e públicas. O voto é secreto: apoio formal de partido não garante o voto do deputado.
        </p>
      </div>
    </section>
  )
}

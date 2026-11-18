import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, m, useInView } from 'motion/react'
import { ArrowLeft, MapPin, MessageCircle, X } from 'lucide-react'
import { CONFIG } from '../config'
import { CADEIRAS, NOMES_UF, TOTAIS, UFS, intensidade, resumo, type Registro, type UF } from '../data/votometro'
import { definirUF, useUF } from '../lib/estado'
import { EASE, NumeroAnimado, Surge, TituloRevela, rolarPara } from '../lib/movimento'
import { linkWhatsapp, rastrear } from '../lib/rastreio'
import type { CenaMapa, DadosMapa } from '../three/mapa'

const BASE = import.meta.env.BASE_URL

/* ---------------- hemiciclo: as 513 cadeiras ---------------- */
function useCadeiras() {
  return useMemo(() => {
    const fileiras = 13
    const pts: { x: number; y: number; a: number }[] = []
    const raios = Array.from({ length: fileiras }, (_, i) => 0.36 + (i / (fileiras - 1)) * 0.64)
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
  const { motta, nao } = TOTAIS
  const marco = cadeiras[256]
  return (
    <svg ref={ref} viewBox="0 0 200 108" className="w-full" role="img" aria-label={`${nao} de 513 deputados já disseram não; ${motta} declararam apoio ao Motta. Maioria: 257.`}>
      {cadeiras.map((p, i) => {
        const cor = i < motta ? '#E02A2A' : i >= 513 - nao ? '#3D7BFF' : '#2A3a64'
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={2.05}
            fill={cor}
            style={{
              opacity: visto ? 1 : 0,
              transform: visto ? 'none' : 'translateY(6px)',
              transformBox: 'fill-box',
              transition: `opacity .5s ${(i % 513) * 1.6}ms, transform .6s cubic-bezier(.22,1,.36,1) ${(i % 513) * 1.6}ms`,
            }}
          />
        )
      })}
      {marco && (
        <g style={{ opacity: visto ? 1 : 0, transition: 'opacity .6s 1s' }}>
          <line x1={100} y1={100} x2={100 + (marco.x - 100) * 1.06} y2={100 + (marco.y - 100) * 1.06} stroke="#FFFFFF" strokeWidth={0.5} strokeDasharray="1.4 1.4" />
        </g>
      )}
      <text x={100} y={92} textAnchor="middle" className="fill-white font-titulo" style={{ fontSize: 18, fontWeight: 900, fontStretch: '75%' }}>
        257
      </text>
      <text x={100} y={102} textAnchor="middle" className="fill-white/60" style={{ fontSize: 4.6, fontWeight: 700, letterSpacing: 1.2 }}>
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
      className="flex items-start gap-2.5 rounded-xl bg-white/[0.05] p-2.5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.35 + i * 0.04 }}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 font-sans text-[11px] font-extrabold ring-2 ring-current">
        {r.foto ? <img src={r.foto} alt="" className="h-full w-full object-cover" loading="lazy" /> : iniciais(r.nome) || '?'}
      </span>
      <span className="min-w-0 text-white">
        <b className="block break-words text-[13px] font-bold leading-tight">{r.nome}</b>
        <span className="block text-[11px] leading-snug text-white/55">
          {r.partido} · {r.url ? <a href={r.url} target="_blank" rel="noopener" className="underline">{r.fonte}</a> : r.fonte}
        </span>
      </span>
    </m.li>
  )
}

function Coluna({ tipo, n, registros, uf }: { tipo: 'motta' | 'convencer' | 'nao'; n: number; registros: Registro[]; uf: UF }) {
  const cfg = {
    motta: { titulo: 'Querem o Motta', cor: 'text-[#FF6B6B]', barra: 'bg-vermelho-vivo', ponto: 'bg-vermelho-vivo', vazio: 'Ninguém declarou apoio em público, com fonte.' },
    convencer: { titulo: 'A convencer', cor: 'text-white/80', barra: 'bg-aco', ponto: 'bg-aco/60', vazio: '' },
    nao: { titulo: 'Dizem NÃO', cor: 'text-azul-claro', barra: 'bg-azul-vivo', ponto: 'bg-azul-vivo', vazio: 'Ninguém daqui disse NÃO em público ainda.' },
  }[tipo]
  return (
    <div className="min-w-0 rounded-2xl bg-white/[0.04] p-3 sm:p-4">
      <span className={`mb-3 block h-1 w-full rounded-full ${cfg.barra}`} />
      <p className="font-sans text-[10px] font-extrabold uppercase leading-tight tracking-[0.16em] text-white/70 sm:text-[11px]">{cfg.titulo}</p>
      <p className={`num mt-1 text-[3.2rem] leading-none sm:text-[4.4rem] ${cfg.cor}`}>
        <NumeroAnimado valor={n} duracao={1.1} />
      </p>
      <div className="mt-3 flex flex-wrap gap-[3px]" aria-hidden>
        {Array.from({ length: Math.min(n, 70) }, (_, i) => (
          <m.span
            key={i}
            className={`h-[9px] w-[9px] rounded-t-full rounded-b-[2px] ${cfg.ponto}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.25 + i * 0.012 }}
          />
        ))}
      </div>
      {tipo === 'convencer' ? (
        <p className="mt-4 text-[12.5px] leading-snug text-white/60">
          Sem posição pública. <b className="text-white">São esses que precisam ouvir você.</b>
        </p>
      ) : registros.length ? (
        <ul className={`mt-4 space-y-2 ${cfg.cor}`}>
          {registros.map((r, i) => (
            <Deputado key={r.nome + i} r={r} i={i} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[12.5px] leading-snug text-white/50">{cfg.vazio}</p>
      )}
      <span className="sr-only">{NOMES_UF[uf]}</span>
    </div>
  )
}

function PainelTriplo({ uf, fechar }: { uf: UF; fechar: () => void }) {
  const r = resumo(uf)
  const nao = r.registros.filter((x) => x.posicao === 'nao')
  const motta = r.registros.filter((x) => x.posicao === 'motta')
  return (
    <m.div
      className="absolute inset-x-0 bottom-0 z-20 max-h-[64%] overflow-y-auto overscroll-contain rounded-t-[28px] border-t border-white/10 bg-azul-fundo/95 p-4 pb-6 shadow-flutua backdrop-blur-xl sm:p-7 lg:inset-y-4 lg:left-auto lg:right-4 lg:max-h-none lg:w-[min(660px,56%)] lg:rounded-[28px] lg:border"
      initial={{ y: '105%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '105%', opacity: 0, transition: { duration: 0.5, ease: EASE } }}
      transition={{ duration: 0.85, ease: EASE }}
      role="dialog"
      aria-label={`Deputados de ${NOMES_UF[uf]}`}
      data-lenis-prevent
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="rotulo text-azul-claro">{r.cadeiras} cadeiras</p>
          <h3 className="titulo-md mt-2 text-white sm:text-5xl">{NOMES_UF[uf]}</h3>
        </div>
        <button type="button" onClick={fechar} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10" aria-label="Voltar ao mapa">
          <X size={20} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Coluna tipo="motta" n={r.motta} registros={motta} uf={uf} />
        <Coluna tipo="convencer" n={r.convencer} registros={[]} uf={uf} />
        <Coluna tipo="nao" n={r.nao} registros={nao} uf={uf} />
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="btn-azul"
          onClick={() => {
            definirUF(uf)
            rolarPara('recado')
          }}
          data-rastreio={`cta:cobrar_${uf}`}
        >
          Cobrar os deputados de {uf}
        </button>
        <a className="btn-linha text-white" href={linkWhatsapp('fonte', uf)} target="_blank" rel="noopener" data-rastreio="whatsapp_click:fonte">
          <MessageCircle size={18} /> Mandar uma fonte
        </a>
        <button type="button" onClick={fechar} className="btn h-14 text-white/70 hover:text-white sm:ml-auto">
          <ArrowLeft size={18} /> Mapa
        </button>
      </div>
    </m.div>
  )
}

/* ---------------- seção ---------------- */
export function Votometro() {
  const ufPessoa = useUF()
  const palco = useRef<HTMLDivElement>(null)
  const tela = useRef<HTMLCanvasElement>(null)
  const camada = useRef<HTMLDivElement>(null)
  const dica = useRef<HTMLDivElement>(null)
  const cena = useRef<CenaMapa | null>(null)
  const [aberto, setAberto] = useState<UF | null>(null)
  const [semWebgl, setSemWebgl] = useState(false)
  const [carregado, setCarregado] = useState(false)
  const perto = useInView(palco, { margin: '600px 0px', once: true })

  useEffect(() => {
    if (!perto || !tela.current) return
    let vivo = true
    let io: IntersectionObserver | null = null
    Promise.all([import('../three/mapa'), fetch(`${BASE}brmap.json`).then((r) => r.json() as Promise<DadosMapa>)])
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
    if (cena.current) await cena.current.voarPara(uf)
    setAberto(uf)
  }

  async function fechar() {
    setAberto(null)
    await cena.current?.voltar()
  }

  return (
    <section id="votometro" className="arco z-20 bg-azul-fundo pb-24 pt-24 text-white sm:pb-32 sm:pt-32">
      <div className="container">
        <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <Surge className="flex flex-wrap items-center gap-3">
              <span className="rotulo text-azul-claro">Votômetro</span>
              {CONFIG.previa && TOTAIS.temExemplo && <span className="selo-exemplo border-white/30 text-white/60">Prévia · dados fictícios</span>}
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
                <NumeroAnimado valor={TOTAIS.nao} />
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
              <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-vermelho-vivo" /> Com Motta · {TOTAIS.motta}</span>
              <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#2A3a64]" /> A convencer · {TOTAIS.convencer}</span>
              <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-azul-vivo" /> NÃO · {TOTAIS.nao}</span>
            </div>
            <p className="mt-5 text-[15px] text-white/70">
              Se 257 deputados disserem NÃO, Motta não chega lá. <b className="text-white">Faltam {257 - TOTAIS.nao}.</b>
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
          ref={palco}
          className="relative mt-8 h-[82svh] max-h-[820px] min-h-[540px] overflow-hidden rounded-[28px] bg-[radial-gradient(90%_70%_at_50%_35%,#11286b_0%,#081a52_45%,#040B26_100%)] sm:mt-10 sm:rounded-[36px]"
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
        <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2" role="list" aria-label="Estados">
          {UFS.map((uf) => {
            const r = resumo(uf)
            return (
              <button
                key={uf}
                role="listitem"
                type="button"
                onClick={() => selecionar(uf)}
                className={`relative h-14 rounded-xl border font-titulo text-xl font-black transition [font-stretch:80%] hover:border-azul-vivo hover:bg-azul/20 ${
                  uf === ufPessoa ? 'border-azul-vivo bg-azul/25' : 'border-white/10 bg-white/[0.03]'
                }`}
                aria-label={`${NOMES_UF[uf]}: ${r.nao} não, ${r.motta} com Motta, ${CADEIRAS[uf]} cadeiras`}
              >
                {uf}
                {r.nao > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-azul-vivo px-1.5 font-sans text-[10px] font-extrabold">{r.nao}</span>
                )}
              </button>
            )
          })}
        </div>
        <p className="mt-8 max-w-[70ch] text-[14px] leading-relaxed text-white/50">
          Viu um deputado eleito se posicionar?{' '}
          <a href={linkWhatsapp('fonte')} target="_blank" rel="noopener" className="font-bold text-white underline underline-offset-4" data-rastreio="whatsapp_click:fonte">
            Mande a fonte pra gente.
          </a>{' '}
          Contamos posições individuais e públicas. O voto é secreto: apoio formal de partido não garante o voto do deputado.
        </p>
      </div>
    </section>
  )
}

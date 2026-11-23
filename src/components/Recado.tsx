import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { IconeWhatsapp } from './Icones'
import { CONFIG } from '../config'
import { NOMES_UF, UFS, type UF } from '../data/votometro'
import { carregarDeputados, partido, type Deputado } from '../data/partidos'
import { Combobox, type Opcao } from './Combobox'
import { SeloPartido } from './SeloPartido'
import { definirUF, useUF } from '../lib/estado'
import { FRASES_RESUMO, desenharCard, type Formato } from '../lib/desenharCard'
import { Surge, TituloRevela } from '../lib/movimento'
import { rastrear } from '../lib/rastreio'

const BASE = import.meta.env.BASE_URL

export function Recado() {
  const ufGlobal = useUF()
  const [uf, setUf] = useState<UF | ''>(ufGlobal ?? '')
  const [depValor, setDepValor] = useState('')
  const [deputados, setDeputados] = useState<Deputado[]>([])
  const fotoDep = useRef<HTMLImageElement | null>(null)
  const [fotoPronta, setFotoPronta] = useState(0)
  const depSel = deputados.find((d) => String(d.id) === depValor) ?? null
  const deputado = depSel ? depSel.nome : depValor.startsWith('livre:') ? depValor.slice(6) : ''
  const [nome, setNome] = useState('')
  const [frase, setFrase] = useState(0)
  const [formato, setFormato] = useState<Formato>('feed')
  const tela = useRef<HTMLCanvasElement>(null)
  const moldura = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement | null>(null)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    if (ufGlobal) setUf(ufGlobal)
  }, [ufGlobal])

  // os 513 deputados eleitos em 2026 (TSE), que votam em 1º/02/2027 (carrega quando a seção monta)
  useEffect(() => {
    carregarDeputados().then(setDeputados).catch(() => setDeputados([]))
  }, [])

  // foto do deputado escolhido entra no card
  useEffect(() => {
    fotoDep.current = null
    if (!depSel?.foto) return setFotoPronta((n) => n + 1)
    const i = new Image()
    i.onload = () => {
      fotoDep.current = i
      setFotoPronta((n) => n + 1)
    }
    i.src = `${BASE}deputados/${depSel.id}.webp`
  }, [depSel?.id])

  const opcoesDep: Opcao[] = deputados
    .filter((d) => !uf || d.uf === uf)
    .map((d) => ({ valor: String(d.id), rotulo: d.nome, detalhe: `${d.partido} · ${d.uf}`, busca: `${d.partido} ${partido(d.partido).nome}` }))

  useEffect(() => {
    const i = new Image()
    i.src = `${BASE}motta-760.webp`
    img.current = i
    const fontes = document.fonts
      ? Promise.all([document.fonts.load('900 100px "Archivo Variable"'), document.fonts.load('600 30px "Inter Tight Variable"')])
      : Promise.resolve()
    Promise.all([new Promise((r) => (i.onload = r)), fontes]).finally(() => setPronto(true))
  }, [])

  useEffect(() => {
    if (!tela.current) return
    const t = setTimeout(() => {
      desenharCard(tela.current!, img.current, { deputado, nome, uf, frase, formato, site: CONFIG.site, foto: fotoDep.current, partido: depSel?.partido })
      // a imagem já fica pronta: no toque, o compartilhar abre na hora (o iPhone exige isso)
      pronta.current = null
      tela.current?.toBlob((b) => (pronta.current = b), 'image/png')
    }, 60)
    return () => clearTimeout(t)
  }, [deputado, nome, uf, frase, formato, pronto, fotoPronta])

  /* inclinação 3D da prévia */
  const inclinar = (e: React.PointerEvent) => {
    const el = moldura.current
    if (!el || e.pointerType === 'touch') return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(1000px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`
  }
  const soltar = () => moldura.current && (moldura.current.style.transform = '')

  const arquivo = () => `omottanao-${(deputado || 'card').normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase()}.png`
  const pronta = useRef<Blob | null>(null)
  const blob = () => new Promise<Blob | null>((r) => tela.current!.toBlob(r, 'image/png'))

  async function baixar() {
    const b = await blob()
    if (!b) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b)
    a.download = arquivo()
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    rastrear('card_gerado', { acao: 'download', formato, uf })
  }
  /** Manda o card no WhatsApp: no celular abre o compartilhar com a imagem (é só tocar no WhatsApp); no computador baixa a imagem e abre o WhatsApp Web. */
  async function compartilhar() {
    const texto = `Eu votei no meu deputado, mas não foi pra eleger o Motta. Peça coerência você também: https://${CONFIG.site}`
    rastrear('compartilhar', { local: 'card', formato, uf })
    const b = pronta.current ?? (await blob())
    if (!b) return
    const f = new File([b], arquivo(), { type: 'image/png' })
    if (navigator.canShare?.({ files: [f] })) {
      try {
        await navigator.share({ files: [f], text: texto })
        return
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return // a pessoa fechou o menu
      }
    }
    // sem compartilhar de arquivo (computador): baixa a imagem e abre o WhatsApp com o texto
    await baixar()
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener')
  }

  return (
    <section id="recado" className="arco fora-da-tela z-[15] bg-papel py-24 sm:py-32">
      <div className="container">
        <Surge>
          <span className="rotulo text-azul">Gere seu card</span>
        </Surge>
        <h2 className="titulo mt-5 max-w-[14ch] text-azul-tinta">
          <TituloRevela texto="Cobre o seu deputado" destaque={['deputado']} classeDestaque="text-azul" />
        </h2>
        <Surge atraso={0.15}>
          <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-azul-tinta/65">
            Ele pediu seu voto na campanha. <b className="font-bold text-azul-tinta">Agora é você quem pede coerência.</b> Gere seu card e poste nas suas redes.
          </p>
        </Surge>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_440px] lg:gap-20">
          <Surge as="div" className="space-y-7">
            <div className="grid gap-4 sm:grid-cols-[170px_1fr]">
              <div>
                <label htmlFor="r-uf" className="mb-2 block text-[15px] font-bold">
                  Estado
                </label>
                <div className="campo flex items-center pr-1 focus-within:border-azul focus-within:ring-4 focus-within:ring-azul/20">
                  <Combobox
                    id="r-uf"
                    opcoes={UFS.map((u) => ({ valor: u, rotulo: u, detalhe: NOMES_UF[u] }))}
                    valor={uf}
                    aoEscolher={(v) => {
                      setUf(v as UF)
                      definirUF(v as UF)
                      setDepValor('')
                    }}
                    placeholder="UF"
                    classeEntrada="h-full w-full bg-transparent text-[17px] font-semibold outline-none placeholder:font-medium placeholder:text-azul-tinta/35"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="r-dep" className="mb-2 block text-[15px] font-bold">
                  Em quem você votou para deputado federal?
                </label>
                <div className="campo flex items-center gap-3 pr-1 focus-within:border-azul focus-within:ring-4 focus-within:ring-azul/20">
                  {depSel && (
                    <img src={`${BASE}deputados/${depSel.id}.webp`} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover object-top ring-2 ring-azul/20" />
                  )}
                  <Combobox
                    key={uf}
                    id="r-dep"
                    opcoes={opcoesDep}
                    valor={depValor}
                    aoEscolher={setDepValor}
                    placeholder={deputados.length ? (uf ? `Deputados de ${uf}` : 'Digite o nome do deputado') : 'Carregando deputados…'}
                    carregando={!deputados.length}
                    permitirLivre
                    limite={60}
                    classeEntrada="h-full w-full bg-transparent text-[17px] font-semibold outline-none placeholder:font-medium placeholder:text-azul-tinta/35"
                    renderOpcao={(o) => {
                      const d = deputados.find((x) => String(x.id) === o.valor)
                      if (!d) return <span>{o.rotulo}</span>
                      return (
                        <span className="flex w-full items-center gap-3">
                          <img src={`${BASE}deputados/${d.id}.webp`} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-full bg-azul-gelo object-cover object-top" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-bold">{d.nome}</span>
                            <span className="block text-[12px] font-semibold text-azul-tinta/50">
                              {partido(d.partido).nome} · {d.uf}
                            </span>
                          </span>
                          <SeloPartido sigla={d.partido} className="h-7 shrink-0" />
                        </span>
                      )
                    }}
                  />
                </div>
                <p className="mt-2 text-[12.5px] text-azul-tinta/50">Os 513 deputados eleitos em 2026 (TSE), que votam em 1º de fevereiro. Não achou? Digite o nome e use assim mesmo.</p>
              </div>
            </div>
            <label className="block">
              <span className="mb-2 block text-[15px] font-bold">
                Seu primeiro nome <span className="font-medium text-azul-tinta/45">(opcional)</span>
              </span>
              <input className="campo" value={nome} onChange={(e) => setNome(e.target.value.slice(0, 20))} placeholder="Ex.: Ana" autoComplete="given-name" />
            </label>
            <fieldset>
              <legend className="mb-3 text-[15px] font-bold">Escolha o recado</legend>
              <div className="grid gap-2.5">
                {FRASES_RESUMO.map((f, i) => (
                  <button key={i} type="button" className="chip text-left" data-ativo={frase === i} aria-pressed={frase === i} onClick={() => setFrase(i)}>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${frase === i ? 'border-azul bg-azul' : 'border-azul-tinta/20'}`}>
                      {frase === i && <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                    “{f.replace('[deputado]', deputado.trim() || '[deputado]')}”
                  </button>
                ))}
              </div>
            </fieldset>
            <div>
              <span className="mb-3 block text-[15px] font-bold">Formato</span>
              <div className="inline-flex rounded-full bg-azul-tinta/[0.06] p-1" role="group" aria-label="Formato do card">
                {(['feed', 'status'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={formato === f}
                    onClick={() => setFormato(f)}
                    className={`h-11 rounded-full px-5 text-[14px] font-bold transition ${formato === f ? 'bg-azul-tinta text-white shadow-suave' : 'text-azul-tinta/60'}`}
                  >
                    {f === 'feed' ? 'Post 4:5' : 'Status 9:16'}
                  </button>
                ))}
              </div>
            </div>
            {uf && <p className="text-[14px] text-azul-tinta/55">Assinando como eleitor(a) de {NOMES_UF[uf]}.</p>}
          </Surge>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div ref={moldura} onPointerMove={inclinar} onPointerLeave={soltar} className="mx-auto w-full max-w-[400px] transition-transform duration-300 ease-out will-change-transform">
              <canvas ref={tela} className="w-full rounded-[22px] bg-azul-fundo shadow-flutua" role="img" aria-label="Prévia do card" />
            </div>
            <div className="mx-auto mt-6 grid max-w-[400px] gap-3">
              <button type="button" className="btn-zap" onClick={compartilhar} data-rastreio="whatsapp_click:card">
                <IconeWhatsapp /> Mandar no WhatsApp
              </button>
              <button type="button" className="btn-linha text-azul-tinta hover:bg-azul-tinta/5" onClick={baixar}>
                <Download size={19} /> Baixar imagem
              </button>
              <p className="text-center text-[12.5px] text-azul-tinta/50">O card é gerado no seu celular. Nada do que você digita aqui é enviado.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

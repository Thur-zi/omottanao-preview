import { useEffect, useRef, useState } from 'react'
import { Download, Share2 } from 'lucide-react'
import { CONFIG } from '../config'
import { NOMES_UF, REGISTROS, UFS, type UF } from '../data/votometro'
import { definirUF, useUF } from '../lib/estado'
import { FRASES_RESUMO, desenharCard, type Formato } from '../lib/desenharCard'
import { Surge, TituloRevela } from '../lib/movimento'
import { rastrear } from '../lib/rastreio'

const BASE = import.meta.env.BASE_URL

export function Recado() {
  const ufGlobal = useUF()
  const [uf, setUf] = useState<UF | ''>(ufGlobal ?? '')
  const [deputado, setDeputado] = useState('')
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

  useEffect(() => {
    const i = new Image()
    i.src = `${BASE}motta-760.webp`
    img.current = i
    const fontes = document.fonts
      ? Promise.all([document.fonts.load('900 100px Archivo'), document.fonts.load('600 30px "Inter Tight"')])
      : Promise.resolve()
    Promise.all([new Promise((r) => (i.onload = r)), fontes]).finally(() => setPronto(true))
  }, [])

  useEffect(() => {
    if (!tela.current) return
    const t = setTimeout(() => desenharCard(tela.current!, img.current, { deputado, nome, uf, frase, formato, site: CONFIG.site }), 60)
    return () => clearTimeout(t)
  }, [deputado, nome, uf, frase, formato, pronto])

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

  const sugestoes = REGISTROS.filter((r) => !r.exemplo && (!uf || r.uf === uf)).map((r) => r.nome)
  const arquivo = () => `omottanao-${(deputado || 'card').normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase()}.png`
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
  async function compartilhar() {
    const b = await blob()
    if (!b) return
    const f = new File([b], arquivo(), { type: 'image/png' })
    const texto = `Meu voto não foi para eleger o Motta. Veja quem já disse NÃO: https://${CONFIG.site}`
    rastrear('card_gerado', { acao: 'share', formato, uf })
    if (navigator.canShare?.({ files: [f] })) {
      try {
        await navigator.share({ files: [f], text: texto })
      } catch {
        /* cancelado */
      }
    } else {
      await baixar()
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener')
    }
  }

  return (
    <section id="recado" className="arco z-50 bg-papel py-24 sm:py-32">
      <div className="container">
        <Surge>
          <span className="rotulo text-azul">Gere seu card</span>
        </Surge>
        <h2 className="titulo mt-5 max-w-[14ch] text-azul-tinta">
          <TituloRevela texto="Cobre o seu deputado" destaque={['deputado']} classeDestaque="text-azul" />
        </h2>
        <Surge atraso={0.15}>
          <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-azul-tinta/65">
            Você votou num deputado de direita. Ele precisa saber que o seu voto não foi para eleger o Motta. Monte o recado e mande nos grupos e nas redes dele.
          </p>
        </Surge>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_440px] lg:gap-20">
          <Surge as="div" className="space-y-7">
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <label className="block">
                <span className="mb-2 block text-[15px] font-bold">Em quem você votou para deputado federal?</span>
                <input className="campo" value={deputado} onChange={(e) => setDeputado(e.target.value.slice(0, 40))} placeholder="Nome do deputado" list="deputados" autoComplete="off" />
                <datalist id="deputados">{sugestoes.map((n) => <option key={n} value={n} />)}</datalist>
              </label>
              <label className="block">
                <span className="mb-2 block text-[15px] font-bold">Estado</span>
                <select
                  className="campo"
                  value={uf}
                  onChange={(e) => {
                    const v = e.target.value as UF | ''
                    setUf(v)
                    if (v) definirUF(v)
                  }}
                >
                  <option value="">UF</option>
                  {UFS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
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
              <button type="button" className="btn-azul" onClick={compartilhar}>
                <Share2 size={19} /> Compartilhar card
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

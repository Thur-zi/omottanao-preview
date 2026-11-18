import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { Check, Lock, Stamp } from 'lucide-react'
import { NOMES_UF, UFS, type UF } from '../data/votometro'
import { TEXTO_CONSENTIMENTO, enviarLead, mascaraWhatsapp, whatsappValido } from '../lib/cadastro'
import { definirUF, useUF } from '../lib/estado'
import { EASE, Surge, TituloRevela, rolarPara } from '../lib/movimento'
import { linkWhatsapp, rastrear } from '../lib/rastreio'
import { IconeWhatsapp } from './Icones'
import { Impressao } from './Marca'

const BASE = import.meta.env.BASE_URL
type Erros = Partial<Record<'nome' | 'whatsapp' | 'uf' | 'lgpd', string>>

export function Assine() {
  const ufGlobal = useUF()
  const [nome, setNome] = useState('')
  const [wa, setWa] = useState('')
  const [uf, setUf] = useState<UF | ''>(ufGlobal ?? '')
  const [lgpd, setLgpd] = useState(false)
  const [erros, setErros] = useState<Erros>({})
  const [tentou, setTentou] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [feito, setFeito] = useState<null | { nome: string; uf: UF }>(null)
  const tocouUf = useRef(false)
  const done = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ufGlobal && !tocouUf.current) setUf(ufGlobal)
  }, [ufGlobal])

  const validar = () => {
    const e: Erros = {}
    if (nome.trim().length < 2) e.nome = 'Digite seu nome.'
    if (!whatsappValido(wa)) e.whatsapp = 'WhatsApp com DDD, ex.: (11) 91234-5678.'
    if (!uf) e.uf = 'Escolha o estado.'
    if (!lgpd) e.lgpd = 'Para receber no WhatsApp, marque a autorização.'
    setErros(e)
    return e
  }
  useEffect(() => {
    if (tentou) validar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome, wa, uf, lgpd])

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault()
    setTentou(true)
    const e = validar()
    if (Object.keys(e).length) {
      document.getElementById(`f-${Object.keys(e)[0]}`)?.focus()
      return
    }
    setEnviando(true)
    const r = await enviarLead({ nome, whatsapp: wa, uf: uf as UF })
    setEnviando(false)
    // falha de rede nunca bloqueia: a pessoa segue para o WhatsApp
    rastrear('lead', { uf, ok: r.ok })
    definirUF(uf as UF)
    setFeito({ nome: nome.trim().split(' ')[0], uf: uf as UF })
    setTimeout(() => done.current?.focus(), 400)
  }

  const campo = (id: keyof Erros) => ({ id: `f-${id}`, 'aria-invalid': !!erros[id], 'aria-describedby': erros[id] ? `e-${id}` : undefined })
  const Erro = ({ id }: { id: keyof Erros }) => (
    <AnimatePresence>
      {erros[id] && (
        <m.p id={`e-${id}`} role="alert" className="mt-2 text-[13px] font-semibold text-vermelho" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {erros[id]}
        </m.p>
      )}
    </AnimatePresence>
  )

  return (
    <section id="assine" className="arco z-[60] overflow-hidden bg-white pb-28 pt-24 sm:pb-36 sm:pt-32">
      <div className="container grid gap-16 lg:grid-cols-[1fr_1.05fr] lg:gap-24">
        <div className="relative">
          <Surge>
            <span className="rotulo text-azul">Assine o não</span>
          </Surge>
          <h2 className="titulo mt-5 text-azul-tinta">
            <TituloRevela texto="Assine o NÃO." destaque={['NÃO.']} classeDestaque="text-azul" />
          </h2>
          <Surge atraso={0.15}>
            <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-azul-tinta/65">
              Deixe seu nome e WhatsApp. Você recebe quem é o deputado do seu estado, como cobrá-lo pelos canais oficiais e as atualizações da disputa.
            </p>
          </Surge>
          <Surge atraso={0.25} className="relative mt-12 hidden aspect-square max-w-[360px] lg:block">
            <img src={`${BASE}motta-760.webp`} alt="" aria-hidden className="h-full w-full rounded-full object-cover [mask-image:radial-gradient(closest-side,#000_70%,transparent)]" loading="lazy" />
            <Impressao className="absolute left-[24%] top-[13.5%] w-[56%] rotate-[12deg]" id="tinta-assine" />
          </Surge>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            {!feito ? (
              <m.form key="form" onSubmit={enviar} noValidate className="rounded-[32px] bg-papel p-6 sm:p-10" exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}>
                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-[15px] font-bold">Nome</span>
                    <input {...campo('nome')} className="campo" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" maxLength={80} />
                    <Erro id="nome" />
                  </label>
                  <div className="grid gap-5 sm:grid-cols-[1fr_150px]">
                    <label className="block">
                      <span className="mb-2 block text-[15px] font-bold">WhatsApp com DDD</span>
                      <input
                        {...campo('whatsapp')}
                        className="campo"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="(00) 00000-0000"
                        value={wa}
                        onChange={(e) => setWa(mascaraWhatsapp(e.target.value))}
                      />
                      <Erro id="whatsapp" />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[15px] font-bold">Estado</span>
                      <select
                        {...campo('uf')}
                        className="campo"
                        value={uf}
                        onChange={(e) => {
                          tocouUf.current = true
                          setUf(e.target.value as UF)
                        }}
                      >
                        <option value="">UF</option>
                        {UFS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <Erro id="uf" />
                    </label>
                  </div>
                  <label className="flex cursor-pointer items-start gap-3.5 pt-1 text-[13.5px] leading-relaxed text-azul-tinta/70">
                    <input {...campo('lgpd')} type="checkbox" className="mt-0.5 h-[22px] w-[22px] shrink-0 accent-azul" checked={lgpd} onChange={(e) => setLgpd(e.target.checked)} />
                    <span>
                      {TEXTO_CONSENTIMENTO.replace('Política de Privacidade', '')}
                      <a href={`${BASE}privacidade.html`} target="_blank" rel="noopener" className="font-bold text-azul underline-offset-2 hover:underline">
                        Ver Política de Privacidade
                      </a>
                      .
                    </span>
                  </label>
                  <Erro id="lgpd" />
                </div>
                <button type="submit" disabled={enviando} className="btn-azul mt-8 h-16 w-full text-[19px] disabled:cursor-progress disabled:opacity-80">
                  {enviando ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Registrando seu NÃO…
                    </>
                  ) : (
                    <>
                      <Stamp size={21} /> Eu digo não ao Motta
                    </>
                  )}
                </button>
                <p className="mt-4 flex items-center gap-2 text-[12.5px] text-azul-tinta/50">
                  <Lock size={14} /> Seus dados são usados só para esta mobilização. Você pode sair quando quiser.
                </p>
              </m.form>
            ) : (
              <m.div key="ok" ref={done} tabIndex={-1} className="rounded-[32px] bg-azul-fundo p-7 text-white outline-none sm:p-10" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
                <m.div
                  className="inline-block -rotate-6 rounded-xl border-[5px] border-azul-vivo px-5 pb-2 pt-3 font-titulo text-[2.2rem] font-black uppercase leading-none text-azul-vivo [font-stretch:70%]"
                  initial={{ scale: 2.4, opacity: 0, rotate: -18 }}
                  animate={{ scale: 1, opacity: 1, rotate: -6 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.25 }}
                >
                  NÃO registrado
                </m.div>
                <h3 className="titulo-md mt-8 sm:text-5xl">Valeu, {feito.nome}.</h3>
                <ol className="mt-7 space-y-4">
                  {[
                    ['Seu NÃO foi registrado.', true],
                    [`Entre no WhatsApp do Luiz para saber quem cobrar em ${NOMES_UF[feito.uf]}.`, false],
                    ['Gere seu card e cobre o seu deputado.', false],
                  ].map(([t, ok], i) => (
                    <m.li key={i} className="flex items-center gap-4 text-[16px]" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.12 }}>
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-extrabold ${ok ? 'bg-azul-vivo' : 'bg-white/10'}`}>
                        {ok ? <Check size={16} /> : i + 1}
                      </span>
                      <span className={ok ? 'text-white/60 line-through decoration-azul-vivo' : 'font-semibold'}>{t as string}</span>
                    </m.li>
                  ))}
                </ol>
                <a className="btn-zap mt-9 h-16 w-full text-[18px]" href={linkWhatsapp('confirmacao', feito.uf)} target="_blank" rel="noopener" data-rastreio="whatsapp_click:confirmacao">
                  <IconeWhatsapp /> Entrar no WhatsApp do Luiz
                </a>
                <button type="button" onClick={() => rolarPara('recado')} className="mt-5 w-full text-center text-[15px] font-bold text-azul-claro underline-offset-4 hover:underline">
                  Gerar meu card →
                </button>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

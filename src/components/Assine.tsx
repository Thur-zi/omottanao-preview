/**
 * Assine o NÃO — 2ª seção. Os campos são poucos (nome, WhatsApp, UF, LGPD);
 * o trabalho é visual: o formulário é uma "cédula do NÃO" que recebe o carimbo e vira.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, animate, m, useReducedMotion } from 'motion/react'
import { Bell, Check, Lock, MapPin, Megaphone, Send, Stamp } from 'lucide-react'
import { CONFIG } from '../config'
import { NOMES_UF, UFS, resumo, totais, type UF } from '../data/votometro'
import { useConteudo } from '../lib/conteudo'
import { TEXTO_CONSENTIMENTO, carregarMunicipios, enviarLead, mascaraWhatsapp, whatsappValido } from '../lib/cadastro'
import { Combobox, type Opcao } from './Combobox'
import { useContagem } from '../lib/contagem'
import { definirUF, useUF } from '../lib/estado'
import { EASE, Surge, TituloRevela, rolarPara } from '../lib/movimento'
import { linkWhatsapp, rastrear } from '../lib/rastreio'
import { IconeWhatsapp } from './Icones'
import { Impressao } from './Marca'

const BASE = import.meta.env.BASE_URL
type Erros = Partial<Record<'nome' | 'sobrenome' | 'whatsapp' | 'uf' | 'cidade' | 'lgpd', string>>
const OPCOES_UF: Opcao[] = UFS.map((u) => ({ valor: u, rotulo: NOMES_UF[u], detalhe: u }))

/* ---------- contagem regressiva com dígitos que rolam ---------- */
function Digito({ valor, rotulo }: { valor: number; rotulo: string }) {
  const txt = String(valor).padStart(2, '0')
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-[68px] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] sm:h-[84px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <m.span
            key={txt}
            className="num block text-[2.6rem] leading-none text-white sm:text-[3.3rem]"
            initial={{ y: '-90%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '90%', opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            {txt}
          </m.span>
        </AnimatePresence>
        <span className="absolute inset-x-0 top-1/2 h-px bg-azul-fundo/60" />
      </div>
      <span className="mt-2 font-sans text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/45">{rotulo}</span>
    </div>
  )
}

function Contagem() {
  const t = useContagem()
  return (
    <div>
      <p className="mb-3 font-sans text-[12px] font-bold uppercase tracking-[0.18em] text-azul-claro">Até a votação na Câmara</p>
      <div className="grid max-w-[420px] grid-cols-4 gap-2.5">
        <Digito valor={t.dias} rotulo="dias" />
        <Digito valor={t.horas} rotulo="horas" />
        <Digito valor={t.minutos} rotulo="min" />
        <Digito valor={t.segundos} rotulo="seg" />
      </div>
    </div>
  )
}

/* ---------- campo em linha de cédula ---------- */
function Linha({
  id,
  rotulo,
  ok,
  erro,
  children,
}: {
  id: string
  rotulo: string
  ok: boolean
  erro?: string
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 flex items-center justify-between font-sans text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-azul-tinta/45">
        {rotulo}
        <AnimatePresence>
          {ok && (
            <m.span
              className="grid h-5 w-5 place-items-center rounded-full bg-azul text-white"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            >
              <Check size={12} strokeWidth={3.5} />
            </m.span>
          )}
        </AnimatePresence>
      </label>
      <div className={`relative flex items-center border-b-2 transition-colors ${erro ? 'border-vermelho' : ok ? 'border-azul' : 'border-azul-tinta/15 focus-within:border-azul'}`}>
        {children}
      </div>
      <AnimatePresence>
        {erro && (
          <m.p id={`e-${id}`} role="alert" className="mt-1.5 text-[12.5px] font-semibold text-vermelho" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {erro}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  )
}

const entrada = 'h-12 w-full bg-transparent font-titulo text-[24px] font-bold text-azul-tinta outline-none placeholder:font-sans placeholder:text-[16px] placeholder:font-medium placeholder:text-azul-tinta/25 [font-stretch:85%]'

export function Assine() {
  const reduz = useReducedMotion()
  const ufGlobal = useUF()
  const [nome, setNome] = useState('')
  const [sobrenome, setSobrenome] = useState('')
  const [wa, setWa] = useState('')
  const [uf, setUf] = useState<UF | ''>(ufGlobal ?? '')
  const [cidade, setCidade] = useState('')
  const [municipios, setMunicipios] = useState<Opcao[]>([])
  const [carregandoCidades, setCarregandoCidades] = useState(false)
  const [lgpd, setLgpd] = useState(false)
  const [erros, setErros] = useState<Erros>({})
  const [tentou, setTentou] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [carimbada, setCarimbada] = useState(false)
  const [virada, setVirada] = useState(false)
  const [feito, setFeito] = useState<null | { nome: string; uf: UF }>(null)
  const tocouUf = useRef(false)
  const inicio = useRef(performance.now())
  const armadilha = useRef<HTMLInputElement>(null)
  const comecou = useRef(false)
  useConteudo()
  const cedula = useRef<HTMLDivElement>(null)
  const inclina = useRef<HTMLDivElement>(null)
  const verso = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ufGlobal && !tocouUf.current) setUf(ufGlobal)
  }, [ufGlobal])

  // trocou o estado: carrega as cidades dele e limpa a cidade escolhida
  useEffect(() => {
    setCidade('')
    setMunicipios([])
    if (!uf) return
    let vivo = true
    setCarregandoCidades(true)
    carregarMunicipios(uf)
      .then((l) => vivo && setMunicipios(l.map(([cod, n]) => ({ valor: String(cod), rotulo: n }))))
      .catch(() => vivo && setMunicipios([]))
      .finally(() => vivo && setCarregandoCidades(false))
    return () => {
      vivo = false
    }
  }, [uf])

  const ok = {
    nome: nome.trim().length >= 2,
    sobrenome: sobrenome.trim().length >= 2,
    whatsapp: whatsappValido(wa),
    uf: !!uf,
    cidade: !!cidade,
    lgpd,
  }
  const progresso = Object.values(ok).filter(Boolean).length / 6

  const validar = () => {
    const e: Erros = {}
    if (!ok.nome) e.nome = 'Digite seu primeiro nome.'
    if (!ok.sobrenome) e.sobrenome = 'Digite seu sobrenome.'
    if (!ok.whatsapp) e.whatsapp = 'WhatsApp com DDD, ex.: (11) 91234-5678.'
    if (!ok.uf) e.uf = 'Escolha o estado.'
    else if (!ok.cidade) e.cidade = 'Escolha a cidade.'
    if (!ok.lgpd) e.lgpd = 'Para receber no WhatsApp, marque a autorização.'
    setErros(e)
    return e
  }
  useEffect(() => {
    if (tentou) validar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome, sobrenome, wa, uf, cidade, lgpd])

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault()
    setTentou(true)
    const e = validar()
    if (Object.keys(e).length) {
      Object.keys(e).forEach((campo) => rastrear('form_erro', { campo }))
      if (cedula.current && !reduz) animate(cedula.current, { x: [0, -10, 9, -6, 4, 0] }, { duration: 0.4 })
      document.getElementById(`f-${Object.keys(e)[0]}`)?.focus()
      return
    }
    setEnviando(true)
    const nomeCidade = municipios.find((o) => o.valor === cidade)?.rotulo ?? ''
    const r = await enviarLead(
      { nome, sobrenome, whatsapp: wa, uf: uf as UF, cidade: { codigo_ibge: Number(cidade), nome: nomeCidade } },
      { tempo: performance.now() - inicio.current, empresa: armadilha.current?.value ?? '' },
    )
    setEnviando(false)
    // o servidor recusou um campo: mostra no lugar certo (falha de rede nunca bloqueia a pessoa)
    const CAMPOS: Record<string, keyof Erros> = { nome: 'nome', sobrenome: 'sobrenome', whatsapp: 'whatsapp', uf: 'uf', cidade: 'cidade', consentimento: 'lgpd' }
    if (!r.ok && r.motivo && CAMPOS[r.motivo]) {
      setErros({ [CAMPOS[r.motivo]]: 'Confira este campo.' })
      rastrear('form_erro', { campo: r.motivo, servidor: true })
      return
    }
    if (!r.ok && r.motivo === 'limite') {
      setErros({ lgpd: 'Muitas assinaturas desta conexão. Tente de novo mais tarde.' })
      return
    }
    rastrear('lead', { uf, ok: r.ok })
    definirUF(uf as UF)
    setFeito({ nome: nome.trim().split(' ')[0], uf: uf as UF })
    // o carimbo bate na cédula…
    setCarimbada(true)
    navigator.vibrate?.(35)
    if (cedula.current && !reduz) animate(cedula.current, { y: [0, 6, -2, 0], scale: [1, 0.985, 1] }, { duration: 0.35, delay: 0.32 })
    // …e ela vira
    setTimeout(() => setVirada(true), reduz ? 200 : 1500)
    setTimeout(() => verso.current?.focus(), reduz ? 300 : 2300)
  }

  const inclinar = (e: React.PointerEvent) => {
    const el = inclina.current
    if (!el || e.pointerType === 'touch' || reduz) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`
  }
  const soltar = () => inclina.current && (inclina.current.style.transform = '')

  const infoUf = uf ? resumo(uf) : null

  return (
    <section id="assine" className="arco relative z-10 overflow-hidden bg-azul-fundo pb-24 pt-24 text-white sm:pb-32 sm:pt-32">
      {/* fundo: brilho, grade e palavra gigante */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_85%_25%,rgba(31,79,224,0.32),transparent_70%),radial-gradient(45%_40%_at_5%_95%,rgba(61,123,255,0.14),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(80%_70%_at_60%_40%,#000,transparent)]" />
        <div className="display contorno absolute -bottom-[6vw] right-[-2vw] select-none text-[30vw] leading-none text-white/[0.06]">NÃO</div>
      </div>

      <div className="container relative grid items-start gap-16 lg:grid-cols-[1fr_minmax(0,560px)] lg:gap-20">
        {/* ---------- lado do argumento ---------- */}
        <div className="lg:sticky lg:top-28">
          <Surge className="flex flex-wrap items-center gap-3">
            <span className="rotulo text-azul-claro">Assine o não</span>
            <span className="rounded-full bg-white/10 px-3 py-1 font-sans text-[11px] font-bold text-white/70">Leva 30 segundos</span>
          </Surge>
          <h2 className="titulo mt-6">
            <TituloRevela texto="Seu voto merece respeito." destaque={['respeito.']} classeDestaque="text-azul-vivo" />
          </h2>
          <Surge atraso={0.15}>
            <p className="mt-6 max-w-[42ch] text-lg leading-relaxed text-white/70">
              <b className="font-extrabold text-white">Coerência não se negocia.</b> Elegi deputado de direita para ser oposição ao PT na Câmara.
            </p>
          </Surge>


          {/* arquivado: liga em Painel → Configurações → "Mostrar contagem regressiva" */}
          {CONFIG.mostrarContagem && (
            <>
            <Surge atraso={0.25} className="mt-9">
              <Contagem />
            </Surge>
  
            <ul className="mt-10 space-y-4">
              {[
                [MapPin, 'Quem é o deputado do seu estado'],
                [Megaphone, 'Como cobrá-lo pelos canais oficiais'],
                [Bell, 'As atualizações da disputa, em primeira mão'],
              ].map(([Icone, txt], i) => {
                const I = Icone as typeof MapPin
                return (
                  <Surge as="li" key={i} atraso={0.3 + i * 0.07} className="flex items-center gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-azul-claro ring-1 ring-white/10">
                      <I size={20} />
                    </span>
                    <span className="text-[16px] font-semibold text-white/85">{txt as string}</span>
                  </Surge>
                )
              })}
            </ul>
            </>
          )}
        </div>

        {/* ---------- a cédula ---------- */}
        <Surge atraso={0.1} y={60}>
          <div className="[perspective:1600px]" onPointerMove={inclinar} onPointerLeave={soltar}>
            <div ref={inclina} className="transition-transform duration-300 ease-out [transform-style:preserve-3d]">
              <m.div
                ref={cedula}
                className="grid [transform-style:preserve-3d]"
                animate={{ rotateY: virada ? 180 : 0 }}
                transition={{ duration: 1.1, ease: [0.7, 0, 0.2, 1] }}
              >
                {/* FRENTE */}
                <form
                  onSubmit={enviar}
                  onFocusCapture={() => {
                    if (comecou.current) return
                    comecou.current = true
                    rastrear('form_inicio', {}, { unico: 'form_inicio' })
                  }}
                  noValidate
                  aria-hidden={virada}
                  className="relative col-start-1 row-start-1 rounded-[26px] bg-[#FBFAF6] p-6 text-azul-tinta shadow-[0_60px_120px_-40px_rgba(0,0,0,0.75)] [backface-visibility:hidden] sm:p-9"
                >
                  {/* armadilha para robôs: invisível para pessoas */}
                  <input ref={armadilha} type="text" name="empresa" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
                  {/* serrilhado de cédula */}
                  <span aria-hidden className="absolute inset-x-6 -top-[7px] h-[14px] [background:radial-gradient(circle,#040B26_5px,transparent_5.5px)_0_0/22px_14px_repeat-x]" />
                  {/* papel */}
                  <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[26px] opacity-[0.3] [background-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 .5  0 0 0 0 .45  0 0 0 0 .35  0 0 0 .12 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E&quot;)]" />

                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <p className="font-sans text-[10px] font-extrabold uppercase tracking-[0.24em] text-azul-tinta/45">Presidência da Câmara · 2027</p>
                      <p className="display mt-2 text-[2.5rem] leading-[0.9] text-azul-tinta sm:text-[2.9rem]">Abaixo-assinado</p>
                      <p className="display mt-1.5 inline-block bg-azul px-[0.14em] pt-[0.12em] text-[1.9rem] leading-[0.95] text-white sm:text-[2.2rem]">O Motta não</p>
                    </div>
                  </div>

                  {/* progresso */}
                  <div className="relative mt-6">
                    <div className="h-1.5 overflow-hidden rounded-full bg-azul-tinta/[0.07]">
                      <m.div className="h-full rounded-full bg-[linear-gradient(90deg,#1F4FE0,#3D7BFF)]" animate={{ width: `${Math.max(4, progresso * 100)}%` }} transition={{ duration: 0.6, ease: EASE }} />
                    </div>
                    <p className="mt-2 text-[12px] font-semibold text-azul-tinta/50">
                      {progresso === 1 ? 'Tudo certo. É só carimbar.' : `Sua assinatura está ${Math.round(progresso * 100)}% pronta.`}
                    </p>
                  </div>

                  <div className="relative z-20 mt-7 space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Linha id="f-nome" rotulo="Primeiro nome" ok={ok.nome} erro={erros.nome}>
                        <input id="f-nome" className={entrada} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="given-name" maxLength={40} placeholder="Ex.: Ana" aria-invalid={!!erros.nome} />
                      </Linha>
                      <Linha id="f-sobrenome" rotulo="Sobrenome" ok={ok.sobrenome} erro={erros.sobrenome}>
                        <input id="f-sobrenome" className={entrada} value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} autoComplete="family-name" maxLength={60} placeholder="Ex.: Souza" aria-invalid={!!erros.sobrenome} />
                      </Linha>
                    </div>
                    <div>
                      <Linha id="f-whatsapp" rotulo="Seu WhatsApp com DDD" ok={ok.whatsapp} erro={erros.whatsapp}>
                        <span className="mr-2.5 shrink-0 rounded-md bg-azul-tinta/[0.06] px-2 py-1 font-sans text-[13px] font-bold text-azul-tinta/60">+55</span>
                        <input
                          id="f-whatsapp"
                          className={entrada}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="(00) 00000-0000"
                          value={wa}
                          onChange={(e) => setWa(mascaraWhatsapp(e.target.value))}
                          aria-invalid={!!erros.whatsapp}
                        />
                      </Linha>
                    </div>
                    <div className={`grid gap-6 ${uf ? 'sm:grid-cols-[0.9fr_1.1fr]' : ''}`}>
                      <Linha id="f-uf" rotulo="Estado" ok={ok.uf} erro={erros.uf}>
                        <Combobox
                          id="f-uf"
                          opcoes={OPCOES_UF}
                          valor={uf}
                          aoEscolher={(v) => {
                            tocouUf.current = true
                            setUf(v as UF)
                          }}
                          placeholder="Digite ou escolha"
                          invalido={!!erros.uf}
                          classeEntrada={entrada}
                        />
                      </Linha>
                      {/* cidade: só aparece depois do estado */}
                      <AnimatePresence initial={false}>
                        {uf && (
                          <m.div
                            key="cidade"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.45, ease: EASE }}
                          >
                            <Linha id="f-cidade" rotulo="Cidade" ok={ok.cidade} erro={erros.cidade}>
                              <Combobox
                                key={uf}
                                id="f-cidade"
                                opcoes={municipios}
                                valor={cidade}
                                aoEscolher={setCidade}
                                placeholder={`Cidades de ${uf}`}
                                carregando={carregandoCidades}
                                invalido={!!erros.cidade}
                                classeEntrada={entrada}
                              />
                            </Linha>
                          </m.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <AnimatePresence>
                      {/* arquivado: liga em Painel → Configurações → "Mostrar resumo do estado" */}
                      {CONFIG.mostrarInfoEstado && infoUf && (
                        <m.p
                          className="flex items-center gap-2 rounded-xl bg-azul-gelo px-3.5 py-2.5 text-[13px] font-semibold text-azul-profundo"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <MapPin size={15} className="shrink-0" />
                          {NOMES_UF[infoUf.uf]}: {infoUf.cadeiras} deputados, {infoUf.nao} já disseram NÃO.
                          {CONFIG.previa && totais().temExemplo && <span className="ml-auto text-[10px] uppercase tracking-wider text-azul-profundo/50">exemplo</span>}
                        </m.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* consentimento + espaço do carimbo */}
                  <div className="relative mt-7 grid items-center gap-5 sm:grid-cols-[1fr_190px]">
                    <div>
                      <label className="flex cursor-pointer items-start gap-3 text-[12.5px] leading-relaxed text-azul-tinta/65">
                        <input id="f-lgpd" type="checkbox" className="peer sr-only" checked={lgpd} onChange={(e) => setLgpd(e.target.checked)} aria-invalid={!!erros.lgpd} />
                        <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition peer-focus-visible:ring-4 peer-focus-visible:ring-azul/25 ${lgpd ? 'border-azul bg-azul text-white' : erros.lgpd ? 'border-vermelho' : 'border-azul-tinta/25'}`}>
                          {lgpd && <Check size={15} strokeWidth={3.5} />}
                        </span>
                        <span>
                          {TEXTO_CONSENTIMENTO.replace('Política de Privacidade', '')}
                          <a href={`${BASE}privacidade.html`} target="_blank" rel="noopener" className="font-bold text-azul underline-offset-2 hover:underline">
                            Ver política
                          </a>
                          .
                        </span>
                      </label>
                      <AnimatePresence>
                        {erros.lgpd && (
                          <m.p role="alert" className="mt-1.5 text-[12.5px] font-semibold text-vermelho" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {erros.lgpd}
                          </m.p>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="relative grid h-[104px] place-items-center rounded-2xl border-2 border-dashed border-azul-tinta/15">
                      <AnimatePresence>
                        {!carimbada && (
                          <m.span className="flex flex-col items-center gap-1 text-azul-tinta/25" exit={{ opacity: 0 }}>
                            <Stamp size={26} />
                            <span className="font-sans text-[9.5px] font-extrabold uppercase tracking-[0.2em]">Espaço do carimbo</span>
                          </m.span>
                        )}
                      </AnimatePresence>
                      <AnimatePresence>
                        {carimbada && (
                          <m.div
                            className="absolute inset-2 grid place-items-center"
                            initial={{ scale: 2.6, opacity: 0, rotate: -22, y: -40 }}
                            animate={{ scale: 1, opacity: 1, rotate: -8, y: 0 }}
                            transition={{ duration: 0.38, ease: [0.5, 0, 0.75, 0], opacity: { duration: 0.1, delay: 0.25 } }}
                          >
                            <Impressao className="w-full" cor="#1F4FE0" id="tinta-cedula" />
                          </m.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <button type="submit" disabled={enviando || carimbada} className="btn-azul relative mt-7 h-16 w-full text-[19px] disabled:cursor-progress">
                    {enviando ? (
                      <>
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Registrando…
                      </>
                    ) : carimbada ? (
                      <>
                        <Check size={21} /> Carimbado
                      </>
                    ) : (
                      <>
                        <Stamp size={21} /> Carimbar: Motta Não
                      </>
                    )}
                  </button>
                  <div className="relative mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11.5px] font-semibold text-azul-tinta/45">
                    <span className="flex items-center gap-1.5"><Lock size={13} /> Dados protegidos (LGPD)</span>
                    <span>Sem spam</span>
                    <span>Saia quando quiser</span>
                  </div>
                </form>

                {/* VERSO */}
                <div
                  ref={verso}
                  tabIndex={-1}
                  aria-hidden={!virada}
                  className="relative col-start-1 row-start-1 flex flex-col overflow-hidden rounded-[26px] bg-[linear-gradient(160deg,#1F4FE0_0%,#0E2E9A_45%,#081A52_100%)] p-7 text-white shadow-[0_60px_120px_-40px_rgba(0,0,0,0.75)] outline-none [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-10"
                >
                  <span aria-hidden className="display pointer-events-none absolute -right-6 -top-10 select-none text-[13rem] leading-none text-white/[0.06]">NÃO</span>
                  {feito && (
                    <>
                      <m.div
                        className="inline-block self-start -rotate-6 rounded-xl border-[5px] border-white px-4 pb-1.5 pt-2.5 font-titulo text-[2rem] font-black uppercase leading-none [font-stretch:68%]"
                        initial={{ scale: 2.2, opacity: 0 }}
                        animate={virada ? { scale: 1, opacity: 1 } : undefined}
                        transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.75 }}
                      >
                        Isso sim é coerência
                      </m.div>
                      <h3 className="titulo-md mt-7 sm:text-5xl">Valeu, {feito.nome}.</h3>
                      <p className="mt-3 text-white/75">{NOMES_UF[feito.uf]} ganhou mais uma voz contra o Motta.</p>
                      <ol className="mt-7 space-y-3.5">
                        {['Feito, agora é cobrar.', 'Entre no WhatsApp do Luiz para saber quem cobrar.', 'Gere seu card e cobre o seu deputado.'].map((t, i) => (
                          <li key={i} className="flex items-center gap-3.5 text-[15.5px]">
                            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-extrabold ${i === 0 ? 'bg-white text-azul' : 'bg-white/15'}`}>
                              {i === 0 ? <Check size={16} strokeWidth={3} /> : i + 1}
                            </span>
                            <span className={i === 0 ? 'text-white/60 line-through decoration-white/60' : 'font-semibold'}>{t}</span>
                          </li>
                        ))}
                      </ol>
                      <a className="btn-zap mt-8 h-16 w-full text-[18px]" href={linkWhatsapp('confirmacao', feito.uf)} target="_blank" rel="noopener" data-rastreio="whatsapp_click:confirmacao">
                        <IconeWhatsapp /> Entrar no WhatsApp do Luiz
                      </a>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => rolarPara('recado')} className="btn-linha h-12 text-[14px] text-white">
                          Gerar meu card
                        </button>
                        <a
                          className="btn-linha h-12 text-[14px] text-white"
                          href={`https://wa.me/?text=${encodeURIComponent(`Assinei o NÃO ao Motta. Assine também: https://${CONFIG.site}`)}`}
                          target="_blank"
                          rel="noopener"
                          data-rastreio="compartilhar:confirmacao"
                        >
                          <Send size={16} /> Chamar amigos
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </m.div>
            </div>
          </div>
        </Surge>
      </div>
    </section>
  )
}

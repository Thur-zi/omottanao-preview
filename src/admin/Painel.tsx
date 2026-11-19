/** Painel: barra superior (período, estado, abas) + a aba ativa. Atualiza sozinho a cada 60 s. */
import { useCallback, useEffect, useState } from 'react'
import { LogOut, RefreshCw } from 'lucide-react'
import { NOMES_UF, UFS } from '../data/votometro'
import type { Eu } from './Admin'
import { api, fmt, pct } from './api'
import { BarrasHora, Rosca, SerieTempo } from './graficos'
import { BarrasH, Cartao, Funil, Kpi, Vazio } from './ui'
import { AbaAssinaturas } from './AbaAssinaturas'
import { AbaConteudo } from './AbaConteudo'
import { AbaConfig, AbaEquipe } from './AbaConfig'
import { AbaAoVivo, AbaAuditoria } from './AbaRegistros'

export type Resumo = {
  periodo: { dias: number; desde: string; uf: string | null }
  kpis: Record<string, number>
  serie: { t: string; visitantes: number; assinaturas: number }[]
  funil: { etapa: string; n: number }[]
  porUf: { r: string; n: number }[]
  cidades: { r: string; n: number }[]
  origens: { r: string; n: number }[]
  campanhas: { r: string; n: number }[]
  dispositivos: { r: string; n: number }[]
  porHora: { r: number; n: number }[]
  secoes: { r: string; n: number }[]
  ctas: { r: string; n: number }[]
  erros: { r: string; n: number }[]
  estados: { r: string; n: number }[]
}

const PERIODOS = [
  [1, 'Hoje'],
  [7, '7 dias'],
  [30, '30 dias'],
  [0, 'Tudo'],
] as const

const ABAS = [
  ['geral', 'Visão geral'],
  ['funil', 'Funil e página'],
  ['assinaturas', 'Assinaturas'],
  ['votometro', 'Votômetro'],
  ['motivos', 'Por que não'],
  ['pautas', 'Pautas'],
  ['config', 'Configurações'],
  ['aovivo', 'Ao vivo'],
  ['auditoria', 'Auditoria'],
  ['equipe', 'Equipe'],
] as const
type Aba = (typeof ABAS)[number][0]

const SECOES: Record<string, string> = {
  inicio: 'Abertura (carimbo)',
  assine: 'Abaixo-assinado',
  contexto: 'Como funciona',
  votometro: 'Votômetro',
  'por-que-nao': 'Por que não',
  alternativa: 'A alternativa',
  recado: 'Cobre seu deputado (card)',
}
const DISPOSITIVOS: Record<string, string> = { android: 'Android', iphone: 'iPhone', ipad: 'iPad', computador: 'Computador' }
const CAMPOS: Record<string, string> = { nome: 'Primeiro nome', sobrenome: 'Sobrenome', whatsapp: 'WhatsApp', uf: 'Estado', cidade: 'Cidade', lgpd: 'Autorização LGPD', consentimento: 'Autorização LGPD' }

function Geral({ d }: { d: Resumo }) {
  const k = d.kpis
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi destaque rotulo="Assinaturas" valor={k.novas ?? 0} detalhe={`${fmt.format(k.total ?? 0)} no total · ${fmt.format(k.repetidas ?? 0)} repetidas`} />
        <Kpi rotulo="Visitantes" valor={k.visitantes ?? 0} detalhe={`Conversão ${pct(k.assinaram_sessoes ?? 0, k.visitantes ?? 0)}`} />
        <Kpi rotulo="Carimbaram" valor={k.carimbaram ?? 0} detalhe={`${pct(k.carimbaram ?? 0, k.visitantes ?? 0)} de quem chegou`} />
        <Kpi rotulo="Entraram no WhatsApp" valor={k.whatsapp ?? 0} />
        <Kpi rotulo="Abriram o mapa" valor={k.mapa ?? 0} />
        <Kpi rotulo="Cards gerados" valor={k.cards ?? 0} />
        <Kpi rotulo="Compartilhamentos" valor={k.compartilhamentos ?? 0} />
        <Kpi rotulo="NÃOs no votômetro" valor={k.nao_reais ?? 0} detalhe="com fonte, sem os de exemplo" />
      </div>
      <Cartao titulo="Visitantes e assinaturas" sub={d.periodo.dias === 1 ? 'Por hora, hoje' : 'Por dia'}>
        <SerieTempo dados={d.serie} />
      </Cartao>
      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Funil" sub="Pessoas únicas em cada etapa">
          <Funil etapas={d.funil} />
        </Cartao>
        <Cartao titulo="Assinaturas por estado">
          <BarrasH itens={d.porUf.slice(0, 12)} formatar={(r) => `${NOMES_UF[r as keyof typeof NOMES_UF] ?? r} (${r})`} />
        </Cartao>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Cartao titulo="Cidades">
          <BarrasH itens={d.cidades} cor="#00A28C" />
        </Cartao>
        <Cartao titulo="De onde vieram" sub="UTM ou site de origem">
          <BarrasH itens={d.origens} cor="#6B4FB3" />
        </Cartao>
        <Cartao titulo="Campanhas que convertem" sub="Assinaturas por campanha">
          <BarrasH itens={d.campanhas} cor="#E0761B" />
        </Cartao>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Horário das assinaturas" sub="Horário de Brasília">
          <BarrasHora dados={d.porHora} />
        </Cartao>
        <Cartao titulo="Aparelhos">
          <Rosca dados={d.dispositivos} rotulos={DISPOSITIVOS} />
        </Cartao>
      </div>
    </div>
  )
}

function FunilPagina({ d }: { d: Resumo }) {
  const topo = d.kpis.visitantes || 0
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao titulo="Funil completo">
          <Funil etapas={d.funil} />
        </Cartao>
        <Cartao titulo="Até onde rolam" sub="Quantas pessoas viram cada seção">
          {d.secoes.length ? (
            <ul className="space-y-2.5">
              {['inicio', 'assine', 'contexto', 'votometro', 'por-que-nao', 'alternativa', 'recado'].map((s) => {
                const n = d.secoes.find((x) => x.r === s)?.n ?? 0
                return (
                  <li key={s}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span className="font-semibold">{SECOES[s]}</span>
                      <span className="tabular-nums text-azul-tinta/60">
                        {fmt.format(n)} · {pct(n, topo)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-azul-tinta/[0.06]">
                      <div className="h-full rounded-full bg-azul" style={{ width: topo ? `${Math.min(100, (n / topo) * 100)}%` : 0 }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <Vazio />
          )}
        </Cartao>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Cartao titulo="Cliques nos botões">
          <BarrasH itens={d.ctas} cor="#1F4FE0" />
        </Cartao>
        <Cartao titulo="Estados mais vistos no mapa">
          <BarrasH itens={d.estados} cor="#00A28C" formatar={(r) => NOMES_UF[r as keyof typeof NOMES_UF] ?? r} />
        </Cartao>
        <Cartao titulo="Erros no formulário" sub="Onde as pessoas travam">
          <BarrasH itens={d.erros} cor="#C61F1F" formatar={(r) => CAMPOS[r] ?? r} />
        </Cartao>
      </div>
    </div>
  )
}

export default function Painel({ eu, sair }: { eu: Eu; sair: () => void }) {
  const [aba, setAba] = useState<Aba>('geral')
  const [dias, setDias] = useState(7)
  const [uf, setUf] = useState('')
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setResumo(await api<Resumo>(`resumo?dias=${dias}&uf=${uf}`))
      setErro('')
    } catch (e) {
      const st = (e as { status?: number }).status
      if (st === 401) sair()
      else setErro('Não foi possível carregar os números.')
    } finally {
      setCarregando(false)
    }
  }, [dias, uf, sair])

  useEffect(() => {
    if (aba !== 'geral' && aba !== 'funil') return
    carregar()
    const t = setInterval(carregar, 60_000)
    return () => clearInterval(t)
  }, [carregar, aba])

  const contexto = `${PERIODOS.find((p) => p[0] === dias)?.[1]} · ${uf ? NOMES_UF[uf as keyof typeof NOMES_UF] : 'todos os estados'}`

  return (
    <div className="min-h-screen bg-papel text-azul-tinta">
      <header className="sticky top-0 z-30 bg-azul-fundo text-white shadow-[0_8px_24px_-16px_rgba(0,0,0,0.6)]">
        <div className="flex h-1">
          <span className="flex-1 bg-vermelho" />
          <span className="flex-1 bg-azul" />
          <span className="w-1/6 bg-white" />
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="display text-[22px] leading-none">
            O MOTTA <span className="bg-azul px-1">NÃO.</span> <span className="font-sans text-[13px] font-bold normal-case tracking-normal text-white/55">· Painel</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full bg-white/10 p-0.5" role="radiogroup" aria-label="Período">
              {PERIODOS.map(([v, t]) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={dias === v}
                  onClick={() => setDias(v)}
                  className={`h-8 rounded-full px-3 text-[12.5px] font-bold transition ${dias === v ? 'bg-white text-azul-tinta' : 'text-white/75 hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <select
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="h-9 rounded-full border-0 bg-white/10 px-3 text-[12.5px] font-bold text-white outline-none [&>option]:text-azul-tinta"
              aria-label="Estado"
            >
              <option value="">Todos os estados</option>
              {UFS.map((u) => (
                <option key={u} value={u}>
                  {NOMES_UF[u]}
                </option>
              ))}
            </select>
            <button onClick={carregar} title="Atualizar" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Atualizar">
              <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} />
            </button>
            <button onClick={sair} title={`Sair (${eu.usuario})`} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Sair">
              <LogOut size={15} />
            </button>
          </div>
        </div>
        <nav className="sem-barra mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2.5 sm:px-6" aria-label="Abas">
          {ABAS.map(([id, t]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`h-9 shrink-0 rounded-full px-4 text-[13px] font-bold transition ${aba === id ? 'bg-white text-azul-tinta' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        {(aba === 'geral' || aba === 'funil') && (
          <p className="text-[13px] text-azul-tinta/55">
            Mostrando: <b className="text-azul-tinta">{contexto}</b> · atualiza sozinho a cada minuto
          </p>
        )}
        {erro && <p className="rounded-xl bg-vermelho/10 px-4 py-3 text-[14px] font-semibold text-vermelho">{erro}</p>}
        {aba === 'geral' && (resumo ? <Geral d={resumo} /> : <Vazio texto="Carregando…" />)}
        {aba === 'funil' && (resumo ? <FunilPagina d={resumo} /> : <Vazio texto="Carregando…" />)}
        {aba === 'assinaturas' && <AbaAssinaturas uf={uf} />}
        {aba === 'votometro' && <AbaConteudo tipo="posicoes" />}
        {aba === 'motivos' && <AbaConteudo tipo="motivos" />}
        {aba === 'pautas' && <AbaConteudo tipo="pautas" />}
        {aba === 'config' && <AbaConfig />}
        {aba === 'aovivo' && <AbaAoVivo />}
        {aba === 'auditoria' && <AbaAuditoria />}
        {aba === 'equipe' && <AbaEquipe />}
      </main>
    </div>
  )
}

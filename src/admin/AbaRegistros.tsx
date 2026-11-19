import { useEffect, useState } from 'react'
import { api, dataHora } from './api'
import { Cartao, Vazio } from './ui'

type Ev = { id: number; criado_em: string; tipo: string; dados: string; uf: string | null; utm_source: string | null; referrer_host: string | null; dispositivo: string | null; sessao: string }

const NOMES: Record<string, string> = {
  visita: 'Chegou ao site',
  carimbo: 'Carimbou',
  explorar: 'Clicou em Explorar',
  secao_vista: 'Viu seção',
  cta: 'Clicou em botão',
  whatsapp_click: 'Foi para o WhatsApp',
  compartilhar: 'Compartilhou',
  estado_visto: 'Abriu estado no mapa',
  card_gerado: 'Gerou card',
  form_inicio: 'Começou o formulário',
  form_campo: 'Preencheu campo',
  form_erro: 'Erro no formulário',
  lead: 'ASSINOU',
}

export function AbaAoVivo() {
  const [itens, setItens] = useState<Ev[] | null>(null)
  useEffect(() => {
    const ir = () => api<{ itens: Ev[] }>('eventos').then((r) => setItens(r.itens)).catch(() => {})
    ir()
    const t = setInterval(ir, 10_000)
    return () => clearInterval(t)
  }, [])
  return (
    <Cartao titulo="Ao vivo" sub="Últimos 60 eventos · atualiza a cada 10 segundos">
      {!itens ? (
        <Vazio texto="Carregando…" />
      ) : !itens.length ? (
        <Vazio texto="Nenhum evento ainda." />
      ) : (
        <ul className="divide-y divide-azul-tinta/[0.05] text-[13.5px]">
          {itens.map((e) => {
            let d: Record<string, unknown> = {}
            try {
              d = JSON.parse(e.dados)
            } catch {
              d = {}
            }
            const extra = Object.entries(d)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ')
            return (
              <li key={e.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2 ${e.tipo === 'lead' ? 'font-bold text-azul' : ''}`}>
                <span className="w-24 shrink-0 tabular-nums text-azul-tinta/45">{dataHora(e.criado_em)}</span>
                <span>{NOMES[e.tipo] ?? e.tipo}</span>
                {extra && <span className="text-azul-tinta/55">{extra}</span>}
                <span className="ml-auto text-[12px] text-azul-tinta/40">
                  {[e.uf, e.utm_source || e.referrer_host, e.dispositivo, `#${e.sessao}`].filter(Boolean).join(' · ')}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Cartao>
  )
}

type Aud = { id: number; criado_em: string; usuario: string | null; acao: string; detalhes: string }

export function AbaAuditoria() {
  const [itens, setItens] = useState<Aud[] | null>(null)
  useEffect(() => {
    api<{ itens: Aud[] }>('auditoria').then((r) => setItens(r.itens))
  }, [])
  return (
    <Cartao titulo="Auditoria" sub="Ações sensíveis no painel: logins, números revelados, exportações, edições e exclusões.">
      {!itens ? (
        <Vazio texto="Carregando…" />
      ) : !itens.length ? (
        <Vazio texto="Nada registrado ainda." />
      ) : (
        <div className="-mx-5 overflow-x-auto sm:-mx-6">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-y border-azul-tinta/[0.07] bg-papel text-[11px] font-extrabold uppercase tracking-[0.1em] text-azul-tinta/50">
                <th className="py-2.5 pl-5 sm:pl-6">Quando</th>
                <th>Quem</th>
                <th>Ação</th>
                <th className="pr-5 sm:pr-6">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((a) => (
                <tr key={a.id} className="border-b border-azul-tinta/[0.05] align-top">
                  <td className="whitespace-nowrap py-2 pl-5 tabular-nums text-azul-tinta/55 sm:pl-6">{dataHora(a.criado_em)}</td>
                  <td className="font-semibold">{a.usuario ?? '—'}</td>
                  <td>{a.acao.replace(/_/g, ' ')}</td>
                  <td className="max-w-[360px] truncate pr-5 font-mono text-[11.5px] text-azul-tinta/50 sm:pr-6" title={a.detalhes}>
                    {a.detalhes === '{}' ? '' : a.detalhes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Cartao>
  )
}

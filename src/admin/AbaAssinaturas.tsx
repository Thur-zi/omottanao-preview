import { useEffect, useState } from 'react'
import { Download, Eye, EyeOff, MessageCircle, Search, Trash2 } from 'lucide-react'
import { api, dataHora, fmt } from './api'
import { Aviso, Botao, Cartao, Vazio, entrada } from './ui'

type Linha = { id: string; nome: string; sobrenome: string; whatsapp: string; uf: string; cidade: string; utm_source: string | null; utm_campaign: string | null; dispositivo: string | null; vezes: number; criado_em: string }

export function AbaAssinaturas({ uf }: { uf: string }) {
  const [busca, setBusca] = useState('')
  const [termo, setTermo] = useState('')
  const [pagina, setPagina] = useState(1)
  const [revelar, setRevelar] = useState(false)
  const [dados, setDados] = useState<{ itens: Linha[]; total: number; por: number } | null>(null)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      setTermo(busca)
      setPagina(1)
    }, 350)
    return () => clearTimeout(t)
  }, [busca])

  const carregar = () =>
    api<{ itens: Linha[]; total: number; por: number }>(`assinaturas?pagina=${pagina}&busca=${encodeURIComponent(termo)}&uf=${uf}&revelar=${revelar ? 1 : 0}`)
      .then(setDados)
      .catch(() => setMsg('Erro ao carregar.'))
  useEffect(() => {
    carregar()
    setSel(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, termo, uf, revelar])

  async function apagar(ids: string[]) {
    if (!ids.length || !window.confirm(`Apagar ${ids.length} assinatura(s)? Não dá para desfazer.`)) return
    await api('assinaturas/apagar', { corpo: { ids } })
    setMsg(`${ids.length} assinatura(s) apagada(s).`)
    carregar()
  }

  const paginas = dados ? Math.max(1, Math.ceil(dados.total / dados.por)) : 1

  return (
    <Cartao
      titulo="Assinaturas"
      sub={dados ? `${fmt.format(dados.total)} pessoas${uf ? ` em ${uf}` : ''}` : 'Carregando…'}
      acao={
        <div className="flex flex-wrap gap-2">
          <Botao
            variante="linha"
            onClick={() => {
              if (!revelar && !window.confirm('Mostrar os números completos? Isso fica registrado na auditoria.')) return
              setRevelar((v) => !v)
            }}
          >
            {revelar ? <EyeOff size={15} /> : <Eye size={15} />} {revelar ? 'Esconder números' : 'Mostrar números'}
          </Botao>
          <Botao
            onClick={() => {
              if (window.confirm('Baixar a planilha com todos os dados? Isso fica registrado na auditoria.')) window.location.href = `/api/admin/assinaturas/csv?uf=${uf}`
            }}
          >
            <Download size={15} /> Exportar CSV
          </Botao>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-azul-tinta/35" />
          <input className={`${entrada} pl-9`} placeholder="Buscar por nome, cidade ou número" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        {sel.size > 0 && (
          <Botao variante="perigo" onClick={() => apagar([...sel])}>
            <Trash2 size={15} /> Apagar {sel.size}
          </Botao>
        )}
      </div>
      {msg && (
        <div className="mb-3">
          <Aviso tipo="info">{msg}</Aviso>
        </div>
      )}
      {!dados ? (
        <Vazio texto="Carregando…" />
      ) : !dados.itens.length ? (
        <Vazio texto="Nenhuma assinatura encontrada." />
      ) : (
        <div className="-mx-5 overflow-x-auto sm:-mx-6">
          <table className="w-full min-w-[820px] text-left text-[13.5px]">
            <thead>
              <tr className="border-y border-azul-tinta/[0.07] bg-papel text-[11px] font-extrabold uppercase tracking-[0.1em] text-azul-tinta/50">
                <th className="w-10 py-2.5 pl-5 sm:pl-6">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos"
                    checked={sel.size === dados.itens.length}
                    onChange={(e) => setSel(e.target.checked ? new Set(dados.itens.map((i) => i.id)) : new Set())}
                  />
                </th>
                <th className="py-2.5">Quando</th>
                <th>Nome</th>
                <th>Cidade</th>
                <th>WhatsApp</th>
                <th>Origem</th>
                <th>Aparelho</th>
                <th className="pr-5 text-right sm:pr-6">Vezes</th>
              </tr>
            </thead>
            <tbody>
              {dados.itens.map((l) => (
                <tr key={l.id} className="border-b border-azul-tinta/[0.05] hover:bg-azul-gelo/40">
                  <td className="py-2.5 pl-5 sm:pl-6">
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${l.nome}`}
                      checked={sel.has(l.id)}
                      onChange={(e) => {
                        const s = new Set(sel)
                        e.target.checked ? s.add(l.id) : s.delete(l.id)
                        setSel(s)
                      }}
                    />
                  </td>
                  <td className="whitespace-nowrap text-azul-tinta/60">{dataHora(l.criado_em)}</td>
                  <td className="font-semibold">
                    {l.nome} {l.sobrenome}
                  </td>
                  <td>
                    {l.cidade} <span className="ml-1 rounded bg-azul-gelo px-1.5 py-0.5 text-[11px] font-bold text-azul-profundo">{l.uf}</span>
                  </td>
                  <td className="whitespace-nowrap font-mono text-[12.5px]">
                    {revelar ? (
                      <a href={`https://wa.me/${l.whatsapp}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-azul hover:underline">
                        <MessageCircle size={13} /> {l.whatsapp}
                      </a>
                    ) : (
                      l.whatsapp
                    )}
                  </td>
                  <td className="text-azul-tinta/60">{l.utm_campaign || l.utm_source || 'direto'}</td>
                  <td className="text-azul-tinta/60">{l.dispositivo}</td>
                  <td className="pr-5 text-right tabular-nums sm:pr-6">
                    {l.vezes}
                    <button onClick={() => apagar([l.id])} className="ml-3 align-middle text-azul-tinta/30 hover:text-vermelho" aria-label="Apagar">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dados && paginas > 1 && (
        <div className="mt-4 flex items-center justify-between text-[13px]">
          <Botao variante="linha" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
            ← Anterior
          </Botao>
          <span className="text-azul-tinta/55">
            Página {pagina} de {paginas}
          </span>
          <Botao variante="linha" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)}>
            Próxima →
          </Botao>
        </div>
      )}
    </Cartao>
  )
}

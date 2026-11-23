/** Edição do que o site mostra: votômetro (posições com fonte), "Por que não" e pautas. */
import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { NOMES_UF, UFS, type UF } from '../data/votometro'
import { carregarDeputados, type Deputado } from '../data/partidos'
import { Combobox } from '../components/Combobox'
import { SeloPartido } from '../components/SeloPartido'
import { ErroApi, api, dataHora } from './api'
import { Aviso, Botao, Campo, Cartao, Janela, Vazio, entrada } from './ui'

type Tipo = 'posicoes' | 'motivos' | 'pautas'
type Item = Record<string, string | number | null> & { id: number; ativo: number; exemplo: number }

const TITULOS: Record<Tipo, { titulo: string; sub: string; novo: string }> = {
  posicoes: { titulo: 'Votômetro', sub: 'Só entra quem se posicionou em público, com fonte. Quem não está aqui conta como "a convencer".', novo: 'Registrar posição' },
  motivos: { titulo: 'Por que não', sub: 'Decisões do Motta que aparecem nos recortes. Cada uma com fonte e link.', novo: 'Novo recorte' },
  pautas: { titulo: 'Pautas da alternativa', sub: 'Aparecem na seção "A alternativa".', novo: 'Nova pauta' },
}

function Formulario({ tipo, item, fechar, salvo }: { tipo: Tipo; item: Item | null; fechar: () => void; salvo: () => void }) {
  const [v, setV] = useState<Record<string, string | number | null>>(
    item ?? (tipo === 'posicoes' ? { posicao: 'nao', ativo: 1 } : { ativo: 1 }),
  )
  const [deps, setDeps] = useState<Deputado[]>([])
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => {
    if (tipo === 'posicoes') carregarDeputados().then(setDeps)
  }, [tipo])
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value })

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setErro('')
    try {
      await api(item ? `${tipo}/${item.id}` : tipo, { metodo: item ? 'PUT' : 'POST', corpo: v })
      salvo()
    } catch (er) {
      setErro((er as ErroApi).motivo)
    } finally {
      setOcupado(false)
    }
  }

  const opcoes = useMemo(() => deps.map((d) => ({ valor: String(d.id), rotulo: d.nome, detalhe: `${d.partido} · ${d.uf}`, busca: d.partido })), [deps])

  return (
    <Janela titulo={item ? 'Editar' : TITULOS[tipo].novo} fechar={fechar}>
      <form onSubmit={salvar} className="space-y-4">
        {tipo === 'posicoes' && (
          <>
            <Campo rotulo="Deputado" dica="Busque na lista oficial (preenche nome, partido e estado). Se não estiver lá, digite o nome.">
              <div className="flex h-11 items-center rounded-xl border border-azul-tinta/12 bg-white px-3 focus-within:border-azul focus-within:ring-4 focus-within:ring-azul/15">
                <Combobox
                  id="adm-dep"
                  opcoes={opcoes}
                  valor={v.deputado_id ? String(v.deputado_id) : v.nome ? `livre:${v.nome}` : ''}
                  aoEscolher={(val) => {
                    if (val.startsWith('livre:')) return setV({ ...v, deputado_id: null, nome: val.slice(6) })
                    const d = deps.find((x) => String(x.id) === val)
                    if (d) setV({ ...v, deputado_id: d.id, nome: d.nome, partido: d.partido, uf: d.uf })
                  }}
                  placeholder={deps.length ? 'Digite o nome' : 'Carregando…'}
                  carregando={!deps.length}
                  permitirLivre
                  classeEntrada="h-full w-full bg-transparent text-[15px] font-medium outline-none"
                />
              </div>
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Partido">
                <input className={entrada} value={String(v.partido ?? '')} onChange={set('partido')} />
              </Campo>
              <Campo rotulo="Estado">
                <select className={entrada} value={String(v.uf ?? '')} onChange={set('uf')}>
                  <option value="">UF</option>
                  {UFS.map((u) => (
                    <option key={u} value={u}>
                      {u} · {NOMES_UF[u]}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <Campo rotulo="Posição">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['nao', 'Diz NÃO ao Motta'],
                  ['motta', 'Quer o Motta'],
                ].map(([k, t]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setV({ ...v, posicao: k })}
                    className={`h-11 rounded-xl border-2 text-[14px] font-bold ${v.posicao === k ? (k === 'nao' ? 'border-azul bg-azul-gelo text-azul' : 'border-vermelho bg-vermelho/10 text-vermelho') : 'border-azul-tinta/10'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Campo>
          </>
        )}
        {tipo === 'motivos' && (
          <>
            <div className="grid grid-cols-[1fr_2fr] gap-3">
              <Campo rotulo="Etiqueta">
                <input className={entrada} value={String(v.tag ?? '')} onChange={set('tag')} placeholder="Ex.: Anistia" maxLength={30} />
              </Campo>
              <Campo rotulo="Título">
                <input className={entrada} value={String(v.titulo ?? '')} onChange={set('titulo')} maxLength={90} required />
              </Campo>
            </div>
            <Campo rotulo="Texto" dica="Uma ou duas frases factuais, com data.">
              <textarea className={`${entrada} h-24 py-2.5`} value={String(v.texto ?? '')} onChange={set('texto')} maxLength={320} />
            </Campo>
          </>
        )}
        {tipo === 'pautas' && (
          <Campo rotulo="Pauta" dica='Título · explicação. Ex.: "Justiça e Estado de Direito · Reformar o Judiciário…" (o que vem depois do " · " aparece menor, embaixo).'>
            <textarea className={`${entrada} h-28 py-2.5`} value={String(v.titulo ?? '')} onChange={set('titulo')} maxLength={400} required />
          </Campo>
        )}
        {tipo !== 'pautas' && (
          <div className="grid grid-cols-[1.4fr_1fr] gap-3">
            <Campo rotulo="Fonte (veículo e data)">
              <input className={entrada} value={String(v.fonte ?? '')} onChange={set('fonte')} placeholder="Ex.: Gazeta do Povo, 17/11/2026" maxLength={120} />
            </Campo>
            <Campo rotulo="Link da matéria">
              <input className={entrada} value={String(v.url ?? '')} onChange={set('url')} placeholder="https://" />
            </Campo>
          </div>
        )}
        {erro && <Aviso>{erro}</Aviso>}
        <div className="flex justify-end gap-2 pt-2">
          <Botao variante="fantasma" onClick={fechar}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={ocupado}>
            {ocupado ? 'Salvando…' : 'Salvar'}
          </Botao>
        </div>
      </form>
    </Janela>
  )
}

export function AbaConteudo({ tipo }: { tipo: Tipo }) {
  const [itens, setItens] = useState<Item[] | null>(null)
  const [editando, setEditando] = useState<Item | null | 'novo'>(null)
  const [filtro, setFiltro] = useState<UF | ''>('')
  const [msg, setMsg] = useState('')
  const ordenavel = tipo !== 'posicoes'

  const carregar = () => api<{ itens: Item[] }>(tipo).then((r) => setItens(r.itens))
  useEffect(() => {
    setItens(null)
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo])

  async function alternar(i: Item) {
    await api(`${tipo}/${i.id}`, { metodo: 'PUT', corpo: { ativo: i.ativo ? 0 : 1 } })
    carregar()
  }
  async function apagar(i: Item) {
    if (!window.confirm('Apagar este item do site?')) return
    await api(`${tipo}/${i.id}`, { metodo: 'DELETE' })
    setMsg('Apagado. O site atualiza em até 1 minuto.')
    carregar()
  }
  async function mover(idx: number, d: -1 | 1) {
    if (!itens) return
    const novo = [...itens]
    const [x] = novo.splice(idx, 1)
    novo.splice(idx + d, 0, x)
    setItens(novo)
    await api(`${tipo}/ordem`, { corpo: { ids: novo.map((n) => n.id) } })
  }

  const lista = (itens ?? []).filter((i) => !filtro || i.uf === filtro)
  const contagem = useMemo(() => {
    const c = { nao: 0, motta: 0, exemplo: 0 }
    for (const i of itens ?? []) {
      if (i.posicao === 'nao' && i.ativo) c.nao++
      if (i.posicao === 'motta' && i.ativo) c.motta++
      if (i.exemplo) c.exemplo++
    }
    return c
  }, [itens])

  return (
    <Cartao
      titulo={TITULOS[tipo].titulo}
      sub={TITULOS[tipo].sub}
      acao={
        <Botao onClick={() => setEditando('novo')}>
          <Plus size={15} /> {TITULOS[tipo].novo}
        </Botao>
      }
    >
      {tipo === 'posicoes' && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-azul-gelo px-3 py-1.5 text-[13px] font-bold text-azul">{contagem.nao} dizem NÃO</span>
          <span className="rounded-full bg-vermelho/10 px-3 py-1.5 text-[13px] font-bold text-vermelho">{contagem.motta} querem o Motta</span>
          <select className={`${entrada} ml-auto h-9 w-auto`} value={filtro} onChange={(e) => setFiltro(e.target.value as UF | '')}>
            <option value="">Todos os estados</option>
            {UFS.map((u) => (
              <option key={u} value={u}>
                {NOMES_UF[u]}
              </option>
            ))}
          </select>
        </div>
      )}
      {(contagem.exemplo > 0 || (itens ?? []).some((i) => i.exemplo)) && (
        <div className="mb-4">
          <Aviso tipo="info">Há itens de EXEMPLO (fictícios). Edite-os ou apague todos em Configurações → "Apagar dados de exemplo".</Aviso>
        </div>
      )}
      {msg && (
        <div className="mb-4">
          <Aviso tipo="ok">{msg}</Aviso>
        </div>
      )}
      {!itens ? (
        <Vazio texto="Carregando…" />
      ) : !lista.length ? (
        <Vazio texto="Nada cadastrado ainda." />
      ) : (
        <ul className="divide-y divide-azul-tinta/[0.06]">
          {lista.map((i, idx) => (
            <li key={i.id} className={`flex items-center gap-3 py-3 ${i.ativo ? '' : 'opacity-45'}`}>
              {ordenavel && (
                <span className="flex flex-col">
                  <button disabled={idx === 0} onClick={() => mover(idx, -1)} className="text-azul-tinta/40 hover:text-azul disabled:opacity-20" aria-label="Subir">
                    <ArrowUp size={15} />
                  </button>
                  <button disabled={idx === lista.length - 1} onClick={() => mover(idx, 1)} className="text-azul-tinta/40 hover:text-azul disabled:opacity-20" aria-label="Descer">
                    <ArrowDown size={15} />
                  </button>
                </span>
              )}
              {tipo === 'posicoes' && (
                <span className="relative shrink-0">
                  {i.deputado_id ? (
                    <img src={`/deputados/${i.deputado_id}.webp`} alt="" className="h-10 w-10 rounded-full object-cover object-top" />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-azul-tinta/5 text-[12px] font-bold">?</span>
                  )}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {tipo === 'posicoes' && (
                    <span className={`rounded px-1.5 py-0.5 text-[10.5px] font-extrabold uppercase ${i.posicao === 'nao' ? 'bg-azul text-white' : 'bg-vermelho text-white'}`}>
                      {i.posicao === 'nao' ? 'Diz NÃO' : 'Quer o Motta'}
                    </span>
                  )}
                  {tipo === 'motivos' && i.tag && <span className="rounded bg-azul-tinta px-1.5 py-0.5 text-[10.5px] font-extrabold uppercase text-white">{i.tag}</span>}
                  <span className="truncate">{String(i.nome ?? i.titulo)}</span>
                  {tipo === 'posicoes' && i.partido && <SeloPartido sigla={String(i.partido)} className="h-6" />}
                  {tipo === 'posicoes' && <span className="text-[12.5px] text-azul-tinta/50">{i.uf}</span>}
                  {!!i.exemplo && <span className="rounded border border-dashed border-azul-tinta/30 px-1.5 text-[10px] font-bold uppercase text-azul-tinta/45">exemplo</span>}
                </p>
                {(i.fonte || i.texto) && (
                  <p className="mt-0.5 truncate text-[12.5px] text-azul-tinta/55">
                    {tipo === 'motivos' && i.texto ? `${i.texto} · ` : ''}
                    {i.fonte ? `Fonte: ${i.fonte}` : ''}
                    {i.url ? ' · com link' : tipo !== 'pautas' ? ' · sem link' : ''}
                    {i.atualizado_em ? ` · ${dataHora(String(i.atualizado_em))}` : ''}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => alternar(i)} title={i.ativo ? 'Esconder do site' : 'Mostrar no site'} className="grid h-9 w-9 place-items-center rounded-full text-azul-tinta/50 hover:bg-azul-tinta/5 hover:text-azul">
                  {i.ativo ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button onClick={() => setEditando(i)} title="Editar" className="grid h-9 w-9 place-items-center rounded-full text-azul-tinta/50 hover:bg-azul-tinta/5 hover:text-azul">
                  <Pencil size={15} />
                </button>
                <button onClick={() => apagar(i)} title="Apagar" className="grid h-9 w-9 place-items-center rounded-full text-azul-tinta/50 hover:bg-vermelho/10 hover:text-vermelho">
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editando && (
        <Formulario
          tipo={tipo}
          item={editando === 'novo' ? null : editando}
          fechar={() => setEditando(null)}
          salvo={() => {
            setEditando(null)
            setMsg('Salvo. O site atualiza em até 1 minuto.')
            carregar()
          }}
        />
      )}
    </Cartao>
  )
}

import { useEffect, useState } from 'react'
import { Check, Copy, KeyRound, Link2, Save, Send, ShieldOff, Trash2, UserPlus, Webhook } from 'lucide-react'
import { ErroApi, api, dataHora } from './api'
import { Aviso, Botao, Campo, Cartao, Janela, Vazio, entrada } from './ui'

const CAMPOS: [string, string, string?][] = [
  ['whatsapp_numero', 'WhatsApp dos botões', '55 + DDD + número (o da API oficial). Vazio = os botões de WhatsApp somem do site.'],
  ['responsavel', 'Responsável (rodapé e política)', 'Como a iniciativa aparece para o público.'],
  ['contato_telefone', 'Contato do responsável (LGPD)', '55 + DDD + número. Aparece no rodapé e é o canal para pedidos sobre dados.'],
  ['meta_pixel_id', 'Pixel da Meta', 'Só números'],
  ['ga4_id', 'Google Analytics 4', 'Formato G-XXXXXXX (opcional)'],
  ['candidato_foto', 'Foto do Luiz Philippe (link)', 'https://… imagem 4:5. Vazio = foto oficial da Câmara'],
]

type UltimaEntrega = { quando: string; evento: string; status: number; ms: number; resposta: string }

/** Automação do WhatsApp: a cada assinatura, o site faz um POST para este endereço. */
function Automacao({ cfg, setCfg, salvar }: { cfg: Record<string, string>; setCfg: (c: Record<string, string>) => void; salvar: (e: React.FormEvent) => Promise<void> }) {
  const [teste, setTeste] = useState<{ t: 'ok' | 'erro'; m: string } | null>(null)
  const [testando, setTestando] = useState(false)
  let ultima: UltimaEntrega | null = null
  try {
    ultima = cfg.webhook_ultimo ? (JSON.parse(cfg.webhook_ultimo) as UltimaEntrega) : null
  } catch {
    ultima = null
  }
  const gerarSegredo = () => {
    const b = new Uint8Array(24)
    crypto.getRandomValues(b)
    setCfg({ ...cfg, webhook_segredo: [...b].map((x) => x.toString(16).padStart(2, '0')).join('') })
  }
  async function testar() {
    setTeste(null)
    setTestando(true)
    try {
      const r = await api<{ ok: boolean; status: number; ms: number; resposta: string }>('webhook/testar', { corpo: {} })
      setTeste({ t: r.ok ? 'ok' : 'erro', m: r.ok ? `Entregue: resposta ${r.status} em ${r.ms} ms.` : `A automação respondeu ${r.status || 'sem resposta'}${r.resposta ? `: ${r.resposta}` : ''}` })
    } catch (er) {
      setTeste({ t: 'erro', m: (er as ErroApi).motivo })
    } finally {
      setTestando(false)
    }
  }
  return (
    <Cartao titulo="Automação do WhatsApp" sub="A cada assinatura confirmada, o site envia os dados para este endereço (n8n, Make, CRM ou a API oficial).">
      <form onSubmit={salvar} className="space-y-3">
        <Campo rotulo="Endereço (webhook)" dica="https://… · vazio = desligado">
          <input className={entrada} placeholder="https://" value={cfg.webhook_url ?? ''} onChange={(e) => setCfg({ ...cfg, webhook_url: e.target.value.trim() })} />
        </Campo>
        <Campo rotulo="Segredo da assinatura" dica="O site assina cada envio (cabeçalho x-omn-assinatura: sha256=…) para a automação conferir que veio daqui.">
          <div className="flex gap-2">
            <input className={`${entrada} font-mono text-[13px]`} type="password" autoComplete="off" value={cfg.webhook_segredo ?? ''} onChange={(e) => setCfg({ ...cfg, webhook_segredo: e.target.value })} />
            <Botao type="button" variante="linha" onClick={gerarSegredo} title="Gerar um segredo aleatório">
              <KeyRound size={15} />
            </Botao>
          </div>
        </Campo>
        <div className="flex flex-wrap gap-2">
          <Botao type="submit">
            <Save size={15} /> Salvar
          </Botao>
          <Botao type="button" variante="linha" onClick={testar} disabled={testando || !cfg.webhook_url}>
            <Send size={15} /> {testando ? 'Enviando…' : 'Enviar teste'}
          </Botao>
        </div>
        {teste && <Aviso tipo={teste.t}>{teste.m}</Aviso>}
        <p className="flex items-start gap-2 text-[12.5px] text-azul-tinta/60">
          <Webhook size={14} className="mt-0.5 shrink-0" />
          {ultima ? (
            <span>
              Última entrega: {dataHora(ultima.quando)} · {ultima.evento} · {ultima.status ? `resposta ${ultima.status}` : 'sem resposta'} · {ultima.ms} ms
            </span>
          ) : (
            <span>Nenhuma entrega ainda.</span>
          )}
        </p>
        <details className="text-[12.5px] text-azul-tinta/65">
          <summary className="cursor-pointer font-semibold">O que é enviado</summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-azul-tinta/[0.04] p-3 text-[11.5px] leading-snug">{`POST (JSON) · cabeçalhos x-omn-evento e x-omn-assinatura
{
  "evento": "assinatura.nova" | "assinatura.repetida" | "teste",
  "enviado_em": "2026-11-23T15:00:00.000Z",
  "site": "omottanao.com.br",
  "assinatura": {
    "nome", "sobrenome", "nome_completo",
    "whatsapp": "5531999999999",
    "uf": "MG", "cidade", "cidade_ibge",
    "segmento": "uf_MG", "vezes": 1,
    "consentimento": { "aceito": true, "versao", "data_hora" },
    "origem": { "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "referrer" }
  }
}`}</pre>
        </details>
      </form>
    </Cartao>
  )
}

export function AbaConfig() {
  const [cfg, setCfg] = useState<Record<string, string> | null>(null)
  const [exemplos, setExemplos] = useState(0)
  const [msg, setMsg] = useState<{ t: 'ok' | 'erro'; m: string } | null>(null)
  const [senha, setSenha] = useState({ atual: '', nova: '' })

  const carregar = () =>
    api<{ config: Record<string, string>; exemplos: number }>('config').then((r) => {
      setCfg(r.config)
      setExemplos(r.exemplos)
    })
  useEffect(() => {
    carregar()
  }, [])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api('config', { metodo: 'PUT', corpo: cfg })
      setMsg({ t: 'ok', m: 'Configurações salvas. O site atualiza em até 1 minuto.' })
    } catch (er) {
      setMsg({ t: 'erro', m: (er as ErroApi).motivo })
    }
  }

  async function apagarExemplos() {
    if (!window.confirm(`Apagar os ${exemplos} itens fictícios (votômetro, recortes e pautas de exemplo)? O site passa a mostrar só os dados reais.`)) return
    await api('exemplos/apagar', { corpo: {} })
    setMsg({ t: 'ok', m: 'Dados de exemplo apagados.' })
    carregar()
  }

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api('senha', { corpo: senha })
      setSenha({ atual: '', nova: '' })
      setMsg({ t: 'ok', m: 'Senha alterada.' })
    } catch (er) {
      setMsg({ t: 'erro', m: (er as ErroApi).motivo })
    }
  }

  if (!cfg) return <Vazio texto="Carregando…" />
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <Cartao titulo="Configurações do site" sub="Valem para o site público.">
        <form onSubmit={salvar} className="space-y-4">
          {CAMPOS.map(([k, rotulo, dica]) => (
            <Campo key={k} rotulo={rotulo} dica={dica}>
              <input className={entrada} value={cfg[k] ?? ''} onChange={(e) => setCfg({ ...cfg, [k]: e.target.value })} />
            </Campo>
          ))}
          <p className="text-[12.5px] opacity-60">O que saiu do site (votômetro, contagem, avisos…) fica na aba Arquivo.</p>
          {msg && <Aviso tipo={msg.t}>{msg.m}</Aviso>}
          <Botao type="submit">
            <Save size={15} /> Salvar
          </Botao>
        </form>
      </Cartao>
      <div className="space-y-5">
        <Automacao cfg={cfg} setCfg={setCfg} salvar={salvar} />
        <Cartao titulo="Dados de exemplo" sub="Itens fictícios que a prévia usa para mostrar o funcionamento.">
          {exemplos ? (
            <>
              <p className="mb-4 text-[14px]">
                Há <b>{exemplos}</b> itens de exemplo no site, com o selo "prévia · dados fictícios".
              </p>
              <Botao variante="perigo" onClick={apagarExemplos}>
                <Trash2 size={15} /> Apagar dados de exemplo
              </Botao>
            </>
          ) : (
            <Aviso tipo="ok">Nenhum dado de exemplo. O site mostra só dados reais.</Aviso>
          )}
        </Cartao>
        <Cartao titulo="Minha senha">
          <form onSubmit={trocarSenha} className="space-y-3">
            <input className={entrada} type="password" placeholder="Senha atual" autoComplete="current-password" value={senha.atual} onChange={(e) => setSenha({ ...senha, atual: e.target.value })} />
            <input className={entrada} type="password" placeholder="Nova senha (10+ caracteres)" autoComplete="new-password" value={senha.nova} onChange={(e) => setSenha({ ...senha, nova: e.target.value })} />
            <Botao type="submit" variante="linha" disabled={!senha.atual || senha.nova.length < 10}>
              Trocar senha
            </Botao>
          </form>
        </Cartao>
      </div>
    </div>
  )
}

type Adm = { id: number; usuario: string; nome: string; totp_ativo: number; ultimo_login: string | null; criado_em: string }

function ListaEquipe() {
  const [lista, setLista] = useState<{ itens: Adm[]; eu: number } | null>(null)
  const [novo, setNovo] = useState<{ usuario: string; nome: string; senha: string } | null>(null)
  const [erro, setErro] = useState('')
  const carregar = () => api<{ itens: Adm[]; eu: number }>('admins').then(setLista)
  useEffect(() => {
    carregar()
  }, [])

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api('admins', { corpo: novo })
      setNovo(null)
      carregar()
    } catch (er) {
      setErro((er as ErroApi).motivo)
    }
  }

  return (
    <Cartao
      titulo="Equipe"
      sub="Quem acessa o painel. Toda pessoa entra com senha + código do celular."
      acao={
        <Botao onClick={() => setNovo({ usuario: '', nome: '', senha: '' })}>
          <UserPlus size={15} /> Adicionar
        </Botao>
      }
    >
      {!lista ? (
        <Vazio texto="Carregando…" />
      ) : (
        <ul className="divide-y divide-azul-tinta/[0.06]">
          {lista.itens.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {a.nome || a.usuario} {a.id === lista.eu && <span className="text-[12px] text-azul">(você)</span>}
                </p>
                <p className="text-[12.5px] text-azul-tinta/55">
                  {a.usuario} · {a.totp_ativo ? 'celular cadastrado' : 'celular ainda não cadastrado'} · último acesso {a.ultimo_login ? dataHora(a.ultimo_login) : 'nunca'}
                </p>
              </div>
              {a.id !== lista.eu && (
                <>
                  <Botao
                    variante="linha"
                    onClick={async () => {
                      if (!window.confirm('Zerar o celular desta pessoa? Ela cadastra de novo no próximo login.')) return
                      await api(`admins/${a.id}/resetar-celular`, { corpo: {} })
                      carregar()
                    }}
                  >
                    <ShieldOff size={14} /> Zerar celular
                  </Botao>
                  <Botao
                    variante="fantasma"
                    onClick={async () => {
                      if (!window.confirm(`Remover ${a.usuario} do painel?`)) return
                      await api(`admins/${a.id}`, { metodo: 'DELETE' })
                      carregar()
                    }}
                  >
                    <Trash2 size={14} />
                  </Botao>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {novo && (
        <Janela titulo="Nova pessoa no painel" fechar={() => setNovo(null)}>
          <form onSubmit={criar} className="space-y-4">
            <Campo rotulo="Usuário" dica="Pode ser o e-mail. Letras minúsculas, sem espaço.">
              <input className={entrada} value={novo.usuario} onChange={(e) => setNovo({ ...novo, usuario: e.target.value.toLowerCase().trim() })} />
            </Campo>
            <Campo rotulo="Nome">
              <input className={entrada} value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
            </Campo>
            <Campo rotulo="Senha provisória" dica="Mínimo de 10 caracteres. Passe por um canal seguro; a pessoa troca depois.">
              <input className={entrada} value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} />
            </Campo>
            {erro && <Aviso>{erro}</Aviso>}
            <div className="flex justify-end">
              <Botao type="submit">Criar acesso</Botao>
            </div>
          </form>
        </Janela>
      )}
    </Cartao>
  )
}

type Convite = { id: number; nota: string; criado_por_usuario: string | null; criado_em: string; expira_em: string; usado_em: string | null; usado_por: string | null }

/** Links de cadastro: uso único, valem alguns dias. O link completo só aparece na hora de gerar. */
function Convites() {
  const [itens, setItens] = useState<Convite[] | null>(null)
  const [nota, setNota] = useState('')
  const [dias, setDias] = useState(3)
  const [gerado, setGerado] = useState<{ link: string; expira_em: string } | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState('')
  const carregar = () => api<{ itens: Convite[] }>('convites').then((r) => setItens(r.itens))
  useEffect(() => {
    carregar()
  }, [])

  async function gerar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    try {
      const r = await api<{ link: string; expira_em: string }>('convites', { corpo: { nota, dias } })
      setGerado(r)
      setCopiado(false)
      setNota('')
      carregar()
    } catch (er) {
      setErro((er as ErroApi).motivo)
    }
  }

  async function copiar() {
    if (!gerado) return
    try {
      await navigator.clipboard.writeText(gerado.link)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  const pendentes = itens?.filter((c) => !c.usado_em) ?? []
  const usados = itens?.filter((c) => c.usado_em) ?? []

  return (
    <Cartao titulo="Links de cadastro" sub="Mande o link para quem vai entrar na equipe. Cada link vale para uma pessoa só e expira sozinho.">
      <form onSubmit={gerar} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Campo rotulo="Para quem (opcional)">
            <input className={entrada} placeholder="Ex.: Ana, da comunicação" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={80} />
          </Campo>
        </div>
        <Campo rotulo="Vale por">
          <select className={`${entrada} w-auto pr-8`} value={dias} onChange={(e) => setDias(Number(e.target.value))}>
            <option value={1}>1 dia</option>
            <option value={3}>3 dias</option>
            <option value={7}>7 dias</option>
          </select>
        </Campo>
        <Botao type="submit">
          <Link2 size={15} /> Gerar link
        </Botao>
      </form>
      {erro && (
        <div className="mt-3">
          <Aviso>{erro}</Aviso>
        </div>
      )}
      {gerado && (
        <div className="mt-4 rounded-2xl border border-azul/30 bg-azul-gelo/60 p-4">
          <p className="text-[12.5px] font-extrabold uppercase tracking-[0.1em] text-azul-profundo">Link novo · copie agora (ele não aparece de novo)</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-[12.5px]">{gerado.link}</code>
            <Botao type="button" variante="linha" onClick={copiar}>
              {copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? 'Copiado' : 'Copiar'}
            </Botao>
          </div>
          <p className="mt-2 text-[12.5px] text-azul-tinta/60">Vale até {dataHora(gerado.expira_em)}. A pessoa cria usuário e senha e, no primeiro login, cadastra o celular.</p>
        </div>
      )}
      <div className="mt-5">
        <p className="text-[12.5px] font-extrabold uppercase tracking-[0.1em] text-azul-tinta/55">Aguardando cadastro</p>
        {!itens ? (
          <Vazio texto="Carregando…" />
        ) : pendentes.length ? (
          <ul className="mt-1 divide-y divide-azul-tinta/[0.06]">
            {pendentes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1 text-[13.5px]">
                  <b>{c.nota || 'Sem nome'}</b>
                  <span className="block text-[12.5px] text-azul-tinta/55">
                    gerado por {c.criado_por_usuario ?? '—'} em {dataHora(c.criado_em)} · vale até {dataHora(c.expira_em)}
                  </span>
                </div>
                <Botao
                  variante="fantasma"
                  onClick={async () => {
                    if (!window.confirm('Cancelar este link? Quem tiver ele não consegue mais se cadastrar.')) return
                    await api(`convites/${c.id}`, { metodo: 'DELETE' })
                    carregar()
                  }}
                >
                  <Trash2 size={14} /> Cancelar
                </Botao>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[13.5px] text-azul-tinta/50">Nenhum link aberto.</p>
        )}
        {usados.length > 0 && (
          <p className="mt-3 text-[12.5px] text-azul-tinta/55">
            Usados nos últimos 7 dias: {usados.map((c) => `${c.usado_por} (${dataHora(c.usado_em!)})`).join(' · ')}
          </p>
        )}
      </div>
    </Cartao>
  )
}

export function AbaEquipe() {
  return (
    <div className="space-y-5">
      <Convites />
      <ListaEquipe />
    </div>
  )
}

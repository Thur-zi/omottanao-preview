import { useEffect, useState } from 'react'
import { Save, ShieldOff, Trash2, UserPlus } from 'lucide-react'
import { ErroApi, api, dataHora } from './api'
import { Aviso, Botao, Campo, Cartao, Janela, Vazio, entrada } from './ui'

const CAMPOS: [string, string, string?][] = [
  ['whatsapp_numero', 'WhatsApp do Luiz (WABA)', '55 + DDD + número. Ex.: 5561999990000'],
  ['ga4_id', 'Google Analytics 4', 'Formato G-XXXXXXX'],
  ['meta_pixel_id', 'Pixel da Meta', 'Só números'],
  ['responsavel', 'Responsável (rodapé)', 'Nome e CNPJ de quem responde pela página'],
  ['encarregado_nome', 'Encarregado de dados (LGPD)'],
  ['encarregado_email', 'E-mail do encarregado'],
  ['candidato_foto', 'Foto do Luiz Philippe (link)', 'https://… imagem 4:5. Deixe vazio para mostrar o espaço da foto'],
]

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
          {(
            [
              ['mostrar_contagem', 'Mostrar contagem regressiva', 'No abaixo-assinado: dias até a votação e a lista "quem é o deputado / como cobrá-lo / atualizações".'],
              ['mostrar_info_estado', 'Mostrar resumo do estado', 'No formulário, depois de escolher o estado: "Minas Gerais: 53 deputados, X já disseram NÃO".'],
            ] as const
          ).map(([k, titulo, dica]) => (
            <label key={k} className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 p-3.5">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 accent-[#1F4FE0]"
                checked={cfg[k] === '1'}
                onChange={(e) => setCfg({ ...cfg, [k]: e.target.checked ? '1' : '0' })}
              />
              <span className="text-[14px]">
                <b>{titulo}</b>
                <span className="block text-[12.5px] opacity-60">{dica} Desligado por enquanto.</span>
              </span>
            </label>
          ))}
          {msg && <Aviso tipo={msg.t}>{msg.m}</Aviso>}
          <Botao type="submit">
            <Save size={15} /> Salvar
          </Botao>
        </form>
      </Cartao>
      <div className="space-y-5">
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

export function AbaEquipe() {
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

/**
 * Porta do painel: usuário e senha → código do celular (app autenticador) → painel.
 * No primeiro acesso, a pessoa cadastra o celular lendo um QR code.
 */
import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { KeyRound, Lock, ShieldCheck, Smartphone, UserPlus } from 'lucide-react'
import QRCode from 'qrcode'
import { ErroApi, api } from './api'
import { Aviso, entrada } from './ui'

const Painel = lazy(() => import('./Painel'))

type Etapa = 'carregando' | 'login' | 'codigo' | 'configurar' | 'ok'
export type Eu = { usuario: string; nome: string; nivel: number; etapa: Exclude<Etapa, 'carregando' | 'login'> }

function Moldura({ icone, titulo, sub, children }: { icone: ReactNode; titulo: string; sub: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-azul-fundo px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3 text-white">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-azul">{icone}</span>
          <span className="display text-[26px] leading-none">
            O MOTTA <span className="bg-azul px-1.5">NÃO.</span> <span className="font-sans text-[13px] font-bold normal-case tracking-normal text-white/60">painel</span>
          </span>
        </div>
        <div className="rounded-[24px] bg-papel p-6 shadow-flutua">
          <h1 className="font-titulo text-[1.7rem] font-black uppercase leading-none [font-stretch:78%]">{titulo}</h1>
          <p className="mt-2 text-[14px] text-azul-tinta/60">{sub}</p>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  )
}

function Codigo({ valor, mudar }: { valor: string; mudar: (v: string) => void }) {
  return (
    <input
      className={`${entrada} h-14 text-center font-mono text-[26px] tracking-[0.5em]`}
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      autoFocus
      value={valor}
      onChange={(e) => mudar(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="000000"
      aria-label="Código de 6 dígitos"
    />
  )
}

/** Cadastro pelo link de convite (#convite=…): nome, usuário e senha. O celular é cadastrado no primeiro login. */
function Cadastro({ token, pronto }: { token: string; pronto: (usuario: string) => void }) {
  const [estado, setEstado] = useState<'verificando' | 'valido' | 'invalido'>('verificando')
  const [motivo, setMotivo] = useState('')
  const [f, setF] = useState({ nome: '', usuario: '', senha: '', confirma: '' })
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    api(`convite/${token}`)
      .then(() => setEstado('valido'))
      .catch((e: ErroApi) => {
        setMotivo(e.motivo)
        setEstado('invalido')
      })
  }, [token])

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault()
    setErro('')
    if (f.senha !== f.confirma) return setErro('As senhas não conferem.')
    setOcupado(true)
    try {
      await api(`convite/${token}`, { corpo: { nome: f.nome, usuario: f.usuario, senha: f.senha } })
      pronto(f.usuario.trim().toLowerCase())
    } catch (e) {
      setErro((e as ErroApi).motivo)
    } finally {
      setOcupado(false)
    }
  }

  if (estado === 'verificando') return <div className="grid min-h-screen place-items-center bg-azul-fundo text-white/60">Conferindo o convite…</div>
  if (estado === 'invalido')
    return (
      <Moldura icone={<UserPlus size={20} />} titulo="Link indisponível" sub={motivo || 'Este link de cadastro não vale mais.'}>
        <a href="/admin/" className="btn-azul h-12 w-full text-[16px]">
          Ir para o login
        </a>
      </Moldura>
    )
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  return (
    <Moldura icone={<UserPlus size={20} />} titulo="Criar acesso" sub="Você foi convidado para o painel. Depois, no primeiro login, você cadastra o celular.">
      <form onSubmit={enviar} className="space-y-3">
        <input className={entrada} placeholder="Seu nome" autoComplete="name" value={f.nome} onChange={set('nome')} autoFocus />
        <input className={entrada} placeholder="Usuário (ex.: ana.souza)" autoComplete="username" autoCapitalize="none" value={f.usuario} onChange={set('usuario')} />
        <input className={entrada} type="password" placeholder="Senha (mín. 10 caracteres)" autoComplete="new-password" value={f.senha} onChange={set('senha')} />
        <input className={entrada} type="password" placeholder="Repita a senha" autoComplete="new-password" value={f.confirma} onChange={set('confirma')} />
        {erro && <Aviso>{erro}</Aviso>}
        <button disabled={ocupado || !f.nome || !f.usuario || f.senha.length < 10 || !f.confirma} className="btn-azul h-12 w-full text-[16px] disabled:opacity-60">
          {ocupado ? 'Criando…' : 'Criar meu acesso'}
        </button>
      </form>
    </Moldura>
  )
}

const tokenConvite = () => location.hash.match(/^#convite=([a-f0-9]{64})$/)?.[1] ?? null

export function Admin() {
  const [convite, setConvite] = useState(tokenConvite)
  const [aviso, setAviso] = useState('')
  const [etapa, setEtapa] = useState<Etapa>('carregando')
  const [eu, setEu] = useState<Eu | null>(null)
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [qr, setQr] = useState<{ img: string; segredo: string } | null>(null)

  const carregarEu = async () => {
    try {
      const e = await api<Eu>('eu')
      setEu(e)
      setEtapa(e.etapa)
    } catch {
      setEtapa('login')
    }
  }
  useEffect(() => {
    carregarEu()
  }, [])

  // primeiro acesso: gera o segredo e o QR code
  useEffect(() => {
    if (etapa !== 'configurar' || qr) return
    api<{ segredo: string; uri: string }>('totp/iniciar', { corpo: {} })
      .then(async (r) => setQr({ segredo: r.segredo, img: await QRCode.toDataURL(r.uri, { margin: 1, width: 220, color: { dark: '#040B26', light: '#F5F6FA' } }) }))
      .catch((e: ErroApi) => setErro(e.motivo))
  }, [etapa, qr])

  async function entrar(ev: React.FormEvent) {
    ev.preventDefault()
    setErro('')
    setOcupado(true)
    try {
      const r = await api<{ etapa: Etapa }>('login', { corpo: { usuario, senha } })
      setSenha('')
      setEtapa(r.etapa)
    } catch (e) {
      setErro((e as ErroApi).motivo)
    } finally {
      setOcupado(false)
    }
  }

  async function validarCodigo(ev: React.FormEvent) {
    ev.preventDefault()
    setErro('')
    setOcupado(true)
    try {
      await api(etapa === 'configurar' ? 'totp/confirmar' : 'totp/verificar', { corpo: { codigo } })
      setCodigo('')
      await carregarEu()
    } catch (e) {
      setErro((e as ErroApi).motivo)
    } finally {
      setOcupado(false)
    }
  }

  async function sair() {
    await api('sair', { corpo: {} }).catch(() => {})
    setEu(null)
    setQr(null)
    setEtapa('login')
  }

  if (convite)
    return (
      <Cadastro
        token={convite}
        pronto={(u) => {
          history.replaceState(null, '', '/admin/')
          setConvite(null)
          setUsuario(u)
          setAviso('Acesso criado. Entre com sua senha para cadastrar o celular.')
          setEtapa('login')
        }}
      />
    )

  if (etapa === 'carregando') return <div className="grid min-h-screen place-items-center bg-azul-fundo text-white/60">Carregando…</div>

  if (etapa === 'login')
    return (
      <Moldura icone={<Lock size={20} />} titulo="Entrar" sub="Acesso restrito à equipe da mobilização.">
        <form onSubmit={entrar} className="space-y-3">
          <input className={entrada} placeholder="Usuário" autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />
          <input className={entrada} type="password" placeholder="Senha" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          {aviso && !erro && <Aviso tipo="ok">{aviso}</Aviso>}
          {erro && <Aviso>{erro}</Aviso>}
          <button disabled={ocupado || !usuario || !senha} className="btn-azul h-12 w-full text-[16px] disabled:opacity-60">
            {ocupado ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </Moldura>
    )

  if (etapa === 'configurar')
    return (
      <Moldura icone={<Smartphone size={20} />} titulo="Cadastre o celular" sub="Primeiro acesso: abra o Google Authenticator (ou Authy, 1Password) e leia o QR code.">
        <form onSubmit={validarCodigo} className="space-y-4">
          <div className="grid place-items-center rounded-2xl bg-white p-4">
            {qr ? <img src={qr.img} alt="QR code para o app autenticador" width={220} height={220} /> : <span className="py-20 text-azul-tinta/40">Gerando…</span>}
          </div>
          {qr && (
            <details className="text-[12.5px] text-azul-tinta/60">
              <summary className="cursor-pointer font-semibold">Não consegue ler? Digite a chave</summary>
              <code className="mt-2 block break-all rounded-lg bg-white p-2 font-mono text-[12px]">{qr.segredo}</code>
            </details>
          )}
          <Codigo valor={codigo} mudar={setCodigo} />
          {erro && <Aviso>{erro}</Aviso>}
          <button disabled={ocupado || codigo.length !== 6} className="btn-azul h-12 w-full text-[16px] disabled:opacity-60">
            Confirmar celular
          </button>
          <button type="button" onClick={sair} className="w-full text-[13px] font-semibold text-azul-tinta/50 hover:text-azul-tinta">
            Sair
          </button>
        </form>
      </Moldura>
    )

  if (etapa === 'codigo')
    return (
      <Moldura icone={<KeyRound size={20} />} titulo="Código do celular" sub="Digite os 6 números que aparecem no app autenticador.">
        <form onSubmit={validarCodigo} className="space-y-4">
          <Codigo valor={codigo} mudar={setCodigo} />
          {erro && <Aviso>{erro}</Aviso>}
          <button disabled={ocupado || codigo.length !== 6} className="btn-azul h-12 w-full text-[16px] disabled:opacity-60">
            <ShieldCheck size={18} /> Verificar
          </button>
          <button type="button" onClick={sair} className="w-full text-[13px] font-semibold text-azul-tinta/50 hover:text-azul-tinta">
            Trocar de conta
          </button>
        </form>
      </Moldura>
    )

  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-papel text-azul-tinta/50">Abrindo o painel…</div>}>
      <Painel eu={eu!} sair={sair} />
    </Suspense>
  )
}

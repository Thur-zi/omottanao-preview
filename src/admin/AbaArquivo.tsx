/**
 * Arquivo do site: tudo o que saiu da página "por enquanto". Nada foi apagado —
 * cada item volta ao ar ligando a chave e salvando (o site atualiza em até 1 minuto).
 */
import { useEffect, useState } from 'react'
import { Archive, Eye, EyeOff, Save } from 'lucide-react'
import { ErroApi, api } from './api'
import { Aviso, Botao, Campo, Cartao, Vazio, entrada } from './ui'

type Item = { chave: string; titulo: string; onde: string; descricao: string; texto?: { chave: string; rotulo: string; padrao: string } }

const ITENS: Item[] = [
  {
    chave: 'mostrar_votometro',
    titulo: 'Votômetro',
    onde: 'Seção inteira, depois do card de cobrança · link no menu',
    descricao: 'Hemiciclo dos 513, mapa 3D do Brasil e painel por estado (quem quer o Motta, a convencer, quem diz NÃO). Os nomes ficam na aba Votômetro.',
  },
  {
    chave: 'mostrar_como_funciona',
    titulo: 'Como funciona',
    onde: 'Seção depois do abaixo-assinado',
    descricao: '"O caminho até 1º de fevereiro": linha do tempo com 121 deputados do PL, 15 partidos com Motta, 513 votam, 257 para vencer.',
  },
  {
    chave: 'mostrar_contagem',
    titulo: 'Contagem regressiva',
    onde: 'Abaixo-assinado, coluna da esquerda',
    descricao: 'Dias, horas, minutos e segundos até a votação, com a lista "quem é o deputado do seu estado / como cobrá-lo / atualizações em primeira mão".',
  },
  {
    chave: 'mostrar_aviso',
    titulo: 'Aviso "Agora"',
    onde: 'Abaixo-assinado, abaixo do texto',
    descricao: 'Caixa com ponto piscando para a notícia do momento.',
    texto: { chave: 'aviso_texto', rotulo: 'Texto do aviso (depois de "Agora:")', padrao: 'o PL decide nos próximos dias se apoia Motta ou lança candidato próprio.' },
  },
  {
    chave: 'mostrar_info_estado',
    titulo: 'Resumo do estado',
    onde: 'Formulário, depois de escolher o estado',
    descricao: '"Minas Gerais: 53 deputados, X já disseram NÃO" (usa os números do votômetro).',
  },
  {
    chave: 'mostrar_botoes_whatsapp',
    titulo: 'Botões de WhatsApp na confirmação',
    onde: 'Depois de assinar',
    descricao: '"Entrar no WhatsApp do Luiz" e "Chamar amigos", e o passo "Entre no WhatsApp do Luiz para saber quem cobrar".',
  },
]

export function AbaArquivo() {
  const [cfg, setCfg] = useState<Record<string, string> | null>(null)
  const [salvo, setSalvo] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ t: 'ok' | 'erro'; m: string } | null>(null)

  useEffect(() => {
    api<{ config: Record<string, string> }>('config').then((r) => {
      setCfg(r.config)
      setSalvo(r.config)
    })
  }, [])

  async function salvar() {
    if (!cfg) return
    const corpo: Record<string, string> = {}
    for (const it of ITENS) {
      corpo[it.chave] = cfg[it.chave] === '1' ? '1' : '0'
      if (it.texto) corpo[it.texto.chave] = cfg[it.texto.chave] ?? ''
    }
    try {
      await api('config', { metodo: 'PUT', corpo })
      setSalvo({ ...cfg })
      setMsg({ t: 'ok', m: 'Salvo. O site atualiza em até 1 minuto.' })
    } catch (er) {
      setMsg({ t: 'erro', m: (er as ErroApi).motivo })
    }
  }

  if (!cfg) return <Vazio texto="Carregando…" />
  const noAr = ITENS.filter((it) => cfg[it.chave] === '1').length
  const mudou = ITENS.some((it) => (cfg[it.chave] ?? '0') !== (salvo[it.chave] ?? '0') || (it.texto && (cfg[it.texto.chave] ?? '') !== (salvo[it.texto.chave] ?? '')))

  return (
    <div className="space-y-5">
      <Cartao
        titulo="Arquivo do site"
        sub={`O que saiu da página por enquanto. Nada foi apagado: ligue a chave e salve para voltar ao ar. ${noAr ? `${noAr} de ${ITENS.length} no ar agora.` : 'Tudo arquivado.'}`}
        acao={
          <Botao onClick={salvar} disabled={!mudou}>
            <Save size={15} /> Salvar
          </Botao>
        }
      >
        {msg && (
          <div className="mb-4">
            <Aviso tipo={msg.t}>{msg.m}</Aviso>
          </div>
        )}
        <ul className="grid gap-3 md:grid-cols-2">
          {ITENS.map((it) => {
            const ligado = cfg[it.chave] === '1'
            return (
              <li key={it.chave} className={`rounded-2xl border p-4 transition ${ligado ? 'border-azul/40 bg-azul-gelo/60' : 'border-azul-tinta/10 bg-white'}`}>
                <div className="flex items-start gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${ligado ? 'bg-azul text-white' : 'bg-azul-tinta/[0.06] text-azul-tinta/50'}`}>
                    {ligado ? <Eye size={18} /> : <Archive size={18} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[15px] font-extrabold text-azul-tinta">{it.titulo}</p>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={ligado}
                        aria-label={`${ligado ? 'Arquivar' : 'Pôr no ar'}: ${it.titulo}`}
                        onClick={() => setCfg((c) => (c ? { ...c, [it.chave]: c[it.chave] === '1' ? '0' : '1' } : c))}
                        className={`relative h-7 w-12 shrink-0 rounded-full transition ${ligado ? 'bg-azul' : 'bg-azul-tinta/20'}`}
                      >
                        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${ligado ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    <p className="mt-0.5 text-[12px] font-bold uppercase tracking-[0.08em] text-azul-tinta/45">{it.onde}</p>
                    <p className="mt-2 text-[13.5px] leading-snug text-azul-tinta/70">{it.descricao}</p>
                    <p className={`mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold ${ligado ? 'text-azul' : 'text-azul-tinta/45'}`}>
                      {ligado ? <Eye size={13} /> : <EyeOff size={13} />} {ligado ? 'No ar' : 'Arquivado'}
                    </p>
                    {it.texto && (
                      <div className="mt-3">
                        <Campo rotulo={it.texto.rotulo}>
                          <input
                            className={entrada}
                            value={cfg[it.texto.chave] ?? it.texto.padrao}
                            onChange={(e) => {
                              const v = e.target.value
                              setCfg((c) => (c ? { ...c, [it.texto!.chave]: v } : c))
                            }}
                          />
                        </Campo>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </Cartao>
    </div>
  )
}

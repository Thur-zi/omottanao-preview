/**
 * Conteúdo vivo: o painel publica em /api/conteudo e o site troca os dados locais pelos de lá.
 * Sem API (prévia no GitHub Pages) ou se ela falhar, o site segue com os dados locais.
 */
import { useSyncExternalStore } from 'react'
import { CONFIG } from '../config'
import { MOTIVOS, PAUTAS, type Motivo } from '../data/conteudo'
import { NOMES_UF, substituirRegistros, type Registro, type UF } from '../data/votometro'
import { carregarTags } from './rastreio'

type Resposta = {
  posicoes: { deputado_id: number | null; nome: string; partido: string; uf: string; posicao: 'nao' | 'motta'; fonte: string; url: string | null; exemplo: number }[]
  motivos: { tag: string; titulo: string; texto: string; fonte: string; url: string | null; exemplo: number }[]
  pautas: { titulo: string; exemplo: number }[]
  config: Record<string, string>
}

let versao = 0
const ouvintes = new Set<() => void>()
let promessa: Promise<void> | null = null

function aplicar(r: Resposta) {
  const base = import.meta.env.BASE_URL
  substituirRegistros(
    r.posicoes
      .filter((p) => p.uf in NOMES_UF)
      .map(
        (p): Registro => ({
          uf: p.uf as UF,
          nome: p.nome,
          partido: p.partido,
          posicao: p.posicao,
          fonte: p.fonte,
          url: p.url ?? undefined,
          foto: p.deputado_id ? `${base}deputados/${p.deputado_id}.webp` : undefined,
          exemplo: !!p.exemplo,
        }),
      ),
  )
  MOTIVOS.splice(0, MOTIVOS.length, ...r.motivos.map((m): Motivo => ({ tag: m.tag, titulo: m.titulo, texto: m.texto, fonte: m.fonte, url: m.url ?? undefined, exemplo: !!m.exemplo })))
  PAUTAS.splice(0, PAUTAS.length, ...r.pautas.map((p) => ({ titulo: p.titulo, exemplo: !!p.exemplo })))
  const c = r.config
  CONFIG.whatsappNumero = /^55\d{10,11}$/.test((c.whatsapp_numero || '').replace(/\D/g, '')) ? c.whatsapp_numero.replace(/\D/g, '') : ''
  CONFIG.ga4Id = c.ga4_id || null
  CONFIG.metaPixelId = c.meta_pixel_id || CONFIG.metaPixelId
  if (c.responsavel && !c.responsavel.includes('[')) CONFIG.responsavel = c.responsavel
  if (/^55\d{10,11}$/.test((c.contato_telefone || '').replace(/\D/g, ''))) CONFIG.contatoTelefone = c.contato_telefone.replace(/\D/g, '')
  CONFIG.candidatoFoto = c.candidato_foto || null // vazio = foto padrão (CANDIDATO.foto)
  CONFIG.previa = c.previa !== '0'
  CONFIG.mostrarContagem = c.mostrar_contagem === '1'
  CONFIG.mostrarInfoEstado = c.mostrar_info_estado === '1'
  CONFIG.mostrarVotometro = c.mostrar_votometro === '1'
  CONFIG.mostrarComoFunciona = c.mostrar_como_funciona === '1'
  CONFIG.mostrarAviso = c.mostrar_aviso === '1'
  if (c.aviso_texto) CONFIG.avisoTexto = c.aviso_texto
  CONFIG.mostrarBotoesWhatsapp = c.mostrar_botoes_whatsapp === '1'
  versao++
  ouvintes.forEach((f) => f())
}

/**
 * Pixel e GA carregam depois da abertura (os scripts deles pesam ~150 ms num celular médio
 * e engasgavam o carimbo). A visita (PageView) continua registrada, só alguns segundos depois.
 */
function agendarTags() {
  const ocioso = (f: () => void) => {
    const ric = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    if (ric) ric(f, { timeout: 2000 })
    else setTimeout(f, 300)
  }
  const emAbertura = document.documentElement.classList.contains('com-abertura') && !sessionStorage.getItem('omn:carimbado')
  if (!emAbertura) return ocioso(carregarTags)
  let feito = false
  const vai = () => {
    if (feito) return
    feito = true
    setTimeout(() => ocioso(carregarTags), 900)
  }
  window.addEventListener('omn:aberto', vai, { once: true })
  setTimeout(vai, 7000)
}

export function carregarConteudo() {
  if (!promessa) {
    promessa = (CONFIG.conteudo ? fetch(CONFIG.conteudo).then((r) => (r.ok ? (r.json() as Promise<Resposta>) : Promise.reject())) : Promise.reject())
      .then(aplicar)
      .catch(() => {
        /* segue com os dados locais */
      })
      .finally(agendarTags)
  }
  return promessa
}

/** Re-renderiza quando o conteúdo do painel chega. */
export function useConteudo() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => versao,
  )
}

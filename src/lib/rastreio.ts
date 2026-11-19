/**
 * Origem (UTM por canal e por estado), rastreio próprio (para o painel), GA4 e Pixel da Meta.
 * Os scripts de terceiros só carregam se os IDs estiverem configurados no painel.
 */
import { CONFIG } from '../config'
import { NOMES_UF, type UF } from '../data/votometro'

type Origem = Partial<Record<'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term' | 'referrer' | 'pagina', string>> & { uf?: UF }

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...a: unknown[]) => void
    fbq?: ((...a: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown }
    _fbq?: unknown
  }
}

const ler = (k: string) => {
  try {
    return sessionStorage.getItem(k)
  } catch {
    return null
  }
}
const gravar = (k: string, v: string) => {
  try {
    sessionStorage.setItem(k, v)
  } catch {
    /* sem storage */
  }
}

export const ORIGEM: Origem = (() => {
  let o: Origem = {}
  try {
    o = JSON.parse(ler('omn:origem') || '{}')
  } catch {
    o = {}
  }
  const q = new URLSearchParams(location.search)
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const) {
    const v = q.get(k)
    if (v) o[k] = v
  }
  const uf = (q.get('uf') || '').toUpperCase()
  if (uf in NOMES_UF) o.uf = uf as UF
  if (!o.referrer && document.referrer && !document.referrer.startsWith(location.origin)) o.referrer = document.referrer
  o.pagina = location.origin + location.pathname
  gravar('omn:origem', JSON.stringify(o))
  return o
})()

/** Sessão anônima da visita (sem dado pessoal), para medir o funil. */
export const SESSAO = (() => {
  let s = ler('omn:sessao')
  if (!s) {
    const b = new Uint8Array(12)
    crypto.getRandomValues(b)
    s = [...b].map((x) => x.toString(36).padStart(2, '0')).join('').slice(0, 24)
    gravar('omn:sessao', s)
  }
  return s
})()

/* ---------- fila de eventos para o painel (lote + envio ao sair da página) ---------- */
type Ev = { tipo: string; dados: Record<string, unknown> }
const fila: Ev[] = []
const unicos = new Set<string>()
let timer: number | undefined

function enviar(saindo = false) {
  if (!CONFIG.eventos || !fila.length) return
  const lote = fila.splice(0, 25)
  const corpo = JSON.stringify({ sessao: SESSAO, uf: ORIGEM.uf, origem: ORIGEM, eventos: lote })
  if (saindo && navigator.sendBeacon) navigator.sendBeacon(CONFIG.eventos, new Blob([corpo], { type: 'text/plain' }))
  else fetch(CONFIG.eventos, { method: 'POST', body: corpo, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {})
  if (fila.length) enviar(saindo)
}

function enfileirar(tipo: string, dados: Record<string, unknown>, unico?: string) {
  if (unico) {
    if (unicos.has(unico)) return
    unicos.add(unico)
  }
  fila.push({ tipo, dados })
  if (fila.length >= 20) enviar()
  else {
    clearTimeout(timer)
    timer = window.setTimeout(() => enviar(), 3000)
  }
}

window.dataLayer = window.dataLayer || []

export function rastrear(evento: string, params: Record<string, unknown> = {}, opcoes: { unico?: string } = {}) {
  const p = { ...params, uf: params.uf ?? ORIGEM.uf, utm_source: ORIGEM.utm_source, utm_campaign: ORIGEM.utm_campaign }
  window.dataLayer.push({ event: evento, ...p })
  window.gtag?.('event', evento, p)
  const meta: Record<string, string> = { lead: 'Lead', whatsapp_click: 'Contact', estado_visto: 'ViewContent' }
  if (window.fbq) meta[evento] ? window.fbq('track', meta[evento], p) : window.fbq('trackCustom', evento, p)
  enfileirar(evento, params, opcoes.unico)
}

/** GA4 e Pixel: chamados depois que a configuração do painel chega. */
export function carregarTags() {
  if (CONFIG.ga4Id && !window.gtag) {
    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.ga4Id}`
    document.head.appendChild(s)
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments)
    }
    window.gtag('js', new Date())
    window.gtag('config', CONFIG.ga4Id)
  }
  if (CONFIG.metaPixelId && !window.fbq) {
    /* snippet oficial da Meta */
    ;(function (f: Window, b: Document, e: string, v: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const n: any = (f.fbq = function (...a: unknown[]) {
        n.callMethod ? n.callMethod(...a) : n.queue.push(a)
      })
      if (!f._fbq) f._fbq = n
      n.push = n
      n.loaded = true
      n.version = '2.0'
      n.queue = []
      const t = b.createElement(e) as HTMLScriptElement
      t.async = true
      t.src = v
      b.head.appendChild(t)
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
    window.fbq!('init', CONFIG.metaPixelId)
    window.fbq!('track', 'PageView')
  }
}

export function iniciarRastreio() {
  rastrear('visita', { pagina: location.pathname }, { unico: 'visita' })
  addEventListener('pagehide', () => enviar(true))
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && enviar(true))
  /* cliques em qualquer elemento com data-rastreio="evento:local" */
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-rastreio]')
      if (!el) return
      const [evento, local] = (el.dataset.rastreio || '').split(':')
      rastrear(evento, { local })
    },
    true,
  )
  /* seções vistas (uma vez por sessão) */
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((en) => {
        const id = (en.target as HTMLElement).id
        if (en.isIntersecting) rastrear('secao_vista', { secao: id }, { unico: `secao:${id}` })
      }),
    { threshold: 0.35 },
  )
  const observar = () => document.querySelectorAll('main section[id], footer').forEach((s) => s.id && io.observe(s))
  setTimeout(observar, 1500)
  setTimeout(observar, 5000)
}

export function linkWhatsapp(contexto: 'alternativa' | 'confirmacao' | 'fonte' | 'geral', uf?: UF) {
  const u = uf ?? ORIGEM.uf
  const textos = {
    alternativa: `Olá, Luiz! Vim pelo ${CONFIG.site}${u ? ` (${u})` : ''} e quero ajudar a dizer NÃO ao Motta.`,
    confirmacao: `Olá! Assinei o NÃO ao Motta${u ? `. Sou de ${u}` : ''}. Quero saber quem cobrar no meu estado.`,
    fonte: `Olá! Tenho a fonte de um deputado que se posicionou sobre o Motta${u ? ` (${u})` : ''}: `,
    geral: `Olá! Vim pelo ${CONFIG.site}.`,
  }
  return `https://wa.me/${CONFIG.whatsappNumero}?text=${encodeURIComponent(textos[contexto])}`
}

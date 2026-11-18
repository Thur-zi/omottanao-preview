/**
 * Origem (UTM por canal e por estado), GA4, Pixel da Meta e eventos.
 * Os scripts de terceiros só carregam se os IDs estiverem configurados.
 */
import { CONFIG } from '../config'
import { NOMES_UF, type UF } from '../data/votometro'

type Origem = Partial<Record<'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term' | 'referrer', string>> & { uf?: UF }

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...a: unknown[]) => void
    fbq?: ((...a: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown }
    _fbq?: unknown
  }
}

export const ORIGEM: Origem = (() => {
  let o: Origem = {}
  try {
    o = JSON.parse(sessionStorage.getItem('omn:origem') || '{}')
  } catch {
    /* sem storage */
  }
  const q = new URLSearchParams(location.search)
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const) {
    const v = q.get(k)
    if (v) o[k] = v
  }
  const uf = (q.get('uf') || '').toUpperCase()
  if (uf in NOMES_UF) o.uf = uf as UF
  if (!o.referrer && document.referrer) o.referrer = document.referrer
  try {
    sessionStorage.setItem('omn:origem', JSON.stringify(o))
  } catch {
    /* sem storage */
  }
  return o
})()

window.dataLayer = window.dataLayer || []

export function rastrear(evento: string, params: Record<string, unknown> = {}) {
  const p = { ...params, uf: params.uf ?? ORIGEM.uf, utm_source: ORIGEM.utm_source, utm_campaign: ORIGEM.utm_campaign }
  window.dataLayer.push({ event: evento, ...p })
  window.gtag?.('event', evento, p)
  const meta: Record<string, string> = { lead: 'Lead', whatsapp_click: 'Contact', estado_visto: 'ViewContent' }
  if (window.fbq) meta[evento] ? window.fbq('track', meta[evento], p) : window.fbq('trackCustom', evento, p)
}

export function iniciarRastreio() {
  if (CONFIG.ga4Id) {
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
  if (CONFIG.metaPixelId) {
    /* snippet oficial da Meta */
    ;(function (f: Window, b: Document, e: string, v: string) {
      if (f.fbq) return
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
  /* seções vistas */
  const vistas = new Set<string>()
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((en) => {
        const id = (en.target as HTMLElement).id
        if (en.isIntersecting && !vistas.has(id)) {
          vistas.add(id)
          rastrear('secao_vista', { secao: id })
        }
      }),
    { threshold: 0.35 },
  )
  setTimeout(() => document.querySelectorAll('main section[id]').forEach((s) => io.observe(s)), 1500)
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

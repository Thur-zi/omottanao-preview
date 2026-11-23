/**
 * Webhook para a automação do WhatsApp (API oficial / n8n / Make / CRM).
 * A cada assinatura confirmada, o site envia um POST com os dados, assinado com HMAC-SHA256.
 * Configuração no painel: URL (https) e segredo. Se não houver URL, nada é enviado.
 */
import { agora } from './util'

export type AssinaturaWebhook = {
  nome: string
  sobrenome: string
  whatsapp: string
  uf: string
  cidade: string
  cidade_ibge: number | null
  versao_termo: string
  aceite_em: string
  vezes: number
  origem: Record<string, string | null>
}

const enc = new TextEncoder()
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

async function hmac(segredo: string, corpo: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(corpo)))
}

export async function configWebhook(db: D1Database) {
  const r = await db.prepare(`SELECT chave, valor FROM config WHERE chave IN ('webhook_url', 'webhook_segredo')`).all<{ chave: string; valor: string }>()
  const c = Object.fromEntries(r.results.map((x) => [x.chave, x.valor]))
  const url = (c.webhook_url || '').trim()
  return { url: /^https:\/\//i.test(url) ? url : '', segredo: c.webhook_segredo || '' }
}

/** Monta o corpo no formato que a automação recebe. */
export function corpoWebhook(evento: 'assinatura.nova' | 'assinatura.repetida' | 'teste', a: AssinaturaWebhook) {
  return JSON.stringify({
    evento,
    enviado_em: agora(),
    site: 'omottanao.com.br',
    assinatura: {
      nome: a.nome,
      sobrenome: a.sobrenome,
      nome_completo: `${a.nome} ${a.sobrenome}`.trim(),
      whatsapp: a.whatsapp,
      uf: a.uf,
      cidade: a.cidade,
      cidade_ibge: a.cidade_ibge,
      segmento: `uf_${a.uf}`,
      vezes: a.vezes,
      consentimento: { aceito: true, versao: a.versao_termo, data_hora: a.aceite_em },
      origem: a.origem,
    },
  })
}

/** Envia e registra o resultado (para o painel mostrar a última entrega). */
export async function enviarWebhook(db: D1Database, url: string, segredo: string, evento: string, corpo: string) {
  const inicio = Date.now()
  let status = 0
  let resposta = ''
  try {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'user-agent': 'omottanao-webhook/1',
      'x-omn-evento': evento,
    }
    if (segredo) headers['x-omn-assinatura'] = `sha256=${await hmac(segredo, corpo)}`
    const r = await fetch(url, { method: 'POST', headers, body: corpo, signal: AbortSignal.timeout(8000) })
    status = r.status
    resposta = (await r.text().catch(() => '')).slice(0, 300)
  } catch (e) {
    resposta = String((e as Error)?.message || e).slice(0, 300)
  }
  const registro = JSON.stringify({ quando: agora(), evento, status, ms: Date.now() - inicio, resposta })
  await db
    .prepare(`INSERT INTO config (chave, valor) VALUES ('webhook_ultimo', ?1) ON CONFLICT(chave) DO UPDATE SET valor = ?1`)
    .bind(registro)
    .run()
    .catch(() => undefined)
  return { status, ms: Date.now() - inicio, resposta }
}

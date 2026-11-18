/**
 * Envio do lead para o CRM/base da Mobi.
 * Mesmo padrão do Vira: JSON em text/plain (sem preflight de CORS) + keepalive,
 * e o WhatsApp nunca fica bloqueado por falha de rede.
 */
import { CONFIG } from '../config'
import { ORIGEM } from './rastreio'
import type { UF } from '../data/votometro'

export const TEXTO_CONSENTIMENTO =
  'Autorizo o uso do meu nome, WhatsApp e estado para receber comunicações desta mobilização por WhatsApp, conforme a Política de Privacidade. Posso cancelar a qualquer momento.'

export type Lead = { nome: string; whatsapp: string; uf: UF }

export async function enviarLead(lead: Lead): Promise<{ ok: boolean; demonstracao: boolean }> {
  const agora = new Date()
  const payload = {
    nome: lead.nome.trim(),
    whatsapp: '55' + lead.whatsapp.replace(/\D/g, ''),
    uf: lead.uf,
    segmento: `uf_${lead.uf}`,
    consentimento: {
      aceito: true,
      versao: CONFIG.versaoConsentimento,
      texto: TEXTO_CONSENTIMENTO,
      data_hora: agora.toISOString(),
      fuso: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    origem: { ...ORIGEM, pagina: location.origin + location.pathname },
  }
  try {
    sessionStorage.setItem('omn:lead', JSON.stringify({ nome: payload.nome.split(' ')[0], uf: lead.uf }))
  } catch {
    /* sem storage */
  }
  if (!CONFIG.endpoint) {
    console.info('[modo demonstração] payload que iria para o CRM:', payload)
    await new Promise((r) => setTimeout(r, 900))
    return { ok: true, demonstracao: true }
  }
  try {
    const r = await fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
    return { ok: r.ok, demonstracao: false }
  } catch {
    return { ok: false, demonstracao: false }
  }
}

export function mascaraWhatsapp(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length > 10) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return d
}

export const whatsappValido = (v: string) => /^[1-9]{2}9\d{8}$/.test(v.replace(/\D/g, ''))

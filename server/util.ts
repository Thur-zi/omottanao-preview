/** Utilidades compartilhadas pelas Pages Functions. */

export interface Env {
  DB: D1Database
  /** Sal para o hash de IP (wrangler pages secret put SAL_IP). */
  SAL_IP?: string
}

export type Ctx = EventContext<Env, string, Record<string, unknown>>

export const agora = () => new Date().toISOString()

export function json(dados: unknown, status = 200, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  })
}

export const erro = (motivo: string, status = 400) => json({ ok: false, motivo }, status)

const enc = new TextEncoder()
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export async function sha256(texto: string) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(texto)))
}

export function aleatorio(bytes = 32) {
  const b = new Uint8Array(bytes)
  crypto.getRandomValues(b)
  return hex(b.buffer)
}

export async function ipHash(req: Request, env: Env) {
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '0.0.0.0'
  return (await sha256(ip + '|' + (env.SAL_IP || 'omottanao'))).slice(0, 32)
}

export function dispositivo(req: Request) {
  const ua = (req.headers.get('user-agent') || '').toLowerCase()
  if (/iphone/.test(ua)) return 'iphone'
  if (/ipad/.test(ua)) return 'ipad'
  if (/android/.test(ua)) return 'android'
  return 'computador'
}

/** Limite de taxa em janela fixa. true = pode seguir. */
export async function dentroDoLimite(db: D1Database, chave: string, maximo: number, janelaSeg: number) {
  const janela = Math.floor(Date.now() / 1000 / janelaSeg)
  const r = await db
    .prepare(
      `INSERT INTO limites (chave, janela, contagem) VALUES (?1, ?2, 1)
       ON CONFLICT(chave) DO UPDATE SET contagem = CASE WHEN janela = ?2 THEN contagem + 1 ELSE 1 END, janela = ?2
       RETURNING contagem`,
    )
    .bind(chave, janela)
    .first<{ contagem: number }>()
  return (r?.contagem ?? 1) <= maximo
}

export async function corpo<T>(req: Request, limite = 20_000): Promise<T | null> {
  const txt = await req.text()
  if (txt.length > limite) return null
  try {
    return JSON.parse(txt) as T
  } catch {
    return null
  }
}

export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

export const limpa = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
export const urlOk = (v: unknown) => {
  const s = limpa(v, 600)
  return /^https:\/\/[^\s]+$/i.test(s) ? s : null
}

/** CSV no padrão do Excel brasileiro (; e BOM), com proteção contra fórmula. */
export function csv(linhas: (string | number | null | undefined)[][]) {
  const cel = (v: string | number | null | undefined) => {
    let s = v == null ? '' : String(v)
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + linhas.map((l) => l.map(cel).join(';')).join('\r\n')
}

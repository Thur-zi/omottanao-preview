/** Senha (PBKDF2) e código do celular (TOTP, RFC 6238) com Web Crypto. */

const enc = new TextEncoder()
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const deHex = (s: string) => new Uint8Array(s.match(/../g)!.map((h) => parseInt(h, 16)))

export const ITERACOES = 100_000

export async function hashSenha(senha: string, salHex: string) {
  const chave = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: deHex(salHex), iterations: ITERACOES }, chave, 256)
  return hex(bits)
}

/** Comparação em tempo constante. */
export function iguais(a: string, b: string) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

/* ---------- TOTP ---------- */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function novoSegredo(bytes = 20) {
  const b = new Uint8Array(bytes)
  crypto.getRandomValues(b)
  let bits = ''
  for (const x of b) bits += x.toString(2).padStart(8, '0')
  let s = ''
  for (let i = 0; i + 5 <= bits.length; i += 5) s += B32[parseInt(bits.slice(i, i + 5), 2)]
  return s
}

function deBase32(s: string) {
  let bits = ''
  for (const c of s.replace(/=+$/, '').toUpperCase()) {
    const v = B32.indexOf(c)
    if (v < 0) continue
    bits += v.toString(2).padStart(5, '0')
  }
  const out = new Uint8Array(Math.floor(bits.length / 8))
  for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2)
  return out
}

async function codigoEm(segredo: string, passo: number) {
  const chave = await crypto.subtle.importKey('raw', deBase32(segredo), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const msg = new ArrayBuffer(8)
  new DataView(msg).setUint32(4, passo)
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', chave, msg))
  const o = h[h.length - 1] & 0xf
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(n % 1_000_000).padStart(6, '0')
}

/** Aceita o código atual e um passo antes/depois (relógio do celular adiantado/atrasado). */
export async function codigoValido(segredo: string, codigo: string) {
  if (!/^\d{6}$/.test(codigo)) return false
  const passo = Math.floor(Date.now() / 30_000)
  for (const d of [0, -1, 1]) if (iguais(await codigoEm(segredo, passo + d), codigo)) return true
  return false
}

export const uriTotp = (segredo: string, usuario: string) =>
  `otpauth://totp/${encodeURIComponent('O Motta Não')}:${encodeURIComponent(usuario)}?secret=${segredo}&issuer=${encodeURIComponent('O Motta Não')}&digits=6&period=30`

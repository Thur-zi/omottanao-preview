/** Cliente da API do painel. Escritas levam o cabeçalho anti-CSRF; o cookie de sessão é HttpOnly. */

export class ErroApi extends Error {
  constructor(public status: number, public motivo: string) {
    super(motivo)
  }
}

export async function api<T = unknown>(caminho: string, opcoes: { metodo?: string; corpo?: unknown } = {}): Promise<T> {
  const metodo = opcoes.metodo ?? (opcoes.corpo !== undefined ? 'POST' : 'GET')
  const r = await fetch(`/api/admin/${caminho}`, {
    method: metodo,
    credentials: 'same-origin',
    headers: metodo === 'GET' ? {} : { 'content-type': 'application/json', 'x-omn-painel': '1' },
    body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
  })
  const j = (await r.json().catch(() => ({}))) as { motivo?: string }
  if (!r.ok) throw new ErroApi(r.status, j.motivo || 'Erro inesperado')
  return j as T
}

export const fmt = new Intl.NumberFormat('pt-BR')
export const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—')
export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

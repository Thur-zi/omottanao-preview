/** POST /api/eventos — rastreio próprio em lote (sendBeacon / fetch keepalive). */
import { UFS, corpo, dentroDoLimite, dispositivo, ipHash, limpa, type Ctx } from '../../server/util'

const TIPOS = new Set([
  'visita', 'carimbo', 'explorar', 'secao_vista', 'cta', 'whatsapp_click', 'compartilhar', 'estado_visto',
  'card_gerado', 'form_inicio', 'form_campo', 'form_erro', 'lead',
])

type Lote = { sessao?: string; uf?: string; origem?: Record<string, string>; eventos?: { tipo?: string; dados?: Record<string, unknown> }[] }

const vazio = () => new Response(null, { status: 204 })

export const onRequestPost = async ({ request, env }: Ctx) => {
  const b = await corpo<Lote>(request, 16000)
  const sessao = limpa(b?.sessao, 40)
  if (!b || sessao.length < 8 || !Array.isArray(b.eventos)) return vazio()
  const ip = await ipHash(request, env)
  if (!(await dentroDoLimite(env.DB, `ev:${ip}`, 600, 600)) || !(await dentroDoLimite(env.DB, 'ev:global', 20000, 60))) return vazio()

  const o = b.origem || {}
  let host: string | null = null
  try {
    host = o.referrer ? new URL(o.referrer).hostname.replace(/^www\./, '') : null
  } catch {
    host = null
  }
  const ufBruta = limpa(b.uf, 2).toUpperCase()
  const uf = UFS.includes(ufBruta) ? ufBruta : null
  const disp = dispositivo(request)
  const stmt = env.DB.prepare(
    `INSERT INTO eventos (sessao, tipo, dados, uf, pagina, utm_source, utm_medium, utm_campaign, referrer_host, dispositivo, ip_hash)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`,
  )
  const lote = b.eventos
    .slice(0, 25)
    .filter((e) => TIPOS.has(String(e?.tipo)))
    .map((e) => {
      const dados: Record<string, string | number | boolean> = {}
      for (const [k, v] of Object.entries(e.dados || {}).slice(0, 8)) {
        if (typeof v === 'string') dados[k.slice(0, 30)] = v.slice(0, 120)
        else if (typeof v === 'number' || typeof v === 'boolean') dados[k.slice(0, 30)] = v
      }
      return stmt.bind(
        sessao,
        e.tipo as string,
        JSON.stringify(dados),
        uf,
        limpa(o.pagina, 200) || null,
        limpa(o.utm_source, 80) || null,
        limpa(o.utm_medium, 80) || null,
        limpa(o.utm_campaign, 120) || null,
        host,
        disp,
        ip,
      )
    })
  if (lote.length) await env.DB.batch(lote)
  return vazio()
}

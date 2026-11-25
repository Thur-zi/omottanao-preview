/**
 * GET /api/contador — total de assinaturas, para o contador ao vivo (tela da live).
 * Só o número agregado: nenhum dado pessoal. Cache de 3 s na borda: aguenta muitas telas abertas
 * sem pesar no banco, e o número na live fica no máximo ~3 s atrasado.
 */
import { json, type Ctx } from '../../server/util'

export const onRequestGet = async ({ request, env, waitUntil }: Ctx) => {
  const cache = (caches as unknown as { default: Cache }).default
  const chave = new Request(new URL('/api/contador', request.url).toString())
  const salvo = await cache.match(chave)
  if (salvo) return salvo

  const r = await env.DB.prepare(`SELECT COUNT(*) total FROM assinaturas`).first<{ total: number }>()
  const res = json({ total: r?.total ?? 0, em: new Date().toISOString() }, 200, {
    'cache-control': 'public, max-age=2, s-maxage=3',
    'access-control-allow-origin': '*',
  })
  waitUntil(cache.put(chave, res.clone()))
  return res
}

/** GET /api/conteudo — o que o site público lê do painel (cache de 60 s na borda). */
import { json, type Ctx } from '../../server/util'

const PUBLICAS = ['whatsapp_numero', 'ga4_id', 'meta_pixel_id', 'responsavel', 'encarregado_nome', 'encarregado_email', 'candidato_foto', 'previa', 'mostrar_contagem', 'mostrar_info_estado', 'mostrar_votometro', 'mostrar_como_funciona', 'mostrar_aviso', 'aviso_texto', 'mostrar_botoes_whatsapp']

export const onRequestGet = async ({ request, env, waitUntil }: Ctx) => {
  const cache = (caches as unknown as { default: Cache }).default
  const chave = new Request(new URL('/api/conteudo', request.url).toString())
  const salvo = await cache.match(chave)
  if (salvo) return salvo

  const [pos, mot, pau, cfg] = await env.DB.batch([
    env.DB.prepare(`SELECT id, deputado_id, nome, partido, uf, posicao, fonte, url, data_fonte, exemplo FROM posicoes WHERE ativo = 1 ORDER BY uf, nome`),
    env.DB.prepare(`SELECT id, tag, titulo, texto, fonte, url, exemplo FROM motivos WHERE ativo = 1 ORDER BY ordem, id`),
    env.DB.prepare(`SELECT id, titulo, exemplo FROM pautas WHERE ativo = 1 ORDER BY ordem, id`),
    env.DB.prepare(`SELECT chave, valor FROM config`),
  ])
  const config: Record<string, string> = {}
  for (const r of cfg.results as { chave: string; valor: string }[]) if (PUBLICAS.includes(r.chave)) config[r.chave] = r.valor
  const res = json({ posicoes: pos.results, motivos: mot.results, pautas: pau.results, config }, 200, {
    'cache-control': 'public, max-age=30, s-maxage=60',
  })
  waitUntil(cache.put(chave, res.clone()))
  return res
}

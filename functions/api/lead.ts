/** POST /api/lead — assinatura do NÃO. */
import { UFS, agora, corpo, dentroDoLimite, dispositivo, erro, ipHash, json, limpa, type Ctx } from '../../server/util'
import { configWebhook, corpoWebhook, enviarWebhook } from '../../server/webhook'

const COD_UF: Record<string, string> = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17', MA: '21', PI: '22', CE: '23', RN: '24', PB: '25', PE: '26', AL: '27',
  SE: '28', BA: '29', MG: '31', ES: '32', RJ: '33', SP: '35', PR: '41', SC: '42', RS: '43', MS: '50', MT: '51', GO: '52', DF: '53',
}

type Entrada = {
  nome?: string
  sobrenome?: string
  whatsapp?: string
  uf?: string
  cidade?: string
  cidade_ibge?: number
  consentimento?: { aceito?: boolean; versao?: string }
  origem?: Record<string, string>
  sessao?: string
  empresa?: string
  tempo?: number
}

export const onRequestPost = async ({ request, env, waitUntil }: Ctx) => {
  const b = await corpo<Entrada>(request, 8000)
  if (!b) return erro('formato')
  // armadilha para robôs: campo invisível preenchido ou envio rápido demais
  if (b.empresa) return json({ ok: true, novo: true })
  if (typeof b.tempo === 'number' && b.tempo < 2500) return erro('rapido', 429)

  const nome = limpa(b.nome, 40)
  const sobrenome = limpa(b.sobrenome, 60)
  const whatsapp = String(b.whatsapp || '').replace(/\D/g, '')
  const uf = limpa(b.uf, 2).toUpperCase()
  const cidade = limpa(b.cidade, 80)
  const ibge = Number(b.cidade_ibge) || null
  if (nome.length < 2) return erro('nome')
  if (sobrenome.length < 2) return erro('sobrenome')
  if (!/^55[1-9]{2}9\d{8}$/.test(whatsapp)) return erro('whatsapp')
  if (!UFS.includes(uf)) return erro('uf')
  if (cidade.length < 2 || (ibge && !String(ibge).startsWith(COD_UF[uf]))) return erro('cidade')
  if (b.consentimento?.aceito !== true) return erro('consentimento')

  const ip = await ipHash(request, env)
  const db = env.DB
  if (!(await dentroDoLimite(db, `lead:h:${ip}`, 10, 3600)) || !(await dentroDoLimite(db, `lead:d:${ip}`, 30, 86400))) return erro('limite', 429)
  if (!(await dentroDoLimite(db, 'lead:global', 3000, 60))) return erro('limite', 429)

  const o = b.origem || {}
  const aceite = agora()
  const versao = limpa(b.consentimento?.versao, 40) || 'v1'
  const r = await db
    .prepare(
      `INSERT INTO assinaturas (id, nome, sobrenome, whatsapp, uf, cidade, cidade_ibge, aceite_em, versao_termo,
         utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, pagina, sessao, dispositivo, ip_hash)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19)
       ON CONFLICT(whatsapp) DO UPDATE SET vezes = vezes + 1, nome = excluded.nome, sobrenome = excluded.sobrenome,
         uf = excluded.uf, cidade = excluded.cidade, cidade_ibge = excluded.cidade_ibge, aceite_em = excluded.aceite_em,
         versao_termo = excluded.versao_termo, atualizado_em = excluded.aceite_em
       RETURNING vezes`,
    )
    .bind(
      crypto.randomUUID(),
      nome,
      sobrenome,
      whatsapp,
      uf,
      cidade,
      ibge,
      aceite,
      versao,
      limpa(o.utm_source, 80) || null,
      limpa(o.utm_medium, 80) || null,
      limpa(o.utm_campaign, 120) || null,
      limpa(o.utm_content, 120) || null,
      limpa(o.utm_term, 120) || null,
      limpa(o.referrer, 300) || null,
      limpa(o.pagina, 300) || null,
      limpa(b.sessao, 40) || null,
      dispositivo(request),
      ip,
    )
    .first<{ vezes: number }>()
  const vezes = r?.vezes ?? 1
  // automação do WhatsApp: avisa em segundo plano (não atrasa a resposta para a pessoa)
  const wh = await configWebhook(db)
  if (wh.url) {
    const evento = vezes === 1 ? 'assinatura.nova' : 'assinatura.repetida'
    const corpoWh = corpoWebhook(evento, {
      nome, sobrenome, whatsapp, uf, cidade, cidade_ibge: ibge, versao_termo: versao, aceite_em: aceite, vezes,
      origem: {
        utm_source: limpa(o.utm_source, 80) || null,
        utm_medium: limpa(o.utm_medium, 80) || null,
        utm_campaign: limpa(o.utm_campaign, 120) || null,
        utm_content: limpa(o.utm_content, 120) || null,
        utm_term: limpa(o.utm_term, 120) || null,
        referrer: limpa(o.referrer, 300) || null,
      },
    })
    waitUntil(enviarWebhook(db, wh.url, wh.segredo, evento, corpoWh))
  }
  return json({ ok: true, novo: vezes === 1 })
}

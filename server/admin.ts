/**
 * API do painel (/api/admin/*). Sessão em cookie HttpOnly; tudo exige senha + código do celular (nível 2),
 * exceto o próprio login. Ações sensíveis vão para a auditoria.
 */
import { codigoValido, hashSenha, iguais, novoSegredo, uriTotp } from './seguranca'
import { UFS, agora, aleatorio, corpo, csv, dentroDoLimite, erro, ipHash, json, limpa, sha256, urlOk, type Ctx, type Env } from './util'

type Admin = { id: number; usuario: string; nome: string; senha_hash: string; senha_sal: string; totp_secret: string | null; totp_ativo: number; ativo: number }
type Sessao = { token_hash: string; admin_id: number; nivel: number }
type Auth = { admin: Admin; sessao: Sessao }

const COOKIE = 'omn_sessao'
const HORAS = 12

function lerCookie(req: Request) {
  const m = (req.headers.get('cookie') || '').match(new RegExp(`(?:^|; )${COOKIE}=([a-f0-9]{64})`))
  return m ? m[1] : null
}
const cookie = (token: string, maxAge: number) => `${COOKIE}=${token}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`

async function autenticar(req: Request, db: D1Database): Promise<Auth | null> {
  const token = lerCookie(req)
  if (!token) return null
  const th = await sha256(token)
  const s = await db.prepare(`SELECT token_hash, admin_id, nivel FROM sessoes WHERE token_hash = ? AND expira_em > ?`).bind(th, agora()).first<Sessao>()
  if (!s) return null
  const a = await db.prepare(`SELECT * FROM admins WHERE id = ? AND ativo = 1`).bind(s.admin_id).first<Admin>()
  return a ? { admin: a, sessao: s } : null
}

async function auditar(db: D1Database, a: Admin | null, acao: string, detalhes: Record<string, unknown> = {}) {
  await db.prepare(`INSERT INTO auditoria (admin_id, usuario, acao, detalhes) VALUES (?, ?, ?, ?)`).bind(a?.id ?? null, a?.usuario ?? null, acao, JSON.stringify(detalhes)).run()
}

async function limparCacheConteudo(req: Request) {
  try {
    await (caches as unknown as { default: Cache }).default.delete(new Request(new URL('/api/conteudo', req.url).toString()))
  } catch {
    /* sem cache local */
  }
}

const mascarar = (w: string) => (w.length > 8 ? `${w.slice(0, 4)} •••• ${w.slice(-2)}` : '••••')

/* ------------------------------------------------------------------ */
/* Login                                                              */
/* ------------------------------------------------------------------ */

async function login(req: Request, env: Env) {
  const b = await corpo<{ usuario?: string; senha?: string }>(req, 2000)
  const usuario = limpa(b?.usuario, 80).toLowerCase()
  const senha = typeof b?.senha === 'string' ? b.senha : ''
  const ip = await ipHash(req, env)
  if (!(await dentroDoLimite(env.DB, `login:ip:${ip}`, 10, 900)) || !(await dentroDoLimite(env.DB, `login:u:${usuario}`, 8, 900))) {
    return erro('Muitas tentativas. Espere 15 minutos.', 429)
  }
  const a = await env.DB.prepare(`SELECT * FROM admins WHERE usuario = ? AND ativo = 1`).bind(usuario).first<Admin>()
  // calcula o hash mesmo sem usuário, para não revelar quem existe pelo tempo de resposta
  const h = await hashSenha(senha, a?.senha_sal ?? '00'.repeat(16))
  if (!a || !iguais(h, a.senha_hash)) {
    await auditar(env.DB, null, 'login_falhou', { usuario })
    return erro('Usuário ou senha incorretos.', 401)
  }
  const token = aleatorio(32)
  const expira = new Date(Date.now() + HORAS * 3600_000).toISOString()
  await env.DB.prepare(`INSERT INTO sessoes (token_hash, admin_id, nivel, expira_em) VALUES (?, ?, 1, ?)`).bind(await sha256(token), a.id, expira).run()
  await env.DB.prepare(`DELETE FROM sessoes WHERE expira_em < ?`).bind(agora()).run()
  return json({ ok: true, etapa: a.totp_ativo ? 'codigo' : 'configurar' }, 200, { 'set-cookie': cookie(token, HORAS * 3600) })
}

async function subirNivel(env: Env, auth: Auth) {
  await env.DB.batch([
    env.DB.prepare(`UPDATE sessoes SET nivel = 2 WHERE token_hash = ?`).bind(auth.sessao.token_hash),
    env.DB.prepare(`UPDATE admins SET ultimo_login = ? WHERE id = ?`).bind(agora(), auth.admin.id),
  ])
}

/* ------------------------------------------------------------------ */
/* Painel: indicadores                                                */
/* ------------------------------------------------------------------ */

function inicioDoPeriodo(dias: number) {
  if (dias <= 0) return '1970-01-01T00:00:00.000Z'
  const agoraBr = new Date(Date.now() - 3 * 3600_000)
  if (dias === 1) {
    agoraBr.setUTCHours(0, 0, 0, 0)
    return new Date(agoraBr.getTime() + 3 * 3600_000).toISOString()
  }
  return new Date(Date.now() - dias * 86400_000).toISOString()
}

async function resumo(url: URL, env: Env) {
  const dias = Number(url.searchParams.get('dias') ?? 7)
  const uf = (url.searchParams.get('uf') || '').toUpperCase()
  const desde = inicioDoPeriodo(dias)
  const fUf = UFS.includes(uf) ? ' AND uf = ?2' : ''
  const args = UFS.includes(uf) ? [desde, uf] : [desde]
  const fmt = dias === 1 ? '%Y-%m-%d %H:00' : '%Y-%m-%d'
  const q = (sql: string) => env.DB.prepare(sql).bind(...args)
  const ev = `FROM eventos WHERE criado_em >= ?1${fUf}`
  const as = `FROM assinaturas WHERE criado_em >= ?1${fUf}`
  const [k, ka, sv, sa, porUf, cidades, origens, campanhas, disp, hora, secoes, ctas, erros, estados, sl] = await env.DB.batch([
    q(`SELECT COUNT(DISTINCT CASE WHEN tipo='visita' THEN sessao END) visitantes,
              COUNT(DISTINCT CASE WHEN tipo='carimbo' THEN sessao END) carimbaram,
              COUNT(DISTINCT CASE WHEN tipo='secao_vista' AND json_extract(dados,'$.secao')='assine' THEN sessao END) viram_form,
              COUNT(DISTINCT CASE WHEN tipo='form_inicio' THEN sessao END) comecaram,
              COUNT(DISTINCT CASE WHEN tipo='lead' THEN sessao END) assinaram_sessoes,
              COUNT(DISTINCT CASE WHEN tipo='whatsapp_click' THEN sessao END) whatsapp,
              COUNT(DISTINCT CASE WHEN tipo='estado_visto' THEN sessao END) mapa,
              SUM(tipo='card_gerado') cards,
              SUM(tipo='compartilhar') compartilhamentos ${ev}`),
    q(`SELECT COUNT(*) novas, COALESCE(SUM(vezes > 1), 0) repetidas, (SELECT COUNT(*) FROM assinaturas) total ${as}`),
    q(`SELECT strftime('${fmt}', criado_em, '-3 hours') t, COUNT(DISTINCT sessao) n ${ev} AND tipo = 'visita' GROUP BY t ORDER BY t`),
    q(`SELECT strftime('${fmt}', criado_em, '-3 hours') t, COUNT(*) n ${as} GROUP BY t ORDER BY t`),
    q(`SELECT uf r, COUNT(*) n ${as} GROUP BY uf ORDER BY n DESC`),
    q(`SELECT cidade || ' · ' || uf r, COUNT(*) n ${as} GROUP BY cidade, uf ORDER BY n DESC LIMIT 15`),
    q(`SELECT COALESCE(utm_source, referrer_host, 'direto') r, COUNT(DISTINCT sessao) n ${ev} AND tipo = 'visita' GROUP BY r ORDER BY n DESC LIMIT 10`),
    q(`SELECT COALESCE(utm_campaign, utm_source, 'sem campanha') r, COUNT(*) n ${as} GROUP BY r ORDER BY n DESC LIMIT 10`),
    q(`SELECT COALESCE(dispositivo, '?') r, COUNT(DISTINCT sessao) n ${ev} AND tipo = 'visita' GROUP BY r ORDER BY n DESC`),
    q(`SELECT CAST(strftime('%H', criado_em, '-3 hours') AS INTEGER) r, COUNT(*) n ${as} GROUP BY r`),
    q(`SELECT json_extract(dados,'$.secao') r, COUNT(DISTINCT sessao) n ${ev} AND tipo = 'secao_vista' GROUP BY r ORDER BY n DESC`),
    q(`SELECT tipo || CASE WHEN json_extract(dados,'$.local') IS NOT NULL THEN ' · ' || json_extract(dados,'$.local') ELSE '' END r, COUNT(*) n
       ${ev} AND tipo IN ('cta','whatsapp_click','compartilhar','explorar','carimbo','card_gerado') GROUP BY r ORDER BY n DESC LIMIT 15`),
    q(`SELECT json_extract(dados,'$.campo') r, COUNT(*) n ${ev} AND tipo = 'form_erro' GROUP BY r ORDER BY n DESC`),
    q(`SELECT json_extract(dados,'$.uf') r, COUNT(*) n ${ev} AND tipo = 'estado_visto' GROUP BY r ORDER BY n DESC LIMIT 10`),
    env.DB.prepare(`SELECT COUNT(*) n FROM posicoes WHERE posicao = 'nao' AND ativo = 1 AND exemplo = 0`),
  ])
  const pri = <T>(r: D1Result) => (r.results[0] ?? {}) as T
  const kpi = pri<Record<string, number>>(k)
  const kpa = pri<Record<string, number>>(ka)
  // série: junta visitantes e assinaturas por período
  const mapa = new Map<string, { t: string; visitantes: number; assinaturas: number }>()
  for (const r of sv.results as { t: string; n: number }[]) mapa.set(r.t, { t: r.t, visitantes: r.n, assinaturas: 0 })
  for (const r of sa.results as { t: string; n: number }[]) mapa.set(r.t, { ...(mapa.get(r.t) ?? { t: r.t, visitantes: 0, assinaturas: 0 }), assinaturas: r.n })
  const horas = Array.from({ length: 24 }, (_, h) => ({ r: h, n: 0 }))
  for (const r of hora.results as { r: number; n: number }[]) horas[r.r].n = r.n
  return json({
    periodo: { dias, desde, uf: UFS.includes(uf) ? uf : null },
    kpis: { ...kpi, ...kpa, nao_reais: pri<{ n: number }>(sl).n ?? 0 },
    serie: [...mapa.values()].sort((a, b) => a.t.localeCompare(b.t)),
    funil: [
      { etapa: 'Visitaram', n: kpi.visitantes || 0 },
      { etapa: 'Carimbaram', n: kpi.carimbaram || 0 },
      { etapa: 'Viram o formulário', n: kpi.viram_form || 0 },
      { etapa: 'Começaram a preencher', n: kpi.comecaram || 0 },
      { etapa: 'Assinaram', n: kpi.assinaram_sessoes || 0 },
      { etapa: 'Entraram no WhatsApp', n: kpi.whatsapp || 0 },
    ],
    porUf: porUf.results,
    cidades: cidades.results,
    origens: origens.results,
    campanhas: campanhas.results,
    dispositivos: disp.results,
    porHora: horas,
    secoes: secoes.results,
    ctas: ctas.results,
    erros: erros.results,
    estados: estados.results,
  })
}

/* ------------------------------------------------------------------ */
/* Assinaturas                                                        */
/* ------------------------------------------------------------------ */

async function listarAssinaturas(url: URL, env: Env, auth: Auth) {
  const pagina = Math.max(1, Number(url.searchParams.get('pagina')) || 1)
  const busca = limpa(url.searchParams.get('busca'), 60)
  const uf = (url.searchParams.get('uf') || '').toUpperCase()
  const revelar = url.searchParams.get('revelar') === '1'
  const cond: string[] = []
  const args: (string | number)[] = []
  if (UFS.includes(uf)) {
    cond.push(`uf = ?${args.length + 1}`)
    args.push(uf)
  }
  if (busca) {
    const dig = busca.replace(/\D/g, '')
    cond.push(`(nome || ' ' || sobrenome LIKE ?${args.length + 1} OR cidade LIKE ?${args.length + 1}${dig.length >= 4 ? ` OR whatsapp LIKE ?${args.length + 2}` : ''})`)
    args.push(`%${busca}%`)
    if (dig.length >= 4) args.push(`%${dig}%`)
  }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''
  const por = 50
  const [lista, total] = await env.DB.batch([
    env.DB.prepare(
      `SELECT id, nome, sobrenome, whatsapp, uf, cidade, utm_source, utm_campaign, dispositivo, vezes, criado_em FROM assinaturas ${where}
       ORDER BY criado_em DESC LIMIT ${por} OFFSET ${(pagina - 1) * por}`,
    ).bind(...args),
    env.DB.prepare(`SELECT COUNT(*) n FROM assinaturas ${where}`).bind(...args),
  ])
  if (revelar) await auditar(env.DB, auth.admin, 'revelou_numeros', { pagina, busca, uf })
  const itens = (lista.results as Record<string, string | number>[]).map((r) => ({ ...r, whatsapp: revelar ? r.whatsapp : mascarar(String(r.whatsapp)) }))
  return json({ itens, total: (total.results[0] as { n: number }).n, pagina, por })
}

async function exportar(url: URL, env: Env, auth: Auth) {
  const uf = (url.searchParams.get('uf') || '').toUpperCase()
  const r = await env.DB.prepare(
    `SELECT criado_em, nome, sobrenome, whatsapp, uf, cidade, cidade_ibge, utm_source, utm_medium, utm_campaign, dispositivo, vezes, aceite_em, versao_termo
     FROM assinaturas ${UFS.includes(uf) ? 'WHERE uf = ?1' : ''} ORDER BY criado_em DESC`,
  )
    .bind(...(UFS.includes(uf) ? [uf] : []))
    .all<Record<string, string | number | null>>()
  await auditar(env.DB, auth.admin, 'exportou_csv', { uf: uf || 'todos', linhas: r.results.length })
  const cab = ['data', 'nome', 'sobrenome', 'whatsapp', 'uf', 'cidade', 'cidade_ibge', 'utm_source', 'utm_medium', 'utm_campaign', 'dispositivo', 'vezes', 'aceite_em', 'versao_termo']
  const linhas = r.results.map((x) => [x.criado_em, x.nome, x.sobrenome, x.whatsapp, x.uf, x.cidade, x.cidade_ibge, x.utm_source, x.utm_medium, x.utm_campaign, x.dispositivo, x.vezes, x.aceite_em, x.versao_termo])
  return new Response(csv([cab, ...linhas]), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="assinaturas-${uf || 'todas'}-${agora().slice(0, 10)}.csv"`,
      'cache-control': 'no-store',
    },
  })
}

/* ------------------------------------------------------------------ */
/* Conteúdo (votômetro, por que não, pautas)                          */
/* ------------------------------------------------------------------ */

type Campo = { nome: string; max?: number; tipo?: 'texto' | 'url' | 'num' | 'bool' | 'uf' | 'posicao'; obrigatorio?: boolean }
const TABELAS: Record<string, { campos: Campo[]; ordem?: boolean }> = {
  posicoes: {
    campos: [
      { nome: 'deputado_id', tipo: 'num' },
      { nome: 'nome', max: 80, obrigatorio: true },
      { nome: 'partido', max: 20 },
      { nome: 'uf', tipo: 'uf', obrigatorio: true },
      { nome: 'posicao', tipo: 'posicao', obrigatorio: true },
      { nome: 'fonte', max: 120 },
      { nome: 'url', tipo: 'url' },
      { nome: 'data_fonte', max: 10 },
      { nome: 'ativo', tipo: 'bool' },
    ],
  },
  motivos: {
    ordem: true,
    campos: [
      { nome: 'tag', max: 30 },
      { nome: 'titulo', max: 90, obrigatorio: true },
      { nome: 'texto', max: 320 },
      { nome: 'fonte', max: 120 },
      { nome: 'url', tipo: 'url' },
      { nome: 'ativo', tipo: 'bool' },
    ],
  },
  pautas: { ordem: true, campos: [{ nome: 'titulo', max: 70, obrigatorio: true }, { nome: 'ativo', tipo: 'bool' }] },
}

function validarCampos(tabela: string, b: Record<string, unknown>, parcial: boolean) {
  const def = TABELAS[tabela]
  const saida: Record<string, string | number | null> = {}
  for (const c of def.campos) {
    if (!(c.nome in b)) {
      if (c.obrigatorio && !parcial) return { erro: `Preencha ${c.nome}.` }
      continue
    }
    const v = b[c.nome]
    switch (c.tipo) {
      case 'num':
        saida[c.nome] = v == null || v === '' ? null : Number(v) || null
        break
      case 'bool':
        saida[c.nome] = v ? 1 : 0
        break
      case 'url':
        if (v && !urlOk(v)) return { erro: 'O link precisa começar com https://' }
        saida[c.nome] = v ? urlOk(v) : null
        break
      case 'uf': {
        const u = limpa(v, 2).toUpperCase()
        if (!UFS.includes(u)) return { erro: 'Estado inválido.' }
        saida[c.nome] = u
        break
      }
      case 'posicao':
        if (v !== 'nao' && v !== 'motta') return { erro: 'Posição inválida.' }
        saida[c.nome] = v
        break
      default: {
        const t = limpa(v, c.max ?? 200)
        if (c.obrigatorio && !t) return { erro: `Preencha ${c.nome}.` }
        saida[c.nome] = t
      }
    }
  }
  return { dados: saida }
}

async function conteudo(req: Request, env: Env, auth: Auth, tabela: string, id: number | null, sub: string | undefined) {
  const def = TABELAS[tabela]
  const db = env.DB
  if (req.method === 'GET') {
    const r = await db.prepare(`SELECT * FROM ${tabela} ORDER BY ${def.ordem ? 'ordem, id' : 'uf, nome'}`).all()
    return json({ itens: r.results })
  }
  if (req.method === 'POST' && sub === 'ordem' && def.ordem) {
    const b = await corpo<{ ids?: number[] }>(req)
    const ids = (b?.ids ?? []).map(Number).filter(Boolean).slice(0, 200)
    await db.batch(ids.map((x, i) => db.prepare(`UPDATE ${tabela} SET ordem = ? WHERE id = ?`).bind(i + 1, x)))
    await auditar(db, auth.admin, `${tabela}_reordenou`, { ids })
    await limparCacheConteudo(req)
    return json({ ok: true })
  }
  if (req.method === 'POST' && !id) {
    const b = await corpo<Record<string, unknown>>(req)
    const v = validarCampos(tabela, b ?? {}, false)
    if (v.erro) return erro(v.erro)
    const dados = { ...v.dados! }
    if (def.ordem) dados.ordem = Date.now() % 1_000_000_000
    const cols = Object.keys(dados)
    const r = await db
      .prepare(`INSERT INTO ${tabela} (${cols.join(',')}) VALUES (${cols.map((_, i) => `?${i + 1}`).join(',')}) RETURNING id`)
      .bind(...Object.values(dados))
      .first<{ id: number }>()
    await auditar(db, auth.admin, `${tabela}_criou`, { id: r?.id, ...dados })
    await limparCacheConteudo(req)
    return json({ ok: true, id: r?.id })
  }
  if (req.method === 'PUT' && id) {
    const b = await corpo<Record<string, unknown>>(req)
    const v = validarCampos(tabela, b ?? {}, true)
    if (v.erro) return erro(v.erro)
    const dados: Record<string, string | number | null> = { ...v.dados!, exemplo: 0 }
    if (tabela === 'posicoes' || tabela === 'motivos') dados.atualizado_em = agora()
    const cols = Object.keys(dados)
    await db
      .prepare(`UPDATE ${tabela} SET ${cols.map((c, i) => `${c} = ?${i + 1}`).join(', ')} WHERE id = ?${cols.length + 1}`)
      .bind(...Object.values(dados), id)
      .run()
    await auditar(db, auth.admin, `${tabela}_editou`, { id, ...dados })
    await limparCacheConteudo(req)
    return json({ ok: true })
  }
  if (req.method === 'DELETE' && id) {
    await db.prepare(`DELETE FROM ${tabela} WHERE id = ?`).bind(id).run()
    await auditar(db, auth.admin, `${tabela}_apagou`, { id })
    await limparCacheConteudo(req)
    return json({ ok: true })
  }
  return erro('rota', 404)
}

/* ------------------------------------------------------------------ */
/* Roteador                                                           */
/* ------------------------------------------------------------------ */

const CONFIG_CHAVES = ['whatsapp_numero', 'ga4_id', 'meta_pixel_id', 'responsavel', 'encarregado_nome', 'encarregado_email', 'candidato_foto', 'previa', 'mostrar_contagem', 'mostrar_info_estado', 'mostrar_votometro']

export async function rotaAdmin(ctx: Ctx): Promise<Response> {
  const { request: req, env } = ctx
  const url = new URL(req.url)
  const partes = url.pathname.replace(/^\/api\/admin\/?/, '').split('/').filter(Boolean)
  const [r0, r1, r2] = partes
  const metodo = req.method

  // proteção contra CSRF: escrita só com o cabeçalho que o painel envia
  if (metodo !== 'GET' && req.headers.get('x-omn-painel') !== '1') return erro('origem', 403)

  if (r0 === 'login' && metodo === 'POST') return login(req, env)

  const auth = await autenticar(req, env.DB)
  if (r0 === 'sair' && metodo === 'POST') {
    if (auth) await env.DB.prepare(`DELETE FROM sessoes WHERE token_hash = ?`).bind(auth.sessao.token_hash).run()
    return json({ ok: true }, 200, { 'set-cookie': cookie('0'.repeat(64), 0) })
  }
  if (!auth) return erro('sessao', 401)

  if (r0 === 'eu') {
    return json({
      usuario: auth.admin.usuario,
      nome: auth.admin.nome,
      nivel: auth.sessao.nivel,
      etapa: auth.sessao.nivel >= 2 ? 'ok' : auth.admin.totp_ativo ? 'codigo' : 'configurar',
    })
  }

  /* ---- segundo fator ---- */
  if (r0 === 'totp') {
    if (r1 === 'iniciar' && metodo === 'POST') {
      if (auth.admin.totp_ativo) return erro('O celular já está cadastrado.')
      const segredo = novoSegredo()
      await env.DB.prepare(`UPDATE admins SET totp_secret = ? WHERE id = ?`).bind(segredo, auth.admin.id).run()
      return json({ segredo, uri: uriTotp(segredo, auth.admin.usuario) })
    }
    if ((r1 === 'confirmar' || r1 === 'verificar') && metodo === 'POST') {
      const ip = await ipHash(req, env)
      if (!(await dentroDoLimite(env.DB, `totp:${auth.admin.id}:${ip}`, 8, 900))) return erro('Muitas tentativas. Espere 15 minutos.', 429)
      const b = await corpo<{ codigo?: string }>(req, 500)
      const segredo = auth.admin.totp_secret
      if (!segredo || !(await codigoValido(segredo, String(b?.codigo || '').replace(/\D/g, '')))) return erro('Código inválido. Confira o horário do celular.', 401)
      if (r1 === 'confirmar') await env.DB.prepare(`UPDATE admins SET totp_ativo = 1 WHERE id = ?`).bind(auth.admin.id).run()
      await subirNivel(env, auth)
      await auditar(env.DB, auth.admin, r1 === 'confirmar' ? 'cadastrou_celular' : 'login')
      return json({ ok: true })
    }
  }

  if (auth.sessao.nivel < 2) return erro('codigo', 401)

  /* ---- painel ---- */
  if (r0 === 'resumo' && metodo === 'GET') return resumo(url, env)
  if (r0 === 'assinaturas') {
    if (r1 === 'csv' && metodo === 'GET') return exportar(url, env, auth)
    if (r1 === 'apagar' && metodo === 'POST') {
      const b = await corpo<{ ids?: string[] }>(req)
      const ids = (b?.ids ?? []).filter((x) => typeof x === 'string').slice(0, 200)
      if (!ids.length) return erro('Nada selecionado.')
      await env.DB.prepare(`DELETE FROM assinaturas WHERE id IN (${ids.map((_, i) => `?${i + 1}`).join(',')})`).bind(...ids).run()
      await auditar(env.DB, auth.admin, 'apagou_assinaturas', { quantidade: ids.length })
      return json({ ok: true })
    }
    if (metodo === 'GET') return listarAssinaturas(url, env, auth)
  }
  if (r0 && r0 in TABELAS) return conteudo(req, env, auth, r0, r1 && /^\d+$/.test(r1) ? Number(r1) : null, r1 && !/^\d+$/.test(r1) ? r1 : r2)

  if (r0 === 'exemplos' && r1 === 'apagar' && metodo === 'POST') {
    await env.DB.batch(['posicoes', 'motivos', 'pautas'].map((t) => env.DB.prepare(`DELETE FROM ${t} WHERE exemplo = 1`)))
    await env.DB.prepare(`UPDATE config SET valor = '0' WHERE chave = 'previa'`).run()
    await auditar(env.DB, auth.admin, 'apagou_exemplos')
    await limparCacheConteudo(req)
    return json({ ok: true })
  }

  if (r0 === 'config') {
    if (metodo === 'GET') {
      const r = await env.DB.prepare(`SELECT chave, valor FROM config`).all<{ chave: string; valor: string }>()
      const [ex] = await Promise.all([
        env.DB.prepare(`SELECT (SELECT COUNT(*) FROM posicoes WHERE exemplo=1) + (SELECT COUNT(*) FROM motivos WHERE exemplo=1) + (SELECT COUNT(*) FROM pautas WHERE exemplo=1) n`).first<{ n: number }>(),
      ])
      return json({ config: Object.fromEntries(r.results.map((x) => [x.chave, x.valor])), exemplos: ex?.n ?? 0 })
    }
    if (metodo === 'PUT') {
      const b = (await corpo<Record<string, unknown>>(req)) ?? {}
      const pares = Object.entries(b).filter(([k]) => CONFIG_CHAVES.includes(k))
      for (const [k, v] of pares) {
        const s = limpa(v, 300)
        if (k === 'whatsapp_numero' && s && !/^55\d{10,11}$/.test(s.replace(/\D/g, ''))) return erro('WhatsApp no formato 55 + DDD + número.')
        if (k === 'ga4_id' && s && !/^G-[A-Z0-9]{4,15}$/.test(s)) return erro('ID do GA4 no formato G-XXXXXXX.')
        if (k === 'meta_pixel_id' && s && !/^\d{6,20}$/.test(s)) return erro('O Pixel da Meta é só número.')
      }
      await env.DB.batch(
        pares.map(([k, v]) =>
          env.DB.prepare(`INSERT INTO config (chave, valor) VALUES (?1, ?2) ON CONFLICT(chave) DO UPDATE SET valor = ?2`).bind(
            k,
            k === 'whatsapp_numero' ? limpa(v, 30).replace(/\D/g, '') : limpa(v, 300),
          ),
        ),
      )
      await auditar(env.DB, auth.admin, 'editou_config', Object.fromEntries(pares))
      await limparCacheConteudo(req)
      return json({ ok: true })
    }
  }

  if (r0 === 'eventos' && metodo === 'GET') {
    const r = await env.DB.prepare(`SELECT id, criado_em, tipo, dados, uf, utm_source, referrer_host, dispositivo, substr(sessao,1,6) sessao FROM eventos ORDER BY id DESC LIMIT 60`).all()
    return json({ itens: r.results })
  }
  if (r0 === 'auditoria' && metodo === 'GET') {
    const r = await env.DB.prepare(`SELECT id, criado_em, usuario, acao, detalhes FROM auditoria ORDER BY id DESC LIMIT 120`).all()
    return json({ itens: r.results })
  }

  /* ---- equipe ---- */
  if (r0 === 'admins') {
    if (metodo === 'GET') {
      const r = await env.DB.prepare(`SELECT id, usuario, nome, totp_ativo, ativo, criado_em, ultimo_login FROM admins ORDER BY id`).all()
      return json({ itens: r.results, eu: auth.admin.id })
    }
    if (metodo === 'POST' && !r1) {
      const b = await corpo<{ usuario?: string; nome?: string; senha?: string }>(req, 2000)
      const usuario = limpa(b?.usuario, 80).toLowerCase()
      const senha = typeof b?.senha === 'string' ? b.senha : ''
      if (!/^[a-z0-9._@-]{3,80}$/.test(usuario)) return erro('Usuário: letras, números, ponto, hífen ou e-mail.')
      if (senha.length < 10) return erro('Senha com pelo menos 10 caracteres.')
      const sal = aleatorio(16)
      try {
        await env.DB.prepare(`INSERT INTO admins (usuario, nome, senha_hash, senha_sal) VALUES (?, ?, ?, ?)`).bind(usuario, limpa(b?.nome, 80), await hashSenha(senha, sal), sal).run()
      } catch {
        return erro('Esse usuário já existe.')
      }
      await auditar(env.DB, auth.admin, 'criou_admin', { usuario })
      return json({ ok: true })
    }
    const alvo = Number(r1)
    if (alvo && metodo === 'DELETE') {
      if (alvo === auth.admin.id) return erro('Você não pode remover a si mesmo.')
      await env.DB.batch([env.DB.prepare(`DELETE FROM sessoes WHERE admin_id = ?`).bind(alvo), env.DB.prepare(`DELETE FROM admins WHERE id = ?`).bind(alvo)])
      await auditar(env.DB, auth.admin, 'removeu_admin', { id: alvo })
      return json({ ok: true })
    }
    if (alvo && r2 === 'resetar-celular' && metodo === 'POST') {
      await env.DB.batch([
        env.DB.prepare(`UPDATE admins SET totp_ativo = 0, totp_secret = NULL WHERE id = ?`).bind(alvo),
        env.DB.prepare(`DELETE FROM sessoes WHERE admin_id = ?`).bind(alvo),
      ])
      await auditar(env.DB, auth.admin, 'resetou_celular', { id: alvo })
      return json({ ok: true })
    }
  }
  if (r0 === 'senha' && metodo === 'POST') {
    const b = await corpo<{ atual?: string; nova?: string }>(req, 2000)
    if (!iguais(await hashSenha(String(b?.atual ?? ''), auth.admin.senha_sal), auth.admin.senha_hash)) return erro('Senha atual incorreta.', 401)
    if (String(b?.nova ?? '').length < 10) return erro('A nova senha precisa de pelo menos 10 caracteres.')
    const sal = aleatorio(16)
    await env.DB.prepare(`UPDATE admins SET senha_hash = ?, senha_sal = ? WHERE id = ?`).bind(await hashSenha(String(b!.nova), sal), sal, auth.admin.id).run()
    await auditar(env.DB, auth.admin, 'trocou_senha')
    return json({ ok: true })
  }

  return erro('rota', 404)
}

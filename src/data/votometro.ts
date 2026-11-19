/**
 * Votômetro. Regra editorial: só entra quem se posicionou EM PÚBLICO, com fonte.
 * Quem não está listado conta como "a convencer".
 *
 * No Cloudflare, os registros vêm do painel (/api/conteudo) e substituem estes.
 * Levantamento inicial (nov/2026): só nomes com declaração pública e matéria de referência.
 */

export type Posicao = 'nao' | 'motta'

export type Registro = {
  uf: UF
  nome: string
  partido: string
  posicao: Posicao
  fonte: string
  url?: string
  foto?: string
  exemplo?: boolean
}

export const NOMES_UF = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
} as const
export type UF = keyof typeof NOMES_UF
export const UFS = (Object.keys(NOMES_UF) as UF[]).sort()

/** Cadeiras por UF (513; maioria absoluta = 257). Conferir se a composição de 2027 mudou. */
export const CADEIRAS: Record<UF, number> = {
  SP: 70, MG: 53, RJ: 46, BA: 39, RS: 31, PR: 30, PE: 25, CE: 22, MA: 18, GO: 17, PA: 17, SC: 16, PB: 12, ES: 10, PI: 10,
  AL: 9, AM: 8, RN: 8, MT: 8, MS: 8, DF: 8, SE: 8, RO: 8, TO: 8, AC: 8, AP: 8, RR: 8,
}

/* ---------- posições públicas reais, com fonte (o painel substitui por estas ou pelas que você cadastrar) ---------- */
export const REGISTROS: Registro[] = [
  { uf: 'SP', nome: "Luiz Philippe de Orleans e Bragança", partido: 'PL', posicao: 'nao', fonte: "Revista Fórum, 11/2026 · candidato contra Motta", url: 'https://revistaforum.com.br/politica/disputa-camara-pl-hugo-motta/', foto: `${import.meta.env.BASE_URL}deputados/204526.webp` },
  { uf: 'MG', nome: "Nikolas Ferreira", partido: 'PL', posicao: 'nao', fonte: "InfoMoney, 18/11/2026", url: 'https://www.infomoney.com.br/politica/nikolas-ameaca-deixar-pl-se-partido-apoiar-reeleicao-de-hugo-motta/', foto: `${import.meta.env.BASE_URL}deputados/209787.webp` },
  { uf: 'MG', nome: "Cristiano Caporezzo", partido: 'PL', posicao: 'nao', fonte: "O Tempo, 17/11/2026", url: 'https://www.otempo.com.br/politica/aparte/2026/11/17/membros-do-pl-divergem-de-nikolas-e-defendem-nome-de-centro-para-enfrentar-hugo-motta' },
  { uf: 'PB', nome: "Cabo Gilberto Silva", partido: 'PL', posicao: 'nao', fonte: "Gazeta do Povo, 16/11/2026", url: 'https://www.gazetadopovo.com.br/republica/disputa-por-cargos-e-resistencia-ao-pt-dividem-pl-sobre-apoio-a-hugo-motta/', foto: `${import.meta.env.BASE_URL}deputados/220574.webp` },
  { uf: 'SC', nome: "Julia Zanatta", partido: 'PL', posicao: 'nao', fonte: "Jornal Razão, 15/11/2026", url: 'https://jornalrazao.com/politica/pl-sc-contra-hugo-motta-candidato-proprio-camara', foto: `${import.meta.env.BASE_URL}deputados/220559.webp` },
  { uf: 'SC', nome: "Ricardo Guidi", partido: 'PL', posicao: 'nao', fonte: "Jornal Razão, 15/11/2026", url: 'https://jornalrazao.com/politica/pl-sc-contra-hugo-motta-candidato-proprio-camara', foto: `${import.meta.env.BASE_URL}deputados/204362.webp` },
  { uf: 'SC', nome: "Daniel Freitas", partido: 'PL', posicao: 'nao', fonte: "Jornal Razão, 15/11/2026", url: 'https://jornalrazao.com/politica/pl-sc-contra-hugo-motta-candidato-proprio-camara', foto: `${import.meta.env.BASE_URL}deputados/204367.webp` },
  { uf: 'SC', nome: "Zé Trovão", partido: 'PL', posicao: 'nao', fonte: "Jornal Razão, 15/11/2026", url: 'https://jornalrazao.com/politica/pl-sc-contra-hugo-motta-candidato-proprio-camara', foto: `${import.meta.env.BASE_URL}deputados/220558.webp` },
  { uf: 'SC', nome: "Daniela Reinehr", partido: 'PL', posicao: 'nao', fonte: "Jornal Razão, 15/11/2026", url: 'https://jornalrazao.com/politica/pl-sc-contra-hugo-motta-candidato-proprio-camara', foto: `${import.meta.env.BASE_URL}deputados/220557.webp` },
  { uf: 'SC', nome: "Sargento Lima", partido: 'PL', posicao: 'nao', fonte: "Jornal Razão, 15/11/2026", url: 'https://jornalrazao.com/politica/pl-sc-contra-hugo-motta-candidato-proprio-camara' },
  { uf: 'SC', nome: "Jair Renan Bolsonaro", partido: 'PL', posicao: 'nao', fonte: "Jornal Razão, 15/11/2026", url: 'https://jornalrazao.com/politica/pl-sc-contra-hugo-motta-candidato-proprio-camara' },
  { uf: 'PR', nome: "Paulo Martins", partido: 'NOVO', posicao: 'nao', fonte: "Band, 18/11/2026 · candidato do Novo", url: 'https://www.band.com.br/politica/novo-lanca-candidatura-de-paulo-martins-a-presidencia-da-camara' },
  { uf: 'PB', nome: "Hugo Motta", partido: 'REPUBLICANOS', posicao: 'motta', fonte: "Metrópoles, 11/11/2026 · candidato à reeleição", url: 'https://www.metropoles.com/brasil/sem-consenso-pl-reune-bancada-eleita-da-camara-para-discutir-apoio-a-motta', foto: `${import.meta.env.BASE_URL}deputados/160674.webp` },
  { uf: 'RJ', nome: "Altineu Côrtes", partido: 'PL', posicao: 'motta', fonte: "Gazeta do Povo, 16/11/2026", url: 'https://www.gazetadopovo.com.br/republica/disputa-por-cargos-e-resistencia-ao-pt-dividem-pl-sobre-apoio-a-hugo-motta/', foto: `${import.meta.env.BASE_URL}deputados/178937.webp` },
  { uf: 'BA', nome: "Antonio Brito", partido: 'PSD', posicao: 'motta', fonte: "Brasil em Folhas, 10/2026", url: 'https://www.brasilemfolhas.com.br/2026/10/dez-partidos-declaram-apoio-a-reeleicao-de-hugo-motta-na-camara/', foto: `${import.meta.env.BASE_URL}deputados/160553.webp` },
  { uf: 'SC', nome: "Pedro Uczai", partido: 'PT', posicao: 'motta', fonte: "CNN Brasil, 27/10/2026", url: 'https://www.cnnbrasil.com.br/politica/pt-pv-e-pcdob-anunciam-apoio-a-reeleicao-de-motta-na-presidencia-da-camara/', foto: `${import.meta.env.BASE_URL}deputados/160604.webp` },
  { uf: 'PR', nome: "Aliel Machado", partido: 'PV', posicao: 'motta', fonte: "CNN Brasil, 27/10/2026", url: 'https://www.cnnbrasil.com.br/politica/pt-pv-e-pcdob-anunciam-apoio-a-reeleicao-de-motta-na-presidencia-da-camara/', foto: `${import.meta.env.BASE_URL}deputados/178927.webp` },
]

export type Resumo = { uf: UF; nao: number; motta: number; convencer: number; cadeiras: number; registros: Registro[] }

export function resumo(uf: UF): Resumo {
  const registros = REGISTROS.filter((r) => r.uf === uf)
  const nao = registros.filter((r) => r.posicao === 'nao').length
  const motta = registros.filter((r) => r.posicao === 'motta').length
  return { uf, nao, motta, convencer: Math.max(0, CADEIRAS[uf] - nao - motta), cadeiras: CADEIRAS[uf], registros }
}

export function totais() {
  const nao = REGISTROS.filter((r) => r.posicao === 'nao').length
  const motta = REGISTROS.filter((r) => r.posicao === 'motta').length
  return { nao, motta, convencer: 513 - nao - motta, temExemplo: REGISTROS.some((r) => r.exemplo) }
}

/** Troca os registros locais pelos do painel (mantém a mesma referência de array). */
export function substituirRegistros(novos: Registro[]) {
  REGISTROS.splice(0, REGISTROS.length, ...novos)
}

/** 0..1: proporção de NÃO na bancada (pinta o mapa). */
export function intensidade(uf: UF) {
  const r = resumo(uf)
  return r.nao / r.cadeiras
}

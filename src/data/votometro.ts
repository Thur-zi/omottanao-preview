/**
 * Votômetro. Regra editorial: só entra quem se posicionou EM PÚBLICO, com fonte.
 * Quem não está listado conta como "a convencer".
 *
 * ⚠ Os registros abaixo marcados com `exemplo: true` são FICTÍCIOS (nomes genéricos) e existem
 *   só para a prévia mostrar o funcionamento. Apague-os e cadastre os reais.
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

/* ---------- dados FICTÍCIOS para a prévia ---------- */
const EXEMPLO: [UF, number, number][] = [
  // [UF, quantos NÃO, quantos com o Motta]
  ['SP', 9, 3], ['SC', 6, 0], ['RS', 7, 1], ['PR', 5, 1], ['MG', 6, 2], ['GO', 4, 0], ['RJ', 4, 3], ['DF', 2, 0],
  ['MT', 2, 0], ['MS', 2, 1], ['ES', 1, 0], ['PB', 1, 3], ['BA', 1, 4], ['PE', 0, 3], ['CE', 0, 2], ['RO', 2, 0], ['RR', 1, 0],
]
export const REGISTROS: Registro[] = EXEMPLO.flatMap(([uf, nao, motta]) => [
  ...Array.from({ length: nao }, (_, i): Registro => ({
    uf, nome: `Deputado(a) exemplo ${i + 1}`, partido: 'Partido', posicao: 'nao', fonte: 'Veículo, 00/00/2026', exemplo: true,
  })),
  ...Array.from({ length: motta }, (_, i): Registro => ({
    uf, nome: `Deputado(a) exemplo ${nao + i + 1}`, partido: 'Partido', posicao: 'motta', fonte: 'Veículo, 00/00/2026', exemplo: true,
  })),
])

export type Resumo = { uf: UF; nao: number; motta: number; convencer: number; cadeiras: number; registros: Registro[] }

export function resumo(uf: UF): Resumo {
  const registros = REGISTROS.filter((r) => r.uf === uf)
  const nao = registros.filter((r) => r.posicao === 'nao').length
  const motta = registros.filter((r) => r.posicao === 'motta').length
  return { uf, nao, motta, convencer: Math.max(0, CADEIRAS[uf] - nao - motta), cadeiras: CADEIRAS[uf], registros }
}

export const TOTAIS = (() => {
  const nao = REGISTROS.filter((r) => r.posicao === 'nao').length
  const motta = REGISTROS.filter((r) => r.posicao === 'motta').length
  return { nao, motta, convencer: 513 - nao - motta, temExemplo: REGISTROS.some((r) => r.exemplo) }
})()

/** 0..1: proporção de NÃO na bancada (pinta o mapa). */
export function intensidade(uf: UF) {
  const r = resumo(uf)
  return r.nao / r.cadeiras
}

/**
 * Conteúdo da página. Fatos vêm do briefing (18/11/2026).
 * Itens com `exemplo: true` são FICTÍCIOS e servem só para a prévia: troque pelos reais, com fonte.
 */

export const ELEICAO = {
  data: '1º de fevereiro de 2027',
  dataCurta: '01.02.2027',
  votosParaVencer: 257,
  deputados: 513,
  partidosComMotta: 15,
  deputadosPL: 121,
}

export const CANDIDATO = {
  nome: 'Luiz Philippe de Orleans e Bragança',
  curto: 'Luiz Philippe',
  partido: 'PL-SP',
  foto: null as string | null, // ex.: 'luiz-philippe.webp' em /public
}

export const MOTTA = { nome: 'Hugo Motta', partido: 'Republicanos-PB' }

/** Texto que acende palavra por palavra. *palavra* = destaque azul. */
export const CONTEXTO =
  'Em *1º de fevereiro*, 513 deputados escolhem em *voto secreto* quem comanda a Câmara. Hugo Motta quer a reeleição com o apoio formal de *15 partidos*, incluindo o *PT*. O PL tem *121 deputados* e decide nos próximos dias se apoia Motta ou lança *candidato próprio*.'

export const NUMEROS = [
  { valor: 257, rotulo: 'votos para vencer', detalhe: 'no 1º turno, de 513 deputados' },
  { valor: 15, rotulo: 'partidos com Motta', detalhe: 'apoio formal, incluindo o PT' },
  { valor: 121, rotulo: 'deputados do PL', detalhe: 'decidem o rumo da direita' },
  { valor: 1, rotulo: 'de fevereiro', detalhe: 'voto secreto, um por um', prefixo: '', sufixo: 'º' },
] as const

export type Motivo = { tag: string; titulo: string; texto: string; fonte: string; url?: string; exemplo?: boolean }

export const MOTIVOS: Motivo[] = [
  {
    tag: 'Aliança',
    titulo: 'É o candidato que o PT apoia',
    texto: 'Motta busca a reeleição com o apoio formal de 15 partidos. O PT está entre eles.',
    fonte: '[inserir veículo e data]',
  },
  {
    tag: 'Exemplo',
    titulo: 'Título curto da decisão do Motta',
    texto: 'Uma ou duas linhas, factuais, dizendo o que ele decidiu e quando. Texto de exemplo.',
    fonte: 'Veículo, 00/00/2026',
    exemplo: true,
  },
  {
    tag: 'Exemplo',
    titulo: 'Outra decisão contra a pauta da direita',
    texto: 'Cada card precisa de fonte jornalística com link. Texto de exemplo.',
    fonte: 'Veículo, 00/00/2026',
    exemplo: true,
  },
  {
    tag: 'Exemplo',
    titulo: 'Mais um fato, com data e fonte',
    texto: 'Frases curtas leem melhor no celular. Texto de exemplo.',
    fonte: 'Veículo, 00/00/2026',
    exemplo: true,
  },
]

export const PAUTAS: { titulo: string; exemplo?: boolean }[] = [
  { titulo: 'Pauta 1 do Luiz Philippe', exemplo: true },
  { titulo: 'Pauta 2 do Luiz Philippe', exemplo: true },
  { titulo: 'Pauta 3 do Luiz Philippe', exemplo: true },
  { titulo: 'Pauta 4 do Luiz Philippe', exemplo: true },
]

export const LETREIRO = ['O Motta não', 'Voto secreto', '257 votos', '1º de fevereiro', 'Cobre seu deputado', 'Direita com candidato próprio']

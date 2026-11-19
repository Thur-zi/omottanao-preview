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
  foto: 'luiz-960.webp',
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
  { tag: "Lula", titulo: "Fez campanha para o Lula", texto: "Em agosto, o presidente da Câmara declarou apoio à reeleição de Lula. Chamou o petista de “o melhor para o país”.", fonte: "Band, 10/08/2026", url: "https://www.band.com.br/politica/eleicoes/2026/hugo-motta-declara-apoio-a-reeleicao-de-lula-o-melhor-para-o-pais-202608101717" },
  { tag: "Anistia", titulo: "Engavetou a anistia", texto: "A direita colocou Motta na cadeira em 2025. Ele disse não ver ambiente para anistia ampla e o projeto não andou.", fonte: "Revista Oeste, 2025", url: "https://www.revistaoeste.com/politica/motta-nao-vejo-ambiente-para-anistia-ampla-geral-e-irrestrita/" },
  { tag: "Acordo", titulo: "Prometeu e não pautou", texto: "Para desocupar o plenário, a oposição diz ter acertado anistia e fim do foro. Motta negou o acordo. Nenhum dos dois foi votado.", fonte: "Congresso em Foco, 07/08/2025", url: "https://www.congressoemfoco.com.br/noticia/110843/motta-nega-acordo-com-oposicao-por-anistia-para-desocupar-plenario" },
  { tag: "Punição", titulo: "Mandou punir a oposição", texto: "Depois do protesto na Mesa, Motta enviou à Corregedoria pedidos de punição contra 14 deputados de oposição.", fonte: "O Povo, 08/08/2025", url: "https://mais.opovo.com.br/jornal/politica/2025/08/08/motta-envia-a-corregedoria-pedidos-de-punicoes-a-14-deputados-apos-motim-na-camara.html" },
  { tag: "Cassação", titulo: "Tirou o mandato de Eduardo Bolsonaro", texto: "A Mesa comandada por Motta declarou a perda dos mandatos de Eduardo Bolsonaro e Alexandre Ramagem. Antes, já tinha barrado Eduardo como líder da minoria.", fonte: "Congresso em Foco, 18/12/2025", url: "https://www.congressoemfoco.com.br/noticia/115035/hugo-motta-determina-cassacao-de-ramagem-e-eduardo-bolsonaro" },
  { tag: "Zambelli", titulo: "Queria cassar Zambelli", texto: "Motta disse que cassar Carla Zambelli era “a única alternativa”. O plenário salvou o mandato; depois o STF anulou a votação.", fonte: "Congresso em Foco, 09/06/2025", url: "https://www.congressoemfoco.com.br/noticia/109244/hugo-diz-que-camara-vai-cassar-carla-zambelli--e-a-unica-alternativa" },
  { tag: "Aliança", titulo: "É o candidato que o PT apoia", texto: "Motta busca mais dois anos no comando da Câmara com o apoio formal de 15 partidos. O PT está entre eles.", fonte: "Metrópoles, 11/11/2026", url: "https://www.metropoles.com/brasil/sem-consenso-pl-reune-bancada-eleita-da-camara-para-discutir-apoio-a-motta" },
  { tag: "Racha", titulo: "Nem o PL aguenta", texto: "Nikolas Ferreira: se o PL apoiar Motta, fica “insustentável” a permanência dele no partido.", fonte: "InfoMoney, 18/11/2026", url: "https://www.infomoney.com.br/politica/nikolas-ameaca-deixar-pl-se-partido-apoiar-reeleicao-de-hugo-motta/" },
]

/** "Título · detalhe" (o detalhe é opcional). Editável no painel. */
export const PAUTAS: { titulo: string; exemplo?: boolean }[] = [
  { titulo: 'Voto de desconfiança · Projeto dele: o plenário pode afastar quem comanda a Mesa e descumpre o combinado.' },
  { titulo: 'Congresso que decide · A Câmara não pode ser carimbadora do que meia dúzia de líderes já fechou.' },
  { titulo: 'Freio no ativismo judicial · Regras para decisões que suspendem leis aprovadas pelo Congresso.' },
  { titulo: 'Emenda sem chantagem · Proposta proíbe o governo de interferir nas emendas dos deputados.' },
]

export const LETREIRO = ['O Motta não', 'Voto secreto', '257 votos', '1º de fevereiro', 'Cobre seu deputado', 'Direita com candidato próprio']

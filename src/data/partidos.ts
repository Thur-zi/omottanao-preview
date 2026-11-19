/**
 * Partidos com deputados na Câmara (legislatura atual). Logos da Wikimedia Commons / Wikipédia, só para identificação.
 * Partido sem logo cadastrado → selo com a sigla na cor dele.
 */
export type Partido = { nome: string; cor: string; texto?: string; logo?: string }

export const PARTIDOS: Record<string, Partido> = {
  PL: { nome: 'Partido Liberal', cor: '#0B4BA8', logo: 'PL' },
  PT: { nome: 'Partido dos Trabalhadores', cor: '#C8102E', logo: 'PT' },
  'UNIÃO': { nome: 'União Brasil', cor: '#1B2A6B', logo: 'UNIAO' },
  PSD: { nome: 'Partido Social Democrático', cor: '#1E5AA8', logo: 'PSD' },
  PP: { nome: 'Progressistas', cor: '#0091D5', logo: 'PP' },
  REPUBLICANOS: { nome: 'Republicanos', cor: '#00529B', logo: 'REPUBLICANOS' },
  MDB: { nome: 'Movimento Democrático Brasileiro', cor: '#009739', logo: 'MDB' },
  PODE: { nome: 'Podemos', cor: '#2E9B47', logo: 'PODE' },
  PSDB: { nome: 'PSDB', cor: '#0A6DB4', logo: 'PSDB' },
  PSB: { nome: 'Partido Socialista Brasileiro', cor: '#E30613', logo: 'PSB' },
  PSOL: { nome: 'PSOL', cor: '#F6C100', texto: '#5a1a00', logo: 'PSOL' },
  PCdoB: { nome: 'Partido Comunista do Brasil', cor: '#D40000', logo: 'PCdoB' },
  PDT: { nome: 'Partido Democrático Trabalhista', cor: '#D7261E', logo: 'PDT' },
  PV: { nome: 'Partido Verde', cor: '#00A651', logo: 'PV' },
  NOVO: { nome: 'Partido Novo', cor: '#F26722', logo: 'NOVO' },
  AVANTE: { nome: 'Avante', cor: '#E97B10', logo: 'AVANTE' },
  SOLIDARIEDADE: { nome: 'Solidariedade', cor: '#F57C00', logo: 'SOLIDARIEDADE' },
  REDE: { nome: 'Rede Sustentabilidade', cor: '#18A88C', logo: 'REDE' },
  PRD: { nome: 'Partido Renovação Democrática', cor: '#00843D', logo: 'PRD' },
  CIDADANIA: { nome: 'Cidadania', cor: '#E4007C', logo: 'CIDADANIA' },
  'MISSÃO': { nome: 'Missão', cor: '#151515', logo: 'MISSAO' },
}

export const partido = (sigla: string): Partido => PARTIDOS[sigla] ?? { nome: sigla, cor: '#56607A' }

export type Deputado = { id: number; nome: string; partido: string; uf: string; foto: boolean }

let cache: Promise<Deputado[]> | null = null
/** Os 513 deputados em exercício (Câmara, dados abertos), carregados sob demanda. */
export function carregarDeputados() {
  if (!cache) cache = fetch(`${import.meta.env.BASE_URL}dados/deputados.json`).then((r) => r.json())
  return cache
}

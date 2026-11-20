/**
 * Configuração do site. Os valores abaixo são o padrão; no Cloudflare eles chegam do painel
 * (/api/conteudo) e sobrescrevem estes em tempo de execução.
 */
const env = import.meta.env

/** No GitHub Pages (prévia estática) não há API: o site usa os dados locais. */
export const TEM_API = env.MODE !== 'pages'

export const CONFIG = {
  /** Endpoint do cadastro (Pages Function). null = modo demonstração. */
  endpoint: TEM_API ? '/api/lead' : (null as string | null),
  eventos: TEM_API ? '/api/eventos' : (null as string | null),
  conteudo: TEM_API ? '/api/conteudo' : (null as string | null),
  /** Número WABA do Luiz: DDI + DDD + número, só dígitos. */
  whatsappNumero: '55XXXXXXXXXXX',
  ga4Id: null as string | null,
  /** Pixel da Meta (o painel pode trocar). */
  metaPixelId: '2121776075436409' as string | null,
  versaoConsentimento: 'lgpd-v1-2026-11-18',
  site: 'omottanao.com.br',
  /** Mostra os selos "dado de exemplo" enquanto houver dados fictícios. */
  previa: true,
  /** Contagem regressiva + lista "o que você recebe" no abaixo-assinado (arquivada; liga no painel). */
  mostrarContagem: false,
  /** Linha "Estado: N deputados, X já disseram NÃO" no formulário (arquivada; liga no painel). */
  mostrarInfoEstado: false,
  /** Seção do votômetro (hemiciclo + mapa 3D) (arquivada; liga no painel). */
  mostrarVotometro: false,
  /** Seção "Como funciona: o caminho até 1º de fevereiro" (arquivada). */
  mostrarComoFunciona: false,
  /** Aviso "Agora: …" no abaixo-assinado (arquivado; texto editável no painel). */
  mostrarAviso: false,
  avisoTexto: 'o PL decide nos próximos dias se apoia Motta ou lança candidato próprio.',
  /** Botões de WhatsApp / gerar card / chamar amigos na confirmação (arquivados). */
  mostrarBotoesWhatsapp: false,
  responsavel: '[NOME / CNPJ DO RESPONSÁVEL]',
  encarregado: { nome: '[NOME DO ENCARREGADO]', email: '[EMAIL]' },
  /** Foto do candidato; o painel pode trocar. Padrão: foto oficial da Câmara (CC BY 3.0). */
  candidatoFoto: null as string | null,
}

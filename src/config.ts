/**
 * Configuração de publicação. Tudo que é integração mora aqui.
 * Variáveis VITE_* podem sobrescrever (arquivo .env.production).
 */
const env = import.meta.env

export const CONFIG = {
  /** Endpoint do CRM/base da Mobi. Recebe POST com JSON em text/plain (sem preflight de CORS). null = modo demonstração. */
  endpoint: (env.VITE_CADASTRO_ENDPOINT as string | undefined) || null,
  /** Número WABA do Luiz: DDI + DDD + número, só dígitos. */
  whatsappNumero: (env.VITE_WHATSAPP_NUMERO as string | undefined) || '55XXXXXXXXXXX',
  ga4Id: (env.VITE_GA4_ID as string | undefined) || null,
  metaPixelId: (env.VITE_META_PIXEL_ID as string | undefined) || null,
  versaoConsentimento: 'lgpd-v1-2026-11-18',
  site: 'omottanao.com.br',
  /** Mostra os selos "dado de exemplo" enquanto a equipe não troca os dados fictícios pelos reais. */
  previa: true,
  responsavel: '[NOME / CNPJ DO RESPONSÁVEL]',
  encarregado: { nome: '[NOME DO ENCARREGADO]', email: '[EMAIL]' },
} as const

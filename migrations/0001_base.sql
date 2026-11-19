-- O Motta Não — banco D1 (SQLite). Datas em ISO 8601 UTC.

-- Assinaturas do NÃO (leads). Um WhatsApp = uma pessoa; repetir soma em "vezes".
CREATE TABLE IF NOT EXISTS assinaturas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  sobrenome TEXT NOT NULL,
  whatsapp TEXT NOT NULL UNIQUE,
  uf TEXT NOT NULL,
  cidade TEXT NOT NULL,
  cidade_ibge INTEGER,
  aceite_em TEXT NOT NULL,
  versao_termo TEXT NOT NULL,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT,
  referrer TEXT, pagina TEXT, sessao TEXT, dispositivo TEXT, ip_hash TEXT,
  vezes INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS ix_assinaturas_criado ON assinaturas (criado_em DESC);
CREATE INDEX IF NOT EXISTS ix_assinaturas_uf ON assinaturas (uf, criado_em DESC);

-- Rastreio próprio (primeira parte)
CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  sessao TEXT NOT NULL,
  tipo TEXT NOT NULL,
  dados TEXT NOT NULL DEFAULT '{}',
  uf TEXT, pagina TEXT, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, referrer_host TEXT, dispositivo TEXT, ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS ix_eventos_criado ON eventos (criado_em DESC);
CREATE INDEX IF NOT EXISTS ix_eventos_tipo ON eventos (tipo, criado_em DESC);
CREATE INDEX IF NOT EXISTS ix_eventos_sessao ON eventos (sessao);

-- Limites de taxa (por IP com hash, por usuário de login etc.)
CREATE TABLE IF NOT EXISTS limites (chave TEXT PRIMARY KEY, janela INTEGER NOT NULL, contagem INTEGER NOT NULL);

-- Votômetro: só quem se posicionou em público, com fonte
CREATE TABLE IF NOT EXISTS posicoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deputado_id INTEGER,
  nome TEXT NOT NULL,
  partido TEXT NOT NULL DEFAULT '',
  uf TEXT NOT NULL,
  posicao TEXT NOT NULL CHECK (posicao IN ('nao','motta')),
  fonte TEXT NOT NULL DEFAULT '',
  url TEXT,
  data_fonte TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  exemplo INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS ix_posicoes_uf ON posicoes (uf);

-- "Por que não": decisões do Motta, com fonte
CREATE TABLE IF NOT EXISTS motivos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag TEXT NOT NULL DEFAULT '',
  titulo TEXT NOT NULL,
  texto TEXT NOT NULL DEFAULT '',
  fonte TEXT NOT NULL DEFAULT '',
  url TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  exemplo INTEGER NOT NULL DEFAULT 0,
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Pautas da alternativa
CREATE TABLE IF NOT EXISTS pautas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  exemplo INTEGER NOT NULL DEFAULT 0
);

-- Configuração editável no painel (o que é público vai para o site)
CREATE TABLE IF NOT EXISTS config (chave TEXT PRIMARY KEY, valor TEXT NOT NULL DEFAULT '');

-- Painel
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  senha_hash TEXT NOT NULL,
  senha_sal TEXT NOT NULL,
  totp_secret TEXT,
  totp_ativo INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ultimo_login TEXT
);
CREATE TABLE IF NOT EXISTS sessoes (
  token_hash TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  nivel INTEGER NOT NULL DEFAULT 1, -- 1 = senha ok; 2 = senha + código do celular
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expira_em TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  usuario TEXT,
  acao TEXT NOT NULL,
  detalhes TEXT NOT NULL DEFAULT '{}',
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS ix_auditoria_criado ON auditoria (criado_em DESC);

-- Valores iniciais de configuração
INSERT OR IGNORE INTO config (chave, valor) VALUES
  ('whatsapp_numero', ''),
  ('ga4_id', ''),
  ('meta_pixel_id', ''),
  ('responsavel', '[NOME / CNPJ DO RESPONSÁVEL]'),
  ('encarregado_nome', '[NOME DO ENCARREGADO]'),
  ('encarregado_email', '[EMAIL]'),
  ('candidato_foto', ''),
  ('previa', '1');

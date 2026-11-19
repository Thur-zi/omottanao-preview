-- Links de cadastro para a equipe: uso único, com validade. Guarda só o hash do token.
CREATE TABLE IF NOT EXISTS convites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  nota TEXT NOT NULL DEFAULT '',
  criado_por INTEGER,
  criado_por_usuario TEXT,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expira_em TEXT NOT NULL,
  usado_em TEXT,
  usado_por TEXT
);

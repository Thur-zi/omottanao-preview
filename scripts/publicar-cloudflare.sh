#!/usr/bin/env bash
# Publica no Cloudflare Pages (site + painel + API). Migrações novas do banco: npm run banco:migrar
set -euo pipefail
npm run build
npx -y wrangler@4.165.0 pages deploy dist --project-name omottanao --branch main --commit-dirty=true

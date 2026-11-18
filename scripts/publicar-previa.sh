#!/usr/bin/env bash
# Publica a prévia no GitHub Pages (branch gh-pages do repositório omottanao-preview).
set -euo pipefail
export MSYS_NO_PATHCONV=1
npm run build:pages
cp dist/index.html dist/404.html
touch dist/.nojekyll
ORIGEM=$(git remote get-url origin)
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="Thur-zi" -c user.email="Thur-zi@users.noreply.github.com" commit -q -m "Prévia $(date '+%d/%m %H:%M')"
git push -q -f "$ORIGEM" gh-pages
rm -rf .git
echo "Publicado: https://thur-zi.github.io/omottanao-preview/"

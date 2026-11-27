#!/usr/bin/env bash
# Деплой дашборду з CLI: тільки з гілки dev, тільки як Preview, з env Preview для гілки dev. STAGE там не задано, тож це preview stage: тестовий вхід, без запитів до Mac.
# Production не деплоїться: його гілка — main, а її поки не чіпаємо.
set -euo pipefail
cd "$(dirname "$0")/.."

branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != dev ]; then
  echo "deploy:web тільки з гілки dev (зараз $branch)" >&2
  exit 1
fi

vercel() { npx -y vercel@66 "$@"; }
vercel pull --yes --environment=preview --git-branch=dev
vercel build
url=$(vercel deploy --prebuilt | grep -oE 'https://awake-[a-z0-9]+-[a-z0-9-]+\.vercel\.app' | head -1)
echo "$url"
# Стабільна адреса dev-збірки: preview-збірки Umbra беруть звідси дерево (/api/public/ui-tree, TEMP).
vercel alias set "$url" macontrol-web-dev.vercel.app

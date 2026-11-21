#!/usr/bin/env bash
# Деплой дашборду з CLI: тільки з гілки dev, тільки як Preview, з env Preview для гілки dev (там STAGE=dev).
# Production не деплоїться: його гілка — main, а її поки не чіпаємо.
set -euo pipefail
cd "$(dirname "$0")/.."

branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != dev ]; then
  echo "deploy:web тільки з гілки dev (зараз $branch)" >&2
  exit 1
fi

vercel() { npx -y vercel@50 "$@"; }
vercel pull --yes --environment=preview --git-branch=dev
vercel build
vercel deploy --prebuilt

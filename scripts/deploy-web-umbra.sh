#!/usr/bin/env bash
# Деплой Umbra Web UI (Next-сервер) у власний Vercel-проєкт macontrol-umbra: збірка локально, `deploy --prebuilt`.
# Тільки з гілки dev і тільки як Preview (dev-only фаза). Дерево сервер читає з Upstash (KV_REST_API_* проєкту);
# дії в Umbra не виходять з браузера.
#
# Next у монорепо Vercel збирає лише з кореня репо з rootDirectory=web-umbra. Кореневий .vercel належить проєкту
# awake (web), тому на час збірки його link відкладається, а link Umbra живе в web-umbra/.vercel; trap повертає все.
set -euo pipefail
cd "$(dirname "$0")/.."

branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != dev ]; then
  echo "deploy:web-umbra тільки з гілки dev (зараз $branch)" >&2
  exit 1
fi

vercel() { npx -y vercel@66 "$@"; }
saved=.vercel.awake-saved
[ -e "$saved" ] && { echo "Знайдено $saved від перерваного деплою: поверни його в .vercel вручну" >&2; exit 1; }

restore() {
  [ -d .vercel ] && { mkdir -p web-umbra/.vercel; cp .vercel/project.json web-umbra/.vercel/project.json; rm -rf .vercel; }
  [ -d "$saved" ] && mv "$saved" .vercel
}
[ -d .vercel ] && mv .vercel "$saved"
trap restore EXIT

mkdir -p .vercel
if [ -f web-umbra/.vercel/project.json ]; then cp web-umbra/.vercel/project.json .vercel/project.json
else vercel link --yes --project macontrol-umbra; fi

vercel pull --yes --environment=preview --git-branch=dev
# Налаштування збірки для монорепо (локально, у pulled project.json): Next з теки web-umbra.
node -e '
const f=".vercel/project.json", p=require("fs"), j=JSON.parse(p.readFileSync(f));
Object.assign(j.settings, { rootDirectory: "web-umbra", framework: "nextjs", nodeVersion: "26.x" });
p.writeFileSync(f, JSON.stringify(j, null, 2));'
vercel build
url=$(vercel deploy --prebuilt --target=preview --env STAGE=dev | grep -oE 'https://macontrol-umbra-[a-z0-9]+-[a-z0-9-]+\.vercel\.app' | head -1)
echo "$url"
# Стабільна адреса dev-збірки Web Umbra.
vercel alias set "$url" macontrol-umbra-dev.vercel.app

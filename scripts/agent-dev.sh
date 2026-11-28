#!/bin/bash
# Сервер (агент) окремо від аппки, для розробки: збирає agent.cjs і кладе в зовнішню папку, звідки його бере
# dev-збірка MaControl. Аппка помічає новий файл за кілька секунд і перезапускає лише процес агента.
#   scripts/agent-dev.sh        зібрати агента і підкласти (Web UI збирається лише першого разу)
#   scripts/agent-dev.sh web    те саме і перезібрати Web UI
#   scripts/agent-dev.sh off    прибрати папку: аппка повертається до агента, вшитого в бандл
# Production-збірка цю папку не читає: там агент завжди вшитий (scripts/build-agent.sh).
set -euo pipefail
cd "$(dirname "$0")/.."
DIR="$HOME/Library/Application Support/MaControl/agent-dev"
MODE="${1:-}"
if [ "$MODE" = off ]; then
  rm -rf "$DIR"
  echo "Зовнішнього агента прибрано: аппка повернеться до вшитого."
  exit 0
fi
pnpm --filter @macontrol/agent build
mkdir -p "$DIR"
if [ "$MODE" = web ] || [ ! -d "$DIR/web" ]; then
  pnpm --filter @macontrol/web build:local
  rm -rf "$DIR/web.new"
  cp -R web/out "$DIR/web.new"
  rm -rf "$DIR/web"
  mv "$DIR/web.new" "$DIR/web"
fi
node scripts/build-info.mjs "$DIR/build-info.json"
# agent.cjs останнім і через mv: аппка стежить саме за ним і не побачить недописаного файла.
cp agent/dist/agent.cjs "$DIR/agent.cjs.new"
mv "$DIR/agent.cjs.new" "$DIR/agent.cjs"
echo "Агент: $DIR (аппка перезапустить його за кілька секунд)"

#!/bin/bash
# Сервер сам, без Mac-аппки (dev): збирає помічник і сервер та запускає сервер у режимі standalone.
# Сервер сам піднімає помічник (build/mc-helper), тож Telegram-бот і Web UI працюють без аппки.
# Ключі ті самі, що дає аппка: ~/.config/awake/agent.env. Аппка в цей час має бути закрита:
# два сервери на одному порту й одному боті не живуть.
#   scripts/server-dev.sh          зібрати і запустити
#   scripts/server-dev.sh nobuild  запустити вже зібране
set -euo pipefail
cd "$(dirname "$0")/.."
ENV_FILE="$HOME/.config/awake/agent.env"
[ -f "$ENV_FILE" ] || { echo "Немає $ENV_FILE: один раз запусти аппку, вона створить ключі."; exit 1; }
set -a; . "$ENV_FILE"; set +a
PORT="${MACONTROL_AGENT_PORT:-47800}"
if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Порт $PORT зайнятий: схоже, сервер уже запущений (аппкою чи іншим терміналом). Спершу закрий його."
  exit 1
fi
if [ "${1:-}" != nobuild ]; then
  scripts/build-helper.sh
  pnpm --filter @awake/agent build
fi
WEB_DEV="$HOME/Library/Application Support/MaControl/agent-dev/web"
[ -d "$WEB_DEV" ] && export MACONTROL_WEB_DIR="${MACONTROL_WEB_DIR:-$WEB_DEV}"
export MACONTROL_STANDALONE=1
export MACONTROL_HELPER="${MACONTROL_HELPER:-$PWD/build/mc-helper}"
exec node agent/dist/agent.cjs

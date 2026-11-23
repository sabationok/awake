#!/bin/bash
# Встановлює Awake:
#   1. збирає аппку і кладе в /Applications
#   2. робить команду awake у терміналі (~/.local/bin/awake → скрипт з аппки)
# Пароль не потрібен: правила sudoers (mc-<дозвіл>) ставить сама аппка, коли видаєш дозвіл у «Дозволах»,
# через системний діалог адміністратора. Аппка просить дозволи в системи, модулі — в аппки.
set -euo pipefail
cd "$(dirname "$0")/.."

./scripts/build.sh

echo "→ /Applications/Awake.app"
pkill -x Awake 2>/dev/null || true
rm -rf /Applications/Awake.app
cp -R build/Awake.app /Applications/

echo "→ команда awake"
mkdir -p "$HOME/.local/bin"
ln -sfn /Applications/Awake.app/Contents/Resources/awake "$HOME/.local/bin/awake"
grep -q '.local/bin' "$HOME/.zshrc" 2>/dev/null ||
  printf '\n# awake та інші локальні скрипти\nexport PATH="$HOME/.local/bin:$PATH"\n' >> "$HOME/.zshrc"

echo "→ налаштування Telegram"
mkdir -p "$HOME/.config/awake"
[ -f "$HOME/.config/awake/telegram.env" ] ||
  printf "TG_BOT_TOKEN=''\nTG_CHAT_ID=''\n" > "$HOME/.config/awake/telegram.env"
chmod 600 "$HOME/.config/awake/telegram.env"

echo
echo "Готово. Відкриваю Awake."
open /Applications/Awake.app

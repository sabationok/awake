#!/bin/bash
# Встановлює Awake:
#   1. збирає аппку і кладе в /Applications
#   2. робить команду awake у терміналі (~/.local/bin/awake → скрипт з аппки)
#   3. додає правило sudoers: без пароля дозволено лише pmset disablesleep 0|1
#      і читання термічного стану через powermetrics. Попросить пароль один раз.
set -euo pipefail
cd "$(dirname "$0")/.."
ME=$(id -un)

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

echo "→ правило sudoers (потрібен пароль)"
TMP=$(mktemp)
cat > "$TMP" <<RULE
# Awake: дозволяє лише ці команди без пароля
$ME ALL=(root) NOPASSWD: /usr/bin/pmset -a disablesleep 0, /usr/bin/pmset -a disablesleep 1, /usr/bin/powermetrics -n 1 -i 500 --samplers thermal
RULE
sudo visudo -cf "$TMP" >/dev/null
sudo install -m 440 -o root -g wheel "$TMP" /etc/sudoers.d/awake
rm -f "$TMP"

echo
echo "Готово. Відкриваю Awake."
open /Applications/Awake.app

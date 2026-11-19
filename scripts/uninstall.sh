#!/bin/bash
# Повністю прибирає Awake. Налаштування Telegram лишаються, якщо не передати --purge.
set -uo pipefail

pkill -x Awake 2>/dev/null
pkill -f 'Awake.app/Contents/Resources/awake' 2>/dev/null
# повертаємо сон, якщо лишився заблокованим
sudo /usr/bin/pmset -a disablesleep 0

rm -rf /Applications/Awake.app
[ -L "$HOME/.local/bin/awake" ] || [ -f "$HOME/.local/bin/awake" ] && rm -f "$HOME/.local/bin/awake"
sudo rm -f /etc/sudoers.d/awake

if [ "${1:-}" = "--purge" ]; then
  rm -rf "$HOME/.config/awake"
  # прибрати рядок PATH, доданий install.sh
  sed -i '' '/# awake та інші локальні скрипти/d; /export PATH="\$HOME\/.local\/bin:\$PATH"/d' "$HOME/.zshrc"
fi

pmset -g | grep -i sleepdisabled
echo "Awake видалено."

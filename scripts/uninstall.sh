#!/bin/bash
# Повністю прибирає Awake. Налаштування Telegram лишаються, якщо не передати --purge.
set -uo pipefail

pkill -x Awake 2>/dev/null
pkill -f 'Awake.app/Contents/Resources/awake' 2>/dev/null
# Сон назад і правила sudoers (mc-* і старі awake*) — однією дією через системний діалог адміністратора, без sudo в терміналі.
RULES="/etc/sudoers.d/mc-sleepControl /etc/sudoers.d/mc-thermalRead /etc/sudoers.d/awake /etc/sudoers.d/awake-sleepControl /etc/sudoers.d/awake-thermalRead"
/usr/bin/osascript -e "do shell script \"/usr/bin/pmset -a disablesleep 0; /bin/rm -f $RULES\" with prompt \"MaControl видаляє свої правила sudoers.\" with administrator privileges" ||
  echo "Скасовано: сон і правила sudoers не змінено."

rm -rf /Applications/Awake.app
[ -L "$HOME/.local/bin/awake" ] || [ -f "$HOME/.local/bin/awake" ] && rm -f "$HOME/.local/bin/awake"

if [ "${1:-}" = "--purge" ]; then
  rm -rf "$HOME/.config/awake"
  # прибрати рядок PATH, доданий install.sh
  sed -i '' '/# awake та інші локальні скрипти/d; /export PATH="\$HOME\/.local\/bin:\$PATH"/d' "$HOME/.zshrc"
fi

pmset -g | grep -i sleepdisabled
echo "Awake видалено."

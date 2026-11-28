#!/usr/bin/env bash
# Публікує локальний пульт без перевстановлення аппки: агент віддає його з цієї папки раніше, ніж збірку з бандла,
# і бере файли на кожен запит, тож нова версія діє одразу. Заміна атомарна: стара папка підміняється цілою новою.
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${MACONTROL_WEB_PUBLISHED_DIR:-$HOME/Library/Application Support/MaControl/web}"
mkdir -p "$(dirname "$TARGET")"

pnpm --filter @macontrol/web build:local
rm -rf "$TARGET.next" "$TARGET.old"
cp -R web/out "$TARGET.next"
[ -d "$TARGET" ] && mv "$TARGET" "$TARGET.old"
mv "$TARGET.next" "$TARGET"
rm -rf "$TARGET.old"
echo "Пульт опубліковано: $TARGET ($(git rev-parse --short HEAD))"

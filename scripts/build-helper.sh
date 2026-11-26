#!/bin/bash
# Збирає build/mc-helper: помічник на чистому Swift, якого запускає сервер. Єдиний, хто звертається до macOS.
# Системні сервіси він бере ті самі, що й аппка: файли нижче не мають залежностей від SwiftUI чи моделі аппки.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p build
swiftc -swift-version 5 -O \
  -target arm64-apple-macos14 \
  -framework IOKit -framework CoreAudio -framework AudioToolbox -framework CoreWLAN -framework CoreGraphics -framework LocalAuthentication \
  Helper/main.swift \
  Helper/SudoersRules.swift \
  Sources/Core/Permissions/AppPermission.swift \
  Sources/Core/Shell.swift \
  Sources/Features/Status/PowerService.swift \
  Sources/Features/Status/PowerStatus.swift \
  Sources/Features/Display/ClamshellService.swift \
  Sources/Features/Display/DisplayService.swift \
  Sources/Features/Display/LockService.swift \
  Sources/Features/Media/SoundService.swift \
  Sources/Features/Media/BrightnessService.swift \
  -o build/mc-helper
codesign --force -s - build/mc-helper
echo "Зібрано: build/mc-helper"

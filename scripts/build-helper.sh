#!/bin/bash
# Збирає build/mc-helper: помічник на чистому Swift, якого запускає сервер. Єдиний, хто звертається до macOS.
# Системні сервіси лежать у Helper/System: аппка їх не викликає, macOS чіпає лише помічник.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p build
swiftc -swift-version 5 -O \
  -target arm64-apple-macos14 \
  -framework IOKit -framework CoreAudio -framework AudioToolbox -framework CoreWLAN -framework CoreGraphics -framework LocalAuthentication \
  Helper/main.swift \
  Helper/SudoersRules.swift \
  Helper/System/AppPermission.swift \
  Helper/System/Shell.swift \
  Helper/System/PowerService.swift \
  Helper/System/PowerStatus.swift \
  Helper/System/ClamshellService.swift \
  Helper/System/DisplayService.swift \
  Helper/System/LockService.swift \
  Helper/System/SoundService.swift \
  Helper/System/BrightnessService.swift \
  -o build/mc-helper
codesign --force -s - build/mc-helper
echo "Зібрано: build/mc-helper"

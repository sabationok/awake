#!/bin/bash
# Збирає build/MaControlHelper.app («MaControl Helper»): помічник на чистому Swift, якого запускає сервер.
# Єдиний, хто звертається до macOS. Системні сервіси лежать у Helper/System: аппка їх не викликає.
# Це фоновий бандл (LSUIElement, без іконки в Dock): macOS видає дозволи Bluetooth і геолокації (назва Wi-Fi)
# лише бандлу з Info.plist, тож дозволи належать помічнику, а не аппці й не терміналу.
# Бінарник: build/MaControlHelper.app/Contents/MacOS/mc-helper (MACONTROL_HELPER для pnpm server:dev).
# HELPER_ID перевизначає bundle id; build-mac.sh кладе бандл у MaControl.app/Contents/Library/Helpers/.
set -euo pipefail
cd "$(dirname "$0")/.."
# Серверний id (власник, 2026-11-27): помічник тримає дозволи Bluetooth і геолокації. Аппка — …macontrol.app.dev.
HELPER_ID="${HELPER_ID:-dev.vitalii.macontrol.dev}"
APP="build/MaControlHelper.app"
rm -rf "$APP" build/mc-helper
mkdir -p "$APP/Contents/MacOS"
swiftc -swift-version 5 -O \
  -target arm64-apple-macos14 \
  -framework IOKit -framework CoreAudio -framework AudioToolbox -framework CoreWLAN -framework CoreGraphics \
  -framework LocalAuthentication -framework CoreLocation -framework CoreBluetooth \
  Helper/main.swift \
  Helper/SudoersRules.swift \
  Helper/System/AppPermission.swift \
  Helper/System/Shell.swift \
  Helper/System/PrivacyAccess.swift \
  Helper/System/Responsibility.swift \
  Helper/System/PowerService.swift \
  Helper/System/PowerStatus.swift \
  Helper/System/ClamshellService.swift \
  Helper/System/DisplayService.swift \
  Helper/System/LockService.swift \
  Helper/System/SoundService.swift \
  Helper/System/BrightnessService.swift \
  Helper/System/WifiService.swift \
  Helper/System/BluetoothScanner.swift \
  -o "$APP/Contents/MacOS/mc-helper"
LOC="macOS показує назву мережі Wi-Fi лише з дозволом геолокації. За нею MaControl знає, чи Mac у довіреній мережі. Координати не зберігаються."
BT="MaControl стежить за сигналом вашого iPhone чи Apple Watch і блокує Mac, коли ви відходите (модуль «Поруч»)."
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleIdentifier</key><string>$HELPER_ID</string>
  <key>CFBundleName</key><string>MaControl Helper</string>
  <key>CFBundleDisplayName</key><string>MaControl Helper</string>
  <key>CFBundleExecutable</key><string>mc-helper</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.2.0</string>
  <key>CFBundleVersion</key><string>2</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>LSUIElement</key><true/>
  <key>NSLocationUsageDescription</key><string>$LOC</string>
  <key>NSLocationWhenInUseUsageDescription</key><string>$LOC</string>
  <key>NSBluetoothAlwaysUsageDescription</key><string>$BT</string>
</dict></plist>
PLIST
codesign --force --sign - "$APP" >/dev/null
echo "Зібрано: $APP"

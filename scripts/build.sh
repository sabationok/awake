#!/bin/bash
# Збирає build/Awake.app з вихідників. Xcode не потрібен, лише Command Line Tools.
set -euo pipefail
cd "$(dirname "$0")/.."
APP=build/Awake.app
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
swiftc -swift-version 5 -O -parse-as-library \
  -target arm64-apple-macos14 \
  -framework SwiftUI -framework IOKit -framework CoreAudio -framework AudioToolbox -framework CoreWLAN -framework CoreLocation -framework CoreBluetooth -framework Sparkle -F Vendor/Sparkle \
  -Xlinker -rpath -Xlinker @executable_path/../Frameworks \
  $(find Sources -name "*.swift" | sort) -o "$APP/Contents/MacOS/Awake"
cp Info.plist "$APP/Contents/Info.plist"
cp Resources/awake "$APP/Contents/Resources/awake"
cp Resources/AppIcon.icns "$APP/Contents/Resources/AppIcon.icns"
chmod +x "$APP/Contents/Resources/awake"
# Агент і локальний пульт збирає scripts/build-agent.sh; без нього аппка працює, лише без пульта.
if [ -f Resources/agent/agent.cjs ]; then
  cp -R Resources/agent "$APP/Contents/Resources/agent"
else
  echo "Увага: немає Resources/agent, запусти scripts/build-agent.sh"
fi
mkdir -p "$APP/Contents/Frameworks"
cp -R Vendor/Sparkle/Sparkle.framework "$APP/Contents/Frameworks/"
codesign --force --deep -s - "$APP"
echo "Зібрано: $APP"

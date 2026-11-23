#!/bin/bash
# Збирає build/MaControl.app з вихідників. Xcode не потрібен, лише Command Line Tools.
set -euo pipefail
cd "$(dirname "$0")/.."
APP=build/MaControl.app
rm -rf "$APP" build/Awake.app
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
swiftc -swift-version 5 -O -parse-as-library \
  -target arm64-apple-macos14 \
  -framework SwiftUI -framework IOKit -framework CoreAudio -framework AudioToolbox -framework CoreWLAN -framework CoreLocation -framework CoreBluetooth -framework Sparkle -F Vendor/Sparkle \
  -Xlinker -rpath -Xlinker @executable_path/../Frameworks \
  $(find Sources -name "*.swift" | sort) -o "$APP/Contents/MacOS/MaControl"
cp Info.plist "$APP/Contents/Info.plist"
cp Resources/awake "$APP/Contents/Resources/awake"
# Стейдж збірки: dev | preview | production (за замовчуванням dev, поки production немає).
# Не-production: свій bundle id і назва (ставляться поруч з production) і стрічка стейджу на іконці.
STAGE="${MACONTROL_STAGE:-dev}"
case "$STAGE" in
  production)
    cp Resources/AppIcon.icns "$APP/Contents/Resources/AppIcon.icns" ;;
  dev|preview)
    PLIST="$APP/Contents/Info.plist"
    BASE_ID=$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$PLIST")
    TITLE="$(tr '[:lower:]' '[:upper:]' <<< "${STAGE:0:1}")${STAGE:1}"
    /usr/libexec/PlistBuddy -c "Set CFBundleIdentifier $BASE_ID.$STAGE" "$PLIST"
    /usr/libexec/PlistBuddy -c "Set CFBundleDisplayName MaControl $TITLE" "$PLIST"
    swift tools/stage-icon.swift Resources/AppIcon.icns "$APP/Contents/Resources/AppIcon.icns" "$STAGE" ;;
  *) echo "MACONTROL_STAGE має бути dev, preview або production, а не $STAGE"; exit 1 ;;
esac
/usr/libexec/PlistBuddy -c "Add MCStage string $STAGE" "$APP/Contents/Info.plist"
chmod +x "$APP/Contents/Resources/awake"
# Агент і локальний Web UI збирає scripts/build-agent.sh; без нього аппка працює, лише без Web UI.
if [ -f Resources/agent/agent.cjs ]; then
  cp -R Resources/agent "$APP/Contents/Resources/agent"
else
  echo "Увага: немає Resources/agent, запусти scripts/build-agent.sh"
fi
mkdir -p "$APP/Contents/Frameworks"
cp -R Vendor/Sparkle/Sparkle.framework "$APP/Contents/Frameworks/"
codesign --force --deep -s - "$APP"
echo "Зібрано: $APP"

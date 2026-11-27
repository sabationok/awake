#!/bin/bash
# Builds "MaControl (Umbra Dev).app" (the new Mac client on the Umbra library) into mac-umbra/build/.
# Dev by default (bundle id dev.vitalii.macontrol.umbra.dev); RELEASE=1 for "MaControl (Umbra)", dev.vitalii.macontrol.umbra.
# BIN_ONLY=1 builds only the binary mac-umbra/build/render/mac-umbra for offscreen snapshots (scripts/parity.sh):
# screens are compared first, the .app is built only after they match.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/mac-umbra/Sources"
OUT="$ROOT/mac-umbra/build"
ID="dev.vitalii.macontrol.umbra"; NAME="MaControl (Umbra)"
[ "${RELEASE:-0}" = "1" ] || { ID="$ID.dev"; NAME="MaControl (Umbra Dev)"; }
if [ "${BIN_ONLY:-0}" = "1" ]; then
  mkdir -p "$OUT/render"
  find "$SRC" -name '*.swift' -print0 | xargs -0 swiftc -swift-version 5 -O -parse-as-library \
    -target arm64-apple-macos14 -o "$OUT/render/mac-umbra"
  echo "$OUT/render/mac-umbra"; exit 0
fi
APP="$OUT/$NAME.app"
rm -rf "$APP"; mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
find "$SRC" -name '*.swift' -print0 | xargs -0 swiftc -swift-version 5 -O -parse-as-library \
  -target arm64-apple-macos14 -o "$APP/Contents/MacOS/mac-umbra"
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleIdentifier</key><string>$ID</string>
  <key>CFBundleName</key><string>$NAME</string>
  <key>CFBundleDisplayName</key><string>$NAME</string>
  <key>CFBundleExecutable</key><string>mac-umbra</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
codesign --force --sign - "$APP" >/dev/null 2>&1 || true
echo "$APP"

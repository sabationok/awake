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
# Dev passport for the dev indicator (~/projects/dev-indicator-kit): version of the `macontrol` package, git of this
# checkout, build time. Stage dev; the server (agent-dev or bundled) is not known at build time, so no extra row.
KIT="${DEV_INDICATOR_KIT:-$HOME/projects/dev-indicator-kit}"
passport() {
  (cd "$ROOT" && STAGE=dev node "$KIT/scripts/gen-dev-build.mjs" --out "$1" --project-id macontrol-umbra \
    --name MaControl --variant "Umbra Dev" --package "$ROOT/app/package.json" >/dev/null)
}
if [ "${BIN_ONLY:-0}" = "1" ]; then
  mkdir -p "$OUT/render"
  find "$SRC" -name '*.swift' -print0 | xargs -0 swiftc -swift-version 5 -O -parse-as-library \
    -target arm64-apple-macos14 -o "$OUT/render/mac-umbra"
  passport "$OUT/render/dev-build.json"
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
passport "$APP/Contents/Resources/dev-build.json"
codesign --force --sign - "$APP" >/dev/null 2>&1 || true
echo "$APP"

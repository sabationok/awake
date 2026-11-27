#!/bin/bash
# Builds the Mac app into mac/build/MaControl__Dev.app (shown by macOS as "MaControl (Dev)").
# The file name has no spaces or brackets. Install as /Applications/MaControl__Dev.app.
# Dev by default; RELEASE=1 for MaControl.app, "MaControl". BUNDLE_ID overrides the bundle id (see ID below).
# BIN_ONLY=1 builds only the binary mac/build/render/MaControl for offscreen snapshots (scripts/parity.sh).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/mac/Sources"
OUT="$ROOT/mac/build"
EXE="MaControl"
# TODO(owner): switch to the old ids (dev.vitalii.macontrol / .dev) at the cutover, so the TCC grants carry over.
# Until then the id stays the one this build was installed under, so it never shares an id with the old app.
ID="${BUNDLE_ID:-dev.vitalii.macontrol.umbra}"; NAME="MaControl"; FILE="MaControl"
[ "${RELEASE:-0}" = "1" ] || { ID="${BUNDLE_ID:-$ID.dev}"; NAME="MaControl (Dev)"; FILE="MaControl__Dev"; }
# Dev passport for the dev indicator (~/projects/dev-indicator-kit): version of the `macontrol` package, git of this
# checkout, build time. Stage dev; the server (agent-dev or bundled) is not known at build time, so no extra row.
KIT="${DEV_INDICATOR_KIT:-$HOME/projects/dev-indicator-kit}"
passport() {
  (cd "$ROOT" && STAGE=dev node "$KIT/scripts/gen-dev-build.mjs" --out "$1" --project-id macontrol \
    --name MaControl --variant "Dev" --package "$ROOT/app/package.json" >/dev/null)
}
# Two steps: the vendored lib first, as its own module `Umbra` (a static library plus its .swiftmodule), then the app
# against it. The app sees Umbra only through Sources/Ui/Umbra.swift (`@_exported import Umbra` + the aliases).
UMBRA="$SRC/Vendor/Umbra"; MOD="$OUT/umbra-module"
umbra_module() {
  rm -rf "$MOD"; mkdir -p "$MOD"
  find "$UMBRA" -name '*.swift' -print0 | xargs -0 swiftc -swift-version 5 -O -parse-as-library \
    -target arm64-apple-macos14 -module-name Umbra -emit-module -emit-module-path "$MOD/Umbra.swiftmodule" \
    -emit-library -static -o "$MOD/libUmbra.a"
}
app_swiftc() {
  find "$SRC" -name '*.swift' -not -path "$UMBRA/*" -print0 | xargs -0 swiftc -swift-version 5 -O -parse-as-library \
    -target arm64-apple-macos14 -module-name MaControl -I "$MOD" -L "$MOD" -lUmbra \
    -framework CoreLocation -framework CoreWLAN "$@"
}
if [ "${BIN_ONLY:-0}" = "1" ]; then
  mkdir -p "$OUT/render"
  umbra_module
  app_swiftc -o "$OUT/render/$EXE"
  passport "$OUT/render/dev-build.json"
  echo "$OUT/render/$EXE"; exit 0
fi
# Stage (as scripts/build.sh): MACONTROL_STAGE dev | preview | production; RELEASE=1 means production.
STAGE="${MACONTROL_STAGE:-dev}"; [ "${RELEASE:-0}" = "1" ] && STAGE="${MACONTROL_STAGE:-production}"
# The app carries its own server, like the old one: Contents/MacOS/mc-helper (scripts/build-helper.sh) and
# Contents/Resources/agent/{agent.cjs,web,build-info.json} (as scripts/build-agent.sh). WEB_OUT is the static
# Web UI to bundle; web/out (built with build:local when missing).
WEB_OUT="${WEB_OUT:-$ROOT/web/out}"
server_parts() {
  (cd "$ROOT" && bash scripts/build-helper.sh >/dev/null)
  if [ "${SKIP_AGENT_BUILD:-0}" != "1" ]; then
    (cd "$ROOT" && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @awake/agent build >/dev/null)
  fi
  [ -d "$WEB_OUT" ] || (cd "$ROOT" && pnpm --filter @awake/web build:local >/dev/null)
}
APP="$OUT/$FILE.app"
server_parts
rm -rf "$APP"; mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/agent"
umbra_module
app_swiftc -o "$APP/Contents/MacOS/$EXE"
cp "$ROOT/build/mc-helper" "$APP/Contents/MacOS/mc-helper"
cp "$ROOT/agent/dist/agent.cjs" "$APP/Contents/Resources/agent/agent.cjs"
cp -R "$WEB_OUT" "$APP/Contents/Resources/agent/web"
(cd "$ROOT" && node scripts/build-info.mjs "$APP/Contents/Resources/agent/build-info.json" >/dev/null)
if [ "$STAGE" = "production" ]; then
  cp "$ROOT/Resources/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"
else
  (cd "$ROOT" && swift tools/stage-icon.swift Resources/AppIcon.icns "$APP/Contents/Resources/AppIcon.icns" "$STAGE")
fi
LOC="macOS показує назву мережі Wi-Fi лише з дозволом геолокації. За нею MaControl знає, чи Mac у довіреній мережі. Координати не зберігаються."
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleIdentifier</key><string>$ID</string>
  <key>CFBundleName</key><string>$NAME</string>
  <key>CFBundleDisplayName</key><string>$NAME</string>
  <key>CFBundleExecutable</key><string>$EXE</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>MCStage</key><string>$STAGE</string>
  <key>NSLocationUsageDescription</key><string>$LOC</string>
  <key>NSLocationWhenInUseUsageDescription</key><string>$LOC</string>
  <key>NSBluetoothAlwaysUsageDescription</key><string>MaControl стежить за сигналом вашого iPhone чи Apple Watch і блокує Mac, коли ви відходите.</string>
</dict></plist>
PLIST
passport "$APP/Contents/Resources/dev-build.json"
codesign --force --sign - "$APP/Contents/MacOS/mc-helper" >/dev/null
codesign --force --sign - "$APP" >/dev/null
echo "$APP"

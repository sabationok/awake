#!/usr/bin/env bash
# Mac ↔ web parity screenshots for MaControl (Dev).
#
#   scripts/parity.sh                 every page of the tree web serves
#   scripts/parity.sh session tracking
#
# Both sides render the SAME tree: the one http://localhost:3218/api/tree returns (live: Upstash or Web Swift) is
# saved to build/parity/tree.json and handed to the Mac snapshot with --tree. Nothing reaches the owner's screen:
# the Mac binary runs with the .prohibited activation policy and never orders its window in, Chrome runs headless.
# The running server, the old app and agent-dev are never touched (no socket either: the tree comes from the file).
#
# Out: mac/build/parity/<id>-mac.png, <id>-web.png and <id>.png (the two side by side).
# Needs: web dev server on :3218 (`pnpm --filter @awake/web dev`), Google Chrome, jq.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="${PARITY_WEB:-http://localhost:3218}"
W="${PARITY_WIDTH:-1280}" H="${PARITY_HEIGHT:-900}"
JOBS="${PARITY_JOBS:-4}"
OUT="$ROOT/mac/build/parity"
BIN="$ROOT/mac/build/render/MaControl"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p "$OUT"

curl -fsS "$WEB/api/tree" | jq '.tree' > "$OUT/tree.json" || { echo "web не відповідає на $WEB" >&2; exit 1; }

if [ $# -gt 0 ]; then ids=("$@"); else ids=($(jq -r '.pages[].id' "$OUT/tree.json")); fi

echo "→ збираю бінарник для знімків"
BIN_ONLY=1 bash "$ROOT/scripts/build-mac.sh" >/dev/null

# Stitcher compiled once (swift scripts are slow to start).
APPEND="$OUT/.append"
if [ ! -x "$APPEND" ] || [ "$ROOT/scripts/parity-append.swift" -nt "$APPEND" ]; then
  swiftc -O -o "$APPEND" "$ROOT/scripts/parity-append.swift"
fi

shoot() {
  local id="$1" prof
  prof="$(mktemp -d)"
  "$BIN" --page "$id" --tree "$OUT/tree.json" --snapshot "$OUT/$id-mac.png" --render --width "$W" --height "$H" &
  local mac=$!
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
    --window-size="$W,$H" --virtual-time-budget=4000 --user-data-dir="$prof" \
    --screenshot="$OUT/$id-web.png" "$WEB/#$id" >/dev/null 2>&1 || echo "  ✗ web $id" >&2
  wait "$mac" || echo "  ✗ mac $id" >&2
  rm -rf "$prof"
  "$APPEND" "$OUT/$id.png" "Mac · $id:$OUT/$id-mac.png" "Web · $id:$OUT/$id-web.png" && echo "  ✓ $id"
}
export -f shoot
export OUT BIN W H WEB CHROME APPEND

echo "→ ${#ids[@]} сторінок, по $JOBS паралельно"
printf '%s\n' "${ids[@]}" | xargs -P "$JOBS" -I{} bash -c 'shoot "$@"' _ {}
echo "→ $OUT"

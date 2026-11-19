#!/bin/bash
# Реліз Awake через GitHub Releases + Sparkle.
# Приватний ключ EdDSA: ~/.config/awake/sparkle_ed25519.key (base64 seed), без Keychain.
#   scripts/release.sh 1.1
# Що робить: ставить версію в Info.plist, збирає, пакує zip, підписує EdDSA-ключем
# з Keychain, оновлює appcast.xml, створює GitHub-реліз із zip і пушить appcast.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION="${1:?Формат: scripts/release.sh <версія, напр. 1.1>}"
REPO="sabationok/awake"
PLIST=Info.plist
SPARKLE=Vendor/Sparkle/bin
KEY="$HOME/.config/awake/sparkle_ed25519.key"
[ -f "$KEY" ] || { echo "Немає ключа $KEY"; exit 1; }

# CFBundleVersion має зростати з кожним релізом: беремо попередній +1.
BUILD=$(( $(/usr/libexec/PlistBuddy -c 'Print CFBundleVersion' "$PLIST") + 1 ))
/usr/libexec/PlistBuddy -c "Set CFBundleShortVersionString $VERSION" "$PLIST"
/usr/libexec/PlistBuddy -c "Set CFBundleVersion $BUILD" "$PLIST"

./scripts/build.sh
mkdir -p releases
# У releases/ лишається лише поточний архів: префікс URL прив'язаний до тегу цього релізу.
find releases -name '*.zip' -delete
ZIP="releases/Awake-$VERSION.zip"
ditto -c -k --keepParent build/Awake.app "$ZIP"

# generate_appcast підписує всі архіви в releases/ і пише appcast.xml у корінь.
"$SPARKLE/generate_appcast" \
  --ed-key-file "$KEY" \
  --download-url-prefix "https://github.com/$REPO/releases/download/v$VERSION/" \
  -o appcast.xml releases/

git add Info.plist appcast.xml
git commit -m "Release $VERSION ($BUILD)" || true
git push
gh release create "v$VERSION" "$ZIP" --repo "$REPO" --title "Awake $VERSION" --notes "Awake $VERSION"
echo "Опубліковано v$VERSION (build $BUILD)"

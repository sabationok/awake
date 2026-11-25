#!/bin/bash
# Реліз MaControl через GitHub Releases + Sparkle.
# Приватний ключ EdDSA: ~/.config/awake/sparkle_ed25519.key (base64 seed), без Keychain.
#   pnpm release:version && git commit -am "release: vX.Y.Z" && scripts/release.sh
# Що робить: ставить версію в Info.plist, збирає, пакує zip, підписує EdDSA-ключем
# з Keychain, оновлює appcast.xml, створює GitHub-реліз із zip і пушить appcast.
set -euo pipefail
cd "$(dirname "$0")/.."
# Версію веде Changesets: спершу `pnpm release:version` (закриває записи змін, пише app/CHANGELOG.md), коміт, потім цей скрипт.
VERSION="${1:-$(node -p "require('./app/package.json').version")}"
REPO="sabationok/awake"
PLIST=Info.plist
SPARKLE=Vendor/Sparkle/bin
KEY="$HOME/.config/awake/sparkle_ed25519.key"
[ -f "$KEY" ] || { echo "Немає ключа $KEY"; exit 1; }

# CFBundleVersion має зростати з кожним релізом: беремо попередній +1.
BUILD=$(( $(/usr/libexec/PlistBuddy -c 'Print CFBundleVersion' "$PLIST") + 1 ))
/usr/libexec/PlistBuddy -c "Set CFBundleShortVersionString $VERSION" "$PLIST"
/usr/libexec/PlistBuddy -c "Set CFBundleVersion $BUILD" "$PLIST"

./scripts/build-agent.sh
./scripts/build.sh
mkdir -p releases
# У releases/ лишається лише поточний архів: префікс URL прив'язаний до тегу цього релізу.
find releases -name '*.zip' -delete
ZIP="releases/MaControl-$VERSION.zip"
ditto -c -k --keepParent build/MaControl.app "$ZIP"

# generate_appcast підписує всі архіви в releases/ і пише appcast.xml у корінь.
"$SPARKLE/generate_appcast" \
  --ed-key-file "$KEY" \
  --download-url-prefix "https://github.com/$REPO/releases/download/v$VERSION/" \
  -o appcast.xml releases/

git add Info.plist appcast.xml
git commit -m "Release $VERSION ($BUILD)" || true
git push
gh release create "v$VERSION" "$ZIP" --repo "$REPO" --title "MaControl $VERSION" --notes "$(node -e "const i=JSON.parse(require('fs').readFileSync('Resources/agent/build-info.json','utf8'));console.log(i.released||'MaControl '+i.version)")"
echo "Опубліковано v$VERSION (build $BUILD)"

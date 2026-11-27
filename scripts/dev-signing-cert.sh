#!/bin/bash
# Створює в login keychain самопідписаний сертифікат для підпису коду «MaControl Dev» (раз на Mac).
# Навіщо: macOS прив'язує дозволи (Bluetooth, геолокація, Accessibility) до designated requirement підпису.
# Ad-hoc підпис дає requirement за cdhash, і кожна нова збірка — «нова аппка»: дозволи злітають.
# З цим сертифікатом requirement — `identifier … and certificate leaf = H"…"`, однаковий для всіх збірок.
# scripts/lib/codesign.sh бере його сам, коли `security find-identity -p codesigning` його бачить.
# Довіра (trust) не потрібна: codesign підписує й так, а TCC порівнює лише requirement.
# Перший підпис після імпорту macOS може спитати доступ до ключа: «Завжди дозволяти».
set -euo pipefail
NAME="MaControl Dev"
KEYCHAIN="$HOME/Library/Keychains/login.keychain-db"

if security find-identity -p codesigning | /usr/bin/grep -q "\"$NAME\""; then
  echo "Сертифікат «$NAME» уже є:"
  security find-identity -p codesigning | /usr/bin/grep "\"$NAME\""
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
PASS="$(openssl rand -hex 16)"

openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
  -keyout "$TMP/key.pem" -out "$TMP/cert.pem" -subj "/CN=$NAME" \
  -addext "basicConstraints=critical,CA:false" \
  -addext "keyUsage=critical,digitalSignature" \
  -addext "extendedKeyUsage=critical,codeSigning" 2>/dev/null
# Старі алгоритми PKCS#12: `security import` не читає типові для OpenSSL 3.
openssl pkcs12 -export -inkey "$TMP/key.pem" -in "$TMP/cert.pem" -out "$TMP/id.p12" -name "$NAME" \
  -passout "pass:$PASS" -certpbe PBE-SHA1-3DES -keypbe PBE-SHA1-3DES -macalg sha1
security import "$TMP/id.p12" -k "$KEYCHAIN" -P "$PASS" -T /usr/bin/codesign >/dev/null

security find-identity -p codesigning | /usr/bin/grep "\"$NAME\""
echo "Готово. Перезберіть: bash scripts/build-mac.sh (або scripts/build-helper.sh)."

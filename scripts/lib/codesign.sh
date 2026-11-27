# Підпис збірок MaControl, спільний для build-helper.sh і build-mac.sh (підключати через `source`).
# Є сертифікат «MaControl Dev» (scripts/dev-signing-cert.sh) — підписуємо ним: вимога підпису тоді
# «bundle id + сертифікат», вона однакова між білдами, і дозволи macOS (Bluetooth, геолокація) не губляться.
# Немає — ad-hoc з попередженням: вимога тоді — хеш бінарника, і кожен білд дозволи губить.
MC_SIGN_NAME="MaControl Dev"

mc_sign_identity() {
  if security find-identity -p codesigning 2>/dev/null | /usr/bin/grep -q "\"$MC_SIGN_NAME\""; then
    echo "$MC_SIGN_NAME"
  else
    echo "-"
  fi
}

# mc_sign <шлях> [identifier]: підписати бандл або бінарник і перевірити вимогу.
mc_sign() {
  local target="$1" identifier="${2:-}" identity
  identity="$(mc_sign_identity)"
  local args=(--force --sign "$identity" --timestamp=none)
  [ -n "$identifier" ] && args+=(--identifier "$identifier")
  codesign "${args[@]}" "$target" >/dev/null 2>&1 || codesign "${args[@]}" "$target"
  mc_check_requirement "$target" "$identity"
}

# Вимога має бути «certificate leaf», а не «cdhash». Ad-hoc — лише попередження, білд не падає.
mc_check_requirement() {
  local target="$1" identity="$2" requirement
  requirement="$(codesign -d -r- "$target" 2>&1 | /usr/bin/grep 'designated =' || true)"
  if [ "$identity" = "-" ]; then
    echo "УВАГА: немає сертифіката «$MC_SIGN_NAME», $(basename "$target") підписано ad-hoc — дозволи macOS злетять з наступним білдом. Запусти scripts/dev-signing-cert.sh." >&2
    return 0
  fi
  if ! echo "$requirement" | /usr/bin/grep -q 'certificate leaf'; then
    echo "ПОМИЛКА: $(basename "$target") підписано «$MC_SIGN_NAME», але вимога без certificate leaf: $requirement" >&2
    return 1
  fi
}

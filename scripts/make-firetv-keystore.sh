#!/usr/bin/env bash
# Create the release signing key for the Fire TV app and print the four values
# CI needs. Run this on YOUR machine, not in CI — the whole point is that the
# key stays with you.
#
#   bash scripts/make-firetv-keystore.sh
#
# Why this matters: the key you create here IS the app's identity. Android will
# not let a differently-signed APK upgrade an installed one, so if you lose this
# file, every existing install is stranded and the app has to be published fresh
# under a new package name. Back it up somewhere you will still have in a year.
set -euo pipefail

KEYSTORE="${1:-bghtv-release.jks}"
ALIAS="${BGHTV_ALIAS:-bghtv}"

if [ -e "$KEYSTORE" ]; then
  echo "Refusing to overwrite an existing keystore: $KEYSTORE" >&2
  echo "Pass a different path, or move the old one aside first." >&2
  exit 1
fi

# keytool ships with a JDK. On Windows the likeliest one is the runtime bundled
# with Android Studio, which is not on PATH by default.
KEYTOOL=keytool
if ! command -v keytool >/dev/null; then
  for candidate in \
    "/c/Program Files/Android/Android Studio/jbr/bin/keytool.exe" \
    "/c/Program Files/Android/Android Studio/jre/bin/keytool.exe" \
    "$JAVA_HOME/bin/keytool" "$JAVA_HOME/bin/keytool.exe"; do
    [ -x "$candidate" ] && { KEYTOOL="$candidate"; break; }
  done
fi
if [ "$KEYTOOL" = keytool ] && ! command -v keytool >/dev/null; then
  echo "keytool not found. Install a JDK (or Android Studio), or set JAVA_HOME." >&2
  echo "On Windows it is usually:" >&2
  echo "  C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\keytool.exe" >&2
  exit 1
fi
command -v base64 >/dev/null || { echo "base64 not found." >&2; exit 1; }

# Git Bash/MinTTY does not give Java a real console, so keytool's password
# prompts silently hang. winpty fixes that and ships with Git for Windows.
RUN_KEYTOOL="$KEYTOOL"
case "${MSYSTEM:-}" in
  MINGW*|MSYS*) command -v winpty >/dev/null && RUN_KEYTOOL="winpty $KEYTOOL" ;;
esac

echo "Creating $KEYSTORE (alias: $ALIAS)."
echo "You will be asked for a password — use a real one and record it."
echo

$RUN_KEYTOOL -genkeypair -v \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -storetype PKCS12

# GNU base64 wants -w0; BSD/macOS base64 has no -w and never wraps.
# keytool with PKCS12 uses one password for both the store and the key, so the
# two password secrets below are normally the same value.
if base64 --help 2>&1 | grep -q -- '-w'; then
  B64=$(base64 -w0 "$KEYSTORE")
else
  B64=$(base64 "$KEYSTORE" | tr -d '\n')
fi

OUT="${KEYSTORE}.base64.txt"
printf '%s' "$B64" > "$OUT"
chmod 600 "$OUT" "$KEYSTORE"

cat <<EOF

Done. Keystore: $KEYSTORE
Base64 written to: $OUT  ($(printf '%s' "$B64" | wc -c) characters)

Set these four repository secrets at
  https://github.com/mf4633/board-gaming/settings/secrets/actions

  BGHTV_KEYSTORE_BASE64     the contents of $OUT
  BGHTV_KEYSTORE_PASSWORD   the store password you just chose
  BGHTV_KEY_ALIAS           $ALIAS
  BGHTV_KEY_PASSWORD        the key password (same as the store password
                            unless keytool asked you for a separate one)

Or, with the GitHub CLI:

  gh secret set BGHTV_KEYSTORE_BASE64   --repo mf4633/board-gaming < "$OUT"
  gh secret set BGHTV_KEYSTORE_PASSWORD --repo mf4633/board-gaming
  gh secret set BGHTV_KEY_ALIAS         --repo mf4633/board-gaming --body "$ALIAS"
  gh secret set BGHTV_KEY_PASSWORD      --repo mf4633/board-gaming

Then push any change under android-tv/ (or run Actions -> firetv-apk -> Run
workflow with 'publish' ticked). CI switches to assembleRelease, the publish
guard passes, and firetv-v1 gets a signed, non-debuggable APK.

KEEP $KEYSTORE. Back it up. Do not commit it — *.jks and *.keystore are
gitignored, and $OUT is too. Delete $OUT once the secret is set.
EOF

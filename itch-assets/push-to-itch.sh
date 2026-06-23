#!/usr/bin/env bash
# itch.io butler push commands
# Run from: C:/Users/michael.flynn/board-gaming/
# Requires: butler logged in (~/bin/butler/butler)

BUTLER=~/bin/butler/butler
REPO=C:/Users/michael.flynn/board-gaming
VER=$(cd "$REPO" && git rev-parse --short HEAD)

echo "Pushing at git rev $VER"

# ── SKYSTACK (already live, update only) ──
echo "→ SKYSTACK..."
$BUTLER push "$REPO/Tower.html" hydroengineer/skystack:html-web --userversion "$VER"

# ── FLOODLINE (create page first at itch.io, then run this) ──
echo "→ Floodline..."
$BUTLER push "$REPO/Floodline.html" hydroengineer/floodline:html-web --userversion "$VER"

# ── BONNEVILLE (create page first at itch.io, then run this) ──
echo "→ Bonneville Spillway Operator..."
$BUTLER push "$REPO/BonnevilleSpillwayOperator.html" hydroengineer/bonneville-spillway-operator:html-web --userversion "$VER"

echo "Done. Check https://hydroengineer.itch.io to verify."

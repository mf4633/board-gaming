#!/usr/bin/env bash
# itch.io butler push commands
# Run from anywhere — paths are absolute.
# Requires: butler logged in (~/bin/butler/butler)
#
# BEFORE RUNNING:
#   Floodline    → create page at itch.io, slug: floodline
#   Bonneville   → create page at itch.io, slug: bonneville-spillway-operator
#   (SKYSTACK is already live — no page creation needed)

BUTLER=~/bin/butler/butler
PUBLIC=C:/Users/michael.flynn/board-gaming
PREMIUM=C:/Users/michael.flynn/board-gaming-premium
VER=$(cd "$PUBLIC" && git rev-parse --short HEAD)

echo "Pushing at git rev $VER"
echo ""

# ── SKYSTACK (already live — push updated public build) ──
echo "→ SKYSTACK (public build)..."
$BUTLER push "$PUBLIC/Tower.html" hydroengineer/skystack:html-web --userversion "$VER"
echo ""

# ── FLOODLINE FULL (premium build — 14 scenarios, DEMO_BUILD=false) ──
# Create page first: itch.io → Dashboard → Create project → kind=HTML → slug=floodline
echo "→ Floodline (premium build — 14 scenarios)..."
$BUTLER push "$PREMIUM/Floodline.html" hydroengineer/floodline:html-web --userversion "$VER"
echo ""

# ── BONNEVILLE (premium build) ──
# Create page first: slug=bonneville-spillway-operator
echo "→ Bonneville Spillway Operator (premium build)..."
$BUTLER push "$PREMIUM/BonnevilleSpillwayOperator.html" hydroengineer/bonneville-spillway-operator:html-web --userversion "$VER"
echo ""

echo "Done. Verify at:"
echo "  https://hydroengineer.itch.io/skystack"
echo "  https://hydroengineer.itch.io/floodline"
echo "  https://hydroengineer.itch.io/bonneville-spillway-operator"

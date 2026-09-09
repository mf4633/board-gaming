#!/usr/bin/env python3
"""Move Floodline's cursor preview onto its own canvas layer.

Problem
-------
The cursor preview was drawn inside render(), so it could only move once the
whole terrain had been redrawn. Measured on the SMALLEST map (Training,
126x76 = 9,576 cells):

    render()          40.4 ms per call     <-- the frame
    step() physics     3.0 ms
    mouseToCell()      0.02 ms             <-- picking was never the problem
    updateTooltip()    0.002 ms

That is ~25 fps, and the premium scenarios run 234x140 = 32,760 cells (3.4x
more), so a frame there is well over 100 ms. The cursor therefore trailed the
pointer by a frame or more, appeared to "catch up" a second later, and made
click-drag painting unreliable because you could not see where you were
painting.

Fix
---
1. A transparent #hoverCanvas layered over #canvas, drawn straight from the
   pointermove handler. Cursor feedback no longer waits on the terrain.
2. Drag placement walks the pointer's coalesced events instead of only the
   final position, so a fast drag paints a continuous line rather than dots.
   Deduplicated by cell, so it does not re-place (or re-click the sfx) on a
   cell it already covered.

This does NOT touch the renderer itself; render() is still ~40 ms. Making the
terrain cheap (offscreen cache, redraw only water/changed cells) is a separate
job.

Usage:  python floodline_hover_layer_patch_2026-09-09.py [files...]
Defaults to both masters. Idempotent -- re-running on a patched file is a no-op.
"""

import sys
from pathlib import Path

# Resolved relative to this script (repo/tests/), so the premium checkout is
# expected as a sibling of the repo root.
_REPO = Path(__file__).resolve().parent.parent
DEFAULT_TARGETS = [
    _REPO / "Floodline.html",
    _REPO.parent / "board-gaming-premium" / "Floodline.html",
]

CSS_ANCHOR = (
    "  #canvas { display: block; width: 100%; height: 100%; "
    "cursor: crosshair; image-rendering: pixelated; }"
)
CSS_ADD = (
    "\n  /* Cursor preview layer. Separate canvas so the pointer highlight does not\n"
    "     wait on the terrain redraw -- see floodline_hover_layer_patch. */\n"
    "  #hoverCanvas { position: absolute; inset: 0; width: 100%; height: 100%; "
    "display: block; pointer-events: none; }"
)

MARKUP_ANCHOR = '<canvas id="canvas"></canvas>'
MARKUP_ADD = '\n    <canvas id="hoverCanvas"></canvas>'

GLOBALS_ANCHOR = "const ctx = canvas.getContext('2d');"
GLOBALS_ADD = (
    "\nconst hoverCanvas = document.getElementById('hoverCanvas');\n"
    "const hoverCtx = hoverCanvas.getContext('2d');"
)

DRAW_HOVER = '''
// ---------- Cursor preview layer ----------
// Drawn on its own canvas, straight from the pointer handler, so the highlight
// tracks the cursor at pointer rate instead of at whatever the terrain redraw
// can manage (40 ms on the smallest map, 100 ms+ on the big ones).
function drawHover() {
  const w = hoverCanvas.clientWidth, h = hoverCanvas.clientHeight;
  if (hoverCanvas.width !== w || hoverCanvas.height !== h) {
    hoverCanvas.width = w; hoverCanvas.height = h;
  }
  hoverCtx.clearRect(0, 0, w, h);
  if (!state.scenario || !state.elev || !state.mouseCell) return;
  const tool = TOOLS[state.tool];
  if (!tool) return;
  const { x, y } = state.mouseCell;
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;

  const c = effCost(state.tool);
  const affordable = state.budget >= c;
  hoverCtx.strokeStyle = affordable ? tool.color : '#ef4444';
  hoverCtx.lineWidth = 2;
  hoverCtx.font = 'bold 10px Segoe UI';

  if (state.view === 'iso') {
    const i = idx(x, y);
    const e = state.elev[i] + state.structH[i] + state.water[i];
    const p1 = isoProject(x, y, e + 0.08);
    const p2 = isoProject(x + 1, y, e + 0.08);
    const p3 = isoProject(x + 1, y + 1, e + 0.08);
    const p4 = isoProject(x, y + 1, e + 0.08);
    hoverCtx.beginPath();
    hoverCtx.moveTo(p1.x, p1.y); hoverCtx.lineTo(p2.x, p2.y);
    hoverCtx.lineTo(p3.x, p3.y); hoverCtx.lineTo(p4.x, p4.y);
    hoverCtx.closePath(); hoverCtx.stroke();
    hoverCtx.fillStyle = affordable ? 'rgba(15,23,42,0.9)' : 'rgba(239,68,68,0.9)';
    hoverCtx.fillRect(p2.x + 4, p2.y - 6, 44, 14);
    hoverCtx.fillStyle = '#fbbf24';
    hoverCtx.fillText(fmt$(c), p2.x + 8, p2.y + 5);
  } else {
    const cw = w / COLS, ch = h / ROWS;
    hoverCtx.strokeRect(x * cw, y * ch, cw, ch);
    hoverCtx.fillStyle = affordable ? 'rgba(15,23,42,0.85)' : 'rgba(239,68,68,0.85)';
    hoverCtx.fillRect(x * cw + cw + 2, y * ch - 2, 44, 14);
    hoverCtx.fillStyle = '#fbbf24';
    hoverCtx.fillText(fmt$(c), x * cw + cw + 6, y * ch + 9);
  }
}

'''

MOVE_OLD = """  const pin = primaryPointerDown ? (state.dragZ ?? true) : false;
  state.mouseCell = mouseToCell(e, pin);
  if (primaryPointerDown) {
    const useRemove = (primaryPointerBtn === 2) || removeMode;
    if (useRemove) removeCell(e); else place(e);
  }
  state._lastMouseClient = { x: e.clientX, y: e.clientY };
  updateTooltip(e);"""

MOVE_NEW = """  const pin = primaryPointerDown ? (state.dragZ ?? true) : false;
  state.mouseCell = mouseToCell(e, pin);
  if (primaryPointerDown) {
    const useRemove = (primaryPointerBtn === 2) || removeMode;
    // A fast drag arrives as one pointermove spanning many pixels of travel.
    // The browser keeps the intermediate points, so paint through those rather
    // than leaving gaps between samples. Dedupe by cell: without it a single
    // cell would be re-placed (and re-click the sfx) once per coalesced point.
    const pts = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null;
    const seq = pts && pts.length > 1 ? pts : [e];
    let lastI = state._dragLastIdx ?? -1;
    for (const p of seq) {
      const cell = mouseToCell(p, pin);
      if (cell.x < 0 || cell.x >= COLS || cell.y < 0 || cell.y >= ROWS) continue;
      const ci = idx(cell.x, cell.y);
      if (ci === lastI) continue;
      lastI = ci;
      if (useRemove) removeCell(p); else place(p);
    }
    state._dragLastIdx = lastI;
  }
  state._lastMouseClient = { x: e.clientX, y: e.clientY };
  drawHover();
  updateTooltip(e);"""

LEAVE_OLD = """canvas.addEventListener('pointerleave', e => {
  endPointer(e);
  state.mouseCell = null;"""
LEAVE_NEW = """canvas.addEventListener('pointerleave', e => {
  endPointer(e);
  state.mouseCell = null;
  drawHover();"""

END_OLD = """    primaryPointerDown = false;
    panning = false;
    state.dragZ = null;"""
END_NEW = """    primaryPointerDown = false;
    panning = false;
    state.dragZ = null;
    state._dragLastIdx = -1;"""

LOOP_OLD = "\n  render();\n"
# Redrawn each frame too, so the highlight follows camera pans, zoom and
# budget changes even when the pointer is still.
LOOP_NEW = "\n  render();\n  drawHover();\n"


def cut_block(src, marker, what):
    """Remove `marker` plus the brace-matched `if (...) { ... }` that follows."""
    at = src.find(marker)
    if at < 0:
        raise SystemExit(f"patch: could not find {what}")
    brace = src.find("{", at)
    if brace < 0:
        raise SystemExit(f"patch: no opening brace for {what}")
    depth, i = 0, brace
    while i < len(src):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                break
        i += 1
    else:
        raise SystemExit(f"patch: unbalanced braces in {what}")
    end = i + 1
    while end < len(src) and src[end] in " \t":
        end += 1
    if end < len(src) and src[end] == "\n":
        end += 1
    return src[:at] + src[end:]


def once(src, old, new, what):
    n = src.count(old)
    if n != 1:
        raise SystemExit(f"patch: expected 1 match for {what}, found {n}")
    return src.replace(old, new)


def patch(path):
    src = path.read_text(encoding="utf-8")
    if "hoverCanvas" in src:
        print(f"  {path.name}: already patched, skipping")
        return False

    src = once(src, CSS_ANCHOR, CSS_ANCHOR + CSS_ADD, "the #canvas CSS rule")
    src = once(src, MARKUP_ANCHOR, MARKUP_ANCHOR + MARKUP_ADD, "the canvas element")
    src = once(src, GLOBALS_ANCHOR, GLOBALS_ANCHOR + GLOBALS_ADD, "the ctx global")

    # Drop both in-render cursor blocks; drawHover replaces them.
    src = cut_block(src, "  // Cursor preview diamond", "the iso cursor preview")
    src = cut_block(src, "  // Cursor preview\n", "the top-down cursor preview")

    src = once(src, "function render() {", DRAW_HOVER.lstrip("\n") + "function render() {",
               "the render() definition")
    src = once(src, MOVE_OLD, MOVE_NEW, "the pointermove body")
    src = once(src, LEAVE_OLD, LEAVE_NEW, "the pointerleave handler")
    src = once(src, END_OLD, END_NEW, "the endPointer reset")
    src = once(src, LOOP_OLD, LOOP_NEW, "the render() call in loop()")

    # Windows, twice over: without encoding= this truncates on the first
    # non-ASCII char, and without newline="" Python rewrites every \n as \r\n,
    # which silently converts the whole file to CRLF -- a total git diff, and it
    # breaks any tooling matching multi-line anchors.
    path.write_text(src, encoding="utf-8", newline="")
    print(f"  {path.name}: patched ({len(src):,} bytes)")
    return True


if __name__ == "__main__":
    targets = [Path(a) for a in sys.argv[1:]] or DEFAULT_TARGETS
    print("floodline hover-layer patch")
    for t in targets:
        if not t.exists():
            raise SystemExit(f"patch: missing {t}")
        patch(t)

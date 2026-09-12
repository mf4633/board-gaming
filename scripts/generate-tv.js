#!/usr/bin/env node
/**
 * games.json -> tv.html : the 10-foot hub the Fire TV app loads.
 *
 * This page is deliberately NOT the site catalogue. It carries no nav, no ads
 * and no editorial copy: it is a launcher meant to be read from a couch and
 * driven by a remote. Everything here is sized for 1080p at three metres and
 * every interactive element is reachable with four arrows and an OK button.
 *
 * The Fire TV app puts itself in D-PAD mode for this page (see InputMode in
 * MainActivity.kt), so arrow keys arrive as real keydowns and the spatial
 * navigation below owns focus. Pointer input still works, because the app's
 * cursor mode synthesises mouse events and because people open this page in
 * Silk too.
 *
 * Usage: node scripts/generate-tv.js   (also run by scripts/generate-catalog.js)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));
const { site, categories, games } = data;
const BASE = site.baseUrl.replace(/\/$/, '');

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Same slug->path rule the web catalogue uses: directory games keep their slash.
function gameUrl(g) {
  return g.sourceHtml.endsWith('/index.html') ? `/${g.slug}/` : `/${g.slug}`;
}

// A game is launched in D-pad mode when the arrows ARE the controls. The app
// reads ?tvinput= off the URL it is asked to load; anything else defaults to
// the virtual cursor, which is what click-driven games need. Either way the
// menu button on the remote flips modes at any time, so a wrong guess here
// costs one button press rather than a broken game.
const DPAD_NATIVE = new Set(['2048', 'hellcat']);

function tvInput(g) {
  return DPAD_NATIVE.has(g.slug) ? 'dpad' : 'cursor';
}

function tile(g, index) {
  const href = `${gameUrl(g)}${gameUrl(g).includes('?') ? '&' : '?'}tvinput=${tvInput(g)}`;
  const art = g.ogImage ? `<img class="tart" src="${esc(g.ogImage)}" alt="" loading="lazy">` : '';
  const daily = g.daily ? `<span class="tdaily">Daily</span>` : '';
  return `      <a class="tile" href="${esc(href)}" data-idx="${index}"${index === 0 ? ' autofocus' : ''}>
        ${art}
        <span class="tbody">
          <span class="tname">${esc(g.title)}${daily}</span>
          <span class="tdesc">${esc(g.description)}</span>
        </span>
      </a>`;
}

function row(cat) {
  const list = games.filter((g) => g.category === cat.id);
  if (!list.length) return '';
  const tiles = list.map((g) => tile(g, 0)).join('\n');
  return `  <section class="row">
    <h2>${esc(cat.label)}</h2>
    <div class="strip" tabindex="-1">
${tiles}
    </div>
  </section>`;
}

const rows = categories.map(row).filter(Boolean).join('\n');

// Sizing note: nothing on this page is smaller than 22px, tiles are 360px wide
// and the whole layout sits inside a 4% inset because a real television still
// overscans and eats the outer edge of the signal.
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1280, initial-scale=1">
<meta name="robots" content="noindex, follow">
<title>Board Gaming Hub — TV</title>
<link rel="canonical" href="${BASE}/tv">
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; height: 100%;
    background: #0c1016; color: #d8d0c0;
    font-family: Georgia, "Times New Roman", serif;
    overflow-x: hidden;
  }
  /* Televisions overscan. Keep everything inside the title-safe area. */
  #wrap { padding: 4vh 4vw 6vh 4vw; }
  header { display: flex; align-items: baseline; gap: 24px; margin-bottom: 3vh; }
  header h1 { font-size: 44px; letter-spacing: 10px; color: #f0d89c; margin: 0; }
  header .tag { color: #8098a8; letter-spacing: 4px; font-size: 22px; }
  header .count { margin-left: auto; color: #5a6874; font-size: 22px; letter-spacing: 3px; }

  .row { margin-bottom: 4vh; }
  .row h2 {
    font-size: 26px; letter-spacing: 7px; color: #f0d89c;
    text-transform: uppercase; margin: 0 0 16px 0; font-weight: normal;
  }
  .strip {
    display: flex; gap: 22px; overflow-x: auto; overflow-y: hidden;
    padding: 14px 6px 22px 6px; scroll-behavior: smooth;
    scrollbar-width: none;
  }
  .strip::-webkit-scrollbar { display: none; }

  .tile {
    flex: 0 0 360px; width: 360px;
    background: #141c28; border: 2px solid #2a3540; border-radius: 8px;
    text-decoration: none; overflow: hidden;
    display: flex; flex-direction: column;
    transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;
    outline: none;
  }
  .tart { display: block; width: 100%; aspect-ratio: 1200 / 630; object-fit: cover; background: #0c1016; }
  .tbody { display: block; padding: 14px 18px 18px 18px; }
  .tname { display: block; color: #f0d89c; font-size: 28px; letter-spacing: 2px; margin-bottom: 6px; }
  .tdesc { display: block; color: #a8b0c0; font-size: 22px; line-height: 1.35; min-height: 60px; }
  .tdaily {
    display: inline-block; margin-left: 10px; vertical-align: middle;
    font-size: 16px; letter-spacing: 2px; text-transform: uppercase;
    color: #a8c878; border: 1px solid #3d5a2e; border-radius: 3px; padding: 2px 7px;
  }

  /* Focus and hover are the same state on purpose: the remote drives focus,
     the app's virtual cursor drives hover, and both must look identical. */
  .tile:focus, .tile:hover {
    border-color: #f0d89c; background: #1e2838;
    transform: scale(1.06);
    box-shadow: 0 0 0 4px rgba(240, 216, 156, 0.28), 0 14px 34px rgba(0, 0, 0, 0.6);
  }

  footer {
    margin-top: 2vh; color: #5a6874; font-size: 20px; letter-spacing: 2px;
    border-top: 1px solid #2a3540; padding-top: 18px; line-height: 1.8;
  }
  footer b { color: #8098a8; font-weight: normal; }
  @media (prefers-reduced-motion: reduce) {
    .tile { transition: none; }
    .tile:focus, .tile:hover { transform: none; }
    .strip { scroll-behavior: auto; }
  }
</style>
</head>
<body>
<div id="wrap">
  <header>
    <h1>BOARD GAMING HUB</h1>
    <span class="tag">FIRE TV</span>
    <span class="count">${games.length} GAMES</span>
  </header>

${rows}

  <footer>
    <b>OK</b> plays &middot; <b>Back</b> returns here &middot; <b>&#9776; Menu</b> switches a game between pointer and D-pad controls
  </footer>
</div>
<script>
(function () {
  'use strict';
  // Spatial navigation. Chromium does not move focus on arrow keys by itself,
  // and this page is driven by a four-way remote, so we do it geometrically:
  // pick whichever tile's centre is nearest in the requested direction. That
  // handles ragged row lengths without hard-coding a grid.
  var tiles = Array.prototype.slice.call(document.querySelectorAll('.tile'));
  if (!tiles.length) return;

  function centre(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function nearest(from, dir) {
    var a = centre(from), best = null, bestScore = Infinity;
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (t === from) continue;
      var b = centre(t);
      var dx = b.x - a.x, dy = b.y - a.y;
      // Require genuine travel in the requested direction, with a tolerance
      // band so a slightly misaligned neighbour still counts.
      var along, across;
      if (dir === 'left')       { along = -dx; across = Math.abs(dy); }
      else if (dir === 'right') { along =  dx; across = Math.abs(dy); }
      else if (dir === 'up')    { along = -dy; across = Math.abs(dx); }
      else                      { along =  dy; across = Math.abs(dx); }
      if (along <= 8) continue;
      // Weight cross-axis drift heavily so we prefer the true neighbour.
      var score = along + across * 2.2;
      if (score < bestScore) { bestScore = score; best = t; }
    }
    return best;
  }

  function focusTile(t) {
    if (!t) return;
    t.focus();
    // block:'nearest' keeps vertical movement calm; inline:'center' keeps the
    // focused tile away from the overscan edge as a strip scrolls.
    if (t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  var DIRS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var dir = DIRS[e.key];
    if (dir) {
      e.preventDefault();
      var active = document.activeElement;
      if (!active || tiles.indexOf(active) === -1) { focusTile(tiles[0]); return; }
      var next = nearest(active, dir);
      if (next) focusTile(next);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      var cur = document.activeElement;
      if (cur && tiles.indexOf(cur) !== -1) { e.preventDefault(); cur.click(); }
    }
  });

  // Land on something focusable immediately so the first arrow press moves a
  // highlight rather than doing nothing.
  if (!document.activeElement || tiles.indexOf(document.activeElement) === -1) {
    focusTile(tiles[0]);
  }

  // Tell the host app this page wants raw arrow keys. The app also recognises
  // the /tv path, so this is belt and braces for Silk and for future hosts.
  if (window.BGHTV && typeof window.BGHTV.setInputMode === 'function') {
    try { window.BGHTV.setInputMode('dpad'); } catch (err) {}
  }
})();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'tv.html'), html);
console.log(`Generated tv.html for ${games.length} games (${categories.length} rows).`);

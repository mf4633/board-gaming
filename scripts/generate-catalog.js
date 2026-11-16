#!/usr/bin/env node
/**
 * Single source of truth: games.json → index.html, sitemap.xml, nav.js GAMES block,
 * and tv.html (the 10-foot Fire TV hub). Strategy guides live on the game pages (#guide).
 * Usage: node scripts/generate-catalog.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));
const { site, categories, games } = data;
const BASE = site.baseUrl.replace(/\/$/, '');
const PUB = site.publisherId;
const AD_SLOT = String(site.adSlot || '').trim();
const ADS_ENABLED = /^\d{10}$/.test(AD_SLOT) && AD_SLOT !== '0000000000';
const count = games.length;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function gameUrl(g) {
  return g.sourceHtml.endsWith('/index.html') ? `/${g.slug}/` : `/${g.slug}`;
}

// "New this week": games whose games.json `addedOn` (YYYY-MM-DD) is within
// NEW_WINDOW_DAYS of build time. Emitted markup carries data-added so the page
// also hides stale entries client-side if nobody regenerates for a while.
const NEW_WINDOW_DAYS = 14;
function isNewGame(g) {
  if (!g.addedOn) return false;
  const age = (Date.now() - Date.parse(g.addedOn + 'T00:00:00Z')) / 86400000;
  return age >= 0 && age <= NEW_WINDOW_DAYS;
}

// Gameplay thumbnails (480x300 webp) live in /thumbs/<slug>.webp. They are
// screenshots of the game in play, refreshed with tidelands-sim/bgh-thumbs.js (+ bgh-thumb-steps.js, bgh-thumbs-crop.py).
// A game without one falls back to a text-only card.
function thumbFor(g) {
  return fs.existsSync(path.join(ROOT, 'thumbs', g.slug + '.webp')) ? `/thumbs/${g.slug}.webp` : '';
}

function card(g, opts = {}) {
  const demo = g.demo && g.storeUrl;
  const badge = demo ? `<span class="demo-badge">Demo, full version on itch.io</span>` : '';
  const daily = g.daily ? `<span class="daily-badge">Daily</span>` : '';
  const newBadge = isNewGame(g) ? `<span class="new-badge" data-added="${g.addedOn}">New</span>` : '';
  const thumb = thumbFor(g);
  const cls = ['gcard', thumb ? 'has-thumb' : '', opts.featured ? 'featured-card' : ''].filter(Boolean).join(' ');
  const img = thumb ? `\n      <img class="gthumb" src="${thumb}" width="480" height="300" loading="lazy" decoding="async" alt="">` : '';
  return `    <a class="${cls}" href="${gameUrl(g)}">${img}
      <div class="gbody">
        <div class="gname">${esc(g.title)}${newBadge}${daily}</div>
        <div class="gsub">${esc(g.description)}${badge ? '<br>' + badge : ''}</div>
      </div>
    </a>`;
}

// Homepage section order follows what visitors actually play: the sims and
// the original board games draw the traffic, the classics come after.
const SECTION_ORDER = ['sims', 'board', 'puzzles'];
const orderedCategories = [...categories].sort((a, b) => {
  const ia = SECTION_ORDER.indexOf(a.id), ib = SECTION_ORDER.indexOf(b.id);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
});

function indexSection(cat) {
  const list = games.filter(g => g.category === cat.id && !g.unlisted);
  return `
  <section class="shelf" id="${esc(cat.id)}">
    <div class="shelf-head">
      <h2>${esc(cat.label)}</h2>
      <p class="blurb">${esc(cat.blurb)}</p>
    </div>
    <div class="grid">
${list.map(g => card(g)).join('\n')}
    </div>
  </section>`;
}

// The longer category essays stay on the page (they describe the catalog for
// readers and reviewers) but sit below the games instead of in front of them.
const essaysBlock = orderedCategories.filter(c => c.essay).map(c =>
  `    <h3>${esc(c.label)}</h3>\n    <p>${esc(c.essay)}</p>`).join('\n');

const sharedCss = `  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #0c1016; color: #d8d0c0; font-family: Georgia, "Times New Roman", serif; }
  #wrap { max-width: 1200px; margin: 0 auto; padding: 32px 24px 80px 24px; }
  header { text-align: center; margin-bottom: 28px; }
  header h1 { font-size: 2.0em; letter-spacing: 8px; color: #f0d89c; margin: 0; }
  header .tag { color: #8098a8; letter-spacing: 3px; font-size: 0.82em; margin-top: 10px; }
  header .free-tag { display: inline-block; margin-top: 14px; padding: 4px 14px; border: 1px solid #5a8060; border-radius: 3px; color: #a0d0a8; font-size: 0.78em; letter-spacing: 3px; }
  .eclipse-strip { text-align: center; margin: 0 0 16px; padding: 13px 18px; background: linear-gradient(90deg,#0a0618,#141c30,#0a0618); border: 1px solid #5a5080; border-radius: 4px; }
  .eclipse-strip b { color: #ffd040; letter-spacing: 2px; }
  .eclipse-strip a { color: #94c3e8; text-decoration: none; margin: 0 8px; letter-spacing: 1px; }
  .eclipse-strip a:hover { color: #ffd040; }
  .eclipse-strip .days { color: #ffd040; font-weight: bold; }
  .daily-strip { text-align: center; margin: 0 0 28px; padding: 14px 18px; background: #141c28; border: 1px solid #3a5060; border-radius: 4px; }
  .daily-strip b { color: #f0d89c; letter-spacing: 2px; }
  .daily-strip a { color: #94c3e8; text-decoration: none; margin: 0 10px; letter-spacing: 1px; }
  .daily-strip a:hover { color: #f0d89c; }
  nav.hub { text-align: center; margin: 18px 0 30px; font-size: 0.84em; letter-spacing: 2px; }
  nav.hub a { color: #8098a8; text-decoration: none; margin: 0 12px; }
  nav.hub a:hover { color: #f0d89c; }
  section { margin-top: 40px; }
  section h2 { font-size: 1.0em; letter-spacing: 6px; color: #f0d89c; text-transform: uppercase; border-bottom: 1px solid #2a3540; padding-bottom: 8px; margin-bottom: 18px; }
  section .blurb { color: #8098a8; font-size: 0.92em; margin-bottom: 22px; line-height: 1.6; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
  .gcard { display: block; background: #141c28; border: 1px solid #2a3540; border-radius: 4px; padding: 16px 18px; text-decoration: none; color: inherit; }
  .gcard:hover { background: #1a2434; border-color: #4a6478; }
  .gcard:focus-visible { outline: 2px solid #f0d89c; outline-offset: 3px; }
  .gcard.has-thumb { padding: 0; overflow: hidden; }
  .gcard .gthumb { display: block; width: 100%; height: auto; aspect-ratio: 16 / 10; object-fit: cover; background: #0a0e14; border-bottom: 1px solid #2a3540; filter: saturate(0.9) brightness(0.92); transition: filter 0.15s; }
  .gcard:hover .gthumb, .gcard:focus-visible .gthumb { filter: none; }
  .gcard.has-thumb .gbody { padding: 12px 14px 14px; }
  .gcard .gname { color: #f0d89c; font-size: 1.08em; letter-spacing: 0.5px; font-weight: bold; margin-bottom: 4px; }
  .gcard .gsub { color: #a8b0c0; font-size: 0.85em; line-height: 1.45; }
  .demo-badge { display: inline-block; margin-top: 6px; font-size: 0.78em; color: #a0c8a8; letter-spacing: 1px; }
  .demo-badge a { color: #94c3e8; }
  .daily-badge { display: inline-block; margin-left: 8px; font-size: 0.65em; color: #a0d0a8; letter-spacing: 2px; vertical-align: middle; font-weight: normal; }
  .new-badge { display: inline-block; margin-left: 8px; padding: 1px 6px; font-size: 0.6em; color: #0c1016; background: #f0c060; border-radius: 2px; letter-spacing: 2px; vertical-align: middle; font-weight: bold; }
  .new-strip { text-align: center; margin: 0 0 16px; padding: 14px 18px; background: linear-gradient(90deg,#1a1408,#26200c,#1a1408); border: 1px solid #7a6020; border-radius: 4px; }
  .new-strip b { color: #f0c060; letter-spacing: 2px; }
  .new-strip a { color: #f0d89c; text-decoration: none; margin: 0 10px; letter-spacing: 1px; }
  .new-strip a:hover { color: #fff; }
  .new-strip .when { color: #8a7a50; font-size: 0.85em; }
  .ad-slot { position: relative; width: 100%; margin: 24px 0; min-height: 90px; display: block; background: #11161e; border: 1px dashed #2a3540; border-radius: 4px; padding: 6px; overflow: hidden; }
  .ad-slot--pending { display: none; }
  .ad-slot::before { content: 'Advertisement'; position: absolute; top: -18px; left: 50%; transform: translateX(-50%); color: #5a6874; font-size: 0.65em; letter-spacing: 3px; pointer-events: none; }
  .ad-slot ins.adsbygoogle { display: block !important; width: 100% !important; min-height: 90px; }
  footer { margin-top: 60px; text-align: center; color: #5a6874; font-size: 0.78em; letter-spacing: 2px; line-height: 1.8; }
  footer a { color: #8098a8; text-decoration: none; }
  footer a:hover { color: #d8d0c0; }
  .disclosure { color: #5a6874; font-size: 0.72em; max-width: 700px; margin: 30px auto 0; line-height: 1.6; letter-spacing: 0.5px; font-style: italic; }
  .editorial { background: #141c28; border: 1px solid #2a3540; border-radius: 4px; padding: 28px 30px; margin: 0 0 32px; line-height: 1.75; }
  .editorial h2 { font-size: 1.0em; letter-spacing: 5px; color: #f0d89c; text-transform: uppercase; margin: 0 0 16px; border: none; padding: 0; }
  .editorial p { color: #b8c0c8; font-size: 0.96em; margin: 0 0 16px; }
  .editorial p:last-child { margin-bottom: 0; }
  section .essay { color: #9aa8b8; font-size: 0.9em; line-height: 1.7; margin: -8px 0 22px; max-width: 900px; }`;

function adUnit(style) {
  if (!ADS_ENABLED) {
    return `  <div class="ad-slot ad-slot--pending"${style ? ` style="${style}"` : ''} aria-hidden="true"></div>`;
  }
  return `  <div class="ad-slot"${style ? ` style="${style}"` : ''}>
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="${PUB}"
         data-ad-slot="${AD_SLOT}"
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
  </div>`;
}

// Always emitted: ownership meta + host-gated loader (see scripts/adsense-snippet.js).
// The <ins> units below still wait for a real site.adSlot.
const adsenseHeadScript = require('./adsense-snippet').block;

const adInitScript = ADS_ENABLED ? `<script>
(function () {
  function fillAds() {
    var slots = document.querySelectorAll('ins.adsbygoogle');
    for (var i = 0; i < slots.length; i++) {
      (adsbygoogle = window.adsbygoogle || []).push({});
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { requestAnimationFrame(fillAds); });
  } else {
    requestAnimationFrame(fillAds);
  }
})();
</script>` : '';

// "Recently updated": last commit date per game file, straight from git, so
// the hub shows real maintenance rather than a hand-kept list.
const { execFileSync } = require('child_process');
// Sitewide sweeps (ads, nav, OG stamps) touch every page; only commits that
// changed a handful of files count as an update to a game.
function lastCommitDate(file) {
  try {
    const log = execFileSync('git', ['log', '--format=@%cs', '--name-only', '--full-diff', '--', file], { cwd: ROOT, encoding: 'utf8' });
    for (const chunk of log.split('@').slice(1)) {
      const [date, ...names] = chunk.trim().split('\n').filter(Boolean);
      if (names.length <= 6) return date;
    }
  } catch (e) { /* not a git checkout */ }
  return '';
}
const recentlyUpdated = games
  .filter(g => !g.unlisted)
  .map(g => ({ g, date: lastCommitDate(g.sourceHtml) }))
  .filter(x => x.date)
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 6);

const link = (slug, text) => {
  const g = games.find(x => x.slug === slug);
  return `<a href="${gameUrl(g)}">${esc(text || g.title)}</a>`;
};

const hubEditorial = `  <article class="editorial">
    <h2>What is Board Gaming Hub?</h2>
    <p>Board Gaming Hub is a free collection of browser games built and maintained by one person, Hydro Engineer, a licensed civil engineer who works on dams and flood hydrology. Every game is a single HTML file: open the page and play, with no account and no install. Game pages cover the rules and strategy, and the most-played games also explain how that particular version works, including what the computer opponent does and which rule variants were chosen.</p>
    <p><b>The originals are the reason the site exists.</b> ${link('tidelands')} is a Bronze Age maritime trade game whose scoring was rebalanced after 1,000-game simulation runs. ${link('bisque')} is a battle for a bay, ${link('agora')} is Mediterranean trade, ${link('aresia')} colonizes Mars, ${link('odyssey')} sails the wine-dark sea, ${link('convergence')} pits rival civilizations against a shared economy, and ${link('doctrine')} is a geopolitical simulation running from 1990 to 2050. None of them exist anywhere else.</p>
    <p><b>The classics are here because people play them every day.</b> ${link('solitaire')}, ${link('sudoku')}, ${link('mahjong')}, ${link('minesweeper')}, ${link('chess')} and ${link('go')} sit next to two original daily word puzzles, ${link('wordform')} and ${link('drift')}, and four games that are thousands of years old: ${link('ur', 'the Royal Game of Ur')}, ${link('senet')}, ${link('pentegrammai', 'Pente Grammai')} and ${link('mancala')}.</p>
    <p><b>The simulations use real engineering.</b> ${link('floodline')} and ${link('bonnevillespillwayoperator')} come from the author's day job in flood and dam work, and ${link('eclipsepredictor')} computes eclipse paths from 1900 to 2200 with the open-source astronomy-engine library.</p>
    <p>The site is free and supported by Google ads. Many of the games also have Android versions; see the <a href="/apps">app list</a>.</p>
  </article>
  <section class="recent">
    <h2>Recently updated</h2>
    <ul>
${recentlyUpdated.map(x => `      <li><a href="${gameUrl(x.g)}">${esc(x.g.title)}</a> <span>${x.date}</span></li>`).join('\n')}
    </ul>
  </section>`;


// Eclipse-season banner: client-side countdown that auto-rolls from the
// Aug 12 2026 eclipse to the Aug 2 2027 eclipse once 2026 has passed.
const eclipseStrip = `  <div class="eclipse-strip" id="eclipse-strip" style="display:none">
    <b>🌒 TOTAL SOLAR ECLIPSE</b> — <span id="eclipse-when"></span>
    <a href="/eclipsepredictor">Watch the path in 3D</a> ·
    <a href="/eclipsepredictor#guide">Viewing guide</a>
  </div>
  <script>
  (function () {
    var events = [
      { t: Date.UTC(2026, 7, 12), label: 'Arctic · Iceland · Spain' },
      { t: Date.UTC(2027, 7, 2),  label: 'Spain · North Africa · Arabia — 6+ min totality' }
    ];
    var now = Date.now();
    for (var i = 0; i < events.length; i++) {
      var d = Math.ceil((events[i].t - now) / 86400000);
      if (d >= 0) {
        var when = d === 0 ? '<span class="days">TODAY</span>'
                 : '<span class="days">' + d + ' day' + (d === 1 ? '' : 's') + '</span> away';
        document.getElementById('eclipse-when').innerHTML = when + ' · ' + events[i].label + ' · ';
        document.getElementById('eclipse-strip').style.display = '';
        return;
      }
    }
  })();
  </script>`;

const newGames = games.filter(g => isNewGame(g) && !g.unlisted).sort((a, b) => b.addedOn.localeCompare(a.addedOn));
const newStrip = newGames.length
  ? `  <div class="new-strip" id="new-strip">
    <b>✦ NEW THIS WEEK</b> —
    ${newGames.map(g => `<a href="${gameUrl(g)}" data-added="${g.addedOn}">${esc(g.title)}</a>`).join(' · ')}
    <span class="when">· fresh from the workshop</span>
  </div>
  <script>
  (function () {
    // Hide "new" markers older than ${NEW_WINDOW_DAYS} days even if the site isn't regenerated.
    var cutoff = Date.now() - ${NEW_WINDOW_DAYS} * 86400000, live = 0;
    var els = document.querySelectorAll('[data-added]');
    for (var i = 0; i < els.length; i++) {
      if (Date.parse(els[i].getAttribute('data-added') + 'T00:00:00Z') < cutoff) els[i].style.display = 'none';
      else if (els[i].tagName === 'A') live++;
    }
    var strip = document.getElementById('new-strip');
    if (strip && !live) strip.style.display = 'none';
  })();
  </script>`
  : '';

const dailyGames = games.filter(g => g.daily && !g.unlisted);

const listed = games.filter(g => !g.unlisted);
const HERO_SLUG = 'apoapsis';
const heroGame = games.find(g => g.slug === HERO_SLUG);
const heroBlock = `  <section class="hero">
    <div class="hero-copy">
      <h1>Strategy games, ancient games and simulations built on real physics.</h1>
      <p class="lede">${listed.length} free games that run in your browser tab. No account and nothing to install.</p>
      <div class="hero-actions">
        <a class="btn-primary" href="${gameUrl(heroGame)}">Play ${esc(heroGame.title)}</a>
        <button type="button" class="btn-ghost" id="randomGame">Pick a random game</button>
      </div>
      <p class="hero-jump">Jump to <a href="#sims">Simulations</a><a href="#board">Board games</a><a href="#puzzles">Classic puzzles</a></p>
    </div>
    <a class="hero-shot" href="${gameUrl(heroGame)}">
      <img src="/thumbs/hero-apoapsis.webp" width="960" height="600" fetchpriority="high" alt="Apoapsis in flight: a two-stage rocket climbing through the upper atmosphere with altitude, velocity and orbit readouts around it">
      <span class="hero-cap"><b>${esc(heroGame.title)}</b>: build a rocket, fly it to orbit on real orbital mechanics, then try for the moon.</span>
    </a>
  </section>`;

const dailyBlock = dailyGames.length ? `  <section class="daily">
    <h2>Today's puzzles</h2>
    <ul>
${dailyGames.map(g => `      <li><a href="${gameUrl(g)}#daily">${thumbFor(g) ? `<img src="${thumbFor(g)}" width="72" height="45" alt="">` : ''}<span>${esc(g.title)}<small>New puzzle every day</small></span></a></li>`).join('\n')}
    </ul>
  </section>` : '';

const randomScript = `<script>
(function () {
  var urls = ${JSON.stringify(listed.filter(g => !g.noindex).map(gameUrl))};
  var b = document.getElementById('randomGame');
  if (b) b.addEventListener('click', function () { location.href = urls[Math.floor(Math.random() * urls.length)]; });
})();
</script>`;

// One hub. /play (the old ad catalog) 301s here — see netlify.toml.
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="theme-color" content="#0c1016">
<title>Board Gaming Hub — Free Browser Board, Puzzle &amp; Strategy Games</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Free browser games by one engineer: original strategy designs (Tidelands, Bisque, Agora), classics (Solitaire, Sudoku, Chess, Go), ancient games, daily word puzzles and engineering simulations. No signup.">
<link rel="canonical" href="${BASE}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Board Gaming Hub">
<meta property="og:url" content="${BASE}/">
<meta property="og:title" content="Board Gaming Hub — free browser games">
<meta property="og:description" content="Original strategy games, classics, ancient games and engineering simulations, each in a single HTML file.">
<meta property="og:image" content="${BASE}/og/home.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${BASE}/og/home.png">
${adsenseHeadScript}
<style>
${sharedCss}
  .recent { margin: 0 0 32px; }
  .recent ul { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px 18px; }
  .recent a { color: #94c3e8; text-decoration: none; }
  .recent a:hover { color: #f0d89c; }
  .recent span { color: #5a6874; font-size: 0.82em; margin-left: 6px; }
  .editorial a { color: #94c3e8; }
  .editorial h3 { color: #d8c08c; font-size: 1.0em; margin: 26px 0 8px; font-weight: bold; }
  #wrap { padding-top: 36px; }
  .hero { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 40px; align-items: center; margin: 0 0 44px; }
  .hero h1 { font-size: clamp(1.9em, 3.4vw, 2.75em); line-height: 1.12; font-weight: normal; color: #f3e6c4; margin: 0 0 18px; letter-spacing: -0.3px; }
  .hero .lede { color: #b8c0c8; font-size: 1.08em; line-height: 1.6; margin: 0 0 26px; max-width: 34em; }
  .hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 22px; }
  .btn-primary, .btn-ghost { font: inherit; font-size: 1.0em; padding: 12px 20px; border-radius: 4px; text-decoration: none; cursor: pointer; }
  .btn-primary { background: #f0d89c; color: #14100a; border: 1px solid #f0d89c; font-weight: bold; }
  .btn-primary:hover { background: #fbe8b8; }
  .btn-ghost { background: transparent; color: #f0d89c; border: 1px solid #5a6a78; }
  .btn-ghost:hover { border-color: #f0d89c; }
  .btn-primary:focus-visible, .btn-ghost:focus-visible, .hero-shot:focus-visible, .hero-jump a:focus-visible, .daily a:focus-visible { outline: 2px solid #94c3e8; outline-offset: 3px; }
  .hero-jump { color: #6a7a88; font-size: 0.9em; margin: 0; }
  .hero-jump a { color: #94c3e8; text-decoration: none; margin-left: 12px; }
  .hero-jump a:hover { color: #f0d89c; }
  .hero-shot { display: block; position: relative; border-radius: 6px; overflow: hidden; border: 1px solid #3a5060; box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.8); text-decoration: none; }
  .hero-shot img { display: block; width: 100%; height: auto; aspect-ratio: 16 / 10; }
  .hero-cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 26px 18px 14px; background: linear-gradient(180deg, transparent, rgba(5, 8, 12, 0.92)); color: #e8eef4; font-size: 0.95em; }
  .hero-cap b { color: #f0d89c; }
  .daily { margin: 0 0 22px; }
  .daily h2 { font-size: 1.15em; color: #f0d89c; margin: 0 0 12px; font-weight: normal; letter-spacing: 0; text-transform: none; border: 0; padding: 0; }
  .daily ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }
  .daily a { display: flex; align-items: center; gap: 12px; padding: 8px; background: #141c28; border: 1px solid #2a3540; border-radius: 4px; text-decoration: none; color: #f0d89c; }
  .daily a:hover { border-color: #4a6478; background: #1a2434; }
  .daily img { width: 72px; height: 45px; object-fit: cover; border-radius: 2px; flex: none; }
  .daily small { display: block; color: #7a8a98; font-size: 0.78em; margin-top: 2px; }
  .shelf { margin-top: 48px; }
  .shelf-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 18px; border-bottom: 1px solid #2a3540; padding-bottom: 10px; margin-bottom: 18px; }
  .shelf-head h2 { font-size: 1.5em; font-weight: normal; letter-spacing: 0; text-transform: none; color: #f3e6c4; border: 0; padding: 0; margin: 0; }
  .shelf-head .blurb { margin: 0; color: #8098a8; font-size: 0.92em; }
  .shelf .grid { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 18px; }
  .below { margin-top: 64px; }
  @media (max-width: 820px) {
    #wrap { padding: 22px 16px 60px; }
    .hero { grid-template-columns: 1fr; gap: 24px; margin-bottom: 32px; }
    .hero-actions a, .hero-actions button { flex: 1 1 auto; text-align: center; }
    .daily ul { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .daily a { flex-direction: column; align-items: flex-start; gap: 6px; }
    .daily img { width: 100%; height: auto; aspect-ratio: 16 / 10; }
    .shelf .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .gcard .gsub { font-size: 0.8em; }
    .gcard.has-thumb .gbody { padding: 9px 10px 11px; }
    .gcard .gname { font-size: 0.98em; }
  }
  @media (prefers-reduced-motion: reduce) { .gcard .gthumb { transition: none; } }
</style>
</head>
<body>
<div id="wrap">
${heroBlock}

${dailyBlock}
${newStrip}
${eclipseStrip}
${adUnit()}
${orderedCategories.map(c => indexSection(c)).join('\n')}
${adUnit('margin:32px 0')}

  <div class="below">
${hubEditorial.replace('</article>', `    <h2 style="margin-top:30px">About the collections</h2>
${essaysBlock}
  </article>`)}
  </div>
${randomScript}

  <p class="disclosure">
    This site is supported by Google AdSense advertisements. Advertisers do not influence game design or content.
    Google and its partners use cookies to serve ads based on prior visits to this and other sites; see the
    <a href="/privacy" style="color:#8098a8">privacy notice</a> for opt-out details.
  </p>

  <footer>
    <p style="margin-bottom:10px;font-size:0.95em;">Enjoying the games? <a href="https://buymeacoffee.com/mf4633" style="color:#f0c060;" target="_blank" rel="noopener">☕ Buy me a coffee</a></p>
    <p style="color:#7090a0;margin-bottom:10px;font-size:0.95em;">Engineering tools by the same author at <a href="https://pe-calc.com/" style="color:#a8c0d8;">pe-calc.com</a> · Stormwater design SaaS at <a href="https://hydrocomplete.com/" style="color:#a8c0d8;">hydrocomplete.com</a></p>
    <p style="color:#7090a0;margin-bottom:10px;font-size:0.95em;">Friends of the hub: <a href="https://antgames.ai/play/chinesechess/" style="color:#a8c0d8;">Chinese Chess (Xiangqi) at Ant Games</a></p>
    <a href="/apps">Android apps</a> ·
    <a href="/about">About</a> ·
    <a href="/contact">Contact</a> ·
    <a href="/privacy">Privacy</a> ·
    <a href="/terms">Terms</a> ·
    <a href="https://github.com/mf4633/board-gaming">github.com/mf4633/board-gaming</a>
  </footer>
</div>
${adInitScript}
<script src="/analytics.js"></script>
<script src="/nav.js" defer></script>
</body>
</html>
`;

function sitemapEntry(loc, priority, changefreq = 'monthly') {
  const today = new Date().toISOString().split('T')[0];
  return `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

const sitemapUrls = [
  sitemapEntry(`${BASE}/`, 1.0, 'weekly'),
  // games.json `noindex` pages carry <meta name="robots" content="noindex"> and stay out of the sitemap
  ...games.filter(g => !g.noindex).map(g => sitemapEntry(`${BASE}${gameUrl(g)}`, g.priority || 0.8)),
  sitemapEntry(`${BASE}/about`, 0.6, 'yearly'),
  sitemapEntry(`${BASE}/contact`, 0.5, 'yearly'),
  sitemapEntry(`${BASE}/apps`, 0.7, 'monthly'),
  sitemapEntry(`${BASE}/privacy`, 0.3, 'yearly'),
  sitemapEntry(`${BASE}/terms`, 0.3, 'yearly'),
];

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.join('\n')}
</urlset>
`;

function navGameLine(g) {
  const slug = g.slug;
  const url = gameUrl(g);
  const keys = (g.searchKeys || []).map(k => `'${k.replace(/'/g, "\\'")}'`).join(',');
  const name = g.title.replace(/'/g, "\\'");
  const desc = (g.description || '').replace(/'/g, "\\'");
  const daily = g.daily ? ', daily:true' : '';
  return `    { slug:'${slug}', url:'${url}', name:'${name}', cat:'${g.category}', desc:'${desc}', keys:[${keys}]${daily} },`;
}

// `unlisted` games stay playable at their URL but drop out of the hub and site search.
const navGamesBlock = games.filter(g => !g.unlisted).map(navGameLine).join('\n');

const navPath = path.join(ROOT, 'nav.js');
let navSrc = fs.readFileSync(navPath, 'utf8');
const begin = '  // BEGIN GAMES — generated by scripts/generate-catalog.js';
const end = '  // END GAMES';
const re = new RegExp(begin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
if (!re.test(navSrc)) {
  console.error('nav.js missing BEGIN/END GAMES markers — add them around the GAMES array');
  process.exit(1);
}
navSrc = navSrc.replace(re, `${begin}\n${navGamesBlock}\n  ${end}`);

fs.writeFileSync(path.join(ROOT, 'index.html'), indexHtml);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemapXml);
fs.writeFileSync(navPath, navSrc);

require('./generate-tv.js');

console.log(`Generated catalog for ${count} games:`);
console.log('  index.html, sitemap.xml, nav.js, tv.html');
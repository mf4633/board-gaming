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

function card(g, opts = {}) {
  const demo = g.demo && g.storeUrl;
  const badge = demo ? `<span class="demo-badge">Demo — full version on itch.io</span>` : '';
  const daily = g.daily ? `<span class="daily-badge">Daily</span>` : '';
  const newBadge = isNewGame(g) ? `<span class="new-badge" data-added="${g.addedOn}">New</span>` : '';
  const cls = opts.featured ? 'gcard featured-card' : 'gcard';
  return `    <a class="${cls}" href="${gameUrl(g)}">
      <div class="gname">${esc(g.title)}${newBadge}${daily}</div>
      <div class="gsub">${esc(g.description)}${badge ? '<br>' + badge : ''}</div>
    </a>`;
}

function indexSection(cat) {
  const list = games.filter(g => g.category === cat.id);
  const essay = cat.essay ? `\n    <p class="essay">${esc(cat.essay)}</p>` : '';
  return `
  <section>
    <h2>${esc(cat.label)}</h2>
    <div class="blurb">${esc(cat.blurb)}</div>${essay}
    <div class="grid">
${list.map(g => card(g)).join('\n')}
    </div>
  </section>`;
}

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
  .gcard { display: block; background: #141c28; border: 1px solid #2a3540; border-radius: 4px; padding: 16px 18px; text-decoration: none; transition: background 0.12s, border-color 0.12s, transform 0.12s; }
  .gcard:hover { background: #1e2838; border-color: #3a5060; transform: translateY(-2px); }
  .gcard .gname { color: #f0d89c; font-size: 1.08em; letter-spacing: 2px; font-weight: bold; margin-bottom: 4px; }
  .gcard .gsub { color: #a8b0c0; font-size: 0.85em; line-height: 1.4; }
  .featured .gcard, .featured-card { background: #1a2434; border-color: #3a5060; }
  .featured .gcard:hover, .featured-card:hover { background: #243044; border-color: #5a7090; }
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
    <p>Board Gaming Hub is a free collection of browser games built and maintained by one person, Michael Flynn, a licensed civil engineer who works on dams and flood hydrology. Every game is a single HTML file: open the page and play, with no account and no install. Each game page has the rules, a strategy section and notes on how that particular version works, including what the computer opponent does and which rule variants were chosen.</p>
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

const newGames = games.filter(isNewGame).sort((a, b) => b.addedOn.localeCompare(a.addedOn));
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

const dailyGames = games.filter(g => g.daily);
const dailyStrip = dailyGames.length
  ? `  <div class="daily-strip">
    <b>TODAY'S DAILY PUZZLES</b> —
    ${dailyGames.map(g => `<a href="${gameUrl(g)}#daily">${esc(g.title)}</a>`).join(' · ')}
    <span style="color:#5a6874;font-size:0.85em"> · add to home screen for quick access</span>
  </div>`
  : '';

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
</style>
</head>
<body>
<div id="wrap">
  <header>
    <h1>BOARD GAMING HUB</h1>
    <div class="tag">Original strategy games, classics and simulations, each in a single HTML file</div>
  </header>

  <nav class="hub">
    <a href="/apps">Android apps</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
  </nav>

${hubEditorial}

${newStrip}
${eclipseStrip}
${dailyStrip}
${adUnit()}
${categories.map(c => indexSection(c)).join('\n')}
${adUnit('margin:32px 0')}

  <p class="disclosure">
    This site is supported by Google AdSense advertisements. Advertisers do not influence game design or content.
    Google and its partners use cookies to serve ads based on prior visits to this and other sites; see the
    <a href="/privacy">privacy notice</a> for opt-out details.
  </p>

  <footer>
    <p style="margin-bottom:10px;font-size:0.95em;">Enjoying the games? <a href="https://buymeacoffee.com/mf4633" style="color:#f0c060;" target="_blank" rel="noopener">☕ Buy me a coffee</a></p>
    <p style="color:#7090a0;margin-bottom:10px;font-size:0.95em;">Engineering tools by the same author at <a href="https://pe-calc.com/" style="color:#a8c0d8;">pe-calc.com</a> · Stormwater design SaaS at <a href="https://hydrocomplete.com/" style="color:#a8c0d8;">hydrocomplete.com</a></p>
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
  ...games.map(g => sitemapEntry(`${BASE}${gameUrl(g)}`, g.priority || 0.8)),
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

const navGamesBlock = games.map(navGameLine).join('\n');

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
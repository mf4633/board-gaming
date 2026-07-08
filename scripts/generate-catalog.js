#!/usr/bin/env node
/**
 * Single source of truth: games.json → index.html, play.html, sitemap.xml, nav.js GAMES block.
 * Usage: node scripts/generate-catalog.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));
const { site, categories, games, guides = [] } = data;
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

function card(g, opts = {}) {
  const demo = g.demo && g.storeUrl;
  const badge = demo ? `<span class="demo-badge">Demo — full version on itch.io</span>` : '';
  const daily = g.daily ? `<span class="daily-badge">Daily</span>` : '';
  const cls = opts.featured ? 'gcard featured-card' : 'gcard';
  return `    <a class="${cls}" href="${g.sourceHtml}">
      <div class="gname">${esc(g.title)}${daily}</div>
      <div class="gsub">${esc(g.description)}${badge ? '<br>' + badge : ''}</div>
    </a>`;
}

function section(catId, opts = {}) {
  const cat = categories.find(c => c.id === catId);
  const list = games.filter(g => g.category === catId);
  if (!list.length) return '';
  const sectionClass = opts.highlightPuzzles && catId === 'puzzles' ? 'featured' : '';
  const essay = cat.essay ? `\n    <p class="essay">${esc(cat.essay)}</p>` : '';
  return `
  <section${sectionClass ? ` class="${sectionClass}"` : ''}>
    <h2>${esc(cat.label)}</h2>
    <div class="blurb">${esc(cat.blurb)}</div>${essay}
    <div class="grid">
${list.map(g => card(g, { featured: g.featured && opts.highlightPuzzles })).join('\n')}
    </div>
  </section>`;
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
  .ad-slot { position: relative; width: 100%; margin: 24px 0; min-height: 90px; display: block; background: #11161e; border: 1px dashed #2a3540; border-radius: 4px; padding: 6px; overflow: hidden; }
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
  .guides-strip { margin: 0 0 32px; padding: 20px 22px; background: #111820; border: 1px solid #2a3540; border-radius: 4px; }
  .guides-strip h2 { font-size: 0.82em; letter-spacing: 4px; color: #8098a8; text-transform: uppercase; margin: 0 0 14px; }
  .guides-strip .guide-links { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
  .guides-strip a { display: block; color: #94c3e8; text-decoration: none; font-size: 0.92em; padding: 8px 10px; border: 1px solid #2a3540; border-radius: 3px; background: #141c28; }
  .guides-strip a:hover { color: #f0d89c; border-color: #3a5060; background: #1a2434; }
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

const adsenseHeadScript = ADS_ENABLED
  ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB}" crossorigin="anonymous"></script>`
  : '';

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

const hubEditorial = `  <article class="editorial">
    <h2>What is Board Gaming Hub?</h2>
    <p>Board Gaming Hub is a free collection of ${count} browser games maintained by Michael Flynn, PE — a dam-safety and hydrology engineer who builds simulations with real formulas behind them. Every game is a single HTML file: open the page and play. No accounts, no installers, no tracking on gameplay screens.</p>
    <p>The catalog mixes beloved classics (Chess, Go, Sudoku, Solitaire, Mahjong) with original strategy designs (Agora, Bisque, Aresia, Convergence) and engineering-grade simulations (Floodline, Bonneville Spillway Operator, Eclipse Predictor, Tower). Ads appear only on this catalog page — never during play — so sessions stay uninterrupted.</p>
    <p>New here? Start with <a href="Wordform.html" style="color:#94c3e8">Wordform</a> or <a href="Drift.html" style="color:#94c3e8">Drift</a> for a two-minute daily puzzle, explore the <a href="guides/" style="color:#94c3e8">guides</a> for strategy and science write-ups, or jump straight into <a href="Floodline.html" style="color:#94c3e8">Floodline</a> if you want to see what engineer-built physics feels like in a game.</p>
  </article>`;

const guidesStrip = guides.length
  ? `  <nav class="guides-strip" aria-label="Guides">
    <h2>Guides &amp; articles</h2>
    <div class="guide-links">
${guides.map(g => `      <a href="${g.file}">${esc(g.title)}</a>`).join('\n')}
      <a href="guides/">All guides →</a>
    </div>
  </nav>`
  : '';

const dailyGames = games.filter(g => g.daily);
const dailyStrip = dailyGames.length
  ? `  <div class="daily-strip">
    <b>TODAY'S DAILY PUZZLES</b> —
    ${dailyGames.map(g => `<a href="${g.sourceHtml}#daily">${esc(g.title)}</a>`).join(' · ')}
    <span style="color:#5a6874;font-size:0.85em"> · add to home screen for quick access</span>
  </div>`
  : '';

const playHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="theme-color" content="#0c1016">
<title>Play Free — Solitaire, Sudoku, Mahjong, 2048, Chess | Board Gaming Hub</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Play ${count} free strategy and puzzle games in your browser — Solitaire, Sudoku, Mahjong, Wordform, 2048, Minesweeper, Chess, Go, plus original designs and physics sims. Single-file HTML, ad-supported.">
<meta name="keywords" content="free online games, solitaire, sudoku, mahjong, 2048, minesweeper, chess, go, browser games">
<link rel="canonical" href="${BASE}/play.html">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Board Gaming Hub">
<meta property="og:url" content="${BASE}/play.html">
<meta property="og:title" content="Play ${count} free in-browser puzzle &amp; strategy games">
<meta property="og:description" content="Solitaire, Sudoku, Mahjong, Wordform, 2048, Chess, Go, plus original designs and physics sims. Free, ad-supported, no signup.">
<meta name="twitter:card" content="summary">
${adsenseHeadScript}
<style>
${sharedCss}
</style>
</head>
<body>
<div id="wrap">
  <header>
    <h1>BOARD GAMING</h1>
    <div class="tag">Free in-browser puzzle, board, and strategy games</div>
    <div class="free-tag">FREE · AD-SUPPORTED</div>
  </header>

  <nav class="hub">
    <a href="index.html">Clean version</a>
    <a href="guides/">Guides</a>
    <a href="apps.html">Android apps</a>
    <a href="about.html">About</a>
    <a href="contact.html">Contact</a>
    <a href="privacy.html">Privacy</a>
  </nav>

${hubEditorial}
${guidesStrip}

${adUnit()}

${dailyStrip}
${section('puzzles', { highlightPuzzles: true })}
${adUnit('margin:32px 0')}
${section('board')}
${section('sims')}

${adUnit('margin:32px 0')}

  <p class="disclosure">
    This page is supported by Google AdSense advertisements. Ads help keep the games free.
    Advertisers do not influence game design or content. Cookies are used by Google and its partners
    to serve ads based on your prior visits to this and other sites — see the
    <a href="privacy.html">privacy notice</a> for opt-out details.
  </p>

  <footer>
    <p style="color:#7090a0;margin-bottom:10px;font-size:0.95em;">Engineering tools by the same author at <a href="https://pe-calc.com/" style="color:#a8c0d8;">pe-calc.com</a> · Stormwater design SaaS at <a href="https://hydrocomplete.com/" style="color:#a8c0d8;">hydrocomplete.com</a></p>
    <a href="index.html">Clean version</a> ·
    <a href="apps.html">Android apps</a> ·
    <a href="about.html">About</a> ·
    <a href="contact.html">Contact</a> ·
    <a href="privacy.html">Privacy</a> ·
    <a href="https://github.com/mf4633/board-gaming">github.com/mf4633/board-gaming</a>
  </footer>
</div>
${adInitScript}
<script src="/analytics.js"></script>
<script src="/nav.js" defer></script>
</body>
</html>
`;

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="theme-color" content="#0c1016">
<title>Board Gaming &amp; Simulations — ${count} Free Browser Games</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${count} free browser games — classics, original strategy, and simulations. Single HTML file each, no signup, no ads on gameplay.">
<link rel="canonical" href="${BASE}/">
<meta property="og:type" content="website">
<meta property="og:url" content="${BASE}/">
<meta property="og:title" content="Board Gaming Hub — ${count} free browser games">
<meta property="og:description" content="Classics, original strategy games, and simulations — all in a single HTML file each.">
<style>
${sharedCss.replace(/header \.free-tag[^}]+\}/g, '').replace(/\.ad-slot[^}]+\}/g, '').replace(/\.disclosure[^}]+\}/g, '')}
  #wrap { padding: 40px 24px 80px 24px; }
  header { margin-bottom: 40px; }
  header h1 { font-size: 2.2em; }
  header .tag { font-size: 0.85em; }
  section { margin-top: 46px; }
  section h2 { margin-bottom: 20px; }
</style>
</head>
<body>
<div id="wrap">
  <header>
    <h1>BOARD GAMING</h1>
    <div class="tag">Classics, original strategy games, and simulations — all in a single HTML file each.</div>
  </header>

  <nav class="hub">
    <a href="play.html">Ad-supported catalog</a>
    <a href="guides/">Guides</a>
    <a href="apps.html">Android apps</a>
    <a href="about.html">About</a>
    <a href="contact.html">Contact</a>
  </nav>

${hubEditorial}
${guidesStrip}

${dailyStrip}
${categories.map(c => indexSection(c)).join('\n')}

  <footer>
    <a href="play.html">Ad-supported catalog</a> ·
    <a href="apps.html">Android apps</a> ·
    <a href="https://github.com/mf4633/board-gaming">github.com/mf4633/board-gaming</a>
  </footer>
</div>
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
  sitemapEntry(`${BASE}/play`, 0.95, 'weekly'),
  sitemapEntry(`${BASE}/guides/`, 0.85, 'weekly'),
  ...guides.map(g => sitemapEntry(`${BASE}/guides/${g.slug}`, 0.8, 'monthly')),
  ...games.map(g => sitemapEntry(`${BASE}/${g.slug}`, g.priority || 0.8)),
  sitemapEntry(`${BASE}/about`, 0.6, 'yearly'),
  sitemapEntry(`${BASE}/contact`, 0.5, 'yearly'),
  sitemapEntry(`${BASE}/apps`, 0.7, 'monthly'),
  sitemapEntry(`${BASE}/privacy`, 0.3, 'yearly'),
];

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.join('\n')}
</urlset>
`;

function navGameLine(g) {
  const slug = g.sourceHtml.replace('.html', '');
  const keys = (g.searchKeys || []).map(k => `'${k.replace(/'/g, "\\'")}'`).join(',');
  const name = g.title.replace(/'/g, "\\'");
  const desc = (g.description || '').replace(/'/g, "\\'");
  const daily = g.daily ? ', daily:true' : '';
  return `    { slug:'${slug}', name:'${name}', cat:'${g.category}', desc:'${desc}', keys:[${keys}]${daily} },`;
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

fs.writeFileSync(path.join(ROOT, 'play.html'), playHtml);
fs.writeFileSync(path.join(ROOT, 'index.html'), indexHtml);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemapXml);
fs.writeFileSync(navPath, navSrc);

require('./generate-guides.js');

console.log(`Generated catalog for ${count} games:`);
console.log('  play.html, index.html, sitemap.xml, nav.js, guides/');
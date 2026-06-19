#!/usr/bin/env node
/**
 * Generate editorial guide pages for AdSense / SEO content depth.
 * Usage: node scripts/generate-guides.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));
const BASE = data.site.baseUrl.replace(/\/$/, '');

const guideCss = `  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #0c1016; color: #d8d0c0; font-family: Georgia, "Times New Roman", serif; line-height: 1.75; }
  #wrap { max-width: 760px; margin: 0 auto; padding: 40px 24px 80px; }
  .crumb { font-size: 0.82em; letter-spacing: 2px; color: #5a6874; margin-bottom: 28px; }
  .crumb a { color: #8098a8; text-decoration: none; }
  .crumb a:hover { color: #f0d89c; }
  header h1 { font-size: 1.75em; letter-spacing: 4px; color: #f0d89c; margin: 0 0 10px; line-height: 1.3; }
  header .deck { color: #8098a8; font-size: 0.95em; letter-spacing: 1px; margin-bottom: 8px; }
  header .updated { color: #5a6874; font-size: 0.78em; font-style: italic; }
  article { margin-top: 32px; }
  article p { color: #c0c8d0; font-size: 1.02em; margin: 0 0 18px; }
  article h2 { color: #f0d89c; font-size: 1.05em; letter-spacing: 4px; text-transform: uppercase; margin: 36px 0 14px; border-bottom: 1px solid #2a3540; padding-bottom: 8px; }
  article h3 { color: #d8d0c0; font-size: 1.0em; letter-spacing: 2px; margin: 28px 0 10px; }
  article ul, article ol { color: #c0c8d0; padding-left: 24px; margin: 0 0 18px; }
  article li { margin-bottom: 8px; }
  article a { color: #94c3e8; }
  article a:hover { color: #f0d89c; }
  .callout { background: #141c28; border: 1px solid #3a5060; border-radius: 4px; padding: 18px 22px; margin: 28px 0; }
  .callout b { color: #f0d89c; letter-spacing: 1px; }
  .scenario-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 0.92em; }
  .scenario-table th, .scenario-table td { border: 1px solid #2a3540; padding: 10px 12px; text-align: left; vertical-align: top; }
  .scenario-table th { color: #f0d89c; background: #141c28; letter-spacing: 1px; }
  .scenario-table td { color: #c0c8d0; }
  .play-cta { display: inline-block; margin-top: 8px; padding: 10px 18px; background: #1a2434; border: 1px solid #3a5060; border-radius: 4px; color: #f0d89c; text-decoration: none; letter-spacing: 2px; font-size: 0.88em; }
  .play-cta:hover { background: #243044; border-color: #5a7090; color: #f0d89c; }
  .related { margin-top: 48px; padding-top: 24px; border-top: 1px solid #2a3540; }
  .related h2 { font-size: 0.9em; letter-spacing: 4px; color: #8098a8; text-transform: uppercase; margin-bottom: 14px; }
  .related a { display: block; color: #94c3e8; text-decoration: none; margin-bottom: 8px; font-size: 0.95em; }
  .related a:hover { color: #f0d89c; }
  footer { margin-top: 56px; text-align: center; color: #5a6874; font-size: 0.78em; letter-spacing: 2px; }
  footer a { color: #8098a8; text-decoration: none; }
  footer a:hover { color: #d8d0c0; }`;

function page({ title, description, slug, body, related }) {
  const canonical = `${BASE}/guides/${slug}`;
  const relatedHtml = related && related.length
    ? `<div class="related"><h2>More guides</h2>${related.map(r => `<a href="${r.href}">${r.label}</a>`).join('')}</div>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="theme-color" content="#0c1016">
<title>${title} | Board Gaming Hub</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Board Gaming Hub">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta name="twitter:card" content="summary">
<style>
${guideCss}
</style>
</head>
<body>
<div id="wrap">
  <div class="crumb"><a href="/">Board Gaming Hub</a> · <a href="/guides/">Guides</a></div>
  <header>
    <h1>${title}</h1>
    <div class="deck">${description}</div>
    <div class="updated">Updated June 2026</div>
  </header>
  <article>
${body}
  </article>
${relatedHtml}
  <footer>
    <a href="/">Home</a> ·
    <a href="/play.html">Play</a> ·
    <a href="/about.html">About</a> ·
    <a href="/guides/">All guides</a>
  </footer>
</div>
<script src="/analytics.js"></script>
<script src="/nav.js" defer></script>
</body>
</html>
`;
}

const guidesDir = path.join(ROOT, 'guides');
fs.mkdirSync(guidesDir, { recursive: true });

const allGuides = [
  { slug: 'wordform-tips', href: '/guides/wordform-tips.html', label: 'Wordform tips & daily strategy' },
  { slug: 'eclipse-2026', href: '/guides/eclipse-2026.html', label: '2026 & 2027 solar eclipse guide' },
  { slug: 'floodline-scenarios', href: '/guides/floodline-scenarios.html', label: 'Floodline scenarios explained' },
  { slug: 'free-browser-chess', href: '/guides/free-browser-chess.html', label: 'Free browser chess guide' },
];

function relatedFor(slug) {
  return allGuides.filter(g => g.slug !== slug);
}

const pages = [
  {
    slug: 'wordform-tips',
    file: 'wordform-tips.html',
    title: 'Wordform Tips &amp; Daily Strategy',
    description: 'Opening words, color feedback, daily vs random mode, and how to share your grid without spoilers.',
    body: `
    <p><a href="/Wordform.html">Wordform</a> is a free daily five-letter word puzzle: six guesses, color-coded feedback, one shared secret word per calendar day. It is an original design on Board Gaming Hub — not a clone with ads bolted on — and it runs entirely in your browser with no account required.</p>

    <h2>How the feedback works</h2>
    <p>After each guess, every letter tile changes color:</p>
    <ul>
      <li><b>Green</b> — correct letter, correct position.</li>
      <li><b>Yellow</b> — correct letter, wrong position (the letter appears elsewhere in the answer).</li>
      <li><b>Gray</b> — letter is not in the word at all.</li>
    </ul>
    <p>Duplicate letters follow the same constraint logic as mainstream daily word games: if the answer contains one <em>E</em>, only one <em>E</em> in your guess can turn green or yellow.</p>

    <h2>Strong opening words</h2>
    <p>Your first guess should test common vowels and frequent consonants. Popular openings include <strong>ARISE</strong>, <strong>CRANE</strong>, <strong>SLATE</strong>, <strong>STARE</strong>, and <strong>AUDIO</strong>. The best opening is whichever word you will actually remember tomorrow — consistency beats chasing a perfect theoretical opener.</p>
    <p>On guess two, combine confirmed greens with new consonant probes. Avoid repeating gray letters unless you are testing for a rare double (e.g. <em>LL</em> or <em>EE</em>).</p>

    <h2>Daily vs random mode</h2>
    <p><b>Daily</b> serves the same word to every player until local midnight, which makes the share feature meaningful. <b>Random</b> draws a new word each round for unlimited practice. Use Daily for the social ritual; use Random to drill openings and hard-mode discipline.</p>

    <h2>Sharing without spoilers</h2>
    <p>Tap <b>SHARE</b> after a Daily win (or a close loss) to copy an emoji grid to your clipboard. The grid encodes your guess pattern — green, yellow, and gray squares — without revealing the answer word. Paste into a group chat or social post so friends can compare streak difficulty.</p>

    <div class="callout">
      <b>Streak tip:</b> Play Daily before Random on the same day. Random practice is useful, but switching modes first can accidentally spoil your instinct for the shared puzzle.
    </div>

    <h2>When you are stuck</h2>
    <p>If three guesses leave you with only one green vowel, switch to a structural word: try common endings (<em>-IGHT</em>, <em>-OUND</em>, <em>-ATCH</em>) or consonant-heavy frames like <em>TH</em> and <em>CH</em>. On guess five, prioritize ruling out remaining consonants over clever vocabulary — elimination wins more dailies than rare words.</p>

    <p><a class="play-cta" href="/Wordform.html">Play Wordform now</a></p>
`,
  },
  {
    slug: 'eclipse-2026',
    file: 'eclipse-2026.html',
    title: '2026 &amp; 2027 Solar Eclipse Guide',
    description: 'Paths of totality, timing, and how to use the free 3D eclipse predictor on Board Gaming Hub.',
    body: `
    <p>Two major total solar eclipses cross populated land masses in 2026 and 2027. The <a href="/EclipsePredictor.html">Eclipse Predictor</a> on Board Gaming Hub renders every eclipse from 1900–2200 on a rotatable 3D globe, using astronomy-engine ephemeris calculations accurate to sub-arcsecond precision. This guide summarizes what each eclipse offers observers and how to explore paths interactively.</p>

    <h2>August 12, 2026 — Arctic and Spain</h2>
    <p>The 2026 total eclipse begins in the Arctic, crosses Greenland and Iceland, and ends at sunset over northern Spain. Maximum totality reaches roughly two minutes depending on location. Cloud climatology favors Iceland and offshore vessels over inland Europe, but Spain offers easier travel infrastructure for casual eclipse chasers.</p>
    <p>In the predictor, open the 2026 eclipse and scrub the timeline to watch the umbral shadow sweep west to east. Toggle path overlays to see the northern limit, center line, and southern limit of totality.</p>

    <h2>August 2, 2027 — the long totality eclipse</h2>
    <p>The 2027 eclipse is the headline event: totality lasts over six minutes at maximum, crossing Spain, Morocco, Algeria, Libya, Egypt, and Saudi Arabia. Dry desert climates along the center line dramatically improve clear-sky odds compared to mid-latitude maritime regions.</p>
    <p>Deep links into the tool: <a href="/EclipsePredictor.html?date=2026-08-12">August 12, 2026</a> and <a href="/EclipsePredictor.html?year=2027">2027 season overview</a>.</p>

    <h2>Using the 3D globe predictor</h2>
    <ol>
      <li>Drag to rotate Earth; scroll or pinch to zoom.</li>
      <li>Use the date controls to step before, during, and after contact times.</li>
      <li>Read the info panel for eclipse type (total, annular, hybrid, partial), magnitude, and duration.</li>
      <li>Compare adjacent eclipses with the previous/next buttons to plan travel years ahead.</li>
    </ol>

    <h2>Planning a trip around totality</h2>
    <p>Book lodging early along the center line — roads converge on a narrow corridor hours before totality. Carry paper maps: cell networks saturate. Never observe the partial phases without certified ISO 12312-2 solar filters; remove filters only during the brief total phase when the photosphere is fully covered.</p>

    <div class="callout">
      <b>Accuracy note:</b> The predictor is an educational astronomy visualization, not a surveying instrument. Verify contact times against NASA or IOTA publications before committing expedition logistics.
    </div>

    <p><a class="play-cta" href="/EclipsePredictor.html">Open Eclipse Predictor</a></p>
`,
  },
  {
    slug: 'floodline-scenarios',
    file: 'floodline-scenarios.html',
    title: 'Floodline Scenarios Explained',
    description: 'The real California and United States flood events behind Floodline\'s simulation scenarios.',
    body: `
    <p><a href="/Floodline.html">Floodline</a> is a flood-defense simulation built by a licensed water-resources engineer. You place levees, channels, pumps, and sandbags to keep town damage below a scenario threshold while storms raise river stages and saturate soils. The browser demo includes a training sandbox and Cedar Rapids 2008; the full release on <a href="https://hydroengineer.itch.io/floodline">itch.io</a> adds the complete historical campaign described below.</p>

    <h2>Why scenarios matter</h2>
    <p>Each scenario ships with a storm hydrograph, terrain derived from real valley geometry, budget constraints, and win conditions tied to damage percentage. Parameters are simplified for play but grounded in post-event reports from agencies such as California DWR, USACE, and USGS multi-hazard studies.</p>

    <table class="scenario-table">
      <thead><tr><th>Scenario</th><th>Event basis</th><th>What you manage</th></tr></thead>
      <tbody>
        <tr><td><b>Training Ground</b></td><td>Synthetic tutorial basin</td><td>Learn levee stress, pumps, and channel routing without time pressure.</td></tr>
        <tr><td><b>1986 Yuba</b></td><td>Yuba County levee failures</td><td>Fast-rising Sacramento Valley flows; sandbag windows are short.</td></tr>
        <tr><td><b>1997 New Year\'s</b></td><td>California statewide flood</td><td>Multi-day rain on saturated soils; duration stress on levees.</td></tr>
        <tr><td><b>2006 Sacramento</b></td><td>Sacramento River high flows</td><td>Urban ring levees and pump capacity under prolonged stage.</td></tr>
        <tr><td><b>2017 Oroville</b></td><td>Oroville Dam spillway crisis</td><td>Spillway erosion, auxiliary spillway risk, evacuation timing — widely considered the hardest scenario.</td></tr>
        <tr><td><b>ARkStorm West / East</b></td><td>USGS synthetic atmospheric river</td><td>Hypothetical megastorm footprints used in California resilience planning.</td></tr>
        <tr><td><b>Cedar Rapids 2008</b></td><td>Midwest slow crest</td><td>Gradual rise over days — a endurance scenario for pumps and pre-positioning.</td></tr>
      </tbody>
    </table>

    <h2>Core mechanics across all scenarios</h2>
    <ul>
      <li><b>Levee stress</b> accumulates when water sits high against a segment; breached levees redirect flow unpredictably.</li>
      <li><b>Pumps</b> buy time but cannot defeat physics if inflow exceeds system capacity.</li>
      <li><b>Wallet money</b> carries between scenarios in campaign mode — spend on upgrades or save for harder storms.</li>
      <li><b>Evacuation tools</b> appear in urban scenarios where population risk is part of the score.</li>
    </ul>

    <h2>Is it an engineering tool?</h2>
    <p>No. Floodline uses first-order hydrology appropriate for gameplay: routing, storage, and simplified gate curves. It is faithful in shape to real events, not a replacement for HEC-RAS or dam safety modeling. Treat it as an interactive way to understand why flood managers obsess over freeboard, spillway capacity, and forecast lead time.</p>

    <p><a class="play-cta" href="/Floodline.html">Play Floodline demo</a> &nbsp; <a class="play-cta" href="https://hydroengineer.itch.io/floodline">Full game on itch.io</a></p>
`,
  },
  {
    slug: 'free-browser-chess',
    file: 'free-browser-chess.html',
    title: 'Play Chess Free in Your Browser',
    description: 'Rules refresher, special moves, and practical tips for the Board Gaming Hub chess board.',
    body: `
    <p>Board Gaming Hub hosts a full-featured <a href="/Chess.html">chess board</a> in a single HTML page — no download, no account, no ads on the board itself. Play against a friend on the same device or practice openings solo. This guide is a compact rules refresher plus practical tips for browser play.</p>

    <h2>How each piece moves</h2>
    <ul>
      <li><b>King</b> — one square in any direction; participates in castling.</li>
      <li><b>Queen</b> — any number of squares along rank, file, or diagonal.</li>
      <li><b>Rook</b> — any number of squares along rank or file.</li>
      <li><b>Bishop</b> — any number of squares along diagonals.</li>
      <li><b>Knight</b> — L-shape (two plus one); jumps over pieces.</li>
      <li><b>Pawn</b> — forward one square (two from starting rank); captures diagonally; promotes on the eighth rank.</li>
    </ul>

    <h2>Special moves people forget</h2>
    <h3>Castling</h3>
    <p>Move king two squares toward a rook; rook jumps to the other side. Requirements: neither piece has moved, no pieces between, king not in check, king does not pass through or land on an attacked square.</p>
    <h3>En passant</h3>
    <p>If a pawn advances two squares and lands beside an opposing pawn, that opposing pawn may capture it as though it moved only one square — but only on the immediately following turn.</p>
    <h3>Promotion</h3>
    <p>A pawn reaching the far rank becomes queen, rook, bishop, or knight (almost always queen).</p>

    <h2>Opening principles for casual games</h2>
    <ol>
      <li>Control the center with pawns and pieces (e4/d4 or c4/Nf3 systems).</li>
      <li>Develop knights before bishops; castle before launching a flank attack.</li>
      <li>Do not move the same piece twice in the opening unless recapturing or avoiding material loss.</li>
      <li>Connect rooks after castling; rooks belong on open or half-open files.</li>
    </ol>

    <h2>Browser-specific tips</h2>
    <p>On mobile, use the built-in move list to review the game — small screens make blindfold calculation harder. If you undo by mistake, use the move list to step back mentally and replay from a stable position. For serious practice, set a timer externally; the hub board does not enforce clocks so casual play stays frictionless.</p>

    <div class="callout">
      <b>Also try:</b> <a href="/Go.html">Go</a> for territorial strategy, <a href="/Backgammon.html">Backgammon</a> for dice-driven racing, and <a href="/Wordform.html">Wordform</a> for a daily puzzle warm-up before a chess session.
    </div>

    <p><a class="play-cta" href="/Chess.html">Play chess now</a></p>
`,
  },
];

for (const g of pages) {
  const html = page({
    title: g.title,
    description: g.description,
    slug: g.slug,
    body: g.body,
    related: relatedFor(g.slug),
  });
  fs.writeFileSync(path.join(guidesDir, g.file), html);
}

const indexRelated = allGuides.map(g => `<a class="guide-card" href="${g.href}"><span class="gtitle">${g.label.replace(/^\w/, c => c.toUpperCase())}</span><span class="gsub">Read guide →</span></a>`).join('\n    ');

const guidesIndex = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="theme-color" content="#0c1016">
<title>Guides — Board Gaming Hub</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Strategy guides, eclipse planning, flood simulation explainers, and how-to articles for Board Gaming Hub games.">
<link rel="canonical" href="${BASE}/guides/">
<meta property="og:type" content="website">
<meta property="og:url" content="${BASE}/guides/">
<meta property="og:title" content="Guides — Board Gaming Hub">
<meta property="og:description" content="Editorial guides for Wordform, solar eclipses, Floodline, chess, and more.">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #0c1016; color: #d8d0c0; font-family: Georgia, "Times New Roman", serif; }
  #wrap { max-width: 900px; margin: 0 auto; padding: 40px 24px 80px; }
  header { text-align: center; margin-bottom: 36px; }
  header h1 { font-size: 2em; letter-spacing: 8px; color: #f0d89c; margin: 0; }
  header .tag { color: #8098a8; letter-spacing: 3px; font-size: 0.85em; margin-top: 10px; }
  .intro { color: #a8b0c0; font-size: 1.02em; line-height: 1.7; margin-bottom: 36px; text-align: center; max-width: 640px; margin-left: auto; margin-right: auto; }
  .guide-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
  .guide-card { display: block; background: #141c28; border: 1px solid #2a3540; border-radius: 4px; padding: 18px 20px; text-decoration: none; transition: background 0.12s, border-color 0.12s; }
  .guide-card:hover { background: #1e2838; border-color: #3a5060; }
  .guide-card .gtitle { display: block; color: #f0d89c; font-size: 1.05em; letter-spacing: 1px; margin-bottom: 8px; }
  .guide-card .gsub { color: #8098a8; font-size: 0.88em; }
  nav.hub { text-align: center; margin: 28px 0 0; font-size: 0.84em; letter-spacing: 2px; }
  nav.hub a { color: #8098a8; text-decoration: none; margin: 0 12px; }
  nav.hub a:hover { color: #f0d89c; }
</style>
</head>
<body>
<div id="wrap">
  <header>
    <h1>GUIDES</h1>
    <div class="tag">Strategy, science, and how-to articles</div>
  </header>
  <p class="intro">Long-form guides for the games and simulations on Board Gaming Hub — written to help you learn, plan eclipse travel, or understand the real events behind Floodline's scenarios.</p>
  <div class="guide-grid">
    ${indexRelated}
  </div>
  <nav class="hub">
    <a href="/">Home</a>
    <a href="/play.html">Play</a>
    <a href="/about.html">About</a>
  </nav>
</div>
<script src="/analytics.js"></script>
<script src="/nav.js" defer></script>
</body>
</html>
`;

fs.writeFileSync(path.join(guidesDir, 'index.html'), guidesIndex);
console.log(`Generated ${pages.length} guides + guides/index.html`);
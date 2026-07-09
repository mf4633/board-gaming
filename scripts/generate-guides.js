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

const allGuides = (data.guides || []).map(g => ({
  slug: g.slug,
  href: `/${g.file}`,
  label: g.title,
}));

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
    slug: 'drift-word-ladder',
    file: 'drift-word-ladder.html',
    title: 'Drift Word Ladder Guide',
    description: 'How word ladders work, daily puzzle tips, and shortest-path strategy for Drift.',
    body: `
    <p><a href="/Drift.html">Drift</a> is a daily word-ladder puzzle: transform a four-letter start word into a four-letter target word by changing one letter per step, with every intermediate string required to be valid English. The format was invented by Lewis Carroll in 1877 (he called them &ldquo;doublets&rdquo;). Drift adds a daily shared puzzle, optional hints, and a theme that often reveals how start and target words relate.</p>

    <h2>Rules in one minute</h2>
    <ul>
      <li>Word length stays fixed — no adding or removing letters.</li>
      <li>Each step changes exactly one letter.</li>
      <li>Every row must be a real dictionary word.</li>
      <li>Reach the target in as few steps as possible; shorter ladders score better.</li>
    </ul>

    <h2>Example chain</h2>
    <p>COLD → CORD → CARD → WARD → WARM is a classic five-step ladder. Drift puzzles are curated so at least one reasonably short path exists; many pairs admit multiple routes of different lengths.</p>

    <h2>Strategy for shorter ladders</h2>
    <ol>
      <li><b>Work from both ends.</b> Sketch one step from the start and one step backward from the target; look for words that could meet in the middle.</li>
      <li><b>Change high-impact letters first.</b> Vowels and rare consonants (J, Q, X, Z) are bottlenecks — bridge them early.</li>
      <li><b>Use the theme.</b> Daily themes hint at semantic links (weather, colors, opposites). If the theme says &ldquo;heat,&rdquo; consider words related to temperature even when the letters look unrelated.</li>
      <li><b>Insert steps freely.</b> Tap <b>+ ADD STEP</b> to branch exploration; delete dead ends rather than forcing a single chain.</li>
    </ol>

    <h2>Daily vs random</h2>
    <p><b>Daily</b> serves one ladder worldwide until local midnight — ideal for comparing step counts with friends. <b>Random</b> pulls from the full pair library for practice. Solve Daily first if you care about streaks and shared difficulty.</p>

    <h2>When to use a hint</h2>
    <p>Hints reveal one letter along a known short solution path. They are best for breaking symmetry when two plausible branches tie — not for opening moves. A clean solve with zero hints beats a one-hint solve for bragging rights.</p>

    <div class="callout">
      <b>Pair with Wordform:</b> Both dailies reset at local midnight. Many players run Wordform first (five letters, elimination logic) then Drift (pathfinding logic) as a ten-minute morning routine.
    </div>

    <p><a class="play-cta" href="/Drift.html">Play Drift now</a></p>
`,
  },
  {
    slug: 'sudoku-tips',
    file: 'sudoku-tips.html',
    title: 'Sudoku Tips for Beginners',
    description: 'Scanning, pencil marks, X-Wing, and how difficulty levels work on the free browser grid.',
    body: `
    <p><a href="/Sudoku.html">Sudoku</a> on Board Gaming Hub is a full 9×9 grid with four difficulty presets — Easy, Medium, Hard, and Expert — plus pencil marks and undo. No account, no timer pressure unless you bring your own. This guide covers the techniques that take you from first fill to confident Expert grids.</p>

    <h2>The one rule</h2>
    <p>Each row, column, and 3×3 box must contain digits 1–9 exactly once. Every technique is just a consequence of that constraint plus the givens already on the board.</p>

    <h2>Level 1 — scanning</h2>
    <ul>
      <li><b>Single candidate:</b> If a cell can only be one digit, fill it immediately.</li>
      <li><b>Hidden singles:</b> If a digit can only go in one cell within a row, column, or box, place it even when the cell has other pencil marks.</li>
      <li><b>Eliminate from givens:</b> Before pencil marks, cross out digits already present in the cell&rsquo;s row, column, and box.</li>
    </ul>

    <h2>Level 2 — pencil marks</h2>
    <p>Toggle pencil mode and note every possible digit per cell. Update marks after each placement — stale marks cause errors on Hard and Expert boards. On Easy and Medium, many puzzles solve with singles only if marks stay current.</p>

    <h2>Level 3 — pairs and triples</h2>
    <p>If two cells in a unit share the same two candidates and only those two, eliminate those digits from other cells in the unit (naked pair). The same logic extends to triples. This is the bridge technique between Medium and Hard.</p>

    <h2>Level 4 — X-Wing and beyond</h2>
    <p>An <b>X-Wing</b> appears when a digit&rsquo;s candidates in two rows align in the same two columns (or vice versa), letting you remove that digit from other cells in those columns. Expert puzzles on the hub may require X-Wing, swordfish, or simple coloring — if stuck, step back and re-check for hidden singles after a fresh mark pass.</p>

    <h2>Choosing a difficulty</h2>
    <ul>
      <li><b>Easy</b> — singles only; good first week of play.</li>
      <li><b>Medium</b> — occasional pairs; still relaxing.</li>
      <li><b>Hard</b> — consistent mark discipline required.</li>
      <li><b>Expert</b> — advanced eliminations; expect 30–45 minutes.</li>
    </ul>

    <p><a class="play-cta" href="/Sudoku.html">Play Sudoku now</a></p>
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
    slug: 'bonneville-dam-guide',
    file: 'bonneville-dam-guide.html',
    title: 'Bonneville Dam Operator Guide',
    description: 'TDG limits, salmon passage, spillway vs turbines, and career mode strategy.',
    body: `
    <p><a href="/BonnevilleSpillwayOperator.html">Bonneville Spillway Operator</a> puts you in charge of a Columbia River dam stylized after the real Bonneville complex. Balance electrical generation, spillway releases, fish ladder operations, navigation lockages, and total dissolved gas (TDG) limits — all while inflow swings with season and weather. The browser build is a demo; the full career campaign is on <a href="https://hydroengineer.itch.io/bonneville-spillway-operator">itch.io</a>.</p>

    <h2>What you are optimizing</h2>
    <ul>
      <li><b>Grid demand</b> — keep turbines generating when the Pacific Northwest load calls for power.</li>
      <li><b>Reservoir stage</b> — too high risks overtopping; too low kills head and revenue.</li>
      <li><b>TDG (% saturation)</b> — spillway air entrainment supersaturates water; aim below 115% to protect salmon.</li>
      <li><b>Salmon passage</b> — ladder throughput and juvenile bypass affect both score and regulatory standing.</li>
      <li><b>Lockages</b> — river commerce earns income but competes with spill and generation schedules.</li>
    </ul>

    <h2>Spillway vs turbines</h2>
    <p>Turbines pass water profitably with lower TDG impact. Spillways dump excess fast but spike TDG proportional to flow (roughly √Q until deflector upgrades). Spring snowmelt forces ugly tradeoffs: you must spill to protect the dam, but fish managers cap how much high-TDG water the tailrace can carry.</p>

    <h2>Key upgrades (career mode)</h2>
    <table class="scenario-table">
      <thead><tr><th>Upgrade</th><th>Why it matters</th></tr></thead>
      <tbody>
        <tr><td><b>Flip-lip deflectors</b></td><td>Lowers TDG per unit spill — often the first fish-friendly purchase.</td></tr>
        <tr><td><b>Fish ladder</b></td><td>Unlocks salmon income and reduces regulatory penalties.</td></tr>
        <tr><td><b>Juvenile bypass</b></td><td>Routes smolts around the spillway; dramatically cuts TDG harm.</td></tr>
        <tr><td><b>Extra turbine</b></td><td>More generation capacity to avoid spill during moderate peaks.</td></tr>
      </tbody>
    </table>

    <h2>Controls cheat sheet</h2>
    <p><b>Q/A</b> adjust turbines · <b>W/S</b> spillway gates · <b>E/D</b> fish ladder · <b>Space</b> pause. Drag panel titles to rearrange the dashboard on ultrawide screens.</p>

    <h2>Hardest season</h2>
    <p>Spring snowmelt with high salmon-run requirements is the canonical pain point: inflow climbs, spill becomes mandatory, and the regulatory floor for fish passage limits how aggressively you can open gates. Anticipate inflow from forecast panels rather than chasing stage after it rises — career gold medals reward planning.</p>

    <div class="callout">
      <b>Real-world note:</b> Capacities and tradeoffs follow public USACE data for Bonneville, simplified for play. This is a game, not a license to operate a federal dam.
    </div>

    <p><a class="play-cta" href="/BonnevilleSpillwayOperator.html">Play demo</a> &nbsp; <a class="play-cta" href="https://hydroengineer.itch.io/bonneville-spillway-operator">Full game</a></p>
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
  {
    slug: 'solitaire-klondike',
    file: 'solitaire-klondike.html',
    title: 'How to Play Klondike Solitaire (and Win More Often)',
    description: 'Klondike rules, draw-1 vs draw-3, foundations and tableau, and the stock-cycling strategy that wins more deals.',
    body: `
    <p><a href="/Solitaire.html">Solitaire</a> on Board Gaming Hub is classic Klondike: a single 52-card deck, seven tableau columns, four foundations, and a stock you cycle through the waste. It runs in one HTML page with unlimited undo, smart-click auto-moves, and a toggle for <b>Draw 1</b> or <b>Draw 3</b>. This guide covers the rules and the habits that turn losses into wins.</p>

    <h2>The layout</h2>
    <p>The deal puts 28 cards into seven columns — one card in the first column, two in the second, up to seven in the last — and only the bottom card of each column starts face-up. The remaining 24 cards form the <b>stock</b>; the <b>waste</b> and the four <b>foundations</b> begin empty.</p>
    <ul>
      <li><b>Tableau</b> — build downward in alternating colors (a black 7 goes on a red 8).</li>
      <li><b>Foundations</b> — build upward by suit, from Ace to King. Emptying all four wins the game.</li>
      <li><b>Empty columns</b> — only a King (or a run headed by a King) may fill a gap.</li>
    </ul>

    <h2>Draw 1 vs Draw 3</h2>
    <p>The board offers both modes. <b>Draw 1</b> turns one stock card at a time and every card is immediately playable — roughly 80% of deals are solvable with perfect play. <b>Draw 3</b> turns three cards but only the top of the packet is live, so cards you need are often buried; solvability drops to around 5%. Learn on Draw 1, then switch to Draw 3 when you want the harder game.</p>

    <div class="callout">
      <b>Undo is a tool, not cheating:</b> This build allows unlimited undo. Serious solvers use it to backtrack out of dead ends — with backtracking, real win rates climb close to the theoretical ceiling.
    </div>

    <h2>Winning strategy</h2>
    <ol>
      <li><b>Work the stock early.</b> Cycle the stock before you commit to big tableau moves so you know what is coming. In Draw 3, count where useful cards land — the order is fixed until you disturb it.</li>
      <li><b>Expose face-down cards first.</b> Every hidden card is locked information. Prefer moves that flip a face-down card over moves that merely shuffle face-up runs.</li>
      <li><b>Do not rush to the foundation.</b> A low card sent up too early can strand a card that needed it in the tableau. Keep 2s through 5s available as landing spots for the opposite color.</li>
      <li><b>Save empty columns for Kings.</b> An empty column is your most valuable resource. Do not fill it with a random King if a more useful King (one that unblocks a long buried run) is coming.</li>
      <li><b>Send to the foundation when it is safe.</b> A card is safe to bank once both opposite-color cards one rank lower are already up (or no longer needed as landing spots).</li>
    </ol>

    <h2>Use smart-click and auto-complete</h2>
    <p>Click any card to auto-move it to its best legal destination — foundation first, then the most useful tableau column. Once every card is face-up, use <b>AUTO-COMPLETE</b> to finish the deal in a single tap instead of clicking each card home.</p>

    <p>Prefer a puzzle with no luck at all? Try <a href="/Sudoku.html">Sudoku</a> or its companion <a href="/guides/sudoku-tips">Sudoku tips guide</a>. For a similar solo pace with tiles instead of cards, see <a href="/Mahjong.html">Mahjong Solitaire</a>.</p>

    <p><a class="play-cta" href="/Solitaire.html">Play Solitaire now</a></p>
`,
  },
  {
    slug: '2048-strategy',
    file: '2048-strategy.html',
    title: '2048 Strategy: How to Reach 2048 (and Beyond)',
    description: 'Corner strategy, anchoring your biggest tile, building a monotonic chain, and how to push past the 2048 tile.',
    body: `
    <p><a href="/2048.html">2048</a> is a slide-and-merge puzzle on a 4×4 grid. Every move slides all tiles one direction; equal tiles that collide merge into their sum, and a new <b>2</b> or <b>4</b> spawns in a random empty cell (weighted about 90/10 toward the 2). You win when a tile reaches <b>2048</b> — then you can keep going for 4096 and higher. Reaching 2048 is not luck; it is one disciplined pattern.</p>

    <h2>The one rule that wins: anchor a corner</h2>
    <p>Pick a corner — bottom-right is a common choice — and keep your largest tile pinned there for the entire game. In practice this means using only two or three of the four directions and almost never pressing the fourth. If your big tile lives in the bottom-right, drive with <b>Down</b> and <b>Right</b>, use <b>Left</b> sparingly, and treat <b>Up</b> as forbidden except in emergencies.</p>

    <div class="callout">
      <b>Why the anchor works:</b> the moment your biggest tile leaves its corner, smaller tiles slide under it and it can be stranded in the middle, blocking merges on all sides. A tile in the center is a liability; a tile in the corner is a foundation.
    </div>

    <h2>Build a monotonic chain</h2>
    <p>Keep the values in your anchor row (or column) descending in order — for example 2048, 1024, 512, 256 lined up along the bottom edge. This is called a <b>monotonic</b> layout. When the chain is intact, one push collapses it like dominoes: the 256 feeds the 512, the 512 feeds the 1024, and so on.</p>
    <ul>
      <li>Fill the anchor row first, largest at the corner.</li>
      <li>Feed new small tiles from the opposite side so they queue up behind the chain.</li>
      <li>Only merge upward into the chain, never break it apart to grab a stray pair.</li>
    </ul>

    <h2>Avoid the shuffle</h2>
    <p>The fastest way to lose is pressing all four arrows in a panic. Each wasted direction scatters tiles and spawns another blocker. If a move would not merge anything and would only shuffle the board, look for a better one. Plan two moves ahead: ask what the board looks like <em>after</em> the new tile spawns, not just after your slide.</p>

    <h2>Past 2048</h2>
    <p>The win tile is only the halfway point of a good board. To chase 4096 and 8192, the same rules apply with tighter margins — a full board with a broken chain is a dead end. Keep at least one empty cell as breathing room and never let the anchor drift.</p>

    <p>Like number puzzles? <a href="/Minesweeper.html">Minesweeper</a> and <a href="/Sudoku.html">Sudoku</a> scratch the same solo-logic itch — the <a href="/guides/minesweeper-strategy">Minesweeper strategy guide</a> is a good next read.</p>

    <p><a class="play-cta" href="/2048.html">Play 2048 now</a></p>
`,
  },
  {
    slug: 'minesweeper-strategy',
    file: 'minesweeper-strategy.html',
    title: 'Minesweeper Strategy for Beginners',
    description: 'First-click safety, reading the numbers, the 1-2-1 and 1-2-2-1 patterns, flagging vs chording, and the three difficulty grids.',
    body: `
    <p><a href="/Minesweeper.html">Minesweeper</a> is a pure-logic puzzle: clear every safe cell without detonating a hidden mine. Each revealed number tells you exactly how many of its eight neighbors are mines. On Board Gaming Hub the board offers three classic sizes and right-click flagging (long-press on touch). This guide takes you from random clicking to reading the board like an expert.</p>

    <h2>The first click is always safe</h2>
    <p>Your opening click can never hit a mine — the board places mines only after you click, avoiding your cell and its neighbors. So always open with a click in the middle of a large area to trigger the biggest possible cascade of zeros and hand yourself a wall of numbers to work from.</p>

    <h2>Reading the numbers</h2>
    <p>A number is a promise: a <b>1</b> touches exactly one mine among its unrevealed neighbors, a <b>2</b> touches two, and so on. Two deductions do most of the work:</p>
    <ul>
      <li><b>Satisfied number:</b> if a number already touches that many flagged mines, every other neighbor is safe.</li>
      <li><b>Forced mine:</b> if a number has exactly as many unrevealed neighbors as its value, all of them are mines — flag them.</li>
    </ul>

    <h2>Patterns worth memorizing</h2>
    <p>Along a straight edge of revealed cells, certain number sequences resolve instantly without any counting:</p>
    <table class="scenario-table">
      <thead><tr><th>Pattern</th><th>What it means</th></tr></thead>
      <tbody>
        <tr><td><b>1-2-1</b></td><td>The mines sit under the two <b>1</b>s; the cell under the <b>2</b> is safe.</td></tr>
        <tr><td><b>1-2-2-1</b></td><td>The mines sit under the two middle <b>2</b>s; the cells under the outer <b>1</b>s are safe.</td></tr>
        <tr><td><b>1-1 on an edge</b></td><td>Where a new wall opens, the cell just past the second <b>1</b> is usually safe.</td></tr>
      </tbody>
    </table>

    <h2>Flagging vs chording</h2>
    <p>Flag a cell (right-click or long-press) once you have proven it is a mine — flags are your notes, not guesses. Once a number is fully flagged you can <b>chord</b> it: left+right click together (or middle-click) on the number auto-reveals all of its remaining unflagged neighbors at once. Chording is the single biggest speed boost on larger boards, but it only fires when the flag count matches the number, so keep your flags honest.</p>

    <div class="callout">
      <b>When logic runs out:</b> some positions force a genuine 50/50 guess — classic Minesweeper is not always deducible. Guess in the corner or lowest-probability cell, and save the guess for when no forced move remains.
    </div>

    <h2>The three difficulties</h2>
    <ul>
      <li><b>Beginner</b> — 9×9 grid, 10 mines (about 12% density). Ideal for learning patterns.</li>
      <li><b>Intermediate</b> — 16×16 grid, 40 mines (about 16%). Chording starts to matter.</li>
      <li><b>Expert</b> — 30×16 grid, 99 mines (about 21%). Speed, patterns, and clean flagging all count.</li>
    </ul>

    <p>Enjoy deduction with no luck at all? <a href="/Sudoku.html">Sudoku</a> is the natural companion — see the <a href="/guides/sudoku-tips">Sudoku tips guide</a>.</p>

    <p><a class="play-cta" href="/Minesweeper.html">Play Minesweeper now</a></p>
`,
  },
  {
    slug: 'backgammon-rules',
    file: 'backgammon-rules.html',
    title: 'Backgammon Rules &amp; Opening Strategy',
    description: 'Board setup, hitting and the bar, bearing off, blocking points, and a simple opening plan for the dice-race classic.',
    body: `
    <p><a href="/Backgammon.html">Backgammon</a> is a two-player race on a 24-point board — one of the oldest games in the world. Each side has 15 checkers; you roll two dice, race your checkers home, and bear them all off before your opponent does. The Board Gaming Hub build is single-player versus an AI and focuses on the movement game: this version has <b>no doubling cube</b>, so you can learn the core race without stakes-play complications.</p>

    <h2>Board setup and direction</h2>
    <p>The 24 points split into four quadrants. Each player moves their checkers in the opposite direction toward their own <b>home board</b> (the final quadrant), then bears them off. The standard starting position places checkers on the 24, 13, 8, and 6 points relative to each player. You always move toward your home; you can never move backward.</p>

    <h2>Rolling and moving</h2>
    <ul>
      <li>Roll two dice and move checkers by each die value — either two different checkers, or one checker twice (first one die, then the other), as long as each intermediate landing point is legal.</li>
      <li><b>Doubles are worth four moves:</b> rolling a 3-3 lets you make four moves of three points each.</li>
      <li>You may land on any point that is empty, holds your own checkers, or holds exactly one enemy checker.</li>
    </ul>

    <h2>Hitting, the bar, and blocked points</h2>
    <p>A lone enemy checker on a point is a <b>blot</b>. Land on it and you <b>hit</b> it — the blot goes to the <b>bar</b> in the center, and its owner must re-enter it in their opponent's home board before making any other move. A point held by two or more enemy checkers is <b>blocked</b>; you cannot land there. Stack six blocked points in a row and you build a <b>prime</b> that a trapped checker cannot jump.</p>

    <div class="callout">
      <b>Priority rule:</b> if you have a checker on the bar, you must enter it first. If neither die lets you enter (both landing points are blocked), you forfeit the turn.
    </div>

    <h2>Bearing off</h2>
    <p>Once all 15 of your checkers are inside your home board, you may start <b>bearing off</b> — removing checkers from the board. A die value bears off a checker from the matching point; if that point is empty, you may bear off from the next-lower occupied point. First player to bear off all 15 wins. If your opponent still has a checker on the bar or in your home board when you finish, you win a double (a <em>gammon</em>).</p>

    <h2>Opening strategy</h2>
    <ol>
      <li><b>Make points, don't just run.</b> Building your own blocked points — especially the 5-point (your "golden point") — restricts the opponent and gives your checkers safe landing spots.</li>
      <li><b>Split or slot, then cover.</b> Common opening rolls make an inner-board point or advance builders that can make one next turn.</li>
      <li><b>Balance racing and blocking.</b> Track the pip count (total distance left to bear off): if you are ahead, race; if you are behind, hold back an anchor and play for a hit.</li>
      <li><b>Avoid leaving blots</b> where the opponent can hit you back onto the bar — one bad hit can swing the race.</li>
    </ol>

    <p>Prefer perfect-information strategy with no dice? Try <a href="/Chess.html">Chess</a> (see <a href="/guides/free-browser-chess">the free browser chess guide</a>) or the territorial classic <a href="/Go.html">Go</a>.</p>

    <p><a class="play-cta" href="/Backgammon.html">Play Backgammon now</a></p>
`,
  },
  {
    slug: 'go-rules-beginners',
    file: 'go-rules-beginners.html',
    title: 'Go Rules for Beginners (Baduk / Weiqi)',
    description: 'Liberties, capture, ko, territory vs area scoring, the pass-pass endgame, and dead-stone marking on 9, 13, and 19 boards.',
    body: `
    <p><a href="/Go.html">Go</a> — known as Baduk in Korea and Weiqi in China — is the ancient game of territory and influence. Two players place black and white stones on the intersections of a grid, competing to surround more of the board. The Board Gaming Hub build is single-player versus an AI and offers three board sizes: <b>9×9</b> for a quick game, <b>13×13</b> for a middle ground, and the full <b>19×19</b>. The rules are short; the depth is famous.</p>

    <h2>Placing stones</h2>
    <p>Black plays first. Stones go on the <b>intersections</b> of the grid lines, not the squares, and once placed a stone never moves — it can only be captured. Same-color stones connected horizontally or vertically (never diagonally) form a single <b>group</b> that lives or dies together.</p>

    <h2>Liberties and capture</h2>
    <p>A group's <b>liberties</b> are the empty intersections directly adjacent to it. As long as a group has at least one liberty it stays on the board. Fill its last liberty and the whole group is <b>captured</b> and removed. You may not play a stone that would leave your own group with zero liberties (a <b>suicide</b>) — unless that same move captures an enemy group and thereby gains a liberty.</p>

    <div class="callout">
      <b>The ko rule:</b> you may not play a move that recreates the exact board position of the previous turn. This stops endless back-and-forth recapture of a single stone; you must play elsewhere first, then you can return.
    </div>

    <h2>Ending the game: pass, pass, then mark the dead</h2>
    <p>When neither player wants to add stones, they pass. <b>Two consecutive passes end the game.</b> The board then enters a scoring step: click any group of stones that cannot avoid capture to mark it as <b>dead</b> — those stones are removed and count for the surrounding player. Press <b>Confirm / Final Score</b> when both sides agree, or <b>Resume Play</b> if there is a disagreement to settle on the board.</p>

    <h2>Territory vs area scoring</h2>
    <p>There are two scoring traditions, and it helps to know both:</p>
    <ul>
      <li><b>Territory scoring</b> (Japanese) — count empty intersections you surround, plus prisoners you captured.</li>
      <li><b>Area scoring</b> (Chinese) — count empty intersections you surround <em>plus your own live stones on the board</em>.</li>
    </ul>
    <p>They usually give the same winner, differing by at most a point or two. This build uses <b>area (Chinese) scoring</b>: your score is your stones on the board plus the empty territory you enclose.</p>

    <h2>Beginner strategy</h2>
    <ol>
      <li><b>Start in the corners</b>, then the sides — corners are easiest to enclose because the board edges do part of the surrounding for you.</li>
      <li><b>Keep your groups connected</b> and give them room to make two separate eyes (enclosed empty points), which makes them uncapturable.</li>
      <li><b>Do not chase every stone.</b> Trading a small capture for a large framework of influence is usually the winning choice.</li>
      <li><b>Learn on 9×9.</b> A small board teaches life, death, and capture in minutes before you scale up to 19×19.</li>
    </ol>

    <p>Want another two-player abstract? <a href="/Chess.html">Chess</a> and <a href="/Othello.html">Othello</a> are close cousins in the strategy shelf.</p>

    <p><a class="play-cta" href="/Go.html">Play Go now</a></p>
`,
  },
  {
    slug: 'mahjong-solitaire',
    file: 'mahjong-solitaire.html',
    title: 'How to Play Mahjong Solitaire',
    description: 'Free vs blocked tiles, exact-glyph matching, the 72-tile Bamboo and Characters set, and top-down planning with shuffle and undo.',
    body: `
    <p><a href="/Mahjong.html">Mahjong Solitaire</a> is a single-player tile-matching game — not the four-player gambling game of the same name. You clear a layered layout of tiles by matching identical pairs until the board is empty. The Board Gaming Hub build uses a compact <b>72-tile set</b> drawn from two mahjong suits: <b>Bamboo</b> and <b>Characters</b>, nine faces each, four copies of every face. It runs in one HTML page with hint, undo, and shuffle.</p>

    <h2>Free vs blocked tiles</h2>
    <p>You can only remove a tile that is <b>free</b>. A tile is free when two conditions are both true:</p>
    <ul>
      <li><b>Uncovered</b> — nothing rests on top of it in a higher layer.</li>
      <li><b>Open edge</b> — its left OR its right side is unblocked. A tile with a neighbor on both its left and right is locked, even if nothing sits on top.</li>
    </ul>
    <p>Blocked tiles are dimmed. Freeing them is the whole puzzle: every pair you remove may open the tiles that were leaning on it.</p>

    <h2>Exact-glyph matching</h2>
    <p>Two free tiles match only if they show the <b>exact same glyph</b>. In this build there are no flower or season groups — a 3-Bamboo pairs only with another 3-Bamboo, never with a Character tile that merely looks similar. Because every face has four copies, each glyph forms two possible pairs on a full board.</p>

    <div class="callout">
      <b>The four-of-a-kind rule:</b> when all four copies of a face are free at once, clear all four immediately. Leaving two behind risks stranding them under later tiles with no partner reachable.
    </div>

    <h2>Plan from the top down</h2>
    <p>The fastest way to lose is matching the first pair you see. A greedy match can bury a tile whose only partner is now locked. Instead:</p>
    <ol>
      <li><b>Clear the top layers first.</b> Upper tiles cover the most cells below them, so removing them opens the widest set of future moves.</li>
      <li><b>Look before you match.</b> If a glyph has all four copies visible but you only need to open one specific tile, match the pair that frees the most blocked tiles.</li>
      <li><b>Keep a spare pair.</b> Avoid clearing both pairs of a face early if one of those tiles is the only thing you will be able to match later.</li>
    </ol>

    <h2>Hint, undo, and shuffle</h2>
    <p>Use <b>HINT</b> to highlight a legal pair when you are stuck, and <b>UNDO</b> to step back after a match that locked the board. If no legal moves remain among the free tiles, <b>SHUFFLE</b> reassigns the faces on the remaining tiles so the game can continue. A clean solve uses shuffle sparingly — treat it as a rescue, not a strategy.</p>

    <p>For another relaxed solo game with a similar pace, try <a href="/Solitaire.html">Klondike Solitaire</a> — the <a href="/guides/solitaire-klondike">Klondike guide</a> covers its strategy. Prefer numbers? <a href="/2048.html">2048</a> is a quick palate cleanser.</p>

    <p><a class="play-cta" href="/Mahjong.html">Play Mahjong Solitaire now</a></p>
`,
  },
  {
    slug: 'othello-reversi',
    file: 'othello-reversi.html',
    title: 'Othello (Reversi) Rules &amp; Winning Strategy',
    description: 'How to play Othello / Reversi, why corners win games, and the mobility and edge tactics that beat the computer.',
    body: `
    <p><a href="/Othello.html">Othello</a> — also known as Reversi — is a two-player disc-flipping game on an 8×8 board. It takes a minute to learn and years to master: the rules are trivial, but the strategy is deep enough that top play looks almost paradoxical. This guide covers the rules and the handful of ideas that will beat a casual opponent or the browser AI.</p>

    <h2>The rules in a minute</h2>
    <ul>
      <li>The board starts with four discs in the center — two black, two white, placed diagonally.</li>
      <li>On your turn you place a disc so that it <b>flanks</b> one or more of the opponent&rsquo;s discs in a straight line (horizontal, vertical, or diagonal) between your new disc and another of your discs.</li>
      <li>Every flanked disc <b>flips to your color</b>. You must flip at least one disc — if you cannot, you pass.</li>
      <li>The game ends when neither player can move (usually when the board is full). Whoever has more discs wins.</li>
    </ul>

    <h2>The beginner&rsquo;s trap: don&rsquo;t grab discs early</h2>
    <p>New players flip as many discs as possible every turn. This loses. Because any disc can be flipped again later, a big early lead means nothing — and having more discs mid-game often means you have <em>fewer</em> safe moves. The real currency of Othello is not discs; it is <b>stable squares</b> and <b>mobility</b>.</p>

    <h2>Corners win games</h2>
    <p>A disc in a corner can never be flipped — there is no square beyond it to flank from. Corners anchor entire edges and rows of stability. The whole game is really a fight to take corners and to force your opponent into giving them to you.</p>
    <h3>Avoid the X-squares and C-squares</h3>
    <p>The square diagonally adjacent to a corner (the <b>X-square</b>) is the most dangerous square on the board — playing there early usually hands your opponent the corner. The squares orthogonally next to a corner (<b>C-squares</b>) are risky for the same reason. Leave the region around empty corners alone until you can take the corner itself.</p>

    <h2>Mobility: the counter-intuitive core</h2>
    <p>Good Othello players try to have <b>many</b> moves while their opponent has <b>few</b>. Fewer discs of your own, placed compactly in the center early on, often gives you more flanking options later. If your opponent runs out of safe moves, they are forced to play an X-square or C-square and surrender a corner. Aim to end the midgame with your opponent nearly out of good options.</p>

    <h2>Edges and parity</h2>
    <ul>
      <li><b>Edge discs</b> are harder to flip than interior discs and support corner captures — but only take an edge when it does not expose a corner.</li>
      <li><b>Parity</b> — who plays the last disc in a region — decides many close endgames. Late in the game, count empty squares in each isolated region; playing last in a region often lets you flip without reply.</li>
    </ul>

    <div class="callout">
      <b>Practical plan vs. the AI:</b> keep your discs central and few for the first dozen moves, refuse the squares next to empty corners, take corners when offered, then convert corners into stable edges and flip aggressively only in the final ten moves.
    </div>

    <h2>Also try</h2>
    <p>If you like the pure-abstract tension of Othello, <a href="/Go.html">Go</a> (see the <a href="/guides/go-rules-beginners">beginner&rsquo;s guide</a>) rewards the same territorial thinking on a bigger canvas, and <a href="/Chess.html">Chess</a> scratches the tactical itch.</p>

    <p><a class="play-cta" href="/Othello.html">Play Othello now</a></p>
`,
  },
  {
    slug: 'royal-game-of-ur',
    file: 'royal-game-of-ur.html',
    title: 'The Royal Game of Ur — Rules, History &amp; Strategy',
    description: 'How to play the 4,500-year-old Mesopotamian race game: the board, the rosettes, capturing, and how to actually win.',
    body: `
    <p>The <a href="/Ur.html">Royal Game of Ur</a> is one of the oldest board games in the world — playable boards were buried in the Royal Tombs of Ur (modern Iraq) around 2600 BCE, and the rules survive on a Babylonian clay tablet translated by the British Museum&rsquo;s Irving Finkel. It is a two-player race game: get all seven of your pieces around the track and off the board before your opponent. Fast to learn, genuinely tense to play.</p>

    <h2>The board and the path</h2>
    <p>The board has 20 squares in an unmistakable shape: two 3×4 blocks joined by a 1×2 bridge. Each player runs their own private column at the start and end, and both share the central lane in the middle:</p>
    <ul>
      <li><b>Your private start</b> — four squares only your pieces travel.</li>
      <li><b>The shared middle lane</b> — eight squares both players cross; this is where the fighting happens.</li>
      <li><b>Your private exit</b> — two more private squares, then off the board.</li>
    </ul>

    <h2>Dice: four tetrahedral rolls</h2>
    <p>You roll four four-sided (tetrahedral) dice, each with two marked corners. Count the marked corners that land up: your move is 0–4. Because it is the sum of four coin-flips, the distribution is binomial — <b>2 is the most common roll</b> (about 3 in 8), while 0 and 4 are rare (1 in 16 each). Roll a 0 and you forfeit the turn. Good players plan around expecting a 2.</p>

    <h2>Rosettes: the whole strategy</h2>
    <p>Five squares carry a rosette symbol, and they do two things that decide games:</p>
    <ul>
      <li><b>Extra roll.</b> Land exactly on a rosette and you immediately roll again.</li>
      <li><b>Safety.</b> A piece on a rosette cannot be captured.</li>
    </ul>
    <p>The rosette in the center of the shared lane is the single most valuable square on the board: it is safe, it grants a bonus roll, and — in this build — a piece parked there blocks the opponent from passing through the choke point.</p>

    <h2>Capturing</h2>
    <p>In the shared middle lane, landing exactly on a square occupied by a single opposing piece sends that piece all the way back to start. You cannot capture on a rosette (it is safe), and you cannot land on your own piece. A well-timed capture in the middle lane can swing an entire game — a piece knocked back near the finish loses a dozen squares of progress.</p>

    <h2>Bearing off</h2>
    <p>To remove a piece you need an <b>exact</b> roll to move it off the final square — overshooting is not allowed, so a piece one square from home needs a 1. First player to bear off all seven pieces wins.</p>

    <h2>How to actually win</h2>
    <ol>
      <li><b>Fight for the central rosette.</b> It is safe, gives a free roll, and blocks the lane. Take it early and hold it.</li>
      <li><b>Advance a spread, not a single runner.</b> Multiple pieces in play give you choices when the dice disappoint and more capture threats against your opponent.</li>
      <li><b>Use the safe start.</b> Pieces in your private lane cannot be captured — do not rush them into the shared lane until you can land on a rosette or make a capture.</li>
      <li><b>Weaponize the extra roll.</b> Chaining rosette bonus rolls can move two or three pieces in a single turn — the biggest tempo swings in the game come from rosette chains.</li>
      <li><b>Play the odds.</b> Expect a 2. Position pieces so a 2 lands on a rosette or captures, and so your own pieces are not sitting one common roll away from an enemy.</li>
    </ol>

    <div class="callout">
      <b>Also from the ancient world:</b> try <a href="/Senet.html">Senet</a>, the Egyptian racing game entombed with pharaohs, and <a href="/PenteGrammai.html">Pente Grammai</a>, the Greek &ldquo;game of five lines.&rdquo; All three are short to learn and deep to play.
    </div>

    <p><a class="play-cta" href="/Ur.html">Play the Royal Game of Ur now</a></p>
`,
  },
  {
    slug: 'senet-rules',
    file: 'senet-rules.html',
    title: 'Senet — Rules of the Ancient Egyptian Game',
    description: 'How to play Senet: throwing sticks, the special houses, sending pieces back, and bearing off to win.',
    body: `
    <p><a href="/Senet.html">Senet</a> is the oldest board game we can name — Egyptians were playing it before 3000 BCE, and boards turn up in tombs including Tutankhamun&rsquo;s. The full ancient rules were lost, but game historians (notably Timothy Kendall and R.C. Bell) reconstructed a playable set from tomb paintings and surviving boards. It is a race: move all your pieces along a 30-square track and off the board before your opponent.</p>

    <h2>The board and setup</h2>
    <p>Senet is 30 squares — three rows of ten — travelled in a boustrophedon (&ldquo;as the ox plows&rdquo;) S-shape: left-to-right along the top row, right-to-left along the middle, left-to-right along the bottom. Each player starts with five pieces on the first ten squares, interleaved so the two colors alternate.</p>

    <h2>Throwing sticks instead of dice</h2>
    <p>You throw four two-sided casting sticks (one painted face, one plain). Count the painted faces up:</p>
    <ul>
      <li>1, 2, 3, or 4 painted = move that many squares.</li>
      <li>All four plain = a throw of 6.</li>
      <li>A throw of <b>1, 4, or 6 earns another turn</b> — chain them to move several pieces.</li>
    </ul>
    <p>You must move if you legally can. If no piece can make the throw, you forfeit the turn.</p>

    <h2>Moving, blocking, and capturing</h2>
    <ul>
      <li>You cannot land on your own piece.</li>
      <li>Landing on a single opponent piece <b>swaps places</b> with it — you take its square, it takes yours.</li>
      <li>Two of your opponent&rsquo;s pieces sitting side by side are <b>protected</b> — you cannot swap onto either. Three or more in a row form a <b>blockade</b> that cannot be passed at all.</li>
    </ul>

    <h2>The special houses</h2>
    <p>The last five squares carry markings that decide games:</p>
    <ul>
      <li><b>House of Rebirth (square 15)</b> — the square a drowned piece returns to.</li>
      <li><b>House of Beauty (26)</b> — a piece must stop here before it can go on; it is the gateway to bearing off.</li>
      <li><b>House of Water (27)</b> — the trap. A piece that lands here (or is forced back to it) is sent back to the House of Rebirth.</li>
      <li><b>Squares 28, 29, 30</b> — bear off with an exact throw: a 3 from square 28, a 2 from 29, a 1 from 30. Overshooting is not allowed.</li>
    </ul>

    <h2>How to win</h2>
    <ol>
      <li><b>Guard the House of Water.</b> Getting bounced back to square 15 is the single biggest swing — keep spare throws in hand so you are never forced onto square 27.</li>
      <li><b>Build pairs.</b> Two adjacent pieces cannot be swapped; advancing in protected pairs denies your opponent captures.</li>
      <li><b>Bank your extra turns.</b> Throws of 1, 4, and 6 repeat — sequence your moves so a bonus throw lands a piece safely or onto square 26.</li>
      <li><b>Don&rsquo;t rush a lone runner.</b> A single exposed piece is a swap target that can lose a dozen squares.</li>
    </ol>

    <div class="callout">
      <b>More from the ancient world:</b> <a href="/Ur.html">The Royal Game of Ur</a> (see the <a href="/guides/royal-game-of-ur">Ur guide</a>) is Senet&rsquo;s Mesopotamian cousin, and <a href="/PenteGrammai.html">Pente Grammai</a> is the Greek &ldquo;game of five lines.&rdquo;
    </div>

    <p><a class="play-cta" href="/Senet.html">Play Senet now</a></p>
`,
  },
  {
    slug: 'pente-grammai',
    file: 'pente-grammai.html',
    title: 'Pente Grammai — the Ancient Greek Game of Five Lines',
    description: 'Rules and strategy for Pente Grammai, the Greek race game of five lines: movement, the sacred line, capturing, and bearing off.',
    body: `
    <p><a href="/PenteGrammai.html">Pente Grammai</a> — literally &ldquo;five lines&rdquo; — is an ancient Greek race game mentioned by writers from Alcaeus to Sophocles and depicted on Greek vases (most famously Achilles and Ajax at their game). The exact rules did not survive, so this is a plausible reconstruction: race your five pieces along the lines and bear them all off before your opponent.</p>

    <h2>The board</h2>
    <p>The board is five parallel lines (with later versions adding a divided grid). Each player has five pieces. The central line is the <b>sacred line</b> (&ldquo;the sacred line&rdquo; was a Greek proverb for a last resort — &ldquo;to move the piece from the sacred line&rdquo; meant making a desperate final play).</p>

    <h2>Movement and the throw</h2>
    <p>You roll knucklebones (astragaloi), which land on values of <b>1, 3, 4, or 6</b> — the four stable faces of an ankle bone. Move one piece the thrown number of spaces along its track toward the far end. A piece that moves past the last space bears off the board.</p>

    <h2>Capturing</h2>
    <p>Land <b>exactly</b> on a space occupied by a single opposing piece and you capture it — the captured piece is sent all the way back to its start. This is the heart of the game: a well-placed capture near the finish undoes most of an opponent&rsquo;s progress.</p>

    <h2>The sacred line and safe squares</h2>
    <ul>
      <li>A piece on the <b>sacred (central) line</b> is safe — it cannot be captured there, and cannot capture from there. It still moves forward like any other piece.</li>
      <li>A piece on its own <b>starting square</b> is likewise immune to capture.</li>
    </ul>

    <h2>Winning</h2>
    <p>The first player to bear off all five pieces wins. Because only one piece moves per throw, tempo is everything — every roll is a choice about which piece to advance, which to keep safe, and which capture to set up.</p>

    <h2>Strategy</h2>
    <ol>
      <li><b>Use the sacred line as a shield.</b> Park a vulnerable piece on the center line to deny a capture, then release it when the coast is clear.</li>
      <li><b>Threaten captures, don&rsquo;t just race.</b> Position pieces so a common throw (3 or 4) lands on an opponent — forcing them to play defensively.</li>
      <li><b>Mind exact-landing captures.</b> You can only capture by landing exactly; keep your leaders a non-obvious distance from enemy pieces.</li>
      <li><b>Bear off from the back.</b> Advance the piece nearest home when a capture isn&rsquo;t available, so you are always converting throws into finished pieces.</li>
    </ol>

    <div class="callout">
      <b>The ancient-games trilogy:</b> pair this with <a href="/Senet.html">Senet</a> (Egypt, see the <a href="/guides/senet-rules">Senet guide</a>) and <a href="/Ur.html">the Royal Game of Ur</a> (Mesopotamia) — three short-to-learn race games separated by a thousand years and a few hundred miles.
    </div>

    <p><a class="play-cta" href="/PenteGrammai.html">Play Pente Grammai now</a></p>
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

const indexRelated = allGuides.map(g => `<a class="guide-card" href="${g.href}"><span class="gtitle">${g.label}</span><span class="gsub">${(data.guides.find(x => x.slug === g.slug) || {}).description || 'Read guide →'}</span></a>`).join('\n    ');

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